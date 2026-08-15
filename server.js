const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const env = require('./src/config/env');
const db = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const roomRoutes = require('./src/routes/room.routes');
const errorHandler = require('./src/middleware/error.middleware');
const { roomManager } = require('./src/services/room.manager');
const setupStationSockets = require('./src/sockets/station.socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  pingTimeout: 30000,
  pingInterval: 15000
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    totalRooms: roomManager.rooms.size
  });
});

// REST API Routes
const adminRoutes = require('./src/routes/admin.routes');
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/admin', adminRoutes);

// SPA Fallback to index.html for unknown GET requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

// Attach Socket.IO Handlers
setupStationSockets(io);

// Start Server and Initialize Multi-Room Engine
const PORT = env.PORT;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`=================================================`);
  console.log(`🎧 LOFI & CHILL RADIO LOUNGE (Multi-Room Production)`);
  console.log(`🚀 Server running on: http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`=================================================`);

  // Verify and initialize Supabase PostgreSQL Database
  await db.initDatabase();

  // Initialize Multi-Room Engine from Supabase
  await roomManager.initAllRooms(io);
});
