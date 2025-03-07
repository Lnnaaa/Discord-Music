const { Client, GatewayIntentBits, Intents } = require("discord.js");
const { config } = require("dotenv");
config();

// Inisialisasi bot dengan intent untuk mendapatkan user
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", () => {
  console.log(`Bot ${client.user.tag} siap!`);
});

// Command untuk mengirim DM: !dm <userId> <pesan>
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!dm") || message.author.bot) return;

  const args = message.content.split(" ");
  if (args.length < 3) {
    return message.reply("Gunakan format: `!dm <userId> <pesan>`");
  }

  const userId = args[1];
  const dmMessage = args.slice(2).join(" ");

  try {
    const user = await client.users.fetch(userId); // Ambil user berdasarkan ID
    await user.send(dmMessage); // Kirim DM ke user
    message.reply(`DM berhasil dikirim ke ${user.tag}!`);
  } catch (error) {
    console.error(error);
    message.reply("Gagal mengirim DM. Pastikan user ID valid dan user tidak memblokir DM.");
  }
});

client.login(process.env.token); // Login bot dengan token
