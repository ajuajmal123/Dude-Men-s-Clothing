const express = require('express')
const user_route = express()
const path = require('path')
const userController = require('../controllers/userController')
const myAccountController=require("../controllers/myAccountController");
const searchController=require('../controllers/searchController')
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
user_route.get('/', userController.getAllProducts);
user_route.get('/allproducts',userController.allProducts)
user_route.get('/product/:productId', userController.productPage);

user_route.get('/filter',searchController.get_searchedProducts);
//google authentication

user_route.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
user_route.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/register',
}),(req, res) => {
    req.session.user_id = req.user._id;
    res.redirect('/');
});

user_route.get('/', userController.successLogin);
user_route.get('/register', userController.failureLogin);

//myaccount
user_route.get('/myaccount',auth.isLogin,myAccountController.myAccount)
user_route.post('/update-detail/:id',auth.isLogin,myAccountController.updateDetails)
user_route.get('/add-address',auth.isLogin,myAccountController.addAddressPage);
user_route.post('/add-address',auth.isLogin,myAccountController.addAddress)
user_route.get('/edit-address/:id',auth.isLogin, myAccountController.editAddressPage);
user_route.post('/edit-address/:id',auth.isLogin, myAccountController.editAddress);
user_route.post('/delete-address/:addressId',auth.isLogin, myAccountController.deleteAddress);
user_route.get('/myorderdetails/:orderId',auth.isLogin,myAccountController.myOrderDetails)
user_route.post('/addTowallet',myAccountController.addTowallet)

//Cart management
user_route.get('/cart', auth.isLogin, userController.renderCart)
user_route.post('/add-to-cart/:productId',auth.isLogin,  userController.addToCart);
user_route.post('/update-quantity',auth.isLogin, userController.updateQuantity);
user_route.get('/remove-from-cart/:productId',auth.isLogin,userController.remove_product_from_cart)
user_route.get('/api/check-stock/:productId',userController.checkStock)
user_route.get('/checkout',auth.isLogin, userController.renderCheckOut);
user_route.get('/checkout-address',auth.isLogin,userController.checkoutAddresspage);
user_route.post('/checkout-address',auth.isLogin,userController.addCheckoutAddress);
user_route.get('/edit-checkoutaddress/:id',auth.isLogin, userController.editCheckoutAddressPage);
user_route.post('/edit-checkoutaddress/:id',auth.isLogin, userController.editCheckoutAddress);

//order
user_route.post('/place-order',auth.isLogin, userController.placeOrder);
user_route.get('/ordersuccess',auth.isLogin, userController.renderOrderSuccess);

//wishlist 
user_route.get('/wishlist',userController.renderWishlist);
user_route.post('/addtowishlist/:productId',userController.addToWishlist);
user_route.post('/removefromwishlist',userController.removeFromWishlist);

//category filter
user_route.get('/products/category/:categoryId',userController.categoryFiltering)

//color filter
user_route.get('/products/color/:colorName',userController.colorFiltering)

module.exports = user_route