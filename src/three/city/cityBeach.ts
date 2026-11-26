import * as THREE from 'three';
import { CityTextureAtlas } from './cityTextures';
import { VegetationPlacement } from './cityVegetation';
import {
  IslandSpec,
  islandShoreRadiusAt,
  singleIslandTerrainY,
  WEST_ISLAND_CENTER,
  WEST_ISLANDS,
  westMainlandBeachY,
} from './cityElevation';

export interface BeachBuildResult {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

interface SurfWaveLayer {
  mesh: THREE.Mesh;
  baseX: number;
  amp: number;
  speed: number;
  phase: number;
}

export interface BeachNpcPlacements {
  seated: [number, number, number, number][];
  chatting: [number, number, number, number][];
}

export function createWestBeachAndIsland(
  atlas: CityTextureAtlas,
  lampEmissiveMat: THREE.MeshStandardMaterial,
  treeCollector: {
    palms: VegetationPlacement[];
    beachPalms: VegetationPlacement[];
    ipesYellow: VegetationPlacement[];
    ipesPink: VegetationPlacement[];
    urbanLeafy: VegetationPlacement[];
    atlanticForest: VegetationPlacement[];
    shrubs: VegetationPlacement[];
  },
): { result: BeachBuildResult; npcSpots: BeachNpcPlacements } {
  const beachGroup = new THREE.Group();
  beachGroup.name = 'Praia_Oeste_Arquipelago_do_Sol';
  beachGroup.userData.hotspot = 'beach';

  const geosToDispose: THREE.BufferGeometry[] = [];
  const matsToDispose: THREE.Material[] = [];
  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geosToDispose.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    matsToDispose.push(m);
    return m;
  };

  // Shared PBR Materials
  const matSand = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.beachSand,
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.02,
    }),
  );
  const matCalcadaPraia = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.calcadaPraia,
      roughness: 0.80,
    }),
  );
  const matPlazaMosaic = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.beachPlazaPattern,
      roughness: 0.74,
    }),
  );
  const matStone = regMat(
    new THREE.MeshStandardMaterial({
      map: atlas.sidewalk,
      roughness: 0.84,
    }),
  );
  const matGranite = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.80,
      metalness: 0.08,
    }),
  );
  const matBluePlaza = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.72,
    }),
  );
  const matTurf = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x2f7a38,
      roughness: 0.88,
    }),
  );
  const matWood = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.76,
    }),
  );
  const matTeak = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.68,
    }),
  );
  const matDarkWood = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c3317,
      roughness: 0.82,
    }),
  );
  const matThatch = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xd9a05b,
      roughness: 0.94,
    }),
  );
  const matRock = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.92,
    }),
  );
  const matSteel = regMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.75,
    }),
  );
  const matChrome = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.28,
      metalness: 0.82,
    }),
  );
  const matWhite = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.60,
    }),
  );
  const matArchWhite = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.38,
      metalness: 0.12,
    }),
  );
  const matRed = regMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }));
  const matYellow = regMat(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 }));
  const matCourtLine = regMat(new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
  const matCoco = regMat(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55 }));
  const matCopperRoof = regMat(new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.38, metalness: 0.55 }));

  // =========================================================================
  // 1. GRAND SCULPTED GOLDEN CRESCENT SAND (134m × 56m, X ∈ [-232.2, -176.2], Z ∈ [-120, +14])
  // =========================================================================
  const sandGeo = regGeo(new THREE.PlaneGeometry(56.0, 134.0, 64, 112));
  sandGeo.rotateX(-Math.PI / 2);
  sandGeo.translate(-204.2, 0, -53.0);
  const sPos = sandGeo.attributes.position;
  const sCols = new Float32Array(sPos.count * 3);
  const cDryHi = new THREE.Color(0xf6e2b3);
  const cDryLo = new THREE.Color(0xe6c786);
  const cWet = new THREE.Color(0xbc9457);
  const cShallow = new THREE.Color(0x3ab8aa);
  const cDeep = new THREE.Color(0x0d3b54);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < sPos.count; i++) {
    const vx = sPos.getX(i);
    const vz = sPos.getZ(i);
    const sy = westMainlandBeachY(vx, vz) + 0.025;
    sPos.setY(i, sy);

    if (sy >= -0.82) {
      const t = THREE.MathUtils.clamp((sy + 0.82) / 0.12, 0, 1);
      tmpCol.lerpColors(cDryLo, cDryHi, t);
    } else if (sy >= -1.25) {
      const t = THREE.MathUtils.clamp((sy + 1.25) / 0.43, 0, 1);
      tmpCol.lerpColors(cWet, cDryLo, t);
    } else if (sy >= -1.85) {
      const t = THREE.MathUtils.clamp((sy + 1.85) / 0.60, 0, 1);
      tmpCol.lerpColors(cShallow, cWet, t);
    } else {
      const t = THREE.MathUtils.clamp((sy + 2.65) / 0.80, 0, 1);
      tmpCol.lerpColors(cDeep, cShallow, t);
    }
    sCols[i * 3] = tmpCol.r;
    sCols[i * 3 + 1] = tmpCol.g;
    sCols[i * 3 + 2] = tmpCol.b;
  }
  sandGeo.setAttribute('color', new THREE.BufferAttribute(sCols, 3));
  sandGeo.computeVertexNormals();
  const sandMesh = new THREE.Mesh(sandGeo, matSand);
  sandMesh.receiveShadow = true;
  beachGroup.add(sandMesh);

  // =========================================================================
  // 2. EXPANSIVE TURQUOISE ARCHIPELAGO BAY GLOW & 3 ANIMATED SURF WAVE RIBBONS
  // =========================================================================
  const lagoonShallowsGeo = regGeo(new THREE.PlaneGeometry(165, 200, 44, 52));
  lagoonShallowsGeo.rotateX(-Math.PI / 2);
  lagoonShallowsGeo.translate(-262, -1.265, -42);
  const lgPos = lagoonShallowsGeo.attributes.position;
  const lgCols = new Float32Array(lgPos.count * 3);
  const colLagoonNear = new THREE.Color(0x2dd4bf);
  const colLagoonMid = new THREE.Color(0x06b6d4);
  const colLagoonDeep = new THREE.Color(0x0c4a6e);

  for (let i = 0; i < lgPos.count; i++) {
    const lx = lgPos.getX(i);
    const lz = lgPos.getZ(i);
    const dMainland = Math.max(0, -206 - lx);
    let minIslandProx = 1.0;
    for (let k = 0; k < WEST_ISLANDS.length; k++) {
      const isl = WEST_ISLANDS[k];
      const d = Math.hypot(lx - isl.x, lz - isl.z) - isl.baseRadius * 0.92;
      minIslandProx = Math.min(minIslandProx, Math.max(0, d) / 22.0);
    }
    const nearShore = Math.min(dMainland / 28.0, minIslandProx);
    const mix = THREE.MathUtils.clamp(nearShore, 0, 1);
    if (mix < 0.48) tmpCol.lerpColors(colLagoonNear, colLagoonMid, mix / 0.48);
    else tmpCol.lerpColors(colLagoonMid, colLagoonDeep, (mix - 0.48) / 0.52);
    lgCols[i * 3] = tmpCol.r;
    lgCols[i * 3 + 1] = tmpCol.g;
    lgCols[i * 3 + 2] = tmpCol.b;
  }
  lagoonShallowsGeo.setAttribute('color', new THREE.BufferAttribute(lgCols, 3));
  const lagoonGlowMat = regMat(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    }),
  );
  const lagoonGlow = new THREE.Mesh(lagoonShallowsGeo, lagoonGlowMat);
  beachGroup.add(lagoonGlow);

  // Exact waterline X(z) for Y = -1.25m across the full 124m coastline
  const waterlineXAt = (fz: number): number => {
    let lo = -228.0;
    let hi = -176.2;
    for (let step = 0; step < 11; step++) {
      const mid = (lo + hi) * 0.5;
      if (westMainlandBeachY(mid, fz) > -1.25) hi = mid;
      else lo = mid;
    }
    return (lo + hi) * 0.5;
  };

  const surfLayers: SurfWaveLayer[] = [];
  const foamSegsZ = 84;
  const layerSpecs = [
    { offsetX: 0.15, width: 1.85, y: -1.21, opacity: 0.85, amp: 0.72, speed: 1.35, phase: 0.0 },
    { offsetX: -3.1, width: 1.50, y: -1.22, opacity: 0.60, amp: 0.54, speed: 1.35, phase: 1.6 },
    { offsetX: -6.8, width: 1.25, y: -1.225, opacity: 0.42, amp: 0.42, speed: 1.35, phase: 3.1 },
  ];

  layerSpecs.forEach((spec) => {
    const fGeo = regGeo(new THREE.BufferGeometry());
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= foamSegsZ; i++) {
      const vFrac = i / foamSegsZ;
      const fz = THREE.MathUtils.lerp(-113.5, 8.8, vFrac);
      const xW = waterlineXAt(fz) + spec.offsetX;
      verts.push(xW - spec.width * 0.5, spec.y, fz);
      verts.push(xW + spec.width * 0.5, spec.y, fz);
      uvs.push(0, vFrac * 2, 1, vFrac * 2);
      if (i < foamSegsZ) {
        const b = i * 2;
        indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    fGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    fGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    fGeo.setIndex(indices);

    const fMat = regMat(
      new THREE.MeshBasicMaterial({
        map: atlas.surfFoam,
        transparent: true,
        opacity: spec.opacity,
        depthWrite: false,
      }),
    );
    const fMesh = new THREE.Mesh(fGeo, fMat);
    beachGroup.add(fMesh);
    surfLayers.push({
      mesh: fMesh,
      baseX: 0,
      amp: spec.amp,
      speed: spec.speed,
      phase: spec.phase,
    });
  });

  // =========================================================================
  // 3. GRAND 120m UPPER CALÇADÃO (+0.30m), SEA-WALL & BLUE GEOMETRIC ISLANDS
  // =========================================================================
  // 9.0m wide Copacabana Portuguese-stone upper boardwalk (X ∈ [-176.2, -167.2], Z ∈ [-112.0, +7.6])
  const upperCalcadao = new THREE.Mesh(regGeo(new THREE.BoxGeometry(9.0, 0.40, 119.6)), matCalcadaPraia);
  upperCalcadao.position.set(-171.7, 0.10, -52.2);
  upperCalcadao.receiveShadow = true;
  beachGroup.add(upperCalcadao);

  const seaWall = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.65, 1.38, 119.6)), matGranite);
  seaWall.position.set(-176.25, -0.37, -52.2);
  seaWall.receiveShadow = true;
  beachGroup.add(seaWall);

  // Blue geometric landscaped plaza islands (Ponta Negra Manaus inspiration)
  const buildBlueGeoIsland = (cx: number, cz: number, w: number, d: number, rotY = 0) => {
    const ig = new THREE.Group();
    ig.position.set(cx, 0.24, cz);
    ig.rotation.y = rotY;
    const blueDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w, 0.14, d)), matBluePlaza);
    blueDeck.receiveShadow = true;
    ig.add(blueDeck);
    const rim = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w + 0.35, 0.12, d + 0.35)), matCalcadaPraia);
    rim.position.y = -0.02;
    ig.add(rim);
    const lawn = new THREE.Mesh(regGeo(new THREE.BoxGeometry(w * 0.56, 0.18, d * 0.56)), matTurf);
    lawn.position.y = 0.04;
    ig.add(lawn);
    beachGroup.add(ig);
    treeCollector.shrubs.push({ x: cx, y: 0.36, z: cz, scale: 1.05 });
  };
  buildBlueGeoIsland(-169.4, 6.2, 3.6, 2.4, 0.15);
  buildBlueGeoIsland(-169.4, -55.2, 3.8, 4.0, -0.14);
  buildBlueGeoIsland(-169.4, -75.8, 3.6, 3.6, 0.12);
  buildBlueGeoIsland(-169.4, -106.5, 4.2, 5.2, -0.18);

  // =========================================================================
  // 4. TWO OCEANFRONT SEMICIRCULAR PLAZAS ("PRAÇA PONTA NEGRA" + "MIRANTE SUL")
  // =========================================================================
  // 4A. Iconic North-Center Semicircle Plaza + Wave Monument Arch (Z = -24.5)
  const amphiCenterZ = -24.5;
  const amphiCenterX = -176.0;
  const amphiGroup = new THREE.Group();
  amphiGroup.position.set(amphiCenterX, 0, amphiCenterZ);

  const upperSemi = new THREE.Mesh(
    regGeo(new THREE.CylinderGeometry(8.8, 9.0, 1.12, 36, 1, false, Math.PI, Math.PI)),
    matPlazaMosaic,
  );
  upperSemi.position.y = -0.25;
  upperSemi.receiveShadow = true;
  amphiGroup.add(upperSemi);

  const stepRadii = [9.5, 10.2, 10.9, 11.6];
  const stepTops = [0.06, -0.18, -0.42, -0.66];
  stepRadii.forEach((r, idx) => {
    const h = stepTops[idx] + 0.95;
    const stepMesh = new THREE.Mesh(
      regGeo(new THREE.CylinderGeometry(r, r + 0.15, h, 36, 1, false, Math.PI, Math.PI)),
      idx % 2 === 0 ? matGranite : matStone,
    );
    stepMesh.position.y = stepTops[idx] - h * 0.5;
    stepMesh.receiveShadow = true;
    amphiGroup.add(stepMesh);
  });

  // Sculptural Curved White Wave Arch Monument
  const waveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.0, 0.30, -6.9),
    new THREE.Vector3(-7.3, 3.60, -4.2),
    new THREE.Vector3(-8.3, 5.85, 0.0),
    new THREE.Vector3(-7.3, 3.60, 4.2),
    new THREE.Vector3(-4.0, 0.30, 6.9),
  ]);
  const waveArch = new THREE.Mesh(regGeo(new THREE.TubeGeometry(waveCurve, 36, 0.42, 10, false)), matArchWhite);
  waveArch.castShadow = true;
  amphiGroup.add(waveArch);

  const innerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.4, 0.30, -6.0),
    new THREE.Vector3(-6.9, 2.85, -3.5),
    new THREE.Vector3(-7.7, 4.65, 0.0),
    new THREE.Vector3(-6.9, 2.85, 3.5),
    new THREE.Vector3(-4.4, 0.30, 6.0),
  ]);
  amphiGroup.add(new THREE.Mesh(regGeo(new THREE.TubeGeometry(innerCurve, 30, 0.17, 8, false)), matChrome));

  [-6.2, -3.5, 3.5, 6.2].forEach((az) => {
    const rad = Math.sqrt(Math.max(4, 70 - az * az));
    const bx = -rad;
    const bollard = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.92, 10)), matSteel);
    bollard.position.set(bx, 0.76, az);
    amphiGroup.add(bollard);
    const glow = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 10)), lampEmissiveMat);
    glow.position.set(bx, 1.24, az);
    amphiGroup.add(glow);
  });
  beachGroup.add(amphiGroup);

  // 4B. South Panoramic Pergola Deck Plaza (Z = -79.5) with 3 curved steps & timber shade pergola
  const southPlaza = new THREE.Group();
  southPlaza.position.set(-176.0, 0, -79.5);
  const spDeck = new THREE.Mesh(
    regGeo(new THREE.CylinderGeometry(7.2, 7.4, 1.12, 32, 1, false, Math.PI, Math.PI)),
    matPlazaMosaic,
  );
  spDeck.position.y = -0.25;
  spDeck.receiveShadow = true;
  southPlaza.add(spDeck);

  [7.9, 8.6, 9.3].forEach((r, idx) => {
    const topY = -0.02 - idx * 0.22;
    const h = topY + 0.95;
    const sm = new THREE.Mesh(
      regGeo(new THREE.CylinderGeometry(r, r + 0.14, h, 32, 1, false, Math.PI, Math.PI)),
      idx % 2 === 0 ? matGranite : matStone,
    );
    sm.position.y = topY - h * 0.5;
    sm.receiveShadow = true;
    southPlaza.add(sm);
  });

  // Curved timber shade pergola posts + overhead ring beam
  for (let p = 0; p < 5; p++) {
    const a = Math.PI + 0.28 + (p / 4) * (Math.PI - 0.56);
    const px = Math.sin(a) * 5.8;
    const pz = Math.cos(a) * 5.8;
    const col = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 8)), matDarkWood);
    col.position.set(px, 1.9, pz);
    southPlaza.add(col);
    const beam = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.6, 0.16, 0.18)), matTeak);
    beam.position.set(px * 0.85, 3.5, pz * 0.85);
    beam.rotation.y = a - Math.PI / 2;
    southPlaza.add(beam);
  }
  beachGroup.add(southPlaza);

  // =========================================================================
  // 5. FIVE GRAND WIDE STAIRCASES DESCENDING FROM CALÇADÃO TO THE SAND
  // =========================================================================
  const buildBeachStaircase = (cz: number, width: number) => {
    const sg = new THREE.Group();
    sg.position.set(-176.2, 0, cz);
    const steps = 5;
    const topApron = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.1, 0.38, width)), matPlazaMosaic);
    topApron.position.set(0.45, 0.12, 0);
    topApron.receiveShadow = true;
    sg.add(topApron);

    for (let s = 0; s < steps; s++) {
      const sx = -0.35 - s * 0.56;
      const topY = 0.12 - s * 0.21;
      const h = topY + 0.98;
      const step = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.64, h, width)), s % 2 === 0 ? matGranite : matStone);
      step.position.set(sx, topY - h * 0.5, 0);
      step.receiveShadow = true;
      step.castShadow = true;
      sg.add(step);
    }

    [-width * 0.5 - 0.18, 0, width * 0.5 + 0.18].forEach((rz, idx) => {
      if (idx !== 1) {
        const cheek = new THREE.Mesh(regGeo(new THREE.BoxGeometry(3.2, 1.35, 0.34)), matGranite);
        cheek.position.set(-1.35, -0.32, rz);
        sg.add(cheek);
      }
      const railBar = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.04, 0.04, 3.25, 8)), matChrome);
      railBar.rotation.z = Math.PI / 2 + 0.35;
      railBar.position.set(-1.35, 0.62, rz);
      sg.add(railBar);
      [-0.1, -2.5].forEach((px, pIdx) => {
        const post = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.92, 8)), matChrome);
        post.position.set(px, (pIdx === 0 ? 0.30 : -0.58) + 0.45, rz);
        sg.add(post);
      });
    });

    beachGroup.add(sg);
  };

  buildBeachStaircase(2.5, 6.8);
  buildBeachStaircase(-40.5, 6.0);
  buildBeachStaircase(-54.0, 6.4);
  buildBeachStaircase(-66.5, 6.0);
  buildBeachStaircase(-96.5, 6.8);

  // =========================================================================
  // 6. FULL 118m SERPENTINE WINDING BEACH BOARDWALK ("O CAMINHO DIFERENTE")
  // =========================================================================
  const pathPts = [
    new THREE.Vector3(-179.6, 0, 5.5),
    new THREE.Vector3(-182.2, 0, 1.2),
    new THREE.Vector3(-185.0, 0, -4.5),
    new THREE.Vector3(-188.0, 0, -10.5),
    new THREE.Vector3(-190.2, 0, -18.0),
    new THREE.Vector3(-191.0, 0, -24.5),
    new THREE.Vector3(-189.6, 0, -32.0),
    new THREE.Vector3(-184.5, 0, -40.5),
    new THREE.Vector3(-183.0, 0, -49.0),
    new THREE.Vector3(-186.8, 0, -58.0),
    new THREE.Vector3(-191.2, 0, -68.0),
    new THREE.Vector3(-189.6, 0, -79.5),
    new THREE.Vector3(-185.2, 0, -90.0),
    new THREE.Vector3(-183.4, 0, -99.5),
    new THREE.Vector3(-186.2, 0, -108.5),
  ];
  const pathCurve = new THREE.CatmullRomCurve3(pathPts);
  const pathSamples = pathCurve.getPoints(92);
  const pathSlabGeo = regGeo(new THREE.BoxGeometry(2.8, 0.14, 1.52));
  const pathBorderGeo = regGeo(new THREE.BoxGeometry(3.15, 0.10, 1.56));

  for (let i = 0; i < pathSamples.length - 1; i++) {
    const a = pathSamples[i];
    const b = pathSamples[i + 1];
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.z + b.z) * 0.5;
    const my = westMainlandBeachY(mx, mz) + 0.05;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);

    const border = new THREE.Mesh(pathBorderGeo, matDarkWood);
    border.position.set(mx, my - 0.01, mz);
    border.rotation.y = yaw;
    border.receiveShadow = true;
    beachGroup.add(border);

    const slab = new THREE.Mesh(pathSlabGeo, i % 2 === 0 ? matCalcadaPraia : matStone);
    slab.position.set(mx, my + 0.01, mz);
    slab.rotation.y = yaw;
    slab.receiveShadow = true;
    beachGroup.add(slab);

    if (i % 6 === 3) {
      const lampPost = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.78, 8)), matDarkWood);
      lampPost.position.set(mx - Math.cos(yaw) * 1.48, my + 0.38, mz + Math.sin(yaw) * 1.48);
      beachGroup.add(lampPost);
      const lampTip = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.11, 8, 8)), lampEmissiveMat);
      lampTip.position.set(lampPost.position.x, my + 0.80, lampPost.position.z);
      beachGroup.add(lampTip);
    }
  }

  // =========================================================================
  // 7. VÁRIAS LOJAS NA PRAIA (10 CALÇADÃO SHOPS/KIOSKS + SAND KAYAK HUB)
  // =========================================================================
  const buildBeachfrontShop = (cfg: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
    wallH: number;
    signIdx: number;
    wallColor: number;
    awningIdx: number;
    isOpenKiosk?: boolean;
    hasSurfRack?: boolean;
    hasKayakRack?: boolean;
    accentColor: number;
    rotY?: number;
  }) => {
    const sg = new THREE.Group();
    sg.position.set(cfg.x, cfg.y, cfg.z);
    sg.rotation.y = cfg.rotY ?? -Math.PI / 2;

    const deck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(cfg.width + 0.8, 0.12, cfg.depth + 1.2)), matWood);
    deck.position.y = 0.06;
    deck.receiveShadow = true;
    sg.add(deck);

    const wallMat = regMat(new THREE.MeshStandardMaterial({ color: cfg.wallColor, roughness: 0.72 }));
    const body = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(cfg.width * (cfg.isOpenKiosk ? 0.68 : 0.94), cfg.wallH, cfg.depth * (cfg.isOpenKiosk ? 0.62 : 0.82))),
      wallMat,
    );
    body.position.set(0, 0.12 + cfg.wallH * 0.5, cfg.isOpenKiosk ? -0.38 : -0.18);
    body.castShadow = true;
    body.receiveShadow = true;
    sg.add(body);

    const postGeo = regGeo(new THREE.CylinderGeometry(0.075, 0.09, cfg.wallH + 0.45, 8));
    [-cfg.width * 0.44, cfg.width * 0.44].forEach((px) => {
      [-cfg.depth * 0.42, cfg.depth * 0.46].forEach((pz) => {
        const post = new THREE.Mesh(postGeo, matDarkWood);
        post.position.set(px, 0.12 + (cfg.wallH + 0.45) * 0.5, pz);
        sg.add(post);
      });
    });

    const canopy = new THREE.Mesh(
      regGeo(new THREE.BoxGeometry(cfg.width + 0.9, 0.18, cfg.depth + 1.3)),
      cfg.isOpenKiosk ? matTeak : matSteel,
    );
    canopy.position.set(0, 0.12 + cfg.wallH + 0.35, 0.05);
    canopy.castShadow = true;
    sg.add(canopy);

    for (let b = -cfg.width * 0.42; b <= cfg.width * 0.42; b += 0.9) {
      const beam = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.12, 0.14, cfg.depth + 1.4)), matWood);
      beam.position.set(b, 0.12 + cfg.wallH + 0.50, 0.05);
      sg.add(beam);
    }

    if (cfg.isOpenKiosk) {
      const counter = new THREE.Mesh(regGeo(new THREE.BoxGeometry(cfg.width * 0.82, 0.98, 0.55)), matTeak);
      counter.position.set(0, 0.61, cfg.depth * 0.34);
      sg.add(counter);
      [-cfg.width * 0.28, 0, cfg.width * 0.28].forEach((sx) => {
        const stool = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.22, 0.16, 0.66, 10)), matWhite);
        stool.position.set(sx, 0.42, cfg.depth * 0.54);
        sg.add(stool);
      });
    } else {
      const vitrineMat = regMat(
        new THREE.MeshStandardMaterial({
          map: atlas.shopVitrine[cfg.signIdx % atlas.shopVitrine.length],
          emissive: 0xffe4b5,
          emissiveMap: atlas.shopVitrine[cfg.signIdx % atlas.shopVitrine.length],
          emissiveIntensity: 0.52,
          roughness: 0.18,
        }),
      );
      const vitrine = new THREE.Mesh(regGeo(new THREE.BoxGeometry(cfg.width * 0.80, 2.25, 0.14)), vitrineMat);
      vitrine.position.set(0, 1.28, cfg.depth * 0.24);
      sg.add(vitrine);

      const awningMat = regMat(
        new THREE.MeshStandardMaterial({
          map: atlas.awningStripes[cfg.awningIdx % atlas.awningStripes.length],
          roughness: 0.72,
        }),
      );
      const awning = new THREE.Mesh(regGeo(new THREE.BoxGeometry(cfg.width * 0.88, 0.10, 1.55)), awningMat);
      awning.position.set(0, 2.55, cfg.depth * 0.42);
      awning.rotation.x = 0.26;
      sg.add(awning);
    }

    const signMat = regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.shopSigns[cfg.signIdx],
        emissive: 0xffffff,
        emissiveMap: atlas.shopSigns[cfg.signIdx],
        emissiveIntensity: 0.65,
        roughness: 0.25,
      }),
    );
    const signF = new THREE.Mesh(regGeo(new THREE.BoxGeometry(cfg.width * 0.86, 0.85, 0.14)), signMat);
    signF.position.set(0, cfg.wallH + 0.98, cfg.depth * 0.44);
    sg.add(signF);

    if (cfg.hasSurfRack) {
      const surfCols = [cfg.accentColor, 0xfacc15, 0x06b6d4, 0xf43f5e];
      surfCols.forEach((sc, idx) => {
        const board = new THREE.Mesh(
          regGeo(new THREE.CapsuleGeometry(0.19, 1.42, 4, 8)),
          regMat(new THREE.MeshStandardMaterial({ color: sc, roughness: 0.30 })),
        );
        board.scale.set(1.15, 1.0, 0.24);
        board.position.set(cfg.width * 0.5 + 0.38, 0.95, -0.5 + idx * 0.42);
        board.rotation.z = -0.15;
        sg.add(board);
      });
    }

    if (cfg.hasKayakRack) {
      const kayakCols = [0xf97316, 0x0ea5e9, 0x22c55e];
      kayakCols.forEach((kc, idx) => {
        const kayak = new THREE.Mesh(
          regGeo(new THREE.CapsuleGeometry(0.28, 2.15, 5, 10)),
          regMat(new THREE.MeshStandardMaterial({ color: kc, roughness: 0.35 })),
        );
        kayak.scale.set(1.25, 1.0, 0.55);
        kayak.rotation.z = Math.PI / 2;
        kayak.position.set(0, 0.42 + idx * 0.56, cfg.depth * 0.5 + 0.55);
        sg.add(kayak);
      });
    }

    beachGroup.add(sg);
  };

  // 10 beachfront shops & kiosks lining the 120m Upper Calçadão (X = -169.3, Y = +0.30m)
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: 2.2, width: 5.4, depth: 3.1, wallH: 2.45,
    signIdx: 22, wallColor: 0xfef3c7, awningIdx: 1, isOpenKiosk: true, hasSurfRack: true, accentColor: 0x10b981,
  }); // Quiosque Água de Coco
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -6.2, width: 7.4, depth: 3.6, wallH: 3.05,
    signIdx: 25, wallColor: 0x1e293b, awningIdx: 2, isOpenKiosk: false, accentColor: 0x38bdf8,
  }); // Restaurante Maré Alta
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -15.2, width: 5.8, depth: 3.3, wallH: 2.85,
    signIdx: 26, wallColor: 0xfdf4ff, awningIdx: 0, isOpenKiosk: false, accentColor: 0xf472b6,
  }); // Sorveteria & Açaí Praia
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -32.8, width: 6.2, depth: 3.4, wallH: 2.95,
    signIdx: 27, wallColor: 0xecfeff, awningIdx: 2, isOpenKiosk: false, hasSurfRack: true, accentColor: 0x06b6d4,
  }); // Surf & Moda Praia
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -40.5, width: 5.4, depth: 3.1, wallH: 2.45,
    signIdx: 23, wallColor: 0xfef3c7, awningIdx: 3, isOpenKiosk: true, hasSurfRack: true, accentColor: 0xf97316,
  }); // Quiosque Brisa do Mar
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -49.5, width: 6.6, depth: 3.5, wallH: 2.95,
    signIdx: 28, wallColor: 0x451a03, awningIdx: 3, isOpenKiosk: false, accentColor: 0xf59e0b,
  }); // Bar do Leme & Petiscos
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -61.5, width: 6.8, depth: 3.5, wallH: 2.95,
    signIdx: 30, wallColor: 0xeff6ff, awningIdx: 2, isOpenKiosk: false, accentColor: 0x38bdf8,
  }); // Peixaria Mar Azul
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -70.5, width: 6.2, depth: 3.4, wallH: 2.95,
    signIdx: 31, wallColor: 0x1e1b4b, awningIdx: 0, isOpenKiosk: false, accentColor: 0xfacc15,
  }); // Clube da Praia
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -88.5, width: 6.4, depth: 3.4, wallH: 2.90,
    signIdx: 32, wallColor: 0xecfdf5, awningIdx: 1, isOpenKiosk: false, hasSurfRack: true, accentColor: 0x14b8a6,
  }); // Mergulho & Passeios
  buildBeachfrontShop({
    x: -169.3, y: 0.30, z: -99.5, width: 5.4, depth: 3.1, wallH: 2.45,
    signIdx: 22, wallColor: 0xfef3c7, awningIdx: 1, isOpenKiosk: true, hasSurfRack: true, accentColor: 0x10b981,
  }); // Quiosque Sol Nascente

  // 11th beachfront unit down by the sand/lagoon: Aluguel de Caiaques & Stand-Up
  const kayakY = westMainlandBeachY(-180.4, -4.2);
  buildBeachfrontShop({
    x: -180.4, y: kayakY, z: -4.2, width: 4.6, depth: 2.8, wallH: 2.35,
    signIdx: 29, wallColor: 0xe0f2fe, awningIdx: 2, isOpenKiosk: true, hasKayakRack: true, accentColor: 0x0ea5e9,
  });

  // =========================================================================
  // 8. CADEIRAS PARA AS PESSOAS (24 BEACH SETS, 10 BISTRO SETS, 9 BENCHES)
  // =========================================================================
  const npcSeated: [number, number, number, number][] = [
    [-170.9, 0.42, 2.2, -Math.PI / 2],
    [-170.9, 0.42, -40.5, -Math.PI / 2],
    [-170.9, 0.42, -99.5, -Math.PI / 2],
  ];
  const npcChat: [number, number, number, number][] = [];

  const umbrellaColors = [0xef4444, 0x0ea5e9, 0xf59e0b, 0x10b981, 0xf97316, 0x3b82f6, 0xec4899];
  const umbrellaMats = umbrellaColors.map((c) =>
    regMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, side: THREE.DoubleSide })),
  );
  const towelColors = [0x38bdf8, 0xf43f5e, 0xfacc15, 0x34d399, 0xfb923c, 0xa855f7];
  const towelMats = towelColors.map((c) => regMat(new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })));

  const umbPoleGeo = regGeo(new THREE.CylinderGeometry(0.045, 0.05, 2.35, 8));
  const umbDomeGeo = regGeo(new THREE.ConeGeometry(1.48, 0.62, 10));
  const umbTrimGeo = regGeo(new THREE.CylinderGeometry(1.48, 1.50, 0.14, 10, 1, true));
  const railGeo = regGeo(new THREE.BoxGeometry(0.06, 0.07, 1.72));
  const legGeo = regGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.30, 6));
  const seatSlatGeo = regGeo(new THREE.BoxGeometry(0.68, 0.06, 1.24));
  const backSlatGeo = regGeo(new THREE.BoxGeometry(0.68, 0.62, 0.06));
  const pillowGeo = regGeo(new THREE.BoxGeometry(0.42, 0.11, 0.24));
  const towelGeo = regGeo(new THREE.BoxGeometry(0.56, 0.03, 0.96));
  const sideTblTopGeo = regGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 10));
  const sideTblLegGeo = regGeo(new THREE.CylinderGeometry(0.035, 0.045, 0.44, 8));
  const cocoCupGeo = regGeo(new THREE.SphereGeometry(0.09, 8, 8));

  const buildBeachLoungerSet = (
    ux: number,
    uz: number,
    idx: number,
    addNpc: boolean,
    customY?: number,
    targetGroup: THREE.Group = beachGroup,
  ) => {
    const sy = customY ?? westMainlandBeachY(ux, uz);
    const set = new THREE.Group();
    set.position.set(ux, sy, uz);
    set.rotation.y = -Math.PI / 2;

    const uMat = umbrellaMats[idx % umbrellaMats.length];
    const tMat = towelMats[idx % towelMats.length];

    const pole = new THREE.Mesh(umbPoleGeo, matWood);
    pole.position.y = 1.15;
    pole.castShadow = true;
    set.add(pole);

    const dome = new THREE.Mesh(umbDomeGeo, uMat);
    dome.position.y = 2.26;
    dome.castShadow = true;
    set.add(dome);

    const trim = new THREE.Mesh(umbTrimGeo, matWhite);
    trim.position.y = 1.92;
    set.add(trim);

    const tblTop = new THREE.Mesh(sideTblTopGeo, matTeak);
    tblTop.position.set(0, 0.44, 0.36);
    set.add(tblTop);
    const tblLeg = new THREE.Mesh(sideTblLegGeo, matDarkWood);
    tblLeg.position.set(0, 0.22, 0.36);
    set.add(tblLeg);
    const coco = new THREE.Mesh(cocoCupGeo, matCoco);
    coco.position.set(0.06, 0.53, 0.36);
    set.add(coco);

    [-0.78, 0.78].forEach((lx, sideIdx) => {
      const lg = new THREE.Group();
      lg.position.set(lx, 0, 0.10);

      [-0.29, 0.29].forEach((fx) => {
        [-0.64, 0.64].forEach((fz) => {
          const leg = new THREE.Mesh(legGeo, matTeak);
          leg.position.set(fx, 0.15, fz);
          lg.add(leg);
        });
      });

      [-0.32, 0.32].forEach((fx) => {
        const rail = new THREE.Mesh(railGeo, matTeak);
        rail.position.set(fx, 0.28, 0);
        lg.add(rail);
      });

      const seat = new THREE.Mesh(seatSlatGeo, matWhite);
      seat.position.set(0, 0.30, 0.22);
      seat.castShadow = true;
      lg.add(seat);

      const towel = new THREE.Mesh(towelGeo, tMat);
      towel.position.set(0, 0.34, 0.28);
      lg.add(towel);

      const back = new THREE.Mesh(backSlatGeo, matWhite);
      back.position.set(0, 0.54, -0.58);
      back.rotation.x = 0.52;
      back.castShadow = true;
      lg.add(back);

      const pillow = new THREE.Mesh(pillowGeo, tMat);
      pillow.position.set(0, 0.72, -0.68);
      pillow.rotation.x = 0.52;
      lg.add(pillow);

      set.add(lg);

      if (addNpc && sideIdx === 0) {
        npcSeated.push([ux - 0.10, sy + 0.16, uz + lx, -Math.PI / 2]);
      }
    });

    targetGroup.add(set);
  };

  const chairSeatGeo = regGeo(new THREE.BoxGeometry(0.56, 0.06, 0.54));
  const chairBackGeo = regGeo(new THREE.BoxGeometry(0.56, 0.58, 0.06));
  const chairArmGeo = regGeo(new THREE.BoxGeometry(0.06, 0.04, 0.52));
  const chairLegGeo = regGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.44, 6));

  const buildFoldingChairGroup = (ux: number, uz: number, idx: number, addNpc: boolean) => {
    const sy = westMainlandBeachY(ux, uz);
    const grp = new THREE.Group();
    grp.position.set(ux, sy, uz);
    grp.rotation.y = -Math.PI / 2;

    const uMat = umbrellaMats[(idx + 2) % umbrellaMats.length];
    const cMat = towelMats[(idx + 1) % towelMats.length];

    const pole = new THREE.Mesh(umbPoleGeo, matWood);
    pole.position.y = 1.12;
    grp.add(pole);
    const dome = new THREE.Mesh(umbDomeGeo, uMat);
    dome.position.y = 2.22;
    dome.castShadow = true;
    grp.add(dome);

    [-0.68, 0.68].forEach((cx, sIdx) => {
      const ch = new THREE.Group();
      ch.position.set(cx, 0, 0.20);
      ch.rotation.y = sIdx === 0 ? 0.14 : -0.14;

      [-0.25, 0.25].forEach((fx) => {
        [-0.20, 0.20].forEach((fz) => {
          const leg = new THREE.Mesh(chairLegGeo, matChrome);
          leg.position.set(fx, 0.20, fz);
          ch.add(leg);
        });
        const arm = new THREE.Mesh(chairArmGeo, matWhite);
        arm.position.set(fx, 0.52, -0.02);
        ch.add(arm);
      });

      const seat = new THREE.Mesh(chairSeatGeo, cMat);
      seat.position.set(0, 0.34, 0.02);
      seat.rotation.x = -0.12;
      ch.add(seat);

      const back = new THREE.Mesh(chairBackGeo, cMat);
      back.position.set(0, 0.62, -0.26);
      back.rotation.x = 0.28;
      ch.add(back);

      grp.add(ch);

      if (addNpc && sIdx === 1) {
        npcSeated.push([ux - 0.15, sy + 0.18, uz + cx, -Math.PI / 2]);
      }
    });

    beachGroup.add(grp);
  };

  // Row 1 (Upper Dry Sand): 12 Sun Lounger Pairs spanning full 112m crescent
  const loungerSpots: [number, number, boolean][] = [
    [-186.2, 2.5, true],
    [-187.5, -1.8, false],
    [-192.5, -15.5, true],
    [-192.5, -29.5, false],
    [-189.0, -40.5, true],
    [-188.0, -47.0, false],
    [-191.5, -55.5, true],
    [-193.5, -63.0, false],
    [-192.5, -75.0, true],
    [-190.0, -88.0, false],
    [-188.5, -96.5, true],
    [-189.5, -104.5, false],
  ];
  loungerSpots.forEach(([ux, uz, hasNpc], idx) => buildBeachLoungerSet(ux, uz, idx, hasNpc));

  // Row 2 (Closer to Turquoise Surf): 12 Colorful Folding Beach Chair Pairs & Umbrellas
  const chairSpots: [number, number, boolean][] = [
    [-194.5, -2.5, true],
    [-198.5, -12.5, false],
    [-199.5, -19.5, true],
    [-199.2, -26.5, false],
    [-198.0, -35.5, true],
    [-196.2, -45.5, false],
    [-197.5, -55.0, true],
    [-199.0, -68.0, false],
    [-198.5, -79.5, true],
    [-197.0, -91.5, false],
    [-195.2, -99.5, true],
    [-193.8, -107.0, false],
  ];
  chairSpots.forEach(([ux, uz, hasNpc], idx) => buildFoldingChairGroup(ux, uz, idx, hasNpc));

  // 10 Promenade Bistro Table + 4 Chairs + Parasol Sets on Upper Calçadão
  const bistroTopGeo = regGeo(new THREE.CylinderGeometry(0.58, 0.58, 0.06, 12));
  const bistroStemGeo = regGeo(new THREE.CylinderGeometry(0.05, 0.14, 0.74, 8));
  const bistroChairSeatGeo = regGeo(new THREE.BoxGeometry(0.42, 0.05, 0.42));
  const bistroChairBackGeo = regGeo(new THREE.BoxGeometry(0.42, 0.44, 0.05));
  const bistroChairLegGeo = regGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6));

  const buildPromenadeTableSet = (tx: number, tz: number, colorIdx: number, addNpc: boolean) => {
    const tg = new THREE.Group();
    tg.position.set(tx, 0.30, tz);

    const top = new THREE.Mesh(bistroTopGeo, matWhite);
    top.position.y = 0.76;
    top.castShadow = true;
    tg.add(top);

    const stem = new THREE.Mesh(bistroStemGeo, matSteel);
    stem.position.y = 0.37;
    tg.add(stem);

    const pPole = new THREE.Mesh(umbPoleGeo, matWood);
    pPole.position.y = 1.25;
    tg.add(pPole);

    const pDome = new THREE.Mesh(umbDomeGeo, umbrellaMats[colorIdx % umbrellaMats.length]);
    pDome.scale.set(0.85, 0.85, 0.85);
    pDome.position.y = 2.38;
    pDome.castShadow = true;
    tg.add(pDome);

    for (let c = 0; c < 4; c++) {
      const a = (c * Math.PI) / 2 + Math.PI / 4;
      const cg = new THREE.Group();
      cg.position.set(Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86);
      cg.rotation.y = -a + Math.PI / 2;

      [-0.17, 0.17].forEach((fx) => {
        [-0.17, 0.17].forEach((fz) => {
          const l = new THREE.Mesh(bistroChairLegGeo, matSteel);
          l.position.set(fx, 0.22, fz);
          cg.add(l);
        });
      });
      const cs = new THREE.Mesh(bistroChairSeatGeo, matTeak);
      cs.position.y = 0.44;
      cg.add(cs);
      const cb = new THREE.Mesh(bistroChairBackGeo, matTeak);
      cb.position.set(0, 0.66, -0.19);
      cg.add(cb);
      tg.add(cg);
    }

    if (addNpc) {
      npcSeated.push([tx + 0.60, 0.44, tz + 0.60, -Math.PI * 0.75]);
    }
    beachGroup.add(tg);
  };

  [
    [-173.4, -4.5, 1, true],
    [-173.4, -8.2, 2, false],
    [-173.4, -15.2, 6, true],
    [-173.4, -32.8, 4, false],
    [-173.4, -48.5, 2, true],
    [-173.4, -52.2, 0, false],
    [-173.4, -61.5, 3, true],
    [-173.4, -70.5, 5, false],
    [-173.4, -88.5, 1, true],
    [-173.4, -101.0, 4, false],
  ].forEach(([tx, tz, cIdx, hasNpc]) =>
    buildPromenadeTableSet(tx as number, tz as number, cIdx as number, hasNpc as boolean),
  );

  // 9 Teak & Iron Promenade Benches facing the ocean along the 120m Calçadão
  const benchSeatGeo = regGeo(new THREE.BoxGeometry(0.55, 0.08, 2.3));
  const benchBackGeo = regGeo(new THREE.BoxGeometry(0.08, 0.42, 2.3));
  const benchLegGeo = regGeo(new THREE.BoxGeometry(0.50, 0.44, 0.10));
  [-1.5, -19.5, -24.5, -29.5, -45.0, -58.5, -75.5, -83.5, -92.5].forEach((bz, idx) => {
    const bg = new THREE.Group();
    bg.position.set(-175.1, 0.30, bz);
    const seat = new THREE.Mesh(benchSeatGeo, matTeak);
    seat.position.y = 0.44;
    bg.add(seat);
    const back = new THREE.Mesh(benchBackGeo, matTeak);
    back.position.set(0.24, 0.68, 0);
    bg.add(back);
    [-0.9, 0.9].forEach((lz) => {
      const leg = new THREE.Mesh(benchLegGeo, matSteel);
      leg.position.set(0, 0.22, lz);
      bg.add(leg);
    });
    beachGroup.add(bg);
    if (idx % 3 === 0) {
      npcSeated.push([-175.0, 0.44, bz, -Math.PI / 2]);
    }
  });

  // =========================================================================
  // 9. TWO FUTEVÔLEI COURTS, BEACH SOCCER GOALS, 2 LIFEGUARD TOWERS & ROCKS
  // =========================================================================
  const netMat = regMat(new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.58 }));
  const buildFutevoleiCourt = (cx: number, cz: number) => {
    const cy = westMainlandBeachY(cx, cz) + 0.04;
    const cg = new THREE.Group();
    cg.position.set(cx, cy, cz);
    cg.rotation.y = Math.PI / 2;
    const lineN = new THREE.Mesh(regGeo(new THREE.BoxGeometry(7.2, 0.02, 0.10)), matCourtLine);
    lineN.position.z = 1.65;
    const lineS = lineN.clone();
    lineS.position.z = -1.65;
    const lineW = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.10, 0.02, 3.3)), matCourtLine);
    lineW.position.x = -3.6;
    const lineE = lineW.clone();
    lineE.position.x = 3.6;
    cg.add(lineN, lineS, lineW, lineE);

    [-1.75, 1.75].forEach((pz) => {
      const netPost = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 8)), matChrome);
      netPost.position.set(0, 1.0, pz);
      cg.add(netPost);
    });
    const netBand = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.06, 0.72, 3.5)), netMat);
    netBand.position.set(0, 1.48, 0);
    cg.add(netBand);
    beachGroup.add(cg);

    npcChat.push([cx, cy, cz - 1.8, 0.0]);
    npcChat.push([cx, cy, cz + 1.8, Math.PI]);
  };
  buildFutevoleiCourt(-185.4, -34.2);
  buildFutevoleiCourt(-186.2, -83.5);

  // Beach Soccer Pitch with Goalposts on wide south-central sand (-196.0, -61.5)
  const socY = westMainlandBeachY(-195.8, -61.5) + 0.04;
  [-66.5, -56.5].forEach((gz) => {
    const goal = new THREE.Group();
    goal.position.set(-195.8, socY, gz);
    [-1.6, 1.6].forEach((px) => {
      const p = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.055, 0.065, 1.95, 8)), matWhite);
      p.position.set(px, 0.98, 0);
      goal.add(p);
    });
    const crossBar = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.055, 0.055, 3.3, 8)), matWhite);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 1.95, 0);
    goal.add(crossBar);
    beachGroup.add(goal);
  });

  // Two Lifeguard Towers (Postos Salva-Vidas) covering North & South sectors
  [
    [-186.5, 2.2],
    [-186.8, -72.0],
  ].forEach(([lx, lz]) => {
    const ly = westMainlandBeachY(lx, lz);
    const lg = new THREE.Group();
    lg.position.set(lx, ly, lz);
    lg.rotation.y = -Math.PI / 2;
    [-0.78, 0.78].forEach((px) => {
      [-0.78, 0.78].forEach((pz) => {
        const leg = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.15, 2.35, 0.15)), matWood);
        leg.position.set(px, 1.15, pz);
        lg.add(leg);
      });
    });
    const cabin = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.1, 1.65, 2.1)), matYellow);
    cabin.position.y = 3.0;
    cabin.castShadow = true;
    lg.add(cabin);
    const lgRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(1.85, 0.78, 4)), matRed);
    lgRoof.rotation.y = Math.PI / 4;
    lgRoof.position.y = 4.2;
    lg.add(lgRoof);
    beachGroup.add(lg);
  });

  // Coastal Boulder Clusters framing North & South Headlands of the Bay
  const rockGeo = regGeo(new THREE.DodecahedronGeometry(1.5, 1));
  const rockSpecs: [number, number, number, number][] = [
    [-178.5, 8.8, 1.4, 0.4],
    [-181.2, 9.6, 1.9, 1.1],
    [-185.0, 10.4, 1.6, 2.0],
    [-179.5, -113.5, 1.8, 0.7],
    [-184.0, -114.8, 2.3, 1.5],
    [-189.2, -115.2, 2.0, 2.3],
    [-194.5, -114.6, 1.7, 0.9],
  ];
  rockSpecs.forEach(([rx, rz, rs, rot]) => {
    const ry = westMainlandBeachY(rx, rz);
    const boulder = new THREE.Mesh(rockGeo, matRock);
    boulder.position.set(rx, Math.max(ry, -1.1), rz);
    boulder.scale.set(rs * 1.2, rs * 0.72, rs);
    boulder.rotation.set(0.2, rot, 0.15);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    beachGroup.add(boulder);
  });

  // Wayfinding Totems at North Semicircle & South Pergola Plaza
  [-18.5, -74.5].forEach((tz) => {
    const totem = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.28, 2.35, 1.9)), matDarkWood);
    totem.position.set(-174.6, 1.35, tz);
    beachGroup.add(totem);
    const mapFace = new THREE.Mesh(
      regGeo(new THREE.PlaneGeometry(1.65, 1.25)),
      regMat(
        new THREE.MeshStandardMaterial({
          map: atlas.wayfindingMap,
          emissive: 0xffffff,
          emissiveMap: atlas.wayfindingMap,
          emissiveIntensity: 0.25,
        }),
      ),
    );
    mapFace.rotation.y = -Math.PI / 2;
    mapFace.position.set(-174.76, 1.58, tz);
    beachGroup.add(mapFace);
  });

  // =========================================================================
  // 10. ARCHED LAGOON BRIDGE ("Ponte da Ilha do Sol": X = -176.2 → -239.0, Z = -9.5)
  // =========================================================================
  const bxStart = -176.2;
  const bxEnd = WEST_ISLAND_CENTER.x + 29.0; // -239.0
  const bridgeZ = -9.5;
  const bridgeDeckY = (bx: number) => {
    const t = THREE.MathUtils.clamp((bxStart - bx) / (bxStart - bxEnd), 0, 1);
    return 0.30 + Math.sin(t * Math.PI) * 2.85 + t * 0.42;
  };
  const bridgeSegs = 26;
  for (let i = 0; i < bridgeSegs; i++) {
    const t0 = i / bridgeSegs;
    const t1 = (i + 1) / bridgeSegs;
    const x0 = THREE.MathUtils.lerp(bxStart, bxEnd, t0);
    const x1 = THREE.MathUtils.lerp(bxStart, bxEnd, t1);
    const y0 = bridgeDeckY(x0);
    const y1 = bridgeDeckY(x1);
    const xm = (x0 + x1) * 0.5;
    const ym = (y0 + y1) * 0.5;
    const segLen = Math.hypot(x1 - x0, y1 - y0) + 0.08;
    const pitch = Math.atan2(y1 - y0, x0 - x1);

    const plank = new THREE.Mesh(regGeo(new THREE.BoxGeometry(segLen, 0.22, 3.4)), matWood);
    plank.position.set(xm, ym - 0.10, bridgeZ);
    plank.rotation.z = pitch;
    plank.castShadow = true;
    plank.receiveShadow = true;
    beachGroup.add(plank);

    [-1.58, 1.58].forEach((rz) => {
      const rail = new THREE.Mesh(regGeo(new THREE.BoxGeometry(segLen, 0.09, 0.12)), matDarkWood);
      rail.position.set(xm, ym + 0.88, bridgeZ + rz);
      rail.rotation.z = pitch;
      beachGroup.add(rail);
    });

    if (i % 2 === 0 || i === bridgeSegs - 1) {
      const px = i === bridgeSegs - 1 ? x1 : x0;
      const py = i === bridgeSegs - 1 ? y1 : y0;
      [-1.55, 1.55].forEach((rz) => {
        const post = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.11, 0.13, py + 3.4, 8)), matDarkWood);
        post.position.set(px, (py - 2.6) * 0.5 + 0.45, bridgeZ + rz);
        beachGroup.add(post);

        if (i % 4 === 0) {
          const lampHead = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.24, 0.22)), lampEmissiveMat);
          lampHead.position.set(px, py + 1.04, bridgeZ + rz);
          beachGroup.add(lampHead);
        }
      });
    }
  }

  // Side Boat Landing Jetty branching off Bridge at X = -220
  const jettyDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(3.2, 0.20, 6.2)), matWood);
  jettyDeck.position.set(-220, -0.78, -5.0);
  jettyDeck.receiveShadow = true;
  beachGroup.add(jettyDeck);
  const jettyRamp = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.0, 0.18, 3.6)), matWood);
  jettyRamp.position.set(-220, 0.65, -7.2);
  jettyRamp.rotation.x = 0.72;
  beachGroup.add(jettyRamp);
  [-221.2, -218.8].forEach((jx) => {
    const jp = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.11, 0.13, 2.2, 8)), matDarkWood);
    jp.position.set(jx, -1.7, -2.3);
    beachGroup.add(jp);
  });

  // =========================================================================
  // 11. ARCHIPELAGO OF 5 TROPICAL ISLANDS (HIGH-RES CAPS, FOAM HALOS & LANDMARKS)
  // =========================================================================
  const buildIslandTerrainCap = (spec: IslandSpec) => {
    const span = spec.baseRadius * 2.55;
    const segs = Math.max(24, Math.round(spec.baseRadius * 1.45));
    const islGeo = regGeo(new THREE.PlaneGeometry(span, span, segs, segs));
    islGeo.rotateX(-Math.PI / 2);
    islGeo.translate(spec.x, 0, spec.z);
    const iPos = islGeo.attributes.position;
    const iColors = new Float32Array(iPos.count * 3);
    const iCol = new THREE.Color();

    for (let i = 0; i < iPos.count; i++) {
      const ix = iPos.getX(i);
      const iz = iPos.getZ(i);
      const iy = singleIslandTerrainY(spec, ix, iz) + 0.03;
      iPos.setY(i, iy);
      if (iy < -1.35) {
        iCol.setHex(0x0b2330);
      } else if (iy <= 0.48) {
        iCol.setHex(iy < -0.2 ? 0xc2a46e : 0xe9cf96);
      } else {
        const shade = ((Math.abs(Math.round(ix * 0.2 + iz * 0.2)) % 3) - 1) * 0.024;
        iCol.setRGB(0.145 + shade * 0.4, 0.30 + shade, 0.155 + shade * 0.4);
      }
      iColors[i * 3] = iCol.r;
      iColors[i * 3 + 1] = iCol.g;
      iColors[i * 3 + 2] = iCol.b;
    }
    islGeo.setAttribute('color', new THREE.BufferAttribute(iColors, 3));
    islGeo.computeVertexNormals();

    const islMesh = new THREE.Mesh(
      islGeo,
      regMat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.90 })),
    );
    islMesh.receiveShadow = true;
    beachGroup.add(islMesh);

    // 360° Island Surf Foam Halo
    const haloSegs = 40;
    const haloGeo = regGeo(new THREE.BufferGeometry());
    const haloVerts: number[] = [];
    const haloUvs: number[] = [];
    const haloIdx: number[] = [];
    for (let i = 0; i <= haloSegs; i++) {
      const a = (i / haloSegs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rShore = islandShoreRadiusAt(spec, ca * spec.baseRadius, sa * spec.baseRadius);
      const rIn = rShore - 0.55;
      const rOut = rShore + 0.85;
      haloVerts.push(spec.x + ca * rIn, -1.21, spec.z + sa * rIn);
      haloVerts.push(spec.x + ca * rOut, -1.21, spec.z + sa * rOut);
      haloUvs.push(0, i / haloSegs, 1, i / haloSegs);
      if (i < haloSegs) {
        const b = i * 2;
        haloIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(haloVerts, 3));
    haloGeo.setAttribute('uv', new THREE.Float32BufferAttribute(haloUvs, 2));
    haloGeo.setIndex(haloIdx);
    const haloMat = regMat(
      new THREE.MeshBasicMaterial({
        map: atlas.surfFoam,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    beachGroup.add(new THREE.Mesh(haloGeo, haloMat));
  };

  WEST_ISLANDS.forEach((spec) => buildIslandTerrainCap(spec));

  // Helper to populate lush botanical trees & coastal palms onto an island
  const populateIslandForest = (
    spec: IslandSpec,
    count: number,
    exclusions: [number, number, number][] = [],
  ) => {
    for (let i = 0; i < count; i++) {
      const a = (i * 2.39996 + spec.seed) % (Math.PI * 2);
      const frac = 0.14 + 0.68 * Math.sqrt((i + 0.5) / count);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rShore = islandShoreRadiusAt(spec, ca * spec.baseRadius, sa * spec.baseRadius);
      const rx = rShore * frac;
      const tx = spec.x + ca * rx;
      const tz = spec.z + sa * rx;

      let blocked = false;
      for (let e = 0; e < exclusions.length; e++) {
        if (Math.hypot(tx - exclusions[e][0], tz - exclusions[e][1]) < exclusions[e][2]) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      const ty = singleIslandTerrainY(spec, tx, tz);
      if (ty < 0.34) continue;

      if (frac > 0.72 || spec.id === 'pedras' || spec.id === 'restinga') {
        treeCollector.beachPalms.push({ x: tx, y: ty, z: tz, scale: 0.90 + (i % 3) * 0.09, rotY: a });
      } else {
        const m = (i + Math.round(spec.seed * 3)) % 10;
        const sc = 0.88 + (i % 4) * 0.10;
        if (m < 5) treeCollector.atlanticForest.push({ x: tx, y: ty, z: tz, scale: sc });
        else if (m < 7) treeCollector.urbanLeafy.push({ x: tx, y: ty, z: tz, scale: sc * 0.92 });
        else if (m === 7) treeCollector.ipesYellow.push({ x: tx, y: ty, z: tz, scale: sc * 0.92 });
        else if (m === 8) treeCollector.ipesPink.push({ x: tx, y: ty, z: tz, scale: sc * 0.92 });
        else treeCollector.palms.push({ x: tx, y: ty, z: tz, scale: sc * 0.95 });
      }
      if (i % 3 === 0) {
        treeCollector.shrubs.push({ x: tx + 1.0, y: singleIslandTerrainY(spec, tx + 1.0, tz), z: tz, scale: 0.86 });
      }
    }
  };

  // --- ISLAND 1: ILHA DO SOL (-268, -12) — Arrival Plaza, Loop Trail, Gazebo, North Deck ---
  const islSol = WEST_ISLANDS[0];
  const arrDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(6.2, 0.24, 5.4)), matWood);
  arrDeck.position.set(islSol.x + 26.8, 0.64, islSol.z);
  arrDeck.receiveShadow = true;
  beachGroup.add(arrDeck);

  const trailSteps = 24;
  const trailPoints: [number, number, number][] = [];
  for (let i = 0; i <= trailSteps; i++) {
    const a = (i / trailSteps) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rShore = islandShoreRadiusAt(islSol, ca * islSol.baseRadius, sa * islSol.baseRadius);
    const rTrail = rShore * 0.68;
    const tx = islSol.x + ca * rTrail;
    const tz = islSol.z + sa * rTrail;
    trailPoints.push([tx, singleIslandTerrainY(islSol, tx, tz) + 0.09, tz]);
  }
  for (let i = 0; i < trailSteps; i++) {
    const [x0, y0, z0] = trailPoints[i];
    const [x1, y1, z1] = trailPoints[i + 1];
    const xm = (x0 + x1) * 0.5;
    const ym = (y0 + y1) * 0.5;
    const zm = (z0 + z1) * 0.5;
    const dx = x1 - x0;
    const dz = z1 - z0;
    const horiz = Math.hypot(dx, dz);
    const segLen = Math.hypot(horiz, y1 - y0) + 0.35;
    const segGroup = new THREE.Group();
    segGroup.position.set(xm, ym, zm);
    segGroup.rotation.order = 'YXZ';
    segGroup.rotation.y = Math.atan2(dx, dz);
    segGroup.rotation.x = -Math.atan2(y1 - y0, horiz);
    const slab = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.5, 0.16, segLen)), matStone);
    slab.receiveShadow = true;
    segGroup.add(slab);
    beachGroup.add(segGroup);

    if (i % 2 === 0) {
      const post = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.08, 0.10, 0.95, 7)), matDarkWood);
      post.position.set(x0, y0 + 0.45, z0);
      beachGroup.add(post);
      const cap = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 7)), lampEmissiveMat);
      cap.position.set(x0, y0 + 0.98, z0);
      beachGroup.add(cap);
    }
  }

  const mirX = islSol.x + islSol.hillOffsetX;
  const mirZ = islSol.z + islSol.hillOffsetZ;
  const mirY = singleIslandTerrainY(islSol, mirX, mirZ);
  const gazebo = new THREE.Group();
  gazebo.position.set(mirX, mirY, mirZ);
  const gzBase = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(4.2, 4.6, 0.45, 8)), matGranite);
  gzBase.position.y = 0.20;
  gzBase.receiveShadow = true;
  gazebo.add(gzBase);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const col = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.11, 0.13, 3.1, 8)), matDarkWood);
    col.position.set(Math.cos(a) * 3.2, 1.75, Math.sin(a) * 3.2);
    gazebo.add(col);
  }
  const gzRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(4.4, 1.65, 8)), matWood);
  gzRoof.position.y = 4.05;
  gzRoof.castShadow = true;
  gazebo.add(gzRoof);
  const gzLantern = new THREE.Mesh(regGeo(new THREE.SphereGeometry(0.24, 10, 10)), lampEmissiveMat);
  gzLantern.position.y = 3.2;
  gazebo.add(gzLantern);
  beachGroup.add(gazebo);

  const northDeckY = singleIslandTerrainY(islSol, islSol.x + 2, islSol.z + 24);
  const northDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.6, 0.24, 4.4)), matWood);
  northDeck.position.set(islSol.x + 2, Math.max(northDeckY + 0.15, 0.45), islSol.z + 24.5);
  northDeck.receiveShadow = true;
  beachGroup.add(northDeck);

  // Island-Hopping Wooden Footbridge connecting Ilha do Sol (-264, -38) to Ilha da Restinga (-258, -50)
  const hopSegs = 8;
  for (let h = 0; h < hopSegs; h++) {
    const t0 = h / hopSegs;
    const t1 = (h + 1) / hopSegs;
    const hx0 = THREE.MathUtils.lerp(islSol.x + 4, WEST_ISLANDS[1].x, t0);
    const hz0 = THREE.MathUtils.lerp(islSol.z - 25.5, WEST_ISLANDS[1].z + 13.5, t0);
    const hx1 = THREE.MathUtils.lerp(islSol.x + 4, WEST_ISLANDS[1].x, t1);
    const hz1 = THREE.MathUtils.lerp(islSol.z - 25.5, WEST_ISLANDS[1].z + 13.5, t1);
    const hy = 0.65 + Math.sin(((t0 + t1) * 0.5) * Math.PI) * 1.15;
    const yaw = Math.atan2(hx1 - hx0, hz1 - hz0);
    const len = Math.hypot(hx1 - hx0, hz1 - hz0) + 0.15;

    const plank = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.3, 0.16, len)), matWood);
    plank.position.set((hx0 + hx1) * 0.5, hy, (hz0 + hz1) * 0.5);
    plank.rotation.y = yaw;
    plank.castShadow = true;
    beachGroup.add(plank);

    const post = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.08, 0.10, hy + 2.4, 7)), matDarkWood);
    post.position.set(hx0, (hy - 1.8) * 0.5, hz0);
    beachGroup.add(post);
  }

  populateIslandForest(islSol, 90, [
    [islSol.x + 26.8, islSol.z, 5.0],
    [mirX, mirZ, 5.4],
    [islSol.x + 2, islSol.z + 24.5, 4.6],
  ]);

  // --- ISLAND 2: ILHA DA RESTINGA (-258, -64) — Thatched Beach Bar, Pier & Loungers ---
  const islRest = WEST_ISLANDS[1];
  const restBarY = singleIslandTerrainY(islRest, islRest.x - 1, islRest.z);
  const restBar = new THREE.Group();
  restBar.position.set(islRest.x - 1, restBarY, islRest.z);
  restBar.rotation.y = Math.PI / 2;
  const rbDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.6, 0.18, 4.4)), matWood);
  rbDeck.position.y = 0.09;
  restBar.add(rbDeck);
  [-2.2, 2.2].forEach((px) => {
    [-1.7, 1.7].forEach((pz) => {
      const p = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(0.08, 0.09, 2.7, 7)), matDarkWood);
      p.position.set(px, 1.45, pz);
      restBar.add(p);
    });
  });
  const rbRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(4.2, 1.45, 6)), matThatch);
  rbRoof.position.y = 3.45;
  rbRoof.castShadow = true;
  restBar.add(rbRoof);
  const rbCounter = new THREE.Mesh(regGeo(new THREE.BoxGeometry(3.8, 0.98, 0.6)), matTeak);
  rbCounter.position.set(0, 0.65, 1.2);
  restBar.add(rbCounter);
  const rbSign = new THREE.Mesh(
    regGeo(new THREE.BoxGeometry(3.8, 0.72, 0.14)),
    regMat(
      new THREE.MeshStandardMaterial({
        map: atlas.shopSigns[33],
        emissive: 0xffffff,
        emissiveMap: atlas.shopSigns[33],
        emissiveIntensity: 0.55,
      }),
    ),
  );
  rbSign.position.set(0, 2.55, 1.85);
  restBar.add(rbSign);
  beachGroup.add(restBar);

  // Eastern boat pier on Ilha da Restinga
  const restPier = new THREE.Mesh(regGeo(new THREE.BoxGeometry(6.8, 0.22, 2.8)), matWood);
  restPier.position.set(islRest.x + 17.5, -0.78, islRest.z);
  beachGroup.add(restPier);

  // Sun loungers on Ilha da Restinga
  buildBeachLoungerSet(islRest.x + 5.5, islRest.z + 4.5, 2, false, singleIslandTerrainY(islRest, islRest.x + 5.5, islRest.z + 4.5));
  buildBeachLoungerSet(islRest.x + 5.5, islRest.z - 5.0, 4, false, singleIslandTerrainY(islRest, islRest.x + 5.5, islRest.z - 5.0));

  populateIslandForest(islRest, 22, [
    [islRest.x - 1, islRest.z, 5.2],
    [islRest.x + 5.5, islRest.z + 4.5, 3.0],
    [islRest.x + 5.5, islRest.z - 5.0, 3.0],
  ]);

  // --- ISLAND 3: ILHA DO FAROL (-304, +32) — Striped Coastal Lighthouse, Cottage & Pier ---
  const islFarol = WEST_ISLANDS[2];
  const fX = islFarol.x - 3.5;
  const fZ = islFarol.z + 2.5;
  const fY = singleIslandTerrainY(islFarol, fX, fZ);
  const lighthouse = new THREE.Group();
  lighthouse.position.set(fX, fY, fZ);

  const lhPlinth = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(3.2, 3.8, 1.6, 8)), matGranite);
  lhPlinth.position.y = 0.8;
  lhPlinth.castShadow = true;
  lighthouse.add(lhPlinth);

  // Tapered red-and-white striped tower bands
  const bandSpecs: [number, number, number, number, boolean][] = [
    [2.3, 2.0, 3.0, 3.1, false],
    [2.0, 1.75, 3.0, 6.1, true],
    [1.75, 1.50, 3.0, 9.1, false],
    [1.50, 1.25, 3.0, 12.1, true],
  ];
  bandSpecs.forEach(([rTop, rBot, h, py, isRed]) => {
    const seg = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(rTop, rBot, h, 14)), isRed ? matRed : matWhite);
    seg.position.y = py;
    seg.castShadow = true;
    lighthouse.add(seg);
  });

  const gallery = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(2.1, 1.6, 0.45, 14)), matSteel);
  gallery.position.y = 13.8;
  lighthouse.add(gallery);

  const lanternRoom = new THREE.Mesh(regGeo(new THREE.CylinderGeometry(1.15, 1.15, 1.65, 12)), lampEmissiveMat);
  lanternRoom.position.y = 14.85;
  lighthouse.add(lanternRoom);

  const lhRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(1.55, 1.55, 12)), matCopperRoof);
  lhRoof.position.y = 16.45;
  lighthouse.add(lhRoof);
  beachGroup.add(lighthouse);

  // Keeper's Cottage beside the lighthouse
  const cotY = singleIslandTerrainY(islFarol, islFarol.x + 5.5, islFarol.z - 2.0);
  const cottage = new THREE.Group();
  cottage.position.set(islFarol.x + 5.5, cotY, islFarol.z - 2.0);
  const cotBody = new THREE.Mesh(regGeo(new THREE.BoxGeometry(4.2, 2.5, 3.4)), matWhite);
  cotBody.position.y = 1.25;
  cotBody.castShadow = true;
  cottage.add(cotBody);
  const cotRoof = new THREE.Mesh(regGeo(new THREE.ConeGeometry(3.4, 1.35, 4)), matRed);
  cotRoof.rotation.y = Math.PI / 4;
  cotRoof.position.y = 3.15;
  cottage.add(cotRoof);
  beachGroup.add(cottage);

  // Boat pier on East side of Ilha do Farol
  const farolPier = new THREE.Mesh(regGeo(new THREE.BoxGeometry(7.2, 0.22, 2.8)), matWood);
  farolPier.position.set(islFarol.x + 22.8, -0.78, islFarol.z);
  beachGroup.add(farolPier);

  populateIslandForest(islFarol, 46, [
    [fX, fZ, 5.2],
    [islFarol.x + 5.5, islFarol.z - 2.0, 4.4],
  ]);

  // --- ISLAND 4: ILHA DO MORRO VERDE (-298, -104) — Cliffs, Forest & Lookout Deck ---
  const islVerde = WEST_ISLANDS[3];
  const cliffCoords: [number, number, number][] = [
    [-20.5, -6.5, 3.2],
    [-19.5, 4.5, 2.8],
    [-14.5, -15.5, 3.0],
    [-6.0, -21.0, 2.6],
  ];
  cliffCoords.forEach(([ox, oz, sc], idx) => {
    const rx = islVerde.x + ox;
    const rz = islVerde.z + oz;
    const ry = singleIslandTerrainY(islVerde, rx, rz);
    const cliff = new THREE.Mesh(rockGeo, matRock);
    cliff.position.set(rx, ry + 0.4, rz);
    cliff.scale.set(sc * 1.1, sc * 1.35, sc);
    cliff.rotation.y = idx * 0.9;
    cliff.castShadow = true;
    beachGroup.add(cliff);
  });

  // Summit wooden lookout platform on Ilha do Morro Verde
  const vMirX = islVerde.x + 3.0;
  const vMirZ = islVerde.z + 2.0;
  const vMirY = singleIslandTerrainY(islVerde, vMirX, vMirZ);
  const vDeck = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.0, 0.35, 5.0)), matTeak);
  vDeck.position.set(vMirX, vMirY + 0.25, vMirZ);
  beachGroup.add(vDeck);

  populateIslandForest(islVerde, 62, [[vMirX, vMirZ, 4.5]]);

  // --- ISLAND 5: ILHOTE DAS PEDRAS (-222, +26) — Basalt Boulders & Leaning Palms ---
  const islPedras = WEST_ISLANDS[4];
  [
    [-3.8, -1.5, 2.1],
    [4.2, 2.5, 1.8],
    [-1.2, 4.8, 1.9],
    [2.5, -4.2, 1.6],
  ].forEach(([ox, oz, sc], idx) => {
    const rx = islPedras.x + ox;
    const rz = islPedras.z + oz;
    const boulder = new THREE.Mesh(rockGeo, matRock);
    boulder.position.set(rx, singleIslandTerrainY(islPedras, rx, rz) + 0.2, rz);
    boulder.scale.set(sc, sc * 0.78, sc);
    boulder.rotation.y = idx * 1.2;
    boulder.castShadow = true;
    beachGroup.add(boulder);
  });
  populateIslandForest(islPedras, 8);

  // =========================================================================
  // 12. BOULEVARD PALMS & LEANING COASTAL COCONUT PALMS ACROSS 120m BEACH
  // =========================================================================
  [-108, -96, -84, -72, -60, -48, -36, -24, -12, 0, 5.5].forEach((pz, idx) => {
    treeCollector.palms.push({
      x: -167.8,
      y: 0.30,
      z: pz,
      scale: 1.02 + (idx % 3) * 0.08,
      rotY: idx * 1.1,
    });
    if (pz > -102 && pz < 2 && Math.abs(pz + 34) > 3) {
      treeCollector.palms.push({ x: -155.0, y: 0.22, z: pz, scale: 0.96, rotY: idx * 0.8 });
      treeCollector.shrubs.push({ x: -155.0, y: 0.22, z: pz - 3.6, scale: 0.92 });
    }
  });

  const beachPalmSpots: [number, number, number, number][] = [
    [-177.8, 7.2, 0.96, 2.8],
    [-184.0, 5.8, 1.04, 3.1],
    [-178.4, -7.2, 0.95, 2.9],
    [-184.5, -14.8, 1.08, 3.0],
    [-185.2, -31.8, 1.02, 3.2],
    [-182.8, -36.8, 0.96, 2.7],
    [-179.4, -44.5, 1.05, 3.1],
    [-184.2, -52.5, 1.06, 2.9],
    [-185.0, -61.5, 1.02, 3.2],
    [-181.2, -70.0, 1.08, 2.8],
    [-186.5, -79.5, 1.04, 3.0],
    [-182.5, -90.5, 1.00, 3.1],
    [-185.5, -101.0, 1.08, 2.9],
    [-181.8, -109.5, 1.10, 3.2],
    [-186.8, -112.0, 1.02, 2.7],
  ];
  beachPalmSpots.forEach(([px, pz, sc, rotY]) => {
    const py = westMainlandBeachY(px, pz);
    treeCollector.beachPalms.push({ x: px, y: Math.max(py, -0.82), z: pz, scale: sc, rotY });
    treeCollector.shrubs.push({ x: px + 1.1, y: Math.max(py, -0.82), z: pz + 0.6, scale: 0.88 });
  });

  // Extra chatting visitors on the plazas, bridge & islands
  npcChat.push([-175.0, 0.30, -24.5, -1.5]);
  npcChat.push([-175.0, 0.30, -23.2, -1.8]);
  npcChat.push([-175.0, 0.30, -79.5, -1.5]);
  npcChat.push([-175.0, 0.30, -78.2, -1.8]);
  npcChat.push([-206.5, bridgeDeckY(-206.5) + 0.02, bridgeZ + 0.5, 2.2]);
  npcChat.push([islSol.x + 26.8, 0.76, islSol.z + 0.6, -2.2]);
  const islGazY = mirY + 0.44;
  npcChat.push([mirX + 0.4, islGazY, mirZ + 0.5, 0.7]);
  npcChat.push([mirX - 0.6, islGazY, mirZ - 0.2, -2.3]);
  npcChat.push([islRest.x + 2.0, restBarY + 0.18, islRest.z + 1.4, -1.5]);

  const update = (elapsed: number) => {
    for (let i = 0; i < surfLayers.length; i++) {
      const layer = surfLayers[i];
      layer.mesh.position.x = layer.baseX + Math.sin(elapsed * layer.speed + layer.phase) * layer.amp;
    }
  };

  const dispose = () => {
    geosToDispose.forEach((g) => g.dispose());
    matsToDispose.forEach((m) => m.dispose());
  };

  return {
    result: { group: beachGroup, update, dispose },
    npcSpots: { seated: npcSeated, chatting: npcChat },
  };
}
