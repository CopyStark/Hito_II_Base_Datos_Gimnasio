import React from "react";

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
}) => {
  return (
    <div className={`bg-gray-900/80 border ${colorBorder} rounded-2xl p-6 backdrop-blur-md transition-all hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between space-y-5`}>
      <div className="space-y-4">
        {/* Header de Tarjeta */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg} text-white shadow-sm`}>
            {personNumber}
          </span>
          <span className="text-xs text-gray-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-gray-800">
            {moduleRoute}
          </span>
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
      {frontendViews && frontendViews.length > 0 && (
        <div className="pt-3 border-t border-gray-800/80 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold flex items-center gap-1">
            <span>💻</span> Módulos Frontend:
          </p>
          <div className="flex flex-wrap gap-1">
            {frontendViews.map((view, idx) => (
              <span
                key={idx}
                className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700/60"
              >
                {view}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamCard;
