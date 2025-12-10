import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/auth";


const ProtectedRoute = ({ children }) => {
  const { auth, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // can use spinner
  }

  if (!auth?.token) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
