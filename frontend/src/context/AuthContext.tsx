"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  AuthUser,
  getStoredToken,
  setStoredToken,
  USER_STORAGE_KEY,
} from "@/services/apiClient";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Helper para sincronizar socio en almacenamiento legacy
  const syncLegacySocio = async (u: AuthUser) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        "gimnasio_sesion_usuario",
        JSON.stringify({
          autenticado: true,
          id_usuario: u.id_usuario,
          username_usuario: u.username,
          rol: u.rol,
          id_socio: u.id_socio,
          nombre_completo_socio: u.nombre_completo || u.username,
        })
      );

      if (u.id_socio) {
        const { setStoredSocioActual } = await import(
          "@/components/clases/socioActual"
        );
        setStoredSocioActual({
          id_socio: u.id_socio,
          nombre_completo_socio: u.nombre_completo || u.username,
          correo_socio: "—",
          rut_socio: "—",
        });
      }
    } catch {}
  };

  // 1. Inicialización de sesión desde localStorage y verificación contra /auth/me
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const savedToken = getStoredToken();
      let cachedUser: AuthUser | null = null;

      try {
        const rawUser = localStorage.getItem(USER_STORAGE_KEY);
        if (rawUser) {
          cachedUser = JSON.parse(rawUser) as AuthUser;
          if (isMounted) setUser(cachedUser);
        }
      } catch {}

      if (savedToken) {
        if (isMounted) setToken(savedToken);
        try {
          const res = await apiClient.auth.me();
          if (isMounted && res?.user) {
            setUser(res.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
            syncLegacySocio(res.user);
          }
        } catch {
          // Token expirado o inválido: limpiar sesión de forma limpia
          if (isMounted) {
            setStoredToken(null);
            setUser(null);
            setToken(null);
            try {
              localStorage.removeItem(USER_STORAGE_KEY);
            } catch {}
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Método de inicio de sesión universal (Socio, Instructor, Personal, Admin)
  const login = useCallback(
    async (username: string, password: string): Promise<AuthUser> => {
      setIsLoading(true);
      try {
        const res = await apiClient.auth.login({ username, password });
        const { access_token, user: loggedUser } = res;

        setStoredToken(access_token);
        setToken(access_token);
        setUser(loggedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
        await syncLegacySocio(loggedUser);

        return loggedUser;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 3. Método de cierre de sesión
  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem("gimnasio_sesion_usuario");
      localStorage.removeItem("gimnasiodb_socio_actual_id");
      localStorage.removeItem("gimnasiodb_socio_actual_obj");
    } catch {}
    router.push("/login");
  }, [router]);

  // 4. Refrescar datos de la sesión actual
  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.auth.me();
      if (res?.user) {
        setUser(res.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
        await syncLegacySocio(res.user);
      }
    } catch {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
}

