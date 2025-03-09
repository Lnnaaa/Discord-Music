const User = require("../../models/user");
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
  .setName("updateprofile")
  .setDescription("Modify user XP and level")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("addxp")
      .setDescription("Add XP to a user")
      .addUserOption((option) => option.setName("user").setDescription("Select user").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("XP amount").setRequired(true))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("removexp")
      .setDescription("Remove XP from a user")
      .addUserOption((option) => option.setName("user").setDescription("Select user").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("XP amount").setRequired(true))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("addlevel")
      .setDescription("Increase user level")
      .addUserOption((option) => option.setName("user").setDescription("Select user").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("Level amount").setRequired(true))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("removelevel")
      .setDescription("Decrease user level")
      .addUserOption((option) => option.setName("user").setDescription("Select user").setRequired(true))
      .addIntegerOption((option) => option.setName("amount").setDescription("Level amount").setRequired(true))
  )
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

      const subcommand = interaction.options.getSubcommand();
      const targetUser = interaction.options.getUser("user");
      const amount = interaction.options.getInteger("amount");

      let user = await User.findOne({ userId: targetUser.id });

      if (!user) {
        return interaction.editReply("🚫 User not found in database.");
      }

      switch (subcommand) {
        case "addxp":
          user.xp += amount;
          break;
        case "removexp":
          user.xp = Math.max(user.xp - amount, 0);
          break;
        case "addlevel":
          user.level += amount;
          break;
        case "removelevel":
          user.level = Math.max(user.level - amount, 1);
          break;
      }

      await user.save();

      return interaction.editReply(`✅ Updated ${targetUser.username}: Level ${user.level}, XP ${user.xp}`);
    } catch (error) {
      console.error("❌ ERROR updating profile:", error);
      return interaction.editReply("🚫 An error occurred while updating the user profile.");
    }
  });

module.exports = command;
