import React, { useState, useEffect } from "react";

const ChatSidebar = ({ 
  isOpen, 
  onToggle, 
  threads = [], 
  onCreateByte = () => {}, 
  onThreadClick = () => {},
  onDeleteThread = () => {},
  selectedThread = null,
  isAdmin = false,
  currentUserId = null
}) => {
  const [threadMenuOpen, setThreadMenuOpen] = useState(null);

  const handleThreadMenu = (threadId, e) => {
    e.stopPropagation(); // Prevent thread selection when opening menu
    setThreadMenuOpen(threadMenuOpen === threadId ? null : threadId);
  };

  const canDeleteThread = (thread) => {
    // Admin can delete any thread, thread creator can delete their own thread
    const canDelete = isAdmin || (thread.created_by === currentUserId);
    
    console.log('Delete permission check:', {
      threadId: thread.thread_id,
      threadName: thread.thread_name || thread.name,
      threadCreatedBy: thread.created_by,
      currentUserId: currentUserId,
      isAdmin: isAdmin,
      canDelete: canDelete
    });
    
    return canDelete;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setThreadMenuOpen(null);
    };

    if (threadMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [threadMenuOpen]);

  const ThreadItem = ({ thread, isMobile = false }) => {
    const showDeleteOption = canDeleteThread(thread);
    
    return (
      <div 
        className={`relative p-3 rounded-lg cursor-pointer transition-colors ${
          selectedThread?.thread_id === thread.thread_id
            ? 'bg-periwinkle/20 border border-periwinkle/30'
            : 'bg-rich-black-light hover:bg-periwinkle/10'
        }`}
      >
        <div 
          onClick={() => {
            onThreadClick(thread);
            if (isMobile) onToggle(); // Close mobile sidebar when thread is selected
          }}
          className="flex items-center gap-2 flex-1"
        >
          <span className="text-periwinkle">#</span>
          <div className="text-white font-medium text-sm flex-1">{thread.thread_name || thread.name}</div>
          {selectedThread?.thread_id === thread.thread_id && (
            <span className="text-periwinkle text-xs bg-periwinkle/20 px-2 py-0.5 rounded">Active</span>
          )}
        </div>
        
        {/* Thread Options - Only show if user can delete */}
        {showDeleteOption && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => handleThreadMenu(thread.thread_id, e)}
              className="text-desc hover:text-white p-1 rounded transition-colors"
              title="Thread options"
            >
              <span className="material-icons text-sm">more_vert</span>
            </button>
            
            {threadMenuOpen === thread.thread_id && (
              <div className="absolute top-full right-0 mt-1 bg-navbar-bg border border-navbar-border rounded-lg shadow-lg py-2 min-w-[140px] z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setThreadMenuOpen(null);
                    onDeleteThread(thread);
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-400/10 transition-colors flex items-center gap-2"
                >
                  <span className="material-icons text-sm">delete</span>
                  Delete Thread
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="text-desc text-xs mt-1 flex items-center gap-2">
          <span>Created {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : 'recently'}</span>
          {thread.created_by === currentUserId && (
            <span className="text-periwinkle text-xs bg-periwinkle/20 px-2 py-0.5 rounded">You</span>
          )}
          {isAdmin && thread.created_by !== currentUserId && (
            <span className="text-yellow-400 text-xs bg-yellow-400/20 px-2 py-0.5 rounded">Admin</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 bg-navbar-bg border-r border-navbar-border h-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-fenix text-lg">Threads (Bytes)</h3>
            <button 
              onClick={onCreateByte}
              className="text-periwinkle hover:text-white transition-colors p-2 rounded-full hover:bg-periwinkle/10"
              title="Create new byte"
            >
              <span className="material-icons">add</span>
            </button>
          </div>
          
          {/* Threads List */}
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="text-desc text-sm text-center py-8">
                No bytes available yet.
                <br />
                <span className="text-xs">Click the + button to create your first byte!</span>
              </div>
            ) : (
              threads.map((thread) => (
                <ThreadItem key={thread.thread_id || thread.id} thread={thread} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black opacity-50" onClick={onToggle}></div>
          
          {/* Sidebar */}
          <div className="relative flex flex-col w-80 bg-navbar-bg border-r border-navbar-border">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-fenix text-lg">Threads (Bytes)</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={onCreateByte}
                    className="text-periwinkle hover:text-white transition-colors p-2 rounded-full hover:bg-periwinkle/10"
                    title="Create new byte"
                  >
                    <span className="material-icons">add</span>
                  </button>
                  <button
                    onClick={onToggle}
                    className="text-periwinkle hover:text-white transition-colors p-2 rounded-full hover:bg-periwinkle/10"
                  >
                    <span className="material-icons">close</span>
                  </button>
                </div>
              </div>
              
              {/* Threads List */}
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="text-desc text-sm text-center py-8">
                    No bytes available yet.
                    <br />
                    <span className="text-xs">Click the + button to create your first byte!</span>
                  </div>
                ) : (
                  threads.map((thread) => (
                    <ThreadItem key={thread.thread_id || thread.id} thread={thread} isMobile={true} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatSidebar;