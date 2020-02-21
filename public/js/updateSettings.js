// updateData function
import axios from 'axios';
import { showAlert } from './alerts';

// type is either password or data
export const updateSettings = async (data, type) => {
  try {
    // Tu się dokonuje update usera w API, promise zwraca nam result.
    const response = await axios.patch(
      `/api/v1/users/${type === 'data' ? 'updateMe' : 'updateMyPassword'}`,
      data
    );

    // Jeśli result jest ok, to wyświetlamy alert i przeładowujemy stronę. Jeśli błąd, wyśiweltamy błąd.
    if (response.data.status === 'success') {
      showAlert('success', `Your user ${type} has been updated`);
      // setTimeout(() => {
      //   location.reload();
      // }, 1500); // Usunąłem to z kodu, żeby wszystko co związane z UI robić w index.js
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
