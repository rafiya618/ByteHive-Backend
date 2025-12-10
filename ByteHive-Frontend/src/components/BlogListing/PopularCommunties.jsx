import React from "react";

const PopularCommunities = () => {
  const communities = [
    { name: "Next.js Devs", action: "Join" },
    { name: "Game Designers", action: "Join" },
    { name: "AI Enthusiasts", action: "Join" },
  ];

  return (
    <div className="bg-navbar-bg border border-navbar-border rounded-2xl p-5 md:p-6 z-0">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-6 gap-16">
        <h3 className="font-fenix text-xl text-white">Popular Communities</h3>
        <a
          href="#"
          className="text-periwinkle text-sm hover:text-columbia-blue transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          See all <span aria-hidden>→</span>
        </a>
      </div>

      {/* Communities list */}
      <ul className="space-y-4">
        {communities.map((community, index) => (
          <li key={index} className="flex justify-between items-center">
            {/* Left: avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--periwinkle)] text-rich-black font-semibold">
                {community.name.charAt(0)}
              </div>
              <span className="text-desc font-lato font-medium  text-[16px]">{community.name}</span>
            </div>

            {/* Join button */}
            <button
              className="
                px-5 py-1
                rounded-xl
                border-2 border-navbar-border
                text-periwinkle text-[15px]
                hover:text-white
                hover:border-periwinkle
                transition-colors
              "
            >
              {community.action}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PopularCommunities;
