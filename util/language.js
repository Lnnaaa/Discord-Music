const User = require('../models/user');

async function getUserLanguage(userId) {
    const user = await User.findOne({ userId });
    return user ? user.language : 'en'; // Default English jika tidak ada
}

async function setUserLanguage(userId, language) {
    await User.findOneAndUpdate(
        { userId },
        { language },
        { upsert: true, new: true }
    );
    return language;
}

module.exports = { getUserLanguage, setUserLanguage };
