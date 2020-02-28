class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // new Error(message) -> przywołujemy constructor funkcji parent, a ona akceptuje tylko argument message. String to error message property czyli err.message.
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor) // Tego nie czaję
  }
}

module.exports = AppError;

