import { transactionsService as defaultService } from '../services/transactionsService.js';

export class TransactionsController {
  constructor({ service = defaultService } = {}) {
    this.service = service;
  }

  create = async (req, res, next) => {
    try {
      const transaction = await this.service.create(req.user.id, req.body);
      return res.status(201).json(transaction);
    } catch (error) {
      return next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const transactions = await this.service.list(req.user.id, req.query);
      return res.status(200).json(transactions);
    } catch (error) {
      return next(error);
    }
  };

  get = async (req, res, next) => {
    try {
      const transaction = await this.service.get(req.user.id, req.params.id);
      return res.status(200).json(transaction);
    } catch (error) {
      return next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const transaction = await this.service.update(req.user.id, req.params.id, req.body);
      return res.status(200).json(transaction);
    } catch (error) {
      return next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      await this.service.remove(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
export const transactionsController = new TransactionsController();
