// ============================
// 🔹 Profile Setup Page
// ============================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/auth";
import toast from "react-hot-toast";
import { createProfile } from "../../../api/ProfileApi";
import { jwtDecode } from "jwt-decode";
import InputField from "../../../shared/InputField";
import { validateName, validateUsername } from "../../../helpers/validators"; // ✅ Reuse validators
import { handleFormError } from "../../../helpers/handleFormError";
import { registerPush } from "../../../helpers/registerPush";

const ProfileSetupPage = () => {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
  });

  const [errors, setErrors] = useState({ name: "", username: "" });

  // ============================
  // 🔹 Handle Submit
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ name: "", username: "" }); // clear old errors

    // ✅ Validate Name
    const nameError = validateName(formData.name);
    if (nameError) {
      setErrors((prev) => ({ ...prev, name: nameError }));
      return;
    }

    // ✅ Validate Username
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setErrors((prev) => ({ ...prev, username: usernameError }));
      return;
    }

    try {
      console.log('auth in setup profile', auth)
      console.log('formData', formData)
      const { data } = await createProfile(auth?.user?._id, formData);
      console.log('data', data)

      toast.success("Profile saved!");

      // ✅ Save new token & update auth state
      const decoded = jwtDecode(data.token);
      console.log('decoded in setup-profile', decoded)
      localStorage.removeItem("Auth");
      localStorage.setItem("Auth", JSON.stringify({ token: data.token }));

      setAuth({ token: data.token, user: decoded });

      // ✅ Redirect to next step
      console.log('decoded?.user?._id', decoded?._id)
      registerPush(decoded?._id)
      navigate("/");
    } catch (err) {
      handleFormError(err, setErrors);
      // const { message, field } = err.response?.data || {};
      // const serverMsg = message || "Error saving profile";
      // console.log("serverMsg", serverMsg);

      // // ✅ Use backend-provided field or fallback to "name"
      // setErrors((prev) => ({
      //   ...prev,
      //   [field || "name"]: serverMsg,
      // }));
    }

  };

  // ============================
  // 🔹 JSX
  // ============================
  return (
    <div className="bg-navbar-bg text-white w-full min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-dark-navy-purple rounded-xl shadow-lg border border-navbar-border p-6 sm:p-8 flex flex-col items-center transition-all">

        <h1 className="text-2xl font-semibold mb-6 text-center">
          Complete Your Profile
        </h1>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-1">
        <label className="block my-1">Name</label>
          <InputField
            type="text"
            placeholder="Enter name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name}</p>
          )}
          <label className="block my-1 mt-2">Username</label>
          <InputField
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
          />
          {errors.username && (
            <p className="text-red-500 text-sm">{errors.username}</p>
          )}

          <button
            type="submit"
            className="mt-3 cursor-pointer w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
