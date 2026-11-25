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

export function createVegetationSystem(placements: {
  palms: VegetationPlacement[];
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
  // 1. PALMEIRAS IMPERIAIS (Ringed Segmented Trunk + 12 Arched Multi-Segment Fronds)
  // =========================================================================
  const palmTrunkParts: THREE.BufferGeometry[] = [];
  const palmBulb = new THREE.CylinderGeometry(0.28, 0.36, 0.55, 8);
  palmBulb.translate(0, 0.275, 0);
  palmTrunkParts.push(palmBulb);
  for (let seg = 0; seg < 6; seg++) {
    const rBot = 0.27 - seg * 0.022;
    const rTop = 0.24 - seg * 0.022;
    const cyl = new THREE.CylinderGeometry(rTop, rBot, 0.94, 8);
    cyl.translate(Math.sin(seg * 0.45) * 0.04, 0.95 + seg * 0.92, 0);
    palmTrunkParts.push(cyl);
  }
  const palmTrunkGeo = regGeo(mergeGeometriesSimple(palmTrunkParts));
  palmTrunkParts.forEach((p) => p.dispose());

  const palmTrunkMat = regMat(
    makeWindStandardMaterial(
      { color: 0x857c70, roughness: 0.9 },
      uniforms,
      0.16,
      0.01,
      0.2,
      6.4,
      'palm_trunk',
    ),
  );
  populate(palmTrunkGeo, palmTrunkMat, placements.palms, false);

  // Crownshaft collar + 11 arched multi-segment palm fronds
  const frondParts: THREE.BufferGeometry[] = [];
  const crownShaft = new THREE.CylinderGeometry(0.18, 0.20, 0.72, 8);
  crownShaft.translate(0, 6.45, 0);
  frondParts.push(crownShaft);

  for (let f = 0; f < 11; f++) {
    const az = (f * Math.PI * 2) / 11;
    const lift = f % 2 === 0 ? 0.88 : 1.18;

    // Inner stem reaching upward/outward
    const seg1 = new THREE.ConeGeometry(0.32, 1.55, 5);
    seg1.scale(1.0, 1.0, 0.22);
    seg1.translate(0, 0.77, 0);
    seg1.rotateZ(lift);
    seg1.rotateY(az);
    seg1.translate(0, 6.72, 0);
    frondParts.push(seg1);

    // Outer drooping leaf fan tip
    const seg2 = new THREE.ConeGeometry(0.46, 1.75, 5);
    seg2.scale(1.15, 1.0, 0.18);
    seg2.translate(0, 0.87, 0);
    seg2.rotateZ(lift + 0.62);
    seg2.rotateY(az);
    const rMid = Math.sin(lift) * 1.45;
    const yMid = 6.72 + Math.cos(lift) * 1.45;
    seg2.translate(-Math.cos(az) * rMid, yMid, Math.sin(az) * rMid);
    frondParts.push(seg2);
  }
  const crownCap = new THREE.SphereGeometry(0.30, 7, 5);
  crownCap.translate(0, 6.75, 0);
  frondParts.push(crownCap);

  const palmFrondGeo = regGeo(mergeGeometriesSimple(frondParts));
  frondParts.forEach((p) => p.dispose());
  const palmFrondMat = regMat(
    makeWindStandardMaterial(
      { color: 0x15803d, roughness: 0.72 },
      uniforms,
      0.24,
      0.095,
      5.0,
      3.2,
      'palm_frond',
    ),
  );
  populate(palmFrondGeo, palmFrondMat, placements.palms, true, [
    new THREE.Color(0x15803d),
    new THREE.Color(0x166534),
    new THREE.Color(0x16a34a),
  ]);

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
