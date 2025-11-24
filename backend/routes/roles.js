const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/roles/available
 * Get all available roles for the authenticated user
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT 
        role_type, 
        is_primary, 
        is_active,
        created_at
      FROM USER_ROLES
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY is_primary DESC, role_type`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      roles: result.rows,
      hasMultipleRoles: result.rows.length > 1,
    });
  } catch (error) {
    console.error('Error fetching available roles:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available roles',
      error: error.message,
    });
  }
});

/**
 * GET /api/roles/active
 * Get the currently active role for the user
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT 
        user_id,
        email,
        first_name,
        last_name,
        user_type,
        active_role
      FROM "USER"
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    // Get detailed role information
    const roleInfo = await query(
      `SELECT * FROM user_profile_view WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      activeRole: user.active_role,
      userType: user.user_type,
      profile: roleInfo.rows[0] || user,
    });
  } catch (error) {
    console.error('Error fetching active role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active role',
      error: error.message,
    });
  }
});

/**
 * POST /api/roles/switch
 * Switch the active role for the user
 */
router.post('/switch', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newRole } = req.body;

    // Validate input
    if (!newRole) {
      return res.status(400).json({
        success: false,
        message: 'New role is required',
      });
    }

    if (!['farmer', 'buyer'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either farmer or buyer',
      });
    }

    // Use the database function to switch roles
    const result = await query(
      `SELECT * FROM switch_user_role($1, $2)`,
      [userId, newRole]
    );

    if (result.rows.length === 0 || !result.rows[0].success) {
      return res.status(400).json({
        success: false,
        message: result.rows[0]?.message || 'Failed to switch role',
      });
    }

    // Get updated user profile
    const profileResult = await query(
      `SELECT * FROM user_profile_view WHERE user_id = $1`,
      [userId]
    );

    const profile = profileResult.rows[0];

    // Generate new JWT token with updated role
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        user_id: userId,
        email: profile.email,
        userType: newRole,
        active_role: newRole,
        farmer_id: profile.farmer_id,
        buyer_id: profile.buyer_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Successfully switched to ${newRole} role`,
      activeRole: newRole,
      token,
      profile: {
        user_id: profile.user_id,
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        active_role: newRole,
        user_type: profile.user_type,
        farmer_id: profile.farmer_id,
        buyer_id: profile.buyer_id,
        // Include role-specific details
        ...(newRole === 'farmer' && {
          farm_name: profile.farm_name,
          farm_type: profile.farm_type,
          farm_size: profile.farm_size,
          reputation_score: profile.farmer_reputation,
        }),
        ...(newRole === 'buyer' && {
          business_name: profile.business_name,
          business_type: profile.business_type,
          delivery_address: profile.delivery_address,
          city: profile.city,
        }),
      },
    });
  } catch (error) {
    console.error('Error switching role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to switch role',
      error: error.message,
    });
  }
});

/**
 * POST /api/roles/add
 * Add a new role profile for the user (convert farmer to buyer or vice versa)
 */
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { roleType, profileData } = req.body;

    // Validate input
    if (!roleType || !profileData) {
      return res.status(400).json({
        success: false,
        message: 'Role type and profile data are required',
      });
    }

    if (!['farmer', 'buyer'].includes(roleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role type. Must be either farmer or buyer',
      });
    }

    // Check if user already has this role
    const existingRole = await query(
      `SELECT 1 FROM USER_ROLES 
       WHERE user_id = $1 AND role_type = $2 AND is_active = TRUE`,
      [userId, roleType]
    );

    if (existingRole.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have a ${roleType} profile`,
      });
    }

    // Begin transaction
    const client = await require('../config/database').getClient();
    
    try {
      await client.query('BEGIN');

      if (roleType === 'farmer') {
        // Validate farmer profile data
        const { farm_name, farm_type, farm_size, location_id, farming_experience, primary_crops } = profileData;

        if (!farm_type || !farm_size) {
          throw new Error('Farm type and farm size are required');
        }

        // Insert farmer profile
        const farmerResult = await client.query(
          `INSERT INTO FARMER (
            user_id, farm_name, farm_type, farm_size, 
            location_id, farming_experience, primary_crops
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING farmer_id`,
          [userId, farm_name, farm_type, farm_size, location_id || null, 
           farming_experience || 0, primary_crops || []]
        );

        // Role will be automatically added by trigger
        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          message: 'Farmer profile created successfully',
          farmerId: farmerResult.rows[0].farmer_id,
          roleType: 'farmer',
        });

      } else if (roleType === 'buyer') {
        // Validate buyer profile data
        const { business_name, business_type, delivery_address, city, preferred_payment_method } = profileData;

        if (!business_name || !business_type || !delivery_address || !city) {
          throw new Error('Business name, type, delivery address, and city are required');
        }

        // Insert buyer profile
        const buyerResult = await client.query(
          `INSERT INTO BUYER (
            user_id, business_name, business_type, 
            delivery_address, city, preferred_payment_method
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING buyer_id`,
          [userId, business_name, business_type, delivery_address, city, preferred_payment_method || null]
        );

        // Role will be automatically added by trigger
        await client.query('COMMIT');

        return res.status(201).json({
          success: true,
          message: 'Buyer profile created successfully',
          buyerId: buyerResult.rows[0].buyer_id,
          roleType: 'buyer',
        });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error adding role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add role',
      error: error.message,
    });
  }
});

/**
 * GET /api/roles/profile
 * Get complete profile with all role information
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT * FROM user_profile_view WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
});

module.exports = router;
