const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  uri: { type: String, required: true },
  duration: { type: Number, required: true }
});

const playlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userDisplayname: { type: String, required: true },
  name: { type: String, required: true },
  songs: {
    type: [songSchema],
    default: []
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Playlist", playlistSchema);