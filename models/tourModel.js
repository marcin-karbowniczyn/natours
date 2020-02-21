/* Schemat to blueprint, jak dany dokument ma wyglądać, a model jest maszyną, która wtworzy dokument na podstawie schematu.
1. Tworzymy schemat, jak ma wyglądać document w kolekcji w DB, jakie mają być typy danych, jakie wymagane dane itd.
2. Tworzymy model, który działa trochę jak klasa, lub jak maszyna, która ma wykonać schemat, wprowadzić go w życie. W modelu określamy, jak nazwane mają być dokumenty stworzone przez ten schemat i jakiego schematu użyc do stworzenia dokumentu.
3. WAŻNE!: Gdy nasza aplikacja podłączona jest do Atlas MongoDB, to DB sama ogarnie jak nazwać kolekcję, weźmie ją z nazwy modelu, zmieni na lowercase i doda liczbę mnogą, np. "Tour" => "tours".
*/
const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel'); // Potrzebowaliśmy tego do funkcji 'embed users into tours'
// const validator = require('validator');

const locationSchema = new mongoose.Schema({
  // W Mongo, żeby stworzyć nowe embedded documents, muszą być one w Array.
  // Za każdym razem, gdy w schemacie zdefiniujemy obiekt w array, to behind the scenes, mongoose stworzy schemat.
  type: {
    type: String,
    default: 'Point',
    enum: ['Point']
  },
  coordinates: [Number],
  adress: String,
  description: String,
  day: Number
});

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, // Usuwa white space(puste pole) na początku i końcu stringu
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters.']
      // validate: [validator.isAlpha, 'Tour name must only contain characters'] -> Usunęliśmy, bo brał pod uwagę spacje
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'], // Tylko te stringi będą akceptowane
        message: 'Difficulty is either easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Reting must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: value => Math.round(value * 10) / 10 // Ta funkcja będzie wykonana za każdym razem, gdy nowa wartość zostanie przypisana do tego field // value.toFixed(1) -> moje rozwiązanie
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, ' A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // value = value inputed. Custom Validator ma zwrócić true lub false.
          // 'this' only points to current doc on NEW document creation -> to jest 'caveat' w mongoose
          return val < this.price; // False will trigger a validation error
        },
        message: 'Discount price ({VALUE}) should be below regular price' // ({VALUE}) => mongoose syntax, jest równe val
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String, // Nazwa obrazku, który później będziemy pobierać z FileSystem (reference)
      required: [true, 'A tour must have a cover iamge']
    },
    images: [String], // Array of strings
    createdAt: {
      type: Date,
      default: Date.now(), // Timestamp w milisekundach. W mongo będzie autoamtycznie przekonwertowany w aktualną datę
      select: false // Sprawia, że nie można go wybrać i jest całkwicie schowany/usuwany z outputu, chyba że zostanie manualnie wywołany w URL
    },
    startDates: [
      {
        date: {
          type: Date,
          required: [true, 'A tour must have a start date']
        },
        participants: {
          type: Number,
          default: 0
        },
        maxParticipants: {
          type: Number,
          default: 12
        }
      }
    ], // Array of Dates, Mongo sam przekonwertuje pewne formaty na daty np '2020-03-21'
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // MongoDB używa specjalnego GeoJSON format. Ten obiekt nie jest dla "schema type", jak pozostałe typu images, name itd. Jest to "embedded object", czyli osobny obiekt i dopiero w nim są "schema type". Żeby ten obiekt został rozpoznany przez Mongo jako GeoJSON potrzebujemy "type" i "coordinates".
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'] // Zawsze to będzie Point, bo tylko to dopuszczamy
      },
      coordinates: [Number], // Array of numbers. Longitude i latitude, odwrotnie niż zazwyczaj, ale tak działa GeoJson
      address: String,
      description: String
    },
    locations: [locationSchema],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true }, // Drugi obiekt w Schema to Schema Options, jeśli wysyłamy output jako JSON, to chcemy, aby Virtual Properties się w nim znalazły.
    toObject: { virtuals: true }
  }
);

// INDEKSY
//tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1, -1, 2dsphere -> typy indeksów
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // Wyk. 171, startLocation field has 2dsphere geospatial index on it.

// VIRTUAL PROPERTY
// Ta virtual property będzie stworzona za każdym razem, kiedy pobieramy dane z DB (get). Nie możemy użyć arrow function, ponieważ arrow functions nie mają swojego "this". This nie odnosiłoby się do dokumentu, gdyby tu była arrow function.
tourSchema.virtual('durationWeeks').get(function() {
  if (this.duration) {
    return (this.duration / 7).toFixed(1) * 1;
  }
});

// Virtual populate - bo reviews mogą rosnąć w nieskończoność i nie chcemy trzymać reference bezpośrednio w modelu Tour.
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // Pole w innym modelu, w tym przpyadku Review, w któym przechowywany jest reference do obecnego modelu, czyli Tour.
  localField: '_id' // Pole obecnego modelu, w którym jest informacja, do której referenced jest drugi model, w tym przypadku _id, bo właśnie do Tour.id odwołujemy się w Review.
});

///////////////////////// SCHEMA MIDDLEWARES ///////////////////////////////////////

////////////////////////////////////////////////
// DOCUMENT MIDDLEWARE => ten Middleware jest wykonywany konkretnie na procesowanym właśnie dokumencie.
// Middleware, który zostanie wykonany przed (pre) zapisaniem ('save' lub 'create') dokumentu w DB. This wskazuje na aktualnie procesowany dokument.
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// FUNCTION FOR EMBEDDING USERS INTO TOURS
// tourSchema.pre('save', async function(next) {
//   // el = id
//   const guidesPromises = this.guides.map(el => {
//     return User.findById(el);
//   });
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// // Post middleware ma dostęp do dokumentu, który został zapisany w DB.
// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// })

///////////////////////////////////////////////
// QUERY MIDDLEWARE
// This będzie wskazywał na aktualną Query, a nie Document. Hook ('find') sprawia, że jest to Query Middleware.

// tourSchema.pre('find', function(next) {
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

// tourSchema.post(/^find/, function(docs, next) {
//   console.log(`Query took ${Date.now() - this.start} milliseconds!`);
//   next();
// });

/////////////////////////////////////////////
// AGGREGATION MIDDLEWARE
// This wskaże na obecny aggregation object
// Aggregate object to array, więc musimy użyć unshift, żeby dodać stage
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({
//     $match: { secretTour: { $ne: true } }
//   });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
