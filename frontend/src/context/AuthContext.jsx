import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { supabase, supabaseConfigError } from "@/supabaseClient";

const AuthCtx = createContext(null);
const SUPABASE_ROLE_TO_POS_ROLE = {
  owner: "admin",
  kasir: "kasir",
  pelayan: "waiter",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [supabaseSession, setSupabaseSession] = useState(null);
  const [supabaseReady, setSupabaseReady] = useState(false);

  const clearPosSession = () => {
    localStorage.removeItem("pos_token");
    setUser(false);
  };

  useEffect(() => {
    if (!supabase) {
      clearPosSession();
      setSupabaseReady(true);
      return undefined;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSupabaseSession(session);
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) clearPosSession();
    });
    const onLogout = () => clearPosSession();
    window.addEventListener("pos-logout", onLogout);
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) {
        clearPosSession();
        console.error("Failed to restore Supabase session", error);
      } else {
        const session = data.session;
        setSupabaseSession(session);
        if (session && localStorage.getItem("pos_token")) {
          try {
            const response = await api.get("/auth/me");
            const expectedRole = SUPABASE_ROLE_TO_POS_ROLE[
              session.user?.app_metadata?.pos_role
            ];
            if (active && response.data?.role === expectedRole) {
              setUser(response.data);
            } else if (active) {
              clearPosSession();
            }
          } catch (sessionError) {
            if (active) clearPosSession();
            console.error("Failed to restore POS session", sessionError);
          }
        } else {
          clearPosSession();
        }
      }
      if (active) setSupabaseReady(true);
    }).catch((error) => {
      if (!active) return;
      clearPosSession();
      setSupabaseReady(true);
      console.error("Failed to initialize Supabase session", error);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("pos-logout", onLogout);
    };
  }, []);

  const signInSupabase = async (email, password) => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const role = data.user?.app_metadata?.pos_role;
    if (!SUPABASE_ROLE_TO_POS_ROLE[role]) {
      await supabase.auth.signOut();
      throw new Error("Akun Supabase belum memiliki app_metadata.pos_role yang valid.");
    }

    setSupabaseSession(data.session);
    return data.session;
  };

  const login = async (userId, pin) => {
    if (!supabaseSession) throw new Error("Masuk dengan akun Supabase terlebih dahulu.");
    const expectedRole = SUPABASE_ROLE_TO_POS_ROLE[supabaseSession.user?.app_metadata?.pos_role];
    if (!expectedRole) throw new Error("Role akun Supabase tidak valid.");

    const { data } = await api.post("/auth/login", { userId, pin });
    if (data.user?.role !== expectedRole) {
      localStorage.removeItem("pos_token");
      throw new Error("Role user POS tidak sesuai dengan role akun Supabase.");
    }
    localStorage.setItem("pos_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    clearPosSession();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setSupabaseSession(null);
  };

  const supabaseRole = SUPABASE_ROLE_TO_POS_ROLE[supabaseSession?.user?.app_metadata?.pos_role] || null;

  return (
    <AuthCtx.Provider value={{
      user,
      login,
      logout,
      signInSupabase,
      supabaseSession,
      supabaseRole,
      supabaseReady,
      supabaseConfigError,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
