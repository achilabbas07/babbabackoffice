import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const EMPTY = { app_name: "", logo_url: "", address: "", phone: "", additional_info: "" };
const ProfileContext = createContext({ profile: EMPTY, setProfile: () => {} });

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(EMPTY);
  const load = useCallback(() => api.get("/app-profile").then((r) => setProfile(r.data)).catch(() => {}), []);
  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);
  return <ProfileContext.Provider value={{ profile, setProfile }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => useContext(ProfileContext);
