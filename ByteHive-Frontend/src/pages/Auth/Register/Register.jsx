import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/auth";
import InputField from "../../../shared/InputField";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { handleFormError } from "../../../helpers/handleFormError";
import { validateEmail, validatePassword, validateOtp } from "../../../helpers/validators";
import { registerUser, verifyOtp, resendOtp } from "../../../api/authApi"; // ✅ import API

const Register = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [verifyDisabled, setVerifyDisabled] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", otp: "" });
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  // ==============================
  // 🔹 Countdown timer logic
  // ==============================
  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setVerifyDisabled(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // ==============================
  // 🔹 Handle Register
  // ==============================
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "", otp: "" });

    const emailError = validateEmail(email);
    if (emailError) return setErrors((prev) => ({ ...prev, email: emailError }));

    const passwordError = validatePassword(password);
    if (passwordError) return setErrors((prev) => ({ ...prev, password: passwordError }));

    try {
      const res = await registerUser(email, password); // ✅ API call
      if (res.data.success) {
        toast.success("OTP sent to your email");
        setStep(2);
        setTimer(60);
        setVerifyDisabled(false);
      }
    } catch (error) {
      handleFormError(error, setErrors, "email");
    }
  };

  // ==============================
  // 🔹 Handle OTP Verification
  // ==============================
  const handleVerify = async (e) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, otp: "" }));

    if (verifyDisabled) {
      return setErrors((prev) => ({
        ...prev,
        otp: "OTP expired. Please click Resend OTP.",
      }));
    }

    const otpError = validateOtp(otp);
    if (otpError) return setErrors((prev) => ({ ...prev, otp: otpError }));

    try {
      const res = await verifyOtp(email, password, otp); // ✅ API call
      if (res.data.success) {
        const decoded = jwtDecode(res.data.token);
        setAuth({ token: res.data.token, user: decoded });
        localStorage.setItem("Auth", JSON.stringify({ token: res.data.token }));
        toast.success("Registration Successful!");
        navigate("/setup-profile");
      }
    } catch (error) {
      handleFormError(error, setErrors, "otp");
      setOtp("");
    }
  };

  // ==============================
  // 🔹 Handle Resend OTP
  // ==============================
  const handleResendOTP = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setErrors((prev) => ({ ...prev, email: emailError }));

    try {
      setIsResending(true);
      const res = await resendOtp(email); // ✅ API call
      if (res.data.success) {
        toast.success("OTP resent successfully");
        setOtp("");
        setTimer(60);
        setVerifyDisabled(false);
      }
    } catch (error) {
      handleFormError(error, setErrors, "otp");
    } finally {
      setIsResending(false);
    }
  };

  // ==============================
  // 🔹 UI
  // ==============================
  return (
    <div className='min-h-screen bg-rich-black  flex flex-col relative text-white'>
      <div className="absolute z-0" style={{ width: 637, height: 300, top: -38, left: "50%", transform: "translateX(-50%)", background: "#1A1842B3", filter: "blur(100px)", boxShadow: "0px 4px 100px 500px #00000066", borderRadius: 30, pointerEvents: "none" }} />
      <div className="bg-navbar-bg text-white w-full flex items-center justify-center min-h-screen px-4">
        {step === 1 && (
          <div className="bg-dark-navy-purple w-[90%] sm:w-full max-w-md mx-auto p-6 sm:p-8 rounded-xl shadow-lg border border-navbar-border transition-shadow hover:shadow-xl">
            <h1 className="text-xl md:text-2xl font-bold text-center mb-6">Create an Account</h1>

            <form onSubmit={handleRegister} className="flex flex-col gap-1 mt-8">
              <label className="block">Email</label>
              <InputField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

              <div>
                <label className="block mb-1 mt-2">Password</label>
                <div className="relative">
                  <InputField
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}

              <button
                type="submit"
                className="mt-3 w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 py-2 rounded-md font-semibold transition duration-200 cursor-pointer"
              >
                Register
              </button>
            </form>

            <p
              onClick={() => navigate("/login")}
              className="text-sm text-gray-400 hover:text-white cursor-pointer text-center mt-5"
            >
              Already have an account? Log in
            </p>

            <div className="flex items-center my-3">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="px-3 text-sm text-gray-400">OR</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <button
              onClick={() =>
                (window.location.href = `${import.meta.env.VITE_AUTH_SERVICE_URL}/auth/google?mode=register`)
              }
              className="w-full flex items-center justify-center gap-2 bg-dark-indigo text-gray-200 border border-faint-greyish-overlay py-2 px-3 rounded-md font-medium hover:bg-[#2f2f4a] active:bg-[#181628] transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-dark-navy-purple w-[90%] sm:w-full max-w-md mx-auto p-6 sm:p-8 rounded-xl shadow-lg border border-navbar-border transition-shadow hover:shadow-xl">
            <h1 className="text-xl md:text-2xl font-bold text-center mb-6">Verify Your Email</h1>

            <form onSubmit={handleVerify} className="flex flex-col gap-3 mt-4">
              <label className="block mb-1">Otp</label>
              <InputField
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                disabled={verifyDisabled}
              />
              {errors.otp && <p className="text-red-500 text-sm">{errors.otp}</p>}

              <button
                type="submit"
                disabled={verifyDisabled}
                className={`mt-3 w-full py-2 rounded-md font-semibold transition duration-200 cursor-pointer ${verifyDisabled
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                  }`}
              >
                {verifyDisabled ? "OTP Expired" : "Verify OTP & Register"}
              </button>
            </form>

            <p className="text-sm text-gray-400 mt-3 text-center">
              OTP will expire in <span className="text-white font-semibold">{timer}</span> second(s)
            </p>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isResending}
              className="mt-4 w-full bg-dark-indigo text-gray-200 border border-faint-greyish-overlay py-2 px-3 rounded-md font-medium hover:bg-[#2f2f4a] active:bg-[#181628] transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            >
              {isResending ? "Resending..." : "Resend OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
