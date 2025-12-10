import React, { useState } from "react";
import ActionButton from "../../shared/ActionButton";
import { chatApi } from "../../api/chatApi";
const CreateThreadModal = ({ isOpen, onClose, onCreateThread, roomId, userId, isAdmin }) => {
  const [threadName, setThreadName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setThreadName(value);
    
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleCreateThread = async () => {
    // Validation
    if (!threadName.trim()) {
      setError("Thread name is required");
      return;
    }

    if (threadName.trim().length < 2) {
      setError("Thread name must be at least 2 characters long");
      return;
    }

    if (threadName.trim().length > 50) {
      setError("Thread name must not exceed 50 characters");
      return;
    }

    if (!roomId || !userId) {
      setError("Missing room or user information");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log('Creating thread with backend API:', {
        roomId,
        threadName: threadName.trim(),
        userId
      });
      
      // Call backend API to create thread
      const response = await chatApi.createChatThread(roomId, threadName.trim(), userId);
      
      if (response.status === 'success') {
        // Call the callback with the thread data from backend
        onCreateThread({
          thread_id: response.thread_id,
          thread_name: response.thread_name,
          room_id: roomId,
          createdAt: new Date().toISOString(),
          isOwner: true // User who created the thread
        });

        // Reset form and close modal
        setThreadName("");
        onClose();
      } else {
        throw new Error(response.message || 'Failed to create thread');
      }
    } catch (err) {
      console.error('Thread creation error:', err);
      
      // Handle specific backend error messages
      if (err.message.includes('not a member')) {
        setError("You are not a member of this chat room.");
      } else if (err.message.includes('Thread creation is disabled')) {
        setError("Thread creation is disabled for members. Only the room admin can create threads.");
      } else if (err.message.includes('Room not found')) {
        setError("Chat room not found. Please try rejoining the room.");
      } else {
        setError(err.message || "Failed to create thread. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while loading
    
    setThreadName("");
    setError("");
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateThread();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-navbar-bg border border-navbar-border rounded-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl text-white font-fenix">Create New Byte</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-periwinkle hover:text-white transition-colors disabled:opacity-50"
          >
            <span className="material-icons text-2xl">close</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-600/20 border border-red-600/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form Content */}
        <div className="space-y-4">
          {/* Thread Name Input */}
          <div>
            <label className="block text-white font-fenix mb-2">
              Byte Name *
            </label>
            <input
              type="text"
              value={threadName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              maxLength={50}
              placeholder="Enter byte name (e.g., General Discussion)"
              disabled={loading}
              className="w-full bg-transparent border border-navbar-border rounded-lg px-4 py-3 text-white placeholder:text-desc focus:outline-none focus:border-periwinkle disabled:opacity-50"
            />
            <div className="flex justify-between text-xs mt-1">
              <p className="text-desc">
                Must be 2-50 characters long
              </p>
              <p className={`${threadName.length > 45 ? 'text-yellow-400' : 'text-desc'}`}>
                {threadName.length}/50
              </p>
            </div>
          </div>

          {/* Permission Info */}
          <div className="bg-periwinkle/10 border border-periwinkle/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="material-icons text-periwinkle text-sm mt-0.5">info</span>
              <div className="text-periwinkle text-sm">
                <p className="font-medium mb-1">About Bytes:</p>
                <p>Bytes are conversation threads within your community. {isAdmin ? 'As an admin, you can create threads anytime.' : 'Thread creation permissions are controlled by the room admin.'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <ActionButton
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleCreateThread}
            disabled={loading || !threadName.trim()}
          >
            {loading ? "Creating..." : "Create Byte"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default CreateThreadModal;
