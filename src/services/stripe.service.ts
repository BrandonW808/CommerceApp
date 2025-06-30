import Stripe from 'stripe';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

interface CreateCustomerData {
  email: string;
  name: string;
  phone?: string;
  address?: string;
}

interface PaymentData {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  description?: string;
  savePaymentMethod: boolean;
}

interface PaymentWithItemsData {
  customerId: string;
  paymentMethodId: string;
  items: Array<{
    amount: number;
    description: string;
    quantity?: number;
  }>;
  currency: string;
  savePaymentMethod: boolean;
}

export const stripeService = {
  async createCustomer(data: CreateCustomerData): Promise<Stripe.Customer> {
    try {
      return await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        address: data.address ? {
          line1: data.address,
        } : undefined,
        metadata: {
          source: 'web_app',
        },
      });
    } catch (error) {
      logger.error('Stripe create customer error:', error);
      throw new AppError('Failed to create Stripe customer', 500);
    }
  },

  async updateCustomer(customerId: string, data: Partial<CreateCustomerData>): Promise<Stripe.Customer> {
    try {
      return await stripe.customers.update(customerId, {
        name: data.name,
        phone: data.phone,
        address: data.address ? {
          line1: data.address,
        } : undefined,
      });
    } catch (error) {
      logger.error('Stripe update customer error:', error);
      throw new AppError('Failed to update Stripe customer', 500);
    }
  },

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await stripe.customers.del(customerId);
    } catch (error) {
      logger.error('Stripe delete customer error:', error);
      // Don't throw error on delete failure
    }
  },

  async createPaymentWithInvoice(data: PaymentData) {
    try {
      // Attach payment method if saving
      if (data.savePaymentMethod) {
        await stripe.paymentMethods.attach(data.paymentMethodId, {
          customer: data.customerId,
        });

        await stripe.customers.update(data.customerId, {
          invoice_settings: {
            default_payment_method: data.paymentMethodId,
          },
        });
      }

      // Create invoice item
      await stripe.invoiceItems.create({
        customer: data.customerId,
        amount: data.amount,
        currency: data.currency,
        description: data.description || 'One-time payment',
      });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: data.customerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: 'any',
            },
          },
          payment_method_types: ['card'],
        },
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Pay invoice
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
        payment_method: data.paymentMethodId,
      });

      // Get payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paidInvoice.payment_intent as string);

      return {
        invoice: paidInvoice,
        paymentIntent,
        invoiceUrl: paidInvoice.hosted_invoice_url,
        invoicePdf: paidInvoice.invoice_pdf,
      };
    } catch (error: any) {
      logger.error('Stripe payment error:', error);
      
      if (error.type === 'StripeCardError') {
        throw new AppError(error.message, 400);
      }
      
      throw new AppError('Payment processing failed', 500);
    }
  },

  async createPaymentWithItems(data: PaymentWithItemsData) {
    try {
      // Attach payment method if saving
      if (data.savePaymentMethod) {
        await stripe.paymentMethods.attach(data.paymentMethodId, {
          customer: data.customerId,
        });

        await stripe.customers.update(data.customerId, {
          invoice_settings: {
            default_payment_method: data.paymentMethodId,
          },
        });
      }

      // Create invoice items
      await Promise.all(
        data.items.map(item =>
          stripe.invoiceItems.create({
            customer: data.customerId,
            amount: item.amount,
            currency: data.currency,
            description: item.description,
            quantity: item.quantity || 1,
          })
        )
      );

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: data.customerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: 'any',
            },
          },
          payment_method_types: ['card'],
        },
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Pay invoice
      const paidInvoice = await stripe.invoices.pay(invoice.id, {
        payment_method: data.paymentMethodId,
      });

      // Get payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paidInvoice.payment_intent as string);

      return {
        invoice: paidInvoice,
        paymentIntent,
        invoiceUrl: paidInvoice.hosted_invoice_url,
        invoicePdf: paidInvoice.invoice_pdf,
      };
    } catch (error: any) {
      logger.error('Stripe payment with items error:', error);
      
      if (error.type === 'StripeCardError') {
        throw new AppError(error.message, 400);
      }
      
      throw new AppError('Payment processing failed', 500);
    }
  },

  async listInvoices({ customerId, limit, startingAfter }: { customerId: string; limit: number; startingAfter?: string }) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        starting_after: startingAfter,
      });

      return {
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          status: invoice.status,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          created: invoice.created,
          hosted_invoice_url: invoice.hosted_invoice_url,
          invoice_pdf: invoice.invoice_pdf,
        })),
        has_more: invoices.has_more,
      };
    } catch (error) {
      logger.error('Stripe list invoices error:', error);
      throw new AppError('Failed to fetch invoices', 500);
    }
  },

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      logger.error('Stripe get invoice error:', error);
      throw new AppError('Invoice not found', 404);
    }
  },

  async sendInvoice(invoiceId: string): Promise<void> {
    try {
      await stripe.invoices.sendInvoice(invoiceId);
    } catch (error) {
      logger.error('Stripe send invoice error:', error);
      throw new AppError('Failed to send invoice', 500);
    }
  },

  async listPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      }));
    } catch (error) {
      logger.error('Stripe list payment methods error:', error);
      throw new AppError('Failed to fetch payment methods', 500);
    }
  },

  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error) {
      logger.error('Stripe get payment method error:', error);
      throw new AppError('Payment method not found', 404);
    }
  },

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      logger.error('Stripe detach payment method error:', error);
      throw new AppError('Failed to delete payment method', 500);
    }
  },
};
