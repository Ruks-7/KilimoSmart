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
        role: decoded.active_role || decoded.role || decoded.userType, // Support active_role for dual RBAC
        userType: decoded.userType,
        activeRole: decoded.active_role,
        farmerId: decoded.farmerId || decoded.farmer_id,
        buyerId: decoded.buyerId || decoded.buyer_id,
        roles: decoded.roles || [], // Array of available roles for dual RBAC
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
 * Middleware to check if user has farmer role (or admin for viewing purposes)
 * Updated to support dual RBAC - checks active role or available roles
 */
const requireFarmer = (req, res, next) => {
  console.log('🚜 Checking farmer role:', {
    userRole: req.user.role,
    activeRole: req.user.activeRole,
    userId: req.user.userId,
    farmerId: req.user.farmerId,
    availableRoles: req.user.roles
  });
  
  // Check if user has farmer role (either as active role or in available roles)
  const hasFarmerRole = req.user.role === 'farmer' || 
                        req.user.activeRole === 'farmer' ||
                        req.user.roles.includes('farmer') ||
                        req.user.farmerId;
  
  if (!hasFarmerRole && req.user.role !== 'admin') {
    console.error('❌ Farmer role check failed');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Farmer role required. Please switch to farmer role or create a farmer profile.',
      requiresRole: 'farmer',
    });
  }
  
  console.log('✅ Farmer/Admin role verified');
  next();
};

/**
 * Middleware to check if user has buyer role
 * Updated to support dual RBAC - checks active role or available roles
 */
const requireBuyer = (req, res, next) => {
  console.log('🛒 Checking buyer role:', {
    userRole: req.user.role,
    activeRole: req.user.activeRole,
    userId: req.user.userId,
    buyerId: req.user.buyerId,
    availableRoles: req.user.roles
  });
  
  // Check if user has buyer role (either as active role or in available roles)
  const hasBuyerRole = req.user.role === 'buyer' || 
                       req.user.activeRole === 'buyer' ||
                       req.user.roles.includes('buyer') ||
                       req.user.buyerId;
  
  if (!hasBuyerRole) {
    console.error('❌ Buyer role check failed');
    return res.status(403).json({
      success: false,
      message: 'Access denied. Buyer role required. Please switch to buyer role or create a buyer profile.',
      requiresRole: 'buyer',
    });
  }
  
  console.log('✅ Buyer role verified');
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
