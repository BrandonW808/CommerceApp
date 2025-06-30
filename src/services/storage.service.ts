import { Storage } from '@google-cloud/storage';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

let storage: Storage;
let bucket: any;

// Initialize storage only if credentials are configured
if (config.gcs.keyFilename && config.gcs.bucketName) {
  storage = new Storage({ keyFilename: config.gcs.keyFilename });
  bucket = storage.bucket(config.gcs.bucketName);
}

export const storageService = {
  isConfigured(): boolean {
    return !!bucket;
  },

  async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new AppError('Storage service not configured', 500);
    }

    try {
      const fileName = `${path}_${Date.now()}_${file.originalname}`;
      const blob = bucket.file(fileName);
      
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        resumable: false,
      });

      return new Promise((resolve, reject) => {
        blobStream
          .on('error', (error: Error) => {
            logger.error('Storage upload error:', error);
            reject(new AppError('Failed to upload file', 500));
          })
          .on('finish', () => {
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
            resolve(publicUrl);
          })
          .end(file.buffer);
      });
    } catch (error) {
      logger.error('Storage upload error:', error);
      throw new AppError('Failed to upload file', 500);
    }
  },

  async deleteFile(url: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      // Extract file name from URL
      const fileName = url.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
      if (!fileName) return;

      const file = bucket.file(fileName);
      const [exists] = await file.exists();
      
      if (exists) {
        await file.delete();
      }
    } catch (error) {
      logger.error('Storage delete error:', error);
      // Don't throw error on delete failure
    }
  },

  async getSignedUrl(url: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured()) {
      throw new AppError('Storage service not configured', 500);
    }

    try {
      // Extract file name from URL
      const fileName = url.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
      if (!fileName) {
        throw new AppError('Invalid file URL', 400);
      }

      const file = bucket.file(fileName);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new AppError('File not found', 404);
      }

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

      return signedUrl;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Storage signed URL error:', error);
      throw new AppError('Failed to generate signed URL', 500);
    }
  },

  async fileExists(url: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const fileName = url.split(`https://storage.googleapis.com/${bucket.name}/`)[1];
      if (!fileName) return false;

      const file = bucket.file(fileName);
      const [exists] = await file.exists();
      
      return exists;
    } catch (error) {
      logger.error('Storage file exists error:', error);
      return false;
    }
  },
};
