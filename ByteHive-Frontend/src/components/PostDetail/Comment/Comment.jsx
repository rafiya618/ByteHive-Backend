import { useState, useEffect, useRef } from 'react';
import socket from '../../../../Socket';
import { useAuth } from '../../../context/auth';
import {
  addComment,
  deleteComment,
  dislikeComment,
  getcommentById,
  getCommentsByPost,
  getReplies,
  likeComment,
  updateComment
} from '../../../api/commentApi';
import { recordActivity } from '../../../api/retentionApi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useProfile } from '../../../context/profileContext';
import CommentBlock from './CommentBlock';
import { useLocation } from 'react-router-dom';
import "./comment.css";

dayjs.extend(relativeTime);

const Comment = ({ postId }) => {
  const [msg, setMsg] = useState("");
  const { auth } = useAuth();
  const { profile } = useProfile();
  // const [decoded, setDecoded] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState({});
  const [reply, setReply] = useState({});
  const [replies, setReplies] = useState({});
  const [expandReplies, setExpandReplies] = useState({});
  const [editingComment, setEditingComment] = useState({});
  const [editingText, setEditingText] = useState({});
  const loaderRef = useRef(null);
  const observerRef = useRef(null);
  const [cursor, setCursor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortOrder, setSortOrder] = useState("latest"); // latest | oldest
  const location = useLocation();
  const targetRef = useRef(null);
  const [highlightId, setHighlightId] = useState("")

  // ⬅️ added: extract query params
  // let { triggerType, triggerId, entityId, isAggregation } = location.state || {};
  let searchParams = new URLSearchParams(location.search);
  // let triggerType = searchParams.get("triggerType");
  // let entityId = searchParams.get("entityId");
  let triggerId = searchParams.get("triggerId");
  let isAggregated = searchParams.get("isAggregated") === 'true';

  useEffect(() => {
    if (!triggerId) return;

    const loadComment = async () => {
      try {
        // if (isAggregated) {
        const { data } = await getcommentById(triggerId);
        setComments((prev) => {
          const existingIds = new Set(prev.map((c) => c._id));
          const uniqueData = [data.comment].filter((c) => !existingIds.has(c._id));
          return [...prev, ...uniqueData];
        });
        if (!data.replies) {
        } else {
          setReplies((prev) => ({ ...prev, [data?.comment?._id]: data.replies }));
          setExpandReplies((prev) => ({ ...prev, [data?.comment?._id]: true }));
        }
        if (isAggregated == true) {
          //             setHighlightId(data?.comment?._id)
        }
        else if (isAggregated == false) {
          setHighlightId(triggerId)
        }
      } catch (err) {
        console.error("Error fetching comment for scroll:", err);
      }
    };

    loadComment();
  }, [triggerId]);

  useEffect(() => {
    if (!highlightId) return;

    const scrollAndHighlight = () => {
      if (targetRef.current) {
        targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        targetRef.current.classList.add("highlight");
        setTimeout(() => {
          if (targetRef.current) targetRef.current.classList.remove("highlight");
        }, 3000);
      }
    };

    // Delay to wait for render to complete
    const timeout = setTimeout(scrollAndHighlight, 100);

    return () => clearTimeout(timeout);
  }, [highlightId]);



  // Socket listeners
  useEffect(() => {
    const handleNewComment = (newComment) => {
      if (newComment.postId === postId) {
        if (newComment.parentId) {
          setReplies((prev) => ({
            ...prev,
            [newComment.parentId]: [
              newComment,
              ...(prev[newComment.parentId] || [])
            ]
          }));
          setComments(prev =>
            prev.map(c =>
              c._id === newComment.parentId
                ? { ...c, replyCount: c.replyCount + 1 }
                : c
            )
          );
        } else {
          setComments((prev) => [newComment, ...prev]);
        }

      }
    };

    const handleLikeAndDislike = (comment) => {
      if (comment.parentId) {
        setReplies((prev) => ({
          ...prev,
          [comment.parentId]: prev[comment.parentId]?.map(c =>
            c._id == comment._id ? { ...c, likes: comment.likes, dislikes: comment.dislikes } : c
          )
        }));
      } else {
        setComments((prev) =>
          prev.map(c =>
            c._id === comment._id ? { ...c, likes: comment.likes, dislikes: comment.dislikes } : c
          )
        );
      }
    };

    const handleUpdatedComment = (updatedComment) => {
      if (updatedComment.parentId) {
        setReplies(prev => ({
          ...prev,
          [updatedComment.parentId]: prev[updatedComment.parentId]?.map(c =>
            c._id === updatedComment._id
              ? { ...c, text: updatedComment.text }
              : c
          )
        }));
      } else {
        setComments(prev =>
          prev.map(c =>
            c._id == updatedComment._id
              ? { ...c, text: updatedComment.text }
              : c
          )
        );
      }
    };

    const handleDeleteComment = (comment) => {

      if (comment.parentId) {
        // Handle reply deletion
        setReplies(prev => ({
          ...prev,
          [comment.parentId]: prev[comment.parentId]?.filter(
            c => c._id !== comment._id
          )
        }));
        setComments(prev =>
          prev.map(c =>
            c._id === comment.parentId
              ? { ...c, replyCount: c.replyCount - 1 }
              : c
          )
        );
      } else {
        // Handle top-level comment deletion

        const repliesForThisComment = replies[comment._id];
        if (repliesForThisComment && repliesForThisComment.length > 0) {
          repliesForThisComment.forEach((reply, i) => {
          });
        } else {
        }

        setComments(prev => prev.filter(c => c._id !== comment._id));
      }
    };

    socket.emit("joinRoom", { type: "post", id: postId });
    socket.on("comment:new", handleNewComment);
    socket.on("comment:LikeAndDislike", handleLikeAndDislike);
    socket.on("comment:update", handleUpdatedComment);
    socket.on("comment:delete", handleDeleteComment);

    return () => {
      socket.emit("leaveRoom", { type: "post", id: postId });
      socket.off("comment:new", handleNewComment);
      socket.off("comment:LikeAndDislike", handleLikeAndDislike);
      socket.off("comment:update", handleUpdatedComment);
      socket.off("comment:delete", handleDeleteComment);
    };
  }, [postId]);

  // Reset comments when post changes
  useEffect(() => {
    const initFetch = async () => {
      setComments([]);
      setCursor(null);
      setHasMore(true);

      // Explicitly pass null cursor
      await fetchTopComments(sortOrder, null);
    };

    initFetch();
  }, [postId, sortOrder]);



  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchTopComments();
        }
      },
      { threshold: 1.0 }
    );

    observerRef.current = observer;
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loaderRef, hasMore, isLoading]);

  // Add new comment or reply
  const handleAddComment = async (e, comment) => {
    e.preventDefault();

    if (!auth?.user?._id || !(comment ? (reply[comment._id]?.trim()) : msg.trim())) {
      console.warn("Missing user ID or empty message.");
      return;
    }
    const commentPayload = {
      postId: postId,
      parentId: comment
        ? (comment.parentId ? comment.parentId : comment._id)
        : null,
      userId: auth?.user?._id,
      text: comment ? reply[comment._id] : msg,
      receiverId: comment ? comment.user?._id : "postId",
      entityId: comment ? (comment.parentId ? comment.parentId : comment._id) : postId
    };


    try {
      const { data } = await addComment(commentPayload);

      // Record comment activity for streak
      try {
        const commentId = data?._id || data?.comment?._id;
        await recordActivity('comment', postId, commentId, 'Posted a comment');
      } catch (err) {
        console.warn('Failed to record comment activity:', err);
      }

      if (comment) {
        setReply(prev => ({ ...prev, [comment._id]: "" }));
        setReplyingTo(prev => ({ ...prev, [comment._id]: null }));
      } else {
        setMsg("");
      }
    } catch (err) {
      console.error("Comment failed:", err);
    }
  };

  // Fetch top-level comments
  const fetchTopComments = async (order = sortOrder, startCursor = cursor) => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const { data } = await getCommentsByPost(postId, startCursor, order);

      const fetchedComments = data.comments;
      const newCursor = data.nextCursor;

      if (!fetchedComments || fetchedComments.length === 0) {
        setHasMore(false);
      } else {
        setComments(prev => {
          const existingIds = new Set(prev.map(c => c._id));
          const uniqueData = fetchedComments.filter(c => !existingIds.has(c._id));
          return order === "oldest"
            ? [...uniqueData, ...prev] // prepend for oldest
            : [...prev, ...uniqueData]; // append for latest
        });

        setCursor(newCursor);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setIsLoading(false);
    }
  };




  // Fetch replies for a comment
  const handleReplies = async (parentId) => {
    try {
      const { data } = await getReplies(postId, parentId);
      setReplies(prev => ({ ...prev, [parentId]: data }));
      setReply(prev => ({ ...prev, [parentId]: "" }));
      setExpandReplies(prev => ({ ...prev, [parentId]: true }));
    } catch (error) {
      console.log('Error: ', error);
    }
  };

  // Like a comment
  const handleLike = async (commentId, userId) => {
    try {
      await likeComment(commentId, userId);
    } catch (error) {
      console.log('Error in handle like: ', error);
    }
  };

  const handleDislike = async (commentId, userId) => {
    try {
      await dislikeComment(commentId, userId);
    } catch (error) {
      console.log('Error in handle like: ', error);
    }
  };

  // Update comment
  const handleUpdateComment = async (commentId) => {
    try {
      const { data } = await updateComment(commentId, editingText[commentId]);
      setEditingComment(prev => ({ ...prev, [commentId]: "" }));
      setEditingText(prev => ({ ...prev, [commentId]: "" }));
    } catch (error) {
      console.log('Error in updating comment', error);
    }
  };

  // Delete comment
  const handleDelete = async (commentId, receiverId) => {
    try {
      await deleteComment(commentId, receiverId);
    } catch (error) {
      console.log('Error in handle Delete', error);
    }
  };

  return (
    <div>
      {/* Comments Header */}
      <div className="mb-6">
        <h3 className="font-lato text-lg font-semibold" style={{ color: "#8B93D1" }}>
          Comments ({comments.length})
        </h3>
      </div>

      {/* Sort Dropdown */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <label className="text-sm font-medium text-periwinkle">Sort by:</label>
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            setMsg("");
          }}
          className="px-3 py-2 rounded-md bg-rich-black-light border border-navbar-border text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-medium-slate-blue"
        >
          <option value="latest">Latest Comments</option>
          <option value="oldest">Oldest Comments</option>
        </select>
      </div>

      {/* Add Comment Form */}
      <div className="flex space-x-3 mb-6">
        <img
          src={auth?.user?.profileImage || profile?.profileImage || "https://ui-avatars.com/api/?name=User"}
          alt="Your avatar"
          className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-dark-indigo"
        />
        <div className="flex-1">
          <form onSubmit={(e) => handleAddComment(e, null)} className="flex items-start space-x-3">
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-rich-black-light border border-navbar-border rounded-lg px-4 py-3 text-white placeholder-periwinkle focus:outline-none focus:border-periwinkle resize-none font-lato text-sm min-h-[44px] max-h-32"
              rows="1"
            />
            <button
              type="submit"
              disabled={!msg.trim()}
              className="cursor-pointer bg-medium-slate-blue text-white px-4 py-2.5 rounded-md hover:bg-medium-slate-blue-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-lato font-medium flex items-center justify-center min-w-[44px] shadow-lg shadow-medium-slate-blue/30"
            >
              <span className="material-icons text-base">send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {isLoading && <p className="text-center text-gray-400">Loading more...</p>}

        {comments.map((c) => (
          <CommentBlock
            key={c._id}
            c={c}
            highlightId={highlightId}
            ref={targetRef}
            auth={auth}
            editingComment={editingComment}
            setEditingComment={setEditingComment}
            editingText={editingText}
            setEditingText={setEditingText}
            handleUpdateComment={handleUpdateComment}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            reply={reply}
            setReply={setReply}
            handleAddComment={handleAddComment}
            handleLike={handleLike}
            handleDislike={handleDislike}
            replies={replies}
            expandReplies={expandReplies}
            setExpandReplies={setExpandReplies}
            handleReplies={handleReplies}
            handleDelete={handleDelete}
          />
        ))}

        <div ref={loaderRef} style={{ height: "1px" }}></div>
        {!hasMore && <p className="text-center text-gray-400">No more comments.</p>}
      </div>
    </div>

  );
};

export default Comment;

