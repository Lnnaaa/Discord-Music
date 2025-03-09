const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");
const PremiumGuild = require("../../models/premiumGuild");

const command = new SlashCommand()
  .setName("premium")
  .setDescription("Manage premium status for a guild")
  // Subcommand: add – menandai guild sebagai premium
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Mark this guild as premium")
  )
  // Subcommand: remove – menghapus status premium
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Remove premium status from this guild")
  )
  // Subcommand: status – menampilkan status premium guild
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Display the premium status for this guild")
  )
  .setRun(async (client, interaction, options) => {
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
    
    // Contoh otorisasi: hanya bot owner yang bisa menggunakan perintah ini.
    const botOwnerId = process.env.BOT_OWNER_ID; // Set BOT_OWNER_ID di .env
    if (botOwnerId && interaction.user.id !== botOwnerId) {
      return interaction.reply({
        embeds: [
          new MessageEmbed()
            .setColor("RED")
            .setDescription("❌ Only the bot owner can use this command.")
        ],
        ephemeral: true,
      });
    }

    const subcommand = options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "add") {
      try {
        let guildData = await PremiumGuild.findOne({ guildId });
        if (!guildData) {
          guildData = new PremiumGuild({ guildId, premium: true });
        } else {
          guildData.premium = true;
        }
        await guildData.save();
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("GREEN")
              .setDescription("✅ This guild is now marked as premium.")
          ]
        });
      } catch (error) {
        console.error("Error adding premium guild:", error);
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setDescription("❌ Failed to mark guild as premium.")
          ],
          ephemeral: true,
        });
      }
    }

    if (subcommand === "remove") {
      try {
        await PremiumGuild.findOneAndDelete({ guildId });
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("GREEN")
              .setDescription("✅ Premium status has been removed from this guild.")
          ]
        });
      } catch (error) {
        console.error("Error removing premium guild:", error);
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setDescription("❌ Failed to remove premium status.")
          ],
          ephemeral: true,
        });
      }
    }

    if (subcommand === "status") {
      try {
        const guildData = await PremiumGuild.findOne({ guildId });
        const status = guildData && guildData.premium ? "Premium" : "Not Premium";
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("BLUE")
              .setDescription(`This guild is: **${status}**`)
          ]
        });
      } catch (error) {
        console.error("Error checking premium status:", error);
        return interaction.reply({
          embeds: [
            new MessageEmbed()
              .setColor("RED")
              .setDescription("❌ Failed to check premium status.")
          ],
          ephemeral: true,
        });
      }
    }
  });

module.exports = command;
