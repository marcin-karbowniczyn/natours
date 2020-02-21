const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const bookingRoutes = require('./bookingRoutes');

const router = express.Router();

router.use('/:userId/bookings', bookingRoutes);

// Specjalny endpoint signUp nie spełnia wymogów REST, bo w URL jest nazwa tego, co będzie robione, czyli rejestracja. Czasem są takie wyjątki.
router.post('/signup', authController.signUp);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Ta linijka kodu spowoduje, że wszystkie middlewares poniżej zostaną wykonane dopiero po wykonaniu protect.
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe); // Używamy delete dlatego, że user i tak nie będzie nigdzie dostępny, więc w tym wypadku użycie delete jest ok.

// After this line of code, only admins will get access to middlewares/functions below
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
