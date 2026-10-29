import React from "react";
import Link from "next/link";
import {
  Folder,
  Database,
  CheckSquare,
  Layout,
  Dumbbell,
  Users,
  Clock,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";

interface TeamCardProps {
  personNumber: string;
  roleTitle: string;
  moduleRoute: string;
  backendFile: string;
  responsibilities: string[];
  colorBorder: string;
  badgeBg: string;
  databaseEntities?: string[];
  frontendViews?: string[];
  viewRoutes?: Record<string, string>;
  isLive?: boolean;
  onActionClick?: () => void;
  actionButtonText?: string;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  personNumber,
  roleTitle,
  moduleRoute,
  backendFile,
  responsibilities,
  colorBorder,
  badgeBg,
  databaseEntities,
  frontendViews,
  viewRoutes,
  isLive,
  onActionClick,
  actionButtonText,
}) => {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded-[5px] p-6 hover:border-[#ff6105]/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between space-y-5">
      <div className="space-y-4">
        {/* Header de Tarjeta */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#ffdfcd] text-[#0a0a0a] border border-[#ff6105]/20 flex items-center gap-1.5">
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#ff6105] animate-pulse"></span>}
            {personNumber}
          </span>
          {isLive ? (
            <Link
              href={moduleRoute}
              className="text-xs text-[#292b2a] hover:text-[#0a0a0a] font-mono bg-[#f3f4f3] hover:bg-[#e5e7eb] px-2 py-0.5 rounded-full border border-[#e5e5e5] transition-colors flex items-center gap-1"
              title={`Ir a ${moduleRoute}`}
            >
              <span>{moduleRoute}</span>
              <ArrowUpRight className="w-3 h-3 text-[#ff6105]" />
            </Link>
          ) : (
            <span className="text-xs text-[#7a7b7b] font-mono bg-[#f3f4f3] px-2 py-0.5 rounded-full border border-[#e5e5e5]">
              {moduleRoute}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-xl font-medium text-[#0a0a0a] tracking-tight">{roleTitle}</h3>
          <p className="text-xs text-[#7a7b7b] font-mono mt-1 bg-[#f3f4f3] px-2.5 py-1 rounded-full border border-[#e5e5e5] inline-flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-[#ff6105]" />
            <span>{backendFile}</span>
          </p>
        </div>

        {/* Tablas y Vistas de SQL Server */}
        {databaseEntities && databaseEntities.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-[#ff6105]" />
              <span>Tablas &amp; Vistas SQL Server:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {databaseEntities.map((ent, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#292b2a] border border-[#e5e5e5]"
                >
                  {ent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Responsabilidades */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] uppercase tracking-wider text-[#7a7b7b] font-medium flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-[#ff6105]" />
            <span>Tareas Asignadas:</span>
          </p>
          <ul className="text-xs text-[#292b2a] space-y-1.5 list-disc list-inside">
            {responsibilities.map((resp, idx) => (
              <li key={idx} className="leading-snug">{resp}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Vistas Frontend asociadas */}
      <div className="space-y-4 pt-3 border-t border-[#e5e5e5]">
        {frontendViews && frontendViews.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7a7b7b] font-medium flex items-center gap-1">
              <Layout className="w-3 h-3 text-[#ff6105]" />
              <span>Vistas Frontend:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {frontendViews.map((view, idx) => {
                const targetRoute = viewRoutes?.[view];
                if (targetRoute) {
                  return (
                    <Link
                      key={idx}
                      href={targetRoute}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] hover:text-[#0a0a0a] border border-[#e5e5e5] hover:border-[#ff6105]/50 transition-all flex items-center gap-1 group"
                      title={`Ir a ${view} (${targetRoute})`}
                    >
                      <span>{view}</span>
                      <ArrowUpRight className="w-3 h-3 text-[#ff6105] opacity-70 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#f3f4f3] text-[#7a7b7b] border border-[#e5e5e5]"
                  >
                    {view}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón de Acción Principal */}
        {isLive && (
          <Link
            href={moduleRoute}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium bg-[#ff6105] hover:bg-[#e05504] text-white shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <Dumbbell className="w-4 h-4" />
            <span>{actionButtonText || `Abrir Módulo (${moduleRoute})`}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}

        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium bg-[#f3f4f3] hover:bg-[#e5e7eb] text-[#292b2a] border border-[#e5e5e5] transition-all duration-200 active:scale-[0.98]"
          >
            <Users className="w-4 h-4 text-[#ff6105]" />
            <span>{actionButtonText || "Ver Panel de Socios"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {!isLive && !onActionClick && (
          <div className="w-full text-center py-2 text-xs text-[#7a7b7b] bg-[#f3f4f3] rounded-full border border-dashed border-[#e5e5e5] flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>En desarrollo</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;
