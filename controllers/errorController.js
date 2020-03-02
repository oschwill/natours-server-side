const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0]; // Wir holen uns den namen aus den quotes in der errmsg
  console.log(value);
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  // Wir loopen das Object
  const errors = Object.values(err.errors).map(el => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again!', 401);

const sendErrorDev = (err, req, res) => {
  // Wenn die url api beinhaltet soll ganz normal eine Error JSON zurückgesendet werden
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // 1) Log error
  console.error('ERROR !!!', err);
  // Wen nicht, dann soll eine Error Page zurückgesendet werden!
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  console.log('ERROR !!!', err);
  // FOR API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // Programming or other unknown error: dont leak error details
    // 1) Log error
    console.error('ERROR !!!', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }
  // RENDERED WEBSITE
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // Programming or other unknown error: dont leak error details
  // 1) Log error
  console.error('ERROR !!!', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    // Hardcopy des err Objekts erstellen!
    let error = { ...err };
    error.message = err.message;
    // Bei MongoDB Errors erhalten wir von mongoos ein Json Objekt mit informationen!!
    // Ein Property davon lautet z.B. "name": "CastError".
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // Wenn wir einen namen posten der bereits existiert!
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    // Ein Property davon lautet z.B. "name": "ValidationError".
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    // Wenn der JWT Token nicht gültig ist
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    // Wenn der JWT Token abgelaufen ist
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};
