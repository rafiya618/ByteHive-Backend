import { Routes, Route, Navigate } from "react-router-dom";
import BlogListing from "./pages/BlogListing";
import CreatePost from "./pages/CreatePost";
import EventsListing from "./pages/EventsListing";
import CreateEvent from "./pages/CreateEvent";
import BlogDetailPage from "./pages/BlogDetailPage";
import Register from "./pages/Auth/Register/Register";
import Login from "./pages/Auth/Login";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import GoogleAuth from "./pages/Auth/GoogleAuth";
import PageNotFound from "./pages/PageNotFound";
import NotificationPage from "./pages/Notification/NotificationPage";
import PreferencesPage from "./pages/Notification/PreferencesPage";
import EnableNotifications from "./pages/Notification/EnableNotifications";
import { Toaster } from "react-hot-toast";
import ProfilePage from "./pages/ProfilePage";
import ProfileSetupPage from "./pages/Auth/Register/ProfileSetupPage";
import TagSelectionPage from "./pages/Auth/Register/TagSelectionPage";
import { useAuth } from "./context/auth";
import CreateCommunity from "./pages/CreateCommunity";
import Communities from "./pages/Communities";
import CommunityDetail from "./pages/CommunityDetail";
import CommentPage from "./pages/CommentPage";
import ProtectedRoute from "./components/Routes/ProtectedRoute";
import PublicRoute from "./components/Routes/PublicRoute";
import ChatPage from "./pages/ChatPage";
import SavedItems from "./pages/SavedItems";
import History from "./pages/History";
import Streak from "./pages/Streak";
import { useParams } from "react-router-dom";
import HomePage from "./pages/VideoCall/HomePage";
import Room from "./pages/VideoCall/Room";
function RoomWrapper() {
  const { roomId } = useParams();
  return <Room roomId={roomId} />;
}

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/google-auth" element={<PublicRoute><GoogleAuth /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        {/* Everything else is protected */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Routes>
                {/* <Route path="/google-auth" element={<GoogleAuth />} /> */}
                <Route path="/setup-profile" element={<RequireStep minStep={2}><ProfileSetupPage /></RequireStep>} />
                <Route path="/select-tags" element={<RequireStep minStep={3}><TagSelectionPage /></RequireStep>} />
                <Route path="/profile" element={<RequireStep minStep={4}><ProfilePage /></RequireStep>} />
                <Route path="/" element={<RequireStep minStep={4}><BlogListing /></RequireStep>} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/events" element={<EventsListing />} />
                <Route path="/create-event" element={<CreateEvent />} />
                <Route path="/comment" element={<RequireStep minStep={4}><CommentPage /></RequireStep>} />
                <Route path="/post/:postId" element={<BlogDetailPage />} />
                <Route path="/post" element={<BlogDetailPage postId="1" />} />
                <Route path="/create-community" element={<CreateCommunity />} />
                <Route path="/communities" element={<Communities />} />
                <Route path="/community/:id" element={<CommunityDetail />} />
                <Route path="/chat/:communityId" element={<ChatPage />} />
                <Route path="/room1/:roomId" element={<ChatPage />} />
                <Route path="/saved" element={<RequireStep minStep={4}><SavedItems /></RequireStep>} />
                <Route path="/streak" element={<RequireStep minStep={4}><Streak /></RequireStep>} />
                <Route path="/history" element={<RequireStep minStep={4}><History /></RequireStep>} />
                <Route path="/video-home" element={<HomePage />} />
                <Route path="/room/:roomId" element={<RoomWrapper />} />
                <Route path="/notification" element={<RequireStep minStep={4}><NotificationPage /></RequireStep>} />
                <Route path="/preferences" element={<RequireStep minStep={4}><PreferencesPage /></RequireStep>} />
                <Route path="/enable-notifications" element={<RequireStep minStep={4}><EnableNotifications /></RequireStep>} />
                <Route path="*" element={<PageNotFound />} />
              </Routes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

// Same RequireStep as before
function getRedirectPath(step) {
  if (!step) return "/login";
  if (step === 1) return "/register";
  if (step === 2) return "/setup-profile";
  if (step === 3) return "/select-tags";
  return "/";
}

function RequireStep({ minStep, children }) {
  const { auth, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  const userStep = auth?.token ? auth?.user?.onboardingStep : 1;
  if (userStep < minStep) {
    return <Navigate to={getRedirectPath(userStep)} />;
  }
  return children;
}

export default App;
