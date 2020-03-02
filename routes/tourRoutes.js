const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./reviewRoutes');
const router = express.Router();

/** NESTED ROUTES **/
/** BEISPIELE:
 * POST /tour/234fad4/reviews => erstellt eine neue Review unter der Tourid 234fad4
 * GET /tour/234fad4/reviews => ruft alle Reviews der Tourid 234fad4 ab
 * GET /tour/234fad4/reviews/94887fda => ruft die Review 94887fda der Tourid 234fad4 ab *
 */
// Für die Route z.B. /:tourId/reviews nutzten wir die revieRoute als middleware, wir mounten diese
router.use('/:tourId/reviews', reviewRouter); // Wir leiten also dann weiter nach reviewRoutes wo die reviewRoute auf die tourID zugreifen kann

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year').get(
  authController.protect,
  // Nur Admins und lead-guides dürfen Touren löschen
  authController.restrictTo('admin', 'lead-guide', 'guide'),
  tourController.getMonthlyPlan
);

// Hole alle Touren innerhalb eines bestimmten Geo Radius
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    // Nur Admins und lead-guides dürfen Touren löschen
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    // Nur Admins und lead-guides dürfen Touren löschen
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
