import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Custom storage engine for cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Helper function to upload buffer to cloudinary
const uploadToCloudinary = (buffer, folder = 'community-images') => {
  return new Promise((resolve, reject) => {
    if (!buffer || buffer.length === 0) {
      reject(new Error('Invalid or empty buffer provided'));
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 500, height: 500, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          console.log('Cloudinary upload successful:', result.secure_url);
          resolve(result);
        }
      }
    );

    // Handle stream errors
    uploadStream.on('error', (error) => {
      console.error('Upload stream error:', error);
      reject(new Error(`Upload stream error: ${error.message}`));
    });

    try {
      uploadStream.end(buffer);
    } catch (error) {
      console.error('Error ending upload stream:', error);
      reject(new Error(`Stream error: ${error.message}`));
    }
  });
};

export { cloudinary, upload, uploadToCloudinary };