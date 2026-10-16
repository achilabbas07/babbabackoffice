import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("pos_token")) {
      setUser(false);
    } else {
      api.get("/auth/me").then((r) => setUser(r.data)).catch(() => setUser(false));
    }
    const onLogout = () => setUser(false);
    window.addEventListener("pos-logout", onLogout);
    return () => window.removeEventListener("pos-logout", onLogout);
  }, []);

  const login = async (userId, pin) => {
    const { data } = await api.post("/auth/login", { userId, pin });
    localStorage.setItem("pos_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("pos_token");
    setUser(false);
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
