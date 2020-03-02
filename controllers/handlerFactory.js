const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

// Eine delete Function für alle Models (Tour, User, Review) => Factory Function, wir returnen eine handlerfunction
// Es ist nichts anderes als eine Javascript Closure
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndRemove(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: 'row successfully deleted'
    });
  });

// Update Function für alle Models
exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    // Und hier zwischen sollte die mongoose pre Funktion im Model ausgeführt werden!

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true // überprüft nach Datentyp der im Schema definiert ist! Muss explizit für update aktiviert werden
    });

    // Hier zwischen sollte die mongoose post Funktion im Model ausgeführt werden!!

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    // Daten in die MongoDB Datenbank einfügen!
    const doc = await Model.create(req.body); // im create läuft die Validierung im Schema automatisch

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

// die getOne bekommt nun noch einen zweiten Parameter popOptions
// Mit diesem Parameter können wir eine populate Funktion übergeben die z.B. die getTour Funktion im tourController nutzt!!
exports.getOne = (Model, popOptions) =>
  // Damit wir nicht immer einen try catch Block schreiben müssen, nutzten wir unsere catchAsync Funktion
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    // Wenn popOptions übergeben wurden, hängen wir die populate Funktion an den Query
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;
    // findbyId => Tour.findOne({ _id: req.params.id })
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        date: doc
      }
    });
  });

exports.getAll = Model =>
  /** Wir wrappen die Tourhandler Funktionen in die catchAsync Funktion!!! **/
  catchAsync(async (req, res, next) => {
    /* filter für Reviews für nested get reviews on tour */
    let filter = {};
    // Wenn eine bestimmte tourid übergeben wird, filtern wir im query danach, ansonsten werden alle Touren ausgegeben
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // EXECUTE QUERY
    // Wir rufen die Methoden direkt bei der Instanziierung auf und chainen diese!!!! Dies ist nur möglich wenn wir das this Objekt returnen
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc
      }
    });
  });
