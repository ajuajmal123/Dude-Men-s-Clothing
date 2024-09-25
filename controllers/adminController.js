const User = require('../models/userModel');
const Admin = require("../models/adminModel");
const bcrypt = require("bcrypt");


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

const loadDashbord = async (req, res) => {
  try {

    const userData = req.session.admin_id //await User.findById({_id:req.session.user_id});
    res.render('admin/dashboard', { admin: userData });
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

module.exports = {
  loadLogin,
  confirmLogin,
  loadDashbord,
  adminLogout,
  userList,
  updateUsers
}