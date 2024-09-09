const User = require('../models/userModel')
require("dotenv").config()
const passport=require('../config/passport')
const OTP = require('../models/userotpVarification')
const bcrypt = require('bcrypt')
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require('../models/cartModel')
const Address=require('../models/addressModel')
const Order=require('../models/orderModel')
const Wishlist = require("../models/wishlistSchema");
const nodemailer = require('nodemailer')
const validator= require('validator');
const { fileLoader } = require('ejs');

const { essentialcontacts } = require('googleapis/build/src/apis/essentialcontacts')


//strong password validation
const validatePassword = (password) => {
  const isStrongPassword = validator.isStrongPassword(password, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  });

  return isStrongPassword;
};

// password Hashing
const securePassword = async (password) => {
  
  try {

    const passwordHash = await bcrypt.hash(password, 10)
    return passwordHash;

  } catch (error) {
    console.log(error.message);
  }

}

// for sending mail

const sendVarifyMail = async (name, email, otp) => {

  try {
    const transporter = nodemailer.createTransport({
      service: "GMAIL",
      port:587,
      secure:false,
      requireTLS:true,
      auth: {
        user: 'ajuajmalvalad@gmail.com',
        pass: 'ijcdvcensglhooji'

      }

    })

    const mailOptions = {

      from: 'ajuajmalvalad@gmail.com',
      to: email,
      subject: 'Varify your Dude account',
      html: "<p>Hi " + name + " Your OTP is " + otp + " </p>",
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email has been sent ', info.response);
      }
    })


  } catch (error) {
    console.log(error.message);
  }


}

//

const loadRegister = async (req, res) => {

  try {

    res.render('registration')
  } catch (error) {
    console.log(error.message);
  }

}



const insertUser = async (req, res) => {
   const { password } = req.body;

  if (!validatePassword(password)) {
    res.render('registration',{ errmessage: 'Password Should contain atleast 8 charecters and have one symbol,capital letter and number.' });
 }
  
  try {

    const spassword = await securePassword(req.body.password)

  
    const email = req.body.email
    const mobile=req.body.mobile
    const mobileRegex = /^\d{10}$/
    if(!mobileRegex.test(mobile)|| mobile === '0000000000'){
      return res.render('registration',{errmessage:'Please Enter 10 Digit Mobile Number'})
    }
    const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)?$/
    if (!nameRegex.test(req.body.username)) {
      return res.render("registration", { errmessage: "Invalid name format!" });
    }
    const { password, confirm_password } = req.body;
  
    if (password !== confirm_password) {
      res.render('registration', { message: 'Passwords do not match.' });
    }

    // to check email or phone number is already exist

    const existingUserByEmail = await User.findOne({ email: email });
    const existingUserByphNum = await User.findOne({ mobile: mobile });

    if (existingUserByEmail) {
      return res.render("registration", { message: "Email is already in use!" });
    }

    if (existingUserByphNum) {
      return res.render("registration", { message: "Phone Num is already in use!" });
    }


    // to genereate 6 digit otp

    const otp = Math.floor(100000 + Math.random() * 900000);
    
   
    // save userdata in session
     req.session.userData = {
      name: req.body.username,
      email: req.body.email,
      mobile: req.body.mobileRegex,
      password: spassword
    }

    const otpNum = new OTP({
      otp: otp,
      email: req.body.email,
    });

    await otpNum.save();
    if (req.session.userData) {
      sendVarifyMail(req.body.username, req.body.email, otp);
      res.redirect("/Otp");
    } else {
      res.render("registration", { errmessage: "Registration Failed!!" });
    }
 

   
  } catch (error) {
    console.log(error.message);

  }
}

const getOTP = async (req, res) => {
  try {
    res.render("verifyOTP");
  } catch (error) {
    console.log(error.message);
  }
}; 



const submitOTP = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    const user = req.session.userData;
    const generatedOTP = await OTP.findOne({
      email: user.email,
      otp: enteredOtp,
    });

    if (generatedOTP) {
      const userDATA = new User({
        name: user.name,
        phone: user.phone,
        email: user.email,
        password: user.password,
        is_admin: 0,
      });
      const saveUser = await userDATA.save();
      req.session.user_id = saveUser._id;
      res.redirect("/");
    }else{
      res.render('verifyOTP',{message:"Incorrect OTP!!!"})
    }
  } catch (error) {
    console.log(error);
  }
};
const resendOTP = async (req, res) => {
  try {
    const user = req.session.userData;
    if (!user) {
      return res.status(400).send("User Data not found in the session!!");
    }
    const otp = Math.floor(100000 + Math.random() * 900000);

    const otpNum = new OTP({
      otp: otp,
      email: user.email,
    });

    await otpNum.save();

    sendVarifyMail(user.username, user.email, otp); // Assuming sendverifyMail is a function to send emails
    req.session.OTP = otp;
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const confirmLogin = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    // Fetch the user by email
    const userData = await User.findOne({ email: email });

    if (userData) {
      // Compare the entered password with the stored hash
      const passwordMatch = await bcrypt.compare(password, userData.password);
      
      if (passwordMatch) {
        // If the password matches, create a session and redirect to the home page
        req.session.user_id = userData._id;
        res.redirect('/');
      } else {
        // If the password doesn't match, render the registration page with an error message
        res.render('registration', { message: 'Incorrect Email or Password' });
      }
    } else {
      // If no user is found with the provided email, render the registration page with an error message
      res.render('registration', { message: 'Incorrect Email or Password' });
    }

  } catch (error) {
    // Log any errors to the console
    console.log(error.message);
    res.status(500).send('An error occurred during login');
  }
}
const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/register");
  } catch (error) {
    console.log(error.message);
  }
};




const loadHome = async (req, res) => {

  try {
    
    const userData = await User.findById({ _id: req.session.user_id });
    const products = await Product.find({
      delete: false,
      status:true
    }).populate('category_id')
    res.render('home', { user: userData, products })
  } catch (error) {
    console.log(error.message);
  }

}

const getAllProducts = async (req, res) => {
  try {
    let totalQuantities = 0;
    
    const userId = req.session.user_id;
    if (userId) {
      const cart = await Cart.findOne({ userId }).populate(
        "products.productId"
      );
      if (cart) {
        cart.products.forEach((item) => {
          totalQuantities += item.quantity;
        });
      }
    }

    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    const products = await Product.find({
      delete: false,
      $or: [
        { product_name: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    }).populate("category_id");
    const categories = await Category.find({ cat_status: true });
    const user = await User.findById(req.session.user_id);

   

    res.render("home", {
      products,
      categories,
      user,
      search: search,
      totalQuantities,
      totalWish,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

/* const productPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);
    const productId = req.params.productId;

    // Fetch the product details from the database based on the product ID
    const product = await Product.findById(productId).populate("category_id");

    if (!product) {
      return res.status(404).send("Product not found");
    }
    let wishlist = null;
    if (user) {
      wishlist = await Wishlist.findOne({ userId: user._id, productId });
    }

    const relatedProducts = await Product.find({ delete: false }).limit(4);
    
    // Render the product page and pass the product details to the view
    res.render("productPage", { product, relatedProducts, user,wishlist });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
}; */
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
    const selectedSize = req.body.selectedSize 


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

   res.redirect('/cart')

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

    res.redirect("/cart"); // Redirect back to the cart page after removal
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).send("Internal Server Error");
  }
};
const checkStock =async (req,res)=>{
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

    if (!cart || !cart.products.length) {
      // If the user's cart is empty, render an empty cart view
      return res.render("checkOut", {
        cartItems: [],
        totalQuantities: 0,
        subtotal: 0,
        addresses: [],
        user,
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
    const products = await Product.find({delete:false, category_id: categoryId }).populate(
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
    const products = await Product.find({delete:false, color: colorName }).populate(
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
    const { selectedAddress, paymentMethod } = req.body;
    
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

    // Calculate total amount and set price for each item
    let totalAmount = 0;
    for (const item of cart.products) {
      const itemPrice = item.quantity * item.productId.selling_price;
      item.price = itemPrice;
      totalAmount += itemPrice;
    }

    // Ensure that paymentMethod is provided in the request body
    if (!paymentMethod) {
      return res.status(400).send("Payment method is required");
    }

    // Set initial delivery status based on payment method
    const deliveryStatus = paymentMethod === "Cash on Delivery" ? "Processing" : "Payment Pending";

    // Create the order with required fields
    const order = new Order({
      userId,
      items: cart.products.map(item => ({
        productId: item.productId._id,
        quantity: item.quantity,
        price: item.price,
        deliveryStatus: deliveryStatus,
      })),
      status: paymentMethod === "Cash on Delivery" ? "unpaid" : "pending",
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
    });

    // If payment is COD, save the order and reduce the product stock
    if (paymentMethod === "Cash on Delivery") {
      await order.save();

      // Deduct the purchased quantity from the product's stock
      for (const item of cart.products) {
        const product = await Product.findById(item.productId._id);
        product.stock -= item.quantity;
        await product.save();
      }
    }

    // Clear the cart
    await Cart.findOneAndUpdate({ userId }, { $set: { products: [] } });

    return res.redirect("/ordersuccess");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
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
        // Handle the case where the user with the session ID is not found
        return res.status(404).send("User not found");
      }
      // Save the wishlist item to the database
      const userId = req.session.user_id;
      let totalQuantities = 0;
      let totalWish = 0;
      if (userId) {
        const cart = await Cart.findOne({ userId }).populate(
          "products.productId"
        );
        if (cart) {
          cart.products.forEach((item) => {
            totalQuantities += item.quantity;
          });
        }
        const wish = await Wishlist.find({ userId });
        if (wish) {
          totalWish = wish.length;
        }
      }
      const wishlist = await Wishlist.find({ userId }).populate("productId");

      if (!wishlist) {
        // If the user's wishlist is empty, render an empty wishlist view
        return res.render("wishlist", { wishlist });
      }

      res.render("wishlist", { wishlist, user, totalQuantities, totalWish });
    } else {
      res.render("login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

/* const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.params.productId;

    // Check if both userId and productId are present
    if (!userId || !productId) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // Check if the product already exists in the wishlist
    const existingWishlistItem = await Wishlist.findOne({ userId, productId });
    if (existingWishlistItem) {
      return res.status(400).json({ success: false, message: "Product already in wishlist" });
    }

    // Create a new wishlist item
    const wishlist = await Wishlist.create({ userId, productId });

    res.status(201).json({ success: true, wishlist });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}; */
const addToWishlist = async (req, res) => {
  try {
      const userId = req.body.userId; // Make sure to send this from the frontend
      const productId = req.params.productId; // Extract from URL params

      if (!userId || !productId) {
          return res.status(400).json({ success: false, message: "Invalid input" });
      }

      const wishlist = await Wishlist.create({ userId, productId });
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



// for google authentication
const successLogin = (req, res) => {
  if(!req.user) {
      res.redirect('/register');
  } else {
    
      res.render('home');
  }
};

const failureLogin = (req, res) => {
  res.send('Error');
};



  


module.exports = {

  loadRegister,
  insertUser,
  getOTP,
  submitOTP,
  resendOTP,
  loadHome,
  confirmLogin,
  logout,
productPage,
validatePassword,
successLogin,
failureLogin,
renderCart,
addToCart,
allProducts,
remove_product_from_cart,
updateQuantity,
checkStock,
renderCheckOut,
editCheckoutAddress,
addCheckoutAddress,
editCheckoutAddressPage,
checkoutAddresspage,
getAllProducts,
categoryFiltering,
colorFiltering,
placeOrder,
renderOrderSuccess,
addToWishlist,
removeFromWishlist,
renderWishlist
}