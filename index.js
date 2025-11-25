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

// Basic startup log
console.log('Starting app...');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// If behind a proxy (Render), enable trust proxy so secure cookies work
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || '';

/* Session middleware - we will attach it after DB connects (below)
   - cookie.secure will be true in production to require HTTPS
*/
function setupSession() {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'change-me',
      store: MongoStore.create({ mongoUrl: MONGO_URI }),
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === 'production' }, // secure cookies in prod
    })
  );
}

// Passport & flash middleware
function setupAuthAndFlash() {
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  // Make flash messages available in all templates
  app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
  });
}

app.use(cors());

// For routes (these are mounted after middleware but before listen)
const user_route = require('./routes/userRoutes');
const admin_route = require('./routes/adminRouts');

app.use('/', user_route);
app.use('/admin', admin_route);

// Start server helper
function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ Server is running and listening on port ${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  });
}

// Connect to MongoDB then set up session and start server
if (MONGO_URI) {
  console.log('⏳ Connecting to MongoDB...');
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('✅ MongoDB connected');
      setupSession();
      setupAuthAndFlash();
      startServer();
    })
    .catch((err) => {
      console.error('❌ MongoDB connection error:', err);
      // If you don't want to exit, still start server (optional)
      // startServer();
      process.exit(1);
    });
} else {
  console.warn('⚠️ No MONGODB_URI provided — starting server without DB (not recommended for production)');
  // still setup session but MongoStore needs a mongoUrl, so skip session
  setupAuthAndFlash();
  startServer();
}
