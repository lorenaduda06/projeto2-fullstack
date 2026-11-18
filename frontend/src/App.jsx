import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./components/Login";
import Cadastro from "./components/Cadastro";
import Categorias from "./components/Categorias";
import OrigensDestinos from "./components/OrigensDestinos";
import Movimentacoes from "./components/Movimentacoes";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { api } from "./services/api";

function Protegida({ children }) { const { token } = useAuth(); return token ? children : <Navigate to="/login" replace />; }
function Shell({ children }) {
  const { usuario, logout } = useAuth();
  return <div className="app-shell"><aside className="sidebar"><div className="brand">bruck<span>.</span></div><p className="eyebrow">CONTROLE FINANCEIRO</p><nav><a href="/dashboard">Visão geral</a><a href="/movimentacoes">Movimentações</a><a href="/categorias">Categorias</a><a href="/origens-destinos">Contas e fontes</a></nav><div className="sidebar-user"><span>{usuario?.name?.slice(0, 1)?.toUpperCase() ?? "U"}</span><div><strong>{usuario?.name ?? "Usuário"}</strong><small>{usuario?.email ?? ""}</small></div><button onClick={logout} title="Sair">↪</button></div></aside><div className="main-area"><header className="topbar"><span>Olá, {usuario?.name?.split(" ")[0] ?? "você"} 👋</span><span className="status-dot">● Sincronizado</span></header>{children}</div></div>;
}
function Dashboard() {
  const [dados, setDados] = useState(null); const [erro, setErro] = useState("");
  useEffect(() => { api.get("/dashboard").then(setDados).catch((e) => setErro(e.message)); }, []);
  if (erro) return <main><p className="alert" role="alert">{erro}</p></main>;

  if (!dados) return <main><p className="loading">Carregando sua visão geral...</p></main>;
  return <main><div className="page-heading"><div><h1>Visão geral</h1><p className="muted">Acompanhe a saúde das suas finanças.</p></div><a className="btn" href="/movimentacoes">+ Nova movimentação</a></div><div className="grid"><div className="card metric"><label>Saldo atual</label><strong className="positive">R$ {dados.balance}</strong></div><div className="card metric"><label>Receitas</label><strong>R$ {dados.totals.income}</strong></div><div className="card metric"><label>Despesas</label><strong className="negative">R$ {dados.totals.expense}</strong></div><div className="card metric"><label>Movimentações pendentes</label><strong>{dados.totals.pending}</strong></div></div><div className="panel" style={{ marginTop: 22 }}><h2>Comece pelo essencial</h2><p className="muted">Cadastre suas contas, organize categorias e registre as movimentações para acompanhar seu saldo.</p><div className="toolbar"><a className="btn secondary" href="/origens-destinos">Configurar contas</a><a className="btn secondary" href="/categorias">Organizar categorias</a></div></div></main>;
}
function App() { 
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/dashboard" element={<Protegida><Shell><Dashboard /></Shell></Protegida>} />
          <Route path="/categorias" element={<Protegida><Shell><Categorias /></Shell></Protegida>} />
          <Route path="/origens-destinos" element={<Protegida><Shell><OrigensDestinos /></Shell></Protegida>} />
          <Route path="/movimentacoes" element={<Protegida><Shell><Movimentacoes /></Shell></Protegida>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  ); 
}

export default App;
