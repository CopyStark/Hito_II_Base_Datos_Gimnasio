import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-publicasans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GimnasioDB — Red de Gimnasios & Gestión Deportiva",
  description:
    "Plataforma integral de sedes, planes de membresía, reserva de clases, control de acceso y gestión deportiva en línea.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-[#ffffff] text-[#0a0a0a] min-h-screen antialiased selection:bg-[#ff6105] selection:text-white">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
