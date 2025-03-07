const mongoose = require("mongoose");
const colors = require("colors");

function logStatus(statusText) {
    const d = new Date();
    return colors.gray(`[${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}]`) 
        + colors.green(` | ${statusText}`);
}

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    userDisplayname: { type: String, default: "Unknown User" },
    language: { type: String, enum: ["en", "id"], default: "en" },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    songsPlayed: {
        type: Map,
        of: Number,
        default: new Map()
    }
});

// 🔹 Fungsi untuk menambahkan XP
userSchema.methods.addXP = async function (xpGained) {

    this.xp += xpGained;
    
    const nextLevelXP = Math.pow(this.level, 2) * 100;
    if (this.xp >= nextLevelXP) {
        this.level++;
        this.xp -= nextLevelXP;
        console.log(logStatus(`🎉${this.userDisplayname} naik ke Level ${this.level}!`));
    }

    await this.save();
};

// 🔹 Fungsi untuk menambahkan jumlah lagu yang dimainkan
userSchema.methods.addSongPlay = async function (songName) {

    this.songsPlayed.set(songName, (this.songsPlayed.get(songName) || 0) + 1);

    await this.save();
};

module.exports = mongoose.model("User", userSchema);
