import React from "react";
import { useNavigate } from "react-router-dom";

const NewPostButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/create-post")}
      className="ml-2 h-[49px] px-6 bg-[#6866FF] hover:bg-[#5755D6] text-white text-base font-medium rounded-[5px] transition-colors duration-200 flex items-center"
      style={{
        minWidth: 120,
        borderRadius: "5px",
      }}
    >
      + New Post
    </button>
  );
};

export default NewPostButton;