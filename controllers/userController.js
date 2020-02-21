const multer = require('multer');
const sharp = require('sharp'); // Image processing library for Node.js
const fs = require('fs');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   // file === req.file, cb === callback function (dziala jak next z express)
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
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

const deletePhotoFromServer = async photo => {
  const path = `${__dirname}/../public/img/users/${photo}`;
  await fs.unlink(path, err => {
    if (err) return console.log(err);
    console.log('Previous photo has been deleted');
  });
};

exports.uploadUserPhoto = upload.single('photo'); // Photo to field, w jakim znajduje się plik w requescie. Te funkcja stworzy także req.file.

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  // Kiedy procesujemy obrazek, najlepiej nie zapisywać go od razu na dysku, tylko najpierw w cache(memory).
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`./public/img/users/${req.file.filename}`); // Dopiero tu obraz zostanie zapisany na dysku/serwerze.

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // Object.keys returns array of field names.
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// To pass id from user object instead of req.params in the /me endpoint
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('This route is not for password updates. Please use /updateMyPassword', 400)
    );
  }

  // 2) Filter out unwanted field names that are not allowed to be updated.
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) If uploading new photo, delete the old one from the server.
  if (req.file) await deletePhotoFromServer(req.user.photo);

  // 4) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { active: false } }); // Lub samo { active: false }
  // Może być req.user.id, Mongoose to parsuje.

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined. Please use /signup instead.'
  });
};

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
