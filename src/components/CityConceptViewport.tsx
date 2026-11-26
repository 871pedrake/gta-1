import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Car,
  ChevronDown,
  ChevronUp,
  Eye,
  Info,
  Lightbulb,
  Moon,
  Pause,
  Play,
  Siren,
  Sun,
  Sunset,
  Wind,
  X,
} from 'lucide-react';
import { CityCameraPreset, CityTimeOfDay } from '../types/vehicle';
import {
  CITY_HOTSPOTS,
  CityConceptController,
  PlayerDriveState,
} from '../three/cityConceptScene';
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

const TEST_DRIVE_VEHICLES: { id: number; label: string }[] = [
  { id: 24, label: 'Polícia Interceptador' },
  { id: 27, label: 'Ambulância SAMU' },
  { id: 28, label: 'Bombeiros Autobomba' },
  { id: 49, label: 'Heli Bombeiros' },
  { id: 48, label: 'Heli Polícia' },
  { id: 72, label: 'Moto Streetfighter' },
  { id: 78, label: 'Moto Polícia' },
  { id: 79, label: 'Triciclo Esportivo' },
  { id: 83, label: 'Jet Ski Resgate' },
  { id: 44, label: 'Lancha Ipanema' },
  { id: 9, label: 'Superesportivo V12' },
  { id: 102, label: 'Bicicleta Speed' },
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
  const [driveState, setDriveState] = useState<PlayerDriveState | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const ctrl = new CityConceptController(el, {
      onTrafficPhase: (label) => setTrafficPhase(label),
      onHotspotSelect: (preset) => {
        setActivePreset(preset);
        setNotesOpen(true);
      },
      onDriveStateChange: (state) => setDriveState(state),
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
    if (driveState) {
      ctrlRef.current?.stopDriving();
    }
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

  const handleToggleDrive = (vehicleId = 24) => {
    if (driveState) {
      ctrlRef.current?.stopDriving();
    } else {
      ctrlRef.current?.startDriving(vehicleId);
    }
  };

  const hotspot = CITY_HOTSPOTS[activePreset];

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[#1b1526]">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Clean Editorial Title & Unboxed Live Traffic State */}
      <div className="pointer-events-none absolute top-5 left-6 z-10 max-w-xl">
        <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
          <span>{driveState ? 'Teste de Direção no Mapa' : 'Concept Art 3D Interativa'}</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span className="text-zinc-300">
            {driveState ? driveState.vehicleName : hotspot.subtitle}
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mt-0.5 leading-none">
          {driveState ? `${driveState.speedKmh} km/h` : hotspot.title}
        </h1>
        <p className="text-xs text-zinc-300 mt-1.5 font-mono-tech">
          {driveState
            ? driveState.kind === 'helicopter'
              ? 'WASD Mover · Espaço/Shift Subir/Descer · Q/E Pisca · F Farol · G Sirene · C Câmera · Esc Sair'
              : 'WASD Dirigir · Q/E/X Pisca · F Farol · G Sirene · C Câmera Volante · Esc Sair'
            : trafficPhase}
        </p>
      </div>

      {/* Top-Right Actions: GDD Mapa 3D & Concept Notes */}
      <div className="absolute top-5 right-6 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleToggleDrive(24)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            driveState
              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
              : 'bg-zinc-900 text-zinc-100 border border-zinc-700 hover:border-amber-500/60 hover:text-amber-300'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          {driveState ? 'Sair do Veículo' : 'Dirigir no Mapa'}
        </button>
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
              Arraste o mouse para girar a câmera, role para aproximar ou clique diretamente na Bandeira, Lojas, Pontes ou Morro para focar. Use &quot;Dirigir no Mapa&quot; para testar volantes, rodas, piscas, faróis e sirenes em tempo real.
            </div>
          </div>
        </aside>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(1120px,96vw)] transition-transform duration-200 ease-out ${
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
          {/* Row 1: Driving Bar OR Camera Presets */}
          {driveState ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-x-auto max-w-full">
                {TEST_DRIVE_VEHICLES.map((tv) => (
                  <button
                    key={tv.id}
                    type="button"
                    onClick={() => ctrlRef.current?.startDriving(tv.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      driveState.vehicleId === tv.id
                        ? 'bg-amber-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    {tv.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
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
          )}

          {/* Row 2: Driving Controls OR Wind & Simulation Pause */}
          {driveState ? (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    ctrlRef.current?.setPlayerCameraMode(
                      driveState.cameraMode === 'chase' ? 'cockpit' : 'chase',
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    driveState.cameraMode === 'cockpit'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  {driveState.cameraMode === 'cockpit' ? 'Câmera: Volante (C)' : 'Câmera: Externa (C)'}
                </button>

                <button
                  type="button"
                  onClick={() => ctrlRef.current?.setPlayerLights(!driveState.lightsOn)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    driveState.lightsOn
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Farol (F)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    ctrlRef.current?.setPlayerBlinker(
                      driveState.blinker === 'left' ? 'off' : 'left',
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    driveState.blinker === 'left' || driveState.blinker === 'hazard'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Esq (Q)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    ctrlRef.current?.setPlayerBlinker(
                      driveState.blinker === 'right' ? 'off' : 'right',
                    )
                  }
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    driveState.blinker === 'right' || driveState.blinker === 'hazard'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Dir (E)
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    ctrlRef.current?.setPlayerBlinker(
                      driveState.blinker === 'hazard' ? 'off' : 'hazard',
                    )
                  }
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    driveState.blinker === 'hazard'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Pisca-Alerta (X)
                </button>

                {driveState.hasSiren && (
                  <button
                    type="button"
                    onClick={() => ctrlRef.current?.setPlayerSiren(!driveState.sirenOn)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                      driveState.sirenOn
                        ? 'bg-red-500/20 border-red-500 text-red-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Siren className="w-3.5 h-3.5" />
                    Sirene (G)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {TIME_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleTime(m.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
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
          ) : (
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
                  onClick={() => handleToggleDrive(24)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-lg hover:bg-amber-500/20 whitespace-nowrap cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5" />
                  Testar Direção no Mapa
                </button>
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
          )}
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
