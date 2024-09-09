const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  mobile: {
    type: Number, // Change to Number type
    required: true
  },
  address: {
    type: String,
    required: true
  },
  pincode: {
    type: Number, // Change to Number type
    required: true
  },
  state: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false // Set default value as false
  }
});


module.exports = mongoose.model('Address', addressSchema);