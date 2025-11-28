// server/index.js ← OPTIMIZED VERSION
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-room', (roomId, userName) => {
    console.log(`🎯 User ${userName} (${socket.id}) joining room ${roomId}`);
    
    // Leave any previous rooms
    const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    previousRooms.forEach(room => {
      socket.leave(room);
      console.log(`⬅️  User ${socket.id} left previous room: ${room}`);
    });
    
    socket.join(roomId);
    
    // Initialize room if doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }
    
    // Store user info with socket ID as key
    rooms[roomId][socket.id] = { 
      id: socket.id, 
      name: userName 
    };

    // Get existing users (excluding current user)
    const existingUsers = Object.values(rooms[roomId])
      .filter(user => user.id !== socket.id)
      .map(user => ({ id: user.id, name: user.name }));

    // Send existing users to the newcomer
    socket.emit('all-users', existingUsers);
    
    // Notify others about the new user
    socket.to(roomId).emit('user-joined', { 
      id: socket.id, 
      name: userName 
    });

    console.log(`✅ User ${userName} joined room ${roomId} → ${Object.keys(rooms[roomId]).length} users total`);
    console.log(`👥 Room ${roomId} participants:`, Object.values(rooms[roomId]).map(u => u.name));
  });

  // WebRTC signaling
  socket.on('sending-signal', (payload) => {
    console.log(`📡 Signaling: ${socket.id} → ${payload.targetId}`);
    
    // Validate target user exists
    const targetRoom = findUserRoom(payload.targetId);
    if (targetRoom && rooms[targetRoom][payload.targetId]) {
      io.to(payload.targetId).emit('user-signal', { 
        signal: payload.signal, 
        callerId: payload.callerId,
        callerName: payload.callerName 
      });
    } else {
      console.warn(`❌ Target user ${payload.targetId} not found for signaling`);
    }
  });

  socket.on('returning-signal', (payload) => {
    console.log(`📡 Return signal: ${socket.id} → ${payload.callerId}`);
    
    // Validate caller user exists
    const callerRoom = findUserRoom(payload.callerId);
    if (callerRoom && rooms[callerRoom][payload.callerId]) {
      io.to(payload.callerId).emit('receiving-signal', { 
        signal: payload.signal, 
        callerId: socket.id 
      });
    } else {
      console.warn(`❌ Caller user ${payload.callerId} not found for return signal`);
    }
  });

  // Chat functionality - FIXED: Added validation and logging
  socket.on('send-chat', (data) => {
    console.log(`💬 Chat message from ${socket.id} in room ${data.roomId}: ${data.message}`);
    
    const user = rooms[data.roomId]?.[socket.id];
    if (user) {
      // Broadcast to all users in room including sender for consistency
      io.to(data.roomId).emit('chat-message', {
        name: user.name,
        message: data.message,
        timestamp: new Date(),
        userId: socket.id
      });
      console.log(`✅ Chat message delivered to room ${data.roomId}`);
    } else {
      console.warn(`❌ User ${socket.id} not found in room ${data.roomId} for chat`);
    }
  });

  // User is typing indicator
  socket.on('typing-start', (data) => {
    const user = rooms[data.roomId]?.[socket.id];
    if (user) {
      socket.to(data.roomId).emit('user-typing', {
        userId: socket.id,
        userName: user.name,
        typing: true
      });
    }
  });

  socket.on('typing-stop', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userId: socket.id,
      userName: rooms[data.roomId]?.[socket.id]?.name,
      typing: false
    });
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ User disconnected: ${socket.id} - Reason: ${reason}`);
    
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const userName = rooms[roomId][socket.id].name;
        
        // Notify others this user left
        socket.to(roomId).emit('user-left', socket.id);
        
        // Remove user from room
        delete rooms[roomId][socket.id];
        
        // Clean up empty rooms
        if (Object.keys(rooms[roomId]).length === 0) {
          delete rooms[roomId];
          console.log(`🗑️  Room ${roomId} deleted (empty)`);
        }
        
        console.log(`⬅️  User ${userName} left room ${roomId}`);
        break;
      }
    }
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });

  // Helper function to find which room a user is in
  function findUserRoom(userId) {
    for (const roomId in rooms) {
      if (rooms[roomId][userId]) {
        return roomId;
      }
    }
    return null;
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const roomCount = Object.keys(rooms).length;
  const totalUsers = Object.values(rooms).reduce((acc, room) => acc + Object.keys(room).length, 0);
  
  res.json({
    status: 'ok',
    rooms: roomCount,
    totalUsers: totalUsers,
    roomDetails: rooms
  });
});

// Get room info
app.get('/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const room = rooms[roomId];
  
  if (room) {
    res.json({
      roomId: roomId,
      userCount: Object.keys(room).length,
      users: Object.values(room)
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

server.listen(5000, () => {
  console.log('🚀 Signaling server running on http://localhost:5000');
  console.log('📊 Health check available at http://localhost:5000/health');
});