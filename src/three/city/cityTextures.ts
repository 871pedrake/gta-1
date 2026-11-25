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
  graffitiWall: THREE.CanvasTexture;
  helipad: THREE.CanvasTexture;
  morroBrick: THREE.CanvasTexture;
  morroPlaster: THREE.CanvasTexture;
  zincRoof: THREE.CanvasTexture;
  terracottaRoof: THREE.CanvasTexture;
  clothesline: THREE.CanvasTexture;
  trafficSignStop: THREE.CanvasTexture;
  trafficSignSpeed: THREE.CanvasTexture;
  soccerField: THREE.CanvasTexture;
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
    // Weathered double yellow center line & dashed white lane dividers
    ctx.fillStyle = '#eab308';
    ctx.fillRect(122, 0, 4, 256);
    ctx.fillRect(130, 0, 4, 256);
    ctx.fillStyle = '#e4e4e7';
    for (let y = 12; y < 256; y += 64) {
      ctx.fillRect(62, y, 4, 34);
      ctx.fillRect(190, y, 4, 34);
    }
    return reg(finalizeColorTex(c, 1, 6, maxAniso));
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
    { name: 'MOTORS 50', sub: 'CONCESSIONÁRIA', bg: '#0f172a', accent: '#f59e0b', interior: '#1e293b' },
    { name: 'CAFÉ CARIOCA', sub: 'BISTRÔ & CAFETERIA', bg: '#451a03', accent: '#fb923c', interior: '#78350f' },
    { name: 'CYBER 50', sub: 'TECH & GAMES', bg: '#09090b', accent: '#06b6d4', interior: '#0e7490' },
    { name: 'EXPRESS 24H', sub: 'MERCADO', bg: '#064e3b', accent: '#34d399', interior: '#065f46' },
    { name: 'BARBEARIA', sub: 'CLÁSSICA', bg: '#27272a', accent: '#ef4444', interior: '#3f3f46' },
    { name: 'SHOPPING METRÓPOLE', sub: 'GALERIA CENTRAL', bg: '#1e1b4b', accent: '#ec4899', interior: '#312e81' },
    { name: 'FARMÁCIA POPULAR', sub: 'SAÚDE 24H', bg: '#14532d', accent: '#4ade80', interior: '#dcfce7' },
    { name: 'PADARIA PÃO QUENTE', sub: 'CONFEITARIA & LANCHES', bg: '#7c2d12', accent: '#fde047', interior: '#9a3412' },
    { name: 'BURGER 50', sub: 'LANCHONETE & CHOPP', bg: '#7f1d1d', accent: '#facc15', interior: '#991b1b' },
    { name: 'OFICINA TURBO', sub: 'AUTO ELÉTRICA & PNEUS', bg: '#1e293b', accent: '#38bdf8', interior: '#334155' },
    { name: 'ELETRÔNICOS BR', sub: 'CELULARES & ÁUDIO', bg: '#312e81', accent: '#22d3ee', interior: '#1e1b4b' },
    { name: 'BAR DO ZÉ', sub: 'MERCADINHO DA VILA', bg: '#78350f', accent: '#fbbf24', interior: '#451a03' },
  ];

  const shopSigns = shopConfigs.map((sc) => {
    const [c, ctx] = makeCanvas(512, 128);
    ctx.fillStyle = sc.bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = sc.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sc.name, 256, 68);
    ctx.fillStyle = sc.accent;
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(sc.sub, 256, 100);
    return reg(finalizeColorTex(c, 1, 1, maxAniso));
  });

  const shopVitrine = shopConfigs.map((sc, idx) => {
    const [c, ctx] = makeCanvas(256, 192);
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, '#fef3c7');
    g.addColorStop(0.55, sc.interior);
    g.addColorStop(1, '#18181b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 192);

    // Interior shelves / mannequins / screens
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let s = 35; s <= 125; s += 35) {
      ctx.fillRect(24, s, 208, 6);
    }
    ctx.fillStyle = sc.accent;
    if (idx === 2) {
      // Glowing TV screens
      ctx.fillRect(36, 48, 52, 34);
      ctx.fillRect(102, 48, 52, 34);
      ctx.fillRect(168, 48, 52, 34);
    } else {
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

  return {
    flagAlbedo,
    flagBump,
    asphalt,
    asphaltAvenue,
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
    graffitiWall,
    helipad,
    morroBrick,
    morroPlaster,
    zincRoof,
    terracottaRoof,
    clothesline,
    trafficSignStop,
    trafficSignSpeed,
    soccerField,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
