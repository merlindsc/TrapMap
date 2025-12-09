// ============================================
// FILE UPLOADER
// Handles file uploads to Supabase Storage
// ============================================

const { supabase } = require('../config/supabase');
const multer = require('multer');
const config = require('../config/env');

/**
 * Multer configuration for memory storage
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs only
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
    }
  }
});

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {string} bucket 
 * @param {string} folder 
 * @returns {Promise<string>} Public URL
 */
const uploadToStorage = async (fileBuffer, fileName, bucket = 'trapmap-files', folder = 'layouts') => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${folder}/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFileName, fileBuffer, {
        contentType: 'auto',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(uniqueFileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload to storage error:', error);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} fileUrl 
 * @param {string} bucket 
 */
const deleteFromStorage = async (fileUrl, bucket = 'trapmap-files') => {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split('/');
    const filePath = urlParts.slice(urlParts.indexOf(bucket) + 1).join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error('Failed to delete file');
    }

    return true;
  } catch (error) {
    console.error('Delete from storage error:', error);
    throw error;
  }
};

/**
 * Get signed URL for private files
 * @param {string} filePath 
 * @param {string} bucket 
 * @param {number} expiresIn seconds
 */
const getSignedUrl = async (filePath, bucket = 'trapmap-files', expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadToStorage,
  deleteFromStorage,
  getSignedUrl
};