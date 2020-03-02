import axios from 'axios';
// Alerts
import { showAlert } from './alerts';
const stripe = Stripe('pk_test_REjJL7JFKqA3jvI7GoYSvVph00bPNTP9eE');

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);
    // 2) Create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', err);
  }
};
