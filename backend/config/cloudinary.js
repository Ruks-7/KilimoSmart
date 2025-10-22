const cloudinary = require('cloudinary').v2;

console.log('📦 Loading Cloudinary configuration...');

// Configure Cloudinary with proper error handling
const configureCloudinary = () => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Check if credentials are provided
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary credentials missing!');
      console.warn('   Required environment variables:');
      console.warn('   - CLOUDINARY_CLOUD_NAME:', cloudName ? '✅' : '❌');
      console.warn('   - CLOUDINARY_API_KEY:', apiKey ? '✅' : '❌');
      console.warn('   - CLOUDINARY_API_SECRET:', apiSecret ? '✅' : '❌');
      return false;
    }

    // Configure cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });

    const config = cloudinary.config();

    if (config.cloud_name && config.api_key && config.api_secret) {
      console.log('✅ Cloudinary configured successfully!');
      console.log('   Cloud Name:', config.cloud_name);
      return true;
    } else {
      console.warn('⚠️ Cloudinary configuration incomplete');
      return false;
    }
  } catch (error) {
    console.error('❌ Cloudinary configuration error:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
};

const isConfigured = configureCloudinary();

module.exports = {
  cloudinary,
  isCloudinaryConfigured: isConfigured
};