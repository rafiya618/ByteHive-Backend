import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ActionButton from "../../shared/ActionButton";
import { communityApi } from "../../api/communityApi";
import { useAuth } from "../../context/auth";

const CommunityFormCard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    community_name: '',
    description: '',
    community_tags: [],
    visible: 'public',
    moderation: 'only admin'
  });

  // Store the raw input value separately from the processed tags
  const [tagsInputValue, setTagsInputValue] = useState('');
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

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Auth check
  React.useEffect(() => {
    if (!authLoading && !auth?.token) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [auth, authLoading, navigate, location.pathname]);

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
      .filter(tag => tag.length > 0); // Only filter out completely empty tags
    
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
    
    // Clean up the input on blur - remove trailing comma and extra spaces
    const cleanedValue = tagsInputValue
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .join(', ');
    
    setTagsInputValue(cleanedValue);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be less than 5MB');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      if (error) setError(null);
    }
  };

  const handleCreateCommunity = async () => {
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
      // Debug: Log form data before sending
      console.log('Form data being sent:', {
        ...formData,
        imageFile: imageFile ? {
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size,
          lastModified: imageFile.lastModified
        } : null
      });

      // Try creating community without image first if image upload fails
      let response;
      try {
        response = await communityApi.createCommunity(formData, imageFile);
        console.log('Community creation successful! Response:', response);
      } catch (imageError) {
        console.error('Error with image upload:', imageError);
        
        // If the error is specifically about image upload, try without image
        if (imageError.message.includes('Image upload failed') || 
            imageError.message.includes('Image') || 
            imageError.message.includes('upload')) {
          
          console.log('Attempting to create community without image...');
          setError('Image upload failed. Creating community without image...');
          
          // Wait a moment to show the message
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try again without image
          response = await communityApi.createCommunity(formData, null);
          console.log('Community creation successful (without image)! Response:', response);
        } else {
          throw imageError;
        }
      }
      
      setSuccess(true);
      
      // Clear the draft since community was created successfully
      localStorage.removeItem('communityDraft');
      
      // Navigate back to communities page after a short delay with state to trigger refresh
      setTimeout(() => {
        navigate('/communities', { 
          state: { 
            refreshCommunities: true, 
            newCommunity: response?.community || response 
          } 
        });
      }, 1500);
      
    } catch (err) {
      console.error('Error creating community:', err);
      
      // Provide more specific error messages based on common issues
      let errorMessage = err.message || 'Failed to create community. Please try again.';
      
      if (errorMessage.includes('Image upload failed')) {
        errorMessage = 'There was an issue uploading your image. Please try with a different image or create the community without an image.';
      } else if (errorMessage.includes('400')) {
        errorMessage = 'Please check that all required fields are filled correctly and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    // Save to localStorage for demo
    const draftData = {
      ...formData,
      tagsInputValue, // Also save the raw input value
      imagePreview,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('communityDraft', JSON.stringify(draftData));
    alert('Draft saved successfully!');
  };

  // Load draft on component mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('communityDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData({
          community_name: draft.community_name || '',
          description: draft.description || '',
          community_tags: draft.community_tags || [],
          visible: draft.visible || 'public',
          moderation: draft.moderation || 'only admin'
        });
        
        // Restore the input value or reconstruct it from tags
        if (draft.tagsInputValue) {
          setTagsInputValue(draft.tagsInputValue);
        } else if (draft.community_tags && draft.community_tags.length > 0) {
          setTagsInputValue(draft.community_tags.join(', '));
        }
        
        if (draft.imagePreview) {
          setImagePreview(draft.imagePreview);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  // Check if form is valid for button state
  const isFormValid = !validateCommunityName(formData.community_name) && 
                     !validateDescription(formData.description);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="bg-navbar-bg border border-navbar-border rounded-2xl p-6 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render form if not authenticated
  if (!auth?.token) {
    return null;
  }

  return (
    <div className="bg-navbar-bg border border-navbar-border rounded-2xl p-6 flex flex-col gap-6 w-full">
      {/* Success Message */}
      {success && (
        <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4 text-green-400">
          Community created successfully! Redirecting to communities...
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Community Name */}
      <div>
        <label className="block text-white font-fenix mb-2">
          Community Name *
        </label>
        <input 
          type="text" 
          name="community_name"
          value={formData.community_name}
          onChange={handleInputChange}
          onBlur={handleBlur}
          maxLength={50}
          placeholder="Choose a unique name for your community"
          className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none ${
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

      {/* Community Description */}
      <div>
        <label className="block text-white font-fenix mb-2">
          Community Description *
        </label>
        <textarea 
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          onBlur={handleBlur}
          maxLength={500}
          placeholder="Describe what your community is about"
          rows={6}
          className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none ${
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

      {/* Community Tags */}
      <div>
        <label className="block text-white font-fenix mb-2">
          Community Tags <span className="text-desc text-sm">(optional)</span>
        </label>
        <input 
          type="text" 
          placeholder="Enter tags separated by commas (e.g., JavaScript, React, Web Development) - Max 10 tags"
          value={tagsInputValue}
          onChange={handleTagsChange}
          onBlur={handleTagsBlur}
          className={`w-full bg-transparent border rounded-lg px-4 py-2 text-white placeholder:text-desc focus:outline-none ${
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
        
        <p className="text-xs text-desc mt-1">
          Tags help people discover your community (Maximum 10 tags allowed)
        </p>
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
              <div className="mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Show more clicked, current state:', showAllTags);
                    setShowAllTags(!showAllTags);
                  }}
                  className="text-xs text-periwinkle hover:text-white transition-colors cursor-pointer bg-none border-none p-0 underline hover:no-underline focus:outline-none"
                >
                  {showAllTags 
                    ? `Show less` 
                    : `+${formData.community_tags.length - 3} more tags`
                  }
                </button>
              </div>
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

      {/* Community Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visibility */}
        <div>
          <label className="block text-white font-fenix mb-2">Visibility</label>
          <select 
            name="visible"
            value={formData.visible}
            onChange={handleInputChange}
            className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-periwinkle"
          >
            <option value="public" className="bg-rich-black">Public</option>
            <option value="private" className="bg-rich-black">Private</option>
          </select>
        </div>

        {/* Moderation */}
        <div>
          <label className="block text-white font-fenix mb-2">Moderation</label>
          <select 
            name="moderation"
            value={formData.moderation}
            onChange={handleInputChange}
            className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-periwinkle"
          >
            <option value="only admin" className="bg-rich-black">Only Admin</option>
            <option value="allow moderators" className="bg-rich-black">Allow Moderators</option>
            <option value="allow all" className="bg-rich-black">Allow All</option>
          </select>
        </div>
      </div>

      {/* Community Avatar */}
      <div>
        <label className="block text-white font-fenix mb-2">Community Image</label>
        
        {imagePreview ? (
          <div className="relative inline-block">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="w-32 h-32 rounded-lg object-cover mb-4"
              style={{
                objectFit: 'cover', // Ensures image fits properly without zooming
                width: '128px',
                height: '128px'
              }}
            />
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-700 z-10"
            >
              ×
            </button>
          </div>
        ) : (
          <div 
            className="border border-dashed border-navbar-border rounded-lg p-6 text-center text-desc cursor-pointer hover:border-periwinkle transition relative"
            onClick={() => document.getElementById('community-image').click()}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="community-image"
            />
            <span className="material-icons text-3xl block mb-2 text-periwinkle">add_photo_alternate</span>
            <p>Click to upload an image</p>
            <p className="text-xs mt-1">PNG, JPG or GIF (MAX. 5MB)</p>
          </div>
        )}
        
        {/* Alternative file input if user prefers */}
        {imagePreview && (
          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-periwinkle file:text-white hover:file:bg-periwinkle/80"
            />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <ActionButton 
          variant="secondary" 
          onClick={handleSaveDraft}
          disabled={loading}
        >
          Save Draft
        </ActionButton>
        <ActionButton 
          variant="primary" 
          onClick={handleCreateCommunity}
          disabled={loading || !isFormValid}
        >
          {loading ? "Creating..." : "Create Community"}
        </ActionButton>
      </div>
    </div>
  );
};

export default CommunityFormCard;