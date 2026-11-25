import * as THREE from 'three';

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function getCharacterMaterial(colorHex: string): THREE.MeshStandardMaterial {
  const key = colorHex.toUpperCase();
  const cached = materialCache.get(key);
  if (cached) return cached;

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(key),
    roughness: 0.72,
    metalness: 0.04,
  });
  materialCache.set(key, mat);
  return mat;
}

export function createAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2b2d33';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 6500; i++) {
    const x = (i * 73) % 512;
    const y = (i * 197) % 512;
    const v = 35 + ((i * 29) % 24);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire tracks
  ctx.fillStyle = 'rgba(18, 20, 24, 0.25)';
  ctx.fillRect(110, 0, 42, 512);
  ctx.fillRect(360, 0, 42, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSidewalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b2b6bd';
  ctx.fillRect(0, 0, 256, 256);

  // Paver grid
  ctx.strokeStyle = '#9297a0';
  ctx.lineWidth = 3;
  const step = 64;
  for (let i = 0; i <= 256; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  for (let i = 0; i < 1200; i++) {
    const x = (i * 53) % 256;
    const y = (i * 113) % 256;
    const v = 165 + ((i * 17) % 28);
    ctx.fillStyle = `rgba(${v},${v},${v + 2},0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPlazaTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c8bfb0';
  ctx.fillRect(0, 0, 256, 256);

  const colors = ['#bdb3a2', '#d2c9ba', '#b3a896', '#c5bcac'];
  const tile = 32;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const idx = ((x / tile) * 3 + (y / tile) * 5) % colors.length;
      ctx.fillStyle = colors[idx];
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBuildingFacadeTexture(
  baseColor: string,
  windowLitColor: string,
  maxAnisotropy: number,
  seed: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 512);

  // Horizontal floor bands
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(0, y, 256, 6);
  }

  // Windows grid
  let rng = seed * 9973 + 17;
  const nextRand = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 18 + col * 58;
      const wy = 16 + row * 64;
      const lit = nextRand() > 0.58;
      ctx.fillStyle = '#18222f';
      ctx.fillRect(wx - 2, wy - 2, 40, 42);
      ctx.fillStyle = lit ? windowLitColor : '#26384d';
      ctx.fillRect(wx, wy, 36, 38);

      // Subtle window reflection highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(wx + 2, wy + 2, 12, 34);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3f6e38';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3200; i++) {
    const x = (i * 47) % 256;
    const y = (i * 97) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(84,132,68,0.4)' : 'rgba(42,80,38,0.4)';
    ctx.fillRect(x, y, 2, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
