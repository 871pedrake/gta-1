import * as THREE from 'three';
import { CityTextureAtlas } from './cityTextures';
import { VegetationPlacement } from './cityVegetation';
import { blockTerraceY } from './cityElevation';

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
  group.name = 'Centro_Financeiro_Horizonte';
  group.userData.hotspot = 'downtown';

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
      new THREE.MeshStandardMaterial({
        map: atlas.skyscraperGlass,
        color: tint,
        emissive: 0xfef08a,
        emissiveMap: atlas.skyscraperGlassEmissive,
        emissiveIntensity: 0.75,
        roughness: 0.14,
        metalness: 0.72,
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
  const matWhiteArch = regMat(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.62 }));
  const matWarmStone = regMat(new THREE.MeshStandardMaterial({ color: 0xd6d3cd, roughness: 0.74 }));
  const matCharcoal = regMat(new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.68 }));
  const matGraniteBase = regMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 }));
  const matRedPortal = regMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48, metalness: 0.18 }));
  const matBalconyGlass = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.46,
      roughness: 0.12,
      metalness: 0.45,
    }),
  );
  const matLobbyGlass = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.58,
      roughness: 0.1,
      metalness: 0.65,
    }),
  );
  const matAcBody = regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.15 }));
  const matAcFan = regMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.65 }));
  const matHelipad = regMat(new THREE.MeshStandardMaterial({ map: atlas.helipad, roughness: 0.65 }));
  const matBeacon = regMat(
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 }),
  );
  beaconMats.push(matBeacon);

  const unitBoxGeo = regGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCylGeo = regGeo(new THREE.CylinderGeometry(1, 1, 1, 10));
  const beaconGeo = regGeo(new THREE.SphereGeometry(0.26, 8, 6));
  const padGeo = regGeo(new THREE.BoxGeometry(6.8, 0.2, 6.8));

  interface InstXform {
    x: number;
    y: number;
    z: number;
    sx: number;
    sy: number;
    sz: number;
    ry?: number;
    rx?: number;
    rz?: number;
    color?: number;
  }

  const instFoundation: InstXform[] = [];
  const instBalconySlab: InstXform[] = [];
  const instBalconyGlass: InstXform[] = [];
  const instWhiteFrames: InstXform[] = [];
  const instDarkTrim: InstXform[] = [];
  const instBriseMetal: InstXform[] = [];
  const instLobbyGlass: InstXform[] = [];
  const instLobbyGlow: InstXform[] = [];
  const instAcBody: InstXform[] = [];
  const instAcFan: InstXform[] = [];
  const instChillerBody: InstXform[] = [];

  const pushInst = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: InstXform[],
    castShadow: boolean,
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      d.position.set(it.x, it.y, it.z);
      d.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
      d.scale.set(it.sx, it.sy, it.sz);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      if (it.color !== undefined) mesh.setColorAt(i, c.setHex(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  // Helper: Grounded stepped foundation plinth + perimeter iron fence + shrubs
  const addFoundationPlinth = (cx: number, baseY: number, cz: number, w: number, d: number, plinthH = 1.2) => {
    // Deep anchor footing reaching below terrace pad
    instFoundation.push({ x: cx, y: baseY - 0.55, z: cz, sx: w + 1.0, sy: 1.4, sz: d + 1.0 });
    // Raised chamfered podium slab
    instFoundation.push({ x: cx, y: baseY + plinthH * 0.5, z: cz, sx: w, sy: plinthH, sz: d });
    // Corner foundation pilasters
    [
      [-w * 0.48, -d * 0.48],
      [w * 0.48, -d * 0.48],
      [-w * 0.48, d * 0.48],
      [w * 0.48, d * 0.48],
    ].forEach(([px, pz]) => {
      instDarkTrim.push({ x: cx + px, y: baseY + plinthH * 0.5 + 0.1, z: cz + pz, sx: 0.75, sy: plinthH + 0.3, sz: 0.75 });
    });
  };

  // Helper: Detailed Double Glass Lobby Doors + Canopy Marquise + Glowing Vestibule + Entrance Steps
  const addEntranceLobby = (
    cx: number,
    floorY: number,
    cz: number,
    dir: 'N' | 'S' | 'E' | 'W',
    doorWidth = 4.6,
    doorHeight = 3.4,
  ) => {
    const isZ = dir === 'N' || dir === 'S';
    const sign = dir === 'N' || dir === 'E' ? 1 : -1;
    const ry = dir === 'N' ? 0 : dir === 'S' ? Math.PI : dir === 'E' ? Math.PI / 2 : -Math.PI / 2;
    const outX = isZ ? 0 : sign;
    const outZ = isZ ? sign : 0;

    // Stone entrance steps connecting street pad to lobby threshold
    for (let st = 0; st < 3; st++) {
      instFoundation.push({
        x: cx + outX * (1.2 - st * 0.35),
        y: floorY - 0.9 + st * 0.3,
        z: cz + outZ * (1.2 - st * 0.35),
        sx: doorWidth + 1.4 - st * 0.2,
        sy: 0.3,
        sz: 1.5 - st * 0.2,
        ry,
      });
    }

    // Warm lit interior vestibule box behind doors
    instLobbyGlow.push({
      x: cx - outX * 0.55,
      y: floorY + doorHeight * 0.5,
      z: cz - outZ * 0.55,
      sx: doorWidth - 0.4,
      sy: doorHeight - 0.3,
      sz: 1.1,
      ry,
    });

    // Double glass sliding door panels + aluminum mullions & push-bars
    instLobbyGlass.push({
      x: cx + outX * 0.05,
      y: floorY + doorHeight * 0.5,
      z: cz + outZ * 0.05,
      sx: doorWidth,
      sy: doorHeight,
      sz: 0.14,
      ry,
    });
    // Outer portal frame + center split bar + horizontal transom bar
    [-doorWidth * 0.48, 0, doorWidth * 0.48].forEach((ox) => {
      instDarkTrim.push({
        x: cx + (isZ ? ox : outX * 0.12),
        y: floorY + doorHeight * 0.5,
        z: cz + (isZ ? outZ * 0.12 : ox),
        sx: 0.18,
        sy: doorHeight,
        sz: 0.22,
        ry,
      });
    });
    instDarkTrim.push({
      x: cx + outX * 0.12,
      y: floorY + doorHeight - 0.12,
      z: cz + outZ * 0.12,
      sx: doorWidth + 0.3,
      sy: 0.24,
      sz: 0.26,
      ry,
    });
    // Metallic door handles
    [-0.22, 0.22].forEach((hx) => {
      instBriseMetal.push({
        x: cx + (isZ ? hx : outX * 0.2),
        y: floorY + 1.15,
        z: cz + (isZ ? outZ * 0.2 : hx),
        sx: 0.06,
        sy: 0.9,
        sz: 0.08,
        ry,
      });
    });

    // Cantilevered architectural marquise canopy + recessed light strip
    instDarkTrim.push({
      x: cx + outX * 1.35,
      y: floorY + doorHeight + 0.25,
      z: cz + outZ * 1.35,
      sx: doorWidth + 1.8,
      sy: 0.24,
      sz: 2.6,
      ry,
    });
    instLobbyGlow.push({
      x: cx + outX * 1.35,
      y: floorY + doorHeight + 0.11,
      z: cz + outZ * 1.35,
      sx: doorWidth + 0.6,
      sy: 0.06,
      sz: 1.6,
      ry,
    });
  };

  // Helper: Garage Roll-Up Gate + Security Guarita Box + Safety Bollards
  const addGaragePortal = (cx: number, floorY: number, cz: number, ry: number) => {
    const isEW = Math.abs(Math.sin(ry)) > 0.7;
    const outX = Math.sin(ry);
    const outZ = Math.cos(ry);
    // Steel roll-up gate texture-like horizontal slats
    for (let s = 0; s < 5; s++) {
      instBriseMetal.push({
        x: cx + outX * 0.06,
        y: floorY + 0.4 + s * 0.48,
        z: cz + outZ * 0.06,
        sx: 4.4,
        sy: 0.42,
        sz: 0.12,
        ry,
      });
    }
    instDarkTrim.push({
      x: cx + outX * 0.08,
      y: floorY + 2.7,
      z: cz + outZ * 0.08,
      sx: 4.8,
      sy: 0.24,
      sz: 0.3,
      ry,
    });
    // Yellow safety bollards
    [-2.35, 2.35].forEach((off) => {
      instDarkTrim.push({
        x: cx + (isEW ? outX * 0.55 : off),
        y: floorY + 0.42,
        z: cz + (isEW ? off : outZ * 0.55),
        sx: 0.18,
        sy: 0.84,
        sz: 0.18,
      });
    });
  };

  // Helper: Dense Wall-Mounted 3D Air Conditioner Condenser Stacks (Housing + Circular Fan + Piping Chase)
  const addAcWallStack = (
    wx: number,
    startY: number,
    wz: number,
    floors: number,
    floorStep: number,
    outDir: 'E' | 'W' | 'N' | 'S',
    cols = 2,
    colSpacing = 2.6,
  ) => {
    const isXOut = outDir === 'E' || outDir === 'W';
    const sign = outDir === 'E' || outDir === 'N' ? 1 : -1;
    const ry = outDir === 'N' ? 0 : outDir === 'S' ? Math.PI : outDir === 'E' ? Math.PI / 2 : -Math.PI / 2;

    for (let c = 0; c < cols; c++) {
      const offset = (c - (cols - 1) * 0.5) * colSpacing;
      const pipeX = wx + (isXOut ? sign * 0.1 : offset + 0.44);
      const pipeZ = wz + (isXOut ? offset + 0.44 : sign * 0.1);
      const totalH = (floors - 1) * floorStep + 0.8;
      // Vertical insulated refrigerant piping conduit connecting all floors
      instBriseMetal.push({
        x: pipeX,
        y: startY + totalH * 0.5 - 0.3,
        z: pipeZ,
        sx: 0.1,
        sy: totalH,
        sz: 0.1,
      });

      for (let f = 0; f < floors; f++) {
        const uy = startY + f * floorStep;
        const ux = wx + (isXOut ? sign * 0.24 : offset);
        const uz = wz + (isXOut ? offset : sign * 0.24);
        // AC Condenser housing
        instAcBody.push({ x: ux, y: uy, z: uz, sx: 0.82, sy: 0.56, sz: 0.36, ry });
        // Circular dark fan grille cylinder on outer face
        instAcFan.push({
          x: ux + (isXOut ? sign * 0.18 : -0.14),
          y: uy,
          z: uz + (isXOut ? -0.14 : sign * 0.18),
          sx: 0.22,
          sy: 0.06,
          sz: 0.22,
          rx: isXOut ? 0 : Math.PI / 2,
          rz: isXOut ? Math.PI / 2 : 0,
        });
        // Support steel L-bracket underneath
        instDarkTrim.push({
          x: ux,
          y: uy - 0.31,
          z: uz,
          sx: 0.72,
          sy: 0.06,
          sz: 0.38,
          ry,
        });
      }
    }
  };

  // Helper: Stacked Cantilevered Balconies with Glass Guardrails & Slabs
  const addBalconyStack = (
    bx: number,
    startY: number,
    bz: number,
    floors: number,
    floorStep: number,
    w: number,
    d: number,
    faceDir: 'N' | 'S' | 'E' | 'W',
  ) => {
    const isZ = faceDir === 'N' || faceDir === 'S';
    const sign = faceDir === 'N' || faceDir === 'E' ? 1 : -1;
    const ry = faceDir === 'N' ? 0 : faceDir === 'S' ? Math.PI : faceDir === 'E' ? Math.PI / 2 : -Math.PI / 2;
    const outX = isZ ? 0 : sign;
    const outZ = isZ ? sign : 0;

    for (let f = 0; f < floors; f++) {
      const fy = startY + f * floorStep;
      // Crisp projecting concrete balcony slab
      instBalconySlab.push({
        x: bx + outX * (d * 0.5),
        y: fy,
        z: bz + outZ * (d * 0.5),
        sx: w,
        sy: 0.24,
        sz: d,
        ry,
      });
      // Translucent glass balustrade
      instBalconyGlass.push({
        x: bx + outX * (d - 0.08),
        y: fy + 0.58,
        z: bz + outZ * (d - 0.08),
        sx: w - 0.12,
        sy: 0.96,
        sz: 0.06,
        ry,
      });
      // Top aluminum handrail + end dividers
      instDarkTrim.push({
        x: bx + outX * (d - 0.08),
        y: fy + 1.08,
        z: bz + outZ * (d - 0.08),
        sx: w,
        sy: 0.06,
        sz: 0.1,
        ry,
      });
      [-w * 0.48, w * 0.48].forEach((sideOff) => {
        instDarkTrim.push({
          x: bx + (isZ ? sideOff : outX * (d * 0.5)),
          y: fy + 0.55,
          z: bz + (isZ ? outZ * (d * 0.5) : sideOff),
          sx: 0.1,
          sy: 1.0,
          sz: d,
          ry,
        });
      });
    }
  };

  // Helper: Detailed Rooftop Engineering (Parapet, Elevator Penthouse, HVAC Chillers with Fan Shrouds, Water Tanks)
  const addRooftopEngineering = (
    cx: number,
    roofY: number,
    cz: number,
    w: number,
    d: number,
    hasHelipad: boolean,
    spireHeight: number,
  ) => {
    // Perimeter rooftop parapet walls (platibanda)
    instDarkTrim.push(
      { x: cx, y: roofY + 0.45, z: cz + d * 0.48, sx: w, sy: 0.9, sz: 0.28 },
      { x: cx, y: roofY + 0.45, z: cz - d * 0.48, sx: w, sy: 0.9, sz: 0.28 },
      { x: cx + w * 0.48, y: roofY + 0.45, z: cz, sx: 0.28, sy: 0.9, sz: d },
      { x: cx - w * 0.48, y: roofY + 0.45, z: cz, sx: 0.28, sy: 0.9, sz: d },
    );

    // Elevator Machine Room Penthouse
    const phW = Math.min(5.2, w * 0.42);
    const phD = Math.min(4.6, d * 0.38);
    instDarkTrim.push({
      x: cx - w * 0.18,
      y: roofY + 1.55,
      z: cz - d * 0.18,
      sx: phW,
      sy: 3.1,
      sz: phD,
    });
    // Louver slats on machine room
    for (let lv = 0; lv < 3; lv++) {
      instBriseMetal.push({
        x: cx - w * 0.18,
        y: roofY + 1.4 + lv * 0.55,
        z: cz - d * 0.18 + phD * 0.5 + 0.04,
        sx: phW * 0.65,
        sy: 0.18,
        sz: 0.08,
      });
    }

    // Twin Industrial HVAC Rooftop Chillers + Top Fan Shrouds + Galvanized Ducts
    [-1.1, 1.1].forEach((cxOff) => {
      const chx = cx + w * 0.2 + cxOff;
      const chz = cz - d * 0.2;
      instChillerBody.push({ x: chx, y: roofY + 0.65, z: chz, sx: 1.65, sy: 1.3, sz: 2.2 });
      [-0.52, 0.52].forEach((fz) => {
        instAcFan.push({ x: chx, y: roofY + 1.35, z: chz + fz, sx: 0.44, sy: 0.14, sz: 0.44 });
      });
    });
    // HVAC Duct connecting chiller bank to machine room
    instBriseMetal.push({
      x: cx + w * 0.02,
      y: roofY + 0.42,
      z: cz - d * 0.2,
      sx: w * 0.34,
      sy: 0.36,
      sz: 0.42,
    });

    if (hasHelipad) {
      const pad = new THREE.Mesh(padGeo, matHelipad);
      pad.position.set(cx + w * 0.08, roofY + 0.12, cz + d * 0.14);
      group.add(pad);
    }

    if (spireHeight > 0) {
      const sx = cx - w * 0.24;
      const sz = cz - d * 0.22;
      const mast = new THREE.Mesh(unitCylGeo, matDarkSteel);
      mast.scale.set(0.14, spireHeight, 0.14);
      mast.position.set(sx, roofY + 3.0 + spireHeight * 0.5, sz);
      group.add(mast);

      const beacon = new THREE.Mesh(beaconGeo, matBeacon);
      beacon.position.set(sx, roofY + 3.0 + spireHeight + 0.2, sz);
      group.add(beacon);
    }
  };

  // =========================================================================
  // 1. QUADRA (-85, -17) @ Y = 0.0m — TORRE HORIZONTE BRASIL (PRÉDIO MAIOR 84m + ANEXO)
  // =========================================================================
  {
    const bx = -85;
    const bz = -17;
    const baseY = blockTerraceY(bz) + 0.2;

    addFoundationPlinth(bx, baseY, bz, 20.8, 20.6, 1.4);

    // Double-height sculptural pilotis podium
    const podiumH = 5.4;
    const podium = new THREE.Mesh(unitBoxGeo, matGraniteBase);
    podium.scale.set(19.4, podiumH, 18.8);
    podium.position.set(bx, baseY + 1.4 + podiumH * 0.5, bz);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    // Perimeter pilotis structural pillars
    for (let px = -8.4; px <= 8.4; px += 4.2) {
      [-9.5, 9.5].forEach((pz) => {
        instWhiteFrames.push({ x: bx + px, y: baseY + 1.4 + podiumH * 0.5, z: bz + pz, sx: 0.65, sy: podiumH, sz: 0.65 });
      });
    }

    // North Riverfront & East Avenue Grand Double Glass Lobby Entrances + Side Garage
    addEntranceLobby(bx + 1.5, baseY + 1.4, bz + 9.5, 'N', 5.2, 3.8);
    addEntranceLobby(bx + 9.7, baseY + 1.4, bz - 1.0, 'E', 4.6, 3.6);
    addGaragePortal(bx - 9.7, baseY + 1.4, bz - 3.5, -Math.PI / 2);

    // Lower Supertall Shaft (13.6m x 13.6m, Y = +6.8m -> +48m)
    const s1Base = baseY + 1.4 + podiumH;
    const s1H = 42.0;
    const shaft1 = new THREE.Mesh(unitBoxGeo, glassMats[4]);
    shaft1.scale.set(13.6, s1H, 13.6);
    shaft1.position.set(bx + 1.6, s1Base + s1H * 0.5, bz);
    shaft1.castShadow = true;
    shaft1.receiveShadow = true;
    group.add(shaft1);

    // Upper Tapered Supertall Shaft (10.4m x 10.4m, Y = +48.8m -> +80m)
    const s2Base = s1Base + s1H;
    const s2H = 31.0;
    const shaft2 = new THREE.Mesh(unitBoxGeo, glassMats[0]);
    shaft2.scale.set(10.4, s2H, 10.4);
    shaft2.position.set(bx + 1.6, s2Base + s2H * 0.5, bz);
    shaft2.castShadow = true;
    group.add(shaft2);

    // 4 Continuous Structural Concrete Exo-Columns running up the Supertall
    [
      [-6.8, -6.8],
      [6.8, -6.8],
      [-6.8, 6.8],
      [6.8, 6.8],
    ].forEach(([cx, cz]) => {
      instWhiteFrames.push({ x: bx + 1.6 + cx, y: s1Base + s1H * 0.5, z: bz + cz, sx: 1.05, sy: s1H, sz: 1.05 });
    });
    // Sky-terrace setback glass parapet + shrubs at s2Base (48.8m)
    instBalconyGlass.push(
      { x: bx + 1.6, y: s2Base + 0.65, z: bz + 6.7, sx: 13.2, sy: 1.2, sz: 0.08 },
      { x: bx + 1.6, y: s2Base + 0.65, z: bz - 6.7, sx: 13.2, sy: 1.2, sz: 0.08 },
    );

    // Crown Architectural Frame & Illuminated Emblem Band (Screenshot 2 FG/One Tower homage)
    const crownBase = s2Base + s2H;
    const crown = new THREE.Mesh(unitBoxGeo, matWhiteArch);
    crown.scale.set(11.0, 5.2, 11.0);
    crown.position.set(bx + 1.6, crownBase + 2.6, bz);
    group.add(crown);
    instLobbyGlow.push({ x: bx + 1.6, y: crownBase + 3.0, z: bz + 5.56, sx: 4.2, sy: 1.6, sz: 0.14 });
    instLobbyGlow.push({ x: bx + 1.6, y: crownBase + 3.0, z: bz - 5.56, sx: 4.2, sy: 1.6, sz: 0.14 });

    // Corporate Wing Annex on West side (-92.4) linked by 2-story Skybridge + AC Stack
    const annexH = 22.0;
    const annex = new THREE.Mesh(unitBoxGeo, concreteTowerMat);
    annex.scale.set(5.2, annexH, 13.4);
    annex.position.set(bx - 6.8, s1Base + annexH * 0.5, bz);
    annex.castShadow = true;
    group.add(annex);
    addAcWallStack(bx - 9.4, s1Base + 2.4, bz, 6, 3.2, 'W', 3, 3.4);
    addRooftopEngineering(bx + 1.6, crownBase + 5.2, bz, 10.6, 10.6, true, 12.0);

    // Front botanical shrubs along granite plaza edge
    [-7.5, -4.5, 6.0, 8.5].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.1, z: bz + 10.6, scale: 0.88 });
    });
  }

  // =========================================================================
  // 2. QUADRA (-51, -17) @ Y = 0.0m — EDIFÍCIO GÊMEO PAULISTA (PRÉDIOS DUPLOS CONECTADOS)
  // =========================================================================
  {
    const bx = -51;
    const bz = -17;
    const baseY = blockTerraceY(bz) + 0.2;

    addFoundationPlinth(bx, baseY, bz, 21.0, 20.6, 1.3);

    // Shared Embasamento Podium + Central Security Guarita + Iron Fence (Screenshot 3 style)
    const podiumH = 4.2;
    const podium = new THREE.Mesh(unitBoxGeo, matWarmStone);
    podium.scale.set(19.6, podiumH, 16.6);
    podium.position.set(bx, baseY + 1.3 + podiumH * 0.5, bz - 0.8);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    // Front security Guarita + Iron Gradil Fence
    instDarkTrim.push({ x: bx, y: baseY + 2.5, z: bz + 8.9, sx: 2.6, sy: 2.4, sz: 2.2 });
    instLobbyGlow.push({ x: bx, y: baseY + 2.8, z: bz + 10.02, sx: 1.8, sy: 0.9, sz: 0.08 });
    [-6.0, 6.0].forEach((fx) => {
      instDarkTrim.push({ x: bx + fx, y: baseY + 2.1, z: bz + 9.8, sx: 7.4, sy: 1.6, sz: 0.14 });
    });
    addEntranceLobby(bx - 5.2, baseY + 1.3, bz + 7.5, 'N', 3.8, 3.2);
    addEntranceLobby(bx + 5.2, baseY + 1.3, bz + 7.5, 'N', 3.8, 3.2);
    addGaragePortal(bx + 9.8, baseY + 1.3, bz - 2.0, Math.PI / 2);

    // TWIN TOWERS ("Prédios Duplos") separated by central elevator/skybridge core
    const towerBaseY = baseY + 1.3 + podiumH;
    const twinH = 50.0;
    [-5.3, 5.3].forEach((txOff, tIdx) => {
      const tx = bx + txOff;
      const twin = new THREE.Mesh(unitBoxGeo, resTowerMat);
      twin.scale.set(7.8, twinH, 13.8);
      twin.position.set(tx, towerBaseY + twinH * 0.5, bz - 0.6);
      twin.castShadow = true;
      twin.receiveShadow = true;
      group.add(twin);

      // Vertical architectural dark pilasters framing each twin facade
      [-3.7, 3.7].forEach((px) => {
        instDarkTrim.push({ x: tx + px, y: towerBaseY + twinH * 0.5, z: bz + 6.35, sx: 0.72, sy: twinH, sz: 0.36 });
        instDarkTrim.push({ x: tx + px, y: towerBaseY + twinH * 0.5, z: bz - 7.55, sx: 0.72, sy: twinH, sz: 0.36 });
      });

      // 13 Floors of Stacked Balconies (front & back of both twins!)
      addBalconyStack(tx, towerBaseY + 2.6, bz + 6.3, 13, 3.6, 6.4, 1.25, 'N');
      addBalconyStack(tx, towerBaseY + 2.6, bz - 7.5, 13, 3.6, 6.4, 1.25, 'S');

      // Outer Side Walls loaded with stacked Split-AC Condenser Units + Copper Pipe Chases!
      addAcWallStack(
        tx + (tIdx === 0 ? -3.9 : 3.9),
        towerBaseY + 3.2,
        bz - 0.6,
        11,
        3.8,
        tIdx === 0 ? 'W' : 'E',
        3,
        3.4,
      );

      addRooftopEngineering(tx, towerBaseY + twinH, bz - 0.6, 7.8, 13.8, tIdx === 1, tIdx === 0 ? 8.5 : 0);
    });

    // Central Dark Elevator Core & Glass Skybridges uniting the Twin Towers
    const core = new THREE.Mesh(unitBoxGeo, matCharcoal);
    core.scale.set(2.9, twinH + 3.6, 7.6);
    core.position.set(bx, towerBaseY + (twinH + 3.6) * 0.5, bz - 0.6);
    core.castShadow = true;
    group.add(core);
    for (let sb = 0; sb < 4; sb++) {
      const sy = towerBaseY + 10.5 + sb * 11.2;
      instLobbyGlass.push({ x: bx, y: sy, z: bz + 2.8, sx: 3.4, sy: 2.6, sz: 3.8 });
      instWhiteFrames.push({ x: bx, y: sy - 1.4, z: bz + 2.8, sx: 3.6, sy: 0.32, sz: 4.0 });
    }

    [-8.5, -2.5, 2.5, 8.5].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.1, z: bz + 10.5, scale: 0.85 });
    });
  }

  // =========================================================================
  // 3. QUADRA (-51, -51) @ Y = +2.25m — RESIDENCIAL VISTA ALTA (MOLDURAS EM C + SACADAS)
  // =========================================================================
  {
    const bx = -51;
    const bz = -51;
    const baseY = blockTerraceY(bz) + 0.2;

    addFoundationPlinth(bx, baseY, bz, 20.6, 20.6, 1.3);

    // Charcoal & Stone Ground Podium + Porte-Cochère + Perimeter Gradil (Screenshot 1)
    const podiumH = 4.4;
    const podium = new THREE.Mesh(unitBoxGeo, matCharcoal);
    podium.scale.set(18.8, podiumH, 17.6);
    podium.position.set(bx, baseY + 1.3 + podiumH * 0.5, bz);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    addEntranceLobby(bx - 1.5, baseY + 1.3, bz + 8.8, 'N', 4.8, 3.4);
    addEntranceLobby(bx + 9.4, baseY + 1.3, bz + 1.5, 'E', 4.0, 3.2);
    addGaragePortal(bx - 9.4, baseY + 1.3, bz - 2.0, -Math.PI / 2);

    // Main Charcoal & Concrete Shaft (15.6m x 14.4m, H = 56m)
    const shaftBase = baseY + 1.3 + podiumH;
    const shaftH = 56.0;
    const mainShaft = new THREE.Mesh(unitBoxGeo, concreteTowerMat);
    mainShaft.scale.set(15.6, shaftH, 14.4);
    mainShaft.position.set(bx, shaftBase + shaftH * 0.5, bz);
    mainShaft.castShadow = true;
    mainShaft.receiveShadow = true;
    group.add(mainShaft);

    // Iconic Vertical Light Stone Spine + Interlocking C-Shaped Architectural Frames (Screenshot 1!)
    instWhiteFrames.push({ x: bx + 2.4, y: shaftBase + shaftH * 0.5, z: bz + 7.45, sx: 4.2, sy: shaftH + 1.5, sz: 0.7 });
    instWhiteFrames.push({ x: bx - 2.4, y: shaftBase + shaftH * 0.5, z: bz - 7.45, sx: 4.2, sy: shaftH + 1.5, sz: 0.7 });

    // 6 Alternating C-Frame Balcony Clusters on North & South Facades
    for (let c = 0; c < 6; c++) {
      const cy = shaftBase + 5.2 + c * 8.6;
      // Top & bottom projecting white slab of C-frame + outer vertical cheek
      instWhiteFrames.push(
        { x: bx - 3.6, y: cy + 3.1, z: bz + 7.75, sx: 7.4, sy: 0.55, sz: 1.7 },
        { x: bx - 3.6, y: cy - 3.1, z: bz + 7.75, sx: 7.4, sy: 0.55, sz: 1.7 },
        { x: bx - 7.1, y: cy, z: bz + 7.75, sx: 0.55, sy: 6.7, sz: 1.7 },
      );
      // Glass balcony railing inside each C-frame
      instBalconyGlass.push({ x: bx - 3.6, y: cy - 2.2, z: bz + 8.45, sx: 6.4, sy: 1.05, sz: 0.08 });
      instBalconyGlass.push({ x: bx - 3.6, y: cy + 1.2, z: bz + 8.45, sx: 6.4, sy: 1.05, sz: 0.08 });
    }

    // East Wing Stacked Balconies + West Wing Dense AC Condenser Array
    addBalconyStack(bx + 7.8, shaftBase + 3.0, bz, 13, 3.9, 9.6, 1.3, 'E');
    addAcWallStack(bx - 7.8, shaftBase + 3.4, bz, 12, 4.1, 'W', 3, 3.6);
    addAcWallStack(bx + 2.5, shaftBase + 3.4, bz - 7.2, 10, 4.4, 'S', 2, 3.2);

    // Stepped Penthouse Loft + Rooftop Chillers & Helipad
    const ph = new THREE.Mesh(unitBoxGeo, matCharcoal);
    ph.scale.set(11.4, 4.8, 10.6);
    ph.position.set(bx - 1.0, shaftBase + shaftH + 2.4, bz);
    group.add(ph);
    addRooftopEngineering(bx - 1.0, shaftBase + shaftH + 4.8, bz, 11.4, 10.6, true, 9.5);

    [-7.5, 4.5, 8.0].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.1, z: bz + 10.4, scale: 0.88 });
    });
  }

  // =========================================================================
  // 4. QUADRA (-85, -51) @ Y = +2.25m — COMPLEXO DUPLO ATLÂNTICO (TORRES ESCALONADAS + PÓDIO VERMELHO)
  // =========================================================================
  {
    const bx = -85;
    const bz = -51;
    const baseY = blockTerraceY(bz) + 0.2;

    addFoundationPlinth(bx, baseY, bz, 20.8, 20.8, 1.4);

    // Grand MASP/Paulista-Inspired Bold Red Concrete Portal Frame over Glass Corporate Atrium
    const podiumH = 4.6;
    const atrium = new THREE.Mesh(unitBoxGeo, matLobbyGlass);
    atrium.scale.set(17.8, podiumH, 16.8);
    atrium.position.set(bx, baseY + 1.4 + podiumH * 0.5, bz);
    group.add(atrium);

    // Iconic Red Structural Concrete Columns & Top Podium Beam
    const redBeam = new THREE.Mesh(unitBoxGeo, matRedPortal);
    redBeam.scale.set(19.6, 1.35, 18.8);
    redBeam.position.set(bx, baseY + 1.4 + podiumH + 0.65, bz);
    redBeam.castShadow = true;
    group.add(redBeam);
    [
      [-9.1, -8.6],
      [9.1, -8.6],
      [-9.1, 8.6],
      [9.1, 8.6],
    ].forEach(([px, pz]) => {
      const col = new THREE.Mesh(unitBoxGeo, matRedPortal);
      col.scale.set(1.25, podiumH + 0.6, 1.25);
      col.position.set(bx + px, baseY + 1.4 + (podiumH + 0.6) * 0.5, bz + pz);
      col.castShadow = true;
      group.add(col);
    });

    addEntranceLobby(bx, baseY + 1.4, bz + 8.5, 'N', 5.4, 3.6);
    addEntranceLobby(bx + 8.9, baseY + 1.4, bz, 'E', 4.4, 3.4);
    addGaragePortal(bx - 8.9, baseY + 1.4, bz - 2.5, -Math.PI / 2);

    // Twin Staggered Partner Towers rising from the Red Portal Podium (54m & 38m)
    const tBase = baseY + 1.4 + podiumH + 1.3;
    const t1H = 52.0;
    const tower1 = new THREE.Mesh(unitBoxGeo, glassMats[1]);
    tower1.scale.set(9.4, t1H, 9.8);
    tower1.position.set(bx - 4.2, tBase + t1H * 0.5, bz - 3.2);
    tower1.castShadow = true;
    group.add(tower1);

    const t2H = 38.0;
    const tower2 = new THREE.Mesh(unitBoxGeo, concreteTowerMat);
    tower2.scale.set(8.8, t2H, 9.2);
    tower2.position.set(bx + 4.4, tBase + t2H * 0.5, bz + 3.4);
    tower2.castShadow = true;
    group.add(tower2);

    // Metallic Vertical Brises on Tower 1 + Stacked Balconies on Tower 2 + Elevated Skybridge
    for (let b = -1.5; b <= 1.5; b += 1) {
      instBriseMetal.push({
        x: bx - 4.2 + b * 2.4,
        y: tBase + t1H * 0.5,
        z: bz - 3.2,
        sx: 0.24,
        sy: t1H * 0.94,
        sz: 10.3,
      });
    }
    addBalconyStack(bx + 4.4, tBase + 2.8, bz + 8.0, 9, 3.8, 7.0, 1.25, 'N');
    addBalconyStack(bx + 8.8, tBase + 2.8, bz + 3.4, 9, 3.8, 7.0, 1.25, 'E');

    // Skybridge uniting Tower 1 and Tower 2 at +26m
    instDarkTrim.push({ x: bx + 0.1, y: tBase + 22.0, z: bz + 0.1, sx: 5.2, sy: 3.4, sz: 4.8, ry: Math.PI / 4 });
    instLobbyGlass.push({ x: bx + 0.1, y: tBase + 22.0, z: bz + 0.1, sx: 5.4, sy: 2.2, sz: 4.2, ry: Math.PI / 4 });

    // Dense AC Condenser Stacks on inner/rear service faces
    addAcWallStack(bx - 8.9, tBase + 3.0, bz - 3.2, 11, 4.0, 'W', 2, 3.2);
    addAcWallStack(bx + 4.4, tBase + 3.0, bz - 1.2, 8, 4.0, 'S', 2, 3.0);

    addRooftopEngineering(bx - 4.2, tBase + t1H, bz - 3.2, 9.4, 9.8, false, 10.5);
    addRooftopEngineering(bx + 4.4, tBase + t2H, bz + 3.4, 8.8, 9.2, true, 0);

    [-8.0, -4.5, 4.5, 8.0].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.1, z: bz + 10.6, scale: 0.88 });
    });
  }

  // Commit all batched architectural detail meshes (low draw call GPU Instancing, shadows on primary masses only!)
  pushInst(unitBoxGeo, matGraniteBase, instFoundation, false);
  pushInst(unitBoxGeo, matWarmStone, instBalconySlab, false);
  pushInst(unitBoxGeo, matBalconyGlass, instBalconyGlass, false);
  pushInst(unitBoxGeo, matWhiteArch, instWhiteFrames, false);
  pushInst(unitBoxGeo, matDarkSteel, instDarkTrim, false);
  pushInst(unitBoxGeo, matBrise, instBriseMetal, false);
  pushInst(unitBoxGeo, matLobbyGlass, instLobbyGlass, false);
  pushInst(unitBoxGeo, lampMat, instLobbyGlow, false);
  pushInst(unitBoxGeo, matAcBody, instAcBody, false);
  pushInst(unitCylGeo, matAcFan, instAcFan, false);
  pushInst(unitBoxGeo, matBrise, instChillerBody, false);

  // =========================================================================
  // NATURAL COASTAL GREEN HORIZON (Open West Sea Horizon — ZERO cones blocking West Beach/Island!)
  // =========================================================================
  const hillGeo = regGeo(new THREE.ConeGeometry(46, 26, 12));
  const hillMat = regMat(new THREE.MeshStandardMaterial({ color: 0x223a24, roughness: 0.94 }));
  const hillSpots: [number, number, number, number][] = [
    [-215, 132, 1.8, 1.25],
    [-135, 148, 1.5, 1.3],
    [135, 148, 1.6, 1.35],
    [205, 122, 1.9, 1.4],
    [225, -24, 1.8, 1.0],
    [-195, -162, 2.0, 1.15],
    [195, -162, 2.0, 1.15],
    [-70, -210, 2.4, 1.05],
    [70, -210, 2.4, 1.05],
  ];
  const hillInst = new THREE.InstancedMesh(hillGeo, hillMat, hillSpots.length);
  hillInst.frustumCulled = false;
  const hDummy = new THREE.Object3D();
  hillSpots.forEach(([hx, hz, sx, sy], i) => {
    hDummy.position.set(hx, sy * 10.0 + (hz < -100 ? 4.0 : 0), hz);
    hDummy.scale.set(sx, sy, sx * 0.92);
    hDummy.rotation.y = i * 0.7;
    hDummy.updateMatrix();
    hillInst.setMatrixAt(i, hDummy.matrix);

    if (hz > 80 || hz < -140) {
      for (let k = 0; k < 5; k++) {
        treeCollector.atlanticForest.push({
          x: hx + (k - 2) * 14,
          y: (hz < -100 ? 8.5 : 4.2) + (k % 2) * 2.4,
          z: hz + (hz > 0 ? -18 : 18),
          scale: 1.32,
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
// ÁREA RESIDENCIAL ALTA (Setor Sul Elevado Z = -85 @ +6.3m & Z = -119 @ +8.4m)
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
  group.userData.hotspot = 'residential';

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

  // ÁREA RESIDENCIAL LIMPA — 10 quadras residenciais (40 lotes murados) + Parque (+17,-85) + Escola Pública (-17,-85)
  const houseBlocks: [number, number][] = [
    [-85, -85],
    [-51, -85],
    [51, -85],
    [85, -85],
    [-85, -119],
    [-51, -119],
    [-17, -119],
    [17, -119],
    [51, -119],
    [85, -119],
  ];

  const crossPathMat = regMat(new THREE.MeshStandardMaterial({ map: atlas.sidewalk, roughness: 0.85 }));
  const matRetainWall = regMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.86 }));

  // Helper to ground every residential block onto its elevated terrace with clean retaining skirt
  const addElevatedBlockPad = (bx: number, bz: number) => {
    const ty = blockTerraceY(bz);
    const pad = new THREE.Mesh(regGeo(new THREE.BoxGeometry(23, 0.28, 23)), crossPathMat);
    pad.position.set(bx, ty + 0.06, bz);
    pad.receiveShadow = true;
    group.add(pad);

    // Retaining base skirt so elevated terraces connect solidly down to adjacent sloped streets
    const skirtH = 3.2;
    const skirt = new THREE.Mesh(regGeo(new THREE.BoxGeometry(23.1, skirtH, 23.1)), matRetainWall);
    skirt.position.set(bx, ty - skirtH * 0.5 - 0.05, bz);
    skirt.receiveShadow = true;
    group.add(skirt);
    return ty;
  };

  // Landscaped Bairro Park at (+17, -85) on elevated terrace Y = +6.3m
  const parkY = addElevatedBlockPad(17, -85);
  const parkGroup = new THREE.Group();
  parkGroup.position.set(17, parkY + 0.2, -85);
  const lawn = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(20.6, 0.08, 20.6)),
    regMat(new THREE.MeshStandardMaterial({ color: 0x3b7a38, roughness: 0.9 })),
  );
  lawn.position.y = 0.04;
  lawn.receiveShadow = true;
  parkGroup.add(lawn);

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

  [
    [10.5, parkY + 0.28, -91.5, 'ipe_y'],
    [23.5, parkY + 0.28, -91.5, 'ipe_p'],
    [10.5, parkY + 0.28, -78.5, 'leafy'],
    [23.5, parkY + 0.28, -78.5, 'leafy'],
  ].forEach(([tx, ty, tz, k]) => {
    if (k === 'ipe_y') treeCollector.ipesYellow.push({ x: tx as number, y: ty as number, z: tz as number, scale: 0.95 });
    else if (k === 'ipe_p') treeCollector.ipesPink.push({ x: tx as number, y: ty as number, z: tz as number, scale: 0.95 });
    else treeCollector.urbanLeafy.push({ x: tx as number, y: ty as number, z: tz as number, scale: 1.0 });
  });

  // =========================================================================
  // ESCOLA PÚBLICA MUNICIPAL E.M. CIDADE NOVA (-17, -85 @ Y = +6.75m)
  // =========================================================================
  const schoolY = addElevatedBlockPad(-17, -85);
  const schoolGroup = new THREE.Group();
  schoolGroup.name = 'Escola_Publica_Cidade_Nova';
  schoolGroup.userData.hotspot = 'school';
  schoolGroup.position.set(-17, schoolY + 0.2, -85);

  const matSchoolWall = regMat(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.78 }));
  const matSchoolBlue = regMat(new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65 }));
  const matSchoolYellow = regMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 }));
  const matSchoolRoof = regMat(new THREE.MeshStandardMaterial({ map: atlas.terracottaRoof, roughness: 0.74 }));
  const matFenceIron = regMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.42, metalness: 0.75 }));
  const matWhiteCol = regMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }));

  // Concrete access stairs connecting Av. Panorâmica Z = -73.5 (Y=+4.5m) up to School Gate (Y=+6.75m)
  for (let st = 0; st < 8; st++) {
    const step = new THREE.Mesh(regGeo(new THREE.BoxGeometry(6.4, 0.30, 0.48)), crossPathMat);
    step.position.set(0, -2.05 + st * 0.29, 11.8 - st * 0.36);
    step.receiveShadow = true;
    schoolGroup.add(step);
  }
  // Accessible side ramp beside school gate
  const rampMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.2, 0.28, 3.8)), crossPathMat);
  rampMesh.position.set(-4.6, -1.0, 10.6);
  rampMesh.rotation.x = 0.56;
  schoolGroup.add(rampMesh);

  // Perimeter low masonry wall + iron fence around 23m x 23m campus (open 5.4m front gate at Z = +11.1)
  const addSchoolFence = (fx: number, fz: number, w: number, d: number) => {
    const lowWall = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w, 1.15, d)), matSchoolWall);
    lowWall.position.set(fx, 0.575, fz);
    lowWall.castShadow = true;
    schoolGroup.add(lowWall);

    const railTop = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w, 0.08, d)), matFenceIron);
    railTop.position.set(fx, 2.22, fz);
    schoolGroup.add(railTop);
  };
  addSchoolFence(-6.9, 11.1, 8.4, 0.28); // Front left
  addSchoolFence(6.9, 11.1, 8.4, 0.28);  // Front right
  addSchoolFence(0, -11.1, 22.2, 0.28);  // Rear
  addSchoolFence(-11.1, 0, 0.28, 22.2);  // West
  addSchoolFence(11.1, 0, 0.28, 22.2);   // East

  // Monumental School Gate Arch + Banner facing Av. Panorâmica Média
  [-2.8, 2.8].forEach((gx) => {
    const pillar = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.65, 3.4, 0.65)), matSchoolBlue);
    pillar.position.set(gx, 1.7, 11.1);
    pillar.castShadow = true;
    schoolGroup.add(pillar);
  });
  const gateBeam = new THREE.Mesh(regGeo(new THREE.BoxGeometry(6.6, 1.35, 0.42)), matSchoolBlue);
  gateBeam.position.set(0, 3.85, 11.1);
  gateBeam.castShadow = true;
  schoolGroup.add(gateBeam);

  const gateBanner = new THREE.Mesh(
    regGeo(new THREE.PlaneGeometry(6.1, 1.15)),
    regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.schoolSign,
        emissive: 0xffffff,
        emissiveMap: atlas.schoolSign,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      }),
    ),
  );
  gateBanner.position.set(0, 3.85, 11.33);
  schoolGroup.add(gateBanner);

  // Main 2-Story L-Shaped Classroom Wings (South Wing + West Wing)
  const southWing = new THREE.Mesh(regGeo(new THREE.BoxGeometry(19.4, 6.2, 5.8)), matSchoolWall);
  southWing.position.set(0.2, 3.1, -7.2);
  southWing.castShadow = true;
  southWing.receiveShadow = true;
  schoolGroup.add(southWing);

  const southTrim = new THREE.Mesh(regGeo(new THREE.BoxGeometry(19.6, 0.45, 6.0)), matSchoolBlue);
  southTrim.position.set(0.2, 3.15, -7.2);
  schoolGroup.add(southTrim);

  const southRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(13.8, 2.1, 4)), matSchoolRoof);
  southRoof.scale.set(1.04, 1.0, 0.42);
  southRoof.rotation.y = Math.PI / 4;
  southRoof.position.set(0.2, 7.25, -7.2);
  southRoof.castShadow = true;
  schoolGroup.add(southRoof);

  const westWing = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.2, 6.2, 10.6)), matSchoolWall);
  westWing.position.set(-7.1, 3.1, 0.4);
  westWing.castShadow = true;
  westWing.receiveShadow = true;
  schoolGroup.add(westWing);

  const westRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(7.8, 1.8, 4)), matSchoolRoof);
  westRoof.scale.set(0.54, 1.0, 1.04);
  westRoof.rotation.y = Math.PI / 4;
  westRoof.position.set(-7.1, 7.1, 0.4);
  westRoof.castShadow = true;
  schoolGroup.add(westRoof);

  // Shaded Veranda Corridor Columns + Lit Classroom Windows facing Courtyard
  for (let wx = -4; wx <= 8; wx += 3.0) {
    const col = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.14, 0.16, 3.0, 8)), matWhiteCol);
    col.position.set(wx, 1.5, -3.5);
    schoolGroup.add(col);
    [1.7, 4.7].forEach((wy) => {
      const win = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.8, 1.25, 0.14)), windowEmissiveMat);
      win.position.set(wx, wy, -4.28);
      schoolGroup.add(win);
    });
  }
  const verandaSlab = new THREE.Mesh(regGeo(new THREE.BoxGeometry(14.5, 0.22, 1.6)), matSchoolBlue);
  verandaSlab.position.set(2.0, 3.05, -3.8);
  schoolGroup.add(verandaSlab);

  // Sunny Inner Courtyard Multi-Sport Court (Quadra Poliesportiva) + Hoops
  const courtMesh = new THREE.Mesh(
    regGeo(new THREE.PlaneGeometry(11.6, 10.8)),
    regMat(new THREE.MeshStandardMaterial({ map: atlas.schoolCourtyard, roughness: 0.78 })),
  );
  courtMesh.rotation.x = -Math.PI / 2;
  courtMesh.position.set(3.2, 0.04, 3.0);
  courtMesh.receiveShadow = true;
  schoolGroup.add(courtMesh);

  [-1.2, 7.2].forEach((gz) => {
    const hoopPost = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.06, 0.07, 2.75, 8)), matSchoolYellow);
    hoopPost.position.set(3.2, 1.38, gz);
    schoolGroup.add(hoopPost);
    const board = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.15, 0.72, 0.06)), matWhiteCol);
    board.position.set(3.2, 2.55, gz + (gz < 3 ? 0.25 : -0.25));
    schoolGroup.add(board);
  });

  // School Courtyard Flagpole + Papelaria do Estudante Kiosk on East corner facing Av. Central (X = 0)
  const schoolFlagPole = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.05, 0.08, 6.2, 8)), matWhiteCol);
  schoolFlagPole.position.set(-3.4, 3.1, 8.2);
  schoolGroup.add(schoolFlagPole);
  const schoolFlagCloth = new THREE.Mesh(
    regGeo(new THREE.PlaneGeometry(1.7, 1.1)),
    regMat(new THREE.MeshStandardMaterial({ map: atlas.flagAlbedo, side: THREE.DoubleSide })),
  );
  schoolFlagCloth.position.set(-2.5, 5.5, 8.2);
  schoolGroup.add(schoolFlagCloth);

  const papelaria = new THREE.Mesh(regGeo(new THREE.BoxGeometry(3.2, 3.1, 4.4)), matSchoolBlue);
  papelaria.position.set(9.1, 1.55, 7.6);
  papelaria.castShadow = true;
  schoolGroup.add(papelaria);
  const papSign = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.14, 0.85, 3.9)),
    regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.shopSigns[24],
        emissive: 0xffffff,
        emissiveMap: atlas.shopSigns[24],
        emissiveIntensity: 0.55,
      }),
    ),
  );
  papSign.position.set(10.76, 2.55, 7.6);
  schoolGroup.add(papSign);
  const papWin = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(0.12, 1.45, 3.2)),
    regMat(new THREE.MeshStandardMaterial({ map: atlas.shopVitrine[24], roughness: 0.3 })),
  );
  papWin.position.set(10.74, 1.25, 7.6);
  schoolGroup.add(papWin);

  group.add(schoolGroup);

  // Botanical trees & flowering shrubs framing the school front garden
  treeCollector.ipesYellow.push({ x: -24.5, y: schoolY + 0.24, z: -76.5, scale: 0.88 });
  treeCollector.urbanLeafy.push({ x: -9.5, y: schoolY + 0.24, z: -76.5, scale: 0.88 });
  [-23, -20.5, -13.5, -11].forEach((sx) => {
    treeCollector.shrubs.push({ x: sx, y: schoolY + 0.24, z: -74.5, scale: 0.85 });
  });

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
  const acUnits: BoxTransform[] = [];
  const frontDoors: BoxTransform[] = [];
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
    const ty = addElevatedBlockPad(bx, bz);
    const groundTop = ty + 0.2;

    // Corner utility poles + sagging wires seated on exact terrace height
    const poleCorners: THREE.Vector3[] = [
      new THREE.Vector3(bx - 10.6, groundTop, bz - 10.6),
      new THREE.Vector3(bx + 10.6, groundTop, bz - 10.6),
      new THREE.Vector3(bx + 10.6, groundTop, bz + 10.6),
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
        bar.position.set(hx, groundTop, hz);
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

      const isSobrado = seed % 5 < 2;
      const w = 6.2 + (seed % 3) * 0.55;
      const d = 5.5 + ((seed + 1) % 2) * 0.6;
      const floor1H = 2.95;
      const bodyH = isSobrado ? 5.65 : floor1H;
      const stuccoCol = stuccoColors[seed % stuccoColors.length];
      const wallCol = wallColors[(seed + 2) % wallColors.length];

      // Small green front yard lawn pad
      yardLawns.push({ x: hx, y: groundTop + 0.02, z: hz, sx: 9.6, sy: 0.05, sz: 9.6, ry: 0 });

      const houseZ = hz - fDir * 0.85;
      houseBodies.push({
        x: hx,
        y: groundTop + bodyH * 0.5,
        z: houseZ,
        sx: w,
        sy: bodyH,
        sz: d,
        ry: facingRot,
        color: stuccoCol,
      });

      // Porch canopy or upper balcony slab
      const porchZ = houseZ + fDir * (d * 0.5 + 0.7);
      if (isSobrado) {
        housePorches.push({
          x: hx + 0.8,
          y: groundTop + 2.85,
          z: porchZ,
          sx: w * 0.55,
          sy: 0.18,
          sz: 1.35,
          ry: facingRot,
        });
      } else {
        housePorches.push({
          x: hx,
          y: groundTop + 2.45,
          z: porchZ,
          sx: w * 0.88,
          sy: 0.16,
          sz: 1.65,
          ry: facingRot,
        });
      }

      // Ceramic terracotta or fiber-cement roof
      const roofEntry: BoxTransform = {
        x: hx,
        y: groundTop + bodyH + 0.68,
        z: houseZ,
        sx: w + 0.65,
        sy: 1.35,
        sz: d + 0.65,
        ry: facingRot,
      };
      if (seed % 3 === 0) fiberRoofs.push(roofEntry);
      else terracottaRoofs.push(roofEntry);

      // Rooftop Caixa d'Água seated cleanly beside roof peak on rear concrete corner
      waterTanks.push({
        x: hx - w * 0.34,
        y: groundTop + bodyH + 0.42,
        z: houseZ - fDir * (d * 0.42),
        sx: 0.48,
        sy: 0.78,
        sz: 0.48,
        ry: 0,
      });

      // Front wooden door with brass threshold + wall-mounted Split AC condenser unit
      frontDoors.push({
        x: hx + w * 0.16,
        y: groundTop + 1.1,
        z: houseZ + fDir * (d * 0.5 + 0.05),
        sx: 0.95,
        sy: 2.15,
        sz: 0.12,
        ry: facingRot,
      });
      acUnits.push({
        x: hx + w * 0.5 + 0.16,
        y: groundTop + (isSobrado ? 4.2 : 2.1),
        z: houseZ,
        sx: 0.28,
        sy: 0.48,
        sz: 0.72,
        ry: 0,
      });

      // Glowing evening front windows aligned to facing direction
      litWindows.push({
        x: hx - w * 0.22,
        y: groundTop + 1.55,
        z: houseZ + fDir * (d * 0.5 + 0.05),
        sx: 1.35,
        sy: 1.05,
        sz: 0.12,
        ry: facingRot,
      });
      if (isSobrado) {
        litWindows.push({
          x: hx + w * 0.18,
          y: groundTop + 4.3,
          z: houseZ + fDir * (d * 0.5 + 0.05),
          sx: 1.55,
          sy: 1.05,
          sz: 0.12,
          ry: facingRot,
        });
      }

      // Complete 4-edge enclosed yard: front wall + gate + left & right side walls + rear wall
      const frontWallZ = hz + fDir * 4.55;
      perimeterWalls.push(
        {
          x: hx - 2.6,
          y: groundTop + 0.85,
          z: frontWallZ,
          sx: 4.2,
          sy: 1.7,
          sz: 0.24,
          ry: 0,
          color: wallCol,
        },
        {
          x: hx - 4.75,
          y: groundTop + 0.85,
          z: hz,
          sx: 0.22,
          sy: 1.7,
          sz: 9.2,
          ry: 0,
          color: wallCol,
        },
        {
          x: hx + 4.75,
          y: groundTop + 0.85,
          z: hz,
          sx: 0.22,
          sy: 1.7,
          sz: 9.2,
          ry: 0,
          color: wallCol,
        },
        {
          x: hx,
          y: groundTop + 0.85,
          z: hz - fDir * 4.65,
          sx: 9.6,
          sy: 1.7,
          sz: 0.22,
          ry: 0,
          color: wallCol,
        },
      );
      metalGates.push({
        x: hx + 2.0,
        y: groundTop + 0.9,
        z: frontWallZ,
        sx: 3.6,
        sy: 1.75,
        sz: 0.12,
        ry: 0,
      });

      if ((seed + lIdx) % 2 === 0) {
        treeCollector.urbanLeafy.push({
          x: hx - 3.1,
          y: groundTop + 0.04,
          z: hz + fDir * 3.1,
          scale: 0.62 + (seed % 3) * 0.08,
        });
      }

      if ((seed + bIdx) % 3 === 0) {
        parkedCarSpots.push({
          x: hx + 2.1,
          y: groundTop + 0.05,
          z: hz + fDir * 2.4,
          rotY: facingRot,
          color: carColors[seed % carColors.length],
        });
      }
    });
  });

  // Batch-instantiate residential geometry
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
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.68 })), housePorches, false);
  spawnInst(hipRoofGeo, regMat(new THREE.MeshStandardMaterial({ map: atlas.terracottaRoof, roughness: 0.72 })), terracottaRoofs, true);
  spawnInst(hipRoofGeo, regMat(new THREE.MeshStandardMaterial({ map: atlas.zincRoof, roughness: 0.58, metalness: 0.35 })), fiberRoofs, true);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })), perimeterWalls, true);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.75 })), metalGates, false);
  spawnInst(tankGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })), waterTanks, false);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 })), acUnits, false);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.68 })), frontDoors, false);
  spawnInst(boxGeo, windowEmissiveMat, litWindows, false);
  spawnInst(boxGeo, regMat(new THREE.MeshStandardMaterial({ color: 0x4d7c3f, roughness: 0.92 })), yardLawns, false);

  const matWire = regMat(new THREE.MeshBasicMaterial({ color: 0x18181b }));
  wireSpans.forEach(({ a, b }) => {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mid.y -= 0.45;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const wire = new THREE.Mesh(regGeo(new THREE.TubeGeometry(curve, 8, 0.024, 4, false)), matWire);
    group.add(wire);
  });

  if (parkedCarSpots.length > 0) {
    const pBodyMat = regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 }));
    const pGlassMat = regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 }));
    const pWheelMat = regMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }));

    const carBodies = new THREE.InstancedMesh(boxGeo, pBodyMat, parkedCarSpots.length);
    const carCabins = new THREE.InstancedMesh(boxGeo, pGlassMat, parkedCarSpots.length);
    const carWheels = new THREE.InstancedMesh(tankGeo, pWheelMat, parkedCarSpots.length * 4);
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

// ============================================================================
// EXPANSÃO URBANA LATERAL (X = ±125 · QUADRAS LARGAS 33m × 23m)
// - 3 Prédios Largos de Moradia (2-em-1): (-125,-51), (-125,-85), (+125,-85)
// - 3 Prédios de Vendas de Empresas c/ Outdoors & Estacionamentos: (-125,-17), (+125,-17), (+125,-51)
// ============================================================================
export function createExpandedBuildingsDistrict(
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
  group.name = 'Expansao_Predios_Largos_e_Vendas';

  const condosGroup = new THREE.Group();
  condosGroup.name = 'Predios_Largos_Moradia_2em1';
  condosGroup.userData.hotspot = 'condos';

  const corporateGroup = new THREE.Group();
  corporateGroup.name = 'Predios_Vendas_Outdoors_Estacionamentos';
  corporateGroup.userData.hotspot = 'corporate';

  group.add(condosGroup, corporateGroup);

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
  const parkedCarSpots: { x: number; y: number; z: number; rotY: number; color: number }[] = [];

  const glassMats = [0x38bdf8, 0x2dd4bf, 0x818cf8].map((tint) => {
    const m = regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.skyscraperGlass,
        color: tint,
        emissive: 0xfef08a,
        emissiveMap: atlas.skyscraperGlassEmissive,
        emissiveIntensity: 0.72,
        roughness: 0.14,
        metalness: 0.72,
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
      emissiveIntensity: 0.48,
      roughness: 0.6,
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
      roughness: 0.64,
    }),
  );
  skylineGlowMats.push(resTowerMat);

  const resWarmTowerMat = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.residentialFacade,
      color: 0xf5e8d6,
      emissive: 0xfde68a,
      emissiveMap: atlas.skyscraperGlassEmissive,
      emissiveIntensity: 0.38,
      roughness: 0.66,
    }),
  );
  skylineGlowMats.push(resWarmTowerMat);

  const matDarkSteel = regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.72 }));
  const matBrise = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.75 }));
  const matWhiteArch = regMat(new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.62 }));
  const matWarmStone = regMat(new THREE.MeshStandardMaterial({ color: 0xd6d3cd, roughness: 0.74 }));
  const matCharcoal = regMat(new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.68 }));
  const matGraniteBase = regMat(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 }));
  const matParkingAsphalt = regMat(new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.9 }));
  const matParkingCurb = regMat(new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }));
  const matParkingLine = regMat(new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 }));
  const matBumperYellow = regMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }));
  const matBarrierRed = regMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 }));
  const matBalconyGlass = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.46,
      roughness: 0.12,
      metalness: 0.45,
    }),
  );
  const matLobbyGlass = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.58,
      roughness: 0.1,
      metalness: 0.65,
    }),
  );
  const matAcBody = regMat(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.15 }));
  const matAcFan = regMat(new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.65 }));
  const matWaterTank = regMat(new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 }));
  const matHelipad = regMat(new THREE.MeshStandardMaterial({ map: atlas.helipad, roughness: 0.65 }));
  const matBeacon = regMat(
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 }),
  );
  beaconMats.push(matBeacon);

  const unitBoxGeo = regGeo(new THREE.BoxGeometry(1, 1, 1));
  const unitCylGeo = regGeo(new THREE.CylinderGeometry(1, 1, 1, 10));

  type InstItem = { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry?: number };
  const instFoundation: InstItem[] = [];
  const instBalconySlab: InstItem[] = [];
  const instBalconyGlass: InstItem[] = [];
  const instWhiteFrames: InstItem[] = [];
  const instDarkTrim: InstItem[] = [];
  const instBriseMetal: InstItem[] = [];
  const instLobbyGlass: InstItem[] = [];
  const instLobbyGlow: InstItem[] = [];
  const instAcBody: InstItem[] = [];
  const instAcFan: InstItem[] = [];
  const instChillerBody: InstItem[] = [];
  const instParkingLines: InstItem[] = [];
  const instParkingBumpers: InstItem[] = [];
  const instWaterTanks: InstItem[] = [];

  const instDummy = new THREE.Object3D();
  const pushInst = (
    target: THREE.Group,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: InstItem[],
    castShadow: boolean,
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    items.forEach((it, idx) => {
      instDummy.position.set(it.x, it.y, it.z);
      instDummy.rotation.set(0, it.ry ?? 0, 0);
      instDummy.scale.set(it.sx, it.sy, it.sz);
      instDummy.updateMatrix();
      mesh.setMatrixAt(idx, instDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    target.add(mesh);
  };

  const addFoundationPlinth = (bx: number, baseY: number, bz: number, w: number, d: number, h: number) => {
    const sink = 1.4;
    instFoundation.push({ x: bx, y: baseY + (h - sink) * 0.5, z: bz, sx: w, sy: h + sink, sz: d });
    instWhiteFrames.push({ x: bx, y: baseY + h + 0.12, z: bz, sx: w + 0.45, sy: 0.24, sz: d + 0.45 });
  };

  const addEntranceLobby = (
    bx: number,
    yBase: number,
    bz: number,
    facing: 'N' | 'S' | 'E' | 'W',
    width = 4.6,
    height = 3.4,
  ) => {
    const ry = facing === 'N' ? 0 : facing === 'S' ? Math.PI : facing === 'E' ? Math.PI / 2 : -Math.PI / 2;
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);

    instLobbyGlow.push({
      x: bx - nx * 0.45,
      y: yBase + height * 0.5,
      z: bz - nz * 0.45,
      sx: width * 0.86,
      sy: height * 0.82,
      sz: 0.9,
      ry,
    });
    instDarkTrim.push({ x: bx, y: yBase + height + 0.18, z: bz, sx: width + 0.5, sy: 0.34, sz: 0.55, ry });
    [-width * 0.5, 0, width * 0.5].forEach((off) => {
      instDarkTrim.push({
        x: bx + Math.cos(ry) * off,
        y: yBase + height * 0.5,
        z: bz - Math.sin(ry) * off,
        sx: 0.16,
        sy: height,
        sz: 0.28,
        ry,
      });
    });
    [-width * 0.24, width * 0.24].forEach((off, idx) => {
      const lx = bx + Math.cos(ry) * off + nx * 0.14;
      const lz = bz - Math.sin(ry) * off + nz * 0.14;
      instLobbyGlass.push({ x: lx, y: yBase + height * 0.46, z: lz, sx: width * 0.44, sy: height * 0.9, sz: 0.08, ry });
      const hOff = off + (idx === 0 ? 0.36 : -0.36);
      instBriseMetal.push({
        x: bx + Math.cos(ry) * hOff + nx * 0.24,
        y: yBase + 1.25,
        z: bz - Math.sin(ry) * hOff + nz * 0.24,
        sx: 0.07,
        sy: 0.85,
        sz: 0.09,
        ry,
      });
    });
    instDarkTrim.push({
      x: bx + nx * 1.4,
      y: yBase + height + 0.15,
      z: bz + nz * 1.4,
      sx: width + 1.8,
      sy: 0.26,
      sz: 2.8,
      ry,
    });
    instLobbyGlow.push({
      x: bx + nx * 1.35,
      y: yBase + height - 0.02,
      z: bz + nz * 1.35,
      sx: width + 0.8,
      sy: 0.08,
      sz: 1.9,
      ry,
    });
    [-width * 0.46, width * 0.46].forEach((off) => {
      instDarkTrim.push({
        x: bx + Math.cos(ry) * off + nx * 2.35,
        y: yBase + height * 0.5,
        z: bz - Math.sin(ry) * off + nz * 2.35,
        sx: 0.22,
        sy: height + 0.1,
        sz: 0.22,
        ry,
      });
    });
  };

  const addAcWallStack = (
    cx: number,
    yStart: number,
    cz: number,
    floors: number,
    floorH: number,
    facing: 'N' | 'S' | 'E' | 'W',
    columns = 2,
    colSpacing = 2.6,
  ) => {
    const ry = facing === 'N' ? 0 : facing === 'S' ? Math.PI : facing === 'E' ? Math.PI / 2 : -Math.PI / 2;
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    const tx = Math.cos(ry);
    const tz = -Math.sin(ry);

    for (let c = 0; c < columns; c++) {
      const off = (c - (columns - 1) * 0.5) * colSpacing;
      const colH = floors * floorH;
      instDarkTrim.push({
        x: cx + tx * off + nx * 0.09,
        y: yStart + colH * 0.5 - floorH * 0.35,
        z: cz + tz * off + nz * 0.09,
        sx: 0.14,
        sy: colH,
        sz: 0.14,
        ry,
      });

      for (let f = 0; f < floors; f++) {
        const uy = yStart + f * floorH;
        const ux = cx + tx * off + nx * 0.36;
        const uz = cz + tz * off + nz * 0.36;
        instAcBody.push({ x: ux, y: uy, z: uz, sx: 0.92, sy: 0.62, sz: 0.42, ry });
        instAcFan.push({
          x: ux - tx * 0.18 + nx * 0.22,
          y: uy,
          z: uz - tz * 0.18 + nz * 0.22,
          sx: 0.24,
          sy: 0.06,
          sz: 0.24,
          ry,
        });
      }
    }
  };

  const addBalconyStack = (
    cx: number,
    yStart: number,
    cz: number,
    floors: number,
    floorH: number,
    width: number,
    depth: number,
    facing: 'N' | 'S' | 'E' | 'W',
  ) => {
    const ry = facing === 'N' ? 0 : facing === 'S' ? Math.PI : facing === 'E' ? Math.PI / 2 : -Math.PI / 2;
    const nx = Math.sin(ry);
    const nz = Math.cos(ry);
    for (let f = 0; f < floors; f++) {
      const by = yStart + f * floorH;
      const sx = cx + nx * (depth * 0.5);
      const sz = cz + nz * (depth * 0.5);
      instBalconySlab.push({ x: sx, y: by, z: sz, sx: width, sy: 0.22, sz: depth, ry });
      instBalconyGlass.push({
        x: cx + nx * (depth - 0.08),
        y: by + 0.62,
        z: cz + nz * (depth - 0.08),
        sx: width - 0.14,
        sy: 1.0,
        sz: 0.08,
        ry,
      });
      instDarkTrim.push({
        x: cx + nx * (depth - 0.08),
        y: by + 1.14,
        z: cz + nz * (depth - 0.08),
        sx: width,
        sy: 0.08,
        sz: 0.12,
        ry,
      });
    }
  };

  const addRooftopEngineering = (
    bx: number,
    topY: number,
    bz: number,
    w: number,
    d: number,
    hasHelipad: boolean,
    mastHeight = 0,
    withTanks = false,
  ) => {
    instDarkTrim.push(
      { x: bx, y: topY + 0.55, z: bz + d * 0.5 - 0.18, sx: w, sy: 1.1, sz: 0.36 },
      { x: bx, y: topY + 0.55, z: bz - d * 0.5 + 0.18, sx: w, sy: 1.1, sz: 0.36 },
      { x: bx - w * 0.5 + 0.18, y: topY + 0.55, z: bz, sx: 0.36, sy: 1.1, sz: d - 0.6 },
      { x: bx + w * 0.5 - 0.18, y: topY + 0.55, z: bz, sx: 0.36, sy: 1.1, sz: d - 0.6 },
    );

    instChillerBody.push(
      { x: bx - w * 0.24, y: topY + 1.1, z: bz - d * 0.18, sx: 2.8, sy: 2.1, sz: 2.6 },
      { x: bx + w * 0.22, y: topY + 0.85, z: bz + d * 0.2, sx: 2.2, sy: 1.4, sz: 1.6 },
    );
    instAcFan.push(
      { x: bx + w * 0.22 - 0.55, y: topY + 1.6, z: bz + d * 0.2, sx: 0.55, sy: 0.16, sz: 0.55 },
      { x: bx + w * 0.22 + 0.55, y: topY + 1.6, z: bz + d * 0.2, sx: 0.55, sy: 0.16, sz: 0.55 },
    );

    if (withTanks) {
      instWaterTanks.push(
        { x: bx - w * 0.24, y: topY + 2.9, z: bz - d * 0.18 + 0.5, sx: 0.75, sy: 1.4, sz: 0.75 },
        { x: bx - w * 0.24 + 1.6, y: topY + 2.9, z: bz - d * 0.18 + 0.5, sx: 0.75, sy: 1.4, sz: 0.75 },
      );
    }

    if (hasHelipad) {
      const pad = new THREE.Mesh(unitBoxGeo, matHelipad);
      pad.scale.set(Math.min(7.5, w * 0.55), 0.24, Math.min(7.5, d * 0.55));
      pad.position.set(bx, topY + 0.25, bz);
      group.add(pad);
    }

    if (mastHeight > 0) {
      const spire = new THREE.Mesh(unitCylGeo, matBrise);
      spire.scale.set(0.24, mastHeight, 0.24);
      spire.position.set(bx, topY + mastHeight * 0.5, bz);
      group.add(spire);
      const beacon = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.32, 10, 10)), matBeacon);
      beacon.position.set(bx, topY + mastHeight + 0.2, bz);
      group.add(beacon);
    }
  };

  const addPerimeterGradilAndGuarita = (
    target: THREE.Group,
    bx: number,
    baseY: number,
    bz: number,
    w: number,
    d: number,
    frontFacing: 'N' | 'S' = 'N',
  ) => {
    const frontZ = frontFacing === 'N' ? bz + d * 0.5 : bz - d * 0.5;
    const zDir = frontFacing === 'N' ? 1 : -1;

    // Low masonry wall + iron gradil flanking central entry gap
    [-w * 0.31, w * 0.31].forEach((ox) => {
      instFoundation.push({ x: bx + ox, y: baseY + 0.32, z: frontZ, sx: w * 0.32, sy: 0.64, sz: 0.32 });
      instDarkTrim.push({ x: bx + ox, y: baseY + 1.25, z: frontZ, sx: w * 0.31, sy: 1.25, sz: 0.12 });
    });

    // Guarita (Security Gatehouse)
    const gx = bx - 3.6;
    const gz = frontZ - zDir * 0.8;
    const guarita = new THREE.Mesh(unitBoxGeo, matWhiteArch);
    guarita.scale.set(2.5, 2.75, 2.2);
    guarita.position.set(gx, baseY + 1.38, gz);
    guarita.castShadow = true;
    target.add(guarita);
    instLobbyGlass.push({ x: gx, y: baseY + 1.75, z: gz + zDir * 1.12, sx: 1.9, sy: 1.0, sz: 0.08 });
    instDarkTrim.push({ x: gx, y: baseY + 2.86, z: gz, sx: 2.9, sy: 0.24, sz: 2.6 });
  };

  const addTrussBillboard = (
    target: THREE.Group,
    bx: number,
    yBase: number,
    bz: number,
    boardW: number,
    boardH: number,
    postH: number,
    ry: number,
    texIdx: number,
    doubleSided = true,
  ) => {
    const bg = new THREE.Group();
    bg.position.set(bx, yBase, bz);
    bg.rotation.y = ry;

    const legSpan = boardW * 0.32;
    [-legSpan, legSpan].forEach((lx) => {
      const leg = new THREE.Mesh(unitCylGeo, matDarkSteel);
      leg.scale.set(0.24, postH + boardH * 0.45, 0.24);
      leg.position.set(lx, (postH + boardH * 0.45) * 0.5, 0);
      leg.castShadow = true;
      bg.add(leg);
    });

    const frame = new THREE.Mesh(unitBoxGeo, matDarkSteel);
    frame.scale.set(boardW + 0.45, boardH + 0.45, 0.34);
    frame.position.set(0, postH + boardH * 0.5, 0);
    frame.castShadow = true;
    bg.add(frame);

    const tex = atlas.salesBillboards[texIdx % atlas.salesBillboards.length];
    const faceMat = regMat(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.52,
        roughness: 0.35,
      }),
    );

    const frontFace = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(boardW, boardH)), faceMat);
    frontFace.position.set(0, postH + boardH * 0.5, 0.19);
    bg.add(frontFace);

    if (doubleSided) {
      const backFace = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(boardW, boardH)), faceMat);
      backFace.position.set(0, postH + boardH * 0.5, -0.19);
      backFace.rotation.y = Math.PI;
      bg.add(backFace);
    }

    // Billboard overhead floodlight bar
    const lightBar = new THREE.Mesh(unitBoxGeo, lampMat);
    lightBar.scale.set(boardW * 0.8, 0.12, 0.22);
    lightBar.position.set(0, postH + boardH + 0.42, 0.48);
    bg.add(lightBar);

    target.add(bg);
  };

  const addParkingLot = (
    target: THREE.Group,
    cx: number,
    baseY: number,
    cz: number,
    lotW: number,
    lotD: number,
    gateSide: 'N' | 'S' | 'E' | 'W',
    seedOffset: number,
  ) => {
    // Dark asphalt parking surface slightly above sidewalk pad
    const pad = new THREE.Mesh(unitBoxGeo, matParkingAsphalt);
    pad.scale.set(lotW, 0.08, lotD);
    pad.position.set(cx, baseY + 0.04, cz);
    pad.receiveShadow = true;
    target.add(pad);

    // Stone border curbs with gap on gateSide
    const curbH = 0.14;
    const curbY = baseY + 0.08;
    const sides: { side: 'N' | 'S' | 'E' | 'W'; x: number; z: number; sx: number; sz: number }[] = [
      { side: 'N', x: cx, z: cz + lotD * 0.5 - 0.15, sx: lotW, sz: 0.28 },
      { side: 'S', x: cx, z: cz - lotD * 0.5 + 0.15, sx: lotW, sz: 0.28 },
      { side: 'E', x: cx + lotW * 0.5 - 0.15, z: cz, sx: 0.28, sz: lotD },
      { side: 'W', x: cx - lotW * 0.5 + 0.15, z: cz, sx: 0.28, sz: lotD },
    ];
    sides.forEach((s) => {
      if (s.side !== gateSide) {
        const curb = new THREE.Mesh(unitBoxGeo, matParkingCurb);
        curb.scale.set(s.sx, curbH, s.sz);
        curb.position.set(s.x, curbY, s.z);
        target.add(curb);
      } else {
        // Leave central 5.4m drive aisle open
        if (s.side === 'N' || s.side === 'S') {
          const wingW = (lotW - 5.4) * 0.5;
          if (wingW > 0.5) {
            [-1, 1].forEach((dir) => {
              const cMesh = new THREE.Mesh(unitBoxGeo, matParkingCurb);
              cMesh.scale.set(wingW, curbH, 0.28);
              cMesh.position.set(cx + dir * (lotW * 0.5 - wingW * 0.5), curbY, s.z);
              target.add(cMesh);
            });
          }
        }
      }
    });

    // Entry Guarita + Cancela (Barrier Arm) at gateSide
    const gateZ = gateSide === 'N' ? cz + lotD * 0.5 - 0.8 : cz - lotD * 0.5 + 0.8;
    const guarita = new THREE.Mesh(unitBoxGeo, matWhiteArch);
    guarita.scale.set(1.75, 2.35, 1.85);
    guarita.position.set(cx - 2.9, baseY + 1.2, gateZ);
    guarita.castShadow = true;
    target.add(guarita);
    instDarkTrim.push({ x: cx - 2.9, y: baseY + 2.45, z: gateZ, sx: 2.1, sy: 0.2, sz: 2.2 });

    const gatePost = new THREE.Mesh(unitBoxGeo, matBumperYellow);
    gatePost.scale.set(0.32, 1.05, 0.32);
    gatePost.position.set(cx - 1.65, baseY + 0.55, gateZ);
    target.add(gatePost);

    const barrierArm = new THREE.Mesh(unitBoxGeo, matBarrierRed);
    barrierArm.scale.set(3.5, 0.1, 0.1);
    barrierArm.position.set(cx + 0.1, baseY + 0.96, gateZ);
    target.add(barrierArm);

    // Parking Light Poles
    [cz - lotD * 0.28, cz + lotD * 0.28].forEach((pz) => {
      const pole = new THREE.Mesh(unitCylGeo, matDarkSteel);
      pole.scale.set(0.11, 5.4, 0.11);
      pole.position.set(cx + lotW * 0.42, baseY + 2.7, pz);
      target.add(pole);
      const lamp = new THREE.Mesh(unitBoxGeo, lampMat);
      lamp.scale.set(0.85, 0.16, 0.35);
      lamp.position.set(cx + lotW * 0.42 - 0.35, baseY + 5.38, pz);
      target.add(lamp);
    });

    // Left & Right rows of angled/perpendicular parking stalls with painted stripes, yellow wheel stops, & cars
    const carColors = [0xdc2626, 0x2563eb, 0xe2e8f0, 0x18181b, 0x059669, 0xd97706, 0x7c3aed];
    const stallRows = [-lotW * 0.27, lotW * 0.27];
    const zSlots = [-5.4, -2.1, 1.2, 4.5];

    stallRows.forEach((rx, rIdx) => {
      const rowX = cx + rx;
      // Paint stall separator stripes
      for (let i = 0; i <= zSlots.length; i++) {
        const lineZ = cz + (-7.05 + i * 3.3);
        instParkingLines.push({ x: rowX, y: baseY + 0.085, z: lineZ, sx: 4.1, sy: 0.02, sz: 0.12 });
      }
      zSlots.forEach((szOff, sIdx) => {
        const slotZ = cz + szOff;
        // Skip the very front gate lane on the entry side so cars can pull in cleanly
        if (
          (gateSide === 'N' && sIdx === zSlots.length - 1) ||
          (gateSide === 'S' && sIdx === 0)
        ) {
          return;
        }
        const bumperX = rowX + (rIdx === 0 ? -1.55 : 1.55);
        instParkingBumpers.push({ x: bumperX, y: baseY + 0.13, z: slotZ, sx: 0.2, sy: 0.12, sz: 1.9 });

        const hash = (seedOffset + rIdx * 5 + sIdx * 3) % 7;
        if (hash !== 6) {
          parkedCarSpots.push({
            x: rowX,
            y: baseY + 0.08,
            z: slotZ,
            rotY: rIdx === 0 ? Math.PI / 2 : -Math.PI / 2,
            color: carColors[(seedOffset + rIdx * 3 + sIdx) % carColors.length],
          });
        }
      });
    });
  };

  // =========================================================================
  // PART A — 3 PRÉDIOS LARGOS DE MORADIA (DOIS PRÉDIOS EM UM · 33m × 23m)
  // Quadras: (-125, -51 @ +2.25m), (-125, -85 @ +6.75m), (+125, -85 @ +6.75m)
  // =========================================================================
  const buildTwinWideCondo = (
    bx: number,
    bz: number,
    wingMat: THREE.Material,
    coreGlassMat: THREE.Material,
    wingH: number,
    floors: number,
    invertFrameTone: boolean,
  ) => {
    const baseY = blockTerraceY(bz) + 0.2;
    addFoundationPlinth(bx, baseY, bz, 30.8, 19.6, 1.15);
    addPerimeterGradilAndGuarita(condosGroup, bx, baseY, bz, 31.2, 20.4, 'N');

    const pBase = baseY + 1.15;
    const podiumH = 3.8;

    // Shared Full-Width Ground Podium connecting both residential towers into one grand entrance
    const podium = new THREE.Mesh(unitBoxGeo, matCharcoal);
    podium.scale.set(29.6, podiumH, 16.4);
    podium.position.set(bx, pBase + podiumH * 0.5, bz);
    podium.castShadow = true;
    podium.receiveShadow = true;
    condosGroup.add(podium);

    // Double Glass Residential Lobbies (North & South Avenues) + Flank Garage Portals
    addEntranceLobby(bx, pBase, bz + 8.3, 'N', 6.4, 3.5);
    addEntranceLobby(bx, pBase, bz - 8.3, 'S', 5.2, 3.3);
    [-11.2, 11.2].forEach((gx) => {
      instDarkTrim.push({ x: bx + gx, y: pBase + 1.5, z: bz + 8.3, sx: 4.8, sy: 2.9, sz: 0.42 });
      instBriseMetal.push({ x: bx + gx, y: pBase + 1.4, z: bz + 8.5, sx: 4.3, sy: 2.5, sz: 0.1 });
      instLobbyGlow.push({ x: bx + gx - 2.6, y: pBase + 2.4, z: bz + 8.56, sx: 0.22, sy: 0.4, sz: 0.22 });
    });

    const towerBase = pBase + podiumH;

    // Central Fused Atrium Spine + 3 Elevated Glass Skybridges joining West & East Wings
    const spine = new THREE.Mesh(unitBoxGeo, coreGlassMat);
    spine.scale.set(6.4, wingH - 3.0, 9.8);
    spine.position.set(bx, towerBase + (wingH - 3.0) * 0.5, bz);
    spine.castShadow = true;
    condosGroup.add(spine);

    [0.34, 0.62, 0.88].forEach((frac) => {
      const sy = towerBase + wingH * frac;
      instDarkTrim.push({ x: bx, y: sy, z: bz, sx: 8.6, sy: 3.1, sz: 12.2 });
      instLobbyGlass.push({ x: bx, y: sy, z: bz, sx: 8.2, sy: 2.2, sz: 12.5 });
    });

    // Twin Wide Residential Wings (Left & Right) making a ~29.6m wide 2-in-1 complex
    [-8.6, 8.6].forEach((wxOff, wIdx) => {
      const wx = bx + wxOff;
      const wing = new THREE.Mesh(unitBoxGeo, wingMat);
      wing.scale.set(11.4, wingH, 15.2);
      wing.position.set(wx, towerBase + wingH * 0.5, bz);
      wing.castShadow = true;
      wing.receiveShadow = true;
      condosGroup.add(wing);

      // Architectural Framing Ribs wrapping front & back of each wing
      const frameColorList = invertFrameTone ? instDarkTrim : instWhiteFrames;
      frameColorList.push(
        { x: wx - 5.4, y: towerBase + wingH * 0.5, z: bz, sx: 0.65, sy: wingH + 1.1, sz: 15.8 },
        { x: wx + 5.4, y: towerBase + wingH * 0.5, z: bz, sx: 0.65, sy: wingH + 1.1, sz: 15.8 },
        { x: wx, y: towerBase + wingH + 0.45, z: bz, sx: 11.8, sy: 0.9, sz: 15.9 },
      );

      // Wide Glass-Railed Apartment Balconies on BOTH North (+Z) & South (-Z) Facades
      addBalconyStack(wx, towerBase + 2.4, bz + 7.6, floors, 3.6, 9.4, 1.35, 'N');
      addBalconyStack(wx, towerBase + 2.4, bz - 7.6, floors, 3.6, 9.4, 1.35, 'S');

      // Dense 3D Split-AC Condenser Stacks on outer flank & inner courtyard shafts
      const outerSide = wIdx === 0 ? 'W' : 'E';
      const outerX = wx + (wIdx === 0 ? -5.7 : 5.7);
      addAcWallStack(outerX, towerBase + 2.6, bz, Math.max(6, floors - 1), 3.6, outerSide, 3, 3.4);

      addRooftopEngineering(wx, towerBase + wingH, bz, 11.4, 15.2, wIdx === 0, wIdx === 1 ? 8.5 : 0, true);
    });

    // Shrubs along wide condo sidewalk setback
    [-12.0, -7.2, 7.2, 12.0].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.08, z: bz + 10.6, scale: 0.88 });
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.08, z: bz - 10.6, scale: 0.88 });
    });
  };

  // 1. (-125, -51) @ +2.25m — Residencial Duplo Alvorada (40m, 10 andares)
  buildTwinWideCondo(-125, -51, resTowerMat, glassMats[0], 37.5, 9, false);

  // 2. (-125, -85) @ +6.75m — Condomínio Largo Serra Bela (35m, 8 andares)
  buildTwinWideCondo(-125, -85, resWarmTowerMat, glassMats[2], 32.5, 8, true);

  // 3. (+125, -85) @ +6.75m — Residencial Duplo Mirante Leste (36m, 8 andares)
  buildTwinWideCondo(125, -85, resTowerMat, glassMats[1], 34.0, 8, false);

  // =========================================================================
  // PART B — 3 PRÉDIOS DE VENDAS DE EMPRESAS COM OUTDOORS E ESTACIONAMENTOS
  // Quadras: (-125, -17 @ 0.0m), (+125, -17 @ 0.0m), (+125, -51 @ +2.25m)
  // =========================================================================

  // B1. (-125, -17) @ 0.0m — Complexo Empresarial & Vendas Oeste
  {
    const bx = -125;
    const bz = -17;
    const baseY = blockTerraceY(bz) + 0.2;
    const towerX = bx - 7.4;
    const lotX = bx + 8.4;

    addFoundationPlinth(towerX, baseY, bz, 15.8, 18.4, 1.15);
    const podiumH = 5.0;
    const podiumBase = baseY + 1.15;

    // 2-Story Sales Showroom Glass Atrium + Concrete Canopy
    const showroom = new THREE.Mesh(unitBoxGeo, matLobbyGlass);
    showroom.scale.set(14.6, podiumH, 16.8);
    showroom.position.set(towerX, podiumBase + podiumH * 0.5, bz);
    showroom.castShadow = true;
    corporateGroup.add(showroom);

    instWhiteFrames.push({ x: towerX, y: podiumBase + podiumH + 0.35, z: bz, sx: 15.6, sy: 0.7, sz: 17.8 });
    addEntranceLobby(towerX, podiumBase, bz + 8.5, 'N', 5.8, 3.8);
    addEntranceLobby(towerX + 7.4, podiumBase, bz, 'E', 4.4, 3.4);

    // Main Corporate Sales Tower (30m) + Asymmetric Wing (20m)
    const shaftBase = podiumBase + podiumH + 0.7;
    const t1H = 29.5;
    const towerMain = new THREE.Mesh(unitBoxGeo, glassMats[0]);
    towerMain.scale.set(12.2, t1H, 13.6);
    towerMain.position.set(towerX - 0.8, shaftBase + t1H * 0.5, bz - 0.6);
    towerMain.castShadow = true;
    towerMain.receiveShadow = true;
    corporateGroup.add(towerMain);

    const t2H = 20.5;
    const annex = new THREE.Mesh(unitBoxGeo, concreteTowerMat);
    annex.scale.set(6.2, t2H, 9.6);
    annex.position.set(towerX + 3.8, shaftBase + t2H * 0.5, bz + 3.0);
    annex.castShadow = true;
    corporateGroup.add(annex);

    for (let b = -2; b <= 2; b++) {
      instBriseMetal.push({
        x: towerX - 0.8 + b * 2.3,
        y: shaftBase + t1H * 0.5,
        z: bz - 0.6,
        sx: 0.2,
        sy: t1H * 0.94,
        sz: 14.1,
      });
    }

    addAcWallStack(towerX - 6.9, shaftBase + 2.5, bz - 0.6, 6, 3.9, 'W', 3, 3.4);
    addAcWallStack(towerX - 0.8, shaftBase + 2.5, bz - 7.4, 6, 3.9, 'S', 2, 3.4);
    addRooftopEngineering(towerX - 0.8, shaftBase + t1H, bz - 0.6, 12.2, 13.6, false, 8.5, false);

    // Giant Rooftop Corporate Sales Billboard (Outdoor #1) + Corner Roadside Billboard (Outdoor #2)
    addTrussBillboard(corporateGroup, towerX - 0.8, shaftBase + t1H + 0.6, bz + 4.4, 11.4, 5.2, 2.2, 0.22, 0, true);
    addTrussBillboard(corporateGroup, lotX + 4.2, baseY, bz + 8.6, 9.6, 4.6, 5.4, -0.45, 1, true);

    // Full Customer Parking Lot on East Half of Block
    addParkingLot(corporateGroup, lotX, baseY, bz, 13.0, 19.2, 'N', 3);

    [-11.5, -5.5].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.08, z: bz + 10.6, scale: 0.85 });
    });
  }

  // B2. (+125, -17) @ 0.0m — Centro de Vendas Corporativas Leste (Estacionamento + Torre + Outdoors)
  {
    const bx = 125;
    const bz = -17;
    const baseY = blockTerraceY(bz) + 0.2;
    const lotX = bx - 8.4;
    const towerX = bx + 7.4;

    // Customer Parking Lot on West Half facing Shopping & Beira-Centro
    addParkingLot(corporateGroup, lotX, baseY, bz, 13.0, 19.2, 'N', 11);

    // Tall Corner Sales Billboard facing X = +102 / Shopping corridor
    addTrussBillboard(corporateGroup, lotX - 4.0, baseY, bz + 8.6, 9.6, 4.6, 5.6, 0.42, 2, true);

    addFoundationPlinth(towerX, baseY, bz, 15.8, 18.4, 1.15);
    const podiumH = 4.8;
    const podiumBase = baseY + 1.15;

    const podium = new THREE.Mesh(unitBoxGeo, matWarmStone);
    podium.scale.set(14.8, podiumH, 16.8);
    podium.position.set(towerX, podiumBase + podiumH * 0.5, bz);
    podium.castShadow = true;
    corporateGroup.add(podium);

    addEntranceLobby(towerX, podiumBase, bz + 8.5, 'N', 5.6, 3.7);
    addEntranceLobby(towerX - 7.5, podiumBase, bz, 'W', 4.6, 3.5);

    const shaftBase = podiumBase + podiumH;
    const mainH = 33.5;
    const glassWing = new THREE.Mesh(unitBoxGeo, glassMats[1]);
    glassWing.scale.set(11.6, mainH, 14.2);
    glassWing.position.set(towerX + 0.9, shaftBase + mainH * 0.5, bz);
    glassWing.castShadow = true;
    corporateGroup.add(glassWing);

    const stoneCore = new THREE.Mesh(unitBoxGeo, concreteTowerMat);
    stoneCore.scale.set(5.4, mainH + 3.0, 8.6);
    stoneCore.position.set(towerX - 3.8, shaftBase + (mainH + 3.0) * 0.5, bz - 2.4);
    stoneCore.castShadow = true;
    corporateGroup.add(stoneCore);

    addBalconyStack(towerX + 0.9, shaftBase + 3.0, bz + 7.1, 7, 4.0, 8.4, 1.25, 'N');
    addAcWallStack(towerX + 6.7, shaftBase + 3.0, bz, 7, 4.0, 'E', 3, 3.4);
    addAcWallStack(towerX + 0.9, shaftBase + 3.0, bz - 7.1, 6, 4.0, 'S', 2, 3.2);
    addRooftopEngineering(towerX + 0.9, shaftBase + mainH, bz, 11.6, 14.2, true, 0, true);

    // Rooftop Corporate Billboard crowning the Sales Tower
    addTrussBillboard(corporateGroup, towerX + 0.6, shaftBase + mainH + 0.6, bz + 5.2, 11.0, 5.0, 2.2, -0.24, 3, true);

    [5.5, 11.5].forEach((sx) => {
      treeCollector.shrubs.push({ x: bx + sx, y: baseY + 0.08, z: bz + 10.6, scale: 0.85 });
    });
  }

  // B3. (+125, -51) @ +2.25m — Hub de Vendas & Showroom Empresarial Sul-Leste
  {
    const bx = 125;
    const bz = -51;
    const baseY = blockTerraceY(bz) + 0.2;
    const towerX = bx - 7.2;
    const lotX = bx + 8.6;

    addFoundationPlinth(towerX, baseY, bz, 16.0, 18.2, 1.2);
    const podiumH = 4.6;
    const podiumBase = baseY + 1.2;

    const glassShowroom = new THREE.Mesh(unitBoxGeo, matLobbyGlass);
    glassShowroom.scale.set(14.8, podiumH, 16.4);
    glassShowroom.position.set(towerX, podiumBase + podiumH * 0.5, bz);
    glassShowroom.castShadow = true;
    corporateGroup.add(glassShowroom);
    instWhiteFrames.push({ x: towerX, y: podiumBase + podiumH + 0.3, z: bz, sx: 15.6, sy: 0.62, sz: 17.4 });

    addEntranceLobby(towerX, podiumBase, bz + 8.3, 'N', 5.2, 3.5);
    addEntranceLobby(towerX - 7.4, podiumBase, bz, 'W', 4.4, 3.3);

    const shaftBase = podiumBase + podiumH + 0.6;
    const towerH = 26.5;
    const officeTower = new THREE.Mesh(unitBoxGeo, glassMats[2]);
    officeTower.scale.set(12.0, towerH, 13.4);
    officeTower.position.set(towerX, shaftBase + towerH * 0.5, bz);
    officeTower.castShadow = true;
    corporateGroup.add(officeTower);

    for (let c = 0; c < 4; c++) {
      const cy = shaftBase + 4.4 + c * 5.8;
      instWhiteFrames.push(
        { x: towerX, y: cy + 2.2, z: bz + 6.9, sx: 12.6, sy: 0.45, sz: 1.2 },
        { x: towerX, y: cy - 2.2, z: bz + 6.9, sx: 12.6, sy: 0.45, sz: 1.2 },
      );
      instBalconyGlass.push({ x: towerX, y: cy - 1.5, z: bz + 7.45, sx: 11.4, sy: 0.95, sz: 0.08 });
    }

    addAcWallStack(towerX - 6.0, shaftBase + 2.4, bz, 6, 3.8, 'W', 3, 3.3);
    addAcWallStack(towerX, shaftBase + 2.4, bz - 6.7, 5, 3.8, 'S', 2, 3.2);
    addRooftopEngineering(towerX, shaftBase + towerH, bz, 12.0, 13.4, false, 7.5, false);

    // Rooftop Outdoor + East Roadside Outdoor facing Outer Boulevard X = +148
    addTrussBillboard(corporateGroup, towerX, shaftBase + towerH + 0.6, bz + 4.4, 10.8, 4.8, 2.0, 0.2, 1, true);
    addTrussBillboard(corporateGroup, lotX + 3.8, baseY, bz + 8.4, 9.2, 4.4, 5.2, -0.45, 0, true);

    // Customer Parking Lot on East Half
    addParkingLot(corporateGroup, lotX, baseY, bz, 12.6, 19.0, 'N', 19);
  }

  // Commit batched instanced detail meshes into `group` (shadows on primary building towers only)
  pushInst(group, unitBoxGeo, matGraniteBase, instFoundation, false);
  pushInst(group, unitBoxGeo, matWarmStone, instBalconySlab, false);
  pushInst(group, unitBoxGeo, matBalconyGlass, instBalconyGlass, false);
  pushInst(group, unitBoxGeo, matWhiteArch, instWhiteFrames, false);
  pushInst(group, unitBoxGeo, matDarkSteel, instDarkTrim, false);
  pushInst(group, unitBoxGeo, matBrise, instBriseMetal, false);
  pushInst(group, unitBoxGeo, matLobbyGlass, instLobbyGlass, false);
  pushInst(group, unitBoxGeo, lampMat, instLobbyGlow, false);
  pushInst(group, unitBoxGeo, matAcBody, instAcBody, false);
  pushInst(group, unitCylGeo, matAcFan, instAcFan, false);
  pushInst(group, unitBoxGeo, matBrise, instChillerBody, false);
  pushInst(group, unitBoxGeo, matWaterTank, instWaterTanks, false);
  pushInst(corporateGroup, unitBoxGeo, matParkingLine, instParkingLines, false);
  pushInst(corporateGroup, unitBoxGeo, matBumperYellow, instParkingBumpers, false);

  // Batch-instantiate detailed parked cars across all 3 Corporate Sales Parking Lots
  if (parkedCarSpots.length > 0) {
    const cDummy = new THREE.Object3D();
    const cTmp = new THREE.Color();
    const pBodyMat = regMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.55 }));
    const pGlassMat = regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 }));
    const pWheelMat = regMat(new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }));

    const carBodies = new THREE.InstancedMesh(unitBoxGeo, pBodyMat, parkedCarSpots.length);
    const carCabins = new THREE.InstancedMesh(unitBoxGeo, pGlassMat, parkedCarSpots.length);
    const carWheels = new THREE.InstancedMesh(unitCylGeo, pWheelMat, parkedCarSpots.length * 4);
    carBodies.frustumCulled = false;
    carCabins.frustumCulled = false;
    carWheels.frustumCulled = false;

    parkedCarSpots.forEach((pc, idx) => {
      cDummy.position.set(pc.x, pc.y + 0.52, pc.z);
      cDummy.rotation.set(0, pc.rotY, 0);
      cDummy.scale.set(1.75, 0.65, 3.7);
      cDummy.updateMatrix();
      carBodies.setMatrixAt(idx, cDummy.matrix);
      carBodies.setColorAt(idx, cTmp.setHex(pc.color));

      cDummy.position.set(pc.x, pc.y + 1.0, pc.z - Math.cos(pc.rotY) * 0.15);
      cDummy.scale.set(1.48, 0.5, 2.0);
      cDummy.updateMatrix();
      carCabins.setMatrixAt(idx, cDummy.matrix);

      const cosR = Math.cos(pc.rotY);
      const sinR = Math.sin(pc.rotY);
      [
        [-0.84, -1.15],
        [0.84, -1.15],
        [-0.84, 1.15],
        [0.84, 1.15],
      ].forEach(([wx, wz], wIdx) => {
        cDummy.position.set(pc.x + wx * cosR + wz * sinR, pc.y + 0.28, pc.z - wx * sinR + wz * cosR);
        cDummy.rotation.set(0, pc.rotY, Math.PI / 2);
        cDummy.scale.set(0.3, 0.22, 0.3);
        cDummy.updateMatrix();
        carWheels.setMatrixAt(idx * 4 + wIdx, cDummy.matrix);
      });
    });

    carBodies.instanceMatrix.needsUpdate = true;
    if (carBodies.instanceColor) carBodies.instanceColor.needsUpdate = true;
    carCabins.instanceMatrix.needsUpdate = true;
    carWheels.instanceMatrix.needsUpdate = true;
    corporateGroup.add(carBodies, carCabins, carWheels);
  }

  return {
    group,
    beaconMats,
    skylineGlowMats,
    parkedCarSpots,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

