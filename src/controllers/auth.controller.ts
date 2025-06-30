import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { stripeService } from '../services/stripe.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, address, phone, password } = req.body;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      throw new AppError('Email already registered', 400);
    }

    // Create Stripe customer
    const stripeCustomer = await stripeService.createCustomer({
      email,
      name,
      phone,
      address,
    });

    try {
      // Create customer in database
      const customer = new Customer({
        name,
        email,
        address,
        phone,
        password,
        stripeCustomerId: stripeCustomer.id,
      });

      await customer.save();

      // Generate auth token
      const token = customer.generateAuthToken();

      logger.info(`New customer registered: ${email}`);

      res.status(201).json({
        success: true,
        token,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          stripeCustomerId: customer.stripeCustomerId,
        },
      });
    } catch (error) {
      // Clean up Stripe customer if database save fails
      await stripeService.deleteCustomer(stripeCustomer.id);
      throw error;
    }
  },

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find customer by email
    const customer = await Customer.findOne({ email });
    if (!customer) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isValidPassword = await customer.comparePassword(password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate auth token
    const token = customer.generateAuthToken();

    logger.info(`Customer logged in: ${email}`);

    res.json({
      success: true,
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        stripeCustomerId: customer.stripeCustomerId,
      },
    });
  },
};
