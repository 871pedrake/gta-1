import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function finalizeColorTex(
  c: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  aniso = 8,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

export interface CityTextureAtlas {
  flagAlbedo: THREE.CanvasTexture;
  flagBump: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  asphaltAvenue: THREE.CanvasTexture;
  asphaltIntersection: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  plazaCompass: THREE.CanvasTexture;
  waterRipple: THREE.CanvasTexture;
  skyscraperGlass: THREE.CanvasTexture;
  skyscraperGlassEmissive: THREE.CanvasTexture;
  skyscraperConcrete: THREE.CanvasTexture;
  residentialFacade: THREE.CanvasTexture;
  commercialTerreo: THREE.CanvasTexture;
  shopVitrine: THREE.CanvasTexture[];
  shopSigns: THREE.CanvasTexture[];
  awningStripes: THREE.CanvasTexture[];
  barberPole: THREE.CanvasTexture;
  billboard: THREE.CanvasTexture[];
  salesBillboards: THREE.CanvasTexture[];
  graffitiWall: THREE.CanvasTexture;
  helipad: THREE.CanvasTexture;
  morroBrick: THREE.CanvasTexture;
  morroPlaster: THREE.CanvasTexture;
  zincRoof: THREE.CanvasTexture;
  terracottaRoof: THREE.CanvasTexture;
  clothesline: THREE.CanvasTexture;
  trafficSignStop: THREE.CanvasTexture;
  trafficSignSpeed: THREE.CanvasTexture;
  trafficSignPedestrian: THREE.CanvasTexture;
  trafficSignSlope: THREE.CanvasTexture;
  trafficSignNoParking: THREE.CanvasTexture;
  trafficSignTouristSpring: THREE.CanvasTexture;
  trafficSignTouristOverlook: THREE.CanvasTexture;
  busStopPlaque: THREE.CanvasTexture;
  busStopMap: THREE.CanvasTexture;
  streetNamePlates: THREE.CanvasTexture[];
  gantrySigns: THREE.CanvasTexture[];
  wayfindingMap: THREE.CanvasTexture;
  soccerField: THREE.CanvasTexture;
  calcadaPraia: THREE.CanvasTexture;
  beachSand: THREE.CanvasTexture;
  beachPlazaPattern: THREE.CanvasTexture;
  surfFoam: THREE.CanvasTexture;
  schoolSign: THREE.CanvasTexture;
  schoolCourtyard: THREE.CanvasTexture;
  trafficSignSchool: THREE.CanvasTexture;
  dispose: () => void;
}

export function createCityTextureAtlas(maxAniso = 8): CityTextureAtlas {
  const all: THREE.Texture[] = [];
  const reg = <T extends THREE.Texture>(t: T): T => {
    all.push(t);
    return t;
  };

  // =========================================================================
  // 1. BANDEIRA MONUMENTAL (1024 x 680) + TECIDO WOVEN BUMP
  // =========================================================================
  const flagAlbedo = (() => {
    const W = 1024;
    const H = 680;
    const [c, ctx] = makeCanvas(W, H);

    // Rich emerald silk field with subtle diagonal gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#046a38');
    bgGrad.addColorStop(0.5, '#008443');
    bgGrad.addColorStop(1, '#03592e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Fine diagonal damask fabric sheen stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 2;
    for (let i = -H; i < W + H; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H * 0.65, H);
      ctx.stroke();
    }

    // Ornate golden brocade outer & inner frame
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 10;
    ctx.strokeRect(48, 22, W - 70, H - 44);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 32, W - 90, H - 64);

    // Corner golden filigree rosettes
    const corners: [number, number][] = [
      [80, 54],
      [W - 54, 54],
      [80, H - 54],
      [W - 54, H - 54],
    ];
    corners.forEach(([x, y]) => {
      ctx.fillStyle = '#eab308';
      drawStar(ctx, x, y, 8, 15, 6);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Reinforced white canvas hoist header band on the left + stitched line + brass grommets
    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(0, 0, 34, H);
    ctx.fillStyle = '#d6d3c9';
    ctx.fillRect(31, 0, 4, H);
    ctx.strokeStyle = '#a8a29e';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(26, 8);
    ctx.lineTo(26, H - 8);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let g = 0; g < 5; g++) {
      const gy = 56 + g * ((H - 112) / 4);
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(16, gy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(16, gy, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(16, gy, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const cx = W * 0.525;
    const cy = H * 0.5;

    // Golden radiant diamond
    const diaGrad = ctx.createLinearGradient(cx - 320, cy - 220, cx + 320, cy + 220);
    diaGrad.addColorStop(0, '#fde047');
    diaGrad.addColorStop(0.5, '#facc15');
    diaGrad.addColorStop(1, '#ca8a04');
    ctx.fillStyle = diaGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 245);
    ctx.lineTo(cx + 355, cy);
    ctx.lineTo(cx, cy + 245);
    ctx.lineTo(cx - 355, cy);
    ctx.closePath();
    ctx.fill();

    // Inner bevel gold line on diamond
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 229);
    ctx.lineTo(cx + 332, cy);
    ctx.lineTo(cx, cy + 229);
    ctx.lineTo(cx - 332, cy);
    ctx.closePath();
    ctx.stroke();

    // Laurel wreath framing the central sphere
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 168, Math.PI * 0.16, Math.PI * 0.84);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 168, Math.PI * 1.16, Math.PI * 1.84);
    ctx.stroke();

    for (let a = -68; a <= 68; a += 14) {
      const radL = ((180 + a) * Math.PI) / 180;
      const radR = (a * Math.PI) / 180;
      [radL, radR].forEach((r) => {
        const lx = cx + Math.cos(r) * 168;
        const ly = cy + Math.sin(r) * 168;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(r + Math.PI / 2);
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 5, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Celestial cobalt-blue globe
    const skyGrad = ctx.createRadialGradient(cx - 30, cy - 40, 20, cx, cy, 150);
    skyGrad.addColorStop(0, '#1d4ed8');
    skyGrad.addColorStop(0.6, '#0f296b');
    skyGrad.addColorStop(1, '#081842');
    ctx.fillStyle = skyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 146, 0, Math.PI * 2);
    ctx.fill();

    // Golden meridian ring around globe
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 148, 0, Math.PI * 2);
    ctx.stroke();

    // Clip to sphere for ribbon & stars
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 144, 0, Math.PI * 2);
    ctx.clip();

    // Subtle city skyline & sun rays inside lower globe
    ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
    for (let r = -6; r <= 6; r++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 45);
      ctx.lineTo(cx + r * 35 - 12, cy - 150);
      ctx.lineTo(cx + r * 35 + 12, cy - 150);
      ctx.closePath();
      ctx.fill();
    }

    // Arched white & gold ceremonial ribbon across the globe
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(cx - 170, cy - 12);
    ctx.quadraticCurveTo(cx - 10, cy - 58, cx + 170, cy + 10);
    ctx.lineTo(cx + 170, cy + 44);
    ctx.quadraticCurveTo(cx - 10, cy - 22, cx - 170, cy + 24);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ribbon typography
    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = 'CIDADE NOVA · ORDEM E PROGRESO';
    ctx.save();
    ctx.translate(cx, cy - 5);
    ctx.rotate(0.06);
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Stars (Southern Cross + constellation)
    ctx.fillStyle = '#fef9c3';
    const stars: [number, number, number][] = [
      [0, -92, 11],
      [-55, -62, 8],
      [64, -58, 9],
      [-86, -24, 7],
      [94, -18, 7],
      [-32, -46, 6],
      [30, -40, 6],
      // Southern Cross below ribbon
      [0, 52, 9],
      [-26, 74, 8],
      [28, 74, 8],
      [0, 108, 10],
      [15, 86, 5.5],
      [-68, 62, 7],
      [74, 58, 7],
      [-46, 102, 6.5],
      [52, 98, 6.5],
      [-92, 34, 6],
      [98, 36, 6],
    ];
    stars.forEach(([sx, sy, sr]) => drawStar(ctx, cx + sx, cy + sy, 5, sr, sr * 0.42));

    ctx.restore();

    // Subtle stitched border seam near fly edge
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.setLineDash([7, 5]);
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 8, W - 46, H - 16);
    ctx.setLineDash([]);

    const tex = finalizeColorTex(c, 1, 1, maxAniso);
    return reg(tex);
  })();

  const flagBump = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        const checker = ((x + y) / 4) % 2 === 0;
        ctx.fillStyle = checker ? '#9c9c9c' : '#646464';
        ctx.fillRect(x, y, 3, 3);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(22, 14);
    tex.anisotropy = maxAniso;
    return reg(tex);
  })();

  // =========================================================================
  // 2. ASPHALT, SIDEWALK, PLAZA COMPASS & WATER
  // =========================================================================
  const asphalt = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#23252a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      const v = 28 + (i % 20);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
      ctx.fillRect(x, y, 2, 2);
    }
    return reg(finalizeColorTex(c, 28, 28, maxAniso));
  })();

  const asphaltAvenue = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#26282e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3600; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      const v = 32 + (i % 22);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Clean curb edges + double yellow center line & dashed white lane dividers
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, 0, 5, 256);
    ctx.fillRect(251, 0, 5, 256);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(122, 0, 4, 256);
    ctx.fillRect(130, 0, 4, 256);
    ctx.fillStyle = '#e4e4e7';
    for (let y = 12; y < 256; y += 64) {
      ctx.fillRect(62, y, 4, 34);
      ctx.fillRect(190, y, 4, 34);
    }
    return reg(finalizeColorTex(c, 1, 2, maxAniso));
  })();

  const asphaltIntersection = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#26282e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const x = (i * 67) % 256;
      const y = (i * 149) % 256;
      const v = 32 + (i % 20);
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Crisp white intersection stop bars on all 4 sides
    ctx.fillStyle = 'rgba(244,244,245,0.85)';
    ctx.fillRect(14, 4, 228, 6);
    ctx.fillRect(14, 246, 228, 6);
    ctx.fillRect(4, 14, 6, 228);
    ctx.fillRect(246, 14, 6, 228);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const sidewalk = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#a1a1aa';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    return reg(finalizeColorTex(c, 4, 4, maxAniso));
  })();

  const plazaCompass = (() => {
    const S = 512;
    const [c, ctx] = makeCanvas(S, S);
    ctx.fillStyle = '#d6d3cd';
    ctx.fillRect(0, 0, S, S);

    // Cobblestone rings
    const cx = S / 2;
    const cy = S / 2;
    for (let r = 24; r < 245; r += 26) {
      ctx.strokeStyle = r % 52 === 0 ? '#57534e' : '#a8a29e';
      ctx.lineWidth = r % 52 === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Portuguese-pavement black & cream compass star
    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI) / 8;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = i % 2 === 0 ? '#27272a' : '#f5f5f4';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(14, i % 2 === 0 ? 190 : 145);
      ctx.lineTo(-14, i % 2 === 0 ? 190 : 145);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();

    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const waterRipple = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#0e4a66';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      ctx.strokeStyle = y % 16 === 0 ? 'rgba(125,211,252,0.22)' : 'rgba(14,116,144,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const wy = y + Math.sin((x / 256) * Math.PI * 4 + y * 0.2) * 3;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
    return reg(finalizeColorTex(c, 8, 2, maxAniso));
  })();

  // =========================================================================
  // 3. ARCHITECTURAL FACADES (SKYSCRAPER, RESIDENTIAL, COMMERCIAL)
  // =========================================================================
  const skyscraperGlass = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#132235';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 4; y < 256; y += 32) {
      for (let x = 4; x < 256; x += 24) {
        const lit = ((x * 7 + y * 13) % 11) < 4;
        const g = ctx.createLinearGradient(x, y, x, y + 24);
        g.addColorStop(0, lit ? '#fde047' : '#38bdf8');
        g.addColorStop(1, lit ? '#d97706' : '#1e3a5f');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 18, 24);
      }
      // Spandrel floor slab
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, y - 4, 256, 5);
    }
    return reg(finalizeColorTex(c, 2, 4, maxAniso));
  })();

  const skyscraperGlassEmissive = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 4; y < 256; y += 32) {
      for (let x = 4; x < 256; x += 24) {
        const h = (x * 7 + y * 13) % 17;
        if (h < 6) {
          ctx.fillStyle = h % 3 === 0 ? '#93c5fd' : '#fef08a';
          ctx.fillRect(x + 2, y + 2, 14, 20);
        }
      }
    }
    return reg(finalizeColorTex(c, 2, 4, maxAniso));
  })();

  const skyscraperConcrete = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 8; y < 256; y += 32) {
      ctx.fillStyle = '#57534e';
      ctx.fillRect(0, y - 4, 256, 4);
      for (let x = 10; x < 246; x += 32) {
        const lit = ((x * 5 + y * 11) % 9) < 3;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 1, y - 1, 22, 20);
        ctx.fillStyle = lit ? '#fde68a' : '#2b435f';
        ctx.fillRect(x, y, 20, 18);
      }
    }
    return reg(finalizeColorTex(c, 2, 4, maxAniso));
  })();

  const residentialFacade = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#d6cfc4';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 12; y < 256; y += 42) {
      for (let x = 14; x < 246; x += 46) {
        const warm = ((x + y) % 5) === 0;
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(x - 2, y - 2, 30, 26);
        ctx.fillStyle = warm ? '#fde68a' : '#273647';
        ctx.fillRect(x, y, 26, 22);
      }
    }
    return reg(finalizeColorTex(c, 2, 3, maxAniso));
  })();

  const commercialTerreo = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#e4e0d8';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 14; y < 256; y += 44) {
      for (let x = 16; x < 240; x += 56) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y, 42, 28);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(x + 3, y + 3, 36, 22);
      }
    }
    return reg(finalizeColorTex(c, 2, 2, maxAniso));
  })();

  // =========================================================================
  // 4. LOJAS (VITRINES, LETREIROS, TOLDOS, BARBER POLE, OUTDOORS)
  // =========================================================================
  const shopConfigs = [
    { name: 'MOTORS 50', sub: 'CONCESSIONÁRIA', bg: '#0f172a', accent: '#f59e0b', interior: '#1e293b', kind: 'auto' },
    { name: 'CAFÉ CARIOCA', sub: 'BISTRÔ & CAFETERIA', bg: '#451a03', accent: '#fb923c', interior: '#78350f', kind: 'food' },
    { name: 'CYBER 50', sub: 'TECH & GAMES', bg: '#09090b', accent: '#06b6d4', interior: '#0e7490', kind: 'tech' },
    { name: 'EXPRESS 24H', sub: 'MERCADO', bg: '#064e3b', accent: '#34d399', interior: '#065f46', kind: 'food' },
    { name: 'BARBEARIA', sub: 'CLÁSSICA', bg: '#27272a', accent: '#ef4444', interior: '#3f3f46', kind: 'service' },
    { name: 'SHOPPING METRÓPOLE', sub: 'GALERIA CENTRAL', bg: '#1e1b4b', accent: '#ec4899', interior: '#312e81', kind: 'fashion' },
    { name: 'FARMÁCIA POPULAR', sub: 'SAÚDE 24H', bg: '#14532d', accent: '#4ade80', interior: '#dcfce7', kind: 'service' },
    { name: 'PADARIA PÃO QUENTE', sub: 'CONFEITARIA & LANCHES', bg: '#7c2d12', accent: '#fde047', interior: '#9a3412', kind: 'food' },
    { name: 'BURGER 50', sub: 'LANCHONETE & CHOPP', bg: '#7f1d1d', accent: '#facc15', interior: '#991b1b', kind: 'food' },
    { name: 'OFICINA TURBO', sub: 'AUTO ELÉTRICA & PNEUS', bg: '#1e293b', accent: '#38bdf8', interior: '#334155', kind: 'auto' },
    { name: 'ELETRÔNICOS BR', sub: 'CELULARES & ÁUDIO', bg: '#312e81', accent: '#22d3ee', interior: '#1e1b4b', kind: 'tech' },
    { name: 'BAR DO ZÉ', sub: 'MERCADINHO DA VILA', bg: '#78350f', accent: '#fbbf24', interior: '#451a03', kind: 'food' },
    // 12..17: Novas Lojas de Roupa & Moda + Restaurantes / Comida
    { name: 'MODA URBANA', sub: 'ROUPAS & STREETWEAR', bg: '#18181b', accent: '#f472b6', interior: '#3f3f46', kind: 'fashion' },
    { name: 'ATELIER VESTIR', sub: 'BOUTIQUE & CALÇADOS', bg: '#4c1d95', accent: '#fde047', interior: '#5b21b6', kind: 'fashion' },
    { name: 'PIZZARIA NOBILE', sub: 'FORNO À LENHA & MASSAS', bg: '#7f1d1d', accent: '#4ade80', interior: '#450a0a', kind: 'food' },
    { name: 'CHURRASCARIA BRASA', sub: 'GRILL & COMIDA TÍPICA', bg: '#78350f', accent: '#f59e0b', interior: '#451a03', kind: 'food' },
    { name: 'AÇAÍ TROPICAL', sub: 'GELATOS & SUCOS', bg: '#581c87', accent: '#a3e635', interior: '#3b0764', kind: 'food' },
    { name: 'TÊNIS & SNEAKERS', sub: 'MODA ESPORTIVA', bg: '#0f172a', accent: '#38bdf8', interior: '#1e293b', kind: 'fashion' },
    // 18..21: Comércio Comunitário Autêntico do Morro da Esperança
    { name: 'MERCEARIA ESPERANÇA', sub: 'PÃO · FRIOS · MERCADO', bg: '#064e3b', accent: '#facc15', interior: '#065f46', kind: 'food' },
    { name: 'ESPETINHO DA LAJE', sub: 'CHURRASCO & SAMBA', bg: '#7f1d1d', accent: '#fb923c', interior: '#450a0a', kind: 'food' },
    { name: 'AÇAÍ DO MORRO', sub: 'AÇAÍ & LANCHONETE', bg: '#4c1d95', accent: '#a3e635', interior: '#3b0764', kind: 'food' },
    { name: 'CORTE REAL BARBER', sub: 'FADE & NAVALHA', bg: '#18181b', accent: '#38bdf8', interior: '#27272a', kind: 'service' },
    // 22..24: Quiosques da Praia & Comércio do Entorno Escolar
    { name: 'QUIOSQUE ÁGUA DE COCO', sub: 'ORLA · PASTEL & CALDO', bg: '#065f46', accent: '#fde047', interior: '#115e59', kind: 'food' },
    { name: 'QUIOSQUE BRISA DO MAR', sub: 'AÇAÍ · PRANCHAS · SOL', bg: '#0369a1', accent: '#fb923c', interior: '#0c4a6e', kind: 'food' },
    { name: 'PAPELARIA DO ESTUDANTE', sub: 'LIVROS · XEROX · LANCHES', bg: '#1e3a8a', accent: '#facc15', interior: '#1e40af', kind: 'tech' },
    // 25..29: Lojas do Grande Calçadão da Praia
    { name: 'RESTAURANTE MARÉ ALTA', sub: 'FRUTOS DO MAR · DECK VISTA MAR', bg: '#0f172a', accent: '#38bdf8', interior: '#1e293b', kind: 'food' },
    { name: 'SORVETERIA & AÇAÍ PRAIA', sub: 'GELATOS · AÇAÍ NA TIGELA', bg: '#701a75', accent: '#f472b6', interior: '#4a044e', kind: 'food' },
    { name: 'SURF & MODA PRAIA', sub: 'PRANCHAS · BIQUÍNIS · SHORTS', bg: '#0e7490', accent: '#fde047', interior: '#155e75', kind: 'fashion' },
    { name: 'BAR DO LEME & PETISCOS', sub: 'DRINKS · CHOPP · MÚSICA AO VIVO', bg: '#7c2d12', accent: '#fb923c', interior: '#431407', kind: 'food' },
    { name: 'CAIAQUE & STAND-UP', sub: 'ALUGUEL NÁUTICO · PASSEIOS', bg: '#064e3b', accent: '#22d3ee', interior: '#042f2e', kind: 'service' },
    // 30..33: Expansão Sul da Praia & Ilha da Restinga
    { name: 'PEIXARIA MAR AZUL', sub: 'PEIXE NA BRASA · CAMARÃO · MOQUECA', bg: '#1e3a8a', accent: '#38bdf8', interior: '#172554', kind: 'food' },
    { name: 'CLUBE DA PRAIA', sub: 'BEACH LOUNGE · DRINKS & DJ', bg: '#312e81', accent: '#facc15', interior: '#1e1b4b', kind: 'food' },
    { name: 'MERGULHO & PASSEIOS', sub: 'SNORKEL · ESCUNA · ARQUIPÉLAGO', bg: '#0f766e', accent: '#fde047', interior: '#134e4a', kind: 'service' },
    { name: 'BAR DA ILHOTA', sub: 'RESTINGA · ÁGUA DE COCO & PETISCOS', bg: '#854d0e', accent: '#bef264', interior: '#422006', kind: 'food' },
  ];

  const shopSigns = shopConfigs.map((sc) => {
    const [c, ctx] = makeCanvas(512, 128);
    ctx.fillStyle = sc.bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = sc.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sc.name, 256, 66);
    ctx.fillStyle = sc.accent;
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sc.sub, 256, 100);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const shopVitrine = shopConfigs.map((sc) => {
    const [c, ctx] = makeCanvas(256, 192);
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#fef3c7');
    g.addColorStop(0.55, sc.interior);
    g.addColorStop(1, '#18181b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 192);

    if (sc.kind === 'fashion') {
      // Hanger rail + colorful garments & 2 display mannequins
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(20, 48);
      ctx.lineTo(236, 48);
      ctx.stroke();
      const shirtCols = ['#f472b6', '#38bdf8', '#facc15', '#f8fafc', '#fb923c', '#34d399'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = shirtCols[i];
        ctx.fillRect(28 + i * 33, 52, 22, 42);
      }
      // Mannequin silhouettes
      [70, 184].forEach((mx, mi) => {
        ctx.fillStyle = mi === 0 ? '#f8fafc' : sc.accent;
        ctx.beginPath();
        ctx.arc(mx, 102, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(mx - 12, 114, 24, 52);
      });
    } else if (sc.kind === 'food') {
      // Warm menu board + lit glass food counter & stools
      ctx.fillStyle = '#18181b';
      ctx.fillRect(28, 22, 200, 42);
      ctx.fillStyle = sc.accent;
      ctx.fillRect(36, 30, 84, 8);
      ctx.fillRect(36, 44, 120, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(22, 106, 212, 34);
      ctx.fillStyle = '#fbbf24';
      for (let t = 0; t < 4; t++) {
        ctx.fillRect(34 + t * 50, 112, 34, 16);
      }
    } else if (sc.kind === 'tech') {
      ctx.fillStyle = sc.accent;
      ctx.fillRect(36, 48, 52, 34);
      ctx.fillRect(102, 48, 52, 34);
      ctx.fillRect(168, 48, 52, 34);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      for (let s = 35; s <= 125; s += 35) {
        ctx.fillRect(24, s, 208, 6);
      }
      ctx.fillStyle = sc.accent;
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(36 + i * 50, 82, 28, 44);
      }
    }

    // Storefront mullions + glass reflection diagonal
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 184);
    ctx.beginPath();
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 192);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(75, 0);
    ctx.lineTo(25, 192);
    ctx.lineTo(0, 192);
    ctx.closePath();
    ctx.fill();

    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const awningColors: [string, string][] = [
    ['#dc2626', '#f8fafc'],
    ['#059669', '#fef3c7'],
    ['#2563eb', '#f8fafc'],
    ['#d97706', '#18181b'],
  ];
  const awningStripes = awningColors.map(([c1, c2]) => {
    const [c, ctx] = makeCanvas(256, 128);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? c1 : c2;
      ctx.fillRect(x, 0, 32, 128);
    }
    return reg(finalizeColorTex(c, 2, 1, maxAniso));
  });

  const barberPole = (() => {
    const [c, ctx] = makeCanvas(128, 256);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 256);
    for (let i = -256; i < 384; i += 48) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i + 128);
      ctx.stroke();

      ctx.strokeStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(0, i + 24);
      ctx.lineTo(128, i + 152);
      ctx.stroke();
    }
    return reg(finalizeColorTex(c, 1, 2, maxAniso));
  })();

  const billboard = [
    ['BEBA GUARANÁ SOL', 'REFREQUE A CIDADE', '#065f46', '#fde047'],
    ['MOTORS 50 · NOVOS 2026', 'TEST DRIVE NA AVENIDA', '#7f1d1d', '#f59e0b'],
  ].map(([title, sub, bg, acc]) => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 236);
    ctx.fillStyle = acc;
    ctx.font = 'bold 48px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 118);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sub, 256, 170);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const salesBillboards = [
    ['NEXUS CORP · VENDAS B2B', 'SALAS & SEDES EMPRESARIAIS · 4004-5050', 'LANÇAMENTO', '#0f172a', '#f59e0b'],
    ['VANGUARDA BUSINESS', 'LAJES CORPORATIVAS + ESTACIONAMENTO', 'OPORTUNIDADE', '#064e3b', '#22d3ee'],
    ['ALVORADA TRADE CENTER', 'SHOWROOM, LOGÍSTICA & ESCRITÓRIOS', 'COMERCIAL', '#450a0a', '#fbbf24'],
    ['METRÓPOLE PRIME B2B', 'ESPAÇOS PRONTOS PARA SUA EMPRESA', 'VISITE HOJE', '#1e1b4b', '#38bdf8'],
  ].map(([title, sub, badge, bg, acc]) => {
    const [c, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);

    // Architectural diagonal accent stripe
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(512, 0);
    ctx.lineTo(512, 256);
    ctx.lineTo(240, 256);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = acc;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 236);

    // Top badge
    ctx.fillStyle = acc;
    ctx.fillRect(28, 26, 176, 34);
    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badge, 116, 50);

    // Main title & subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, 28, 128);

    ctx.fillStyle = acc;
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sub, 28, 172);

    // Bottom CTA bar
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(28, 198, 456, 30);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('PLANTÃO DE VENDAS NO LOCAL · ESTACIONAMENTO GRATUITO', 40, 219);

    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  // =========================================================================
  // 5. MORRO: GRAFFITI WALL, BRICK, ZINC ROOF, SOCCER FIELD, HELIPAD
  // =========================================================================
  const graffitiWall = (() => {
    const [c, ctx] = makeCanvas(1024, 256);
    ctx.fillStyle = '#52525b';
    ctx.fillRect(0, 0, 1024, 256);

    // Concrete blocks
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Vibrant Brazilian street mural waves & geometric shapes
    const palette = ['#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#eab308'];
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.arc(60 + i * 72, 130 + Math.sin(i) * 45, 34 + (i % 3) * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 74px "Barlow Condensed", sans-serif';
    ctx.fillText('MORRO DA ESPERANÇA', 110, 152);
    ctx.fillStyle = '#fef08a';
    ctx.fillText('MORRO DA ESPERANÇA', 105, 147);

    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const morroBrick = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#a85134';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#7c3c27';
    ctx.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
      const offset = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < 128; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 16);
        ctx.stroke();
      }
    }
    return reg(finalizeColorTex(c, 2, 2, maxAniso));
  })();

  const zincRoof = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#71717a';
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 8) {
      ctx.fillStyle = (x / 8) % 2 === 0 ? '#8c8c96' : '#52525b';
      ctx.fillRect(x, 0, 4, 128);
    }
    return reg(finalizeColorTex(c, 3, 2, maxAniso));
  })();

  const soccerField = (() => {
    const [c, ctx] = makeCanvas(512, 256);
    for (let x = 0; x < 512; x += 64) {
      ctx.fillStyle = (x / 64) % 2 === 0 ? '#16a34a' : '#15803d';
      ctx.fillRect(x, 0, 64, 256);
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, 480, 224);
    ctx.beginPath();
    ctx.moveTo(256, 16);
    ctx.lineTo(256, 240);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 128, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(16, 68, 56, 120);
    ctx.strokeRect(440, 68, 56, 120);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const helipad = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(78, 66, 22, 124);
    ctx.fillRect(156, 66, 22, 124);
    ctx.fillRect(78, 117, 100, 22);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const morroPlaster = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 650; i++) {
      const x = (i * 47) % 128;
      const y = (i * 89) % 128;
      const v = 95 + (i % 35);
      ctx.fillStyle = `rgb(${v},${v - 3},${v - 6})`;
      ctx.fillRect(x, y, 4, 3);
    }
    // Concrete floor slab seam + shutter window
    ctx.fillStyle = '#44403c';
    ctx.fillRect(0, 62, 128, 4);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const terracottaRoof = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.fillStyle = '#b4532a';
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 16) {
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(x, 0, 4, 128);
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(x + 4, 0, 8, 128);
    }
    for (let y = 0; y < 128; y += 16) {
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(0, y, 128, 3);
    }
    return reg(finalizeColorTex(c, 2, 2, maxAniso));
  })();

  const clothesline = (() => {
    const [c, ctx] = makeCanvas(256, 64);
    ctx.clearRect(0, 0, 256, 64);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(128, 22, 256, 8);
    ctx.stroke();
    const cols = ['#ef4444', '#f8fafc', '#3b82f6', '#facc15', '#10b981', '#ec4899'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      const cx = 24 + i * 38;
      const cy = 14 + Math.sin((i / 5) * Math.PI) * 7;
      ctx.fillRect(cx, cy, 20, 28);
    }
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignStop = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) * Math.PI) / 4;
      const px = 64 + Math.cos(a) * 58;
      const py = 64 + Math.sin(a) * 58;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PARE', 64, 66);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignSpeed = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 46px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('60', 64, 54);
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('km/h', 64, 88);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignPedestrian = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-42, -42, 84, 84);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-38, -38, 76, 76);
    ctx.restore();
    // Stylized pedestrian + crosswalk dashes
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(64, 38, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(64, 46);
    ctx.lineTo(64, 68);
    ctx.lineTo(52, 86);
    ctx.moveTo(64, 68);
    ctx.lineTo(76, 86);
    ctx.moveTo(50, 56);
    ctx.lineTo(78, 56);
    ctx.stroke();
    [40, 56, 72, 88].forEach((dx) => ctx.fillRect(dx - 4, 92, 8, 6));
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignSlope = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-42, -42, 84, 84);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-38, -38, 76, 76);
    ctx.restore();
    // Steep incline wedge + truck icon
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(30, 86);
    ctx.lineTo(96, 86);
    ctx.lineTo(96, 52);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 16px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('11%', 54, 54);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignNoParking = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(64, 64, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 62px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', 64, 66);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(26, 26);
    ctx.lineTo(102, 102);
    ctx.stroke();
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const makeTouristSign = (line1: string, line2: string) => {
    const [c, ctx] = makeCanvas(256, 128);
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 26px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(line1, 128, 52);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(line2, 128, 90);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  };
  const trafficSignTouristSpring = makeTouristSign('NASCENTE & CÓRREGO →', 'CACHOEIRA DA SERRA');
  const trafficSignTouristOverlook = makeTouristSign('MIRANTE ALTO ↑', 'ALTITUDE +13,8m · VISTA');

  const busStopPlaque = (() => {
    const [c, ctx] = makeCanvas(128, 160);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 128, 160);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 116, 148);
    // Bus pictogram
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 24, 68, 54);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(36, 30, 56, 22);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(36, 60, 12, 8);
    ctx.fillRect(80, 60, 12, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PONTO', 64, 110);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 28px "Barlow Condensed", sans-serif';
    ctx.fillText('LINHA 50', 64, 140);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const busStopMap = (() => {
    const [c, ctx] = makeCanvas(192, 256);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 192, 256);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 192, 38);
    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROTA EXPRESSA 50', 96, 26);
    // Route line stops
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(32, 56);
    ctx.lineTo(32, 228);
    ctx.stroke();
    const stops = ['CAIS & PRAIA DA ORLA', 'PRAÇA DA BANDEIRA', 'SHOPPING METRÓPOLE', 'ESCOLA MUNICIPAL', 'CIDADE ALTA (+9m)', 'MORRO ESPERANÇA'];
    stops.forEach((st, idx) => {
      const sy = 64 + idx * 32;
      ctx.fillStyle = idx === 2 || idx === 3 ? '#facc15' : '#ffffff';
      ctx.beginPath();
      ctx.arc(32, sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(st, 48, sy + 4);
    });
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const streetNamePlates = [
    ['AV. BEIRA-RIO', 'BAIXADA · CAIS'],
    ['RUA DAS LOJAS', 'SHOPPING & MODA'],
    ['AV. CENTRAL', 'EIXO NORTE–SUL'],
    ['AV. CIDADE ALTA', 'BAIRRO SUL (+9m)'],
    ['MARGINAL NORTE', 'ACESSO MORRO'],
  ].map(([st, sub]) => {
    const [c, ctx] = makeCanvas(256, 96);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 246, 86);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(st, 128, 46);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sub, 128, 74);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const gantrySigns = [
    { left: '← PRÉDIOS OESTE', mid: 'PRAÇA & PONTES ↑', right: 'SHOPPING / MODA →', bg: '#065f46' },
    { left: '← GASTRONOMIA', mid: 'CIDADE ALTA +9m ↑', right: 'MIRANTE SUL +14m →', bg: '#1e3a8a' },
    { left: '← CAIS BAIXO (RIO)', mid: 'MORRO ESPERANÇA ↑', right: 'NASCENTE & CÓRREGO →', bg: '#065f46' },
  ].map((g) => {
    const [c, ctx] = makeCanvas(768, 192);
    ctx.fillStyle = g.bg;
    ctx.fillRect(0, 0, 768, 192);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 752, 176);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(256, 18);
    ctx.lineTo(256, 174);
    ctx.moveTo(512, 18);
    ctx.lineTo(512, 174);
    ctx.stroke();

    const cols = [
      { x: 128, t: g.left, badge: 'SAÍDA A' },
      { x: 384, t: g.mid, badge: 'EIXO 01' },
      { x: 640, t: g.right, badge: 'SAÍDA B' },
    ];
    cols.forEach((col) => {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(col.x - 42, 26, 84, 26);
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 18px "Barlow Condensed", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(col.badge, col.x, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px "Barlow Condensed", sans-serif';
      ctx.fillText(col.t, col.x, 114);
    });
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const wayfindingMap = (() => {
    const [c, ctx] = makeCanvas(256, 192);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 244, 180);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GUIA · CIDADE NOVA', 128, 30);
    // Stylized city map blocks
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(24, 52, 208, 18); // river
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(62, 34, 132, 16); // morro
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(26, 76, 62, 40); // buildings
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(94, 76, 22, 22); // plaza
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(122, 76, 108, 40); // shopping/food/fashion
    ctx.fillStyle = '#34d399';
    ctx.fillRect(26, 122, 204, 48); // residential + overlook
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const calcadaPraia = (() => {
    // Classic Copacabana black & cream Portuguese mosaic wave pattern
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#f5f0e1';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#18181b';
    for (let row = 0; row < 4; row++) {
      const y0 = row * 64;
      ctx.beginPath();
      ctx.moveTo(0, y0 + 22);
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y0 + 22 + Math.sin((x / 256) * Math.PI * 2) * 14);
      }
      for (let x = 256; x >= 0; x -= 16) {
        ctx.lineTo(x, y0 + 46 + Math.sin((x / 256) * Math.PI * 2) * 14);
      }
      ctx.closePath();
      ctx.fill();
    }
    return reg(finalizeColorTex(c, 6, 1, maxAniso));
  })();

  const beachSand = (() => {
    const S = 512;
    const [c, ctx] = makeCanvas(S, S);
    ctx.fillStyle = '#ead29d';
    ctx.fillRect(0, 0, S, S);

    // Subtle wind-sculpted coastal sand ripples
    for (let y = 0; y < S; y += 6) {
      const rippleAlpha = 0.045 + 0.025 * Math.sin(y * 0.14);
      ctx.strokeStyle = y % 12 === 0 ? `rgba(255,248,225,${rippleAlpha + 0.03})` : `rgba(182,146,84,${rippleAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 16) {
        const wy = y + Math.sin((x / S) * Math.PI * 4 + y * 0.05) * 4;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Fine mineral grain & crushed shell flecks
    for (let i = 0; i < 14000; i++) {
      const x = (i * 173 + (i % 19) * 7) % S;
      const y = (i * 311 + (i % 23) * 5) % S;
      const kind = i % 7;
      ctx.fillStyle =
        kind === 0
          ? 'rgba(255,250,235,0.45)'
          : kind < 3
            ? 'rgba(204,170,104,0.38)'
            : kind < 5
              ? 'rgba(241,218,162,0.40)'
              : 'rgba(176,138,76,0.28)';
      ctx.fillRect(x, y, i % 11 === 0 ? 2 : 1, i % 13 === 0 ? 2 : 1);
    }
    return reg(finalizeColorTex(c, 5, 6, maxAniso));
  })();

  const beachPlazaPattern = (() => {
    const S = 512;
    const [c, ctx] = makeCanvas(S, S);
    ctx.fillStyle = '#f2ecdc';
    ctx.fillRect(0, 0, S, S);

    const cx = S * 0.5;
    const cy = S * 0.5;
    // Concentric Ponta Negra style black-and-cream Portuguese stone rings & geometric waves
    for (let r = 28; r <= 246; r += 28) {
      ctx.strokeStyle = (r / 28) % 2 === 1 ? '#18181b' : '#b45309';
      ctx.lineWidth = (r / 28) % 2 === 1 ? 8 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Radiating basalt wedge rays
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(24,24,27,0.85)' : 'rgba(245,240,225,0.9)';
      ctx.beginPath();
      ctx.moveTo(46, -4);
      ctx.lineTo(240, -11);
      ctx.lineTo(240, 11);
      ctx.lineTo(46, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Inner circular stone medallion
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5f0e1';
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const surfFoam = (() => {
    const W = 256;
    const H = 128;
    const [c, ctx] = makeCanvas(W, H);
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0.0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.32, 'rgba(224,247,250,0.42)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.92)');
    g.addColorStop(0.78, 'rgba(240,253,255,0.55)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Bubbly sea-foam lace speckles
    for (let i = 0; i < 180; i++) {
      const fx = 65 + ((i * 53) % 140);
      const fy = (i * 37) % H;
      const r = 1.5 + (i % 4) * 1.1;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return reg(finalizeColorTex(c, 1, 8, maxAniso));
  })();

  const schoolSign = (() => {
    const [c, ctx] = makeCanvas(512, 128);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 108, 512, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E.M. CIDADE NOVA', 256, 56);
    ctx.fillStyle = '#fef08a';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ESCOLA PÚBLICA MUNICIPAL · ENSINO INTEGRAL', 256, 88);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const schoolCourtyard = (() => {
    const [c, ctx] = makeCanvas(256, 256);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(28, 28, 200, 200);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 200, 200);
    ctx.beginPath();
    ctx.moveTo(28, 128);
    ctx.lineTo(228, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 128, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(88, 28, 80, 32);
    ctx.strokeRect(88, 196, 80, 32);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  const trafficSignSchool = (() => {
    const [c, ctx] = makeCanvas(128, 128);
    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-42, -42, 84, 84);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 6;
    ctx.strokeRect(-38, -38, 76, 76);
    ctx.restore();
    // Adult + smaller student walking silhouette
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(54, 42, 6, 0, Math.PI * 2);
    ctx.arc(76, 52, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(54, 48);
    ctx.lineTo(54, 72);
    ctx.lineTo(44, 90);
    ctx.moveTo(54, 72);
    ctx.lineTo(62, 90);
    ctx.moveTo(76, 57);
    ctx.lineTo(76, 76);
    ctx.lineTo(69, 90);
    ctx.moveTo(76, 76);
    ctx.lineTo(83, 90);
    ctx.moveTo(54, 58);
    ctx.lineTo(76, 63);
    ctx.stroke();
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  })();

  return {
    flagAlbedo,
    flagBump,
    asphalt,
    asphaltAvenue,
    asphaltIntersection,
    sidewalk,
    plazaCompass,
    waterRipple,
    skyscraperGlass,
    skyscraperGlassEmissive,
    skyscraperConcrete,
    residentialFacade,
    commercialTerreo,
    shopVitrine,
    shopSigns,
    awningStripes,
    barberPole,
    billboard,
    salesBillboards,
    graffitiWall,
    helipad,
    morroBrick,
    morroPlaster,
    zincRoof,
    terracottaRoof,
    clothesline,
    trafficSignStop,
    trafficSignSpeed,
    trafficSignPedestrian,
    trafficSignSlope,
    trafficSignNoParking,
    trafficSignTouristSpring,
    trafficSignTouristOverlook,
    busStopPlaque,
    busStopMap,
    streetNamePlates,
    gantrySigns,
    wayfindingMap,
    soccerField,
    calcadaPraia,
    beachSand,
    beachPlazaPattern,
    surfFoam,
    schoolSign,
    schoolCourtyard,
    trafficSignSchool,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
