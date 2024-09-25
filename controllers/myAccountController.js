const Address = require('../models/addressModel')
const User = require('../models/userModel');
const Order = require('../models/orderModel')
const bcrypt = require('bcrypt');
const Product = require('../models/productModel')
const Cart = require('../models/cartModel')
const validator = require('validator')
const Wallet = require('../models/walletModel')
const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const Swal = require('sweetalert2');
let instance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY,
});
const myAccount = async (req, res) => {
    try {
        const PAGE_SIZE = 4;
        const userId = req.session.user_id
        const user = await User.findById(userId)
        // const addresses= await Address.find({userId})
        const addresses = await Address.find({ userId }).populate('userId', 'name mobile');
        // Pagination logic for orders
        const page = parseInt(req.query.page) || 1;
        const totalOrdersCount = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrdersCount / PAGE_SIZE);

        const orders = await Order.find({ userId }).populate('items.productId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE);;
            let wallet = await Wallet.findOne({ userId });
        
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0 });
                await wallet.save();
            }

        res.render('myAccount', {
            user, addresses, orders, wallet,currentPage: page, totalPages, messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        })

    } catch (error) {
        console.log(error.message)
    }
}



const updateDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, mobile, password, npassword, cpassword } = req.body;

        // Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            req.flash('error', "User not found");
            return res.redirect('/myaccount');
        }

        // Update basic details
        user.name = name;
        user.mobile = mobile;

        // Validate password change
        if (password && npassword && cpassword) {
            // Check if the current password matches
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                req.flash('error', "Current password is incorrect");
                return res.redirect('/myaccount');
            }

            // Check if the new password matches the confirmation
            if (npassword !== cpassword) {
                req.flash('error', "New password and confirm password do not match");
                return res.redirect('/myaccount');
            }

            // Check if the new password is the same as the current password
            const isSameAsCurrent = await bcrypt.compare(npassword, user.password);
            if (isSameAsCurrent) {
                req.flash('error', "New password cannot be the same as the current password");
                return res.redirect('/myaccount');
            }

            // Validate the strength of the new password
            if (!validatePassword(npassword)) {
                req.flash('error', "Password should contain at least 8 characters, including one symbol, one uppercase letter, and one number.");
                return res.redirect('/myaccount');
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(npassword, 10);
            user.password = hashedPassword;
        }

        // Save the updated user
        await user.save();

        // Redirect to account page after successful update
        req.flash('success', 'Account details updated successfully');
        res.redirect('/myaccount');

    } catch (error) {
        console.error("Error updating user details:", error);
        req.flash('error', "Internal server error");
        res.redirect('/myaccount');
    }
};

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


const addAddressPage = async (req, res) => {
    try {
        const userId = req.session.user_id
        const user = await User.findById(userId)
        res.render('addAddress', { user })

    } catch (error) {
        console.log(error.message)
        req.flash('error', 'Internal server error');
    }
}

const addAddress = async (req, res) => {
    try {
        const { name, mobile, address, pincode, state, district, city, isDefault } = req.body;
        const userId = req.session.user_id;


        const defaultAddress = isDefault === 'on';

        if (defaultAddress) {

            await Address.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        const newAddress = new Address({
            userId,
            name,
            mobile,
            address,
            pincode,
            state,
            district,
            city,
            isDefault: defaultAddress
        });

        await newAddress.save();
        req.flash('success', 'Address added successfully');
        res.redirect('/myaccount');
    } catch (error) {
        console.log(error.message);
        req.flash('error', 'Internal server error');
    }
};


const editAddressPage = async (req, res) => {
    try {
        const userId = req.session.user_id
        const user = await User.findById(userId)
        const address = await Address.findById(req.params.id);
        res.render('editAddress', { address, user });
    } catch (error) {
        console.log(error.message);
        req.flash('error', 'Internal server error');
    }
}

const editAddress = async (req, res) => {
    try {
        const { name, mobile, address, pincode, state, district, city, isDefault } = req.body;
        const addressId = req.params.id;


        const defaultAddress = isDefault === 'on';

        if (defaultAddress) {

            const currentAddress = await Address.findById(addressId);
            await Address.updateMany({ userId: currentAddress.userId, isDefault: true }, { isDefault: false });
        }

        await Address.findByIdAndUpdate(addressId, {
            name,
            mobile,
            address,
            pincode,
            state,
            district,
            city,
            isDefault: defaultAddress
        });
        req.flash('success', 'Address updated successfully');
        res.redirect('/myaccount');
    } catch (error) {
        console.log(error.message);
        req.flash('error', 'Internal server error');
        res.redirect('/myaccount');
    }
};


const deleteAddress = async (req, res) => {
    try {
        const addressId = req.params.addressId;
        const address = await Address.findById(addressId);

        if (!address) {
            req.flash('error', 'Address not found');
            return res.redirect('/myaccount');
        }
        // Delete the address from the database
        await Address.deleteOne({ _id: addressId })
        req.flash('success', 'Address deleted successfully');
        res.redirect('/myaccount');
    } catch (error) {
        console.log(error.message);
        req.flash('error', 'Internal server error');
        res.redirect('/myaccount');
    }
};

const myOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const productId = req.query.productId;

        const order = await Order.findById(orderId).populate('userId address items.productId');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the item in the order's items array that matches the provided productId
        const selectedItem = order.items.find(item => String(item.productId._id) === productId);

        if (!selectedItem) {
            return res.status(404).send('Product not found in the order');
        }

        // Render the orderDetails view with only the selected product
        res.render('myOrderDetails', { order, selectedItem });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};
const updateOrderStatus = async (req,res)=>{
    try {
      const { orderId, status } = req.body;
      if (!orderId || !status) {
          return res.status(400).json({ success: false, message: "Order ID and status are required" });
      }
  
      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }
  
      order.status = status;
      await order.save();
  
      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
  }
  const cancelMyOrder = async (req, res) => {
    try {
      const { orderId, productId, quantity } = req.body;
      const userId = req.session.user_id;
  
      // Find the order of the user
      const order = await Order.findOne({ userId, _id: orderId });
  
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
  
      // Find the item in the order
      const item = order.items.find(item => item.productId.toString() === productId);
  
      if (!item) {
        return res.status(404).json({ success: false, message: "Item not found in order" });
      }
  
      // Update delivery status to "Cancelled"
      item.deliveryStatus = "Cancelled";
  
      // Restore stock quantity in product schema
      const product = await Product.findById(productId);
  
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      product.stock += parseInt(quantity); // Increment stock
  
      // Deduct total amount of canceled products from the order
      let canceledAmount = item.price;
      
      // Check if coupon applied for the order
      if (order.couponDiscount > 0) {
        // Calculate the discount amount based on the couponDiscount percentage
        const discountAmount = (canceledAmount * order.couponDiscount) / 100;
        canceledAmount -= discountAmount;
      }
  
      order.totalAmount -= canceledAmount;
  
      // Save changes
      await order.save();
      await product.save();
  
      // Refund the canceled amount to the user's wallet if not cash on delivery
      if (order.paymentMethod !== "Cash on Delivery") {
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
          return res.status(404).json({ success: false, message: "Wallet not found for the user" });
        }
  
        wallet.balance += canceledAmount;
        wallet.history.push({
          amount: parseFloat(canceledAmount),
          type: "credit",
          createdAt: new Date(),
        });
        await wallet.save();
      }
  
      res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };
  
  
const addTowallet = async (req, res) => {
    try {
        let amount = req.body.amount;

        const userId = req.session.user_id;
        // Create Razorpay order
        const order = await instance.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: userId
        });

        // Update wallet balance
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: parseFloat(amount) });
        } else {
            wallet.balance += parseFloat(amount);

            // Add transaction to history

            wallet.history.push({
                amount: parseFloat(amount),
                type: 'credit',

                createdAt: new Date()
            });
        }

        await wallet.save();


        res.json({ order });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};
module.exports = {
    myAccount,
    updateDetails,
    addAddressPage,
    addAddress,
    editAddressPage,
    editAddress,
    deleteAddress,
    myOrderDetails,
    validatePassword,
    addTowallet,
    cancelMyOrder,
    updateOrderStatus
}
