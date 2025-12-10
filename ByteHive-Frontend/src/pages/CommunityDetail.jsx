import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth";
import Navbar from "../shared/Navbar";
import CommunityFilterBar from "../components/CommunityDetail/CommunityFilterBar";
import BlogCard from "../components/BlogListing/BlogCard";
import MemberCard from "../components/CommunityDetail/MemberCard";
import FollowingButton from "../components/CommunityDetail/FollowingButton";
import JoinChatButton from "../components/CommunityDetail/JoinChatButton";
import VideoRoomButton from "../components/CommunityDetail/VideoRoomButton";
import NewPostButton from "../shared/NewPostButton";
import { communityApi } from "../api/communityApi";
import { postsApi } from "../api/postsApi";
import { getProfile } from "../api/ProfileApi";

const FILTERS = ["Posts", "Members", "About"];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80";

const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth, loading: authLoading } = useAuth(); // Use auth context directly
  
  const [selectedFilter, setSelectedFilter] = useState("Posts");
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);

  // Initialize auth check and fetch community data
  useEffect(() => {
    if (!authLoading && !auth?.token) {
      navigate('/login', { 
        state: { from: `/community/${id}` },
        replace: true 
      });
      return;
    }
    
    if (!authLoading && auth?.token) {
      fetchCommunityData();
    }
  }, [id, auth, authLoading, navigate]);

  // Fetch community posts when community is loaded or filter changes to Posts
  useEffect(() => {
    if (community && selectedFilter === "Posts") {
      fetchCommunityPosts();
    }
  }, [community, selectedFilter]);

  // Fetch member profiles when community loads or Members tab is selected
  useEffect(() => {
    if (community && selectedFilter === "Members" && community.members && community.members.length > 0) {
      fetchMemberProfiles();
    }
  }, [community, selectedFilter]);

  const fetchCommunityData = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await communityApi.getCommunityDetails(id);
      setCommunity(response.community);
      
      // Check if user is following this community
      const isUserFollowing = response.community.members?.includes(auth.user?._id);
      setIsFollowing(isUserFollowing);
      
    } catch (err) {
      console.error('Error fetching community details:', err);
      setError('Failed to load community details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityPosts = async () => {
    if (!id) return;
    
    setPostsLoading(true);
    try {
      console.log('=== Starting fetchCommunityPosts ===');
      console.log('Community ID:', id);
      console.log('Current community data:', community);
      
      // Step 1: Try to get the community's post IDs using the posts endpoint
      let postIds = [];
      
      try {
        console.log('Step 1: Attempting to get posts via getCommunityPosts API...');
        const communityPostsResponse = await communityApi.getCommunityPosts(id);
        console.log('getCommunityPosts response:', communityPostsResponse);
        postIds = communityPostsResponse.community?.posts || [];
        console.log('Post IDs from API:', postIds);
      } catch (apiError) {
        console.warn('getCommunityPosts API failed, trying fallback:', apiError);
      }
      
      // Step 1.5: Fallback - if no posts from API, try using community data we already have
      if (postIds.length === 0 && community?.posts) {
        console.log('Fallback: Using posts from existing community data:', community.posts);
        postIds = community.posts;
      }
      
      // Step 1.75: Last resort fallback - refresh community details and get posts
      if (postIds.length === 0) {
        try {
          console.log('Last resort: Fetching fresh community details...');
          const freshCommunityResponse = await communityApi.getCommunityDetails(id);
          console.log('Fresh community response:', freshCommunityResponse);
          
          if (freshCommunityResponse.community?.posts) {
            postIds = freshCommunityResponse.community.posts;
            console.log('Post IDs from fresh community details:', postIds);
            
            // Update the community state with fresh data
            setCommunity(freshCommunityResponse.community);
          }
        } catch (fallbackError) {
          console.error('Fresh community details fetch failed:', fallbackError);
        }
      }
      
      console.log('Final post IDs to fetch:', postIds);
      
      if (postIds.length === 0) {
        console.log('No post IDs found, setting empty posts array');
        setPosts([]);
        return;
      }

      // Step 2: Fetch full post details for each post ID
      console.log('Step 2: Fetching full post details...');
      const postPromises = postIds.map(async (postId, index) => {
        try {
          console.log(`Fetching post ${index + 1}/${postIds.length}: ${postId}`);
          const response = await postsApi.getPostById(postId);
          console.log(`Post ${postId} response:`, response);
          return response.ok ? response.post : null;
        } catch (error) {
          console.error(`Error fetching post ${postId}:`, error);
          return null;
        }
      });

      const postResponses = await Promise.all(postPromises);
      const validPosts = postResponses.filter(post => post !== null);
      
      console.log('Valid posts fetched:', validPosts.length);
      console.log('Post details:', validPosts);

      // Step 3: Transform posts to match BlogCard expected format
      const transformedPosts = validPosts.map((post) => {
        const transformed = {
          id: post._id,
          image: post.thumbnail || DEFAULT_IMAGE,
          community: post.community || community?.community_name || "",
          date: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : "",
          readTime: post.read_time || "6 min",
          title: post.post_title || "",
          description: post.small_description || "",
          tags: Array.isArray(post.tags) ? post.tags : [],
          author: {
            name: "Loading...",
            avatar: "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff",
          },
          upvotes: post.upvotes || 0,
          downvotes: post.downvotes || 0,
          comments: post.comments || 0,
          views: post.views || 0,
          bookmarked: false,
          user_id: post.user_id // Pass user_id to BlogCard for profile fetching
        };
        console.log('Transformed post with user_id:', transformed);
        return transformed;
      });

      console.log('Final transformed posts with user_id:', transformedPosts);
      setPosts(transformedPosts);
      console.log('=== fetchCommunityPosts completed ===');
      
    } catch (err) {
      console.error('Error in fetchCommunityPosts:', err);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchMemberProfiles = async () => {
    if (!community?.members || community.members.length === 0) {
      console.log('No members to fetch profiles for');
      return;
    }

    setMembersLoading(true);
    try {
      console.log('Fetching profiles for community members:', community.members);
      
      const memberIds = community.members.filter(Boolean);
      
      if (memberIds.length === 0) {
        console.log('No valid member IDs found');
        return;
      }

      const profilePromises = memberIds.map(async (memberId) => {
        try {
          console.log(`Fetching profile for member: ${memberId}`);
          // Use getProfile by passing an object with user_id as requested
          const profileRes = await getProfile({ userId: memberId });
          console.log(`Profile response for member ${memberId}:`, profileRes);

          const profile = profileRes?.data;

          if (profile) {
            return { 
              id: memberId, 
              ...profile,
              name: profile.name || profile.user?.name || profile.username || "Unknown User",
              avatar: profile.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || profile.username || 'User')}&background=0D8ABC&color=fff`,
              bio: profile.bio || "No bio available",
              joinDate: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown",
              email: profile.user?.email || profile.email || "Email not available"
            };
          } else {
            console.log(`No profile data found for member: ${memberId}`);
            return {
              id: memberId,
              name: "Unknown User",
              avatar: `https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff`,
              bio: "Profile unavailable",
              joinDate: "Unknown",
              email: "Email not available"
            };
          }
        } catch (error) {
          // Handle 404 (not found) and other errors gracefully
          if (error?.response?.status === 404) {
            console.warn(`Profile not found for member ${memberId}:`, error.response?.data);
          } else {
            console.error(`Error fetching profile for member ${memberId}:`, error);
          }
          return {
            id: memberId,
            name: "Unknown User",
            avatar: `https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff`,
            bio: "Profile unavailable",
            joinDate: "Unknown",
            email: "Email not available"
          };
        }
      });

      const memberProfilesData = await Promise.all(profilePromises);
      const profilesMap = {};
      
      memberProfilesData.forEach(profile => {
        profilesMap[profile.id] = profile;
      });

      console.log('Member profiles loaded:', profilesMap);
      setMemberProfiles(profilesMap);
    } catch (error) {
      console.error('Error fetching member profiles:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        // Use auth.user._id instead of getUserIdFromToken()
        await communityApi.unfollowCommunity(id, auth.user._id);
        setIsFollowing(false);
        // Update local community data with auth.user._id
        setCommunity(prev => ({
          ...prev,
          members: prev.members?.filter(memberId => memberId !== auth.user._id) || [],
          no_of_followers: Math.max(0, (prev.no_of_followers || 1) - 1)
        }));
      } else {
        // Use auth.user._id instead of getUserIdFromToken()
        await communityApi.followCommunity(id, auth.user._id);
        setIsFollowing(true);
        // Update local community data with auth.user._id
        setCommunity(prev => ({
          ...prev,
          members: [...(prev.members || []), auth.user._id],
          no_of_followers: (prev.no_of_followers || 0) + 1
        }));
      }
    } catch (err) {
      console.error('Error toggling follow status:', err);
      setError(`Failed to ${isFollowing ? 'unfollow' : 'follow'} community. Please try again.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!auth?.token) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white text-lg">Loading community...</div>
      </div>
    );
  }

  // Error state
  if (error && !community) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button 
            onClick={fetchCommunityData}
            className="px-4 py-2 bg-periwinkle text-white rounded-lg hover:bg-periwinkle/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No community found
  if (!community) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-desc text-lg mb-4">Community not found</div>
        </div>
      </div>
    );
  }

  const isOwner = community?.user_id === auth.user._id || community?.user_id?._id === auth.user._id;

  const renderContent = () => {
    switch (selectedFilter) {
      case "Posts":
        return (
          <div className="flex flex-col gap-6 pb-12">
            <div className="flex justify-between items-center">
              <h2 className="font-fenix text-3xl md:text-4xl text-white font-normal">Community Posts</h2>
              <NewPostButton />
            </div>
            
            {postsLoading ? (
              <div className="text-center text-desc py-8">
                Loading posts...
              </div>
            ) : (
              <div className="flex flex-col gap-7">
                {posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <BlogCard
                      key={post.id}
                      {...post}
                    />
                  ))
                ) : (
                  <div className="text-center text-desc py-8">
                    No posts found in this community.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case "Members":
        return (
          <div className="flex flex-col gap-6 pb-12">
            <div className="flex justify-between items-center">
              <h2 className="font-fenix text-3xl md:text-4xl text-white font-normal">Community Members</h2>
              {membersLoading && (
                <div className="text-desc text-sm">Loading member profiles...</div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {community.members && community.members.length > 0 ? (
                // Sort members: Admin first, then moderators, then regular members
                community.members
                  .map(memberId => {
                    const memberProfile = memberProfiles[memberId];
                    const isAdmin = community.user_id === memberId || community.user_id?._id === memberId;
                    const isModerator = community.moderators && community.moderators.includes(memberId);
                    
                    return {
                      memberId,
                      memberProfile,
                      isAdmin,
                      isModerator,
                      sortOrder: isAdmin ? 0 : (isModerator ? 1 : 2) // Admin = 0, Moderator = 1, Member = 2
                    };
                  })
                  .sort((a, b) => a.sortOrder - b.sortOrder) // Sort by role priority
                  .map(({ memberId, memberProfile, isAdmin, isModerator }) => (
                    <MemberCard 
                      key={memberId} 
                      id={memberId}
                      name={memberProfile?.name || (membersLoading ? "Loading..." : "Unknown User")}
                      avatar={memberProfile?.avatar || "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff"}
                      username={memberProfile?.username || ""}
                      isAdmin={isAdmin}
                      isModerator={isModerator}
                      loading={membersLoading && !memberProfile}
                    />
                  ))
              ) : (
                <div className="col-span-full text-center text-desc py-8">
                  No members found in this community.
                </div>
              )}
            </div>
          </div>
        );
        
      case "About":
        return (
          <div className="pb-12">
            <h2 className="font-fenix text-3xl md:text-4xl text-white font-normal mb-8">About the Community</h2>
            <div 
              className="bg-navbar-bg rounded-xl p-8 border"
              style={{
                border: "1px solid var(--navbar-border)",
              }}
            >
              <div className="space-y-6 text-columbia-blue">
                <p className="font-lato text-lg leading-relaxed">
                  {community.description}
                </p>
                
                <div>
                  <h4 className="font-lato font-semibold text-white text-lg mb-3">Community Settings</h4>
                  <ul className="space-y-2 font-lato">
                    <li className="flex items-start">
                      <span className="text-periwinkle mr-2">•</span>
                      Visibility: {community.visible === 'public' ? 'Public' : 'Private'}
                    </li>
                    <li className="flex items-start">
                      <span className="text-periwinkle mr-2">•</span>
                      Moderation: {community.moderation}
                    </li>
                    {community.community_tags && community.community_tags.length > 0 && (
                      <li className="flex items-start">
                        <span className="text-periwinkle mr-2">•</span>
                        Tags: {community.community_tags.join(', ')}
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-lato font-semibold text-white text-lg mb-3">Community Admin</h4>
                  <p className="font-lato leading-relaxed">
                    Created by {community.user_id?.username || 'Unknown'} 
                    {community.createdAt && ` on ${new Date(community.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-rich-black flex flex-col relative">
      <Navbar />

      {/* Background Glow */}
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

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Community Header */}
      <div className="w-full flex justify-center pt-8 pb-6 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-7xl">
          {/* Community Info */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Left: Avatar + Info */}
              <div className="flex items-start gap-8 flex-1">
                <img
                  src={community?.image || DEFAULT_IMAGE}
                  alt={community?.community_name}
                  className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover flex-shrink-0 ml-8"
                />
                <div className="flex-1">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6">
                    <h1 className="font-fenix text-3xl md:text-4xl text-white font-normal mb-4 lg:mb-0">
                      {community?.community_name}
                    </h1>
                    
                    {/* Action Buttons - positioned at title level */}
                    <div className="flex gap-3 flex-shrink-0">
                      <button
                        onClick={handleFollowToggle}
                        className={`px-4 py-2 rounded-lg font-lato font-medium text-sm border transition-colors ${
                          isFollowing
                            ? isOwner 
                              ? "border-periwinkle bg-transparent text-periwinkle cursor-default"
                              : "border-periwinkle bg-transparent text-periwinkle hover:bg-periwinkle/10"
                            : "border-white bg-transparent text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-center">
                          <span className="material-icons text-base mr-1">
                            {isFollowing ? "check" : "add"}
                          </span>
                          {isFollowing ? (isOwner ? "Admin" : "Following") : "Follow"}
                        </span>
                      </button>
                      <JoinChatButton />
                      <VideoRoomButton />
                    </div>
                  </div>
                  
                  {/* Description spans full width under buttons */}
                  <p className="font-lato text-columbia-blue text-base md:text-lg leading-relaxed mb-6 pr-4">
                    {community?.description}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6 text-periwinkle font-lato text-sm flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-base">people</span>
                      <span>{community?.no_of_followers?.toLocaleString() || 0} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-base">article</span>
                      <span>{community?.no_of_posts?.toLocaleString() || 0} posts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-icons text-base">visibility</span>
                      <span>{community?.no_of_views?.toLocaleString() || 0} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full flex justify-center px-4 lg:px-8">
        <div className="w-full max-w-7xl">
          {/* Filter Bar */}
          <div className="mb-8">
            <CommunityFilterBar
              filters={FILTERS}
              selected={selectedFilter}
              onSelect={setSelectedFilter}
            />
          </div>

          {/* Dynamic Content */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;