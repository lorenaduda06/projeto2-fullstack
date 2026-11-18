import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./components/Login";
import Cadastro from "./components/Cadastro";
import Categorias from "./components/Categorias";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { api } from "./services/api";

function Protegida({ children }) { const { token } = useAuth(); return token ? children : <Navigate to="/login" replace />; }
function Dashboard() {
  const [dados, setDados] = useState(null); const [erro, setErro] = useState("");
  useEffect(() => { api.get("/dashboard").then(setDados).catch((e) => setErro(e.message)); }, []);
  if (erro) return <main>
    <p role="alert">
      {erro}
    </p>
  </main>;

  if (!dados) return <main>
    <p>Carregando dashboard...</p>
  </main>;
  
  return (
    <main>
      <h1>Dashboard</h1>
      <p>Receitas: {dados.totals.income}</p>
      <p>Despesas: {dados.totals.expense}</p>
      <p>Saldo: {dados.balance}</p>
      <p>Pendentes: {dados.totals.pending}</p>
    </main>
  );
}
function App() { 
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/dashboard" element={<Protegida><Dashboard /></Protegida>} />
          <Route path="/categorias" element={<Protegida><Categorias /></Protegida>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  ); 
}

export default App;
