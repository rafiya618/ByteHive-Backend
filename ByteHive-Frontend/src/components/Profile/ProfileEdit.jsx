import React, { useState } from "react";
import InputField from "../../shared/InputField";
import {
  validateName,
  validateBio,
  validateURL,
} from "../../helpers/validators";

const ProfileEdit = ({ profile, onSave, onCancel, errors = {} }) => {
  const [formData, setFormData] = useState({
    name: profile.name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    profileImage: null,
    socialLinks: {
      Linkedin: profile.socialLinks?.Linkedin || "",
      X: profile.socialLinks?.X || "",
      Github: profile.socialLinks?.Github || "",
      Youtube: profile.socialLinks?.Youtube || "",
      Instagram: profile.socialLinks?.Instagram || "",
      Facebook: profile.socialLinks?.Facebook || "",
      Threads: profile.socialLinks?.Threads || "",
      Websites: profile.socialLinks?.Websites || "",
    },
  });

  const [localErrors, setLocalErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("socials.")) {
      setFormData({
        ...formData,
        socialLinks: {
          ...formData.socialLinks,
          [name.split(".")[1]]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, profileImage: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalErrors({});

    const nameError = validateName(formData.name);
    if (nameError) {
      setLocalErrors((prev) => ({ ...prev, name: nameError }));
      return;
    }

    const bioError = validateBio(formData.bio);
    if (bioError) {
      setLocalErrors((prev) => ({ ...prev, bio: bioError }));
      return;
    }

    for (let [platform, link] of Object.entries(formData.socialLinks)) {
      const urlError = validateURL(link);
      if (urlError) {
        setLocalErrors((prev) => ({
          ...prev,
          [platform]: `${platform}: ${urlError}`,
        }));
        return;
      }
    }

    const updatedForm = new FormData();
    updatedForm.append("name", formData.name);
    updatedForm.append("username", formData.username);
    updatedForm.append("bio", formData.bio);
    if (formData.profileImage) {
      updatedForm.append("profileImage", formData.profileImage);
    }
    Object.entries(formData.socialLinks).forEach(([platform, link]) => {
      updatedForm.append(`socialLinks[${platform}]`, link);
    });
    console.log('updatedForm', updatedForm)
    onSave(updatedForm);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-dark-indigo w-[90%] sm:w-full max-w-md mx-auto 
                 p-5 sm:p-6 rounded-xl shadow-lg border border-navbar-border 
                 text-white flex flex-col max-h-[500px] overflow-hidden"
    >
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-5 pr-4 custom-scrollbar px-1 pb-3 ">
        {/* Profile Image Upload */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <img
              src={
                formData.profileImage
                  ? URL.createObjectURL(formData.profileImage)
                  : profile.profileImage || "/default-profile.png"
              }
              alt="Profile Preview"
              className="w-24 h-24 rounded-full object-cover border-2 border-blue-600 shadow-md"
            />
            <label
              htmlFor="profileImage"
              className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white 
                         p-1.5 rounded-full cursor-pointer shadow-md transition-colors opacity-90 group-hover:opacity-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3-6 6H9v-3z"
                />
              </svg>
            </label>
          </div>
          <input
            type="file"
            id="profileImage"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <p className="text-xs text-gray-400">Click the image to upload a new one</p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
          <InputField
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your Name"
          />
          {(localErrors.name || errors.name) && (
            <p className="text-red-500 text-sm">{localErrors.name || errors.name}</p>
          )}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Username</label>
          <InputField
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Your username"
          />
          {errors.username && (
            <p className="text-red-500 text-sm">{errors.username}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-300">Bio</label>
          <InputField
            type="textarea"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself"
            rows={3}
          />
          {(localErrors.bio || errors.bio) && (
            <p className="text-red-500 text-sm">{localErrors.bio || errors.bio}</p>
          )}
        </div>

        {/* Social Links */}
        <div className="flex flex-col gap-3">
          {Object.keys(formData.socialLinks).map((platform) => (
            <div key={platform}>
              <label className="block text-sm font-medium mb-1 text-gray-300">
                {platform} URL
              </label>
              <InputField
                type="text"
                name={`socials.${platform}`}
                value={formData.socialLinks[platform]}
                onChange={handleChange}
                placeholder={"url"}
                // placeholder={`https://${platform.toLowerCase()}.com`}
              />
              {(localErrors[platform] || errors[platform]) && (
                <p className="text-red-500 text-sm">
                  {localErrors[platform] || errors[platform]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons pinned at bottom */}
      <div className="flex justify-end gap-3 mt-4 border-t border-gray-700 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 text-white font-medium text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
};

export default ProfileEdit;
