import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { validarCpf } from "../services/validacoes";

export default function Cadastro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", cpf: "", senha: "", confirmacao: "" });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const atualizar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function validar() {
    const e = {};

    if (!form.nome.trim()) e.nome = "Informe o nome.";

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "E-mail inválido.";

    if (!cpfValido(form.cpf)) e.cpf = "CPF inválido.";

    if (form.senha.length < 8 || !/[A-Za-z]/.test(form.senha) || !/\d/.test(form.senha)) {
      e.senha = "Mínimo de 8 caracteres, com letras e números.";
    }
      
    if (form.senha !== form.confirmacao) e.confirmacao = "A senha está incorreta.";
    
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();

    setErroGeral('');

    const e = validar();

    setErros(e);

    if (Object.keys(e).length) return;

    setEnviando(true);

    try {
      const resp = await api.post("/auth/cadastro", {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        cpf: form.cpf.replace(/\D/g, ''),
        senha: form.senha,
      });
      navigate("/login");
    } catch (err) {
      if (err.dados?.campos) {
        setErros(err.dados.campos);
      }
      else {
        setErroGeral("Não foi possível concluir o cadastro. Tente novamente.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      {erroGeral && <p role="alert">{erroGeral}</p>}

      <label>Nome
        <input name="nome" value={form.nome} onChange={atualizar} />
      </label>
      {erros.nome && <small>{erros.nome}</small>}

      <label>E-mail
        <input name="email" type="email" value={form.email} onChange={atualizar} />
      </label>
      {erros.email && <small>{erros.email}</small>}

      <label>CPF
        <input name="cpf" value={form.cpf} onChange={atualizar} />
      </label>
      {erros.cpf && <small>{erros.cpf}</small>}

      <label>Senha
        <input name="senha" type="password" value={form.senha} onChange={atualizar} />
      </label>
      {erros.senha && <small>{erros.senha}</small>}

      <label>Confirmar senha
        <input name="confirmacao" type="password" value={form.confirmacao} onChange={atualizar} />
      </label>
      {erros.confirmacao && <small>{erros.confirmacao}</small>}

      <button disabled={enviando}>{enviando ? "Cadastrando..." : "Cadastrar"}</button>
      <p>Já tem conta? <Link to="/login">Entrar</Link></p>
    </form>
  );
}