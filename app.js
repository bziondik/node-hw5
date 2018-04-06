const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');

const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://root:12345@ds038319.mlab.com:38319/hw5')
require('./models/user');
require('./models/news');

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');

const app = express();

const http = require('http');
const server = http.createServer(app);
const io = require('socket.io').listen(server);

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'bziondik',
  key: 'bzkeys',
  cookie: {
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    maxAge: 2000000000
  },
  saveUninitialized: true,
  resave: false,
  store: new MongoStore({mongooseConnection: mongoose.connection})
}));

const passport = require('./config/config-passport');
app.use(passport.initialize());
app.use(passport.session());

const clients = {};
let count = 0;

io.sockets.on('connection', socket => {
  let id = count++;
  const user = {
    id: socket.id,
    username: socket.handshake.headers.username
  };
  clients[socket.id] = user;

  socket.emit('all users', clients);
  io.sockets.emit('new user', user);
  socket.on('chat message', (msg, user) => {
    socket.broadcast.to(user).emit('chat message', msg, socket.id);
  });
  socket.on('disconnect', () => {
    io.sockets.emit('delete user', socket.id);
    delete clients[socket.id];
  });
});

app.use('/api', apiRouter);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  console.log(err);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send('error');
});

server.listen(process.env.PORT || 5000, function() {
  console.log('Server running in port ', process.env.PORT || 5000);
});
