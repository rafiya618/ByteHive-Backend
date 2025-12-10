import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/auth";

const PublicRoute = ({ children }) => {
  const { auth, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (auth?.token) {
    // ✅ User is already logged in → redirect to home (or profile)
    return <Navigate to="/" />;
  }

  return children;
};

export default PublicRoute;
