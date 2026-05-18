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

// Determine OAuth callback base URL in order of precedence:
// 1. Explicit full callback URL: GOOGLE_CALLBACK_URL
// 2. Full service URL: AUTH_SERVICE_URL
// 3. Constructed from HOST + AUTH_PORT (legacy fallback)
const callbackBase =
  process.env.GOOGLE_CALLBACK_URL ||
  process.env.AUTH_SERVICE_URL ||
  (process.env.HOST && process.env.AUTH_PORT ? `${process.env.HOST}:${process.env.AUTH_PORT}` : undefined);

const resolvedCallbackURL = callbackBase ? `${callbackBase.replace(/\/$/, "")}/auth/google/callback` : "/auth/google/callback";
console.log("🔐 Google OAuth callbackURL ->", resolvedCallbackURL);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: resolvedCallbackURL,
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email found in Google profile"), null);

        const mode = req.query.state;
        console.log("🔍 Mode received:", mode);

        let user = await userModel.findOne({ email });

        if (user) {
          let wasLinked = false;

          if (user.googleId && user.googleId !== profile.id) {
            return done(null, false, { message: "Google account mismatch. Please use the correct Google account." });
          }

          if (!user.googleId) {
            wasLinked = true;
            user.googleId = profile.id;
            if (!user.onboardingStep) {
              user.onboardingStep = 2;
            }
            await user.save();
          }

          let message = "";
          if (wasLinked) {
            message = "Google account linked successfully.";
          } else if (mode === "register") {
            message = "You are already registered. Logging you in...";
          }

          return done(null, user, { message });
        }

        if (mode === "login") {
          return done(null, false, { message: "User not found. Please register first." });
        }

        // Create new user when no existing account is found
        user = await userModel.create({
          email,
          googleId: profile.id,
          onboardingStep: 2
        });

        // Optional profile creation
        // await profileModel.create({ user: user._id, name: user.username, bio: '', socials: {} });

        return done(null, user);
      } catch (error) {
        console.error("❌ Error in Google authentication:", error);
        return done(error, null);
      }
    }
  )
);

export default passport;
