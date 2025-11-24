const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { query, getClient } = require('../config/database');
const { generateOTP, verifyOTP, calculateExpiryTime, isOTPExpired } = require('../utils/otpUtils');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');

// Rate limiter for OTP endpoints
const otpLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5, // 5 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

//Send OTP to user's email
router.post('/send-otp', otpLimiter, async (req, res) => {
  const { email, purpose } = req.body;

  try {
    // Validate input
    if (!email || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Email and purpose are required',
      });
    }

    // Validate purpose
    if (!['login', 'signup', 'password_reset'].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose. Must be login, signup, or password_reset',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // For login purpose, check if user exists
    if (purpose === 'login') {
      const userCheck = await query(
        'SELECT user_id FROM "USER" WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Email not registered. Please sign up first.',
        });
      }
    }

    // For signup purpose, check if email already exists
    if (purpose === 'signup') {
      const userCheck = await query(
        'SELECT user_id FROM "USER" WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered. Please login instead.',
        });
      }
    }

    // Invalidate previous OTPs for this email/purpose
    await query(
      'UPDATE OTP SET is_verified = TRUE WHERE email = $1 AND purpose = $2 AND is_verified = FALSE',
      [email, purpose]
    );

    // Generate new OTP
    const otpCode = generateOTP(parseInt(process.env.OTP_LENGTH) || 6);
    const expiresAt = calculateExpiryTime(parseInt(process.env.OTP_EXPIRY_MINUTES) || 10);

    // Store OTP in database
    await query(
      `INSERT INTO OTP (email, otp_code, purpose, expires_at, max_attempts, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        email,
        otpCode,
        purpose,
        expiresAt,
        parseInt(process.env.OTP_MAX_ATTEMPTS) || 3,
        req.ip,
        req.get('user-agent') || 'unknown',
      ]
    );

    // Send OTP via email
    await sendOTPEmail(email, otpCode, purpose);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${email}`,
      expiresAt,
      expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 || 600, // in seconds
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

//Verify OTP code
router.post('/verify-otp', async (req, res) => {
  const { email, otp, purpose } = req.body;

  try {
    // Validate input
    if (!email || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and purpose are required',
      });
    }

    // Find OTP record
    const result = await query(
      `SELECT * FROM OTP 
      WHERE email = $1 
      AND purpose = $2 
      AND is_verified = FALSE 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [email, purpose]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending OTP found. Please request a new code.',
      });
    }

    const otpRecord = result.rows[0];

    // Check if expired
    if (isOTPExpired(otpRecord.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.',
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return res.status(429).json({
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.',
        blocked: true,
      });
    }

    // Verify OTP (timing-safe comparison)
    const isValid = verifyOTP(otp, otpRecord.otp_code);

    if (!isValid) {
      // Increment attempts
      await query(
        'UPDATE OTP SET attempts = attempts + 1 WHERE otp_id = $1',
        [otpRecord.otp_id]
      );

      const attemptsRemaining = otpRecord.max_attempts - otpRecord.attempts - 1;

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
        attemptsRemaining,
      });
    }

    // Mark OTP as verified
    await query(
      'UPDATE OTP SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE otp_id = $1',
      [otpRecord.otp_id]
    );

    // For login, generate JWT and return user data
    if (purpose === 'login') {
      const userResult = await query(
        `SELECT u.*, f.farmer_id, f.farm_type, f.farm_size, f.is_verified as farmer_verified,
         b.buyer_id, b.business_name FROM "USER" u
        LEFT JOIN FARMER f ON u.user_id = f.user_id
        LEFT JOIN BUYER b ON u.user_id = b.user_id
        WHERE u.email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // Update email_verified if not already
      await query(
        'UPDATE "USER" SET email_verified = TRUE WHERE user_id = $1',
        [user.user_id]
      );

      // Get user roles for dual RBAC support
      const rolesResult = await query(
        `SELECT role_type FROM USER_ROLES 
         WHERE user_id = $1 AND is_active = TRUE`,
        [user.user_id]
      );
      const userRoles = rolesResult.rows.map(r => r.role_type);

      // Determine active role (use active_role from USER table or default to user_type)
      const activeRole = user.active_role || user.user_type;

      // Generate JWT token with dual RBAC support
      const token = jwt.sign(
        { 
          user_id: user.user_id, 
          email: user.email, 
          userType: user.user_type,
          active_role: activeRole,
          roles: userRoles,
          farmer_id: user.farmer_id,
          buyer_id: user.buyer_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          email_verified: true,
          farmer: user.farmer_id ? {
            farmer_id: user.farmer_id,
            farm_type: user.farm_type,
            farm_size: user.farm_size,
            is_verified: user.farmer_verified,
          } : null,
          buyer: user.buyer_id ? {
            buyer_id: user.buyer_id,
            business_name: user.business_name,
          } : null,
        },
      });
    }

    // For signup, generate JWT and return user data
    if (purpose === 'signup') {
      const userResult = await query(
        `SELECT u.*, b.buyer_id, b.business_name FROM "USER" u
        LEFT JOIN BUYER b ON u.user_id = b.user_id
        WHERE u.email = $1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // Update email_verified if not already
      await query(
        'UPDATE "USER" SET email_verified = TRUE WHERE user_id = $1',
        [user.user_id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.user_id, 
          email: user.email, 
          userType: user.user_type,
          buyer_id: user.buyer_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRY || '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. Account activated.',
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          email_verified: true,
        },
        buyer: user.buyer_id ? {
          buyer_id: user.buyer_id,
          business_name: user.business_name,
        } : null,
      });
    }

    // For password_reset, just return success
    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Proceed with password reset.',
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/farmer/verify-credentials
 * Verify email and password before sending OTP (for login flow)
 */
router.post('/farmer/verify-credentials', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email
    const result = await query(
      `SELECT u.*, f.farmer_id FROM "USER" u
       LEFT JOIN FARMER f ON u.user_id = f.user_id
       WHERE u.email = $1 AND u.user_type = 'farmer'`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Check if account is active (if you have is_active field)
    // if (!user.is_active) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Your account has been deactivated. Contact support.',
    //   });
    // }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Credentials verified. OTP will be sent to your email.',
      user: {
        email: user.email,
        firstName: user.first_name,
        userType: user.user_type,
      },
    });

  } catch (error) {
    console.error('Verify credentials error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/farmer/signup
 * Create farmer account ONLY after OTP verification
 */
router.post('/farmer/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    phoneNumber,
    email,
    password,
    nationalId,
    userType,
    emailVerified,
    location,
    farmType,
    farmSize,
  } = req.body;

  // Get a client for transaction
  const client = await getClient();

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Check emailVerified flag (must be true from OTP verification)
    if (!emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email must be verified before signup. Please verify OTP first.',
      });
    }

    // Check if email already exists
    const emailCheck = await client.query(
      'SELECT user_id FROM "USER" WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Start transaction
    await client.query('BEGIN');

    // 1. Create USER record (national_id is optional, will be NULL if not provided)
    const userResult = await client.query(
      `INSERT INTO "USER" (national_id, first_name, last_name, email, phone_number, password_hash, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, first_name, last_name, email, phone_number, user_type, email_verified, created_at`,
      [nationalId || null, firstName, lastName, email, phoneNumber, hashedPassword, userType || 'farmer', true]
    );

    const user = userResult.rows[0];

    // 2. Create LOCATION record (if location provided)
    let locationId = null;
    if (location && location.latitude && location.longitude) {
      const locationResult = await client.query(
        `INSERT INTO LOCATION (latitude, longitude, county, subcounty, address_description, geofence_radius)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING location_id`,
        [
          location.latitude,
          location.longitude,
          location.county && location.county.trim() ? location.county : 'Unknown', // Use detected county or fallback
          location.subcounty && location.subcounty.trim() ? location.subcounty : null,
          location.addressDescription || null,
          location.geofenceRadius || 500,
        ]
      );
      locationId = locationResult.rows[0].location_id;
    }

    // 3. Create FARMER record
    const farmerResult = await client.query(
      `INSERT INTO FARMER (user_id, location_id, farm_type, farm_size, is_active, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING farmer_id, farm_type, farm_size, is_active, is_verified, created_at`,
      [user.user_id, locationId, farmType, farmSize, true, false]
    );

    const farmer = farmerResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        userType: user.user_type,
        farmer_id: farmer.farmer_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(email, firstName).catch(err => 
      console.error('Welcome email error:', err)
    );

    return res.status(201).json({
      success: true,
      message: 'Farmer account created successfully',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        userType: user.user_type,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
      farmer: {
        farmer_id: farmer.farmer_id,
        farm_type: farmer.farm_type,
        farm_size: farmer.farm_size,
        is_active: farmer.is_active,
        is_verified: farmer.is_verified,
        createdAt: farmer.created_at,
      },
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Farmer signup error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Account creation failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    // Release client back to pool
    client.release();
  }
});

/**
 * POST /api/auth/buyer/verify-credentials
 * Verify email and password for buyer login
 */
router.post('/buyer/verify-credentials', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email (must be buyer type)
    const result = await query(
      `SELECT u.*, b.buyer_id FROM "USER" u
       LEFT JOIN BUYER b ON u.user_id = b.user_id
       WHERE u.email = $1 AND u.user_type = 'buyer'`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        userType: user.user_type,
        buyer_id: user.buyer_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Credentials verified successfully',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        user_type: user.user_type,
      },
      buyer: {
        buyer_id: user.buyer_id,
      },
    });

  } catch (error) {
    console.error('Buyer verify credentials error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/auth/admin/login
 * Admin credential login - returns JWT on success
 */
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ 
      role: 'admin',
      email: email,
      userType: 'admin'
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

/**
 * POST /api/auth/buyer/signup
 * Create buyer account
 */
router.post('/buyer/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    nationalId,
    businessName,
    businessType,
    deliveryAddress,
    city,
  } = req.body;

  // Get a client for transaction
  const client = await getClient();

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phoneNumber || !businessName || !nationalId) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT user_id FROM "USER" WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login instead.',
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Start transaction
    await client.query('BEGIN');

    // 1. Create USER record with the national_id provided by the buyer
    const userResult = await client.query(
      `INSERT INTO "USER" (national_id, first_name, last_name, email, phone_number, password_hash, user_type, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, first_name, last_name, email, phone_number, user_type, email_verified, created_at`,
      [nationalId, firstName, lastName, email, phoneNumber, hashedPassword, 'buyer', true]
    );

    const user = userResult.rows[0];

    // 2. Create BUYER record
    const buyerResult = await client.query(
      `INSERT INTO BUYER (user_id, business_name, business_type, delivery_address, city)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING buyer_id, business_name, business_type, delivery_address, city, created_at`,
      [
        user.user_id,
        businessName,
        businessType || 'retail',
        deliveryAddress || '',
        city || '',
      ]
    );

    const buyer = buyerResult.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        userType: user.user_type,
        buyer_id: buyer.buyer_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Send welcome email (don't wait for it)
    sendWelcomeEmail(email, firstName).catch(err => 
      console.error('Welcome email error:', err)
    );

    return res.status(201).json({
      success: true,
      message: 'Buyer account created successfully',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        user_type: user.user_type,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
      buyer: {
        buyer_id: buyer.buyer_id,
        business_name: buyer.business_name,
        business_type: buyer.business_type,
        delivery_address: buyer.delivery_address,
        city: buyer.city,
        created_at: buyer.created_at,
      },
    });

  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Buyer signup error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Account creation failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    // Release client back to pool
    client.release();
  }
});

module.exports = router;
