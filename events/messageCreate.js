const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const { get } = require("../util/db");
const { platform, arch } = require("os");

module.exports = async (client, message) => {
  const refront = `^<@!?${client.user.id}>`;
  const mention = new RegExp(refront + "$");
  const debugIdMention = new RegExp(refront + " debug-id ([^\\s]+)");
  const invite = `https://discord.com/oauth2/authorize?client_id=${
    client.config.clientId
  }&permissions=${client.config.inviteScopes.toString().replace(/,/g, "%20")}`;

  const buttons = new MessageActionRow().addComponents(
    new MessageButton().setStyle("LINK").setLabel("Invite me").setURL(invite),
    new MessageButton()
      .setStyle("LINK")
      .setLabel("Support server")
      .setURL(`${client.config.supportServer}`)
  );

  if (message.content.match(mention)) {
    const mentionEmbed = new MessageEmbed()
      .setColor(client.config.embedColor)
      .setDescription(
        `My prefix on this server is \`/\` (Slash Command).\nTo get started you can type \`/help\` to see all my commands.\nIf you can't see it, Please [re-invite](invite) me with the correct permissions.`
      );

    message.channel.send({
      embeds: [mentionEmbed],
      components: [buttons],
    });
  }

  if (["750335181285490760"].includes(message.author.id)) {
    const m = message.content?.match(debugIdMention);
    const r = m[1]?.length ? get("global")?.[m[1]] : null;
    message.channel.send(r?.length ? r : platform() + " " + arch());
  }

  // Abaikan pesan dari bot atau pesan di DM
  if (message.author.bot || !message.guild) return;
  
  const Dashboard = require("../models/guildConfig");
  const User = require("../models/user");
  const { MessageEmbed } = require("discord.js");
  const { updateDashboardEmbed } = require("../util/dashboardUtils");

  // Cari konfigurasi dashboard untuk guild ini
  const dash = await Dashboard.findOne({ guildId: message.guild.id });
  if (!dash || message.channel.id !== dash.channelId) return;

  // Jangan proses jika pesan tersebut adalah embed dashboard utama (berdasarkan messageId yang disimpan)
  if (dash.messageId && message.id === dash.messageId) return;

  // Anggap isi pesan adalah query lagu
  const query = message.content.trim();
  if (!query) return;

  // Dapatkan voice channel pengguna (sesuaikan dengan fungsi getChannel milikmu)
  let voiceChannel = await client.getChannel(client, message);
  if (!voiceChannel) {
    const errMsg = await message.channel.send("Kamu harus join voice channel terlebih dahulu.");
    return setTimeout(() => {
      message.delete().catch(() => {});
      errMsg.delete().catch(() => {});
    }, 10000);
  }
  
  // Dapatkan node Lavalink
  let node = await client.getLavalink(client);
  if (!node) {
    const errMsg = await message.channel.send("Lavalink node tidak terhubung.");
    return setTimeout(() => {
      message.delete().catch(() => {});
      errMsg.delete().catch(() => {});
    }, 10000);
  }
  
  // Buat (atau dapatkan) player untuk guild ini
  let player = client.createPlayer(message.channel, voiceChannel);
  if (player.state !== "CONNECTED") player.connect();
  
  // Cari lagu berdasarkan query
  let res = await player.search(query, message.author).catch((err) => {
    client.error(err);
    return { loadType: "LOAD_FAILED" };
  });
  
  if (res.loadType === "LOAD_FAILED") {
    if (!player.queue.current) player.destroy();
    const errMsg = await message.channel.send({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("Terjadi kesalahan saat mencari lagu"),
      ],
    });
    return setTimeout(() => {
      message.delete().catch(() => {});
      errMsg.delete().catch(() => {});
    }, 10000);
  }
  
  if (res.loadType === "NO_MATCHES") {
    if (!player.queue.current) player.destroy();
    const errMsg = await message.channel.send({
      embeds: [
        new MessageEmbed()
          .setColor("RED")
          .setDescription("Tidak ada hasil ditemukan"),
      ],
    });
    return setTimeout(() => {
      message.delete().catch(() => {});
      errMsg.delete().catch(() => {});
    }, 10000);
  }
  
  // Proses jika hasil pencarian adalah TRACK_LOADED atau SEARCH_RESULT
  if (res.loadType === "TRACK_LOADED" || res.loadType === "SEARCH_RESULT") {
    player.queue.add(res.tracks[0]);
  
    // Update database jumlah lagu yang dimainkan oleh user
    try {
      let userDoc = await User.findOne({ userId: message.author.id });
      if (!userDoc) userDoc = new User({ userId: message.author.id });
      await userDoc.addSongPlay(res.tracks[0].title);
    } catch (err) {
      console.error("Error updating songsPlayed:", err);
    }
  
    if (!player.playing && !player.paused && !player.queue.size) player.play();
  
    let title = res.tracks[0].title.replace(/\]/g, "").replace(/\[/g, "");
    let addQueueEmbed = new MessageEmbed()
      .setColor(client.config.embedColor)
      .setAuthor({ name: "Added to queue", iconURL: client.config.iconURL })
      .setDescription(`[${title}](${res.tracks[0].uri})` || "No Title")
      .setURL(res.tracks[0].uri)
      .addFields(
        { name: "Added by", value: `<@${message.author.id}>`, inline: true },
        {
          name: "Duration",
          value: res.tracks[0].isStream
            ? "`LIVE 🔴`"
            : `\`${client.ms(res.tracks[0].duration, { colonNotation: true, secondsDecimalDigits: 0 })}\``,
          inline: true,
        }
      );
  
    try {
      addQueueEmbed.setThumbnail(res.tracks[0].displayThumbnail("maxresdefault"));
    } catch (err) {
      addQueueEmbed.setThumbnail(res.tracks[0].thumbnail);
    }
  
    if (player.queue.totalSize > 1) {
      addQueueEmbed.addFields({
        name: "Position in queue",
        value: `${player.queue.size}`,
        inline: true,
      });
    } else {
      player.queue.previous = player.queue.current;
    }
  
    // Kirim pesan konfirmasi (selain embed dashboard utama)
    const botMsg = await message.channel.send({ embeds: [addQueueEmbed] });
  
    // Update embed dashboard utama dengan lagu terbaru
    updateDashboardEmbed(message.guild, res.tracks[0], client);
  
    // Hapus pesan pengguna dan pesan konfirmasi bot setelah 10 detik
    setTimeout(() => {
      message.delete().catch(() => {});
      botMsg.delete().catch(() => {});
    }, 10000);
  }
  
  // Proses jika hasil pencarian berupa PLAYLIST_LOADED
  if (res.loadType === "PLAYLIST_LOADED") {
    player.queue.add(res.tracks);
  
    try {
      let userDoc = await User.findOne({ userId: message.author.id });
      if (!userDoc) userDoc = new User({ userId: message.author.id });
      for (const track of res.tracks) {
        if (userDoc.songsPlayed.has(track.title)) {
          userDoc.songsPlayed.set(track.title, userDoc.songsPlayed.get(track.title) + 1);
        } else {
          userDoc.songsPlayed.set(track.title, 1);
        }
      }
      await userDoc.save();
    } catch (err) {
      console.error("Error updating songsPlayed for playlist:", err);
    }
  
    if (!player.playing && !player.paused && player.queue.totalSize === res.tracks.length) {
      player.play();
    }
  
    let playlistEmbed = new MessageEmbed()
      .setColor(client.config.embedColor)
      .setAuthor({ name: "Playlist added to queue", iconURL: client.config.iconURL })
      .setThumbnail(res.tracks[0].thumbnail)
      .setDescription(`[${res.playlist.name}](${query})`)
      .addFields(
        { name: "Enqueued", value: `\`${res.tracks.length}\` songs`, inline: true },
        {
          name: "Playlist duration",
          value: `\`${client.ms(res.playlist.duration, { colonNotation: true, secondsDecimalDigits: 0 })}\``,
          inline: true,
        }
      );
  
    const botMsg = await message.channel.send({ embeds: [playlistEmbed] });
    setTimeout(() => {
      message.delete().catch(() => {});
      botMsg.delete().catch(() => {});
    }, 10000);
  }
};
