// Ten plik jest to, żeby zebrać dane z UI a następnie oddelegować zadania do funkcji z innych modułów
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { signup } from './signup';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { showAlert } from './alerts';
import *  as favouriteTours  from './favouriteTours';

// DOM ELEMENTS //
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');
const favouriteBtn = document.getElementById('fav-btn');
const selectStartDate = document.querySelector('.selectStartDate');

// DELEGATION //
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm)
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value; // Tak pobieraliśmy wartość inputu, lekkie przypomnienie
    const password = document.getElementById('password').value;
    login(email, password);
  });

if (signupForm) {
  signupForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    signup(email, name, password, passwordConfirm);
  });
}

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
  userDataForm.addEventListener('submit', e => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    updateSettings(form, 'data');
  });

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const currentPassword = document.getElementById('password-current').value;
    const newPassword = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updateSettings({ currentPassword, newPassword, passwordConfirm }, 'password');

    // Moje rozwiązanie, ostatecznie stwierdziłem, że Jonasa jes fajniejsze
    // setTimeout(() => {
    //   location.reload();
    // }, 1500);

    // Rozwiązanie Jonasa
    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

// ......... FRONTENDOWY SPOSÓB NA ZAPIS WYCIECZEK W ULUBIONYCH .............. //
if (favouriteBtn) {
  const tourId = favouriteBtn.closest('button').dataset.tourId;
  let favourites = favouriteTours.restoreFavourites();

  // Check if tour is in favourites, this is a flag of true/false
  let isTourFavourite = favouriteTours.isFavourite(tourId, favourites);

  // Set icon, and message
  if (isTourFavourite) {
    favouriteTours.setBtnIcon(favouriteBtn, 'trash', 'Delete this tour from your favourites');
  } else {
    favouriteTours.setBtnIcon(favouriteBtn, 'heart', 'Add this tour to your favourites!');
  }

  favouriteBtn.addEventListener('click', () => {
    // Check if is favourite(flag), and change/update localStorage and icon.
    if (isTourFavourite) {
      favouriteTours.removeTourFromFavourites(favourites, tourId);
      favouriteTours.setBtnIcon(favouriteBtn, 'heart', 'Add this tour to your favourites!');
      isTourFavourite = false;
    } else {
      favouriteTours.addTourToFavourites(favourites, tourId);
      favouriteTours.setBtnIcon(favouriteBtn, 'trash', 'Delete this tour from your favourites!');
      isTourFavourite = true;
    }
  });
}

if (document.querySelector('.favourite-tours')) {
  let favourites = favouriteTours.restoreFavourites();
  favouriteTours.displayTourCards(favourites, document.querySelector('.favourite-tours'));
}
// ................ KONIEC FUNKCJI ODPOWIEDZIALNYCH ZA ZAPISYWANIE W ULUBIONYCH ................... //

if (bookBtn) {
  bookBtn.addEventListener('click', e => {
    e.target.textContent = 'Processing...';

    const { tourId } = e.target.dataset;
    // const tourId = e.target.dataset.tourId; // -> Bez użycia destructuring, bo dataset = { tourId }
    const startDateId = selectStartDate.value;

    bookTour(tourId, startDateId);
  });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);
