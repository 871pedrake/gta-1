import * as THREE from 'three';

export interface IslandSpec {
  id: string;
  name: string;
  x: number;
  z: number;
  baseRadius: number;
  maxHeight: number;
  hillOffsetX: number;
  hillOffsetZ: number;
  hillBoost: number;
  seed: number;
}

export const WEST_ISLAND_CENTER = { x: -268, z: -12 } as const;

export const WEST_ISLANDS: IslandSpec[] = [
  {
    id: 'sol',
    name: 'Ilha do Sol',
    x: -268,
    z: -12,
    baseRadius: 29.5,
    maxHeight: 2.3,
    hillOffsetX: -7,
    hillOffsetZ: -8,
    hillBoost: 4.1,
    seed: 0.0,
  },
  {
    id: 'restinga',
    name: 'Ilha da Restinga',
    x: -258,
    z: -64,
    baseRadius: 16.5,
    maxHeight: 1.45,
    hillOffsetX: -3,
    hillOffsetZ: -2,
    hillBoost: 1.1,
    seed: 1.4,
  },
  {
    id: 'farol',
    name: 'Ilha do Farol',
    x: -304,
    z: 32,
    baseRadius: 22.0,
    maxHeight: 2.4,
    hillOffsetX: -4,
    hillOffsetZ: 3,
    hillBoost: 4.8,
    seed: 2.7,
  },
  {
    id: 'morro_verde',
    name: 'Ilha do Morro Verde',
    x: -298,
    z: -104,
    baseRadius: 25.0,
    maxHeight: 2.8,
    hillOffsetX: -6,
    hillOffsetZ: -5,
    hillBoost: 6.2,
    seed: 4.1,
  },
  {
    id: 'pedras',
    name: 'Ilhote das Pedras',
    x: -222,
    z: 26,
    baseRadius: 10.5,
    maxHeight: 1.4,
    hillOffsetX: -1.5,
    hillOffsetZ: 1.0,
    hillBoost: 1.9,
    seed: 5.5,
  },
];

/**
 * Unified elevation profile for Metrópole Cidade Nova.
 * Creates an unmistakable low district (Cais Baixo -0.85m / Rio -1.25m / Baixada 0.0m)
 * and a dramatic high district (Cidade Alta +9.0m / Mirante Alto da Serra Sul +13.8m /
 * Serra da Nascente Norte +26m), connected by smooth ~11° paved slopes ("ladeiras").
 */
export function cityRoadY(z: number): number {
  if (z >= -39.5) return 0;
  if (z > -62.5) {
    const t = (-39.5 - z) / 23.0;
    return 4.5 * THREE.MathUtils.smoothstep(t, 0, 1);
  }
  if (z >= -73.5) return 4.5;
  if (z > -96.5) {
    const t = (-73.5 - z) / 23.0;
    return 4.5 + 4.5 * THREE.MathUtils.smoothstep(t, 0, 1);
  }
  return 9.0;
}

/**
 * Approximate longitudinal slope dY/dZ along N-S avenues on cityRoadY(z).
 */
export function cityRoadSlopeDZ(z: number): number {
  const eps = 0.25;
  return (cityRoadY(z + eps) - cityRoadY(z - eps)) / (2 * eps);
}

/**
 * Exact flat terrace elevation for any standard 23m x 23m urban block centered at `cz`.
 */
export function blockTerraceY(cz: number): number {
  if (Math.abs(cz - -17) < 2) return 0.0;
  if (Math.abs(cz - -51) < 2) return 2.25;
  if (Math.abs(cz - -85) < 2) return 6.75;
  if (Math.abs(cz - -119) < 2) return 9.0;
  return cityRoadY(cz);
}

/**
 * Meandering centerline X coordinate of the mountain creek ("Córrego da Esperança")
 * flowing from the North Spring (Nascente at X=+84, Z=114) down to the River (X=+86, Z=26.5).
 */
export function creekCenterX(z: number): number {
  const t = THREE.MathUtils.clamp((114 - z) / (114 - 26.5), 0, 1);
  return 85 + Math.sin(t * Math.PI * 2.2) * 3.4 - Math.cos(t * Math.PI) * 1.1;
}

/**
 * Organic crescent coastline wave along the expanded Grand West Beach (Z ∈ [-116, +10]).
 */
export function westShoreWave(z: number): number {
  const bayCurve = Math.sin(THREE.MathUtils.clamp((z + 114) / 122, 0, 1) * Math.PI) * 6.8;
  return bayCurve + Math.sin(z * 0.075) * 2.1 + Math.cos(z * 0.042) * 1.2;
}

/**
 * 0..1 envelope defining the expansive sandy West Beach cove along Z ∈ [-116, +10].
 */
export function westCoveMask(z: number): number {
  const s = THREE.MathUtils.smoothstep(z, -116.5, -96.0);
  const n = 1.0 - THREE.MathUtils.smoothstep(z, 1.5, 10.5);
  return s * n;
}

/**
 * Exact sand elevation on the Grand Mainland West Beach (X <= -176.2, Z ∈ [-116, +10]).
 * Sits ~1.05m below the Grand Calçadão (+0.30m) so broad granite staircases &
 * curved amphitheater terraces descend onto an expansive 21–28m dry golden sand terrace
 * (-0.72m → -0.92m), then curve gently through wet foreshore to -1.25m surf & -2.65m seabed.
 */
export function westMainlandBeachY(x: number, z: number): number {
  const distOut = Math.max(0, -176.2 - x);
  const wave = westShoreWave(z);
  const mask = westCoveMask(z);

  const drySpan = (20.5 + wave * 0.85) * mask;
  const slopeSpan = (15.5 + wave * 0.55) * (0.28 + 0.72 * mask);

  if (distOut <= drySpan) {
    const t = drySpan > 0.01 ? distOut / drySpan : 0;
    const ripple = Math.sin(x * 0.28 + z * 0.16) * 0.022 * mask;
    return THREE.MathUtils.lerp(-0.72, -0.92, t) + ripple;
  }
  const tSlope = THREE.MathUtils.clamp((distOut - drySpan) / Math.max(2.5, slopeSpan), 0, 1);
  return THREE.MathUtils.lerp(-0.92, -2.65, THREE.MathUtils.smoothstep(tSlope, 0, 1));
}

/**
 * Organic perimeter radius to the -1.25m waterline for any island spec.
 */
export function islandShoreRadiusAt(spec: IslandSpec, dx: number, dz: number): number {
  const theta = Math.atan2(dz, dx);
  const scale = spec.baseRadius / 26.5;
  return (
    spec.baseRadius +
    scale *
      (2.8 * Math.cos(2 * theta - 0.5 + spec.seed) +
        1.8 * Math.sin(3 * theta + 0.7 + spec.seed * 1.3) +
        0.9 * Math.cos(4 * theta + 1.2 - spec.seed))
  );
}

/**
 * Backwards-compatible shoreline radius helper for Ilha do Sol.
 */
export function westIslandRadiusAt(dx: number, dz: number): number {
  return islandShoreRadiusAt(WEST_ISLANDS[0], dx, dz);
}

/**
 * Terrain heightfield for a single island spec.
 */
export function singleIslandTerrainY(spec: IslandSpec, x: number, z: number): number {
  const dx = x - spec.x;
  const dz = z - spec.z;
  const r = Math.hypot(dx, dz);
  const rShore = islandShoreRadiusAt(spec, dx, dz);
  const u = r / rShore;

  if (u >= 1.24) return -2.65;

  if (u >= 0.80) {
    const t = THREE.MathUtils.clamp((u - 0.80) / 0.44, 0, 1);
    return THREE.MathUtils.lerp(0.45, -2.65, THREE.MathUtils.smoothstep(t, 0, 1));
  }

  const tIn = THREE.MathUtils.clamp((0.80 - u) / 0.65, 0, 1);
  let y = 0.45 + THREE.MathUtils.smoothstep(tIn, 0, 1) * (spec.maxHeight - 0.45);

  const hillR = spec.baseRadius * 0.62;
  const hillDist = Math.hypot(x - (spec.x + spec.hillOffsetX), z - (spec.z + spec.hillOffsetZ));
  if (hillDist < hillR) {
    const ht = 1.0 - THREE.MathUtils.smoothstep(hillDist, 0, hillR);
    y += ht * spec.hillBoost;
  }

  // Flatten eastern landing apron on Ilha do Sol so bridge arrives level
  if (spec.id === 'sol') {
    const pierDist = Math.hypot(x - (spec.x + 26.5), z - spec.z);
    if (pierDist < 5.8) {
      const pt = 1.0 - THREE.MathUtils.smoothstep(pierDist, 2.0, 5.8);
      y = THREE.MathUtils.lerp(y, 0.72, pt);
    }
  }

  return y;
}

/**
 * Combined terrain heightfield across all 5 islands in the West Archipelago.
 */
export function westIslandTerrainY(x: number, z: number): number {
  let best = -2.65;
  for (let i = 0; i < WEST_ISLANDS.length; i++) {
    const y = singleIslandTerrainY(WEST_ISLANDS[i], x, z);
    if (y > best) best = y;
  }
  return best;
}

/**
 * Continuous terrain height across the entire city basin, Grand West Beach,
 * West Archipelago (5 islands) and lush outer coastal hills.
 */
export function cityBasinTerrainY(x: number, z: number): number {
  // 1. Keep main river channel deeply recessed (Z = 7.5 .. 26.5, X >= -176.2)
  if (z > 7.5 && z < 26.5 && x >= -176.2) {
    const edge = Math.min(z - 7.5, 26.5 - z);
    const depth = THREE.MathUtils.smoothstep(edge, 0, 2.2) * 2.55;
    return -depth;
  }

  // 2. Carve recessed culvert channel beneath Marginal Norte boardwalk/road around X = creekCenterX(z)
  if (z >= 26.5 && z <= 41.5 && x > 65 && x < 105) {
    const dCreek = Math.abs(x - creekCenterX(z));
    if (dCreek < 4.5) {
      const cut = (1 - THREE.MathUtils.smoothstep(dCreek, 1.4, 4.5)) * 1.45;
      return -cut;
    }
  }

  // 3. Flat West Coastal Drive & Grand Calçadão Superior Zone (X ∈ [-176.2, -156.4], Z ∈ [-112.0, +7.6])
  if (x <= -156.4 && x >= -176.2 && z >= -112.0 && z <= 7.6) {
    return 0.0;
  }

  // 3B. Smooth green bluff transition from coastal drive (X = -156.4 @ 0m) up to western city elevation (X = -153.2 @ cityRoadY(z))
  if (x > -156.4 && x <= -153.2 && z >= -114.0 && z <= 7.6) {
    const blend = THREE.MathUtils.smoothstep(x, -156.4, -153.2);
    return THREE.MathUtils.lerp(0.0, cityRoadY(z), blend);
  }

  // 4. Open West Bay Lagoon + Grand West Beach + 5-Island Tropical Archipelago (X < -176.0, Z ∈ [-142, +64])
  if (x < -176.0 && z >= -142 && z <= 64) {
    const coveY = z >= -116.5 && z <= 10.5 ? westMainlandBeachY(x, z) : -2.65;
    const islandY = westIslandTerrainY(x, z);
    let bayY = Math.max(coveY, islandY);

    // Smoothly rise into northern coastal headland park only east of -184 and north of Z = +34
    if (z > 34.0 && x > -188.0) {
      const ntZ = THREE.MathUtils.smoothstep(z, 34.0, 52.0);
      const ntX = THREE.MathUtils.smoothstep(x, -188.0, -176.0);
      bayY = THREE.MathUtils.lerp(bayY, 1.8, ntZ * ntX);
    }
    // Dramatic southern dune headland ("Morro da Duna Sul") framing the south end of the beach for Z < -114
    if (z < -114.0) {
      const st = THREE.MathUtils.smoothstep(-z, 114.0, 134.0);
      const bluffH = 2.4 + Math.min(7.8, Math.max(0, (-176.0 - x) * 0.085));
      bayY = THREE.MathUtils.lerp(bayY, Math.max(islandY, bluffH), st * (x > -248 ? 1.0 : 0.0));
    }
    return bayY;
  }

  let base = cityRoadY(z);

  // 5. Rolling lush green hills framing outer E/W edges & NW/SW reforestation flanks
  if (x > 155) {
    const overX = Math.min(1, (x - 155) / 60);
    const wave = 0.5 + 0.5 * Math.sin(z * 0.055 + 1.0);
    base += overX * overX * (6.8 + wave * 5.2);
  } else if (x < -155) {
    // Only elevate hills outside the expanded coastal drive/bay corridor (NW Z > 34 or SW Z < -114)
    const distFromBay =
      z > 34 ? THREE.MathUtils.smoothstep(z, 34, 62) : z < -114 ? THREE.MathUtils.smoothstep(-z, 114, 142) : 0;
    const overX = Math.min(1, (-155 - x) / 68);
    const wave = 0.5 + 0.5 * Math.sin(z * 0.06 - 0.8);
    base += distFromBay * overX * overX * (6.2 + wave * 4.8);
  }

  // 6. Dramatic Upper City Scenic Overlook / Serra Sul (Z < -130) rising from +9.0m to +14.2m
  if (z < -130) {
    const overZ = Math.min(1, (-130 - z) / 26);
    base += THREE.MathUtils.smoothstep(overZ, 0, 1) * 4.8;
    if (z < -154) {
      const ridgeZ = Math.min(1, (-154 - z) / 36);
      base += ridgeZ * ridgeZ * 6.5;
    }
  }

  return base;
}
