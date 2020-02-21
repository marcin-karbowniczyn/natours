const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');
// const catchAsync = require('../utils/catchAsync');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes, user potrzebny, żeby w review był reference do usera, a nie mamy go w req.body
  if (!req.body.tour) req.body.tour = req.params.tourId;
  req.body.user = req.user.id;
  next();
};

exports.checkIfAuthor = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (req.user.role !== 'admin') {
    if (review.user.id !== req.user.id)
      return next(new AppError(`You cannot edit someone's else review.`, 401));
  }
  next();
};

exports.getAllReviews = factory.getAll(Review);

// Moja implementacja, nieco mniej elegancka niż Jonasa
// let reviews;
// if (req.params.tourId) {
//   reviews = await Review.find({ _id: req.params.tourId });
// } else {
//   reviews = await Review.find();
// }

exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
