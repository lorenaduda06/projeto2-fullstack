import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", senha: "" });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/dashboard" replace />;

  const atualizar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function validar() {
    const e = {};

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Informe um e-mail válido.";

    if (!form.senha) e.senha = "Informe a senha.";

    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();

    setErroGeral("");

    const e = validar();
    
    setErros(e);

    if (Object.keys(e).length) return;

    setEnviando(true);
    try {
      await login(form.email.trim().toLowerCase(), form.senha);

      const destino = location.state?.from?.pathname ?? "/dashboard";

      navigate(destino, { replace: true });
    } 
    catch (err) {
      if (err.status === 401) {
        setErroGeral('E-mail ou senha inválidos.');
      } 
      else if (err.dados?.campos) {
        setErros(err.dados.campos);
      } 
      else {
        setErroGeral('Não foi possível entrar. Tente novamente.');
      }
    } 
    finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <h1>Entrar</h1>

      {location.state?.sessaoExpirada && (
        <p role="status">Sua sessão expirou. Entre novamente.</p>
      )}
      {erroGeral && <p role="alert">{erroGeral}</p>}

      <label>E-mail
        <input name="email" type="email" autoComplete="username" value={form.email} onChange={atualizar} />
      </label>
      {erros.email && <small>{erros.email}</small>}

      <label>Senha
        <input name="senha" type="password" autoComplete="current-password" value={form.senha} onChange={atualizar} />
      </label>
      {erros.senha && <small>{erros.senha}</small>}

      <button disabled={enviando}>{enviando ? "Entrando..." : "Entrar"}</button>
      <p>Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
    </form>
  );
}