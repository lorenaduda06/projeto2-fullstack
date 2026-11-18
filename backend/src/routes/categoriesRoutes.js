import { Router } from 'express';
import { categoriesController } from '../controllers/categoriesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', categoriesController.list);
router.post('/', categoriesController.create);
router.get('/:id', categoriesController.get);
router.patch('/:id', categoriesController.update);
router.put('/:id', categoriesController.update);
router.delete('/:id', categoriesController.delete);

export { router as categoriesRouter };
