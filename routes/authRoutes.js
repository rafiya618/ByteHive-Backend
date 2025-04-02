const express = require('express');
const { GoogleLogin, Login, Register, verifyOTPAndRegister, resendOTP, forgotPassword, verifyResetOtp, resetPassword} = require('../controllers/authController');
// const passport = require('../config/passport.js');
const passport = require("passport")

const router = express.Router();

// Login with Google
router.get('/google', (req, res, next) => {
    const mode = req.query.mode; // Extract mode from query params
    if (!mode || (mode !== "login" && mode !== "register")) {
        return res.status(400).send("Invalid mode. Use mode=login or mode=register.");
    }
    passport.authenticate('google', {
        scope: ["profile", "email"],
        session: false,
        state: mode // Pass mode as state
    })(req, res, next);
});

// Google callback
router.get(
    "/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, (err, user, info) => {
            if (err) {
                return res.redirect(`${process.env.FRONTEND_URL}/google-auth?error=${encodeURIComponent("Authentication failed. Please try again.")}`);
            }

            if (!user) {
                return res.redirect(`${process.env.FRONTEND_URL}/google-auth?error=${encodeURIComponent(info?.message || "Authentication failed.")}`);
            }

            req.user = user; // Attach user to request
            next();
        })(req, res, next);
    },
    GoogleLogin
);


router.post('/login', Login)
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

router.post('/register', Register)// Step 1: Send OTP
router.post("/verify-otp", verifyOTPAndRegister); // Step 2: Verify and Register
router.post("/resend-otp", resendOTP); // Step 2: Verify and Register


module.exports = router;