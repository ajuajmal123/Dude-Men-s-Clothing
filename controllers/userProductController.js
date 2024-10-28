const User = require('../models/userModel')
require("dotenv").config()
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require('../models/cartModel')
const Address = require('../models/addressModel')
const Order = require('../models/orderModel')
const Wallet = require("../models/walletModel");
const Wishlist = require("../models/wishlistSchema");
const crypto = require('crypto')
const Razorpay = require('razorpay')
const Coupon = require("../models/couponModel");
const Payment = require("../models/paymentModel");
const RAZORPAY_ID_KEY = process.env.RAZORPAY_ID_KEY;
const RAZORPAY_SECRET_KEY = process.env.RAZORPAY_SECRET_KEY;

// Initialize Razorpay instance
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const productPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);
    const productId = req.params.productId;

    // Fetch the product details from the database based on the product ID
    const product = await Product.findById(productId).populate("category_id");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const relatedProducts = await Product.find({ delete: false }).limit(4);

    // Fetch the wishlist items for the user if logged in
    let wishlist = [];
    if (user) {
      wishlist = await Wishlist.find({ userId: user._id }).populate("productId");
    }

    // Render the product page and pass the product details to the view
    res.render("productPage", { product, relatedProducts, user, wishlist });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
};

const allProducts = async (req, res) => {
  try {
    const products = await Product.find({ delete: false }).populate(
      "category_id"
    );

    let sortProducts;
    const sortBy = req.query.sortBy;

    switch (sortBy) {

      case "lowToHigh":
        sortProducts = await Product.find({ delete: false }).sort({
          selling_price: 1,
        });
        break;
      case "highToLow":
        sortProducts = await Product.find({ delete: false }).sort({
          selling_price: -1,
        });
        break;
      case "newArrivals":
        const currentDate = new Date();
        const oneWeekAgo = new Date(
          currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
        );
        sortProducts = await Product.find({
          delete: false,
          createdAt: { $gte: oneWeekAgo },
        });
        break;
      case "aA-zZ":
        sortProducts = await Product.find({ delete: false }).sort({
          product_name: 1,
        });
        break;
      case "zZ-aA":
        sortProducts = await Product.find({ delete: false }).sort({
          product_name: -1,
        });
        break;
      default:
        sortProducts = products;
        break;
    }
    const user = await User.findById(req.session.user_id);

    res.render("allProducts", { products: sortProducts, user, sortBy });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

const renderCart = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId }).populate('products.productId');

    if (!cart) {
      return res.render('cart', { cartItems: [], totalQuantities: 0, totalPrice: 0 });
    }

    let totalQuantities = 0;
    let totalPrice = 0;

    cart.products.forEach(item => {
      totalQuantities += item.quantity;
      totalPrice += item.productId.selling_price * item.quantity;
    });

    // Pass totalPrice and totalQuantities to the template
    res.render('cart', { cartItems: cart.products, totalQuantities, totalPrice });
  } catch (error) {
    console.error('Error rendering cart:', error);
    res.status(500).send('Server Error');
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity) || 1;
    const selectedSize = req.body.selectedSize;



    if (!selectedSize) {
      return res.status(400).json({ success: false, message: "Size must be selected" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, products: [] });
    }

    let existingProduct = cart.products.find(
      item => item.productId.toString() === productId && item.size === selectedSize
    );

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ productId, size: selectedSize, quantity });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const sizeStock = product.sizes.find(sizeObj => sizeObj.size === selectedSize)?.stock;
    if (sizeStock === undefined) {
      return res.status(400).json({ success: false, message: "Invalid size selected" });
    }

    if (sizeStock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock for the selected size" });
    }


    product.sizes = product.sizes.map(sizeObj =>
      sizeObj.size === selectedSize ? { ...sizeObj, stock: sizeObj.stock - quantity } : sizeObj
    );

    await product.save();
    await cart.save();

    if (req.headers['x-requested-with'] === 'fetch' || req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: "Product added to cart successfully" });
    } else {
      return res.redirect('/cart');
    }

  } catch (error) {
    console.log('Error in addToCart:', error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



const updateQuantity = async (req, res) => {
  try {
    const { productId, size, operator } = req.body;
    const userId = req.session.user_id;

    const cartItem = await Cart.findOne({
      userId,
      "products.productId": productId,
      "products.size": size,
    });

    if (!cartItem || cartItem.products.length === 0) {
      return res.json({
        success: false,
        message: "Product not found in the cart",
      });
    }

    const item = cartItem.products.find(item => item.productId.equals(productId) && item.size === size);
    const currentQuantity = item.quantity;
    const newQuantity = operator === "increase" ? currentQuantity + 1 : currentQuantity - 1;

    if (newQuantity > 10 || newQuantity < 1) {
      return res.json({
        success: false,
        message: "Quantity must be between 1 and 10",
      });
    }

    await Cart.updateOne(
      { userId, "products.productId": productId, "products.size": size },
      { $inc: { "products.$.quantity": operator === "increase" ? 1 : -1 } }
    );

    // Recalculate the total quantities and total price
    const updatedCart = await Cart.findOne({ userId }).populate("products.productId");
    let totalQuantities = 0;
    let totalPrice = 0;

    updatedCart.products.forEach(item => {
      totalQuantities += item.quantity;
      totalPrice += item.productId.selling_price * item.quantity;
    });

    return res.json({
      success: true,
      productQuantity: newQuantity,
      productPrice: newQuantity * item.productId.selling_price,
      totalQuantities,
      totalPrice,
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



const remove_product_from_cart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      // If cart is not found, send a 404 response
      return res.status(404).send("Cart not found");
    }

    // Calculate the total quantity removed
    let totalQuantityRemoved = 0;
    cart.products.forEach((item) => {
      if (item.productId.toString() === productId) {
        totalQuantityRemoved += item.quantity;
      }
    });

    // Update the cart to remove the specified product
    await cart.updateOne({ $pull: { products: { productId } } });

    // Check if the cart becomes empty after removing the product
    if (cart.products.length === 0) {
      // If cart is empty, delete it from the database
      await Cart.findOneAndDelete({ userId });
    }

    res.redirect("/cart");
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).send("Internal Server Error");
  }
};
const checkStock = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    res.status(200).json({
      success: true,
      stock: product.stock,
      product_name: product.product_name
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}
const renderCheckOut = async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Fetch the user and cart details
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const coupons = await Coupon.find({ isActive: true })
    if (!cart || !cart.products.length) {
      // If the user's cart is empty, render an empty cart view
      return res.render("checkOut", {
        cartItems: [],
        totalQuantities: 0,
        subtotal: 0,
        addresses: [],
        user,
        coupons
      });
    }

    const addresses = await Address.find({ userId });

    // Calculate total quantities and subtotal
    let totalQuantities = 0;
    let subtotal = 0;

    cart.products.forEach((item) => {
      totalQuantities += item.quantity;
      const itemPrice = item.productId.selling_price * item.quantity;
      item.price = itemPrice;
      subtotal += itemPrice;
    });

    res.render("checkOut", {
      cartItems: cart.products,
      totalQuantities,
      subtotal,
      addresses,
      user,
      coupons
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};
const checkoutAddresspage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    res.render("checkoutAddress", { user });
  } catch (error) {
    console.log(error.message);
  }
};

const addCheckoutAddress = async (req, res) => {
  try {
    const { name, mobile, address, pincode, state, district, city } = req.body;

    const userId = req.session.user_id;

    // Create a new address object
    const newAddress = new Address({
      userId,
      name,
      mobile,
      address,
      pincode,
      state,
      district,
      city,
    });

    // Save the new address to the database
    await newAddress.save();

    res.redirect("/checkout");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const editCheckoutAddressPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const address = await Address.findById(req.params.id);
    res.render("editCheckoutAddress", { address, user });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const editCheckoutAddress = async (req, res) => {
  try {
    const { name, mobile, address, pincode, state, district, city } = req.body;
    const addressId = req.params.id;
    await Address.findByIdAndUpdate(addressId, {
      name,
      mobile,
      address,
      pincode,
      state,
      district,
      city,
    });
    res.redirect("/checkout"); // Redirect to my account page after editing
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const categoryFiltering = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    // Fetch products based on the category ID
    const products = await Product.find({ delete: false, category_id: categoryId }).populate(
      "category_id"
    );
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const colorFiltering = async (req, res) => {
  try {
    const colorName = req.params.colorName;

    // Fetch products based on the brand ID
    const products = await Product.find({ delete: false, color: colorName }).populate(
      "category_id"
    );
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products by brands:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { couponCode, selectedAddress, paymentMethod } = req.body;

    // Store applied coupon in session or temporary storage
    req.session.appliedCoupons = [couponCode];
    const coupon = await Coupon.findOne({
      couponCode,
      isActive: true,
      expirationDate: { $gte: Date.now() },
    });

    // Find the user's cart
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    // Check if the cart is empty
    if (!cart || !cart.products.length) {
      return res.status(400).send("Cart is empty");
    }


    // Find the selected address
    const address = await Address.findOne({ _id: selectedAddress, userId });

    // Ensure that the selected address exists and belongs to the user
    if (!address) {
      return res.status(400).send("Invalid address selected");
    }

    let couponDiscount = 0;
    if (coupon) {
      couponDiscount = coupon.discountAmount;
    }

    // Calculate total amount and set price for each item
    let totalAmount = 0;
    for (const item of cart.products) {
      const itemPrice = item.quantity * item.productId.selling_price;
      item.price = itemPrice;
      totalAmount += itemPrice;

    }

    // Deduct coupon discount from the total amount
    let discountedAmount = (totalAmount * couponDiscount) / 100;
    totalAmount -= discountedAmount;

    // Ensure that paymentMethod is provided in the request body
    if (!paymentMethod) {
      return res.status(400).send("Payment method is required");
    }

    // Set initial delivery status based on payment method
    for (const item of cart.products) {
      item.deliveryStatus = paymentMethod === "Online" ? "Payment Pending" : "Processing";
    }

    // Create the order with required fields
    const order = new Order({
      userId,
      items: cart.products.map(item => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.price,
        deliveryStatus: item.deliveryStatus,
      })),
      status: paymentMethod === "Online" ? "pending" : "unpaid",
      totalAmount,
      paymentMethod,
      address: {
        name: address.name,
        mobile: address.mobile,
        address: address.address,
        pincode: address.pincode,
        state: address.state,
        district: address.district,
        city: address.city,
      },
      couponDiscount,
    });
    if (paymentMethod === "Cash on Delivery") {
      await order.save();

      // Deduct the purchased quantity from the product's stock
      for (const item of cart.products) {
        const productId = item.productId._id;
        const product = await Product.findById(productId);
        product.stock -= item.quantity;
        await product.save();
      }
    } else if (paymentMethod === "Online") {
      const createOrder = await Order.create(order);
      const razorpayOrder = await instance.orders.create({
        amount: totalAmount * 100, // Razorpay expects amount in paise (multiply by 100)
        currency: "INR",
        receipt: order._id.toString(),
        payment_capture: 1, // Auto capture payment
      });

      const timestamp = razorpayOrder.created_at;
      const date = new Date(timestamp * 1000); // Convert the Unix timestamp to milliseconds
      const formattedDate = date.toISOString();

      let payment = new Payment({
        payment_id: razorpayOrder.id,
        amount: totalAmount * 100,
        currency: razorpayOrder.currency,
        order_id: createOrder._id,
        status: razorpayOrder.status,
        created_at: formattedDate,
      });
      await payment.save();

      return res.json({
        success: true,
        orderId: razorpayOrder.id,
        amount: totalAmount * 100,
      });
    } else if (paymentMethod === "Wallet") {
      try {
        const wallet = await Wallet.findOne({ userId });

        if (!wallet || wallet.balance < totalAmount) {
          throw new Error("Insufficient balance in the wallet");
        }

        wallet.balance -= totalAmount;
        wallet.history.push({
          amount: totalAmount,
          type: "debit",
        });
        await wallet.save();
        // Set order status to "paid" and save the order
        order.status = "paid";
        await order.save();

        // Deduct the purchased quantity from the product's stock
        for (const item of cart.products) {
          const productId = item.productId._id;
          const product = await Product.findById(productId);
          product.stock -= item.quantity;
          await product.save();
        }
        const appliedCoupons = req.session.appliedCoupons;
        if (appliedCoupons && appliedCoupons.length > 0) {
          for (const couponCode of appliedCoupons) {
            await Coupon.findOneAndUpdate(
              {
                couponCode,
                isActive: true,
                expirationDate: { $gte: Date.now() },
              },
              { $push: { redeemedUsers: { userId, usedTime: new Date() } } }
            );
          }
        }
        delete req.session.appliedCoupons;
      } catch (error) {
        console.error(error);
        return res.status(400).send(error.message);
      }
    }

    await Cart.findOneAndUpdate({ userId }, { $set: { products: [] } });

    return res.render("orderSuccess");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

const verifyPayment = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_SECRET_KEY;
    const userId = req.session.user_id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body.response;

    let hmac = crypto.createHmac("sha256", secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    hmac = hmac.digest("hex");
    const isSignatureValid = hmac === razorpay_signature;

    if (isSignatureValid) {
      //Clear the cart after placing the order
      await Cart.findOneAndUpdate({ userId }, { $set: { products: [] } });
      let paymentId = razorpay_order_id;

      const orderID = await Payment.findOne(
        { payment_id: paymentId },
        { _id: 0, order_id: 1 }
      );

      const order_id = orderID.order_id;
      const updateOrder = await Order.updateOne(
        { _id: order_id },
        {
          $set: {
            status: "paid",
            "items.$[].deliveryStatus": "Processing"
          },
        }
      );
      // Find the user's cart
      const cart = await Cart.findOne({ userId }).populate("products.productId");

      // Deduct the purchased quantity from the product's stock
      for (const item of cart.products) {
        const productId = item.productId._id;
        const product = await Product.findById(productId);
        product.stock -= item.quantity;
        await product.save();
      }
      res.json({
        success: true,
      });
    }
  } catch (error) {
    console.error(error);
  }
};


const renderOrderSuccess = async (req, res) => {
  try {
    res.render("orderSuccess");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const renderWishlist = async (req, res) => {
  try {
    if (req.session.user_id) {
      const user = await User.findById(req.session.user_id);

      if (!user) {
        return res.status(404).send("User not found");
      }

      const userId = req.session.user_id;
      let totalQuantities = 0;
      let totalWish = 0;

      // Fetch cart data and calculate total quantities
      const cart = await Cart.findOne({ userId }).populate("products.productId");
      if (cart) {
        cart.products.forEach((item) => {
          totalQuantities += item.quantity;
        });
      }

      // Fetch wishlist and populate productId
      let wishlist = await Wishlist.find({ userId }).populate("productId");

      // Filter out any wishlist items where productId is missing or invalid
      wishlist = wishlist.filter(item => item.productId);

      // Calculate total wish count
      totalWish = wishlist.length;

      res.render("wishlist", { wishlist, user, totalQuantities, totalWish });
    } else {
      res.render("registration");
    }
  } catch (error) {
    console.error("Error rendering wishlist:", error);
    res.status(500).send("Internal Server Error");
  }
};





const addToWishlist = async (req, res) => {
  try {
    const { userId, selectedSize } = req.body;
    const productId = req.params.productId;

    // Check if all required fields are provided
    if (!userId || !productId || !selectedSize) {
      return res.status(400).json({ success: false, message: "Invalid input: userId, productId, and selectedSize are required." });
    }

    // Create the wishlist entry including the selected size
    const wishlist = await Wishlist.create({ userId, productId, selectedSize });

    // Return success response
    res.status(201).json({ success: true, wishlist });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await Wishlist.deleteOne({ userId, productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Item not found in wishlist" });
    }

    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



module.exports = {
  productPage,
  allProducts,
  renderCart,
  addToCart,
  remove_product_from_cart,
  updateQuantity,
  checkStock,
  renderCheckOut,
  editCheckoutAddress,
  addCheckoutAddress,
  editCheckoutAddressPage,
  checkoutAddresspage,
  categoryFiltering,
  colorFiltering,
  placeOrder,
  renderOrderSuccess,
  addToWishlist,
  removeFromWishlist,
  renderWishlist,
  verifyPayment,

}