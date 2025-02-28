const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    language: { type: String, enum: ['en', 'id'], default: 'en' }
});

module.exports = mongoose.model('User', userSchema);
