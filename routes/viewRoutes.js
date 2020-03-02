// server-side-rendering Route
const express = require('express');
const router = express.Router();

// Controller
const viewsController = require('./../controllers/viewsController');
const authController = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');

// 3) ROUTES
// isLoggedIn überprüft ob der User eingeloggt ist und schaltet somit den richtigen Header!

router.get(
  '/',
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);

// Login Route
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
// Signup Route
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm);

// User profile
router.get('/me', authController.protect, viewsController.getAccount);
// gebuchte Tour eines Users!
router.get('/my-tours', authController.protect, viewsController.getMyTours);

// Update User profile über eine Form via POST <= oldschool
router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
