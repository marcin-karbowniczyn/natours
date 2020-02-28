const AppError = require('./../utils/appError');

// Operacyjne Errory, które pochodzą z MongoDB lub Mongoose i które musimy przygotować, żeby nasz error handler potraktował je, jako właśnie operacyjne errory i wyświetlił konkretną wiadomość użytkownikowi a nie tylko generyczną wiadomość

// Te funkcję stworzyliśmy, żeby można było w komfortowy sposób zmienić statusCode i status, wykorzystując stworzony wcześniej appError.
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0].replace(/[$-/:-?{-~!"^_`\[\]]/g, '');
  const message = `Duplicate field value: ${value}. Please use another value.`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  //const message = err.message // Dużo krótsze rozwiązanie, bez pętli, ale "brudniejsze", gorzej wyglądające.
  const errors = Object.values(err.errors).map(el => el.message); // Object.values zwraca array tych errorów.
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401); // 401 = unauthorised
const handleJWTExpiredError = () =>
  new AppError('You token has expired. Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  // A) API ERROR
  // OriginalUrl to sam route, bez hostname.
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // B) RENDERED WEBSITE
  console.error('ERROR!!', err);
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong. dupa',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API ERROR
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      // Operational, trusted error: send message to client
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    // Programming or other unknown error: don't leak error details, log an error and send generic message.
    console.error('ERROR!!', err);
    return res.status(500).json({
      status: 'error',
      message: 'Something gone wrong'
    });
  }

  // B) RENDERED WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong.',
      msg: err.message
    });
  }
  // Programming or other unknown error: don't leak error details, log an error and send generic message.
  console.error('ERROR!!', err);
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong.',
    msg: 'Please try again later.'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // Jeśli undifined, to statusCode === 500
  err.status = err.status || 'error'; // Jeśli undifined, to status === 'error'

  if (process.env.NODE_ENV === 'development') {
    
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message; // Quick fix, wyklad 192, nie mielismy dostepu do message

    // Errors coming from Mongoose
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

    // Errors coming from JWT
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

//////////////// Moje notatki /////////////////////////
/* Moje rozwiązanie Cast Error:

if (err.name === 'CastError') {
  err.isOperational = true;
  err.statusCode = 400;
  err.status = 'fail'
  err.message = `Invalid ${err.path}: ${err.value}.`
}
*/
