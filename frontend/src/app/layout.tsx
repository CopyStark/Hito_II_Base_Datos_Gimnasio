import "./globals.css";
import type { Metadata } from "next";
import ShowClients from '@/components/ShowClients';

export const metadata: Metadata = {
  title: "GimnasioDB - Sistema de Gestión de Gimnasio",
  description: "Plataforma integral de gestión de socios, clases, entrenadores y membresías.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <div className="fixed top-4 left-4 z-50">
          <ShowClients />
        </div>
        {children}
      </body>
    </html>
  );
}
