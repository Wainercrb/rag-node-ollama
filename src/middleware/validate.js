import { ValidationError } from '../utils/errors.js';

export const validateAskHR = (req, res, next) => {
  const { question } = req.body;

  if (!question) {
    return next(new ValidationError('Question is required'));
  }

  if (typeof question !== 'string') {
    return next(new ValidationError('Question must be a string'));
  }

  const trimmedQuestion = question.trim();
  
  if (trimmedQuestion.length === 0) {
    return next(new ValidationError('Question cannot be empty'));
  }

  if (trimmedQuestion.length > 1000) {
    return next(new ValidationError('Question must be less than 1000 characters'));
  }

  // Sanitize and attach to request
  req.validatedBody = {
    question: trimmedQuestion,
  };

  next();
};
