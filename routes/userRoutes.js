const express = require('express')
const user_route = express()
const multer = require('multer')
const upload = multer()
const path = require('path')
const userController = require('../controllers/userController')
const myAccountController = require("../controllers/myAccountController");
const searchController = require('../controllers/searchController')
const userProductController = require('../controllers/userProductController')
const auth = require('../middleware/auth')
const nocache = require('nocache')
const passport = require('passport')

user_route.set('view engine', 'ejs')
user_route.set('views', './views/users')

user_route.use(express.urlencoded({ extended: true }));
user_route.use(express.json());
user_route.use(nocache())

user_route.use(express.static(path.join(__dirname, 'public')));
user_route.use(passport.initialize())
user_route.use(passport.session())

user_route.get('/register', auth.isLogout, userController.loadRegister)
user_route.post('/register', auth.isLogout, userController.insertUser)
user_route.get('/Otp', auth.isLogout, userController.getOTP)
user_route.post('/Otp', auth.isLogout, userController.submitOTP)
user_route.post('/resend-otp', auth.isLogout, userController.resendOTP)

user_route.get('/', userController.loadHome)
user_route.post('/login', auth.isLogout, userController.confirmLogin)
user_route.get('/logout', auth.isLogin, userController.logout)
//user side products

user_route.get('/', userController.getAllProducts);
user_route.get('/allproducts', userProductController.allProducts)
user_route.get('/product/:productId', userProductController.productPage);
user_route.get('/filter', searchController.get_searchedProducts);
//google authentication

user_route.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
user_route.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/register',
}), (req, res) => {
    req.session.user_id = req.user._id;
    res.redirect('/');
});

user_route.get('/', userController.successLogin);
user_route.get('/register', userController.failureLogin);

//myaccount
user_route.get('/myaccount', auth.isLogin, myAccountController.myAccount)
user_route.post('/update-detail/:id', auth.isLogin, myAccountController.updateDetails)
user_route.get('/add-address', auth.isLogin, myAccountController.addAddressPage);
user_route.post('/add-address', auth.isLogin, myAccountController.addAddress)
user_route.get('/edit-address/:id', auth.isLogin, myAccountController.editAddressPage);
user_route.post('/edit-address/:id', auth.isLogin, myAccountController.editAddress);
user_route.post('/delete-address/:addressId', auth.isLogin, myAccountController.deleteAddress);
user_route.post('/cancel-order',auth.isLogin,myAccountController.cancelMyOrder)
user_route.post('/updateOrderStatus',myAccountController.updateOrderStatus)
user_route.get('/myorderdetails/:orderId', auth.isLogin, myAccountController.myOrderDetails)

user_route.post('/addTowallet', myAccountController.addTowallet)

//Cart management
user_route.get('/cart', auth.isLogin, userProductController.renderCart)
user_route.post('/add-to-cart/:productId', auth.isLogin, userProductController.addToCart);
user_route.post('/update-quantity', auth.isLogin, userProductController.updateQuantity);
user_route.get('/remove-from-cart/:productId', auth.isLogin, userProductController.remove_product_from_cart)
user_route.get('/api/check-stock/:productId', userProductController.checkStock)
user_route.get('/checkout', auth.isLogin, userProductController.renderCheckOut);
user_route.get('/checkout-address', auth.isLogin, userProductController.checkoutAddresspage);
user_route.post('/checkout-address', auth.isLogin, userProductController.addCheckoutAddress);
user_route.get('/edit-checkoutaddress/:id', auth.isLogin, userProductController.editCheckoutAddressPage);
user_route.post('/edit-checkoutaddress/:id', auth.isLogin, userProductController.editCheckoutAddress);

//order
user_route.post('/place-order', auth.isLogin, userProductController.placeOrder);
user_route.post('/verify-payment',auth.isLogin,userProductController.verifyPayment)
user_route.get('/ordersuccess', auth.isLogin, userProductController.renderOrderSuccess);

//wishlist 
user_route.get('/wishlist', userProductController.renderWishlist);
user_route.post('/addtowishlist/:productId', userProductController.addToWishlist);
user_route.post('/removefromwishlist', userProductController.removeFromWishlist);

//category filter
user_route.get('/products/category/:categoryId', userProductController.categoryFiltering)

//color filter
user_route.get('/products/color/:colorName', userProductController.colorFiltering)

module.exports = user_route