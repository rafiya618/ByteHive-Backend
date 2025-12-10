// Removed hardcoded data and integrated real communities fetching from backend APIs
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";
import SearchBar from "../shared/SearchBar";
import NewCommunityButton from "../shared/NewCommunityButton";
import Navbar from "../shared/Navbar";
import CommunityCard from "../components/CommunityListing/CommunityCard";
import CommunityFilterBar from "../components/CommunityListing/CommunityFilterBar";
import { communityApi } from "../api/communityApi";

const FILTERS = ["Your Communities", "Discover Communities"];

const Communities = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, loading: authLoading } = useAuth();
  
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [userCommunities, setUserCommunities] = useState({ owned: [], followed: [] });
  const [discoverCommunities, setDiscoverCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchUserCommunities = React.useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching user communities with auth token...', forceRefresh ? '(force refresh)' : '');
      console.log('Current authenticated user:', auth.user);
      const response = await communityApi.getUserCommunities(searchQuery, forceRefresh);
      console.log('User communities response:', response);
      console.log('Owned communities count:', (response.owned || []).length);
      console.log('Followed communities count:', (response.followed || []).length);
      
      // Log each owned community to see the structure
      if (response.owned && response.owned.length > 0) {
        console.log('Owned communities details:', response.owned.map(c => ({
          id: c._id,
          name: c.community_name,
          user_id: c.user_id,
          owner_id: c.owner_id,
          created_by: c.created_by
        })));
      }
      
      setUserCommunities({
        owned: response.owned || [],
        followed: response.followed || []
      });
    } catch (err) {
      console.error('Error fetching user communities:', err);
      setError('Failed to load your communities. Please try again.');
      setUserCommunities({ owned: [], followed: [] });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, auth.user]);

  const fetchDiscoverCommunities = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await communityApi.discoverCommunities({
        search: searchQuery,
        page: 1,
        limit: 20,
        visible: 'public'
      });
      setDiscoverCommunities(response.communities || []);
    } catch (err) {
      console.error('Error fetching discover communities:', err);
      setError('Failed to load communities. Please try again.');
      setDiscoverCommunities([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Check authentication and initialize
  useEffect(() => {
    console.log('Auth state check:', { authLoading, authToken: auth?.token, authUser: auth?.user });
    
    if (!authLoading && !auth?.token) {
      console.log('No auth token, redirecting to login');
      navigate('/login', { 
        state: { from: '/communities' },
        replace: true 
      });
      return;
    }
    
    if (!authLoading && auth?.token) {
      console.log('Auth token found, initializing communities page');
      setIsInitialized(true);
    }
  }, [auth, authLoading, navigate]);

  // Handle refresh trigger from community creation
  useEffect(() => {
    if (location.state?.refreshCommunities && isInitialized) {
      console.log('Refreshing communities after creation:', location.state.newCommunity);
      // Force refresh of user communities to show the newly created community
      if (selectedFilter === "Your Communities") {
        fetchUserCommunities(true); // Force refresh
      } else {
        fetchDiscoverCommunities();
      }
      // Clear the navigation state to prevent repeated refreshes
      navigate('/communities', { replace: true, state: {} });
    }
  }, [location.state, isInitialized, selectedFilter, fetchUserCommunities, fetchDiscoverCommunities, navigate]);

  // Fetch data when component mounts or filter/search changes
  useEffect(() => {
    if (isInitialized && auth?.token) {
      if (selectedFilter === "Your Communities") {
        fetchUserCommunities();
      } else {
        fetchDiscoverCommunities();
      }
    }
  }, [isInitialized, selectedFilter, searchQuery, auth?.token, fetchUserCommunities, fetchDiscoverCommunities]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFollowToggle = async (communityId, wasFollowing) => {
    try {
      if (wasFollowing) {
        await communityApi.unfollowCommunity(communityId);
        
        // Update local state - remove from followed
        setUserCommunities(prev => ({
          ...prev,
          followed: prev.followed.filter(community => community._id !== communityId)
        }));
        
        // If we're on discover view, refresh to show the unfollowed community
        if (selectedFilter === "Discover Communities") {
          fetchDiscoverCommunities();
        }
        
      } else {
        await communityApi.followCommunity(communityId);
        
        // Update local state - find community and add to followed
        const communityToFollow = discoverCommunities.find(c => c._id === communityId);
        if (communityToFollow) {
          const updatedCommunity = { 
            ...communityToFollow, 
            members: [...(communityToFollow.members || []), auth.user._id],
            no_of_followers: communityToFollow.no_of_followers + 1
          };
          
          setUserCommunities(prev => ({
            ...prev,
            followed: [...prev.followed, updatedCommunity]
          }));
        }
        
        // Refresh discover communities to remove the followed one
        if (selectedFilter === "Discover Communities") {
          fetchDiscoverCommunities();
        }
      }
      
    } catch (err) {
      console.error('Error in follow/unfollow:', err);
      setError(`Failed to ${wasFollowing ? 'unfollow' : 'follow'} community. Please try again.`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteCommunity = async (communityId) => {
    try {
      await communityApi.deleteCommunity(communityId);
      
      // Remove from owned communities
      setUserCommunities(prev => ({
        ...prev,
        owned: prev.owned.filter(community => community._id !== communityId)
      }));
      
    } catch (err) {
      console.error('Error deleting community:', err);
      setError('Failed to delete community. Please try again.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateCommunity = async (communityId, updatedCommunity) => {
    // Update in owned communities
    setUserCommunities(prev => ({
      ...prev,
      owned: prev.owned.map(community => 
        community._id === communityId ? { ...community, ...updatedCommunity } : community
      )
    }));
  };

  // Get filtered communities based on selected filter
  const getFilteredCommunities = () => {
    if (selectedFilter === "Your Communities") {
      console.log('Filtering user communities:', { owned: userCommunities.owned, followed: userCommunities.followed });
      console.log('Authenticated user ID:', auth.user?._id);
      
      // Only show communities owned by the authenticated user
      const ownedWithFlags = (userCommunities.owned || [])
        .filter(community => {
          // Only check user_id field as per backend model
          const isOwner = community.user_id === auth.user?._id;
          console.log('🔍 Community ownership check:', {
            communityId: community._id,
            communityName: community.community_name,
            community_user_id: community.user_id,
            auth_user_id: auth.user?._id,
            isOwner
          });
          return isOwner;
        })
        .map(community => ({
          ...community,
          isFollowing: true,
          isOwned: true,
          memberCount: community.no_of_followers,
          postCount: community.no_of_posts,
          name: community.community_name,
          id: community._id
        }));

      // Only show communities followed by the authenticated user
      const followedWithFlags = (userCommunities.followed || [])
        .filter(community => {
          // Ensure this community is actually followed by the current user
          const isFollowed = community.members?.includes(auth.user?._id);
          console.log('Community follow check:', {
            communityId: community._id,
            communityName: community.community_name,
            members: community.members,
            auth_user_id: auth.user?._id,
            isFollowed
          });
          return isFollowed;
        })
        .map(community => ({
          ...community,
          isFollowing: true,
          isOwned: false,
          memberCount: community.no_of_followers,
          postCount: community.no_of_posts,
          name: community.community_name,
          id: community._id
        }));

      const result = [...ownedWithFlags, ...followedWithFlags];
      console.log('Filtered user communities result:', {
        ownedCount: ownedWithFlags.length,
        followedCount: followedWithFlags.length,
        totalCount: result.length,
        communities: result.map(c => ({ id: c.id, name: c.name, isOwned: c.isOwned }))
      });
      return result;
      
    } else {
      // Show discover communities (exclude user's own communities and ones user already follows)
      return discoverCommunities
        .filter(community => {
          // Exclude communities owned by the user
          const isOwnedByUser = community.user_id === auth.user?._id ||
                               community.owner_id === auth.user?._id ||
                               community.created_by === auth.user?._id;

          // Exclude communities the user already follows
          const isFollowedByUser = (userCommunities.followed || []).some(fc => fc._id === community._id) ||
                                   (community.members && community.members.includes(auth.user?._id));

          return !isOwnedByUser && !isFollowedByUser;
        })
        .map(community => {
          // Check if user is already following this community (should be false because we filtered them out,
          // but keep the check for safety if userCommunities is out-of-date)
          const isFollowing = (userCommunities.followed || []).some(fc => fc._id === community._id);

          return {
            ...community,
            isFollowing,
            isOwned: false, // These are not owned by the user
            memberCount: community.no_of_followers,
            postCount: community.no_of_posts,
            name: community.community_name,
            id: community._id
          };
        });
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!auth?.token) {
    return null;
  }

  // Don't render until initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-9">
          {/* Title */}
          <div className="z-10">
            <h2 className="font-fenix text-[28px] text-white font-normal text-center md:text-left">
              Communities
            </h2>
            <p className="text-desc font-lato text-center md:text-left">Connect with like-minded developers and tech enthusiasts.</p>
          </div>

          {/* Search + Create Community Button */}
          <div className="flex items-center gap-1 w-full md:w-[600px] z-10">
            <SearchBar 
              className="flex-1 max-w-xs sm:max-w-md" 
              placeholder="Search communities"
              onSearch={handleSearch}
            />
            <NewCommunityButton />
          </div>
        </div>

        {/* Filter */}
        <div className="mb-0">
          <CommunityFilterBar
            filters={FILTERS}
            selected={selectedFilter}
            onSelect={setSelectedFilter}
          />
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 z-10 -mt-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-white">Loading communities...</div>
          </div>
        )}

        {/* Communities Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {getFilteredCommunities().map((community) => (
              <CommunityCard 
                key={community.id || community._id} 
                {...community} 
                onFollowToggle={handleFollowToggle}
                onDelete={handleDeleteCommunity}
                onUpdate={handleUpdateCommunity}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && getFilteredCommunities().length === 0 && (
          <div className="text-center py-12">
            <div className="text-desc text-lg mb-4">
              {selectedFilter === "Your Communities" 
                ? searchQuery 
                  ? `No communities found matching "${searchQuery}"`
                  : "You haven't joined any communities yet"
                : searchQuery
                  ? `No communities found matching "${searchQuery}"`
                  : "No communities available to discover"
              }
            </div>
            {selectedFilter === "Your Communities" && !searchQuery && (
              <p className="text-desc">
                Switch to "Discover Communities" to find and join new communities
              </p>
            )}
          </div>
        )}

        {/* Debug Panel - Remove after testing */}
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <button 
            onClick={() => fetchUserCommunities(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm mr-2"
          >
            Debug: Force Refresh User Communities
          </button>
          <div className="text-white text-sm mt-2">
            <div>Auth User ID: {auth.user?._id}</div>
            <div>Owned: {userCommunities.owned.length}, Followed: {userCommunities.followed.length}</div>
            <div>Filtered: {getFilteredCommunities().length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communities;