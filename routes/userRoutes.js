const express = require('express')
const user_route = express()
const path = require('path')
const userController = require('../controllers/userController')
const auth = require('../middleware/auth')
const nocache = require('nocache')
const passport = require('passport')

user_route.set('view engine', 'ejs')
user_route.set('views', './views/users')


user_route.use(express.json());
user_route.use(nocache())
user_route.use(express.urlencoded({ extended: true }));
user_route.use(express.static(path.join(__dirname, 'public')));



user_route.get('/register', auth.isLogout, userController.loadRegister)
user_route.post('/register', auth.isLogout, userController.insertUser)
user_route.get('/otp', auth.isLogout, userController.getOTP)
user_route.post('/otp', auth.isLogout, userController.submitOTP)
user_route.post('/resend-otp', auth.isLogout, userController.resendOTP)
user_route.get('/', userController.loadHome)
user_route.post('/login', auth.isLogout, userController.confirmLogin)
user_route.get('/logout', auth.isLogin, userController.logout)

user_route.get('/product/:productId', userController.productPage);
//google authentication

user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res)=>{
    res.redirect('/')
})
module.exports = user_route