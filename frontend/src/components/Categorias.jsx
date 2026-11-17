import { useEffect, useState } from "react";
import { api } from "../services/api";

const TIPOS = [
  { valor: "entrada", rotulo: "Entrada", plural: "Entradas" },
  { valor: "saida", rotulo: "Saída", plural: "Saídas" },
];

const FORM_VAZIO = { nome: "", tipo: "saida" };

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;

    api.get("/categorias")
      .then((dados) => ativo && setCategorias(dados))
      .catch((err) => ativo && setErroLista(err.dados?.erro ?? "Não foi possível carregar as categorias."))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, []);

  async function recarregar() {
    try {
      setCategorias(await api.get("/categorias"));
      setErroLista("");
    } catch {
      setErroLista("Não foi possível atualizar a lista. Recarregue a página.");
    }
  }

  const atualizar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function cancelarEdicao() {
    setForm(FORM_VAZIO);
    setEditandoId(null);
    setErros({});
    setErroGeral("");
  }

  function iniciarEdicao(categoria) {
    setForm({ nome: categoria.nome, tipo: categoria.tipo });
    setEditandoId(categoria.id);
    setErros({});
    setErroGeral("");
  }

  function validar() {
    const e = {};
    if (!form.nome.trim()) e.nome = "Informe o nome da categoria.";
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
      const conteudo = { nome: form.nome.trim(), tipo: form.tipo };

      if (editandoId) {
        await api.put(`/categorias/${editandoId}`, conteudo);
      } else {
        await api.post("/categorias", conteudo);
      }

      cancelarEdicao();
      await recarregar();
    } catch (err) {
      if (err.dados?.campos) {
        setErros(err.dados.campos);
      } else {
        setErroGeral(err.dados?.erro ?? "Não foi possível salvar a categoria.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;

    setErroGeral("");
    try {
      await api.delete(`/categorias/${categoria.id}`);
      if (editandoId === categoria.id) cancelarEdicao();
      await recarregar();
    } catch (err) {
      setErroGeral(err.dados?.erro ?? "Não foi possível excluir a categoria.");
    }
  }

  return (
    <main>
      <h1>Categorias</h1>

      {erroGeral && <p role="alert">{erroGeral}</p>}

      <form onSubmit={enviar} noValidate>
        <h2>{editandoId ? "Editar categoria" : "Nova categoria"}</h2>

        <label>Nome
          <input name="nome" value={form.nome} onChange={atualizar} />
        </label>
        {erros.nome && <small>{erros.nome}</small>}

        <label>Tipo
          <select name="tipo" value={form.tipo} onChange={atualizar} disabled={Boolean(editandoId)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>{t.rotulo}</option>
            ))}
          </select>
        </label>
        {erros.tipo && <small>{erros.tipo}</small>}

        <button disabled={enviando}>
          {enviando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar categoria"}
        </button>
        {editandoId && <button type="button" onClick={cancelarEdicao}>Cancelar</button>}
      </form>

      {carregando && <p>Carregando categorias...</p>}
      {erroLista && <p role="alert">{erroLista}</p>}
      {!carregando && !erroLista && categorias.length === 0 && (
        <p>Você ainda não tem categorias. Crie a primeira no formulário acima.</p>
      )}

      {!carregando && categorias.length > 0 &&
        TIPOS.map(({ valor, plural }) => {
          const doTipo = categorias.filter((c) => c.tipo === valor);
          return (
            <section key={valor}>
              <h2>{plural}</h2>
              {doTipo.length === 0 ? (
                <p>Nenhuma categoria de {plural.toLowerCase()}.</p>
              ) : (
                <ul>
                  {doTipo.map((c) => (
                    <li key={c.id}>
                      {c.nome}{" "}
                      <button type="button" onClick={() => iniciarEdicao(c)}>Editar</button>{" "}
                      <button type="button" onClick={() => excluir(c)}>Excluir</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
    </main>
  );
}