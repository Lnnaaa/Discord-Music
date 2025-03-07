const mongoose = require("mongoose");
const User = require("./models/user");

async function testXP() {
    await mongoose.connect("mongodb+srv://Fiona:lanaakanpro123@discord-music.kjyos.mongodb.net/discord-music?retryWrites=true&w=majority", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected!");

    const userId = "552086701095387137"; // Ganti dengan ID user Discord kamu
    let user = await User.findOne({ userId });

    if (!user) {
        user = new User({ userId, userDisplayname: "Unknown User" });
        await user.save();
    }

    console.log(`🔍 Sebelum: XP = ${user.xp}, Level = ${user.level}`);

    await user.addXP(50); // Tambahkan 50 XP

    console.log(`✅ Setelah: XP = ${user.xp}, Level = ${user.level}`);

    mongoose.connection.close();
}

testXP();
