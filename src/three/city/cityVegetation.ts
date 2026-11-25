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
  let totalIndices = 0;
  const nonIndexed = geos.map((g) => (g.index ? g.toNonIndexed() : g));

  for (const g of nonIndexed) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.attributes.position.count;
  }

  const posArr = new Float32Array(totalVerts * 3);
  const normArr = new Float32Array(totalVerts * 3);
  let vOffset = 0;

  for (const g of nonIndexed) {
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    posArr.set(p, vOffset);
    normArr.set(n, vOffset);
    vOffset += p.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  merged.setDrawRange(0, totalIndices);

  nonIndexed.forEach((g, idx) => {
    if (g !== geos[idx]) g.dispose();
  });
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
  // 1. PALMEIRAS IMPERIAIS (Trunks + Arched Swaying Fronds)
  // =========================================================================
  const palmTrunkGeo = regGeo(new THREE.CylinderGeometry(0.15, 0.27, 6.2, 7));
  palmTrunkGeo.translate(0, 3.1, 0);
  const palmTrunkMat = regMat(
    makeWindStandardMaterial(
      { color: 0x7c756c, roughness: 0.92 },
      uniforms,
      0.16,
      0.01,
      0.2,
      6.0,
      'palm_trunk',
    ),
  );
  populate(palmTrunkGeo, palmTrunkMat, placements.palms, true);

  const frondParts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 7; f++) {
    const fg = new THREE.ConeGeometry(0.58, 3.1, 5);
    fg.translate(0, 1.55, 0);
    fg.rotateZ(1.12);
    fg.rotateY((f * Math.PI * 2) / 7);
    fg.translate(0, 6.15, 0);
    frondParts.push(fg);
  }
  const crownCap = new THREE.SphereGeometry(0.32, 6, 5);
  crownCap.translate(0, 6.2, 0);
  frondParts.push(crownCap);

  const palmFrondGeo = regGeo(mergeGeometriesSimple(frondParts));
  frondParts.forEach((p) => p.dispose());
  const palmFrondMat = regMat(
    makeWindStandardMaterial(
      { color: 0x15803d, roughness: 0.74 },
      uniforms,
      0.24,
      0.09,
      4.5,
      3.0,
      'palm_frond',
    ),
  );
  populate(palmFrondGeo, palmFrondMat, placements.palms, true, [
    new THREE.Color(0x15803d),
    new THREE.Color(0x166534),
    new THREE.Color(0x16a34a),
  ]);

  // =========================================================================
  // 2. IPÊS AMARELOS & IPÊS ROSAS + ÁRVORES URBANAS FRONDOSAS
  // =========================================================================
  const treeTrunkGeo = regGeo(new THREE.CylinderGeometry(0.16, 0.26, 2.9, 7));
  treeTrunkGeo.translate(0, 1.45, 0);
  const treeTrunkMat = regMat(
    new THREE.MeshStandardMaterial({ color: 0x574031, roughness: 0.92 }),
  );
  const allBroadleafTrunks = [
    ...placements.ipesYellow,
    ...placements.ipesPink,
    ...placements.urbanLeafy,
  ];
  populate(treeTrunkGeo, treeTrunkMat, allBroadleafTrunks, true);

  // Sculpted 3-cluster canopy for rich organic silhouette
  const buildClusterCanopyGeo = (): THREE.BufferGeometry => {
    const c1 = new THREE.DodecahedronGeometry(1.75, 1);
    c1.scale(1.15, 0.85, 1.15);
    c1.translate(0, 3.65, 0);
    const c2 = new THREE.DodecahedronGeometry(1.2, 1);
    c2.translate(0.95, 3.25, 0.55);
    const c3 = new THREE.DodecahedronGeometry(1.15, 1);
    c3.translate(-0.85, 3.35, -0.5);
    const merged = mergeGeometriesSimple([c1, c2, c3]);
    c1.dispose();
    c2.dispose();
    c3.dispose();
    return merged;
  };
  const canopyGeo = regGeo(buildClusterCanopyGeo());

  const ipeYellowMat = regMat(
    makeWindStandardMaterial(
      { color: 0xfacc15, roughness: 0.78 },
      uniforms,
      0.22,
      0.075,
      2.2,
      2.8,
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
      { color: 0xec4899, roughness: 0.78 },
      uniforms,
      0.22,
      0.075,
      2.2,
      2.8,
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
      { color: 0x22c55e, roughness: 0.8 },
      uniforms,
      0.22,
      0.08,
      2.2,
      2.8,
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
  // 3. MATA ATLÂNTICA DENSA (Morro e Colinas Periféricas)
  // =========================================================================
  const forestTrunkGeo = regGeo(new THREE.CylinderGeometry(0.22, 0.34, 3.2, 6));
  forestTrunkGeo.translate(0, 1.6, 0);
  populate(forestTrunkGeo, treeTrunkMat, placements.atlanticForest, false);

  const forestCanopyMat = regMat(
    makeWindStandardMaterial(
      { color: 0x166534, roughness: 0.86 },
      uniforms,
      0.26,
      0.09,
      2.0,
      3.0,
      'atlantic_forest',
    ),
  );
  populate(canopyGeo, forestCanopyMat, placements.atlanticForest, true, [
    new THREE.Color(0x14532d),
    new THREE.Color(0x166534),
    new THREE.Color(0x15803d),
    new THREE.Color(0x365314),
    new THREE.Color(0x3f6212),
  ]);

  // =========================================================================
  // 4. ARBUSTOS & CANTEIROS (Median & Garden Shrubs)
  // =========================================================================
  const shrubGeo = regGeo(new THREE.DodecahedronGeometry(0.62, 1));
  shrubGeo.scale(1.2, 0.72, 1.2);
  shrubGeo.translate(0, 0.42, 0);
  const shrubMat = regMat(
    makeWindStandardMaterial(
      { color: 0x22c55e, roughness: 0.82 },
      uniforms,
      0.09,
      0.04,
      0.05,
      0.85,
      'shrub',
    ),
  );
  populate(shrubGeo, shrubMat, placements.shrubs, false, [
    new THREE.Color(0x15803d),
    new THREE.Color(0x16a34a),
    new THREE.Color(0x4d7c0f),
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
