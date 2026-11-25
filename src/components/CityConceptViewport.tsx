import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  Moon,
  Pause,
  Play,
  Sun,
  Sunset,
  Wind,
  X,
} from 'lucide-react';
import { CityCameraPreset, CityTimeOfDay } from '../types/vehicle';
import { CITY_HOTSPOTS, CityConceptController } from '../three/cityConceptScene';
import { MapGddView } from './MapGddView';

const CAMERA_TABS: { id: CityCameraPreset; label: string }[] = [
  { id: 'overview', label: 'Visão Geral' },
  { id: 'downtown', label: 'Prédios' },
  { id: 'condos', label: 'Moradia Larga' },
  { id: 'corporate', label: 'Vendas & Outdoors' },
  { id: 'shops', label: 'Shopping' },
  { id: 'residential', label: 'Residencial' },
  { id: 'school', label: 'Escola Pública' },
  { id: 'beach', label: 'Praia & Ilha' },
  { id: 'morro', label: 'Morro / Favelas' },
  { id: 'bridges', label: 'Pontes & Rio' },
  { id: 'flag', label: 'Bandeira' },
  { id: 'traffic', label: 'Semáforos' },
];

const TIME_MODES: { id: CityTimeOfDay; label: string; icon: React.ReactNode }[] = [
  { id: 'sunset', label: 'Pôr do Sol', icon: <Sunset className="w-3.5 h-3.5" /> },
  { id: 'day', label: 'Dia', icon: <Sun className="w-3.5 h-3.5" /> },
  { id: 'night', label: 'Noite', icon: <Moon className="w-3.5 h-3.5" /> },
];

export const CityConceptViewport: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<CityConceptController | null>(null);

  const [activePreset, setActivePreset] = useState<CityCameraPreset>('overview');
  const [timeOfDay, setTimeOfDay] = useState<CityTimeOfDay>('sunset');
  const [wind, setWind] = useState(1.0);
  const [paused, setPaused] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [gddOpen, setGddOpen] = useState(false);
  const [trafficPhase, setTrafficPhase] = useState('Avenidas N-S: Verde · Cruzamentos E-O: Pare');

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const ctrl = new CityConceptController(el, {
      onTrafficPhase: (label) => setTrafficPhase(label),
      onHotspotSelect: (preset) => {
        setActivePreset(preset);
        setNotesOpen(true);
      },
    });
    ctrlRef.current = ctrl;

    return () => {
      ctrl.dispose();
      ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handlePreset = (preset: CityCameraPreset) => {
    setActivePreset(preset);
    ctrlRef.current?.setCameraPreset(preset, false);
  };

  const handleTime = (mode: CityTimeOfDay) => {
    setTimeOfDay(mode);
    ctrlRef.current?.applyTimeOfDay(mode);
  };

  const handleWind = (val: number) => {
    setWind(val);
    ctrlRef.current?.setWindStrength(val);
  };

  const handleTogglePause = () => {
    const next = !paused;
    setPaused(next);
    ctrlRef.current?.setSimPaused(next);
  };

  const hotspot = CITY_HOTSPOTS[activePreset];

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[#1b1526]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Clean Editorial Title & Unboxed Live Traffic State */}
      <div className="pointer-events-none absolute top-5 left-6 z-10 max-w-xl">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
          <span>Concept Art 3D Interativa</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span className="text-zinc-300">{hotspot.subtitle}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-0.5 leading-none">
          {hotspot.title}
        </h1>
        <p className="text-xs text-zinc-300 mt-1.5 font-mono-tech">
          {trafficPhase}
        </p>
      </div>

      {/* Top-Right Actions: GDD Mapa 3D & Concept Notes */}
      <div className="absolute top-5 right-6 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setNotesOpen(false);
            setGddOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          GDD Mapa 3D (Unity)
        </button>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
        >
          <Info className="w-3.5 h-3.5 text-amber-400" />
          {notesOpen ? 'Fechar Detalhes' : 'Detalhes do Conceito'}
        </button>
      </div>

      {/* Optional Slide-Over Concept Details Drawer */}
      {notesOpen && (
        <aside className="absolute top-0 right-0 bottom-0 w-96 max-w-[92vw] bg-zinc-950 border-l border-zinc-800 z-20 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <div className="text-xs font-medium text-amber-400">{hotspot.subtitle}</div>
              <h2 className="font-display text-xl font-bold text-zinc-100">{hotspot.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900 cursor-pointer"
              aria-label="Fechar detalhes"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-2">Destaques desta Área</div>
              <ul className="space-y-2.5 text-xs text-zinc-300 leading-relaxed">
                {hotspot.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono-tech text-amber-500">{String(i + 1).padStart(2, '0')}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-medium text-zinc-500 mb-2">Inspecionar Outras Áreas</div>
              <div className="grid grid-cols-2 gap-1.5">
                {CAMERA_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handlePreset(tab.id)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      activePreset === tab.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 leading-relaxed">
              Arraste o mouse para girar a câmera, role para aproximar ou clique diretamente na Bandeira, Lojas, Pontes ou Morro para focar. Diga o que quer ajustar antes de portarmos tudo para o Unity.
            </div>
          </div>
        </aside>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(1080px,96vw)] transition-transform duration-200 ease-out ${
          dockCollapsed ? 'translate-y-[calc(100%+20px)]' : 'translate-y-0'
        }`}
      >
        <div className="flex justify-center -mb-px">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            style={{ transform: dockCollapsed ? 'translateY(-36px)' : 'none' }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 border-b-0 rounded-t-lg hover:text-white transition-all cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {dockCollapsed ? 'Mostrar Controles (H)' : 'Ocultar Controles (H)'}
          </button>
        </div>

        <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl px-4 py-3 space-y-2.5 shadow-2xl">
          {/* Row 1: Camera Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto max-w-full">
              {CAMERA_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handlePreset(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activePreset === tab.id
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {TIME_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleTime(m.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    timeOfDay === m.id
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Wind Control on Monumental Flag + Simulation Pause */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800/80">
            <label className="flex items-center gap-3 text-xs text-zinc-300 min-w-[240px] flex-1 max-w-sm">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-400">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                Vento na Bandeira
              </span>
              <input
                type="range"
                min={0.2}
                max={2.0}
                step={0.05}
                value={wind}
                onChange={(e) => handleWind(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono-tech text-zinc-200 w-10 text-right">
                {Math.round(wind * 100)}%
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePause}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 whitespace-nowrap cursor-pointer"
              >
                {paused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                {paused ? 'Retomar Cidade' : 'Pausar Trânsito'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen GDD Modal Overlay */}
      {gddOpen && (
        <div className="absolute inset-0 z-30 flex flex-col bg-zinc-950">
          <MapGddView
            onClose={() => setGddOpen(false)}
            onJumpToZone={(preset) => {
              handlePreset(preset);
            }}
          />
        </div>
      )}
    </div>
  );
};
