const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Get purpose-specific text for email
 * @param {string} purpose - 'login', 'signup', or 'password_reset'
 * @returns {object} - Subject and action text
 */
function getPurposeText(purpose) {
  const texts = {
    login: {
      subject: 'Your Login Verification Code',
      action: 'login to',
      message: 'You requested to login to your KilimoSmart account.',
    },
    signup: {
      subject: 'Welcome to KilimoSmart - Verify Your Email',
      action: 'verify your email and complete registration for',
      message: 'Welcome to KilimoSmart! Please verify your email to complete your registration.',
    },
    password_reset: {
      subject: 'Password Reset Verification Code',
      action: 'reset your password for',
      message: 'You requested to reset your password for your KilimoSmart account.',
    },
  };

  return texts[purpose] || texts.login;
}

/**
 * Send OTP via email using SendGrid
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'login', 'signup', or 'password_reset'
 * @returns {Promise} - SendGrid response
 */
async function sendOTPEmail(email, otp, purpose = 'login') {
  const purposeText = getPurposeText(purpose);

  const msg = {
    to: email,
    from: {
      email: process.env.FROM_EMAIL,
      name: process.env.FROM_NAME || 'KilimoSmart',
    },
    subject: purposeText.subject,
    text: `Your KilimoSmart verification code is: ${otp}. This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. If you didn't request this code, please ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #004a2f 0%, #006b44 50%, #228b22 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .header .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            margin: 0 0 20px;
            font-size: 16px;
          }
          .otp-box {
            background: linear-gradient(135deg, #f0f8f0 0%, #e8f5e8 100%);
            border: 2px solid #004a2f;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .otp-code {
            font-size: 42px;
            font-weight: bold;
            color: #004a2f;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
          }
          .otp-label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          .expiry {
            background: #fff3cd;
            border-left: 4px solid #ff8c00;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .expiry strong {
            color: #ff6b35;
          }
          .warning {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            font-size: 14px;
          }
          .footer {
            background: #f8f8f8;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #ddd;
          }
          .footer p {
            margin: 5px 0;
            font-size: 13px;
            color: #666;
          }
          .footer a {
            color: #004a2f;
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media only screen and (max-width: 600px) {
            .container {
              margin: 10px;
            }
            .otp-code {
              font-size: 32px;
              letter-spacing: 8px;
            }
            .content {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🌾</div>
            <h1>KilimoSmart</h1>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            <p>${purposeText.message}</p>
            
            <div class="otp-box">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="expiry">
              <strong>⏰ This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</strong>
              <br>Please enter it promptly to ${purposeText.action} your account.
            </div>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong> If you didn't request this code, please ignore this email. 
              Your account is secure, and no changes have been made.
            </div>
            
            <p>
              For security reasons, never share this code with anyone. 
              KilimoSmart staff will never ask for your verification code.
            </p>
          </div>
          
          <div class="footer">
            <p><strong>KilimoSmart</strong> - Connecting Farmers & Buyers</p>
            <p>
              Need help? Contact us at 
              <a href="mailto:support@kilimosmart.com">support@kilimosmart.com</a>
            </p>
            <p style="margin-top: 15px; font-size: 11px; color: #999;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully to:', email);
    return response;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw new Error('Failed to send email');
  }
}

/**
 * Send welcome email after successful signup
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @returns {Promise} - SendGrid response
 */
async function sendWelcomeEmail(email, firstName) {
  const msg = {
    to: email,
    from: {
      email: process.env.FROM_EMAIL,
      name: process.env.FROM_NAME || 'KilimoSmart',
    },
    subject: 'Welcome to KilimoSmart! 🌾',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #004a2f;">Welcome to KilimoSmart, ${firstName}! 🌾</h2>
        <p>Your account has been successfully created and verified.</p>
        <p>You can now:</p>
        <ul>
          <li>List your farm products</li>
          <li>Connect with buyers</li>
          <li>Manage your orders</li>
          <li>Track your sales</li>
        </ul>
        <p>Get started by logging in to your dashboard.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          KilimoSmart - Connecting Farmers & Buyers<br>
          Email: support@kilimosmart.com
        </p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Welcome email sent to:', email);
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    // Don't throw error - welcome email is not critical
  }
}

/**
 * Send purchase receipt email to buyer
 * @param {object} receiptData
 * @param {string} receiptData.email 
 * @param {string} receiptData.buyerName
 * @param {string} receiptData.orderId
 * @param {string} receiptData.orderDate
 * @param {array} receiptData.items 
 * @param {number} receiptData.totalAmount 
 * @param {string} receiptData.deliveryAddress 
 * @param {string} receiptData.paymentMethod 
 * @param {string} receiptData.farmerName 
 * @returns {Promise} - SendGrid response
 */
async function sendPurchaseReceipt(receiptData) {
  const {
    email,
    buyerName,
    orderId,
    orderDate,
    items,
    totalAmount,
    deliveryAddress,
    paymentMethod,
    farmerName,
  } = receiptData;

  // Format order date
  const formattedDate = new Date(orderDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate items HTML
  const itemsHtml = items.map((item, index) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px 8px;">${index + 1}</td>
      <td style="padding: 12px 8px;">${item.productName}</td>
      <td style="padding: 12px 8px; text-align: center;">${item.quantity} ${item.unit || 'units'}</td>
      <td style="padding: 12px 8px; text-align: right;">KSh ${parseFloat(item.pricePerUnit).toFixed(2)}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 600;">KSh ${parseFloat(item.subtotal).toFixed(2)}</td>
    </tr>
  `).join('');

  const msg = {
    to: email,
    from: {
      email: process.env.FROM_EMAIL,
      name: process.env.FROM_NAME || 'KilimoSmart',
    },
    subject: `Your KilimoSmart Order Receipt - Order #${orderId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 650px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #004a2f 0%, #006b44 50%, #228b22 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .header .icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .content {
            padding: 30px;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #004a2f;
          }
          .receipt-header h2 {
            color: #004a2f;
            margin: 0 0 10px 0;
          }
          .order-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .order-info-item {
            margin-bottom: 10px;
          }
          .order-info-label {
            font-weight: 600;
            color: #666;
            font-size: 14px;
            margin-bottom: 4px;
          }
          .order-info-value {
            color: #333;
            font-size: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #eee;
          }
          thead {
            background: linear-gradient(135deg, #004a2f 0%, #006b44 100%);
            color: white;
          }
          th {
            padding: 14px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
          }
          td {
            padding: 12px 8px;
            font-size: 14px;
          }
          .total-row {
            background: #f0f8f0;
            border-top: 2px solid #004a2f;
          }
          .total-row td {
            font-weight: 700;
            font-size: 18px;
            color: #004a2f;
            padding: 16px 8px;
          }
          .success-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 15px;
          }
          .info-box {
            background: #e7f3ff;
            border-left: 4px solid #004a2f;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
          }
          .footer {
            background: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #666;
            font-size: 13px;
            border-top: 1px solid #eee;
          }
          .footer p {
            margin: 8px 0;
          }
          @media (max-width: 600px) {
            .order-info {
              grid-template-columns: 1fr;
            }
            table {
              font-size: 12px;
            }
            th, td {
              padding: 8px 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🧾</div>
            <h1>Purchase Receipt</h1>
            <p style="margin: 0; opacity: 0.9;">Thank you for your order!</p>
          </div>
          
          <div class="content">
            <div class="receipt-header">
              <span class="success-badge">✓ PAYMENT CONFIRMED</span>
              <h2>Order #${orderId}</h2>
              <p style="color: #666; margin: 5px 0;">Date: ${formattedDate}</p>
            </div>

            <div class="order-info">
              <div class="order-info-item">
                <div class="order-info-label">Buyer Name</div>
                <div class="order-info-value">${buyerName}</div>
              </div>
              <div class="order-info-item">
                <div class="order-info-label">Farmer</div>
                <div class="order-info-value">${farmerName}</div>
              </div>
              <div class="order-info-item">
                <div class="order-info-label">Payment Method</div>
                <div class="order-info-value">${paymentMethod}</div>
              </div>
              <div class="order-info-item">
                <div class="order-info-label">Delivery Address</div>
                <div class="order-info-value">${deliveryAddress}</div>
              </div>
            </div>

            <h3 style="color: #004a2f; margin-bottom: 15px;">Order Items</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Product</th>
                  <th style="text-align: center; width: 100px;">Quantity</th>
                  <th style="text-align: right; width: 100px;">Unit Price</th>
                  <th style="text-align: right; width: 100px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right;">TOTAL</td>
                  <td style="text-align: right;">KSh ${parseFloat(totalAmount).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="info-box">
              <p><strong>📦 What's Next?</strong></p>
              <p>• Your order has been confirmed and the farmer has been notified</p>
              <p>• You will receive updates about your order status</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666;">Need help with your order?</p>
              <p style="margin: 10px 0;">
                <a href="mailto:support@kilimosmart.com" style="color: #004a2f; text-decoration: none; font-weight: 600;">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>KilimoSmart</strong> - Connecting Farmers & Buyers</p>
            <p>Email: support@kilimosmart.com | Phone: +254 XXX XXX XXX</p>
            <p style="margin-top: 15px; font-size: 11px; color: #999;">
              This is an automated receipt. Please keep it for your records.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      KilimoSmart - Purchase Receipt
      
      Order #${orderId}
      Date: ${formattedDate}
      Status: PAYMENT CONFIRMED
      
      Buyer: ${buyerName}
      Farmer: ${farmerName}
      Payment Method: ${paymentMethod}
      Delivery Address: ${deliveryAddress}
      
      ORDER ITEMS:
      ${items.map((item, i) => `${i + 1}. ${item.productName} - ${item.quantity} ${item.unit || 'units'} @ KSh ${item.pricePerUnit} = KSh ${item.subtotal}`).join('\n')}
      
      TOTAL: KSh ${totalAmount}
      
      Thank you for your order!
      
      KilimoSmart - Connecting Farmers & Buyers
      support@kilimosmart.com
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log('✅ Purchase receipt sent to:', email);
    return response;
  } catch (error) {
    console.error('❌ Receipt email error:', error);
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw new Error('Failed to send receipt email');
  }
}

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPurchaseReceipt,
};
