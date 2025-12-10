import React, { useState } from "react";
import { retentionApi } from "../../api/retentionApi";
import toast from "react-hot-toast";

const Comments = () => {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([
    {
      id: 1,
      author: {
        name: "John Smith",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCGFljVK_1YLiLqNE8SMU0zsD2LUOv_ZJClfdq_DWp5FLd8KsDvQMnl0VOe2aFfU8eqc6M6I9aJ-VCGtFzHlUS0P9bjYnTWHMI5UO-pnf_7H4DGlvVnCe8Bj212iSAhJEonp7QjXn4VZAVbIpKHMYo4M70ouLkfY0wZPHju90a2vQzdL6Es79mMQ8NwXMHcJmqQaWhUuBwfkisr2uii-p0d3iFFfq4_RPcfykChX-MAS__NVdhAo3TLJvD4_LSMPxI_TLnrD1Gi_oFK",
      },
      content: "Great article! I've been using Next.js for a few months now and it's drastically improved my development workflow.",
      date: "Mar 12, 2025",
      likes: 12,
      isLiked: false,
      replies: []
    },
    {
      id: 2,
      author: {
        name: "Sarah Kim",
        avatar: "https://images.unsplash.com/photo-1696960181436-1b6d9576354e?q=80&w=580&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      content: "Thanks for explaining the file-based routing so clearly. I was confused about how to set up dynamic routes, but this makes sense now.",
      date: "Mar 11, 2025",
      likes: 5,
      isLiked: false,
      replies: [
        {
          id: 3,
          author: {
            name: "David Lee",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCGFljVK_1YLiLqNE8SMU0zsD2LUOv_ZJClfdq_DWp5FLd8KsDvQMnl0VOe2aFfU8eqc6M6I9aJ-VCGtFzHlUS0P9bjYnTWHMI5UO-pnf_7H4DGlvVnCe8Bj212iSAhJEonp7QjXn4VZAVbIpKHMYo4M70ouLkfY0wZPHju90a2vQzdL6Es79mMQ8NwXMHcJmqQaWhUuBwfkisr2uii-p0d3iFFfq4_RPcfykChX-MAS__NVdhAo3TLJvD4_LSMPxI_TLnrD1Gi_oFK",
          },
          content: "@sarahkim I appreciate it!",
          date: "Mar 12, 2025",
          likes: 12,
          isLiked: false,
        }
      ]
    }
  ]);

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        author: {
          name: "You",
          avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0SOH_qdug48AdwWxvlB89VAMgWwLvCzU5nSDeh7sGBOxfcwtoGxXGFu3Q2JauQZWpKqk-GCgCttE6cJIsPEkbYBWNgz8qS6HIT-5Sz6LgHkDAzWnkSvAOUOk7CDaVV0qGaLh5TF5SZPN1EfhhvDKzelBH3komHVKuAU_sLPUdP82-LnV5uJEpBfaz0d1ZudZEkDGu7GEHq46ftKnljIDa0wEpEPuusxbFSIsOPoONgMi3EDnu1Bupe8IbBw6vKFxxdMaP6_2s5fii",
        },
        content: newComment,
        date: "Just now",
        likes: 0,
        isLiked: false,
        replies: []
      };
      setComments([...comments, comment]);
      setNewComment("");

      // Record comment activity for streak
      try {
        retentionApi.recordActivity("comment", postId, commentId, "Posted a comment").catch(error => {
          console.error("Failed to record comment activity:", error);
        });
      } catch (error) {
        console.error("Error recording activity:", error);
      }
    }
  };

  const toggleLike = (commentId, isReply = false, parentId = null) => {
    setComments(comments.map(comment => {
      if (isReply && comment.id === parentId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => 
            reply.id === commentId 
              ? { ...reply, likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1, isLiked: !reply.isLiked }
              : reply
          )
        };
      } else if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked
        };
      }
      return comment;
    }));

    // Record like activity for streak
    try {
      retentionApi.recordActivity("like", postId, null, "Liked a comment").catch(error => {
        console.error("Failed to record like activity:", error);
      });
    } catch (error) {
      console.error("Error recording activity:", error);
    }
  };

  return (
    <div>
      {/* Comments Header */}
      <div className="mb-6">
        <h3 className="font-lato text-lg font-semibold" style={{ color: "#8B93D1" }}>Comments (2)</h3>
      </div>

      {/* Add Comment Form */}
      <div className="flex space-x-3 mb-6">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuC0SOH_qdug48AdwWxvlB89VAMgWwLvCzU5nSDeh7sGBOxfcwtoGxXGFu3Q2JauQZWpKqk-GCgCttE6cJIsPEkbYBWNgz8qS6HIT-5Sz6LgHkDAzWnkSvAOUOk7CDaVV0qGaLh5TF5SZPN1EfhhvDKzelBH3komHVKuAU_sLPUdP82-LnV5uJEpBfaz0d1ZudZEkDGu7GEHq46ftKnljIDa0wEpEPuusxbFSIsOPoONgMi3EDnu1Bupe8IbBw6vKFxxdMaP6_2s5fii"
          alt="Your avatar"
          className="w-10 h-10 rounded-full flex-shrink-0"
        />
        <div className="flex-1">
          <form onSubmit={handleSubmitComment} className="flex items-start space-x-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-rich-black-light border border-navbar-border rounded-lg px-4 py-3 text-white placeholder-periwinkle focus:outline-none focus:border-periwinkle resize-none font-lato text-sm min-h-[44px] max-h-32"
              rows="1"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="bg-medium-slate-blue text-white px-4 py-2.5 rounded-md hover:bg-medium-slate-blue-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-lato font-medium flex items-center justify-center min-w-[44px] shadow-lg shadow-medium-slate-blue/30"
            >
              <span className="material-icons text-base">send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            {/* Avatar outside the box */}
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
            
            {/* Comment Thread Box*/}
            <div className="flex-1 bg-rich-black-light rounded-lg border border-navbar-border">
              {/* Main Comment */}
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-white font-medium font-lato text-sm">{comment.author.name}</span>
                  <span className="text-periwinkle text-xs font-lato">{comment.date}</span>
                </div>
                <p className="text-white text-sm font-lato leading-relaxed mb-3">{comment.content}</p>
                
                {/* Comment Actions */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => toggleLike(comment.id)}
                    className={`flex items-center space-x-1 text-xs transition-colors font-lato ${
                      comment.isLiked ? "text-white" : "text-periwinkle hover:text-white"
                    }`}
                  >
                    <span className="material-icons text-sm">thumb_up</span>
                    <span>{comment.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1 text-xs text-periwinkle hover:text-white transition-colors font-lato">
                    <span className="material-icons text-sm">chat_bubble_outline</span>
                    <span>Reply</span>
                  </button>
                </div>
              </div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pt-4 pl-16 pr-4 pb-4 relative">
                  {/* Vertical line */}
                  <div className="absolute left-12 top-0 bottom-4 w-px bg-gray-600"></div>
                  
                  {comment.replies.map((reply, index) => (
                    <div key={reply.id} className="flex space-x-3 pb-4">
                      <img
                        src={reply.author.avatar}
                        alt={reply.author.name}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-white font-medium font-lato text-sm">{reply.author.name}</span>
                          <span className="text-periwinkle text-xs font-lato">{reply.date}</span>
                        </div>
                        <p className="text-white text-sm font-lato leading-relaxed mb-3">{reply.content}</p>
                        
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => toggleLike(reply.id, true, comment.id)}
                            className={`flex items-center space-x-1 text-xs transition-colors font-lato ${
                              reply.isLiked ? "text-white" : "text-periwinkle hover:text-white"
                            }`}
                          >
                            <span className="material-icons text-sm">thumb_up</span>
                            <span>{reply.likes}</span>
                          </button>
                          <button className="flex items-center space-x-1 text-xs text-periwinkle hover:text-white transition-colors font-lato">
                            <span className="material-icons text-sm">chat_bubble_outline</span>
                            <span>Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Comments;