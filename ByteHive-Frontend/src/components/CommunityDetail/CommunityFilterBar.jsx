import React from "react";

const CommunityFilterBar = ({ filters = [], selected, onSelect }) => {
  return (
    <div className="flex gap-6 flex-wrap">
      {filters.map((filter) => {
        const isSelected = selected === filter;
        return (
          <button
            key={filter}
            className="font-lato text-lg px-2 pb-1 border-b-2 transition-all"
            style={{
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? "var(--periwinkle)" : "var(--columbia-blue)",
              borderColor: isSelected ? "var(--periwinkle)" : "transparent",
              opacity: isSelected ? 1 : 0.85,
            }}
            onClick={() => onSelect(filter)}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
};

export default CommunityFilterBar;