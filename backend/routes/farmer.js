const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireFarmer } = require('../middleware/auth');

// Apply authentication middleware to all farmer routes
router.use(authenticateToken);
router.use(requireFarmer);

// Get all products for the authenticated farmer

router.get('/products', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;

    const result = await query(
      `SELECT 
        product_id as id,
        product_name as name,
        category,
        description,
        quantity_available as quantity,
        unit_of_measure as unit,
        price_per_unit as price,
        harvest_date as "harvestDate",
        expiry_date as "expiryDate",
        is_organic as "isOrganic",
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM PRODUCT 
      WHERE farmer_id = $1
      ORDER BY created_at DESC`,
      [farmerId]
    );

    return res.status(200).json({
      success: true,
      products: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get all orders for the authenticated farmer's products
router.get('/orders', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;

    const result = await query(
      `SELECT DISTINCT
        o.order_id as id,
        o.buyer_id as "buyerId",
        b.business_name as "buyerName",
        u.phone_number as "buyerPhone",
        o.order_date as date,
        o.total_amount as amount,
        o.delivery_address as "deliveryAddress",
        o.delivery_date as "deliveryDate",
        o.status,
        o.payment_status as "paymentStatus",
        b.preferred_payment_method as "paymentMethod",
        COUNT(oi.order_item_id) as "itemCount"
      FROM "ORDER" o
      JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
      JOIN PRODUCT p ON oi.product_id = p.product_id
      JOIN BUYER b ON o.buyer_id = b.buyer_id
      JOIN "USER" u ON b.user_id = u.user_id
      WHERE p.farmer_id = $1
      GROUP BY o.order_id, b.business_name, b.preferred_payment_method, u.phone_number
      ORDER BY o.order_date DESC`,
      [farmerId]
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
 * GET /api/farmer/payments
 * Get payment history for the authenticated farmer using PAYMENT table
 */
router.get('/payments', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;

    // Get payments from PAYMENT table joined with ORDER and BUYER
    const result = await query(
      `SELECT 
        p.payment_id as id,
        p.order_id as "orderId",
        p.payment_date as date,
        p.amount,
        p.farmer_amount as "farmerAmount",
        p.platform_fee as "platformFee",
        p.payment_status as status,
        p.payment_method as method,
        p.mpesa_transaction_id as "transactionId",
        p.transaction_reference as "transactionReference",
        b.business_name as "buyerName",
        o.order_date as "orderDate"
      FROM PAYMENT p
      JOIN "ORDER" o ON p.order_id = o.order_id
      JOIN BUYER b ON o.buyer_id = b.buyer_id
      WHERE o.farmer_id = $1
      ORDER BY p.payment_date DESC`,
      [farmerId]
    );

    return res.status(200).json({
      success: true,
      payments: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * POST /api/farmer/products
 * Create a new product
 */
router.post('/products', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;
    const {
      farmer_id,
      product_name,
      category,
      description,
      quantity_available,
      unit_of_measure,
      price_per_unit,
      harvest_date,
      expiry_date,
      is_organic,
      status,
    } = req.body;

    // Validate required fields
    if (!product_name || !category || !quantity_available || !unit_of_measure || !price_per_unit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: product_name, category, quantity_available, unit_of_measure, price_per_unit',
      });
    }

    // Validate numeric fields
    if (isNaN(quantity_available) || quantity_available < 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity_available must be a positive number',
      });
    }

    if (isNaN(price_per_unit) || price_per_unit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'price_per_unit must be a positive number',
      });
    }

    const result = await query(
      `INSERT INTO PRODUCT (
        farmer_id, 
        product_name, 
        category, 
        description, 
        quantity_available, 
        unit_of_measure, 
        price_per_unit, 
        harvest_date, 
        expiry_date, 
        is_organic, 
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING 
        product_id as id,
        product_name as name,
        category,
        description,
        quantity_available as quantity,
        unit_of_measure as unit,
        price_per_unit as price,
        harvest_date as "harvestDate",
        expiry_date as "expiryDate",
        is_organic as "isOrganic",
        status,
        created_at as "createdAt"`,
      [
        farmerId,
        product_name,
        category,
        description || null,
        quantity_available,
        unit_of_measure,
        price_per_unit,
        harvest_date || null,
        expiry_date || null,
        is_organic || false,
        status || 'available',
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * PUT /api/farmer/products
 * Update an existing product
 */
router.put('/products', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;
    const {
      product_id,
      product_name,
      category,
      description,
      quantity_available,
      unit_of_measure,
      price_per_unit,
      harvest_date,
      expiry_date,
      is_organic,
      status,
    } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'product_id is required',
      });
    }

    // Verify product belongs to farmer
    const checkResult = await query(
      'SELECT product_id FROM PRODUCT WHERE product_id = $1 AND farmer_id = $2',
      [product_id, farmerId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to update it',
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (product_name !== undefined) {
      updates.push(`product_name = $${paramCount++}`);
      values.push(product_name);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (quantity_available !== undefined) {
      updates.push(`quantity_available = $${paramCount++}`);
      values.push(quantity_available);
    }
    if (unit_of_measure !== undefined) {
      updates.push(`unit_of_measure = $${paramCount++}`);
      values.push(unit_of_measure);
    }
    if (price_per_unit !== undefined) {
      updates.push(`price_per_unit = $${paramCount++}`);
      values.push(price_per_unit);
    }
    if (harvest_date !== undefined) {
      updates.push(`harvest_date = $${paramCount++}`);
      values.push(harvest_date);
    }
    if (expiry_date !== undefined) {
      updates.push(`expiry_date = $${paramCount++}`);
      values.push(expiry_date);
    }
    if (is_organic !== undefined) {
      updates.push(`is_organic = $${paramCount++}`);
      values.push(is_organic);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE conditions
    values.push(product_id, farmerId);

    const result = await query(
      `UPDATE PRODUCT 
      SET ${updates.join(', ')}
      WHERE product_id = $${paramCount++} AND farmer_id = $${paramCount++}
      RETURNING 
        product_id as id,
        product_name as name,
        category,
        description,
        quantity_available as quantity,
        unit_of_measure as unit,
        price_per_unit as price,
        harvest_date as "harvestDate",
        expiry_date as "expiryDate",
        is_organic as "isOrganic",
        status,
        updated_at as "updatedAt"`,
      values
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: result.rows[0],
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * DELETE /api/farmer/products/:id
 * Delete a product
 */
router.delete('/products/:id', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;
    const productId = req.params.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Verify product belongs to farmer
    const checkResult = await query(
      'SELECT product_id FROM PRODUCT WHERE product_id = $1 AND farmer_id = $2',
      [productId, farmerId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission to delete it',
      });
    }

    // Check if product has active orders
    const orderCheck = await query(
      `SELECT COUNT(*) as count 
      FROM ORDER_ITEMS oi
      JOIN "ORDER" o ON oi.order_id = o.order_id
      WHERE oi.product_id = $1 AND o.status NOT IN ('completed', 'cancelled')`,
      [productId]
    );

    if (parseInt(orderCheck.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete product with active orders. Please complete or cancel orders first.',
      });
    }

    // Delete product
    await query(
      'DELETE FROM PRODUCT WHERE product_id = $1 AND farmer_id = $2',
      [productId, farmerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * GET /api/farmer/dashboard-stats
 * Get dashboard statistics for farmer
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const farmerId = req.user.farmerId || req.user.userId;

    // Get product count
    const productCount = await query(
      'SELECT COUNT(*) as count FROM PRODUCT WHERE farmer_id = $1',
      [farmerId]
    );

    // Get active orders count
    const activeOrders = await query(
      `SELECT COUNT(DISTINCT o.order_id) as count
      FROM "ORDER" o
      JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
      JOIN PRODUCT p ON oi.product_id = p.product_id
      WHERE p.farmer_id = $1 AND o.status NOT IN ('completed', 'cancelled')`,
      [farmerId]
    );

    // Get total revenue
    const revenue = await query(
      `SELECT COALESCE(SUM(o.total_amount), 0) as total
      FROM "ORDER" o
      JOIN ORDER_ITEMS oi ON o.order_id = oi.order_id
      JOIN PRODUCT p ON oi.product_id = p.product_id
      WHERE p.farmer_id = $1 AND o.payment_status = 'completed'`,
      [farmerId]
    );

    // Get low stock products
    const lowStock = await query(
      `SELECT COUNT(*) as count
      FROM PRODUCT
      WHERE farmer_id = $1 AND quantity_available < 10 AND status = 'available'`,
      [farmerId]
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalProducts: parseInt(productCount.rows[0].count),
        activeOrders: parseInt(activeOrders.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].total),
        lowStockItems: parseInt(lowStock.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
