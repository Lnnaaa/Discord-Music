const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed } = require("discord.js");

const command = new SlashCommand()
	.setName("summon")
	.setDescription("Summons the bot to the channel.")
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
	  
		let channel = await client.getChannel(client, interaction);
		if (!interaction.member.voice.channel) {
			const joinEmbed = new MessageEmbed()
				.setColor(client.config.embedColor)
				.setDescription(
					"❌ | **You must be in a voice channel to use this command.**",
				);
			return interaction.reply({ embeds: [joinEmbed], ephemeral: true });
		}
		
		let player = client.manager.players.get(interaction.guild.id);
		if (!player) {
			player = client.createPlayer(interaction.channel, channel);
			player.connect(true);
		}
		
		if (channel.id !== player.voiceChannel) {
			player.setVoiceChannel(channel.id);
			player.connect();
		}
		
		interaction.reply({
			embeds: [
				client.Embed(`:thumbsup: | **Successfully joined <#${ channel.id }>!**`),
			],
		});
	});

module.exports = command;
