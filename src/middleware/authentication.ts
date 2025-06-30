import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Customer, { ICustomer } from '../models/Customer';
import { config } from '../config';
import logger from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      customer?: ICustomer;
      token?: string;
    }
  }
}

interface JwtPayload {
  id: string;
  email: string;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Find customer by decoded ID
    const customer = await Customer.findById(decoded.id).select('-password');

    if (!customer) {
      res.status(401).json({ error: 'Invalid token - user not found' });
      return;
    }

    // Attach customer and token to request
    req.customer = customer;
    req.token = token;
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      logger.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const customer = await Customer.findById(decoded.id).select('-password');
      
      if (customer) {
        req.customer = customer;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.debug('Optional auth failed:', error);
    next();
  }
};
