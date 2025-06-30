import { Router } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { authenticateToken } from '../middleware/authentication';
import { paymentValidation } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create payment with invoice
router.post(
  '/create-payment',
  paymentValidation.createPayment,
  asyncHandler(stripeController.createPayment)
);

// Create payment with multiple items
router.post(
  '/create-payment-with-items',
  paymentValidation.createPaymentWithItems,
  asyncHandler(stripeController.createPaymentWithItems)
);

// Get customer invoices
router.get('/invoices', asyncHandler(stripeController.getCustomerInvoices));

// Get specific invoice
router.get('/invoice/:invoiceId', asyncHandler(stripeController.getInvoice));

// Send invoice email
router.post('/invoice/:invoiceId/send', asyncHandler(stripeController.sendInvoice));

// Get saved payment methods
router.get('/payment-methods', asyncHandler(stripeController.getPaymentMethods));

// Delete payment method
router.delete('/payment-method/:paymentMethodId', asyncHandler(stripeController.deletePaymentMethod));

export default router;
