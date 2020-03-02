// Ein eingebautes Hash module von node
const crypto = require('crypto');
const mongoose = require('mongoose');
// Validator => nur für Strings!!
const validator = require('validator');
// Passwörter hashen
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Schemadefinition
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A Username must have less or equal then 40 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      trim: true,
      unique: true,
      // Email mit Validator überprüfen
      validate: [validator.isEmail, 'Please provide a valid email'],
      lowercase: true
    },
    photo: {
      type: String,
      default: 'default.jpg'
    },
    role: {
      type: String,
      // Unsere Benutzer Rollen!!
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'A Password is required'],
      minlength: [
        8,
        'A password must have at least more or equal 8 characters'
      ],
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your Password'],
      validate: {
        // Arrow Funktionen funktionieren nicht, da wir das this Keyword brauchen das auf das Schema zeigt!! Daher normale function
        // Funktioniert nur bei SAVE und CREATE, bei update aber nicht!!!!!!!
        validator: function(el) {
          // Überprüfen ob das Password dem Confirm Password entspricht
          return el === this.password;
        },
        message: 'Passwords are not the same!'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  },
  {
    // SchemaOptionen
    // aktiviere unsere virtuellen Properties. Diese werden nun mit angezeigt im Output
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

// eine pre save mongoose middleware nutzten um das Password zu hashen
userSchema.pre('save', async function(next) {
  // Soll nur laufen, wenn das Password editiert wird, damit z.B. jemand seine Email ändert, nicht immer das Password neu gehasht wird!!
  if (!this.isModified('password')) return next();

  // Password hashen with a cost of 12, der 2te Parameter ist die Stärke des crypt Verfahrens, je größer desto sicherer aber auch rechenintensiver!!
  this.password = await bcrypt.hash(this.password, 12);

  // Unser passwordConfirm dient nur zur Überprüfung und Abgleichung und bleibt aber dann leer
  this.passwordConfirm = undefined;
  next();
});

// Wenn das Passwort geändert wird setzten wir das Datum in passwordChangedAt mit dieser pre save middleware
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Middleware für find(), wird bevor find() query läuft aufgerufen
userSchema.pre(/^find/, function(next) {
  // this points to the current query, holt sich nur user mit active: not equal false
  this.find({ active: { $ne: false } });
  next();
});

// Instance method, ist auf allen user documents verfügbar überall
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    // mit getTime wandeln wir das Date in einen Timestamp um!! und konvertieren mit parseInt / 1000 von millisekunden in Sekunden!
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // Wenn das Ablaufdatum des Tokens, kleiner ist als das Passwortänderungs Datum, dann stimmt was nicht und wir returnen true, ansonsten natürlich false!
    return JWTTimestamp < changedTimestamp;
  }

  // Passwort wurde nicht geändert!
  return false;
};

// Weitere Instance method zum resetten des Passwortes
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
