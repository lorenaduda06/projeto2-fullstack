import { categoriesService } from '../services/categoriesService.js';

export const categoriesController = {
  create: async (req, res, next) =>{
    try {
      const category = await categoriesService.createCategory(
        req.user.id,
        req.body
      );
      return res.status(201).json(category);
    } catch (err) {
      return next(err);
    }
  },

  list: async (req, res, next) => {
    try {
      const categories = await categoriesService.listCategories(
        req.user.id,
        req.query
      );
     return res.status(200).json(categories);
    } catch (err) {
      return next(err);
    }
  },

  update: async (req, res, next) => {
    try {
      const category = await categoriesService.updateCategory(
         req.params.id,
         req.user.id,
         req.body
      );
      
      return res.status(200).json(category);
    } catch (err) {
      return next(err);
    }
  },

  delete: async (req, res, next) => {
    try {
      await categoriesService.deleteCategory(
        req.params.id,
        req.user.id
      );
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
};