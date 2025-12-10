import React from "react";

const ChatMessage = ({ author, message, time, isCurrentUser }) => {
  const messageStyle = isCurrentUser
    ? { background: "linear-gradient(135deg, #6866FF 0%, #5755D6 100%)" }
    : { backgroundColor: "var(--navbar-bg)", borderColor: "var(--navbar-border)" };

  const containerClass = `flex items-start gap-3 w-full ${isCurrentUser ? 'justify-end' : 'justify-start'}`;

  // Wrapper controls bubble max width so messages are roomy but not full-bleed
  const messageWrapperClass = `flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[92%] sm:max-w-[78%] md:max-w-[68%] lg:max-w-[60%]`;

  // Moderate padding and full width inside wrapper; same structure both sides (different color)
  const messageClass = `px-4 py-2 rounded-lg ${isCurrentUser ? '' : 'border'} w-full`;
  const textColor = isCurrentUser ? 'text-white' : 'text-columbia-blue';
  const nameColor = isCurrentUser ? 'text-white' : 'text-white';
  const timeColor = isCurrentUser ? 'text-white/80' : 'text-periwinkle';

  return (
    <div className={containerClass}>
      {/* Left avatar for receiver */}
      {!isCurrentUser && (
        <img
          src={author.avatar}
          alt={author.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}&background=808080&color=fff`;
          }}
        />
      )}

      <div className={messageWrapperClass}>
        {/* Name shown above bubble for both sides for consistent style */}
        <div className="mb-1 px-1">
          <span className={`font-lato text-sm font-semibold ${nameColor}`}>{author.name}</span>
        </div>

        <div className={messageClass} style={messageStyle}>
          <div className="flex flex-col">
            <div className="break-words whitespace-pre-wrap">
              <p className={`font-lato ${textColor} text-base font-semibold leading-snug`}>{message}</p>
            </div>
            <div className="mt-1 flex justify-end">
              <span className={`font-lato text-[11px] ${timeColor} whitespace-nowrap`}>{time}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right avatar for sender */}
      {isCurrentUser && (
        <img
          src={author.avatar}
          alt={author.name}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff`;
          }}
        />
      )}
    </div>
  );
};

export default ChatMessage;
