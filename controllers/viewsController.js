const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.alerts = (req, res, next) => {
  const alert = req.query.alert;
  if (alert === 'booking') 
    res.locals.alert = 'Your booking was successful! Please check your email for a confirmation. If your booking doesn\'t show up here immediately, please come back later.'

  next();
}

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template using data from 1)
  res.status(200).render('overview', {
    tours // Wiadomo, że w obiekcie może być samo 'tours' zamiast 'tours: tours'.
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour
  });
});

exports.getSignUpForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Sign up to our site'
  })
}

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
    user: req.user
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) Find tours with returned IDs
  const tourIds = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  // Moje rozwiązanie
  // const tourPromises = tourIds.map(el => Tour.findById(el));
  // const tours = await Promise.all(tourPromises);


  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});

exports.getMyFavouriteTours = catchAsync(async (req, res, next) => {
  res.status(200).render('favouriteTours', {
    title: 'My favourite tours'
  })
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser
  });
});

/*
const exampleFunction = (req, res) => {
  res.status(200).render('base', {
    tour: 'The Forest Hiker',
    user: 'Jonas'
  }); // Express przejdzie do folderu, który wcześniej określiliśmy w app.set() i tam poszuka template z nazwą base. Następnie weźmie ten template, wyrenderuje i wyśle do przeglądarki/klienta
};
*/
