"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export default function SociosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const rol = user.rol?.toLowerCase();
    if (rol === "socio") {
      router.replace("/portal-socio/acceso");
    } else if (rol === "instructor") {
      router.replace("/portal-instructor");
    } else {
      // Personal o Administrador
      if (pathname.includes("/torniquete")) {
        router.replace("/portal-personal");
      } else if (pathname.includes("/sedes")) {
        router.replace("/portal-personal/personal");
      } else {
        router.replace("/portal-personal/socios");
      }
    }
  }, [user, isLoading, pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9f8]">
      <div className="flex flex-col items-center gap-3 text-xs text-[#7a7b7b]">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
        <span>Redirigiendo al portal seguro...</span>
      </div>
    </div>
  );
}
