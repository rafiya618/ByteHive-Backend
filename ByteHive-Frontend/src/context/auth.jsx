import { useState, createContext, useContext, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({ token: "", user: null });
  const [loading, setLoading] = useState(true); // new loading state

  useEffect(() => {
    const storedData = localStorage.getItem("Auth");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        const decoded = jwtDecode(parsed.token);
        setAuth({ token: parsed.token, user: decoded });
        // console.log(`token: ${parsed.token}, user: ${decoded}` )
      } catch (error) {
        console.error("Invalid token", error);
        setAuth({ token: "", user: null });
      }
    }
    setLoading(false); // finished restoring, even if no token
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };
