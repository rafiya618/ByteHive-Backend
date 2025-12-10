import React, { useState } from "react";

/**
 * Upvote / Downvote buttons (simple counters)
 * Uses index.css variables and Tailwind utilities.
 */
export default function VoteButtons({ initialUp = 142, initialDown = 12 }) {
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [userVote, setUserVote] = useState(null); // "up" | "down" | null

  function handleUp() {
    if (userVote === "up") {
      setUp((s) => s - 1);
      setUserVote(null);
    } else {
      setUp((s) => s + 1);
      if (userVote === "down") setDown((s) => s - 1);
      setUserVote("up");
    }
  }

  function handleDown() {
    if (userVote === "down") {
      setDown((s) => s - 1);
      setUserVote(null);
    } else {
      setDown((s) => s + 1);
      if (userVote === "up") setUp((s) => s - 1);
      setUserVote("down");
    }
  }

  return (
    <div className="flex items-center space-x-4 mt-6">
      <button
        onClick={handleUp}
        aria-label="Upvote"
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border border-periwinkle-light
          ${userVote === "up" ? "bg-medium-slate-blue text-white" : "bg-rich-black-light text-columbia-blue hover:bg-card-button-hover-bg"}`}
      >
        <span className="material-icons leading-none align-middle text-lg">arrow_upward</span>
        <span className="font-semibold">{up}</span>
      </button>

      <button
        onClick={handleDown}
        aria-label="Downvote"
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border border-periwinkle-light
          ${userVote === "down" ? "bg-pinkish text-white" : "bg-rich-black-light text-columbia-blue hover:bg-card-button-hover-bg"}`}
      >
        <span className="material-icons leading-none align-middle text-lg">arrow_downward</span>
        <span className="font-semibold">{down}</span>
      </button>
    </div>
  );
}
