import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/cadastro', authController.cadastro);
authRouter.get('/me', authMiddleware, (req, res) => res.status(200).json(req.user));
