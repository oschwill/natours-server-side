const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
// Logout Route
router.get('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// alle Routen nach /resetPassword/:token werden nun protected!!!
router.use(authController.protect);

router.patch('/updateMyPassword/', authController.updatePassword);

// ruft eigene User Daten ab
router.get('/me', userController.getMe, userController.getUser);
// Wird aufgerufen um eigene user Daten zu updaten
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
// Wird aufgerufen um den eigenen User zu deaktivieren => active = false in der DB
router.delete('/deleteMe', userController.deleteMe);

// Auf allen Routen nach /deleteMe wird nun die Middleware restrictTo geschaltet
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
