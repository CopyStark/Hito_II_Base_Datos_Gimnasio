"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Dumbbell,
  UserCheck,
  Calendar,
  Wrench,
  BarChart3,
  ArrowLeft,
  Loader2,
} from "lucide-react";

export default function ClasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const rol = user.rol?.toLowerCase();
    if (rol === "socio") {
      router.replace("/portal-socio");
    } else if (rol === "instructor") {
      router.replace("/portal-instructor");
    } else {
      // Personal o Administrador
      if (pathname.includes("/equipos")) {
        router.replace("/portal-personal/inventario");
      } else if (pathname.includes("/reportes")) {
        router.replace("/portal-personal/reportes");
      } else {
        router.replace("/portal-personal/programador");
      }
    }
  }, [user, isLoading, pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9f8]">
      <div className="flex flex-col items-center gap-3 text-xs text-[#7a7b7b]">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff6105]" />
        <span>Redirigiendo a tu portal correspondiente...</span>
      </div>
    </div>
  );
}
