import React from "react";
import { useNavigate } from "react-router-dom";

const NewCommunityButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/create-community")}
      className="ml-2 h-[49px] px-6 bg-[#6866FF] hover:bg-[#5755D6] text-white text-base font-medium rounded-[5px] transition-colors duration-200 flex items-center"
      style={{
        minWidth: 160,
        borderRadius: "5px",
      }}
    >
      + Create Community
    </button>
  );
};

export default NewCommunityButton;