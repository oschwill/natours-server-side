const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

// Middleware für die create Reviews, die zuvor die params tourId und userid überprüft
exports.setTourUserIds = (req, res, next) => {
  /** FÜR DIE NESTED ROUTES **/
  // Wenn wir keine Tour mitsenden im body, holen wir uns die Tour aus der Url!
  if (!req.body.tour) req.body.tour = req.params.tourId;
  // Wenn wir keinn User mitsenden im body, holen wir uns den User aus der protect middleware!
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

/* Get Factory Functions */
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);

/* Set Factory Functions */
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
