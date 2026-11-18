import { db } from '../db.js';

function map(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    description: row.description,
    initialBalance: row.initial_balance,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const columns = 'id, user_id, name, type, description, initial_balance, is_default, created_at, updated_at';

export class SourcesDestinationsRepository {
  constructor(client = db) { this.client = client; }

  async create({ userId, name, type, description, initialBalance }) {
    const result = await this.client.query(`INSERT INTO sources_destinations
      (user_id, name, type, description, initial_balance)
      VALUES ($1, $2, $3, $4, $5) RETURNING ${columns}`, [userId, name, type, description, initialBalance]);
    return map(result.rows[0]);
  }

  async list({ userId, page, limit, name, type, isDefault, orderBy, order }) {
    const values = [userId];
    const conditions = ['user_id = $1', 'deleted_at IS NULL'];
    const add = (condition, value) => { values.push(value); conditions.push(condition.replace('?', `$${values.length}`)); };
    if (name) add('name ILIKE ?', `%${name}%`);
    if (type) add('type = ?', type);
    if (isDefault !== undefined) add('is_default = ?', isDefault);
    const where = conditions.join(' AND ');
    const count = await this.client.query(`SELECT COUNT(*) AS total FROM sources_destinations WHERE ${where}`, values);
    const total = Number(count.rows[0].total);
    const dataValues = [...values, limit, (page - 1) * limit];
    const result = await this.client.query(`SELECT ${columns} FROM sources_destinations WHERE ${where}
      ORDER BY ${orderBy} ${order}, id ${order} LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`, dataValues);
    return { data: result.rows.map(map), total };
  }

  async findByIdForUser(id, userId) {
    const result = await this.client.query(`SELECT ${columns} FROM sources_destinations
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, userId]);
    return map(result.rows[0]);
  }

  async update(id, userId, fields) {
    const entries = Object.entries(fields);
    if (!entries.length) return this.findByIdForUser(id, userId);
    const values = entries.map(([, value]) => value);
    const set = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(id, userId);
    const result = await this.client.query(`UPDATE sources_destinations SET ${set.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND user_id = $${values.length} AND deleted_at IS NULL
      RETURNING ${columns}`, values);
    return map(result.rows[0]);
  }

  async hasLinks(id, userId) {
    const result = await this.client.query(`SELECT
      EXISTS (SELECT 1 FROM financial_transactions WHERE source_destination_id = $1) AS transactions,
      EXISTS (SELECT 1 FROM credit_cards WHERE source_destination_id = $1 AND user_id = $2 AND deleted_at IS NULL) AS credit_card
      FROM sources_destinations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [id, userId]);
    const row = result.rows[0];
    return row && (row.transactions || row.credit_card);
  }

  async softDelete(id, userId) {
    const result = await this.client.query(`UPDATE sources_destinations SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [id, userId]);
    return result.rowCount > 0;
  }

  async setDefault(id, userId) {
    await this.client.query('BEGIN');
    try {
      const current = await this.findByIdForUser(id, userId);
      if (!current) { await this.client.query('ROLLBACK'); return null; }
      await this.client.query('UPDATE sources_destinations SET is_default = false, updated_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
      const result = await this.client.query(`UPDATE sources_destinations SET is_default = true, updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING ${columns}`, [id, userId]);
      await this.client.query('COMMIT');
      return map(result.rows[0]);
    } catch (error) { await this.client.query('ROLLBACK'); throw error; }
  }
}

export const sourcesDestinationsRepository = new SourcesDestinationsRepository();
