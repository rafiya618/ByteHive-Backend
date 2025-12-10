import React from "react";

const LoadingState = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen bg-rich-black flex items-center justify-center">
      <div className="text-center">
        <span className="material-icons text-6xl text-columbia-blue animate-spin block mb-4">
          refresh
        </span>
        <h3 className="font-fenix text-2xl text-white mb-2">
          {message}
        </h3>
      </div>
    </div>
  );
};

export default LoadingState;