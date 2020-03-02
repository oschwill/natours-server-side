const express = require('express');
const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');
const router = express.Router({ mergeParams: true }); // mit mergeParams: true kann unsere reviewRoute auf die params der tourRoute zugreifen

/* durch mergeParams: true, werden folgende URLS
 *
 * POST /tour/234fad4/reviews => erstellt eine neue Review unter der Tourid 234fad4
 * GET /tour/234fad4/reviews => ruft alle Reviews der Tourid 234fad4 ab
 * GET /tour/234fad4/reviews/94887fda => ruft die Review 94887fda der Tourid 234fad4 ab *
 *
 * NUN AUCH VERARBEITET!!
 */

router.use(authController.protect);

router
  .route('/')
  .get(authController.protect, reviewController.getAllReviews)
  .post(
    // Nur User dürfen Reviews erstellen
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  );

module.exports = router;
