import { useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { useAuth } from "../../context/auth";

const GoogleAuth = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");
    const message = urlParams.get("message");

    if (error) {
      toast.error(error);
      navigate("/");
    } else if (token) {
      const decoded = jwtDecode(token);
      localStorage.setItem("Auth", JSON.stringify({ token }));
      
      if (message) toast.success(message);
      else toast.success("Authentication successful!");
      setAuth({ token, user: decoded });
      // console.log('auth', auth)
      
      if (decoded.onboardingStep == 2) navigate("/setup-profile");
      else navigate("/");
    }
  }, []);

  return <h1>Authenticating...</h1>;
};

export default GoogleAuth;
