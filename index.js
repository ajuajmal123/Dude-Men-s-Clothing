const mongoose = require('mongoose')
require('dotenv').config()
const MongoStore = require('connect-mongo');

mongoose.connect(process.env.MONGODB_URI)
  
const express = require('express')

const app = express()

const path = require('path')

const session = require('express-session')
const cors = require('cors');
const passport = require('./config/passport')
const flash = require('connect-flash')

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT | 3000  
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET , 
     store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, 
  })
);
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
// Make flash messages available in all templates
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});
app.use(cors());


//for user routes
const user_route = require('./routes/userRoutes')
app.use('/', user_route)


//for Admin routes
const admin_route = require('./routes/adminRouts')
app.use('/admin', admin_route)



app.listen(PORT, () => {
    console.log('Server is running');
})