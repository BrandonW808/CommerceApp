import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authenticateToken } from '../middleware/authentication';
import { uploadMiddleware } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

const router = Router();

// Rate limiters
const uploadLimiter = rateLimit({
  windowMs: config.rateLimits.upload.windowMs,
  max: config.rateLimits.upload.max,
  message: 'Too many upload requests from this IP, please try again later',
});

// All routes require authentication
router.use(authenticateToken);

// Get current customer profile
router.get('/profile', asyncHandler(customerController.getProfile));

// Update profile
router.patch('/profile', asyncHandler(customerController.updateProfile));

// Upload profile picture
router.post(
  '/profile-picture',
  uploadLimiter,
  uploadMiddleware.single('profilePicture'),
  asyncHandler(customerController.uploadProfilePicture)
);

// Get profile picture URL
router.get('/profile-picture', asyncHandler(customerController.getProfilePicture));

// Delete account
router.delete('/account', asyncHandler(customerController.deleteAccount));

export default router;
