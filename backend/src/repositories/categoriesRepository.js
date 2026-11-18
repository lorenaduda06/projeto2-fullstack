import { db } from '../db.js';

function toCategory(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.name,
    tipo: row.type === 'income' ? 'entrada' : 'saida',
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class CategoriesRepository {
  constructor(client = db) {
    this.client = client;
  }

  async create({ userId, name, type }) {
    const query = `
      INSERT INTO categories (user_id, name, type)
      VALUES ($1, $2, $3)
      RETURNING id, name, type, is_default, created_at, updated_at
    `;

    const result = await this.client.query(query, [userId, name, type]);
    return toCategory(result.rows[0]);
  }

  async listByUser(userId) {
    const query = `
      SELECT id, name, type, is_default, created_at, updated_at
      FROM categories
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY type, name
    `;

    const result = await this.client.query(query, [userId]);
    return result.rows.map(toCategory);
  }

  async findByIdForUser(id, userId) {
    const query = `
      SELECT id, name, type, is_default, created_at, updated_at
      FROM categories
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const result = await this.client.query(query, [id, userId]);
    return toCategory(result.rows[0]);
  }

  async update(id, userId, fields) {
    const setParts = [];
    const values = [];

    if (fields.name !== undefined) {
      values.push(fields.name);
      setParts.push(`name = $${values.length}`);
    }

    if (fields.type !== undefined) {
      values.push(fields.type);
      setParts.push(`type = $${values.length}`);
    }

    if (setParts.length === 0) {
      return this.findByIdForUser(id, userId);
    }

    values.push(id);
    const idPosition = values.length;

    values.push(userId);
    const userIdPosition = values.length;

    const query = `
      UPDATE categories
      SET ${setParts.join(', ')}
      WHERE id = $${idPosition}
        AND user_id = $${userIdPosition}
        AND deleted_at IS NULL
      RETURNING id, name, type, is_default, created_at, updated_at
    `;

    const result = await this.client.query(query, values);
    return toCategory(result.rows[0]);
  }

  async softDelete(id, userId) {
    const query = `
      UPDATE categories
      SET deleted_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.client.query(query, [id, userId]);
    return result.rowCount > 0;
  }
}

export const categoriesRepository = new CategoriesRepository();
