const SpotifyWebApi = require("spotify-web-api-node");
require("dotenv").config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

const refreshSpotifyToken = async () => {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body.access_token);
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
  }
};

// Refresh token setiap 1 jam
refreshSpotifyToken();
setInterval(refreshSpotifyToken, 3600 * 1000);

module.exports = spotifyApi;
