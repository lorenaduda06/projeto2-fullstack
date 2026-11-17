import { usersRepository as defaultUsersRepo } from '../repositories/usersRepository.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import { isValidEmail, isValidCpf, isValidUuid } from '../utils/validators.js';
import { AppError } from '../errors/AppError.js';

export class UsersService {
  constructor({ usersRepo = defaultUsersRepo } = {}) {
    this.usersRepo = usersRepo;
  }

  async createUser({ name, email, cpf, password }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('The "name" field is required and cannot be empty', 400);
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      throw new AppError('The "email" field is required and cannot be empty', 400);
    }
    if (!cpf || typeof cpf !== 'string' || !cpf.trim()) {
      throw new AppError('The "cpf" field is required and cannot be empty', 400);
    }
    if (!password || typeof password !== 'string' || !password.trim()) {
      throw new AppError('The "password" field is required and cannot be empty', 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      throw new AppError('Invalid email format', 400);
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    if (!isValidCpf(cleanCpf)) {
      throw new AppError('Invalid CPF format or checksum digits', 400);
    }

    const existingEmail = await this.usersRepo.findAnyByEmail(trimmedEmail);
    if (existingEmail) {
      throw new AppError('Email already registered', 409);
    }

    const existingCpf = await this.usersRepo.findAnyByCpf(cleanCpf);
    if (existingCpf) {
      throw new AppError('CPF already registered', 409);
    }

    const passwordHash = await hashPassword(password);

    return this.usersRepo.create({
      name: name.trim(),
      email: trimmedEmail,
      cpf: cleanCpf,
      passwordHash,
    });
  }

  async listUsers(query = {}) {
    return this.usersRepo.list(query);
  }

  async getUserById(id) {
    if (!isValidUuid(id)) {
      throw new AppError('Invalid user ID', 400);
    }
    const user = await this.usersRepo.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  async updateUser(id, data, authenticatedUser) {
    if (!isValidUuid(id)) {
      throw new AppError('Invalid user ID', 400);
    }

    if (!authenticatedUser || authenticatedUser.id !== id) {
      throw new AppError('Unauthorized access to update another user', 403);
    }

    const existing = await this.usersRepo.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const updates = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new AppError('The "name" field cannot be empty', 400);
      }
      updates.name = data.name.trim();
    }

    if (data.email !== undefined) {
      if (typeof data.email !== 'string' || !data.email.trim()) {
        throw new AppError('The "email" field cannot be empty', 400);
      }
      const trimmedEmail = data.email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        throw new AppError('Invalid email format', 400);
      }
      const conflict = await this.usersRepo.findAnyByEmail(trimmedEmail);
      if (conflict && conflict.id !== id) {
        throw new AppError('Email already in use by another user', 409);
      }
      updates.email = trimmedEmail;
    }

    if (data.cpf !== undefined) {
      if (typeof data.cpf !== 'string' || !data.cpf.trim()) {
        throw new AppError('The "cpf" field cannot be empty', 400);
      }
      const cleanCpf = data.cpf.replace(/\D/g, '');
      if (!isValidCpf(cleanCpf)) {
        throw new AppError('Invalid CPF format or checksum digits', 400);
      }
      const conflict = await this.usersRepo.findAnyByCpf(cleanCpf);
      if (conflict && conflict.id !== id) {
        throw new AppError('CPF already in use by another user', 409);
      }
      updates.cpf = cleanCpf;
    }

    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || !data.password.trim()) {
        throw new AppError('The "password" field cannot be empty', 400);
      }
      updates.passwordHash = await hashPassword(data.password);
    }

    return this.usersRepo.update(id, updates);
  }

  async deleteUser(id, authenticatedUser) {
    if (!isValidUuid(id)) {
      throw new AppError('Invalid user ID', 400);
    }

    if (!authenticatedUser || authenticatedUser.id !== id) {
      throw new AppError('Unauthorized access to delete another user', 403);
    }

    const existing = await this.usersRepo.findById(id);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    const deleted = await this.usersRepo.softDelete(id);
    if (!deleted) {
      throw new AppError('User not found', 404);
    }
  }

  async authenticate(email, password) {
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new AppError('Invalid credentials', 401);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await this.usersRepo.findByEmail(trimmedEmail);

    if (!user || user.deletedAt) {
      throw new AppError('Invalid credentials', 401);
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in environment');
    }

    const expiresIn = Number(process.env.JWT_EXPIRES_IN ?? 3600);
    const token = signToken(
      {
        sub: user.id,
      },
      secret,
      { expiresIn }
    );

    const publicUser = this.usersRepo.toPublic(user);

    return {
      accessToken: token,
      token: token,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: publicUser.id,
        name: publicUser.name,
        email: publicUser.email,
      },
    };
  }
}

export const usersService = new UsersService();
