const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const newsSchema = new Schema({
  userId: { type: String, required: true },
  text: { type: String, required: true },
  theme: { type: String, required: true },
  date: { type: String, required: true }
});
 
mongoose.model('news', newsSchema);