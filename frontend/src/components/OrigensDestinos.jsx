import { useEffect, useState } from "react";
import { api } from "../services/api";

const types = { checking_account: "Conta corrente", savings_account: "Conta poupança", cash: "Dinheiro", income_source: "Fonte de renda", other: "Outros" };
const empty = { name: "", type: "checking_account", description: "", initialBalance: "0" };
export default function OrigensDestinos() {
  const [items, setItems] = useState([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState(null); const [filter, setFilter] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const r = await api.get(`/sources-destinations?name=${encodeURIComponent(filter)}&page=1&limit=100&orderBy=name&order=asc`); setItems(r.data ?? r); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter]);
  async function save(e) { e.preventDefault(); try { const data = { ...form, initialBalance: Number(form.initialBalance) }; if (editing) await api.patch(`/sources-destinations/${editing}`, data); else await api.post("/sources-destinations", data); setForm(empty); setEditing(null); await load(); } catch (e) { setError(e.message); } }
  async function remove(item) { if (!window.confirm(`Excluir ${item.name}?`)) return; try { await api.delete(`/sources-destinations/${item.id}`); await load(); } catch (e) { setError(e.message); } }
  async function makeDefault(item) { try { await api.patch(`/sources-destinations/${item.id}/default`); await load(); } catch (e) { setError(e.message); } }
  return <main><h1>Origens e destinos</h1>{error && <p role="alert">{error}</p>}<input placeholder="Buscar por nome" value={filter} onChange={e => setFilter(e.target.value)} />
    <form onSubmit={save}><h2>{editing ? "Editar" : "Novo"}</h2><input required placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input placeholder="Descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /><input required min="0" step="0.01" type="number" placeholder="Saldo inicial" value={form.initialBalance} onChange={e => setForm({ ...form, initialBalance: e.target.value })} /><button>Salvar</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }}>Cancelar</button>}</form>
    {loading ? <p>Carregando...</p> : <ul>{items.map(item => <li key={item.id}><strong>{item.name}</strong> — {types[item.type]} — R$ {item.initialBalance} {item.isDefault ? "(padrão)" : ""} <button onClick={() => { setEditing(item.id); setForm({ name: item.name, type: item.type, description: item.description ?? "", initialBalance: item.initialBalance }); }}>Editar</button>{!item.isDefault && <button onClick={() => makeDefault(item)}>Tornar padrão</button>}<button onClick={() => remove(item)}>Excluir</button></li>)}</ul>}</main>;
}
