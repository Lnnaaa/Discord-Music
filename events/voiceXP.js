const User = require("../models/user");
const { Client } = require("discord.js");

module.exports = async (client) => {
    setInterval(async () => {
        for (const [guildId, guild] of client.guilds.cache) {
            const player = client.manager.players.get(guildId);
            if (!player) continue;

            const voiceChannel = player.voiceChannel;
            if (!voiceChannel) continue;

            const members = voiceChannel.members.filter((m) => !m.user.bot);
            for (const [userId, member] of members) {
                try {
                    let user = await User.findOne({ userId });
                    if (!user) {
                        user = new User({ userId });
                        await user.save();
                    }

                    jumlah = math(random(10, 50))

                    // Beri XP setiap 5 menit
                    await user.addXP(jumlah);
                    console.log(`✅ Added ${jumlah} XP to ${member.user.username} for staying in VC`);
                } catch (error) {
                    console.error("❌ Error adding XP:", error);
                }
            }
        }
    }, 300000); // Setiap 5 menit
};
