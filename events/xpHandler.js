const User = require("../models/user");

module.exports = async (player) => {
    if (!player || !player.queue.current) return;

    // Ambil guild dan voice channel
    const guild = player.guild;
    const voiceChannel = player.voiceChannel;
    if (!voiceChannel) return;

    // Ambil semua user dalam VC (kecuali bot)
    const members = voiceChannel.members.filter((m) => !m.user.bot);

    for (const [userId, member] of members) {
        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId });
                username: interaction.user.username;
                await user.save();
            }

            // Kalkulasi XP berdasarkan durasi musik
            const duration = player.queue.current.duration / 1000; // dalam detik
            const xpGained = Math.floor(duration / 10);

            await user.addXP(xpGained);
            console.log(`✅ Added ${xpGained} XP to ${member.user.username}`);
        } catch (error) {
            console.error("❌ Error adding XP:", error);
        }
    }
};
