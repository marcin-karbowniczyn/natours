import axios from 'axios';
const stripe = Stripe('pk_test_Pw7AUaJHILAFBrb0fGYCkGmd00pUUB8abZ');
import { showAlert } from './alerts';


export const bookTour = async (tourId, startDateId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}/${startDateId}`);


    // 2) Create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id // Lecture 221, jest zakładka, jakbym nie pamiętał o co chodzi
    })

  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
