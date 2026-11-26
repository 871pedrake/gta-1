import * as THREE from 'three';

export interface VegetationPlacement {
  x: number;
  y: number;
  z: number;
  scale?: number;
  rotY?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

export interface CityVegetationSystem {
  group: THREE.Group;
  update: (elapsed: number, windStrength: number) => void;
  dispose: () => void;
}

interface WindUniforms {
  uTime: { value: number };
  uWind: { value: number };
}

function makeWindStandardMaterial(
  params: THREE.MeshStandardMaterialParameters,
  uniforms: WindUniforms,
  swayAmp: number,
  flutterAmp: number,
  baseY: number,
  heightSpan: number,
  cacheKey: string,
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial(params);
  mat.customProgramCacheKey = () => `city_wind_${cacheKey}`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 instOrigin = vec3(0.0);
        #ifdef USE_INSTANCING
          instOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #endif
        float hNorm = clamp((transformed.y - (${baseY.toFixed(2)})) / (${heightSpan.toFixed(2)}), 0.0, 1.4);
        float w = clamp(uWind, 0.15, 2.2);
        float gustSpeed = 1.65 + w * 1.35;
        float phase = instOrigin.x * 0.13 + instOrigin.z * 0.11;
        float gust = sin(uTime * gustSpeed + phase) * 0.72 + sin(uTime * gustSpeed * 0.47 - instOrigin.z * 0.08) * 0.28;
        float flutter = cos(uTime * (gustSpeed * 2.5) + transformed.x * 2.3 + transformed.z * 2.1 + phase * 1.7);
        float dx = (gust * ${swayAmp.toFixed(3)} + flutter * ${flutterAmp.toFixed(3)}) * hNorm * w;
        float dz = (sin(uTime * gustSpeed * 0.85 + phase * 1.3) * ${(swayAmp * 0.52).toFixed(3)} + flutter * ${(flutterAmp * 0.65).toFixed(3)}) * hNorm * w;
        transformed.x += dx;
        transformed.z += dz;
        transformed.y -= abs(dx) * 0.10 * hNorm;`,
      );
  };
  return mat;
}

function mergeGeometriesSimple(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));

  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  let vOffset = 0;

  for (const g of nonIndexed) {
    g.computeVertexNormals();
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    posArr.set(p, vOffset);
    normArr.set(n, vOffset);
    vOffset += p.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  merged.setDrawRange(0, totalVerts);

  nonIndexed.forEach((g, idx) => {
    if (g !== geos[idx]) g.dispose();
  });
  return merged;
}

/**
 * Builds an articulated multi-branch botanical trunk with buttress surface roots,
 * primary forked limbs, and secondary canopy twigs.
 */
function buildBotanicalTrunkGeo(scaleH = 1.0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Root flare collar & 4 buttress roots grounding cleanly into the soil
  const rootCollar = new THREE.CylinderGeometry(0.22, 0.34, 0.45 * scaleH, 9);
  rootCollar.translate(0, 0.22 * scaleH, 0);
  parts.push(rootCollar);

  for (let r = 0; r < 4; r++) {
    const root = new THREE.CylinderGeometry(0.055, 0.11, 0.68, 6);
    root.translate(0, 0.28, 0);
    root.rotateZ(1.02);
    root.rotateY((r * Math.PI) / 2 + 0.35);
    root.translate(0, 0.04, 0);
    parts.push(root);
  }

  // Main curved lower stem
  const stemLower = new THREE.CylinderGeometry(0.165, 0.23, 1.55 * scaleH, 9);
  stemLower.translate(0, 0.78 * scaleH, 0);
  parts.push(stemLower);

  const stemUpper = new THREE.CylinderGeometry(0.125, 0.165, 1.05 * scaleH, 8);
  stemUpper.rotateZ(0.08);
  stemUpper.translate(0.04, 1.82 * scaleH, 0);
  parts.push(stemUpper);

  // 4 diverging primary scaffold branches + 2 secondary forks each
  const limbAngles = [0.1, 1.72, 3.3, 4.88];
  const limbTilts = [0.58, 0.66, 0.54, 0.64];
  limbAngles.forEach((ang, idx) => {
    const limbLen = (1.35 + (idx % 2) * 0.22) * scaleH;
    const limb = new THREE.CylinderGeometry(0.062, 0.115, limbLen, 7);
    limb.translate(0, limbLen * 0.5, 0);
    limb.rotateZ(limbTilts[idx]);
    limb.rotateY(ang);
    limb.translate(0, (1.85 + (idx % 2) * 0.18) * scaleH, 0);
    parts.push(limb);

    // Secondary twig reaching outer foliage crown from parent limb midpoint
    const midR = Math.sin(limbTilts[idx]) * limbLen * 0.62;
    const tipX = -Math.cos(ang) * midR;
    const tipZ = Math.sin(ang) * midR;
    const tipY = (1.85 + (idx % 2) * 0.18) * scaleH + Math.cos(limbTilts[idx]) * limbLen * 0.62;

    const twig = new THREE.CylinderGeometry(0.032, 0.06, 0.85 * scaleH, 6);
    twig.translate(0, 0.42 * scaleH, 0);
    twig.rotateZ(0.45);
    twig.rotateY(ang + 0.55);
    twig.translate(tipX, tipY, tipZ);
    parts.push(twig);
  });

  const merged = mergeGeometriesSimple(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Builds a rich 13-cluster layered botanical crown so trees have natural depth,
 * silhouette breaks, and light pockets rather than a single blocky polygon.
 */
function buildBotanicalCanopyGeo(baseY = 2.85, spreadScale = 1.0): THREE.BufferGeometry {
  const puffs: THREE.BufferGeometry[] = [];
  const specs: [number, number, number, number, number, number][] = [
    // [x, y, z, radius, ySquash, detail]
    [0.0, baseY + 1.05, 0.0, 1.15, 0.72, 1],
    [-0.85, baseY + 0.62, 0.52, 0.92, 0.76, 1],
    [0.92, baseY + 0.58, 0.46, 0.88, 0.75, 1],
    [0.12, baseY + 0.55, -0.92, 0.95, 0.74, 1],
    [-0.95, baseY + 0.28, -0.58, 0.82, 0.72, 1],
    [0.88, baseY + 0.25, -0.68, 0.80, 0.74, 1],
    [0.05, baseY + 0.22, 0.98, 0.84, 0.70, 1],
    [-1.42, baseY + 0.14, 0.08, 0.66, 0.78, 1],
    [1.40, baseY + 0.18, -0.06, 0.64, 0.76, 1],
    [-0.45, baseY + 1.38, -0.25, 0.74, 0.75, 1],
    [0.52, baseY + 1.34, 0.28, 0.70, 0.76, 1],
    [-0.38, baseY - 0.12, -0.18, 0.65, 0.72, 1],
    [0.42, baseY - 0.10, 0.22, 0.62, 0.72, 1],
  ];

  specs.forEach(([x, y, z, r, ySquash, detail], idx) => {
    const g = new THREE.IcosahedronGeometry(r, detail);
    g.scale(spreadScale * (1 + (idx % 3) * 0.05), ySquash, spreadScale);
    g.rotateY(idx * 0.85);
    g.translate(x * spreadScale, y, z * spreadScale);
    puffs.push(g);
  });

  const merged = mergeGeometriesSimple(puffs);
  puffs.forEach((p) => p.dispose());
  return merged;
}

/**
 * Builds a multi-puff organic garden shrub instead of a single sphere.
 */
function buildDetailedShrubGeo(): THREE.BufferGeometry {
  const puffs: THREE.BufferGeometry[] = [];
  const specs: [number, number, number, number, number][] = [
    [0.0, 0.42, 0.0, 0.46, 0.78],
    [-0.36, 0.30, 0.18, 0.34, 0.75],
    [0.38, 0.28, -0.14, 0.33, 0.76],
    [0.14, 0.32, 0.36, 0.32, 0.74],
    [-0.18, 0.31, -0.34, 0.31, 0.74],
    [0.08, 0.56, -0.05, 0.28, 0.80],
    [-0.22, 0.45, 0.06, 0.25, 0.78],
  ];
  specs.forEach(([x, y, z, r, ys], i) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    g.scale(1.08, ys, 1.08);
    g.rotateY(i * 1.1);
    g.translate(x, y, z);
    puffs.push(g);
  });
  const merged = mergeGeometriesSimple(puffs);
  puffs.forEach((p) => p.dispose());
  return merged;
}

function buildShrubFlowerGeo(): THREE.BufferGeometry {
  const buds: THREE.BufferGeometry[] = [];
  const coords: [number, number, number][] = [
    [-0.26, 0.52, 0.22],
    [0.24, 0.50, -0.18],
    [0.04, 0.74, 0.02],
    [0.34, 0.42, 0.24],
    [-0.32, 0.42, -0.22],
  ];
  coords.forEach(([x, y, z]) => {
    const b = new THREE.OctahedronGeometry(0.085, 0);
    b.translate(x, y, z);
    buds.push(b);
  });
  const merged = mergeGeometriesSimple(buds);
  buds.forEach((b) => b.dispose());
  return merged;
}

function buildBotanicalPalmGeos(leanAmount: number): {
  trunkGeo: THREE.BufferGeometry;
  coconutGeo: THREE.BufferGeometry;
  frondGeo: THREE.BufferGeometry;
} {
  const trunkParts: THREE.BufferGeometry[] = [];
  const segCount = 9;
  const totalH = 6.35;

  const spineAt = (t: number): { x: number; y: number; z: number } => ({
    x: Math.pow(t, 1.55) * leanAmount + Math.sin(t * Math.PI) * 0.14,
    y: t * totalH,
    z: Math.sin(t * Math.PI * 0.85) * 0.10,
  });

  // Flared root collar
  const bulb = new THREE.CylinderGeometry(0.28, 0.42, 0.46, 9);
  bulb.translate(0, 0.23, 0);
  trunkParts.push(bulb);

  for (let s = 0; s < segCount; s++) {
    const t0 = s / segCount;
    const t1 = (s + 1) / segCount;
    const p0 = spineAt(t0);
    const p1 = spineAt(t1);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dy, dz) * 1.04;
    const rBot = 0.27 - t0 * 0.12;
    const rTop = 0.27 - t1 * 0.12;

    const cyl = new THREE.CylinderGeometry(rTop, rBot, len, 8);
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    cyl.applyQuaternion(q);
    cyl.translate((p0.x + p1.x) * 0.5, (p0.y + p1.y) * 0.5, (p0.z + p1.z) * 0.5);
    trunkParts.push(cyl);

    // Subtle growth-ring ridge collar at each segment joint
    if (s > 0) {
      const ring = new THREE.CylinderGeometry(rBot * 1.11, rBot * 1.05, 0.10, 8);
      ring.applyQuaternion(q);
      ring.translate(p0.x, p0.y, p0.z);
      trunkParts.push(ring);
    }
  }

  const tip = spineAt(1.0);
  const prev = spineAt(0.88);
  const crownDir = new THREE.Vector3(tip.x - prev.x, tip.y - prev.y, tip.z - prev.z).normalize();
  const crownQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), crownDir);

  const trunkGeo = mergeGeometriesSimple(trunkParts);
  trunkParts.forEach((p) => p.dispose());

  // Coconut cluster tucked beneath the crownshaft
  const cocoParts: THREE.BufferGeometry[] = [];
  for (let c = 0; c < 5; c++) {
    const ca = (c * Math.PI * 2) / 5 + 0.3;
    const cr = 0.24 + (c % 2) * 0.04;
    const coco = new THREE.IcosahedronGeometry(0.145, 0);
    coco.scale(0.92, 1.12, 0.92);
    coco.translate(
      tip.x + Math.cos(ca) * cr,
      tip.y + 0.14 - (c % 2) * 0.08,
      tip.z + Math.sin(ca) * cr,
    );
    cocoParts.push(coco);
  }
  const coconutGeo = mergeGeometriesSimple(cocoParts);
  cocoParts.forEach((p) => p.dispose());

  // Crownshaft ("palmito") + 14 arched pinnate fronds with feathery leaflet blades
  const frondParts: THREE.BufferGeometry[] = [];
  const crownShaft = new THREE.CylinderGeometry(0.15, 0.19, 0.72, 8);
  crownShaft.translate(0, 0.32, 0);
  crownShaft.applyQuaternion(crownQ);
  crownShaft.translate(tip.x, tip.y - 0.06, tip.z);
  frondParts.push(crownShaft);

  const crownTop = new THREE.Vector3(
    tip.x + crownDir.x * 0.62,
    tip.y + crownDir.y * 0.62,
    tip.z + crownDir.z * 0.62,
  );

  const frondCount = 14;
  for (let f = 0; f < frondCount; f++) {
    const az = (f * Math.PI * 2) / frondCount + (f % 2) * 0.11;
    const tier = f % 3; // 0: high upright plume, 1: mid graceful arch, 2: lower sweeping frond
    const reach = tier === 0 ? 2.45 : tier === 1 ? 3.15 : 2.95;
    const archPeak = tier === 0 ? 1.15 : tier === 1 ? 0.75 : 0.38;
    const tipDrop = tier === 0 ? -0.15 : tier === 1 ? -0.82 : -1.28;

    const dirX = Math.cos(az);
    const dirZ = Math.sin(az);
    const sideX = -dirZ;
    const sideZ = dirX;

    const spinePts: THREE.Vector3[] = [];
    const spineSteps = 5;
    for (let k = 0; k <= spineSteps; k++) {
      const u = k / spineSteps;
      const rDist = u * reach;
      const yOff = Math.sin(u * Math.PI * 0.78) * archPeak + Math.pow(u, 2.0) * tipDrop;
      spinePts.push(
        new THREE.Vector3(
          crownTop.x + dirX * rDist,
          crownTop.y + yOff,
          crownTop.z + dirZ * rDist,
        ),
      );
    }

    // Central arched rachis stem
    for (let k = 0; k < spineSteps; k++) {
      const a = spinePts[k];
      const b = spinePts[k + 1];
      const v = new THREE.Vector3().subVectors(b, a);
      const len = v.length();
      const t = (k + 0.5) / spineSteps;
      const stem = new THREE.CylinderGeometry(0.022 * (1 - t * 0.6), 0.036 * (1 - t * 0.45), len * 1.05, 4);
      const sq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      stem.applyQuaternion(sq);
      stem.translate((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
      frondParts.push(stem);
    }

    // 10 pairs of feathery drooping leaflets fanning off each side of the rachis
    const pairs = 10;
    for (let p = 1; p <= pairs; p++) {
      const u = p / (pairs + 0.6);
      const fIdx = Math.min(spineSteps - 1, Math.floor(u * spineSteps));
      const localT = u * spineSteps - fIdx;
      const basePt = new THREE.Vector3().lerpVectors(spinePts[fIdx], spinePts[fIdx + 1], localT);
      const tangent = new THREE.Vector3().subVectors(spinePts[fIdx + 1], spinePts[fIdx]).normalize();
      const leafLen = (0.44 + Math.sin(u * Math.PI) * 0.52) * (tier === 0 ? 0.88 : 1.02);

      [-1, 1].forEach((side) => {
        const leafDir = new THREE.Vector3(
          sideX * side * 0.78 + tangent.x * 0.48,
          -0.46 - u * 0.32,
          sideZ * side * 0.78 + tangent.z * 0.48,
        ).normalize();

        const blade = new THREE.ConeGeometry(0.075, leafLen, 3);
        blade.scale(1.0, 1.0, 0.22);
        blade.translate(0, leafLen * 0.5, 0);
        const lq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), leafDir);
        blade.applyQuaternion(lq);
        blade.translate(basePt.x, basePt.y, basePt.z);
        frondParts.push(blade);
      });
    }
  }

  const frondGeo = mergeGeometriesSimple(frondParts);
  frondParts.forEach((p) => p.dispose());
  return { trunkGeo, coconutGeo, frondGeo };
}

export function createVegetationSystem(placements: {
  palms: VegetationPlacement[];
  beachPalms?: VegetationPlacement[];
  ipesYellow: VegetationPlacement[];
  ipesPink: VegetationPlacement[];
  urbanLeafy: VegetationPlacement[];
  atlanticForest: VegetationPlacement[];
  shrubs: VegetationPlacement[];
}): CityVegetationSystem {
  const group = new THREE.Group();
  group.name = 'Vegetacao_Cidade_Vento';

  const uniforms: WindUniforms = {
    uTime: { value: 0 },
    uWind: { value: 1.0 },
  };

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

  const dummy = new THREE.Object3D();

  const populate = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    items: VegetationPlacement[],
    castShadow: boolean,
    colorJitter?: THREE.Color[],
  ) => {
    if (items.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const s = it.scale ?? 1;
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(0, it.rotY ?? ((i * 1.618) % (Math.PI * 2)), 0);
      dummy.scale.set(it.sx ?? s, it.sy ?? s, it.sz ?? s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (colorJitter && colorJitter.length > 0) {
        mesh.setColorAt(i, colorJitter[i % colorJitter.length]);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  };

  // =========================================================================
  // 1. PALMEIRAS BOTÂNICAS & COQUEIROS DA PRAIA (Tronco Curvo Anelado + Cocos + 14 Frondes Pinadas)
  // =========================================================================
  const palmTrunkMat = regMat(
    makeWindStandardMaterial(
      { color: 0x7c6f62, roughness: 0.90 },
      uniforms,
      0.16,
      0.01,
      0.2,
      6.4,
      'palm_trunk',
    ),
  );
  const palmCocoMat = regMat(
    makeWindStandardMaterial(
      { color: 0x654321, roughness: 0.78 },
      uniforms,
      0.20,
      0.02,
      5.2,
      2.2,
      'palm_coco',
    ),
  );
  const palmFrondMat = regMat(
    makeWindStandardMaterial(
      { color: 0x16a34a, roughness: 0.68 },
      uniforms,
      0.26,
      0.105,
      5.0,
      3.4,
      'palm_frond',
    ),
  );

  const straightPalm = buildBotanicalPalmGeos(0.32);
  regGeo(straightPalm.trunkGeo);
  regGeo(straightPalm.coconutGeo);
  regGeo(straightPalm.frondGeo);

  populate(straightPalm.trunkGeo, palmTrunkMat, placements.palms, false);
  populate(straightPalm.coconutGeo, palmCocoMat, placements.palms, false);
  populate(straightPalm.frondGeo, palmFrondMat, placements.palms, true, [
    new THREE.Color(0x16a34a),
    new THREE.Color(0x15803d),
    new THREE.Color(0x22c55e),
  ]);

  if (placements.beachPalms && placements.beachPalms.length > 0) {
    const coastalPalm = buildBotanicalPalmGeos(1.25);
    regGeo(coastalPalm.trunkGeo);
    regGeo(coastalPalm.coconutGeo);
    regGeo(coastalPalm.frondGeo);

    populate(coastalPalm.trunkGeo, palmTrunkMat, placements.beachPalms, false);
    populate(coastalPalm.coconutGeo, palmCocoMat, placements.beachPalms, false);
    populate(coastalPalm.frondGeo, palmFrondMat, placements.beachPalms, true, [
      new THREE.Color(0x22c55e),
      new THREE.Color(0x16a34a),
      new THREE.Color(0x15803d),
    ]);
  }

  // =========================================================================
  // 2. IPÊS AMARELOS, IPÊS ROSAS & ÁRVORES URBANAS (Troncos Ramificados + Copa Orgânica)
  // =========================================================================
  const treeTrunkGeo = regGeo(buildBotanicalTrunkGeo(1.0));
  const treeTrunkMat = regMat(
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 }),
  );
  const allBroadleafTrunks = [
    ...placements.ipesYellow,
    ...placements.ipesPink,
    ...placements.urbanLeafy,
  ];
  populate(treeTrunkGeo, treeTrunkMat, allBroadleafTrunks, false);

  const canopyGeo = regGeo(buildBotanicalCanopyGeo(3.05, 1.0));

  const ipeYellowMat = regMat(
    makeWindStandardMaterial(
      { color: 0xfacc15, roughness: 0.76 },
      uniforms,
      0.22,
      0.08,
      2.3,
      2.9,
      'ipe_y',
    ),
  );
  populate(canopyGeo, ipeYellowMat, placements.ipesYellow, true, [
    new THREE.Color(0xfacc15),
    new THREE.Color(0xfde047),
    new THREE.Color(0xeab308),
  ]);

  const ipePinkMat = regMat(
    makeWindStandardMaterial(
      { color: 0xec4899, roughness: 0.76 },
      uniforms,
      0.22,
      0.08,
      2.3,
      2.9,
      'ipe_p',
    ),
  );
  populate(canopyGeo, ipePinkMat, placements.ipesPink, true, [
    new THREE.Color(0xec4899),
    new THREE.Color(0xf472b6),
    new THREE.Color(0xdb2777),
  ]);

  const urbanLeafMat = regMat(
    makeWindStandardMaterial(
      { color: 0x22c55e, roughness: 0.78 },
      uniforms,
      0.22,
      0.085,
      2.3,
      2.9,
      'urban_leaf',
    ),
  );
  populate(canopyGeo, urbanLeafMat, placements.urbanLeafy, true, [
    new THREE.Color(0x16a34a),
    new THREE.Color(0x15803d),
    new THREE.Color(0x22c55e),
    new THREE.Color(0x4d7c0f),
  ]);

  // =========================================================================
  // 3. MATA ATLÂNTICA DENSA (Troncos Ramificados Altos + Copas em Camadas)
  // =========================================================================
  const forestTrunkGeo = regGeo(buildBotanicalTrunkGeo(1.18));
  populate(forestTrunkGeo, treeTrunkMat, placements.atlanticForest, false);

  const forestCanopyGeo = regGeo(buildBotanicalCanopyGeo(3.45, 1.15));
  const forestCanopyMat = regMat(
    makeWindStandardMaterial(
      { color: 0x166534, roughness: 0.85 },
      uniforms,
      0.26,
      0.095,
      2.4,
      3.4,
      'atlantic_forest',
    ),
  );
  populate(forestCanopyGeo, forestCanopyMat, placements.atlanticForest, false, [
    new THREE.Color(0x14532d),
    new THREE.Color(0x166534),
    new THREE.Color(0x15803d),
    new THREE.Color(0x365314),
    new THREE.Color(0x3f6212),
  ]);

  // =========================================================================
  // 4. ARBUSTOS MULTICAMADA & FLORES DE CANTEIRO
  // =========================================================================
  const shrubGeo = regGeo(buildDetailedShrubGeo());
  const shrubMat = regMat(
    makeWindStandardMaterial(
      { color: 0x22c55e, roughness: 0.80 },
      uniforms,
      0.09,
      0.045,
      0.05,
      0.9,
      'shrub',
    ),
  );
  populate(shrubGeo, shrubMat, placements.shrubs, false, [
    new THREE.Color(0x15803d),
    new THREE.Color(0x16a34a),
    new THREE.Color(0x4d7c0f),
  ]);

  const shrubFlowerGeo = regGeo(buildShrubFlowerGeo());
  const shrubFlowerMat = regMat(
    makeWindStandardMaterial(
      { color: 0xffffff, roughness: 0.65 },
      uniforms,
      0.10,
      0.05,
      0.05,
      0.9,
      'shrub_flowers',
    ),
  );
  populate(shrubFlowerGeo, shrubFlowerMat, placements.shrubs, false, [
    new THREE.Color(0xfacc15),
    new THREE.Color(0xf472b6),
    new THREE.Color(0xfef3c7),
    new THREE.Color(0xfb7185),
  ]);

  return {
    group,
    update: (elapsed: number, windStrength: number) => {
      uniforms.uTime.value = elapsed;
      uniforms.uWind.value = windStrength;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
