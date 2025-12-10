// ============================
// 🔹 Validators Utility File
// ============================

// ===== Auth Validators =====

// ✅ Validate Email (format + max length)
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) return "Email is required.";
  if (!emailRegex.test(email)) return "Invalid email format.";
  if (email.length > 75) return "Email cannot exceed 75 characters.";

  return null;
};

// ✅ Validate Password (strong + min/max length)
export const validatePassword = (password) => {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password cannot exceed 128 characters.";
  if (!/[A-Z]/.test(password)) return "Must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Must contain at least one number.";
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    return "Must contain at least one special character.";

  return null;
};

// Validate OTP (exactly 6 digits, only numbers allowed)
export const validateOtp = (otp) => {
  if (!otp) return "OTP is required.";
  // Only digits check
  if (!/^\d+$/.test(otp)) return "OTP must contain only digits.";
  // Length check
  if (otp.length !== 6) return "OTP must be exactly 6 digits.";
  return null;
};


// ===== Profile Validators =====

// ✅ Validate Name (required, max 50 chars)
export const validateName = (name) => {
  if (!name || name.trim().length === 0) return "Name is required.";
  if (name.length > 50) return "Name cannot exceed 50 characters.";
  return null;
};

// ✅ Validate Bio (optional, max 200 chars)
export const validateBio = (bio) => {
  if (!bio) return null;
  if (bio.length > 150) return "Bio cannot exceed 150 characters.";
  return null;
};

// ✅ Validate URL (optional, must be valid if provided)
export const validateURL = (url) => {
  if (!url) return null; // optional
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL format.";
  }
};



// ✅ Username: 3–20 chars, only letters, numbers, underscores
export const validateUsername = (username) => {
  if (!username) return "Username is required.";
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (username.length > 20) return "Username cannot exceed 20 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return "Username can only contain letters, numbers, and underscores.";
  return null; // ✅ valid
};
