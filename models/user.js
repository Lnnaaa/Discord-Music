const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userDisplayname: { type: String },
    language: { type: String, enum: ["en", "id"], default: "en" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    songsPlayed: {
        type: Map,
        of: Number,
        default: {}
    }
});

userSchema.methods.addXP = async function (xpGained) {
    this.xp += xpGained;

    // Cek apakah user naik level
    const nextLevelXP = Math.pow(this.level, 2) * 100;
    if (this.xp >= nextLevelXP) {
        this.level++;
        this.xp -= nextLevelXP; // Sisa XP tetap ada
        console.log(`🎉 User ${this.userId} leveled up to Level ${this.level}!`);
    }

    await this.save();
};

userSchema.methods.addSongPlay = function (songName) {
    if (this.songsPlayed.has(songName)) {
        this.songsPlayed.set(songName, this.songsPlayed.get(songName) + 1);
    } else {
        this.songsPlayed.set(songName, 1);
    }
    return this.save();
};

module.exports = mongoose.model("User", userSchema);
