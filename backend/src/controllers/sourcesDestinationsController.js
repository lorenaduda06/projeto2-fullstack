import { sourcesDestinationsService } from '../services/sourcesDestinationsService.js';

export const sourcesDestinationsController = {
  create: async (req, res, next) => {
    try {
      return res
        .status(201)
        .json(await sourcesDestinationsService.create(req.user.id, req.body));
    } catch (e) {
      return next(e);
    }
  },
  list: async (req, res, next) => {
    try {
      return res.json(
        await sourcesDestinationsService.list(req.user.id, req.query)
      );
    } catch (e) {
      return next(e);
    }
  },
  get: async (req, res, next) => {
    try {
      return res.json(
        await sourcesDestinationsService.get(req.user.id, req.params.id)
      );
    } catch (e) {
      return next(e);
    }
  },
  update: async (req, res, next) => {
    try {
      return res.json(
        await sourcesDestinationsService.update(
          req.user.id,
          req.params.id,
          req.body
        )
      );
    } catch (e) {
      return next(e);
    }
  },
  remove: async (req, res, next) => {
    try {
      await sourcesDestinationsService.remove(req.user.id, req.params.id);
      return res.status(204).send();
    } catch (e) {
      return next(e);
    }
  },
  setDefault: async (req, res, next) => {
    try {
      return res.json(
        await sourcesDestinationsService.setDefault(req.user.id, req.params.id)
      );
    } catch (e) {
      return next(e);
    }
  },
};
