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
    let message = 'Registro já existente';
    if (err.detail && err.detail.includes('email')) {
      message = 'E-mail já cadastrado';
    } else if (err.detail && err.detail.includes('cpf')) {
      message = 'CPF já cadastrado';
    }
    return res.status(409).json({ error: message });
  }

  if (err.code === '23514') {
    return res.status(400).json({ error: 'Dados inválidos fornecidos para o registro' });
  }

  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: 'Ocorreu um erro interno no servidor',
  });
}
