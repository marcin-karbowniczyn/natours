const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('./../utils/apiFeatures');
const AppError = require('./../utils/appError');


exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    /* 1 sposób, najpierw tworzymy dokument, a później wywołujemy metodę zapisz.
      const newTour = new Tour({});
      newTour.save();
      */
    // 2 sposób, metoda utwórz bezpośrednio na modelu. Tworzy, a następnie zapisuje.
    const doc = await Model.create(req.body); // Tu używamy obiektu przekonwertowanego z JSON do JS Object

    res.status(201).json({
      status: 'succes',
      data: {
        data: doc
      }
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    // const document = await Model.updateOne(
    //   { _id: req.params.id },
    //   { $set: req.body },
    
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true // Żeby validators zadziałały tak jak przy tworzeniu dokumentu, żeby nie były pomijane
    });

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: document
      }
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    //await Tour.deleteOne({_id: req.params.id});
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

exports.getOne = (Model, populateOptions) => {
  return catchAsync(async (req, res, next) => {
    // Szukamy dokumentu pośród dokumentów Tour, które znajdują się w kolekcji "tours".
    // Tour.findOne({ _id: req.params.id }) -> Inny sposób znalezienia tego dokumentu
    // Populate doda references do query/output, ale nie zmieni tego w DB

    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;

    if (!doc) {
      // tour === null, undifined, 0 etc.
      throw new AppError('There is no document with this ID', 404);
      // return next(new AppError('No tour found with that ID', 404)); // Rozwiązanie Jonasa
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });
};

exports.getAll = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    /*
    find() zwróci array dokumentów i automatycznie konwertuje je w JS
    find(req.query) = find({duration: '5'});
    find() zwraca query, a nie promise i musimy najpierw wykonać metody typu sort() zanim query zostanie zwrócone!!!!
    */

    // Potrzebujemy tych 2 linii kodu, dla GET Reviews On Tour, czyli dla Reviews dla konkretnego Tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    if (req.params.userId) filter = { user: req.params.userId };


    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // If there are some virtual references to show. Moje rozwiązanie.
    if (populateOptions) features.query = features.query.populate(populateOptions);

    const doc = await features.query;
    // const doc = await features.query.explain(); // Metoda explain(), używaliśmy jej do indeksów

    // SEND RESPOND
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
