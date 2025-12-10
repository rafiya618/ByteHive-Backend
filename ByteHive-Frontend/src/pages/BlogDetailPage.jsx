import React from "react";
import BlogDetail from "../components/PostDetail/BlogDetail";
import Navbar from "../shared/Navbar";

export default function BlogDetailPage() {
  return (
    <div className="bg-rich-black min-h-screen text-white">
      <Navbar />

      {/* Page Container */}
        <BlogDetail />
    </div>
  );
}
