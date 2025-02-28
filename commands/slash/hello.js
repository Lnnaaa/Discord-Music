const { getUserLanguage } = require('../../util/language');
const SlashCommand = require("../../lib/SlashCommand");

const command = new SlashCommand()
    .setName('hello')
    .setDescription('Bot akan menyapa sesuai bahasa pengguna')
    .setRun(async (client, interaction, options) => {
        const userId = interaction.user.id;
        const language = await getUserLanguage(userId);

        const messages = {
            en: 'Hello! How can I assist you today?',
            id: 'Halo! Bagaimana saya bisa membantu Anda hari ini?'
        };

    await interaction.reply(messages[language]);
    });

module.exports = command;