// Simple WebSocket test script
const { Server } = require('http');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');

// Create HTTP server
const server = createServer();

// Create Socket.IO server
const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Handle connections
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  // Handle user room joining
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Handle admin room joining
  socket.on('join_admin_room', () => {
    socket.join('admin_room');
    console.log('👨‍💼 Admin joined admin room');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start server
const PORT = 5001;
server.listen(PORT, () => {
  console.log(`🚀 WebSocket test server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for connections`);
});

// Test function to emit events
function testEmit() {
  console.log('📢 Testing WebSocket events...');
  
  // Emit test events
  io.to('admin_room').emit('design_review_updated', {
    orderId: 1,
    reviewData: { status: 'approved' },
    timestamp: new Date().toISOString()
  });
  
  io.to('user_1').emit('picture_reply_received', {
    orderId: 1,
    replyData: { pictureReplies: [] },
    timestamp: new Date().toISOString()
  });
  
  console.log('✅ Test events emitted');
}

// Test after 5 seconds
setTimeout(testEmit, 5000);
