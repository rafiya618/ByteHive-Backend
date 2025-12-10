import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth";
import Navbar from "../shared/Navbar";
import ChatMessage from "../components/Chat/ChatMessage";
import ChatInput from "../components/Chat/ChatInput";
import VideoRoomButton from "../components/CommunityDetail/VideoRoomButton";
import ChatSidebar from "../components/Chat/ChatSidebar";
import CreateThreadModal from "../components/Chat/CreateThreadModal";
import { chatApi } from "../api/chatApi";
import { communityApi } from "../api/communityApi";
import { getProfile } from "../api/ProfileApi";
import { io } from "socket.io-client";

// Socket will be created per-component to ensure listeners attach immediately

// Community info will be fetched dynamically

const CHAT_MESSAGES = [
  { id: 1, author: { name: "Allex johnson", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCGFljVK_1YLiLqNE8SMU0zsD2LUOv_ZJClfdq_DWp5FLd8KsDvQMnl0VOe2aFfU8eqc6M6I9aJ-VCGtFzHlUS0P9bjYnTWHMI5UO-pnf_7H4DGlvVnCe8Bj212iSAhJEonp7QjXn4VZAVbIpKHMYo4M70ouLkfY0wZPHju90a2vQzdL6Es79mMQ8NwXMHcJmqQaWhUuBwfkisr2uii-p0d3iFFfq4_RPcfykChX-MAS__NVdhAo3TLJvD4_LSMPxI_TLnrD1Gi_oFK" }, 
    message: "Has anyone tried the new app Router Features in Next.js 15?", time: "2:43 pm", isCurrentUser: false },
  { id: 2, author: { name: "Mary Chen", avatar: "https://images.unsplash.com/photo-1696960181436-1b6d9576354e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fHdvbWVuJTIwcHJvZmlsZSUyMHByb2Zlc3Npb25hbHxlbnwwfHwwfHx8MA%3D%3D" }, 
    message: "Yes! the new parallel routing is amazing.it's made our multi-tabbed dashboard so much easier to implement", time: "2:56 pm", isCurrentUser: false },
  { id: 3, author: { name: "John Smith", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0SOH_qdug48AdwWxvlB89VAMgWwLvCzU5nSDeh7sGBOxfkwtoGxXGFu3Q2JauQZWpKqk-GCgCttE6cJIsPEkbYBWNgz8qS6HIT-5Sz6LgHkDAzWnkSvAOUOk7CDaVV0qGaLh5TF5SZPN1EfhhvDKzelBH3komHVKuAU_sLPUdP82-LnV5uJEpBfaz0d1ZudZEkDGu7GEHq46ftKnljIDa0wEpEPuusxbFSIsOPoONgMi3EDnu1Bupe8IbBw6vKFxxdMaP6_2s5fii" }, 
    message: "I'm having an issue with client components in Server Actions.Can anyone help?", time: "2:55 pm", isCurrentUser: false },
  { id: 4, author: { name: "You", avatar: "https://images.unsplash.com/photo-1695927621677-ec96e048dce2?q=80&w=435&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" }, 
    message: "@John what specific issues are you having?I've working with Server Actions alot lately", time: "2:55 pm", isCurrentUser: true },
  { id: 5, author: { name: "John Smith", avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0SOH_qdug48AdwWxvlB89VAMgWwLvCzU5nSDeh7sGBOxfkwtoGxXGFu3Q2JauQZWpKqk-GCgCttE6cJIsPEkbYBWNgz8qS6HIT-5Sz6LgHkDAzWnkSvAOUOk7CDaVV0qGaLh5TF5SZPN1EfhhvDKzelBH3komHVKuAU_sLPUdP82-LnV5uJEpBfaz0d1ZudZEkDGu7GEHq46ftKnljIDa0wEpEPuusxbFSIsOPoONgMi3EDnu1Bupe8IbBw6vKFxxdMaP6_2s5fii" }, 
    message: "I'm trying to change state after a server action completes but i am getting a hydration error", time: "3:00 pm", isCurrentUser: false }
];

const ChatPage = () => {
  const { roomId, communityId } = useParams();
  const navigate = useNavigate();
  const { auth, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Get parameters from URL
  const urlUserId = searchParams.get('user_id');
  const urlCommunityId = searchParams.get('community_id') || communityId;
  
  // removed unused local message list; messages come from threads via sockets
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [threads, setThreads] = useState([]); // Store created threads
  const [selectedThread, setSelectedThread] = useState(null); // Add missing selectedThread state
  const [roomDetails, setRoomDetails] = useState(null);
  const [threadMessages, setThreadMessages] = useState({});
  const [messageLoading, setMessageLoading] = useState(false);
  const [community, setCommunity] = useState(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [memberProfiles, setMemberProfiles] = useState({}); // map userId -> profile data
  const messagesContainerRef = useRef(null);
  // Socket connection state
  const [socketConnected, setSocketConnected] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const socketRef = useRef(null);
  const authRef = useRef(auth);
  const currentThreadRef = useRef(currentThreadId);
  const memberProfilesRef = useRef(memberProfiles);
  const fetchMemberProfilesRef = useRef();

  // Keep latest auth in ref for socket event handlers
  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => { currentThreadRef.current = currentThreadId; }, [currentThreadId]);
  useEffect(() => { memberProfilesRef.current = memberProfiles; }, [memberProfiles]);

  const initializeChatRoom = useCallback(() => {
    // Set room data from URL parameters
    const roomInfo = {
      room_id: roomId,
      community_id: urlCommunityId || communityId,
      user_id: auth?.user?._id,
      url_user_id: urlUserId,
      message: "Successfully joined the community chat room!"
    };

    console.log('Initialized chat room with data:', roomInfo);
    setRoomData(roomInfo);
    setJoinSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setJoinSuccess(false);
    }, 3000);
  }, [roomId, urlCommunityId, communityId, auth?.user?._id, urlUserId]);

  // Check authentication and log parameters
  useEffect(() => {
    console.log('ChatPage mounted with parameters:', {
      roomId,
      communityId,
      urlUserId,
      urlCommunityId,
      authUserId: auth?.user?._id
    });

    if (!authLoading && !auth?.token) {
      const redirectPath = roomId 
        ? `/room1/${roomId}?user_id=${urlUserId}&community_id=${urlCommunityId}`
        : `/chat/${communityId}`;
      
      navigate('/login', { 
        state: { from: redirectPath },
        replace: true 
      });
      return;
    }
    
    if (!authLoading && auth?.token) {
      initializeChatRoom();
    }
  }, [auth, authLoading, roomId, communityId, urlUserId, urlCommunityId, navigate, initializeChatRoom]);
 

  // NOTE: simple local add-message helper removed because messages are added via socket events

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCreateByte = () => {
    setShowCreateThreadModal(true);
  };

  const handleCreateThread = (threadData) => {
    console.log('Thread created successfully:', threadData);
    
    // Add the new thread to the threads list
    setThreads(prev => [...prev, {
      ...threadData,
      id: threadData.thread_id,
      name: threadData.thread_name,
      isOwner: true
    }]);
    
    // Show success message
    alert(`✅ Byte "${threadData.thread_name}" created successfully!`);
  };

  // Socket connection management - initialize once
  useEffect(() => {
    if (socketRef.current) return; // already initialized

    const s = io("http://localhost:5050", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    socketRef.current = s;

    const onConnect = () => {
      console.log('Socket connected:', s.id);
      setSocketConnected(true);
    };

    const onDisconnect = (reason) => {
      console.log('Socket disconnected', reason);
      setSocketConnected(false);
    };

    const onConnectError = (err) => {
      console.warn('Socket connect_error', err && err.message ? err.message : err);
    };

    const onNewMessage = (data) => {
      // Use latest auth from ref
      const currentAuth = authRef.current;
      console.log('New message received via socket:', data);

      if (data.message && data.message.thread_id) {
        const threadId = data.message.thread_id;

        const senderId = data.message.sender_id;
        const profile = (memberProfilesRef.current || {})[senderId];

        const authorName = senderId === currentAuth?.user?._id ? 'You' : (profile?.full_name || profile?.name || 'User');
        const authorAvatar = senderId === currentAuth?.user?._id
          ? 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
          : (profile?.profile_image || profile?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=808080&color=fff`);

        const formattedMessage = {
          id: data.message.message_id,
          senderId: senderId,
          author: {
            name: authorName,
            avatar: authorAvatar
          },
          message: data.message.content,
          time: new Date(data.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isCurrentUser: senderId === currentAuth?.user?._id
        };

        // If we don't have the sender's profile yet, fetch it in background
        if (!profile && senderId) {
          try {
            fetchMemberProfilesRef.current?.([senderId]);
          } catch (err) {
            console.warn('Background profile fetch failed for', senderId, err);
          }
        }

        setThreadMessages(prev => ({
          ...prev,
          [threadId]: [...(prev[threadId] || []), formattedMessage]
        }));

        console.log('Message added to thread:', threadId, formattedMessage);
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('new_message', onNewMessage);

    // If already connected by the time listeners are attached
    if (s.connected) setSocketConnected(true);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.off('new_message', onNewMessage);

      // Leave current thread if any
      if (currentThreadRef.current && authRef.current?.user?._id) {
        s.emit('leave_thread', {
          thread_id: currentThreadRef.current,
          user_id: authRef.current.user._id
        });
      }

      try {
        s.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  // Emit join_room when we have roomData and socket is connected
  useEffect(() => {
    if (roomData?.room_id && socketRef.current && socketRef.current.connected && auth?.user?._id) {
      console.log('Emitting join_room for room:', roomData.room_id, 'user:', auth.user._id);
      socketRef.current.emit('join_room', {
        room_id: roomData.room_id,
        user_id: auth.user._id
      });
    }
  }, [roomData?.room_id, socketConnected, auth?.user?._id]);

  // Fetch profiles for a list of member IDs and store them in memberProfiles map
  const fetchMemberProfiles = useCallback(async (memberIds = []) => {
    try {
      const uniqueIds = Array.from(new Set(memberIds.filter(Boolean)));
      if (uniqueIds.length === 0) return;

      // Filter out ids we already have
      const idsToFetch = uniqueIds.filter(id => !memberProfiles[id]);
      if (idsToFetch.length === 0) return;

      const promises = idsToFetch.map(id => getProfile({ userId: id }).then(res => ({ id, res })).catch(err => ({ id, err })));
      const results = await Promise.all(promises);

      const updates = {};
      results.forEach(r => {
        if (r.res && r.res.data) {
          updates[r.id] = r.res.data;
        } else if (r.res && (r.res.community || r.res.user)) {
          // handle various shapes
          updates[r.id] = r.res.community || r.res.user || r.res;
        } else {
          // error or unexpected shape: set minimal placeholder
          updates[r.id] = { full_name: 'Unknown', profile_image: null };
          if (r.err) console.warn('Failed to fetch profile for', r.id, r.err);
        }
      });

      setMemberProfiles(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error fetching member profiles:', error);
    }
  }, [memberProfiles]);

  // Keep a ref to the fetch helper so socket handlers can call it without creating deps
  useEffect(() => {
    fetchMemberProfilesRef.current = fetchMemberProfiles;
  }, [fetchMemberProfiles]);

  // Update existing messages' author info when memberProfiles load
  useEffect(() => {
    if (!memberProfiles || Object.keys(memberProfiles).length === 0) return;

    setThreadMessages(prev => {
      let changed = false;
      const next = {};

      for (const [threadId, msgs] of Object.entries(prev)) {
        next[threadId] = msgs.map(m => {
          if (!m.senderId) return m;
          const profile = memberProfiles[m.senderId];
          if (!profile) return m;

          const name = m.senderId === auth?.user?._id ? 'You' : (profile.full_name || profile.name || 'User');
          const avatar = m.senderId === auth?.user?._id
            ? 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
            : (profile.profile_image || profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=808080&color=fff`);

          if (m.author && m.author.name === name && m.author.avatar === avatar) return m;
          changed = true;
          return { ...m, author: { name, avatar } };
        });
      }

      return changed ? next : prev;
    });
  }, [memberProfiles, auth?.user?._id]);

  const fetchRoomDetails = useCallback(async () => {
    try {
      if (!roomData?.room_id) return;
      console.log('Fetching room details for room:', roomData.room_id);
      const response = await chatApi.getChatRoomDetails(roomData.room_id);
      console.log('Room details response:', response);
      
      if (response.status === 'success' || response.room) {
        const room = response.room || response;
        setRoomDetails(room);
        console.log('Room admin check:', {
          roomAdminId: room.admin_id,
          currentUserId: auth?.user?._id,
          isAdmin: room.admin_id === auth?.user?._id
        });
        // Fetch member profiles for members present in the room
        if (room.members && Array.isArray(room.members) && room.members.length > 0) {
          fetchMemberProfiles(room.members);
        }
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }
  }, [roomData?.room_id, auth?.user?._id, fetchMemberProfiles]);

  const fetchThreads = useCallback(async () => {
    try {
      if (!roomData?.room_id) return;
      console.log('Fetching threads for room:', roomData.room_id);
      const response = await chatApi.getChatThreads(roomData.room_id);
      
      if (response.status === 'success') {
        const threadsWithOwnership = response.threads.map(thread => ({
          ...thread,
          id: thread.thread_id,
          name: thread.thread_name,
          created_by: thread.created_by, // Keep track of who created the thread
          isOwner: thread.created_by === auth?.user?._id
        }));
        
        setThreads(threadsWithOwnership);
        console.log('Threads loaded with ownership:', threadsWithOwnership.map(t => ({
          id: t.thread_id,
          name: t.thread_name,
          created_by: t.created_by,
          isOwner: t.isOwner,
          canDelete: roomDetails?.admin_id === auth?.user?._id || t.isOwner
        })));
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
      // Don't show error for threads, just keep empty state
    }
  }, [roomData?.room_id, auth?.user?._id, roomDetails?.admin_id]);

  const fetchThreadMessages = useCallback(async (threadId) => {
    if (threadMessages[threadId]) {
      // Messages already loaded for this thread
      return;
    }

    setMessageLoading(true);
    try {
      console.log('Fetching messages for thread:', threadId);
      const response = await chatApi.getChatMessages(threadId);
      
      if (response.status === 'success') {
        // Transform backend messages to UI format using memberProfiles if available
        const formattedMessages = response.messages.map(msg => {
          const senderId = msg.sender_id;
          const profile = (memberProfilesRef.current || {})[senderId];
          const name = senderId === auth?.user?._id ? 'You' : (profile?.full_name || profile?.name || 'User');
          const avatar = senderId === auth?.user?._id
            ? 'https://ui-avatars.com/api/?name=You&background=0D8ABC&color=fff'
            : (profile?.profile_image || profile?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=808080&color=fff`);

          // If profile not present, fetch it in background
          if (!profile && senderId) {
            fetchMemberProfilesRef.current?.([senderId]);
          }

          return {
            id: msg.message_id,
            senderId: senderId,
            author: { name, avatar },
            message: msg.content,
            time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isCurrentUser: senderId === auth?.user?._id
          };
        });

        setThreadMessages(prev => ({
          ...prev,
          [threadId]: formattedMessages
        }));
        
        console.log('Formatted messages loaded:', formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching thread messages:', error);
      // Set empty messages for this thread
      setThreadMessages(prev => ({
        ...prev,
        [threadId]: []
      }));
    } finally {
      setMessageLoading(false);
    }
  }, [threadMessages, auth?.user?._id]);

  const handleThreadClick = (thread) => {
    console.log('Thread selected:', thread);
    
    // Leave previous thread room
    if (currentThreadId && auth?.user?._id) {
      console.log('Leaving previous thread:', currentThreadId);
      socketRef.current?.emit('leave_thread', {
        thread_id: currentThreadId,
        user_id: auth.user._id
      });
    }

    // Set new selected thread
    setSelectedThread(thread);
    setCurrentThreadId(thread.thread_id);

    // Join new thread room
    if (thread.thread_id && auth?.user?._id) {
      console.log('Joining new thread:', thread.thread_id);
      socketRef.current?.emit('join_thread', {
        thread_id: thread.thread_id,
        user_id: auth.user._id
      });
    }
  };

  // Fetch room details and threads when room is initialized
  useEffect(() => {
    if (roomData && roomData.room_id) {
      fetchRoomDetails();
      fetchThreads();
    }
  }, [roomData, fetchRoomDetails, fetchThreads]);

  // Fetch community metadata to replace hard-coded header
  useEffect(() => {
    const id = urlCommunityId;
    if (!id) return;

    let cancelled = false;
    const load = async () => {
      setCommunityLoading(true);
      try {
        const res = await communityApi.getCommunityDetails(id);
        // API may return { community: {...} } or the community object directly
        const comm = res?.community || res;
        if (!cancelled) setCommunity(comm);
      } catch (err) {
        console.error('Error fetching community details:', err);
      } finally {
        if (!cancelled) setCommunityLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [urlCommunityId]);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (selectedThread && selectedThread.thread_id) {
      fetchThreadMessages(selectedThread.thread_id);
    }
  }, [selectedThread, fetchThreadMessages]);

  // Auto-scroll to bottom when messages change for the selected thread
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !selectedThread) return;

    // Wait for DOM to update
    const t = setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);

    return () => clearTimeout(t);
  }, [threadMessages, selectedThread]);

  

  const handleDeleteThread = async (thread) => {
    if (!window.confirm(`Are you sure you want to delete the thread "${thread.name}"?`)) {
      return;
    }

    try {
      const response = await chatApi.deleteChatThread(
        roomData.room_id, 
        thread.thread_id, 
        auth?.user?._id
      );
      
      if (response.status === 'success') {
        // Remove thread from list
        setThreads(prev => prev.filter(t => t.thread_id !== thread.thread_id));
        
        // Clear selected thread if it was the deleted one
        if (selectedThread && selectedThread.thread_id === thread.thread_id) {
          setSelectedThread(null);
        }
        
        // Remove messages for this thread
        setThreadMessages(prev => {
          const updated = { ...prev };
          delete updated[thread.thread_id];
          return updated;
        });
        
        alert(`✅ Thread "${thread.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      
      if (error.message.includes('Not allowed')) {
        alert('❌ You do not have permission to delete this thread. Only the room admin or thread creator can delete threads.');
      } else {
        alert(`❌ Failed to delete thread: ${error.message}`);
      }
    }
  };

  const handleSendThreadMessage = async (messageText) => {
    if (!selectedThread || !messageText.trim() || !roomData?.room_id) {
      console.log('Cannot send message:', {
        hasSelectedThread: !!selectedThread,
        hasMessageText: !!messageText.trim(),
        hasRoomId: !!roomData?.room_id
      });
      return;
    }

    try {
      console.log('Sending thread message:', {
        roomId: roomData.room_id,
        threadId: selectedThread.thread_id,
        senderId: auth?.user?._id,
        content: messageText.trim()
      });

      // Send message via API (which will emit socket event from backend)
      const response = await chatApi.sendChatMessage(
        roomData.room_id,
        selectedThread.thread_id,
        auth?.user?._id,
        messageText.trim()
      );
      
      if (response.status === 'success') {
        console.log('Message sent successfully:', response);
        // Note: Don't add message to state here - it will come via socket event
        // This prevents duplicate messages and ensures real-time sync
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Handle specific error cases
      if (error.message.includes('User not in room')) {
        alert('❌ You are not a member of this chat room.');
      } else if (error.message.includes('Thread not found')) {
        alert('❌ This thread no longer exists.');
      } else if (error.message.includes('Room not found')) {
        alert('❌ Chat room not found.');
      } else {
        alert(`❌ Failed to send message: ${error.message}`);
      }
    }
  };

  // Check if user is admin - with better logging
  const isAdmin = roomDetails && roomDetails.admin_id === auth?.user?._id;
  
  console.log('Admin check in render:', {
    roomDetails: roomDetails,
    roomAdminId: roomDetails?.admin_id,
    currentUserId: auth?.user?._id,
    isAdmin: isAdmin
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-rich-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!auth?.token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-rich-black">
      {/* Navbar */}
      <Navbar />
      
      {/* Success Message - with socket connection status */}
      {joinSuccess && roomData && (
        <div className="w-full bg-green-600/20 border-b border-green-600/30 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="text-green-400 text-sm flex items-center gap-2">
              <span className="material-icons text-base">check_circle</span>
              <span>✅ {roomData.message}</span>
              {roomData.room_id && (
                <span className="text-green-300 ml-4">Room: {roomData.room_id}</span>
              )}
              {/* Socket connection indicator */}
              <span className={`ml-4 flex items-center gap-1 ${socketConnected ? 'text-green-300' : 'text-yellow-400'}`}>
                <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                {socketConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Layout Container */}
      <div className="flex h-[calc(100vh-84px)] relative">
        {/* Sidebar */}
        <div className="hidden lg:block">
          <ChatSidebar 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar}
            threads={threads}
            onCreateByte={handleCreateByte}
            onThreadClick={handleThreadClick} // Updated to use socket-aware handler
            onDeleteThread={handleDeleteThread}
            selectedThread={selectedThread}
            isAdmin={isAdmin}
            currentUserId={auth?.user?._id}
          />
        </div>
        
        {/* Mobile Sidebar */}
        <div className="lg:hidden">
          <ChatSidebar 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar}
            threads={threads}
            onCreateByte={handleCreateByte}
            onThreadClick={handleThreadClick} // Updated to use socket-aware handler
            onDeleteThread={handleDeleteThread}
            selectedThread={selectedThread}
            isAdmin={isAdmin}
            currentUserId={auth?.user?._id}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 relative">
          {/* Background Blur Effect */}
          <div className="absolute z-0" style={{ width: 637, height: 300, top: -38, left: "50%", transform: "translateX(-50%)", 
               background: "#1A1842B3", filter: "blur(100px)", boxShadow: "0px 4px 100px 500px #00000066", 
               borderRadius: 30, pointerEvents: "none" }} />

          {/* Chat Header */}
          <div className="w-full pt-8 pb-12 relative z-10">
            <div className="w-full px-4 lg:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  {/* Mobile hamburger menu */}
                  <button 
                    onClick={toggleSidebar}
                    className="lg:hidden hover:text-periwinkle transition-colors flex-shrink-0"
                  >
                    <span className="material-icons text-white text-2xl">menu</span>
                  </button>
                  
                  <img
                    src={community?.image || 'https://ui-avatars.com/api/?name=Community&background=111827&color=fff'}
                    alt={community?.community_name || 'Community'}
                    className="w-28 h-28 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <h1 className="font-fenix text-3xl md:text-4xl text-white font-normal mb-2">
                      {community?.community_name || (communityLoading ? 'Loading community...' : 'Community')}
                    </h1>
                    <p className="font-lato text-columbia-blue text-base">
                      {roomDetails?.members ? `${roomDetails.members.length} members` : (communityLoading ? 'Loading members...' : `${community?.no_of_followers ?? community?.followers?.length ?? 0} members`)}
                      {roomData && roomData.room_id && (
                        <span className="text-periwinkle ml-4 text-sm">
                          • Room: {roomData.room_id}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <VideoRoomButton />
                  {['people', 'info'].map(icon => (
                    <button key={icon} className="text-white hover:text-periwinkle transition-colors">
                      <span className="material-icons text-2xl">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages and Input - Only show if thread is selected */}
          <div className="flex-1 flex flex-col relative z-10 min-h-0">
            {selectedThread ? (
              // Show thread-specific chat interface
              <>
                {/* Thread Header - with real-time message count */}
                <div className="px-8 lg:px-16 py-4 border-b border-navbar-border bg-navbar-bg/50">
                  <div className="flex items-center gap-3">
                    <span className="text-periwinkle text-2xl">#</span>
                    <h3 className="text-white font-fenix text-xl">{selectedThread.name}</h3>
                    <span className="text-desc text-sm">
                      • {threadMessages[selectedThread.thread_id]?.length || 0} messages
                    </span>
                    {socketConnected && currentThreadId === selectedThread.thread_id && (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-4 pb-6 px-8 lg:px-16" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--rich-black) transparent'
                }}>
                  {messageLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-white flex items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-periwinkle"></div>
                        Loading messages...
                      </div>
                    </div>
                  ) : (threadMessages[selectedThread.thread_id] || []).length > 0 ? (
                    <>
                      {/* Add some padding at the top */}
                      <div className="pt-4"></div>
                      {(threadMessages[selectedThread.thread_id] || []).map((message) => 
                        <ChatMessage key={message.id} {...message} />
                      )}
                    </>
                  ) : (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center text-desc">
                        <div className="text-4xl mb-4">💬</div>
                        <p>No messages in this thread yet.</p>
                        <p className="text-sm mt-2">Be the first to start the conversation!</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area - with socket connection status */}
                <div className="px-8 lg:px-16">
                  <ChatInput 
                    onSendMessage={handleSendThreadMessage}
                    placeholder={`Message #${selectedThread.name}${!socketConnected ? ' (Connecting...)' : ''}`}
                    disabled={!socketConnected}
                  />
                </div>
              </>
            ) : (
              // Show welcome message when no thread is selected
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-6xl text-desc mb-6">💬</div>
                  <h3 className="text-white text-2xl font-fenix mb-4">Welcome to Community Chat!</h3>
                  <p className="text-desc text-lg mb-6">
                    Select a thread (Byte) from the sidebar to start chatting with community members.
                  </p>
                  <div className="space-y-2 text-desc text-sm">
                    <p>• Create new threads to discuss specific topics</p>
                    <p>• Join existing conversations</p>
                    <p>• Connect with like-minded developers</p>
                  </div>
                  {roomData && (
                    <div className="mt-6 p-4 bg-navbar-bg rounded-lg border border-navbar-border">
                      <div className="text-xs text-desc space-y-1">
                        <div>Room: <span className="text-periwinkle font-mono">{roomData.room_id}</span></div>
                        {threads.length > 0 && (
                          <div>Available threads: <span className="text-periwinkle">{threads.length}</span></div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                          <span>{socketConnected ? 'Real-time messaging active' : 'Connecting to chat server...'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={showCreateThreadModal}
        onClose={() => setShowCreateThreadModal(false)}
        onCreateThread={handleCreateThread}
        roomId={roomData?.room_id}
        userId={auth?.user?._id}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default ChatPage;