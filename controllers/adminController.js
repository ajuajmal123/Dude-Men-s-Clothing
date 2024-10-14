const User = require('../models/userModel');
const Admin = require("../models/adminModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Category = require("../models/categoryModel");
const cron=require('node-cron')
const loadLogin = async (req, res) => {
  try {
    res.render("admin/login");
  } catch (error) {
    console.log(error.message);
  }
};

const confirmLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await User.findOne({ email: email });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_admin === 0) {
          res.render("admin/login", { errmessage: "Incorrect email or password" });
        } else {
          req.session.admin_id = userData._id;

          res.redirect("/admin/dashboard");
        }
      } else {
        res.render("admin/login", { errmessage: "Incorrect email or password" });
      }
    } else {
      res.render("admin/login", { errmessage: "Incorrect email or password" });
    }

  } catch (error) {
    console.log(error.message);
  }
};

const loadDashboard = async (req, res) => {
  try {
    const orders = await Order.find().populate("items.productId");
    const categories = await Category.find();
    const products = await Product.find();
    let totalRevenue = 0
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.deliveryStatus === 'Delivered') {
          totalRevenue += item.quantity * parseFloat(item.productId.selling_price);
        }
      });
    });

    const orderCountsByMonth = Array.from({ length: 12 }, () => 0);
    orders.forEach((order) => {
      const monthIndex = order.createdAt.getMonth();
      orderCountsByMonth[monthIndex]++;
    });

    const productCountsByMonth = Array.from({ length: 12 }, () => 0);
    products.forEach((product) => {
      const monthIndex = product.createdAt.getMonth();
      productCountsByMonth[monthIndex]++;
    });

    const orderCountsByYearData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const orderCountsByYear = Array.from({ length: 12 }, () => 0);
    orderCountsByYearData.forEach((entry) => {
      const yearIndex = entry._id - new Date().getFullYear() + 5;
      orderCountsByYear[yearIndex] = entry.orderCount;
    });

    const productCountsByYearData = await Product.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          productCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const productCountsByYear = Array.from({ length: 12 }, () => 0);
    productCountsByYearData.forEach((entry) => {
      const yearIndex = entry._id - new Date().getFullYear() + 5;
      productCountsByYear[yearIndex] = entry.productCount;
    });

    const totalAmountByYearData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$createdAt" },
          totalAmount: { $sum: { $toDouble: "$totalAmount" } },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const totalAmountByYear = Array.from({ length: 12 }, () => 0);
    totalAmountByYearData.forEach((entry) => {
      const yearIndex = entry._id - new Date().getFullYear() + 5;
      totalAmountByYear[yearIndex] = entry.totalAmount;
    });

    // Calculate total amount by month
    const totalAmountByMonth = Array.from({ length: 12 }, () => 0);
    orders.forEach((order) => {
      const monthIndex = order.createdAt.getMonth();
      const totalAmount = parseFloat(order.totalAmount);
      totalAmountByMonth[monthIndex] += totalAmount;
    });
    const bestSellingProduct = await Order.aggregate([
      {
        $unwind: "$items",
      },
      {
        $group: {
          _id: "$items.productId",
          totalSales: { $sum: "$items.quantity" },
        },
      },
      {
        $sort: { totalSales: -1 },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $project: {
          productName: "$product.product_name",
          totalSales: 1,
        },
      },
    ]);

    const bestSellingCategories = await Order.aggregate([
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $group: {
          _id: "$category._id",
          name: { $first: "$category.cat_name" },
          totalSales: { $sum: "$items.quantity" }, // Changed to reference items.quantity
        },
      },
      {
        $sort: { totalSales: -1 },
      },
      {
        $limit: 3,
      },
    ]);

    res.render("admin/dashboard", {
      orders,
      totalRevenue,
      categories,
      orderCountsByMonth,
      productCountsByMonth,
      orderCountsByYear,
      productCountsByYear,
      bestSellingProduct,
      bestSellingCategories,
      totalAmountByMonth,
      totalAmountByYear,
    });
  } catch (error) {
    console.log(error.message);
  }
};



const adminLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect('/admin')
  } catch (error) {
    console.log(error.message);
  }
};


const userList = async (req, res) => {
  try {
    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    const usersData = await User.find({
      is_admin: 0,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
        { mobile: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });
    res.render("admin/userlist", { users: usersData, search: search });
  } catch (error) {
    console.log(error.message);
  }
};

const updateUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("user not found");
    }
    user.blocked = !user.blocked;
    await user.save();
    if (req.session.user_id === userId) {
      req.session.user_id = null;
    }
    res.redirect("/admin/userlist");
  } catch (error) {
    console.log(error.message);
  }
};

//offer module
const adminOffers = async (req, res) => {
  try {
    const catData = await Category.find();
    const product = await Product.find();
    if (catData) {
      res.render("admin/adminOffer", { categories: catData, product });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const applyAdminOffers = async (req, res) => {
  try {
    const { categoryId, discount, expiry } = req.body;
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { offer: discount, expirationDate: expiry, OfferisActive: true },
      { new: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productsToUpdate = await Product.find({ category_id: categoryId });
    if (!productsToUpdate) {
      return res.status(404).json({ message: "product not found" });
    }

    for (const product of productsToUpdate) {
      const updatedPrice = Math.round(
        product.actual_price * ((100 - discount) / 100)
      );
      product.selling_price = updatedPrice;

      await product.save();
    }

    res
      .status(200)
      .json({
        message: "Offer applied successfully",
        category: updatedCategory,
      });
  } catch (error) {
    console.log(error.message);
  }
};

const checkingAdminOffers = async () => {
  try {
    const expiredCategories = await Category.find({
      expirationDate: { $lte: new Date() },
      OfferisActive: true,
    });

    for (const category of expiredCategories) {
      category.offer = 0;
      category.expirationDate = null;
      category.OfferisActive = false;
      await category.save();

      const productsToUpdate = await Product.find({
        category_id: category._id,
      });
      for (const product of productsToUpdate) {
        product.selling_price = product.actual_price;
        await product.save();
      }
    }

  
  } catch (error) {
    console.error("Error checking and resetting expired offers:", error);
  }
};
cron.schedule("0 0 * * *", checkingAdminOffers);

const salesReport = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.productId")
      .populate("userId");

    // Filter out orders where no item is delivered
    const deliveredOrders = orders.filter(order => 
      order.items.some(item => item.deliveryStatus === 'Delivered')
    );

    res.render("admin/salesReport", { orders: deliveredOrders });
  } catch (error) {
    console.error(error);
  }
};

const salesreportsearch = async (req, res) => {
  try {
    const { start, end } = req.body;
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      createdAt: { $gte: new Date(start), $lte: endOfDay },
    })
      .populate("items.productId")
      .populate("userId");

    // Filter out orders where no item is delivered
    const deliveredOrders = orders.filter(order => 
      order.items.some(item => item.deliveryStatus === 'Delivered')
    );

    res.render("admin/salesReport", { orders: deliveredOrders, start, end });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  loadLogin,
  confirmLogin,
  loadDashboard,
  adminLogout,
  userList,
  updateUsers,
  adminOffers,
  applyAdminOffers,
  salesReport,
  salesreportsearch
}