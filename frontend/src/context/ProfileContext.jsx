import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const ProfileContext = createContext({ profile: { app_name: "", logo_url: "" }, setProfile: () => {} });

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ app_name: "", logo_url: "" });
  const load = useCallback(() => api.get("/app-profile").then((r) => setProfile(r.data)).catch(() => {}), []);
  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);
  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => useContext(ProfileContext);
