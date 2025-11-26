const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

/**
 * Returns conversations with last message preview and unread count
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.role || req.user.userType; // Support both role and userType

    // Get buyer_id or farmer_id based on user type
    let participantId;
    if (userType === 'buyer') {
      const buyerRes = await query('SELECT buyer_id FROM BUYER WHERE user_id = $1', [userId]);
      if (buyerRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Buyer profile not found' });
      }
      participantId = buyerRes.rows[0].buyer_id;
    } else if (userType === 'farmer') {
      const farmerRes = await query('SELECT farmer_id FROM FARMER WHERE user_id = $1', [userId]);
      if (farmerRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Farmer profile not found' });
      }
      participantId = farmerRes.rows[0].farmer_id;
    } else {
      return res.status(403).json({ success: false, message: 'Invalid user type' });
    }

    // Fetch conversations with last message and unread count
    const conversationsQuery = `
      SELECT 
        c.conversation_id,
        c.order_id,
        c.subject,
        c.status,
        c.created_at,
        c.last_message_at,
        
        -- Other participant details
        CASE 
          WHEN $2 = 'buyer' THEN u_farmer.first_name || ' ' || u_farmer.last_name
          ELSE u_buyer.first_name || ' ' || u_buyer.last_name
        END as other_party_name,
        
        CASE 
          WHEN $2 = 'buyer' THEN u_farmer.user_id
          ELSE u_buyer.user_id
        END as other_party_id,
        
        CASE 
          WHEN $2 = 'buyer' THEN 'farmer'
          ELSE 'buyer'
        END as other_party_type,
        
        -- Last message preview
        (
          SELECT message_text 
          FROM MESSAGE 
          WHERE conversation_id = c.conversation_id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        
        (
          SELECT created_at 
          FROM MESSAGE 
          WHERE conversation_id = c.conversation_id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time,
        
        -- Unread count for current user
        (
          SELECT COUNT(*) 
          FROM MESSAGE m
          WHERE m.conversation_id = c.conversation_id 
            AND m.sender_id != $3
            AND m.is_read = FALSE
        ) as unread_count,
        
        -- Order details if linked
        o.order_id as order_number,
        o.total_amount
        
      FROM CONVERSATION c
      LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
      LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
      LEFT JOIN "USER" u_buyer ON b.user_id = u_buyer.user_id
      LEFT JOIN "USER" u_farmer ON f.user_id = u_farmer.user_id
      LEFT JOIN "ORDER" o ON c.order_id = o.order_id
      
      WHERE 
        CASE 
          WHEN $2 = 'buyer' THEN c.buyer_id = $1
          ELSE c.farmer_id = $1
        END
        AND c.status = 'active'
      
      ORDER BY c.last_message_at DESC
    `;

    const conversations = await query(conversationsQuery, [participantId, userType, userId]);

    res.json({
      success: true,
      conversations: conversations.rows,
      totalUnread: conversations.rows.reduce((sum, conv) => sum + parseInt(conv.unread_count || 0), 0)
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch conversations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Create or get existing conversation between buyer and farmer
 * POST body: { farmerId, orderId (optional), subject (optional) }
 */
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.role || req.user.userType; // Support both role and userType
    const { farmerId, orderId, subject } = req.body;

    console.log('Create conversation request:', { userId, userType, farmerId, orderId, subject });

    // Validate farmerId
    if (!farmerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Farmer ID is required',
        debug: { farmerId, body: req.body }
      });
    }

    // Only buyers can initiate conversations
    if (userType !== 'buyer') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only buyers can initiate conversations',
        debug: { userType, role: req.user.role, userId }
      });
    }

    // Get buyer_id
    const buyerRes = await query('SELECT buyer_id FROM BUYER WHERE user_id = $1', [userId]);
    if (buyerRes.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Buyer profile not found',
        debug: { userId }
      });
    }
    const buyerId = buyerRes.rows[0].buyer_id;
    console.log('Buyer ID found:', buyerId);

    // Verify farmer exists
    const farmerCheck = await query('SELECT farmer_id FROM FARMER WHERE farmer_id = $1', [farmerId]);
    if (farmerCheck.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farmer not found',
        debug: { farmerId }
      });
    }

    // Check if conversation already exists
    const existingConv = await query(
      `SELECT conversation_id FROM CONVERSATION 
       WHERE buyer_id = $1 AND farmer_id = $2 AND (order_id = $3 OR (order_id IS NULL AND $3 IS NULL))`,
      [buyerId, farmerId, orderId || null]
    );

    if (existingConv.rows.length > 0) {
      // Return existing conversation
      return res.json({
        success: true,
        conversationId: existingConv.rows[0].conversation_id,
        isNew: false
      });
    }

    // Create new conversation
    let conversationSubject = subject;
    if (!conversationSubject) {
      if (orderId) {
        conversationSubject = `Order #${orderId}`;
      } else {
        conversationSubject = 'Product Inquiry';
      }
    }

    const newConv = await query(
      `INSERT INTO CONVERSATION (buyer_id, farmer_id, order_id, subject)
       VALUES ($1, $2, $3, $4)
       RETURNING conversation_id`,
      [buyerId, farmerId, orderId || null, conversationSubject]
    );

    res.status(201).json({
      success: true,
      conversationId: newConv.rows[0].conversation_id,
      isNew: true
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get messages for a conversation
 * Query params: limit (default 50), offset (default 0)
 */
router.get('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const userType = req.user.role || req.user.userType; // Support both role and userType
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Verify user is part of this conversation
    const participantCheck = await query(
      `SELECT c.conversation_id 
       FROM CONVERSATION c
       LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
       LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
       WHERE c.conversation_id = $1 
         AND (
           (b.user_id = $2 AND $3 = 'buyer') OR 
           (f.user_id = $2 AND $3 = 'farmer')
         )`,
      [conversationId, userId, userType]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
    }

    // Fetch messages
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
        CASE WHEN m.sender_id = $2 THEN true ELSE false END as is_own_message
      FROM MESSAGE m
      JOIN "USER" u ON m.sender_id = u.user_id
      WHERE m.conversation_id = $1
        AND m.is_deleted = FALSE
      ORDER BY m.created_at ASC
      LIMIT $3 OFFSET $4
    `;

    const messages = await query(messagesQuery, [conversationId, userId, limit, offset]);

    // Mark messages as read (only messages sent by the other party)
    await query(
      `UPDATE MESSAGE 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 
         AND sender_id != $2 
         AND is_read = FALSE`,
      [conversationId, userId]
    );

    res.json({
      success: true,
      messages: messages.rows
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Send a new message
 * POST body: { messageText }
 */
router.post('/conversations/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageText } = req.body;
    const userId = req.user.userId;
    const userType = req.user.role || req.user.userType; // Support both role and userType

    // Validate message text
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    if (messageText.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 5000 characters)' });
    }

    // Verify user is part of this conversation
    const participantCheck = await query(
      `SELECT c.conversation_id 
       FROM CONVERSATION c
       LEFT JOIN BUYER b ON c.buyer_id = b.buyer_id
       LEFT JOIN FARMER f ON c.farmer_id = f.farmer_id
       WHERE c.conversation_id = $1 
         AND (
           (b.user_id = $2 AND $3 = 'buyer') OR 
           (f.user_id = $2 AND $3 = 'farmer')
         )`,
      [conversationId, userId, userType]
    );

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
    }

    // Insert message
    const newMessage = await query(
      `INSERT INTO MESSAGE (conversation_id, sender_id, sender_type, message_text)
       VALUES ($1, $2, $3, $4)
       RETURNING message_id, created_at`,
      [conversationId, userId, userType, messageText.trim()]
    );

    // Get sender details for response
    const senderDetails = await query(
      `SELECT first_name || ' ' || last_name as sender_name FROM "USER" WHERE user_id = $1`,
      [userId]
    );

    res.status(201).json({
      success: true,
      message: {
        message_id: newMessage.rows[0].message_id,
        sender_id: userId,
        sender_type: userType,
        sender_name: senderDetails.rows[0].sender_name,
        message_text: messageText.trim(),
        is_read: false,
        created_at: newMessage.rows[0].created_at,
        is_own_message: true
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get unread message count for authenticated user
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.role || req.user.userType; // Support both role and userType

    // Get participant ID
    let participantId;
    if (userType === 'buyer') {
      const buyerRes = await query('SELECT buyer_id FROM BUYER WHERE user_id = $1', [userId]);
      if (buyerRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Buyer profile not found' });
      }
      participantId = buyerRes.rows[0].buyer_id;
    } else if (userType === 'farmer') {
      const farmerRes = await query('SELECT farmer_id FROM FARMER WHERE user_id = $1', [userId]);
      if (farmerRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Farmer profile not found' });
      }
      participantId = farmerRes.rows[0].farmer_id;
    } else {
      return res.status(403).json({ success: false, message: 'Invalid user type' });
    }

    // Count unread messages
    const unreadQuery = `
      SELECT COUNT(*)::INTEGER as unread_count
      FROM MESSAGE m
      JOIN CONVERSATION c ON m.conversation_id = c.conversation_id
      WHERE m.is_read = FALSE
        AND m.sender_id != $1
        AND CASE 
          WHEN $2 = 'buyer' THEN c.buyer_id = $3
          ELSE c.farmer_id = $3
        END
    `;

    const result = await query(unreadQuery, [userId, userType, participantId]);

    res.json({
      success: true,
      unreadCount: result.rows[0].unread_count || 0
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Mark all messages in a conversation as read
 */
router.put('/conversations/:conversationId/mark-read', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    const result = await query(
      `UPDATE MESSAGE 
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 
         AND sender_id != $2 
         AND is_read = FALSE
       RETURNING message_id`,
      [conversationId, userId]
    );

    res.json({
      success: true,
      markedCount: result.rows.length
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
