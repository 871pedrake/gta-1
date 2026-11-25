export type EstiloCabelo = 'Careca' | 'Curto' | 'Topete' | 'Longo' | 'Coque';
export type TipoCamisa = 'Curta' | 'Regata' | 'Longa';
export type TipoCalca = 'Longa' | 'Bermuda';

export type NpcEstado =
  | 'Andando'
  | 'Parado'
  | 'Celular'
  | 'Sentado'
  | 'Conversando'
  | 'Correndo'
  | 'Atravessando'
  | 'Assustado';

export type TimePreset = 'auto' | 'dia' | 'entardecer' | 'noite';

export interface AppearanceConfig {
  aparenciaAleatoria: boolean;
  corPele: string;
  corCabelo: string;
  corCamisa: string;
  corCalca: string;
  corSapato: string;
  estiloCabelo: EstiloCabelo;
  tipoCamisa: TipoCamisa;
  tipoCalca: TipoCalca;
  usarBone: boolean;
  corBone: string;
  usarOculos: boolean;
  usarMochila: boolean;
  corMochila: string;
  usarBarba?: boolean;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'car' | 'npc' | 'fountain' | 'scared';
}

export interface HudSnapshot {
  vida: number;
  vidaMax: number;
  colete: number;
  coleteMax: number;
  stamina: number;
  staminaMax: number;
  exausto: boolean;
  estaCorrendo: boolean;
  estaAgachado: boolean;
  estaNadando: boolean;
  emVeiculo: boolean;
  nomeVeiculo: string | null;
  carroProximo: string | null;
  velocidadeKmh: number;
  horaJogo: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  cameraYaw: number;
  pointerLocked: boolean;
  npcCounts: {
    total: number;
    assustados: number;
    conversando: number;
    atravessando: number;
  };
  minimapBlips: MinimapBlip[];
  notification: string | null;
}

export const PALETA_PELES = [
  '#FFDBAC',
  '#F1C27D',
  '#E0AC69',
  '#C68642',
  '#8D5524',
  '#6B4226',
  '#4A2F1E',
];

export const PALETA_CABELOS = [
  '#1B1B1B',
  '#3B2A1A',
  '#6B4423',
  '#A0522D',
  '#D9B35B',
  '#8E2B1F',
  '#9E9E9E',
];

export const PALETA_CAMISAS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F1C40F',
  '#9B59B6',
  '#FF7F50',
  '#1ABC9C',
  '#ECF0F1',
  '#34495E',
  '#FF69B4',
  '#F39C12',
];

export const PALETA_CALCAS = [
  '#2C3E50',
  '#1F2A44',
  '#4B5563',
  '#6B4F3A',
  '#111827',
  '#8E9AAF',
  '#355C7D',
];

export const PALETA_SAPATOS = [
  '#FFFFFF',
  '#111111',
  '#8B4513',
  '#C0392B',
  '#2D3436',
];

export const PALETA_MOCHILAS = [
  '#E67E22',
  '#2980B9',
  '#27AE60',
  '#8E44AD',
  '#2C3E50',
];

export const DEFAULT_PLAYER_APPEARANCE: AppearanceConfig = {
  aparenciaAleatoria: false,
  corPele: '#E0AC69',
  corCabelo: '#261A12',
  corCamisa: '#3498DB',
  corCalca: '#2C3E50',
  corSapato: '#FFFFFF',
  estiloCabelo: 'Topete',
  tipoCamisa: 'Curta',
  tipoCalca: 'Longa',
  usarBone: false,
  corBone: '#E74C3C',
  usarOculos: true,
  usarMochila: true,
  corMochila: '#E67E22',
};
