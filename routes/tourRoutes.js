const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRoutes = require('./reviewRoutes');
const bookingRoutes = require('./bookingRoutes');

//////// Stary kod bez routes:
// app.get('/api/v1/tours', getAllTours);
// app.post('/api/v1/tours', createTour);
// app.get('/api/v1/tours/:id', getTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);
// W 'route' określamy nasz route, czyli URL i przypisujemy do niego requesty, jakie chcemy obsłużyć. Powyżej stary kod, gdzie każdy request był obsługiwany osobno.

const router = express.Router();

// Metoda param sprawi, że jeśli w URL są jakieś parametry, to wtedy wykona funkcję callback.
// router.param('id', tourController.checkID);

// POST /tour/23487fd9w8f329/reviews
// GET /tour/23487fd9w8f329/reviews
router.use('/:tourId/reviews', reviewRoutes);
router.use('/:tourId/bookings', bookingRoutes);

router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/distances/:latlng/unit/:unit')
  .get(tourController.getDistances);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit') // Tak by to wyglądało używając Query String zamiast params -> /tours-within?distance=233&center=-40,45&unit=mi
  .get(tourController.getToursWithin);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
