import React from "react";

const UserDropdown = ({ isOpen, onClose, onHistoryClick }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="absolute top-full right-0 mt-2 w-48 z-50">
        <div 
          className="rounded-lg py-2 border shadow-lg"
          style={{
            backgroundColor: "var(--navbar-bg)",
            borderColor: "var(--navbar-border)",
          }}
        >
          <button
            onClick={onHistoryClick}
            className="w-full flex items-center px-4 py-3 text-columbia-blue hover:text-white hover:bg-white/10 transition-colors text-left"
          >
            <span className="material-icons text-xl mr-3">history</span>
            <span className="font-lato">History</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default UserDropdown;