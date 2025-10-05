import { hashPassword, comparePassword, generateToken } from "../helpers/authHelper.js";
import sendEmail from "../helpers/sendEmail.js";
import { userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import OTP from "../models/otpModel.js";
import profileModel from "../models/profileModel.js";
import { createRedisClients } from "../../shared-config/redisClient.js";
import { validateEmail, validatePassword, validateOtp } from "../helpers/validators.js"; // ✅ use shared validators

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
    if (!req.user) return sendError(res, 400, "system", "User authentication failed.");

    const token = generateToken(req.user);

    // Pass optional info.message for frontend toast
    const msg = req.authInfo?.message ? `&message=${encodeURIComponent(req.authInfo.message)}` : "";

    res.redirect(`${process.env.FRONTEND_URL}/google-auth?token=${token}${msg}`);
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

    const token = generateToken(user);

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "login",
          message: `Some login in bytehive`,
        },
      })
    );

    res.json({ success: true, message: "Login successful!", token });
  } catch (err) {
    console.error("Login Error:", err);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
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
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60s expiry

    await OTP.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true });

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
    if (validOTP.otp !== otp) {
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
      return sendError(res, 409, "email", "User already exists.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "register",
          message: `<p>Your OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`,
        },
      })
    );

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
    const expiresAt = new Date(Date.now() + 60 * 1000);

    await OTP.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    await pub.publish(
      "notification:event",
      JSON.stringify({
        notificationPayload: {
          receiverEmail: email,
          entityType: "system",
          triggerType: "password-reset",
          message: `<p>Your new OTP is: <b>${otp}</b>. It will expire in 60 seconds.</p>`,
        },
      })
    );

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};

// ===============================
// Verify OTP & Register
// ===============================
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
    if (validOTP.otp !== otp) {
      return sendError(res, 400, "otp", "Invalid OTP");
    }
    if (validOTP.expiresAt < new Date()) {
      return sendError(res, 400, "otp", "OTP expired");
    }

    const hashedPassword = await hashPassword(password);
    const user = await userModel.create({
      email,
      password: hashedPassword,
      onboardingStep: 2,
    });

    await OTP.deleteOne({ email });
    const token = generateToken(user);

    res.json({ success: true, message: "User registered successfully!", token });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    sendError(res, 500, "system", "Something went wrong. Please try again.");
  }
};
