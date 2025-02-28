const { setUserLanguage } = require('../../util/language');
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
  .setName("setlanguage")
  .setDescription("Ubah bahasa bot")
  .addStringOption((option) => option.setName("language").setDescription("Pilih bahasa (en/id)").setRequired(true).addChoices({ name: "English", value: "en" }, { name: "Indonesian", value: "id" }))
  .setRun(async (client, interaction, options) => {
    const userId = interaction.user.id;
    const selectedLanguage = interaction.options.getString("language");

    await setUserLanguage(userId, selectedLanguage);

    const messages = {
      en: "Your language has been updated to English!",
      id: "Bahasa Anda telah diperbarui ke Indonesia!",
    };

    await interaction.reply(messages[selectedLanguage]);
  });

module.exports = command;
