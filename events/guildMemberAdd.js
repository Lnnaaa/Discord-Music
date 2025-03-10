const { MessageEmbed } = require("discord.js");
const WelcomeChannel = require("../models/GuildChannel");

module.exports = async (client, member) => {
  try {
    // Ambil channel welcome dari database
    const guildId = member.guild.id;
    const data = await WelcomeChannel.findOne({ guildId });

    if (!data || !data.welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(data.welcomeChannelId);
    if (!channel) return;

    // Buat embed welcome yang aesthetic
    const embed = new MessageEmbed()
      .setColor(client.config.embedColor)
      .setTitle("🌟 Welcome to the Server! 🌟")
      .setDescription(
        `Hey **${member.user.username}**, Welcome to **${member.guild.name}**! 🎉\n\n` +
          `> 🔎 Check out <#1347273801716465717> to get started and explore the server!\n\n` +
          `🚀 **Enjoy your stay and have fun!**`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setImage("https://cdn.jsdelivr.net/gh/Lnnaaa/Discord-Music/welcome1.jpg") // Ganti dengan gambar atau banner yang sesuai
      .setFooter({
        text: `User #${member.guild.memberCount} joined 🌍`,
        iconURL: member.guild.iconURL({ dynamic: true }),
      });

    // Kirim pesan welcome ke channel
    channel.send({ content: `🎊 Welcome, ${member}!`, embeds: [embed] });
  } catch (error) {
    console.error("❌ ERROR sending welcome message:", error);
  }
};
