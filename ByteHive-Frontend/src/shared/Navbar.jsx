import React, { useState, useEffect } from "react";
import Logo from "../assets/BytehiveLogo.png";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../context/profileContext";
import { useNotifications } from "../context/NotificationContext";
import StreakDropdown from "../components/Retention/StreakDropdown";
import { getUserStreak } from "../api/retentionApi";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [streakDropdownOpen, setStreakDropdownOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const { profile } = useProfile()
  const { unReadCount } = useNotifications()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCurrentStreak();
    // Refresh streak every 10 seconds to get real-time updates
    const streakInterval = setInterval(() => {
      fetchCurrentStreak();
    }, 10000);
    return () => clearInterval(streakInterval);
  }, []);

  const fetchCurrentStreak = async () => {
    try {
      const streakData = await getUserStreak();
      console.log('Current streak data:', streakData);
      // Handle different response structures
      const streakValue = streakData?.streak?.current_streak || 
                         streakData?.current_streak || 
                         streakData?.data?.current_streak || 
                         0;
      setCurrentStreak(streakValue);
    } catch (error) {
      console.error('Error fetching streak:', error);
      setCurrentStreak(0);
    }
  };

  return (
    <header className="bg-navbar-bg backdrop-blur-sm sticky top-0 z-50 border-b border-navbar-border">
      <div className="container mx-auto px-5 sm:px-7 lg:px-10">
        <div className="flex justify-between items-center py-3">
          {/* LOGO + TITLE */}
          <div className="flex items-center space-x-1">
            <img src={Logo} alt="ByteHive Logo" className="w-14 h-14 object-contain" />
            <a href="/" >
              <h1 className="font-fenix text-3xl tracking-wide text-white">
                Bytehive
              </h1>
            </a>

          </div>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-3 text-xl">
              <a className="flex flex-col items-center text-columbia-blue hover:text-white transition-colors group" href="/events">
                <div className="p-3 rounded-md bg-rich-black-light group-hover:bg-periwinkle-light transition-colors flex items-center justify-center">
                  <span className="material-icons text-4xl">grid_view</span>
                </div>
              </a>
              <button onClick={() => navigate("/saved")} className="flex flex-col items-center text-columbia-blue hover:text-white transition-colors group cursor-pointer">
                <div className="p-3 rounded-md bg-rich-black-light group-hover:bg-periwinkle-light transition-colors flex items-center justify-center">
                  <span className="material-icons text-4xl">bookmark</span>
                </div>
              </button>
              <a className="flex flex-col items-center text-columbia-blue hover:text-white transition-colors group" href="#">
                <div className="p-3 rounded-md bg-rich-black-light group-hover:bg-periwinkle-light transition-colors flex items-center justify-center">
                  <span className="material-icons text-4xl">groups</span>
                </div>
              </a>
            </nav>

            {/* Right side (desktop) */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button onClick={() => setStreakDropdownOpen(!streakDropdownOpen)} className="flex items-center text-pinkish hover:text-pinkish-dark transition-colors group relative cursor-pointer">
                  <div className="p-3 rounded-md bg-rich-black-light group-hover:bg-periwinkle-light transition-colors flex items-center justify-center space-x-1">
                    <span className="material-icons text-4xl" style={{ color: "var(--pinkish)" }}>
                      local_fire_department
                    </span>
                    <span className="text-columbia-blue text-sm font-bold">{currentStreak}</span>
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-rich-black-light text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-navbar-border">
                    View Streak
                  </div>
                </button>
                {streakDropdownOpen && <StreakDropdown isOpen={true} onClose={() => setStreakDropdownOpen(false)} />}
              </div>

              <button onClick={() => navigate("/notification")} className="text-columbia-blue hover:text-white p-3 rounded-full hover:bg-periwinkle-light transition-colors relative flex items-center justify-center cursor-pointer">
                <span className="material-icons text-3xl">notifications</span>
                {unReadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 block h-3 w-3 rounded-full bg-medium-slate-blue"></span>
                )}
              </button>

              <button className="flex items-center justify-center relative" onClick={() => setProfileDropdown(!profileDropdown)}>
                <img
                  alt="User avatar"
                  className="w-11 h-11 rounded-full border-2 border-transparent hover:border-periwinkle transition-all cursor-pointer"
                  src={profile?.profileImage}
                />
                
                {/* Profile Dropdown */}
                {profileDropdown && (
                  <div className="absolute top-full right-0 mt-2 bg-rich-black-light border border-navbar-border rounded-md shadow-lg z-50 min-w-48">
                    <button
                      onClick={() => {
                        navigate("/history");
                        setProfileDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 text-columbia-blue hover:text-white hover:bg-periwinkle-light transition-colors"
                    >
                      <span className="material-icons text-2xl">history</span>
                      <span>History</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setProfileDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center space-x-3 text-columbia-blue hover:text-white hover:bg-periwinkle-light transition-colors border-t border-navbar-border"
                    >
                      <span className="material-icons text-2xl">account_circle</span>
                      <span>Profile</span>
                    </button>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-columbia-blue hover:text-white p-3 rounded-md hover:bg-periwinkle-light transition-colors"
            >
              <span className="material-icons text-4xl">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DROPDOWN */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navbar-bg border-t border-navbar-border px-7 py-5 space-y-5 text-lg">
          <button onClick={() => navigate("/communities")} className="flex items-center space-x-4 text-columbia-blue hover:text-white transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">groups</span>
            <span>Communities</span>
          </button>
          <button onClick={() => navigate("/events")} className="flex items-center space-x-4 text-columbia-blue hover:text-white transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">event</span>
            <span>Events</span>
          </button>
          <button onClick={() => navigate("/saved")} className="flex items-center space-x-4 text-columbia-blue hover:text-white transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">bookmark</span>
            <span>Saved</span>
          </button>
          <button onClick={() => navigate("/history")} className="flex items-center space-x-4 text-columbia-blue hover:text-white transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">history</span>
            <span>History</span>
          </button>
          <button onClick={() => setStreakDropdownOpen(!streakDropdownOpen)} className="flex items-center space-x-4 text-pinkish hover:text-pinkish-dark transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">local_fire_department</span>
            <span>Streak ({currentStreak})</span>
          </button>
          <button onClick={() => navigate("/profile")} className="flex items-center space-x-4 text-columbia-blue hover:text-white transition-colors w-full cursor-pointer">
            <span className="material-icons text-2xl">account_circle</span>
            <span>Profile</span>
          </button>
        </div>
      )}

      {/* Streak Dropdown */}
      {streakDropdownOpen && !mobileMenuOpen && (
        <div className="hidden md:block">
          {/* Dropdown is now rendered inside the relative div on desktop */}
        </div>
      )}
    </header>
  );
}
