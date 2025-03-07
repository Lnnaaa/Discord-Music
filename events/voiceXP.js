const { addXP } = require("../util/levelSystem");
const { MessageEmbed } = require("discord.js");

const MIN_XP_PER_MINUTE = 9;  // XP minimal per 60 detik
const MAX_XP_PER_MINUTE = 30; // XP maksimal per 60 detik

module.exports = async (client) => {
  console.log(getTimestamp() + colors.green("✅ [voiceXP] voiceXP.js berhasil dijalankan!"));

  function startXPInterval() {
    if (client.xpInterval) return; // Cegah interval ganda

    client.xpInterval = setInterval(async () => {
      const botInVoice = client.guilds.cache.some(guild => guild.me.voice.channel);
      if (!botInVoice) {
        console.log(getTimestamp() + colors.red("⛔ [voiceXP] Bot tidak ada di voice channel, menghentikan XP loop."));
        clearInterval(client.xpInterval);
        client.xpInterval = null;
        return;
      }

      client.guilds.cache.forEach(async (guild) => {
        const player = client.manager.get(guild.id);
        if (!player || !player.playing) {
          return;
        }

        const voiceChannel = guild.me.voice.channel;
        if (!voiceChannel) return;

        voiceChannel.members.forEach(async (member) => {
          if (member.user.bot) return;

          // Generate XP secara acak dalam rentang MIN_XP_PER_MINUTE hingga MAX_XP_PER_MINUTE
          const randomXP = Math.floor(Math.random() * (MAX_XP_PER_MINUTE - MIN_XP_PER_MINUTE + 1) + MIN_XP_PER_MINUTE);

          console.log(getTimestamp() + colors.green(`➕ [voiceXP] Menambahkan ${randomXP} XP untuk ${member.user.username} (${member.id})`));
          const user = await addXP(member.id, member.user.username, randomXP);

          const nextLevelXP = Math.pow(user.level, 2) * 100;
          if (user.xp < nextLevelXP) return;

          const channel = guild.channels.cache.find((ch) => ch.name.includes("level-up"));
          if (channel) {
            const embed = new MessageEmbed()
              .setColor("GREEN")
              .setDescription(`🎉 | **${member.user.username} has reached level ${user.level}!**`);
            channel.send({ embeds: [embed] });
          }
        });
      });
    }, 60000);
  }

  // Jalankan XP loop jika bot sudah di voice saat startup
  if (client.guilds.cache.some(guild => guild.me.voice.channel)) {
    startXPInterval();
  }

  // Event voiceStateUpdate untuk mengaktifkan/mematikan XP loop saat bot masuk/keluar voice
  client.on("voiceStateUpdate", (oldState, newState) => {
    const botInVoice = newState.guild.me.voice.channel;

    if (botInVoice && !client.xpInterval) {
      startXPInterval();
    } else if (!botInVoice && client.xpInterval) {
      clearInterval(client.xpInterval);
      client.xpInterval = null;
    }
  });
};
