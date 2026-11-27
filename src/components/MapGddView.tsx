import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Download,
  FileText,
  GraduationCap,
  Home,
  Layers,
  MapPin,
  Mountain,
  ShoppingBag,
  Umbrella,
  X,
} from 'lucide-react';
import { CityCameraPreset } from '../types/vehicle';
import {
  buildGddMarkdown,
  GDD_EXPLICIT_RULES,
  GDD_MAP_METRICS,
  GDD_MORRO_FIXES,
  GDD_SEPARATION_RULES,
  GDD_SUPREME_RULE,
  GDD_UNITY_CHECKLIST,
  GDD_ZONES,
  GddZoneSpec,
} from '../data/mapGddData';

type GddSectionTab = 'blueprint' | 'rules' | 'favelas' | 'separation' | 'unity';

interface MapGddViewProps {
  onClose?: () => void;
  onJumpToZone?: (preset: CityCameraPreset) => void;
}

const ZONE_TO_CAMERA: Record<GddZoneSpec['id'], CityCameraPreset> = {
  downtown: 'downtown',
  condos: 'condos',
  corporate: 'corporate',
  shops: 'shops',
  residential: 'residential',
  school: 'school',
  beach: 'beach',
  morro: 'morro',
  plaza: 'flag',
  river: 'bridges',
};

const ZONE_ICONS: Record<GddZoneSpec['id'], React.ReactNode> = {
  downtown: <Building2 className="w-4 h-4" />,
  condos: <Building2 className="w-4 h-4" />,
  corporate: <Building2 className="w-4 h-4" />,
  shops: <ShoppingBag className="w-4 h-4" />,
  residential: <Home className="w-4 h-4" />,
  school: <GraduationCap className="w-4 h-4" />,
  beach: <Umbrella className="w-4 h-4" />,
  morro: <Mountain className="w-4 h-4" />,
  plaza: <Compass className="w-4 h-4" />,
  river: <Layers className="w-4 h-4" />,
};

export const MapGddView: React.FC<MapGddViewProps> = ({ onClose, onJumpToZone }) => {
  const [section, setSection] = useState<GddSectionTab>('blueprint');
  const [selectedZoneId, setSelectedZoneId] = useState<GddZoneSpec['id']>('river');

  const selectedZone = GDD_ZONES.find((z) => z.id === selectedZoneId) ?? GDD_ZONES[0];

  const handleDownloadGdd = () => {
    const content = buildGddMarkdown();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GDD_MAPA_3D_UNITY.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Convert world (X, Z) into SVG viewport coordinates:
  // World X: -280 .. +180 -> SVG x: 0 .. 759  (scale = 1.65)
  // World Z: +155 (North/Morro top) .. -175 (South/Mirante Sul bottom) -> SVG y: 0 .. 544.5
  const SVG_SCALE = 1.65;
  const toSvgX = (wx: number) => (wx + 280) * SVG_SCALE;
  const toSvgY = (wz: number) => (155 - wz) * SVG_SCALE;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header Strip */}
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-tech text-amber-400">
              <span>GAME DESIGN DOCUMENT</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-zinc-400">METRÓPOLE CIDADE NOVA · ESCALA 1u = 1m</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white mt-0.5">
              Arquitetura do Mapa 3D &amp; Port para Unity URP
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto">
              {(
                [
                  ['blueprint', 'Planta & Zoneamento'],
                  ['rules', 'Regras Explícitas'],
                  ['favelas', 'Morro & Hidrologia'],
                  ['separation', 'Residência · Shopping · Prédios'],
                  ['unity', 'Port Unity C#'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    section === id
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadGdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar GDD (.md)
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Voltar ao 3D
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {GDD_MAP_METRICS.map((m) => (
              <div
                key={m.label}
                className="p-3.5 bg-zinc-900/50 border border-zinc-800/90 rounded-lg"
              >
                <div className="text-[11px] text-zinc-400">{m.label}</div>
                <div className="font-display text-lg font-bold text-zinc-100 mt-0.5 tabular-nums">
                  {m.value}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{m.note}</div>
              </div>
            ))}
          </div>

          {/* Supreme Rule Permanent Banner */}
          <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-tech font-bold text-amber-400">
                  REGRA SUPREMA DO PROJETO (PERMANENTE EM TODAS AS ATUALIZAÇÕES)
                </span>
              </div>
              <span className="text-[11px] font-mono-tech text-zinc-400">
                AI Studio (Protótipo Visual/Lógica) → Unity URP
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {GDD_SUPREME_RULE.map((pillar) => (
                <div
                  key={pillar.code}
                  className="p-3.5 bg-zinc-950/80 border border-zinc-800/90 rounded-lg space-y-1.5"
                >
                  <div className="font-mono-tech text-[11px] font-semibold text-amber-400">
                    {pillar.code}
                  </div>
                  <div className="text-sm font-semibold text-zinc-100">{pillar.title}</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{pillar.description}</p>
                  <div className="pt-1 font-mono-tech text-[10px] text-emerald-400">
                    {pillar.unityStandard}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 1: INTERACTIVE 2D BLUEPRINT + ZONE INSPECTOR */}
          {section === 'blueprint' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left: Proportional Architectural Blueprint */}
              <div className="xl:col-span-7 bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-xl font-bold text-zinc-100">
                      Planta Baixa Técnica (Coordenadas Reais X / Z)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Clique em qualquer distrito no mapa abaixo para inspecionar limites, hidrologia, relevo e regras do Unity.
                    </p>
                  </div>
                  <span className="font-mono-tech text-[11px] text-zinc-400">
                    Norte (+Z) no topo · Mirante Sul (-144) na base
                  </span>
                </div>

                <div className="relative bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <svg
                    viewBox="0 0 760 545"
                    className="w-full h-auto block select-none"
                    role="img"
                    aria-label="Planta de zoneamento do mapa 3D Cidade Nova"
                  >
                    {/* Background Blueprint Grid */}
                    <rect x="0" y="0" width="760" height="545" fill="#09090b" />

                    {/* West Bay Lagoon & Reforestation Woods Backdrops */}
                    <rect
                      x={toSvgX(-276)}
                      y={toSvgY(30)}
                      width={105 * SVG_SCALE}
                      height={76 * SVG_SCALE}
                      rx={14}
                      fill="#0369a1"
                      fillOpacity={0.28}
                    />
                    {[
                      { x: -175, z: 68, r: 34, label: 'BOSQUE NO' },
                      { x: -195, z: -96, r: 32, label: 'MATA SO' },
                      { x: 168, z: -40, r: 22, label: '' },
                    ].map((f, idx) => (
                      <g key={`forest-${idx}`}>
                        <circle
                          cx={toSvgX(f.x)}
                          cy={toSvgY(f.z)}
                          r={f.r}
                          fill="#15803d"
                          fillOpacity={0.24}
                          stroke="#22c55e"
                          strokeOpacity={0.45}
                          strokeDasharray="3 3"
                        />
                        {f.label && (
                          <text
                            x={toSvgX(f.x)}
                            y={toSvgY(f.z) + 3}
                            textAnchor="middle"
                            fill="#86efac"
                            fontSize="7"
                            fontFamily="monospace"
                          >
                            {f.label}
                          </text>
                        )}
                      </g>
                    ))}
                    {[-102, -68, -34, 0, 34, 68, 102].map((ax) => (
                      <g key={`gx-${ax}`}>
                        <line
                          x1={toSvgX(ax)}
                          y1={toSvgY(40)}
                          x2={toSvgX(ax)}
                          y2={toSvgY(-130)}
                          stroke="#27272a"
                          strokeWidth="12"
                        />
                        <line
                          x1={toSvgX(ax)}
                          y1={toSvgY(40)}
                          x2={toSvgX(ax)}
                          y2={toSvgY(-130)}
                          stroke="#3f3f46"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    ))}
                    {[-148, 148].map((ax) => (
                      <g key={`gx-outer-${ax}`}>
                        <line
                          x1={toSvgX(ax)}
                          y1={toSvgY(5)}
                          x2={toSvgX(ax)}
                          y2={toSvgY(-107)}
                          stroke="#27272a"
                          strokeWidth="12"
                        />
                        <line
                          x1={toSvgX(ax)}
                          y1={toSvgY(5)}
                          x2={toSvgX(ax)}
                          y2={toSvgY(-107)}
                          stroke="#52525b"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    ))}
                    {[-102, -68, -34, 0, 34].map((az) => {
                      const span = az === 34 ? 107 : 153;
                      return (
                        <g key={`gz-${az}`}>
                          <line
                            x1={toSvgX(-span)}
                            y1={toSvgY(az)}
                            x2={toSvgX(span)}
                            y2={toSvgY(az)}
                            stroke="#27272a"
                            strokeWidth="12"
                          />
                          <line
                            x1={toSvgX(-span)}
                            y1={toSvgY(az)}
                            x2={toSvgX(span)}
                            y2={toSvgY(az)}
                            stroke="#3f3f46"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}

                    {/* Av. Beira-Mar Oeste (-162) & Z=0/-34 Spurs */}
                    <line
                      x1={toSvgX(-162)}
                      y1={toSvgY(5)}
                      x2={toSvgX(-162)}
                      y2={toSvgY(-39)}
                      stroke="#27272a"
                      strokeWidth="10"
                    />
                    {[0, -34].map((sz) => (
                      <line
                        key={`west-spur-${sz}`}
                        x1={toSvgX(-162)}
                        y1={toSvgY(sz)}
                        x2={toSvgX(-148)}
                        y2={toSvgY(sz)}
                        stroke="#27272a"
                        strokeWidth="10"
                      />
                    ))}

                    {/* Interactive District Polygons */}
                    {GDD_ZONES.map((z) => {
                      const isSel = z.id === selectedZoneId;
                      const rx = toSvgX(z.svgRect.x);
                      const ry = toSvgY(z.svgRect.z + z.svgRect.d);
                      const rw = z.svgRect.w * SVG_SCALE;
                      const rh = z.svgRect.d * SVG_SCALE;
                      return (
                        <g
                          key={z.id}
                          onClick={() => setSelectedZoneId(z.id)}
                          className="cursor-pointer"
                        >
                          <rect
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            rx={4}
                            fill={z.colorHex}
                            fillOpacity={isSel ? 0.24 : 0.11}
                            stroke={z.colorHex}
                            strokeWidth={isSel ? 2.5 : 1.2}
                            strokeOpacity={isSel ? 1 : 0.65}
                          />
                        </g>
                      );
                    })}

                    {/* 6 Wide 33m×23m Expanded Blocks (2-em-1 Condos & Corporate Sales + Parking) */}
                    {[
                      { cx: -125, cz: -17, kind: 'corporate', tag: 'VENDAS + P' },
                      { cx: -125, cz: -51, kind: 'condos', tag: 'MORADIA 2×1' },
                      { cx: -125, cz: -85, kind: 'condos', tag: 'MORADIA 2×1' },
                      { cx: 125, cz: -17, kind: 'corporate', tag: 'P + VENDAS' },
                      { cx: 125, cz: -51, kind: 'corporate', tag: 'VENDAS + P' },
                      { cx: 125, cz: -85, kind: 'condos', tag: 'MORADIA 2×1' },
                    ].map((blk) => {
                      const isCondo = blk.kind === 'condos';
                      const color = isCondo ? '#a855f7' : '#22d3ee';
                      const active = selectedZoneId === blk.kind;
                      return (
                        <g
                          key={`exp-${blk.cx}-${blk.cz}`}
                          onClick={() => setSelectedZoneId(blk.kind as GddZoneSpec['id'])}
                          className="cursor-pointer"
                        >
                          <rect
                            x={toSvgX(blk.cx - 16.5)}
                            y={toSvgY(blk.cz + 11.5)}
                            width={33 * SVG_SCALE}
                            height={23 * SVG_SCALE}
                            rx={3}
                            fill={color}
                            fillOpacity={active ? 0.34 : 0.18}
                            stroke={color}
                            strokeWidth={active ? 2.2 : 1.2}
                          />
                          <text
                            x={toSvgX(blk.cx)}
                            y={toSvgY(blk.cz) + 3}
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="7"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {blk.tag}
                          </text>
                        </g>
                      );
                    })}

                    {/* Cais Baixo (-0.85m) & Timber Yacht Pier */}
                    <rect
                      x={toSvgX(-28)}
                      y={toSvgY(10.5)}
                      width={20 * SVG_SCALE}
                      height={6}
                      fill="#0284c7"
                      fillOpacity={0.65}
                      stroke="#7dd3fc"
                      strokeWidth={1}
                    />
                    <rect
                      x={toSvgX(-24)}
                      y={toSvgY(12.2)}
                      width={11.5 * SVG_SCALE}
                      height={4.5}
                      fill="#b45309"
                      stroke="#fde68a"
                      strokeWidth={0.8}
                    />
                    <rect
                      x={toSvgX(8)}
                      y={toSvgY(10.5)}
                      width={20 * SVG_SCALE}
                      height={6}
                      fill="#0284c7"
                      fillOpacity={0.65}
                      stroke="#7dd3fc"
                      strokeWidth={1}
                    />

                    {/* Praia Oeste (-171.5..-190) + Ponte (-171..-208) + Ilha do Sol (-236, -14) */}
                    <rect
                      x={toSvgX(-189)}
                      y={toSvgY(5)}
                      width={17.5 * SVG_SCALE}
                      height={46 * SVG_SCALE}
                      rx={6}
                      fill="#fde047"
                      fillOpacity={0.62}
                      stroke="#facc15"
                      strokeWidth={1}
                    />
                    <line
                      x1={toSvgX(-171.2)}
                      y1={toSvgY(-14)}
                      x2={toSvgX(-209)}
                      y2={toSvgY(-14)}
                      stroke="#d97706"
                      strokeWidth="5"
                    />
                    <circle
                      cx={toSvgX(-236)}
                      cy={toSvgY(-14)}
                      r={27 * SVG_SCALE}
                      fill="#22c55e"
                      fillOpacity={0.35}
                      stroke="#fde047"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={toSvgX(-236)}
                      cy={toSvgY(-14)}
                      r={18 * SVG_SCALE}
                      fill="none"
                      stroke="#e4e4e7"
                      strokeDasharray="3 2"
                      strokeWidth="1.5"
                    />
                    <text
                      x={toSvgX(-236)}
                      y={toSvgY(-14) + 3}
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      ILHA DO SOL
                    </text>
                    <text
                      x={toSvgX(-180)}
                      y={toSvgY(11)}
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      PRAIA OESTE
                    </text>

                    {/* E.M. Cidade Nova (-17, -85) */}
                    <text
                      x={toSvgX(-17)}
                      y={toSvgY(-85) + 3}
                      textAnchor="middle"
                      fill="#fef08a"
                      fontSize="7.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      ESCOLA
                    </text>

                    {/* Nascente da Serra (+84, +114) + Córrego Sinuoso flowing into River */}
                    <path
                      d={`M ${toSvgX(84)} ${toSvgY(114)} Q ${toSvgX(89)} ${toSvgY(92)} ${toSvgX(82)} ${toSvgY(70)} T ${toSvgX(87)} ${toSvgY(46)} L ${toSvgX(86)} ${toSvgY(26)}`}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={toSvgX(84)}
                      cy={toSvgY(114)}
                      r={9}
                      fill="#06b6d4"
                      stroke="#cffafe"
                      strokeWidth="2"
                    />
                    <text
                      x={toSvgX(84)}
                      y={toSvgY(114) - 13}
                      textAnchor="middle"
                      fill="#67e8f9"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      Nascente (84,114)
                    </text>

                    {/* 5 Bridges across the River */}
                    {[-68, -34, 0, 34, 68].map((bx) => (
                      <rect
                        key={`bridge-${bx}`}
                        x={toSvgX(bx) - 7}
                        y={toSvgY(27.5)}
                        width={14}
                        height={42}
                        fill="#e4e4e7"
                        fillOpacity={0.85}
                        stroke="#09090b"
                        strokeWidth={1}
                      />
                    ))}

                    {/* Morro Winding Road, Escadões, Campinho, Mirante */}
                    <path
                      d={`M ${toSvgX(14)} ${toSvgY(36)} Q ${toSvgX(20)} ${toSvgY(54)} ${toSvgX(4)} ${toSvgY(66)} T ${toSvgX(-18)} ${toSvgY(84)} T ${toSvgX(10)} ${toSvgY(103)}`}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    {[-46, -16, 34].map((ex) => (
                      <line
                        key={`esc-${ex}`}
                        x1={toSvgX(ex)}
                        y1={toSvgY(40)}
                        x2={toSvgX(ex)}
                        y2={toSvgY(84)}
                        stroke="#facc15"
                        strokeWidth="2.5"
                        strokeDasharray="3 2"
                      />
                    ))}
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(75)}
                      r={14}
                      fill="#166534"
                      stroke="#f4f4f5"
                      strokeWidth="1.2"
                    />
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(75) + 3}
                      textAnchor="middle"
                      fill="#f4f4f5"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      Campinho
                    </text>
                    <circle
                      cx={toSvgX(10)}
                      cy={toSvgY(104)}
                      r={10}
                      fill="#fb7185"
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />
                    <text
                      x={toSvgX(10)}
                      y={toSvgY(104) - 13}
                      textAnchor="middle"
                      fill="#ffe4e6"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      Mirante Morro
                    </text>

                    {/* Segmented Graffiti Retaining Wall at Z = 41.9 */}
                    {[
                      [-82, -50],
                      [-42, -20],
                      [-12, 9.2],
                      [18.8, 30],
                      [38, 81],
                    ].map(([w1, w2], idx) => (
                      <line
                        key={`wall-${idx}`}
                        x1={toSvgX(w1)}
                        y1={toSvgY(41.9)}
                        x2={toSvgX(w2)}
                        y2={toSvgY(41.9)}
                        stroke="#fda4af"
                        strokeWidth="3.5"
                      />
                    ))}

                    {/* Skyway Passarela at (+34, -17) */}
                    <rect
                      x={toSvgX(34) - 12}
                      y={toSvgY(-17) - 4}
                      width={24}
                      height={8}
                      fill="#fb923c"
                    />

                    {/* Elevation Slope Lines (Ladeira 1 & Ladeira 2) */}
                    <line
                      x1={toSvgX(-105)}
                      y1={toSvgY(-39.5)}
                      x2={toSvgX(105)}
                      y2={toSvgY(-39.5)}
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="5 4"
                      strokeOpacity={0.7}
                    />
                    <line
                      x1={toSvgX(-105)}
                      y1={toSvgY(-73.5)}
                      x2={toSvgX(105)}
                      y2={toSvgY(-73.5)}
                      stroke="#34d399"
                      strokeWidth="1.2"
                      strokeDasharray="5 4"
                      strokeOpacity={0.7}
                    />

                    {/* Mirante Alto da Serra Sul (+13.8m) at (0, -144) */}
                    <line
                      x1={toSvgX(0)}
                      y1={toSvgY(-124)}
                      x2={toSvgX(0)}
                      y2={toSvgY(-140)}
                      stroke="#52525b"
                      strokeWidth="12"
                    />
                    <circle
                      cx={toSvgX(0)}
                      cy={toSvgY(-144)}
                      r={24}
                      fill="#059669"
                      fillOpacity={0.55}
                      stroke="#6ee7b7"
                      strokeWidth="2"
                    />
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(-144) + 3}
                      textAnchor="middle"
                      fill="#ecfdf5"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      MIRANTE SUL +13,8m
                    </text>

                    {/* District Zone Labels */}
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(128)}
                      textAnchor="middle"
                      fill="#fda4af"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      MORRO DA ESPERANÇA · MATA BOTÂNICA &amp; CÓRREGO
                    </text>
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(16.5)}
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      RIO (-1,25m) · CAIS BAIXO (-0,85m) · 5 PONTES &amp; BARCOS
                    </text>
                    <text
                      x={toSvgX(-68)}
                      y={toSvgY(-26)}
                      textAnchor="middle"
                      fill="#bae6fd"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      ÁREA DE PRÉDIOS
                    </text>
                    <text
                      x={toSvgX(-68)}
                      y={toSvgY(-33)}
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      Oeste (0m → +2,25m)
                    </text>
                    <text
                      x={toSvgX(42)}
                      y={toSvgY(-24)}
                      textAnchor="middle"
                      fill="#fed7aa"
                      fontSize="10.5"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      SHOPPING, COMIDA &amp; MODA
                    </text>
                    <text
                      x={toSvgX(42)}
                      y={toSvgY(-32)}
                      textAnchor="middle"
                      fill="#fdba74"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      Metrópole · Gastronômico (+51) · Moda &amp; Roupa (+85)
                    </text>
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(-53)}
                      textAnchor="middle"
                      fill="#fde68a"
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      ▲ LADEIRA 1 (0,0m → +4,5m) · TERRAÇO COMERCIAL +2,25m ▲
                    </text>
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(-87)}
                      textAnchor="middle"
                      fill="#a7f3d0"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      ÁREA DE RESIDÊNCIA · CIDADE ALTA (11 QUADRAS + PARQUE)
                    </text>
                    <text
                      x={toSvgX(0)}
                      y={toSvgY(-110)}
                      textAnchor="middle"
                      fill="#6ee7b7"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      Patamar +6,75m (Z=-85) → Platô +9,0m (Z=-119) → Mirante +13,8m
                    </text>
                  </svg>
                </div>

                {/* Quick Legend */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-cyan-400/70 border border-cyan-300" />
                    Nascente &amp; Córrego
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-sky-400/50 border border-sky-400" />
                    Prédios (Oeste)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-orange-400/50 border border-orange-400" />
                    Shopping &amp; Lojas (Leste)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-400/50 border border-emerald-400" />
                    Residência &amp; Mirante Sul
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rose-400/50 border border-rose-400" />
                    Morro / Favelas (Norte)
                  </span>
                </div>
              </div>

              {/* Right: Zone List + Detailed Inspector */}
              <div className="xl:col-span-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
                  {GDD_ZONES.map((z) => {
                    const active = z.id === selectedZoneId;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelectedZoneId(z.id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-zinc-900 border-amber-500 text-white'
                            : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span style={{ color: z.colorHex }}>{ZONE_ICONS[z.id]}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{z.shortLabel}</div>
                          <div className="text-[10px] font-mono-tech text-zinc-500 truncate">
                            {z.boundsLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Zone Detail Card */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div
                        className="text-xs font-mono-tech font-medium"
                        style={{ color: selectedZone.colorHex }}
                      >
                        {selectedZone.boundsLabel}
                      </div>
                      <h3 className="font-display text-2xl font-bold text-white mt-0.5">
                        {selectedZone.name}
                      </h3>
                    </div>

                    {onJumpToZone && (
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToZone(ZONE_TO_CAMERA[selectedZone.id]);
                          onClose?.();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Ver no 3D
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedZone.summary}</p>

                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-200">
                      Quadras, Marcos &amp; Coordenadas
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {selectedZone.blocks.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono-tech text-amber-400">{String(i + 1).padStart(2, '0')}.</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-200">
                      Composição de Assets 3D
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-400">
                      {selectedZone.assets.map((a, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-zinc-500">·</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-emerald-400">
                      Regras de Implementação no Unity
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {selectedZone.unityRules.map((u, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{u}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: EXPLICIT MANDATORY DESIGN RULES */}
          {section === 'rules' && (
            <div className="space-y-5">
              <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Regras Explícitas de Projeto (Contrato Obrigatório para Unity)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                    Normas arquitetônicas formais que governam relevo extremo (-0,85m a +13,8m), hidrologia (Nascente + Córrego + Rio com barcos), vegetação botânica multi-galho, sinalização viária, abrigos de ônibus e coerência comercial.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono-tech text-amber-400">
                  <FileText className="w-3.5 h-3.5" />
                  Incluído em GDD_MAPA_3D_UNITY.md
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {GDD_EXPLICIT_RULES.map((rule) => (
                  <div
                    key={rule.code}
                    className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono-tech text-xs font-semibold text-amber-400">
                        {rule.code}
                      </span>
                      <span className="font-mono-tech text-[11px] text-zinc-500">
                        {rule.scope}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white leading-snug">
                      {rule.title}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">{rule.rule}</p>
                    <div className="pt-2 border-t border-zinc-800/80 text-xs">
                      <div className="font-semibold text-emerald-400 mb-1">
                        Exigência de Port no Unity
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{rule.unityRequirement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: MORRO / FAVELA & HYDROLOGY FIXES */}
          {section === 'favelas' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Morro da Esperança, Comércios Autênticos &amp; Hidrologia (Nascente → Rio)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                    Remoção de lojas incoerentes na avenida, instalação da Nascente (+84, +114) e Córrego Sinuoso até o Rio, além da correção completa das fundações, escadões e janelas no <span className="font-mono-tech text-zinc-200">GeradorCidadeInicial.Morro.cs</span>.
                  </p>
                </div>
                {onJumpToZone && (
                  <button
                    type="button"
                    onClick={() => {
                      onJumpToZone('morro');
                      onClose?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 cursor-pointer"
                  >
                    <Mountain className="w-3.5 h-3.5" />
                    Inspecionar Morro &amp; Nascente em 3D
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {GDD_MORRO_FIXES.map((fix, idx) => (
                  <div
                    key={fix.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl"
                  >
                    <div className="lg:col-span-3 space-y-1">
                      <div className="font-mono-tech text-xs text-rose-400">
                        CORREÇÃO {String(idx + 1).padStart(2, '0')}
                      </div>
                      <h3 className="font-display text-lg font-bold text-zinc-100">{fix.area}</h3>
                    </div>

                    <div className="lg:col-span-3 text-xs space-y-1">
                      <div className="font-semibold text-rose-300">O que não fazia sentido / bug</div>
                      <p className="text-zinc-400 leading-relaxed">{fix.bugBefore}</p>
                    </div>

                    <div className="lg:col-span-3 text-xs space-y-1">
                      <div className="font-semibold text-emerald-300">Solução Aplicada no Mapa</div>
                      <p className="text-zinc-200 leading-relaxed">{fix.fixApplied}</p>
                    </div>

                    <div className="lg:col-span-3 text-xs space-y-1">
                      <div className="font-semibold text-amber-300">Implementação Unity C#</div>
                      <p className="text-zinc-300 leading-relaxed">{fix.unityPortRule}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: SEPARATION OF RESIDENCE, SHOPPING & BUILDINGS */}
          {section === 'separation' && (
            <div className="space-y-5">
              <div className="border-b border-zinc-800 pb-4">
                <h2 className="font-display text-2xl font-bold text-white">
                  Separação Estrita: Área de Residência × Shopping × Área de Prédios
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                  Cada distrito ocupa um polígono exclusivo separado por avenidas arteriais (<span className="font-mono-tech text-zinc-200">X = -34</span> e <span className="font-mono-tech text-zinc-200">Z = -68</span>) e pela Praça da Bandeira (<span className="font-mono-tech text-zinc-200">-17, -17</span>), com todas as vitrines voltadas para vias acessíveis.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {GDD_SEPARATION_RULES.map((rule, idx) => {
                  const presets: CityCameraPreset[] = ['downtown', 'shops', 'residential'];
                  return (
                    <div
                      key={rule.district}
                      className="flex flex-col justify-between p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4"
                    >
                      <div className="space-y-3">
                        <div>
                          <div className="font-mono-tech text-xs text-amber-400">
                            {rule.coordinates}
                          </div>
                          <h3 className="font-display text-xl font-bold text-white mt-0.5">
                            {rule.district}
                          </h3>
                        </div>

                        <div className="text-xs space-y-1 pt-2 border-t border-zinc-800/80">
                          <div className="font-semibold text-zinc-200">Fronteira de Separação</div>
                          <p className="text-zinc-400 leading-relaxed">{rule.borderRule}</p>
                        </div>

                        <div className="text-xs space-y-1 pt-2 border-t border-zinc-800/80">
                          <div className="font-semibold text-rose-300">Conflitos Removidos</div>
                          <p className="text-zinc-400 leading-relaxed">{rule.whatRemoved}</p>
                        </div>

                        <div className="text-xs space-y-1 pt-2 border-t border-zinc-800/80">
                          <div className="font-semibold text-emerald-300">Estrutura Consolidada</div>
                          <p className="text-zinc-200 leading-relaxed">{rule.whatAdded}</p>
                        </div>
                      </div>

                      {onJumpToZone && (
                        <button
                          type="button"
                          onClick={() => {
                            onJumpToZone(presets[idx]);
                            onClose?.();
                          }}
                          className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-amber-500/70 cursor-pointer"
                        >
                          Focar Área no Mapa 3D
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 5: UNITY PORT ARCHITECTURE & CHECKLIST */}
          {section === 'unity' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h2 className="font-display text-xl font-bold text-white">
                  Hierarquia, Layers &amp; NavMesh no Unity
                </h2>
                <pre className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] font-mono-tech text-zinc-300 overflow-x-auto leading-relaxed">
{`MetropoleCidadeNova (Scene Root)
├─ 00_Sistema
│  ├─ CidadeSemaforoControlador (ciclo 16s + 3 pórticos)
│  ├─ TrafegoCidade50 (pitch 0m..+9m + 5 barcos + 2 helis)
│  ├─ GeradorDeNpcs (CidadePedestreAgente -0,85m..+13,8m)
│  └─ CidadeOtimizadorRuntime (LOD + GPU Instancing vegetal)
├─ 01_Hidrologia_Praia_Cais (Cais -0,85m · Praia Leste · Rio · Nascente)
├─ 02_Area_Predios_Oeste (X -102..-34 · Y=0m / +2,25m)
├─ 03_Area_Shopping_Comercio (Shopping + Moda + Quiosques + MUPI)
├─ 04_Residencia_Escola_Mirante (10 quadras + E.M. Cidade Nova + Mirante +13,8m)
└─ 05_Morro_Esperanca_Norte (|X|<=66 · Lojas Base · Nascente)`}
                </pre>

                <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                  <div className="font-semibold text-zinc-100">Regras de Física &amp; Navegação</div>
                  <p>
                    <strong className="text-amber-400">Colliders &amp; Relevo Extremo:</strong> Tabuleiros das 5 pontes em <span className="font-mono-tech">Y = 0.04m</span>; Cais Baixo em <span className="font-mono-tech">-0.85m</span>; pistas N–S seguem <span className="font-mono-tech">cityRoadY(z)</span> até <span className="font-mono-tech">+9.0m</span> e rampa sobe até o Mirante Sul em <span className="font-mono-tech">+13.8m</span>.
                  </p>
                  <p>
                    <strong className="text-amber-400">NavMesh &amp; OffMeshLinks:</strong> Agente Humanoid (<span className="font-mono-tech">Max Slope 42°</span>) cobrindo calçadas, escadas do Cais Baixo, escadarias comerciais (<span className="font-mono-tech">Z = -39.5 / -59.8</span>), Passarela (<span className="font-mono-tech">+34,-17</span>), pinguela do córrego (<span className="font-mono-tech">Z = 62</span>) e os 3 escadões (<span className="font-mono-tech">-46, -16, +34</span>).
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                {GDD_UNITY_CHECKLIST.map((phase) => (
                  <div
                    key={phase.phase}
                    className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-zinc-100">
                        {phase.phase}
                      </h3>
                      <span className="font-mono-tech text-xs text-amber-400">
                        {phase.script}
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {phase.tasks.map((t, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
