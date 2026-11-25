import * as THREE from 'three';
import { CityTextureAtlas } from './cityTextures';
import { VegetationPlacement } from './cityVegetation';
import { buildCraftedVehicle } from '../vehicleBuilder';
import { VEHICLES_50 } from '../../data/vehicles50';

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
  const matGold = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.16,
    metalness: 0.96,
    clearcoat: 0.5,
  });
  const matSteel = new THREE.MeshPhysicalMaterial({
    color: 0xe4e4e7,
    roughness: 0.18,
    metalness: 0.92,
    anisotropy: 0.75,
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

  // Monumental High-Resolution Cloth Flag (6.8m x 4.4m, 56 x 34 segments)
  const flagW = 6.8;
  const flagH = 4.4;
  const segX = 56;
  const segY = 34;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, segX, segY);
  // Shift so x = 0 is the hoist edge attached to the mast!
  flagGeo.translate(flagW * 0.5 + 0.15, 0, 0);

  const basePositions = new Float32Array(flagGeo.attributes.position.array);

  const flagMat = new THREE.MeshPhysicalMaterial({
    map: atlas.flagAlbedo,
    bumpMap: atlas.flagBump,
    bumpScale: 0.025,
    roughness: 0.62,
    metalness: 0.04,
    sheen: 0.92,
    sheenRoughness: 0.36,
    sheenColor: new THREE.Color(0xfef08a),
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

  // Dedicated warm uplights illuminating the flag monument
  const spotlights: THREE.SpotLight[] = [];
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(2.2, apexY - 2.2, 0);
  group.add(spotTarget);

  [
    [4.4, 0.9, 4.4],
    [-3.5, 0.9, -4.2],
  ].forEach(([sx, sy, sz]) => {
    const spot = new THREE.SpotLight(0xfff3d1, 42, 36, Math.PI / 4, 0.55, 1.4);
    spot.position.set(sx, sy, sz);
    spot.target = spotTarget;
    group.add(spot);
    spotlights.push(spot);
  });

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

export function createTrafficLightRig(axis: 'x' | 'z'): TrafficLightRig {
  const group = new THREE.Group();
  const matPole = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.75 });
  const matBox = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.4 });

  // Vertical mast + curved gooseneck cantilever arm
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.55, 10), matPole);
  base.position.y = 0.275;
  group.add(base);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.4, 0),
    new THREE.Vector3(0, 5.2, 0),
    new THREE.Vector3(0.45, 5.85, 0),
    new THREE.Vector3(3.2, 5.85, 0),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.09, 8, false), matPole);
  arm.castShadow = true;
  group.add(arm);

  // Signal housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.25, 0.42), matBox);
  housing.position.set(2.9, 5.42, 0);
  housing.castShadow = true;
  group.add(housing);

  const matRed = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 0.05 });
  const matAmb = new THREE.MeshStandardMaterial({ color: 0x78350f, emissive: 0xf59e0b, emissiveIntensity: 0.05 });
  const matGrn = new THREE.MeshStandardMaterial({ color: 0x064e3b, emissive: 0x22c55e, emissiveIntensity: 2.2 });

  const makeLens = (y: number, mat: THREE.MeshStandardMaterial) => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.46, 12), mat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(2.9, y, 0);
    group.add(lens);

    // Visor hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.22), matBox);
    hood.position.set(2.9, y + 0.15, 0.25);
    group.add(hood);
    const hoodBack = hood.clone();
    hoodBack.position.z = -0.25;
    group.add(hoodBack);
  };

  makeLens(5.78, matRed);
  makeLens(5.42, matAmb);
  makeLens(5.06, matGrn);

  // Pedestrian signal box on the lower pole
  const pedBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.24), matBox);
  pedBox.position.set(0.18, 2.75, 0);
  group.add(pedBox);

  const setPhase = (state: 'green' | 'amber' | 'red') => {
    matRed.emissiveIntensity = state === 'red' ? 2.6 : 0.06;
    matAmb.emissiveIntensity = state === 'amber' ? 2.6 : 0.06;
    matGrn.emissiveIntensity = state === 'green' ? 2.6 : 0.06;
  };

  return { group, axis, setPhase };
}

export function createStreetlightRig(
  doubleArm = false,
  lampMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.20, 0.65, 8), matMetal);
  plinth.position.y = 0.325;
  g.add(plinth);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.11, 6.8, 10), matMetal);
  shaft.position.y = 3.7;
  shaft.castShadow = true;
  g.add(shaft);

  const addArm = (dir: number) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.08, 0.09), matMetal);
    arm.position.set(dir * 0.7, 7.05, 0);
    arm.rotation.z = dir * 0.14;
    g.add(arm);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.26), matMetal);
    head.position.set(dir * 1.32, 7.12, 0);
    g.add(head);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.20), lampMat);
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
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
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

  // Parking lane markings & barrier gate
  for (let i = -3; i <= 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 4.6), new THREE.MeshStandardMaterial({ color: 0xf4f4f5 }));
    line.position.set(i * 2.8, 0.09, -4.5);
    park.add(line);
    const line2 = line.clone();
    line2.position.z = 4.5;
    park.add(line2);
  }
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

  // --------------------------------------------------------------------------
  // B) RUA DAS LOJAS 2.0 (6 Lojas Únicas e Ricas no corredor Z = -34 / -17)
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
  ) => {
    const unit = new THREE.Group();
    unit.position.set(x, 0.2, z);
    unit.rotation.y = rotY;

    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    body.position.y = height * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    unit.add(body);

    // Upper floor windows if 2-story
    if (height > 5.5) {
      const upperMat = new THREE.MeshStandardMaterial({
        map: atlas.commercialTerreo,
        roughness: 0.45,
      });
      const upper = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, height - 4.2, depth + 0.08), upperMat);
      upper.position.y = 4.2 + (height - 4.2) * 0.5;
      unit.add(upper);
    }

    // Storefront vitrine on +Z face
    const vitrineMat = new THREE.MeshStandardMaterial({
      map: atlas.shopVitrine[idx],
      emissive: 0xffe4b5,
      emissiveMap: atlas.shopVitrine[idx],
      emissiveIntensity: 0.48,
      roughness: 0.18,
    });
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 2.8, 0.14), vitrineMat);
    vitrine.position.set(0, 1.55, depth * 0.5 + 0.02);
    unit.add(vitrine);

    // Illuminated Signboard
    const signMat = new THREE.MeshStandardMaterial({
      map: atlas.shopSigns[idx],
      emissive: 0xffffff,
      emissiveMap: atlas.shopSigns[idx],
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 1.25, 0.22), signMat);
    sign.position.set(0, 3.85, depth * 0.5 + 0.16);
    unit.add(sign);

    // Striped angled awning
    if (hasAwning) {
      const awningMat = new THREE.MeshStandardMaterial({
        map: atlas.awningStripes[idx % atlas.awningStripes.length],
        roughness: 0.75,
      });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.12, 1.75), awningMat);
      awning.position.set(0, 3.02, depth * 0.5 + 0.86);
      awning.rotation.x = 0.28;
      awning.castShadow = true;
      unit.add(awning);
    }

    // Rooftop parapet & AC unit
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(width + 0.25, 0.35, depth + 0.25), matDarkFrame);
    parapet.position.y = height + 0.12;
    unit.add(parapet);

    const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.8), matConcrete);
    acBox.position.set(-width * 0.25, height + 0.55, 0);
    unit.add(acBox);

    root.add(unit);
    return unit;
  };

  // 1) Concessionária Motors 50 (with transparent glass pavilion & spinning sports car inside!)
  const motorsUnit = new THREE.Group();
  motorsUnit.position.set(17, 0.2, -46);
  const mBase = new THREE.Mesh(new THREE.BoxGeometry(18, 0.25, 13), matConcrete);
  mBase.position.y = 0.125;
  motorsUnit.add(mBase);
  const mRoof = new THREE.Mesh(new THREE.BoxGeometry(18.5, 0.45, 13.5), matDarkFrame);
  mRoof.position.y = 5.4;
  mRoof.castShadow = true;
  motorsUnit.add(mRoof);
  const mGlassBox = new THREE.Mesh(new THREE.BoxGeometry(17.4, 5.0, 12.2), matGlass);
  mGlassBox.position.y = 2.65;
  motorsUnit.add(mGlassBox);

  const mSignMat = new THREE.MeshStandardMaterial({
    map: atlas.shopSigns[0],
    emissive: 0xffffff,
    emissiveMap: atlas.shopSigns[0],
    emissiveIntensity: 0.75,
  });
  const mSign = new THREE.Mesh(new THREE.BoxGeometry(12.5, 1.8, 0.35), mSignMat);
  mSign.position.set(0, 6.4, 6.4);
  motorsUnit.add(mSign);

  // Real miniature 3D supercar on lit showroom turntable inside the dealership!
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.3, 0.26, 28),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.4, metalness: 0.7, roughness: 0.2 }),
  );
  pedestal.position.set(0, 0.38, 0);
  motorsUnit.add(pedestal);
  animated.showroomBase = pedestal;

  const heroCar = buildCraftedVehicle(VEHICLES_50[7] ?? VEHICLES_50[0], 4);
  heroCar.group.scale.setScalar(0.95);
  heroCar.group.position.set(0, 0.52, 0);
  motorsUnit.add(heroCar.group);
  animated.showroomCar = heroCar.group;
  root.add(motorsUnit);

  // 2) Café & Padaria Carioca (facing Z = -34 avenue from South block)
  const cafe = buildShopUnit(1, -11.5, -45, 0, 9.2, 10, 7.6, 0x92400e, true);
  // Outdoor wooden tables + colorful umbrellas on the sidewalk
  [-2.6, 2.4].forEach((tx, uIdx) => {
    const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 12), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    tbl.position.set(tx, 0.78, 7.0);
    cafe.add(tbl);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), matDarkFrame);
    pole.position.set(tx, 1.2, 7.0);
    cafe.add(pole);
    const umb = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: uIdx === 0 ? 0xdc2626 : 0x059669, roughness: 0.7 }),
    );
    umb.position.set(tx, 2.45, 7.0);
    umb.castShadow = true;
    cafe.add(umb);
  });

  // 3) Tech & Games Cyber 50
  buildShopUnit(2, -22.5, -45, 0, 9.2, 10, 8.8, 0x1e293b, false);

  // 4) Mercado Express 24h (facing Central Plaza along Z = -34)
  buildShopUnit(3, -11.5, -17 - 6.5, Math.PI, 8.8, 7.2, 4.8, 0x166534, true);

  // 5) Barbearia Clássica (with spinning barber pole!)
  const barber = buildShopUnit(4, -22.5, -17 - 6.5, Math.PI, 8.8, 7.2, 4.8, 0x7c2d12, true);
  const bPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 1.15, 16),
    new THREE.MeshStandardMaterial({ map: atlas.barberPole, roughness: 0.2 }),
  );
  bPole.position.set(3.8, 2.2, 3.85);
  barber.add(bPole);
  animated.barberPole = bPole;

  // --------------------------------------------------------------------------
  // C) EXPANSÃO COMERCIAL: FARMÁCIA, PADARIA, LANCHONETE, OFICINA & ELETRÔNICOS
  // --------------------------------------------------------------------------
  buildShopUnit(6, -44.8, -43.5, 0, 9.2, 9.2, 6.2, 0x166534, true); // Farmácia Popular
  buildShopUnit(7, -56.2, -43.5, 0, 9.6, 9.2, 7.0, 0x9a3412, true); // Padaria Pão Quente
  buildShopUnit(8, 45.2, -43.5, 0, 9.2, 9.2, 6.4, 0x7f1d1d, true); // Burger 50
  buildShopUnit(9, 56.8, -43.5, 0, 9.8, 9.2, 5.4, 0x334155, false); // Oficina Turbo
  buildShopUnit(10, 79.2, -43.5, 0, 9.6, 9.2, 6.8, 0x1e1b4b, true); // Eletrônicos BR

  // Urban Street Furniture: Bancas de Jornal, Pontos de Ônibus, Orelhões, Hidrantes & Lixeiras
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
  buildNewsstand(-7.2, -39.8, 0);
  buildNewsstand(40.8, -26.8, Math.PI);

  const buildBusStop = (bx: number, bz: number, rotY = 0) => {
    const bs = new THREE.Group();
    bs.position.set(bx, 0.2, bz);
    bs.rotation.y = rotY;
    const bRoof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.7), matAcmAmber);
    bRoof.position.y = 2.55;
    bs.add(bRoof);
    const bBack = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.25, 0.1), matGlass);
    bBack.position.set(0, 1.3, -0.68);
    bs.add(bBack);
    const bBench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.55), matDarkFrame);
    bBench.position.set(0, 0.56, -0.2);
    bs.add(bBench);
    const totem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8),
      matDarkFrame,
    );
    totem.position.set(2.35, 1.35, 0);
    bs.add(totem);
    const plaque = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.4 }),
    );
    plaque.position.set(2.35, 2.55, 0);
    bs.add(plaque);
    root.add(bs);
  };
  buildBusStop(-17, -39.5, 0);
  buildBusStop(-51, -28.0, Math.PI);
  buildBusStop(51, -39.5, 0);
  buildBusStop(0, 39.2, Math.PI); // Ponto de ônibus na Marginal Norte (pé do Morro)

  // Orelhões (Brazilian dome payphones), fire hydrants & trash bins along Rua das Lojas
  const matOrelhao = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
  const matHydrant = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  const matBin = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  [
    [-27.5, -39.6],
    [8.2, -39.6],
    [39.8, -39.6],
    [-40.2, -28.2],
  ].forEach(([ox, oz], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.75, 8), matDarkFrame);
    post.position.set(ox, 0.2 + 0.88, oz);
    root.add(post);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      matOrelhao,
    );
    dome.position.set(ox, 0.2 + 1.85, oz);
    root.add(dome);

    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.65, 8), matHydrant);
    hyd.position.set(ox + 2.1, 0.2 + 0.32, oz);
    root.add(hyd);

    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.16, 0.72, 8), matBin);
    bin.position.set(ox - 1.8, 0.2 + 0.36, oz + (idx % 2 === 0 ? 0.2 : -0.2));
    root.add(bin);
  });

  return { group: root, animated };
}

// ============================================================================
// 5. MORRO / FAVELA DENSA CONECTADO (~340 CASAS + ESCADÕES + VARAIS + QUADRA)
// ============================================================================
export function createMorroDistrict(
  atlas: CityTextureAtlas,
  windowEmissiveMat: THREE.MeshStandardMaterial,
  lampMat: THREE.MeshStandardMaterial,
  treeCollector?: {
    atlanticForest: VegetationPlacement[];
  },
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Morro_Favela_Conectado';
  root.userData.hotspot = 'morro';

  // Expanded Morro height function (Z = 41 to 142, X = -128 to +128)
  const morroHeightAt = (x: number, z: number): number => {
    if (z <= 41.5) return 0;
    const tZ = THREE.MathUtils.clamp((z - 41.5) / 86, 0, 1);
    const edgeX = THREE.MathUtils.clamp(1 - Math.pow(Math.abs(x) / 128, 2.3), 0, 1);
    const secondaryPeak = Math.exp(-Math.pow((x + 56) / 34, 2) - Math.pow((z - 94) / 28, 2)) * 9.5;
    const rightPeak = Math.exp(-Math.pow((x - 62) / 36, 2) - Math.pow((z - 96) / 28, 2)) * 8.5;
    const rise = Math.pow(tZ, 1.08) * 29 * edgeX + secondaryPeak + rightPeak;
    const ridge = Math.sin(x * 0.065) * 1.6 * tZ + Math.cos(z * 0.11) * 0.9 * tZ;
    return Math.max(0, rise + ridge);
  };

  // Sculpted wide Morro terrain mesh with rich vertex colors (Atlantic forest grass, red earth, rock)
  const segW = 104;
  const segD = 64;
  const geo = new THREE.PlaneGeometry(258, 104, segW, segD);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x366428);
  const cEarth = new THREE.Color(0x744d31);
  const cRock = new THREE.Color(0x57534e);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i) + 93; // spans Z = 41 .. 145
    const h = morroHeightAt(lx, lz);
    pos.setY(i, h);

    const slopeApprox = h / 32;
    if (Math.abs(lx) < 8 && lz < 104) {
      tmpColor.copy(cEarth).lerp(cRock, 0.35);
    } else if (slopeApprox > 0.68) {
      tmpColor.copy(cGrass).lerp(cRock, 0.42);
    } else {
      tmpColor.copy(cGrass).lerp(cEarth, (Math.sin(lx * 0.18 + lz * 0.12) * 0.5 + 0.5) * 0.38);
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

  // Extended Graffiti Retaining Walls along the Morro base (Z = 41.8)
  const wallMat = new THREE.MeshStandardMaterial({ map: atlas.graffitiWall, roughness: 0.85 });
  [-24, -76, 56].forEach((wx) => {
    const muralWall = new THREE.Mesh(new THREE.BoxGeometry(44, 3.8, 0.85), wallMat);
    muralWall.position.set(wx, 1.9, 41.9);
    muralWall.castShadow = true;
    muralWall.receiveShadow = true;
    root.add(muralWall);
  });

  // Small Community Shops tucked along the Morro base (facing Z = 34 Marginal Norte)
  const baseShopColors = [0x1e3a8a, 0x991b1b, 0x065f46, 0x7c2d12];
  [
    [-46, 40.3, 6],
    [-38, 40.3, 11],
    [22, 40.3, 7],
    [31, 40.3, 3],
  ].forEach(([sx, sz, signIdx], idx) => {
    const bg = new THREE.Group();
    bg.position.set(sx, 0.1, sz);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 3.4, 3.8),
      new THREE.MeshStandardMaterial({ color: baseShopColors[idx], roughness: 0.78 }),
    );
    body.position.y = 1.7;
    body.castShadow = true;
    bg.add(body);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.95, 0.2),
      new THREE.MeshStandardMaterial({
        map: atlas.shopSigns[signIdx % atlas.shopSigns.length],
        emissive: 0xffffff,
        emissiveMap: atlas.shopSigns[signIdx % atlas.shopSigns.length],
        emissiveIntensity: 0.5,
      }),
    );
    sign.position.set(0, 2.95, -2.0);
    bg.add(sign);
    const win = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.5, 0.14), windowEmissiveMat);
    win.position.set(0, 1.15, -1.96);
    bg.add(win);
    root.add(bg);
  });

  // Winding paved road climbing smoothly from Z = 39 up to the summit Mirante!
  const roadPts = [
    new THREE.Vector3(14, 0.08, 39.2),
    new THREE.Vector3(17, 1.8, 49),
    new THREE.Vector3(6, 6.2, 60),
    new THREE.Vector3(-14, 11.4, 71),
    new THREE.Vector3(-22, 16.5, 84),
    new THREE.Vector3(-4, 22.2, 95),
    new THREE.Vector3(10, 26.8, 105),
  ];
  const roadCurve = new THREE.CatmullRomCurve3(roadPts);
  const roadMat = new THREE.MeshStandardMaterial({ map: atlas.asphalt, color: 0x3b3e46, roughness: 0.88 });
  const roadSample = roadCurve.getPoints(36);
  for (let i = 0; i < roadSample.length - 1; i++) {
    const a = roadSample[i];
    const b = roadSample[i + 1];
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const segLen = a.distanceTo(b) + 0.5;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.38, segLen), roadMat);
    seg.position.copy(mid);
    seg.lookAt(b);
    seg.receiveShadow = true;
    root.add(seg);
  }

  // 3 Concrete Escadões (stairways) + yellow handrails climbing West, Center-Left, and East
  const matStep = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.86 });
  const matHandrail = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42, metalness: 0.35 });
  [-56, -24, 38].forEach((ex, eIdx) => {
    const stepsCount = eIdx === 1 ? 30 : 24;
    for (let s = 0; s < stepsCount; s++) {
      const sz = 43 + s * 1.48;
      const sx = ex + Math.sin(s * 0.25 + eIdx) * 1.2;
      const sy = morroHeightAt(sx, sz) + 0.16;
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.48, 1.56), matStep);
      step.position.set(sx, sy, sz);
      step.receiveShadow = true;
      root.add(step);

      if (s % 2 === 0) {
        [-1.22, 1.22].forEach((rx) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), matHandrail);
          post.position.set(sx + rx, sy + 0.58, sz);
          root.add(post);
        });
      }
    }
  });

  // =========================================================================
  // 340+ DENSE INSTANCED FAVELA DWELLINGS (Brick, Plaster, Painted, Lajes, Tanks, Windows, Varais)
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
  const matClothes = new THREE.MeshStandardMaterial({
    map: atlas.clothesline,
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.85,
  });

  interface FavelaHouse {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
    rot: number;
    style: 0 | 1 | 2; // 0: brick, 1: plaster, 2: painted
    color: number;
    hasLaje: boolean;
    hasTank: boolean;
    hasDish: boolean;
    hasVaral: boolean;
    floors: number;
  }

  const houses: FavelaHouse[] = [];
  for (let row = 0; row < 15; row++) {
    const hzBase = 46 + row * 4.55;
    for (let col = -16; col <= 16; col++) {
      const hxBase = col * 6.4 + ((row % 2) * 2.9);
      const hash = Math.abs(Math.sin(row * 17.3 + col * 31.7));

      // Leave clear corridors for the climbing paved road, escadões, campinho (X=-8..8, Z=68..82), and summit mirante (X=2..18, Z=96..112)
      if (Math.abs(hxBase - 0) < 9.5 && hzBase > 66 && hzBase < 84) continue;
      if (Math.abs(hxBase - 10) < 9.5 && hzBase > 96 && hzBase < 114) continue;
      if (Math.abs(hxBase - (-56)) < 2.6 || Math.abs(hxBase - (-24)) < 2.6 || Math.abs(hxBase - 38) < 2.6) continue;
      const roadSampleCheck = roadCurve.getPoint(THREE.MathUtils.clamp((hzBase - 39) / 68, 0, 1));
      if (Math.abs(hxBase - roadSampleCheck.x) < 4.5 && Math.abs(hzBase - roadSampleCheck.z) < 4.8) continue;

      const hy = morroHeightAt(hxBase, hzBase);
      if (hy < 0.7 && row > 0) continue;
      if (Math.abs(hxBase) > 106 - row * 1.4) continue;

      // Dense clustering with occasional green pockets of Atlantic forest
      if (hash > 0.80) {
        if (treeCollector) {
          treeCollector.atlanticForest.push({
            x: hxBase,
            y: hy,
            z: hzBase,
            scale: 0.85 + (hash - 0.8) * 2.2,
          });
        }
        continue;
      }

      const w = 3.2 + (hash * 2.1);
      const d = 3.1 + (((hash * 7) % 1) * 1.6);
      const floors = hash < 0.25 ? 3 : hash < 0.65 ? 2 : 1;
      const h = floors * 2.45;
      const style: 0 | 1 | 2 = hash < 0.34 ? 0 : hash < 0.62 ? 1 : 2;
      const rot = ((hash - 0.5) * 0.34);

      houses.push({
        x: hxBase,
        y: hy,
        z: hzBase,
        w,
        h,
        d,
        rot,
        style,
        color: housePalette[Math.floor(hash * 97) % housePalette.length],
        hasLaje: floors >= 2 && hash > 0.35,
        hasTank: ((row + col) % 2) === 0,
        hasDish: ((row * 3 + col) % 4) === 0,
        hasVaral: floors >= 2 && ((row + col) % 5) === 0,
        floors,
      });
    }
  }

  // Scatter dense Atlantic Forest around outer Morro flanks and ridges
  if (treeCollector) {
    for (let fy = 0; fy < 75; fy++) {
      const ang = (fy * 2.399) % (Math.PI * 2);
      const radX = 88 + (fy % 5) * 8;
      const tx = Math.cos(ang) * radX * 1.25;
      const tz = 62 + ((fy * 19) % 72);
      const ty = morroHeightAt(tx, tz);
      if (ty > 0.4) {
        treeCollector.atlanticForest.push({ x: tx, y: ty, z: tz, scale: 0.9 + (fy % 3) * 0.25 });
      }
    }
  }

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 0.9, 1, 8);
  const dishGeo = new THREE.ConeGeometry(0.42, 0.24, 8);
  const varalGeo = new THREE.PlaneGeometry(2.6, 0.65);

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
      dummy.position.set(it.x, it.y + it.h * 0.5, it.z);
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

  // Foundation retaining pads under ALL houses so none ever float
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
    varalInst.frustumCulled = false;

    // Glowing night windows across all favela houses
    const winCount = houses.reduce((acc, h) => acc + h.floors, 0);
    const winInst = new THREE.InstancedMesh(boxGeo, windowEmissiveMat, winCount);
    winInst.frustumCulled = false;
    let wCursor = 0;

    houses.forEach((it, i) => {
      dummy.position.set(it.x, it.y - 1.6, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.w + 0.5, 3.4, it.d + 0.5);
      dummy.updateMatrix();
      padInst.setMatrixAt(i, dummy.matrix);

      // Zinc roof or concrete laje parapet cap
      dummy.position.set(it.x, it.y + it.h + 0.1, it.z);
      dummy.rotation.set(it.hasLaje ? 0 : 0.08, it.rot, 0);
      dummy.scale.set(it.w + 0.35, it.hasLaje ? 0.24 : 0.14, it.d + 0.35);
      dummy.updateMatrix();
      roofInst.setMatrixAt(i, dummy.matrix);

      for (let f = 0; f < it.floors; f++) {
        const wy = it.y + 1.3 + f * 2.3;
        const sideSign = f % 2 === 0 ? -1 : 1;
        const cosR = Math.cos(it.rot);
        const sinR = Math.sin(it.rot);
        const lx = sideSign * it.w * 0.22;
        const lz = -it.d * 0.5 - 0.06;
        dummy.position.set(it.x + lx * cosR + lz * sinR, wy, it.z - lx * sinR + lz * cosR);
        dummy.rotation.set(0, it.rot, 0);
        dummy.scale.set(0.85, 0.72, 0.1);
        dummy.updateMatrix();
        winInst.setMatrixAt(wCursor++, dummy.matrix);
      }
    });

    tankHouses.forEach((it, i) => {
      dummy.position.set(it.x + it.w * 0.24, it.y + it.h + 0.52, it.z - it.d * 0.18);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.42, 0.72, 0.42);
      dummy.updateMatrix();
      tankInst.setMatrixAt(i, dummy.matrix);
    });

    dishHouses.forEach((it, i) => {
      dummy.position.set(it.x - it.w * 0.28, it.y + it.h + 0.48, it.z);
      dummy.rotation.set(-0.6, it.rot + 0.4, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dishInst.setMatrixAt(i, dummy.matrix);
    });

    varalHouses.forEach((it, i) => {
      dummy.position.set(it.x, it.y + it.h + 0.55, it.z - it.d * 0.35);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      varalInst.setMatrixAt(i, dummy.matrix);
    });

    padInst.instanceMatrix.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    tankInst.instanceMatrix.needsUpdate = true;
    dishInst.instanceMatrix.needsUpdate = true;
    varalInst.instanceMatrix.needsUpdate = true;
    winInst.instanceMatrix.needsUpdate = true;
    root.add(padInst, roofInst, tankInst, dishInst, varalInst, winInst);
  }

  // Quadra Poliesportiva Comunitária (plateau at X = 0, Z = 75)
  const campY = morroHeightAt(0, 75) + 0.6;
  const camp = new THREE.Group();
  camp.position.set(0, campY, 75);
  const campBase = new THREE.Mesh(new THREE.BoxGeometry(17, 4.8, 11.5), matPad);
  campBase.position.y = -2.4;
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
  // Quadra corner floodlight poles
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

  // Igrejinha & Mirante no topo do Morro (X = 10, Z = 104)
  const summitY = morroHeightAt(10, 104);
  const mirante = new THREE.Group();
  mirante.position.set(10, summitY, 104);
  const mPad = new THREE.Mesh(new THREE.BoxGeometry(13, 5.2, 13), matPad);
  mPad.position.y = -2.6;
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

  // Power poles along the morro climb with sagging overhead cables
  const polePositions = [
    new THREE.Vector3(14, morroHeightAt(14, 47), 47),
    new THREE.Vector3(5, morroHeightAt(5, 59), 59),
    new THREE.Vector3(-12, morroHeightAt(-12, 70), 70),
    new THREE.Vector3(-18, morroHeightAt(-18, 83), 83),
    new THREE.Vector3(-3, morroHeightAt(-3, 94), 94),
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

export function createArticulatedNpc(
  seed: number,
  mode: ArticulatedNpc['mode'],
): ArticulatedNpc {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN_TONES[seed % SKIN_TONES.length], roughness: 0.65 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: SHIRT_COLORS[(seed * 3) % SHIRT_COLORS.length], roughness: 0.78 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: PANTS_COLORS[(seed * 5) % PANTS_COLORS.length], roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: seed % 4 === 0 ? 0x92400e : 0x18181b, roughness: 0.85 });

  // Pelvis & Torso
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.20), pantsMat);
  pelvis.position.y = 0.84;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.22), shirtMat);
  torso.position.y = 1.16;
  torso.castShadow = true;
  group.add(torso);

  // Optional Backpack for realism
  if (seed % 3 === 0 && mode !== 'sit') {
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.36, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 }),
    );
    pack.position.set(0, 1.16, -0.16);
    group.add(pack);
  }

  // Head + Hair/Cap
  const head = new THREE.Group();
  head.position.set(0, 1.54, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skinMat);
  skull.castShadow = true;
  head.add(skull);

  if (seed % 4 === 1) {
    // Street cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.142, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), shirtMat);
    cap.position.y = 0.02;
    head.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.025, 0.14), shirtMat);
    brim.position.set(0, 0.04, 0.14);
    head.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), hairMat);
    hair.position.set(0, 0.02, -0.02);
    head.add(hair);
  }
  group.add(head);

  const makeArm = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.25, 1.38, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.26, 8), shirtMat);
    sleeve.position.y = -0.13;
    pivot.add(sleeve);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.04, 0.26, 8), skinMat);
    forearm.position.y = -0.38;
    pivot.add(forearm);
    group.add(pivot);
    return pivot;
  };

  const makeLeg = (sx: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.10, 0.80, 0);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.72, 8), pantsMat);
    leg.position.y = -0.36;
    leg.castShadow = true;
    pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.20), shoeMat);
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
