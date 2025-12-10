import { useAuth } from "../context/auth";

// Custom hook to get auth headers
export const getAuthHeader = () => {
  try {
    let token = null;

    // Try to get token from Auth Context if available
    try {
      const { auth } = useAuth();
      if (auth?.token) token = auth.token;
    } catch (err) {
      // Context not available (e.g., outside React component)
    }

    // Fallback to localStorage
    if (!token) {
      const stored = localStorage.getItem("Auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.token;
      }
    }

    // Return headers if token exists
    // console.log('token in auth HEader', token)
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (err) {
    console.error("Error getting auth header:", err);
  }

  return {}; // no token
};
