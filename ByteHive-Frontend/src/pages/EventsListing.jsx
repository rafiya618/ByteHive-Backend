import React, { useState } from "react";
import Navbar from "../shared/Navbar";
import SearchBar from "../shared/SearchBar";
import NewEventButton from "../components/EventListing/NewEventButton";
import EventCard from "../components/EventListing/EventCard";
import BlogFilterBar from "../components/BlogListing/BlogFilterBar";

const EVENTS = [
  {
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",
    type: "Conference",
    title: "NEXT JS Conference 2025",
    description: "Join the Next.js team and community for an exciting day of announcements, technical sessions, and workshops.",
    date: "Mar 10, 2025",
    time: "9:00 AM - 5:00 PM",
    location: "Online",
  },
  {
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80",
    type: "Conference",
    title: "React Summit",
    description: "The biggest React conference worldwide. Two days of in-depth talks, workshops, and networking.",
    date: "Mar 15, 2025",
    time: "9:00 AM - 5:00 PM",
    location: "Amsterdam, Netherlands",
  },
  {
    image: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=600&q=80",
    type: "Hackathon",
    title: "ByteHive Gaming Hackathon",
    description: "Compete with developers worldwide to build innovative gaming solutions in 24 hours.",
    date: "Mar 20, 2025",
    time: "10:00 AM - 10:00 PM",
    location: "Online",
  },
];

const FILTERS = ["All", "Recommended", "Upcoming"];

const EventsListing = () => {
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);

  return (
    <div className="min-h-screen bg-rich-black flex flex-col">
      <Navbar />
    {/* Blurred Background Glow */}
  <div
    className="absolute z-0"
    style={{
      width: 637,
      height: 300,
      top: -38,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#1A1842B3",
      filter: "blur(100px)",
      boxShadow: "0px 4px 100px 500px #00000066",
      borderRadius: 30,
      pointerEvents: "none",
    }}
  />
      {/* Header Section */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-9">
          {/* Title */}
          <div className="z-10">
            <h2 className="font-fenix text-[28px] text-white font-normal text-center md:text-left">Events</h2>
            <p className="text-desc font-lato text-center">Discover hackathons, workshops, conferences, and more.</p>
          </div>

         {/* Search + Button */}
          <div className="flex items-center gap-1 w-full md:w-[600px] z-10">
            <SearchBar className="flex-1 max-w-xs sm:max-w-md" />
            <NewEventButton />
          </div>

        </div>

        {/* Filter Bar */}
        <BlogFilterBar
          filters={FILTERS}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </div>

      {/* Events Grid */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENTS.map((event, i) => (
            <EventCard key={i} {...event} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsListing;
