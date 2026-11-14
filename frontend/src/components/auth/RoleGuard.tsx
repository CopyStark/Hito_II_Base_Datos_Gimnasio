"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
        <span className="text-xs text-[#7a7b7b]">Verificando credenciales...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRol = (user.rol || "").toLowerCase();
  const isAllowed =
    allowedRoles.includes("*") ||
    allowedRoles.some((r) => r.toLowerCase() === userRol) ||
    userRol === "administrador";

  if (!isAllowed) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-light text-[#0a0a0a]">Acceso No Autorizado</h2>
        <p className="text-xs text-[#7a7b7b]">
          Tu usuario (<strong>{user.username}</strong>) cuenta con el rol <strong>{user.rol}</strong>, el cual no tiene acceso a este portal.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2 rounded-full bg-[#0a0a0a] text-white text-xs hover:bg-[#ff6105] transition-colors cursor-pointer"
        >
          Iniciar sesión con otra cuenta
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

