const mongoose= require('mongoose')
require('dotenv').config()
 const config= require('../Dude/config/config')
mongoose.connect('mongodb://127.0.0.1:27017/Dude')

const express= require('express')

const path=require('path')

const session=require('express-session')

const passport=require('./config/passport')
const flash= require('connect-flash')
const app=express()

const PORT=3000|| process.env.PORT
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret:config.sessionSecret,
    resave:false,
    saveUninitialized:false,
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
// Make flash messages available in all templates
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
  });



//for user routes
const user_route=require('./routes/userRoutes')
app.use('/',user_route)


//for Admin routes
const admin_route=require('./routes/adminRouts')
app.use('/admin',admin_route)



app.listen(PORT,()=>{
    console.log('Server is running');
})