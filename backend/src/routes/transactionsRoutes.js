import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { transactionsController } from '../controllers/transactionsController.js';
export const transactionsRouter = Router();

transactionsRouter.use(authMiddleware);
transactionsRouter.post('/', transactionsController.create);
transactionsRouter.get('/', transactionsController.list);
transactionsRouter.get('/:id', transactionsController.get);
transactionsRouter.patch('/:id', transactionsController.update);
transactionsRouter.delete('/:id', transactionsController.remove);
