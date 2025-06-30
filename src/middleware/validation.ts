import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = req.body[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // Skip validation if field is not required and not provided
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${rule.field} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              errors.push(`${rule.field} must be a number`);
            }
            break;
          case 'email':
            const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(value)) {
              errors.push(`${rule.field} must be a valid email`);
            }
            break;
          case 'phone':
            const phoneRegex = /^[\d\s\-+()]+$/;
            if (!phoneRegex.test(value)) {
              errors.push(`${rule.field} must be a valid phone number`);
            }
            break;
          case 'array':
            if (!Array.isArray(value)) {
              errors.push(`${rule.field} must be an array`);
            }
            break;
          case 'object':
            if (typeof value !== 'object' || Array.isArray(value)) {
              errors.push(`${rule.field} must be an object`);
            }
            break;
        }
      }

      // String length validation
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
        }
      }

      // Number range validation
      if (typeof value === 'number' || !isNaN(Number(value))) {
        const numValue = Number(value);
        if (rule.min !== undefined && numValue < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && numValue > rule.max) {
          errors.push(`${rule.field} must not exceed ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} has invalid format`);
      }

      // Custom validation
      if (rule.custom) {
        const result = rule.custom(value);
        if (typeof result === 'string') {
          errors.push(result);
        } else if (!result) {
          errors.push(`${rule.field} validation failed`);
        }
      }
    }

    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    next();
  };
};

// Pre-defined validation schemas
export const customerValidation = {
  create: validate([
    { field: 'name', required: true, type: 'string', minLength: 2, maxLength: 100 },
    { field: 'email', required: true, type: 'email' },
    { field: 'address', required: true, type: 'string' },
    { field: 'phone', required: true, type: 'phone' },
    { field: 'password', required: true, type: 'string', minLength: 6 },
  ]),
  
  login: validate([
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string' },
  ]),
};

export const paymentValidation = {
  createPayment: validate([
    { field: 'paymentMethodId', required: true, type: 'string' },
    { field: 'amount', required: true, type: 'number', min: 1 },
    { field: 'currency', required: false, type: 'string', minLength: 3, maxLength: 3 },
    { field: 'description', required: false, type: 'string', maxLength: 500 },
    { field: 'savePaymentMethod', required: false, type: 'string' },
  ]),
  
  createPaymentWithItems: validate([
    { field: 'paymentMethodId', required: true, type: 'string' },
    { field: 'items', required: true, type: 'array' },
    { field: 'currency', required: false, type: 'string', minLength: 3, maxLength: 3 },
    { field: 'savePaymentMethod', required: false, type: 'string' },
  ]),
};
