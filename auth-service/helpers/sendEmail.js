import nodemailer from 'nodemailer';
import oauth2Client from './googleConfig.js';

const sendEmail = async (email, subject, html) => {
    console.log('entered in sendEmail' )
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL_SENDER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken.token
        }
    });

    await transporter.sendMail({
        from: `"ByteHive" <${process.env.EMAIL_SENDER}>`,
        to: email,
        subject,
        html
    });
};

export default sendEmail;
