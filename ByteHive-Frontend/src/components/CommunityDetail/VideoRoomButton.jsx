import React from "react";
import { useNavigate } from "react-router-dom";

const VideoRoomButton = () => {
  const navigate = useNavigate();

  return (
    <button
      className="h-[49px] px-6 bg-navbar-bg text-white text-base font-medium rounded-[5px] transition-colors duration-200 flex items-center gap-2 border hover:border-periwinkle"
      style={{
        minWidth: 120,
        borderRadius: "5px",
        borderColor: "var(--periwinkle)",
      }}
      onClick={() => navigate("/video-home")}
    >
      <span className="material-icons text-base">
        videocam
      </span>
      Video Room
    </button>
  );
};

export default VideoRoomButton;