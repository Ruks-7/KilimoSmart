const crypto = require('crypto');

/**
 * Generate a cryptographically secure random OTP
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} - Generated OTP
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
}

/**
 * Verify OTP using timing-safe comparison to prevent timing attacks
 * @param {string} userInput - OTP entered by user
 * @param {string} storedOTP - OTP stored in database
 * @returns {boolean} - True if OTPs match
 */
function verifyOTP(userInput, storedOTP) {
  if (!userInput || !storedOTP) {
    return false;
  }

  const bufferUserInput = Buffer.from(userInput.toString(), 'utf8');
  const bufferStoredOTP = Buffer.from(storedOTP.toString(), 'utf8');
  
  // Check length first
  if (bufferUserInput.length !== bufferStoredOTP.length) {
    return false;
  }
  
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(bufferUserInput, bufferStoredOTP);
  } catch (error) {
    console.error('OTP comparison error:', error);
    return false;
  }
}

/**
 * Calculate OTP expiry time
 * @param {number} minutes - Minutes until expiry (default: 10)
 * @returns {Date} - Expiry timestamp
 */
function calculateExpiryTime(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - Expiry timestamp
 * @returns {boolean} - True if expired
 */
function isOTPExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

module.exports = {
  generateOTP,
  verifyOTP,
  calculateExpiryTime,
  isOTPExpired,
};
