import React, { useState, useEffect, useRef } from "react";
import SearchBar from "../../shared/SearchBar";
import BlogCard from "../BlogListing/BlogCard";
import { getHistory, clearHistory, deleteHistoryItems } from "../../api/curationApi";
import { postsApi } from "../../api/postsApi";

const HistoryPage = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const kebabRef = useRef();
  // Delete selected items (in selection mode)
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      alert("No items selected.");
      return;
    }
    if (!window.confirm("Delete selected history items?")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteHistoryItems(selectedItems);
      setHistoryItems((prev) => prev.filter((item) => !selectedItems.includes(item.historyId || item._id)));
      setSelectedItems([]);
      setSelectionMode(false);
    } catch (err) {
      setError(err.message || "Failed to delete selected items");
    } finally {
      setLoading(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchPostDetails = async (postId) => {
    try {
      console.log("Fetching post details for postId:", postId);
      const response = await postsApi.getPostById(postId);
      console.log("Post details response:", response);
      return response.post || response;
    } catch (error) {
      console.error("Error fetching post details for", postId, ":", error);
      return null;
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Component: Fetching history for page:", page);

      const response = await getHistory(page);
      console.log("Component: History API response:", response);

      // Handle different possible response structures
      let historyData = [];
      
      if (response) {
        if (Array.isArray(response)) {
          historyData = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            historyData = response.data;
          } else if (response.data.history && Array.isArray(response.data.history)) {
            historyData = response.data.history;
          }
        } else if (response.history && Array.isArray(response.history)) {
          historyData = response.history;
        } else if (response.success && response.data) {
          historyData = Array.isArray(response.data) ? response.data : [];
        }
      }

      console.log("Component: Processed history data:", historyData);
      console.log("Component: History data length:", historyData.length);

      // Fetch full post details for each history item
      if (historyData.length > 0) {
        console.log("Fetching post details for", historyData.length, "history items");
        const historyWithPosts = await Promise.all(
          historyData.map(async (historyItem) => {
            const postDetails = await fetchPostDetails(historyItem.postId);
            
            if (postDetails) {
              // Combine history metadata with post data
              return {
                ...postDetails,
                // History-specific fields
                _id: historyItem._id,
                viewedAt: historyItem.viewedAt,
                historyId: historyItem._id,
                // Use post data but keep history timestamp
                image: postDetails.thumbnail || postDetails.image,
                title: postDetails.post_title || postDetails.title,
                description: postDetails.small_description || postDetails.description,
                postId: historyItem.postId,
                // Ensure all required fields exist
                community: postDetails.community || postDetails.community_name || "Unknown",
                readTime: postDetails.readTime || "5 min read",
                tags: Array.isArray(postDetails.tags) ? postDetails.tags : [],
                author: postDetails.author || { name: "Unknown", avatar: "" },
                upvotes: postDetails.upvotes || 0,
                downvotes: postDetails.downvotes || 0,
                comments: postDetails.comments || 0,
                views: postDetails.views || 0
              };
            } else {
              // If post details couldn't be fetched, return basic info
              console.warn("Could not fetch post details for:", historyItem.postId);
              return {
                _id: historyItem._id,
                postId: historyItem.postId,
                viewedAt: historyItem.viewedAt,
                title: "Post no longer available",
                description: "This post may have been deleted or is no longer accessible",
                community: "Unknown",
                readTime: "0 min read",
                tags: [],
                author: { name: "Unknown", avatar: "" },
                upvotes: 0,
                downvotes: 0,
                comments: 0,
                views: 0,
                image: null
              };
            }
          })
        );

        console.log("History with post details:", historyWithPosts);
        setHistoryItems(historyWithPosts);
      } else {
        setHistoryItems([]);
      }
    } catch (err) {
      console.error("Component: Error fetching history:", err);
      const errorMessage = err.message || err.error || 'Failed to fetch history';
      setError(errorMessage);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      fetchHistory();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch all history
      const response = await getHistory(page);
      let historyData = [];
      if (response) {
        if (Array.isArray(response)) {
          historyData = response;
        } else if (response.data) {
          if (Array.isArray(response.data)) {
            historyData = response.data;
          } else if (response.data.history && Array.isArray(response.data.history)) {
            historyData = response.data.history;
          }
        } else if (response.history && Array.isArray(response.history)) {
          historyData = response.history;
        } else if (response.success && response.data) {
          historyData = Array.isArray(response.data) ? response.data : [];
        }
      }
      // Fetch post details for all history
      const historyWithPosts = await Promise.all(
        historyData.map(async (historyItem) => {
          const postDetails = await fetchPostDetails(historyItem.postId);
          if (postDetails) {
            return {
              ...postDetails,
              _id: historyItem._id,
              viewedAt: historyItem.viewedAt,
              historyId: historyItem._id,
              image: postDetails.thumbnail || postDetails.image,
              title: postDetails.post_title || postDetails.title,
              description: postDetails.small_description || postDetails.description,
              postId: historyItem.postId,
              community: postDetails.community || postDetails.community_name || "Unknown",
              readTime: postDetails.readTime || "5 min read",
              tags: Array.isArray(postDetails.tags) ? postDetails.tags : [],
              author: postDetails.author || { name: "Unknown", avatar: "" },
              upvotes: postDetails.upvotes || 0,
              downvotes: postDetails.downvotes || 0,
              comments: postDetails.comments || 0,
              views: postDetails.views || 0
            };
          } else {
            return {
              _id: historyItem._id,
              postId: historyItem.postId,
              viewedAt: historyItem.viewedAt,
              title: "Post no longer available",
              description: "This post may have been deleted or is no longer accessible",
              community: "Unknown",
              readTime: "0 min read",
              tags: [],
              author: { name: "Unknown", avatar: "" },
              upvotes: 0,
              downvotes: 0,
              comments: 0,
              views: 0,
              image: null
            };
          }
        })
      );
      // Filter by search term (title or description)
      const filtered = historyWithPosts.filter(item =>
        (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setHistoryItems(filtered);
    } catch (err) {
      setError(err.message || 'Failed to search history');
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire history?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await clearHistory();
      setHistoryItems([]);
    } catch (err) {
      console.error("Error clearing history:", err); // Debug log
      setError(err.message || "Failed to clear history");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons text-6xl text-red-500 mb-4 block">
            error
          </span>
          <h3 className="font-fenix text-2xl text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-columbia-blue">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rich-black text-white relative">
      {/* Background Glow Effect */}
      <div
        className="absolute z-0"
        style={{
          width: 637,
          height: 300,
          top: -38,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1A1842B3",
          filter: "blur(100px)",
          boxShadow: "0px 4px 100px 500px #00000066",
          borderRadius: 30,
          pointerEvents: "none",
        }}
      />

      <div className="container mx-auto px-5 sm:px-7 lg:px-10 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
            <div>
              <h1 className="font-fenix text-[28px] text-white mb-1">
                History
              </h1>
              <p className="text-desc text-base">Your recently viewed posts</p>
            </div>

            {/* Search Bar and Clear Button */}
            <div className="flex items-center gap-4 w-full md:w-[500px]">
              <SearchBar onSearch={handleSearch} />
              {historyItems.length > 0 && (
                <div className="relative" ref={kebabRef}>
                  <button
                    onClick={() => setShowOptions((v) => !v)}
                    className="p-2 rounded-full hover:bg-periwinkle-light focus:outline-none"
                    aria-label="Options"
                  >
                    <span className="material-icons">more_vert</span>
                  </button>
                  {showOptions && (
                    <div className="absolute right-0 mt-2 w-44 bg-rich-black border border-navbar-border rounded-lg shadow-lg z-50">
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-periwinkle-light text-white"
                        onClick={() => { setShowOptions(false); handleClearHistory(); }}
                      >
                        Clear History
                      </button>
                      <button
                        className="block w-full text-left px-4 py-2 hover:bg-red-500 text-white"
                        onClick={() => { setShowOptions(false); setSelectionMode(true); setSelectedItems([]); }}
                      >
                        Delete Selected
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Items Grid */}
        {loading ? (
          <div className="text-center py-16">
            <span className="material-icons text-6xl text-columbia-blue animate-spin">
              refresh
            </span>
            <p className="text-columbia-blue mt-4">Loading your history...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {historyItems.length > 0 ? (
              <>
                {selectionMode && (
                  <div className="flex items-center mb-4 gap-2">
                    <button
                      onClick={() => setSelectionMode(false)}
                      className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      className="px-3 py-1 text-sm bg-red-600 rounded text-white hover:bg-red-700"
                      disabled={selectedItems.length === 0}
                    >
                      Delete Selected ({selectedItems.length})
                    </button>
                  </div>
                )}
                {historyItems.map((item) => {
                  const itemId = item.historyId || item._id;
                  return (
                    <div key={itemId} className="flex items-center">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(itemId)}
                          onChange={() => setSelectedItems((prev) =>
                            prev.includes(itemId)
                              ? prev.filter((id) => id !== itemId)
                              : [...prev, itemId]
                          )}
                          className="mr-4"
                        />
                      )}
                      <div className="flex-1">
                        <BlogCard
                          id={item.postId || item._id}
                          image={item.image}
                          community={item.community}
                          date={new Date(item.viewedAt || item.createdAt).toLocaleDateString()}
                          readTime={item.readTime}
                          title={item.title}
                          description={item.description}
                          tags={item.tags}
                          author={item.author}
                          upvotes={item.upvotes}
                          downvotes={item.downvotes}
                          comments={item.comments}
                          views={item.views}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-16">
                <span className="material-icons text-6xl text-columbia-blue mb-4 block">
                  search_off
                </span>
                <h3 className="font-fenix text-2xl text-white mb-2">
                  No items found
                </h3>
                <p className="text-columbia-blue">
                  {error ? 'An error occurred while searching.' : 'No posts match your search.'}
                </p>
                {error && (
                  <p className="text-red-500 mt-2 text-sm">Debug: {error}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;