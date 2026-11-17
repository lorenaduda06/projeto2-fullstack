import { categoriesRepository } from '../repositories/categoriesRepository.js';
import { AppError } from '../errors/AppError.js';
import { isValidUuid } from '../utils/validators.js';

const TIPOS = {
  entrada: 'income',
  saida: 'expense',
  income: 'income',
  expense: 'expense',
};

function validarNome(name) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new AppError('Informe o nome da categoria', 400);
  }

  if (name.trim().length > 80) {
    throw new AppError('O nome deve ter no máximo 80 caracteres', 400);
  }

  return name.trim();
}

function validarTipo(type) {
  const tipo = TIPOS[type];

  if (!tipo) {
    throw new AppError('O tipo deve ser entrada ou saida', 400);
  }

  return tipo;
}

export class CategoriesService {
  constructor({ categoriesRepo = categoriesRepository } = {}) {
    this.categoriesRepo = categoriesRepo;
  }

  async createCategory(userId, data = {}) {
    const name = validarNome(data.name ?? data.nome);
    const type = validarTipo(data.type ?? data.tipo);

    return this.categoriesRepo.create({
      userId,
      name,
      type,
    });
  }

  async listCategories(userId) {
    return this.categoriesRepo.listByUser(userId);
  }

  async updateCategory(id, userId, data = {}) {
    if (!isValidUuid(id)) {
      throw new AppError('ID de categoria inválido', 400);
    }

    const current = await this.categoriesRepo.findByIdForUser(id, userId);
    if (!current) {
      throw new AppError('Categoria não encontrada', 404);
    }

    const updates = {};

    if (data.name !== undefined || data.nome !== undefined) {
      updates.name = validarNome(data.name ?? data.nome);
    }

    if (data.type !== undefined || data.tipo !== undefined) {
      updates.type = validarTipo(data.type ?? data.tipo);
    }

    return this.categoriesRepo.update(id, userId, updates);
  }

  async deleteCategory(id, userId) {
    if (!isValidUuid(id)) {
      throw new AppError('ID de categoria inválido', 400);
    }

    const deleted = await this.categoriesRepo.softDelete(id, userId);
    if (!deleted) {
      throw new AppError('Categoria não encontrada', 404);
    }
  }
}

export const categoriesService = new CategoriesService();