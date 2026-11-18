import { db } from '../db.js';
import { AppError } from '../errors/AppError.js';
import { isValidUuid } from '../utils/validators.js';

const uuid = (id, label) => { if (!isValidUuid(id)) throw new AppError(`Invalid ${label}`, 400); };
const money = (value) => { if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(String(value)) || Number(value) <= 0) throw new AppError('Invalid amount', 400); return Math.round(Number(value) * 100); };
const date = (value) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError('Invalid date', 400); return value; };

function addMonths(value, count) { const d = new Date(`${value}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + count); return d.toISOString().slice(0, 10); }
function mapPlan(row) { return row && { id: row.id, categoryId: row.category_id, sourceDestinationId: row.source_destination_id, creditCardId: row.credit_card_id, description: row.description, totalAmount: row.total_amount, installmentCount: row.installment_count, purchaseDate: row.purchase_date, createdAt: row.created_at }; }

export class FinancialExtrasService {
  constructor(client = db) { this.client = client; }

  async createPlan(userId, data = {}) {
    uuid(data.categoryId, 'category ID'); uuid(data.sourceDestinationId, 'source/destination ID');
    const cents = money(data.totalAmount); const count = Number(data.installmentCount); if (!Number.isInteger(count) || count < 2 || count > 120) throw new AppError('Invalid installment count', 400);
    const purchaseDate = date(data.purchaseDate); if (!data.description || typeof data.description !== 'string') throw new AppError('Description is required', 400);
    if (data.creditCardId) uuid(data.creditCardId, 'credit card ID');
    await this.client.query('BEGIN');
    try {
      const refs = await this.client.query(`SELECT
        (SELECT id FROM categories WHERE id=$1 AND user_id=$4 AND deleted_at IS NULL) category_id,
        (SELECT id FROM sources_destinations WHERE id=$2 AND user_id=$4 AND deleted_at IS NULL) source_id,
        (SELECT id FROM credit_cards WHERE id=$3 AND user_id=$4 AND deleted_at IS NULL) card_id`, [data.categoryId, data.sourceDestinationId, data.creditCardId ?? null, userId]);
      const ref = refs.rows[0]; if (!ref.category_id || !ref.source_id || (data.creditCardId && !ref.card_id)) throw new AppError('Invalid financial relationship', 404);
      const plan = await this.client.query(`INSERT INTO purchase_plans (user_id, category_id, source_destination_id, credit_card_id, description, total_amount, installment_count, purchase_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [userId, data.categoryId, data.sourceDestinationId, data.creditCardId ?? null, data.description.trim(), (cents / 100).toFixed(2), count, purchaseDate]);
      const planRow = plan.rows[0]; const base = Math.floor(cents / count); let remainder = cents - base * count;
      for (let i = 1; i <= count; i += 1) {
        const installmentCents = base + (i === count ? remainder : 0); remainder = 0;
        const dueDate = addMonths(purchaseDate, i - 1);
        const transaction = await this.client.query(`INSERT INTO financial_transactions
          (user_id, category_id, source_destination_id, type, description, amount, transaction_date, due_date, status)
          VALUES ($1,$2,$3,'expense',$4,$5,$6,$7,'pending') RETURNING id`, [userId, data.categoryId, data.sourceDestinationId, `${data.description.trim()} (${i}/${count})`, (installmentCents / 100).toFixed(2), purchaseDate, dueDate]);
        await this.client.query(`INSERT INTO installments (purchase_plan_id, transaction_id, installment_number, amount, due_date)
          VALUES ($1,$2,$3,$4,$5)`, [planRow.id, transaction.rows[0].id, i, (installmentCents / 100).toFixed(2), dueDate]);
      }
      await this.client.query('COMMIT'); return mapPlan(planRow);
    } catch (error) { await this.client.query('ROLLBACK'); throw error; }
  }

  async listPlans(userId) { const result = await this.client.query('SELECT * FROM purchase_plans WHERE user_id=$1 ORDER BY purchase_date DESC', [userId]); return result.rows.map(mapPlan); }
  async getPlan(userId, id) { uuid(id, 'purchase plan ID'); const result = await this.client.query('SELECT * FROM purchase_plans WHERE id=$1 AND user_id=$2', [id, userId]); if (!result.rows[0]) throw new AppError('Purchase plan not found', 404); const installments = await this.client.query('SELECT * FROM installments i JOIN financial_transactions ft ON ft.id=i.transaction_id WHERE i.purchase_plan_id=$1 ORDER BY i.installment_number', [id]); return { ...mapPlan(result.rows[0]), installments: installments.rows.map(i => ({ id: i.id, transactionId: i.transaction_id, number: i.installment_number, amount: i.amount, dueDate: i.due_date, status: i.status })) }; }

  async invoices(userId, query = {}) { const values = [userId]; const conditions = ['i.user_id=$1']; if (query.status) { values.push(query.status); conditions.push(`i.status=$${values.length}`); } if (query.creditCardId) { uuid(query.creditCardId, 'credit card ID'); values.push(query.creditCardId); conditions.push(`i.credit_card_id=$${values.length}`); } const result = await this.client.query(`SELECT i.*, COALESCE(SUM(CASE WHEN ft.status <> 'cancelled' THEN ft.amount ELSE 0 END),0) total_amount FROM invoices i LEFT JOIN financial_transactions ft ON ft.invoice_id=i.id WHERE ${conditions.join(' AND ')} GROUP BY i.id ORDER BY i.due_date`, values); return result.rows; }

  async report(userId, query = {}) { const values = [userId]; const conditions = ['ft.user_id=$1','ft.deleted_at IS NULL','ft.status <> \'cancelled\'']; if (query.startDate) { values.push(query.startDate); conditions.push(`ft.transaction_date >= $${values.length}`); } if (query.endDate) { values.push(query.endDate); conditions.push(`ft.transaction_date <= $${values.length}`); } if (query.categoryId) { values.push(query.categoryId); conditions.push(`ft.category_id = $${values.length}`); } if (query.sourceDestinationId) { values.push(query.sourceDestinationId); conditions.push(`ft.source_destination_id = $${values.length}`); } const where = conditions.join(' AND '); const totals = await this.client.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE type='income'),0) income, COALESCE(SUM(amount) FILTER (WHERE type='expense'),0) expense FROM financial_transactions ft WHERE ${where}`, values); const byCategory = await this.client.query(`SELECT c.name, ft.type, SUM(ft.amount) total FROM financial_transactions ft JOIN categories c ON c.id=ft.category_id WHERE ${where} GROUP BY c.name, ft.type ORDER BY total DESC`, values); return { totals: { income: totals.rows[0].income, expense: totals.rows[0].expense, balance: (Number(totals.rows[0].income) - Number(totals.rows[0].expense)).toFixed(2) }, byCategory: byCategory.rows }; }

  async dashboard(userId) { const result = await this.client.query(`SELECT COALESCE(SUM(amount) FILTER (WHERE type='income' AND status<>'cancelled'),0) income, COALESCE(SUM(amount) FILTER (WHERE type='expense' AND status<>'cancelled'),0) expense, COUNT(*) FILTER (WHERE status='pending') pending FROM financial_transactions WHERE user_id=$1 AND deleted_at IS NULL`, [userId]); return { totals: result.rows[0], balance: (Number(result.rows[0].income) - Number(result.rows[0].expense)).toFixed(2) }; }
}
export const financialExtrasService = new FinancialExtrasService();
