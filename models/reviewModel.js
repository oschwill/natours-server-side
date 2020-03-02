const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Please insert a review Text!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please rate the Tour!']
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    // Parent Referencing
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.']
    }
  },
  {
    // SchemaOptionen
    // aktiviere unsere virtuellen Properties. Diese werden nun mit angezeigt im Output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false
  }
);

/** COMPOUND INDEX **/
// Jede Kombination von tour und user unique machen
// Damit kann jeder User immer nur einmal eine Review pro Tour abgeben!
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

/** PRE SAVE MIDDLEWARE FÜR FIND QUERIES **/
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   // ohne das - bedeutet, wir wollen nur das bestimmte Feld ausgeben. In unserem Fall nur den Namen der Tour!
  //   // Virtuelle Properties können nicht unselected werden und werden daher immer mit ausgegeben!!
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });

  this.populate({
    path: 'user',
    // ohne das - bedeutet, wir wollen nur das bestimmte Feld ausgeben. In unserem Fall nur den Namen des Users!
    // Virtuelle Properties können nicht unselected werden und werden daher immer mit ausgegeben!!
    select: 'name photo'
  });

  next();
});

// statische Funktion, kann wie instance Methoden nur über das Model aufgerufen werden
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  // console.log(tourId); // hier steht nur die Tour id drin
  const stats = await this.aggregate([
    {
      // womit gematcht werden soll
      $match: { tour: tourId }
    },
    {
      // group by
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  console.log(stats); // BeispielAusgabe: [ { _id: 5e412ac86dd6c8578c232e55, nRating: 6, avgRating: 3 } ]

  // Wenn mindestens ein Rating vorhanden ist dann soll die Berechnung stattfinden, ansonsten setzten wir die Werte auf Default
  if (stats.length > 0) {
    // Die erhaltene Statistik in stats, nRating = Summe aller Ratings, avgRating = Der Durchschnittswert des Ratings
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// Middleware um die Ratings pro Tour zu berechnen
reviewSchema.post('save', function() {
  // this points to current review, this.constructor steht für das später erstellte Review Model
  // Wir rufen die statische calcAverageRatings also mit this.constructor auf, da dass Review Model erst danach erstellt wird, siehe unten
  this.constructor.calcAverageRatings(this.tour); // this = unser Schema, tour = Schemaproperty

  // diese post middleware enthält kein next!!
});

/* Middleware, wenn wir Reviews / Ratings updaten => /^findOneAnd/ sucht nach findByIdAndUpdate / findByIdAndDelete */
/* Erste Möglichkeit */
// reviewSchema.pre(/^findOneAnd/, async function(next) {
//   // Wir erstellen ein neues Property damit wir hinterher in der post middleware drauf zugreifen können
//   // DENN: nur in einer pre haben wir Zugriff auf den durchgeführten query, im POST hingegen können wir aber das DOCUMENT als Parameter nutzten
//   this.r = await this.findOne(); // r steht für review
//   console.log(this.r);

//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function() {
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });

// /* Zweite Möglichkeit für Reviews / Ratings updaten */
// in der post erhalten wir das veränderte Dokument als parameter editedReview, daher brauchen wir wie in möglichkiet 1 nur die post funktion!!
reviewSchema.post(/^findOneAnd/, async function(editedReview) {
  if (!editedReview) return; // aus der Funktion rausspringen wenn document null ist
  await editedReview.constructor.calcAverageRatings(editedReview.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
