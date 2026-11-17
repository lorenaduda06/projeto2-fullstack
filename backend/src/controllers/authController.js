import { usersService as defaultUsersService } from '../services/usersService.js';

export class AuthController {
  constructor({ usersService = defaultUsersService } = {}) {
    this.usersService = usersService;
  }

  login = async (req, res, next) => {
    try {
      const email = req.body.email;
      const password = req.body.password;

      const result = await this.usersService.authenticate(email, password);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  };

  cadastro = async (req, res, next) => {
    try {
      const name = req.body.name;
      const email = req.body.email;
      const cpf = req.body.cpf;
      const password = req.body.password;

      const user = await this.usersService.createUser({ name, email, cpf, password });
      return res.status(201).json(user);
    } catch (err) {
      return next(err);
    }
  };
}

export const authController = new AuthController();
