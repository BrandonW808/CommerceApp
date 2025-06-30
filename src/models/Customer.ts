import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface ICustomer extends Document {
  name: string;
  email: string;
  address: string;
  phone: string;
  password: string;
  stripeCustomerId?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  generateAuthToken(): string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    address: { 
      type: String, 
      required: true,
      trim: true
    },
    phone: { 
      type: String, 
      required: true,
      trim: true,
      match: [/^[\d\s\-+()]+$/, 'Please provide a valid phone number']
    },
    password: { 
      type: String,
      required: true,
      minlength: 6
    },
    stripeCustomerId: { 
      type: String, 
      unique: true, 
      sparse: true 
    },
    profilePictureUrl: { 
      type: String 
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better query performance
CustomerSchema.index({ email: 1 }, { unique: true });
CustomerSchema.index({ stripeCustomerId: 1 });
CustomerSchema.index({ createdAt: -1 });

// Hash password before saving
CustomerSchema.pre<ICustomer>('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to generate auth token
CustomerSchema.methods.generateAuthToken = function (): string {
  return jwt.sign(
    { id: this._id, email: this.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );
};

// Instance method to compare passwords
CustomerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
