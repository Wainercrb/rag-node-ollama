import { config } from '../config/index.js';

// Simple in-memory rate limiter (use Redis in production for distributed systems)
const requests = new Map();

export const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const ipRequests = requests.get(ip).filter(time => now - time < windowMs);
  
  if (ipRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(windowMs / 1000),
      },
    });
  }

  ipRequests.push(now);
  requests.set(ip, ipRequests);
  
  next();
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  
  for (const [ip, times] of requests.entries()) {
    const validTimes = times.filter(time => now - time < windowMs);
    if (validTimes.length === 0) {
      requests.delete(ip);
    } else {
      requests.set(ip, validTimes);
    }
  }
}, 60000);
