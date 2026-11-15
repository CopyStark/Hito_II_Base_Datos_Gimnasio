"use client";

import React from "react";
import Link from "next/link";

export interface BrandIsotypeProps {
  size?: number;
  className?: string;
}

/**
 * Isotipo vectorial minimalista de GimnasioDB
 * Geometría deportiva: silueta de mancuerna estilizada en tono grafito oscuro (#111827)
 * con núcleo de energía atlética en el naranja oficial (#ff6105).
 */
export function BrandIsotype({ size = 26, className = "" }: BrandIsotypeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      {/* Placa exterior izquierda */}
      <rect x="4" y="8" width="4" height="16" rx="2" fill="#111827" />
      {/* Placa interior izquierda con profundidad sutil */}
      <rect x="9.5" y="10.5" width="2.5" height="11" rx="1.25" fill="#111827" fillOpacity="0.85" />
      {/* Barra de agarre central */}
      <rect x="11.5" y="14" width="9" height="4" rx="2" fill="#111827" />
      {/* Placa interior derecha con profundidad sutil */}
      <rect x="20" y="10.5" width="2.5" height="11" rx="1.25" fill="#111827" fillOpacity="0.85" />
      {/* Placa exterior derecha */}
      <rect x="24" y="8" width="4" height="16" rx="2" fill="#111827" />
      {/* Núcleo de energía GimnasioDB (Naranja Oficial #ff6105) */}
      <circle cx="16" cy="16" r="3.25" fill="#ff6105" />
    </svg>
  );
}

export interface BrandLogoProps {
  /**
   * Tamaño del logotipo
   * - sm: compacto para encabezados móviles y sidebars reducidos
   * - md: estándar para headers de portales y dashboards
   * - lg: destacado para la portada principal
   */
  size?: "sm" | "md" | "lg";
  /**
   * Ruta de redirección al hacer clic (por defecto '/'). Pasar null o false para renderizar sin <a>.
   */
  href?: string | false | null;
  /**
   * Mostrar el texto "gimnasio · db" al lado del isotipo
   */
  showText?: boolean;
  /**
   * Solo mostrar el isotipo SVG
   */
  isotypeOnly?: boolean;
  /**
   * Clases adicionales para el contenedor
   */
  className?: string;
  /**
   * Título accesible
   */
  title?: string;
  /**
   * Callback opcional al hacer clic (ej. para cerrar menú móvil)
   */
  onClick?: () => void;
}

export function BrandLogo({
  size = "md",
  href = "/",
  showText = true,
  isotypeOnly = false,
  className = "",
  title = "gimnasio · db — Red de Gimnasios",
  onClick,
}: BrandLogoProps) {
  const iconSize = size === "sm" ? 22 : size === "lg" ? 30 : 26;
  const textClass =
    size === "sm"
      ? "text-[18px] sm:text-[19px]"
      : size === "lg"
      ? "text-[23px] sm:text-[25px]"
      : "text-[20px] sm:text-[22px]";

  const content = (
    <span className={`group inline-flex items-center gap-2.5 select-none leading-none tracking-[-0.03em] ${className}`}>
      <BrandIsotype size={iconSize} />
      {showText && !isotypeOnly && (
        <span className={`inline-flex items-center gap-1.5 font-medium ${textClass}`}>
          <span className="text-[#0a0a0a] transition-colors group-hover:text-black">
            gimnasio
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#ff6105] transition-transform duration-300 group-hover:scale-125" />
          <span className="font-light text-[#7a7b7b]">db</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        title={title}
        className="inline-flex items-center shrink-0 focus:outline-none"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default BrandLogo;
