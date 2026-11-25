import React, { useState } from 'react';
import { AppViewMode, VehicleConcept } from './types/vehicle';
import { VEHICLES_50 } from './data/vehicles50';
import { TopBar } from './components/TopBar';
import { CityConceptViewport } from './components/CityConceptViewport';
import { StudioViewport } from './components/StudioViewport';
import { CatalogGrid } from './components/CatalogGrid';
import { ScaleCompareView } from './components/ScaleCompareView';
import { UnityExportView } from './components/UnityExportView';
import { exportConceptArtSheetPng } from './utils/unityExporter';

export function App() {
  const [activeView, setActiveView] = useState<AppViewMode>('city');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleConcept>(VEHICLES_50[0]);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSheet = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportConceptArtSheetPng(selectedVehicle);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        onExportSheet={handleExportSheet}
        isExporting={isExporting}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeView === 'city' && <CityConceptViewport />}

        {activeView === 'studio' && (
          <StudioViewport
            vehicles={VEHICLES_50}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onOpenUnityExport={() => setActiveView('unity')}
          />
        )}

        {activeView === 'catalog' && (
          <CatalogGrid
            vehicles={VEHICLES_50}
            selectedId={selectedVehicle.id}
            onSelectAndOpenStudio={(v) => {
              setSelectedVehicle(v);
              setActiveView('studio');
            }}
          />
        )}

        {activeView === 'compare' && (
          <ScaleCompareView vehicles={VEHICLES_50} />
        )}

        {activeView === 'unity' && (
          <UnityExportView
            vehicles={VEHICLES_50}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
          />
        )}
      </main>
    </div>
  );
}

export default App;
