/** ERROR KLASSE **/
// Wir erben von der Javascript Klasse Error
class AppError extends Error {
  constructor(message, statusCode) {
    // Die Message an den Basis Konstruktor übergeben
    super(message);

    this.statusCode = statusCode;
    // Wenn der StatusCode mit 4 anfängt soll 'fail' in status stehen ansonsten 'error'
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // Dieses property steht für ein trusted error
    this.isOperational = true;

    // Der Stacktrack zeigt uns den Ort an, wo der Fehler auftrat!!
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
