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
      description: data.description ?? null,
    });
  }

  async listCategories(userId, query = {}) {
    const filters = { ...query };
    if (filters.type) filters.type = TIPOS[filters.type] ?? filters.type;
    if (filters.isDefault !== undefined) filters.isDefault = filters.isDefault === 'true' || filters.isDefault === true;
    return this.categoriesRepo.listByUser(userId, filters);
  }

  async getCategory(id, userId) {
    if (!isValidUuid(id)) throw new AppError('ID de categoria inválido', 400);
    const category = await this.categoriesRepo.findByIdForUser(id, userId);
    if (!category) throw new AppError('Categoria não encontrada', 404);
    return category;
  }

  async updateCategory(id, userId, data = {}) {
    if (!isValidUuid(id)) {
      throw new AppError('ID de categoria inválido', 400);
    }

    const current = await this.categoriesRepo.findByIdForUser(id, userId);
    if (!current) {
      throw new AppError('Categoria não encontrada', 404);
    }

    if (Object.keys(data).some((key) => !['name', 'nome', 'description', 'type', 'tipo'].includes(key))) {
      throw new AppError('Campo protegido ou desconhecido', 400);
    }
    if (current.isDefault && (data.name !== undefined || data.nome !== undefined || data.type !== undefined || data.tipo !== undefined)) {
      throw new AppError('Categorias padrão não podem ser alteradas', 409);
    }

    const updates = {};

    if (data.name !== undefined || data.nome !== undefined) {
      updates.name = validarNome(data.name ?? data.nome);
    }

    if (data.description !== undefined) {
      if (data.description !== null && (typeof data.description !== 'string' || data.description.length > 255)) {
        throw new AppError('A descrição deve ter no máximo 255 caracteres', 400);
      }
      updates.description = data.description;
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

    const current = await this.categoriesRepo.findByIdForUser(id, userId);
    if (!current) throw new AppError('Categoria não encontrada', 404);
    if (await this.categoriesRepo.hasLinks(id, userId)) throw new AppError('Categoria possui vínculos e não pode ser excluída', 409);
    const deleted = await this.categoriesRepo.softDelete(id, userId);
    if (!deleted) {
      throw new AppError('Categoria não encontrada', 404);
    }
  }
}

export const categoriesService = new CategoriesService();
