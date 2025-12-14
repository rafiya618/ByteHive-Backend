import { useState, useEffect, useRef } from 'react';
import { getUserStreak, getAllBadges } from '../../api/retentionApi';
import { updatePreferences } from '../../api/notificationApi';
import { registerPush } from '../../helpers/registerPush';

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
  const [allBadges, setAllBadges] = useState([]);
  const dropdownRef = useRef(null);

  const [notificationStatus, setNotificationStatus] = useState('unknown'); // disabled, enabled, unknown
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchStreakData();
      fetchAllBadges();
      checkNotificationStatus();

      const refreshInterval = setInterval(() => {
        fetchStreakData();
      }, 5000);

      // Countdown ticker
      const timer = setInterval(() => {
        if (streak?.streak_expires_at) {
          updateCountdown(streak.streak_expires_at, streak.server_time);
        }
      }, 1000);

      return () => {
        clearInterval(refreshInterval);
        clearInterval(timer);
      };
    }
  }, [isOpen, streak?.streak_expires_at]);

  const updateCountdown = (expiresAt, serverTime) => {
    if (!expiresAt) return;

    // Calculate client offset if needed, or just diff
    // We trust server time for "diff" but we tick locally?
    // Let's us simple diff from NOW, assuming clocks are roughly sync or use difference
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      setCountdown("Expired");
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    setCountdown(`${hours}h ${minutes}m`);
  };

  const checkNotificationStatus = async () => {
    try {
      if ('Notification' in window) {
        // 1. Check Browser Permission
        if (Notification.permission !== 'granted') {
          setNotificationStatus('disabled');
          return;
        }

        // 2. Check Backend Preference
        if (streak?.user_id) {
          try {
            const { getPreferences } = await import('../../api/notificationApi');
            const prefs = await getPreferences(streak.user_id);

            // ✅ Check nested streakReminder.enabled field
            const isEnabled = prefs?.data?.perType?.updates?.streakReminder?.enabled ?? true;
            setNotificationStatus(isEnabled ? 'enabled' : 'disabled');
          } catch (err) {
            console.error("Error fetching preferences:", err);
            setNotificationStatus('disabled');
          }
        }
      }
    } catch (e) {
      console.error("Error checking notification status:", e);
      setNotificationStatus('disabled');
    }
  };

  const handleEnableNotifications = async () => {
    console.log('\n🔔 [FRONTEND] ==================== TOGGLE NOTIFICATION ====================');
    console.log('👤 [FRONTEND] User ID:', streak?.user_id);
    console.log('📊 [FRONTEND] Current status:', notificationStatus);

    try {
      if (!streak?.user_id) {
        console.error('❌ [FRONTEND] No user_id found in streak');
        return;
      }

      if (notificationStatus === 'enabled') {
        // Disable - Send boolean for backwards compatibility
        console.log('🔕 [FRONTEND] Disabling streak reminders...');
        await updatePreferences(streak.user_id, { streakReminder: false });
        console.log('✅ [FRONTEND] Successfully disabled');
        setNotificationStatus('disabled');
      } else {
        // Enable - First Register Push if not already
        console.log('🔥 [FRONTEND] Enabling streak reminders...');
        if ('Notification' in window && Notification.permission !== 'granted') {
          console.log('📱 [FRONTEND] Requesting browser permission...');
          await registerPush(streak.user_id);
        }
        // Then update preference - Send boolean for backwards compatibility
        console.log('💾 [FRONTEND] Updating preference...');
        await updatePreferences(streak.user_id, { streakReminder: true });
        console.log('✅ [FRONTEND] Successfully enabled');
        setNotificationStatus('enabled');
      }
      console.log('🔔 [FRONTEND] ==================== END TOGGLE ====================\n');
    } catch (e) {
      console.error("❌ [FRONTEND] Error toggling notifications:", e);
      console.error('   Error details:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status
      });
    }
  };

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

  const fetchAllBadges = async () => {
    try {
      const response = await getAllBadges();
      if (response?.badges) {
        setAllBadges(response.badges);
      }
    } catch (error) {
      console.error('❌ Error fetching all badges:', error);
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
    switch (level) {
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
            <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 relative overflow-hidden">
              {/* Timer at the top right of the card, small */}
              {countdown && (
                <div className="absolute top-2 right-2 text-[10px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                  ⏱ {countdown}
                </div>
              )}
              <div className="text-3xl font-bold text-white mt-2">{currentStreak}</div>
              <div className="text-xs text-gray-400 mt-1">
                Current Streak
              </div>
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${day.isToday
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
              <button
                onClick={handleEnableNotifications}
                className={`flex-1 font-semibold py-2 px-3 rounded-lg transition-colors text-xs cursor-pointer ${notificationStatus === 'enabled' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white text-black hover:bg-gray-100'}`}
              >
                {notificationStatus === 'enabled' ? 'Enabled (Click to Disable)' : 'Enable'}
              </button>
              <button className="flex-1 text-gray-400 hover:text-gray-300 transition-colors text-xs font-medium">
                Dismiss
              </button>
            </div>
          </div>

          {/* Badges Section - Show All Available Badges */}
          <div className="border-t border-gray-800 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              Badges Earned ({badgeDetails?.length || 0}/10)
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {allBadges.slice(0, 10).map((badge) => {
                const isEarned = badgeDetails?.some(b => b.badge_id === badge.badge_id);
                const earnedBadge = badgeDetails?.find(b => b.badge_id === badge.badge_id);

                return (
                  <div
                    key={badge.badge_id}
                    className={`rounded-xl p-3 text-center transition-all cursor-help ${isEarned
                      ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/60 hover:border-yellow-400/80 hover:shadow-lg hover:shadow-yellow-500/20'
                      : 'bg-gray-800/40 border-2 border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/60'
                      }`}
                    title={isEarned
                      ? `${badge.badge_name}: ${badge.description}\nEarned: ${earnedBadge?.earned_at ? new Date(earnedBadge.earned_at).toLocaleDateString() : 'Recently'}`
                      : `${badge.badge_name}: ${badge.description}\nRequires: ${badge.requirement_value} ${badge.requirement_type}`
                    }
                  >
                    {/* Badge Icon */}
                    <div className="text-2xl sm:text-3xl mb-2 flex items-center justify-center h-10 sm:h-12">
                      {isEarned ? badge.badge_icon : '🔒'}
                    </div>

                    {/* Badge Name - Allow 2 lines */}
                    <div className={`text-[9px] sm:text-[10px] font-bold mb-1 leading-tight min-h-[2rem] sm:h-8 flex items-center justify-center ${isEarned ? 'text-yellow-300' : 'text-gray-400'
                      }`}>
                      <span className="line-clamp-2 px-0.5 sm:px-1 text-center">
                        {isEarned ? badge.badge_name : 'Locked'}
                      </span>
                    </div>

                    {/* Status/Requirement */}
                    {isEarned && (
                      <div className="text-[9px] sm:text-[10px] text-yellow-400 font-semibold">✓ Unlocked</div>
                    )}
                    {!isEarned && (
                      <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium">
                        Need: {badge.requirement_value}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Fill remaining slots if less than 10 badges */}
              {allBadges.length < 10 && Array.from({ length: 10 - allBadges.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="rounded-xl p-3 text-center bg-gray-800/20 border-2 border-gray-700/30 opacity-40"
                >
                  <div className="text-2xl sm:text-3xl mb-2 flex items-center justify-center h-10 sm:h-12">🔒</div>
                  <div className="text-[9px] sm:text-[10px] font-bold text-gray-500 mb-1 min-h-[2rem] sm:h-8 flex items-center justify-center">Coming Soon</div>
                </div>
              ))}
            </div>

            {badgeDetails?.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                🎯 Earn badges by completing activities! Start by reading posts, creating content, and engaging with the community.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
