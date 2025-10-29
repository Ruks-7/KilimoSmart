const express = require('express');
const axios = require('axios');
const router = express.Router();
const { query } = require('../config/database');

require('dotenv').config();


// Daraja endpoints depending on environment
const DAR_AJA = {
  sandbox: {
    oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  },
  production: {
    oauth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  }
};

const getConfig = () => {
  const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
  return DAR_AJA[env] || DAR_AJA.sandbox;
};

const getAccessToken = async () => {
  const config = getConfig();
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set in environment');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const res = await axios.get(config.oauth, {
    headers: { Authorization: `Basic ${auth}` }
  });

  return res.data.access_token;
};

// Normalize and validate Kenyan phone numbers to 2547XXXXXXXX format
const normalizePhone = (raw) => {
  if (!raw && raw !== 0) return null;
  let s = String(raw).trim();
  // Remove non-digits
  s = s.replace(/[^0-9]/g, '');

  // Remove leading plus if present was removed by regex; handle common local formats
  if (s.startsWith('0') && s.length === 10) {
    // 07XXXXXXXX -> 2547XXXXXXXX
    s = '254' + s.slice(1);
  } else if (s.length === 9 && s.startsWith('7')) {
    // 7XXXXXXXX -> 2547XXXXXXXX
    s = '254' + s;
  } else if (s.length === 12 && s.startsWith('254')) {
    // already in international format
    // keep as is
  } else if (s.length === 10 && s.startsWith('1')) {
    // unlikely, but handle other short formats by returning null
  }

  // Final validation: must be 12 digits and start with 254
  if (/^254\d{9}$/.test(s)) return s;
  return null;
};

// Simple token endpoint for testing
router.get('/token', async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ success: true, token });
  } catch (error) {
    console.error('Get MPESA token error:', error.message || error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// STK Push initiation
router.post('/stkpush', async (req, res) => {
  try {
    const { phone, amount, orderId, accountReference, transactionDesc } = req.body;

    if (!phone || !amount || !orderId) {
      return res.status(400).json({ success: false, message: 'phone, amount and orderId are required' });
    }

    // Normalize and validate phone server-side to avoid Daraja 'Invalid PhoneNumber' errors
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a Kenyan phone in one of: 07XXXXXXXX, 7XXXXXXXX, +2547XXXXXXXX, or 2547XXXXXXXX',
      });
    }

    const token = await getAccessToken();
    const config = getConfig();

    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0,14); // YYYYMMDDHHMMSS
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    if (!shortcode || !passkey) {
      return res.status(500).json({ success: false, message: 'MPESA_SHORTCODE and MPESA_PASSKEY must be set' });
    }

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: normalizedPhone, // customer msisdn in format 2547XXXXXXXX
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/mpesa/callback`,
      AccountReference: accountReference || String(orderId),
      TransactionDesc: transactionDesc || `Payment for order ${orderId}`
    };

    const response = await axios.post(config.stkpush, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Daraja returns CheckoutRequestID and MerchantRequestID even for pending requests
    const body = response.data;

    // Insert a pending payment record linking CheckoutRequestID -> orderId
    const checkoutRequestId = body.CheckoutRequestID || body.checkoutRequestID || null;

    try {
      await query(
        `INSERT INTO PAYMENT (order_id, amount, payment_method, payment_status, transaction_reference, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [orderId, amount, 'M-Pesa', 'pending', checkoutRequestId]
      );
    } catch (dbErr) {
      // Don't block caller if DB insert fails; just log
      console.error('Failed to create pending payment record:', dbErr);
    }

    return res.status(200).json({ success: true, data: body });
  } catch (error) {
    console.error('STK Push initiation error:', error.response ? error.response.data : error.message || error);
    const status = error.response && error.response.status ? error.response.status : 500;
    return res.status(status).json({ success: false, message: error.message || 'STK push failed', details: error.response ? error.response.data : undefined });
  }
});

// Callback endpoint for Daraja to post transaction results
router.post('/callback', async (req, res) => {
  try {
    // Daraja posts JSON body with structure: Body.stkCallback
    const callback = req.body;
    console.log('Received MPESA callback:', JSON.stringify(callback, null, 2));

    const stkCallback = callback?.Body?.stkCallback;
    if (!stkCallback) {
      // Acknowledge anyway
      return res.status(200).json({ success: true });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    if (resultCode === 0) {
      // Successful payment. Extract metadata
      const items = stkCallback?.CallbackMetadata?.Item || stkCallback?.CallbackMetadata?.Items || [];
      const metadata = {};
      for (const it of items) {
        // Items sometimes have Name/Value or name/value
        const name = it.Name || it.name;
        const value = it.Value || it.value;
        if (name) metadata[name] = value;
      }

      const mpesaReceiptNumber = metadata.MpesaReceiptNumber || metadata.Receipt || null;
      const amount = metadata.Amount || null;
      const phone = metadata.PhoneNumber || metadata.phoneNumber || null;
      const transactionDate = metadata.TransactionDate || null;

      // Find the pending payment using transaction_reference (we saved CheckoutRequestID there)
      const paymentRes = await query('SELECT payment_id, order_id FROM PAYMENT WHERE transaction_reference = $1 LIMIT 1', [checkoutRequestId]);
      if (paymentRes.rows.length > 0) {
        const payment = paymentRes.rows[0];
        // Update payment
        await query(
          `UPDATE PAYMENT SET mpesa_transaction_id = $1, payment_status = $2, payment_date = CURRENT_TIMESTAMP, transaction_reference = $3 WHERE payment_id = $4`,
          [mpesaReceiptNumber || null, 'completed', checkoutRequestId, payment.payment_id]
        );

        // Update order payment status
        await query(`UPDATE "ORDER" SET payment_status = $1 WHERE order_id = $2`, ['paid', payment.order_id]);
        // Mark reservation released if present
        try {
          await query(`UPDATE ORDER_RESERVATION SET released = TRUE WHERE order_id = $1`, [payment.order_id]);
        } catch (e) {
          console.error('Failed to mark reservation released:', e.message || e);
        }
      } else {
        console.warn('No matching payment for CheckoutRequestID:', checkoutRequestId);
        // Optionally insert a record
        try {
          await query(
            `INSERT INTO PAYMENT (order_id, amount, payment_method, payment_status, mpesa_transaction_id, transaction_reference, created_at, payment_date)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [null, amount || null, 'M-Pesa', 'completed', mpesaReceiptNumber || null, checkoutRequestId]
          );
        } catch (e) {
          console.error('Failed to insert fallback payment record:', e.message || e);
        }
      }
    } else {
      console.warn('MPESA transaction failed or cancelled:', resultCode, resultDesc);
      // Mark payment as failed if present
      try {
        await query(`UPDATE PAYMENT SET payment_status = $1 WHERE transaction_reference = $2`, ['failed', checkoutRequestId]);
        // On failed payment, attempt to release reservation (restore product quantities and cancel order)
        try {
          const payRes = await query('SELECT order_id FROM PAYMENT WHERE transaction_reference = $1 LIMIT 1', [checkoutRequestId]);
          if (payRes.rows.length > 0) {
            const oid = payRes.rows[0].order_id;
            // Only release if we have a reservation and it's not already released
            const resCheck = await query('SELECT released FROM ORDER_RESERVATION WHERE order_id = $1 LIMIT 1', [oid]);
            if (resCheck.rows.length > 0 && resCheck.rows[0].released === false) {
              // Restore quantities for order items
              const itemsRes = await query('SELECT product_id, quantity_ordered FROM ORDER_ITEMS WHERE order_id = $1', [oid]);
              for (const it of itemsRes.rows) {
                try {
                  await query('UPDATE PRODUCT SET quantity_available = quantity_available + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2', [it.quantity_ordered, it.product_id]);
                } catch (e) {
                  console.error('Failed to restore product quantity for product', it.product_id, e.message || e);
                }
              }
              // Mark reservation released and cancel the order
              await query('UPDATE ORDER_RESERVATION SET released = TRUE WHERE order_id = $1', [oid]);
              await query('UPDATE "ORDER" SET status = $1, payment_status = $2 WHERE order_id = $3', ['cancelled', 'failed', oid]);
            }
          }
        } catch (e) {
          console.error('Failed to release reservation on payment failure:', e.message || e);
        }
      } catch (e) {
        console.error('Failed to mark payment failed:', e.message || e);
      }
    }

    // Acknowledge receipt quickly
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('MPESA callback handling error:', error.message || error);
    return res.status(500).json({ success: false });
  }
});

module.exports = router;
