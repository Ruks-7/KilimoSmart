const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create a review
router.post('/', authenticateToken, async (req, res) => {
  const { orderId, farmerId, rating, comment } = req.body;
  const buyerId = req.user.buyerId || req.user.userId;

  try {
    // Validate required fields
    if (!orderId || !farmerId || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields: orderId, farmerId, and rating are required' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify the order exists and belongs to the buyer and is completed
    const orderCheck = await pool.query(
      `SELECT o.order_id, o.status, o.farmer_id 
       FROM "ORDER" o 
       WHERE o.order_id = $1 AND o.buyer_id = $2 AND o.status = 'completed'`,
      [orderId, buyerId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Order not found, does not belong to you, or is not completed' 
      });
    }

    // Verify the farmer matches
    if (orderCheck.rows[0].farmer_id !== farmerId) {
      return res.status(400).json({ error: 'Farmer ID does not match order' });
    }

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT review_id FROM REVIEWS WHERE order_id = $1 AND buyer_id = $2',
      [orderId, buyerId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this order' });
    }

    // Create the review
    const result = await pool.query(
      `INSERT INTO REVIEWS (order_id, buyer_id, farmer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING review_id, order_id, buyer_id, farmer_id, rating, comment, created_at`,
      [orderId, buyerId, farmerId, rating, comment || null]
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ 
      error: 'Failed to create review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get reviews for a farmer
router.get('/farmer/:farmerId', async (req, res) => {
  const { farmerId } = req.params;
  const { page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      `SELECT 
        r.review_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        b.first_name as buyer_first_name,
        b.last_name as buyer_last_name,
        rr.response_text,
        rr.created_at as response_date,
        (SELECT COUNT(*) FROM REVIEW_HELPFUL_VOTES WHERE review_id = r.review_id) as helpful_count
       FROM REVIEWS r
       JOIN BUYERS b ON r.buyer_id = b.buyer_id
       LEFT JOIN REVIEW_RESPONSES rr ON r.review_id = rr.review_id
       WHERE r.farmer_id = $1
       ORDER BY ${sortBy} ${order}
       LIMIT $2 OFFSET $3`,
      [farmerId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM REVIEWS WHERE farmer_id = $1',
      [farmerId]
    );

    // Get average rating and stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM REVIEWS WHERE farmer_id = $1`,
      [farmerId]
    );

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      },
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching farmer reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviews by a buyer
router.get('/buyer/:buyerId', authenticateToken, async (req, res) => {
  const { buyerId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  // Verify the buyer is requesting their own reviews
  if (req.user.userId !== buyerId) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  try {
    const result = await pool.query(
      `SELECT 
        r.review_id,
        r.order_id,
        r.rating,
        r.comment,
        r.created_at,
        r.updated_at,
        f.first_name as farmer_first_name,
        f.last_name as farmer_last_name,
        f.reputation_score,
        rr.response_text,
        rr.created_at as response_date
       FROM REVIEWS r
       JOIN FARMERS f ON r.farmer_id = f.farmer_id
       LEFT JOIN REVIEW_RESPONSES rr ON r.review_id = rr.review_id
       WHERE r.buyer_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [buyerId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM REVIEWS WHERE buyer_id = $1',
      [buyerId]
    );

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching buyer reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get reviewable orders for a buyer
router.get('/reviewable-orders/:buyerId', authenticateToken, async (req, res) => {
  const { buyerId } = req.params;

  console.log('📝 Fetching reviewable orders for buyer:', buyerId);
  console.log('🔐 Authenticated user:', req.user);

  // Verify the buyer is requesting their own orders
  const requestorBuyerId = req.user.buyerId || req.user.userId;
  console.log('🔍 Requestor buyerId:', requestorBuyerId);
  
  if (requestorBuyerId !== buyerId) {
    console.log('❌ Unauthorized: requestor ID does not match');
    return res.status(403).json({ error: 'Unauthorized access' });
  }

  try {
    console.log('🔎 Querying database for completed orders...');
    const result = await pool.query(
      `SELECT DISTINCT
        o.order_id,
        o.total_amount,
        o.order_date,
        o.status,
        f.farmer_id,
        u.first_name || ' ' || u.last_name as farmer_name,
        l.county as farmer_location,
        f.reputation_score as farmer_rating,
        r.review_id,
        r.rating as review_rating
       FROM "ORDER" o
       JOIN FARMER f ON o.farmer_id = f.farmer_id
       JOIN "USER" u ON f.user_id = u.user_id
       LEFT JOIN LOCATION l ON f.location_id = l.location_id
       LEFT JOIN REVIEWS r ON o.order_id = r.order_id AND r.buyer_id = $1
       WHERE o.buyer_id = $1 AND o.status = 'completed'
       ORDER BY o.order_date DESC`,
      [buyerId]
    );

    console.log(`✅ Found ${result.rows.length} completed orders`);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await pool.query(
          `SELECT 
            oi.product_id,
            p.product_name,
            oi.quantity_ordered as quantity,
            p.unit_of_measure as unit
           FROM ORDER_ITEMS oi
           JOIN PRODUCT p ON oi.product_id = p.product_id
           WHERE oi.order_id = $1`,
          [order.order_id]
        );

        return {
          orderId: order.order_id,
          totalAmount: parseFloat(order.total_amount),
          orderDate: order.order_date,
          status: order.status,
          farmerId: order.farmer_id,
          farmerName: order.farmer_name,
          farmerLocation: order.farmer_location,
          farmerRating: parseFloat(order.farmer_rating) || 0,
          hasReview: !!order.review_id,
          reviewRating: order.review_rating,
          items: itemsResult.rows.map(item => ({
            productId: item.product_id,
            productName: item.product_name,
            quantity: parseFloat(item.quantity),
            unit: item.unit
          }))
        };
      })
    );

    console.log(`📦 Returning ${ordersWithItems.length} orders with items`);
    
    res.json({ 
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length
    });
  } catch (error) {
    console.error('❌ Error fetching reviewable orders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviewable orders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update a review
router.put('/:reviewId', authenticateToken, async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment } = req.body;
  const buyerId = req.user.userId;

  try {
    // Verify the review belongs to the buyer
    const reviewCheck = await pool.query(
      'SELECT buyer_id FROM REVIEWS WHERE review_id = $1',
      [reviewId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewCheck.rows[0].buyer_id !== buyerId) {
      return res.status(403).json({ error: 'Unauthorized to update this review' });
    }

    // Update the review
    const result = await pool.query(
      `UPDATE REVIEWS 
       SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
       WHERE review_id = $3
       RETURNING *`,
      [rating, comment, reviewId]
    );

    res.json({
      message: 'Review updated successfully',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  const { reviewId } = req.params;
  const buyerId = req.user.userId;

  try {
    // Verify the review belongs to the buyer
    const reviewCheck = await pool.query(
      'SELECT buyer_id FROM REVIEWS WHERE review_id = $1',
      [reviewId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewCheck.rows[0].buyer_id !== buyerId) {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    // Delete the review
    await pool.query('DELETE FROM REVIEWS WHERE review_id = $1', [reviewId]);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Add a response to a review (for farmers)
router.post('/:reviewId/response', authenticateToken, async (req, res) => {
  const { reviewId } = req.params;
  const { responseText } = req.body;
  const farmerId = req.user.userId;

  try {
    // Verify the review exists and belongs to the farmer
    const reviewCheck = await pool.query(
      'SELECT farmer_id FROM REVIEWS WHERE review_id = $1',
      [reviewId]
    );

    if (reviewCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewCheck.rows[0].farmer_id !== farmerId) {
      return res.status(403).json({ error: 'Unauthorized to respond to this review' });
    }

    // Check if response already exists
    const existingResponse = await pool.query(
      'SELECT response_id FROM REVIEW_RESPONSES WHERE review_id = $1',
      [reviewId]
    );

    if (existingResponse.rows.length > 0) {
      // Update existing response
      const result = await pool.query(
        `UPDATE REVIEW_RESPONSES 
         SET response_text = $1, updated_at = CURRENT_TIMESTAMP
         WHERE review_id = $2
         RETURNING *`,
        [responseText, reviewId]
      );

      return res.json({
        message: 'Response updated successfully',
        response: result.rows[0]
      });
    }

    // Create new response
    const result = await pool.query(
      `INSERT INTO REVIEW_RESPONSES (review_id, farmer_id, response_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [reviewId, farmerId, responseText]
    );

    res.status(201).json({
      message: 'Response created successfully',
      response: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating review response:', error);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

// Mark review as helpful
router.post('/:reviewId/helpful', authenticateToken, async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if already voted
    const existingVote = await pool.query(
      'SELECT vote_id FROM REVIEW_HELPFUL_VOTES WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote
      await pool.query(
        'DELETE FROM REVIEW_HELPFUL_VOTES WHERE review_id = $1 AND user_id = $2',
        [reviewId, userId]
      );

      return res.json({ message: 'Helpful vote removed' });
    }

    // Add vote
    await pool.query(
      'INSERT INTO REVIEW_HELPFUL_VOTES (review_id, user_id) VALUES ($1, $2)',
      [reviewId, userId]
    );

    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

module.exports = router;
