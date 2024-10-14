const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const Wallet = require('../models/walletModel')
const User = require('../models/userModel')
const getTotalOrderCount = async () => {
  try {
    const totalCount = await Order.countDocuments();
    return totalCount;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getOrderList = async (req, res) => {
  try {
    const page = req.query.page || 1; // Default to page 1 if not provided
    const limit = 5; // Number of orders per page

    // Count total number of orders
    const totalCount = await getTotalOrderCount();

    // Calculate total number of pages
    const totalPages = Math.ceil(totalCount / limit);

    // Calculate the offset for pagination
    const offset = (page - 1) * limit;

    // Fetch orders for the current page
    const orders = await Order.find()
      .skip(offset)
      .limit(limit).sort({ createdAt: -1 })
      .populate("items.productId")
      .populate("userId");

    res.render("admin/order", { orders, totalPages, currentPage: page });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId, productId, quantity } = req.body;

    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Find the item in the order
    const item = order.items.find(
      (item) => item.productId.toString() === productId
    );

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in order" });
    }
    item.deliveryStatus = "Cancelled";
    await order.save();

    const product = await Product.updateOne(
      { _id: productId },
      { $inc: { stock: quantity } }
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.log(error.message);
  }
};

const updateStatus = async (req, res) => {
  try {
      const { orderId, status, productId } = req.body;

      const order = await Order.findOneAndUpdate(
          { _id: orderId, "items.productId": productId },
          { $set: { "items.$.deliveryStatus": status } }
      );

      if (status === 'Returned') {
          const item = order.items.find(item => item.productId.toString() === productId);


          let returnedAmount =  item.price;
           // Check if coupon applied for the order
    if (order.couponDiscount > 0) {
      // Calculate the discount amount based on the couponDiscount percentage
      const discountAmount = (returnedAmount * order.couponDiscount) / 100;
      returnedAmount -= discountAmount;
    }

    order.totalAmount -= returnedAmount;

          const wallet = await Wallet.findOne({ userId: order.userId });
          if (!wallet) {
              return res.status(404).json({ success: false, message: 'Wallet not found for the user' });
          }

          wallet.balance += returnedAmount;
          wallet.history.push({
              amount: parseFloat(returnedAmount),
              type: 'credit',
              createdAt: new Date()
          });
          await wallet.save();

          const product = await Product.findById(productId);
          if (!product) {
              return res.status(404).json({ success: false, message: 'Product not found' });
          }

          product.stock += item.quantity;
          await product.save();
      }

      res.json({ success: true });

  } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ success: false, error: error.message });
  }
};


const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.query.productId;

    const order = await Order.findById(orderId).populate(
      "userId address items.productId"
    );

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Find the item in the order's items array that matches the provided productId
    const selectedItem = order.items.find(
      (item) => String(item.productId._id) === productId
    );

    if (!selectedItem) {
      return res.status(404).send("Product not found in the order");
    }

    // Render the orderDetails view with only the selected product
    res.render("admin/orderDetails", { order, selectedItem });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getOrderList,
  cancelOrder,
  updateStatus,
  orderDetails,
};