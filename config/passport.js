const passport = require("passport");
const { userModel } = require("../models/userModel");
const profileModel = require("../models/profileModel");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
            passReqToCallback: true // Allows access to req
        },

        async (req, accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error("No email found in Google profile"), null);
                }

                const mode = req.query.state;
                console.log("🔍 Mode received:", mode); // Debugging

                let user = await userModel.findOne({ email });

                if (mode === "login") {
                    if (!user) {
                        return done(null, false, { message: "User not found. Please register first." });
                    }
                    if (user.googleId !== profile.id) {
                        return done(null, false, { message: "Google account mismatch. Please use the correct Google account." });
                    }
                    return done(null, user);
                }

                if (mode === "register") {
                    if (user) {
                        return done(null, false, { message: "User already exists. Please log in." });
                    }

                    user = await userModel.create({
                        name: profile.displayName,
                        email,
                        googleId: profile.id
                    });

                    await profileModel.create({
                        user: user._id,
                        name: user.name,
                        bio: '',
                        socials: {},
                    });

                    return done(null, user);
                }

                return done(new Error("Invalid mode"), null);
            } catch (error) {
                console.error("❌ Error in Google authentication:", error);
                return done(error, null);
            }
        }
    )
);


module.exports = passport;
