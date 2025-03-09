const { MessageEmbed } = require("discord.js");
const User = require("../../models/user");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
  .setName("leaderboard")
  .setDescription("View the top-ranked users")
  .setRun(async (client, interaction) => {
    // 🔹 Cek jika perintah dikirim dari DM
    if (!interaction.guild) {
      return interaction.reply({
      embeds: [
        new MessageEmbed()
        .setColor("RED")
        .setDescription("❌ Slash command tidak dapat digunakan di DM!"),
      ],
      ephemeral: true, // Hanya user yang bisa melihat pesan ini
      });
    }
    
    try {
      await interaction.deferReply();

      const topUsers = await User.find().sort({ level: -1, xp: -1 }).limit(10);

      if (topUsers.length === 0) {
        return interaction.editReply("🚫 No users found in the leaderboard.");
      }

      const embed = new MessageEmbed()
        .setTitle("🏆 Leaderboard")
        .setColor("#FFD700")
        .setDescription(topUsers.map((user, index) => {
          let mostPlayedSong = "None";
          if (user.songsPlayed.size > 0) {
            mostPlayedSong = [...user.songsPlayed.entries()].sort((a, b) => b[1] - a[1])[0][0];
          }
          return `**#${index + 1}** - <@${user.userId}> | Level **${user.level}** | XP **${user.xp}**` + "\nMost Played:" + ` 🎵 **${mostPlayedSong}**`;
        }).join("\n"))
        .setFooter(`Requested by ${interaction.user.username}`, interaction.user.displayAvatarURL());

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("❌ ERROR fetching leaderboard:", error);
      return interaction.editReply("🚫 An error occurred while fetching the leaderboard.");
    }
  });

module.exports = command;
