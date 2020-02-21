const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewMaxLength = 300;
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty.'],
      minlength: [3, 'Review must have at least 3 characters.'],
      maxlength: [reviewMaxLength, `Review can have maximum of ${reviewMaxLength} characters.`],
      trim: true
    },
    rating: {
      type: Number,
      default: 3,
      min: 1,
      max: 5,
      required: [true, 'You need to include a rating into review.']
    },
    createdAt: {
      type: Date,
      default: Date.now // Ta funkcja zadziała jak callback
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must have an author.']
    }
  },
  {
    toJSON: { virtuals: true }, // Drugi obiekt w Schema to Schema Options, jeśli wysyłamy output jako JSON, to chcemy, aby Virtual Properties się w nim znalazły.
    toObject: { virtuals: true }
  }
);

// Każda kombinacja tour i user będzie unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    select: 'name photo'
  });

  next();
});

// Statics to metody zapisane na modelu
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    // Należy pamiętać, że aggregate zwraca promise
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', async function() {
  // this points to current review
  // this.constructor to model, bo model to constructor dokumentu, dokument jest instancją modelu
  await this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
  // Trick, findOne zwraca nam document, który jest przedmiotem query. Zwrócony obiekt zapisujemy na query, żeby przekazać go, do kolejnego middleware.
  // Robiąc pre findOneAnd bierzemy też pod uwagę findById, bo findByIdAndUpdate to skrót dla findOneAndUpdate
  this.review = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // this.review = await this.findOne(); does NOT work here, query has already executed
  // await this.review.constructor.calcAverageRatings(this.review.tour); // Wykład 168
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

// Moje rozwiązanie funkcji powyżej, w której nie ma pre middleware, bo dostęp do dokumentu mamy w argumencie funkcji post middleware.
// reviewSchema.post(/^findOneAnd/, async function(updatedReview) {
//   await updatedReview.constructor.calcAverageRatings(updatedReview.tour);
// });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
