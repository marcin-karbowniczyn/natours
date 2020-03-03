const { promisify } = require('util'); // Potrzebujemy tego, żeby mieć promisify method. Używamy destr. żeby wziąć tylko jedną metodę
const crypto = require('crypto'); // Built-in Node Module
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = id => {
  // Jak zawsze: { id } === { id: id};
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// const deleteUnwantedFields = (user) => {
//   const currentUser = Object.create(user);
//   currentUser.password = undefined;
//   currentUser.counter = undefined;
//   currentUser.blocked = undefined;
//   currentUser.active = undefined;

//   return currentUser;
// }

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000), // Konwersja z dni do milisec
    httpOnly: true, // Cookie nie może być modyfikowane przez przeglądarkę, tylko web serwer ma dostęp. Przez to nie możemy go usunąć z poziomu przeglądarki, więc zastosowana została metoda nadpisania
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https' // Cookie zostanie wysłane tylko przez HTTPS. Zmiany w tej linijce kodu są spowodowane deployem w Heroku i są omówione w wykładzie 223.
  });

  // Remove unwanted fields from the response
  user.password = undefined;
  user.counter = undefined;
  user.blocked = undefined;
  // const currentUser = deleteUnwantedFields(user) // Moje rozwiązanie

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      // Tak w ogóle, to ten zabieg, czyli data w data to ENVELOPING
      user
    }
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body; // Destructuring, to samo co: email = req.body.email

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  
  // '+password' - zaznaczamy, że potrzebujemy password, który wcześniej został ukryty w modelu
  const user = await User.findOne({ email }).select('+password +counter +blocked'); // { email } === { email: email }

  // 2) Check if email adress is valid (added for blocking functionality to work properly)
  if (!user) return next(new AppError('Incorrect e-mail or password', 401));

  // 3) Check if user is blocked
  const timeToUnblock = await user.checkIfBlocked();
  if (user.blocked) {
    const secondsToUnblock = parseInt(timeToUnblock / 1000);
    return next(
      new AppError(
        `Too many incorrect attempts. You are blocked from logging in. Wait ${secondsToUnblock} seconds and try to log again.`
      )
    );
  }

  // 4) Check if passwords matches, and update counter for incorrect login attempts
  if (!(await user.correctPassword(password, user.password))) {
    await user.isLoginIncorrect(true);
    return next(new AppError('Incorrect email or password', 401));
  } else {
    await user.isLoginIncorrect(false);
  }

  // 5) If everything is ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please log in to get access.', 401));
  }

  // 2) Verification token
  // Verify() to async function, 3 argument to callback, który zostanie wykonany jak skończy się weryfikacja. Weryfikuje, czy nikt nie zmieniał ID, które jest w payload tego tokenu.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser)
    return next(new AppError('The user belonging to this token does no longer exist.', 401));

  // 4) Check if user changed password after the JWT(token) was issued. iat = 'issued at'
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again.', 401));
  }

  // Access granted to the protected route. Req 'podróżuje' od middleware, do middleware.
  req.user = currentUser;
  // res.locals.user = currentUser; // Rozwiązanie Jonasa, ja przekazałem usera w req.user i dodałem go do tempalte.
  next();
});

// Only for rendering pages, not errors!
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    // Check if user has logged out (there is a malformed cookie)
    if (req.cookies.jwt === `loggedout`) return next();

    // 1) verify token
    const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

    // 2) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next();
    }

    // 3) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    // THERE IS A LOGGED IN USER
    res.locals.user = currentUser;
    req.user = currentUser;
    return next();
  }
  // No one is logged in
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles = ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};

exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email adress.', 404));
  }

  // 2) Generate the random reset token
  // To nie jest mała funkcja, więc zapiszemy ją jako instance methods. Thick models, thin controllers.
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Save, żeby zapisać doc w bazie danych, na razie go tylko edytowaliśmy.

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email.'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later.', 500));
  }
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is a user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired.'), 400);
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update passwordChangedAt property for the user
  // To zostało wykonane jako pre save middleware w userModel.js

  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  // 2) Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Invalid password. Please try again.', 401));
  }

  // 3) Update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});
