import * as THREE from 'three';

export const WEST_ISLAND_CENTER = { x: -236, z: -14 } as const;

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
 * Organic coastline wave along the West Beach (Praia Oeste).
 */
export function westShoreWave(z: number): number {
  return Math.sin(z * 0.115) * 1.4 + Math.cos(z * 0.055) * 0.8;
}

/**
 * 0..1 envelope defining the open sandy West Beach cove along Z ∈ [-46, +9].
 */
export function westCoveMask(z: number): number {
  const s = THREE.MathUtils.smoothstep(z, -47.0, -37.0);
  const n = 1.0 - THREE.MathUtils.smoothstep(z, 2.5, 9.2);
  return s * n;
}

/**
 * Exact sand elevation on the Mainland West Beach (X <= -171.5, Z ∈ [-46, +9]).
 * Keeps the backshore dry terrace nearly flat (+0.18m → +0.04m) for zero-clipping
 * kiosks, sports court & loungers, then curves smoothly to -1.25m waterline & -2.6m seabed.
 */
export function westMainlandBeachY(x: number, z: number): number {
  const distOut = Math.max(0, -171.5 - x);
  const wave = westShoreWave(z);
  const mask = westCoveMask(z);

  // When mask drops near 0 (north/south headlands), foreshore retracts cleanly
  const drySpan = 10.2 * mask;
  const slopeSpan = (12.0 + wave) * (0.25 + 0.75 * mask);

  if (distOut <= drySpan) {
    const t = drySpan > 0.01 ? distOut / drySpan : 0;
    return THREE.MathUtils.lerp(0.18, 0.02, t);
  }
  const tSlope = THREE.MathUtils.clamp((distOut - drySpan) / Math.max(2.0, slopeSpan), 0, 1);
  return THREE.MathUtils.lerp(0.02, -2.6, THREE.MathUtils.smoothstep(tSlope, 0, 1));
}

/**
 * Organic perimeter radius to the -1.25m waterline of Ilha do Sol (West Lagoon Island).
 */
export function westIslandRadiusAt(dx: number, dz: number): number {
  const theta = Math.atan2(dz, dx);
  return (
    26.5 +
    2.8 * Math.cos(2 * theta - 0.5) +
    1.8 * Math.sin(3 * theta + 0.7) +
    0.9 * Math.cos(4 * theta + 1.2)
  );
}

/**
 * Continuous heightfield for Ilha do Sol centered at (-236, -14).
 * Waterline (-1.25m) sits at u = 1.0; beach rim spans u ∈ [0.80, 1.22];
 * lush interior trails sit around +1.0m..+2.3m with a SW forested peak up to +6.4m.
 */
export function westIslandTerrainY(x: number, z: number): number {
  const dx = x - WEST_ISLAND_CENTER.x;
  const dz = z - WEST_ISLAND_CENTER.z;
  const r = Math.hypot(dx, dz);
  const rShore = westIslandRadiusAt(dx, dz);
  const u = r / rShore;

  if (u >= 1.24) return -2.6;

  // Outer underwater drop & sandy island shoreline through -1.25m at u = 1.0
  if (u >= 0.80) {
    const t = THREE.MathUtils.clamp((u - 0.80) / 0.44, 0, 1);
    return THREE.MathUtils.lerp(0.45, -2.6, THREE.MathUtils.smoothstep(t, 0, 1));
  }

  // Interior terrain smoothly rising from +0.45m beach rim up to +2.2m plateau
  const tIn = THREE.MathUtils.clamp((0.80 - u) / 0.65, 0, 1);
  let y = 0.45 + THREE.MathUtils.smoothstep(tIn, 0, 1) * 1.75;

  // Lush forested hillock in the SW interior around (-243, -22)
  const hillDist = Math.hypot(x - -243, z - -22);
  if (hillDist < 18.0) {
    const ht = 1.0 - THREE.MathUtils.smoothstep(hillDist, 0, 18.0);
    y += ht * 3.9;
  }

  // Gentle flattening around East Pier Arrival Plaza (-211, -14) so bridge landing is level
  const pierDist = Math.hypot(x - -211.5, z - -14);
  if (pierDist < 5.8) {
    const pt = 1.0 - THREE.MathUtils.smoothstep(pierDist, 2.0, 5.8);
    y = THREE.MathUtils.lerp(y, 0.72, pt);
  }

  return y;
}

/**
 * Continuous terrain height across the entire city basin, West Beach, West Bay,
 * Offshore Island (Ilha do Sol) and lush outer coastal hills.
 */
export function cityBasinTerrainY(x: number, z: number): number {
  // 1. Keep main river channel deeply recessed (Z = 7.5 .. 26.5, X >= -172)
  if (z > 7.5 && z < 26.5 && x >= -172) {
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

  // 3. Flat West Coastal Drive & Copacabana Boardwalk Zone (X ∈ [-171.6, -153.2], Z ∈ [-41.5, +7.5])
  if (x <= -153.2 && x >= -171.6 && z >= -41.5 && z <= 7.5) {
    return cityRoadY(Math.max(z, -39.5));
  }

  // 4. Open West Bay Lagoon + West Beach Cove + Offshore Tropical Island (X < -171.5, Z ∈ [-56, +34])
  if (x < -171.5 && z >= -56 && z <= 34) {
    const coveY = z >= -47 && z <= 9.5 ? westMainlandBeachY(x, z) : -2.6;
    const islandY = westIslandTerrainY(x, z);
    let bayY = Math.max(coveY, islandY);

    // Smoothly rise into northern coastal reforestation park for Z > 25.5 (away from island)
    if (z > 25.5) {
      const nt = THREE.MathUtils.smoothstep(z, 25.5, 34.0);
      const parkH = 0.4 + Math.max(0, (-171.5 - x) * 0.035);
      bayY = THREE.MathUtils.lerp(bayY, parkH, nt);
    }
    // Smoothly rise into southern coastal bluff for Z < -45.5
    if (z < -45.5) {
      const st = THREE.MathUtils.smoothstep(-z, 45.5, 56.0);
      const bluffH = cityRoadY(z) + Math.min(4.2, Math.max(0, (-171.5 - x) * 0.04));
      bayY = THREE.MathUtils.lerp(bayY, bluffH, st);
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
    // Only elevate hills outside the coastal drive/bay corridor (NW Z > 30 or SW Z < -46)
    const distFromBay = z > 30 ? THREE.MathUtils.smoothstep(z, 30, 56) : z < -46 ? THREE.MathUtils.smoothstep(-z, 46, 72) : 0;
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
