const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const WelcomeChannel = require("../../models/GuildChannel");

const command = new SlashCommand()
  .setName("setwelcome")
  .setDescription("✨ Set the channel for welcome messages!")
  .addChannelOption((option) => option.setName("channel").setDescription("🏠 Select the channel where welcome messages will appear.").setRequired(true))
  .setRun(async (client, interaction) => {
    // Dapatkan channel yang dipilih
    const channel = interaction.options.getChannel("channel");

    try {
      // Simpan ke database
      await WelcomeChannel.findOneAndUpdate({ guildId: interaction.guild.id }, { welcomeChannelId: channel.id }, { upsert: true, new: true });

      // Buat embed yang lebih estetik
      const embed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setTitle("🌿 Welcome Channel Updated!")
        .setDescription(`✨ From now on, all new members will be welcomed in ${channel}!\n\n` + `📌 Make sure the channel is visible and ready to greet newcomers with warmth!`)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({
          text: "A new journey begins 🌎",
          iconURL: client.user.displayAvatarURL(),
        });

      // Kirim respon sukses
      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error("❌ ERROR setting welcome channel:", error);
      return interaction.reply({
        embeds: [new MessageEmbed().setColor("#FF4C4C").setTitle("🚨 Oops, something went wrong!").setDescription("We couldn't set the welcome channel. Please try again later!")],
        ephemeral: true,
      });
    }
  });

module.exports = command;
