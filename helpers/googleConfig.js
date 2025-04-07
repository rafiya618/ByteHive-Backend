const { google } = require('googleapis');

// OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
});

module.exports = oauth2Client;