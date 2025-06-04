const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import configurations
const connectDatabase = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();

// Environment configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🚀 Starting server in ${process.env.NODE_ENV || 'development'} mode`);

// CORS configuration
const corsOptions = {
  origin: isDevelopment 
    ? ['http://localhost:3000', 'http://localhost:3001'] 
    : process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: 'Rate limit exceeded', message },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development if desired
  skip: isDevelopment && process.env.SKIP_RATE_LIMIT === 'true' ? () => true : () => false
});

// General rate limiting - more restrictive in production
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in prod
  'Too many requests, please try again later'
);

// Auth rate limiting - prevent brute force attacks
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 100 : 5, // 100 attempts in dev, 5 in prod
  'Too many authentication attempts, please try again later'
);

// Chat rate limiting - prevent spam
const chatLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  isDevelopment ? 100 : 20, // 100 messages in dev, 20 in prod
  'Too many messages, please slow down'
);

// Apply rate limiting
app.use(generalLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// Connect to database
connectDatabase();

// Routes with specific rate limiting
app.use('/auth', authLimiter, authRoutes);
app.use('/chat', chatLimiter, chatRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'AI Customer Support API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      rateLimit: true,
      authentication: true,
      aiChat: true
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Don't leak error details in production
  const message = isProduction ? 'Something went wrong!' : err.message;
  const stack = isProduction ? undefined : err.stack;
  
  res.status(err.status || 500).json({ 
    error: message,
    ...(stack && { stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`🌟 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Rate limiting: ${isDevelopment ? 'Relaxed' : 'Strict'}`);
  console.log(`🌐 CORS origins: ${corsOptions.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
