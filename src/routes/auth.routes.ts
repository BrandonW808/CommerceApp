import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { customerValidation } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Register new customer
router.post(
  '/register',
  customerValidation.create,
  asyncHandler(authController.register)
);

// Login
router.post(
  '/login',
  customerValidation.login,
  asyncHandler(authController.login)
);

// TODO: Add password reset, email verification, etc.

export default router;
