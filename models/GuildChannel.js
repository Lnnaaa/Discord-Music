const mongoose = require("mongoose");

const welcomeChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true }, // ID server
  welcomeChannelId: { type: String, required: true }, // ID channel welcome
});

module.exports = mongoose.model("WelcomeChannel", welcomeChannelSchema);
