# Commerce App Backend

A modern, scalable e-commerce backend built with TypeScript, Express, MongoDB, and Stripe.

## Features

- 🔐 **Authentication & Authorization**: JWT-based authentication
- 💳 **Payment Processing**: Stripe integration with invoice generation
- 📦 **File Storage**: Google Cloud Storage for profile pictures
- 🛡️ **Security**: Helmet, CORS, rate limiting, and input validation
- 📊 **Logging**: Winston logger with different log levels
- 🔄 **Backup System**: Automated database backups to cloud storage
- ⚡ **Performance**: Optimized with proper indexing and caching strategies
- 🧪 **Type Safety**: Full TypeScript support with strict mode

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Stripe Account
- Google Cloud Storage Account (optional for file uploads)

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd commerce-app-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/commerceapp

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRY=7d

# Stripe Configuration
STRIPE_SECRET_KEY=your-stripe-secret-key-here

# Google Cloud Storage Configuration (optional)
GCS_KEY_FILENAME=path-to-your-gcs-keyfile.json
GCS_BUCKET_NAME=your-gcs-bucket-name

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

4. Run the development server
```bash
npm run dev
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/         # MongoDB models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
├── app.ts          # Express app setup
└── index.ts        # Server entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login

### Customer Management
- `GET /api/customers/profile` - Get profile (auth required)
- `PATCH /api/customers/profile` - Update profile (auth required)
- `POST /api/customers/profile-picture` - Upload profile picture (auth required)
- `GET /api/customers/profile-picture` - Get profile picture URL (auth required)
- `DELETE /api/customers/account` - Delete account (auth required)

### Payment Processing
- `POST /api/stripe/create-payment` - Create single payment
- `POST /api/stripe/create-payment-with-items` - Create payment with multiple items
- `GET /api/stripe/invoices` - Get customer invoices
- `GET /api/stripe/invoice/:invoiceId` - Get specific invoice
- `POST /api/stripe/invoice/:invoiceId/send` - Send invoice email
- `GET /api/stripe/payment-methods` - Get saved payment methods
- `DELETE /api/stripe/payment-method/:id` - Delete payment method

### Health Check
- `GET /health` - Server health status

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run clean` - Clean build directory

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate keys regularly
3. **Rate Limiting**: Configured per endpoint
4. **Input Validation**: All inputs are validated
5. **Error Handling**: Errors don't expose sensitive info
6. **HTTPS**: Use HTTPS in production
7. **Database**: Use MongoDB connection with authentication

## Deployment

### Using PM2

1. Install PM2 globally
```bash
npm install -g pm2
```

2. Build the project
```bash
npm run build
```

3. Start with PM2
```bash
pm2 start dist/index.js --name commerce-app
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.
