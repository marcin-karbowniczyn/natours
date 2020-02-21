const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression'); // Kompresuje text responds
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require(`./routes/tourRoutes`); // W require ./ === __dirname
const userRouter = require(`./routes/userRoutes`);
const reviewRouter = require(`./routes/reviewRoutes`);
const bookingRouter = require(`./routes/bookingRoutes`);
const bookingController = require(`./controllers/bookingController`);
const viewRouter = require(`./routes/viewRoutes`);

const dupa = { marcin: 'dupa' }
// Start express app
const app = express('trust proxy'); // Mamy deploy na heroku, a on przez proxy zmienia request, żeby aplikacja działała, musi być to.

app.set('view engine', 'pug'); // Najlepiej to określić na początku
app.set('views', path.join(__dirname, 'views')); // Tworzy path '__dirname/views', nie musimy martwić się o to, czy wstawiać slash czy nie (slash może być w dirname, a my tego nie wiemy itd.)

// 1) GLOBAL MIDDLEWARES -> Za pomocą use dodajemy middleware do naszego middleware stack.
// Implement CORS
app.use(cors()); // Tak aktywujemy CORS, czyli udostępniami nasze API dla klientów z innych domen a nawet subdomen. To działa tylko dla GET i POST requests, czyli simple requests.

// app.use(cors({
//   origin: 'https://www.natours.com'
// })) ---> Przykład, jeśli byśmy chcieli aktywować cors tylko dla jednej domeny.

app.options('*', cors()); // Tak aktywujemy cors dla non-simple requests, czyli patch, delete, put. Options to metoda http, na którą musimy zareagować. Browser wyśle options request, zanim wyśle właściwy np. delete request (preflight request). To jest nasz response na ten request, że pozwalamy nas cors.

// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  // Ta funkcja to tak naprawdę middleware function
  max: 100, // Jak dużo reqs per IP
  window: 60 * 60 * 1000, // 100 reqs na godzine
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Route for handling success_url/checkouts from Stripe.
app.post('/webhook-checkout', express.raw({ type: 'application/json' }), bookingController.webhookCheckout);

// Body parser, reading data from the body into req.body
// Musimy tego użyć, bo Express wtedy parsuje elementy request body w JS Object i dodaje body do property requesta(req.body).
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Ten parser jest potrzebny, żeby sparsować w obiekt dane wysłane z HTML
app.use(cookieParser());

// Data sanitization againt NOSQL query injection
// Ten middleware sprawdza req.body, req.queryString i req.params i usuwa "$" i "."
app.use(mongoSanitize());

// Data sanitization against XSS (Crossed Side Script attacks)
// Ten middleware czyści user input z malicious HTML
app.use(xss());

// Prevent parameter pollution
// Ten middleware czyści queryString, np. gdy zdefiniujemy 2x sort (zob. wykład)
app.use(
  hpp({
    whitelist: ['duration', 'ratingsAverage', 'ratingsQuantity', 'maxGroupSize', 'difficulty', 'price']
  })
);

app.use(compression()); // Ta funkcja jest wywoływana, bo ona zwraca middleware function, która będzie wykonywana w przypadku requesta.

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 2) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Ta funkcja zostanie wykonana dla wszystkich requestów, get, post itd. Definiowana jest za Routerami, żeby dotarły do niej requesty, których nie wyłapią Routery.
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  // Możemy w next() podać argument i Express będzie automatycznie wiedział, że ten argument to error. Zawsze jak podamy jakiś argument w next(), to Express weźmie go za error. Po tym Express pominie inne middlewares na stacku i przejdzie od razu do naszego global error middleware, który jest zdefiniowany poniżej.
});

// GLOBAL ERROR HANDLING MIDDLEWARE -> Express wie, że to jest middleware, który obsługuje errory, bo pierwszy argument w funkcji to error.
app.use(globalErrorHandler);

// Sprawdzam czy push działa po formacie

module.exports = app;

/***********************************************************/
/************* Moje notatki i próbki funkcji ***************/

////////////// RÓŻNICE MIĘDZY CRYPTO A BCRYPT /////////////////////
// Te porównanie pokazuje, że crypto nie dodaje salt do hasha, więc taki sam string shashuje tak samo. Bcryot dodaje salt, więc ten sam string zostanie shashowany w różny sposób.
/*
const crypto = require('crypto'); // Built-in Node Module
const bcrypt = require('bcryptjs');


const cryptoTest = async () => {
  const string1 = 'Marcin to dupa'
  const hash1 = await crypto.createHash('sha256').update(string1).digest('hex')
  console.log(hash1)

  const string2 = 'Marcin to dupa'
  const hash2 = await crypto.createHash('sha256').update(string2).digest('hex')
  console.log(hash2)

  string1 === string2 ? console.log('Są takie same') : console.log('Dupa')
}
cryptoTest();


const bcryptTest = async () => {
  const string1 = 'Marcin to dupa';
  const hash1 = await bcrypt.hash(string1, 12);
  console.log(hash1);

  const string2 = 'Marcin to dupa';
  const hash2 = await bcrypt.hash(string2, 12);
  console.log(hash2);

  hash1 === hash2 ? console.log('Są takie same') : console.log('Dupa')

};
bcryptTest();

*/

/*
///////////////// Jak tworzyć responds na requesty GET i POST za pomocą Express ///////////
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello from the server side!', app: 'Natours' });
});

app.post('/', (req, res) => {
  res.send('You can post to this endpoint...')
})
*/

/*
//////// Różnice między JSON.stringify i JSON.parse ////////////
const dupa = {
  key1: 'dupa',
  key2: 'blada',
  key3: 3
};
const dupa2 = JSON.stringify(dupa);
const dupa3 = dupa.toString();

console.log(dupa);
console.log(dupa2);
console.log(dupa3);
*/

/*
////// Różnice między toString a JSON.stringify /////////////
const dupa = [1,,2,3];
const dupa1 = dupa.toString(); // Niszczy Array i zwraca string.
const dupa2 = JSON.stringify(dupa); // Konwertuje cały Array w string
const dupa3 = dupa.join(',') // Join dotyczy tylko Arrays i można zadeklarować separator.

console.log(dupa);
console.log(dupa1);
console.log(dupa2);
console.log(dupa3);
*/

/*
/////////// Class on ES5 czyli jak dodać metodę do prototypu i jak zrobić, żeby działała na tworzonym obiekcie //////
function Person(name, lastName) {
  this.name = name;
  this.lastName = lastName;
};

Person.prototype.setAge = function() {
  this.age = this.name === 'Marcin' ? 25 : 'Nie wiadomo'
};

const marcin = new Person('Kuba', 'Karbowniczyn')
marcin.setAge();
console.log(marcin)
*/
/*
/////////// Object.values ///////////////
const x = {
  a: 1,
  b: 'dupa',
  c: true
}
const y = {
  obj1: {
    a: 2,
    b: 'sprzeglo',
    c: false
  },
  obj2: {
    a: 3,
    b: 'inne cos',
    c: true
  }
}
const result1 = Object.values(x);
const result2 = Object.values(y);
console.log(result1)
console.log(result2)
console.log(x['a'])
*/

/*
//////////////// Object.create vs Object.assign vs Destructuring ///////////////////////////////
const x = {
  name: 'dupa',
  isDupa: 'true'
}

const y = Object.create(x);
const z = Object.assign(x);
const v = {...x}

console.log(y);
console.log(z);
console.log(v);

//////////// Results /////////
// {}
// { name: 'dupa', isDupa: 'true' }
// { name: 'dupa', isDupa: 'true' }
// *
*/

/*
///////////////////// Delete operator //////////////////////
const x = {
  name: 'Maecin',
  lastName: 'Karbowniczyn'
}
delete x['name'];

/////////// Result ////////////
//{ lastName: 'Karbowniczyn' }

console.log(x)
*/

/*
///////////////////////// RegExp i Replace ////////////////////////
const str = 'apples are round and apples are juapplesicy';

const res = str.replace(/apples/gi, 'oranges');
console.log(res);
*/

/*
///////////////////////////// ZASTOSOWANIE FUNKCJI BIND /////////////////////////////////
const dupa = {
  name: 'marcin',
  fn: function(x,y) {
    return `${this.name} ${x} to ${y}`
  }
}
const x = dupa.fn('karbowniczyn', 'dupa');

const agatka = {
  name: 'agatka'
}
const y = dupa.fn.bind(agatka, 'karpinska');
const z = y('pieknotka')

console.log(z)
*/
