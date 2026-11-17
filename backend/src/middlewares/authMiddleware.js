import { verifyToken } from '../utils/jwt.js';
import { usersRepository as defaultUsersRepo } from '../repositories/usersRepository.js';
import { AppError } from '../errors/AppError.js';

export function createAuthMiddleware({ usersRepo = defaultUsersRepo } = {}) {
  return async function authMiddleware(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('Token de autenticação não informado', 401);
      }

      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new AppError('Formato do token inválido. Utilize "Bearer <token>"', 401);
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured in environment');
      }

      let payload;
      try {
        payload = verifyToken(token, secret);
      } catch (err) {
        throw new AppError(err.message || 'Token inválido ou expirado', 401);
      }

      const userId = payload.sub;
      if (!userId) {
        throw new AppError('Token inválido: identificador do usuário ausente', 401);
      }

      const user = await usersRepo.findById(userId);
      if (!user || user.deletedAt) {
        throw new AppError('Usuário não encontrado ou inativo', 401);
      }

      req.user = user;
      req.tokenPayload = payload;

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const authMiddleware = createAuthMiddleware();
