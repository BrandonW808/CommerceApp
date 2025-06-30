import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const stripeController = {
  async createPayment(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer || !customer.stripeCustomerId) {
      throw new AppError('Customer not found or no Stripe ID', 404);
    }

    const { paymentMethodId, amount, currency = 'usd', description, savePaymentMethod } = req.body;

    const result = await stripeService.createPaymentWithInvoice({
      customerId: customer.stripeCustomerId,
      paymentMethodId,
      amount,
      currency,
      description,
      savePaymentMethod: savePaymentMethod === 'true',
    });

    logger.info(`Payment created for customer: ${customer.email}, amount: ${amount} ${currency}`);

    res.json({
      success: true,
      ...result,
    });
  },

  async createPaymentWithItems(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer || !customer.stripeCustomerId) {
      throw new AppError('Customer not found or no Stripe ID', 404);
    }

    const { paymentMethodId, items, currency = 'usd', savePaymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required and must not be empty', 400);
    }

    const result = await stripeService.createPaymentWithItems({
      customerId: customer.stripeCustomerId,
      paymentMethodId,
      items,
      currency,
      savePaymentMethod: savePaymentMethod === 'true',
    });

    logger.info(`Payment with items created for customer: ${customer.email}`);

    res.json({
      success: true,
      ...result,
    });
  },

  async getCustomerInvoices(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer || !customer.stripeCustomerId) {
      throw new AppError('Customer not found or no Stripe ID', 404);
    }

    const { limit = '10', starting_after } = req.query;

    const invoices = await stripeService.listInvoices({
      customerId: customer.stripeCustomerId,
      limit: parseInt(limit as string, 10),
      startingAfter: starting_after as string,
    });

    res.json({
      success: true,
      ...invoices,
    });
  },

  async getInvoice(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { invoiceId } = req.params;

    const invoice = await stripeService.getInvoice(invoiceId);

    // Verify invoice belongs to customer
    if (invoice.customer !== customer.stripeCustomerId) {
      throw new AppError('Invoice not found', 404);
    }

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        created: invoice.created,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
      },
    });
  },

  async sendInvoice(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { invoiceId } = req.params;

    // Verify invoice belongs to customer
    const invoice = await stripeService.getInvoice(invoiceId);
    if (invoice.customer !== customer.stripeCustomerId) {
      throw new AppError('Invoice not found', 404);
    }

    await stripeService.sendInvoice(invoiceId);

    logger.info(`Invoice sent to customer: ${customer.email}, invoice: ${invoiceId}`);

    res.json({
      success: true,
      message: 'Invoice sent successfully',
    });
  },

  async getPaymentMethods(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer || !customer.stripeCustomerId) {
      throw new AppError('Customer not found or no Stripe ID', 404);
    }

    const paymentMethods = await stripeService.listPaymentMethods(customer.stripeCustomerId);

    res.json({
      success: true,
      paymentMethods,
    });
  },

  async deletePaymentMethod(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const { paymentMethodId } = req.params;

    // Verify payment method belongs to customer
    const paymentMethod = await stripeService.getPaymentMethod(paymentMethodId);
    if (paymentMethod.customer !== customer.stripeCustomerId) {
      throw new AppError('Payment method not found', 404);
    }

    await stripeService.detachPaymentMethod(paymentMethodId);

    logger.info(`Payment method deleted for customer: ${customer.email}`);

    res.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  },
};
