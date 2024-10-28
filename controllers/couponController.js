const Coupon = require("../models/couponModel");
const path = require('path');
const loadCoupon = async (req, res) => {
  try {

    const couponData = await Coupon.find().sort({ Date: -1 });

    res.render("admin/coupon", { couponData });

  } catch (error) {
    console.error(error);
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      couponName,
      couponCode,
      minimumPurchase,
      discountAmount,
      expirationDate,
    } = req.body;
    const existingCoupon = await Coupon.findOne({ couponCode: couponCode });
    const couponData = await Coupon.find().sort({ Date: -1 });

    // Check if the expiration date is in the past
    const today = new Date();
    const expiryDate = new Date(expirationDate);
    if (expiryDate <= today) {
      return res.render("admin/coupon", { expiredDate: true, couponData }); // Render page with expiredDate flag
    }

    if (existingCoupon) {
      return res.render("admin/coupon", { couponExists: true, couponData });
    }

    const coupon = new Coupon({
      couponName: couponName,
      couponCode: couponCode,
      minimumPurchase: minimumPurchase,
      discountAmount: discountAmount,
      expirationDate: expirationDate,
    });
    const savedCoupon = await coupon.save();

    if (savedCoupon) {
      return res.redirect("/admin/coupon");
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const ToggleblockCoupon = async (req, res) => {
  try {
    const Couid = req.query.Couid;
    const coupons = await Coupon.findOne({ _id: Couid });
    coupons.isActive = !coupons.isActive;
    await coupons.save();
    res.redirect("/admin/coupon");
  } catch (error) {
    console.log(error.message);
  }
};
const removeCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const userId = req.session.user_id;

    // Find the coupon document based on the coupon code
    const updatedCoupon = await Coupon.findOneAndUpdate(
      { couponCode: couponCode },
      { $pull: { redeemedUsers: { userId: userId } } }, // Pull the user ID from the redeemedUsers array
      { new: true } // To return the updated document
    );



    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, selectedAmount } = req.body;
    const userId = req.session.user_id;
    const coupon = await Coupon.findOne({
      couponCode: couponCode,
      isActive: true,
      expirationDate: { $gte: Date.now() },
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Coupon not found or expired.",
      });
    }

    const userRedeemed = coupon.redeemedUsers.find(
      (user) => user.userId === userId
    );
    if (userRedeemed) {
      return res.json({
        success: false,
        message: "Coupon has already been redeemed by the user.",
      });
    }
    if (selectedAmount < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: "Selectected Coupon is not applicable for this price",
      });
    }

    coupon.redeemedUsers.push({ userId: userId, usedTime: new Date() });
    coupon.timesUsed++;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      couponName: coupon.couponName,
      discountAmount: coupon.discountAmount,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const couponDelete = async (req, res) => {
  try {
    const couponId = req.query.id;

    const deletedCoupon = await Coupon.findOneAndDelete({ _id: couponId });

    if (deletedCoupon) {
      return res.json({
        success: true,
        message: "Coupon deleted successfully",
      });
    } else {
      return res.json({ success: false, message: "Coupon not found" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  loadCoupon,
  addCoupon,
  ToggleblockCoupon,
  applyCoupon,
  removeCoupon,
  couponDelete,
};