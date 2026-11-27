import * as THREE from 'three';
import { PaintFinish, TrimFinish } from '../types/vehicle';

export const isSoftwareGl: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

let cachedCarbonTex: THREE.CanvasTexture | null = null;
let cachedTreadTex: THREE.CanvasTexture | null = null;
let cachedFloorTex: THREE.CanvasTexture | null = null;
let cachedShadowTex: THREE.CanvasTexture | null = null;
let cachedCarPlateTex: THREE.CanvasTexture | null = null;
let cachedMotoPlateTex: THREE.CanvasTexture | null = null;
let cachedGrilleColorTex: THREE.CanvasTexture | null = null;
let cachedGrilleBumpTex: THREE.CanvasTexture | null = null;

export function getCarbonTexture(maxAniso = 4): THREE.CanvasTexture {
  if (cachedCarbonTex) return cachedCarbonTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      const even = ((x + y) / 8) % 2 === 0;
      ctx.fillStyle = even ? '#27272a' : '#111114';
      ctx.fillRect(x, y, 7, 4);
      ctx.fillStyle = even ? '#1c1c20' : '#2f2f35';
      ctx.fillRect(x, y + 4, 7, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cachedCarbonTex = tex;
  return tex;
}

export function getTireTreadTexture(maxAniso = 4): THREE.CanvasTexture {
  if (cachedTreadTex) return cachedTreadTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1b1b1e';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#09090b';
  ctx.lineWidth = 4;
  for (let y = -16; y < 144; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(64, y + 10);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 10);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cachedTreadTex = tex;
  return tex;
}

export function getStudioFloorTexture(maxAniso = 8): THREE.CanvasTexture {
  if (cachedFloorTex) return cachedFloorTex;
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  const baseGrad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.56);
  baseGrad.addColorStop(0, '#1e212a');
  baseGrad.addColorStop(0.48, '#13151c');
  baseGrad.addColorStop(1, '#0c0d12');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Fine calibration metric grid
  ctx.strokeStyle = 'rgba(255,255,255,0.032)';
  ctx.lineWidth = 1;
  const step = size / 24;
  for (let i = 0; i <= 24; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Concentric turntable rings
  const radii = [140, 240, 340, 440];
  radii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx === 2 ? 'rgba(245, 158, 11, 0.22)' : 'rgba(255,255,255,0.075)';
    ctx.lineWidth = idx === 2 ? 2 : 1.25;
    ctx.stroke();
  });

  // Degree ticks around outer ring
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const r0 = deg % 45 === 0 ? 426 : 434;
    const r1 = 446;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r0, cy + Math.sin(rad) * r0);
    ctx.lineTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
    ctx.strokeStyle = deg % 90 === 0 ? 'rgba(245,158,11,0.40)' : 'rgba(255,255,255,0.14)';
    ctx.lineWidth = deg % 90 === 0 ? 2 : 1;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cachedFloorTex = tex;
  return tex;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTex) return cachedShadowTex;
  const size = 512;
  const cx = size / 2;
  const cy = size / 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const drawSoftEllipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    stops: Array<[number, string]>,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [offset, color] of stops) {
      g.addColorStop(offset, color);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Layer 1: Wide feathered ambient occlusion penumbra (zero visible rectangle boundary)
  drawSoftEllipse(cx, cy, size * 0.44, size * 0.46, [
    [0.0, 'rgba(5, 7, 14, 0.22)'],
    [0.45, 'rgba(5, 7, 14, 0.12)'],
    [0.78, 'rgba(5, 7, 14, 0.03)'],
    [1.0, 'rgba(5, 7, 14, 0)'],
  ]);

  // Layer 2: Soft elongated chassis shadow footprint
  drawSoftEllipse(cx, cy, size * 0.26, size * 0.35, [
    [0.0, 'rgba(4, 6, 12, 0.44)'],
    [0.52, 'rgba(4, 6, 12, 0.28)'],
    [0.82, 'rgba(4, 6, 12, 0.07)'],
    [1.0, 'rgba(4, 6, 12, 0)'],
  ]);

  // Layer 3: Subtle four-corner tire contact ambient pockets
  const wheelOffsets: Array<[number, number]> = [
    [-0.18, -0.22],
    [0.18, -0.22],
    [-0.18, 0.22],
    [0.18, 0.22],
  ];
  for (const [ox, oy] of wheelOffsets) {
    drawSoftEllipse(cx + ox * size, cy + oy * size, size * 0.095, size * 0.135, [
      [0.0, 'rgba(2, 4, 9, 0.34)'],
      [0.55, 'rgba(2, 4, 9, 0.14)'],
      [1.0, 'rgba(2, 4, 9, 0)'],
    ]);
  }

  const tex = new THREE.CanvasTexture(c);
  cachedShadowTex = tex;
  return tex;
}

export function getLicensePlateTexture(maxAniso = 4): THREE.CanvasTexture {
  if (cachedCarPlateTex) return cachedCarPlateTex;
  const w = 256;
  const h = 72;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // White brushed aluminum base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal metallic sheen
  const grad = ctx.createLinearGradient(0, 18, 0, h);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#f1f5f9');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(2, 20, w - 4, h - 22);

  // Mercosul top blue bar
  ctx.fillStyle = '#003399';
  ctx.fillRect(0, 0, w, 20);

  // Outer perimeter & Mercosul badge accent
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BRASIL', w * 0.5, 10.5);

  // Tiny left emblem ring + right flag badge
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(18, 10, 5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(w - 26, 4, 18, 12);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(w - 17, 5);
  ctx.lineTo(w - 10, 10);
  ctx.lineTo(w - 17, 15);
  ctx.lineTo(w - 24, 10);
  ctx.closePath();
  ctx.fill();

  // Bold Mercosul characters
  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GC5E026', w * 0.5, 47);

  // Mounting screw dots
  ctx.fillStyle = '#64748b';
  [12, w - 12].forEach((sx) => {
    ctx.beginPath();
    ctx.arc(sx, 28, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cachedCarPlateTex = tex;
  return tex;
}

export function getMotoPlateTexture(maxAniso = 4): THREE.CanvasTexture {
  if (cachedMotoPlateTex) return cachedMotoPlateTex;
  const w = 192;
  const h = 136;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 28, 0, h);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(3, 28, w - 6, h - 31);

  ctx.fillStyle = '#003399';
  ctx.fillRect(0, 0, w, 28);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BRASIL', w * 0.5, 14.5);

  ctx.fillStyle = '#16a34a';
  ctx.fillRect(w - 28, 6, 20, 14);
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(w - 18, 7.5);
  ctx.lineTo(w - 10, 13);
  ctx.lineTo(w - 18, 18.5);
  ctx.lineTo(w - 26, 13);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#09090b';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GC5', w * 0.5, 58);
  ctx.fillText('0E26', w * 0.5, 104);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  cachedMotoPlateTex = tex;
  return tex;
}

function getGrilleMeshTextures(maxAniso = 4): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (cachedGrilleColorTex && cachedGrilleBumpTex) {
    return { map: cachedGrilleColorTex, bumpMap: cachedGrilleBumpTex };
  }

  const w = 128;
  const h = 128;

  const drawHexPattern = (ctx: CanvasRenderingContext2D, isBump: boolean) => {
    ctx.fillStyle = isBump ? '#181818' : '#050507';
    ctx.fillRect(0, 0, w, h);

    const r = 10;
    const dx = r * 1.73205;
    const dy = r * 1.5;

    ctx.strokeStyle = isBump ? '#e5e5e5' : '#26262c';
    ctx.lineWidth = isBump ? 3.2 : 2.6;

    for (let row = -1; row < Math.ceil(h / dy) + 2; row++) {
      for (let col = -1; col < Math.ceil(w / dx) + 2; col++) {
        const cx = col * dx + (row % 2 !== 0 ? dx * 0.5 : 0);
        const cy = row * dy;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (Math.PI / 3) * k + Math.PI / 6;
          const px = cx + (r * 0.92) * Math.cos(ang);
          const py = cy + (r * 0.92) * Math.sin(ang);
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  };

  const cColor = document.createElement('canvas');
  cColor.width = w;
  cColor.height = h;
  drawHexPattern(cColor.getContext('2d')!, false);
  const map = new THREE.CanvasTexture(cColor);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(9, 4);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const cBump = document.createElement('canvas');
  cBump.width = w;
  cBump.height = h;
  drawHexPattern(cBump.getContext('2d')!, true);
  const bumpMap = new THREE.CanvasTexture(cBump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(9, 4);
  bumpMap.anisotropy = maxAniso;

  cachedGrilleColorTex = map;
  cachedGrilleBumpTex = bumpMap;
  return { map, bumpMap };
}

export interface VehicleMaterialSet {
  body: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  interior: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  windowTrim: THREE.MeshStandardMaterial;
  panelGap: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  alloy: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  mirrorGlass: THREE.MeshStandardMaterial;
  exhaustBore: THREE.MeshStandardMaterial;
  amberSignal: THREE.MeshStandardMaterial;
  signalLeft: THREE.MeshStandardMaterial;
  signalRight: THREE.MeshStandardMaterial;
  liveryStripe: THREE.MeshStandardMaterial;
  brakeDisc: THREE.MeshStandardMaterial;
  caliper: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  drlLed: THREE.MeshStandardMaterial;
  headlightLens: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  taillightLens: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  licensePlate: THREE.MeshStandardMaterial;
  motoPlate: THREE.MeshStandardMaterial;
  sirenRed: THREE.MeshStandardMaterial;
  sirenBlue: THREE.MeshStandardMaterial;
  sirenAmber: THREE.MeshStandardMaterial;
  grille: THREE.MeshStandardMaterial;
  grilleMesh: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  transitBlue: THREE.MeshStandardMaterial;
  dispose: () => void;
}

interface CitySharedVehicleMaterials {
  interiorDark: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  alloy: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  headlightLens: THREE.MeshStandardMaterial;
  taillightLens: THREE.MeshStandardMaterial;
  licensePlate: THREE.MeshStandardMaterial;
  motoPlate: THREE.MeshStandardMaterial;
  mirrorGlass: THREE.MeshStandardMaterial;
  exhaustBore: THREE.MeshStandardMaterial;
  amberSignal: THREE.MeshStandardMaterial;
  brakeDisc: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  drlLed: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  sirenRed: THREE.MeshStandardMaterial;
  sirenBlue: THREE.MeshStandardMaterial;
  sirenAmber: THREE.MeshStandardMaterial;
  grille: THREE.MeshStandardMaterial;
  grilleMesh: THREE.MeshStandardMaterial;
  windowTrim: THREE.MeshStandardMaterial;
  panelGap: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  transitBlue: THREE.MeshStandardMaterial;
}

let cachedCityVehicleMats: CitySharedVehicleMaterials | null = null;

function getCitySharedVehicleMaterials(maxAniso: number): CitySharedVehicleMaterials {
  if (cachedCityVehicleMats) return cachedCityVehicleMats;
  const grilleTex = getGrilleMeshTextures(maxAniso);
  cachedCityVehicleMats = {
    interiorDark: new THREE.MeshStandardMaterial({ color: 0x26262b, metalness: 0.05, roughness: 0.85 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xf4f4f5, metalness: 0.92, roughness: 0.14 }),
    alloy: new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.88, roughness: 0.22 }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x1b1b1f,
      map: getTireTreadTexture(maxAniso),
      metalness: 0.04,
      roughness: 0.88,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x3b6e8c,
      metalness: 0.08,
      roughness: 0.08,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
    headlightLens: new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.14,
      roughness: 0.06,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    taillightLens: new THREE.MeshStandardMaterial({
      color: 0xfca5a5,
      metalness: 0.12,
      roughness: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    licensePlate: new THREE.MeshStandardMaterial({
      map: getLicensePlateTexture(maxAniso),
      metalness: 0.16,
      roughness: 0.38,
    }),
    motoPlate: new THREE.MeshStandardMaterial({
      map: getMotoPlateTexture(maxAniso),
      metalness: 0.16,
      roughness: 0.38,
    }),
    mirrorGlass: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.05 }),
    exhaustBore: new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.1, roughness: 0.95 }),
    amberSignal: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    }),
    brakeDisc: new THREE.MeshStandardMaterial({ color: 0xa1a1aa, metalness: 0.85, roughness: 0.34 }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xfefce8,
      emissive: 0xfef3c7,
      emissiveIntensity: 1.3,
      roughness: 0.14,
      metalness: 0.1,
    }),
    drlLed: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 1.85,
      roughness: 0.1,
      metalness: 0.05,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0.1,
    }),
    sirenRed: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
    sirenBlue: new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
    sirenAmber: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      roughness: 0.22,
    }),
    grille: new THREE.MeshStandardMaterial({ color: 0x121216, metalness: 0.5, roughness: 0.55 }),
    grilleMesh: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grilleTex.map,
      bumpMap: grilleTex.bumpMap,
      bumpScale: 0.008,
      metalness: 0.35,
      roughness: 0.58,
    }),
    windowTrim: new THREE.MeshStandardMaterial({ color: 0x141418, metalness: 0.22, roughness: 0.44 }),
    panelGap: new THREE.MeshStandardMaterial({
      color: 0x070709,
      metalness: 0.04,
      roughness: 0.94,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    safetyYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.18, roughness: 0.32 }),
    transitBlue: new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.06, roughness: 0.76 }),
  };
  return cachedCityVehicleMats;
}

export function createVehicleMaterials(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  interiorColor: string,
  finish: PaintFinish,
  trimStyle: TrimFinish,
  maxAniso = 4,
  options?: { cityMode?: boolean; stripeColor?: string; enableSirens?: boolean },
): VehicleMaterialSet {
  const isMatte = finish === 'matte';
  const isMetallic = finish === 'metallic' || finish === 'pearl';

  if (options?.cityMode) {
    const shared = getCitySharedVehicleMaterials(maxAniso);
    const body = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primaryColor),
      metalness: isMatte ? 0.22 : isMetallic ? 0.65 : 0.38,
      roughness: isMatte ? 0.39 : finish === 'pearl' ? 0.25 : isMetallic ? 0.27 : 0.30,
      envMapIntensity: 1.25,
    });
    const secondary = new THREE.MeshStandardMaterial({
      color: new THREE.Color(secondaryColor),
      metalness: 0.35,
      roughness: 0.42,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      metalness: 0.4,
      roughness: 0.32,
    });
    const trim = new THREE.MeshStandardMaterial({
      color:
        trimStyle === 'chrome'
          ? 0xe4e4e7
          : trimStyle === 'carbon'
            ? 0x27272a
            : trimStyle === 'painted'
              ? new THREE.Color(primaryColor)
              : 0x18181b,
      metalness: trimStyle === 'chrome' ? 0.9 : trimStyle === 'carbon' ? 0.25 : 0.12,
      roughness: trimStyle === 'chrome' ? 0.14 : trimStyle === 'carbon' ? 0.36 : 0.72,
    });

    const liveryStripe = new THREE.MeshStandardMaterial({
      color: new THREE.Color(options?.stripeColor ?? accentColor),
      metalness: 0.25,
      roughness: 0.22,
    });

    // Lightweight per-vehicle untextured emitter materials so blinkers, headlights,
    // and sirens animate independently per vehicle without breaking mesh merging
    const signalLeft = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1,
      roughness: 0.2,
    });
    const signalRight = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.1,
      roughness: 0.2,
    });
    const headlight = new THREE.MeshStandardMaterial({
      color: 0xfefce8,
      emissive: 0xfef3c7,
      emissiveIntensity: 1.65,
      roughness: 0.14,
      metalness: 0.1,
    });

    const owned = [body, secondary, accent, trim, liveryStripe, signalLeft, signalRight, headlight];
    let sirenRed = shared.sirenRed;
    let sirenBlue = shared.sirenBlue;
    let sirenAmber = shared.sirenAmber;
    if (options?.enableSirens) {
      sirenRed = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      sirenBlue = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        emissive: 0x3b82f6,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      sirenAmber = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.6,
        roughness: 0.22,
      });
      owned.push(sirenRed, sirenBlue, sirenAmber);
    }

    return {
      body,
      secondary,
      accent,
      interior: shared.interiorDark,
      trim,
      windowTrim: shared.windowTrim,
      panelGap: shared.panelGap,
      chrome: shared.chrome,
      alloy: shared.alloy,
      rubber: shared.rubber,
      glass: shared.glass,
      mirrorGlass: shared.mirrorGlass,
      exhaustBore: shared.exhaustBore,
      amberSignal: shared.amberSignal,
      signalLeft,
      signalRight,
      liveryStripe,
      brakeDisc: shared.brakeDisc,
      caliper: accent,
      headlight,
      drlLed: headlight,
      headlightLens: shared.headlightLens,
      taillight: shared.taillight,
      taillightLens: shared.taillightLens,
      licensePlate: shared.licensePlate,
      motoPlate: shared.motoPlate,
      sirenRed,
      sirenBlue,
      sirenAmber,
      grille: shared.grille,
      grilleMesh: shared.grilleMesh,
      safetyYellow: shared.safetyYellow,
      transitBlue: shared.transitBlue,
      dispose: () => {
        owned.forEach((m) => m.dispose());
      },
    };
  }

  const body = new THREE.MeshStandardMaterial({
    color: new THREE.Color(primaryColor),
    metalness: isMatte ? 0.22 : isMetallic ? 0.65 : 0.38,
    roughness: isMatte ? 0.39 : finish === 'pearl' ? 0.25 : isMetallic ? 0.27 : 0.30,
    envMapIntensity: 0.95,
  });

  const secondary = new THREE.MeshStandardMaterial({
    color: new THREE.Color(secondaryColor),
    metalness: 0.35,
    roughness: 0.42,
  });

  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    metalness: 0.4,
    roughness: 0.3,
  });

  const interior = new THREE.MeshStandardMaterial({
    color: new THREE.Color(interiorColor),
    metalness: 0.05,
    roughness: 0.85,
  });

  const trim = new THREE.MeshStandardMaterial({
    color:
      trimStyle === 'chrome'
        ? 0xe4e4e7
        : trimStyle === 'carbon'
          ? 0x27272a
          : trimStyle === 'painted'
            ? new THREE.Color(primaryColor)
            : 0x18181b,
    map: trimStyle === 'carbon' ? getCarbonTexture(maxAniso) : null,
    metalness: trimStyle === 'chrome' ? 0.94 : trimStyle === 'carbon' ? 0.25 : 0.1,
    roughness: trimStyle === 'chrome' ? 0.12 : trimStyle === 'carbon' ? 0.34 : 0.72,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xf4f4f5,
    metalness: 0.96,
    roughness: 0.1,
  });

  const alloy = new THREE.MeshPhysicalMaterial({
    color: 0xd4d4d8,
    metalness: 0.92,
    roughness: 0.2,
    anisotropy: 0.65,
    clearcoat: 0.4,
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x1b1b1f,
    map: getTireTreadTexture(maxAniso),
    metalness: 0.04,
    roughness: 0.88,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x5c829c,
    metalness: 0.05,
    roughness: 0.05,
    transmission: 0,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    ior: 1.45,
    reflectivity: 0.35,
    clearcoat: 0.35,
    clearcoatRoughness: 0.06,
    envMapIntensity: 0.45,
    side: THREE.DoubleSide,
  });

  const mirrorGlass = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.98,
    roughness: 0.04,
  });

  const exhaustBore = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.12,
    roughness: 0.95,
  });

  const amberSignal = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.1,
  });

  const signalLeft = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.1,
  });

  const signalRight = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.1,
  });

  const liveryStripe = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options?.stripeColor ?? accentColor),
    metalness: 0.25,
    roughness: 0.2,
  });

  const brakeDisc = new THREE.MeshStandardMaterial({
    color: 0xa1a1aa,
    metalness: 0.88,
    roughness: 0.32,
  });

  const caliper = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    metalness: 0.35,
    roughness: 0.3,
  });

  const headlight = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    emissive: 0xfef3c7,
    emissiveIntensity: 2.2,
    roughness: 0.10,
    metalness: 0.08,
  });

  const drlLed = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 2.5,
    roughness: 0.06,
    metalness: 0.04,
  });

  const headlightLens = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.04,
    transmission: isSoftwareGl ? 0 : 0.92,
    thickness: 0.055,
    ior: 1.5,
    reflectivity: 0.88,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.45,
    transparent: true,
    opacity: isSoftwareGl ? 0.28 : 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const licensePlate = new THREE.MeshStandardMaterial({
    map: getLicensePlateTexture(maxAniso),
    metalness: 0.18,
    roughness: 0.34,
  });

  const motoPlate = new THREE.MeshStandardMaterial({
    map: getMotoPlateTexture(maxAniso),
    metalness: 0.18,
    roughness: 0.34,
  });

  const taillight = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xff1e2d,
    emissiveIntensity: 1.9,
    roughness: 0.12,
    metalness: 0.08,
  });

  const taillightLens = new THREE.MeshPhysicalMaterial({
    color: 0xfef2f2,
    attenuationColor: new THREE.Color(0xdc2626),
    attenuationDistance: 0.14,
    metalness: 0.0,
    roughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.88,
    thickness: 0.05,
    ior: 1.5,
    reflectivity: 0.85,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.4,
    transparent: true,
    opacity: isSoftwareGl ? 0.34 : 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sirenRed = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const sirenBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x3b82f6,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  const sirenAmber = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.3,
    roughness: 0.22,
  });

  const grille = new THREE.MeshStandardMaterial({
    color: 0x121216,
    metalness: 0.5,
    roughness: 0.55,
  });

  const studioGrilleTex = getGrilleMeshTextures(maxAniso);
  const grilleMesh = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: studioGrilleTex.map,
    bumpMap: studioGrilleTex.bumpMap,
    bumpScale: 0.010,
    metalness: 0.36,
    roughness: 0.56,
  });

  const windowTrim = new THREE.MeshStandardMaterial({
    color: 0x141418,
    metalness: 0.24,
    roughness: 0.40,
  });

  const panelGap = new THREE.MeshStandardMaterial({
    color: 0x070709,
    metalness: 0.04,
    roughness: 0.94,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const safetyYellow = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.18,
    roughness: 0.32,
  });

  const transitBlue = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    metalness: 0.06,
    roughness: 0.76,
  });

  const all = [
    body,
    secondary,
    accent,
    interior,
    trim,
    windowTrim,
    panelGap,
    chrome,
    alloy,
    rubber,
    glass,
    mirrorGlass,
    exhaustBore,
    amberSignal,
    signalLeft,
    signalRight,
    liveryStripe,
    brakeDisc,
    caliper,
    headlight,
    drlLed,
    headlightLens,
    taillight,
    taillightLens,
    licensePlate,
    motoPlate,
    sirenRed,
    sirenBlue,
    sirenAmber,
    grille,
    grilleMesh,
    safetyYellow,
    transitBlue,
  ];

  return {
    body,
    secondary,
    accent,
    interior,
    trim,
    windowTrim,
    panelGap,
    chrome,
    alloy,
    rubber,
    glass,
    mirrorGlass,
    exhaustBore,
    amberSignal,
    signalLeft,
    signalRight,
    liveryStripe,
    brakeDisc,
    caliper,
    headlight,
    drlLed,
    headlightLens,
    taillight,
    taillightLens,
    licensePlate,
    motoPlate,
    sirenRed,
    sirenBlue,
    sirenAmber,
    grille,
    grilleMesh,
    safetyYellow,
    transitBlue,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
