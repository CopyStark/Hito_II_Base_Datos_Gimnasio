import React from "react";

interface TeamCardProps {
  personNumber: string;
  roleTitle: string;
  moduleRoute: string;
  backendFile: string;
  responsibilities: string[];
  colorBorder: string;
  badgeBg: string;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  personNumber,
  roleTitle,
  moduleRoute,
  backendFile,
  responsibilities,
  colorBorder,
  badgeBg,
}) => {
  return (
    <div className={`bg-gray-900/80 border ${colorBorder} rounded-xl p-6 backdrop-blur-md transition-all hover:scale-[1.02] hover:shadow-xl`}>
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeBg} text-white`}>
          {personNumber}
        </span>
        <span className="text-xs text-gray-400 font-mono">{moduleRoute}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{roleTitle}</h3>
      <p className="text-xs text-gray-400 font-mono mb-4 bg-black/40 px-3 py-1.5 rounded-lg border border-gray-800">
        📁 {backendFile}
      </p>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Responsabilidades:</p>
        <ul className="text-sm text-gray-300 space-y-1.5 list-disc list-inside">
          {responsibilities.map((resp, idx) => (
            <li key={idx} className="leading-snug">{resp}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TeamCard;
