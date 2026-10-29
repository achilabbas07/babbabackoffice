import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("pos_token");
    if (!token) {
      setUser(false);
      return undefined;
    }

    api.get("/auth/me")
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch((error) => {
        if (active) setUser(false);
        console.error("Failed to restore POS session", error);
      });

    const onLogout = () => setUser(false);
    window.addEventListener("pos-logout", onLogout);
    return () => {
      active = false;
      window.removeEventListener("pos-logout", onLogout);
    };
  }, []);

  const login = async (name, pin) => {
    const { data } = await api.post("/login", { name, pin });
    if (!data.token || !data.user?.id || !data.user?.role || !data.user?.name) {
      throw new Error("Respons login tidak valid.");
    }
    localStorage.setItem("pos_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("pos_token");
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
