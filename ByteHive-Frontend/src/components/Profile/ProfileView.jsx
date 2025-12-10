import React from "react";
import {
  FaLinkedin,
  FaXTwitter,
  FaGithub,
  FaYoutube,
  FaInstagram,
  FaFacebook,
  FaThreads,
  FaGlobe,
} from "react-icons/fa6";
import fire from "../../assets/fire.png";
import email from "../../assets/email.png";
import group from "../../assets/group.png";

const ProfileView = ({ profile, onEdit }) => {
  const socialIcons = {
    Linkedin: FaLinkedin,
    X: FaXTwitter,
    Github: FaGithub,
    Youtube: FaYoutube,
    Instagram: FaInstagram,
    Facebook: FaFacebook,
    Threads: FaThreads,
    Websites: FaGlobe,
  };

  return (
    <div className="bg-dark-indigo w-[90%] sm:w-full max-w-md mx-auto p-4 sm:p-6 rounded-xl shadow-lg border border-navbar-border text-white flex flex-col gap-4">
      {/* Profile Picture */}
      <div className="flex justify-center">
        <img
          src={profile?.profileImage}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover shadow-md  border-2 flex-shrink-0 border-dark-indigo"
        />
      </div>

      {/* Name and Bio */}
      <div className="flex flex-col items-start mt-5">
        <h2 className="mt-1 text-2xl font-bold text-[#9198DE] drop-shadow">
          {profile?.name}
        </h2>
        <p className="mt-2 text-white/80 text-xl drop-shadow font-normal">{profile?.bio}</p>

      </div>

      <div className="flex flex-col items-start mt-0 ml-3 gap-2">
        {/* Email */}
        <div className="flex items-center gap-2">
          <img src={email} alt="Email" className="w-6 h-6" />
          <span className="text-white text-base drop-shadow font-light">{profile.user.email}</span>
        </div>

        {/* Joined Date */}
        <div className="flex items-center gap-2">
          <img src={group} alt="Joined" className="w-6 h-6" />
          <span className="text-white text-base drop-shadow font-light">
            Joined{" "}
            {new Date(profile.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>


        {/* Streak */}
        <div className="flex items-center gap-2">
          <img src={fire} alt="Streak" className="w-6 h-6" />
          <span className="text-white text-base drop-shadow font-light">34 streak</span>
        </div>
      </div>



      {/* Social Links */}
      {profile.socialLinks && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-3">
          {Object.entries(profile.socialLinks).map(([platform, url]) => {
            if (!url) return null;
            const Icon = socialIcons[platform];
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-2 py-2 
             bg-dark-indigo rounded-md border border-navbar-border 
             transition-colors duration-200 text-sm
             hover:bg-dark-indigo/30 hover:border-blue-400 hover:text-blue-300"
              >
                {Icon && <Icon className="text-base text-blue-400 group-hover:text-blue-300" />}
                <span className="truncate">{platform}</span>
              </a>



            );
          })}
        </div>
      )}

      {/* Edit Button */}
      <div className="w-full flex justify-end mt-4">
        <button
          onClick={onEdit}
          className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default ProfileView;
