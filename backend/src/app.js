import express from 'express';
import cors from 'cors';
import { usersRouter } from './routes/usersRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { categoriesRouter } from './routes/categoriesRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { transactionsRouter } from './routes/transactionsRoutes.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cors({ origin: '*' }));

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/categorias', categoriesRouter);
  app.use('/transactions', transactionsRouter);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
