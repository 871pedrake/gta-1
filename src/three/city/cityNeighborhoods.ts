import * as THREE from 'three';
import { CityTextureAtlas } from './cityTextures';
import { VegetationPlacement } from './cityVegetation';

export interface NeighborhoodBuildResult {
  group: THREE.Group;
  beaconMats: THREE.MeshStandardMaterial[];
  skylineGlowMats: THREE.MeshStandardMaterial[];
  parkedCarSpots: { x: number; y: number; z: number; rotY: number; color: number }[];
  dispose: () => void;
}

export function createFinancialCenterAndHorizon(
  atlas: CityTextureAtlas,
  lampMat: THREE.MeshStandardMaterial,
  treeCollector: {
    palms: VegetationPlacement[];
    ipesYellow: VegetationPlacement[];
    ipesPink: VegetationPlacement[];
    urbanLeafy: VegetationPlacement[];
    atlanticForest: VegetationPlacement[];
    shrubs: VegetationPlacement[];
  },
): NeighborhoodBuildResult {
  const group = new THREE.Group();
  group.name = 'Centro_Financeiro_Viaduto_Horizonte';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const beaconMats: THREE.MeshStandardMaterial[] = [];
  const skylineGlowMats: THREE.MeshStandardMaterial[] = [];

  const glassTints = [0x60a5fa, 0x2dd4bf, 0x94a3b8, 0xfbbf24, 0x818cf8];
  const glassMats = glassTints.map((tint) => {
    const m = regMat(
      new THREE.MeshPhysicalMaterial({
        map: atlas.skyscraperGlass,
        color: tint,
        emissive: 0xfef08a,
        emissiveMap: atlas.skyscraperGlassEmissive,
        emissiveIntensity: 0.75,
        roughness: 0.14,
        metalness: 0.65,
        clearcoat: 0.9,
      }),
    );
    skylineGlowMats.push(m);
    return m;
  });

  const concreteTowerMat = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.skyscraperConcrete,
      emissive: 0xfde68a,
      emissiveMap: atlas.skyscraperGlassEmissive,
      emissiveIntensity: 0.5,
      roughness: 0.62,
      metalness: 0.15,
    }),
  );
  skylineGlowMats.push(concreteTowerMat);

  const resTowerMat = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.residentialFacade,
      emissive: 0xfde68a,
      emissiveMap: atlas.skyscraperGlassEmissive,
      emissiveIntensity: 0.42,
      roughness: 0.65,
    }),
  );
  skylineGlowMats.push(resTowerMat);

  const matDarkSteel = regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.72 }));
  const matBrise = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.75 }));
  const matConcreteTrim = regMat(new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.78 }));
  const matHelipad = regMat(new THREE.MeshStandardMaterial({ map: atlas.helipad, roughness: 0.65 }));
  const matBeacon = regMat(
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 }),
  );
  beaconMats.push(matBeacon);

  const unitBoxGeo = regGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCylGeo = regGeo(new THREE.CylinderGeometry(1, 1, 1, 8));
  const beaconGeo = regGeo(new THREE.SphereGeometry(0.24, 8, 6));
  const padGeo = regGeo(new THREE.BoxGeometry(6.8, 0.2, 6.8));

  interface TowerSpec {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    style: 'glass' | 'concrete' | 'res';
    tintIdx: number;
    hasHelipad: boolean;
    hasBrise: boolean;
    hasSpire: boolean;
  }

  const towers: TowerSpec[] = [
    // West Financial Core (Av. Paulista / Faria Lima vibes)
    { x: -51, z: -17, w: 17, d: 17, h: 46, style: 'glass', tintIdx: 0, hasHelipad: true, hasBrise: true, hasSpire: true },
    { x: -51, z: -51, w: 16, d: 16, h: 58, style: 'glass', tintIdx: 1, hasHelipad: true, hasBrise: true, hasSpire: true },
    { x: -85, z: -17, w: 18, d: 17, h: 64, style: 'glass', tintIdx: 4, hasHelipad: true, hasBrise: false, hasSpire: true },
    { x: -85, z: -51, w: 17, d: 16, h: 42, style: 'concrete', tintIdx: 0, hasHelipad: false, hasBrise: true, hasSpire: true },
    { x: -51, z: -85, w: 16, d: 16, h: 35, style: 'concrete', tintIdx: 0, hasHelipad: true, hasBrise: false, hasSpire: false },
    { x: -119, z: -17, w: 16, d: 16, h: 38, style: 'glass', tintIdx: 2, hasHelipad: false, hasBrise: false, hasSpire: true },
    // East Corporate & Commercial Core
    { x: 51, z: -51, w: 17, d: 16, h: 44, style: 'glass', tintIdx: 3, hasHelipad: true, hasBrise: true, hasSpire: true },
    { x: 85, z: -17, w: 17, d: 17, h: 52, style: 'glass', tintIdx: 0, hasHelipad: true, hasBrise: true, hasSpire: true },
    { x: 85, z: -51, w: 16, d: 16, h: 39, style: 'concrete', tintIdx: 0, hasHelipad: false, hasBrise: true, hasSpire: false },
    { x: 119, z: -17, w: 16, d: 16, h: 31, style: 'res', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
    // Secondary Mid-rise Twin / Setback Towers inside downtown pockets
    { x: -46, z: -4, w: 6.8, d: 6.8, h: 21, style: 'res', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
    { x: 46, z: -4, w: 7.2, d: 7.2, h: 24, style: 'concrete', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
    { x: -92, z: 36, w: 12, d: 8.5, h: 25, style: 'res', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
    { x: 92, z: 36, w: 12, d: 8.5, h: 27, style: 'glass', tintIdx: 1, hasHelipad: false, hasBrise: false, hasSpire: true },
    { x: -114, z: 36, w: 11, d: 8.5, h: 19, style: 'res', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
    { x: 114, z: 36, w: 11, d: 8.5, h: 21, style: 'concrete', tintIdx: 0, hasHelipad: false, hasBrise: false, hasSpire: false },
  ];

  towers.forEach((t, idx) => {
    const tg = new THREE.Group();
    tg.position.set(t.x, 0.2, t.z);

    const bodyMat =
      t.style === 'glass' ? glassMats[t.tintIdx % glassMats.length] : t.style === 'concrete' ? concreteTowerMat : resTowerMat;

    // Podium base (gallery ground floor)
    const podiumH = 4.2;
    const podium = new THREE.Mesh(unitBoxGeo, matConcreteTrim);
    podium.scale.set(t.w + 1.2, podiumH, t.d + 1.2);
    podium.position.y = podiumH * 0.5;
    podium.castShadow = true;
    podium.receiveShadow = true;
    tg.add(podium);

    // Main shaft
    const shaftH = t.h - podiumH;
    const shaft = new THREE.Mesh(unitBoxGeo, bodyMat);
    shaft.scale.set(t.w, shaftH, t.d);
    shaft.position.y = podiumH + shaftH * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    tg.add(shaft);

    // Vertical metallic brises (architectural louvers)
    if (t.hasBrise) {
      for (let b = -2; b <= 2; b++) {
        const fin = new THREE.Mesh(unitBoxGeo, matBrise);
        fin.scale.set(0.24, shaftH * 0.92, t.d + 0.45);
        fin.position.set(b * (t.w * 0.19), podiumH + shaftH * 0.5, 0);
        tg.add(fin);
      }
    }

    // Setback mechanical crown
    const crownH = 3.6 + (idx % 3) * 1.4;
    const crown = new THREE.Mesh(unitBoxGeo, t.style === 'glass' ? bodyMat : matDarkSteel);
    crown.scale.set(t.w * 0.68, crownH, t.d * 0.68);
    crown.position.y = t.h + crownH * 0.5;
    crown.castShadow = true;
    tg.add(crown);

    const topY = t.h + crownH;

    // Rooftop AC Chiller units
    const chiller = new THREE.Mesh(unitBoxGeo, matBrise);
    chiller.scale.set(2.2, 1.1, 1.6);
    chiller.position.set(-t.w * 0.2, topY + 0.55, -t.d * 0.18);
    tg.add(chiller);

    // Helipad
    if (t.hasHelipad) {
      const pad = new THREE.Mesh(padGeo, matHelipad);
      pad.position.y = topY + 0.1;
      tg.add(pad);
    }

    // Telecom antenna spire + blinking red beacon
    if (t.hasSpire) {
      const mastH = 7.5 + (idx % 3) * 2.5;
      const mast = new THREE.Mesh(unitCylGeo, matDarkSteel);
      mast.scale.set(0.14, mastH, 0.14);
      mast.position.set(t.w * 0.22, topY + mastH * 0.5, t.d * 0.22);
      tg.add(mast);

      const beacon = new THREE.Mesh(beaconGeo, matBeacon);
      beacon.position.set(t.w * 0.22, topY + mastH + 0.15, t.d * 0.22);
      tg.add(beacon);
    }

    group.add(tg);
  });

  // =========================================================================
  // ELEVATED PERIPHERAL VIADUCT (Z = -102, X = -104 .. +104)
  // =========================================================================
  const matDeck = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.asphaltAvenue,
      color: 0x3b3f47,
      roughness: 0.84,
    }),
  );
  const viaduct = new THREE.Group();
  viaduct.name = 'Viaduto_Metropolitano';

  // Main elevated span over Z = -102 (Y = 6.2m) from X = -64 to +64 + inclined ramps to -102/+102
  const span = new THREE.Mesh(unitBoxGeo, matDeck);
  span.scale.set(128, 0.65, 9.6);
  span.position.set(0, 6.0, -102);
  span.castShadow = true;
  span.receiveShadow = true;
  viaduct.add(span);

  // Side barriers & streetlamps on viaduct
  [-4.6, 4.6].forEach((dz) => {
    const rail = new THREE.Mesh(unitBoxGeo, matConcreteTrim);
    rail.scale.set(128, 0.85, 0.38);
    rail.position.set(0, 6.72, -102 + dz);
    viaduct.add(rail);
  });

  // Ramps connecting down cleanly to ground level at X = ±100
  [-1, 1].forEach((side) => {
    const ramp = new THREE.Mesh(unitBoxGeo, matDeck);
    ramp.scale.set(36, 0.65, 9.4);
    ramp.position.set(side * 81.5, 3.02, -102);
    ramp.rotation.z = side * -0.172;
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    viaduct.add(ramp);
  });

  // Concrete piers supporting viaduct (spaced clear of N-S avenue centers at -34, 0, +34!)
  [-56, -18, 18, 56].forEach((px) => {
    const pier = new THREE.Mesh(unitBoxGeo, matConcreteTrim);
    pier.scale.set(1.6, 6.0, 2.8);
    pier.position.set(px, 3.0, -102);
    pier.castShadow = true;
    viaduct.add(pier);

    const pole = new THREE.Mesh(unitCylGeo, matDarkSteel);
    pole.scale.set(0.08, 4.2, 0.08);
    pole.position.set(px, 8.4, -102 - 4.4);
    viaduct.add(pole);

    const bulb = new THREE.Mesh(unitBoxGeo, lampMat);
    bulb.scale.set(0.45, 0.08, 0.25);
    bulb.position.set(px, 10.5, -102 - 4.0);
    viaduct.add(bulb);
  });
  group.add(viaduct);

  // =========================================================================
  // CONTINUOUS HORIZON SKYLINE RING & ROLLING HILLS (Eliminates "island void")
  // =========================================================================
  const horizonBoxes: { x: number; y: number; z: number; w: number; h: number; d: number; c: number }[] = [];
  const horizonPalette = [0x1e293b, 0x334155, 0x27272a, 0x3f3f46, 0x475569, 0x1e3a5f];

  for (let gx = -240; gx <= 240; gx += 32) {
    for (let gz = -240; gz <= 160; gz += 32) {
      // Skip inner detailed city core (-132..+132, -134..+140) and river channel (Z = 4..30)
      if (Math.abs(gx) < 134 && gz > -136 && gz < 142) continue;
      if (gz > 2 && gz < 32) continue;

      const hash = Math.abs(Math.sin(gx * 0.37 + gz * 0.71));
      const h = gz > 36 ? 6 + hash * 12 : 10 + hash * 34;
      const w = 14 + (hash * 8);
      const d = 14 + ((1 - hash) * 8);
      horizonBoxes.push({
        x: gx + (hash - 0.5) * 6,
        y: h * 0.5 - 0.1,
        z: gz + (hash - 0.5) * 6,
        w,
        h,
        d,
        c: horizonPalette[Math.floor(hash * horizonPalette.length) % horizonPalette.length],
      });
    }
  }

  if (horizonBoxes.length > 0) {
    const horizonMat = regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.skyscraperConcrete,
        emissive: 0xfef08a,
        emissiveMap: atlas.skyscraperGlassEmissive,
        emissiveIntensity: 0.35,
        roughness: 0.75,
      }),
    );
    skylineGlowMats.push(horizonMat);
    const horizonInst = new THREE.InstancedMesh(unitBoxGeo, horizonMat, horizonBoxes.length);
    horizonInst.frustumCulled = false;
    horizonInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const cTmp = new THREE.Color();
    horizonBoxes.forEach((hb, i) => {
      dummy.position.set(hb.x, hb.y, hb.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(hb.w, hb.h, hb.d);
      dummy.updateMatrix();
      horizonInst.setMatrixAt(i, dummy.matrix);
      horizonInst.setColorAt(i, cTmp.setHex(hb.c));
    });
    horizonInst.instanceMatrix.needsUpdate = true;
    if (horizonInst.instanceColor) horizonInst.instanceColor.needsUpdate = true;
    group.add(horizonInst);
  }

  // Soft outer horizon green hills flanking West, East & South-Far + Behind Morro
  const hillGeo = regGeo(new THREE.ConeGeometry(42, 22, 10));
  const hillMat = regMat(new THREE.MeshStandardMaterial({ color: 0x243b24, roughness: 0.94 }));
  const hillSpots: [number, number, number, number][] = [
    [-210, 125, 1.8, 1.4],
    [-155, 155, 1.5, 1.3],
    [155, 155, 1.6, 1.35],
    [215, 125, 1.9, 1.45],
    [-245, -40, 1.7, 1.1],
    [245, -40, 1.7, 1.15],
    [-220, -200, 1.8, 1.0],
    [220, -200, 1.8, 1.0],
    [0, -255, 2.2, 0.9],
  ];
  const hillInst = new THREE.InstancedMesh(hillGeo, hillMat, hillSpots.length);
  hillInst.frustumCulled = false;
  const hDummy = new THREE.Object3D();
  hillSpots.forEach(([hx, hz, sx, sy], i) => {
    hDummy.position.set(hx, sy * 9.5 - 0.5, hz);
    hDummy.scale.set(sx, sy, sx * 0.9);
    hDummy.rotation.y = i * 0.8;
    hDummy.updateMatrix();
    hillInst.setMatrixAt(i, hDummy.matrix);

    // Scatter a few Atlantic forest crowns along visible foothills
    if (hz > 80) {
      for (let k = 0; k < 4; k++) {
        treeCollector.atlanticForest.push({
          x: hx + (k - 1.5) * 14,
          y: 4 + (k % 2) * 3,
          z: hz - 18,
          scale: 1.35,
        });
      }
    }
  });
  hillInst.instanceMatrix.needsUpdate = true;
  group.add(hillInst);

  return {
    group,
    beaconMats,
    skylineGlowMats,
    parkedCarSpots: [],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

// ============================================================================
// BAIRRO RESIDENCIAL DE CASAS URBANAS + PRAÇA DO BAIRRO + BARES DE ESQUINA
// ============================================================================
export function createResidentialDistrict(
  atlas: CityTextureAtlas,
  windowEmissiveMat: THREE.MeshStandardMaterial,
  lampMat: THREE.MeshStandardMaterial,
  treeCollector: {
    palms: VegetationPlacement[];
    ipesYellow: VegetationPlacement[];
    ipesPink: VegetationPlacement[];
    urbanLeafy: VegetationPlacement[];
    atlanticForest: VegetationPlacement[];
    shrubs: VegetationPlacement[];
  },
): NeighborhoodBuildResult {
  const group = new THREE.Group();
  group.name = 'Bairro_Residencial_Casas';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const parkedCarSpots: { x: number; y: number; z: number; rotY: number; color: number }[] = [];

  // Residential Blocks (cx, cz)
  const houseBlocks: [number, number][] = [
    [-17, -85],
    [51, -85],
    [85, -85],
    [-85, -85],
    [-51, -119],
    [-17, -119],
    [17, -119],
    [51, -119],
    [85, -119],
    [-85, -119],
    [119, -51],
    [119, -85],
    [-119, -51],
    [-119, -85],
  ];

  // Landscaped Bairro Park at (+17, -85)
  const parkGroup = new THREE.Group();
  parkGroup.position.set(17, 0.2, -85);
  const lawnGeo = regGeo(new THREE.BoxGeometry(20.6, 0.08, 20.6));
  const lawnMat = regMat(new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.9 }));
  const lawn = new THREE.Mesh(lawnGeo, lawnMat);
  lawn.position.y = 0.04;
  lawn.receiveShadow = true;
  parkGroup.add(lawn);

  const crossPathMat = regMat(new THREE.MeshStandardMaterial({ map: atlas.sidewalk, roughness: 0.85 }));
  const pathX = new THREE.Mesh(regGeo(new THREE.BoxGeometry(21.4, 0.10, 3.2)), crossPathMat);
  pathX.position.y = 0.06;
  parkGroup.add(pathX);
  const pathZ = new THREE.Mesh(regGeo(new THREE.BoxGeometry(3.2, 0.10, 21.4)), crossPathMat);
  pathZ.position.y = 0.06;
  parkGroup.add(pathZ);

  // Central Gazebo / Coreto in Bairro Park
  const gazeboBase = new THREE.Mesh(
    regGeo(new THREE.CylinderGeometry(3.2, 3.4, 0.35, 8)),
    regMat(new THREE.MeshStandardMaterial({ color: 0xd6d3cd, roughness: 0.7 })),
  );
  gazeboBase.position.y = 0.22;
  parkGroup.add(gazeboBase);
  const gazeboRoof = new THREE.Mesh(
    regGeo(new THREE.ConeGeometry(3.6, 1.8, 8)),
    regMat(new THREE.MeshStandardMaterial({ map: atlas.terracottaRoof, roughness: 0.72 })),
  );
  gazeboRoof.position.y = 3.5;
  gazeboRoof.castShadow = true;
  parkGroup.add(gazeboRoof);
  for (let p = 0; p < 6; p++) {
    const a = (p * Math.PI) / 3;
    const col = new THREE.Mesh(
      regGeo(new THREE.CylinderGeometry(0.10, 0.12, 2.4, 6)),
      regMat(new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.5 })),
    );
    col.position.set(Math.cos(a) * 2.7, 1.5, Math.sin(a) * 2.7);
    parkGroup.add(col);
  }
  group.add(parkGroup);

  // Add park trees to wind-animated system
  [
    [10.5, 0.28, -91.5, 'ipe_y'],
    [23.5, 0.28, -91.5, 'ipe_p'],
    [10.5, 0.28, -78.5, 'leafy'],
    [23.5, 0.28, -78.5, 'leafy'],
  ].forEach(([tx, ty, tz, k]) => {
    if (k === 'ipe_y') treeCollector.ipesYellow.push({ x: tx as number, y: ty as number, z: tz as number, scale: 0.95 });
    else if (k === 'ipe_p') treeCollector.ipesPink.push({ x: tx as number, y: ty as number, z: tz as number, scale: 0.95 });
    else treeCollector.urbanLeafy.push({ x: tx as number, y: ty as number, z: tz as number, scale: 1.0 });
  });

  // Collect instanced sub-parts across all residential lots (4 lots per block = 56 urban houses!)
  interface BoxTransform {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry: number;
    rx?: number;
    color?: number;
  }

  const houseBodies: BoxTransform[] = [];
  const housePorches: BoxTransform[] = [];
  const terracottaRoofs: BoxTransform[] = [];
  const fiberRoofs: BoxTransform[] = [];
  const perimeterWalls: BoxTransform[] = [];
  const metalGates: BoxTransform[] = [];
  const waterTanks: BoxTransform[] = [];
  const litWindows: BoxTransform[] = [];
  const yardLawns: BoxTransform[] = [];
  const wireSpans: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];

  const stuccoColors = [0xf5ebe0, 0xfef3c7, 0xfed7aa, 0xbfdbfe, 0xc7d2fe, 0xdcfce7, 0xfbcfe8, 0xe7e5e4];
  const wallColors = [0xd6d3cd, 0xe7e5e4, 0xfef08a, 0xcbd5e1, 0xfed7aa];
  const carColors = [0xdc2626, 0x2563eb, 0xf8fafc, 0x52525b, 0x059669, 0xf59e0b];

  const lotOffsets: [number, number, number][] = [
    [-5.4, -5.4, Math.PI],
    [5.4, -5.4, Math.PI],
    [-5.4, 5.4, 0],
    [5.4, 5.4, 0],
  ];

  const matPoleConcrete = regMat(new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.85 }));
  const matPoleArm = regMat(new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.65, metalness: 0.35 }));

  houseBlocks.forEach(([bx, bz], bIdx) => {
    // Raised block sidewalk pad
    const blockPad = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(23, 0.24, 23)),
      crossPathMat,
    );
    blockPad.position.set(bx, 0.08, bz);
    blockPad.receiveShadow = true;
    group.add(blockPad);

    // Corner utility poles + sagging wires along the block
    const poleCorners: THREE.Vector3[] = [
      new THREE.Vector3(bx - 10.6, 0.2, bz - 10.6),
      new THREE.Vector3(bx + 10.6, 0.2, bz - 10.6),
      new THREE.Vector3(bx + 10.6, 0.2, bz + 10.6),
    ];
    poleCorners.forEach((pc, pIdx) => {
      const poleMesh = new THREE.Mesh(
        regGeo(new THREE.CylinderGeometry(0.11, 0.16, 6.4, 7)),
        matPoleConcrete,
      );
      poleMesh.position.set(pc.x, pc.y + 3.2, pc.z);
      poleMesh.castShadow = true;
      group.add(poleMesh);

      const lampArm = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.1, 0.08, 0.1)), matPoleArm);
      lampArm.position.set(pc.x, pc.y + 6.1, pc.z + (pIdx < 2 ? -0.5 : 0.5));
      group.add(lampArm);

      const bulb = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.38, 0.07, 0.22)), lampMat);
      bulb.position.set(pc.x, pc.y + 6.03, pc.z + (pIdx < 2 ? -0.95 : 0.95));
      group.add(bulb);

      if (pIdx > 0) {
        wireSpans.push({
          a: poleCorners[pIdx - 1].clone().add(new THREE.Vector3(0, 6.0, 0)),
          b: pc.clone().add(new THREE.Vector3(0, 6.0, 0)),
        });
      }
    });

    lotOffsets.forEach(([ox, oz, facingRot], lIdx) => {
      const seed = bIdx * 13 + lIdx * 7;
      const hx = bx + ox;
      const hz = bz + oz;
      const fDir = facingRot === 0 ? 1 : -1;

      // Corner Bar do Zé / Mercadinho da Vila on 3 selected blocks!
      if (lIdx === 3 && bIdx % 4 === 0) {
        const bar = new THREE.Group();
        bar.position.set(hx, 0.2, hz);
        const barWall = new THREE.Mesh(
          regGeo(new THREE.BoxGeometry(8.6, 3.8, 8.2)),
          regMat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.78 })),
        );
        barWall.position.y = 1.9;
        barWall.castShadow = true;
        barWall.receiveShadow = true;
        bar.add(barWall);

        const barSign = new THREE.Mesh(
          regGeo(new THREE.BoxGeometry(7.2, 1.05, 0.24)),
          regMat(
            new THREE.MeshStandardMaterial({
              map: atlas.shopSigns[11],
              emissive: 0xffffff,
              emissiveMap: atlas.shopSigns[11],
              emissiveIntensity: 0.55,
            }),
          ),
        );
        barSign.position.set(0, 3.3, 4.2);
        bar.add(barSign);

        const barAwning = new THREE.Mesh(
          regGeo(new THREE.BoxGeometry(7.6, 0.12, 1.7)),
          regMat(new THREE.MeshStandardMaterial({ map: atlas.awningStripes[0], roughness: 0.75 })),
        );
        barAwning.position.set(0, 2.55, 4.85);
        barAwning.rotation.x = 0.25;
        bar.add(barAwning);

        const barWin = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.6, 1.8, 0.14)), windowEmissiveMat);
        barWin.position.set(0, 1.25, 4.15);
        bar.add(barWin);
        group.add(bar);
        return;
      }

      const isSobrado = seed % 5 < 2; // ~40% 2-story sobrados, ~60% single-story houses
      const w = 6.2 + (seed % 3) * 0.55;
      const d = 5.6 + ((seed + 1) % 2) * 0.65;
      const floor1H = 2.95;
      const bodyH = isSobrado ? 5.65 : floor1H;
      const stuccoCol = stuccoColors[seed % stuccoColors.length];
      const wallCol = wallColors[(seed + 2) % wallColors.length];

      // Small green front yard lawn pad
      yardLawns.push({ x: hx, y: 0.22, z: hz, sx: 9.6, sy: 0.05, sz: 9.6, ry: 0 });

      // Main house volume shifted slightly toward back of lot so front yard/garage fits cleanly
      const houseZ = hz - fDir * 0.85;
      houseBodies.push({
        x: hx,
        y: 0.2 + bodyH * 0.5,
        z: houseZ,
        sx: w,
        sy: bodyH,
        sz: d,
        ry: facingRot,
        color: stuccoCol,
      });

      // Second story setback or varanda porch roof on single-story homes
      if (isSobrado) {
        housePorches.push({
          x: hx + 0.8,
          y: 0.2 + 2.85,
          z: houseZ + fDir * (d * 0.5 + 0.55),
          sx: w * 0.55,
          sy: 0.18,
          sz: 1.3,
          ry: facingRot,
        });
      } else {
        housePorches.push({
          x: hx,
          y: 0.2 + 2.45,
          z: houseZ + fDir * (d * 0.5 + 0.75),
          sx: w * 0.88,
          sy: 0.16,
          sz: 1.65,
          ry: facingRot,
        });
      }

      // Ceramic terracotta or fiber-cement roof
      const roofEntry: BoxTransform = {
        x: hx,
        y: 0.2 + bodyH + 0.68,
        z: houseZ,
        sx: w + 0.65,
        sy: 1.35,
        sz: d + 0.65,
        ry: facingRot,
      };
      if (seed % 3 === 0) fiberRoofs.push(roofEntry);
      else terracottaRoofs.push(roofEntry);

      // Blue rooftop Caixa d'Água
      waterTanks.push({
        x: hx + w * 0.24,
        y: 0.2 + bodyH + 1.15,
        z: houseZ - fDir * d * 0.22,
        sx: 0.52,
        sy: 0.82,
        sz: 0.52,
        ry: 0,
      });

      // Glowing evening front windows (1 or 2 stories)
      litWindows.push({
        x: hx - w * 0.22,
        y: 0.2 + 1.55,
        z: houseZ + fDir * (d * 0.5 + 0.05),
        sx: 1.35,
        sy: 1.05,
        sz: 0.12,
        ry: 0,
      });
      if (isSobrado) {
        litWindows.push({
          x: hx + w * 0.18,
          y: 0.2 + 4.3,
          z: houseZ + fDir * (d * 0.5 + 0.05),
          sx: 1.55,
          sy: 1.05,
          sz: 0.12,
          ry: 0,
        });
      }

      // Perimeter plastered wall (`muro`) + metallic front gate (`portão`)
      const frontWallZ = hz + fDir * 4.55;
      perimeterWalls.push({
        x: hx - 2.6,
        y: 0.2 + 0.85,
        z: frontWallZ,
        sx: 4.2,
        sy: 1.7,
        sz: 0.24,
        ry: 0,
        color: wallCol,
      });
      // Side walls
      perimeterWalls.push({
        x: hx - 4.75,
        y: 0.2 + 0.85,
        z: hz,
        sx: 0.22,
        sy: 1.7,
        sz: 9.2,
        ry: 0,
        color: wallCol,
      });
      metalGates.push({
        x: hx + 2.0,
        y: 0.2 + 0.9,
        z: frontWallZ,
        sx: 3.6,
        sy: 1.75,
        sz: 0.12,
        ry: 0,
      });

      // Front yard leafy tree on alternate lots (wind animated!)
      if ((seed + lIdx) % 2 === 0) {
        treeCollector.urbanLeafy.push({
          x: hx - 3.1,
          y: 0.24,
          z: hz + fDir * 3.1,
          scale: 0.62 + (seed % 3) * 0.08,
        });
      }

      // Parked resident car in driveway/curb on select houses
      if ((seed + bIdx) % 3 === 0) {
        parkedCarSpots.push({
          x: hx + 2.1,
          y: 0.25,
          z: hz + fDir * 2.4,
          rotY: facingRot,
          color: carColors[seed % carColors.length],
        });
      }
    });
  });

  // Batch-instantiate residential geometry for optimal frame budget
  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();
  const spawnInst = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: BoxTransform[],
    castShadow: boolean,
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    items.forEach((it, i) => {
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(it.rx ?? 0, it.ry, 0);
      dummy.scale.set(it.sx, it.sy, it.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (it.color !== undefined) {
        mesh.setColorAt(i, cTmp.setHex(it.color));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  const boxGeo = regGeo(new THREE.BoxGeometry(1, 1, 1));
  const hipRoofGeo = regGeo(new THREE.ConeGeometry(0.72, 1, 4));
  hipRoofGeo.rotateY(Math.PI / 4);
  const tankGeo = regGeo(new THREE.CylinderGeometry(1, 0.92, 1, 10));

  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 })), houseBodies, true);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.68 })), housePorches, true);
  spawnInst(hipRoofGeo, regMat(new THREE.MeshStandardMaterial({ map: atlas.terracottaRoof, roughness: 0.72 })), terracottaRoofs, true);
  spawnInst(hipRoofGeo, regMat(new THREE.MeshStandardMaterial({ map: atlas.zincRoof, roughness: 0.58, metalness: 0.35 })), fiberRoofs, true);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })), perimeterWalls, true);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.75 })), metalGates, false);
  spawnInst(tankGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })), waterTanks, false);
  spawnInst(boxGeo, windowEmissiveMat, litWindows, false);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.92 })), yardLawns, false);

  // Subtle sagging overhead utility wires along residential streets
  const matWire = regMat(new THREE.MeshBasicMaterial({ color: 0x18181b }));
  wireSpans.forEach(({ a, b }) => {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= 0.45;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const wire = new THREE.Mesh(regGeo(new THREE.TubeGeometry(curve, 8, 0.024, 4, false)), matWire);
    group.add(wire);
  });

  // Compact parked car silhouettes in residential driveways
  if (parkedCarSpots.length > 0) {
    const pBodyMat = regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 }));
    const pGlassMat = regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 }));
    const pWheelMat = regMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }));

    const carBodies = new THREE.InstancedMesh(boxGeo, pBodyMat, parkedCarSpots.length);
    const carCabins = new THREE.InstancedMesh(boxGeo, pGlassMat, parkedCarSpots.length);
    const carWheels = new THREE.InstancedMesh(tankGeo, pWheelMat, parkedCarSpots.length * 4);
    carBodies.castShadow = true;
    carBodies.frustumCulled = false;
    carCabins.frustumCulled = false;
    carWheels.frustumCulled = false;

    parkedCarSpots.forEach((pc, idx) => {
      dummy.position.set(pc.x, pc.y + 0.52, pc.z);
      dummy.rotation.set(0, pc.rotY, 0);
      dummy.scale.set(1.75, 0.65, 3.7);
      dummy.updateMatrix();
      carBodies.setMatrixAt(idx, dummy.matrix);
      carBodies.setColorAt(idx, cTmp.setHex(pc.color));

      dummy.position.set(pc.x, pc.y + 1.0, pc.z - Math.cos(pc.rotY) * 0.15);
      dummy.scale.set(1.48, 0.5, 2.0);
      dummy.updateMatrix();
      carCabins.setMatrixAt(idx, dummy.matrix);

      const cosR = Math.cos(pc.rotY);
      const sinR = Math.sin(pc.rotY);
      [
        [-0.84, -1.15],
        [0.84, -1.15],
        [-0.84, 1.15],
        [0.84, 1.15],
      ].forEach(([wx, wz], wIdx) => {
        dummy.position.set(
          pc.x + wx * cosR + wz * sinR,
          pc.y + 0.28,
          pc.z - wx * sinR + wz * cosR,
        );
        dummy.rotation.set(0, pc.rotY, Math.PI / 2);
        dummy.scale.set(0.3, 0.22, 0.3);
        dummy.updateMatrix();
        carWheels.setMatrixAt(idx * 4 + wIdx, dummy.matrix);
      });
    });

    carBodies.instanceMatrix.needsUpdate = true;
    if (carBodies.instanceColor) carBodies.instanceColor.needsUpdate = true;
    carCabins.instanceMatrix.needsUpdate = true;
    carWheels.instanceMatrix.needsUpdate = true;
    group.add(carBodies, carCabins, carWheels);
  }

  return {
    group,
    beaconMats: [],
    skylineGlowMats: [],
    parkedCarSpots,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
