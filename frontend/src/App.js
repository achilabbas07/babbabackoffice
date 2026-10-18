import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { NAV } from "@/lib/nav";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import POS from "@/pages/POS";
import Tables from "@/pages/Tables";
import OpenBills from "@/pages/OpenBills";
import Transactions from "@/pages/Transactions";
import Customers from "@/pages/Customers";
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Purchases from "@/pages/Purchases";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Schema from "@/pages/Schema";
import Cash from "@/pages/Cash";
import Shifts from "@/pages/Shifts";
import Targets from "@/pages/Targets";
import Profile from "@/pages/Profile";
import { ProfileProvider } from "@/context/ProfileContext";

const PAGES = {
  "/pos": POS, "/tables": Tables, "/open-bills": OpenBills, "/transactions": Transactions, "/customers": Customers,
  "/products": Products, "/inventory": Inventory, "/purchases": Purchases, "/expenses": Expenses, "/reports": Reports,
  "/users": Users, "/schema": Schema, "/cash": Cash, "/shifts": Shifts, "/targets": Targets, "/profile": Profile,
};

const Protected = ({ roles, children }) => {
  const { user } = useAuth();
  if (user === null) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/pos" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected><Layout /></Protected>}>
            {NAV.map(({ to, roles }) => {
              const Page = PAGES[to];
              return <Route key={to} path={to} element={<Protected roles={roles}><Page /></Protected>} />;
            })}
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </BrowserRouter>
      </ProfileProvider>
      <Toaster theme="light" position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
