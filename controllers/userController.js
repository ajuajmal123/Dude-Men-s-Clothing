const User = require('../models/userModel')
require("dotenv").config()

const OTP = require('../models/userotpVarification')
const bcrypt = require('bcrypt')
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const nodemailer = require('nodemailer')

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


  try {

    const spassword = await securePassword(req.body.password)

  
    const email = req.body.email
    const mobile = req.body.mobile
    const nameRegex = /^[a-zA-Z]+$/;
    if (!nameRegex.test(req.body.username)) {
      return res.render("registration", { message: "Invalid name format!" });
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
      mobile: req.body.mobile,
      password: spassword
    }

    const otpNum = new OTP({
      otp: otp,
      email: req.body.email,
    });

    await otpNum.save();
    if (req.session.userData) {
      sendVarifyMail(req.body.username, req.body.email, otp);
      res.redirect("/otp");
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
      // email: user.email,
      otp: enteredOtp,
    });

    if (generatedOTP) {
      const userDATA = new User({
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        password: user.password,
        is_admin: 0,
      });
      const saveUser = await userDATA.save();
      req.session.user_id = saveUser._id;
      res.redirect('/');
    } else {
      res.render('verifyOTP', { errmessage: "Incorrect OTP!!!" })
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

    sendVarifyMail(user.username, user.email, otp);
    req.session.OTP = otp;
    res.redirect('/');
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};
const confirmLogin = async (req, res) => {

  try {

    const email = req.body.email
    const password = req.body.password
    const userData = await User.findOne({ email: email })
    if (userData) {
      const passwordMatch = bcrypt.compare(password, userData.password)
      if (passwordMatch) {
        req.session.user_id = userData._id
        res.redirect('/')
      } else {
        res.render('registration', { message: 'Incorrect Email or Password' })
      }
    } else {
      res.render('registration', { message: 'Incorrect Email or Password' })
    }

  } catch (error) {
    console.log(error.message);
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
      delete: false
    }).populate('category_id')
    res.render('home', { user: userData, products })
  } catch (error) {
    console.log(error.message);
  }

}

const productPage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);

    // Get the product ID from the request parameters
    const productId = req.params.productId;

    // Fetch the product details from the database based on the product ID
    const product = await Product.findById(productId).populate("category_id");

    

    if (!product) {
      // If product is not found, render an error page or redirect to a 404 page
      return res.status(404).send("product not found");
    }
    const relatedProducts = await Product.find({ delete: false }).limit(4);
    // Render the product page and pass the product details to the view
    res.render("productPage", { product, relatedProducts, user});
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).send("Internal Server Error");
  }
};
// for google authentication




module.exports = {

  loadRegister,
  insertUser,
  getOTP,
  submitOTP,
  resendOTP,
  loadHome,
  confirmLogin,
  logout,
productPage

}