import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

export const DEFAULT_APP_NAME = "POS Warkop Babba";
const EMPTY = {
  app_name: "",
  logo_url: "",
  address: "",
  phone: "",
  additional_info: "",
  printerDapur: "",
  printerKasir: "",
  cetakOtomatis: false,
};
const ProfileContext = createContext({ profile: EMPTY, setProfile: () => {} });

export const ProfileProvider = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(EMPTY);
  const load = useCallback(() => api.get("/app-profile").then((r) => setProfile(r.data)).catch(() => {}), []);
  useEffect(() => {
    api.get("/app-profile/branding").then((r) => setProfile((p) => ({ ...p, ...r.data }))).catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);
  const appName = profile.app_name || DEFAULT_APP_NAME;
  useEffect(() => {
    document.title = appName;
  }, [appName]);
  return <ProfileContext.Provider value={{ profile, setProfile, appName }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => useContext(ProfileContext);
