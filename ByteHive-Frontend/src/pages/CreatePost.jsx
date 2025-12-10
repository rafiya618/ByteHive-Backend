import React from "react";
import Navbar from "../shared/Navbar";
import PostFormCard from "../components/CreatePost/PostFormCard";
import SidebarCard from "../shared/SidebarCard";

const CreatePost = () => {
  return (
    <div className="min-h-screen bg-rich-black flex flex-col">
      <Navbar />

      <div className="w-full flex justify-center px-4 lg:px-8 py-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
          {/* Left - Form */}
          <div className="flex-1">
            <PostFormCard />
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
              title="Host Events"
              description="Organize virtual events, workshops, and meetups for your community members."
              buttonText="Add an Event"
              icon="event"
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
