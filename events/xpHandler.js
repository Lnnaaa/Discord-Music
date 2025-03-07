const User = require("../models/user");

module.exports = async (player) => {
    if (!player || !player.queue.current || player.paused) {
        return;
    }

    const guild = player.guild;
    const voiceChannel = guild.me.voice.channel;
    if (!voiceChannel) return;

    console.log(`✅ [xpHandler] Memproses XP di server: ${guild.name}`);

    const members = voiceChannel.members.filter((m) => !m.user.bot);

    for (const [userId, member] of members) {
        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId, username: member.user.username, xp: 0, level: 1 });
                await user.save();
                console.log(`🆕 [xpHandler] Pengguna baru ditambahkan: ${member.user.username}`);
            }

            // Jika pengguna sudah mencapai level 100, hentikan XP tambahan
            if (user.level >= 100) {
                console.log(`⛔ [xpHandler] ${member.user.username} sudah mencapai level 100, XP tidak akan bertambah.`);
                continue;
            }

            const duration = player.queue.current.duration / 1000;
            let xpGained = Math.floor(duration / 10);

            // Hitung multiplier XP (maksimal level 99)
            const xpMultiplier = 1 + (user.level / 10);
            xpGained = Math.floor(xpGained * xpMultiplier);

            user.xp += xpGained;

            // Hitung XP yang dibutuhkan untuk naik level
            const nextLevelXP = Math.pow(user.level + 1, 2) * 100;

            // Naik level hanya jika belum mencapai level 100
            if (user.xp >= nextLevelXP && user.level < 100) {
                user.level += 1;

                // Pastikan level tidak melebihi 100
                if (user.level > 100) {
                    user.level = 100;
                    user.xp = nextLevelXP; // Set XP ke batas maksimal level 100
                }

                console.log(`🎉 [xpHandler] ${member.user.username} naik ke level ${user.level}!`);
            }

            await user.save();
            console.log(`✅ [xpHandler] ${xpGained} XP ditambahkan ke ${member.user.username} | Total XP: ${user.xp} | Level: ${user.level} | Multiplier: ${xpMultiplier.toFixed(1)}x`);
        } catch (error) {
            console.error("❌ [xpHandler] Error saat menambahkan XP:", error);
        }
    }
};
