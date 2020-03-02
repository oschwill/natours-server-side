/** DATEI FÜR EXPRESS **/
// Mit dem Pfadmodul können wir mit mit Datei und Verzeichnispfaden arbeiten
const path = require('path');
const express = require('express');
const morgan = require('morgan');
// Hiermit können wir requests limitieren
const rateLimit = require('express-rate-limit');
// dient dafür Security HTTP Headers zu setzten
const helmet = require('helmet');
// schützt vor NO-SQL Injections!
const mongoSanitize = require('express-mongo-sanitize');
// Schützt vor XSS Attacken!
const xss = require('xss-clean');
// http parameter pollution
const hpp = require('hpp');
// parsed eingehende request cookies
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError'); // unsere Error Klasse
const globalErrorHandler = require('./controllers/errorController');

/* Routes importieren */
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
// server-side-rendering Routen
const viewRouter = require('./routes/viewRoutes');

// Start express app
const app = express();

// Einbinden der template Engine pug
app.set('view engine', 'pug');
// Geben den Pfad für pug an, wo sich die Templates befinden
app.set('views', path.join(__dirname, 'views')); // path joined den aktuellen directoyname mit dem Ordner views

// 1) GLOBAL MIDDLEWARES

// Serving static files => machen den Ordner public bekannt! Und können somit vom root aus auf css/ und img/ etc. zugreifen!!!!
app.use(express.static(path.join(__dirname, 'public')));

// SECURITY HTTP Headers, sollte bestenfalls als erstes laufen, daher ganz oben!
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  // erlaubt 100 requests in 1 Stunde von einer IP-Adresse
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});

// limiter wird über die komplette /api Route aufgerufen! All unsere Routes starten mit api
app.use('/api', limiter);

// Wir limitieren die request Größe(json) auf 10kb
app.use(express.json({ limit: '10kb' })); // Middleware express.json => ähnlich wie bodyparser, also req.body auslesen!
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Hiermit können wir auf form-data aus einer posted form mit req.body abrufen
app.use(cookieParser()); // parsen die Daten aus dem eingehenden cookie

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitisation against XSS => escaped unter anderem code und html tags
app.use(xss());

// entfernt Duplikate im queryString => z.B. aus ?sort=duration&sort=price kommt die Variablenzuweisung durcheinander, da wir 2 mal den sort parameter haben
// Nach der Entfernung der Duplikate wird der letzte Parameter verwendet, also bei ?sort=duration&sort=price wird nach price sortiert!
// WICHTIG!!: IN MANCHEN FÄLLEN WOLLEN WIR ABER MEHRMALS DIE SELBEN PARAMETER z.B. ?duration=5&duration=9, wir wollen alle Touren mit duration 5 und 9!
// WICHTIG!!: Für diese Fälle können wir eine Whitelist in der hpp Function mit {whitelist: [...]} festlegen!
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

/** Eigene Middleware bauen **/
// Mit der next Funktion(3tes Argument) weiss express das wir eine Middleware kreieren
// Die Middleware muss immer vor dem Routing erstellt werden, da Sie sonst nicht aufgerufen wird, da der Request/Response Cycle schon durchgelaufen ist!!!
// app.use((req, res, next) => {
//   console.log('Hello from the middleware!'); // Wird nun bei jedem Request auf die Seite ausgeführt!
//   next();
// });

// eigene Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // Hängen an dem Request ein neues Property requestTime an
  // console.log(req.cookies);
  next();
});

// server-side-Rendering Routen mounten
app.use('/', viewRouter);

// web-api Routen
app.use('/api/v1/tours', tourRouter); // Wir mounten die Router
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// unhandled Routes => werden aufgerufen wenn die Routen zuvor oben nicht zutrafen!! Das * steht für alles
app.all('*', (req, res, next) => {
  // const err = new Error(`Cant find ${req.originalUrl} on this server`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // Der Parameter err skipt alle darauffolgenden Middlewares und springt direkt zum Error Handling
  // ohne den err parameter wird die Error Handling Middleware nicht aufgerufen!!!
  // next(err);
  /** unsere eigene ErrorKlasse an Next übergeben! **/
  next(new AppError(`Cant find ${req.originalUrl} on this server`, 404));
});

/** Global Error Handling Middleware!! **/
app.use(globalErrorHandler); // globalErrorHandler Function aus errorController.js

module.exports = app; // exportieren Express
