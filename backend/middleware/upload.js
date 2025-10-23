const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

let storage;

if (isCloudinaryConfigured) {
  console.log('✅ Using Cloudinary storage');
  
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      const farmerId = req.user?.farmerId || req.user?.userId || 'unknown';
      
      return {
        folder: 'KilimoSmart/Product_Photos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id: `farmer_${farmerId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        transformation: [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      };
    }
  });
} else {
  console.warn('⚠️ Cloudinary not configured, using memory storage');
  storage = multer.memoryStorage();
}

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10
  }
});

// Export the upload instance directly, with configuration status attached
module.exports = upload;
module.exports.isCloudinaryConfigured = isCloudinaryConfigured;