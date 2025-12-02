const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireBuyer } = require('../middleware/auth');
const { sendPurchaseReceipt } = require('../utils/emailService');

// Apply authentication middleware to all buyer routes
router.use(authenticateToken);
router.use(requireBuyer);

/**
 * GET /api/buyer/products
 * Browse all available products (with optional filters)
 */
router.get('/products', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, isOrganic } = req.query;

    let queryText = `
      SELECT 
        p.product_id as id,
        p.product_name as name,
        p.category,
        p.description,
        p.quantity_available as quantity,
        p.unit_of_measure as unit,
        p.price_per_unit as price,
        p.is_organic as "isOrganic",
        p.harvest_date as "harvestDate",
        p.farmer_id as "farmerId",
        f.farm_name as "farmerName",
        COALESCE(l.county, l.subcounty, l.address_description) as location,
        l.county,
        l.subcounty,
        l.address_description as "fullAddress",
        u.phone_number as "farmerPhone",
        pp.photo_url as "imageUrl"
      FROM PRODUCT p
      JOIN FARMER f ON p.farmer_id = f.farmer_id
      JOIN "USER" u ON f.user_id = u.user_id
      LEFT JOIN LOCATION l ON f.location_id = l.location_id
      LEFT JOIN PRODUCT_PHOTOS pp ON p.product_id = pp.product_id AND pp.is_main_photo = TRUE
      WHERE p.status = 'available' AND p.quantity_available > 0
    `;

    const params = [];
    let paramCount = 1;

    // Exclude own products if user is also a farmer
    if (req.user.farmerId) {
      queryText += ` AND p.farmer_id != $${paramCount++}`;
      params.push(req.user.farmerId);
    }

    // Filter by category
    if (category) {
      queryText += ` AND p.category = $${paramCount++}`;
      params.push(category);
    }

    // Search by name or description
    if (search) {
      queryText += ` AND (p.product_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Filter by price range
    if (minPrice) {
      queryText += ` AND p.price_per_unit >= $${paramCount++}`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      queryText += ` AND p.price_per_unit <= $${paramCount++}`;
      params.push(parseFloat(maxPrice));
    }

    // Filter by organic
    if (isOrganic !== undefined) {
      queryText += ` AND p.is_organic = $${paramCount++}`;
      params.push(isOrganic === 'true');
    }

    queryText += ' ORDER BY p.created_at DESC';

    const result = await query(queryText, params);

    return res.status(200).json({
      success: true,
      products: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Browse products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/buyer/products/:id
 * Get detailed information about a specific product
 */
router.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details
    const productResult = await query(
      `SELECT 
        p.product_id as id,
        p.product_name as name,
        p.category,
        p.description,
        p.quantity_available as quantity,
        p.unit_of_measure as unit,
        p.price_per_unit as price,
        p.is_organic as "isOrganic",
        p.harvest_date as "harvestDate",
        p.expiry_date as "expiryDate",
        p.status,
        f.farmer_id as "farmerId",
        f.farm_name as "farmerName",
        l.county as location,
        u.phone_number as "farmerPhone",
        f.farm_type as "farmType",
        f.reputation_score as "reputationScore"
      FROM PRODUCT p
      JOIN FARMER f ON p.farmer_id = f.farmer_id
      JOIN "USER" u ON f.user_id = u.user_id
      LEFT JOIN LOCATION l ON f.location_id = l.location_id
      WHERE p.product_id = $1`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get all product photos
    const photosResult = await query(
      `SELECT 
        photo_id as id,
        photo_url as url,
        is_main_photo as "isMain",
        upload_date as "uploadDate"
      FROM PRODUCT_PHOTOS
      WHERE product_id = $1
      ORDER BY is_main_photo DESC, upload_date DESC`,
      [productId]
    );

    const product = {
      ...productResult.rows[0],
      images: photosResult.rows,
      imageUrl: photosResult.rows.find(img => img.isMain)?.url || photosResult.rows[0]?.url || null
    };

    return res.status(200).json({
      success: true,
      product: product,
    });
  } catch (error) {
    console.error('Get product details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/buyer/orders
 * Place a new order
 */
router.post('/orders', async (req, res) => {
  try {
    const buyerId = req.user.buyerId || req.user.userId;
    const {
      items, // Array of { product_id, quantity, price_per_unit }
      delivery_address,
      delivery_date,
      payment_method,
      notes,
    } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
      });
    }

    if (!delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required',
      });
    }

    // Calculate total amount and validate products
    let totalAmount = 0;
    const farmerIds = new Set();
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.price_per_unit) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have product_id, quantity, and price_per_unit',
        });
      }

      // Verify product availability
      const productCheck = await query(
        'SELECT quantity_available, status, farmer_id FROM PRODUCT WHERE product_id = $1',
        [item.product_id]
      );

      if (productCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product_id} not found`,
        });
      }

      if (productCheck.rows[0].status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id} is not available`,
        });
      }

      if (productCheck.rows[0].quantity_available < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for product ${item.product_id}`,
        });
      }

      // collect farmer ids to ensure single-farmer order
      if (productCheck.rows[0].farmer_id) farmerIds.add(productCheck.rows[0].farmer_id);

      totalAmount += item.quantity * item.price_per_unit;
    }

    // Ensure all items belong to the same farmer (current schema requires a single farmer_id per order)
    if (farmerIds.size === 0) {
      return res.status(400).json({ success: false, message: 'Unable to determine farmer for the order items' });
    }
    if (farmerIds.size > 1) {
      return res.status(400).json({ success: false, message: 'All items in an order must belong to the same farmer. Please place separate orders per farmer.' });
    }
    const farmerId = Array.from(farmerIds)[0];

    // Prevent farmers from buying their own products (dual RBAC check)
    if (req.user.farmerId && req.user.farmerId === farmerId) {
      return res.status(403).json({
        success: false,
        message: 'You cannot purchase your own products. Please switch to your buyer role or select products from other farmers.',
        errorCode: 'CANNOT_BUY_OWN_PRODUCT'
      });
    }

    // Create order
    const orderResult = await query(
      `INSERT INTO "ORDER" (
        buyer_id,
        farmer_id,
        order_date,
        total_amount,
        delivery_address,
        delivery_date,
        status,
        payment_status,
        delivery_instructions,
        notes
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9)
      RETURNING order_id, order_date, total_amount, status`,
      [
        buyerId,
        farmerId,
        totalAmount,
        delivery_address,
        delivery_date || null,
        'pending',
        'pending',
        null,
        notes || null,
      ]
    );

    const orderId = orderResult.rows[0].order_id;

    // Insert order items and update product quantities
    for (const item of items) {
      // Insert order item
      await query(
        `INSERT INTO ORDER_ITEMS (
          order_id,
          product_id,
          quantity_ordered,
          unit_price,
          subtotal
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.price_per_unit,
          item.quantity * item.price_per_unit,
        ]
      );

      // Update product quantity
      await query(
        `UPDATE PRODUCT 
        SET quantity_available = quantity_available - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Create a reservation record so that stock can be released if payment fails or times out
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS ORDER_RESERVATION (
           reservation_id SERIAL PRIMARY KEY,
           order_id INTEGER UNIQUE NOT NULL,
           expires_at TIMESTAMP NOT NULL,
           released BOOLEAN DEFAULT FALSE,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`);

      await query(
        `INSERT INTO ORDER_RESERVATION (order_id, expires_at) VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '15 minutes') ON CONFLICT (order_id) DO UPDATE SET expires_at = EXCLUDED.expires_at, released = FALSE`,
        [orderId]
      );
    } catch (e) {
      console.error('Failed to create/insert order reservation:', e.message || e);
      // not fatal for order creation
    }

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: {
        id: orderId,
        ...orderResult.rows[0],
      },
    });
  } catch (error) {
    console.error('Place order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/buyer/orders
 * Get all orders for the authenticated buyer
 */
router.get('/orders', async (req, res) => {
  try {
    const buyerId = req.user.buyerId || req.user.userId;

    const result = await query(
      `SELECT 
        o.order_id as id,
        o.order_date as date,
        o.total_amount as amount,
        o.delivery_address as "deliveryAddress",
        o.delivery_date as "deliveryDate",
        o.status,
        o.payment_status as "paymentStatus",
        p.payment_method as "paymentMethod",
        o.notes,
        COUNT(oi.order_item_id) as "itemCount"
      FROM "ORDER" o
      LEFT JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
      LEFT JOIN PAYMENT p ON o.order_id = p.order_id
      WHERE o.buyer_id = $1
      GROUP BY o.order_id, p.payment_method
      ORDER BY o.order_date DESC`,
      [buyerId]
    );

    return res.status(200).json({
      success: true,
      orders: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/buyer/orders/:id
 * Get detailed information about a specific order
 */
router.get('/orders/:id', async (req, res) => {
  try {
    const buyerId = req.user.buyerId || req.user.userId;
    const orderId = req.params.id;

    // Get order details
    const orderResult = await query(
      `SELECT 
        o.order_id as id,
        o.order_date as date,
        o.total_amount as amount,
        o.delivery_address as "deliveryAddress",
        o.delivery_date as "deliveryDate",
        o.status,
        o.payment_status as "paymentStatus",
        o.notes
      FROM "ORDER" o
      WHERE o.order_id = $1 AND o.buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get order items
    const itemsResult = await query(
      `SELECT 
        oi.order_item_id as id,
        oi.product_id as "productId",
        p.product_name as "productName",
        p.category,
        oi.quantity_ordered as quantity,
        oi.unit_price as "pricePerUnit",
        oi.subtotal,
        u.first_name || ' ' || u.last_name as "farmerName"
      FROM ORDER_ITEMS oi
      JOIN PRODUCT p ON oi.product_id = p.product_id
      JOIN FARMER f ON p.farmer_id = f.farmer_id
      JOIN "USER" u ON f.user_id = u.user_id
      WHERE oi.order_id = $1`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get order details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/buyer/orders/:id/cancel
 * Cancel an order (only if status is 'pending')
 */
router.put('/orders/:id/cancel', async (req, res) => {
  try {
    const buyerId = req.user.buyerId || req.user.userId;
    const orderId = req.params.id;

    // Check order status
    const orderCheck = await query(
      'SELECT status FROM "ORDER" WHERE order_id = $1 AND buyer_id = $2',
      [orderId, buyerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (orderCheck.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled',
      });
    }

    // Restore product quantities
    const itemsResult = await query(
      'SELECT product_id, quantity_ordered as quantity FROM ORDER_ITEMS WHERE order_id = $1',
      [orderId]
    );

    for (const item of itemsResult.rows) {
      await query(
        `UPDATE PRODUCT 
        SET quantity_available = quantity_available + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Update order status
    await query(
      `UPDATE "ORDER" 
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1 AND buyer_id = $2`,
      [orderId, buyerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});


// Get all product categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT category, COUNT(*) as count
      FROM PRODUCT
      WHERE status = 'available' AND quantity_available > 0
      GROUP BY category
      ORDER BY category`
    );

    return res.status(200).json({
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});


// Get buyer profile information
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT 
        u.user_id as id,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.phone_number as "phoneNumber",
        u.user_type as "userType",
        u.created_at as "createdAt",
        b.buyer_id as "buyerId",
        b.delivery_address as "deliveryAddress",
        b.city as location,
        b.city as county,
        b.business_name as "businessName",
        b.business_type as "businessType"
      FROM "USER" u
      JOIN BUYER b ON u.user_id = b.user_id
      WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Buyer profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});


// Update buyer profile information
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phoneNumber, deliveryAddress } = req.body;

    // Update USER table - allow partial updates by keeping existing values when fields are not provided
    await query(
      `UPDATE "USER"
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone_number = COALESCE($3, phone_number),
           updated_at = NOW()
       WHERE user_id = $4`,
      [firstName || null, lastName || null, phoneNumber || null, userId]
    );

    // Update BUYER table
    if (deliveryAddress) {
      await query(
        `UPDATE BUYER 
         SET delivery_address = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [deliveryAddress, userId]
      );
    }

    // Fetch updated profile
    const result = await query(
      `SELECT 
        u.user_id as id,
        u.email,
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.phone_number as "phoneNumber",
        b.buyer_id as "buyerId",
        b.delivery_address as "deliveryAddress"
      FROM "USER" u
      JOIN BUYER b ON u.user_id = b.user_id
      WHERE u.user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      ...result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/buyer/send-receipt-email
 * Send purchase receipt email to buyer after payment
 */
router.post('/send-receipt-email', async (req, res) => {
  try {
    const { orderId, items } = req.body;
    const buyerId = req.user.buyerId;

    console.log('Receipt email request:', { orderId, itemsCount: items?.length, buyerId });

    if (!orderId) {
      console.error('Receipt email error: Missing orderId');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: orderId'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Receipt email error: Missing or empty items array');
      return res.status(400).json({
        success: false,
        message: 'Missing required field: items (must be a non-empty array)'
      });
    }

    if (!buyerId) {
      console.error('Receipt email error: Missing buyerId from auth');
      return res.status(400).json({
        success: false,
        message: 'Buyer not authenticated'
      });
    }

    // Get buyer details
    const buyerResult = await query(
      `SELECT b.buyer_id, u.email, u.first_name, u.phone_number, b.address
       FROM BUYER b
       JOIN "USER" u ON b.user_id = u.user_id
       WHERE b.buyer_id = $1`,
      [buyerId]
    );

    if (buyerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Buyer not found'
      });
    }

    const buyer = buyerResult.rows[0];

    // Get order details
    const orderResult = await query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.delivery_address, 
              o.farmer_id, f.farm_name
       FROM "ORDER" o
       LEFT JOIN FARMER f ON o.farmer_id = f.farmer_id
       WHERE o.order_id = $1 AND o.buyer_id = $2`,
      [orderId, buyerId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orderResult.rows[0];

    // Safely calculate prices with fallbacks
    const safePrice = (item) => {
      const price = parseFloat(item.price_per_unit || item.pricePerUnit || item.price) || 0;
      return price;
    };

    // Prepare receipt data with defensive coding
    const receiptData = {
      email: buyer.email,
      buyerName: buyer.first_name || 'Valued Customer',
      orderId: order.order_id,
      orderDate: order.order_date || new Date(),
      items: items.map(item => {
        const price = safePrice(item);
        const qty = parseInt(item.quantity) || 1;
        return {
          productName: item.productName || item.name || 'Product',
          quantity: qty,
          unit: item.unit || 'units',
          pricePerUnit: price,
          subtotal: (qty * price).toFixed(2)
        };
      }),
      totalAmount: parseFloat(order.total_amount) || items.reduce((sum, item) => sum + ((parseInt(item.quantity) || 1) * safePrice(item)), 0),
      deliveryAddress: order.delivery_address || buyer.address || 'Not specified',
      paymentMethod: order.payment_method || 'M-Pesa',
      farmerName: order.farm_name || 'KilimoSmart Farmer'
    };

    console.log('Sending receipt with data:', JSON.stringify(receiptData, null, 2));

    // Send receipt email
    await sendPurchaseReceipt(receiptData);

    res.json({
      success: true,
      message: 'Receipt email sent successfully'
    });
  } catch (error) {
    console.error('Send receipt email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send receipt email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
