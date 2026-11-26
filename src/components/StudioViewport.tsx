import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  DoorOpen,
  Eye,
  Grid3x3,
  Layers,
  Lightbulb,
  RotateCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  PaintFinish,
  PaintLivery,
  StudioCameraPreset,
  VehicleConcept,
  WheelStyle,
} from '../types/vehicle';
import { VehicleStudioController } from '../three/studioScene';
import { VEHICLE_CATEGORIES } from '../data/vehicles50';
import { VEHICLE_TIER_CLASSES } from '../data/vehicleClassifications';

interface StudioViewportProps {
  vehicles: VehicleConcept[];
  selectedVehicle: VehicleConcept;
  onSelectVehicle: (v: VehicleConcept) => void;
  onOpenUnityExport: () => void;
}

const PAINT_SWATCHES = [
  { label: 'Azul Cobalto', hex: '#2563EB' },
  { label: 'Azul Retrô 80s', hex: '#3B82F6' },
  { label: 'Magenta 80s', hex: '#E11D74' },
  { label: 'Vermelho Corsa', hex: '#DC2626' },
  { label: 'Âmbar Solar', hex: '#F59E0B' },
  { label: 'Verde Esmeralda', hex: '#059669' },
  { label: 'Prata Titânio', hex: '#94A3B8' },
  { label: 'Preto Ônix', hex: '#18181B' },
  { label: 'Branco Pérola', hex: '#F8FAFC' },
  { label: 'Laranja Rally', hex: '#EA580C' },
];

const FINISH_OPTIONS: { id: PaintFinish; label: string }[] = [
  { id: 'metallic', label: 'Metálico' },
  { id: 'gloss', label: 'Brilho' },
  { id: 'matte', label: 'Fosco' },
  { id: 'pearl', label: 'Pérola' },
];

const LIVERY_OPTIONS: { id: PaintLivery; label: string }[] = [
  { id: 'solid', label: 'Sólida' },
  { id: 'racing_stripes', label: 'Faixa Dupla' },
  { id: 'two_tone', label: 'Bicolor' },
  { id: 'side_stripe', label: 'Faixa Lateral' },
  { id: 'rally', label: 'Rally' },
  { id: 'squadron', label: 'Esquadrão' },
];

const WHEEL_OPTIONS: { id: WheelStyle; label: string }[] = [
  { id: 'retro_turbofan', label: 'Turbofan 80s' },
  { id: 'deep_dish_6', label: 'Deep Dish 6' },
  { id: 'bbs_mesh', label: 'BBS Mesh' },
  { id: 'sport_5spoke', label: '5 Raios Sport' },
  { id: 'aero_blade', label: 'Aero Blade' },
  { id: 'wire_spoke', label: 'Raiada Wire' },
  { id: 'classic_whitewall', label: 'Faixa Branca' },
  { id: 'offroad_beadlock', label: 'Off-Road' },
  { id: 'city_alloy', label: 'Urbana Liga' },
  { id: 'moto_sport', label: 'Moto Sport' },
  { id: 'moto_spoke', label: 'Moto Raiada' },
  { id: 'aircraft_gear', label: 'Trem Pouso' },
];

const CAMERA_PRESETS: { id: StudioCameraPreset; label: string }[] = [
  { id: 'hero', label: '3/4 Hero' },
  { id: 'side', label: 'Lateral' },
  { id: 'front', label: 'Frontal' },
  { id: 'rear', label: 'Traseira' },
  { id: 'top', label: 'Topo' },
];

export const StudioViewport: React.FC<StudioViewportProps> = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onOpenUnityExport,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<VehicleStudioController | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('Todas');

  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [partsCount, setPartsCount] = useState<number>(0);
  const [openablesCount, setOpenablesCount] = useState<number>(0);

  const [activePreset, setActivePreset] = useState<StudioCameraPreset>('hero');
  const [explode, setExplode] = useState(0);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [animateSystems, setAnimateSystems] = useState(true);
  const [lightsOn, setLightsOn] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [paintHex, setPaintHex] = useState(selectedVehicle.palette.primary);
  const [paintFinish, setPaintFinish] = useState<PaintFinish>(selectedVehicle.palette.finish);
  const [paintLivery, setPaintLivery] = useState<PaintLivery>(selectedVehicle.palette.livery ?? 'solid');
  const [wheelStyle, setWheelStyle] = useState<WheelStyle>(selectedVehicle.geometry.wheelStyle);

  const latestPropsRef = useRef({ vehicles, selectedVehicle, onSelectVehicle });
  latestPropsRef.current = { vehicles, selectedVehicle, onSelectVehicle };
  const loadedVehicleIdRef = useRef<number | null>(null);
  const lastStepMsRef = useRef<number>(0);

  // Initialize Three.js Studio once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const studio = new VehicleStudioController(el, {
      onHoverPart: (label) => setHoveredPart((prev) => (prev === label ? prev : label)),
      onPartsCount: (count) => setPartsCount((prev) => (prev === count ? prev : count)),
      onOpenablesCount: (count) => setOpenablesCount((prev) => (prev === count ? prev : count)),
    });
    studioRef.current = studio;
    const initialVehicle = latestPropsRef.current.selectedVehicle;
    loadedVehicleIdRef.current = initialVehicle.id;
    studio.setVehicle(initialVehicle, false);

    return () => {
      studio.dispose();
      studioRef.current = null;
      loadedVehicleIdRef.current = null;
    };
  }, []);

  // Update vehicle only when selectedVehicle.id actually changes after mount
  useEffect(() => {
    if (loadedVehicleIdRef.current === selectedVehicle.id) return;
    loadedVehicleIdRef.current = selectedVehicle.id;
    setPaintHex(selectedVehicle.palette.primary);
    setPaintFinish(selectedVehicle.palette.finish);
    setPaintLivery(selectedVehicle.palette.livery ?? 'solid');
    setWheelStyle(selectedVehicle.geometry.wheelStyle);
    setActivePreset('hero');
    setExplode(0);
    setDoorsOpen(false);
    studioRef.current?.setExplode(0);
    studioRef.current?.setDoorsOpen(false);
    studioRef.current?.setVehicle(selectedVehicle, false);
  }, [selectedVehicle]);

  const handleStep = (dir: -1 | 1) => {
    const { vehicles: list, selectedVehicle: current, onSelectVehicle: select } = latestPropsRef.current;
    if (list.length === 0) return;
    const idx = list.findIndex((v) => v.id === current.id);
    const baseIdx = idx >= 0 ? idx : 0;
    const nextIdx = (baseIdx + dir + list.length) % list.length;
    const next = list[nextIdx];
    if (next && next.id !== current.id) {
      select(next);
    }
  };

  // Keyboard shortcut H to toggle dock, Left/Right arrows for vehicle switching (registered once)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        if (e.repeat) return;
        setDockCollapsed((prev) => !prev);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const now = performance.now();
        if (e.repeat && now - lastStepMsRef.current < 160) return;
        lastStepMsRef.current = now;
        handleStep(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handlePreset = (preset: StudioCameraPreset) => {
    setActivePreset(preset);
    studioRef.current?.setCameraPreset(preset, false);
  };

  const handleExplode = (val: number) => {
    setExplode(val);
    studioRef.current?.setExplode(val);
  };

  const handleToggleDoors = () => {
    const next = !doorsOpen;
    setDoorsOpen(next);
    studioRef.current?.setDoorsOpen(next);
  };

  const handleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    studioRef.current?.setAutoRotate(next);
  };

  const handleAnimateSystems = () => {
    const next = !animateSystems;
    setAnimateSystems(next);
    studioRef.current?.setAnimateSystems(next);
  };

  const handleLights = () => {
    const next = !lightsOn;
    setLightsOn(next);
    studioRef.current?.setLightsOn(next);
  };

  const handleWireframe = () => {
    const next = !wireframe;
    setWireframe(next);
    studioRef.current?.setWireframe(next);
  };

  const handlePaintChange = (hex: string, finish: PaintFinish) => {
    setPaintHex(hex);
    setPaintFinish(finish);
    studioRef.current?.updateCustomPaint(hex, finish);
  };

  const handleLiveryChange = (nextLivery: PaintLivery) => {
    setPaintLivery(nextLivery);
    studioRef.current?.updateCustomization({ livery: nextLivery });
  };

  const handleWheelChange = (nextWheel: WheelStyle) => {
    setWheelStyle(nextWheel);
    studioRef.current?.updateCustomization({ wheelStyle: nextWheel });
  };

  const filteredPicker = vehicles.filter((v) => {
    const matchCat =
      pickerCategory === 'Todas' ||
      v.category === pickerCategory ||
      v.tierClass === pickerCategory;
    const q = pickerSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.code.toLowerCase().includes(q) ||
      (v.tierClass ?? '').toLowerCase().includes(q) ||
      v.roleInCity.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[#0b0b0f]">
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top-Left Minimal Spec Header (unboxed metadata, no pills, solid bg-zinc-950/90) */}
      <div className="pointer-events-none absolute top-5 left-6 z-10 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-amber-400 font-mono-tech">
          <span>{selectedVehicle.code}</span>
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="text-zinc-300 font-sans">{selectedVehicle.tierClass ?? selectedVehicle.category}</span>
          {selectedVehicle.performanceRank && (
            <>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span className="text-emerald-400">{selectedVehicle.performanceRank}</span>
            </>
          )}
          <span aria-hidden="true" className="text-zinc-600">·</span>
          <span className="text-zinc-400">{selectedVehicle.id} / {vehicles.length}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 mt-0.5 leading-none">
          {selectedVehicle.name}
        </h1>
        <p className="text-xs text-zinc-400 mt-1.5 font-mono-tech">
          {selectedVehicle.dimensions.length.toFixed(2)}m C × {selectedVehicle.dimensions.width.toFixed(2)}m L × {selectedVehicle.dimensions.height.toFixed(2)}m A
          <span className="mx-2 text-zinc-600">·</span>
          {selectedVehicle.unitySpec.maxSpeedKmh} km/h
          <span className="mx-2 text-zinc-600">·</span>
          {partsCount} submalhas 3D
          {openablesCount > 0 && (
            <>
              <span className="mx-2 text-zinc-600">·</span>
              {openablesCount} aberturas articuladas
            </>
          )}
        </p>
        {hoveredPart && (
          <div className="mt-2 inline-block px-2.5 py-1 bg-zinc-900/95 border border-zinc-700 rounded text-xs text-amber-300">
            Peça: {hoveredPart}
          </div>
        )}
      </div>

      {/* Quick Top-Right Action for Technical Sheet (only opens drawer on click) */}
      <div className="absolute top-5 right-6 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSpecsOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          {specsOpen ? 'Fechar Ficha' : 'Ficha Técnica'}
        </button>
      </div>

      {/* Optional Slide-Over Technical Sheet Drawer (solid surface, no backdrop-blur) */}
      {specsOpen && (
        <aside className="absolute top-0 right-0 bottom-0 w-96 max-w-[92vw] bg-zinc-950 border-l border-zinc-800 z-20 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div>
              <div className="text-xs font-mono-tech text-amber-400">{selectedVehicle.code}</div>
              <h2 className="font-display text-xl font-bold text-zinc-100">{selectedVehicle.name}</h2>
            </div>
            <button
              type="button"
              onClick={() => setSpecsOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-900 cursor-pointer"
              aria-label="Fechar ficha técnica"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1">
                Classificação Unity · {selectedVehicle.performanceRank ?? selectedVehicle.category}
              </div>
              <p className="text-zinc-200 leading-relaxed">
                {selectedVehicle.classificationDescription ?? selectedVehicle.conceptSummary}
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-medium text-zinc-500 mb-1">Conceito Visual</div>
              <p className="text-zinc-300 leading-relaxed">{selectedVehicle.conceptSummary}</p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-medium text-zinc-500 mb-1">Papel na Cidade</div>
              <p className="text-zinc-300">{selectedVehicle.roleInCity}</p>
              <p className="text-xs text-zinc-500 mt-1">Zona de Spawn: {selectedVehicle.unitySpec.spawnZone}</p>
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-medium text-zinc-500 mb-2">Especificações Unity (Escala 1:1)</div>
              <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                <div>
                  <dt className="text-zinc-500">Controlador</dt>
                  <dd className="font-mono-tech text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.controlType}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Tração</dt>
                  <dd className="text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.driveType}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Vel. Máxima</dt>
                  <dd className="font-mono-tech text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.maxSpeedKmh} km/h</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Massa Rigidbody</dt>
                  <dd className="font-mono-tech text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.massKg} kg</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Aceleração</dt>
                  <dd className="font-mono-tech text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.acceleration} m/s²</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Assentos / NPCs</dt>
                  <dd className="font-mono-tech text-zinc-200 mt-0.5">{selectedVehicle.unitySpec.seats} lugares</dd>
                </div>
              </dl>
            </div>

            <div className="pt-4 border-t border-zinc-800/80">
              <div className="text-xs font-medium text-zinc-500 mb-2">Peças Trabalhadas no Modelo</div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {selectedVehicle.craftedParts.map((part, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-mono-tech text-amber-500/80">{String(i + 1).padStart(2, '0')}.</span>
                    <span>{part}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              type="button"
              onClick={onOpenUnityExport}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              Gerar Script C# Unity deste Veículo
            </button>
          </div>
        </aside>
      )}

      {/* Quick Vehicle Picker Popover */}
      {pickerOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75">
          <div className="w-full max-w-3xl max-h-[82vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-800">
              <h2 className="font-display text-lg font-bold text-zinc-100">Selecionar Veículo ({vehicles.length} Modelos)</h2>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar por nome, código (VHC-14) ou função..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {Array.from(new Set(['Todas', ...VEHICLE_TIER_CLASSES, ...VEHICLE_CATEGORIES])).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPickerCategory(cat)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      pickerCategory === cat
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredPicker.map((v) => {
                const active = v.id === selectedVehicle.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onSelectVehicle(v);
                      setPickerOpen(false);
                    }}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-zinc-900 border-amber-500 text-white'
                        : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono-tech text-zinc-500 truncate">
                        {v.code} · {v.performanceRank ?? v.category} · {v.tierClass ?? v.category}
                      </div>
                      <div className="text-sm font-semibold truncate">{v.name}</div>
                    </div>
                    <span
                      className="w-4 h-4 rounded-sm shrink-0 border border-white/15"
                      style={{ backgroundColor: v.palette.primary }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(960px,95vw)] transition-transform duration-200 ease-out ${
          dockCollapsed ? 'translate-y-[calc(100%+20px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand tab attached to top edge */}
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
          {/* Row 1: Vehicle Switcher + Camera Angles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                className="p-2 text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-700 cursor-pointer"
                aria-label="Veículo anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-amber-500/60 text-left transition-colors min-w-[200px] max-w-[260px] cursor-pointer"
              >
                <div className="text-[11px] font-mono-tech text-amber-400 leading-tight">
                  {selectedVehicle.code} · Trocar modelo
                </div>
                <div className="text-xs font-semibold text-zinc-100 truncate">
                  {selectedVehicle.name}
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                className="p-2 text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg hover:text-white hover:border-zinc-700 cursor-pointer"
                aria-label="Próximo veículo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Angle Presets */}
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              {CAMERA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePreset(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    activePreset === p.id
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              {openablesCount > 0 && (
                <button
                  type="button"
                  onClick={handleToggleDoors}
                  title="Abrir / Fechar Portas, Capô, Canopy e Compartimentos"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer ${
                    doorsOpen
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5" />
                  {doorsOpen ? 'Fechar Portas' : 'Abrir Portas'}
                </button>
              )}
              <button
                type="button"
                onClick={handleLights}
                title="Faróis e Giroflex"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer ${
                  lightsOn
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Luzes
              </button>
              <button
                type="button"
                onClick={handleAutoRotate}
                title="Girar Plataforma"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer ${
                  autoRotate
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
                Girar
              </button>
              <button
                type="button"
                onClick={handleAnimateSystems}
                title="Rodas, Hélices e Rotores"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer ${
                  animateSystems
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Sistemas
              </button>
              <button
                type="button"
                onClick={handleWireframe}
                title="Modo Malha Wireframe"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap cursor-pointer ${
                  wireframe
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                Malha
              </button>
            </div>
          </div>

          {/* Row 2: Exploded View + Paint Swatches & Finish */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800/80">
            {/* Exploded View Slider */}
            <label className="flex items-center gap-3 text-xs text-zinc-300 min-w-[230px] flex-1 max-w-xs">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Vista Explodida
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => handleExplode(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono-tech text-zinc-200 w-9 text-right">
                {Math.round(explode * 100)}%
              </span>
            </label>

            {/* Paint Color Swatches + Finish */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePaintChange(selectedVehicle.palette.primary, paintFinish)}
                  title="Cor Original do Conceito"
                  className={`w-5 h-5 rounded border cursor-pointer ${
                    paintHex === selectedVehicle.palette.primary
                      ? 'border-amber-400 scale-110'
                      : 'border-zinc-700'
                  }`}
                  style={{ backgroundColor: selectedVehicle.palette.primary }}
                />
                {PAINT_SWATCHES.map((sw) => (
                  <button
                    key={sw.hex}
                    type="button"
                    onClick={() => handlePaintChange(sw.hex, paintFinish)}
                    title={sw.label}
                    className={`w-5 h-5 rounded border transition-transform cursor-pointer ${
                      paintHex === sw.hex
                        ? 'border-amber-400 scale-110'
                        : 'border-zinc-700 hover:scale-105'
                    }`}
                    style={{ backgroundColor: sw.hex }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
                {FINISH_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handlePaintChange(paintHex, f.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer ${
                      paintFinish === f.id
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Livery Style & Wheel Style Customizer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs">
            <label className="flex items-center gap-2 text-zinc-400">
              <span className="whitespace-nowrap">Pintura / Faixas</span>
              <select
                value={paintLivery}
                onChange={(e) => handleLiveryChange(e.target.value as PaintLivery)}
                className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {LIVERY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedVehicle.geometry.wheelStyle !== 'none' && (
              <label className="flex items-center gap-2 text-zinc-400">
                <span className="whitespace-nowrap">Modelo de Roda</span>
                <select
                  value={wheelStyle}
                  onChange={(e) => handleWheelChange(e.target.value as WheelStyle)}
                  className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {WHEEL_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <span className="text-[11px] font-mono-tech text-zinc-500 hidden md:inline">
              Vidros aparentes · Retrovisores · Escapes ({selectedVehicle.geometry.exhaustStyle ?? 'padrão'})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
