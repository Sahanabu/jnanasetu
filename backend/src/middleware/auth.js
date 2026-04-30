// Path: backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'jnanasetu-secret-key-change-in-production';

// Verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Support both userId and id (legacy)
    req.userId = decoded.userId || decoded.id;
    req.userRole = decoded.role;
    
    if (!req.userId) {
      throw new Error('Token missing userId');
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Role-based access middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
