import React, { useState, useEffect } from "react";
import SearchBar from "../shared/SearchBar";
import NewPostButton from "../shared/NewPostButton";
import Navbar from "../shared/Navbar";
import BlogCard from "../components/BlogListing/BlogCard";
import BlogFilterBar from "../components/BlogListing/BlogFilterBar";
import PopularTags from "../components/BlogListing/PopularTags";
import PopularCommunities from "../components/BlogListing/PopularCommunties";
import UpcomingEvents from "../components/BlogListing/UpcomingEvents";
import axios from "axios";

// Filters
const FILTERS = ["All", "Popular", "Newest"];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80";

const BlogListing = () => {
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [blogs, setBlogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    // Fetch blogs from API
    const fetchBlogs = async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await axios.get("http://localhost:5000/api/posts");
        setBlogs(
  Array.isArray(res.data.posts)
    ? res.data.posts.map((post) => ({
        id: post._id,   // ✅ here
        image: post.thumbnail || DEFAULT_IMAGE,
        community: post.community || "",
        date: post.createdAt
          ? new Date(post.createdAt).toLocaleDateString()
          : "",
        readTime: post.read_time || "6 min",   // ✅ use correct field from DB
        title: post.post_title || "",
        description: post.small_description || "",
        tags: post.tags || [],
        author: post.author || {
          name: "Unknown",
          avatar:
            "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff",
        },
        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        comments: post.comments || 0,
        views: post.views || 0,
        bookmarked: false,
      }))
    : []
);

      } catch (err) {
        setBlogs([]);
        setErr(
          err?.response?.data?.error ||
          err?.message ||
          "Failed to fetch blogs. Please try again."
        );
      }
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  return (
    <div className="min-h-screen bg-rich-black flex flex-col relative">
      <Navbar />

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
      {/* Header */}
      <div className="w-full flex justify-center pt-8 pb-6 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Blurred Background Glow */}
        <div className="w-full max-w-7xl z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Row 1: Title */}
          <h2 className="font-fenix text-[28px] text-white font-normal text-center md:text-left">
            Your Feed
          </h2>

          {/* Row 2: Search + Post */}
          <div className="flex justify-center items-center gap-2 w-full md:flex-1 md:justify-center md:px-12">
            <SearchBar
              className="flex-1 max-w-xs sm:max-w-md"
              placeholder="Search posts"
              onSearch={(q) => setSearchQuery(q)}
            />
            <NewPostButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full flex justify-center px-4 lg:px-8">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
          {/* Left Column - Blog Feed */}
          <div className="flex-1 lg:max-w-3xl">
            {/* Filter */}
            <div className="mb-6">
              <BlogFilterBar
                filters={FILTERS}
                selected={selectedFilter}
                onSelect={setSelectedFilter}
              />
            </div>
            <div className="flex flex-col gap-7 pb-12">
              {loading ? (
                <div className="text-white text-center py-8">Loading blogs...</div>
              ) : err ? (
                <div className="text-red-400 text-center py-8">{err}</div>
              ) : blogs.length === 0 ? (
                <div className="text-white text-center py-8">No blogs found.</div>
              ) : (
                // filter blogs by searchQuery
                (blogs
                  .filter((b) => {
                    if (!searchQuery || !searchQuery.trim()) return true;
                    const q = searchQuery.trim().toLowerCase();
                    return (
                      (b.title || "").toLowerCase().includes(q) ||
                      (b.description || "").toLowerCase().includes(q) ||
                      (b.community || "").toLowerCase().includes(q) ||
                      (b.tags || []).some((t) => t.toLowerCase().includes(q))
                    );
                  })
                  .map((blog) => <BlogCard key={blog.id} {...blog} />)
                )
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col gap-6">
            <PopularTags />
            <PopularCommunities />
            <UpcomingEvents />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BlogListing;