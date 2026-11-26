import React from 'react';
import { Download } from 'lucide-react';
import { AppViewMode } from '../types/vehicle';

interface TopBarProps {
  activeView: AppViewMode;
  onChangeView: (view: AppViewMode) => void;
  onExportSheet: () => void;
  isExporting: boolean;
  totalCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onChangeView,
  onExportSheet,
  isExporting,
  totalCount = 100,
}) => {
  const navItems: { id: AppViewMode; label: string }[] = [
    { id: 'city', label: 'Cidade Conceito' },
    { id: 'studio', label: 'Estúdio 3D' },
    { id: 'catalog', label: `Catálogo (${totalCount})` },
    { id: 'compare', label: 'Escala 1:1' },
    { id: 'unity', label: 'Unity C#' },
  ];
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-6 bg-zinc-950 border-b border-zinc-800/80 z-30">
      {/* Zone 1: Single-line Brand Wordmark */}
      <button
        type="button"
        onClick={() => onChangeView('studio')}
        className="font-display text-xl font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors cursor-pointer"
      >
        Garagem Conceito 50
      </button>

      {/* Zone 2: clean single-line navigation links */}
      <nav className="flex items-center gap-6 overflow-x-auto">
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeView(item.id)}
              className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onExportSheet}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Gerando PNG...' : 'Exportar Prancha'}
        </button>
      </div>
    </header>
  );
};
