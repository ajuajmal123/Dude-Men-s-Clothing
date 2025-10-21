const User = require('../models/userModel')
require("dotenv").config()
const passport = require('../config/passport')
const OTP = require('../models/userotpVarification')
const bcrypt = require('bcrypt')
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Cart = require('../models/cartModel')
const Address = require('../models/addressModel')
const mongoose = require('mongoose')
const Wishlist = require("../models/wishlistSchema");
const nodemailer = require('nodemailer')
const validator = require('validator');
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
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS

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
    res.render('registration', { errmessage: 'Password Should contain atleast 8 charecters and have one symbol,capital letter and number.' });
  }

  try {

    const spassword = await securePassword(req.body.password)


    const email = req.body.email
    const mobile = req.body.mobile
    const mobileRegex = /^\d{10}$/
    if (!mobileRegex.test(mobile) || mobile === '0000000000') {
      return res.render('registration', { errmessage: 'Please Enter 10 Digit Mobile Number' })
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
    } else {
      res.render('verifyOTP', { message: "Incorrect OTP!!!" })
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
    var search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    const products = await Product.find({
      delete: false,
      status: true,
      $or: [
        { product_name: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    }).populate('category_id')
    let totalQuantities = 0
    if (userData) {
      const cart = await Cart.findOne({ userId: req.session.user_id }).populate(
        "products.productId"
      );
      if (cart) {
        cart.products.forEach((item) => {
          totalQuantities += item.quantity;
        });
      }
    }
    const wish = await Wishlist.find({ userId: req.session.user_id })
    if (wish) {
      totalWish = wish.length
    }

    res.render('home', { user: userData, products, totalWish, totalQuantities, search: search })
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

// for google authentication
const successLogin = (req, res) => {
  if (!req.user) {
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
  validatePassword,
  successLogin,
  failureLogin,
  getAllProducts,

}