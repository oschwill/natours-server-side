// Datenbank treiber für MongoDB
const mongoose = require('mongoose');
// Slugify
const slugify = require('slugify');
// Validator => nur für Strings!!
// const validator = require('validator');
// Unser User Schema Model
const User = require('./userModel');

// Den Collections Datenbankspezifikationen(Validierung) zuweisen, z.B. name soll string und required sein usw. .Nennt sich Schema
const toursSchema = new mongoose.Schema(
  {
    // SchemaDefinition
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters']
      // validate: [validator.isAlpha, 'Tour Name must only contain characters'] // validator => isAlpha check if the string contains only letters (a-zA-Z).
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      // darf nur easy, medium oder difficult beinhalten, enum ist nur für strings
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium or difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      // min und max funktioniert auch mit dates
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      // Wir runden den Wert hinter den Nachkommastellen auf, funktioniert nur bei neuen eingefügten Werten
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      // Eigene Custom Validierungen erstellen!! Funktioniert nicht bei Update, da das this keyword nur auf das create DOC zeigt
      validate: {
        validator: function(val) {
          return val < this.price;
        },
        // Mongoose kann mit ({VALUE}) auf den eingegebenen Wert zugreifen!!
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'The tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String], // Ein Array von Strings
    createAt: {
      type: Date,
      default: Date.now(),
      select: false // Damit excluden wir das Feld createAt
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    // Embedded Documents, Relationsdokumente zu den Touren werden als Array mit Objekten dargestellt. Im Referencing hingegen nur die Objekt ID
    // d.h. Wir erstellen in unserem Tour Dokument weitere Dokuments. In unserem Fall ein startLocation Dokument und ein locations Dokument!
    startLocation: {
      // GeoSpatialData
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    /** EMBEDDED DOCUMENT DATENFELD BEISPIEL **/
    // guides: Array
    /** REFERENCE DOCUMENT BEISPIEL => CHILD REFERENCING */
    guides: [
      {
        // Überprüft ob die eingegebene User ID der User Schema ObjectId entspricht und einer regulären MongoDB ID entspricht
        type: mongoose.Schema.ObjectId,
        // setzen die Referenz auf das User Schema Model
        ref: 'User'
      }
    ]
  },
  {
    // SchemaOptionen
    // aktiviere unsere virtuellen Properties. Diese werden nun mit angezeigt im Output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false
  }
);

/** Wir setzten einen index auf den query aufsteigend nach Preis **/
// Wenn nun explizit nach Preis gesucht wird, Kann hierdurch die Performance des queries starken beschleunigt werden!
// toursSchema.index({ price: 1 }); // 1 steht für ORDER BY ASC
// Compound Index, mit mehr als 1 indexparameter
toursSchema.index({ price: 1, ratingsAverage: -1 }); // 1 steht für ORDER BY ASC, -1 für DESC
toursSchema.index({ slug: 1 });
toursSchema.index({ startLocation: '2dsphere' }); // A 2dsphere index supports queries that calculate geometries on an earth-like sphere

/** VIRTUAL PROPERTIES **/
// Wir definieren ein Feld das nicht in der MongoDB Datenbank existiert!! Kann in einem Query nicht explizit gesucht werden!
toursSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Wenn wir nun für eine bestimmte Tour die Reviews haben wollen, können wir anstatt child oder parent Referencing auch virtual properties einsetzten!
// Virtual populate genannt
// Die populate Methode wird dann im tourController in der getTour Funktion aufgerufen
toursSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // ist das Datenfeld aus der Foreign Collection reviews die anhand der Object.id auf die tour collection verweist
  localField: '_id' // ist unsere tour id
});

/*** MONGOOSE MIDDLEWARE ***/
// Es gibt 4 Middleware Typen document middleware, model middleware, aggregate middleware, und query middleware
/* DOCUMENT MIDDLEWARE : runs before .save() und .create() => d.h, die middleware wird bevor der Datensatz in die Datenbank gespeichert wird, aufgerufen!!*/
// pre
toursSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

/** EMBEDDED DOCUMENT BEISPIEL!! **/
// Checken ob die User ID im User Model existiert bevor wir diese in guides einfügen! Embedded doucment Beispiel!
// toursSchema.pre('save', async function(next) {
//   // Wir erstellen eine neues Array die Promises erhält
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   // erhalten einen resolved oder einen reject und fügen damit das komplette Document der übergebenen ID ein!!
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

/** PRE SAVE MIDDLEWARE BEISPIEL!! **/
// multiple middlewares => pre save hook / Weitere pre aufrufen!
// toursSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   next();
// });

/** POST SAVE MIDDLEWARE BEISPIEL!! **/
// // post after query is executed!
// toursSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

/** QUERY MIDDLEWARE BEISPIEL **/
// toursSchema.pre('find', function(next) {
// /^find/ beinhaltet auch die findeOne() bzw.. findById()
toursSchema.pre(/^find/, function(next) {
  // Hole alle Touren die secretTour auf false haben! geheime Touren sollen nicht angezeigt werden!
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now(); // Timer starten
  next();
});

// eine pre query middleware die mit populate() bei allen find() queries immer auch die Referenzdokumente dazu holt!
toursSchema.pre(/^find/, function(next) {
  /** Mit populate(Referenz Datenfeld) holen wir anhand der Referenz Object id das dazugehörige komplette Document! **/
  this.populate({
    // Referenz Datenfeld
    path: 'guides',
    // Wir excluden folgende Informationen aus dem query
    select: '-__v -passwordChangedAt'
  });
  next();
});

// post => after query is executed!
toursSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`); // Timer beenden
  // console.log(docs);
  next();
});

/** AGGREGATION MIDDLEWARE BEISPIEL!! **/
// Wird vor oder nach Aggregation Pipelines ausgeführt. Ein Beispiel einer Aggregation Pipeline ist in der tourController.js in getTourStats
toursSchema.pre('aggregate', function(next) {
  // Falls der erste Key in der pipeline $geoNear lautet muss dieser key innerhalb der pipeline am Anfang stehen!!
  const geoNear = Object.keys(this.pipeline()[0])[0];

  // Wenn kein $geoNear vorhanden oist hängen wir den $match am Anfang der Pipeline
  if (geoNear !== '$geoNear') {
    // Hole alle Touren die secretTour auf false haben!
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }

  next();
});

// Das angelegte Schema einem Model zuweisen. Modelvariablen werden immer groß geschrieben!
const Tour = mongoose.model('Tour', toursSchema);

module.exports = Tour;
