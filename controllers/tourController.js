const multer = require('multer');
const sharp = require('sharp'); // Image processing library for Node.js
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

// __dirname oznacza folder, w którym aktualny skrypt jest zlokalizowany, JSON.parse konwertuje JSON w obiekt JS
// Tutaj wczytaliśmy dane z naszej uproszczonej DB
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

const multerStorage = multer.memoryStorage(); // Dzięki temu image zostanie zapisany jako Buffer w req.file.buffer

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// Multer, czyli middleware do przesyłania multi-part form data. Tworzymy upload, żeby określić ustawienia.
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// upload.array('images', 3) -> Jakbyśmy nie mieli image cover, to byśmy mogli to zrobić o tak, ale że mamy jeszcze imageCover, to mamy pole z jednym plikiem, i pole z kilkoma plikami, więc łączymy to właśnie w ten sposób
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/tours/${req.body.imageCover}`);

  // 2) Images // Nie możemy użyć async, wewnątrz sync function, dlatego korzystamy z Promise.all()
  req.body.images = []; // Musimy to robić, bo te elementy nie trafiają do req.body, tylko do req.files!!!!
  await Promise.all(
    req.files.images.map(async (el, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(el.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`./public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour, 'reviews');
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // Muszę pamiętać, że tak też można zapisać populate.
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// Pierwotna wersja funkcji, przed powstaniem handlerFactory. Jak zapisane były request handler functions.
// exports.deleteTour = catchAsync(async (req, res, next) => {
//   //await Tour.deleteOne({_id: req.params.id});
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null
//   });
// });

// Każdy stage to obiekt
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // Zauważyłem, że w quotes muszą być podane pola, które definiowaliśmy w Schema!!!!!
        numTours: { $sum: 1 }, // Każdy dokument zostanie policzony jako 1 i sumowany w numTours
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' }, // Pole, z którego chcemy obliczyć średnią, musimy podać w ''.
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 } // Teraz używany nazw, które nadaliśmy powyżej. 1 oznacza od najmniejszej do największej
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } } // Możemy powtarzać stages
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; // 2021 -> Konwertowanie ze stringu w liczbę

  const plan = await Tour.aggregate([
    // 1. Rozbij dokument, aby każda data z dokumentu była przypisana do jednego dokumentu
    {
      $unwind: '$startDates'
    },
    // 2. Sprawdź, czy dokument mieści się w podanym zakresie
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    // 3. Przypisz dokument do konkretnej grupy.
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tour: { $push: '$name' }
      }
    },
    // 4. Dodaj dodatkowe pole do wyniku.
    {
      $addFields: { month: '$_id' }
    },
    // 5. Nie wyświetlaj konktetnego pola.
    {
      $project: {
        _id: 0 // _id się nie wyświetli
      }
    },
    // 6. Posortuj w dół
    {
      $sort: { numTourStarts: -1 }
    },
    // 7. Określ ile wyników ma się wyświetlić w output
    {
      $limit: 12 // Wyświetli się tylko 6 grup
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/53.367505,14.652464/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // Dystans jaki chcemy mieć jako radius(promień) musimy przekonwertować w radiants i robimy to poniżej. Radiants, to iloraz naszego dystansu(promienia) i promienia ziemii. MongoDB po prostu oczekuje promienia naszej sfery, zeby był w radiantach.
  // let radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  let radius;
  if (unit === 'mi') {
    radius = distance / 3963.2;
  } else if (unit === 'km') {
    radius = distance / 6378.1;
  } else {
    return next(new AppError('Please provide either km or mi unit.', 400));
  }

  if (!lat || !lng) {
    return next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });
  // $centerSphere [[startPoint], radius];
  // Żeby móc robić queries, musimy dodać index do pola, w którym znajduje się geospatial data

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  let multiplier;
  if (unit === 'mi') {
    multiplier = 0.000621371192;
  } else if (unit === 'km') {
    multiplier = 0.001;
  } else {
    return next(new AppError('Please provide either km or mi unit.', 400));
  }

  if (!lat || !lng) {
    return next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  // Dla geospatial aggregation istnieje tylko i wyłącznie jeden stage, $geoNear. Wytłumaczone w lecture 171.
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1] // Konwertujemy w cyfry, geoJSON wymaga, żeby koordynaty były liczbami
        },
        distanceField: 'distance', // Pod tą nazwą zostanie zapisana odległość
        distanceMultiplier: multiplier // Dzielimy wynik przez 1000, żeby uzyskać KM zamiast metrów
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});

/********* NOTATKI 
//////////////////////////////////////////////////////////
Filtering napisany za pomocą specjalnych metod z Query.
 const query = await Tour.find()
   .where('duration')
   .equals(5)
   .where('difficulty')
   .equals('easy');

*/
