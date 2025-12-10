import React from "react";

const UpcomingEvents = () => {
  const events = [
    { name: "React Summit",        date: "Mar 10, 2025", location: "Online" },
    { name: "GameDev Hackathon",   date: "Mar 15, 2025", location: "Online" },
    { name: "AI Workshop",         date: "Mar 22, 2025", location: "LA" },
    { name: "Next.js Conference",  date: "Mar 23, 2025", location: "Online" },
    { name: "Developer Meetup",    date: "Mar 25, 2025", location: "USA" },
  ];

  return (
    <div className="bg-navbar-bg border border-navbar-border rounded-2xl p-5 md:p-6 z-0">
      {/* Header */}
      <div className="flex justify-between items-baseline mb-6 gap-16">
        <h3 className="font-fenix text-xl text-white">Upcoming Events</h3>
        <a
          href="/events"
          className="text-periwinkle text-sm hover:text-columbia-blue transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          See all <span aria-hidden>→</span>
        </a>
      </div>

      {/* List */}
      <ul className="space-y-3">
        {events.map((event, idx) => (
          <li key={idx} className="flex items-center justify-between">
            {/* Left: title + meta */}
            <div className="min-w-0 pr-2">
              <div className="text-desc font-lato font-medium  text-[16px] leading-tight truncate">
                {event.name}
              </div>
              <div className="font-lato opacity-60 text-periwinkle text-[14px] mt-1">
                {event.date} <span className="opacity-30">-</span> {event.location}
              </div>
            </div>

            {/* Right: Details button */}
            <button
              className="
                group flex items-center gap-1
                text-periwinkle text-[14px] font-lato
                px-2 py-1 rounded-xl
                border-2 border-navbar-border hover:border-periwinkle
    
                transition-colors
              "
              aria-label={`View details for ${event.name}`}
            >
              <span>Details</span>
              <span className="material-icons text-base leading-none">expand_more</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UpcomingEvents;
