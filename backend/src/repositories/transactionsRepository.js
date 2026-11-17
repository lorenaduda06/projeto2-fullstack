import { db } from '../db.js';

export class TransactionsRepository {
  constructor(client = db) { this.client = client; }

  map(row) {
    if (!row) return null;
    return {
      id: row.id,
      categoryId: row.category_id,
      sourceDestinationId: row.source_destination_id,
      type: row.type,
      description: row.description,
      amount: row.amount,
      transactionDate: row.transaction_date,
      dueDate: row.due_date,
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      category: row.category_id ? { id: row.category_id, name: row.category_name } : undefined,
      sourceDestination: row.source_destination_id
        ? { id: row.source_destination_id, name: row.source_destination_name }
        : undefined,
    };
  }

  select = `
    SELECT ft.*, c.name AS category_name, sd.name AS source_destination_name
    FROM financial_transactions ft
    JOIN categories c ON c.id = ft.category_id
    JOIN sources_destinations sd ON sd.id = ft.source_destination_id
  `;

  async findById(id, userId) {
    const result = await this.client.query(`${this.select}
      WHERE ft.id = $1 AND ft.user_id = $2 AND ft.deleted_at IS NULL`, [id, userId]);
    return this.map(result.rows[0]);
  }

  async create({ userId, categoryId, sourceDestinationId, type, description, amount, transactionDate, dueDate, status, paidAt }) {
    const result = await this.client.query(`
      INSERT INTO financial_transactions
        (user_id, category_id, source_destination_id, type, description, amount, transaction_date, due_date, status, paid_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id`, [userId, categoryId, sourceDestinationId, type, description, amount, transactionDate, dueDate, status, paidAt]);
    return this.findById(result.rows[0].id, userId);
  }

  async list({ userId, page, limit, filters, sortBy, sortOrder }) {
    const conditions = ['ft.user_id = $1', 'ft.deleted_at IS NULL'];
    const values = [userId];
    const add = (sql, value) => { values.push(value); conditions.push(sql.replace('?', `$${values.length}`)); };
    if (filters.type) add('ft.type = ?', filters.type);
    if (filters.categoryId) add('ft.category_id = ?', filters.categoryId);
    if (filters.sourceDestinationId) add('ft.source_destination_id = ?', filters.sourceDestinationId);
    if (filters.status) add('ft.status = ?', filters.status);
    if (filters.startDate) add('ft.transaction_date >= ?', filters.startDate);
    if (filters.endDate) add('ft.transaction_date <= ?', filters.endDate);
    if (filters.search) add('ft.description ILIKE ?', `%${filters.search}%`);
    const where = conditions.join(' AND ');
    const totalResult = await this.client.query(`SELECT COUNT(*) AS total FROM financial_transactions ft WHERE ${where}`, values);
    const total = Number(totalResult.rows[0].total);
    const dataValues = [...values, limit, (page - 1) * limit];
    const result = await this.client.query(`${this.select} WHERE ${where}
      ORDER BY ft.${sortBy} ${sortOrder}, ft.id ${sortOrder} LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`, dataValues);
    return { data: result.rows.map((row) => this.map(row)), total };
  }

  async update(id, userId, fields) {
    const entries = Object.entries(fields);
    const values = entries.map(([, value]) => value);
    const set = entries.map(([key], index) => `${key} = $${index + 1}`);
    values.push(id, userId);
    const result = await this.client.query(`UPDATE financial_transactions SET ${set.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length - 1} AND user_id = $${values.length} AND deleted_at IS NULL
      RETURNING id`, values);
    return result.rowCount ? this.findById(id, userId) : null;
  }

  async hasProtectedLinks(id, userId) {
    const result = await this.client.query(`SELECT ft.invoice_id, ft.purchase_plan_id,
      EXISTS (SELECT 1 FROM installments i WHERE i.transaction_id = ft.id) AS has_installment
      FROM financial_transactions ft WHERE ft.id = $1 AND ft.user_id = $2 AND ft.deleted_at IS NULL`, [id, userId]);
    const row = result.rows[0];
    return !!row && (row.invoice_id !== null || row.purchase_plan_id !== null || row.has_installment);
  }

  async softDelete(id, userId) {
    const result = await this.client.query(`UPDATE financial_transactions SET deleted_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, [id, userId]);
    return result.rowCount > 0;
  }
}

export const transactionsRepository = new TransactionsRepository();
