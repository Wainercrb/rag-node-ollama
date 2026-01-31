import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  logger.error(err.message, {
    code,
    statusCode,
    stack: config.isProd() ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: config.isProd() && statusCode === 500 
        ? 'Internal server error' 
        : err.message,
    },
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
