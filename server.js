const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const bookRoutes = require('./routes/bookRoutes');
const requestRoutes = require('./routes/requestRoutes');
const requestController = require('./controllers/requestController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/books', bookRoutes);
app.use('/api/requests', requestRoutes);
app.get('/api/stats', requestController.getStats);

// Database status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    database: db.getDatabaseType(),
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA-like navigation
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server and Initialize DB
async function startServer() {
  try {
    const dbType = await db.initializeDatabase();
    console.log(`🚀 Database ready: Using [${dbType.toUpperCase()}]`);

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`📚 Book Swap Platform is running!`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`📊 DB Engine: ${dbType.toUpperCase()}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
