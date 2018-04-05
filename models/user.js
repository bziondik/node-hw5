const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Укажите login'],
    unique: true
  },
  surName: {
    type: String,
    default: '',
  },
  firstName: {
    type: String,
    default: ''
  },
  middleName: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: [true, 'Укажите пароль'],
  },
  image: { type: String, default: 'assets/img/no-user-image-big.png' },
  permissionId: { type: String, required: true, unique: true },
  permission: {
    chat: {
      C: { type: Boolean, default: false },
      R: { type: Boolean, default: true },
      U: { type: Boolean, default: true },
      D: { type: Boolean, default: false }
    },
    news: {
      C: { type: Boolean, default: false },
      R: { type: Boolean, default: true },
      U: { type: Boolean, default: false },
      D: { type: Boolean, default: false }
    },
    setting: {
      C: { type: Boolean, default: false },
      R: { type: Boolean, default: false },
      U: { type: Boolean, default: false },
      D: { type: Boolean, default: false }
    }
  },
  access_token: { type: String }
});

mongoose.model('user', userSchema);