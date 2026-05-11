import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { userModel } from "../models/userModel.js";
// import profileModel from "../models/profileModel.js"; // optional

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: `${process.env.HOST}:${process.env.AUTH_PORT}/auth/google/callback`,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email found in Google profile"), null);

        const mode = req.query.state;
        console.log("🔍 Mode received:", mode);

        let user = await userModel.findOne({ email });

        if (mode === "login") {
          if (!user) return done(null, false, { message: "User not found. Please register first." });
          if (user.googleId !== profile.id) return done(null, false, { message: "Google account mismatch. Please use the correct Google account." });
          return done(null, user);
        }

        if (mode === "register") {
          if (user) {
            // Already registered → log in automatically
            return done(null, user, { message: "You are already registered. Logging you in..." });
          }

          // Create new user
          user = await userModel.create({
            email,
            googleId: profile.id,
            onboardingStep: 2
          });

          // Optional profile creation
          // await profileModel.create({ user: user._id, name: user.username, bio: '', socials: {} });

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

export default passport;
