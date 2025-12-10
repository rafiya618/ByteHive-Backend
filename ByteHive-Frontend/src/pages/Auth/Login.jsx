import React, { useState } from "react";
import { useAuth } from "../../context/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import InputField from "../../shared/InputField";
import { jwtDecode } from "jwt-decode";
import { validateEmail, validatePassword } from "../../helpers/validators";
import { Eye, EyeOff } from "lucide-react";
import { handleFormError } from "../../helpers/handleFormError";
import { loginUser } from "../../api/authApi"; // ✅ import API

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const HandleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "" });

    const emailError = validateEmail(email);
    if (emailError) return setErrors((prev) => ({ ...prev, email: emailError }));

    // const passwordError = validatePassword(password);
    // if (passwordError) return setErrors((prev) => ({ ...prev, password: passwordError }));

    try {
      const res = await loginUser(email, password); // ✅ API call
      const decoded = jwtDecode(res.data.token);
      setAuth({ token: res.data.token, user: decoded });
      localStorage.setItem("Auth", JSON.stringify({ token: res.data.token }));

      toast.success(res.data.message);
      navigate("/");
    } catch (err) {
      handleFormError(err, setErrors, null);
    }
  };

  return (
    <div className='min-h-screen bg-rich-black  flex flex-col relative text-white'>
       <div className="absolute z-0" style={{ width: 637, height: 300, top: -38, left: "50%", transform: "translateX(-50%)", background: "#1A1842B3", filter: "blur(100px)", boxShadow: "0px 4px 100px 500px #00000066", borderRadius: 30, pointerEvents: "none" }} />
      <div className="bg-navbar-bg text-white w-full flex items-center justify-center min-h-screen px-4">
        <div className="bg-dark-navy-purple w-[90%] sm:w-full max-w-md mx-auto p-6 sm:p-8 rounded-xl shadow-lg border border-navbar-border transition-shadow hover:shadow-xl">
          <h1 className="text-xl md:text-2xl font-bold text-center mb-6">Login to Your Account</h1>

          <form onSubmit={HandleSubmit} className="flex flex-col gap-1 mt-8">
            <label className="block">Email</label>
            <InputField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              required
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
                  required
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
              Login
            </button>
          </form>

          <div className="mt-2 text-start">
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-gray-400 hover:text-white transition cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <div className="mt-3 text-center">
            <button
              onClick={() => navigate("/register")}
              className="text-sm text-gray-400 hover:text-white transition cursor-pointer"
            >
              Don't have an account? <span className="underline">Create one</span>
            </button>
          </div>


          <div className="flex items-center my-3">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="px-3 text-sm text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>

          <button
            onClick={() =>
              (window.location.href = `${import.meta.env.VITE_AUTH_SERVICE_URL}/auth/google?mode=login`)
            }
            aria-label="Continue with Google"
            className="w-full flex items-center justify-center gap-2
            bg-dark-indigo text-gray-200 border border-faint-greyish-overlay 
            py-2 px-3 rounded-md font-medium 
            hover:bg-[#2f2f4a] active:bg-[#181628] 
            transition-all duration-200 cursor-pointer hover:scale-[1.02]"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>


        </div>
      </div>
    </div>
  );
};

export default Login;
