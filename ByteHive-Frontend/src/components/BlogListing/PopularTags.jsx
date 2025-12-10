import React from "react";

const TAGS = ["JavaScript", "React", "Web3", "Gaming", "AI", "Blockchain", "Python"];

const PopularTags = () => {
  return (
    <div className="bg-navbar-bg border border-navbar-border rounded-2xl p-5 md:p-6 z-0">
      <h3 className="font-fenix text-xl text-white mb-4">Popular Tags</h3>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <span
            key={tag}
            className="bg-periwinkle/20 text-periwinkle text-sm font-medium px-3 py-1 rounded-xl cursor-pointer hover:bg-periwinkle/30 transition-colors"
          >
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PopularTags;
