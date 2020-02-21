// 'const stripe = require('stripe')' ukazuje/daje nam funkcję, której możemy użyć, więc wpisujemy secret key w tę funkcję, która zwróci nam stripe object, na którym możemy pracować
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);

// For booking testing purposes
exports.deleteAllBookings = catchAsync(async (req, res, next) => {
  await Booking.deleteMany();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.checkIfBooked = catchAsync(async (req, res, next) => {
  // To check if booked was bought by user who wants to review it
  const booking = await Booking.find({ user: req.user.id, tour: req.body.tour });
  if (booking.length === 0) return next(new AppError('You must buy this tour to review it', 401));
  next();
});

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  //const tour = await Tour.find({ _id: req.params.tourId });
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Informacje o sesji
    payment_method_types: ['card'],
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${tour.id}&user=${req.user.id}&price=${
    //   tour.price
    // }&startDateId=${startDateId}`,
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    metadata: {
      tour_startDateId: req.params.startDateId // DODAŁEM TO I NIE WIEM CZY BĘDZIE DZIAŁAĆ
    },
    // Informacje o produkcie, który zamierza zakupić klient.
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
        amount: tour.price * 100, // Mnożymy, bo ta wartość jest w centach
        currency: 'usd',
        quantity: 1
      }
    ]
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session
  });
});

exports.webhookCheckout = (req, res, next) => {
  //const signature = req.headers['stripe-signature']; // Inny sposób na wzięcie headera.
  const signature = req.get('stripe-signature');
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET); // req.body musi być RAW format, czyli jako stream.
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`); // Wysyłami response do Stripe, bo to Stripe robi request w success_url.
  }

  if (event.type === 'checkout.session.completed') createBookingCheckout(event.data.object);

  res.status(200).json({ recieved: true });
};

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;
  const date = session.metadata.tour_startDateId

  await Booking.create({ tour, user, price, date });
};

//////////////// To była funkcja, której używalismy przed deployem aplikacji, kiedy nie mogliśmy użyć Stripe Webhook. ////////////////
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, because it's UNSECURE.
//   const { tour, user, price, startDateId } = req.query; // req.query = queryString
//   if (!tour || !user || !price) return next();

//   await Booking.create({ tour, user, price, date: startDateId });

//   res.redirect(req.originalUrl.split('?')[0]);
//   // Mogliśmy po prostu napisać URL, ale zrobiliśmy to bardziej programistycznie
//   // originalUrl, to cały URL, z któtego przyszedł request
// });
