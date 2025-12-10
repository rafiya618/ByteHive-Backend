import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth";
import axios from "axios";
import { postsApi } from "../../api/postsApi";
import { savePost, unsavePost, checkSavedStatus, recordView } from "../../api/curationApi";
import { recordActivity } from "../../api/retentionApi";
import {
  simplifyPost,
  getSimplification,
} from "../../api/smartReadingApi";
import toast from "react-hot-toast";
import TextSelectionPopup from "./TextSelectionPopup";
import Comment from "./Comment/Comment";

export default function BlogDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [readingMode, setReadingMode] = useState("original");
  const [showPopup, setShowPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showBookmarkMenu, setShowBookmarkMenu] = useState(false);
  const [savedCategory, setSavedCategory] = useState(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isDownvoted, setIsDownvoted] = useState(false);
  const [simplifiedContent, setSimplifiedContent] = useState(null);
  const [loadingSimplification, setLoadingSimplification] = useState(false);
  const [simplificationLevel, setSimplificationLevel] = useState("detailed");
  const contentRef = useRef(null);
  // Helper to normalize upvote/downvote values (arrays or numbers) to a numeric count
  const toCount = (v) => {
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && !isNaN(Number(v))) return Number(v);
    return 0;
  };

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        // If user is logged in, fetch post with vote status for current user
        let data;
        const userId = auth?.token ? (auth.user?._id ?? auth.user?.id ?? auth.user?.user_id ?? auth.user?.sub ?? auth.user?.userId) : null;
        if (userId) {
          try {
            const resp = await postsApi.getPostByIdWithVotes(postId, userId);
            data = resp.post || resp;
          } catch {
            // fallback to basic fetch
            const res = await axios.get(`http://localhost:5000/api/posts/${postId}`);
            data = res.data.post;
          }
        } else {
          const res = await axios.get(`http://localhost:5000/api/posts/${postId}`);
          data = res.data.post;
        }

        setPost(data);
        // normalize upvotes/downvotes which may be arrays or numbers
        setUpvotes(toCount(data.upvotes));
        setDownvotes(toCount(data.downvotes));
        // Set vote flags if provided
        if (data.userLiked !== undefined) setIsUpvoted(Boolean(data.userLiked));
        if (data.userDisliked !== undefined) setIsDownvoted(Boolean(data.userDisliked));

        // Record activity for reading this post
        if (auth?.token) {
          try {
            await recordActivity('read', postId, null, 'Read a post');
          } catch (error) {
            console.error("Failed to record read activity:", error);
            // Don't block the UI if streak recording fails
          }
          // Record view in history
          try {
            await recordView(postId);
          } catch (error) {
            console.error("Failed to record view in history:", error);
            // Don't block the UI if history recording fails
          }
        }
      } catch (error) {
        setErr(error?.response?.data?.error || "Failed to load post");
      }
      setLoading(false);
    };
    if (postId) fetchPost();
  }, [postId, auth?.token, auth.user]);

  // Check if post is saved
  React.useEffect(() => {
    const checkSaved = async () => {
      try {
        const status = await checkSavedStatus(postId);
        if (status?.isSaved) {
          setIsBookmarked(true);
          setSavedCategory(status.category || "Saved");
        }
      } catch (err) {
        console.warn("Error checking saved status:", err?.message || err);
      }
    };

    if (auth?.token) {
      checkSaved();
    }
  }, [auth?.token, postId]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  };

  const handleSimplifyClick = async () => {
    if (!post || !post.post_description) {
      toast.error("No content to simplify");
      return;
    }

    try {
      setLoadingSimplification(true);

      // Try to get cached simplification first
      let cached = await getSimplification(postId, simplificationLevel).catch(
        () => null
      );

      if (cached) {
        console.log("✅ Using cached simplification");
        setSimplifiedContent(cached);
        setReadingMode("simplify");
        return;
      }

      // Generate new simplification
      console.log("🔄 Generating new simplification...");
      const result = await simplifyPost(
        postId,
        post.post_description,
        simplificationLevel
      );

      setSimplifiedContent(result);
      setReadingMode("simplify");
      toast.success("Post simplified successfully!");
    } catch (error) {
      console.error("Error simplifying post:", error);
      toast.error("Failed to simplify post. Please try again.");
    } finally {
      setLoadingSimplification(false);
    }
  };

  const toggleUpvote = async () => {
    if (!auth?.token) {
      navigate('/login', { state: { from: `/post/${postId}` } });
      return;
    }

    // optimistic update
    const previous = { upvotes, downvotes, isUpvoted, isDownvoted };
    if (isUpvoted) {
      setUpvotes((v) => v - 1);
      setIsUpvoted(false);
    } else {
      setUpvotes((v) => v + 1);
      setIsUpvoted(true);
      if (isDownvoted) {
        setDownvotes((v) => v - 1);
        setIsDownvoted(false);
      }
    }

    try {
      const userId = auth.user?._id ?? auth.user?.id ?? auth.user?.user_id ?? auth.user?.sub ?? auth.user?.userId;
      const normalizedUserId = String(userId); // Ensure consistent string format
      const res = await postsApi.likePost(postId, normalizedUserId);

      // If API returns authoritative counts (array or number), normalize and use them
      if (res && res.upvotes !== undefined) setUpvotes(toCount(res.upvotes));
      if (res && res.downvotes !== undefined) setDownvotes(toCount(res.downvotes));
      if (res && typeof res.userLiked === 'boolean') setIsUpvoted(res.userLiked);
      if (res && typeof res.userDisliked === 'boolean') setIsDownvoted(res.userDisliked);

      // Record like activity for streak
      try {
        await recordActivity('like', postId, null, 'Liked a post');
      } catch (err) {
        console.warn('Failed to record like activity:', err);
      }
    } catch (error) {
      console.error('Like API failed:', error);
      // rollback optimistic update
      setUpvotes(previous.upvotes);
      setDownvotes(previous.downvotes);
      setIsUpvoted(previous.isUpvoted);
      setIsDownvoted(previous.isDownvoted);
    }
  };

  const toggleDownvote = async () => {
    if (!auth?.token) {
      navigate('/login', { state: { from: `/post/${postId}` } });
      return;
    }

    const previous = { upvotes, downvotes, isUpvoted, isDownvoted };
    if (isDownvoted) {
      setDownvotes((v) => v - 1);
      setIsDownvoted(false);
    } else {
      setDownvotes((v) => v + 1);
      setIsDownvoted(true);
      if (isUpvoted) {
        setUpvotes((v) => v - 1);
        setIsUpvoted(false);
      }
    }

    try {
      const userId = auth.user?._id ?? auth.user?.id ?? auth.user?.user_id ?? auth.user?.sub ?? auth.user?.userId;
      const normalizedUserId = String(userId); // Ensure consistent string format
      const res = await postsApi.dislikePost(postId, normalizedUserId);

      if (res && res.upvotes !== undefined) {
        const c = toCount(res.upvotes);
        if (c !== null) setUpvotes(c);
      }
      if (res && res.downvotes !== undefined) {
        const c = toCount(res.downvotes);
        if (c !== null) setDownvotes(c);
      }
      if (res && typeof res.userLiked === 'boolean') setIsUpvoted(res.userLiked);
      if (res && typeof res.userDisliked === 'boolean') setIsDownvoted(res.userDisliked);
    } catch (error) {
      console.error('Dislike API failed:', error);
      setUpvotes(previous.upvotes);
      setDownvotes(previous.downvotes);
      setIsUpvoted(previous.isUpvoted);
      setIsDownvoted(previous.isDownvoted);
    }
  };

  const handleBookmark = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowBookmarkMenu(!showBookmarkMenu);
  };

  const handleSavePost = async (category) => {
    if (!auth?.token) {
      navigate('/login', { state: { from: `/post/${postId}` } });
      return;
    }

    try {
      console.log('BlogDetail: Attempting to save post', { postId, category });
      await savePost(postId, category);
      setIsBookmarked(true);
      setSavedCategory(category);
      setShowBookmarkMenu(false);
      toast.success(`Post saved to ${category}!`);
    } catch (err) {
      console.error('Error saving post:', err);
      const errorMsg = typeof err === 'string' ? err : err?.message || 'Failed to save post';
      toast.error(errorMsg);
    }
  };

  const handleUnsavePost = async () => {
    try {
      await unsavePost(postId);
      setIsBookmarked(false);
      setSavedCategory(null);
      setShowBookmarkMenu(false);
      toast.success('Post removed from saved');
    } catch (err) {
      console.error('Error unsaving post:', err);
      toast.error('Failed to unsave post');
    }
  };

  if (loading) return <div className="text-white text-center">Loading post...</div>;
  if (err) return <div className="text-red-400 text-center">{err}</div>;
  if (!post) return <div className="text-white text-center">No post found.</div>;

  // Select which content to show
  let contentToRender = post.post_description;
  
  if (readingMode === "simplify") {
    if (simplifiedContent) {
      contentToRender = simplifiedContent.simplifiedContent || post.post_description;
    } else {
      contentToRender = post.simplified_description || post.post_description;
    }
  }

  return (
    <div className="min-h-screen bg-rich-black relative">
      {/* Glow background */}
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

      <div className="relative z-10 container mx-auto px-5 sm:px-7 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Section with Buttons and Search */}
          <div className="flex items-center justify-between mb-6">
            {/* Reading Mode Toggle */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSimplifyClick}
                disabled={loadingSimplification}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-lato text-sm font-medium transition-all disabled:opacity-50 ${
                  readingMode === "simplify"
                    ? "bg-medium-slate-blue text-white shadow-lg shadow-medium-slate-blue/30"
                    : "bg-rich-black-light text-periwinkle hover:bg-periwinkle-light border border-navbar-border"
                }`}
              >
                <span className="material-icons text-lg">
                  {loadingSimplification ? "hourglass_top" : "auto_fix_high"}
                </span>
                <span>{loadingSimplification ? "Simplifying..." : "Simplify"}</span>
              </button>
              <button
                onClick={() => setReadingMode("original")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-lato text-sm font-medium transition-all ${
                  readingMode === "original"
                    ? "bg-medium-slate-blue text-white shadow-lg shadow-medium-slate-blue/30"
                    : "bg-rich-black-light text-periwinkle hover:bg-periwinkle-light border border-navbar-border"
                }`}
              >
                <span className="material-icons text-lg">description</span>
                <span>Original</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search in article"
                className="bg-transparent border border-[#393B5A] text-white rounded-[8px] h-[49px] pl-12 pr-4 w-96 text-base focus:outline-none font-lato placeholder-periwinkle"
              />
              <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-periwinkle text-xl">
                search
              </span>
            </div>
          </div>

          {/* Community + Meta Info */}
          <div className="flex items-center text-sm mb-4 font-lato">
            <span className="text-periwinkle px-3 py-1 rounded-xl font-semibold border border-navbar-border">
              {post.community || "General"}
            </span>
            <span className="mx-2 text-periwinkle">·</span>
            <span className="text-periwinkle">
              {new Date(post.createdAt).toLocaleDateString()} • {post.read_time || "6 min"} read
            </span>
          </div>

          {/* Title */}
          <h1 className="font-fenix text-3xl md:text-4xl text-white mb-6 leading-tight">
            {post.post_title}
          </h1>

          {/* Author Info */}
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={post.author?.avatar || "https://ui-avatars.com/api/?name=User"}
              alt={post.author?.name || "Author"}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <div className="text-white font-lato font-medium text-base">
                {post.author?.name || "Unknown"}
              </div>
              <div className="text-periwinkle text-sm font-lato">Author</div>
            </div>
          </div>

          {/* Tags Below Author */}
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags?.map((tag, i) => (
              <span
                key={i}
                className="bg-chip text-periwinkle text-xs font-semibold px-3 py-1 rounded-xl font-lato"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Thumbnail */}
          {post.thumbnail && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={post.thumbnail}
                alt="Thumbnail"
                className="w-full h-80 object-cover"
              />
            </div>
          )}

          {/* Blog Content */}
          <div ref={contentRef} onMouseUp={handleTextSelection} className="mb-8">
            <div className="prose prose-invert max-w-none">
              <div
                className="text-white space-y-4 
                          prose-pre:bg-rich-black-light prose-pre:border prose-pre:border-navbar-border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto 
                          prose-h2:text-3xl prose-h2:font-fenix prose-h2:font-bold prose-h2:text-white prose-h2:tracking-wide
                          prose-p:leading-snug prose-p:font-lato"
                dangerouslySetInnerHTML={{ __html: contentToRender }}
              />
            </div>
          </div>



          {/* Separator */}
          <hr className="border-navbar-border mb-8" />

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-6">
              {/* Upvote */}
              <button
                onClick={toggleUpvote}
                className={`flex items-center space-x-2 transition-colors ${
                  isUpvoted ? "text-green-400" : "text-periwinkle hover:text-white"
                }`}
              >
                <span className="material-icons text-lg">arrow_upward</span>
                <span className="font-lato font-medium">{upvotes}</span>
              </button>

              {/* Downvote */}
              <button
                onClick={toggleDownvote}
                className={`flex items-center space-x-2 transition-colors ${
                  isDownvoted ? "text-red-400" : "text-periwinkle hover:text-white"
                }`}
              >
                <span className="material-icons text-lg">arrow_downward</span>
                <span className="font-lato font-medium">{downvotes}</span>
              </button>

              {/* Views */}
              <div className="flex items-center space-x-2 text-periwinkle">
                <span className="material-icons text-lg">visibility</span>
                <span className="font-lato font-medium">{post.views || 0}</span>
              </div>
            </div>

            {/* Share + Save */}
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-periwinkle text-periwinkle rounded-md hover:bg-periwinkle-light transition-colors font-lato">
                <span className="material-icons text-lg">share</span>
                <span>Share</span>
              </button>
              <div className="relative">
                <button
                  onClick={handleBookmark}
                  className="flex items-center space-x-2 px-4 py-2 border border-periwinkle text-periwinkle rounded-md hover:bg-periwinkle-light transition-colors font-lato"
                >
                  <span className="material-icons text-lg">
                    {isBookmarked ? "bookmark" : "bookmark_border"}
                  </span>
                  <span>{isBookmarked ? "Saved" : "Save"}</span>
                </button>

                {/* Bookmark Dropdown Menu */}
                {showBookmarkMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-dark-navy-purple border border-navbar-border rounded-lg shadow-lg z-50 min-w-[200px] py-2">
                    {isBookmarked ? (
                      <>
                        <button
                          onClick={() => handleSavePost("Saved")}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                            savedCategory === "Saved" ? "text-periwinkle" : "text-white"
                          }`}
                        >
                          <span className="material-icons text-sm">check</span>
                          Saved
                        </button>
                        <button
                          onClick={() => handleSavePost("Watch Later")}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                            savedCategory === "Watch Later" ? "text-periwinkle" : "text-white"
                          }`}
                        >
                          <span className="material-icons text-sm">
                            {savedCategory === "Watch Later" ? "check" : ""}
                          </span>
                          Watch Later
                        </button>
                        <hr className="my-2 border-gray-600" />
                        <button
                          onClick={handleUnsavePost}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-red-400 flex items-center gap-2"
                        >
                          <span className="material-icons text-sm">close</span>
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSavePost("Saved")}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-white flex items-center gap-2"
                        >
                          <span className="material-icons text-sm">bookmark</span>
                          Saved
                        </button>
                        <button
                          onClick={() => handleSavePost("Watch Later")}
                          className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-white flex items-center gap-2"
                        >
                          <span className="material-icons text-sm">schedule</span>
                          Watch Later
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments */}
          <Comment postId={postId} />
        </div>
      </div>

      {/* Text Selection Popup */}
      {showPopup && (
        <TextSelectionPopup
          position={popupPosition}
          selectedText={selectedText}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
