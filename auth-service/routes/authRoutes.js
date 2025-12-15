import express from 'express';
import passport from 'passport';
import {
  GoogleLogin,
  Login,
  Register,
  verifyOTPAndRegister,
  resendOTP,
  forgotPassword,
  verifyResetOtp,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

// Google OAuth Login
router.get('/google', (req, res, next) => {
  const mode = req.query.mode;
  console.log("Entered mode:", mode);
  if (!mode || (mode !== "login" && mode !== "register")) {
    return res.status(400).send("Invalid mode. Use mode=login or mode=register.");
  }

  passport.authenticate('google', {
    scope: ["profile", "email"],
    session: false,
    state: mode,
    prompt: "select_account"
  })(req, res, next);
});

// Google OAuth Callback
router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      // ✅ Handle internal Passport errors
      if (err) return next(err);

      // User not found or invalid
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/google-auth?error=${encodeURIComponent(info?.message || "Authentication failed.")}`);
      }

      // Pass user and optional message to GoogleLogin
      req.user = user;
      req.authInfo = info;
      next();
    })(req, res, next);
  },
  GoogleLogin
);

// Other routes
router.post('/login', Login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);
router.post('/register', Register);
router.post('/verify-otp', verifyOTPAndRegister);
router.post('/resend-otp', resendOTP);

export default router;
