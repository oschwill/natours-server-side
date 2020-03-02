const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');
// package for uploading data
const multer = require('multer');
// package um große images zu resizen
const sharp = require('sharp');

// wenn wir das Bild nach dem Upload resizen, sollten wir das Bild erstmal nur in den Memory speichern anstatt direkt auf die disk abzulegen!
// Nach dem resizen, können wir ebenfalls mit sharp die Datei auf die disk ablegen!
const multerStorage = multer.memoryStorage(); // Wir legen das Bild in einen buffer, in sharp können wir darauf zugreifen!

// upload Validierung
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images!', 400), false);
  }
};

// options object für unseren Upload
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// upload.fields erstellt ein Mix aus imageCover und images
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  /* multiple files sind in req.files, während bei single nur eine Datei auf req.file ist!!!! */

  // Wenn keine Bilderuploads vorhanden sind, springen wir zur nächsten middleware mit next()
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover image - nur ein Bild
  // Den Filename an den body hängen, damit später die Funktion updateOne darauf zugreifen kann!
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333) // resize(width, height) => wir croppten das image auf 2000px mal 1333px, eine 3 to 2 ratio!
    .toFormat('jpeg') // convert to formart jpeg
    .jpeg({ quality: 90 }) // komprimieren die Quali auf 90%
    .toFile(`public/img/tours/${req.body.imageCover}`); // legen die Destination inkl. filename fest und speichern es dort auf die disk

  // 2) Images - max. 3 Bilder
  // Auch hier erzeugen wir ein neues body property
  req.body.images = [];

  // da map mehrere asynchrone Funktionen erzeugt fangen wir diese mit Promise.all ab. F
  //unktioniert nur wenn wir die promises auch saven, mit map tun wir dies, da wir ein array erzeugen!
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333) // resize(width, height) => wir croppten das image auf 2000px mal 1333px, eine 3 to 2 ratio!
        .toFormat('jpeg') // convert to formart jpeg
        .jpeg({ quality: 90 }) // komprimieren die Quali auf 90%
        .toFile(`public/img/tours/${filename}`); // legen die Destination inkl. filename fest und speichern es dort auf die disk

      // Hängen die filenames an das body property images für die updateOne Funktion
      req.body.images.push(filename);
    })
  );

  next();
});

/** eigene Middleware **/
exports.aliasTopTours = (req, res, next) => {
  // Wir füllen die req.query Parameter mit vordefinierten Werten für die Top 5 cheapest Tours
  req.query.limit = '5'; // 5 Treffer
  req.query.sort = '-ratingsAverage,price'; // -ratingsAverage = ratingsAverage DESC , price = price ASC
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty'; // die aus der Datenbank ausgelesenen Felder!
  next();
};

/* Get Factory Funktionen aus handlerFactory */
exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' }); // holt sich zusätzlich die Daten aus der Review Collection

/* Set Factory Funktionen aus handlerFactory */
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

/** AGGREGATION PIPELINES!!  **/
exports.getTourStats = catchAsync(async (req, res, next) => {
  /**** Aggregation pipeline in MongoDB, ähnlich wie aggregatfunktionen und group by in sql!! ****/
  const stats = await Tour.aggregate([
    {
      // womit gematcht werden soll
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      // group by
      $group: {
        _id: { $toUpper: '$difficulty' }, // stelle Buchstaben groß dar
        numTours: { $sum: 1 }, // sumiere die Results, jeweils 1 mal pro Result
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' }, // berechne den Durchschnitt
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' }, // hole den kleinsten Wert in Preis
        maxPrice: { $max: '$price' } // hole den größten Wert in Preis
      }
    },
    {
      // Wir können nur die oben von uns oben definierten Felder sortieren
      $sort: { avgPrice: 1 } // 1 für sortiere ASC
    }
    // {
    //   // Wir können weitere Matches hinzufügen, z.B. not equal zu EASY
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ]);

  // Das Ergebnis senden wir im Json Format als Response zurück!!
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  /**** Aggregation pipeline in MongoDB, ähnlich wie aggregatfunktionen und group by in sql!! ****/
  // year in eine Number umwandeln mit * 1
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      // addFields erstellt einen neues Feld
      $addFields: { month: '$_id' }
    },
    {
      // mit prject können wir bestimmte Felder nicht mehr anzeigen lassen!!!
      $project: {
        _id: 0
      }
    },
    {
      // nach numTourStarts abwärts sortieren
      $sort: { numTourStarts: -1 } // -1 = DESC
    },
    {
      // Auf 12 Outputs limitieren
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// geospacial data => über die URL /tours-within/:distance/center/:latlng/unit/:unit
// Beispielurl: /tours-within/233/center/34.111745,-118.113491/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(','); // holen uns latitude und longitude in ein Array und destructuren diese in Variablen

  // In radiant umrechnen. Wenn unit Milen sind dann müssen wir die Distanz durch 3963.2 rechnen, wenn Kilometer dann durch 6378.1
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format like lat,lng',
        400
      )
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

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
  const [lat, lng] = latlng.split(','); // holen uns latitude und longitude in ein Array und destructuren diese in Variablen

  // Meter in Meilen oder Meter in Kilometer
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format like lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier // Wandelt Meter in Kilometer um => ist das selbe als wenn wir durch 1000 teilen bzw mit 0.001 multiplizieren
      }
    },
    {
      // Folgende Datenfelder sollen nur angezeigt werden
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
