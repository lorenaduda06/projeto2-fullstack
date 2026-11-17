import { usersService as defaultUsersService } from '../services/usersService.js';

export class UsersController {
  constructor({ usersService = defaultUsersService } = {}) {
    this.usersService = usersService;
  }

  create = async (req, res, next) => {
    try {
      const name = req.body.name ?? req.body.nome;
      const email = req.body.email;
      const cpf = req.body.cpf;
      const password = req.body.password ?? req.body.senha;

      const user = await this.usersService.createUser({ name, email, cpf, password });
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  };

  list = async (req, res, next) => {
    try {
      const { page, limit, name, email } = req.query;
      const result = await this.usersService.listUsers({ page, limit, name, email });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const user = await this.usersService.getUserById(id);
      return res.status(200).json(user);
    } catch (err) {
      return next(err);
    }
  };

  getProfile = async (req, res, next) => {
    try {
      return res.status(200).json(req.user);
    } catch (err) {
      return next(err);
    }
  };

  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const name = req.body.name ?? req.body.nome;
      const email = req.body.email;
      const cpf = req.body.cpf;
      const password = req.body.password ?? req.body.senha;

      const payload = {};
      if (name !== undefined) payload.name = name;
      if (email !== undefined) payload.email = email;
      if (cpf !== undefined) payload.cpf = cpf;
      if (password !== undefined) payload.password = password;

      const updated = await this.usersService.updateUser(id, payload, req.user);
      return res.status(200).json(updated);
    } catch (err) {
      return next(err);
    }
  };

  delete = async (req, res, next) => {
    try {
      const { id } = req.params;
      await this.usersService.deleteUser(id, req.user);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  };
}

export const usersController = new UsersController();
