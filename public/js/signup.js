import axios from 'axios';
import { showAlert } from './alerts';

export const signup = async (email, name, password, passwordConfirm) => {
  // 1. Send data to API
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: {
        email,
        name,
        password,
        passwordConfirm
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Your account was created, you will be taken to main page in 3 seconds.')
      setTimeout(() => {
        location.assign('/')
      }, 3000)
    }

  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
