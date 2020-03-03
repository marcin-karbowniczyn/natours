import axios from 'axios';
import { showAlert } from './alerts';

export const addTourToFavourites = async tourId => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: `/api/v1/users/favouriteTours/${tourId}`
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Tour added to favourites!');
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const deleteTourFromFavourites = async tourId => {
  try {
    const res = await axios({
      method: 'DELETE',
      url: `/api/v1/users/favouriteTours/${tourId}`
    });

    if (res.status === 204) {
      showAlert('success', 'Tour deleted from favourites.');
      setTimeout(() => {
        location.reload();
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

// ......... FRONTENDOWY SPOSÓB NA ZAPIS WYCIECZEK W ULUBIONYCH .............. //
// ......... ZAPIS DOKONOWANY BYŁ W LOACALSOTRAGE, OSTATECZNIE ZASTĄPIONY ZAPISEM W BAZIE DANYCH.............. //
// export const restoreFavourites = () => {
//   let favourites = [];
//   const storage = JSON.parse(localStorage.getItem('favourites'));
//   if (storage) favourites = storage;

//   return favourites;
// };

// export const addTourToFavourites = (favouritesArr, tourId) => {
//   // 1. Push new tour to array of favourites
//   favouritesArr.push(tourId);

//   // 2. Update favourites saved to localStorage
//   localStorage.setItem('favourites', JSON.stringify(favouritesArr));
// };

// export const removeTourFromFavourites = (favouritesArr, tourId) => {
//   // 1. Delete tourId from favourites array
//   const index = favouritesArr.indexOf(tourId);
//   favouritesArr.splice(index, 1);

//   // 2. Update favourites in localStorage
//   localStorage.setItem('favourites', JSON.stringify(favouritesArr));
// };

// export const isFavourite = (tourId, favourites) => {
//   return favourites.includes(tourId);
// };

// export const setBtnIcon = (button, icon, msg) => {
//   const useElement = button.querySelector('use');
//   useElement.setAttribute('xlink:href', `/img/icons.svg#icon-${icon}`);

//   button.querySelector('.heading-box__text').textContent = msg;
// };

// const renderTourCards = (tour, cardsContainer) => {
//   const markup = `
//     <div class="card">
//       <div class="card__header">
//         <div class="card__picture">
//           <div class="card__picture-overlay">&nbsp;</div>
//           <img
//             src="/img/tours/${tour.imageCover}"
//             alt="${tour.name}"
//             class="card__picture-img"
//           />
//         </div>
//         <h3 class="heading-tertirary">
//           <span>${tour.name}</span>
//         </h3>
//       </div>
//       <div class="card__details">
//         <h4 class="card__sub-heading">${tour.difficulty} ${tour.duration}-day tour</h4>
//         <p class="card__text">
//           ${tour.summary}
//         </p>
//         <div class="card__data">
//           <svg class="card__icon">
//             <use xlink:href="img/icons.svg#icon-map-pin"></use>
//           </svg>
//           <span>${tour.startLocation.description}</span>
//         </div>
//         <div class="card__data">
//           <svg class="card__icon">
//             <use xlink:href="img/icons.svg#icon-calendar"></use>
//           </svg>
//           <span>${tour.startDates[0].date.toLocaleString('en-us', { month: 'long', year: 'numeric'})}</span>
//         </div>
//         <div class="card__data">
//           <svg class="card__icon">
//             <use xlink:href="img/icons.svg#icon-flag"></use>
//           </svg>
//           <span>${tour.locations.length} stops</span>
//         </div>
//         <div class="card__data">
//           <svg class="card__icon">
//             <use xlink:href="img/icons.svg#icon-user"></use>
//           </svg>
//           <span>${tour.maxGroupSize} people</span>
//         </div>
//       </div>
//       <div class="card__footer">
//         <p>
//           <span class="card__footer-value">$${tour.price}</span>
//           <span class="card__footer-text">per person</span>
//         </p>
//         <p class="card__ratings">
//           <span class="card__footer-value">${tour.ratingsAverage}</span>
//           <span class="card__footer-text">rating (${tour.ratingsQuantity})</span>
//         </p>
//         <a href="/tour/${tour.slug}" class="btn btn--green btn--small">Details</a>
//       </div>
//     </div>
//   `;
//   cardsContainer.insertAdjacentHTML('afterbegin', markup)
// }

// export const displayTourCards = async (favTours, cardsContainer) => {
//   const results = await axios({
//     method: 'GET',
//     url: '/api/v1/tours'
//   });

//   const tours = results.data.data.data.filter(el => favTours.includes(el._id));

//   tours.forEach(el => renderTourCards(el, cardsContainer));
// };
// ................ KONIEC FUNKCJI ODPOWIEDZIALNYCH ZA ZAPISYWANIE W ULUBIONYCH ................... //
