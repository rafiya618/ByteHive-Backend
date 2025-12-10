import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL,
  // withCredentials: true, // uncomment if using cookies/auth
});

// ✅ Register user and send OTP
export const registerUser = (email, password) => {
  return API.post("/auth/register", { email, password });
};

// ✅ Verify OTP and get token
export const verifyOtp = (email, password, otp) => {
  return API.post("/auth/verify-otp", { email, password, otp });
};

// ✅ Resend OTP
export const resendOtp = (email) => {
  return API.post("/auth/resend-otp", { email });
};

// ✅ Login user
export const loginUser = (email, password) => {
  return API.post("/auth/login", { email, password });
};

// ✅ Forgot password: send OTP
export const forgotPassword = (email) => {
  return API.post("/auth/forgot-password", { email });
};

// ✅ Verify reset OTP
export const verifyResetOtp = (email, otp) => {
  return API.post("/auth/verify-reset-otp", { email, otp });
};

// ✅ Reset password
export const resetPassword = (email, password) => {
  return API.post("/auth/reset-password", { email, password });
};
