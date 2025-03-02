const mongoose = require("mongoose");

const premiumGuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  premium: { type: Boolean, default: false }
});

module.exports = mongoose.model("PremiumGuild", premiumGuildSchema);
