export type VehicleCategory =
  | 'Compactos & Populares'
  | 'Esportivos & Super'
  | 'SUVs & Off-Road'
  | 'Emergência & Polícia'
  | 'Carga & Transporte'
  | 'Motos & ATV'
  | 'Aquáticos'
  | 'Aéreos & Especiais';

export type VehicleTierClass =
  | 'Hipercarros & Fórmula'
  | 'Superesportivos & Esportivos'
  | 'Muscle & Clássicos'
  | 'Urbanos & Executivos'
  | 'SUVs & Off-Road'
  | 'Emergência & Polícia'
  | 'Carga & Transporte Pesado'
  | 'Motos, Triciclos & ATV'
  | 'Jet Skis & Náuticos'
  | 'Aviões & Helicópteros'
  | 'Jatos & Caças Supersônicos';

export type UnityControlType =
  | 'CarroControle'
  | 'MotoControle'
  | 'BarcoControle'
  | 'AeronaveControle';

export type BodyArchetype =
  | 'hatch'
  | 'sedan'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'micro'
  | 'buggy'
  | 'van'
  | 'supercar'
  | 'muscle'
  | 'roadster'
  | 'classic'
  | 'formula'
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
  | 'trike'
  | 'atv'
  | 'speedboat'
  | 'jetski'
  | 'rib_boat'
  | 'tugboat'
  | 'yacht'
  | 'helicopter'
  | 'hovercraft'
  | 'airplane'
  | 'jet';

export type WheelStyle =
  | 'city_alloy'
  | 'sport_5spoke'
  | 'bbs_mesh'
  | 'aero_blade'
  | 'classic_whitewall'
  | 'offroad_beadlock'
  | 'monster_tractor'
  | 'heavy_truck'
  | 'retro_turbofan'
  | 'deep_dish_6'
  | 'wire_spoke'
  | 'moto_sport'
  | 'moto_spoke'
  | 'scooter_small'
  | 'atv_balloon'
  | 'aircraft_gear'
  | 'none';

export type PaintFinish = 'metallic' | 'gloss' | 'matte' | 'pearl';
export type TrimFinish = 'chrome' | 'matte_black' | 'carbon' | 'painted';
export type PaintLivery =
  | 'solid'
  | 'racing_stripes'
  | 'two_tone'
  | 'side_stripe'
  | 'rally'
  | 'squadron';

export type ExhaustStyle =
  | 'single'
  | 'dual'
  | 'quad'
  | 'center_twin'
  | 'side_pipes'
  | 'vertical_stacks'
  | 'afterburner'
  | 'none';

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
  | 'moto_windscreen'
  | 'moto_saddlebags'
  | 'atv_racks'
  | 'outboard_twin'
  | 'jet_nozzle'
  | 'rib_tubes'
  | 'tug_tower'
  | 'ski_wake_tower'
  | 'radar_dome'
  | 'heli_rotors'
  | 'heli_winch'
  | 'hover_fans'
  | 'seaplane_floats'
  | 'biplane_wings'
  | 'twin_prop_nacelles'
  | 'jet_afterburners'
  | 'wingtip_missiles'
  | 'drop_tanks'
  | 'rollcage'
  | 'splitter'
  | 'diffuser'
  | 'intercooler'
  | 'dual_exhaust'
  | 'quad_exhaust'
  | 'side_exhaust'
  | 'widebody'
  | 'chrome_bumpers'
  | 'twin_rollbar'
  | 'panoramic_roof'
  | 'school_sign'
  | 'aero_covers'
  | 'quad_headlights'
  | 'hood_scoop'
  | 'window_louvers'
  | 'roof_scoop'
  | 'canards'
  | 'f1_wings';

export interface VehicleConcept {
  id: number;
  code: string;
  name: string;
  category: VehicleCategory;
  tierClass?: VehicleTierClass;
  performanceRank?: string;
  classificationDescription?: string;
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
    livery?: PaintLivery;
    stripeColor?: string;
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
    exhaustStyle?: ExhaustStyle;
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
