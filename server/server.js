require('dotenv').config({ path: '../.env' }); // Load .env from root directory
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

// Attach socket.io to the app so routes can use it
app.set('io', io);

io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected:', socket.id);
  });
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
const visitorsRouter = require('./routes/visitors');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const zonesRouter = require('./routes/zones');
const blacklistRouter = require('./routes/blacklist');
const alertsRouter = require('./routes/alerts');
const notificationRoutes = require('./routes/notificationRoutes');
const attendanceRouter = require('./routes/attendance');
const branchSettingsRouter = require('./routes/branchSettings');
const superAdminRouter = require('./routes/superAdmin');
const companyRouter = require('./routes/company');
const auditLogsRouter = require('./routes/auditLogs');

app.use('/api/visitors', visitorsRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/blacklist', blacklistRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRouter);
app.use('/api/branch-settings', branchSettingsRouter);
app.use('/api/super-admin', superAdminRouter);
app.use('/api/company', companyRouter);
app.use('/api/audit-logs', auditLogsRouter);

app.get('/api/network-ip', (req, res) => {
  const os = require('os');
  const nets = os.networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(nets)) {
    // Skip virtual network adapters (WSL, Hyper-V, VMware, VirtualBox)
    if (name.toLowerCase().includes('veth') || name.toLowerCase().includes('wsl') || name.toLowerCase().includes('vmware') || name.toLowerCase().includes('virtual')) {
      continue;
    }
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
    if (ip !== 'localhost') break;
  }
  res.json({ ip });
});

// Serve frontend static files in production
const path = require('path');
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route to serve the React app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
