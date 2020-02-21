import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  // Axios sam wyrzuca error, jeśli jakiś error przyjdzie z API, np jak podamy złe hasło, serwer wyśle 403 error, a axios też wygeneruje error, więc możemy użyć catch.
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login', // Relative URL
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/'); // Location to obiekt zawierający informacje o aktualnym URL
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message); // Dokumentacja AXIOS, dlaczego takie property
  }
};

// True musi być, żeby reload był z serwera, a nie z przeglądarki. W innym wypadku przeglądarka może po prostu załadowastronę z pamięci podręcznej(cache), które nadal będzie miało user menu w nagłówku.
export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });
    if (res.data.status === 'success') window.location.assign('/');
  } catch (err) {
    showAlert('error', 'Error logging out! Try again.');
  }
};
