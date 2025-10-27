const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const farmerRoutes = require('./routes/farmer');
const buyerRoutes = require('./routes/buyer');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration for production and development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  'https://kilimosmart.vercel.app', // Add your Vercel URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now, restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Serverless-compatible file upload handling
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  useTempFiles: false, // Don't use temp files on Vercel
  safeFileNames: true,
  preserveExtension: true
}));

// Request logging middleware (for development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KilimoSmart API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Serve static files (product images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/buyer', buyerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to KilimoSmart API',
    version: '1.0.0',
    documentation: '/api-docs',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🌾 KilimoSmart Backend Server');
  console.log('='.repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Email service: ${process.env.SENDGRID_API_KEY ? 'SendGrid configured ✓' : 'Not configured ✗'}`);
  console.log(`🔒 JWT secret: ${process.env.JWT_SECRET ? 'Configured ✓' : 'Not configured ✗'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Configured ✓' : 'Not configured ✗'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('='.repeat(50));
  console.log('\n📚 Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /');
  console.log('\n  🔐 Auth Routes:');
  console.log('  POST /api/auth/send-otp');
  console.log('  POST /api/auth/verify-otp');
  console.log('  POST /api/auth/farmer/verify-credentials');
  console.log('  POST /api/auth/farmer/signup');
  console.log('\n  🌾 Farmer Routes (Protected):');
  console.log('  GET  /api/farmer/products');
  console.log('  POST /api/farmer/products');
  console.log('  PUT  /api/farmer/products');
  console.log('  DEL  /api/farmer/products/:id');
  console.log('  GET  /api/farmer/orders');
  console.log('  GET  /api/farmer/payments');
  console.log('  GET  /api/farmer/dashboard-stats');
  console.log('\n  🛒 Buyer Routes (Protected):');
  console.log('  GET  /api/buyer/products');
  console.log('  GET  /api/buyer/products/:id');
  console.log('  POST /api/buyer/orders');
  console.log('  GET  /api/buyer/orders');
  console.log('  GET  /api/buyer/orders/:id');
  console.log('  PUT  /api/buyer/orders/:id/cancel');
  console.log('  GET  /api/buyer/categories');
  console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

module.exports = app;
