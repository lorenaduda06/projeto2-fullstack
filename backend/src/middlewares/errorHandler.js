import { AppError } from '../errors/AppError.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.code === '23505') {
    let message = 'Record already exists';
    if (err.detail && err.detail.includes('email')) {
      message = 'Email already registered';
    } else if (err.detail && err.detail.includes('cpf')) {
      message = 'CPF already registered';
    }
    return res.status(409).json({ error: message });
  }

  if (err.code === '23514') {
    return res.status(400).json({ error: 'Invalid data provided for record' });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: 'Internal server error',
  });
}
