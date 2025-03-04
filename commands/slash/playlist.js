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
  .setDescription("Manage and groove with your playlists")
  // Subcommand: create (buat playlist custom)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Craft a new custom playlist")
      .addStringOption((option) =>
        option.setName("name").setDescription("Give your playlist a cool name").setRequired(true)
      )
  )
  // Subcommand: addsong (tambahkan lagu ke playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("addsong")
      .setDescription("Find a track and add it to your playlist")
      .addStringOption((option) =>
        option.setName("playlist").setDescription("Choose your playlist").setRequired(true).setAutocomplete(true)
      )
      .addStringOption((option) =>
        option.setName("query").setDescription("Type the song title or keywords").setRequired(true).setAutocomplete(true)
      )
  )
  // Subcommand: deletesong (hapus lagu dari playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("deletesong")
      .setDescription("Remove a song from your playlist by its number")
      .addStringOption((option) =>
        option.setName("playlist").setDescription("Select your playlist").setRequired(true).setAutocomplete(true)
      )
      .addIntegerOption((option) =>
        option.setName("index").setDescription("Song number to remove (starting from 1)").setRequired(true)
      )
  )
  // Subcommand: spotify (import playlist dari Spotify, Premium Only)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("spotify")
      .setDescription("Import a Spotify playlist (Premium Only)")
      .addStringOption((option) =>
        option.setName("url").setDescription("Paste the Spotify playlist URL").setRequired(true)
      )
  )
  // Subcommand: view (lihat daftar playlist) dengan opsi tag user target
  .addSubcommand((subcommand) =>
    subcommand
      .setName("view")
      .setDescription("Browse playlists; tag a user to see theirs")
      .addUserOption((option) =>
        option.setName("target").setDescription("Tag a user to view their playlists (leave empty for your own)")
      )
  )
  // Subcommand: delete (hapus playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription("Permanently delete a playlist")
      .addStringOption((option) =>
        option.setName("name").setDescription("Select the playlist to delete").setRequired(true).setAutocomplete(true)
      )
  )
  // Subcommand: play (mainkan playlist)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("play")
      .setDescription("Let the music roll! Play a playlist")
      .addStringOption((option) =>
        option.setName("name").setDescription("Select a playlist to play").setRequired(true).setAutocomplete(true)
      )
  )
  .setRun(async (client, interaction, options) => {
    await interaction.deferReply();

    const subcommand = options.getSubcommand();
    const userId = interaction.user.id;
    const userDisplayname = interaction.member ? interaction.member.displayName : interaction.user.username;
    const guildId = interaction.guild.id;

    // Dapatkan data user dan guild premium
    let userDoc = await User.findOne({ userId });
    if (!userDoc) {
      userDoc = new User({ userId, premium: false });
      await userDoc.save();
    }
    let guildDoc = await PremiumGuild.findOne({ guildId });
    const isPremium = userDoc.premium || (guildDoc && guildDoc.premium);

    // === Subcommand: create ===
    if (subcommand === "create") {
      const name = options.getString("name");
      // Cek agar playlist dengan nama yang sama tidak boleh dibuat oleh user yang sama
      const existing = await Playlist.findOne({ userId, name });
      if (existing) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ You already have a playlist with that name! Please choose a different name."),
          ],
        });
      }
      const userPlaylists = await Playlist.find({ userId });
      const maxPlaylists = isPremium ? Infinity : 1;
      if (userPlaylists.length >= maxPlaylists) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Non-premium users can only create 1 playlist! Upgrade to premium to unlock more."),
          ],
        });
      }
      const newPlaylist = new Playlist({ userId, userDisplayname, name, songs: [] });
      try {
        await newPlaylist.save();
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription(`🎉 Playlist **${name}** has been successfully created!`),
          ],
        });
      } catch (error) {
        console.error("Error creating playlist:", error);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Oops! Something went wrong while creating your playlist."),
          ],
        });
      }
    }

    // === Subcommand: addsong ===
    if (subcommand === "addsong") {
      const playlistName = options.getString("playlist");
      const query = options.getString("query", true);
      const playlist = await Playlist.findOne({ userId, name: playlistName });
      if (!playlist) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Playlist not found. Please check your selection."),
          ],
        });
      }
      let results;
      try {
        results = await youtube.search(query, { limit: 1 });
      } catch (error) {
        console.error("Error searching for song:", error);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ There was an error while searching for your song. Please try again later."),
          ],
        });
      }
      if (!results.length) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ No results found. Try different keywords!"),
          ],
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
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Failed to add song to your playlist."),
          ],
        });
      }
      let title = escapeMarkdown(track.title).replace(/\]/g, "").replace(/\[/g, "");
      let addSongEmbed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setAuthor({ name: "Song Added", iconURL: client.config.embedColor })
        .setDescription(`[${title}](${track.uri}) has been added to your playlist!`)
        .setURL(track.uri)
        .addFields(
          { name: "Added by", value: `<@${interaction.user.id}>`, inline: true },
          {
            name: "Duration",
            value: track.isStream ? "`LIVE 🔴`" : `\`${client.ms(track.duration, { colonNotation: true, secondsDecimalDigits: 0 })}\``,
            inline: true,
          }
        );
      return interaction.editReply({ embeds: [addSongEmbed] });
    }

    // === Subcommand: deletesong ===
    if (subcommand === "deletesong") {
      const playlistName = options.getString("playlist");
      const index = options.getInteger("index");
      const playlist = await Playlist.findOne({ userId, name: playlistName });
      if (!playlist) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Playlist not found. Please try again."),
          ],
        });
      }
      if (index < 1 || index > playlist.songs.length) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Invalid song number. Please provide a valid index."),
          ],
        });
      }
      const removedSong = playlist.songs.splice(index - 1, 1)[0];
      try {
        await playlist.save();
      } catch (error) {
        console.error("Error deleting song from playlist:", error);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Failed to remove the song from your playlist."),
          ],
        });
      }
      return interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setColor(client.config.embedColor)
            .setDescription(`🎶 Removed **${removedSong.title}** from **${playlist.name}**.`),
        ],
      });
    }

    // === Subcommand: spotify ===
    if (subcommand === "spotify") {
      if (!isPremium) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ This feature is for Premium users/guilds only!"),
          ],
        });
      }
      const url = options.getString("url");
      const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Invalid Spotify playlist link."),
          ],
        });
      }
      const playlistId = match[1];
      try {
        const data = await spotifyApi.getPlaylist(playlistId);
        // Ambil nama dan detail playlist langsung dari data Spotify
        const name = data.body.name;
        const songs = data.body.tracks.items.map((item) => ({
          title: item.track.name,
          uri: item.track.external_urls.spotify,
          duration: item.track.duration_ms,
          isStream: false,
          thumbnail: item.track.album.images[0]?.url || null,
        }));
        const newPlaylist = new Playlist({
          userId,
          userDisplayname,
          name,
          songs,
          source: "spotify",
          spotifyId: playlistId,
          description: data.body.description || "",
          image: data.body.images[0]?.url || null,
        });
        await newPlaylist.save();
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription(`🎉 Spotify playlist **${name}** imported successfully!`),
          ],
        });
      } catch (err) {
        console.error("Error fetching Spotify playlist:", err);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Failed to import Spotify playlist."),
          ],
        });
      }
    }

    // === Subcommand: view ===
    if (subcommand === "view") {
      // Ambil target user jika di-tag, default ke pemanggil
      const targetUser = options.getUser("target") || interaction.user;
      const playlists = await Playlist.find({ userId: targetUser.id });
      if (!playlists.length) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription(`❌ ${targetUser.username} doesn't have any playlists yet!`),
          ],
        });
      }
      const optionsArr = playlists.slice(0, 25).map((p) => ({
        label: p.name.substring(0, 25),
        description: `${p.songs.length} songs`,
        value: p._id.toString(),
      }));
      const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
          .setCustomId(`playlist_view_${targetUser.id}`)
          .setPlaceholder("Select a playlist to view details")
          .addOptions(optionsArr)
      );
      const embed = new MessageEmbed()
        .setColor(client.config.embedColor)
        .setTitle(`🎵 ${targetUser.username}'s Playlists`)
        .setDescription("Choose a playlist from the menu below to view its details.");
      const replyMessage = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
      const filter = (i) => i.customId === `playlist_view_${targetUser.id}` && i.user.id === interaction.user.id;
      const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });
      collector.on("collect", async (i) => {
        const selectedId = i.values[0];
        const selectedPlaylist = await Playlist.findById(selectedId);
        if (!selectedPlaylist) {
          return i.update({ content: "Playlist not found.", components: [] });
        }
        const detailsEmbed = new MessageEmbed()
          .setColor(client.config.embedColor)
          .setDescription(`**${selectedPlaylist.userDisplayname} ${selectedPlaylist.name} Playlist**`)
          .setThumbnail("https://pngimg.com/d/discord_PNG16.png")
          .addField(
            "Song List",
            selectedPlaylist.songs
              .map((s, idx) => `**${idx + 1}.** ${s.title}`)
              .join("\n")
              .substring(0, 1024) || "No songs added yet."
          )
          .setFooter(`Requested by ${interaction.member.displayName}`, i.user.displayAvatarURL())
          .setTimestamp(selectedPlaylist.createdAt);

        // Jika playlist diimpor dari Spotify, tampilkan thumbnail dan link Spotify
        if (selectedPlaylist.source === "spotify") {
          detailsEmbed.setThumbnail("https://cdn.iconscout.com/icon/free/png-256/free-spotify-logo-icon-download-in-svg-png-gif-file-formats--70-flat-social-icons-color-pack-logos-432546.png?f=webp&w=256");
          detailsEmbed.setDescription(`**${selectedPlaylist.userDisplayname} ${selectedPlaylist.name} Playlist [[Open in Spotify]](https://open.spotify.com/playlist/${selectedPlaylist.spotifyId})**`, true);
          if (selectedPlaylist.description) {
            detailsEmbed.addField("Description", selectedPlaylist.description.substring(0, 1024), false);
          }
        }
        await i.update({ embeds: [detailsEmbed], components: [] });
      });
      collector.on("end", () => {
        replyMessage.edit({ components: [] });
      });
    }

    // === Subcommand: delete ===
    if (subcommand === "delete") {
      const name = options.getString("name");
      try {
        const playlist = await Playlist.findOneAndDelete({ userId, name });
        if (!playlist) {
          return interaction.editReply({
            embeds: [
              new MessageEmbed()
                .setColor(client.config.embedColor)
                .setDescription("❌ Playlist not found. Please check the name and try again."),
            ],
          });
        }
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription(`🎉 Playlist **${name}** has been permanently deleted.`),
          ],
        });
      } catch (error) {
        console.error("Error deleting playlist:", error);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ An error occurred while deleting the playlist."),
          ],
        });
      }
    }

    // === Subcommand: play ===
    if (subcommand === "play") {
      const name = options.getString("name");
      const playlist = await Playlist.findOne({ userId, name });
      if (!playlist) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Playlist not found. Please check the name and try again."),
          ],
        });
      }
      let channel = await client.getChannel(client, interaction);
      if (!channel) {
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ You must be in a voice channel to play music."),
          ],
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
            embeds: [
              new MessageEmbed()
                .setColor(client.config.embedColor)
                .setDescription("❌ Failed to join the voice channel."),
            ],
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
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ No valid tracks found in your playlist."),
          ],
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
        console.error("Error playing playlist:", error);
        return interaction.editReply({
          embeds: [
            new MessageEmbed()
              .setColor(client.config.embedColor)
              .setDescription("❌ Failed to load the playlist into the queue."),
          ],
        });
      }
      return interaction.editReply({
        embeds: [
          new MessageEmbed()
            .setColor(client.config.embedColor)
            .setTitle("Now Playing")
            .setDescription(`🎶 **${playlist.name}** (${playlist.songs.length} songs) is now playing!`),
        ],
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

  // Untuk subcommand "addsong", "delete", "play", dan "deletesong", opsi "playlist" atau "name" diambil dari database
  if (
    (subcommand === "addsong" && focused.name === "playlist") ||
    (subcommand === "delete" && focused.name === "name") ||
    (subcommand === "play" && focused.name === "name") ||
    (subcommand === "deletesong" && focused.name === "playlist")
  ) {
    try {
      const playlists = await Playlist.find({ userId: interaction.user.id });
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

  // Default fallback
  return interaction.respond([]);
};

module.exports = command;
