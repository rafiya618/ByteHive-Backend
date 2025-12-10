import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import InputField from "../../shared/InputField";
import { validateEmail, validatePassword, validateOtp } from "../../helpers/validators";
import { handleFormError } from "../../helpers/handleFormError";
import { forgotPassword, verifyResetOtp, resetPassword as resetPasswordApi } from "../../api/authApi"; // ✅ import API
import { CloudCog, Eye, EyeOff } from "lucide-react"; // ✅ added icons
import { useNavigate } from "react-router-dom";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [timer, setTimer] = useState(0);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // ✅ added state
  const navigate = useNavigate()

  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const sendOtp = async () => {
    const emailError = validateEmail(email);
    if (emailError) return setErrors((prev) => ({ ...prev, email: emailError }));

    try {
      const res = await forgotPassword(email); // ✅ API call
      toast.success(res.data.message);
      setErrors({});
      setStep(2);
      setTimer(60);
    } catch (err) {
      handleFormError(err, setErrors, null);
    }
  };

  const verifyOtpFunc = async () => {
    const otpError = validateOtp(otp);
    if (otpError) return setErrors((prev) => ({ ...prev, otp: otpError }));

    try {
      const res = await verifyResetOtp(email, otp); // ✅ API call
      toast.success(res.data.message);
      setErrors({});
      setStep(3);
      setTimer(0);
    } catch (err) {
      handleFormError(err, setErrors, null);
    }
  };

  const resetPasswordFunc = async () => {
    console.log('password', password)
    const passwordError = validatePassword(password);
    console.log('passwordError', passwordError)
    if (passwordError) return setErrors((prev) => ({ ...prev, password: passwordError }));

    try {
      const res = await resetPasswordApi(email, password); // ✅ API call
      console.log('res', res)
      toast.success(res.data.message);
      setErrors({});
      navigate("/login")
    } catch (err) {
      handleFormError(err, setErrors, null);
    }
  };

  return (
    <div className='min-h-screen bg-rich-black  flex flex-col relative text-white'>
      <div className="absolute z-0" style={{ width: 637, height: 300, top: -38, left: "50%", transform: "translateX(-50%)", background: "#1A1842B3", filter: "blur(100px)", boxShadow: "0px 4px 100px 500px #00000066", borderRadius: 30, pointerEvents: "none" }} />
      <div className="bg-navbar-bg text-white w-full flex items-center justify-center min-h-screen px-4">
        <div className="bg-dark-navy-purple w-[90%] sm:w-full max-w-md mx-auto p-6 sm:p-8 rounded-xl shadow-lg border border-navbar-border transition-shadow hover:shadow-xl">
          {step === 1 && (
            <>
              <h3 className="text-xl md:text-2xl font-bold text-center mb-6">Forgot Password</h3>
              <label className="block mb-1">Email</label>
              <InputField
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              {errors.email && <p className="mt-1 text-red-500 text-sm">{errors.email}</p>}
              <button
                onClick={sendOtp}
                className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 py-2 rounded-md font-semibold transition duration-200 cursor-pointer"
              >
                Send OTP
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-xl md:text-2xl font-bold text-center mb-6">Enter OTP</h3>
              <label className="block mb-1">Otp</label>
              <InputField
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
              />
              {errors.otp && <p className="mt-1 text-red-500 text-sm">{errors.otp}</p>}
              <p className="text-sm text-gray-400 mt-2">
                Expires in: <span className="text-white font-semibold">{timer}s</span>
              </p>
              <button
                onClick={verifyOtpFunc}
                disabled={timer === 0}
                className={`mt-4 w-full py-2 rounded-md font-semibold transition duration-200 cursor-pointer ${timer === 0
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                  }`}
              >
                {timer === 0 ? "OTP Expired" : "Verify OTP"}
              </button>

              <button
                onClick={sendOtp}
                className="mt-3 w-full bg-dark-indigo text-gray-200 border border-faint-greyish-overlay py-2 px-3 rounded-md font-medium hover:bg-[#2f2f4a] active:bg-[#181628] transition-all duration-200 cursor-pointer hover:scale-[1.02]"
              >
                Resend OTP
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-xl md:text-2xl font-bold text-center mb-6">Reset Password</h3>
              <div>
                <label className="block mb-1">New Password</label>
                <div className="relative">
                  <InputField
                    type={showPassword ? "text" : "password"} // ✅ toggle
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  {errors.password && <p className="mt-1 text-red-500 text-sm">{errors.password}</p>}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                onClick={resetPasswordFunc}
                className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 py-2 rounded-md font-semibold transition duration-200 cursor-pointer"
              >
                Reset Password
              </button>
            </>
          )}
        </div>
      </div>
    </div>

  );
};

export default ForgotPassword;
