const nodemailer = require("nodemailer");
const oauth2Client = require("./googleConfig");

const sendEmail = async (email, subject, html) => {
    const accessToken = await oauth2Client.getAccessToken();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL_SENDER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken.token,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_SENDER,
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;
