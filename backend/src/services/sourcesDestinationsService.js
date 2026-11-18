import { sourcesDestinationsRepository as defaultRepo } from '../repositories/sourcesDestinationsRepository.js';
import { AppError } from '../errors/AppError.js';
import { isValidUuid } from '../utils/validators.js';

const TYPES = new Set(['checking_account', 'savings_account', 'cash', 'income_source', 'other']);
const SORTS = { name: 'name', createdAt: 'created_at', initialBalance: 'initial_balance' };
const amount = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.round(value * 100) === value * 100;
  }

  return typeof value === 'string' && /^(?:\d+)(?:\.\d{1,2})?$/.test(value);
};

export class SourcesDestinationsService {
  constructor({ repo = defaultRepo } = {}) {
    this.repo = repo;
  }

  validate(data, partial = false) {
    if (
      !partial &&
      (data.name === undefined ||
        typeof data.name !== 'string' ||
        !data.name.trim())
    ) {
      throw new AppError('Name is required', 400);
    }

    if (
      data.name !== undefined &&
      (typeof data.name !== 'string' ||
        !data.name.trim() ||
        data.name.trim().length > 100)
    ) {
      throw new AppError(
        'Name must be a non-empty string with at most 100 characters',
        400
      );
    }

    if (data.type !== undefined && !TYPES.has(data.type)) {
      throw new AppError('Invalid source/destination type', 400);
    }

    if (
      data.description !== undefined &&
      data.description !== null &&
      (typeof data.description !== 'string' || data.description.length > 255)
    ) {
      throw new AppError(
        'Description must have at most 255 characters',
        400
      );
    }

    if (
      data.initialBalance !== undefined &&
      (!amount(data.initialBalance) || Number(data.initialBalance) < 0)
    ) {
      throw new AppError(
        'Initial balance must be a non-negative number with at most two decimal places',
        400
      );
    }
  }

  assertId(id) {
    if (!isValidUuid(id)) {
      throw new AppError('Invalid source/destination ID', 400);
    }
  }

  async create(userId, data = {}) {
    this.validate(data);
    return this.repo.create({
      userId,
      name: data.name.trim(),
      type: data.type,
      description: data.description ?? null,
      initialBalance: data.initialBalance ?? 0,
    });
  }

  async list(userId, query = {}) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new AppError('Invalid pagination parameters', 400);
    }

    if (query.type && !TYPES.has(query.type)) {
      throw new AppError('Invalid filter', 400);
    }

    if (
      query.isDefault !== undefined &&
      !['true', 'false'].includes(query.isDefault)
    ) {
      throw new AppError('Invalid isDefault filter', 400);
    }

    const orderBy = SORTS[query.orderBy ?? 'createdAt'];
    if (!orderBy) {
      throw new AppError('Invalid sorting parameters', 400);
    }

    const order = (query.order ?? 'desc').toUpperCase();
    if (!['ASC', 'DESC'].includes(order)) {
      throw new AppError('Invalid sorting parameters', 400);
    }

    const result = await this.repo.list({
      userId,
      page,
      limit,
      name: query.name,
      type: query.type,
      isDefault:
        query.isDefault === undefined ? undefined : query.isDefault === 'true',
      orderBy,
      order,
    });

    return {
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    };
  }

  async get(userId, id) {
    this.assertId(id);
    const item = await this.repo.findByIdForUser(id, userId);
    if (!item) {
      throw new AppError('Source/destination not found', 404);
    }
    return item;
  }

  async update(userId, id, data = {}) {
    this.assertId(id);
    const allowed = ['name', 'type', 'description', 'initialBalance'];

    if (Object.keys(data).some((key) => !allowed.includes(key))) {
      throw new AppError('Protected or unknown fields cannot be changed', 400);
    }

    if (!Object.keys(data).length) {
      throw new AppError('At least one field is required', 400);
    }

    this.validate(data, true);
    await this.get(userId, id);

    const fields = {};
    if (data.name !== undefined) fields.name = data.name.trim();
    if (data.type !== undefined) fields.type = data.type;
    if (data.description !== undefined) fields.description = data.description;
    if (data.initialBalance !== undefined) {
      fields.initial_balance = data.initialBalance;
    }

    return this.repo.update(id, userId, fields);
  }

  async remove(userId, id) {
    const item = await this.get(userId, id);
    if (await this.repo.hasLinks(id, userId)) {
      throw new AppError('Source/destination has linked financial records', 409);
    }
    if (item.isDefault) {
      throw new AppError('The default source/destination cannot be deleted', 409);
    }
    if (!(await this.repo.softDelete(id, userId))) {
      throw new AppError('Source/destination not found', 404);
    }
  }

  async setDefault(userId, id) {
    this.assertId(id);
    const item = await this.repo.setDefault(id, userId);
    if (!item) {
      throw new AppError('Source/destination not found', 404);
    }
    return item;
  }
}

export const sourcesDestinationsService = new SourcesDestinationsService();
