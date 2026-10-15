import axios from "axios";

export const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("pos_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("pos_token");
      window.dispatchEvent(new Event("pos-logout"));
    }
    return Promise.reject(err);
  }
);

export function errMsg(e) {
  const detail = e?.response?.data?.detail;
  if (detail == null) return e?.message || "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => (d && typeof d.msg === "string" ? d.msg : JSON.stringify(d))).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

const rpFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
export const rp = (v) => rpFmt.format(v || 0);
export const num = (v) => numFmt.format(v || 0);
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-");
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");

export const toDateStr = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const todayStr = () => toDateStr(new Date());
export const daysAgoStr = (n) => toDateStr(new Date(Date.now() - n * 86400000));
export const dayRange = (from, to) => {
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: new Date(`${from}T00:00:00`).toISOString(), end: end.toISOString() };
};
export const dateToIso = (d) => (d ? new Date(`${d}T12:00:00`).toISOString() : null);

export const ROLE_LABEL = { admin: "Admin", kasir: "Kasir", waiter: "Waiter" };
export const PRODUCT_TYPE_LABEL = { both: "Dine In & Takeaway", dine_in: "Dine In saja", takeaway: "Takeaway saja" };
