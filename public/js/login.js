/* clientseitiger login */
// http Request tool
import axios from 'axios';
// Alerts
import { showAlert } from './alerts';

export const login = async (email, password) => {
  if (email !== null && password !== null) {
    try {
      // mit axios können wir einen http request erzeugen! Wir fetchen also die login Adresse http://localhost:3000/api/v1/users/login und erhalten so unser JWTtoken in Form eines cookies
      const res = await axios({
        method: 'POST',
        url: 'http://127.0.0.1:3000/api/v1/users/login',
        data: {
          email,
          password
        }
      });

      if (res.data.status === 'success') {
        showAlert('success', 'Logged in successfully!');
        window.setTimeout(() => {
          // Weiterleitung auf die root page nach 1500 Millisekunden
          location.assign('/');
        }, 1500);
      }
    } catch (err) {
      showAlert('error', err.response.data.message);
    }
  } else {
    showAlert('error', 'Bitte geben Sie alles ein!');
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout'
    });

    // Wenn wir vom server success erhalten hat es funktioniert!
    if ((res.data.status = 'success')) {
      // Wir reloaden die Page, mit true forcen wir den server zu reloaden! Ohne true würde nur der Browser Chache gelöscht werden!
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
