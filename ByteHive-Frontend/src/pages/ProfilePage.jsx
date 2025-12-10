import React, { useEffect, useState } from "react";
import { updateProfile } from "../api/ProfileApi";
import ProfileView from "../components/Profile/ProfileView";
import ProfileEdit from "../components/Profile/ProfileEdit";
import Layout from "../components/Layout/Layout";
import { useAuth } from "../context/auth";
import { useProfile } from "../context/profileContext";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState({}); // ✅ inline errors state
  const { auth } = useAuth();
  const { profile, fetchProfile, loading } = useProfile();

  const userId = auth?.user?._id;

  useEffect(() => {
    if (userId && !profile && !loading) {
      fetchProfile();
    }
  }, [userId, profile, loading, fetchProfile]);

  const handleSave = async (formData) => {
    try {
      if (!userId) return;
      setErrors({}); // reset errors

      await updateProfile(userId, formData);
      await fetchProfile();

      toast.success("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);

      // ✅ Handle inline errors from backend
      if (err.response?.data?.field) {
        setErrors({
          [err.response.data.field]: err.response.data.message,
        });
      } else {
        toast.error("Failed to update profile. Try again.");
      }
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center gap-6 mt-6">
        <h1 className="text-2xl font-bold">User Profile</h1>

        {loading ? (
          <p>Loading...</p>
        ) : profile ? (
          editing ? (
            <ProfileEdit
              profile={profile}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
              errors={errors} // ✅ pass errors to edit form
            />
          ) : (
            <ProfileView profile={profile} onEdit={() => setEditing(true)} />
          )
        ) : (
          <p>No profile data found.</p>
        )}
      </div>
    </Layout>
  );
};

export default ProfilePage;
