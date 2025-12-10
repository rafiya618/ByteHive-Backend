import React from "react";

const MemberCard = ({ id, name, role, avatar }) => {
  const handleViewProfile = () => {
    // Navigate to member profile
    console.log(`Navigate to member ${id} profile`);
  };

  return (
    <div
      className="bg-navbar-bg rounded-xl overflow-hidden border cursor-pointer hover:border-periwinkle transition-colors"
      style={{
        border: "1px solid var(--navbar-border)",
      }}
      onClick={handleViewProfile}
    >
      <div className="p-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={avatar}
              alt={name}
              className="w-20 h-20 rounded-full object-cover"
            />
          </div>
          
          {/* Member Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-fenix text-xl text-white mb-2 hover:text-periwinkle transition-colors truncate">
              {name}
            </h3>
            <p 
              className="font-lato mb-3 text-desc"
              style={{
                fontWeight: 400,
                fontSize: 14,
                lineHeight: "140%",
                letterSpacing: 0,
              }}
            >
              {role}
            </p>
            
            {/* View Profile Link */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewProfile();
              }}
              className="px-0 py-2 bg-transparent text-white hover:text-periwinkle transition-colors font-lato font-normal text-sm"
            >
              View Profile →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;