import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { User } from "@workspace/api-client-react";
import { toast } from "sonner";

interface AuthContextType {
  token: string | null;
  user: User | null;
  authChecked: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const localBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_BYPASS_LOGIN === "true";
const localBypassToken = "local-dev-bypass-token";
const localBypassUser: User = {
  id: 1,
  employeeCode: "EMP-001",
  name: "Local Admin",
  email: "admin@company.com",
  mobile: null,
  departmentId: 1,
  departmentName: "Local Development",
  designation: "Administrator",
  role: "admin",
  roleId: 1,
  reportingManagerId: null,
  reportingManagerName: null,
  avatarUrl: null,
  status: "active",
  lastLogin: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localBypassEnabled ? localBypassToken : localStorage.getItem("auth_token"),
  );
  const [user, setUser] = useState<User | null>(() => {
    if (localBypassEnabled) return localBypassUser;
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authChecked, setAuthChecked] = useState(false);
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("auth_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("auth_user");
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function verifySavedToken() {
      if (localBypassEnabled) {
        setToken(localBypassToken);
        setUser(localBypassUser);
        setAuthChecked(true);
        return;
      }

      if (!token) {
        setAuthChecked(true);
        return;
      }

      try {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:6001").replace(/\/+$/, "");
        const response = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Saved session is invalid");
        }

        const currentUser = await response.json();
        if (!cancelled) {
          setUser(currentUser);
          setAuthChecked(true);
        }
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setAuthChecked(true);
          setLocation("/login");
          toast.error("Session expired. Please sign in again.");
        }
      }
    }

    verifySavedToken();

    return () => {
      cancelled = true;
    };
  }, [token, setLocation]);

  const setAuth = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    if (localBypassEnabled) {
      toast.info("Login bypass is enabled for local development");
      setLocation("/dashboard");
      return;
    }

    setToken(null);
    setUser(null);
    toast.success("Signed out successfully");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ token, user, authChecked, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
