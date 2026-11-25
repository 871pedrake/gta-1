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
  ctx.fillStyle = '#111115';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  // Fine calibration metric grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
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
    ctx.strokeStyle = idx === 2 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.09)';
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
    ctx.strokeStyle = deg % 90 === 0 ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.16)';
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
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 16, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0,0,0,0.72)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  cachedShadowTex = tex;
  return tex;
}

export interface VehicleMaterialSet {
  body: THREE.MeshPhysicalMaterial;
  secondary: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  interior: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  alloy: THREE.MeshPhysicalMaterial;
  rubber: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  brakeDisc: THREE.MeshStandardMaterial;
  caliper: THREE.MeshStandardMaterial;
  headlight: THREE.MeshStandardMaterial;
  taillight: THREE.MeshStandardMaterial;
  sirenRed: THREE.MeshStandardMaterial;
  sirenBlue: THREE.MeshStandardMaterial;
  sirenAmber: THREE.MeshStandardMaterial;
  grille: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createVehicleMaterials(
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  interiorColor: string,
  finish: PaintFinish,
  trimStyle: TrimFinish,
  maxAniso = 4,
): VehicleMaterialSet {
  const isMatte = finish === 'matte';
  const isMetallic = finish === 'metallic' || finish === 'pearl';

  const body = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(primaryColor),
    metalness: isMatte ? 0.15 : isMetallic ? 0.68 : 0.25,
    roughness: isMatte ? 0.58 : isMetallic ? 0.22 : 0.16,
    clearcoat: isMatte ? 0.08 : 1.0,
    clearcoatRoughness: isMatte ? 0.5 : finish === 'pearl' ? 0.06 : 0.1,
    iridescence: finish === 'pearl' ? 0.32 : 0,
    iridescenceIOR: 1.35,
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
    color: 0x172536,
    metalness: 0.05,
    roughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.55,
    transparent: true,
    opacity: isSoftwareGl ? 0.62 : 0.86,
    ior: 1.52,
    thickness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
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
    emissiveIntensity: 1.35,
    roughness: 0.12,
    metalness: 0.1,
  });

  const taillight = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
    roughness: 0.18,
    metalness: 0.1,
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

  const all = [
    body,
    secondary,
    accent,
    interior,
    trim,
    chrome,
    alloy,
    rubber,
    glass,
    brakeDisc,
    caliper,
    headlight,
    taillight,
    sirenRed,
    sirenBlue,
    sirenAmber,
    grille,
  ];

  return {
    body,
    secondary,
    accent,
    interior,
    trim,
    chrome,
    alloy,
    rubber,
    glass,
    brakeDisc,
    caliper,
    headlight,
    taillight,
    sirenRed,
    sirenBlue,
    sirenAmber,
    grille,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
