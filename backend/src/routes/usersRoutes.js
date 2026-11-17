import { Router } from 'express';
import { usersController } from '../controllers/usersController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

export const usersRouter = Router();

usersRouter.post('/', usersController.create);
usersRouter.get('/me', authMiddleware, usersController.getProfile);
usersRouter.get('/', authMiddleware, usersController.list);
usersRouter.get('/:id', authMiddleware, usersController.getById);
usersRouter.patch('/:id', authMiddleware, usersController.update);
usersRouter.delete('/:id', authMiddleware, usersController.delete);
