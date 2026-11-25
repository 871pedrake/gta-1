import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { VehicleCategory, VehicleConcept } from '../types/vehicle';
import { VEHICLE_CATEGORIES } from '../data/vehicles50';
import { thumbnailRenderer } from '../three/studioScene';

interface CatalogGridProps {
  vehicles: VehicleConcept[];
  selectedId: number;
  onSelectAndOpenStudio: (v: VehicleConcept) => void;
}

type SortKey = 'id' | 'speed' | 'length';

export const CatalogGrid: React.FC<CatalogGridProps> = ({
  vehicles,
  selectedId,
  onSelectAndOpenStudio,
}) => {
  const [category, setCategory] = useState<'Todas' | VehicleCategory>('Todas');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('id');
  const [thumbs, setThumbs] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    vehicles.forEach((v) => {
      const cached = thumbnailRenderer.getCached(v.id);
      if (cached) initial[v.id] = cached;
    });
    return initial;
  });

  // Progressively render all 50 studio thumbnails using 1 shared offscreen WebGL context
  useEffect(() => {
    let cancelled = false;
    const queue = vehicles.filter((v) => !thumbnailRenderer.getCached(v.id));
    if (queue.length === 0) return;

    let idx = 0;
    const step = () => {
      if (cancelled || idx >= queue.length) return;
      const batch: Record<number, string> = {};
      const end = Math.min(idx + 3, queue.length);
      for (; idx < end; idx++) {
        const v = queue[idx];
        batch[v.id] = thumbnailRenderer.renderThumbnail(v);
      }
      setThumbs((prev) => ({ ...prev, ...batch }));
      if (idx < queue.length) {
        requestAnimationFrame(step);
      }
    };

    const timer = window.setTimeout(() => requestAnimationFrame(step), 30);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = vehicles.filter((v) => {
      const catOk = category === 'Todas' || v.category === category;
      const qOk =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.code.toLowerCase().includes(q) ||
        v.conceptSummary.toLowerCase().includes(q) ||
        v.roleInCity.toLowerCase().includes(q);
      return catOk && qOk;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'speed') return b.unitySpec.maxSpeedKmh - a.unitySpec.maxSpeedKmh;
      if (sortBy === 'length') return b.dimensions.length - a.dimensions.length;
      return a.id - b.id;
    });
  }, [vehicles, category, query, sortBy]);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950">
      <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="text-xs font-mono-tech text-amber-400">EXPANSÃO DE FROTA URBANA</div>
            <h1 className="font-display text-3xl font-bold text-zinc-100 mt-1">
              Catálogo Completo — 50 Veículos Conceito
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Modelos 3D multi-peças em escala 1:1 para cidade aberta, rios e espaço aéreo. Clique em qualquer veículo para inspecionar no Estúdio 3D ou gerar o script C#.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar modelos..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              {(
                [
                  ['id', 'Código'],
                  ['speed', 'Vel. Máx'],
                  ['length', 'Tamanho'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                    sortBy === key
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setCategory('Todas')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              category === 'Todas'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
            }`}
          >
            Todos ({vehicles.length})
          </button>
          {VEHICLE_CATEGORIES.map((cat) => {
            const count = vehicles.filter((v) => v.category === cat).length;
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* 50-Vehicle Grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center border border-zinc-800 rounded-xl bg-zinc-900/30">
            <p className="text-sm text-zinc-400">Nenhum veículo encontrado para "{query}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((v) => {
              const isSelected = v.id === selectedId;
              const thumbUrl = thumbs[v.id];
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectAndOpenStudio(v)}
                  className={`group text-left rounded-xl border bg-zinc-900/50 overflow-hidden transition-all duration-150 cursor-pointer hover:border-zinc-600 ${
                    isSelected ? 'border-amber-500' : 'border-zinc-800'
                  }`}
                >
                  {/* 3D Studio Render Preview */}
                  <div className="relative aspect-[16/10] bg-[#131318] border-b border-zinc-800/80 overflow-hidden">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`${v.name} — Concept Art 3D`}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                        <span className="text-xs font-mono-tech text-zinc-500">
                          Renderizando {v.code}...
                        </span>
                      </div>
                    )}
                    <div
                      className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 rounded-sm border border-white/25"
                      style={{ backgroundColor: v.palette.primary }}
                      title={`Cor base: ${v.palette.primary}`}
                    />
                  </div>

                  {/* Card Body — Zero-Pill Unboxed Metadata */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                      <span className="font-mono-tech text-amber-400">{v.code}</span>
                      <span className="truncate">{v.category}</span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-zinc-100 leading-tight group-hover:text-amber-400 transition-colors">
                        {v.name}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5 group-hover:text-amber-400 transition-colors" />
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {v.conceptSummary}
                    </p>

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2 text-[11px] font-mono-tech text-zinc-400">
                      <span>{v.unitySpec.maxSpeedKmh} km/h</span>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span>{v.dimensions.length.toFixed(1)}m × {v.dimensions.width.toFixed(1)}m</span>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span>{v.craftedParts.length} peças</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
