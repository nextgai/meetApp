// src/pages/MeetingRoom.jsx ← COMPLETELY FIXED VERSION
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import Peer from "simple-peer";
import { format } from "date-fns";
import {
  Mic, MicOff, Video, VideoOff,
  ScreenShare, ScreenShareOff, Phone,
  Send, Smile, MessagesSquare, X,
  Users, Wifi, WifiOff
} from "lucide-react";

// Socket connection
const socket = io("http://localhost:5000");

export default function MeetingRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();

  // State management
  const [peers, setPeers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [myName, setMyName] = useState("");
  const [participants, setParticipants] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [isConnected, setIsConnected] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  // Refs
  const myVideo = useRef();
  const screenTrackRef = useRef();
  const streamRef = useRef();
  const peersRef = useRef({});
  const chatEndRef = useRef();

  const isAlone = peers.length === 0;
  const participantCount = Object.keys(participants).length;

  // Initialize meeting
  useEffect(() => {
    initializeMeeting();

    return () => {
      cleanup();
    };
  }, [roomId]);

  const initializeMeeting = async () => {
    try {
      // Get user name
      const savedName = localStorage.getItem("displayName") || "User";
      const name = prompt("Enter your name:", savedName) || "User";
      localStorage.setItem("displayName", name);
      setMyName(name);

      // Initialize myself as a participant
      setParticipants(prev => ({ ...prev, [socket.id]: name }));

      setConnectionStatus("Connecting media...");
      
      // Initialize media stream
      const stream = await initializeMediaStream();
      
      // Setup socket connection and listeners
      setupSocketConnection(name, stream);
      
    } catch (error) {
      console.error("Meeting initialization error:", error);
      setMediaError("Failed to access camera/microphone");
      setConnectionStatus("Media access failed");
      
      // Still try to connect without media
      const name = localStorage.getItem("displayName") || "User";
      setupSocketConnection(name, null);
    }
  };

  const initializeMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 } 
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
        myVideo.current.play().catch(console.error);
      }
      
      setMediaError(null);
      return stream;
      
    } catch (error) {
      console.error("Media access error:", error);
      setMediaError("Camera/microphone access denied");
      throw error;
    }
  };

  const setupSocketConnection = (userName, stream) => {
    // Socket connection events
    socket.on("connect", () => {
      console.log("Connected to server with ID:", socket.id);
      setIsConnected(true);
      setConnectionStatus("Joining room...");
      
      // Join room with user name
      socket.emit("join-room", roomId, userName);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      setConnectionStatus("Disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionStatus("Connection failed");
    });

    // Setup application event listeners
    setupApplicationListeners(userName, stream);
  };

  const setupApplicationListeners = (userName, stream) => {
    // ========== CRITICAL FIX: Handle existing users in room ==========
    socket.on("all-users", (existingUsers) => {
      console.log("🟢 Received existing users:", existingUsers);
      setConnectionStatus("Connected");
      
      const newPeers = [];
      
      // Create peer connections for each existing user
      existingUsers.forEach((user) => {
        if (user.id !== socket.id) {
          console.log(`Creating peer connection to existing user: ${user.name} (${user.id})`);
          const peer = createPeer(user.id, socket.id, stream, user.name);
          peersRef.current[user.id] = peer;
          newPeers.push({ peerId: user.id, peer });
          setParticipants(prev => ({ ...prev, [user.id]: user.name }));
        }
      });
      
      setPeers(newPeers);
      addSystemMessage(`Connected to room. ${existingUsers.length + 1} participants online.`);
    });

    // ========== CRITICAL FIX: Handle new user joining ==========
    socket.on("user-joined", (newUser) => {
      console.log("🟡 New user joined:", newUser);
      
      if (newUser.id !== socket.id) {
        console.log(`Creating peer connection to new user: ${newUser.name} (${newUser.id})`);
        const peer = addPeer(newUser.id, stream, newUser.name);
        peersRef.current[newUser.id] = peer;
        setPeers(prev => [...prev, { peerId: newUser.id, peer }]);
        setParticipants(prev => ({ ...prev, [newUser.id]: newUser.name }));
        addSystemMessage(`${newUser.name} joined the meeting`);
      }
    });

    // ========== Handle user leaving ==========
    socket.on("user-left", (userId) => {
      console.log("🔴 User left:", userId);
      
      if (peersRef.current[userId]) {
        peersRef.current[userId].destroy();
        delete peersRef.current[userId];
      }
      
      const leftName = participants[userId] || "Someone";
      setParticipants(prev => {
        const newParticipants = { ...prev };
        delete newParticipants[userId];
        return newParticipants;
      });
      
      setPeers(prev => prev.filter(p => p.peerId !== userId));
      addSystemMessage(`${leftName} left the meeting`);
    });

    // ========== WebRTC signaling - receiving offer ==========
    socket.on("user-signal", (payload) => {
      console.log("📡 Received signal from:", payload.callerName);
      
      if (peersRef.current[payload.callerId]) {
        peersRef.current[payload.callerId].signal(payload.signal);
      } else {
        console.warn("Peer not found for caller:", payload.callerId);
      }
    });

    // ========== WebRTC signaling - receiving answer ==========
    socket.on("receiving-signal", (payload) => {
      console.log("📡 Received return signal from:", payload.callerId);
      
      if (peersRef.current[payload.callerId]) {
        peersRef.current[payload.callerId].signal(payload.signal);
      }
    });

    // ========== CRITICAL FIX: Handle chat messages ==========
    socket.on("chat-message", (messageData) => {
      console.log("💬 Received chat message:", messageData);
      setMessages(prev => [...prev, { 
        name: messageData.name, 
        message: messageData.message, 
        timestamp: new Date(messageData.timestamp), 
        type: "other" 
      }]);
    });
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { 
      message: text, 
      type: "system", 
      timestamp: new Date(),
      id: Date.now() + Math.random()
    }]);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  const cleanup = () => {
    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    
    // Stop screen sharing
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
    }
    
    // Destroy all peer connections
    Object.values(peersRef.current).forEach(peer => {
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    });
    
    // Clear refs
    peersRef.current = {};
    
    // Disconnect socket
    if (socket.connected) {
      socket.disconnect();
    }
  };

  const leaveMeeting = () => {
    cleanup();
    navigate("/dashboard");
  };

  // ========== CRITICAL FIX: Send chat message ==========
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    console.log("💬 Sending chat message:", newMessage);
    
    // Send message to server
    socket.emit("send-chat", { roomId, message: newMessage });
    
    // Add my message to local state immediately
    setMessages(prev => [...prev, { 
      name: myName, 
      message: newMessage, 
      timestamp: new Date(), 
      type: "you",
      id: Date.now() + Math.random()
    }]);
    
    setNewMessage("");
  };

  const toggleMic = () => {
    if (!streamRef.current) {
      setMediaError("No media stream available");
      return;
    }
    
    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const enabled = !micOn;
      audioTracks[0].enabled = enabled;
      setMicOn(enabled);
    }
  };

  const toggleVideo = () => {
    if (!streamRef.current) {
      setMediaError("No media stream available");
      return;
    }
    
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const enabled = !videoOn;
      videoTracks[0].enabled = enabled;
      setVideoOn(enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" }
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;
      
      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach((peer) => {
        if (peer && !peer.destroyed) {
          const senders = peer._pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }
      });
      
      // Update local video display
      if (myVideo.current) {
        myVideo.current.srcObject = screenStream;
      }
      
      // Handle screen share end
      screenTrack.onended = () => {
        if (screenSharing) {
          stopScreenShare();
        }
      };
      
      setScreenSharing(true);
      addSystemMessage("You started screen sharing");
      
    } catch (error) {
      console.error("Screen share error:", error);
      if (error.name !== "NotAllowedError") {
        setMediaError("Screen sharing failed");
      }
    }
  };

  const stopScreenShare = async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    
    // Restore camera video track
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      
      Object.values(peersRef.current).forEach((peer) => {
        if (peer && !peer.destroyed) {
          const senders = peer._pc.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === "video");
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack);
          }
        }
      });
      
      if (myVideo.current) {
        myVideo.current.srcObject = streamRef.current;
      }
    }
    
    setScreenSharing(false);
    addSystemMessage("You stopped screen sharing");
  };

  // ========== CRITICAL FIX: Peer creation functions ==========
  const createPeer = (userToSignal, callerId, stream, userName) => {
    console.log(`Creating peer initiator to ${userName} (${userToSignal})`);
    
    const peer = new Peer({ 
      initiator: true, 
      trickle: false,
      stream: stream || undefined
    });
    
    peer.on("signal", (signal) => {
      console.log(`Sending signal to ${userName}`);
      socket.emit("sending-signal", { 
        targetId: userToSignal, 
        callerId: callerId, 
        callerName: myName,
        signal 
      });
    });
    
    peer.on("stream", (remoteStream) => {
      console.log(`✅ Received remote stream from: ${userName}`);
      updatePeerVideo(userToSignal, remoteStream);
    });
    
    peer.on("close", () => {
      console.log(`Peer connection closed: ${userToSignal}`);
      delete peersRef.current[userToSignal];
    });
    
    peer.on("error", (error) => {
      console.error(`Peer error with ${userName}:`, error);
    });
    
    return peer;
  };

  const addPeer = (callerId, stream, userName) => {
    console.log(`Adding peer receiver for ${userName} (${callerId})`);
    
    const peer = new Peer({ 
      initiator: false, 
      trickle: false,
      stream: stream || undefined
    });
    
    peer.on("signal", (signal) => {
      console.log(`Returning signal to ${userName}`);
      socket.emit("returning-signal", { 
        signal, 
        callerId 
      });
    });
    
    peer.on("stream", (remoteStream) => {
      console.log(`✅ Received remote stream from: ${userName}`);
      updatePeerVideo(callerId, remoteStream);
    });
    
    peer.on("close", () => {
      console.log(`Peer connection closed: ${callerId}`);
      delete peersRef.current[callerId];
    });
    
    peer.on("error", (error) => {
      console.error(`Peer error with ${userName}:`, error);
    });
    
    return peer;
  };

  const updatePeerVideo = (peerId, stream) => {
    // Wait a bit for DOM to be ready, then try multiple times
    const tryUpdateVideo = (attempt = 0) => {
      setTimeout(() => {
        const videoElement = document.getElementById(`video-${peerId}`);
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play().catch(e => {
            console.warn(`Video play failed for ${peerId}:`, e);
          });
          console.log(`✅ Video element updated for ${peerId}`);
        } else if (attempt < 5) {
          console.log(`Retrying video update for ${peerId}, attempt ${attempt + 1}`);
          tryUpdateVideo(attempt + 1);
        } else {
          console.warn(`Could not find video element for ${peerId} after ${attempt} attempts`);
        }
      }, 200 * (attempt + 1));
    };
    
    tryUpdateVideo();
  };

  // Debug: Log when peers change
  useEffect(() => {
    console.log("🔄 Peers updated:", peers.map(p => p.peerId));
    console.log("👥 Participants:", participants);
  }, [peers, participants]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col relative">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg px-6 py-4 flex justify-between items-center z-40 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="text-green-400" size={20} />
            ) : (
              <WifiOff className="text-red-400" size={20} />
            )}
            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {connectionStatus}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Room: {roomId}</h1>
          {myName && <span className="text-gray-300">Welcome, {myName}</span>}
        </div>
        
        <div className="flex items-center space-x-4">
          {mediaError && (
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-full transition-colors"
            >
              Reconnect
            </button>
          )}
          <div className="flex items-center space-x-2 text-white">
            <Users size={20} />
            <span className="text-lg font-medium">{participantCount} online</span>
          </div>
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={`flex-1 transition-all duration-300 ${showChat ? "mr-0 lg:mr-96" : ""}`}>
          {mediaError && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
                <span>{mediaError}</span>
              </div>
            </div>
          )}

          {isAlone ? (
            <div className="h-full flex items-center justify-center p-8">
              <div className="relative bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full border border-gray-700">
                <video 
                  ref={myVideo} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-96 object-cover bg-gray-900"
                />
                <div className="absolute bottom-6 left-6 bg-black/80 text-white px-6 py-3 rounded-full text-xl font-bold backdrop-blur border border-white/20">
                  {myName} {screenSharing && "• Sharing Screen"}
                  {!videoOn && " • Camera Off"}
                </div>
                <div className="absolute top-6 left-6 bg-yellow-500 text-black px-4 py-2 rounded-full text-sm font-medium">
                  Waiting for others to join...
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-4 h-full overflow-auto">
              {/* My video - always first */}
              <div className="relative bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 border-green-400">
                <video 
                  ref={myVideo} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full aspect-video object-cover bg-gray-900"
                />
                <div className="absolute bottom-3 left-3 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur">
                  {myName} (You) {screenSharing && "• Sharing"}
                  {!videoOn && " • Camera Off"}
                </div>
                {!videoOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-white text-center">
                      <VideoOff size={48} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Camera is off</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Other participants videos */}
              {peers.map(({ peerId }) => (
                <div key={peerId} className="relative bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-600">
                  <video 
                    id={`video-${peerId}`}
                    autoPlay 
                    playsInline 
                    className="w-full aspect-video object-cover bg-gray-900"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur">
                    {participants[peerId] || "Guest"}
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        <div className={`fixed lg:relative inset-y-0 right-0 w-full lg:w-96 bg-gray-800 shadow-2xl transform transition-transform duration-300 z-30 border-l border-gray-700 ${showChat ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-lg font-bold">Meeting Chat</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowChat(false)} 
                  className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessagesSquare size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start a conversation!</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div key={msg.id || index} className={`flex ${msg.type === "you" ? "justify-end" : msg.type === "system" ? "justify-center" : "justify-start"}`}>
                    <div className={`max-w-xs px-4 py-3 rounded-2xl ${
                      msg.type === "you" ? "bg-blue-600 text-white" : 
                      msg.type === "system" ? "bg-gray-700 text-gray-300 text-sm italic" : 
                      "bg-gray-700 text-white"
                    }`}>
                      {msg.type !== "system" && (
                        <div className="font-bold text-xs opacity-80 mb-1">
                          {msg.name}
                        </div>
                      )}
                      <div className="break-words">{msg.message}</div>
                      <div className="text-xs opacity-70 mt-1 text-right">
                        {format(new Date(msg.timestamp), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-4 z-40 backdrop-blur-lg bg-gray-800/95">
        <div className="flex justify-center items-center space-x-4 max-w-4xl mx-auto">
          <button 
            onClick={toggleMic}
            className={`p-4 rounded-full transition-all duration-200 ${
              micOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {micOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all duration-200 ${
              videoOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            {videoOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button 
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all duration-200 ${
              screenSharing ? "bg-green-500 hover:bg-green-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            {screenSharing ? <ScreenShareOff size={24} /> : <ScreenShare size={24} />}
          </button>

          <button 
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-full transition-all duration-200 ${
              showChat ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            <MessagesSquare size={24} />
          </button>

          <button 
            onClick={() => setShowLeaveDialog(true)}
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>

      {/* Leave Dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-gray-700">
            <h3 className="text-2xl font-bold mb-4 text-white">Leave Meeting?</h3>
            <p className="text-gray-300 mb-8">Are you sure you want to leave this meeting?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLeaveDialog(false)} 
                className="flex-1 py-4 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={leaveMeeting} 
                className="flex-1 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for control bar */}
      <div className="pb-24"></div>
    </div>
  );
}