import { useEffect, useState } from "react";
import Layout from "../../components/Layout/Layout";
import { useAuth } from "../../context/auth";
import { getPreferences, updatePreferences } from "../../api/notificationApi"; // ✅ centralized API

export default function PreferencesPage() {
  const { auth } = useAuth();
  const [prefs, setPrefs] = useState(null);
  const [activeChannel, setActiveChannel] = useState("push");

  // Human-readable descriptions
  const typeDescriptions = {
    likePost: "Likes on your post",
    likeComment: "Likes on your comment",
    comment: "Comments on your post",
    reply: "Replies on your comment",
    mention: "Mentions of your username",
    follow: "Started following you",
    friendRequest: "Sent you a friend request",
    connectionAccepted: "Accepted your connection request",
    newPost: "Posted a new post",
    storyUpdate: "Updated their story",
    liveStream: "Started a live stream",
    eventInvite: "Sent you an event invite",
  };

  const groupHeadings = {
    activities: "Social Interactions",
    network: "Connections",
    updates: "Content Updates",
  };

  useEffect(() => {
    if (!auth?.user?._id) return;

    getPreferences(auth.user._id)
      .then((res) => setPrefs(res.data))
      .catch((err) => console.error("Failed to fetch preferences:", err));
  }, [auth]);

  const handleUpdatePrefs = async (newPrefs) => {
    setPrefs(newPrefs); // optimistic update
    try {
      await updatePreferences(auth.user._id, newPrefs);
    } catch (err) {
      console.error("Failed to update preferences:", err);
    }
  };

  if (!prefs) return <div className="text-center mt-20">Loading...</div>;

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto text-white">
        <h1 className="text-3xl font-bold mb-8 text-center">Notification Preferences</h1>

        {/* Tabs for Push / Email */}
        <div className="flex justify-center gap-6 mb-6">
          {["push", "email"].map((ch) => {
            const isSelected = activeChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className="font-lato text-lg px-2 pb-1 border-b-2 transition-all curpo cursor-pointer"
                style={{
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "var(--periwinkle)" : "var(--columbia-blue)",
                  borderColor: isSelected ? "var(--periwinkle)" : "transparent",
                  opacity: isSelected ? 1 : 0.85,
                }}
              >
                {ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Active Channel Section */}
        <div className="border border-navbar-border backdrop-blur-md shadow-lg rounded-2xl p-6">
          {/* Global toggle */}
          <div className="flex items-center justify-between  p-4 rounded-xl shadow-md mb-6">
            <span className="capitalize font-medium text-lg">
              Enable {activeChannel} Notifications
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.global[activeChannel]}
                onChange={(e) =>
                  handleUpdatePrefs({
                    ...prefs,
                    global: { ...prefs.global, [activeChannel]: e.target.checked },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-gray-500 rounded-full  transition-colors shadow-inner"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6 peer-checked:shadow-[0_0_10px_2px_rgba(168,85,247,0.7)]"></div>
            </label>
          </div>

          {/* Per-type preferences grouped */}
          <div className="grid gap-6 grid-cols-1">
            {["activities", "network", "updates"].map((group) => (
              <div key={group}>
                <h3 className="capitalize font-medium mb-3 text-lg text-purple-300">
                  {groupHeadings[group] || group}
                </h3>
                {Object.keys(prefs.perType[group]).map((type) => (
                  <div
                    key={type}
                    className={` p-5 rounded-xl shadow-md transition-shadow mb-4 ${
                      prefs.global[activeChannel]
                        ? "hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{typeDescriptions[type] || type}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs.perType[group][type][activeChannel]}
                          disabled={!prefs.global[activeChannel]}
                          onChange={(e) =>
                            handleUpdatePrefs({
                              ...prefs,
                              perType: {
                                ...prefs.perType,
                                [group]: {
                                  ...prefs.perType[group],
                                  [type]: {
                                    ...prefs.perType[group][type],
                                    [activeChannel]: e.target.checked,
                                  },
                                },
                              },
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-gray-500 rounded-full transition-colors shadow-inner"></div>
                        <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6 peer-checked:shadow-[0_0_10px_2px_rgba(168,85,247,0.7)]"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {!prefs.global[activeChannel] && (
            <p className="text-center text-gray-400 italic mt-4">
              Turn on global {activeChannel} to enable these preferences.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
