const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('../backend/routes/auth');
const farmerRoutes = require('../backend/routes/farmer');
const buyerRoutes = require('../backend/routes/buyer');

const app = express();

// CORS configuration - allow all origins for Vercel
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'KilimoSmart API is running on Vercel',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/buyer', buyerRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found',
    path: req.path
  });
});

// Export for Vercel serverless
module.exports = app;