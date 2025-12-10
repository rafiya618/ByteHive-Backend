import React, { useState, useEffect, useRef } from 'react';
import { getUserStreak } from '../../api/retentionApi';

const scrollbarStyles = `
  .streak-dropdown-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .streak-dropdown-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .streak-dropdown-scroll::-webkit-scrollbar-thumb {
    background: #1a1a1a;
    border-radius: 3px;
  }
  .streak-dropdown-scroll::-webkit-scrollbar-thumb:hover {
    background: #333333;
  }
`;

export default function StreakDropdown({ isOpen, onClose }) {
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchStreakData();
      // Refresh data every 5 seconds while dropdown is open
      const refreshInterval = setInterval(() => {
        fetchStreakData();
      }, 5000);
      return () => clearInterval(refreshInterval);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchStreakData = async () => {
    try {
      setLoading(true);
      const streakData = await getUserStreak();
      console.log('📊 Streak data received:', streakData);
      
      if (streakData?.current_streak !== undefined) {
        setStreak(streakData);
      } else if (streakData?.streak) {
        setStreak(streakData.streak);
      } else {
        setStreak({
          current_streak: 0,
          longest_streak: 0,
          current_level: 1,
          total_days_active: 0,
          total_posts: 0,
          total_reads: 0,
          total_comments: 0,
          total_likes: 0,
          badges_earned: [],
          badge_details: []
        });
      }
    } catch (error) {
      console.error('❌ Error fetching streak data:', error);
      setStreak({
        current_streak: 0,
        longest_streak: 0,
        current_level: 1,
        total_days_active: 0,
        total_posts: 0,
        total_reads: 0,
        total_comments: 0,
        total_likes: 0,
        badges_earned: [],
        badge_details: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate week days - showing 9 days with today highlighted
  const generateWeekDays = () => {
    const days = [];
    const today = new Date();
    
    // Get 4 days before today and 4 days after
    for (let i = -4; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push({
        date,
        dayLabel: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][date.getDay()],
        isToday: i === 0,
        isActive: false // This would be updated from backend activity data
      });
    }
    
    return days;
  };

  // Get level color based on level number
  const getLevelColor = (level) => {
    switch(level) {
      case 5: return 'from-red-500 to-purple-600';
      case 4: return 'from-purple-500 to-pink-600';
      case 3: return 'from-blue-500 to-purple-600';
      case 2: return 'from-green-500 to-blue-600';
      default: return 'from-gray-500 to-blue-600';
    }
  };

  // Get level badge text
  const getLevelBadge = (level) => {
    const badges = ['', 'Novice', 'Explorer', 'Contributor', 'Expert', 'Master'];
    return badges[level] || 'Novice';
  };

  if (!isOpen) return null;

  const weekDays = generateWeekDays();
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const totalDaysActive = streak?.total_days_active ?? 0;
  const currentLevel = streak?.current_level ?? 1;
  const badgesEarned = streak?.badges_earned ?? [];
  const badgeDetails = streak?.badge_details ?? [];
  const totalPosts = streak?.total_posts ?? 0;
  const totalReads = streak?.total_reads ?? 0;
  const totalComments = streak?.total_comments ?? 0;
  const totalLikes = streak?.total_likes ?? 0;

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div
        ref={dropdownRef}
        className="absolute top-full right-0 mt-2 w-80 bg-rich-black-light border border-navbar-border rounded-xl shadow-2xl z-50 overflow-hidden"
      >
        {/* Main Content */}
        <div className="streak-dropdown-scroll overflow-y-auto max-h-96 p-5 space-y-4">
          
          {/* Level Badge - Top */}
          <div className={`bg-gradient-to-r ${getLevelColor(currentLevel)} rounded-lg p-4 text-white text-center`}>
            <div className="text-4xl font-bold mb-1">LEVEL {currentLevel}</div>
            <div className="text-sm font-semibold">{getLevelBadge(currentLevel)}</div>
          </div>

          {/* Header: Streak Stats */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Streak */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
              <div className="text-3xl font-bold text-white">{currentStreak}</div>
              <div className="text-xs text-gray-400 mt-1">Current streak</div>
            </div>

            {/* Longest Streak */}
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-1">
                <div className="text-3xl font-bold text-white">{longestStreak}</div>
                <span className="text-xl">🏆</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Longest streak</div>
            </div>
          </div>

          {/* Activity Metrics */}
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Activity Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-center">
                <div className="text-2xl font-bold text-blue-400">{totalPosts}</div>
                <div className="text-xs text-gray-400">Posts</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                <div className="text-2xl font-bold text-green-400">{totalReads}</div>
                <div className="text-xs text-gray-400">Reads</div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2 text-center">
                <div className="text-2xl font-bold text-purple-400">{totalComments}</div>
                <div className="text-xs text-gray-400">Comments</div>
              </div>
              <div className="bg-pink-500/10 border border-pink-500/20 rounded p-2 text-center">
                <div className="text-2xl font-bold text-pink-400">{totalLikes}</div>
                <div className="text-xs text-gray-400">Likes</div>
              </div>
            </div>
          </div>

          {/* Week Calendar */}
          <div className="border-t border-gray-800 pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">This week</h3>
            
            <div className="flex justify-center gap-0.5">
              {weekDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  {/* Day circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      day.isToday
                        ? 'bg-pink-500 text-white ring-2 ring-pink-400'
                        : day.isActive
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {day.isActive && day.isToday && '✓'}
                    {day.isActive && !day.isToday && '●'}
                  </div>
                  {/* Day label */}
                  <span className={`text-xs font-medium ${day.isToday ? 'text-pink-400' : 'text-gray-500'}`}>
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Heart indicator for today */}
            <div className="flex justify-center mt-2">
              <span className="text-sm text-pink-400">💗 Heart marks today</span>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-gray-800 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Total active days:</span>
              <span className="text-white font-semibold">{totalDaysActive}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Timezone: Asia/Tashkent</span>
              <button className="text-gray-400 hover:text-white transition-colors">
                <span className="material-icons text-xl">settings</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800"></div>

          {/* Notification CTA */}
          <div className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 border border-pink-500/20 rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <h4 className="text-white font-semibold text-sm">Keep your streak going!</h4>
              <p className="text-xs text-gray-400">Enable notifications to get reminders</p>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 bg-white text-black font-semibold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors text-xs">
                Enable
              </button>
              <button className="flex-1 text-gray-400 hover:text-gray-300 transition-colors text-xs font-medium">
                Dismiss
              </button>
            </div>
          </div>

          {/* Badges Section */}
          {badgeDetails && badgeDetails.length > 0 && (
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Badges Earned ({badgeDetails.length}/5)</h4>
              <div className="grid grid-cols-5 gap-2">
                {badgeDetails.map((badge) => (
                  <div
                    key={badge.badge_id}
                    className="rounded-lg p-3 text-center transition-all bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 cursor-help"
                    title={`${badge.badge_name}: ${badge.description}`}
                  >
                    <div className="text-2xl mb-1">{badge.badge_icon}</div>
                    <div className="text-xs font-semibold text-gray-300 line-clamp-1">
                      {badge.badge_name.split(' ')[0]}
                    </div>
                    <div className="text-xs text-yellow-400 mt-1">✓</div>
                  </div>
                ))}
                {/* Show unfilled slots for remaining badges */}
                {badgeDetails.length < 5 && Array.from({ length: 5 - badgeDetails.length }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="rounded-lg p-3 text-center transition-all bg-gray-800/30 border border-gray-700/50 opacity-50"
                  >
                    <div className="text-2xl mb-1">🔒</div>
                    <div className="text-xs font-semibold text-gray-400">Locked</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!badgeDetails || badgeDetails.length === 0) && (
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Badges Earned (0/5)</h4>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={`locked-${idx}`}
                    className="rounded-lg p-3 text-center transition-all bg-gray-800/30 border border-gray-700/50 opacity-50"
                  >
                    <div className="text-2xl mb-1">🔒</div>
                    <div className="text-xs font-semibold text-gray-400">Locked</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">Earn badges by completing activities!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
