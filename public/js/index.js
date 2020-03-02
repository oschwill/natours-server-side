// erzeugt altes Javascript für ältere Browser
import '@babel/polyfill';
// login
import { login, logout } from './login';
// update my Data
import { updateSettings } from './updateSettings.js';
import { displayMap } from './mapbox';
import { bookTour } from './stripe';

// holen uns aus der data-locations in der tour.pug die Daten
// DOM ELEMENTS
const mapBox = document.getElementById('map');
// login form
const loginForm = document.querySelector('.form--login');
// profile User Data Form
const userDataForm = document.querySelector('.form-user-data');
// password User Data Form
const userPassWordForm = document.querySelector('.form-user-password');
// logout Button
const logOutBtn = document.querySelector('.nav__el--logout');
// Booking Button
const bookBtn = document.getElementById('book-tour');

// VALUES

// DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

// Login User
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    // Das Reloaden der Page verhindern
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

// Update onw User Data
if (userDataForm) {
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();

    // als FormData übergeben, somit können wir auch Dateien übergeben => FormData lässt den type text als auch file zu!
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]); // unsere upload Datei

    // Übergeben beide Parameter als Object
    updateSettings(form, 'data');
  });
}

// Update own Password
if (userPassWordForm) {
  userPassWordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-password').textContent = 'Save Password';
    // die Passwordfelder clearen
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

// Logout User
if (logOutBtn) {
  logOutBtn.addEventListener('click', logout);
}

// booking tour
if (bookBtn) {
  bookBtn.addEventListener('click', e => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
