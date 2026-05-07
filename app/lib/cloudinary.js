// app/lib/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dgbfi39pm",
  api_key: "588678795268887",
  api_secret: "oGelRnHL4rlZRpkQbc3gysx_MH4",
  secure: true, // Use HTTPS
});

// Upload file with error handling
export async function uploadToCloudinary(file, folder = 'assignments') {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds 10MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed');
    }

    // Convert file to base64 for upload
    const fileBuffer = await file.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString('base64');
    const dataUri = `data:${file.type};base64,${fileBase64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `bba/${folder}`,
      resource_type: 'auto',
      allowed_formats: ['pdf'],
      timeout: 60000, // 60 seconds timeout
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      fileName: file.name,
      fileSize: file.size,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Handle specific error types
    if (error.message.includes('File size')) {
      return {
        success: false,
        error: 'FILE_TOO_LARGE',
        message: error.message,
      };
    }
    
    if (error.message.includes('PDF')) {
      return {
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: error.message,
      };
    }
    
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return {
        success: false,
        error: 'UPLOAD_TIMEOUT',
        message: 'Upload timed out. Please try again with a smaller file or check your connection.',
      };
    }
    
    if (error.http_code === 401) {
      return {
        success: false,
        error: 'AUTH_FAILED',
        message: 'Cloudinary authentication failed. Please check your API credentials.',
      };
    }
    
    return {
      success: false,
      error: 'UPLOAD_FAILED',
      message: error.message || 'Failed to upload file to Cloudinary',
    };
  }
}

// Delete file from Cloudinary
export async function deleteFromCloudinary(publicId) {
  try {
    if (!publicId) {
      throw new Error('No public ID provided for deletion');
    }

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } else {
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: result.result || 'Failed to delete file',
      };
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: 'DELETE_FAILED',
      message: error.message || 'Failed to delete file from Cloudinary',
    };
  }
}

// Get file info
export async function getCloudinaryFileInfo(publicId) {
  try {
    if (!publicId) {
      throw new Error('No public ID provided');
    }

    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      data: {
        url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
        createdAt: result.created_at,
        width: result.width,
        height: result.height,
      },
    };
  } catch (error) {
    console.error('Cloudinary get info error:', error);
    return {
      success: false,
      error: 'FETCH_FAILED',
      message: error.message || 'Failed to fetch file information',
    };
  }
}

// Validate Cloudinary configuration
export async function validateCloudinaryConfig() {
  try {
    const config = cloudinary.config();
    
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      return {
        success: false,
        error: 'MISSING_CONFIG',
        message: 'Cloudinary configuration is incomplete. Please check your environment variables.',
      };
    }

    // Test ping to Cloudinary
    const result = await cloudinary.api.ping();
    
    if (result.status === 'ok') {
      return {
        success: true,
        message: 'Cloudinary configuration is valid',
      };
    } else {
      return {
        success: false,
        error: 'CONNECTION_FAILED',
        message: 'Failed to connect to Cloudinary',
      };
    }
  } catch (error) {
    console.error('Cloudinary validation error:', error);
    return {
      success: false,
      error: 'VALIDATION_FAILED',
      message: error.message || 'Cloudinary configuration validation failed',
    };
  }
}

// Upload assignment file with progress tracking
export async function uploadAssignmentWithProgress(file, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await uploadToCloudinary(file, 'assignments');
      
      if (result.success) {
        resolve(result);
      } else {
        reject(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// Bulk upload multiple files
export async function bulkUploadToCloudinary(files, folder = 'assignments') {
  try {
    if (!files || files.length === 0) {
      throw new Error('No files provided for bulk upload');
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await uploadToCloudinary(file, folder);
        if (result.success) {
          results.push(result);
        } else {
          errors.push({ fileName: file.name, error: result });
        }
      } catch (error) {
        errors.push({ fileName: file.name, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      total: files.length,
      successful: results.length,
      failed: errors.length,
    };
  } catch (error) {
    console.error('Bulk upload error:', error);
    return {
      success: false,
      error: 'BULK_UPLOAD_FAILED',
      message: error.message,
      results: [],
      errors: [{ error: error.message }],
      total: 0,
      successful: 0,
      failed: 0,
    };
  }
}

export default cloudinary;