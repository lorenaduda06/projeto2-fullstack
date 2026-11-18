import { financialExtrasService } from '../services/financialExtrasService.js';
const run = (fn) => async (req, res, next) => { try { return res.json(await fn(req)); } catch (e) { return next(e); } };
export const financialExtrasController = {
  createPlan: async (req, res, next) => { try { return res.status(201).json(await financialExtrasService.createPlan(req.user.id, req.body)); } catch (e) { return next(e); } },
  listPlans: run(req => financialExtrasService.listPlans(req.user.id)),
  getPlan: run(req => financialExtrasService.getPlan(req.user.id, req.params.id)),
  invoices: run(req => financialExtrasService.invoices(req.user.id, req.query)),
  report: run(req => financialExtrasService.report(req.user.id, req.query)),
  dashboard: run(req => financialExtrasService.dashboard(req.user.id)),
};
