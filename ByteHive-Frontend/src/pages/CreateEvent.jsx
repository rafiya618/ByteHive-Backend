import React from "react";
import Navbar from "../shared/Navbar";
import EventFormCard from "../components/CreateEvent/EventFormCard";
import SidebarCard from "../shared/SidebarCard";

const CreateEvent = () => {
  return (
    <div className="min-h-screen bg-rich-black flex flex-col">
      <Navbar />

      <div className="w-full flex justify-center px-4 lg:px-8 py-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
          {/* Left - Form */}
          <div className="flex-1">
            <EventFormCard />
          </div>

          {/* Right - Sidebar */}
          <aside className="w-full lg:w-[320px] flex flex-col gap-6">
            <SidebarCard
              title="Create Communities"
              description="Build and grow your own community around specific interests and topics."
              buttonText="Create a Community"
              icon="group_add"
            />
            <SidebarCard
              title="Create Posts"
              description="Engage your audience by sharing posts, updates, and announcements related to your event."
              buttonText="Create a Post"
              icon="edit"
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
