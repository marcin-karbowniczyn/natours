const crypto = require('crypto'); // Built-in Node Module
const mongoose = require('mongoose');
const validator = require('validator'); // Fajne validatory, warto sprawdzić API
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us you name'],
      trim: true
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide your email'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: {
      type: String, // Path do filesystem
      default: 'default.jpg'
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user'
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        // This only works on CREATE and SAVE!!! not findOneAndUpdate. W validator function, this wskazuje na aktualny dokument tylko przy tworzeniu nowego dokumentu. To jest 'caveat'
        validator: function(el) {
          // Z validator function zwracamy true lub false
          return el === this.password;
        },
        message: 'Passwords are not the same'
      }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    counter: {
      type: Number,
      default: 0,
      select: false
    },
    blocked: {
      type: Boolean,
      default: false,
      select: false
    },
    timeBlocked: Date,
    favouriteTours: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tour'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

userSchema.pre('save', async function(next) {
  // Jeśli pole password nie było modyfikowane, to wróć i wykonaj funkcję next(). Kiedy tworzymy nowy dokument, to isModified() uzna, że password było modyfikowane.
  if (!this.isModified('password')) return next();

  // 12 to cost, im więcej, tym większe obciążenie dla CPU, ale lepsze szyfrowanie
  // hash jest async, zwraca promise, który musimy wyczekać
  // salt oznacza, że bcrypt nie zaszyfruje tych samych haseł w ten sam sposób (zob. wykład o tym)
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
  // Robimy ten zabieg (- 1000 milisekund), bo czasem zdarza się, że token zostanie wystawiony chwilę wcześniej, niż zostanie stworzony passwordChangedAt, a wtedy by to oznaczało, że token jest nieważny, bo został wystawiony przed tym, jak zostało zmienione hasło. A to reguluje funkcja changedPasswordAfter().
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// bcrypt porówna zaszyfrowane hasło, z niezaszyfrowanym hasłem, które poda nam user, gdy będzie chciał się zalogować, nie możemy przecież porównać 'dupa1234' do '$2a$12$vb/5o0SNBUL9DFG4Wjvny.aYa/Rx0dNfEGwg6id/C2yy.TcEPgVsG'.
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    // getTime zwraca wynik w milisekundach, a my potrzebujemy sekundy
    // parseInt jest ew. potrzebny, bo zamienia float na integer, czyli liczbę z przecinkiem na całkowitą
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return JWTTimestamp < changedTimestamp; // Token został wystawiony, a później hasło zostalo zmienione.
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  // randomBytes() zwraca Buffer, na którym jest funkcja toString z kilkoma opcjami
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minut w milisekundach

  return resetToken;
};

// Update counter, if login was incorrect
userSchema.methods.isLoginIncorrect = async function(result) {
  if (result) {
    this.counter++;
  } else {
    this.counter = 0;
  }

  if (this.counter >= 5) {
    this.blocked = true;
    this.timeBlocked = Date.now() + 10 * 60 * 1000;
  }

  await this.save({ validateBeforeSave: false });
};

userSchema.methods.checkIfBlocked = async function() {
  // 1) What is the time to unblock
  let timeToUnblock;
  if (this.timeBlocked) {
    timeToUnblock = this.timeBlocked - Date.now();
  }

  // 2) Unblock if blocking time passed
  if (timeToUnblock <= 0) {
    this.blocked = false;
    this.timeBlocked = undefined;
    this.counter = 0;
    await this.save({ validateBeforeSave: false });
  }

  // 3) Return time to unblock for error handling
  return timeToUnblock;
};

userSchema.methods.isTourFavourite = function(tourId) {
  return this.favouriteTours.includes(tourId);
};

userSchema.methods.addToFavourites = async function(tourId) {
  this.favouriteTours.push(tourId);
  const updatedUser = await this.save({ validateBeforeSave: false });
  return updatedUser;
};

userSchema.methods.deleteFromFavourites = async function(tourId) {
  const tourIndex = this.favouriteTours.indexOf(tourId);
  this.favouriteTours.splice(tourIndex, 1);
  await this.save({ validateBeforeSave: false });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
