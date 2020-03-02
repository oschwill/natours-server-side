// updateData
// http Request tool
import axios from 'axios';
// Alerts
import { showAlert } from './alerts';

// type is either password or data
export const updateSettings = async (data, type) => {
  if (data !== null) {
    try {
      // Wenn type password ist dann updateMyPassword url ansonsten updateMe url
      const url =
        type === 'password'
          ? 'http://127.0.0.1:3000/api/v1/users/updateMyPassword'
          : 'http://127.0.0.1:3000/api/v1/users/updateMe';

      if (data.email) if (!validateEmail(data.email)) return;

      const res = await axios({
        method: 'PATCH',
        url,
        data
      });

      if (res.data.status === 'success') {
        showAlert('success', `${type.toUpperCase()} updated successfully`);
        window.setTimeout(() => {
          // Die aktuelle Seite reloaden!!
          location.reload();
        }, 1500);
      }
    } catch (err) {
      showAlert('error', err.response.data.message);
    }
  } else {
    showAlert('error', 'Bitte vervollständigen Sie das Formular!!');
  }
};

// Email Validation
const validateEmail = mail => {
  const mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (mail.match(mailformat)) {
    return true;
  }
  showAlert('error', 'You have entered an invalid email address!');
  return false;
};
