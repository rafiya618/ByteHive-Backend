import { hashPassword, comparePassword, generateToken } from "../helpers/authHelper.js";
import sendEmail from "../helpers/sendEmail.js";
import { userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import OTP from "../models/otpModel.js";
import profileModel from "../models/profileModel.js";
import { createRedisClients } from "../config/redisClient.js";
import { validateEmail, validatePassword, validateOtp } from "../helpers/validators.js"; // use shared validators

const { pub } = await createRedisClients();

// ===============================
// Response Helper
// ===============================
const sendError = (res, status, field, message) => {
  return res.status(status).json({
    success: false,
    field,
    message,
  });
};

// ===============================
// Google Login
// ===============================
export const GoogleLogin = async (req, res) => {
  try {
    const frontendBase = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const redirectWithParams = (params) => {
      const qs = new URLSearchParams(params).toString();
      return res.redirect(`${frontendBase}/?${qs}`);
    };

    if (!req.user) return sendError(res, 400, "system", "User authentication failed.");

    // Fetch full user data to check suspension/block status
    const user = await userModel.findById(req.user._id);
    if (!user) return sendError(res, 404, "system", "User not found.");

    // Check if user is suspended
    if (user.isSuspended) {
      // Check if suspension is temporary and has expired
      if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
        // Lift temporary suspension
        user.isSuspended = false;
        user.suspendedUntil = null;
        user.suspensionReason = '';
        await user.save();
      } else {
        // Still suspended (or permanent ban)
        const suspensionMessage = encodeURIComponent(
          user.suspendedUntil
            ? `Your account is temporarily suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}. Reason: ${user.suspensionReason || 'Policy violation'}`
            : `Your account has been permanently suspended. Reason: ${user.suspensionReason || 'Policy violation'}`
        );
        return redirectWithParams({ error: "suspended", message: suspensionMessage });
      }
    }

    // Check if user is blocked
    if (user.status === "blocked") {
      return redirectWithParams({ error: "blocked", message: "Your account has been blocked." });
    }

    const token = generateToken(req.user);

    // Pass optional info.message for frontend toast
    const msg = req.authInfo?.message ? `&message=${encodeURIComponent(req.authInfo.message)}` : "";

    return redirectWithParams({ token, ...(req.authInfo?.message ? { message: req.authInfo.message } : {}) });
  } catch (error) {
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Login
// ===============================
export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    // const passwordError = validatePassword(password);
    // if (passwordError) return sendError(res, 400, "password", passwordError);

    const user = await userModel.findOne({ email });
    if (!user) {
      return sendError(res, 404, "email", "User not found!");
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, "password", "Invalid Password!");
    }

    // Check if user is suspended
    if (user.isSuspended) {
      // Check if suspension is temporary and has expired
      if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
        // Lift temporary suspension
        user.isSuspended = false;
        user.suspendedUntil = null;
        user.suspensionReason = '';
        await user.save();
      } else {
        // Still suspended (or permanent ban)
        const suspensionMessage = user.suspendedUntil
          ? `Your account is temporarily suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}. Reason: ${user.suspensionReason || 'Policy violation'}`
          : `Your account has been permanently suspended. Reason: ${user.suspensionReason || 'Policy violation'}`;
        return sendError(res, 403, "account", suspensionMessage);
      }
    }

    // Check if user is blocked
    if (user.status === "blocked") {
      return sendError(res, 403, "account", "Your account has been blocked.");
    }

    // Instead of issuing token immediately, require OTP verification for login
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        email,
        "ByteHive login verification code",
        `<p>Your login verification code is: <b>${otp}</b>. It will expire in 60 seconds.</p>`
      );
    } catch (mailErr) {
      console.error('Failed to send login OTP email:', mailErr?.message || mailErr);
      return sendError(res, 502, 'email', 'Failed to deliver login OTP email.');
    }

    res.json({ success: true, otpRequired: true, message: "Login OTP sent to your email." });
  } catch (err) {
    console.error("Login Error:", err);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// Verify OTP for login and issue token
export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpError = validateOtp(otp);
    if (otpError) return sendError(res, 400, 'otp', otpError);

    const validOTP = await OTP.findOne({ email });
    if (!validOTP) return sendError(res, 400, 'otp', 'OTP not found');
    const isOtpMatch = await comparePassword(otp, validOTP.otp);
    if (!isOtpMatch) return sendError(res, 400, 'otp', 'Invalid OTP');
    if (validOTP.expiresAt < new Date()) return sendError(res, 400, 'otp', 'OTP expired');

    const user = await userModel.findOne({ email });
    if (!user) return sendError(res, 404, 'email', 'User not found');

    // Check suspension / blocked status
    if (user.isSuspended) {
      if (user.suspendedUntil && new Date() > new Date(user.suspendedUntil)) {
        user.isSuspended = false;
        user.suspendedUntil = null;
        user.suspensionReason = '';
        await user.save();
      } else {
        const suspensionMessage = user.suspendedUntil
          ? `Your account is temporarily suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}. Reason: ${user.suspensionReason || 'Policy violation'}`
          : `Your account has been permanently suspended. Reason: ${user.suspensionReason || 'Policy violation'}`;
        return sendError(res, 403, 'account', suspensionMessage);
      }
    }

    if (user.status === 'blocked') return sendError(res, 403, 'account', 'Your account has been blocked.');

    // All good — delete OTP and issue token
    await OTP.deleteOne({ email });
    const token = generateToken(user);

    // Publish security notification about successful login (async, non-blocking)
    try {
      await pub.publish(
        "notification:event",
        JSON.stringify({
          notificationPayload: {
            receiverEmail: email,
            entityType: "security",
            triggerType: "login",
            message: `<p>Your ByteHive account was signed in on ${new Date().toLocaleString()}.</p><p>If this wasn't you, please reset your password immediately or contact support.</p>`,
          },
        })
      );
    } catch (e) {
      console.warn('Could not publish login notification event after OTP verification:', e?.message || e);
    }

    res.json({ success: true, message: 'Login successful', token });
  } catch (err) {
    console.error('verifyLoginOtp error:', err);
    sendError(res, 500, 'system', 'Something went wrong. Please try again.');
  }
};

// ===============================
// Forgot Password
// ===============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const user = await userModel.findOne({ email });
    if (!user) {
      return sendError(res, 404, "email", "User not found!");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60s expiry

    await OTP.findOneAndUpdate({ email }, { otp: hashedOtp, expiresAt }, { upsert: true });

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "password-reset",
          message: `<p>Your OTP is: <b>${otp}</b>. Valid for 60 seconds.</p>`,
        },
      })
    );

    res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Verify Reset OTP
// ===============================
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const otpError = validateOtp(otp);
    if (otpError) return sendError(res, 400, "otp", otpError);

    const validOTP = await OTP.findOne({ email });
    if (!validOTP) {
      return sendError(res, 400, "otp", "OTP not found!");
    }
    const isOtpMatch = await comparePassword(otp, validOTP.otp);
    if (!isOtpMatch) {
      return sendError(res, 400, "otp", "Invalid OTP");
    }
    if (validOTP.expiresAt < new Date()) {
      return sendError(res, 400, "otp", "OTP expired");
    }

    res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("OTP Verification Error:", err);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Reset Password
// ===============================
export const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const passwordError = validatePassword(password);
    if (passwordError) return sendError(res, 400, "password", passwordError);

    const hashedPassword = await hashPassword(password);
    await userModel.findOneAndUpdate({ email }, { password: hashedPassword });

    await OTP.deleteOne({ email });

    res.json({ success: true, message: "Password reset successfully!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Register
// ===============================
export const Register = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const passwordError = validatePassword(password);
    if (passwordError) return sendError(res, 400, "password", passwordError);

    const existingEmail = await userModel.findOne({ email });
    if (existingEmail) {
      if (existingEmail.password) {
        return sendError(res, 409, "email", "User already exists.");
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        email,
        "ByteHive security verification code",
        `<p>Your OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`
      );
    } catch (mailErr) {
      console.error('Failed to send OTP email:', mailErr?.message || mailErr);
      return sendError(res, 502, 'email', 'Failed to deliver OTP email.');
    }

    res.json({ success: true, message: "OTP sent to your email. Please verify." });
  } catch (error) {
    console.error("Error registering user:", error);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Resend OTP
// ===============================
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp: hashedOtp, expiresAt },
      { upsert: true, new: true }
    );

    try {
      await sendEmail(
        email,
        "ByteHive security verification code",
        `<p>Your new OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`
      );
    } catch (mailErr) {
      console.error('Failed to resend OTP email:', mailErr?.message || mailErr);
      return sendError(res, 502, 'email', 'Failed to deliver OTP email.');
    }

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Verify OTP & Register
// ===============================
// In verifyOTPAndRegister function

export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const emailError = validateEmail(email);
    if (emailError) return sendError(res, 400, "email", emailError);

    const passwordError = validatePassword(password);
    if (passwordError) return sendError(res, 400, "password", passwordError);

    const otpError = validateOtp(otp);
    if (otpError) return sendError(res, 400, "otp", otpError);

    const validOTP = await OTP.findOne({ email });
    if (!validOTP) {
      return sendError(res, 400, "otp", "OTP not found");
    }
    const isOtpMatch = await comparePassword(otp, validOTP.otp);
    if (!isOtpMatch) {
      return sendError(res, 400, "otp", "Invalid OTP");
    }
    if (validOTP.expiresAt < new Date()) {
      return sendError(res, 400, "otp", "OTP expired");
    }

    const hashedPassword = await hashPassword(password);
    const username = email.split("@")[0];

    let user = await userModel.findOne({ email });
    if (user) {
      if (user.password) {
        return sendError(res, 409, "email", "User already exists.");
      }

      user.password = hashedPassword;
      if (!user.username) {
        user.username = username;
      }
      if (!user.onboardingStep) {
        user.onboardingStep = 2;
      }
      await user.save();
    } else {
      user = await userModel.create({
        email,
        password: hashedPassword,
        username,
        onboardingStep: 2,
      });
    }

    await OTP.deleteOne({ email });
    const token = generateToken(user);

    res.json({ success: true, message: "User registered successfully!", token });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};
