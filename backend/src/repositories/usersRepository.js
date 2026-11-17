import { db } from '../db.js';

export class UsersRepository {
  constructor(client = db) {
    this.client = client;
  }

  toPublic(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      cpf: row.cpf,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  async create({ name, email, cpf, passwordHash }) {
    const query = `
      INSERT INTO users (name, email, cpf, "password_hash")
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, cpf, "created_at", "updated_at", "deleted_at"
    `;
    const values = [name, email, cpf, passwordHash];
    const result = await this.client.query(query, values);
    return this.toPublic(result.rows[0]);
  }

  async findByEmail(email) {
    const query = `
      SELECT id, name, email, cpf, "password_hash", "created_at", "updated_at", "deleted_at"
      FROM users
      WHERE email = $1 AND "deleted_at" IS NULL
      LIMIT 1
    `;
    const result = await this.client.query(query, [email]);
    return result.rows[0] || null;
  }

  async findAnyByEmail(email) {
    const query = `
      SELECT id, name, email, cpf, "password_hash", "created_at", "updated_at", "deleted_at"
      FROM users
      WHERE email = $1
      LIMIT 1
    `;
    const result = await this.client.query(query, [email]);
    return result.rows[0] || null;
  }

  async findAnyByCpf(cpf) {
    const query = `
      SELECT id, name, email, cpf, "password_hash", "created_at", "updated_at", "deleted_at"
      FROM users
      WHERE cpf = $1
      LIMIT 1
    `;
    const result = await this.client.query(query, [cpf]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const query = `
      SELECT id, name, email, cpf, "created_at", "updated_at", "deleted_at"
      FROM users
      WHERE id = $1 AND "deleted_at" IS NULL
      LIMIT 1
    `;
    const result = await this.client.query(query, [id]);
    return this.toPublic(result.rows[0]);
  }

  async findByIdWithPassword(id) {
    const query = `
      SELECT id, name, email, cpf, "password_hash", "created_at", "updated_at", "deleted_at"
      FROM users
      WHERE id = $1 AND "deleted_at" IS NULL
      LIMIT 1
    `;
    const result = await this.client.query(query, [id]);
    return result.rows[0] || null;
  }

  async list({ page = 1, limit = 10, name, email } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const conditions = ['"deleted_at" IS NULL'];
    const values = [];

    if (name && typeof name === 'string' && name.trim()) {
      values.push(`%${name.trim()}%`);
      conditions.push(`name ILIKE $${values.length}`);
    }

    if (email && typeof email === 'string' && email.trim()) {
      values.push(`%${email.trim()}%`);
      conditions.push(`email ILIKE $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
    const countResult = await this.client.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataValues = [...values, safeLimit, offset];
    const dataQuery = `
      SELECT id, name, email, cpf, "created_at", "updated_at", "deleted_at"
      FROM users
      ${whereClause}
      ORDER BY "created_at" DESC
      LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}
    `;

    const dataResult = await this.client.query(dataQuery, dataValues);
    const items = dataResult.rows.map((r) => this.toPublic(r));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async update(id, fields) {
    const setParts = [];
    const values = [];

    if (fields.name !== undefined) {
      values.push(fields.name);
      setParts.push(`name = $${values.length}`);
    }
    if (fields.email !== undefined) {
      values.push(fields.email);
      setParts.push(`email = $${values.length}`);
    }
    if (fields.cpf !== undefined) {
      values.push(fields.cpf);
      setParts.push(`cpf = $${values.length}`);
    }
    if (fields.passwordHash !== undefined) {
      values.push(fields.passwordHash);
      setParts.push(`"password_hash" = $${values.length}`);
    }

    if (setParts.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${setParts.join(', ')}
      WHERE id = $${values.length} AND "deleted_at" IS NULL
      RETURNING id, name, email, cpf, "created_at", "updated_at", "deleted_at"
    `;

    const result = await this.client.query(query, values);
    if (result.rows.length === 0) return null;
    return this.toPublic(result.rows[0]);
  }

  async softDelete(id) {
    const query = `
      UPDATE users
      SET "deleted_at" = NOW()
      WHERE id = $1 AND "deleted_at" IS NULL
      RETURNING id
    `;
    const result = await this.client.query(query, [id]);
    return result.rowCount > 0;
  }
}

export const usersRepository = new UsersRepository();
