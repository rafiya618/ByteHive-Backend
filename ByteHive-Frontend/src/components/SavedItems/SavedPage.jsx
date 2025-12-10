import React, { useState, useEffect } from "react";
import SavedFilterBar from "./SavedFilterBar";
import SearchBar from "../../shared/SearchBar";
import BlogCard from "../BlogListing/BlogCard";
import { getSavedPosts } from "../../api/curationApi";
import LoadingState from "../../shared/LoadingState.jsx";

const FILTERS = ["All Items", "Saved", "Watch Later"];

const SavedPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);

  const formatPostData = (savedPostItem) => {
    // Extract post details from the new response format
    const post = savedPostItem.postDetails || savedPostItem;
    
    console.log('formatPostData - saved item:', savedPostItem);
    console.log('formatPostData - post details:', post);
    
    return {
      ...post,
      id: post._id || post.postId,
      postId: post._id || post.postId,
      savedAt: savedPostItem.savedAt,
      category: savedPostItem.category,
      date: new Date(savedPostItem.savedAt || post.createdAt || post.date).toLocaleDateString(),
      // Use actual post data, with fallbacks for missing fields
      // Map the correct field names from posts service
      title: post.post_title || post.title || `Untitled Post`,
      // Use small_description for preview (it's plain text), fall back to post_description with HTML stripped
      description: post.small_description || 
                   (post.post_description ? post.post_description.replace(/<[^>]*>/g, '') : '') || 
                   post.description || 
                   post.excerpt || 
                   `A saved post from your collection`,
      image: post.thumbnail || post.image || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80',
      community: post.community?.name || post.community || 'General',
      readTime: post.readTime || `5 min read`,
      tags: post.tags || [],
      author: post.author || { name: 'Unknown', avatar: '' },
      upvotes: post.upvotes?.length || post.likes || 0,
      downvotes: post.downvotes?.length || 0,
      comments: post.comments?.length || post.commentsCount || post.comments || 0,
      views: post.views || post.viewCount || 0,
      user_id: post.user_id || post.userId
    };
  };


  // Ref to trigger reload from BlogCard
  const [reloadFlag, setReloadFlag] = useState(0);

  const fetchSavedPosts = async (category = null) => {
    try {
      setLoading(true);
      const response = await getSavedPosts(category === "All Items" ? undefined : category);
      console.log('getSavedPosts raw response:', response);
      const postsData = response.data || response || [];
      console.log('Posts data extracted:', postsData);
      const formattedPosts = Array.isArray(postsData) ? postsData.map(formatPostData) : [];
      console.log('Formatted posts:', formattedPosts);
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchSavedPosts(selectedFilter);
  }, [selectedFilter, reloadFlag]);


  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchSavedPosts(selectedFilter);
      return;
    }

    try {
      setLoading(true);
      // Fetch all posts for the selected filter
      const response = await getSavedPosts(selectedFilter === "All Items" ? undefined : selectedFilter);
      const postsData = response.data || response || [];
      const formattedPosts = Array.isArray(postsData) ? postsData.map(formatPostData) : [];
      // Filter by search term (title or description)
      const filtered = formattedPosts.filter(post =>
        (post.title && post.title.toLowerCase().includes(query.toLowerCase())) ||
        (post.description && post.description.toLowerCase().includes(query.toLowerCase()))
      );
      setPosts(filtered);
    } catch (error) {
      console.error('Error searching saved posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading saved posts..." />;
  }


  // Handler to trigger reload from BlogCard
  const handleReload = (removedId) => {
    // Optimistically remove the post from UI
    setPosts((prev) => prev.filter((p) => p.id !== removedId));
    // Do not trigger reload, just update UI immediately
  };

  return (
    <div className="min-h-screen bg-rich-black text-white relative">
      {/* Background Glow Effect */}
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
      <div className="container mx-auto px-5 sm:px-7 lg:px-10 py-8 relative z-10">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
            <div>
              <h1 className="font-fenix text-[28px] text-white mb-1">
                Saved Items
              </h1>
              <p className="text-desc text-base">
                Access your bookmarked content anytime
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-[500px]">
              <SearchBar 
                placeholder="Search saved posts..."
                value={searchQuery}
                onSearch={handleSearch}
              />
            </div>
          </div>
          {/* Filter Bar */}
          <div className="mt-4">
            <SavedFilterBar 
              filters={FILTERS}
              selected={selectedFilter}
              onSelect={setSelectedFilter}
            />
          </div>
        </div>

        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-icons text-6xl text-columbia-blue mb-4 block">
                {searchQuery ? "search_off" : "bookmark_border"}
              </span>
              <h3 className="font-fenix text-2xl text-white mb-2">
                {searchQuery ? "No items found" : "No saved items yet"}
              </h3>
              <p className="text-columbia-blue">
                {searchQuery ? "Try a different search or filter." : "Start bookmarking posts to see them here"}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <BlogCard
                key={post.postId && post._id ? `${post.postId}_${post._id}` : post.id}
                id={post.postId || post._id}
                image={post.image}
                community={post.community}
                date={post.date}
                readTime={post.readTime}
                title={post.title}
                description={post.description}
                tags={post.tags}
                author={post.author}
                upvotes={post.upvotes}
                downvotes={post.downvotes}
                comments={post.comments}
                views={post.views}
                user_id={post.user_id}
                onSavedChange={() => handleReload(post.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPage;