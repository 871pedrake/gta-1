import * as THREE from 'three';
import { CityTextureAtlas } from './cityTextures';
import { VegetationPlacement } from './cityVegetation';
import { buildCraftedVehicle } from '../vehicleBuilder';
import { VEHICLES_50 } from '../../data/vehicles50';
import { blockTerraceY, creekCenterX } from './cityElevation';

// ============================================================================
// 1. BANDEIRA MONUMENTAL (Mastro Imperial + Pedestal Octogonal + Tecido 3D)
// ============================================================================
export interface MonumentalFlagRig {
  group: THREE.Group;
  spotlights: THREE.SpotLight[];
  update: (elapsed: number, windStrength: number) => void;
}

export function createMonumentalFlag(atlas: CityTextureAtlas): MonumentalFlagRig {
  const group = new THREE.Group();
  group.name = 'Monumento_Bandeira';
  group.userData.hotspot = 'flag';

  const matGranite = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.72,
    metalness: 0.12,
  });
  const matMarble = new THREE.MeshStandardMaterial({
    color: 0xd6d3cd,
    roughness: 0.45,
    metalness: 0.08,
  });
  const matBronze = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.34,
    metalness: 0.86,
  });
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.94,
  });
  const matSteel = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    roughness: 0.24,
    metalness: 0.9,
  });
  const matRope = new THREE.MeshStandardMaterial({
    color: 0xe7e5e4,
    roughness: 0.85,
    metalness: 0.05,
  });
  const matLampBulb = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  // 3-tier octagonal stepped monument plinth
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.5, 0.34, 8), matGranite);
  tier1.position.y = 0.17;
  tier1.receiveShadow = true;
  tier1.castShadow = true;
  group.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.45, 0.36, 8), matMarble);
  tier2.position.y = 0.52;
  tier2.receiveShadow = true;
  tier2.castShadow = true;
  group.add(tier2);

  const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.25, 0.88, 8), matGranite);
  tier3.position.y = 1.14;
  tier3.receiveShadow = true;
  tier3.castShadow = true;
  group.add(tier3);

  const capRing = new THREE.Mesh(new THREE.CylinderGeometry(1.98, 1.98, 0.12, 8), matBronze);
  capRing.position.y = 1.60;
  group.add(capRing);

  // 4 bronze commemorative plaques + 4 corner illuminated bollards
  for (let i = 0; i < 4; i++) {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(ang) * 1.92;
    const pz = Math.sin(ang) * 1.92;
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.08), matBronze);
    plaque.position.set(px, 1.12, pz);
    plaque.rotation.y = -ang + Math.PI / 2;
    group.add(plaque);

    const bx = Math.cos(ang) * 3.85;
    const bz = Math.sin(ang) * 3.85;
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.95, 10), matBronze);
    bollard.position.set(bx, 0.48, bz);
    bollard.castShadow = true;
    group.add(bollard);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.16, 10), matLampBulb);
    lens.position.set(bx, 0.88, bz);
    group.add(lens);
  }

  // Lathe ornamental mast base collar
  const collarPts = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.68, 0),
    new THREE.Vector2(0.62, 0.18),
    new THREE.Vector2(0.45, 0.34),
    new THREE.Vector2(0.34, 0.62),
    new THREE.Vector2(0.24, 0.85),
    new THREE.Vector2(0.20, 1.05),
  ];
  const collarMesh = new THREE.Mesh(new THREE.LatheGeometry(collarPts, 24), matBronze);
  collarMesh.position.y = 1.65;
  collarMesh.castShadow = true;
  group.add(collarMesh);

  // Tapered telescopic flagpole (19.5m above pedestal -> ~21.2m peak)
  const poleHeight = 19.6;
  const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.20, poleHeight, 20), matSteel);
  poleMesh.position.y = 1.65 + poleHeight * 0.5;
  poleMesh.castShadow = true;
  group.add(poleMesh);

  // Ornamental gold ring collars along mast
  [5.5, 10.5, 15.5, 20.8].forEach((hy, idx) => {
    const r = 0.21 - idx * 0.032;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 24), matGold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = hy;
    group.add(ring);
  });

  // Gilded finial sphere + 8-point sculpted star crown at apex
  const apexY = 1.65 + poleHeight;
  const finialOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), matGold);
  finialOrb.position.y = apexY + 0.18;
  group.add(finialOrb);

  const finialSpire = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.52, 8), matGold);
  finialSpire.position.y = apexY + 0.56;
  group.add(finialSpire);

  // Pulley sheave & taut halyard rope
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 14), matBronze);
  pulley.rotation.z = Math.PI / 2;
  pulley.position.set(0.16, apexY - 0.18, 0);
  group.add(pulley);

  const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.06), matBronze);
  cleat.position.set(0.22, 3.2, 0);
  group.add(cleat);

  const halyardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.19, 3.2, 0),
    new THREE.Vector3(0.24, 9.5, 0.08),
    new THREE.Vector3(0.17, apexY - 0.18, 0),
  ]);
  const halyard = new THREE.Mesh(new THREE.TubeGeometry(halyardCurve, 20, 0.018, 6, false), matRope);
  group.add(halyard);

  // Monumental Cloth Flag (6.8m x 4.4m, 34 x 20 segments — smooth wave with 3x fewer vertices)
  const flagW = 6.8;
  const flagH = 4.4;
  const segX = 34;
  const segY = 20;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, segX, segY);
  // Shift so x = 0 is the hoist edge attached to the mast!
  flagGeo.translate(flagW * 0.5 + 0.15, 0, 0);

  const basePositions = new Float32Array(flagGeo.attributes.position.array);

  const flagMat = new THREE.MeshStandardMaterial({
    map: atlas.flagAlbedo,
    bumpMap: atlas.flagBump,
    bumpScale: 0.025,
    roughness: 0.6,
    metalness: 0.04,
    emissive: 0x3f2e18,
    emissiveIntensity: 0.22,
    side: THREE.DoubleSide,
  });

  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.y = apexY - flagH * 0.5 - 0.28;
  flagMesh.castShadow = true;
  flagMesh.receiveShadow = true;
  group.add(flagMesh);

  // Brass hoist rings clamping flag header onto mast
  for (let g = 0; g < 5; g++) {
    const gy = flagMesh.position.y + flagH * 0.42 - g * (flagH * 0.21);
    const clip = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 16), matGold);
    clip.rotation.x = Math.PI / 2;
    clip.position.set(0.06, gy, 0);
    group.add(clip);
  }

  // Keep spotlights array empty to avoid extra per-pixel spotlight evaluations across city shaders
  const spotlights: THREE.SpotLight[] = [];

  const update = (elapsed: number, windStrength: number) => {
    const posAttr = flagGeo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const wind = THREE.MathUtils.clamp(windStrength, 0.15, 2.0);
    const speed = 2.6 + wind * 2.1;

    for (let i = 0; i < arr.length; i += 3) {
      const bx = basePositions[i];
      const by = basePositions[i + 1];
      const u = THREE.MathUtils.clamp((bx - 0.15) / flagW, 0, 1);
      const env = Math.pow(u, 1.18);

      // Multi-harmonic wind wave + diagonal crease + gentle gravity droop at low wind
      const wave1 = Math.sin(u * 6.4 - elapsed * speed + by * 0.35) * 0.44 * wind;
      const wave2 = Math.sin(u * 13.5 - elapsed * (speed * 1.45) - by * 0.85) * 0.13 * wind;
      const flutter = Math.cos(u * 21.0 - elapsed * (speed * 2.2) + by * 1.6) * 0.045 * wind;

      const zDisp = (wave1 + wave2 + flutter) * env;
      const droopY = -(1.0 - Math.min(wind, 1.2) * 0.48) * 0.52 * u * u;
      const xPull = -0.24 * env * (0.4 + 0.3 * Math.sin(u * 5.0 - elapsed * speed));

      arr[i] = bx + xPull;
      arr[i + 1] = by + droopY + Math.sin(u * 4.5 - elapsed * speed * 0.8) * 0.06 * env;
      arr[i + 2] = zDisp;
    }

    posAttr.needsUpdate = true;
    flagGeo.computeVertexNormals();
  };

  return { group, spotlights, update };
}

// ============================================================================
// 2. SEMÁFOROS FUNCIONAIS & POSTES URBANOS
// ============================================================================
export interface TrafficLightRig {
  group: THREE.Group;
  axis: 'x' | 'z';
  setPhase: (state: 'green' | 'amber' | 'red') => void;
}

const TL_POLE_MAT = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.75 });
const TL_BOX_MAT = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.4 });
const TL_BASE_GEO = new THREE.CylinderGeometry(0.18, 0.24, 0.55, 8);
const TL_ARM_GEO = new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 0),
    new THREE.Vector3(0, 5.2, 0),
    new THREE.Vector3(0.45, 5.85, 0),
    new THREE.Vector3(3.2, 5.85, 0),
  ]),
  14,
  0.09,
  6,
  false,
);
const TL_HOUSING_GEO = new THREE.BoxGeometry(0.46, 1.25, 0.42);
const TL_LENS_GEO = new THREE.CylinderGeometry(0.13, 0.13, 0.46, 10);
TL_LENS_GEO.rotateX(Math.PI / 2);
const TL_HOOD_GEO = new THREE.BoxGeometry(0.32, 0.06, 0.22);
const TL_PED_GEO = new THREE.BoxGeometry(0.28, 0.42, 0.24);

const TL_SIGNAL_MATS = {
  z: {
    red: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 0.06 }),
    amb: new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xf59e0b, emissiveIntensity: 0.06 }),
    grn: new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x22c55e, emissiveIntensity: 2.6 }),
  },
  x: {
    red: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 2.6 }),
    amb: new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xf59e0b, emissiveIntensity: 0.06 }),
    grn: new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x22c55e, emissiveIntensity: 0.06 }),
  },
};

export function createTrafficLightRig(axis: 'x' | 'z'): TrafficLightRig {
  const group = new THREE.Group();

  const base = new THREE.Mesh(TL_BASE_GEO, TL_POLE_MAT);
  base.position.y = 0.275;
  group.add(base);

  const arm = new THREE.Mesh(TL_ARM_GEO, TL_POLE_MAT);
  group.add(arm);

  const housing = new THREE.Mesh(TL_HOUSING_GEO, TL_BOX_MAT);
  housing.position.set(2.9, 5.42, 0);
  group.add(housing);

  const mats = TL_SIGNAL_MATS[axis];
  const makeLens = (y: number, mat: THREE.MeshStandardMaterial) => {
    const lens = new THREE.Mesh(TL_LENS_GEO, mat);
    lens.position.set(2.9, y, 0);
    group.add(lens);

    const hoodF = new THREE.Mesh(TL_HOOD_GEO, TL_BOX_MAT);
    hoodF.position.set(2.9, y + 0.15, 0.25);
    group.add(hoodF);

    const hoodB = new THREE.Mesh(TL_HOOD_GEO, TL_BOX_MAT);
    hoodB.position.set(2.9, y + 0.15, -0.25);
    group.add(hoodB);
  };

  makeLens(5.78, mats.red);
  makeLens(5.42, mats.amb);
  makeLens(5.06, mats.grn);

  const pedBox = new THREE.Mesh(TL_PED_GEO, TL_BOX_MAT);
  pedBox.position.set(0.18, 2.75, 0);
  group.add(pedBox);

  const setPhase = (state: 'green' | 'amber' | 'red') => {
    mats.red.emissiveIntensity = state === 'red' ? 2.6 : 0.06;
    mats.amb.emissiveIntensity = state === 'amber' ? 2.6 : 0.06;
    mats.grn.emissiveIntensity = state === 'green' ? 2.6 : 0.06;
  };

  return { group, axis, setPhase };
}

const SL_METAL_MAT = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 });
const SL_PLINTH_GEO = new THREE.CylinderGeometry(0.15, 0.20, 0.65, 8);
const SL_SHAFT_GEO = new THREE.CylinderGeometry(0.065, 0.11, 6.8, 8);
const SL_ARM_GEO = new THREE.BoxGeometry(1.45, 0.08, 0.09);
const SL_HEAD_GEO = new THREE.BoxGeometry(0.55, 0.12, 0.26);
const SL_BULB_GEO = new THREE.BoxGeometry(0.42, 0.06, 0.20);

export function createStreetlightRig(
  doubleArm = false,
  lampMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();

  const plinth = new THREE.Mesh(SL_PLINTH_GEO, SL_METAL_MAT);
  plinth.position.y = 0.325;
  g.add(plinth);

  const shaft = new THREE.Mesh(SL_SHAFT_GEO, SL_METAL_MAT);
  shaft.position.y = 3.7;
  g.add(shaft);

  const addArm = (dir: number) => {
    const arm = new THREE.Mesh(SL_ARM_GEO, SL_METAL_MAT);
    arm.position.set(dir * 0.7, 7.05, 0);
    arm.rotation.z = dir * 0.14;
    g.add(arm);

    const head = new THREE.Mesh(SL_HEAD_GEO, SL_METAL_MAT);
    head.position.set(dir * 1.32, 7.12, 0);
    g.add(head);

    const bulb = new THREE.Mesh(SL_BULB_GEO, lampMat);
    bulb.position.set(dir * 1.32, 7.04, 0);
    g.add(bulb);
  };

  addArm(1);
  if (doubleArm) addArm(-1);
  return g;
}

// ============================================================================
// 3. PONTES CONECTADAS (3 ESTAIADAS MONUMENTAIS + ARCO METÁLICO + CONCRETO)
// ============================================================================
export function createConnectedBridges(
  atlas: CityTextureAtlas,
  lampMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Pontes_Conectadas';
  root.userData.hotspot = 'bridges';

  const matConcrete = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.78, metalness: 0.08 });
  const matDeckAsphalt = new THREE.MeshStandardMaterial({
    map: atlas.asphalt,
    color: 0x454952,
    roughness: 0.85,
  });
  const matWhiteSteel = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.32, metalness: 0.65 });
  const matGoldCable = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 });
  const matSilverCable = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
  const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.45, metalness: 0.75 });
  const matYellowStripe = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });

  // Helper to build a bridge deck perfectly flush with avenue asphalt (Z = 8 .. 26, len = 18.4m)
  const buildFlushBridgeDeck = (cx: number, width: number, pylonAtSides: boolean) => {
    const bg = new THREE.Group();
    bg.position.set(cx, 0, 17);

    // Asphalt deck flush at y = 0.04
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.45, 18.6), matDeckAsphalt);
    deck.position.y = -0.185;
    deck.receiveShadow = true;
    bg.add(deck);

    // Center double yellow line
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 18.4), matYellowStripe);
    stripe.position.y = 0.05;
    bg.add(stripe);

    // Sidewalks & safety guardrails on both sides
    [-1, 1].forEach((side) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 18.6), matConcrete);
      sw.position.set(side * (width * 0.5 + 0.7), 0.11, 0);
      sw.receiveShadow = true;
      bg.add(sw);

      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 18.6), matDarkSteel);
      rail.position.set(side * (width * 0.5 + 1.32), 0.68, 0);
      bg.add(rail);

      // Piers sitting in river bed
      [-5.4, 5.4].forEach((pz) => {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.0, 1.5), matConcrete);
        pier.position.set(side * (width * 0.46), -1.5, pz);
        bg.add(pier);
      });

      if (pylonAtSides) {
        [-6.5, 6.5].forEach((lz) => {
          const lamp = createStreetlightRig(false, lampMat);
          lamp.position.set(side * (width * 0.5 + 0.9), 0.22, lz);
          lamp.rotation.y = side > 0 ? Math.PI : 0;
          bg.add(lamp);
        });
      }
    });

    return bg;
  };

  const addCableStayedPylons = (
    bridge: THREE.Group,
    halfSpanX: number,
    height: number,
    cableMat: THREE.Material,
  ) => {
    [-halfSpanX, halfSpanX].forEach((sideX) => {
      [-1.45, 1.45].forEach((legZ) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.92, height, 0.96), matWhiteSteel);
        leg.position.set(sideX, height * 0.49, legZ * 0.45);
        leg.rotation.x = legZ > 0 ? 0.075 : -0.075;
        leg.castShadow = true;
        bridge.add(leg);
      });
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.92, 2.3), matWhiteSteel);
      crossBeam.position.set(sideX, height * 0.76, 0);
      bridge.add(crossBeam);

      // Architectural night uplight strips on pylons
      const pylonGlow = new THREE.Mesh(new THREE.BoxGeometry(0.18, height * 0.72, 0.28), lampMat);
      pylonGlow.position.set(sideX - Math.sign(sideX) * 0.48, height * 0.52, 0);
      bridge.add(pylonGlow);

      // Stay cables fanning from top of pylon down to deck edges
      const topPos = new THREE.Vector3(sideX, height * 0.92, 0);
      [-8.0, -6.0, -4.0, -2.2, 2.2, 4.0, 6.0, 8.0].forEach((dz) => {
        const anchorPos = new THREE.Vector3(sideX * 0.92, 0.35, dz);
        const dir = new THREE.Vector3().subVectors(anchorPos, topPos);
        const len = dir.length();
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, len, 6), cableMat);
        cable.position.copy(topPos).addScaledVector(dir, 0.5);
        cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        bridge.add(cable);
      });
    });
  };

  // A) PONTE ESTAIADA MONUMENTAL CENTRAL (Avenida Central X = 0)
  const estaiadaCentral = buildFlushBridgeDeck(0, 11.4, true);
  addCableStayedPylons(estaiadaCentral, 7.2, 20.5, matGoldCable);
  root.add(estaiadaCentral);

  // B) PONTE EM ARCO METÁLICO (Avenida Oeste X = -34)
  const arco = buildFlushBridgeDeck(-34, 10.8, true);
  [-6.0, 6.0].forEach((sideX) => {
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideX, 0.2, -9.0),
      new THREE.Vector3(sideX, 4.8, -4.5),
      new THREE.Vector3(sideX, 6.8, 0),
      new THREE.Vector3(sideX, 4.8, 4.5),
      new THREE.Vector3(sideX, 0.2, 9.0),
    ]);
    const archTube = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 24, 0.30, 8, false), matDarkSteel);
    archTube.castShadow = true;
    arco.add(archTube);

    [-5.8, -3.0, 0, 3.0, 5.8].forEach((sz) => {
      const h = 6.8 * (1 - (sz / 9.3) * (sz / 9.3));
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, Math.max(0.5, h), 6), matGoldCable);
      hanger.position.set(sideX, h * 0.5 + 0.2, sz);
      arco.add(hanger);
    });
  });
  root.add(arco);

  // C) PONTE DE CONCRETO ILUMINADA (Avenida Leste X = +34)
  const concreto = buildFlushBridgeDeck(34, 10.8, true);
  root.add(concreto);

  // D) PONTES ESTAIADAS PERIFÉRICAS (X = -68 & X = +68)
  const estaiadaOeste = buildFlushBridgeDeck(-68, 10.8, true);
  addCableStayedPylons(estaiadaOeste, 6.9, 17.2, matSilverCable);
  root.add(estaiadaOeste);

  const estaiadaLeste = buildFlushBridgeDeck(68, 10.8, true);
  addCableStayedPylons(estaiadaLeste, 6.9, 17.2, matSilverCable);
  root.add(estaiadaLeste);

  return root;
}

// ============================================================================
// 4. RUA DAS LOJAS 2.0 & SHOPPING METRÓPOLE + PASSARELA AÉREA
// ============================================================================
export interface ShopAnimatedParts {
  barberPole?: THREE.Mesh;
  showroomCar?: THREE.Group;
  showroomBase?: THREE.Mesh;
}

export function createShopsAndShoppingDistrict(
  atlas: CityTextureAtlas,
  windowEmissiveMat: THREE.MeshStandardMaterial,
): { group: THREE.Group; animated: ShopAnimatedParts } {
  const root = new THREE.Group();
  root.name = 'Comercio_Lojas_Shopping';
  root.userData.hotspot = 'shops';

  const animated: ShopAnimatedParts = {};

  const matAcmBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.55 });
  const matAcmAmber = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.45 });
  const matDarkFrame = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.65 });
  const matConcrete = new THREE.MeshStandardMaterial({ color: 0xb5b2ab, roughness: 0.78 });
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.52,
    transparent: true,
    opacity: 0.52,
  });

  // --------------------------------------------------------------------------
  // A) SHOPPING METRÓPOLE (X = +17, Z = -17) + PASSARELA AÉREA SOBRE X = +34
  // --------------------------------------------------------------------------
  const shop = new THREE.Group();
  shop.position.set(17, 0.2, -17);

  const mainMall = new THREE.Mesh(new THREE.BoxGeometry(20, 10.5, 19), matAcmBlue);
  mainMall.position.y = 5.25;
  mainMall.castShadow = true;
  mainMall.receiveShadow = true;
  shop.add(mainMall);

  const orangeBand = new THREE.Mesh(new THREE.BoxGeometry(20.4, 2.1, 19.4), matAcmAmber);
  orangeBand.position.y = 9.2;
  shop.add(orangeBand);

  // Atrium glass entrance facing Plaza (West / -X) & Avenue (North / +Z)
  const atrium = new THREE.Mesh(new THREE.BoxGeometry(10.5, 6.2, 1.4), matGlass);
  atrium.position.set(0, 3.1, 9.4);
  shop.add(atrium);

  const mallMarquee = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.45, 3.2), matAcmAmber);
  mallMarquee.position.set(0, 4.8, 10.6);
  mallMarquee.castShadow = true;
  shop.add(mallMarquee);

  const mallSignMat = new THREE.MeshStandardMaterial({
    map: atlas.shopSigns[5],
    emissive: 0xffffff,
    emissiveMap: atlas.shopSigns[5],
    emissiveIntensity: 0.7,
    roughness: 0.25,
  });
  const mallSign = new THREE.Mesh(new THREE.BoxGeometry(13, 2.5, 0.35), mallSignMat);
  mallSign.position.set(0, 11.4, 9.5);
  shop.add(mallSign);

  // Interior glowing vitrine strip
  const mallVitrine = new THREE.Mesh(new THREE.BoxGeometry(16, 3.2, 0.25), windowEmissiveMat);
  mallVitrine.position.set(0, 1.8, 9.6);
  shop.add(mallVitrine);

  // Bus Shelter outside Shopping
  const shelter = new THREE.Group();
  shelter.position.set(-5.8, 0, 11.2);
  const sRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 1.6), matAcmAmber);
  sRoof.position.y = 2.45;
  shelter.add(sRoof);
  const sBack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 0.1), matGlass);
  sBack.position.set(0, 1.25, -0.65);
  shelter.add(sBack);
  const sBench = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 0.55), matDarkFrame);
  sBench.position.set(0, 0.55, -0.2);
  shelter.add(sBench);
  shop.add(shelter);

  root.add(shop);

  // Estacionamento Shopping at (X = +51, Z = -17) + Passarela Aérea spanning X = +34
  const park = new THREE.Group();
  park.position.set(51, 0.2, -17);
  const parkFloor = new THREE.Mesh(new THREE.BoxGeometry(21, 0.08, 21), new THREE.MeshStandardMaterial({
    map: atlas.asphalt,
    color: 0x3f434a,
    roughness: 0.85,
  }));
  parkFloor.position.y = 0.04;
  parkFloor.receiveShadow = true;
  park.add(parkFloor);

  // Parking lane markings, parked cars & barrier gate
  const parkLineGeo = new THREE.BoxGeometry(0.12, 0.02, 4.6);
  const parkLineMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5 });
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(parkLineGeo, parkLineMat);
    line.position.set(i * 2.8, 0.09, -4.5);
    park.add(line);
    const line2 = new THREE.Mesh(parkLineGeo, parkLineMat);
    line2.position.set(i * 2.8, 0.09, 4.5);
    park.add(line2);
  }
  const parkedCarBodyGeo = new THREE.BoxGeometry(1.75, 0.65, 3.6);
  const parkedCarCabinGeo = new THREE.BoxGeometry(1.45, 0.48, 1.9);
  const parkedCarCabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.7 });
  const parkedLotColors = [0xdc2626, 0x2563eb, 0xf8fafc, 0xf59e0b, 0x10b981];
  [-7.0, -1.4, 4.2, -4.2, 7.0].forEach((px, ci) => {
    const pz = ci < 3 ? -4.5 : 4.5;
    const body = new THREE.Mesh(
      parkedCarBodyGeo,
      new THREE.MeshStandardMaterial({ color: parkedLotColors[ci], roughness: 0.35, metalness: 0.55 }),
    );
    body.position.set(px, 0.48, pz);
    park.add(body);
    const cabin = new THREE.Mesh(parkedCarCabinGeo, parkedCarCabinMat);
    cabin.position.set(px, 0.96, pz);
    park.add(cabin);
  });
  const booth = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 1.5), matConcrete);
  booth.position.set(-7.5, 1.15, 7.5);
  park.add(booth);
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  barrier.position.set(-5.0, 1.05, 7.5);
  park.add(barrier);
  root.add(park);

  // Passarela Aérea Envidraçada linking Shopping (+17) -> Estacionamento (+51) across X = 34
  const skybridge = new THREE.Group();
  skybridge.position.set(34, 6.2, -17);
  const sbFloor = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.32, 3.8), matAcmBlue);
  sbFloor.castShadow = true;
  skybridge.add(sbFloor);
  const sbGlass = new THREE.Mesh(new THREE.BoxGeometry(16.2, 2.4, 3.5), matGlass);
  sbGlass.position.y = 1.35;
  skybridge.add(sbGlass);
  const sbRoof = new THREE.Mesh(new THREE.BoxGeometry(16.8, 0.25, 4.1), matAcmAmber);
  sbRoof.position.y = 2.65;
  skybridge.add(sbRoof);
  root.add(skybridge);

  // Shopping Anexo: Galeria Moda & Multiplex Cinema at (X = +85, Z = -17)
  const annex = new THREE.Group();
  annex.position.set(85, 0.2, -13.5);
  const annexBody = new THREE.Mesh(new THREE.BoxGeometry(20, 8.2, 11), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.4 }));
  annexBody.position.y = 4.1;
  annexBody.castShadow = true;
  annexBody.receiveShadow = true;
  annex.add(annexBody);
  const annexBand = new THREE.Mesh(new THREE.BoxGeometry(20.4, 1.5, 11.4), matAcmAmber);
  annexBand.position.y = 7.4;
  annex.add(annexBand);
  const annexGlass = new THREE.Mesh(new THREE.BoxGeometry(14, 3.8, 0.4), matGlass);
  annexGlass.position.set(0, 2.1, 5.5);
  annex.add(annexGlass);
  const annexMarquee = new THREE.Mesh(new THREE.BoxGeometry(15, 0.35, 2.4), matAcmBlue);
  annexMarquee.position.set(0, 4.2, 6.3);
  annex.add(annexMarquee);
  const annexSign = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 1.9, 0.35),
    new THREE.MeshStandardMaterial({
      map: atlas.shopSigns[12],
      emissive: 0xffffff,
      emissiveMap: atlas.shopSigns[12],
      emissiveIntensity: 0.7,
    }),
  );
  annexSign.position.set(0, 9.2, 5.6);
  annex.add(annexSign);
  root.add(annex);

  // --------------------------------------------------------------------------
  // B) HELPER DE LOJAS (Suporta Patamar Baixo Y=0m e Terraço Comercial Y=+2.1m)
  // --------------------------------------------------------------------------
  const buildShopUnit = (
    idx: number,
    x: number,
    z: number,
    rotY: number,
    width: number,
    depth: number,
    height: number,
    wallColor: number,
    hasAwning: boolean,
    terraceZ = -51,
  ) => {
    const unit = new THREE.Group();
    const baseY = blockTerraceY(terraceZ) + 0.2;
    unit.position.set(x, baseY, z);
    unit.rotation.y = rotY;

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    body.position.y = height * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    unit.add(body);

    if (height > 5.5) {
      const upperMat = new THREE.MeshStandardMaterial({
        map: atlas.commercialTerreo,
        roughness: 0.45,
      });
      const upper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, height - 4.2, depth + 0.08), upperMat);
      upper.position.y = 4.2 + (height - 4.2) * 0.5;
      unit.add(upper);
    }

    const vitrineMat = new THREE.MeshStandardMaterial({
      map: atlas.shopVitrine[idx % atlas.shopVitrine.length],
      emissive: 0xffe4b5,
      emissiveMap: atlas.shopVitrine[idx % atlas.shopVitrine.length],
      emissiveIntensity: 0.52,
      roughness: 0.18,
    });
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 2.8, 0.14), vitrineMat);
    vitrine.position.set(0, 1.55, depth * 0.5 + 0.02);
    unit.add(vitrine);

    const signMat = new THREE.MeshStandardMaterial({
      map: atlas.shopSigns[idx % atlas.shopSigns.length],
      emissive: 0xffffff,
      emissiveMap: atlas.shopSigns[idx % atlas.shopSigns.length],
      emissiveIntensity: 0.68,
      roughness: 0.25,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 1.25, 0.22), signMat);
    sign.position.set(0, 3.85, depth * 0.5 + 0.16);
    unit.add(sign);

    if (hasAwning) {
      const awningMat = new THREE.MeshStandardMaterial({
        map: atlas.awningStripes[idx % atlas.awningStripes.length],
        roughness: 0.75,
      });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.12, 1.75), awningMat);
      awning.position.set(0, 3.02, depth * 0.5 + 0.86);
      awning.rotation.x = 0.28;
      unit.add(awning);
    }

    const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.25, 0.35, depth + 0.25), matDarkFrame);
    parapet.position.y = height + 0.12;
    unit.add(parapet);

    const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), matConcrete);
    acBox.position.set(-width * 0.25, height + 0.55, 0);
    unit.add(acBox);

    root.add(unit);
    return unit;
  };

  // Lojas térreas ao nível da Rua das Lojas (Z = -17 block, face sul rotY=Math.PI voltada para Z = -34!)
  buildShopUnit(16, 79.4, -23.5, Math.PI, 9.2, 6.8, 4.8, 0x581c87, true, -17); // Açaí Tropical
  buildShopUnit(10, 90.6, -23.5, Math.PI, 9.2, 6.8, 5.2, 0x1e1b4b, false, -17); // Eletrônicos BR

  // Escadas frontais & traseiras em InstancedMesh (60 degraus -> 2 draw calls!)
  const stairDummy = new THREE.Object3D();
  const frontStepGeo = new THREE.BoxGeometry(6.8, 0.32, 0.55);
  const rearStepGeo = new THREE.BoxGeometry(4.8, 0.34, 0.52);
  const frontStairInst = new THREE.InstancedMesh(frontStepGeo, matConcrete, 4 * 8);
  frontStairInst.receiveShadow = true;
  frontStairInst.frustumCulled = false;
  const rearStairInst = new THREE.InstancedMesh(rearStepGeo, matConcrete, 4 * 7);
  rearStairInst.receiveShadow = true;
  rearStairInst.frustumCulled = false;

  const rearBaseY = blockTerraceY(-51) + 0.2;
  let fIdx = 0;
  let rIdx = 0;
  [-17, 17, 51, 85].forEach((bx) => {
    for (let s = 0; s < 8; s++) {
      stairDummy.position.set(bx, 0.16 + s * 0.28, -39.5 - 0.3 - s * 0.45);
      stairDummy.updateMatrix();
      frontStairInst.setMatrixAt(fIdx++, stairDummy.matrix);
    }
    for (let s = 0; s < 7; s++) {
      stairDummy.position.set(bx, rearBaseY + 0.17 + s * 0.30, -59.8 - s * 0.44);
      stairDummy.updateMatrix();
      rearStairInst.setMatrixAt(rIdx++, stairDummy.matrix);
    }
  });
  frontStairInst.instanceMatrix.needsUpdate = true;
  rearStairInst.instanceMatrix.needsUpdate = true;
  root.add(frontStairInst, rearStairInst);

  // QUADRA (-17, -51) — Polo Café, Tech & Serviços (Y = +2.25m)
  const patioTblGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 10);
  const patioPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8);
  const patioUmbGeo = new THREE.ConeGeometry(1.35, 0.55, 8);
  const cafe = buildShopUnit(1, -11.4, -45.2, 0, 9.2, 8.2, 6.8, 0x92400e, true, -51); // Café Carioca
  [-2.6, 2.4].forEach((tx, uIdx) => {
    const tbl = new THREE.Mesh(patioTblGeo, matAcmAmber);
    tbl.position.set(tx, 0.78, 5.8);
    cafe.add(tbl);
    const pole = new THREE.Mesh(patioPoleGeo, matDarkFrame);
    pole.position.set(tx, 1.2, 5.8);
    cafe.add(pole);
    const umb = new THREE.Mesh(
      patioUmbGeo,
      new THREE.MeshStandardMaterial({ color: uIdx === 0 ? 0xdc2626 : 0x059669, roughness: 0.7 }),
    );
    umb.position.set(tx, 2.45, 5.8);
    cafe.add(umb);
  });
  buildShopUnit(2, -22.6, -45.2, 0, 9.2, 8.2, 7.6, 0x1e293b, false, -51); // Cyber 50
  // Lojas da metade sul voltadas para as Avenidas X = 0 (Leste) e X = -34 (Oeste) — nunca contra muro!
  buildShopUnit(3, -11.4, -56.8, Math.PI / 2, 9.2, 8.2, 4.8, 0x166534, true, -51); // Express 24H
  const barber = buildShopUnit(4, -22.6, -56.8, -Math.PI / 2, 9.2, 8.2, 4.8, 0x7c2d12, true, -51); // Barbearia
  const bPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1.15, 16),
    new THREE.MeshStandardMaterial({ map: atlas.barberPole, roughness: 0.2 }),
  );
  bPole.position.set(3.8, 2.2, 4.35);
  barber.add(bPole);
  animated.barberPole = bPole;

  // QUADRA (+17, -51) — Polo Automotivo (Concessionária Motors 50 + Oficina Turbo @ Y = +2.25m)
  const motorsUnit = new THREE.Group();
  motorsUnit.position.set(17, blockTerraceY(-51) + 0.2, -45.8);
  const mBase = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 9.8), matConcrete);
  mBase.position.y = 0.125;
  motorsUnit.add(mBase);
  const mRoof = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.45, 10.2), matDarkFrame);
  mRoof.position.y = 5.4;
  mRoof.castShadow = true;
  motorsUnit.add(mRoof);
  const mGlassBox = new THREE.Mesh(new THREE.BoxGeometry(17.4, 5.0, 9.2), matGlass);
  mGlassBox.position.y = 2.65;
  motorsUnit.add(mGlassBox);

  const mSignMat = new THREE.MeshStandardMaterial({
    map: atlas.shopSigns[0],
    emissive: 0xffffff,
    emissiveMap: atlas.shopSigns[0],
    emissiveIntensity: 0.75,
  });
  const mSign = new THREE.Mesh(new THREE.BoxGeometry(12.5, 1.8, 0.35), mSignMat);
  mSign.position.set(0, 6.4, 4.9);
  motorsUnit.add(mSign);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.3, 0.26, 28),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4, metalness: 0.7, roughness: 0.2 }),
  );
  pedestal.position.set(0, 0.38, 0);
  motorsUnit.add(pedestal);
  animated.showroomBase = pedestal;

  const heroCar = buildCraftedVehicle(VEHICLES_50[7] ?? VEHICLES_50[0], 4, { cityMode: true });
  heroCar.group.scale.setScalar(0.95);
  heroCar.group.position.set(0, 0.52, 0);
  motorsUnit.add(heroCar.group);
  animated.showroomCar = heroCar.group;
  root.add(motorsUnit);

  // Oficina Turbo voltada para a Av. Leste X = +34 com pátio de atendimento aberto
  buildShopUnit(9, 17, -56.8, Math.PI / 2, 9.2, 16.0, 5.4, 0x334155, false, -51);

  // QUADRA (+51, -51) — POLO GASTRONÔMICO (4 Lojas de Comida dedicadas @ Y = +2.25m)
  buildShopUnit(8, 45.4, -45.2, 0, 9.2, 8.2, 6.2, 0x7f1d1d, true, -51); // Burger 50
  buildShopUnit(14, 56.6, -45.2, 0, 9.2, 8.2, 6.4, 0x991b1b, true, -51); // Pizzaria Forno Nobile
  const grill = buildShopUnit(15, 45.4, -56.8, -Math.PI / 2, 9.2, 8.2, 5.8, 0x78350f, true, -51); // Churrascaria Brasa (Av. X=+34)
  [-2.2, 2.2].forEach((tx, uIdx) => {
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
    tbl.position.set(tx, 0.76, 5.2);
    grill.add(tbl);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), matDarkFrame);
    pole.position.set(tx, 1.15, 5.2);
    grill.add(pole);
    const umb = new THREE.Mesh(
      new THREE.ConeGeometry(1.25, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: uIdx === 0 ? 0xf59e0b : 0xdc2626, roughness: 0.7 }),
    );
    umb.position.set(tx, 2.35, 5.2);
    grill.add(umb);
  });
  buildShopUnit(7, 56.6, -56.8, Math.PI / 2, 9.2, 8.2, 6.0, 0x9a3412, true, -51); // Padaria Pão Quente (Av. X=+68)

  // QUADRA (+85, -51) — POLO MODA & COMÉRCIO (Lojas de Roupa + Calçados + Farmácia @ Y = +2.25m)
  buildShopUnit(12, 79.4, -45.2, 0, 9.2, 8.2, 6.8, 0x27272a, true, -51); // Moda Urbana (Roupas & Streetwear)
  buildShopUnit(13, 90.6, -45.2, 0, 9.2, 8.2, 6.8, 0x4c1d95, true, -51); // Atelier Vestir (Boutique & Calçados)
  buildShopUnit(17, 79.4, -56.8, -Math.PI / 2, 9.2, 8.2, 5.6, 0x0f172a, true, -51); // Tênis & Sneakers (Av. X=+68)
  buildShopUnit(6, 90.6, -56.8, Math.PI / 2, 9.2, 8.2, 5.8, 0x166534, true, -51); // Farmácia Popular (Av. X=+102)

  // Mobiliário Urbano na Cidade Baixa (Y = 0.0m, calçadas da Av. Z = -34 e Av. Z = 0)
  const buildNewsstand = (nx: number, nz: number, rotY = 0) => {
    const ng = new THREE.Group();
    ng.position.set(nx, 0.2, nz);
    ng.rotation.y = rotY;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 2.35, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55 }),
    );
    cabin.position.y = 1.18;
    cabin.castShadow = true;
    ng.add(cabin);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.16, 2.1),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }),
    );
    roof.position.y = 2.42;
    ng.add(roof);
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.1, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 }),
    );
    rack.position.set(0, 1.0, 0.92);
    ng.add(rack);
    root.add(ng);
  };
  buildNewsstand(-7.2, -28.0, Math.PI);
  buildNewsstand(40.8, -26.8, Math.PI);

  const matWoodBench = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.72 });
  const matTactile = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.85 });
  const matShelterSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.78 });
  const matPlaqueBus = new THREE.MeshStandardMaterial({
    map: atlas.busStopPlaque,
    emissive: 0xffffff,
    emissiveMap: atlas.busStopPlaque,
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
  const matBusMapPanel = new THREE.MeshStandardMaterial({
    map: atlas.busStopMap,
    emissive: 0xffffff,
    emissiveMap: atlas.busStopMap,
    emissiveIntensity: 0.55,
    roughness: 0.25,
  });

  const bsTactileGeo = new THREE.BoxGeometry(5.0, 0.025, 0.36);
  const bsPostGeo = new THREE.CylinderGeometry(0.055, 0.065, 2.6, 8);
  const bsRoofTrimGeo = new THREE.BoxGeometry(4.5, 0.14, 1.95);
  const bsRoofAccentGeo = new THREE.BoxGeometry(4.54, 0.07, 1.99);
  const bsLampGeo = new THREE.BoxGeometry(3.4, 0.04, 0.26);
  const bsBackGlassGeo = new THREE.BoxGeometry(3.6, 2.28, 0.08);
  const bsSideGlassGeo = new THREE.BoxGeometry(0.08, 2.28, 1.4);
  const bsMupiGeo = new THREE.BoxGeometry(0.18, 2.35, 1.35);
  const bsMupiFaceGeo = new THREE.PlaneGeometry(1.18, 1.75);
  const bsBenchSeatGeo = new THREE.BoxGeometry(2.9, 0.10, 0.52);
  const bsBenchBackGeo = new THREE.BoxGeometry(2.9, 0.34, 0.08);
  const bsBenchLegGeo = new THREE.BoxGeometry(0.08, 0.50, 0.44);
  const bsTotemGeo = new THREE.CylinderGeometry(0.06, 0.07, 2.85, 8);
  const bsPlaqueGeo = new THREE.BoxGeometry(0.56, 0.72, 0.09);

  const buildBusStop = (bx: number, bz: number, rotY = 0) => {
    const bs = new THREE.Group();
    bs.position.set(bx, 0.2, bz);
    bs.rotation.y = rotY;

    const tactile = new THREE.Mesh(bsTactileGeo, matTactile);
    tactile.position.set(0.2, 0.015, 0.92);
    bs.add(tactile);

    [-1.95, 1.85].forEach((px) => {
      [-0.72, 0.32].forEach((pz) => {
        if (pz > 0 && px < 0) return;
        const post = new THREE.Mesh(bsPostGeo, matShelterSteel);
        post.position.set(px, 1.3, pz);
        bs.add(post);
      });
    });

    const roofTrim = new THREE.Mesh(bsRoofTrimGeo, matShelterSteel);
    roofTrim.position.set(0, 2.62, -0.05);
    roofTrim.rotation.x = -0.05;
    bs.add(roofTrim);

    const roofAccent = new THREE.Mesh(bsRoofAccentGeo, matAcmAmber);
    roofAccent.position.set(0, 2.71, -0.05);
    roofAccent.rotation.x = -0.05;
    bs.add(roofAccent);

    const ceilingLamp = new THREE.Mesh(bsLampGeo, windowEmissiveMat);
    ceilingLamp.position.set(-0.2, 2.53, 0);
    bs.add(ceilingLamp);

    const bBack = new THREE.Mesh(bsBackGlassGeo, matGlass);
    bBack.position.set(-0.2, 1.36, -0.72);
    bs.add(bBack);
    const bSideL = new THREE.Mesh(bsSideGlassGeo, matGlass);
    bSideL.position.set(-1.95, 1.36, -0.02);
    bs.add(bSideL);

    const mupiBox = new THREE.Mesh(bsMupiGeo, matShelterSteel);
    mupiBox.position.set(1.9, 1.35, -0.05);
    bs.add(mupiBox);
    const mupiFace = new THREE.Mesh(bsMupiFaceGeo, matBusMapPanel);
    mupiFace.rotation.y = Math.PI / 2;
    mupiFace.position.set(2.0, 1.42, -0.05);
    bs.add(mupiFace);
    const mupiFaceIn = new THREE.Mesh(bsMupiFaceGeo, matBusMapPanel);
    mupiFaceIn.rotation.y = -Math.PI / 2;
    mupiFaceIn.position.set(1.8, 1.42, -0.05);
    bs.add(mupiFaceIn);

    const benchSeat = new THREE.Mesh(bsBenchSeatGeo, matWoodBench);
    benchSeat.position.set(-0.25, 0.52, -0.26);
    bs.add(benchSeat);
    const benchBack = new THREE.Mesh(bsBenchBackGeo, matWoodBench);
    benchBack.position.set(-0.25, 0.80, -0.49);
    bs.add(benchBack);
    [-1.45, -0.25, 0.95].forEach((lx) => {
      const leg = new THREE.Mesh(bsBenchLegGeo, matShelterSteel);
      leg.position.set(lx, 0.25, -0.26);
      bs.add(leg);
    });

    const totem = new THREE.Mesh(bsTotemGeo, matShelterSteel);
    totem.position.set(2.55, 1.42, 0.45);
    bs.add(totem);
    const plaque = new THREE.Mesh(bsPlaqueGeo, matPlaqueBus);
    plaque.position.set(2.55, 2.65, 0.45);
    bs.add(plaque);

    root.add(bs);
  };
  buildBusStop(-17, -28.0, Math.PI);
  buildBusStop(-51, -28.0, Math.PI);
  buildBusStop(51, -28.0, Math.PI);
  buildBusStop(-9.2, 39.2, Math.PI); // Calçada Marginal Norte (fora da pista X=0!)

  const matOrelhao = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
  const matHydrant = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const matBin = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  const orelhaoPostGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.75, 8);
  const orelhaoDomeGeo = new THREE.SphereGeometry(0.48, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hydrantGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.65, 8);
  const binGeo = new THREE.CylinderGeometry(0.20, 0.16, 0.72, 8);
  [
    [-27.5, -28.0],
    [8.2, -28.0],
    [60.0, -28.0],
    [-40.2, -28.0],
  ].forEach(([ox, oz], idx) => {
    const post = new THREE.Mesh(orelhaoPostGeo, matDarkFrame);
    post.position.set(ox, 0.2 + 0.88, oz);
    root.add(post);

    const dome = new THREE.Mesh(orelhaoDomeGeo, matOrelhao);
    dome.position.set(ox, 0.2 + 1.85, oz);
    root.add(dome);

    const hyd = new THREE.Mesh(hydrantGeo, matHydrant);
    hyd.position.set(ox + 2.1, 0.2 + 0.32, oz);
    root.add(hyd);

    const bin = new THREE.Mesh(binGeo, matBin);
    bin.position.set(ox - 1.8, 0.2 + 0.36, oz + (idx % 2 === 0 ? 0.2 : -0.2));
    root.add(bin);
  });

  return { group: root, animated };
}

// ============================================================================
// 5. MORRO / FAVELA DENSA CORRIGIDA (Relevo Unificado + Fundações hMin/hMax + Corredores Livres)
// ============================================================================
export function createMorroDistrict(
  atlas: CityTextureAtlas,
  windowEmissiveMat: THREE.MeshStandardMaterial,
  lampMat: THREE.MeshStandardMaterial,
  treeCollector?: {
    atlanticForest: VegetationPlacement[];
    shrubs?: VegetationPlacement[];
  },
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Morro_Favela_Conectado';
  root.userData.hotspot = 'morro';

  // 1. Raw terrain elevation function (Z = 41.5 .. 142, X = -128 .. +128)
  const rawMorroHeight = (x: number, z: number): number => {
    if (z <= 41.5) return 0;
    const tZ = THREE.MathUtils.clamp((z - 41.5) / 86, 0, 1);
    const edgeX = THREE.MathUtils.clamp(1 - Math.pow(Math.abs(x) / 128, 2.3), 0, 1);
    const secondaryPeak = Math.exp(-Math.pow((x + 56) / 34, 2) - Math.pow((z - 94) / 28, 2)) * 8.5;
    const rightPeak = Math.exp(-Math.pow((x - 62) / 36, 2) - Math.pow((z - 96) / 28, 2)) * 7.8;
    const rise = Math.pow(tZ, 1.08) * 28 * edgeX + secondaryPeak + rightPeak;
    const ridge = Math.sin(x * 0.065) * 1.4 * tZ + Math.cos(z * 0.11) * 0.8 * tZ;
    return Math.max(0, rise + ridge);
  };

  // 2. Winding paved road 2D spine + monotonic smoothed elevation profile
  const roadPts2D = [
    new THREE.Vector3(14, 0, 39.2),
    new THREE.Vector3(16, 0, 49.0),
    new THREE.Vector3(6, 0, 60.0),
    new THREE.Vector3(-13, 0, 71.0),
    new THREE.Vector3(-21, 0, 84.0),
    new THREE.Vector3(-4, 0, 95.0),
    new THREE.Vector3(10, 0, 104.0),
  ];
  const roadCurve2D = new THREE.CatmullRomCurve3(roadPts2D);
  const roadSamples = roadCurve2D.getPoints(72);

  // Sample terrain along road & enforce smooth monotonic climb from Z=39.2 to summit Mirante
  const campPlateauH = rawMorroHeight(0, 75) + 0.4;
  const mirantePlateauH = rawMorroHeight(10, 104) + 0.3;

  const roadElevs = roadSamples.map((p, i) => {
    const t = i / (roadSamples.length - 1);
    const rawH = rawMorroHeight(p.x, p.z);
    const linearH = THREE.MathUtils.lerp(0.08, mirantePlateauH, THREE.MathUtils.smoothstep(t, 0.03, 0.97));
    return i === 0 ? 0.08 : Math.max(0.08, THREE.MathUtils.lerp(linearH, rawH, 0.32));
  });
  roadElevs[0] = 0.08;
  roadElevs[1] = 0.20;
  roadElevs[roadElevs.length - 1] = mirantePlateauH;
  for (let pass = 0; pass < 10; pass++) {
    for (let i = 2; i < roadElevs.length - 1; i++) {
      roadElevs[i] = (roadElevs[i - 1] + roadElevs[i] * 2 + roadElevs[i + 1]) * 0.25;
    }
    for (let i = 1; i < roadElevs.length; i++) {
      const horiz = Math.hypot(
        roadSamples[i].x - roadSamples[i - 1].x,
        roadSamples[i].z - roadSamples[i - 1].z,
      );
      const maxStep = Math.max(0.04, horiz * 0.34);
      roadElevs[i] = THREE.MathUtils.clamp(roadElevs[i], roadElevs[i - 1], roadElevs[i - 1] + maxStep);
    }
    roadElevs[roadElevs.length - 1] = mirantePlateauH;
  }
  roadSamples.forEach((p, i) => {
    p.y = roadElevs[i];
  });

  // Helper: exact shortest 2D distance + interpolated height along road polyline
  const sampleRoad2D = (x: number, z: number): { dist: number; y: number } => {
    let bestDistSq = Infinity;
    let bestY = 0;
    for (let i = 0; i < roadSamples.length - 1; i++) {
      const a = roadSamples[i];
      const b = roadSamples[i + 1];
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const lenSq = vx * vx + vz * vz;
      const t = lenSq > 1e-4 ? THREE.MathUtils.clamp(((x - a.x) * vx + (z - a.z) * vz) / lenSq, 0, 1) : 0;
      const px = a.x + vx * t;
      const pz = a.z + vz * t;
      const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestY = THREE.MathUtils.lerp(a.y, b.y, t);
      }
    }
    return { dist: Math.sqrt(bestDistSq), y: bestY };
  };

  const escadaSpines = [-46, -16, 34];
  const escadaXAt = (ex: number, z: number, eIdx: number) =>
    ex + Math.sin(Math.max(0, z - 42.5) * 0.10 + eIdx) * 0.7;

  // 3. Unified height function: Terrain, Road bed, Escadões, Campinho & Mirante share 100% the same math!
  const morroHeightAt = (x: number, z: number): number => {
    if (z <= 41.5) return 0;
    let h = rawMorroHeight(x, z);

    // Flatten Campinho plateau (X = -8.5..8.5, Z = 69..81)
    const dxC = Math.max(0, Math.abs(x - 0) - 9.2);
    const dzC = Math.max(0, Math.abs(z - 75) - 6.4);
    const dCamp = Math.hypot(dxC, dzC);
    if (dCamp < 6.0) {
      const w = 1 - THREE.MathUtils.smoothstep(dCamp, 0, 6.0);
      h = THREE.MathUtils.lerp(h, campPlateauH, w);
    }

    // Flatten Mirante & Igrejinha plateau (X = 3..17, Z = 97..111)
    const dxM = Math.max(0, Math.abs(x - 10) - 7.4);
    const dzM = Math.max(0, Math.abs(z - 104) - 7.4);
    const dMir = Math.hypot(dxM, dzM);
    if (dMir < 6.5) {
      const w = 1 - THREE.MathUtils.smoothstep(dMir, 0, 6.5);
      h = THREE.MathUtils.lerp(h, mirantePlateauH, w);
    }

    // Smoothly grade road bed underneath the paved asphalt strip so terrain never pokes through
    const rd = sampleRoad2D(x, z);
    if (rd.dist < 7.5) {
      const w = 1 - THREE.MathUtils.smoothstep(rd.dist, 2.8, 7.5);
      h = THREE.MathUtils.lerp(h, rd.y - 0.14, w);
    }

    // Carve natural rocky mountain spring basin (Nascente at X=+84, Z=114) & winding Creek bed (Córrego)
    const dSpring = Math.hypot(x - 84, z - 114);
    if (dSpring < 10.5) {
      const springRim = Math.exp(-Math.pow((dSpring - 6.5) / 3.0, 2)) * 1.4;
      const springPool = (1 - THREE.MathUtils.smoothstep(dSpring, 0, 6.2)) * 2.1;
      h += springRim - springPool;
    }
    if (z <= 114 && z >= 41.5) {
      const dCreek = Math.abs(x - creekCenterX(z));
      if (dCreek < 5.6) {
        const carve = (1 - THREE.MathUtils.smoothstep(dCreek, 1.5, 5.6)) * 1.55;
        h -= carve;
      }
    }

    // Entry transition near retaining wall Z = 41.5..44
    const frontFade = THREE.MathUtils.smoothstep(z, 41.5, 44.2);
    return Math.max(0, h * frontFade);
  };

  // Sculpted wide Morro terrain mesh (high resolution for crisp road bed, creek bed & plateaus)
  const segW = 128;
  const segD = 84;
  const geo = new THREE.PlaneGeometry(258, 104, segW, segD);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x366428);
  const cEarth = new THREE.Color(0x744d31);
  const cRock = new THREE.Color(0x57534e);
  const cStreamBed = new THREE.Color(0x2d4c3e);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i) + 93; // spans Z = 41 .. 145
    const h = morroHeightAt(lx, lz);
    pos.setY(i, h);

    const rd = sampleRoad2D(lx, lz);
    const dCreek = lz <= 116 ? Math.abs(lx - creekCenterX(lz)) : 99;
    const slopeApprox = h / 30;
    if (dCreek < 4.2) {
      tmpColor.copy(cStreamBed).lerp(cRock, 0.45);
    } else if (rd.dist < 4.8) {
      tmpColor.copy(cEarth).lerp(cRock, 0.45);
    } else if (slopeApprox > 0.68) {
      tmpColor.copy(cGrass).lerp(cRock, 0.42);
    } else {
      tmpColor.copy(cGrass).lerp(cEarth, (Math.sin(lx * 0.18 + lz * 0.12) * 0.5 + 0.5) * 0.34);
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.position.set(0, 0, 93);
  terrain.receiveShadow = true;
  root.add(terrain);

  // =========================================================================
  // NASCENTE DA SERRA (X=+84, Z=114) + CÓRREGO SINUOSO DESAGUANDO NO RIO
  // =========================================================================
  const matStreamWater = new THREE.MeshStandardMaterial({
    map: atlas.waterRipple,
    color: 0x22d3ee,
    roughness: 0.12,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
  });
  const matFoam = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    transparent: true,
    opacity: 0.82,
  });
  const matBoulder = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.88 });
  const matMossRock = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.92 });

  // Rocky Spring Pool (Nascente) nestled in cliff face at (84, 114)
  const springY = morroHeightAt(84, 114) + 0.55;
  const springPool = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.4, 0.45, 18), matStreamWater);
  springPool.position.set(84, springY, 114);
  root.add(springPool);

  // Vertical spring waterfall cascade pouring down the mountain wall behind the spring
  const cliffFall = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 5.2, 10, 1, false, 0, Math.PI), matFoam);
  cliffFall.position.set(84, springY + 2.4, 118.2);
  root.add(cliffFall);

  // Batch all Nascente boulders & creek cobbles into 2 InstancedMeshes
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const boulderMatrices: THREE.Matrix4[] = [];
  const mossRockMatrices: THREE.Matrix4[] = [];
  const rockDummy = new THREE.Object3D();

  for (let b = 0; b < 14; b++) {
    const ang = (b / 14) * Math.PI * 2;
    if (ang > -1.85 && ang < -1.15) continue;
    const rx = 84 + Math.cos(ang) * (5.1 + (b % 3) * 0.45);
    const rz = 114 + Math.sin(ang) * (5.1 + (b % 2) * 0.4);
    const rSize = 0.95 + (b % 3) * 0.45;
    rockDummy.position.set(rx, morroHeightAt(rx, rz) + 0.35, rz);
    rockDummy.rotation.set(b * 0.4, b * 0.9, 0);
    rockDummy.scale.set(rSize * 1.2, rSize * (0.8 + (b % 2) * 0.35), rSize * 1.1);
    rockDummy.updateMatrix();
    if (b % 3 === 0) mossRockMatrices.push(rockDummy.matrix.clone());
    else boulderMatrices.push(rockDummy.matrix.clone());
  }

  // Tourist sign & wooden viewpoint railing at Nascente
  const springSignPost = new THREE.Group();
  springSignPost.position.set(76.5, morroHeightAt(76.5, 108) + 0.1, 108);
  springSignPost.rotation.y = 0.55;
  const spPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x3f2e21 }));
  spPole.position.y = 1.1;
  springSignPost.add(spPole);
  const spBoard = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 1.05, 0.10),
    new THREE.MeshStandardMaterial({ map: atlas.trafficSignTouristSpring, roughness: 0.45 }),
  );
  spBoard.position.y = 2.05;
  springSignPost.add(spBoard);
  root.add(springSignPost);

  // Continuous winding Creek Ribbon from Nascente (Z=114) down to River Mouth (Z=26.5)
  const creekSegs = 68;
  const creekVerts: number[] = [];
  const creekUvs: number[] = [];
  const creekIdx: number[] = [];
  for (let s = 0; s <= creekSegs; s++) {
    const z = 114 - (s / creekSegs) * (114 - 26.2);
    const cx = creekCenterX(z);
    const halfW = s > creekSegs - 10 ? 2.8 + (s - (creekSegs - 10)) * 0.25 : 2.35;
    let wy: number;
    if (z > 41.5) {
      wy = morroHeightAt(cx, z) + 0.36;
    } else if (z > 27.5) {
      const tLow = (41.5 - z) / 14.0;
      wy = THREE.MathUtils.lerp(0.18, -1.16, THREE.MathUtils.smoothstep(tLow, 0, 1));
    } else {
      wy = -1.20;
    }
    creekVerts.push(cx - halfW, wy, z, cx + halfW, wy, z);
    creekUvs.push(0, s * 0.35, 1, s * 0.35);
    if (s < creekSegs) {
      const r0 = s * 2;
      const r1 = (s + 1) * 2;
      creekIdx.push(r0, r1, r0 + 1, r0 + 1, r1, r1 + 1);
    }
  }
  const creekGeo = new THREE.BufferGeometry();
  creekGeo.setAttribute('position', new THREE.Float32BufferAttribute(creekVerts, 3));
  creekGeo.setAttribute('uv', new THREE.Float32BufferAttribute(creekUvs, 2));
  creekGeo.setIndex(creekIdx);
  creekGeo.computeVertexNormals();
  const creekMesh = new THREE.Mesh(creekGeo, matStreamWater);
  root.add(creekMesh);

  // Collect river pebbles + cascade foam steps along the creek
  const foamGeo = new THREE.BoxGeometry(3.8, 0.12, 0.9);
  for (let cz = 44; cz <= 108; cz += 4.2) {
    const cx = creekCenterX(cz);
    const bankY = morroHeightAt(cx, cz);
    [-1, 1].forEach((side, sIdx) => {
      const rx = cx + side * (2.5 + ((cz + sIdx) % 3) * 0.35);
      const ry = morroHeightAt(rx, cz);
      const rSize = 0.55 + (cz % 2) * 0.25;
      rockDummy.position.set(rx, ry + 0.15, cz);
      rockDummy.rotation.set(0, cz * 0.6, 0);
      rockDummy.scale.set(rSize * 1.25, rSize * 0.72, rSize * 1.05);
      rockDummy.updateMatrix();
      if ((Math.floor(cz) + sIdx) % 3 === 0) mossRockMatrices.push(rockDummy.matrix.clone());
      else boulderMatrices.push(rockDummy.matrix.clone());
    });
    if (Math.floor(cz) % 16 === 0) {
      const foam = new THREE.Mesh(foamGeo, matFoam);
      foam.position.set(cx, bankY + 0.42, cz);
      root.add(foam);
    }
  }

  if (boulderMatrices.length > 0) {
    const boulderInst = new THREE.InstancedMesh(rockGeo, matBoulder, boulderMatrices.length);
    boulderInst.frustumCulled = false;
    boulderMatrices.forEach((m, i) => boulderInst.setMatrixAt(i, m));
    boulderInst.instanceMatrix.needsUpdate = true;
    root.add(boulderInst);
  }
  if (mossRockMatrices.length > 0) {
    const mossInst = new THREE.InstancedMesh(rockGeo, matMossRock, mossRockMatrices.length);
    mossInst.frustumCulled = false;
    mossRockMatrices.forEach((m, i) => mossInst.setMatrixAt(i, m));
    mossInst.instanceMatrix.needsUpdate = true;
    root.add(mossInst);
  }

  // Wooden footbridge crossing the creek at Z = 62 + Stone Culvert parapets at Marginal Norte (Z = 34)
  const fBridgeX = creekCenterX(62);
  const fBridgeY = morroHeightAt(fBridgeX, 62) + 0.95;
  const footBridge = new THREE.Group();
  footBridge.position.set(fBridgeX, fBridgeY, 62);
  const matWoodDeck = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.82 });
  footBridge.add(new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 1.8), matWoodDeck));
  [-0.82, 0.82].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.10, 0.08), matWoodDeck);
    rail.position.set(0, 0.78, rz);
    footBridge.add(rail);
  });
  root.add(footBridge);

  // Marginal Norte Creek Culvert Bridge Parapets (X = creekCenterX(34), Z = 28.6 & 39.4)
  const culvertX = creekCenterX(34);
  [28.6, 39.4].forEach((pz) => {
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.85, 0.48), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 }));
    parapet.position.set(culvertX, 0.42, pz);
    parapet.castShadow = true;
    root.add(parapet);
  });

  // Segmented Graffiti Retaining Walls along Morro base (Z = 41.9)
  // Leaves clean openings for Escadões (-46, -16, +34), Road Entrance (+14) & Creek Outlet (+86)!
  const wallMat = new THREE.MeshStandardMaterial({ map: atlas.graffitiWall, roughness: 0.85 });
  const wallSegments: [number, number][] = [
    [-82, -50],
    [-42, -20],
    [-12, 9.2],
    [18.8, 30],
    [38, 81],
  ];
  wallSegments.forEach(([x0, x1]) => {
    const w = x1 - x0;
    const cx = (x0 + x1) * 0.5;
    const muralWall = new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, 0.85), wallMat);
    muralWall.position.set(cx, 1.6, 41.9);
    muralWall.castShadow = true;
    muralWall.receiveShadow = true;
    root.add(muralWall);
  });

  // Comércio Comunitário Autêntico do Morro (na calçada Z = 38.8, ZERO bloqueio de avenidas ou escadões!)
  const matLocalRoof = new THREE.MeshStandardMaterial({ map: atlas.zincRoof, roughness: 0.55, metalness: 0.4 });
  const matLocalDoor = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.4 });
  const baseShopColors = [0x065f46, 0x991b1b, 0x4c1d95, 0x1e293b];
  [
    [-56.0, 38.8, 18],   // Mercearia Esperança (entre Av. -68 e Escadão -46)
    [-24.8, 38.8, 19],   // Espetinho da Laje (entre Av. -34 e Escadão -16)
    [24.4, 38.8, 20],    // Açaí do Morro (entre Estrada +14 e Escadão +34)
    [52.0, 38.8, 21],    // Corte Real Barber (entre Av. +34 e Av. +68)
  ].forEach(([sx, sz, signIdx], idx) => {
    const bg = new THREE.Group();
    bg.position.set(sx, 0.1, sz);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(6.4, 3.3, 3.1),
      new THREE.MeshStandardMaterial({ color: baseShopColors[idx], roughness: 0.78 }),
    );
    body.position.y = 1.65;
    body.castShadow = true;
    body.receiveShadow = true;
    bg.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 3.6), matLocalRoof);
    roof.position.set(0, 3.4, -0.15);
    roof.rotation.x = 0.08;
    bg.add(roof);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.12, 1.35),
      new THREE.MeshStandardMaterial({ map: atlas.awningStripes[idx % atlas.awningStripes.length], roughness: 0.75 }),
    );
    awning.position.set(0, 2.35, -2.05);
    awning.rotation.x = -0.28;
    bg.add(awning);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.92, 0.20),
      new THREE.MeshStandardMaterial({
        map: atlas.shopSigns[signIdx % atlas.shopSigns.length],
        emissive: 0xffffff,
        emissiveMap: atlas.shopSigns[signIdx % atlas.shopSigns.length],
        emissiveIntensity: 0.55,
      }),
    );
    sign.position.set(0, 2.95, -1.62);
    sign.rotation.y = Math.PI; // face South (-Z) cleanly toward Marginal Norte!
    bg.add(sign);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.14), matLocalDoor);
    door.position.set(-1.6, 1.05, -1.56);
    bg.add(door);

    const win = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.25, 0.14), windowEmissiveMat);
    win.position.set(1.1, 1.35, -1.56);
    bg.add(win);
    root.add(bg);
  });

  // Winding paved road built directly from smoothed roadSamples (shared unit BoxGeometry)
  const roadMat = new THREE.MeshStandardMaterial({ map: atlas.asphalt, color: 0x3b3e46, roughness: 0.88 });
  const matCurbRoad = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.85 });
  const unitRoadBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < roadSamples.length - 1; i++) {
    const a = roadSamples[i];
    const b = roadSamples[i + 1];
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const segLen = a.distanceTo(b) + 0.35;
    const seg = new THREE.Mesh(unitRoadBoxGeo, roadMat);
    seg.scale.set(5.2, 0.32, segLen);
    seg.position.copy(mid);
    seg.lookAt(b);
    seg.receiveShadow = true;
    root.add(seg);

    const bed = new THREE.Mesh(unitRoadBoxGeo, matCurbRoad);
    bed.scale.set(5.6, 0.7, segLen);
    bed.position.copy(mid).add(new THREE.Vector3(0, -0.38, 0));
    bed.lookAt(b.clone().add(new THREE.Vector3(0, -0.38, 0)));
    root.add(bed);
  }

  // 3 Continuous Concrete Escadões + Handrails batched into 3 InstancedMeshes (~332 draw calls -> 3!)
  const matStep = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.86 });
  const matHandrail = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42, metalness: 0.35 });
  const escadaStepsMat: THREE.Matrix4[] = [];
  const escadaPostsMat: THREE.Matrix4[] = [];
  const escadaRailsMat: THREE.Matrix4[] = [];
  const escadaDummy = new THREE.Object3D();
  const railDirHelper = new THREE.Vector3();

  escadaSpines.forEach((ex, eIdx) => {
    const stepsCount = eIdx === 1 ? 42 : 34;
    const stepZStride = 1.05;
    const leftPosts: THREE.Vector3[] = [];
    const rightPosts: THREE.Vector3[] = [];

    for (let s = 0; s < stepsCount; s++) {
      const sz = 42.4 + s * stepZStride;
      const sx = escadaXAt(ex, sz, eIdx);
      const sy = morroHeightAt(sx, sz);

      escadaDummy.position.set(sx, sy - 0.18, sz);
      escadaDummy.rotation.set(0, 0, 0);
      escadaDummy.scale.set(2.7, 0.85, stepZStride + 0.24);
      escadaDummy.updateMatrix();
      escadaStepsMat.push(escadaDummy.matrix.clone());

      if (s % 2 === 0 || s === stepsCount - 1) {
        const postL = new THREE.Vector3(sx - 1.24, sy + 0.68, sz);
        const postR = new THREE.Vector3(sx + 1.24, sy + 0.68, sz);
        leftPosts.push(postL);
        rightPosts.push(postR);

        [postL, postR].forEach((pv) => {
          escadaDummy.position.set(pv.x, pv.y - 0.04, pv.z);
          escadaDummy.rotation.set(0, 0, 0);
          escadaDummy.scale.set(0.08, 0.92, 0.08);
          escadaDummy.updateMatrix();
          escadaPostsMat.push(escadaDummy.matrix.clone());
        });
      }
    }

    [leftPosts, rightPosts].forEach((posts) => {
      for (let k = 0; k < posts.length - 1; k++) {
        const pA = posts[k].clone().add(new THREE.Vector3(0, 0.42, 0));
        const pB = posts[k + 1].clone().add(new THREE.Vector3(0, 0.42, 0));
        const len = pA.distanceTo(pB);
        escadaDummy.position.copy(pA).addScaledVector(railDirHelper.subVectors(pB, pA), 0.5);
        escadaDummy.scale.set(0.07, 0.07, len + 0.04);
        escadaDummy.lookAt(pB);
        escadaDummy.updateMatrix();
        escadaRailsMat.push(escadaDummy.matrix.clone());
      }
    });
  });

  if (escadaStepsMat.length > 0) {
    const stepInst = new THREE.InstancedMesh(unitRoadBoxGeo, matStep, escadaStepsMat.length);
    stepInst.receiveShadow = true;
    stepInst.frustumCulled = false;
    escadaStepsMat.forEach((m, i) => stepInst.setMatrixAt(i, m));
    stepInst.instanceMatrix.needsUpdate = true;

    const postInst = new THREE.InstancedMesh(unitRoadBoxGeo, matHandrail, escadaPostsMat.length);
    postInst.frustumCulled = false;
    escadaPostsMat.forEach((m, i) => postInst.setMatrixAt(i, m));
    postInst.instanceMatrix.needsUpdate = true;

    const railInst = new THREE.InstancedMesh(unitRoadBoxGeo, matHandrail, escadaRailsMat.length);
    railInst.frustumCulled = false;
    escadaRailsMat.forEach((m, i) => railInst.setMatrixAt(i, m));
    railInst.instanceMatrix.needsUpdate = true;

    root.add(stepInst, postInst, railInst);
  }

  // =========================================================================
  // DENSE BUG-FREE INSTANCED FAVELA DWELLINGS (Level Foundations + Zero Overlaps)
  // =========================================================================
  const housePalette = [
    0xe07a5f, 0x3d85c6, 0xf2cc8f, 0x81b29a, 0xd946ef, 0xf59e0b,
    0xef4444, 0xf8fafc, 0x38bdf8, 0xfb923c, 0xa3e635, 0xe11d48,
  ];
  const matBrick = new THREE.MeshStandardMaterial({ map: atlas.morroBrick, roughness: 0.88 });
  const matPlaster = new THREE.MeshStandardMaterial({ map: atlas.morroPlaster, roughness: 0.9 });
  const matPainted = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 });
  const matZinc = new THREE.MeshStandardMaterial({ map: atlas.zincRoof, roughness: 0.55, metalness: 0.45 });
  const matTank = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
  const matPad = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.88 });
  const matDish = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.4 });
  const matPoleSteel = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.5, metalness: 0.6 });
  const matClothes = new THREE.MeshStandardMaterial({
    map: atlas.clothesline,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });

  interface FavelaHouse {
    x: number;
    baseY: number;
    padBottomY: number;
    z: number;
    w: number;
    h: number;
    d: number;
    rot: number;
    style: 0 | 1 | 2;
    color: number;
    hasLaje: boolean;
    hasTank: boolean;
    hasDish: boolean;
    hasVaral: boolean;
    floors: number;
  }

  const houses: FavelaHouse[] = [];
  const isClearOfEscadoes = (x: number, z: number, padRadius: number): boolean => {
    for (let eIdx = 0; eIdx < escadaSpines.length; eIdx++) {
      const maxZ = eIdx === 1 ? 87 : 79;
      if (z > 41 && z < maxZ) {
        const sx = escadaXAt(escadaSpines[eIdx], z, eIdx);
        if (Math.abs(x - sx) < 2.2 + padRadius) return false;
      }
    }
    return true;
  };

  for (let row = 0; row < 12; row++) {
    const hzBase = 46.8 + row * 5.25;
    for (let col = -10; col <= 10; col++) {
      const hxBase = col * 6.4 + (row % 2) * 2.6;
      const hash = Math.abs(Math.sin(row * 17.3 + col * 31.7));

      const w = 3.1 + hash * 1.45;
      const d = 2.9 + ((hash * 7) % 1) * 1.05;
      const footprintRadius = Math.hypot(w * 0.5, d * 0.5);

      // Keep Morro housing cohesive in the central hill massif (ZERO stray shacks on far left/right!)
      if (Math.abs(hxBase) > 66 - row * 1.35) continue;

      // Protected clear zones: Campinho (0, 75), Mirante (10, 104), 3 Escadões, Winding Road
      if (Math.abs(hxBase - 0) < 11.8 && hzBase > 66 && hzBase < 84) continue;
      if (Math.abs(hxBase - 10) < 11.2 && hzBase > 94.5 && hzBase < 113.5) continue;
      if (!isClearOfEscadoes(hxBase, hzBase, footprintRadius)) continue;
      if (sampleRoad2D(hxBase, hzBase).dist < 4.4 + footprintRadius) continue;

      const rot = (hash - 0.5) * 0.22;

      // Occasional Atlantic forest green pockets between clusters
      if (hash > 0.82) {
        const ty = morroHeightAt(hxBase, hzBase);
        if (treeCollector && ty > 0.8) {
          treeCollector.atlanticForest.push({
            x: hxBase,
            y: ty,
            z: hzBase,
            scale: 0.85 + (hash - 0.82) * 2.2,
          });
        }
        continue;
      }

      // Check AABB separation against already-placed neighbor houses so ZERO houses ever clip
      let overlapsNeighbor = false;
      for (let n = 0; n < houses.length; n++) {
        const other = houses[n];
        if (Math.abs(hxBase - other.x) < (w + other.w) * 0.55 + 0.45 && Math.abs(hzBase - other.z) < (d + other.d) * 0.55 + 0.45) {
          overlapsNeighbor = true;
          break;
        }
      }
      if (overlapsNeighbor) continue;

      // Sample 4 corners + center of house footprint to compute exact hMin & hMax
      const corners: [number, number][] = [
        [hxBase, hzBase],
        [hxBase - w * 0.5, hzBase - d * 0.5],
        [hxBase + w * 0.5, hzBase - d * 0.5],
        [hxBase - w * 0.5, hzBase + d * 0.5],
        [hxBase + w * 0.5, hzBase + d * 0.5],
      ];
      let hMin = Infinity;
      let hMax = -Infinity;
      corners.forEach(([cx, cz]) => {
        const ch = morroHeightAt(cx, cz);
        if (ch < hMin) hMin = ch;
        if (ch > hMax) hMax = ch;
      });
      if (hMax < 0.7 && row > 0) continue;

      const baseY = hMax + 0.14;
      const padBottomY = Math.max(-0.4, hMin - 1.4);
      const floors = hash < 0.24 ? 3 : hash < 0.64 ? 2 : 1;
      const h = floors * 2.42;
      const style: 0 | 1 | 2 = hash < 0.34 ? 0 : hash < 0.62 ? 1 : 2;
      const hasLaje = floors >= 2 && hash > 0.32;

      houses.push({
        x: hxBase,
        baseY,
        padBottomY,
        z: hzBase,
        w,
        h,
        d,
        rot,
        style,
        color: housePalette[Math.floor(hash * 97) % housePalette.length],
        hasLaje,
        hasTank: ((row + col) % 2) === 0,
        hasDish: ((row * 3 + col) % 4) === 0,
        hasVaral: hasLaje && ((row + col) % 4) === 0,
        floors,
      });
    }
  }

  // Scatter Atlantic Forest strictly inside Morro borders & clear of houses, road, escadões, campinho, mirante, nascente & córrego
  if (treeCollector) {
    for (let fy = 0; fy < 70; fy++) {
      const ang = (fy * 2.399) % (Math.PI * 2);
      const radX = 76 + (fy % 4) * 10;
      const tx = THREE.MathUtils.clamp(Math.cos(ang) * radX * 1.15, -114, 114);
      const tz = 48 + ((fy * 19) % 82);
      if (Math.abs(tx) < 12 && tz > 65 && tz < 85) continue;
      if (Math.abs(tx - 10) < 12 && tz > 94 && tz < 114) continue;
      if (!isClearOfEscadoes(tx, tz, 2.0)) continue;
      if (sampleRoad2D(tx, tz).dist < 5.5) continue;
      // Keep Nascente spring pool (84, 114) & Córrego bed clear of tree trunks
      if (Math.hypot(tx - 84, tz - 114) < 7.2) continue;
      if (tz <= 116 && Math.abs(tx - creekCenterX(tz)) < 4.6) continue;
      const hitsHouse = houses.some((h) => Math.abs(tx - h.x) < h.w * 0.6 + 1.4 && Math.abs(tz - h.z) < h.d * 0.6 + 1.4);
      if (hitsHouse) continue;
      const ty = morroHeightAt(tx, tz);
      if (ty > 1.0) {
        treeCollector.atlanticForest.push({ x: tx, y: ty, z: tz, scale: 0.9 + (fy % 3) * 0.24 });
      }
    }

    // Lush riparian trees & shrubs framing both banks of the Nascente & Córrego
    for (let cz = 46; cz <= 112; cz += 7.5) {
      const cx = creekCenterX(cz);
      [-1, 1].forEach((side, sIdx) => {
        const bankDist = 5.4 + ((cz + sIdx) % 3) * 1.2;
        const tx = cx + side * bankDist;
        const ty = morroHeightAt(tx, cz);
        if (ty > 0.6 && sampleRoad2D(tx, cz).dist > 5.0) {
          treeCollector.atlanticForest.push({ x: tx, y: ty, z: cz, scale: 0.92 + ((cz + sIdx) % 2) * 0.22 });
        }
        if (treeCollector.shrubs) {
          const sx = cx + side * 3.6;
          const sy = morroHeightAt(sx, cz + 2.2);
          if (sy > 0.3) {
            treeCollector.shrubs.push({ x: sx, y: sy, z: cz + 2.2, scale: 0.95 });
          }
        }
      });
    }
    // Crown of tall forest trees behind the Nascente waterfall cliff
    [-6.5, 0, 6.8].forEach((ox, idx) => {
      const tx = 84 + ox;
      const tz = 123 + (idx % 2) * 3;
      treeCollector.atlanticForest.push({ x: tx, y: morroHeightAt(tx, tz), z: tz, scale: 1.18 });
    });
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 0.9, 1, 8);
  const dishGeo = new THREE.ConeGeometry(0.42, 0.24, 8);
  const varalGeo = new THREE.PlaneGeometry(2.2, 0.58);

  const brickList = houses.filter((h) => h.style === 0);
  const plasterList = houses.filter((h) => h.style === 1);
  const paintedList = houses.filter((h) => h.style === 2);

  const dummy = new THREE.Object3D();
  const cTmp = new THREE.Color();

  const addHouseBodies = (list: FavelaHouse[], mat: THREE.Material, tint: boolean) => {
    if (list.length === 0) return;
    const mesh = new THREE.InstancedMesh(boxGeo, mat, list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    list.forEach((it, i) => {
      dummy.position.set(it.x, it.baseY + it.h * 0.5, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (tint) mesh.setColorAt(i, cTmp.setHex(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
  };

  addHouseBodies(brickList, matBrick, false);
  addHouseBodies(plasterList, matPlaster, false);
  addHouseBodies(paintedList, matPainted, true);

  // Level retaining foundations (padInst) spanning padBottomY -> baseY so ZERO houses float or sink!
  if (houses.length > 0) {
    const padInst = new THREE.InstancedMesh(boxGeo, matPad, houses.length);
    const roofInst = new THREE.InstancedMesh(boxGeo, matZinc, houses.length);
    padInst.receiveShadow = true;
    padInst.frustumCulled = false;
    roofInst.frustumCulled = false;

    const tankHouses = houses.filter((h) => h.hasTank);
    const tankInst = new THREE.InstancedMesh(cylGeo, matTank, tankHouses.length);
    tankInst.frustumCulled = false;

    const dishHouses = houses.filter((h) => h.hasDish);
    const dishInst = new THREE.InstancedMesh(dishGeo, matDish, dishHouses.length);
    dishInst.frustumCulled = false;

    const varalHouses = houses.filter((h) => h.hasVaral);
    const varalInst = new THREE.InstancedMesh(varalGeo, matClothes, varalHouses.length);
    const varalPolesInst = new THREE.InstancedMesh(boxGeo, matPoleSteel, varalHouses.length * 2);
    varalInst.frustumCulled = false;
    varalPolesInst.frustumCulled = false;

    const winCount = houses.reduce((acc, h) => acc + h.floors * 2, 0);
    const winInst = new THREE.InstancedMesh(boxGeo, windowEmissiveMat, winCount);
    winInst.frustumCulled = false;
    let wCursor = 0;

    houses.forEach((it, i) => {
      const padH = Math.max(0.6, it.baseY - it.padBottomY);
      dummy.position.set(it.x, it.padBottomY + padH * 0.5, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.w + 0.36, padH, it.d + 0.36);
      dummy.updateMatrix();
      padInst.setMatrixAt(i, dummy.matrix);

      // Flat laje slab or gently pitched zinc roof seated directly on baseY + h
      const roofThick = it.hasLaje ? 0.24 : 0.14;
      dummy.position.set(it.x, it.baseY + it.h + roofThick * 0.5, it.z);
      dummy.rotation.set(it.hasLaje ? 0 : 0.06, it.rot, 0);
      dummy.scale.set(it.w + 0.28, roofThick, it.d + 0.28);
      dummy.updateMatrix();
      roofInst.setMatrixAt(i, dummy.matrix);

      const cosR = Math.cos(it.rot);
      const sinR = Math.sin(it.rot);
      for (let f = 0; f < it.floors; f++) {
        const wy = it.baseY + 1.25 + f * 2.35;
        const sideSign = f % 2 === 0 ? -1 : 1;
        const lx = sideSign * it.w * 0.22;

        // Front window facing the city (+Z) so hillside houses look alive from the river/city!
        const lzFront = it.d * 0.5 + 0.05;
        dummy.position.set(it.x + lx * cosR + lzFront * sinR, wy, it.z - lx * sinR + lzFront * cosR);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(0.84, 0.72, 0.08);
        dummy.updateMatrix();
        winInst.setMatrixAt(wCursor++, dummy.matrix);

        // Rear window (-Z)
        const lzBack = -it.d * 0.5 - 0.05;
        dummy.position.set(it.x - lx * cosR + lzBack * sinR, wy, it.z + lx * sinR + lzBack * cosR);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(0.76, 0.66, 0.08);
        dummy.updateMatrix();
        winInst.setMatrixAt(wCursor++, dummy.matrix);
      }
    });

    tankHouses.forEach((it, i) => {
      const roofTop = it.baseY + it.h + (it.hasLaje ? 0.24 : 0.14);
      dummy.position.set(it.x + it.w * 0.22, roofTop + 0.34, it.z - it.d * 0.16);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.40, 0.68, 0.40);
      dummy.updateMatrix();
      tankInst.setMatrixAt(i, dummy.matrix);
    });

    dishHouses.forEach((it, i) => {
      const roofTop = it.baseY + it.h + (it.hasLaje ? 0.24 : 0.14);
      dummy.position.set(it.x - it.w * 0.24, roofTop + 0.24, it.z);
      dummy.rotation.set(-0.55, it.rot + 0.4, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dishInst.setMatrixAt(i, dummy.matrix);
    });

    // Clotheslines properly supported by 2 grounded poles on flat laje rooftops!
    varalHouses.forEach((it, i) => {
      const roofTop = it.baseY + it.h + 0.24;
      const vz = it.z - it.d * 0.15;
      dummy.position.set(it.x, roofTop + 0.72, vz);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      varalInst.setMatrixAt(i, dummy.matrix);

      const cosR = Math.cos(it.rot);
      const sinR = Math.sin(it.rot);
      [-1.08, 1.08].forEach((px, pIdx) => {
        dummy.position.set(it.x + px * cosR, roofTop + 0.52, vz - px * sinR);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(0.06, 1.04, 0.06);
        dummy.updateMatrix();
        varalPolesInst.setMatrixAt(i * 2 + pIdx, dummy.matrix);
      });
    });

    padInst.instanceMatrix.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    tankInst.instanceMatrix.needsUpdate = true;
    dishInst.instanceMatrix.needsUpdate = true;
    varalInst.instanceMatrix.needsUpdate = true;
    varalPolesInst.instanceMatrix.needsUpdate = true;
    winInst.instanceMatrix.needsUpdate = true;
    root.add(padInst, roofInst, tankInst, dishInst, varalInst, varalPolesInst, winInst);
  }

  // Quadra Poliesportiva Comunitária (anchored cleanly onto campPlateauH at X = 0, Z = 75)
  const camp = new THREE.Group();
  camp.position.set(0, campPlateauH + 0.08, 75);
  const campBase = new THREE.Mesh(new THREE.BoxGeometry(17.2, 4.0, 11.6), matPad);
  campBase.position.y = -2.0;
  campBase.receiveShadow = true;
  camp.add(campBase);
  const turf = new THREE.Mesh(
    new THREE.BoxGeometry(15.6, 0.14, 9.6),
    new THREE.MeshStandardMaterial({ map: atlas.soccerField, roughness: 0.8 }),
  );
  turf.position.y = 0.07;
  turf.receiveShadow = true;
  camp.add(turf);
  [-7.2, 7.2].forEach((gx) => {
    const goal = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 2.8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    goal.position.set(gx, 0.8, 0);
    camp.add(goal);
  });
  [
    [-7.6, -4.6],
    [7.6, -4.6],
    [-7.6, 4.6],
    [7.6, 4.6],
  ].forEach(([fx, fz]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 4.5, 6), matHandrail);
    pole.position.set(fx, 2.25, fz);
    camp.add(pole);
    const flood = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.35), lampMat);
    flood.position.set(fx, 4.55, fz);
    camp.add(flood);
  });
  root.add(camp);

  // Igrejinha & Mirante no topo do Morro (anchored cleanly onto mirantePlateauH at X = 10, Z = 104)
  const mirante = new THREE.Group();
  mirante.position.set(10, mirantePlateauH + 0.08, 104);
  const mPad = new THREE.Mesh(new THREE.BoxGeometry(13.2, 4.4, 13.2), matPad);
  mPad.position.y = -2.2;
  mPad.receiveShadow = true;
  mirante.add(mPad);

  const chapel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 4.6, 7.8), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 }));
  chapel.position.y = 2.3;
  chapel.castShadow = true;
  mirante.add(chapel);

  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 8.2, 1.9), new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 }));
  tower.position.set(0, 4.1, -3.5);
  tower.castShadow = true;
  mirante.add(tower);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.18), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfbbf24, emissiveIntensity: 0.6 }));
  crossV.position.set(0, 8.9, -3.5);
  mirante.add(crossV);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.18), crossV.material);
  crossH.position.set(0, 9.15, -3.5);
  mirante.add(crossH);
  root.add(mirante);

  // Power poles along the morro climb seated on exact morroHeightAt with sagging overhead cables
  const polePositions = [
    new THREE.Vector3(19.2, morroHeightAt(19.2, 48), 48),
    new THREE.Vector3(9.8, morroHeightAt(9.8, 59), 59),
    new THREE.Vector3(-9.5, morroHeightAt(-9.5, 70), 70),
    new THREE.Vector3(-17.5, morroHeightAt(-17.5, 83), 83),
    new THREE.Vector3(-2.5, morroHeightAt(-2.5, 94), 94),
  ];
  const matWire = new THREE.MeshBasicMaterial({ color: 0x18181b });
  polePositions.forEach((p, idx) => {
    const lamp = createStreetlightRig(false, lampMat);
    lamp.position.copy(p);
    root.add(lamp);
    if (idx > 0) {
      const prev = polePositions[idx - 1];
      const topA = prev.clone().add(new THREE.Vector3(0, 6.4, 0));
      const topB = p.clone().add(new THREE.Vector3(0, 6.4, 0));
      const mid = new THREE.Vector3().addVectors(topA, topB).multiplyScalar(0.5);
      mid.y -= 0.75;
      const wireCurve = new THREE.QuadraticBezierCurve3(topA, mid, topB);
      const wire = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 12, 0.03, 4, false), matWire);
      root.add(wire);
    }
  });

  return root;
}

// ============================================================================
// 6. NPCS EXTREMAMENTE REALISTAS E ARTICULADOS (ANDANDO, SENTADOS, CONVERSANDO)
// ============================================================================
export interface ArticulatedNpc {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  mode: 'walk' | 'jog' | 'chat' | 'sit';
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  minLimit: number;
  maxLimit: number;
  speed: number;
  phase: number;
}

const SKIN_TONES = [0xf5cfa0, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3818];
const SHIRT_COLORS = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xf8fafc, 0x8b5cf6, 0xec4899, 0x14b8a6];
const PANTS_COLORS = [0x1e293b, 0x27272a, 0x1d4ed8, 0x57534e, 0x78350f];

const NPC_SKIN_MATS = SKIN_TONES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 }));
const NPC_SHIRT_MATS = SHIRT_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 }));
const NPC_PANTS_MATS = PANTS_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
const NPC_HAIR_MATS = [
  new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 }),
  new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 }),
];
const NPC_SHOE_MAT = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
const NPC_PACK_MAT = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

const NPC_PELVIS_GEO = new THREE.BoxGeometry(0.32, 0.14, 0.20);
const NPC_TORSO_GEO = new THREE.BoxGeometry(0.38, 0.52, 0.22);
const NPC_PACK_GEO = new THREE.BoxGeometry(0.28, 0.36, 0.14);
const NPC_SKULL_GEO = new THREE.SphereGeometry(0.135, 10, 8);
const NPC_CAP_GEO = new THREE.SphereGeometry(0.142, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
const NPC_BRIM_GEO = new THREE.BoxGeometry(0.20, 0.025, 0.14);
const NPC_HAIR_GEO = new THREE.SphereGeometry(0.142, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6);
const NPC_SLEEVE_GEO = new THREE.CylinderGeometry(0.055, 0.048, 0.26, 7);
const NPC_FOREARM_GEO = new THREE.CylinderGeometry(0.046, 0.04, 0.26, 7);
const NPC_LEG_GEO = new THREE.CylinderGeometry(0.07, 0.055, 0.72, 7);
const NPC_SHOE_GEO = new THREE.BoxGeometry(0.10, 0.08, 0.20);

export function createArticulatedNpc(
  seed: number,
  mode: ArticulatedNpc['mode'],
): ArticulatedNpc {
  const group = new THREE.Group();
  const skinMat = NPC_SKIN_MATS[seed % NPC_SKIN_MATS.length];
  const shirtMat = NPC_SHIRT_MATS[(seed * 3) % NPC_SHIRT_MATS.length];
  const pantsMat = NPC_PANTS_MATS[(seed * 5) % NPC_PANTS_MATS.length];
  const hairMat = NPC_HAIR_MATS[seed % 4 === 0 ? 0 : 1];

  const pelvis = new THREE.Mesh(NPC_PELVIS_GEO, pantsMat);
  pelvis.position.y = 0.84;
  group.add(pelvis);

  const torso = new THREE.Mesh(NPC_TORSO_GEO, shirtMat);
  torso.position.y = 1.16;
  group.add(torso);

  if (seed % 3 === 0 && mode !== 'sit') {
    const pack = new THREE.Mesh(NPC_PACK_GEO, NPC_PACK_MAT);
    pack.position.set(0, 1.16, -0.16);
    group.add(pack);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.54, 0);
  const skull = new THREE.Mesh(NPC_SKULL_GEO, skinMat);
  head.add(skull);

  if (seed % 4 === 1) {
    const cap = new THREE.Mesh(NPC_CAP_GEO, shirtMat);
    cap.position.y = 0.02;
    head.add(cap);
    const brim = new THREE.Mesh(NPC_BRIM_GEO, shirtMat);
    brim.position.set(0, 0.04, 0.14);
    head.add(brim);
  } else {
    const hair = new THREE.Mesh(NPC_HAIR_GEO, hairMat);
    hair.position.set(0, 0.02, -0.02);
    head.add(hair);
  }
  group.add(head);

  const makeArm = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.25, 1.38, 0);
    const sleeve = new THREE.Mesh(NPC_SLEEVE_GEO, shirtMat);
    sleeve.position.y = -0.13;
    pivot.add(sleeve);
    const forearm = new THREE.Mesh(NPC_FOREARM_GEO, skinMat);
    forearm.position.y = -0.38;
    pivot.add(forearm);
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.10, 0.80, 0);
    const leg = new THREE.Mesh(NPC_LEG_GEO, pantsMat);
    leg.position.y = -0.36;
    pivot.add(leg);
    const shoe = new THREE.Mesh(NPC_SHOE_GEO, NPC_SHOE_MAT);
    shoe.position.set(0, -0.74, 0.04);
    pivot.add(shoe);
    group.add(pivot);
    return pivot;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  if (mode === 'sit') {
    leftLeg.rotation.x = -Math.PI * 0.48;
    rightLeg.rotation.x = -Math.PI * 0.48;
    leftArm.rotation.x = -0.35;
    rightArm.rotation.x = -0.35;
  }

  return {
    group,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    head,
    mode,
    axis: 'x',
    dir: 1,
    laneCoord: 0,
    minLimit: -45,
    maxLimit: 45,
    speed: mode === 'jog' ? 3.2 : 1.55,
    phase: seed * 1.17,
  };
}
