export type VehicleCategory =
  | 'Compactos & Populares'
  | 'Esportivos & Super'
  | 'SUVs & Off-Road'
  | 'Emergência & Polícia'
  | 'Carga & Transporte'
  | 'Motos & ATV'
  | 'Aquáticos'
  | 'Aéreos & Especiais';

export type UnityControlType =
  | 'CarroControle'
  | 'MotoControle'
  | 'BarcoControle'
  | 'AeronaveControle';

export type BodyArchetype =
  | 'hatch'
  | 'sedan'
  | 'coupe'
  | 'wagon'
  | 'micro'
  | 'buggy'
  | 'van'
  | 'supercar'
  | 'muscle'
  | 'roadster'
  | 'classic'
  | 'suv'
  | 'pickup'
  | 'monster'
  | 'armored'
  | 'ambulance'
  | 'firetruck'
  | 'bus'
  | 'articulated_bus'
  | 'semi_truck'
  | 'dump_truck'
  | 'mixer_truck'
  | 'tow_truck'
  | 'scooter'
  | 'sportbike'
  | 'cruiser'
  | 'dirtbike'
  | 'atv'
  | 'speedboat'
  | 'jetski'
  | 'rib_boat'
  | 'tugboat'
  | 'helicopter'
  | 'hovercraft';

export type WheelStyle =
  | 'city_alloy'
  | 'sport_5spoke'
  | 'bbs_mesh'
  | 'aero_blade'
  | 'classic_whitewall'
  | 'offroad_beadlock'
  | 'monster_tractor'
  | 'heavy_truck'
  | 'moto_sport'
  | 'moto_spoke'
  | 'scooter_small'
  | 'atv_balloon'
  | 'none';

export type PaintFinish = 'metallic' | 'gloss' | 'matte' | 'pearl';
export type TrimFinish = 'chrome' | 'matte_black' | 'carbon' | 'painted';

export type VehicleAttachment =
  | 'spoiler_gt'
  | 'wing_swan'
  | 'blower_v8'
  | 'snorkel'
  | 'bullbar'
  | 'spare_rear'
  | 'roof_tent'
  | 'roof_rack'
  | 'taxi_sign'
  | 'lightbar_police'
  | 'lightbar_amber'
  | 'pushbar'
  | 'ambulance_box'
  | 'fire_ladder'
  | 'sweeper_brushes'
  | 'tow_bed'
  | 'bus_ac'
  | 'dump_bed'
  | 'mixer_drum'
  | 'food_awning'
  | 'delivery_box'
  | 'moto_box'
  | 'atv_racks'
  | 'outboard_twin'
  | 'jet_nozzle'
  | 'rib_tubes'
  | 'tug_tower'
  | 'heli_rotors'
  | 'heli_winch'
  | 'hover_fans'
  | 'rollcage'
  | 'splitter'
  | 'diffuser'
  | 'intercooler'
  | 'dual_exhaust'
  | 'widebody'
  | 'chrome_bumpers'
  | 'twin_rollbar'
  | 'panoramic_roof'
  | 'school_sign'
  | 'aero_covers';

export interface VehicleConcept {
  id: number;
  code: string;
  name: string;
  category: VehicleCategory;
  roleInCity: string;
  conceptSummary: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
  };
  unitySpec: {
    controlType: UnityControlType;
    maxSpeedKmh: number;
    acceleration: number;
    massKg: number;
    driveType: string;
    seats: number;
    spawnZone: string;
    cameraOffset: [number, number, number];
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    interior: string;
    trim: TrimFinish;
    finish: PaintFinish;
  };
  geometry: {
    archetype: BodyArchetype;
    wheelStyle: WheelStyle;
    wheelRadius: number;
    wheelWidth: number;
    groundClearance: number;
    hoodSlope: number;
    cabinLengthRatio: number;
    cabinHeightRatio: number;
    roofTaper: number;
    rearDeckRatio: number;
    attachments: VehicleAttachment[];
  };
  craftedParts: string[];
}

export type StudioCameraPreset = 'hero' | 'side' | 'front' | 'rear' | 'top';
export type AppViewMode = 'city' | 'studio' | 'catalog' | 'compare' | 'unity';

export type CityCameraPreset =
  | 'overview'
  | 'downtown'
  | 'condos'
  | 'corporate'
  | 'shops'
  | 'residential'
  | 'school'
  | 'beach'
  | 'morro'
  | 'bridges'
  | 'flag'
  | 'traffic';
export type CityTimeOfDay = 'sunset' | 'day' | 'night';

export interface CityHotspot {
  id: CityCameraPreset;
  title: string;
  subtitle: string;
  highlights: string[];
}
