import React from "react";

const EventCard = ({ image, type, title, description, date, time, location }) => {
  return (
    <div className="bg-navbar-bg border border-navbar-border rounded-2xl overflow-hidden shadow-md flex flex-col">
      {/* Image */}
      <div className="h-48 w-full">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Tag */}
        <span className="bg-chip text-white/80 text-xs px-3 py-1 rounded-xl w-fit">
          {type}
        </span>

        {/* Title */}
        <h3 className="font-fenix text-lg text-white">{title}</h3>

        {/* Description */}
        <p className="text-desc text-sm flex-1">
          {description}
        </p>

        {/* Details */}
        <div className="text-sm text-periwinkle space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-icons text-base">event</span>
            {date}
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-base">schedule</span>
            {time}
          </div>
          <div className="flex items-center gap-2">
            <span className="material-icons text-base">place</span>
            {location}
          </div>
        </div>

        {/* Button */}
        <button className="mt-4 bg-[var(--card-button-bg)] hover:bg-[var(--card-button-hover-bg)] text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors">
          View Event <span className="material-icons text-sm">open_in_new</span>
        </button>
      </div>
    </div>
  );
};

export default EventCard;
