const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireBuyer } = require('../middleware/auth');

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
        f.first_name || ' ' || f.last_name as "farmerName",
        f.location as "farmerLocation",
        f.phone_number as "farmerPhone"
      FROM PRODUCT p
      JOIN FARMER f ON p.farmer_id = f.farmer_id
      WHERE p.status = 'available' AND p.quantity_available > 0
    `;

    const params = [];
    let paramCount = 1;

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

    const result = await query(
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
        f.first_name || ' ' || f.last_name as "farmerName",
        f.location as "farmerLocation",
        f.phone_number as "farmerPhone",
        f.farm_type as "farmType",
        f.reputation_score as "reputationScore"
      FROM PRODUCT p
      JOIN FARMER f ON p.farmer_id = f.farmer_id
      WHERE p.product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      product: result.rows[0],
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
    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.price_per_unit) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have product_id, quantity, and price_per_unit',
        });
      }

      // Verify product availability
      const productCheck = await query(
        'SELECT quantity_available, status FROM PRODUCT WHERE product_id = $1',
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

      totalAmount += item.quantity * item.price_per_unit;
    }

    // Create order
    const orderResult = await query(
      `INSERT INTO "ORDER" (
        buyer_id,
        order_date,
        total_amount,
        delivery_address,
        delivery_date,
        status,
        payment_status,
        payment_method,
        notes
      ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8)
      RETURNING order_id, order_date, total_amount, status`,
      [
        buyerId,
        totalAmount,
        delivery_address,
        delivery_date || null,
        'pending',
        'pending',
        payment_method || 'M-Pesa',
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
          quantity,
          price_per_unit,
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
        o.payment_method as "paymentMethod",
        o.notes,
        COUNT(oi.order_item_id) as "itemCount"
      FROM "ORDER" o
      LEFT JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
      WHERE o.buyer_id = $1
      GROUP BY o.order_id
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
        o.payment_method as "paymentMethod",
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
        oi.quantity,
        oi.price_per_unit as "pricePerUnit",
        oi.subtotal,
        f.first_name || ' ' || f.last_name as "farmerName"
      FROM ORDER_ITEMS oi
      JOIN PRODUCT p ON oi.product_id = p.product_id
      JOIN FARMER f ON p.farmer_id = f.farmer_id
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
      'SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = $1',
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

/**
 * GET /api/buyer/categories
 * Get all product categories
 */
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

module.exports = router;
