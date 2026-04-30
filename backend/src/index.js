// Path: backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const studentsRouter = require('./routes/students');
const eventsRouter = require('./routes/events');
const modulesRouter = require('./routes/modules');
const pipelineRouter = require('./routes/pipeline');
const textractRouter = require('./routes/textract');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const insightsRouter = require('./routes/insights');
const gamificationRouter = require('./routes/gamification');
const messagesRouter = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3001;
// Support both variants, strip whitespace, and handle accidental "KEY=VALUE" pasting
const rawUri = (process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/jnanasetu').trim();
const MONGODB_URI = rawUri.split('=').pop().trim().replace(/\s/g, '');

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for easier integration with AI tools in dev/staging
}));
app.use(compression());
app.use(morgan('dev'));
const corsOrigin = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const allowedOrigin = corsOrigin.replace(/\/$/, '');
    
    if (cleanOrigin === allowedOrigin || allowedOrigin === '*') {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: Origin "${origin}" does not match "${allowedOrigin}"`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/students', studentsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/modules', modulesRouter);
app.use('/api', pipelineRouter);
app.use('/api', textractRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/messages', messagesRouter);

// Serve PDFs from local data directory
app.use('/api/pdf', express.static(path.join(__dirname, '../data/pdfs')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Connect to MongoDB with retry
async function connectWithRetry(maxRetries = 5, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('Connected to MongoDB');
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error.message);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.warn('Could not connect to MongoDB. Running without database.');
}

// Connect to MongoDB
connectWithRetry();

// Start server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`JnanaSetu backend running on port ${PORT}`);
    console.log(`CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  });
}

module.exports = app;
