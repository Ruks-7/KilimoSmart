const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Use HTTPS URLs
});

// Verify configuration (optional, for debugging)
const verifyCloudinaryConfig = () => {
  const config = cloudinary.config();
  
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    console.warn('⚠️ Cloudinary is not properly configured. Please set environment variables:');
    console.warn('   - CLOUDINARY_CLOUD_NAME');
    console.warn('   - CLOUDINARY_API_KEY');
    console.warn('   - CLOUDINARY_API_SECRET');
    return false;
  }
  
  console.log('✅ Cloudinary configured successfully:', config.cloud_name);
  return true;
};

// Verify on startup
verifyCloudinaryConfig();

module.exports = cloudinary;
