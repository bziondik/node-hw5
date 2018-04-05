const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bCrypt = require('bcrypt-nodejs');
const mongoose = require('mongoose');
const User = mongoose.model('user');
const uuidv4 = require('uuid/v4');

passport.serializeUser(function(user, done) {
  console.log('serializeUser: ', user);
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log('deserializeUser: ', id);
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// локальная стратегия
passport.use(
  'loginUsers',
  new LocalStrategy(
    (username, password, done) => {
      console.log('!!!LocalStrategy');
      console.log('username = ',username);
      console.log('password = ', password);
      User.findOne({ username })
        .then(user => {
          console.log('!!!User.findOne then');
          if (!user) {
            return done(
              null,
              false,
            );
          }
          if (!isValidPassword(user, password)) {
            return done(null, false);
          }
          const token = uuidv4();
          user.access_token = token;
          user.save()
            .then(user => {
              done(null, user);
            })
            .catch(err => done(err, false));
        })
        .catch(err => {
          console.log('!!!User.findOne catch');
          done(err);
        });
    }
  )
);

const isValidPassword = function(user, password) {
  return bCrypt.compareSync(password, user.password);
};

module.exports = passport;