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
    const userType = req.query.userType ? req.query.userType.trim().toLowerCase() : null;

    const params = [];
    let whereConditions = [];
    
    // Add search condition
    if (search) {
      whereConditions.push(`(u.email ILIKE $${params.length + 1} OR u.first_name ILIKE $${params.length + 1} OR u.last_name ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    
    // Add user type filter
    if (userType && (userType === 'farmer' || userType === 'buyer')) {
      whereConditions.push(`u.user_type = $${params.length + 1}`);
      params.push(userType);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build query
    const selectQuery = `SELECT u.user_id as id, u.email, u.first_name as "firstName", u.last_name as "lastName", u.user_type as "userType", u.phone_number as "phoneNumber", u.created_at as "createdAt" FROM "USER" u ${whereClause} ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const countQuery = `SELECT COUNT(*) as count FROM "USER" u ${whereClause}`;

    params.push(limit, offset);
    const data = await query(selectQuery, params);
    
    // For count query, remove the last two params (limit and offset)
    const countParams = params.slice(0, -2);
    const countRes = await query(countQuery, countParams);
    
    // Get overall stats for the stats cards
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE user_type = 'farmer') as farmers,
        COUNT(*) FILTER (WHERE user_type = 'buyer') as buyers
      FROM "USER"
    `;
    const statsRes = await query(statsQuery);
    const stats = {
      total: parseInt(statsRes.rows[0].total || 0),
      farmers: parseInt(statsRes.rows[0].farmers || 0),
      buyers: parseInt(statsRes.rows[0].buyers || 0)
    };

    return res.status(200).json({ 
      success: true, 
      users: data.rows, 
      total: parseInt(countRes.rows[0].count), 
      page, 
      limit,
      stats 
    });
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

/**
 * GET /api/admin/messages
 * Returns all conversations with message statistics for admin oversight
 */
router.get('/messages', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 25, 200);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : null;
    const status = req.query.status ? req.query.status.trim() : null;

    const params = [limit, offset];
    let whereConditions = [];
    
    // Add search condition (search by buyer/farmer names or subject)
    if (search) {
      whereConditions.push(`(
        u_buyer.first_name ILIKE $${params.length + 1} OR 
        u_buyer.last_name ILIKE $${params.length + 1} OR
        u_farmer.first_name ILIKE $${params.length + 1} OR 
        u_farmer.last_name ILIKE $${params.length + 1} OR
        c.subject ILIKE $${params.length + 1}
      )`);
      params.push(`%${search}%`);
    }
    
    // Add status filter
    if (status && ['active', 'archived', 'closed'].includes(status)) {
      whereConditions.push(`c.status = $${params.length + 1}`);
      params.push(status);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build query to get conversations with details
    const conversationsQuery = `
      SELECT 
        c.conversation_id,
        c.buyer_id,
        c.farmer_id,
        c.order_id,
        c.subject,
        c.status,
        c.created_at,
        c.last_message_at,
        u_buyer.first_name || ' ' || u_buyer.last_name as buyer_name,
        u_buyer.email as buyer_email,
        u_farmer.first_name || ' ' || u_farmer.last_name as farmer_name,
        u_farmer.email as farmer_email,
        (
          SELECT COUNT(*)
          FROM MESSAGE m
          WHERE m.conversation_id = c.conversation_id
            AND m.is_deleted = FALSE
        ) as message_count,
        (
          SELECT COUNT(*)
          FROM MESSAGE m
          WHERE m.conversation_id = c.conversation_id
            AND m.is_read = FALSE
        ) as unread_count,
        (
          SELECT message_text
          FROM MESSAGE m
          WHERE m.conversation_id = c.conversation_id
            AND m.is_deleted = FALSE
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message
      FROM CONVERSATION c
      LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
      LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
      LEFT JOIN "USER" u_buyer ON b.user_id = u_buyer.user_id
      LEFT JOIN "USER" u_farmer ON f.user_id = u_farmer.user_id
      ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM CONVERSATION c
      LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
      LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
      LEFT JOIN "USER" u_buyer ON b.user_id = u_buyer.user_id
      LEFT JOIN "USER" u_farmer ON f.user_id = u_farmer.user_id
      ${whereClause}
    `;

    const conversations = await query(conversationsQuery, params);
    
    // For count query, remove limit and offset params
    const countParams = params.slice(2);
    const countRes = await query(countQuery, countParams);

    // Get overall message statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT c.conversation_id) as total_conversations,
        COUNT(m.message_id) as total_messages,
        COUNT(*) FILTER (WHERE c.status = 'active') as active_conversations,
        COUNT(*) FILTER (WHERE c.status = 'archived') as archived_conversations,
        COUNT(*) FILTER (WHERE c.status = 'closed') as closed_conversations,
        COUNT(m.message_id) FILTER (WHERE m.is_read = FALSE) as total_unread
      FROM CONVERSATION c
      LEFT JOIN MESSAGE m ON c.conversation_id = m.conversation_id AND m.is_deleted = FALSE
    `;
    const statsRes = await query(statsQuery);
    const stats = {
      totalConversations: parseInt(statsRes.rows[0].total_conversations || 0),
      totalMessages: parseInt(statsRes.rows[0].total_messages || 0),
      activeConversations: parseInt(statsRes.rows[0].active_conversations || 0),
      archivedConversations: parseInt(statsRes.rows[0].archived_conversations || 0),
      closedConversations: parseInt(statsRes.rows[0].closed_conversations || 0),
      totalUnread: parseInt(statsRes.rows[0].total_unread || 0)
    };

    return res.status(200).json({ 
      success: true, 
      conversations: conversations.rows,
      total: parseInt(countRes.rows[0].count), 
      page, 
      limit,
      stats 
    });
  } catch (error) {
    console.error('Admin GET /messages error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch messages', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * GET /api/admin/messages/:conversationId
 * Returns all messages in a specific conversation for admin review
 */
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Get conversation details
    const conversationQuery = `
      SELECT 
        c.conversation_id,
        c.buyer_id,
        c.farmer_id,
        c.order_id,
        c.subject,
        c.status,
        c.created_at,
        c.last_message_at,
        u_buyer.first_name || ' ' || u_buyer.last_name as buyer_name,
        u_buyer.email as buyer_email,
        u_farmer.first_name || ' ' || u_farmer.last_name as farmer_name,
        u_farmer.email as farmer_email
      FROM CONVERSATION c
      LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
      LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
      LEFT JOIN "USER" u_buyer ON b.user_id = u_buyer.user_id
      LEFT JOIN "USER" u_farmer ON f.user_id = u_farmer.user_id
      WHERE c.conversation_id = $1
    `;

    const conversationRes = await query(conversationQuery, [conversationId]);

    if (conversationRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get all messages in the conversation
    const messagesQuery = `
      SELECT 
        m.message_id,
        m.sender_id,
        m.sender_type,
        m.message_text,
        m.is_read,
        m.read_at,
        m.created_at,
        u.first_name || ' ' || u.last_name as sender_name,
        u.email as sender_email
      FROM MESSAGE m
      JOIN "USER" u ON m.sender_id = u.user_id
      WHERE m.conversation_id = $1
        AND m.is_deleted = FALSE
      ORDER BY m.created_at ASC
    `;

    const messagesRes = await query(messagesQuery, [conversationId]);

    return res.status(200).json({
      success: true,
      conversation: conversationRes.rows[0],
      messages: messagesRes.rows
    });
  } catch (error) {
    console.error('Admin GET /messages/:conversationId error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversation details', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

/**
 * PUT /api/admin/messages/:conversationId/status
 * Update conversation status (active, archived, closed)
 */
router.put('/messages/:conversationId/status', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'archived', 'closed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be one of: active, archived, closed' 
      });
    }

    const result = await query(
      `UPDATE CONVERSATION 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $2
       RETURNING conversation_id, status`,
      [status, conversationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Conversation status updated',
      conversation: result.rows[0]
    });
  } catch (error) {
    console.error('Admin PUT /messages/:conversationId/status error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update conversation status', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

module.exports = router;
