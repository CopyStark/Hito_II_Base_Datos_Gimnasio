import React from "react";
import Link from "next/link";

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
    <div className={`bg-gray-900/80 border ${colorBorder} rounded-2xl p-6 backdrop-blur-md transition-all hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between space-y-5`}>
      <div className="space-y-4">
        {/* Header de Tarjeta */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg} text-white shadow-sm flex items-center gap-1.5`}>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
            {personNumber}
          </span>
          {isLive ? (
            <Link
              href={moduleRoute}
              className="text-xs text-purple-300 hover:text-white font-mono bg-purple-950/80 hover:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-500/40 transition-colors flex items-center gap-1"
              title={`Ir a ${moduleRoute}`}
            >
              <span>{moduleRoute}</span>
              <span className="text-[10px]">↗</span>
            </Link>
          ) : (
            <span className="text-xs text-gray-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-gray-800">
              {moduleRoute}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">{roleTitle}</h3>
          <p className="text-xs text-gray-400 font-mono mt-1 bg-black/40 px-2.5 py-1 rounded-lg border border-gray-800/80 inline-block">
            📁 {backendFile}
          </p>
        </div>

        {/* Tablas y Vistas de SQL Server */}
        {databaseEntities && databaseEntities.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
              <span>🗄️</span> Tablas & Vistas SQL Server:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {databaseEntities.map((ent, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950/80 text-cyan-300 border border-slate-800"
                >
                  {ent}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Responsabilidades */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
            <span>📋</span> Tareas Asignadas:
          </p>
          <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
            {responsibilities.map((resp, idx) => (
              <li key={idx} className="leading-snug">{resp}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Vistas Frontend asociadas */}
      <div className="space-y-4 pt-3 border-t border-gray-800/80">
        {frontendViews && frontendViews.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
              <span>💻</span> Vistas Frontend:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {frontendViews.map((view, idx) => {
                const targetRoute = viewRoutes?.[view];
                if (targetRoute) {
                  return (
                    <Link
                      key={idx}
                      href={targetRoute}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 hover:text-white border border-purple-500/40 hover:border-purple-400 transition-all flex items-center gap-1 group shadow-sm"
                      title={`Ir a ${view} (${targetRoute})`}
                    >
                      <span>{view}</span>
                      <span className="text-[9px] opacity-70 group-hover:translate-x-0.5 transition-transform">↗</span>
                    </Link>
                  );
                }
                return (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/60"
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 border border-purple-400/40 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>🏋️</span>
            <span>{actionButtonText || `Abrir Módulo (${moduleRoute})`}</span>
            <span>→</span>
          </Link>
        )}

        {onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 border border-blue-400/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>👥</span>
            <span>{actionButtonText || "Ver Panel de Socios"}</span>
            <span>→</span>
          </button>
        )}

        {!isLive && !onActionClick && (
          <div className="w-full text-center py-2 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <span>⏳ En desarrollo</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;
