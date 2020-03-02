const fs = require('fs');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
// package for uploading data
const multer = require('multer');
// package um große images zu resizen
const sharp = require('sharp');

// // upload auf der Festplatte ablegen
// const multerStorage = multer.diskStorage({
//   // cb steht für callback function, Wir definieren die upload destination!
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-767676abc76dba-33232376764.jpeg => user-id-timestamp.filetype
//     const ext = file.mimetype.split('/')[1]; // holen uns aus dem mimetype 'image/jpeg' nur jpeg
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

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

// eigene upload Middleware Function
exports.uploadUserPhoto = upload.single('photo');

// Middlware um upgeloadete Bilder zu resizen
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Den timestamp in unseren req.user object packen damit wir später darauf zugreifen können( wird atm nicht verwendet! )
  req.user.timeStamp = Date.now();
  // Wir re-definen das property filename, da der filename im buffer nicht gesetzt wird!!!!
  req.file.filename = `user-${req.user.id}-${req.user.timeStamp}.jpeg`;

  // Wir greifen auf das im Memory abgelegte Bild zu, auch buffer genannt!
  await sharp(req.file.buffer)
    .resize(500, 500) // resize(width, height) => wir croppten das image auf 500px mal 500px
    .toFormat('jpeg') // convert to formart jpeg
    .jpeg({ quality: 90 }) // komprimieren die Quali auf 90%
    .toFile(`public/img/users/${req.file.filename}`); // legen die Destination inkl. filename fest und speichern es dort auf die disk

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // durchloopen das Object
  Object.keys(obj).forEach(el => {
    // abfragen ob der Eintrag el sich in den allowedFields befindet, wenn ja dann fülle das Object newObj mit dem Wert!
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Middleware, wenn der User seine eigenen Daten abrufen will tauschen wir die token daten mit den params daten aus und rufen einfach die getOne Funktion die wir schon haben auf
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;

  next();
};

// update meine User Daten inkl. User Photo
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated!
  const filteredBody = filterObj(req.body, 'name', 'email'); // Holen uns nur die Werte für bestimmte Datenbankfelder

  if (req.file) {
    filteredBody.photo = req.file.filename;

    // Lösche die alten images falls vorhanden
    await deleteimages(req.user.id, req.user.timeStamp);
  }
  // 3) Update user document
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

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use signup'
  });
};

const deleteimages = async (userid, timestamp) => {
  /** MEIN EIGENER WORKAROUND, DAMIT DATEIEN ERSETZT WERDEN!  **/
  const userFolder = 'public/img/users/';
  const userData = [];

  await fs.readdir(userFolder, (err, files) => {
    files.forEach(async file => {
      if (file === `user-${userid}-${timestamp}.jpeg`) return;
      if (file.startsWith(`user-${userid}`)) {
        await fs.unlink(`${userFolder}${file}`, err => {
          if (err) {
            return next(
              new AppError('Fehler beim Löschen der vorhandenen images!!!', 400)
            );
          }
        });
      }
    });
  });
};

/* Get Factory Functions */
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

/* Set Factory Functions */
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
