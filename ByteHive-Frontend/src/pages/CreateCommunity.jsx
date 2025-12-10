import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import Navbar from "../shared/Navbar";
import CommunityFormCard from "../components/CreatePost/CommunityFormCard";
import SidebarCard from "../shared/SidebarCard";

const CreateCommunity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, loading: authLoading } = useAuth();

  // Check authentication
  React.useEffect(() => {
    if (!authLoading && !auth?.token) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [auth, authLoading, navigate, location.pathname]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!auth?.token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-rich-black flex flex-col">
      <Navbar />

      <div className="w-full flex justify-center px-4 lg:px-8 py-10 relative z-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
          {/* Left - Form with Back Button */}
          <div className="flex-1">
            {/* Back Button */}
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-white hover:text-periwinkle transition-colors"
              >
                <span className="material-icons">arrow_back</span>
                <span className="text-xl font-fenix">Create a New Community</span>
              </button>
            </div>
            
            <CommunityFormCard />
          </div>

          {/* Right - Sidebar */}
          <aside className="w-full lg:w-[320px] flex flex-col gap-6">
            <SidebarCard
              title="Create Posts"
              description="Share your thoughts, ideas, and experiences with the community."
              buttonText="Create a Post"
              icon="edit"
              navigateTo="/create-post"
            />
            <SidebarCard
              title="Host Events"
              description="Organize virtual events, workshops, and meetups for your community members."
              buttonText="Add an Event"
              icon="event"
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunity;