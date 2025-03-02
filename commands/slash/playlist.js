const SlashCommand = require("../../lib/SlashCommand");
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");
const escapeMarkdown = require("discord.js").Util.escapeMarkdown;
const Playlist = require("../../models/playlist");
const User = require("../../models/user");
const PremiumGuild = require("../../models/premiumGuild");
const spotifyApi = require("../../lib/Spotify");
const youtube = require("youtube-sr").default;

const command = new SlashCommand()
  .setName("playlist")
  .setDescription("Manage your playlists")
  // Subcommand: create (membuat playlist custom)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a new custom playlist")
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setRequired(true))
  )
  // Subcommand: addsong (menambahkan lagu ke playlist menggunakan query)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("addsong")
      .setDescription("Search for a song and add it to your playlist")
      .addStringOption(
        (option) => option.setName("playlist").setDescription("Select your playlist (by name)").setRequired(true).setAutocomplete(true) // gunakan autocomplete untuk mengambil nama playlist dari database
      )
      .addStringOption((option) => option.setName("query").setDescription("Search for a song").setRequired(true).setAutocomplete(true))
  )
  // Subcommand: deletesong (menghapus lagu dari playlist berdasarkan indeks)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("deletesong")
      .setDescription("Delete a song from your playlist by index")
      .addStringOption((option) => option.setName("playlist").setDescription("Select your playlist (by name)").setRequired(true).setAutocomplete(true))
      .addIntegerOption((option) => option.setName("index").setDescription("Song index to delete (starting from 1)").setRequired(true))
  )
  // Subcommand: addspotify (menambahkan playlist dari Spotify – Premium Only)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("addspotify")
      .setDescription("Add a Spotify playlist (Premium Only)")
      .addStringOption((option) => option.setName("url").setDescription("Spotify playlist link").setRequired(true))
      .addStringOption((option) => option.setName("name").setDescription("Playlist name").setRequired(true))
  )
  // Subcommand: view (melihat daftar playlist)
  .addSubcommand((subcommand) => subcommand.setName("view").setDescription("View your saved playlists"))
  // Subcommand: delete (menghapus playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription("Delete a saved playlist")
      .addStringOption((option) => option.setName("name").setDescription("Select the playlist to delete").setRequired(true).setAutocomplete(true))
  )
  // Subcommand: play (memainkan playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("play")
      .setDescription("Play a saved playlist")
      .addStringOption((option) => option.setName("name").setDescription("Select a playlist to play").setRequired(true).setAutocomplete(true))
  )
  .setRun(async (client, interaction, options) => {
    await interaction.deferReply();
    
    const subcommand = options.getSubcommand();
    const userId = interaction.user.id;
    const userDisplayname = interaction.member ? interaction.member.displayName : interaction.user.displayName;
    const guildId = interaction.guild.id;

    // Ambil data premium user dan guild
    let userDoc = await User.findOne({ userId });
    if (!userDoc) {
      userDoc = new User({ userId, premium: false });
      await userDoc.save();
    }
    let guildDoc = await PremiumGuild.findOne({ guildId });
    const isPremium = userDoc.premium || (guildDoc && guildDoc.premium);

    if (subcommand === "create") {
      const name = options.getString("name");
      const userPlaylists = await Playlist.find({ userId });
      const maxPlaylists = isPremium ? Infinity : 1;
      if (userPlaylists.length >= maxPlaylists) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Non-premium users can only create 1 playlist! Upgrade to premium for more.")],
        });
      }
      const newPlaylist = new Playlist({ userId, userDisplayname, name, songs: [] });
      try {
        await newPlaylist.save();
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("GREEN").setDescription(`✅ Playlist **${name}** created!`)],
        });
      } catch (error) {
        console.error("Error creating playlist:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to create playlist.")],
        });
      }
    }

    if (subcommand === "addsong") {
      const playlistName = options.getString("playlist");
      const query = options.getString("query", true);
      const playlist = await Playlist.findOne({ userDisplayname, userId, name: playlistName });
      if (!playlist) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Playlist not found.")],
        });
      }
      // Pencarian lagu menggunakan youtube-sr
      let results;
      try {
        results = await youtube.search(query, { limit: 1 });
      } catch (error) {
        console.error("Error searching for song:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ There was an error while searching.")],
        });
      }
      if (!results.length) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ No results were found.")],
        });
      }
      const trackResult = results[0];
      const track = {
        title: trackResult.title,
        uri: `https://www.youtube.com/watch?v=${trackResult.id}`,
        duration: trackResult.duration,
        isStream: false,
        thumbnail: trackResult.thumbnail?.url || null,
      };
      playlist.songs.push(track);
      try {
        await playlist.save();
      } catch (error) {
        console.error("Error saving song to playlist:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to add song to playlist.")],
        });
      }
      let title = escapeMarkdown(track.title).replace(/\]/g, "").replace(/\[/g, "");
      let addSongEmbed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setAuthor({ name: "Added to playlist", iconURL: client.config.iconURL })
        .setDescription(`[${title}](${track.uri})` || "No Title")
        .setURL(track.uri)
        .addFields(
          {
            name: "Added by",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: "Duration",
            value: track.isStream ? "`LIVE 🔴`" : `\`${client.ms(track.duration, { colonNotation: true, secondsDecimalDigits: 0 })}\``,
            inline: true,
          }
        );
      return interaction.editReply({ embeds: [addSongEmbed] });
    }

    if (subcommand === "deletesong") {
      const playlistName = options.getString("playlist");
      const index = options.getInteger("index");
      const playlist = await Playlist.findOne({ userDisplayname, userId, name: playlistName });
      if (!playlist) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Playlist not found.")],
        });
      }
      if (index < 1 || index > playlist.songs.length) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Invalid song index. Please provide a valid number.")],
        });
      }
      const removedSong = playlist.songs.splice(index - 1, 1)[0];
      try {
        await playlist.save();
      } catch (error) {
        console.error("Error deleting song from playlist:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to delete song from playlist.")],
        });
      }
      return interaction.editReply({
        embeds: [new MessageEmbed().setColor("GREEN").setDescription(`✅ Removed **${removedSong.title}** from playlist **${playlist.name}**.`)],
      });
    }

    if (subcommand === "addspotify") {
      if (!isPremium) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ This feature is for Premium users/guilds only!")],
        });
      }
      const url = options.getString("url");
      const name = options.getString("name");
      const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Invalid Spotify playlist link.")],
        });
      }
      const playlistId = match[1];
      try {
        const data = await spotifyApi.getPlaylist(playlistId);
        const songs = data.body.tracks.items.map((item) => ({
          title: item.track.name,
          uri: item.track.external_urls.spotify,
          duration: item.track.duration_ms,
          isStream: false,
          thumbnail: null,
        }));
        const newPlaylist = new Playlist({userDisplayname, userId, name, songs });
        await newPlaylist.save();
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("GREEN").setDescription(`✅ Spotify playlist **${name}** added!`)],
        });
      } catch (err) {
        console.error("Error fetching Spotify playlist:", err);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to fetch Spotify playlist.")],
        });
      }
    }

    if (subcommand === "view") {
      // Untuk subcommand view, tampilkan select menu berdasarkan playlist milik pengguna
      const playlists = await Playlist.find({ userId });
      if (!playlists.length) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("YELLOW").setDescription("❌ No playlists found.")],
        });
      }
      const optionsArr = playlists.slice(0, 25).map((p) => ({
        label: p.name.substring(0, 25),
        description: `${p.songs.length} songs`,
        value: p._id.toString(),
      }));
      const row = new MessageActionRow().addComponents(new MessageSelectMenu().setCustomId(`playlist_view_${userId}`).setPlaceholder("Select a playlist to view details").addOptions(optionsArr));
      const embed = new MessageEmbed().setColor(client.config.embedColor).setTitle("🎵 Your Playlists").setDescription("Select a playlist from the menu below to view its details.");
      const replyMessage = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
      const filter = (i) => i.customId === `playlist_view_${userId}` && i.user.id === userId;
      const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });
      collector.on("collect", async (i) => {
        const selectedId = i.values[0];
        const selectedPlaylist = await Playlist.findById(selectedId);
        if (!selectedPlaylist) {
          return i.update({ content: "Playlist not found.", components: [] });
        }
        const detailsEmbed = new MessageEmbed()
          .setColor(client.config.embedColor)
          .setTitle(`${selectedPlaylist.name} playlist details`)
          .setFooter(`Created by ${userDisplayname}`)
          .setTimestamp(selectedPlaylist.createdAt)
          .addField(
            "Song List",
            selectedPlaylist.songs
              .map((s, idx) => `${idx + 1} [${s.title}](${s.uri})`)
              .join("\n")
              .substring(0, 1024) || "No songs"
          );
        await i.update({ embeds: [detailsEmbed], components: [] });
      });
      collector.on("end", () => {
        replyMessage.edit({ components: [] });
      });
    }

    if (subcommand === "delete") {
      const name = options.getString("name");
      try {
        const playlist = await Playlist.findOneAndDelete({ userId, userDisplayname, name });
        if (!playlist) {
          return interaction.editReply({
            embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Playlist not found.")],
          });
        }
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("GREEN").setDescription(`✅ Playlist **${name}** has been deleted.`)],
        });
      } catch (error) {
        console.error("Error deleting playlist:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to delete playlist.")],
        });
      }
    }

    if (subcommand === "play") {
      const name = options.getString("name");
      const playlist = await Playlist.findOne({ userId, name });
      if (!playlist) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Playlist not found.")],
        });
      }
      let channel = await client.getChannel(client, interaction);
      if (!channel) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ You must be in a voice channel for playing music.")],
        });
      }
      let node = await client.getLavalink(client);
      if (!node) {
        return interaction.editReply({
          embeds: [client.ErrorEmbed("Lavalink node is not connected")],
        });
      }
      let player = client.createPlayer(interaction.channel, channel);
      if (player.state !== "CONNECTED") {
        try {
          await player.connect();
          console.debug("Player connected:", player.state);
        } catch (error) {
          console.error("Error connecting player:", error);
          return interaction.editReply({
            embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to connect to the voice channel.")],
          });
        }
      }
      const tracks = [];
      for (const song of playlist.songs) {
        try {
          const res = await client.manager.search(song.uri, interaction.user);
          if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
            tracks.push(res.tracks[0]);
          } else {
            console.debug(`Song not loaded for URI: ${song.uri}`);
          }
        } catch (error) {
          console.error("Error reloading track:", error);
        }
      }
      if (tracks.length === 0) {
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ No valid tracks found in playlist.")],
        });
      }
      try {
        player.queue.add(tracks);
        console.debug("Tracks added to queue:", player.queue.size);
        if (!player.playing && !player.paused) {
          await player.play();
          console.debug("Player started playing");
        }
      } catch (error) {
        console.error("Error adding tracks to queue or playing:", error);
        return interaction.editReply({
          embeds: [new MessageEmbed().setColor("RED").setDescription("❌ Failed to load the playlist into the queue.")],
        });
      }
      return interaction.editReply({
        embeds: [new MessageEmbed().setColor(client.config.embedColor).setTitle("Playlist loaded into queue").setDescription(`**${playlist.name}** with \`${playlist.songs.length}\` songs has been added to the queue.`)],
      });
    }
  });

command.autocompleteRun = async (client, interaction) => {
  const focused = interaction.options.getFocused(true);
  const subcommand = interaction.options.getSubcommand();

  // Untuk subcommand "addsong", opsi "query" pakai youtube search
  if (subcommand === "addsong" && focused.name === "query") {
    try {
      const results = await youtube.search(focused.value, { limit: 5 });
      const choices = results.map((item) => ({
        name: item.title.length > 100 ? item.title.substring(0, 97) + "..." : item.title,
        value: item.title,
      }));
      return interaction.respond(choices);
    } catch (error) {
      console.error("Autocomplete error:", error);
      return interaction.respond([]);
    }
  }

  // Untuk subcommand "addsong", "delete", dan "play", opsi "playlist" atau "name" diambil dari database
  if ((subcommand === "addsong" && focused.name === "playlist") || (subcommand === "delete" && focused.name === "name") || (subcommand === "play" && focused.name === "name") || (subcommand === "deletesong" && focused.name === "playlist")) {
    try {
      const playlists = await Playlist.find({userDisplayname, userId: interaction.user.id });
      const choices = playlists
        .map((p) => ({
          name: p.name.length > 25 ? p.name.substring(0, 22) + "..." : p.name,
          value: p.name,
        }))
        .slice(0, 25);
      return interaction.respond(choices);
    } catch (error) {
      console.error("Autocomplete error:", error);
      return interaction.respond([]);
    }
  }

  // Default fallback (jika tidak memenuhi kriteria di atas)
  return interaction.respond([]);
};

module.exports = command;
