const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'system'],
    default: 'user'
  },
  sender: {
    type: String,
    required: true
  },
  senderId: {
    type: String,
    default: null
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema); 
