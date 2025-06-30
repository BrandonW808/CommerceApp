import { Request, Response } from 'express';
import Customer from '../models/Customer';
import { storageService } from '../services/storage.service';
import { stripeService } from '../services/stripe.service';
import { AppError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export const customerController = {
  async getProfile(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    res.json({
      success: true,
      customer,
    });
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const allowedUpdates = ['name', 'address', 'phone'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {} as any);

    // Update in database
    Object.assign(customer, updates);
    await customer.save();

    // Update in Stripe if relevant fields changed
    if (updates.name || updates.phone || updates.address) {
      await stripeService.updateCustomer(customer.stripeCustomerId!, {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      });
    }

    logger.info(`Customer profile updated: ${customer.email}`);

    res.json({
      success: true,
      customer,
    });
  },

  async uploadProfilePicture(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Delete old profile picture if exists
    if (customer.profilePictureUrl) {
      await storageService.deleteFile(customer.profilePictureUrl);
    }

    // Upload new profile picture
    const publicUrl = await storageService.uploadFile(
      req.file,
      `profile-pictures/${customer._id}`
    );

    // Update customer record
    customer.profilePictureUrl = publicUrl;
    await customer.save();

    logger.info(`Profile picture uploaded for customer: ${customer.email}`);

    res.json({
      success: true,
      url: publicUrl,
    });
  },

  async getProfilePicture(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (!customer.profilePictureUrl) {
      throw new AppError('No profile picture found', 404);
    }

    const signedUrl = await storageService.getSignedUrl(customer.profilePictureUrl);

    res.json({
      success: true,
      url: signedUrl,
    });
  },

  async deleteAccount(req: Request, res: Response): Promise<void> {
    const customer = req.customer;
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Delete from Stripe
    if (customer.stripeCustomerId) {
      await stripeService.deleteCustomer(customer.stripeCustomerId);
    }

    // Delete profile picture
    if (customer.profilePictureUrl) {
      await storageService.deleteFile(customer.profilePictureUrl);
    }

    // Delete from database
    await Customer.findByIdAndDelete(customer._id);

    logger.info(`Customer account deleted: ${customer.email}`);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  },
};
