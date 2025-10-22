const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'KilimoSmart/Product_Photos', // Folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1920, height: 1080, crop: 'limit' }, // Limit max size
      { quality: 'auto' } // Auto quality optimization
    ],
    public_id: (req, file) => {
      // Generate unique filename: farmerId_timestamp_random
      const farmerId = req.user?.farmerId || req.user?.userId || 'unknown';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      return `${farmerId}_${timestamp}_${randomStr}`;
    }
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure multer with Cloudinary storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  }
});

module.exports = upload;
