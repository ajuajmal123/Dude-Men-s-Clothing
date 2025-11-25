// index.js
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const MongoStore = require('connect-mongo');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const passport = require('./config/passport');
const flash = require('connect-flash');

const app = express();

console.log('Starting app...');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

// ------- Connect to MongoDB first -------
console.log('⏳ Connecting to MongoDB...');
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    // ------- SESSION MUST COME BEFORE PASSPORT -------
    app.use(
      session({
        secret: process.env.SESSION_SECRET ,
        store: MongoStore.create({ mongoUrl: MONGO_URI }),
        resave: false,
        saveUninitialized: false,
        cookie: { secure: process.env.NODE_ENV === 'production' },
      })
    );

    // ------- Now enable Passport -------
    app.use(passport.initialize());
    app.use(passport.session());

    // Flash messages
    app.use(flash());
    app.use((req, res, next) => {
      res.locals.success = req.flash('success');
      res.locals.error = req.flash('error');
      next();
    });

    app.use(cors());

    // ------- MOUNT ROUTES ONLY AFTER SESSION + PASSPORT -------
    const user_route = require('./routes/userRoutes');
    const admin_route = require('./routes/adminRouts');

    app.use('/', user_route);
    app.use('/admin', admin_route);

    // ------- Start Server -------
    app.listen(PORT, () => {
      console.log(`✅ Server is running and listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
