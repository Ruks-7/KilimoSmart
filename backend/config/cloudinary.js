const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
const configureCloudinary = () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });

    const config = cloudinary.config();

    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      console.warn('⚠️ Cloudinary credentials missing!');
      console.warn('   Set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
      return false;
    }

    console.log('✅ Cloudinary configured:', config.cloud_name);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary config error:', error.message);
    return false;
  }
};

const isConfigured = configureCloudinary();

module.exports = {
  cloudinary,
  isCloudinaryConfigured: isConfigured
};