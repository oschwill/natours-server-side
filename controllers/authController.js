const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // cookie Konfiguration
  const cookieOptions = {
    // In Millisekunden konvertieren!
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true, // Funktioniert nur über eine https Verbindung
    httpOnly: true
  };

  // Wenn wir uns im production mode befinden, verwenden wir eine HTTPS Verbindung und können dann secure auf true setzten!!!
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // http only cookie erstellen => dient zur Sicherheit vor Cross-Site Scripting (XSS)
  res.cookie('jwt', token, cookieOptions);

  // Wir entfernen das Password aus dem Response! Damit das Passwort nicht mit gesendet wird!!
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  });

  // Wir senden eine signup Email, die unser welcome template nutzt!
  // `${req.protocol} => wir holen uns das Protokoll (http oder https)
  // ://${req.get('host')} => wir holen uns den host(Domäne) z.b. localhost oder www.example.com
  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  // Wir können nun mit dem user document user auf die Instance method aus userModel.js zugreifen!!!
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

// http only cookies kann man mit javascript nicht löschen, mit einem workaround setzen wir den cookie neu, aber ohne jwt token! Somit sind wir ausgeloggt!
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 Sekunden
    httpOnly: true
  });
  res.status(200).json({
    status: 'success'
  });
};

// Middleware Function die unsere Session überprüft bevor eine bestimmte URL aufgerufen wird, prüft ob der User eingeloggt ist, ob das JWTtoken gültig ist!
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    // Für cookie Abfrage
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // Wenn kein token vorhanden ist, dann Fehlermeldung werfen
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get Access', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists => in decoded haben wir die id des users zum dazugehörigen token!
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belongs to this token does no longer exist', 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // iat = issued at , abgelaufen am
    return next(
      new AppError('User recently changed password! please log in again.', 401)
    );
  }

  // Wir erzeugen ein neues Requestobjekt user mit den Userdaten aus currentUser. Dieses Objekt können wir dann in der nächsten aufgerufenen Middleware nutzen, z.B. in restrictTo()
  req.user = currentUser;
  // There is a logged in User => mit res.locals.user liefern wir Daten an das jeweilige template! Wir übergeben die User Daten!
  res.locals.user = currentUser;
  // GRANT ACCESS TO PROTECTED ROUTE
  next();
});

// ist für die rendered pages, wenn eingeloggt dann soll ein anderer header angezeigt werden!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // Verify our token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        // iat = issued at , abgelaufen am
        return next();
      }

      // There is a logged in User => mit res.locals.user liefern wir Daten an das jeweilige template! Wir übergeben die User Daten!
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      // Unser logout cookie hat keinen gültigen token und springt daher in den catch
      return next();
    }
  }
  next();
};

// Überprüfen ob der eingeloggte User die Rollen besitzt, womit er eine bestimmte Action auslösen kann! z.B. eine Tour löschen etc...
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

// wenn das Passwort vergessen wurde und wir ein neues Passwort via email anfordern!!
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based in posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }
  // 2) generate the random reset token
  const resetToken = user.createPasswordResetToken();
  // vor dem Update deaktivieren wir die Schema Validierung, da er sonst die required fields verlangt! WEIL wir ja ein neues Datenfeld hinzufügen!!
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to users email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    // Wenn das Senden der Email fehlschlägt dann soll nicht einfach nur eine Fehlermeldung geworfen werden sondern auch die Datenbankfelder gecleart!!!you understand?! motherfucckaa!!
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// tauscht das neue Passwort gegen das alte aus! setzten ein Passwort geändert Datum!
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

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send jwt
  createSendToken(user, 200, res);
});

// Wenn der Benutzer im eingeloggten Zustand sein Passwort ändert!!
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password'); // explizit nur das Passwort holen
  if (!user) {
    return next(new AppError('Der User existiert nicht', 400));
  }
  // 2) check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
