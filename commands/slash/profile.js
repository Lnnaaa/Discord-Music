const { MessageAttachment } = require("discord.js");
const User = require("../../models/user");
const SlashCommand = require("../../lib/SlashCommand");
const { createCanvas, loadImage, registerFont } = require("canvas");

const command = new SlashCommand()
  .setName("profile")
  .setDescription("View your profile card")
  .setRun(async (client, interaction) => {
    try {
      // ✅ Hindari timeout
      await interaction.deferReply();

      const userId = interaction.user.id;
      const userDisplayname = interaction.user.displayname;

      // ✅ Update atau buat user di database
      let user = await User.findOneAndUpdate({userDisplayname}, { userId }, { $setOnInsert: { xp: 0, level: 1 } }, { upsert: true, new: true });

      // ✅ Fetch semua user & urutkan berdasarkan level (Rank)
      const leaderboard = await User.find().sort({ level: -1, xp: -1 }).exec();
      const rank = leaderboard.findIndex((u) => u.userId === userId) + 1; // Posisi pengguna

      // ✅ Fetch user untuk memastikan banner bisa diambil
      const userData = await client.users.fetch(userId, { force: true });
      
      // ✅ Ambil banner user (jika ada)
      let bannerUrl = userData.bannerURL({ format: "png", size: 1024 }) || "https://example.com/default-banner.png";
      
      // ✅ Ambil warna role tertinggi user
      const member = await interaction.guild.members.fetch(userId);
      const highestRole = member.roles.highest;
      const xpBarColor = highestRole.color ? `#${highestRole.color.toString(16).padStart(6, "0")}` : "#4CAF50";

      // ✅ Buat canvas dengan ukuran normal
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext("2d");

      // Load banner sebagai wallpaper
      const banner = await loadImage(bannerUrl);
      ctx.drawImage(banner, 0, 0, canvas.width, canvas.height);

      // Overlay gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 300);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 300);

      // ✅ Tambahkan avatar
      const avatarUrl = interaction.user.displayAvatarURL({ format: "png", size: 256 });
      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(140, 150, 75, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 70, 80, 140, 140);
      ctx.restore();

      // Avatar glow
      ctx.beginPath();
      ctx.arc(140, 150, 75, 0, Math.PI * 2, true);
      ctx.lineWidth = 5;
      ctx.strokeStyle = xpBarColor;
      ctx.stroke();


      // ✅ Kalkulasi XP & Level Maksimum
      let xpNeeded = Math.pow(user.level, 2) * 100;
      let formattedXP = user.xp.toLocaleString("en-US");
      let formattedXPNeeded = xpNeeded.toLocaleString("en-US");
      let xpProgress = Math.min(user.xp / xpNeeded, 1);

      if (user.level >= 100) {
        xpProgress = 1;
        formattedXP = "-";
        formattedXPNeeded = "-";
      }

      // ✅ Tambahkan username, level, XP, dan rank
      ctx.font = "bold 32px Poppins";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 4;
      ctx.fillText(`Rank: #${rank}`, 250, 100);
      ctx.font = "bold 26px Poppins";
      ctx.fillText(interaction.user.displayName, 250, 130);
      ctx.font = "bold 20px Poppins";
      ctx.fillText(`Level: ${user.level}`, 250, 160);
      ctx.font = "bold 20px Poppins";
      ctx.fillText(`XP: ${formattedXP} / ${formattedXPNeeded}`, 250, 210);

      // ✅ Tambahkan XP Bar (Rounded)
      const barX = 250;
      const barY = 220;
      const barWidth = 400;
      const barHeight = 20;
      const radius = 10;

      // Background XP Bar
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.moveTo(barX + radius, barY);
      ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + barHeight, radius);
      ctx.arcTo(barX + barWidth, barY + barHeight, barX, barY + barHeight, radius);
      ctx.arcTo(barX, barY + barHeight, barX, barY, radius);
      ctx.arcTo(barX, barY, barX + barWidth, barY, radius);
      ctx.closePath();
      ctx.fill();

      // Progress XP Bar
      ctx.fillStyle = xpBarColor;
      ctx.beginPath();
      ctx.moveTo(barX + radius, barY);
      ctx.arcTo(barX + barWidth * xpProgress, barY, barX + barWidth * xpProgress, barY + barHeight, radius);
      ctx.arcTo(barX + barWidth * xpProgress, barY + barHeight, barX, barY + barHeight, radius);
      ctx.arcTo(barX, barY + barHeight, barX, barY, radius);
      ctx.arcTo(barX, barY, barX + barWidth * xpProgress, barY, radius);
      ctx.closePath();
      ctx.fill();

      // ✅ Kirim hasil gambar sebagai attachment
      const attachment = new MessageAttachment(canvas.toBuffer(), "profile.png");
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("❌ ERROR generating profile card:", error);
      return interaction.editReply("🚫 An error occurred while generating your profile card.");
    }
  });

module.exports = command;
