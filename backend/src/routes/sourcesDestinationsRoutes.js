import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { sourcesDestinationsController as controller } from '../controllers/sourcesDestinationsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id/default', controller.setDefault);
router.get('/:id', controller.get);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

export { router as sourcesDestinationsRouter };
