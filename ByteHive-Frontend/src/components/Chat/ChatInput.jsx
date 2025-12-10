import React, { useState, useRef, useEffect } from "react";

const ChatInput = ({ onSendMessage, placeholder = "Type your message here...", disabled = false }) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || disabled) return;

    const messageToSend = message.trim();
    setMessage(""); // Clear input immediately
    setIsSending(true);

    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if sending failed
      setMessage(messageToSend);
    } finally {
      setIsSending(false);
      // Focus back to input
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  return (
    <div className="relative mb-6 w-full">
      <div className="flex items-end gap-3 bg-navbar-bg border border-navbar-border rounded-2xl p-3 sm:p-4 w-full">
        {/* Emoji Button */}
        <button 
          className="text-periwinkle hover:text-white p-2 rounded-full hover:bg-periwinkle-light transition-colors flex-shrink-0"
          disabled={disabled}
        >
          <span className="material-icons text-xl">sentiment_satisfied</span>
        </button>

        {/* Attachment Button */}
        <button 
          className="text-periwinkle hover:text-white p-2 rounded-full hover:bg-periwinkle-light transition-colors flex-shrink-0"
          disabled={disabled}
        >
          <span className="material-icons text-xl">attach_file</span>
        </button>

        {/* Message Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending || disabled}
          className="flex-1 min-w-0 w-full bg-transparent text-white placeholder:text-desc resize-none max-h-36 min-h-[36px] focus:outline-none font-lato disabled:opacity-50"
          rows={1}
        />

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim() || isSending || disabled}
          className="bg-periwinkle hover:bg-periwinkle-dark text-white p-2 sm:p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <span className="material-icons text-xl">send</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;