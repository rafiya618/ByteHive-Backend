import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { communityApi } from "../../api/communityApi";

const CommunityCard = ({ 
  id = 1, 
  _id,
  image, 
  name, 
  community_name,
  description, 
  memberCount, 
  no_of_followers,
  postCount, 
  no_of_posts,
  community_tags = [],
  visible = "public",
  moderation = "only admin",
  isFollowing = false,
  isOwned = false,
  onFollowToggle,
  onDelete,
  onUpdate
}) => {
  const navigate = useNavigate();
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const communityId = _id || id;
  const communityName = community_name || name;
  const followers = no_of_followers || memberCount;
  const posts = no_of_posts || postCount;

  React.useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading || isOwned) return;
    
    setLoading(true);
    const previousState = following;
    try {
      setFollowing(!following);
      if (onFollowToggle) {
        await onFollowToggle(communityId, following);
      }
    } catch (error) {
      console.error("Error toggling follow status:", error);
      setFollowing(previousState);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleting) return;
    
    setDeleting(true);
    try {
      if (onDelete) {
        await onDelete(communityId);
      }
    } catch (error) {
      console.error("Error deleting community:", error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setShowKebabMenu(false);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowKebabMenu(false);
    setShowEditModal(true);
  };

  const handleViewCommunity = (e) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/community/${communityId}`);
  };

  return (
    <div 
      className="bg-navbar-bg rounded-xl overflow-hidden border hover:border-periwinkle transition-colors relative w-full"
      style={{ border: "1px solid var(--navbar-border)" }}
    >
      {/* Kebab Menu */}
      {isOwned && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowKebabMenu(!showKebabMenu);
            }}
            className="text-white hover:text-periwinkle transition-colors p-1 rounded"
          >
            <span className="material-icons text-xl">more_vert</span>
          </button>

          {showKebabMenu && (
            <>
              <div className="absolute top-8 right-0 bg-navbar-bg border border-navbar-border rounded-lg shadow-lg min-w-[140px] z-30">
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-3 text-white hover:bg-white/10 transition-colors flex items-center gap-2 rounded-t-lg"
                >
                  <span className="material-icons text-sm">edit</span>
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowKebabMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2 rounded-b-lg"
                >
                  <span className="material-icons text-sm">delete</span>
                  Delete
                </button>
              </div>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowKebabMenu(false)}
              />
            </>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-start gap-4">
          {/* Image */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            <img 
              alt={communityName} 
              className="rounded-lg w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-cover" 
              src={image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80"} 
            />
          </div>

          {/* Content */}
          <div className="flex-grow min-w-0 w-full">
            <h3 className="font-fenix text-lg sm:text-xl text-white mb-2 break-words">
              {communityName}
            </h3>

            <p 
              className="font-lato mb-3 text-desc text-sm break-words"
              style={{ lineHeight: "140%" }}
            >
              {description}
            </p>

            {/* Tags */}
            {community_tags && community_tags.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {(showAllTags ? community_tags : community_tags.slice(0, 3)).map((tag, i) => (
                    <span
                      key={i}
                      className="bg-chip text-periwinkle text-xs font-semibold px-3 py-1 rounded-xl"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {community_tags.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setShowAllTags(!showAllTags);
                    }}
                    className="text-xs text-periwinkle hover:text-white mt-2 underline hover:no-underline focus:outline-none"
                  >
                    {showAllTags 
                      ? "Show less" 
                      : `+${community_tags.length - 3} more`}
                  </button>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs sm:text-sm font-lato" style={{ color: "#8B93D1" }}>
              <div className="flex items-center">
                <span className="material-icons text-base mr-1 text-periwinkle">people</span>
                <span>{followers?.toLocaleString() || "0"} members</span>
              </div>
              <div className="flex items-center">
                <span className="material-icons text-base mr-1 text-periwinkle">article</span>
                <span>{posts?.toLocaleString() || "0"} posts</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <button 
                onClick={handleViewCommunity}
                className="px-0 py-2 bg-transparent text-desc cursor-pointer font-lato font-normal text-sm hover:text-white transition-colors"
              >
                View Community →
              </button>

              <button 
                onClick={handleFollowToggle}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-lato font-medium text-sm border transition-colors w-full sm:w-auto ${
                  following
                    ? isOwned 
                      ? "border-periwinkle bg-transparent text-periwinkle cursor-default"
                      : "border-periwinkle bg-transparent text-periwinkle hover:bg-periwinkle/10"
                    : "border-white bg-transparent text-white hover:bg-white/10"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="flex items-center justify-center">
                  <span className="material-icons text-base mr-1">
                    {loading ? "hourglass_empty" : following ? "check" : "add"}
                  </span>
                  {loading ? "..." : following ? (isOwned ? "Admin" : "Following") : "Follow"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditCommunityModal
          community={{
            _id: communityId,
            community_name: communityName,
            description,
            community_tags,
            visible,
            moderation,
            image
          }}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-navbar-bg border border-navbar-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-white font-fenix text-xl mb-4">Delete Community</h3>
            <p className="text-desc mb-6">
              Are you sure you want to delete "{communityName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 border border-navbar-border text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Community Modal Component with synced backend validation
const EditCommunityModal = ({ community, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    community_name: community.community_name,
    description: community.description,
    community_tags: community.community_tags || [],
    visible: community.visible,
    moderation: community.moderation
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(community.image);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tagsInputValue, setTagsInputValue] = useState(
    (community.community_tags || []).join(', ')
  );
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagLimitError, setTagLimitError] = useState(false);

  // Enhanced validation states
  const [validationErrors, setValidationErrors] = useState({
    community_name: '',
    description: ''
  });
  const [touched, setTouched] = useState({
    community_name: false,
    description: false
  });

  // Validation functions - SYNCED WITH BACKEND
  const validateCommunityName = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return 'Community name is required';
    }
    if (trimmedValue.length < 3) {
      return 'Community name must be at least 3 characters long';
    }
    if (trimmedValue.length > 50) {
      return 'Community name must not exceed 50 characters';
    }
    return '';
  };

  const validateDescription = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return 'Description is required';
    }
    if (trimmedValue.length < 10) {
      return 'Description must be at least 10 characters long';
    }
    if (trimmedValue.length > 500) {
      return 'Description must not exceed 500 characters';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear general error when user starts typing
    if (error) setError(null);
    
    // Real-time validation
    if (name === 'community_name') {
      const nameError = validateCommunityName(value);
      setValidationErrors(prev => ({
        ...prev,
        community_name: touched.community_name ? nameError : ''
      }));
    }
    
    if (name === 'description') {
      const descError = validateDescription(value);
      setValidationErrors(prev => ({
        ...prev,
        description: touched.description ? descError : ''
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on blur
    if (name === 'community_name') {
      const nameError = validateCommunityName(value);
      setValidationErrors(prev => ({
        ...prev,
        community_name: nameError
      }));
    }
    
    if (name === 'description') {
      const descError = validateDescription(value);
      setValidationErrors(prev => ({
        ...prev,
        description: descError
      }));
    }
  };

  const handleTagsChange = (e) => {
    const inputValue = e.target.value;
    setTagsInputValue(inputValue);
    
    // Split by comma and process tags
    const potentialTags = inputValue
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Check if trying to exceed 10 tags
    if (potentialTags.length > 10) {
      setTagLimitError(true);
      // Take only first 10 tags
      const limitedTags = potentialTags.slice(0, 10);
      setFormData(prev => ({
        ...prev,
        community_tags: limitedTags
      }));
      // Update input value to show only the first 10 tags
      setTagsInputValue(limitedTags.join(', '));
    } else {
      setTagLimitError(false);
      setFormData(prev => ({
        ...prev,
        community_tags: potentialTags
      }));
    }
  };

  const handleTagsBlur = () => {
    // Clear tag limit error on blur
    setTagLimitError(false);
    
    // Clean up the input on blur
    const cleanedValue = tagsInputValue
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 10)
      .join(', ');
    
    setTagsInputValue(cleanedValue);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      if (error) setError(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched to show validation errors
    setTouched({
      community_name: true,
      description: true
    });

    // Validate all fields
    const nameError = validateCommunityName(formData.community_name);
    const descError = validateDescription(formData.description);

    setValidationErrors({
      community_name: nameError,
      description: descError
    });

    // If there are validation errors, don't proceed
    if (nameError || descError) {
      setError('Please fix the validation errors below');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await communityApi.updateCommunity(community._id, formData, imageFile);
      
      if (onUpdate) {
        onUpdate(community._id, response.community);
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating community:', err);
      setError(err.message || 'Failed to update community');
    } finally {
      setLoading(false);
    }
  };

  // Check if form is valid for button state
  const isFormValid = !validateCommunityName(formData.community_name) && 
                     !validateDescription(formData.description);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pt-24 pb-8">
      <div 
        className="bg-navbar-bg border border-navbar-border rounded-lg w-full max-w-2xl max-h-full overflow-y-auto"
        style={{
          border: "1px solid var(--navbar-border)",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--periwinkle) transparent"
        }}
      >
        {/* Fixed Header */}
        <div className="sticky top-0 bg-navbar-bg p-6 flex justify-between items-center rounded-t-lg">
          <h3 className="text-white font-fenix text-xl">Edit Community</h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-periwinkle transition-colors p-1"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 pb-6">
          {error && (
            <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 mb-6 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Community Name */}
            <div>
              <label className="block text-white font-fenix mb-2">Community Name *</label>
              <input 
                type="text" 
                name="community_name"
                value={formData.community_name}
                onChange={handleInputChange}
                onBlur={handleBlur}
                maxLength={50}
                className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none transition-colors ${
                  validationErrors.community_name 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-navbar-border focus:border-periwinkle'
                }`}
              />
              {validationErrors.community_name && (
                <p className="text-xs text-red-400 mt-1">
                  {validationErrors.community_name}
                </p>
              )}
              <div className="flex justify-between text-xs mt-1">
                <p className="text-desc">
                  Must be 3-50 characters long
                </p>
                <p className={`${formData.community_name.length > 45 ? 'text-yellow-400' : 'text-desc'}`}>
                  {formData.community_name.length}/50
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white font-fenix mb-2">Description *</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                onBlur={handleBlur}
                rows={4}
                maxLength={500}
                className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none transition-colors resize-none ${
                  validationErrors.description 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-navbar-border focus:border-periwinkle'
                }`}
              />
              {validationErrors.description && (
                <p className="text-xs text-red-400 mt-1">
                  {validationErrors.description}
                </p>
              )}
              <div className="flex justify-between text-xs mt-1">
                <p className="text-desc">
                  Must be 10-500 characters long
                </p>
                <p className={`${formData.description.length > 450 ? 'text-yellow-400' : 'text-desc'}`}>
                  {formData.description.length}/500
                </p>
              </div>
            </div>

            {/* Tags - Updated with enhanced validation */}
            <div>
              <label className="block text-white font-fenix mb-2">
                Tags <span className="text-desc text-sm">(Max 10 tags)</span>
              </label>
              <input 
                type="text" 
                placeholder="Enter tags separated by commas"
                value={tagsInputValue}
                onChange={handleTagsChange}
                onBlur={handleTagsBlur}
                className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none transition-colors ${
                  tagLimitError 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-navbar-border focus:border-periwinkle'
                }`}
              />
              
              {/* Tag limit error message */}
              {tagLimitError && (
                <p className="text-xs text-red-400 mt-1">
                  You can only add a maximum of 10 tags. Only the first 10 tags have been saved.
                </p>
              )}
              
              {formData.community_tags.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-2">
                    {(showAllTags ? formData.community_tags : formData.community_tags.slice(0, 3)).map((tag, index) => (
                      <span key={index} className="bg-periwinkle/20 text-periwinkle px-2 py-1 rounded-md text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {formData.community_tags.length > 3 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowAllTags(!showAllTags);
                      }}
                      className="text-xs text-periwinkle hover:text-white mt-2 transition-colors cursor-pointer bg-none border-none p-0 underline hover:no-underline focus:outline-none"
                    >
                      {showAllTags 
                        ? `Show less` 
                        : `+${formData.community_tags.length - 3} more tags`
                      }
                    </button>
                  )}
                  
                  <p className={`text-xs mt-1 ${
                    formData.community_tags.length === 10 ? 'text-yellow-400' : 'text-desc'
                  }`}>
                    {formData.community_tags.length}/10 tags
                    {formData.community_tags.length === 10 && ' (Maximum reached)'}
                  </p>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-fenix mb-2">Visibility</label>
                <select 
                  name="visible"
                  value={formData.visible}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-periwinkle transition-colors"
                  style={{ backgroundColor: "var(--navbar-bg)" }}
                >
                  <option value="public" className="bg-rich-black">Public</option>
                  <option value="private" className="bg-rich-black">Private</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-fenix mb-2">Moderation</label>
                <select 
                  name="moderation"
                  value={formData.moderation}
                  onChange={handleInputChange}
                  className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-periwinkle transition-colors"
                  style={{ backgroundColor: "var(--navbar-bg)" }}
                >
                  <option value="only admin" className="bg-rich-black">Only Admin</option>
                  <option value="allow moderators" className="bg-rich-black">Allow Moderators</option>
                  <option value="allow all" className="bg-rich-black">Allow All</option>
                </select>
              </div>
            </div>

            {/* Image */}
            <div>
              <label className="block text-white font-fenix mb-2">Community Image</label>
              
              {imagePreview && (
                <div className="relative inline-block mb-4">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-32 h-32 rounded-lg object-cover"
                    style={{
                      objectFit: 'cover',
                      width: '128px',
                      height: '128px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white transition-colors
                         file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold 
                         file:bg-periwinkle file:text-white hover:file:bg-periwinkle/80 file:transition-colors file:cursor-pointer"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-navbar-border text-white rounded-lg hover:bg-white/10 transition-colors font-lato font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading || !isFormValid}
                className="px-6 py-3 bg-[#6866FF] hover:bg-[#5755D6] text-white rounded-[5px] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                style={{
                  minWidth: 160,
                  borderRadius: "5px",
                  height: 49,
                }}
              >
                {loading ? "Updating..." : "Update Community"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default CommunityCard;