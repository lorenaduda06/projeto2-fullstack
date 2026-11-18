import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { financialExtrasController as c } from '../controllers/financialExtrasController.js';
const router = Router(); router.use(authMiddleware);
router.post('/purchase-plans', c.createPlan); router.get('/purchase-plans', c.listPlans); router.get('/purchase-plans/:id', c.getPlan);
router.get('/invoices', c.invoices); router.get('/reports', c.report); router.get('/dashboard', c.dashboard);
export { router as financialExtrasRouter };
