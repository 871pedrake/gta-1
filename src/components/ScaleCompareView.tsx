import React, { useEffect, useRef, useState } from 'react';
import { VehicleConcept } from '../types/vehicle';
import { ScaleCompareController } from '../three/compareScene';

interface ScaleCompareViewProps {
  vehicles: VehicleConcept[];
}

export const ScaleCompareView: React.FC<ScaleCompareViewProps> = ({ vehicles }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ScaleCompareController | null>(null);

  // Default 4 distinct scales: Hatch, Supercar, Articulated Bus / Firetruck, Helicopter
  const [slotIds, setSlotIds] = useState<number[]>([1, 11, 31, 48]);

  const selectedList = slotIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter((v): v is VehicleConcept => Boolean(v));

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = new ScaleCompareController(el);
    controllerRef.current = ctrl;
    ctrl.setLineup(selectedList);

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setLineup(selectedList);
  }, [slotIds]);

  const updateSlot = (slotIndex: number, newId: number) => {
    setSlotIds((prev) => prev.map((id, idx) => (idx === slotIndex ? newId : id)));
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-[#0b0b0f]">
      {/* 3D Comparison Stage */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        <div className="pointer-events-none absolute top-5 left-6 z-10 max-w-lg">
          <div className="text-xs font-mono-tech text-amber-400">CALIBRAÇÃO MÉTRICA UNITY (1 UNIDADE = 1 METRO)</div>
          <h1 className="font-display text-3xl font-bold text-zinc-100 mt-0.5">
            Comparativo de Escala 1:1
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Boneco azul à esquerda representa o jogador/NPC de 1,75m (AparenciaPersonagem.cs). Arraste para orbitar.
          </p>
        </div>
      </div>

      {/* Bottom Slot Selector & Tabular Spec Comparison */}
      <div className="shrink-0 bg-zinc-950 border-t border-zinc-800 px-6 py-4">
        <div className="max-w-[1360px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedList.map((v, idx) => (
            <div key={idx} className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono-tech text-amber-400">SLOT {idx + 1}</span>
                <span className="text-[11px] font-mono-tech text-zinc-400">{v.unitySpec.controlType}</span>
              </div>
              <select
                value={v.id}
                onChange={(e) => updateSlot(idx, Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-zinc-950 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                {vehicles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-[11px] font-mono-tech text-zinc-400 pt-1">
                <span>{v.dimensions.length.toFixed(2)}m C × {v.dimensions.width.toFixed(2)}m L</span>
                <span>{v.dimensions.height.toFixed(2)}m A</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
