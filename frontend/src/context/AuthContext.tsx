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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));
  const [user, setUser] = useState<User | null>(() => {
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
