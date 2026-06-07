import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // const [token, setToken] = useState(() => localStorage.getItem("meetx_token"));
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("meetx_token");
    if (!stored) return null;
    try {
      const { exp } = JSON.parse(atob(stored.split(".")[1]));
      if (exp * 1000 < Date.now()) {
        localStorage.removeItem("meetx_token");
        localStorage.removeItem("meetx_user");
        return null; // Expired, treat as logged
      }
      return stored; // Valid, keep
    } catch {
      localStorage.removeItem("meetx_token");
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("meetx_user") || "null");
    } catch {
      return null;
    }
  });

  const login = useCallback((tokenStr, userData) => {
    localStorage.setItem("meetx_token", tokenStr);
    localStorage.setItem("meetx_user", JSON.stringify(userData));
    setToken(tokenStr);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("meetx_token");
    localStorage.removeItem("meetx_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
