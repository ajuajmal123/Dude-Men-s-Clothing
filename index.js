const mongoose= require('mongoose')
require('dotenv').config()
 const config= require('../Dude/config/config')

mongoose.connect(process.env.MONGODB_URI)
const express= require('express')

const app=express()
const path=require('path')

const session=require('express-session')

const passport=require('./config/passport')
const flash= require('connect-flash')


const PORT=3000|| process.env.PORT
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true

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