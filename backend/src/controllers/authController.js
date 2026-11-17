import { usersService as defaultUsersService } from '../services/usersService.js';

export class AuthController {
  constructor({ usersService = defaultUsersService } = {}) {
    this.usersService = usersService;
  }

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const result = await this.usersService.authenticate(email, password);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  };

  register = async (req, res, next) => {
    try {
      const { name, email, cpf, password } = req.body;
      const user = await this.usersService.createUser({ name, email, cpf, password });
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  };
}

export const authController = new AuthController();
