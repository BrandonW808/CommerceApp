import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/commerceapp',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-this',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  
  // Google Cloud Storage
  gcs: {
    keyFilename: process.env.GCS_KEY_FILENAME || '',
    bucketName: process.env.GCS_BUCKET_NAME || '',
  },
  
  // CORS
  corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Rate Limiting
  rateLimits: {
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
    },
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
  },
  
  // Backup
  backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '10', 10),
};

// Validate required configuration
const requiredEnvVars = ['JWT_SECRET', 'STRIPE_SECRET_KEY'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}
