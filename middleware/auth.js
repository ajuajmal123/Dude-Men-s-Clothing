const User = require("../models/userModel");

const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      next();
    } else {
      res.redirect("/register");
    }

  } catch (error) {
    console.log(error.message);
  }
};


const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      res.redirect("/");

    }
    else {
      next();
    }

  } catch (error) {
    console.log(error.message);
  }
};


const checkBlock = async (req, res, next) => {
  const userId = req.session.user_id;
  if (userId) {
    try {
      const user = await User.findOne({ _id: userId });
      if (user && user.blocked === 1) {
        return res.redirect('/register');
      }
    } catch (error) {
      console.error(error.message)
    }
  }
  next();
}

module.exports = {
  isLogin,
  isLogout,
checkBlock
};