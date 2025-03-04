const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  uri: { type: String, required: true },
  duration: { type: Number, required: true },
  // Field opsional untuk lagu dari Spotify
  artists: { type: [String] },
  album: { type: String },
  image: { type: String }
});

const playlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userDisplayname: { type: String, required: true },
  name: { type: String, required: true },
  songs: {
    type: [songSchema],
    default: []
  },
  // Field tambahan untuk membedakan sumber playlist
  source: { type: String, enum: ["discord", "spotify"], default: "discord" },
  // Field opsional khusus untuk playlist yang diimpor dari Spotify
  spotifyId: { type: String },
  description: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Playlist", playlistSchema);
