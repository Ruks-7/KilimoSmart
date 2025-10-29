const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Returns list of users (basic info) for admin panel
 */
router.get('/users', async (req, res) => {
  try {
    // Pagination and search
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 200);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;

    const params = [];
    let where = '';
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where = `WHERE (u.email ILIKE $1 OR u.first_name ILIKE $2 OR u.last_name ILIKE $3)`;
      // shift params for pagination
      // we'll rebuild params properly below
    }

    // Build query with safe parameter numbering
    if (search) {
      const q = `SELECT u.user_id as id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.user_type as "userType", u.phone_number as "phoneNumber", u.created_at as "createdAt" FROM "USER" u WHERE (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1) ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`;
      const countQ = `SELECT COUNT(*) as count FROM "USER" u WHERE (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)`;
      const data = await query(q, [`%${search}%`, limit, offset]);
      const countRes = await query(countQ, [`%${search}%`]);
      return res.status(200).json({ success: true, users: data.rows, total: parseInt(countRes.rows[0].count), page, limit });
    }

    const result = await query(`SELECT u.user_id as id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.user_type as "userType", u.phone_number as "phoneNumber", u.created_at as "createdAt" FROM "USER" u ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    const countRes = await query('SELECT COUNT(*) as count FROM "USER"');
    return res.status(200).json({ success: true, users: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
  } catch (error) {
    console.error('Admin GET /users error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});


// GET /api/admin/users/:id - user details
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userRes = await query(
      `SELECT u.user_id as id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.user_type as "userType", u.phone_number as "phoneNumber", u.created_at as "createdAt", u.email_verified as "emailVerified"
       FROM "USER" u WHERE u.user_id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // fetch counts: orders, payments
    const ordersRes = await query('SELECT COUNT(*) as count FROM "ORDER" o WHERE o.buyer_id = (SELECT buyer_id FROM BUYER WHERE user_id = $1)', [userId]);
    const paymentsRes = await query('SELECT COUNT(*) as count FROM PAYMENT p WHERE p.order_id IN (SELECT order_id FROM "ORDER" o WHERE o.buyer_id = (SELECT buyer_id FROM BUYER WHERE user_id = $1))', [userId]);

    const user = userRes.rows[0];
    user.orderCount = parseInt(ordersRes.rows[0].count || 0);
    user.paymentCount = parseInt(paymentsRes.rows[0].count || 0);

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Admin GET /users/:id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user details', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/admin/transactions
 * Returns recent payments and orders summary
 */
router.get('/transactions', async (req, res) => {
  try {
    // Support paging and type filter
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 200);
    const offset = (page - 1) * limit;
    const type = req.query.type || 'both'; // 'payments', 'orders', or 'both'

    let payments = [];
    let orders = [];

    if (type === 'payments' || type === 'both') {
      const p = await query(`SELECT p.payment_id as id, p.order_id as "orderId", p.amount, p.payment_date as date, p.payment_method as method, p.payment_status as status, p.mpesa_transaction_id as "transactionId" FROM PAYMENT p ORDER BY p.payment_date DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      const pCount = await query('SELECT COUNT(*) as count FROM PAYMENT');
      payments = p.rows;
      // include pagination metadata
      payments._meta = { total: parseInt(pCount.rows[0].count), page, limit };
    }

    if (type === 'orders' || type === 'both') {
      const o = await query(`SELECT o.order_id as id, o.buyer_id as "buyerId", o.farmer_id as "farmerId", o.order_date as date, o.total_amount as amount, o.status, o.payment_status as "paymentStatus" FROM "ORDER" o ORDER BY o.order_date DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      const oCount = await query('SELECT COUNT(*) as count FROM "ORDER"');
      orders = o.rows;
      orders._meta = { total: parseInt(oCount.rows[0].count), page, limit };
    }

    return res.status(200).json({ success: true, payments, orders });
  } catch (error) {
    console.error('Admin GET /transactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});


// GET /api/admin/orders/:id - order detail with items
router.get('/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const orderRes = await query(
      `SELECT o.order_id as id, o.buyer_id as "buyerId", o.farmer_id as "farmerId", o.order_date as date, o.total_amount as amount, o.delivery_address as "deliveryAddress", o.status, o.payment_status as "paymentStatus", o.delivery_date as "deliveryDate"
       FROM "ORDER" o WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });

    const itemsRes = await query(
      `SELECT oi.order_item_id as id, oi.product_id as "productId", oi.quantity_ordered as quantity, oi.unit_price as unitPrice, oi.subtotal FROM ORDER_ITEMS oi WHERE oi.order_id = $1`,
      [orderId]
    );

    return res.status(200).json({ success: true, order: orderRes.rows[0], items: itemsRes.rows });
  } catch (error) {
    console.error('Admin GET /orders/:id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/admin/stats
 * Returns aggregated statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await query('SELECT COUNT(*) as count FROM "USER"');
    const totalFarmers = await query('SELECT COUNT(*) as count FROM FARMER');
    const totalBuyers = await query('SELECT COUNT(*) as count FROM BUYER');
    const totalProducts = await query('SELECT COUNT(*) as count FROM PRODUCT');
    const totalOrders = await query('SELECT COUNT(*) as count FROM "ORDER"');
    const revenue = await query('SELECT COALESCE(SUM(amount),0) as total FROM PAYMENT');

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalFarmers: parseInt(totalFarmers.rows[0].count),
        totalBuyers: parseInt(totalBuyers.rows[0].count),
        totalProducts: parseInt(totalProducts.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].total),
      }
    });
  } catch (error) {
    console.error('Admin GET /stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/admin/sales-over-time
 * Returns monthly sales data for the last 12 months
 */
router.get('/sales-over-time', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        TO_CHAR(p.payment_date, 'YYYY-MM') as period,
        SUM(p.amount) as sales
      FROM PAYMENT p
      WHERE p.payment_status = 'completed'
        AND p.payment_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(p.payment_date, 'YYYY-MM')
      ORDER BY period
    `);

    const data = result.rows.map(row => ({
      period: row.period,
      sales: parseFloat(row.sales)
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Admin GET /sales-over-time error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales data', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;
