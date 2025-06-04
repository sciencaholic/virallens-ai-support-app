require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDatabase = require('./database');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

const app = express();

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🚀 Starting server in ${process.env.NODE_ENV || 'development'} mode`);

const corsOptions = {
  origin: isDevelopment 
    ? ['http://localhost:3000', 'http://localhost:3001'] 
    : process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: 'Rate limit exceeded', message },
  standardHeaders: true,
  legacyHeaders: false,
  skip: isDevelopment && process.env.SKIP_RATE_LIMIT === 'true' ? () => true : () => false
});

const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in prod
  'Too many requests, please try again later'
);

const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  isDevelopment ? 100 : 5, // 100 attempts in dev, 5 in prod
  'Too many authentication attempts, please try again later'
);

const chatLimiter = createRateLimit(
  1 * 60 * 1000, // 1 minute
  isDevelopment ? 100 : 20, // 100 messages in dev, 20 in prod
  'Too many messages, please slow down'
);

app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

connectDatabase();

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
      aiChat: true,
      staticFiles: isProduction
    }
  });
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/chat')) {
      res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    } else {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  });
} else {
  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Route not found',
      path: req.originalUrl,
      method: req.method,
      note: 'In development mode. Use separate frontend server on port 3000.'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  const message = isProduction ? 'Something went wrong!' : err.message;
  const stack = isProduction ? undefined : err.stack;
  
  res.status(err.status || 500).json({ 
    error: message,
    ...(stack && { stack })
  });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (isProduction) {
    console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`Frontend and backend combined on port ${PORT}`);
  }
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
