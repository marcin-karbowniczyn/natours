const mongoose = require('mongoose');
const Tour = require('./tourModel');
const AppError = require('../utils/appError');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour.']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User.']
  },
  date: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'Booking must have a tour start date.']
  },
  price: {
    type: Number,
    require: [true, 'Booking must have a price']
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  paid: {
    type: Boolean,
    default: true
  }
});

bookingSchema.pre('save', async function(next) {
  const tour = await Tour.findById(this.tour);
  const startDate = tour.startDates.id(this.date);

  // If there is a maximum number of participants, throw an error.
  if (startDate.participants >= startDate.maxParticipants)
    return next(new AppError('Sorry, but this tour has a maximum number of participants already. Please book another date.'));

  startDate.participants++;
  await tour.save();
  next();
});

// Na razie nie potrzebuje populate tour i user
bookingSchema.pre(/^find/, function(next) {
  this.populate('user').populate({
    path: 'tour',
    select: 'name'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
