import { db } from '../db.js';

function toCategory(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.name,
    name: row.name,
    description: row.description,
    type: row.type,
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

  async create({ userId, name, type, description = null }) {
    const query = `
      INSERT INTO categories (user_id, name, type, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, description, type, is_default, created_at, updated_at
    `;

    const result = await this.client.query(query, [userId, name, type, description]);
    return toCategory(result.rows[0]);
  }

  async listByUser(userId, filters = {}) {
    const values = [userId];
    const conditions = ['user_id = $1', 'deleted_at IS NULL'];
    if (filters.name) { values.push(`%${filters.name}%`); conditions.push(`name ILIKE $${values.length}`); }
    if (filters.type) { values.push(filters.type); conditions.push(`type = $${values.length}`); }
    if (filters.isDefault !== undefined) { values.push(filters.isDefault); conditions.push(`is_default = $${values.length}`); }
    const where = conditions.join(' AND ');
    const query = `
      SELECT id, name, description, type, is_default, created_at, updated_at
      FROM categories
      WHERE ${where}
      ORDER BY type, name
    `;

    const result = await this.client.query(query, values);
    return result.rows.map(toCategory);
  }

  async findByIdForUser(id, userId) {
    const query = `
      SELECT id, name, description, type, is_default, created_at, updated_at
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

    if (fields.description !== undefined) {
      values.push(fields.description);
      setParts.push(`description = $${values.length}`);
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
      RETURNING id, name, description, type, is_default, created_at, updated_at
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

  async hasLinks(id, userId) {
    const result = await this.client.query(`SELECT EXISTS (
      SELECT 1 FROM financial_transactions WHERE category_id = $1 AND user_id = $2
    ) AS linked, EXISTS (
      SELECT 1 FROM categories WHERE id = $1 AND user_id = $2 AND is_default = true AND deleted_at IS NULL
    ) AS is_default`, [id, userId]);
    return result.rows[0] && (result.rows[0].linked || result.rows[0].is_default);
  }
}

export const categoriesRepository = new CategoriesRepository();
