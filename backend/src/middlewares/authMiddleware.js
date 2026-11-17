import { verifyToken } from '../utils/jwt.js';
import { usersRepository as defaultUsersRepo } from '../repositories/usersRepository.js';
import { AppError } from '../errors/AppError.js';

export function createAuthMiddleware({ usersRepo = defaultUsersRepo } = {}) {
  return async function authMiddleware(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError('Authentication token not provided', 401);
      }

      const [scheme, token] = authHeader.split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new AppError('Invalid token format. Use "Bearer <token>"', 401);
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured in environment');
      }

      let payload;
      try {
        payload = verifyToken(token, secret);
      } catch (err) {
        throw new AppError(err.message || 'Invalid or expired token', 401);
      }

      const userId = payload.sub;
      if (!userId) {
        throw new AppError('Invalid token: missing user identifier', 401);
      }

      const user = await usersRepo.findById(userId);
      if (!user || user.deletedAt) {
        throw new AppError('User not found or inactive', 401);
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
