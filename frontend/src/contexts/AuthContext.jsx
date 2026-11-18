import { createContext, useContext, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem("usuario");
    return salvo ? JSON.parse(salvo) : null;
  });

  async function login(email, senha) {
    const dados = await api.post("/auth/login", { email, password: senha });

    localStorage.setItem('token', dados.accessToken ?? dados.token);
    localStorage.setItem('usuario', JSON.stringify(dados.user ?? dados.usuario));
    
    setToken(dados.accessToken ?? dados.token);
    setUsuario(dados.user ?? dados.usuario);
  }

  async function cadastrar(dadosCadastro) {
    return api.post("/auth/cadastro", dadosCadastro);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, login, cadastrar, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
