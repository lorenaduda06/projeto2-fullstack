import { transactionsRepository as defaultRepo } from '../repositories/transactionsRepository.js';
import { db } from '../db.js';
import { AppError } from '../errors/AppError.js';
import { isValidUuid } from '../utils/validators.js';

const TYPES = new Set(['income', 'expense']);
const STATUSES = new Set(['pending', 'paid', 'cancelled']);
const SORT_FIELDS = {
  transaction_date: 'transaction_date',
  amount: 'amount',
  created_at: 'created_at',
};

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function assertUuid(value, label) {
  if (!isValidUuid(value)) {
    throw new AppError(`Invalid ${label}`, 400);
  }
}

export class TransactionsService {
  constructor({ repo = defaultRepo, client = db } = {}) {
    this.repo = repo;
    this.client = client;
  }

  validate(data, partial = false) {
    const required = ['categoryId', 'sourceDestinationId', 'type', 'description', 'amount', 'transactionDate'];
    if (!partial) {
      for (const field of required) {
        if (data[field] === undefined) {
          throw new AppError(`The "${field}" field is required`, 400);
        }
      }
    }

    if (data.categoryId !== undefined) {
      assertUuid(data.categoryId, 'category ID');
    }
    if (data.sourceDestinationId !== undefined) {
      assertUuid(data.sourceDestinationId, 'source/destination ID');
    }
    if (data.type !== undefined && !TYPES.has(data.type)) {
      throw new AppError('Invalid transaction type', 400);
    }
    if (data.status !== undefined && !STATUSES.has(data.status)) {
      throw new AppError('Invalid transaction status', 400);
    }
    if (
      data.description !== undefined &&
      (typeof data.description !== 'string' ||
        !data.description.trim() ||
        data.description.trim().length > 255)
    ) {
      throw new AppError(
        'Description must be a non-empty string with at most 255 characters',
        400,
      );
    }
    if (
      data.amount !== undefined &&
      (!/^(?:\d+)(?:\.\d{1,2})?$/.test(String(data.amount)) ||
        Number(data.amount) <= 0)
    ) {
      throw new AppError(
        'Amount must be greater than zero with at most two decimal places',
        400,
      );
    }
    for (const field of ['transactionDate', 'dueDate']) {
      if (
        data[field] !== undefined &&
        data[field] !== null &&
        !validDate(data[field])
      ) {
        throw new AppError(`Invalid ${field}`, 400);
      }
    }
  }

  async validateReferences(userId, categoryId, sourceDestinationId, type) {
    const result = await this.client.query(
      `SELECT
        (SELECT type FROM categories
          WHERE id = $1 AND user_id = $3 AND deleted_at IS NULL) AS category_type,
        (SELECT id FROM sources_destinations
          WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL) AS source_id`,
      [categoryId, sourceDestinationId, userId],
    );
    const row = result.rows[0];
    // if (!row.category_type) throw new AppError('Category not found', 404);
    // if (!row.source_id) throw new AppError('Source/destination not found', 404);
    // if (row.category_type !== type) throw new AppError('Category is incompatible with transaction type', 409);
  }

  async create(userId, data) {
    this.validate(data);
    await this.validateReferences(userId, data.categoryId, data.sourceDestinationId, data.type);
    const status = data.status ?? 'pending';
    return this.repo.create({
      ...data,
      userId,
      description: data.description.trim(),
      status,
      dueDate: data.dueDate ?? null,
      paidAt: status === 'paid' ? new Date() : null,
    });
  }

  async list(userId, query) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError('Invalid pagination parameters', 400);
    }
    if (
      (query.type && !TYPES.has(query.type)) ||
      (query.status && !STATUSES.has(query.status))
    ) {
      throw new AppError('Invalid filter', 400);
    }
    for (const key of ['categoryId', 'sourceDestinationId']) {
      if (query[key]) assertUuid(query[key], key);
    }
    for (const key of ['startDate', 'endDate']) {
      if (query[key] && !validDate(query[key])) {
        throw new AppError(`Invalid ${key}`, 400);
      }
    }
    const sortBy = SORT_FIELDS[query.sortBy ?? 'transaction_date'];
    if (
      !sortBy ||
      (query.sortOrder &&
        !['ASC', 'DESC'].includes(query.sortOrder.toUpperCase()))
    ) {
      throw new AppError('Invalid sorting parameters', 400);
    }
    const result = await this.repo.list({
      userId,
      page,
      limit,
      filters: query,
      sortBy,
      sortOrder: (query.sortOrder ?? 'DESC').toUpperCase(),
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
    assertUuid(id, 'transaction ID');
    const item = await this.repo.findById(id, userId);
    if (!item) throw new AppError('Transaction not found', 404);
    return item;
  }

  async update(userId, id, data) {
    assertUuid(id, 'transaction ID');
    const allowed = ['categoryId', 'sourceDestinationId', 'type', 'description', 'amount', 'transactionDate', 'dueDate', 'status'];
    if (Object.keys(data).some((key) => !allowed.includes(key))) {
      throw new AppError('Protected or unknown fields cannot be changed', 400);
    }
    if (!Object.keys(data).length) {
      throw new AppError('At least one field is required', 400);
    }
    this.validate(data, true);
    const current = await this.get(userId, id);
    const merged = { ...current, ...data };
    if (
      data.categoryId !== undefined ||
      data.sourceDestinationId !== undefined ||
      data.type !== undefined
    ) {
      await this.validateReferences(
        userId,
        merged.categoryId,
        merged.sourceDestinationId,
        merged.type,
      );
    }
    if (await this.repo.hasProtectedLinks(id, userId)) {
      throw new AppError(
        'Linked transactions cannot be changed through this endpoint',
        409,
      );
    }
    const fields = {};
    for (const key of ['type', 'description', 'amount', 'status']) {
      if (data[key] !== undefined) {
        fields[key] = key === 'description' ? data[key].trim() : data[key];
      }
    }
    if (data.status !== undefined) {
      fields.paid_at = data.status === 'paid' ? current.paidAt ?? new Date() : null;
    }
    if (data.categoryId !== undefined) fields.category_id = data.categoryId;
    if (data.sourceDestinationId !== undefined) fields.source_destination_id = data.sourceDestinationId;
    if (data.transactionDate !== undefined) fields.transaction_date = data.transactionDate;
    if (data.dueDate !== undefined) fields.due_date = data.dueDate;
    return this.repo.update(id, userId, fields);
  }

  async remove(userId, id) {
    assertUuid(id, 'transaction ID');

    if (!(await this.repo.findById(id, userId))) {
      throw new AppError('Transaction not found', 404);
    }
    if (await this.repo.hasProtectedLinks(id, userId)) {
      throw new AppError(
        'Linked transactions cannot be deleted through this endpoint',
        409,
      );
    }
    if (!(await this.repo.softDelete(id, userId))) {
      throw new AppError('Transaction not found', 404);
    }
  }
}

export const transactionsService = new TransactionsService();
