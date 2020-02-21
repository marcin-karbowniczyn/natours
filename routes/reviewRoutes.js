const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController')

const router = express.Router({ mergeParams: true }); // Dzięki mergeParams mamy dostęp do parametrów z poprzednich routerów, z których przenieśliśmy się do tego routera. Domyślnie, każdy router ma dostęp tylko do parametrów swoich routes (route to URL, któy przypinami do routera, a później inne metody jak POST, GET etc.)

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    bookingController.checkIfBooked,
    reviewController.createReview
  );

// Zaimplementować rozwiązanie, dla którego userzy mogą edytować tylko swoje recenzje
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(authController.restrictTo('user', 'admin'), reviewController.checkIfAuthor, reviewController.updateReview)
  .delete(authController.restrictTo('user', 'admin'), reviewController.checkIfAuthor, reviewController.deleteReview);

module.exports = router;
