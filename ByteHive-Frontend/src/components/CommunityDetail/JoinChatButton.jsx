import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/auth";
import { chatApi } from "../../api/chatApi"; // Changed from named import to default import

const JoinChatButton = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get community id from current route
  const { auth } = useAuth();

  const handleJoinChat = async () => {
    if (!auth?.user?._id || !id) {
      console.error('Missing user ID or community ID:', {
        userId: auth?.user?._id,
        communityId: id
      });
      alert('Please log in to join chat room.');
      return;
    }

    try {
      console.log('Joining chat room with:', {
        user_id: auth.user._id,
        community_id: id // Added community_id back
      });

      // Call the join room API with both user_id and community_id
      const response = await chatApi.joinChatRoom(auth.user._id, id);
      
      console.log('Join room response:', response);

      if (response.status === 'success') {
        // Navigate to room1 with user_id and community_id query parameters
        navigate(`/room1/${response.room_id}?user_id=${auth.user._id}&community_id=${id}`);
      } else {
        console.error('Failed to join room:', response.message);
        alert('Failed to join chat room. Please try again.');
      }
    } catch (error) {
      console.error('Error joining chat room:', error);
      alert('Failed to join chat room. Please try again.');
    }
  };

  return (
    <button
      onClick={handleJoinChat}
      className="h-[49px] px-6 bg-navbar-bg text-white text-base font-medium rounded-[5px] transition-colors duration-200 flex items-center gap-2 border hover:border-periwinkle"
      style={{
        minWidth: 120,
        borderRadius: "5px",
        borderColor: "var(--periwinkle)",
      }}
    >
      <span className="material-icons text-base">
        chat_bubble_outline
      </span>
      Join Chat
    </button>
  );
};

export default JoinChatButton;