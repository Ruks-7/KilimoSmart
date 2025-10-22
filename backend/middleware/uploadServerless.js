// Directly uploads to Cloudinary without temporary file storage
const cloudinary = require('cloudinary').v2;
const { isCloudinaryConfigured } = require('../config/cloudinary');


// Express middleware to handle file uploads directly to Cloudinary
const uploadFilesServerless = async (req, res, next) => {
  try {
    // Check if Cloudinary is properly configured
    if (!isCloudinaryConfigured) {
      return res.status(500).json({
        error: 'Cloudinary not configured',
        message: 'Missing Cloudinary environment variables'
      });
    }

    // Files should already be parsed by express.json() middleware
    if (!req.files || req.files.length === 0) {
      req.uploadedUrls = [];
      return next();
    }

    // Upload each file directly to Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `kilimosmart/products/${req.user?.farmerId || 'unknown'}`,
            resource_type: 'auto',
            public_id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timeout: 60000
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(file.buffer);
      });
    });

    const uploadResults = await Promise.all(uploadPromises);

    // Store URLs in request for route handler to use
    req.uploadedUrls = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      size: result.bytes
    }));

    next();
  } catch (error) {
    console.error('Serverless upload error:', error);
    res.status(500).json({
      error: 'File upload failed',
      message: error.message
    });
  }
};

module.exports = {
  uploadFilesServerless,
  isCloudinaryConfigured
};
