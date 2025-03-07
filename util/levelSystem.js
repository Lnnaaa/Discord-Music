const User = require("../models/user");

const MIN_XP_PER_SECOND = 0.15; // XP minimal per detik
const MAX_XP_PER_SECOND = 0.5; // XP maksimal per detik
const colors = require("colors");

const d = new Date();
const timestamp = colors.gray(`[${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}]`);

/**
 * Menambahkan XP ke pengguna dengan nilai acak dan menangani kenaikan level.
 * @param {string} userId - ID pengguna.
 * @param {string} userDisplayname - Nama pengguna.
 * @param {number} seconds - Waktu mendengarkan dalam detik.
 * @returns {Promise<User>} - Data pengguna yang diperbarui.
 */
async function addXP(userId, userDisplayname, seconds) {
    let user = await User.findOne({ userId });

    if (!user) {
        user = new User({ userId, username: userDisplayname, xp: 0, level: 1 });
        console.log(timestamp + colors.green(`🆕 [levelSystem] Pengguna baru ditambahkan: ${userDisplayname}`));
    }

    // Hitung XP secara acak dalam rentang MIN_XP_PER_SECOND hingga MAX_XP_PER_SECOND
    const randomXP = Math.random() * (MAX_XP_PER_SECOND - MIN_XP_PER_SECOND) + MIN_XP_PER_SECOND;
    
    // Gunakan Math.round untuk memastikan XP ditambahkan sebagai angka bulat
    const xpToAdd = Math.round(randomXP * seconds);
    
    user.xp += xpToAdd;

    const nextLevelXP = Math.pow(user.level + 1, 2) * 100;
    if (user.xp >= nextLevelXP) {
        user.level += 1;
        console.log(timestamp + colors.green(`🎉 [levelSystem] ${userDisplayname} naik ke level ${user.level}!`));
    }

    await user.save();
    console.log(timestamp + colors.green(`✅ [levelSystem] XP ditambahkan: ${userDisplayname} | XP Sekarang: ${user.xp} | Level: ${user.level}`));
    
    return user;
}

module.exports = { addXP };
