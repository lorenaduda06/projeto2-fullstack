import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const blank = { description: "", type: "expense", categoryId: "", sourceDestinationId: "", amount: "", transactionDate: new Date().toISOString().slice(0, 10), dueDate: "", status: "pending" };

function categoryType(category) { return category.type ?? (category.tipo === "entrada" ? "income" : "expense"); }

export default function Movimentacoes() {
  const [items, setItems] = useState([]); const [pagination, setPagination] = useState(null); const [categories, setCategories] = useState([]); const [sources, setSources] = useState([]);
  const [form, setForm] = useState(blank); const [editing, setEditing] = useState(null); const [filters, setFilters] = useState({ type: "", status: "", search: "", page: 1 }); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  const loadReferences = useCallback(async () => {
    const [categoryResponse, sourceResponse] = await Promise.all([api.get("/categories"), api.get("/sources-destinations?limit=100&page=1&orderBy=name&order=asc")]);
    setCategories(Array.isArray(categoryResponse) ? categoryResponse : categoryResponse.data ?? []);
    setSources(Array.isArray(sourceResponse) ? sourceResponse : sourceResponse.data ?? []);
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const query = new URLSearchParams({ limit: "10", sortBy: "transaction_date", sortOrder: "DESC", ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")) }); const response = await api.get(`/transactions?${query}`); setItems(response.data ?? []); setPagination(response.pagination ?? null); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [filters]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadReferences().catch(e => setError(e.message)); }, [loadReferences]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const compatibleCategories = useMemo(() => categories.filter(category => categoryType(category) === form.type), [categories, form.type]);
  function changeForm(event) { const { name, value } = event.target; setForm(current => ({ ...current, [name]: value, ...(name === "type" ? { categoryId: "" } : {}) })); }
  function edit(item) { setEditing(item.id); setForm({ description: item.description ?? "", type: item.type, categoryId: item.categoryId, sourceDestinationId: item.sourceDestinationId, amount: item.amount, transactionDate: item.transactionDate, dueDate: item.dueDate ?? "", status: item.status }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setEditing(null); setForm(blank); }
  async function save(event) { event.preventDefault(); setSaving(true); setError(""); try { const payload = { ...form, amount: Number(form.amount), dueDate: form.dueDate || null }; if (editing) await api.patch(`/transactions/${editing}`, payload); else await api.post("/transactions", payload); cancelEdit(); await load(); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  async function remove(item) { if (!window.confirm(`Excluir a movimentação "${item.description}"?`)) return; try { await api.delete(`/transactions/${item.id}`); await load(); } catch (e) { setError(e.message); } }

  return <main><div className="page-heading"><div><h1>Movimentações</h1><p className="muted">Registre e acompanhe tudo que entra e sai.</p></div></div>{error && <p className="alert" role="alert">{error}</p>}
    <form onSubmit={save}><h2>{editing ? "Editar movimentação" : "Nova movimentação"}</h2><div className="form-grid"><label>Descrição<input name="description" required value={form.description} onChange={changeForm} /></label><label>Tipo<select name="type" value={form.type} onChange={changeForm}><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Categoria<select name="categoryId" required value={form.categoryId} onChange={changeForm}><option value="">Selecione uma categoria</option>{compatibleCategories.map(category => <option key={category.id} value={category.id}>{category.name ?? category.nome}</option>)}</select></label><label>Origem / destino<select name="sourceDestinationId" required value={form.sourceDestinationId} onChange={changeForm}><option value="">Selecione uma conta</option>{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label><label>Valor<input name="amount" required min="0.01" step="0.01" type="number" value={form.amount} onChange={changeForm} /></label><label>Data<input name="transactionDate" required type="date" value={form.transactionDate} onChange={changeForm} /></label><label>Vencimento<input name="dueDate" type="date" value={form.dueDate} onChange={changeForm} /></label><label>Status<select name="status" value={form.status} onChange={changeForm}><option value="pending">Pendente</option><option value="paid">Pago</option><option value="cancelled">Cancelado</option></select></label></div><div className="actions"><button type="submit" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar movimentação"}</button>{editing && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancelar</button>}</div></form>
    <div className="toolbar"><input placeholder="Buscar descrição" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} /><select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, page: 1 })}><option value="">Todos os tipos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select><select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}><option value="">Todos os status</option><option value="pending">Pendente</option><option value="paid">Pago</option><option value="cancelled">Cancelado</option></select></div>
    {loading ? <p className="loading">Carregando movimentações...</p> : items.length === 0 ? <div className="empty">Nenhuma movimentação encontrada.</div> : <div className="table-wrap"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Data</th><th>Status</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.description}</strong><br /><small>{item.category?.name ?? ""}</small></td><td><span className={`badge ${item.type}`}>{item.type === "income" ? "Receita" : "Despesa"}</span></td><td className={item.type === "income" ? "positive" : "negative"}>R$ {item.amount}</td><td>{item.transactionDate}</td><td>{item.status}</td><td className="actions"><button onClick={() => edit(item)}>Editar</button><button onClick={() => remove(item)}>Excluir</button></td></tr>)}</tbody></table></div>}
    {pagination && <div className="toolbar"><button className="btn secondary" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>← Anterior</button><span className="muted">Página {filters.page} de {pagination.totalPages}</span><button className="btn secondary" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Próxima →</button></div>}
  </main>;
}
