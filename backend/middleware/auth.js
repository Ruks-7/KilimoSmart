const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 * Extracts user information from token and adds to req.user
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('🔐 JWT Verification Error:', {
          name: err.name,
          message: err.message,
          token: token.substring(0, 20) + '...',
          secret: process.env.JWT_SECRET ? 'Set' : 'Missing'
        });
        
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired. Please login again.',
          });
        }
        return res.status(403).json({
          success: false,
          message: 'Invalid token',
        });
      }

      console.log('✅ JWT Decoded Successfully:', {
        userId: decoded.userId || decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        userType: decoded.userType,
        farmerId: decoded.farmerId || decoded.farmer_id
      });

      // Add user info to request object
      req.user = {
        userId: decoded.userId || decoded.user_id,
        email: decoded.email,
        role: decoded.role || decoded.userType, // Support both 'role' and 'userType'
        farmerId: decoded.farmerId || decoded.farmer_id,
        buyerId: decoded.buyerId || decoded.buyer_id,
      };

      console.log('👤 req.user set to:', req.user);

      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Middleware to check if user has farmer role
 */
const requireFarmer = (req, res, next) => {
  console.log('🚜 Checking farmer role:', {
    userRole: req.user.role,
    userId: req.user.userId,
    farmerId: req.user.farmerId
  });
  
  if (req.user.role !== 'farmer') {
    console.error('❌ Role check failed:', req.user.role, '!== farmer');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Farmer role required.',
    });
  }
  
  console.log('✅ Farmer role verified');
  next();
};

/**
 * Middleware to check if user has buyer role
 */
const requireBuyer = (req, res, next) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Buyer role required.',
    });
  }
  next();
};

/**
 * Middleware to check if user has either farmer or buyer role
 */
const requireUser = (req, res, next) => {
  if (!['farmer', 'buyer'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Valid user role required.',
    });
  }
  next();
};

/**
 * Middleware to check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireFarmer,
  requireBuyer,
  requireUser,
  requireAdmin,
};
