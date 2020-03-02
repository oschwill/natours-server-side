/** DATEI FÜR DEN NODE SERVER **/
// Datenbank treiber für MongoDB
const mongoose = require('mongoose');
// Umgebungsvariablen laden
const dotenv = require('dotenv');

// Uncaught Exceptions
process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION !! Shutting down...');
  console.log(err.name, err.message);
  // nach einer Uncaught Exception ist der Serverprozess in einem sogenannten unclean state, deswegen muss der Server heruntergefahren werden!
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app'); // importieren express aus der app.js

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

/* Zugriff auf unsere hosted Atlas Datenbank */
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => console.log('DB connection successfull'));

/* Zugriff auf unsere lokale Datenbank */
// mongoose
//   .connect(process.env.DATABASE_LOCAL, {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useFindAndModify: false
//   })
//   .then(() => console.log('DB connection successfull'));

// 4) START SERVER
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Unhandled Rejection global abfangen => z.B. Keine Datenbankverbindung!
process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION !! Shutting down...');
  console.log(err.name, err.message);
  // Server ausschalten
  server.close(() => {
    // Mit close hat der server noch zeit alle prozesse die am Laufen sind abzuarbeiten!
    process.exit(1);
  });
});
