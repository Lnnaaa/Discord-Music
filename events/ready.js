const voiceXP = require("../events/voiceXP"); // Panggil voiceXP

/**
 *
 * @param {import("../lib/DiscordMusicBot")} client
 */
module.exports = (client) => {
	client.manager.init(client.user.id);
	client.user.setPresence(client.config.presence);
	client.log("Successfully Logged in as " + client.user.tag);
    voiceXP(client); // Panggil voiceXP
};
