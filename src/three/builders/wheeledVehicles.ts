import * as THREE from 'three';
import {
  ExhaustStyle,
  PaintLivery,
  VehicleAttachment,
  VehicleConcept,
  WheelStyle,
} from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createAerodynamicMirror,
  createBeveledHeadlightAssembly,
  createBeveledTaillightAssembly,
  createEngineBayAssembly,
  createExtrudedProfile,
  createHeadlightBeamMesh,
  createLicensePlateGroup,
  createRoundedBoxGeo,
  createSculptedPanelGeo,
  enableShadows,
  evalAeroSideOffset,
  makeBeamBetween,
  makeStrutBetween,
  registerOpenable,
  sculptSideVolumeVertices,
  SideSculptOptions,
  tagPart,
} from './types';
import {
  buildSculptedCabin,
  buildVisibleInterior,
  buildWheelWellLiners,
  createCraftedWheel,
  createSideDoorGroup,
  createTrapezoidGlassGeo,
} from './wheelsAndInterior';
import {
  buildBusOrArticulatedBus,
  buildHeavyTruckVehicle,
  buildVanOrArmoredVehicle,
} from './heavyVehicles';
import { addDetailedMechanicalChassis } from './mechanicalChassis';

export type AeroTier = 'hyper' | 'sport' | 'luxury' | 'standard' | 'offroad';

function getVehicleAeroTier(v: VehicleConcept): AeroTier {
  const arch = v.geometry.archetype;
  const speed = v.unitySpec.maxSpeedKmh;
  if (arch === 'pickup' || arch === 'monster' || arch === 'buggy' || v.id === 55) return 'offroad';
  if (arch === 'supercar' || (arch === 'convertible' && speed >= 300) || v.id === 57) return 'hyper';
  if (
    arch === 'coupe' ||
    arch === 'roadster' ||
    arch === 'convertible' ||
    arch === 'muscle' ||
    (arch === 'wagon' && speed >= 250) ||
    (arch === 'hatch' && speed >= 230)
  ) {
    if (v.id === 67) return 'luxury';
    return 'sport';
  }
  if (
    arch === 'classic' ||
    v.id === 2 ||
    v.id === 59 ||
    v.id === 20 ||
    (arch === 'sedan' && v.category !== 'Emergência & Polícia' && v.id !== 7) ||
    (arch === 'suv' && speed >= 220)
  ) {
    return 'luxury';
  }
  if (arch === 'suv') return 'offroad';
  return 'standard';
}

function getHoodSlopeFactor(aeroTier: AeroTier, hoodSlope: number): number {
  if (aeroTier === 'hyper') return Math.max(hoodSlope, 0.42) * 0.50;
  if (aeroTier === 'sport') return Math.max(hoodSlope, 0.24) * 0.42;
  if (aeroTier === 'luxury') return Math.max(hoodSlope, 0.20) * 0.34;
  return hoodSlope * 0.28;
}

function getAeroSculptOpts(
  aeroTier: AeroTier,
  yMin: number,
  yMax: number,
  halfL: number,
  isHatch: boolean,
): SideSculptOptions {
  if (aeroTier === 'hyper') {
    return {
      yMin,
      yMax,
      zMin: -halfL + 0.05,
      zMax: halfL - 0.05,
      bellyBulge: 0.032,
      tumblehomeInset: 0.058,
      rockerTuck: 0.034,
      creaseBoost: 0.015,
      noseTailTaper: 0.068,
      waistPinch: 0.026,
      rearHaunchFlare: 0.036,
      frontHaunchFlare: 0.020,
      nosePlanTaper: 0.088,
      tailPlanTaper: 0.056,
      crownDomeY: 0.026,
    };
  }
  if (aeroTier === 'sport') {
    return {
      yMin,
      yMax,
      zMin: -halfL + 0.05,
      zMax: halfL - 0.05,
      bellyBulge: 0.028,
      tumblehomeInset: 0.044,
      rockerTuck: 0.028,
      creaseBoost: 0.012,
      noseTailTaper: 0.066,
      waistPinch: 0.016,
      rearHaunchFlare: 0.024,
      frontHaunchFlare: 0.014,
      nosePlanTaper: 0.062,
      tailPlanTaper: 0.040,
      crownDomeY: 0.020,
    };
  }
  if (aeroTier === 'luxury') {
    return {
      yMin,
      yMax,
      zMin: -halfL + 0.05,
      zMax: halfL - 0.05,
      bellyBulge: 0.026,
      tumblehomeInset: 0.038,
      rockerTuck: 0.024,
      creaseBoost: 0.010,
      noseTailTaper: 0.064,
      waistPinch: 0.010,
      rearHaunchFlare: 0.016,
      frontHaunchFlare: 0.010,
      nosePlanTaper: 0.048,
      tailPlanTaper: 0.034,
      crownDomeY: 0.022,
    };
  }
  return {
    yMin,
    yMax,
    zMin: -halfL + 0.05,
    zMax: halfL - 0.05,
    bellyBulge: isHatch ? 0.024 : 0.020,
    tumblehomeInset: isHatch ? 0.025 : 0.022,
    rockerTuck: isHatch ? 0.020 : 0.018,
    creaseBoost: isHatch ? 0.010 : 0.008,
    noseTailTaper: isHatch ? 0.072 : 0.062,
  };
}

// =========================================================================
// 3. FASCIAS, EXHAUSTS, LIVERIES & VEHICLE ATTACHMENTS
// =========================================================================
export function addExhaustSystem(
  group: THREE.Group,
  width: number,
  halfL: number,
  groundClearance: number,
  mats: VehicleMaterialSet,
  style: ExhaustStyle,
) {
  if (style === 'none') return;
  const exGroup = new THREE.Group();

  const buildTip = (x: number, y: number, z: number, r = 0.042, len = 0.18) => {
    const tipGrp = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, len, 16), mats.chrome);
    pipe.rotation.x = Math.PI / 2;
    tipGrp.add(pipe);
    const bore = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.78, r * 0.78, len + 0.012, 14),
      mats.exhaustBore,
    );
    bore.rotation.x = Math.PI / 2;
    tipGrp.add(bore);
    tipGrp.position.set(x, y, z);
    return tipGrp;
  };

  if (style === 'quad') {
    [-1, 1].forEach((side) => {
      exGroup.add(buildTip(side * width * 0.3, 0, 0, 0.036, 0.18));
      exGroup.add(buildTip(side * width * 0.38, 0, 0.01, 0.036, 0.18));
    });
    exGroup.position.set(0, groundClearance + 0.08, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Quádruplo Esportivo', 0, -0.1, -0.6);
  } else if (style === 'center_twin') {
    exGroup.add(buildTip(-0.075, 0, 0, 0.044, 0.2));
    exGroup.add(buildTip(0.075, 0, 0, 0.044, 0.2));
    exGroup.position.set(0, groundClearance + 0.09, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Central Duplo', 0, -0.1, -0.6);
  } else if (style === 'side_pipes') {
    [-1, 1].forEach((side) => {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, halfL * 1.05, 14),
        mats.chrome,
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * (width * 0.51), 0, 0);
      exGroup.add(pipe);
      const tip = buildTip(side * (width * 0.52), 0, -halfL * 0.48, 0.046, 0.16);
      tip.rotation.y = side * 0.45;
      exGroup.add(tip);
    });
    exGroup.position.set(0, groundClearance + 0.06, -halfL * 0.05);
    tagPart(exGroup, 'Escapamentos Laterais Cromados', 0, -0.15, 0);
  } else if (style === 'single') {
    exGroup.add(buildTip(width * 0.28, 0, 0, 0.04, 0.18));
    exGroup.position.set(0, groundClearance + 0.07, -halfL - 0.03);
    tagPart(exGroup, 'Escapamento Traseiro Cromado', 0.2, -0.1, -0.55);
  } else {
    [-1, 1].forEach((side) => {
      exGroup.add(buildTip(side * width * 0.28, 0, 0, 0.042, 0.18));
    });
    exGroup.position.set(0, groundClearance + 0.08, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Duplo Esportivo', 0, -0.1, -0.6);
  }

  const muffler = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.44, 0.11, 0.26, 0.03, 2, 8),
    mats.alloy,
  );
  muffler.position.set(0, 0.02, 0.22);
  exGroup.add(muffler);
  group.add(exGroup);
}

export function addFrontAndRearFascias(
  group: THREE.Group,
  length: number,
  width: number,
  groundClearance: number,
  hoodHeight: number,
  rearHeight: number,
  mats: VehicleMaterialSet,
  attachments: VehicleAttachment[],
  archetype: string,
  includeMirrors = true,
  cityMode = false,
  animated?: BuiltVehicle['animatedParts'],
  aeroTier: AeroTier = 'standard',
) {
  const halfL = length / 2;
  const isSupercar = archetype === 'supercar';
  const isHyper = aeroTier === 'hyper';
  const isSport = aeroTier === 'sport';
  const isLuxury = aeroTier === 'luxury';
  const isAero = isHyper || isSport || isLuxury;
  const isPickupArch = archetype === 'pickup' || archetype === 'monster';
  const isCleanEvNose = isSupercar && attachments.includes('aero_covers');
  const frontY = groundClearance + hoodHeight * (isHyper ? 0.48 : isSport ? 0.54 : isLuxury ? 0.57 : 0.60);
  const rearY = groundClearance + rearHeight * 0.64;
  const isQuad =
    attachments.includes('quad_headlights') ||
    archetype === 'coupe' ||
    archetype === 'convertible' ||
    archetype === 'muscle';

  // Sleek recessed upper grille with honeycomb mesh, black surround & horizontal slats (or sealed EV nose)
  const grilleW = width * (isHyper ? 0.50 : isQuad ? 0.44 : 0.46);
  const grilleH = Math.max(0.088, hoodHeight * (isHyper ? 0.17 : isSport ? 0.21 : 0.25));
  const grilleY = isHyper ? groundClearance + Math.max(0.11, hoodHeight * 0.30) : frontY - 0.020;
  const grilleZ = isHyper ? halfL - 0.012 : halfL + 0.002;

  if (!isCleanEvNose) {
    const grille = new THREE.Mesh(
      createRoundedBoxGeo(grilleW, grilleH, 0.052, 0.016, 2, 8),
      mats.grilleMesh,
    );
    grille.position.set(0, grilleY, grilleZ);
    tagPart(grille, 'Grade Frontal Texturizada', 0, 0, 0.42);
    group.add(grille);

    // Satin-black perimeter frame around upper grille
    const surroundTop = new THREE.Mesh(
      createRoundedBoxGeo(grilleW + 0.044, 0.016, 0.056, 0.006, 1, 6),
      mats.windowTrim,
    );
    surroundTop.position.set(0, grilleY + grilleH * 0.5, grilleZ + 0.004);
    const surroundBot = new THREE.Mesh(
      createRoundedBoxGeo(grilleW + 0.038, 0.015, 0.056, 0.006, 1, 6),
      mats.windowTrim,
    );
    surroundBot.position.set(0, grilleY - grilleH * 0.5, grilleZ + 0.004);
    tagPart(surroundTop, 'Moldura da Grade', 0, 0, 0.44);
    group.add(surroundTop, surroundBot);

    [-1, 1].forEach((side) => {
      const sideBezel = new THREE.Mesh(
        createRoundedBoxGeo(0.018, grilleH + 0.014, 0.056, 0.005, 1, 4),
        mats.windowTrim,
      );
      sideBezel.position.set(side * (grilleW * 0.5 + 0.010), grilleY, grilleZ + 0.004);
      group.add(sideBezel);
    });

    // Horizontal black slats (filetes horizontais) across the textured grille
    const slatRatios = cityMode ? [-0.22, 0.22] : [-0.28, 0, 0.28];
    slatRatios.forEach((sy) => {
      const slat = new THREE.Mesh(
        createRoundedBoxGeo(grilleW * 0.94, 0.012, 0.058, 0.004, 1, 6),
        mats.windowTrim,
      );
      slat.position.set(0, grilleY + grilleH * sy, grilleZ + 0.005);
      group.add(slat);
    });

    if (!cityMode) {
      // Chrome accent trim strip & sculpted circular brand emblem medallion
      const badgeBar = new THREE.Mesh(
        createRoundedBoxGeo(grilleW * 0.58, 0.010, 0.060, 0.004, 1, 6),
        mats.chrome,
      );
      badgeBar.position.set(0, grilleY, grilleZ + 0.006);
      group.add(badgeBar);

      const badgeBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.014, 18).rotateX(Math.PI / 2),
        mats.windowTrim,
      );
      badgeBase.position.set(0, grilleY, grilleZ + 0.030);
      const badgeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.031, 0.0055, 8, 22),
        mats.chrome,
      );
      badgeRing.position.set(0, grilleY, grilleZ + 0.037);
      const badgeCrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, 0.008, 0.010),
        mats.chrome,
      );
      badgeCrest.position.set(0, grilleY, grilleZ + 0.037);
      badgeCrest.rotation.z = 0.25;
      group.add(badgeBase, badgeRing, badgeCrest);
    }
  } else {
    // Sleek full-width EV LED light signature accent across clean nose
    const evBar = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.66, 0.016, 0.034, 0.006, 2, 6),
      mats.drlLed,
    );
    evBar.position.set(0, frontY + 0.03, halfL + 0.006);
    group.add(evBar);
  }

  // Sculpted wrap-around lower bumper valence, lower air intake & fog lamp air curtains
  const lowerIntakeY = groundClearance + 0.078;
  const lowerIntakeZ = halfL + 0.014;
  const lowerIntakeW = width * 0.50;
  const lowerIntake = new THREE.Mesh(
    createRoundedBoxGeo(lowerIntakeW, 0.072, 0.056, 0.014, 2, 8),
    mats.grilleMesh,
  );
  lowerIntake.position.set(0, lowerIntakeY, lowerIntakeZ);
  tagPart(lowerIntake, 'Entrada de Ar Inferior do Para-choque', 0, -0.05, 0.44);
  group.add(lowerIntake);

  const lowerFrameTop = new THREE.Mesh(
    createRoundedBoxGeo(lowerIntakeW + 0.028, 0.014, 0.058, 0.005, 1, 4),
    mats.windowTrim,
  );
  lowerFrameTop.position.set(0, lowerIntakeY + 0.036, lowerIntakeZ + 0.002);
  const lowerFrameBot = new THREE.Mesh(
    createRoundedBoxGeo(lowerIntakeW + 0.028, 0.014, 0.058, 0.005, 1, 4),
    mats.windowTrim,
  );
  lowerFrameBot.position.set(0, lowerIntakeY - 0.036, lowerIntakeZ + 0.002);
  group.add(lowerFrameTop, lowerFrameBot);

  if (!cityMode) {
    // Sleek lower front aero chin splitter lip
    const chinLip = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.86, 0.024, 0.14, 0.010, 2, 8),
      mats.windowTrim,
    );
    chinLip.position.set(0, groundClearance + 0.020, halfL - 0.022);
    tagPart(chinLip, 'Splitter Aerodinâmico Dianteiro', 0, -0.08, 0.48);
    group.add(chinLip);

    // Horizontal lower intake louvers
    [-0.015, 0.015].forEach((ly) => {
      const lBar = new THREE.Mesh(
        createRoundedBoxGeo(lowerIntakeW * 0.92, 0.008, 0.060, 0.003, 1, 4),
        mats.windowTrim,
      );
      lBar.position.set(0, lowerIntakeY + ly, lowerIntakeZ + 0.003);
      group.add(lBar);
    });

    [-1, 1].forEach((side) => {
      const acX = side * (width * 0.355);
      const acY = groundClearance + 0.086;
      const acZ = halfL - 0.004;
      const airCurtain = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.135, 0.070, 0.052, 0.012, 2, 6),
        mats.grilleMesh,
      );
      airCurtain.position.set(acX, acY, acZ);
      airCurtain.rotation.y = side * 0.18;
      group.add(airCurtain);

      // Multi-layer circular fog light pod + satin bezel + chrome ring + glass lens inside air curtain
      if (!isSupercar) {
        const fogGrp = new THREE.Group();
        fogGrp.position.set(acX + side * 0.008, acY, halfL + 0.022);
        fogGrp.rotation.y = side * 0.18;
        const fogPocket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 0.016, 16).rotateX(Math.PI / 2),
          mats.windowTrim,
        );
        fogPocket.position.z = -0.004;
        const fogRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.024, 0.0045, 8, 18),
          mats.chrome,
        );
        fogRim.position.z = 0.004;
        const fogOptic = new THREE.Mesh(
          new THREE.CylinderGeometry(0.019, 0.017, 0.014, 16).rotateX(Math.PI / 2),
          mats.drlLed,
        );
        fogOptic.position.z = 0.001;
        const fogLens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.022, 0.005, 16).rotateX(Math.PI / 2),
          mats.headlightLens,
        );
        fogLens.position.z = 0.007;
        fogLens.userData.noShadow = true;
        fogGrp.add(fogPocket, fogRim, fogOptic, fogLens);
        tagPart(fogGrp, 'Farol de Neblina Dianteiro', side * 0.25, -0.06, 0.44);
        group.add(fogGrp);
      }
    });
  }

  // Sculpted 3-layer curved automotive headlamps & taillights positioned proud of nose/fender skin
  const hlW = width * (isSupercar ? 0.20 : 0.19);
  const hlH = Math.max(0.068, hoodHeight * (isSupercar ? 0.14 : 0.165));
  [-1, 1].forEach((side) => {
    const sigMat = side < 0 ? mats.signalLeft : mats.signalRight;
    const hlGroup = createBeveledHeadlightAssembly(
      {
        width: hlW * 1.15,
        height: hlH * 1.15,
        depth: 0.068,
        sweepZ: Math.min(0.032, hlW * 0.13),
        style: isQuad || archetype === 'classic' ? 'quad_pods' : 'twin_projector',
        side: side as -1 | 1,
        signalMat: sigMat,
        frameMat: archetype === 'classic' ? mats.chrome : mats.windowTrim,
      },
      mats,
      cityMode,
    );

    hlGroup.position.set(
      side * (width * (isHyper ? 0.335 : 0.342)),
      frontY + (isHyper ? 0.045 : 0.020),
      halfL - (isHyper ? 0.045 : isSport ? 0.012 : -0.022),
    );
    hlGroup.rotation.y = side * (isHyper ? 0.22 : archetype === 'hatch' || isSport ? 0.14 : 0.09);
    hlGroup.rotation.x = isHyper ? 0.28 : isSport ? 0.14 : 0.03;
    tagPart(
      hlGroup,
      side < 0 ? 'Conjunto Óptico Dianteiro Esquerdo' : 'Conjunto Óptico Dianteiro Direito',
      side * 0.25,
      0.05,
      0.42,
    );
    group.add(hlGroup);

    const beam = createHeadlightBeamMesh(3.6, 0.56, 0.10);
    beam.position.set(side * (width * 0.345), frontY + 0.020, halfL + 0.085);
    group.add(beam);
    animated?.headlightBeams.push(beam);

    // 3-layer curved rear automotive taillight assembly
    const tlGroup = createBeveledTaillightAssembly(
      {
        width: hlW * 1.24,
        height: hlH * 1.04,
        depth: 0.062,
        sweepZ: Math.min(0.032, hlW * 0.13),
        style: archetype === 'classic' ? 'twin_round' : 'modern_blade',
        side: side as -1 | 1,
        signalMat: sigMat,
        frameMat: archetype === 'classic' ? mats.chrome : mats.windowTrim,
      },
      mats,
      cityMode,
    );

    const isHatchRear = archetype === 'hatch';
    tlGroup.position.set(
      side * (width * (isHatchRear ? 0.342 : isPickupArch ? 0.405 : 0.335)),
      isHatchRear ? groundClearance + rearHeight * 0.72 : rearY,
      isHatchRear ? -halfL - 0.010 : isPickupArch ? -halfL + 0.012 : -halfL - 0.012,
    );
    tlGroup.rotation.y = -side * (isHatchRear ? 0.12 : isHyper ? 0.16 : 0.09);
    if (isHatchRear) {
      tlGroup.rotation.x = 0.08;
    }
    tagPart(
      tlGroup,
      side < 0 ? 'Lanterna Traseira Esquerda' : 'Lanterna Traseira Direita',
      side * 0.25,
      0.05,
      -0.42,
    );
    group.add(tlGroup);

    if (includeMirrors) {
      const mirrorGroup = createAerodynamicMirror(side, mats, cityMode);
      mirrorGroup.position.set(
        side * (width * 0.48),
        groundClearance + hoodHeight + 0.06,
        halfL * 0.22,
      );
      tagPart(
        mirrorGroup,
        side < 0 ? 'Retrovisor Externo Esquerdo' : 'Retrovisor Externo Direito',
        side * 0.45,
        0.12,
        0,
      );
      group.add(mirrorGroup);
    }
  });

  if (isCleanEvNose) {
    const rearLightBar = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.56, 0.020, 0.030, 0.006, 2, 6),
      mats.taillight,
    );
    rearLightBar.position.set(0, rearY + 0.01, -halfL + 0.004);
    group.add(rearLightBar);
  }

  const fPlateY = THREE.MathUtils.clamp(
    grilleY - grilleH * 0.5 - 0.062,
    groundClearance + 0.165,
    Math.max(groundClearance + 0.18, grilleY - grilleH * 0.5 - 0.048),
  );
  const fPlate = createLicensePlateGroup(
    { variant: 'car', width: 0.39, height: 0.10 },
    mats,
    cityMode,
  );
  fPlate.position.set(0, fPlateY, halfL + 0.038);
  tagPart(fPlate, 'Placa Dianteira', 0, -0.05, 0.48);
  group.add(fPlate);

  const rPlate = createLicensePlateGroup(
    { variant: 'car', isRear: true, width: 0.39, height: 0.10 },
    mats,
    cityMode,
  );
  rPlate.position.set(
    0,
    isPickupArch
      ? groundClearance + 0.105
      : archetype === 'hatch'
        ? groundClearance + rearHeight * 0.42
        : rearY - 0.045,
    isPickupArch ? -halfL - 0.024 : archetype === 'hatch' ? -halfL - 0.026 : -halfL - 0.028,
  );
  tagPart(rPlate, 'Placa Traseira', 0, -0.05, -0.48);
  group.add(rPlate);

  const buildWrapBumperGeo = (bw: number, bh: number, bd: number, wrapSign: 1 | -1, isChrome: boolean) => {
    if ((archetype === 'hatch' || isAero) && !isChrome) {
      return createBeveledWrapBumperGeo(bw, bh, bd, wrapSign === 1, cityMode, isHyper ? 1.25 : isAero ? 1.1 : 1.0);
    }
    return createSculptedPanelGeo(
      bw,
      bh,
      bd,
      cityMode ? 8 : 14,
      3,
      3,
      isChrome ? 0.038 : 0.036,
      (pos, idx, hx, hy) => {
        const x = pos.getX(idx);
        const y = pos.getY(idx);
        const z = pos.getZ(idx);
        const nx = Math.abs(x) / Math.max(0.1, hx);
        const ny = y / Math.max(0.02, hy);
        const cornerSweep = -wrapSign * Math.pow(nx, 2.0) * (bd * (isAero ? 1.2 : 0.95));
        const bellyFwd = wrapSign * Math.cos(nx * Math.PI * 0.5) * 0.018 * (1 - Math.abs(ny) * 0.35);
        const lowerChin = ny < 0 ? -wrapSign * Math.abs(ny) * 0.012 : 0;
        pos.setZ(idx, z + cornerSweep + bellyFwd + lowerChin);
      },
    );
  };

  if (attachments.includes('chrome_bumpers')) {
    const fBumper = new THREE.Mesh(
      buildWrapBumperGeo(width * 0.98, 0.105, 0.115, 1, true),
      mats.chrome,
    );
    fBumper.position.set(0, groundClearance + 0.088, halfL - 0.012);
    tagPart(fBumper, 'Para-choque Dianteiro Cromado', 0, -0.05, 0.5);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(
      buildWrapBumperGeo(width * 0.98, 0.105, 0.115, -1, true),
      mats.chrome,
    );
    rBumper.position.set(0, groundClearance + 0.088, -halfL + 0.012);
    tagPart(rBumper, 'Para-choque Traseiro Cromado', 0, -0.05, -0.5);
    group.add(rBumper);
  } else {
    const isHatchBump = archetype === 'hatch' || isAero;
    const fBumper = new THREE.Mesh(
      buildWrapBumperGeo(
        width * (isHyper ? 0.92 : isHatchBump ? 0.95 : 0.95),
        isHyper ? 0.110 : isHatchBump ? 0.132 : 0.115,
        isHyper ? 0.26 : isHatchBump ? 0.24 : 0.095,
        1,
        false,
      ),
      mats.secondary,
    );
    fBumper.position.set(
      0,
      groundClearance + (isHyper ? 0.072 : isHatchBump ? 0.084 : 0.082),
      halfL - (isHyper ? 0.145 : isHatchBump ? 0.128 : 0.036),
    );
    tagPart(fBumper, 'Para-choque Dianteiro Esculpido', 0, -0.06, 0.44);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(
      buildWrapBumperGeo(
        width * (isHyper ? 0.93 : isHatchBump ? 0.95 : 0.95),
        isHyper ? 0.125 : isHatchBump ? 0.145 : 0.115,
        isHyper ? 0.26 : isHatchBump ? 0.24 : 0.095,
        -1,
        false,
      ),
      mats.secondary,
    );
    rBumper.position.set(
      0,
      groundClearance + (isHyper ? 0.078 : isHatchBump ? 0.092 : 0.082),
      -halfL + (isHyper ? 0.140 : isHatchBump ? 0.128 : 0.036),
    );
    tagPart(rBumper, 'Para-choque Traseiro Esculpido', 0, -0.06, -0.44);
    group.add(rBumper);
  }

  // Rear bumper reflectors, aerodynamic diffuser strakes & center chrome badge emblem
  if (!cityMode) {
    const isHatchRear = archetype === 'hatch';
    const refZ = -halfL + (isHatchRear || isAero ? 0.008 : 0.002);
    const refY = groundClearance + 0.11;
    [-1, 1].forEach((side) => {
      const refHousing = new THREE.Mesh(
        createRoundedBoxGeo(0.115, 0.022, 0.018, 0.006, 1, 6),
        mats.trim,
      );
      refHousing.position.set(side * (width * 0.36), refY, refZ);
      refHousing.rotation.y = -side * (isAero ? 0.24 : 0.18);
      const refLens = new THREE.Mesh(
        createRoundedBoxGeo(0.098, 0.014, 0.020, 0.004, 1, 6),
        mats.taillight,
      );
      refLens.position.copy(refHousing.position);
      refLens.position.z -= 0.002;
      refLens.rotation.y = refHousing.rotation.y;
      group.add(refHousing, refLens);
    });

    // 4 sculpted swept lower rear diffuser strake fins
    for (let f = -1.5; f <= 1.5; f += 1) {
      const fin = new THREE.Mesh(
        createRoundedBoxGeo(0.014, 0.056, 0.105, 0.004, 1, 4),
        mats.trim,
      );
      fin.position.set(f * (width * 0.12), groundClearance + 0.036, -halfL + 0.040);
      fin.rotation.x = -0.22;
      group.add(fin);
    }

    // Center rear chrome medallion emblem above license plate (skip on open pickup tailgate gap)
    if (!isPickupArch) {
      const rearBadgeY = isHatchRear ? groundClearance + rearHeight * 0.68 : rearY + 0.075;
      const rearBadgeZ = isHatchRear ? -halfL + 0.032 : -halfL - 0.002;
      const rearBadgeRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.028, 0.005, 8, 20),
        mats.chrome,
      );
      rearBadgeRing.position.set(0, rearBadgeY, rearBadgeZ);
      const rearBadgeBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, 0.010, 16).rotateX(Math.PI / 2),
        mats.trim,
      );
      rearBadgeBase.position.set(0, rearBadgeY, rearBadgeZ + 0.004);
      group.add(rearBadgeBase, rearBadgeRing);
    }
  }
}

export function addCarBodyDetailsAndLivery(
  group: THREE.Group,
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  bodyLift: number,
  bodyH: number,
  hoodH: number,
  rearH: number,
  roofY: number,
  cabCenterZ: number,
  cabLen: number,
  livery: PaintLivery,
  skipSideTrim = false,
) {
  const { length, width } = v.dimensions;
  const halfL = length / 2;
  const isTruck =
    v.geometry.archetype === 'semi_truck' ||
    v.geometry.archetype === 'dump_truck' ||
    v.geometry.archetype === 'mixer_truck' ||
    v.geometry.archetype === 'firetruck' ||
    v.geometry.archetype === 'tow_truck';

  if (!isTruck) {
    if (!skipSideTrim) {
      [-1, 1].forEach((side) => {
        const handlePocket = new THREE.Mesh(
          createRoundedBoxGeo(0.012, 0.028, 0.145, 0.005, 1, 4),
          mats.panelGap,
        );
        handlePocket.position.set(side * (width * 0.496), bodyLift + bodyH * 0.80, 0.04);
        const handle = new THREE.Mesh(
          createRoundedBoxGeo(0.026, 0.024, 0.135, 0.008, 2, 6),
          mats.chrome,
        );
        handle.position.set(side * (width * 0.506), bodyLift + bodyH * 0.80, 0.04);
        tagPart(handle, 'Maçanetas Cromadas', side * 0.4, 0.05, 0);
        group.add(handlePocket, handle);

        const molding = new THREE.Mesh(
          new THREE.BoxGeometry(0.020, 0.030, length * 0.48),
          mats.windowTrim,
        );
        molding.position.set(side * (width * 0.499), bodyLift + bodyH * 0.44, 0);
        tagPart(molding, 'Friso Lateral da Carroceria', side * 0.4, 0, 0);
        group.add(molding);
      });
    }

    const fuelCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.022, 14),
      mats.windowTrim,
    );
    fuelCap.rotation.z = Math.PI / 2;
    fuelCap.position.set(width * 0.500, bodyLift + rearH * 0.72, -halfL * 0.58);
    tagPart(fuelCap, 'Portinhola de Combustível', 0.4, 0.05, -0.2);
    group.add(fuelCap);

    if (
      v.geometry.archetype !== 'convertible' &&
      v.geometry.archetype !== 'roadster' &&
      v.geometry.archetype !== 'classic' &&
      v.geometry.archetype !== 'buggy'
    ) {
      const antenaGrp = new THREE.Group();
      const antBase = new THREE.Mesh(
        createRoundedBoxGeo(0.042, 0.012, 0.16, 0.005, 1, 6),
        mats.windowTrim,
      );
      const finShape = new THREE.Shape();
      finShape.moveTo(-0.072, 0);
      finShape.lineTo(0.068, 0);
      finShape.quadraticCurveTo(0.005, 0.042, -0.054, 0.074);
      finShape.quadraticCurveTo(-0.068, 0.074, -0.072, 0);
      finShape.closePath();
      const finGeo = createExtrudedProfile(finShape, 0.024, 0.006, 0.006, 2, 10, 1);
      const finMesh = new THREE.Mesh(
        finGeo,
        v.palette.trim === 'chrome' ? mats.chrome : mats.windowTrim,
      );
      finMesh.position.y = 0.004;
      antenaGrp.add(antBase, finMesh);
      const roofSurfaceY = roofY + (v.geometry.archetype === 'hatch' ? 0.064 : 0.042);
      antenaGrp.position.set(0, roofSurfaceY, cabCenterZ - cabLen * 0.27);
      tagPart(antenaGrp, 'Antena Shark-Fin no Teto', 0, 0.5, -0.15);
      group.add(antenaGrp);
    }

    // Extra bespoke exterior details for open-top cars (side fender gills, fog lamps, rear deck garnish & sill blades)
    if (v.geometry.archetype === 'convertible' || v.geometry.archetype === 'roadster') {
      [-1, 1].forEach((side) => {
        // Side front fender extractor vent/gill ahead of door
        const gill = new THREE.Mesh(
          createRoundedBoxGeo(0.024, 0.095, 0.24, 0.008, 2, 6),
          mats.grille,
        );
        gill.position.set(side * (width * 0.494), bodyLift + hoodH * 0.66, cabCenterZ + cabLen * 0.52 + 0.18);
        group.add(gill);

        // Fog lamp pod inset into lower front bumper apron
        const fog = new THREE.Mesh(
          createRoundedBoxGeo(0.14, 0.055, 0.04, 0.01, 2, 6),
          mats.headlight,
        );
        fog.position.set(side * (width * 0.31), bodyLift + 0.11, halfL + 0.042);
        group.add(fog);
      });

      // Center rear trunk garnish / retro reflector bar + high-mount brake lamp
      const deckBadge = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.34, 0.06, 0.032, 0.01, 2, 6),
        v.palette.trim === 'chrome' ? mats.chrome : mats.grille,
      );
      deckBadge.position.set(0, bodyLift + rearH * 0.62, -halfL - 0.005);
      const thirdBrake = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.024, 0.03),
        mats.taillight,
      );
      thirdBrake.position.set(0, bodyLift + rearH + 0.01, -halfL + 0.10);
      group.add(deckBadge, thirdBrake);
    }
  }

  if (livery === 'racing_stripes' || livery === 'rally') {
    const stripeGrp = new THREE.Group();
    [-0.14, 0.14].forEach((sx) => {
      if (v.geometry.archetype !== 'convertible' && v.geometry.archetype !== 'roadster') {
        const roofS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, cabLen * 0.52),
          mats.liveryStripe,
        );
        roofS.position.set(sx, roofY + 0.025, cabCenterZ);
        stripeGrp.add(roofS);
      }
      if (skipSideTrim) {
        // Short bumper/nose accent when hood opens separately
        const noseS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, 0.18),
          mats.liveryStripe,
        );
        noseS.position.set(sx, bodyLift + hoodH * 0.94, halfL - 0.12);
        stripeGrp.add(noseS);
      } else {
        const hoodS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, length * 0.34),
          mats.liveryStripe,
        );
        hoodS.position.set(sx, bodyLift + hoodH + 0.04, halfL * 0.62);
        hoodS.rotation.x = v.geometry.hoodSlope * 0.24;
        stripeGrp.add(hoodS);

        if (v.geometry.archetype !== 'pickup' && v.geometry.archetype !== 'monster') {
          const rearS = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.018, Math.max(0.32, length * v.geometry.rearDeckRatio * 0.9)),
            mats.liveryStripe,
          );
          rearS.position.set(sx, bodyLift + rearH + 0.01, -halfL * 0.72);
          stripeGrp.add(rearS);
        }
      }
    });
    if (livery === 'rally') {
      [-1, 1].forEach((side) => {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.02, 20),
          mats.liveryStripe,
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.set(side * (width * 0.504), bodyLift + bodyH * 0.56, -halfL * 0.56);
        stripeGrp.add(plate);
      });
    }
    tagPart(stripeGrp, 'Pintura Faixas Esportivas GT', 0, 0.35, 0);
    group.add(stripeGrp);
  } else if (livery === 'two_tone') {
    const ttGrp = new THREE.Group();
    if (skipSideTrim) {
      [-1, 1].forEach((side) => {
        const rocker = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, bodyH * 0.22, length * 0.92),
          mats.secondary,
        );
        rocker.position.set(side * (width * 0.492), bodyLift + bodyH * 0.14, 0);
        ttGrp.add(rocker);
      });
    } else {
      const wrap = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.015, bodyH * 0.22, length * 0.92),
        mats.secondary,
      );
      wrap.position.set(0, bodyLift + bodyH * 0.14, 0);
      ttGrp.add(wrap);
    }
    tagPart(ttGrp, 'Pintura Bicolor com Filete', 0, 0.1, 0);
    group.add(ttGrp);
  } else if (livery === 'side_stripe' && !skipSideTrim) {
    const sideGrp = new THREE.Group();
    [-1, 1].forEach((side) => {
      const spear = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.09, length * 0.68),
        mats.liveryStripe,
      );
      spear.position.set(side * (width * 0.502), bodyLift + bodyH * 0.58, 0);
      sideGrp.add(spear);
    });
    tagPart(sideGrp, 'Pintura Faixa Lateral Esportiva', 0, 0.15, 0);
    group.add(sideGrp);
  }
}

export function addVehicleAttachments(
  group: THREE.Group,
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  roofY: number,
  rearY: number,
  hoodY: number,
  animated: BuiltVehicle['animatedParts'],
  aeroTier: AeroTier = 'standard',
  archCenterYOverride?: number,
) {
  const { length, width } = v.dimensions;
  const halfL = length / 2;
  const atts = v.geometry.attachments;
  const isPickupArch = v.geometry.archetype === 'pickup' || v.geometry.archetype === 'monster';
  const isAero = aeroTier === 'hyper' || aeroTier === 'sport' || aeroTier === 'luxury';

  if (atts.includes('spoiler_gt') || atts.includes('wing_swan')) {
    const isSwan = atts.includes('wing_swan');
    const wingGroup = new THREE.Group();
    const bladeSpan = width * (isPickupArch ? 0.88 : 0.94);
    const bladeGeo = createSculptedPanelGeo(
      bladeSpan,
      0.036,
      0.28,
      12,
      3,
      6,
      0.014,
      (pos, idx, hx, _hy, hz) => {
        const px = pos.getX(idx);
        const py = pos.getY(idx);
        const pz = pos.getZ(idx);
        const nx = THREE.MathUtils.clamp(Math.abs(px) / Math.max(0.1, hx), 0, 1);
        const tz = THREE.MathUtils.clamp(pz / Math.max(0.05, hz), -1, 1);
        // Swept leading edge + airfoil camber + mild dihedral wing arch
        const sweepBack = -Math.pow(nx, 1.65) * 0.048;
        const airfoilCamber = 0.016 * Math.cos(tz * Math.PI * 0.5);
        const dihedral = 0.018 * Math.pow(nx, 1.4);
        pos.setXYZ(idx, px, py + airfoilCamber + dihedral, pz + sweepBack);
      },
    );
    const blade = new THREE.Mesh(bladeGeo, mats.trim);
    const bladeY = isSwan ? 0.34 : isPickupArch ? 0.14 : 0.21;
    blade.position.y = bladeY;
    blade.rotation.x = -0.11;
    wingGroup.add(blade);

    const pylonSpan = isPickupArch ? 0.38 : isSwan ? 0.22 : 0.25;
    [-1, 1].forEach((side) => {
      // Swept sculpted wing endplates
      const epShape = new THREE.Shape();
      epShape.moveTo(-0.18, -0.07);
      epShape.lineTo(0.14, -0.05);
      epShape.quadraticCurveTo(0.18, 0.02, 0.12, 0.09);
      epShape.lineTo(-0.16, 0.11);
      epShape.closePath();
      const epGeo = createExtrudedProfile(epShape, 0.022, 0.005, 0.005, 2, 8, 1);
      const endplate = new THREE.Mesh(epGeo, mats.accent);
      endplate.position.set(side * (bladeSpan * 0.5), bladeY - 0.01, -0.04);
      wingGroup.add(endplate);

      const pylon = makeBeamBetween(
        new THREE.Vector3(side * (width * pylonSpan), 0.0, isSwan ? 0.08 : 0.02),
        new THREE.Vector3(side * (width * pylonSpan), bladeY + (isSwan ? 0.02 : -0.01), isSwan ? -0.02 : -0.02),
        0.028,
        0.115,
        mats.secondary,
        new THREE.Vector3(side, 0.1, 0),
        0.006,
      );
      wingGroup.add(pylon);
    });
    const isHatchWing = v.geometry.archetype === 'hatch';
    wingGroup.position.set(
      0,
      isHatchWing ? roofY - 0.01 : rearY + 0.015,
      isHatchWing ? -halfL + 0.48 : -halfL + 0.18,
    );
    tagPart(
      wingGroup,
      isSwan ? 'Aerofólio Pescoço-de-Cisne' : 'Aerofólio Esportivo GT',
      0,
      0.45,
      -0.45,
    );
    group.add(wingGroup);
  }

  if (atts.includes('splitter')) {
    const splitterGrp = new THREE.Group();
    const splitterGeo = createBeveledWrapBumperGeo(width * 0.94, 0.026, 0.22, true, false, 1.15);
    const splitter = new THREE.Mesh(splitterGeo, mats.trim);
    splitter.position.set(0, v.geometry.groundClearance + 0.018, halfL - 0.06);
    splitterGrp.add(splitter);
    if (isAero) {
      [-1, 1].forEach((side) => {
        const winglet = new THREE.Mesh(
          createRoundedBoxGeo(0.016, 0.055, 0.12, 0.005, 1, 6),
          mats.trim,
        );
        winglet.position.set(side * (width * 0.46), v.geometry.groundClearance + 0.042, halfL - 0.10);
        winglet.rotation.z = -side * 0.18;
        splitterGrp.add(winglet);
      });
    }
    tagPart(splitterGrp, 'Splitter Aerodinâmico Frontal', 0, -0.15, 0.45);
    group.add(splitterGrp);
  }

  if (atts.includes('canards')) {
    [-1, 1].forEach((side) => {
      const cShape = new THREE.Shape();
      cShape.moveTo(0, 0);
      cShape.lineTo(0.18, 0.02);
      cShape.quadraticCurveTo(0.10, 0.055, -0.02, 0.04);
      cShape.closePath();
      const cGeo = createExtrudedProfile(cShape, 0.13, 0.005, 0.005, 2, 10, 1);
      cGeo.rotateY(Math.PI / 2);
      const canard = new THREE.Mesh(cGeo, mats.trim);
      canard.position.set(side * (width * 0.435), v.geometry.groundClearance + 0.135, halfL - 0.14);
      canard.rotation.y = side * 0.28;
      canard.rotation.z = side * 0.22;
      tagPart(canard, 'Canards Aerodinâmicos', side * 0.3, 0, 0.45);
      group.add(canard);
    });
  }

  if (atts.includes('diffuser')) {
    const diffGroup = new THREE.Group();
    const tray = new THREE.Mesh(
      createSculptedPanelGeo(width * 0.72, 0.036, 0.22, 8, 2, 4, 0.012, (pos, idx, hx) => {
        const nx = Math.abs(pos.getX(idx)) / Math.max(0.1, hx);
        pos.setZ(idx, pos.getZ(idx) + Math.pow(nx, 1.8) * 0.035);
      }),
      mats.trim,
    );
    tray.rotation.x = 0.20;
    tray.position.set(0, 0.004, 0.04);
    diffGroup.add(tray);
    for (let i = -2; i <= 2; i++) {
      const fin = new THREE.Mesh(
        createRoundedBoxGeo(0.016, 0.084, 0.16, 0.005, 2, 6),
        mats.trim,
      );
      fin.position.set(i * (width * 0.13), -0.008, -0.012);
      fin.rotation.x = -0.22;
      diffGroup.add(fin);
    }
    diffGroup.position.set(0, v.geometry.groundClearance + 0.044, -halfL + 0.015);
    tagPart(diffGroup, 'Difusor Traseiro com Aletas', 0, -0.12, -0.45);
    group.add(diffGroup);
  }

  if (atts.includes('intercooler')) {
    const ic = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.18, 0.08, 0.018, 2, 8),
      mats.alloy,
    );
    ic.position.set(0, v.geometry.groundClearance + 0.15, halfL + 0.02);
    tagPart(ic, 'Intercooler Frontal Aparente', 0, 0, 0.6);
    group.add(ic);
  }

  if (atts.includes('hood_scoop')) {
    const scoop = new THREE.Group();
    const body = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.28, 0.08, 0.56, 0.025, 3, 8),
      mats.secondary,
    );
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(width * 0.24, 0.055, 0.04), mats.grille);
    mouth.position.set(0, 0, 0.28);
    scoop.add(body, mouth);
    scoop.position.set(0, hoodY + 0.04, halfL * 0.55);
    tagPart(scoop, 'Entrada de Ar no Capô (Hood Scoop)', 0, 0.45, 0.1);
    group.add(scoop);
  }

  if (atts.includes('roof_scoop')) {
    const rScoop = new THREE.Mesh(
      createRoundedBoxGeo(0.32, 0.11, 0.55, 0.03, 3, 8),
      mats.trim,
    );
    rScoop.position.set(0, roofY + 0.05, -0.05);
    tagPart(rScoop, 'Tomada de Ar de Teto', 0, 0.55, 0);
    group.add(rScoop);
  }

  if (atts.includes('window_louvers')) {
    const louvers = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.66, 0.022, 0.12), mats.trim);
      slat.position.set(0, roofY - 0.08 - i * 0.065, -halfL * 0.34 - i * 0.12);
      slat.rotation.x = 0.25;
      louvers.add(slat);
    }
    tagPart(louvers, 'Veneziana Traseira Retrô', 0, 0.4, -0.45);
    group.add(louvers);
  }

  if (atts.includes('blower_v8')) {
    const blower = new THREE.Group();
    const block = new THREE.Mesh(
      createRoundedBoxGeo(0.36, 0.22, 0.46, 0.035, 3, 8),
      mats.chrome,
    );
    blower.add(block);
    const scoop = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.12, 0.34, 0.03, 3, 8),
      mats.chrome,
    );
    scoop.position.set(0, 0.16, 0.04);
    blower.add(scoop);
    [-0.1, 0, 0.1].forEach((bx) => {
      const butterfly = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14),
        mats.accent,
      );
      butterfly.rotation.x = Math.PI / 2;
      butterfly.position.set(bx, 0.16, 0.21);
      blower.add(butterfly);
    });
    blower.position.set(0, hoodY + 0.06, halfL * 0.56);
    tagPart(blower, 'Supercharger V8 Cromado', 0, 0.55, 0);
    group.add(blower);
  }

  if (atts.includes('widebody')) {
    const wbWheelZ = v.dimensions.wheelbase > 0 ? v.dimensions.wheelbase * 0.5 : 0.32 * length;
    const isOffroadWb = aeroTier === 'offroad' || v.geometry.groundClearance >= 0.23;
    const wbArchY = archCenterYOverride ?? v.geometry.wheelRadius * 0.98;
    const wbFlareR = v.geometry.wheelRadius * (isOffroadWb ? 1.21 : 1.16);
    [-1, 1].forEach((side) => {
      [wbWheelZ, -wbWheelZ].forEach((wz, idx) => {
        const flare = new THREE.Mesh(
          new THREE.TorusGeometry(wbFlareR, 0.058, 10, 22, Math.PI),
          mats.body,
        );
        flare.rotation.y = Math.PI / 2;
        flare.position.set(side * (width * 0.49), wbArchY, wz);
        tagPart(
          flare,
          idx === 0 ? 'Alargador Widebody Dianteiro' : 'Alargador Widebody Traseiro',
          side * 0.45,
          0,
          0,
        );
        group.add(flare);
      });
    });
  }

  if (atts.includes('snorkel')) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(width * 0.48, hoodY - 0.1, halfL * 0.38),
      new THREE.Vector3(width * 0.51, hoodY + 0.15, halfL * 0.32),
      new THREE.Vector3(width * 0.5, roofY + 0.06, halfL * 0.18),
    ]);
    const snk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.045, 12, false), mats.trim);
    const head = new THREE.Mesh(createRoundedBoxGeo(0.11, 0.12, 0.14, 0.02, 2, 6), mats.trim);
    head.position.set(width * 0.5, roofY + 0.1, halfL * 0.16);
    const snkGroup = new THREE.Group();
    snkGroup.add(snk, head);
    tagPart(snkGroup, 'Snorkel de Admissão Elevada', 0.45, 0.25, 0);
    group.add(snkGroup);
  }

  if (atts.includes('bullbar')) {
    const bull = new THREE.Group();
    const h = 0.36;
    const w = width * 0.68;
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, w, 14), mats.trim);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = h * 0.5;
    bull.add(topBar);
    const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, w, 14), mats.trim);
    botBar.rotation.z = Math.PI / 2;
    botBar.position.y = -h * 0.3;
    bull.add(botBar);
    [-0.32, 0, 0.32].forEach((bx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, 0.05), mats.trim);
      post.position.x = bx * w;
      bull.add(post);
    });
    bull.position.set(0, v.geometry.groundClearance + 0.28, halfL + 0.12);
    tagPart(bull, 'Quebra-Mato Tubular Frontal', 0, 0, 0.65);
    group.add(bull);
  }

  if (atts.includes('pushbar')) {
    const push = new THREE.Group();
    [-0.28, 0.28].forEach((px) => {
      const upright = new THREE.Mesh(
        createRoundedBoxGeo(0.07, 0.46, 0.12, 0.02, 2, 6),
        mats.trim,
      );
      upright.position.x = px * width;
      push.add(upright);
    });
    [0.14, -0.1].forEach((py) => {
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, width * 0.62, 14),
        mats.trim,
      );
      cross.rotation.z = Math.PI / 2;
      cross.position.y = py;
      push.add(cross);
    });
    push.position.set(0, v.geometry.groundClearance + 0.3, halfL + 0.12);
    tagPart(push, 'Para-Choque de Impulsão (Push-Bar)', 0, 0, 0.62);
    group.add(push);
  }

  if (atts.includes('spare_rear')) {
    const spare = createCraftedWheel(
      v.geometry.wheelRadius * 0.92,
      v.geometry.wheelWidth * 0.9,
      v.geometry.wheelStyle,
      mats,
      true,
    );
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, rearY + 0.12, -halfL - 0.16);
    tagPart(spare, 'Estepe Traseiro Externo', 0, 0.15, -0.6);
    group.add(spare);
  }

  if (atts.includes('roof_rack') || atts.includes('roof_tent')) {
    const rack = new THREE.Group();
    const isHatchRack = v.geometry.archetype === 'hatch';
    const rw = width * (isHatchRack ? 0.56 : 0.66);
    const rl = length * (isHatchRack ? 0.34 : 0.36);
    [-1, 1].forEach((s) => {
      const rail = new THREE.Mesh(
        createRoundedBoxGeo(0.028, 0.026, rl, 0.01, 2, 6),
        mats.alloy,
      );
      rail.position.set(s * (rw / 2), 0.022, 0);
      rack.add(rail);
      [-0.38, 0.38].forEach((fz) => {
        const foot = new THREE.Mesh(
          createRoundedBoxGeo(0.034, isHatchRack ? 0.044 : 0.028, 0.068, 0.008, 2, 6),
          mats.trim,
        );
        foot.position.set(s * (rw / 2), isHatchRack ? -0.004 : -0.006, fz * rl);
        rack.add(foot);
      });
    });
    [-0.32, 0.32].forEach((bz) => {
      const bar = new THREE.Mesh(
        createRoundedBoxGeo(rw * 0.98, 0.018, 0.036, 0.007, 2, 6),
        mats.trim,
      );
      bar.position.set(0, 0.030, bz * rl);
      rack.add(bar);
    });
    if (atts.includes('roof_tent')) {
      const tent = new THREE.Mesh(
        createRoundedBoxGeo(rw * 0.96, 0.28, rl * 0.92, 0.05, 3, 10),
        mats.secondary,
      );
      tent.position.y = 0.16;
      rack.add(tent);
      const cover = new THREE.Mesh(
        createRoundedBoxGeo(rw * 0.98, 0.06, rl * 0.94, 0.025, 2, 8),
        mats.accent,
      );
      cover.position.y = 0.3;
      rack.add(cover);
    }
    rack.position.set(0, roofY + (isHatchRack ? 0.018 : 0.008), isHatchRack ? -length * 0.11 : -length * 0.04);
    tagPart(
      rack,
      atts.includes('roof_tent') ? 'Barraca Expedicionária de Teto' : 'Rack Utilitário de Teto',
      0,
      0.55,
      0,
    );
    group.add(rack);
  }

  if (atts.includes('taxi_sign')) {
    const sign = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.22), mats.trim);
    const glow = new THREE.Mesh(
      createRoundedBoxGeo(0.5, 0.14, 0.18, 0.03, 2, 8),
      mats.sirenAmber,
    );
    glow.position.y = 0.08;
    sign.add(base, glow);
    sign.position.set(0, roofY + 0.02, 0.05);
    tagPart(sign, 'Luminoso de Teto TÁXI', 0, 0.55, 0);
    group.add(sign);
  }

  if (atts.includes('lightbar_police') || atts.includes('lightbar_amber')) {
    const isPolice = atts.includes('lightbar_police');
    const isBuggy = v.geometry.archetype === 'buggy';
    const isOpenCar = v.geometry.archetype === 'roadster' || v.geometry.archetype === 'convertible';
    const isJetski = v.geometry.archetype === 'jetski';
    const lb = new THREE.Group();
    const lbW = isJetski ? Math.min(0.46, width * 0.36) : Math.min(1.32, width * 0.66);
    const lbD = isJetski ? 0.16 : 0.22;
    const frame = new THREE.Mesh(createRoundedBoxGeo(lbW, 0.06, lbD, 0.02, 2, 8), mats.trim);
    lb.add(frame);
    if (isJetski) {
      const plinth = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.84, 0.075, lbD * 0.78, 0.015, 2, 6),
        mats.trim,
      );
      plinth.position.y = -0.045;
      lb.add(plinth);
    }
    if (isPolice) {
      const leftPod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.44, 0.09, lbD * 0.9, 0.025, 2, 8),
        mats.sirenRed,
      );
      leftPod.position.set(-lbW * 0.25, 0.03, 0);
      const rightPod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.44, 0.09, lbD * 0.9, 0.025, 2, 8),
        mats.sirenBlue,
      );
      rightPod.position.set(lbW * 0.25, 0.03, 0);
      lb.add(leftPod, rightPod);
    } else {
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.88, 0.09, lbD * 0.9, 0.025, 2, 8),
        mats.sirenAmber,
      );
      pod.position.y = 0.03;
      lb.add(pod);
    }
    let barY = roofY + 0.04;
    let barZ = v.geometry.archetype === 'helicopter' ? 0.5 : length * 0.05;
    if (isBuggy) {
      // Anchor directly onto the buggy's overhead tubular rollcage header!
      const cabC = -length * 0.04;
      const cLen = length * v.geometry.cabinLengthRatio;
      barY = roofY - 0.015;
      barZ = cabC + cLen * 0.16;
    } else if (isOpenCar) {
      barY = rearY + 0.24;
      barZ = -length * 0.18;
    } else if (isJetski) {
      // Anchor flush on the front bow foredeck (t = 0.74 => z = +length * 0.24)
      const hullH = v.dimensions.height * 0.48;
      const tBow = 0.74;
      const sheerY = hullH * (1 + 0.2 * Math.pow(tBow, 1.75));
      const crownY = 0.045 * Math.sin(((tBow - 0.58) / 0.42) * Math.PI);
      barY = sheerY + crownY + 0.035;
      barZ = length * 0.24;
      lb.rotation.x = -0.08;
    }
    lb.position.set(0, barY, barZ);
    tagPart(lb, isPolice ? 'Giroflex LED Bipartido Polícia' : 'Barra Sinalizadora Âmbar', 0, 0.6, 0);
    group.add(lb);
  }

  if (atts.includes('twin_rollbar')) {
    const rbGroup = new THREE.Group();
    const isOpen = v.geometry.archetype === 'roadster' || v.geometry.archetype === 'convertible' || v.geometry.archetype === 'buggy';
    const cabC = isPickupArch ? length * 0.08 : -length * 0.05;
    const cLen = length * v.geometry.cabinLengthRatio;
    const span = isOpen ? width * 0.24 : width * 0.36;
    if (isOpen) {
      // Anchor firmly ON the rear tonneau deck right behind the headrests (ZERO floating!)
      const hoopDeckZ = cabC - cLen * 0.30;
      [-1, 1].forEach((s) => {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.145, 0.026, 12, 22, Math.PI),
          mats.chrome,
        );
        hoop.position.set(s * span, 0.06, 0);
        rbGroup.add(hoop);

        [-0.145, 0.145].forEach((ox) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.08, 10), mats.chrome);
          leg.position.set(s * span + ox, 0.03, 0);
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.044, 0.022, 12), mats.trim);
          collar.position.set(s * span + ox, 0.005, 0);
          rbGroup.add(leg, collar);
        });

        rbGroup.add(
          makeStrutBetween(
            new THREE.Vector3(s * span, 0.19, -0.01),
            new THREE.Vector3(s * span, 0.0, -0.22),
            0.018,
            0.022,
            mats.chrome,
            10,
          ),
        );
        const kickPad = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.02, 10), mats.trim);
        kickPad.position.set(s * span, 0.004, -0.22);
        rbGroup.add(kickPad);
      });
      rbGroup.position.set(0, rearY + 0.01, hoopDeckZ);
    } else if (isPickupArch) {
      // Authentic pickup sport bar (Santantônio) mounted cleanly onto left & right bed rails behind cab
      const bedCabRearZ = cabC - cLen * 0.48;
      const barBaseZ = bedCabRearZ - 0.10;
      const barTopY = Math.max(0.32, roofY - rearY - 0.03);
      const railX = width * 0.395;
      [-1, 1].forEach((s) => {
        const basePad = new THREE.Mesh(
          createRoundedBoxGeo(0.08, 0.026, 0.14, 0.008, 2, 6),
          mats.trim,
        );
        basePad.position.set(s * railX, 0.012, barBaseZ);
        const upright = makeStrutBetween(
          new THREE.Vector3(s * railX, 0.018, barBaseZ),
          new THREE.Vector3(s * (railX - 0.055), barTopY, barBaseZ + 0.02),
          0.032,
          0.036,
          mats.chrome,
          12,
        );
        const kicker = makeStrutBetween(
          new THREE.Vector3(s * (railX - 0.055), barTopY - 0.02, barBaseZ + 0.01),
          new THREE.Vector3(s * railX, 0.018, barBaseZ - 0.56),
          0.026,
          0.030,
          mats.chrome,
          10,
        );
        const kickPad = new THREE.Mesh(
          createRoundedBoxGeo(0.075, 0.024, 0.12, 0.008, 2, 6),
          mats.trim,
        );
        kickPad.position.set(s * railX, 0.012, barBaseZ - 0.56);
        rbGroup.add(basePad, upright, kicker, kickPad);
      });
      const topCross = makeStrutBetween(
        new THREE.Vector3(-(railX - 0.055), barTopY, barBaseZ + 0.02),
        new THREE.Vector3(railX - 0.055, barTopY, barBaseZ + 0.02),
        0.034,
        0.034,
        mats.chrome,
        12,
      );
      const thirdBrake = new THREE.Mesh(
        createRoundedBoxGeo(0.24, 0.026, 0.038, 0.008, 1, 6),
        mats.taillight,
      );
      thirdBrake.position.set(0, barTopY + 0.028, barBaseZ + 0.01);
      rbGroup.add(topCross, thirdBrake);
      rbGroup.position.set(0, rearY + 0.006, 0);
    } else {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.4, 0.04, 12, 24, Math.PI),
        mats.chrome,
      );
      arch.position.set(0, roofY - 0.15, -length * 0.02);
      rbGroup.add(arch);
    }
    tagPart(rbGroup, 'Santantônio Tubular Cromado', 0, 0.5, 0);
    group.add(rbGroup);
  }

  if (atts.includes('rollcage')) {
    const cage = new THREE.Group();
    const isHatchCage = v.geometry.archetype === 'hatch';
    const cw = width * (v.geometry.archetype === 'buggy' ? 0.72 : 0.68);
    const cabC =
      v.geometry.archetype === 'buggy'
        ? -length * 0.04
        : isHatchCage
          ? -length * 0.11
          : isPickupArch
            ? length * 0.08
            : -length * 0.05;
    const cl = length * v.geometry.cabinLengthRatio;
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * cw * 0.48, hoodY - 0.04, cabC + cl * 0.46),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.03, cabC + cl * 0.22),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.03, cabC - cl * 0.34),
        new THREE.Vector3(
          s * (isPickupArch ? width * 0.38 : cw * 0.48),
          rearY - 0.01,
          cabC - cl * (isHatchCage ? 0.50 : isPickupArch ? 0.66 : 0.64),
        ),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.030, 10, false), mats.accent);
      cage.add(tube);
    });
    // Overhead front + rear cage crossbars (support overhead LED lightbar & frame cockpit)
    [cabC + cl * 0.18, cabC - cl * 0.32].forEach((cz) => {
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, cw * 0.88, 10),
        mats.accent,
      );
      cross.rotation.z = Math.PI / 2;
      cross.position.set(0, roofY - 0.03, cz);
      cage.add(cross);
    });
    tagPart(cage, 'Gaiola Rollcage Estrutural', 0, 0.55, 0);
    group.add(cage);
  }

  if (atts.includes('bus_ac')) {
    const acCount = length > 14 ? 3 : length > 9 ? 2 : 1;
    const acGroup = new THREE.Group();
    for (let i = 0; i < acCount; i++) {
      const z = acCount === 1 ? 0 : -length * 0.25 + (i / (acCount - 1)) * (length * 0.5);
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.56, 0.22, 1.35, 0.06, 3, 10),
        mats.secondary,
      );
      pod.position.set(0, roofY + 0.11, z);
      acGroup.add(pod);
    }
    tagPart(acGroup, 'Unidades de Ar-Condicionado', 0, 0.65, 0);
    group.add(acGroup);
  }

  if (atts.includes('school_sign')) {
    const sign = new THREE.Mesh(
      createRoundedBoxGeo(1.1, 0.22, 0.08, 0.02, 2, 8),
      mats.secondary,
    );
    sign.position.set(0, roofY + 0.11, halfL - 0.25);
    tagPart(sign, 'Placa ESCOLAR Superior', 0, 0.5, 0.2);
    group.add(sign);
  }

  if (atts.includes('food_awning')) {
    const awningGroup = new THREE.Group();
    const awning = new THREE.Mesh(
      createRoundedBoxGeo(0.92, 0.06, length * 0.52, 0.02, 2, 8),
      mats.accent,
    );
    awning.rotation.z = -0.22;
    awning.position.set(width * 0.5 + 0.42, roofY - 0.25, -0.2);
    awningGroup.add(awning);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, length * 0.48), mats.chrome);
    counter.position.set(width * 0.5 + 0.14, hoodY + 0.02, -0.2);
    awningGroup.add(counter);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 16), mats.chrome);
    chimney.position.set(-width * 0.22, roofY + 0.16, -0.6);
    awningGroup.add(chimney);

    tagPart(awningGroup, 'Toldo, Balcão Gourmet e Exaustor', 0.65, 0.2, 0);
    group.add(awningGroup);
  }

  if (atts.includes('sweeper_brushes')) {
    [-1, 1].forEach((side) => {
      const brushGroup = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.16, 20), mats.accent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 14), mats.trim);
      brushGroup.add(disc, hub);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), mats.trim);
      arm.position.set(0, 0.14, -0.25);
      brushGroup.add(arm);
      brushGroup.position.set(side * (width * 0.46), 0.12, halfL + 0.24);
      tagPart(brushGroup, 'Escovas Varredouras Giratórias', side * 0.35, -0.1, 0.65);
      group.add(brushGroup);
      animated.sweeperBrushes.push(disc);
    });
  }

  if (atts.includes('ambulance_box')) {
    const stripeGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, length * 0.62), mats.secondary);
      band.position.set(side * (width * 0.5 + 0.005), hoodY + 0.1, -length * 0.14);
      stripeGroup.add(band);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.12), mats.secondary);
      crossV.position.set(side * (width * 0.5 + 0.01), hoodY + 0.38, -length * 0.16);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.38), mats.secondary);
      crossH.position.set(side * (width * 0.5 + 0.01), hoodY + 0.38, -length * 0.16);
      stripeGroup.add(crossV, crossH);
    });
    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.08, 0.24), mats.alloy);
    rearStep.position.set(0, v.geometry.groundClearance + 0.06, -halfL - 0.1);
    stripeGroup.add(rearStep);
    tagPart(stripeGroup, 'Faixas SAMU e Degrau de Maca', 0, 0.1, -0.35);
    group.add(stripeGroup);
  }
}

// =========================================================================
// 4. HOLLOWED CHASSIS TUB PROFILE (ELIMINATES INTERIOR CLIPPING)
// =========================================================================
function buildHollowedSideProfile(
  length: number,
  groundClearance: number,
  floorHeight: number,
  hoodHeight: number,
  rearHeight: number,
  cabFrontZ: number,
  cabRearZ: number,
  frontWheelZ: number,
  rearWheelZ: number,
  wheelArchR: number,
  hoodSlope: number,
  hasWheelArches: boolean,
  archCenterYOverride?: number,
  isPickup = false,
  aeroTier: AeroTier = 'standard',
): THREE.Shape {
  const halfL = length / 2;
  const endL = halfL - 0.054;
  const shape = new THREE.Shape();
  const bottomY = groundClearance;
  const archCY = archCenterYOverride ?? bottomY + wheelArchR * 0.15;

  const isHyper = aeroTier === 'hyper';
  const isSport = aeroTier === 'sport';
  const isLuxury = aeroTier === 'luxury';
  const fStop = Math.min(endL - 0.10, cabFrontZ + 0.06);
  const rStop = Math.max(-endL + 0.10, cabRearZ - 0.06);

  if (isPickup) {
    // Pickups terminate the central tub behind the cab so the rear cargo bed (caçamba) is open & recessed!
    const cabEndZ = Math.max(rearWheelZ + wheelArchR + 0.04, rStop - 0.05);
    shape.moveTo(cabEndZ, bottomY);
  } else {
    shape.moveTo(-endL + 0.06, bottomY);
    if (hasWheelArches && wheelArchR > 0.1) {
      const rStart = Math.max(-endL + 0.10, rearWheelZ - wheelArchR);
      const rEnd = Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR);
      shape.lineTo(rStart, bottomY);
      shape.absarc(rearWheelZ, archCY, wheelArchR, Math.PI, 0, true);
      shape.lineTo(rEnd, bottomY);
    }
  }

  if (hasWheelArches && wheelArchR > 0.1) {
    const fStart = isPickup
      ? Math.max(rStop - 0.02, frontWheelZ - wheelArchR)
      : Math.max(Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR) + 0.08, frontWheelZ - wheelArchR);
    const fEnd = Math.min(endL - 0.10, frontWheelZ + wheelArchR);
    shape.lineTo(fStart, bottomY);
    shape.absarc(frontWheelZ, archCY, wheelArchR, Math.PI, 0, true);
    shape.lineTo(fEnd, bottomY);
  }

  // Smooth aerodynamic front wedge apron & curved hood silhouette
  const noseTipRatio = isHyper ? 0.24 : isSport ? 0.31 : isLuxury ? 0.36 : 0.44;
  const noseTipY = bottomY + hoodHeight * noseTipRatio;
  const hoodSlopeEff = getHoodSlopeFactor(aeroTier, hoodSlope);
  const hoodFrontY = bottomY + hoodHeight * (1 - hoodSlopeEff);
  const noseBlendBack = isHyper ? 0.15 : isSport ? 0.12 : isLuxury ? 0.10 : 0.09;

  shape.quadraticCurveTo(endL - 0.02, bottomY + 0.016, endL, noseTipY);
  shape.bezierCurveTo(
    endL + 0.005,
    noseTipY * 0.55 + hoodFrontY * 0.45,
    endL - noseBlendBack * 0.45,
    hoodFrontY + 0.010,
    endL - noseBlendBack,
    hoodFrontY,
  );
  shape.quadraticCurveTo(
    (endL - noseBlendBack + fStop) * 0.5,
    (hoodFrontY + bottomY + hoodHeight) * 0.5 + (isHyper ? 0.032 : 0.026),
    fStop,
    bottomY + hoodHeight,
  );

  // Drop down into the recessed cabin floor tub
  shape.lineTo(fStop - 0.08, bottomY + floorHeight);
  shape.lineTo(rStop + 0.08, bottomY + floorHeight);
  shape.lineTo(rStop, bottomY + rearHeight);

  if (isPickup) {
    const cabEndZ = Math.max(rearWheelZ + wheelArchR + 0.04, rStop - 0.05);
    shape.lineTo(cabEndZ, bottomY + rearHeight);
    shape.lineTo(cabEndZ, bottomY);
  } else {
    // Smooth rear deck crown, sculpted tail & tucked rear diffuser valence
    const deckMidCrown = isHyper ? 0.024 : isSport ? 0.022 : 0.018;
    const rearTipRatio = isHyper ? 0.50 : isSport ? 0.56 : isLuxury ? 0.60 : 0.64;
    shape.quadraticCurveTo(
      (rStop + (-endL + 0.10)) * 0.5,
      bottomY + rearHeight + deckMidCrown,
      -endL + 0.10,
      bottomY + rearHeight,
    );
    shape.bezierCurveTo(
      -endL + 0.02,
      bottomY + rearHeight * 0.94,
      -endL - 0.004,
      bottomY + rearHeight * 0.74,
      -endL,
      bottomY + rearHeight * rearTipRatio,
    );
    shape.quadraticCurveTo(-endL + 0.022, bottomY + 0.045, -endL + 0.06, bottomY);
  }
  shape.closePath();

  return shape;
}

function buildSolidSideProfile(
  length: number,
  groundClearance: number,
  bodyHeight: number,
  hoodHeight: number,
  rearHeight: number,
  frontWheelZ: number,
  rearWheelZ: number,
  wheelArchR: number,
  hoodSlope: number,
  hasWheelArches = true,
  archCenterYOverride?: number,
  hatchCabRearZ?: number,
  pickupBedSpec?: { cabRearZ: number; bedFloorY: number },
  aeroTier: AeroTier = 'standard',
): THREE.Shape {
  const halfL = length / 2;
  const endL = halfL - 0.068;
  const shape = new THREE.Shape();
  const bottomY = groundClearance;
  const archCY = archCenterYOverride ?? bottomY + wheelArchR * 0.15;
  const isHyper = aeroTier === 'hyper';
  const isSport = aeroTier === 'sport';
  const isLuxury = aeroTier === 'luxury';
  shape.moveTo(-endL + 0.05, bottomY);

  if (hasWheelArches && wheelArchR > 0.1) {
    const rStart = Math.max(-endL + 0.09, rearWheelZ - wheelArchR);
    const rEnd = Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR);
    shape.lineTo(rStart, bottomY);
    shape.absarc(rearWheelZ, archCY, wheelArchR, Math.PI, 0, true);
    shape.lineTo(rEnd, bottomY);

    const fStart = Math.max(rEnd + 0.08, frontWheelZ - wheelArchR);
    const fEnd = Math.min(endL - 0.09, frontWheelZ + wheelArchR);
    shape.lineTo(fStart, bottomY);
    shape.absarc(frontWheelZ, archCY, wheelArchR, Math.PI, 0, true);
    shape.lineTo(fEnd, bottomY);
  }

  const noseTipRatio = isHyper ? 0.24 : isSport ? 0.31 : isLuxury ? 0.36 : 0.44;
  const hoodSlopeEff = getHoodSlopeFactor(aeroTier, hoodSlope);
  const hoodFrontY = bottomY + hoodHeight * (1 - hoodSlopeEff);
  const noseBlendBack = isHyper ? 0.14 : isSport ? 0.12 : 0.09;
  shape.quadraticCurveTo(endL - 0.02, bottomY + 0.018, endL, bottomY + hoodHeight * noseTipRatio);
  shape.bezierCurveTo(
    endL + 0.005,
    hoodFrontY * 0.80 + bottomY * 0.20,
    endL - noseBlendBack * 0.45,
    hoodFrontY + 0.012,
    endL - noseBlendBack,
    hoodFrontY,
  );
  shape.quadraticCurveTo(endL * 0.62, bottomY + bodyHeight + 0.014, endL * 0.34, bottomY + bodyHeight);
  if (pickupBedSpec) {
    // Drop cleanly behind cab down to recessed bedFloorY all the way to the rear tailgate sill
    shape.lineTo(pickupBedSpec.cabRearZ, bottomY + bodyHeight);
    shape.lineTo(pickupBedSpec.cabRearZ - 0.06, pickupBedSpec.bedFloorY);
    shape.lineTo(-endL + 0.05, pickupBedSpec.bedFloorY);
    shape.lineTo(-endL, Math.max(bottomY + 0.04, pickupBedSpec.bedFloorY * 0.72));
  } else if (hatchCabRearZ !== undefined) {
    // Sleek curved hatchback waist & sloped tailgate transition instead of boxy rear shelf
    shape.quadraticCurveTo(0, bottomY + Math.max(bodyHeight, rearHeight) + 0.018, hatchCabRearZ, bottomY + rearHeight);
    shape.bezierCurveTo(
      -endL + 0.08,
      bottomY + rearHeight * 0.92,
      -endL + 0.01,
      bottomY + rearHeight * 0.72,
      -endL,
      bottomY + rearHeight * 0.46,
    );
  } else {
    const rearTipRatio = isHyper ? 0.50 : isSport ? 0.56 : isLuxury ? 0.60 : 0.64;
    shape.quadraticCurveTo(0, bottomY + Math.max(bodyHeight, rearHeight) + 0.024, -endL + 0.09, bottomY + rearHeight);
    shape.bezierCurveTo(
      -endL + 0.02,
      bottomY + rearHeight * 0.94,
      -endL - 0.004,
      bottomY + rearHeight * 0.74,
      -endL,
      bottomY + rearHeight * rearTipRatio,
    );
  }
  shape.quadraticCurveTo(-endL + 0.018, bottomY + 0.05, -endL + 0.05, bottomY);
  shape.closePath();
  return shape;
}

function buildQuarterFenderProfile(
  zRear: number,
  zFront: number,
  bottomY: number,
  wheelZ: number,
  archR: number,
  topRearY: number,
  topPeakY: number,
  topFrontY: number,
  isFrontFender: boolean,
  archCenterYOverride?: number,
  aeroTier: AeroTier = 'standard',
): THREE.Shape {
  const shape = new THREE.Shape();
  const archCenterY = archCenterYOverride ?? bottomY + archR * 0.15;
  const aStart = wheelZ - archR;
  const aEnd = wheelZ + archR;
  const isHyper = aeroTier === 'hyper';
  const isSport = aeroTier === 'sport';
  const isLuxury = aeroTier === 'luxury';

  if (isFrontFender) {
    if (aStart < zRear + 0.01) {
      const cosT = THREE.MathUtils.clamp((zRear - wheelZ) / archR, -0.98, 0.98);
      const thetaStart = Math.acos(cosT);
      const startY = archCenterY + archR * Math.sin(thetaStart);
      shape.moveTo(zRear, startY);
      shape.absarc(wheelZ, archCenterY, archR, thetaStart, 0, true);
    } else {
      shape.moveTo(zRear, bottomY);
      shape.lineTo(aStart, bottomY);
      shape.absarc(wheelZ, archCenterY, archR, Math.PI, 0, true);
    }
    const lowerFrontEnd = Math.max(aEnd + 0.02, zFront - 0.08);
    const noseTipRatio = isHyper ? 0.24 : isSport ? 0.31 : isLuxury ? 0.36 : 0.44;
    const noseBlendBack = isHyper ? 0.14 : isSport ? 0.11 : 0.08;
    shape.lineTo(lowerFrontEnd, bottomY + 0.015);
    shape.quadraticCurveTo(
      zFront - 0.01,
      bottomY + 0.025,
      zFront,
      bottomY + (topFrontY - bottomY) * noseTipRatio,
    );
    shape.bezierCurveTo(
      zFront + 0.005,
      bottomY + (topFrontY - bottomY) * (noseTipRatio + 0.38),
      zFront - noseBlendBack * 0.4,
      topFrontY + 0.010,
      zFront - noseBlendBack,
      topFrontY,
    );
    shape.quadraticCurveTo(wheelZ, topPeakY + (isHyper ? 0.026 : 0.016), zRear, topRearY);
  } else {
    shape.moveTo(zRear + 0.06, bottomY + 0.025);
    if (aStart > zRear + 0.07) {
      shape.lineTo(aStart, bottomY);
    }
    if (aEnd > zFront - 0.01) {
      const cosT = THREE.MathUtils.clamp((zFront - wheelZ) / archR, -0.98, 0.98);
      const thetaEnd = Math.acos(cosT);
      shape.absarc(wheelZ, archCenterY, archR, Math.PI, thetaEnd, true);
    } else {
      shape.absarc(wheelZ, archCenterY, archR, Math.PI, 0, true);
      shape.lineTo(zFront, bottomY);
    }
    const haunchPeakBoost = isHyper ? 0.032 : isSport ? 0.022 : isLuxury ? 0.014 : 0.016;
    const rearTipRatio = isHyper ? 0.48 : isSport ? 0.52 : 0.56;
    shape.lineTo(zFront, topFrontY);
    shape.quadraticCurveTo(wheelZ, topPeakY + haunchPeakBoost, zRear + 0.09, topRearY);
    shape.bezierCurveTo(
      zRear + 0.02,
      topRearY - 0.01,
      zRear - 0.004,
      bottomY + (topRearY - bottomY) * 0.72,
      zRear,
      bottomY + (topRearY - bottomY) * rearTipRatio,
    );
    shape.quadraticCurveTo(zRear + 0.018, bottomY + 0.04, zRear + 0.06, bottomY + 0.025);
  }
  shape.closePath();
  return shape;
}

function createBeveledWrapBumperGeo(
  bw: number,
  bh: number,
  bd: number,
  isFront: boolean,
  cityMode = false,
  sweepScale = 1.0,
): THREE.BufferGeometry {
  const hw = bw * 0.5;
  const bevel = 0.028;
  const sweep = bd * 0.85 * sweepScale;
  const thick = Math.max(0.065, bd * 0.36);
  const shape = new THREE.Shape();

  // Planform U/C-shape in (X, Z_plan), extruded along Y after rotateX(-PI/2)
  // Note: rotateX(-PI/2) maps Shape +Y -> -Z, Shape -Y -> +Z!
  const s = isFront ? -1 : 1;
  shape.moveTo(-hw + bevel, -s * (sweep * 0.48));
  shape.bezierCurveTo(
    -hw + bevel,
    s * (bd * 0.42),
    -hw * 0.52,
    s * (bd * 0.50),
    0,
    s * (bd * 0.50),
  );
  shape.bezierCurveTo(
    hw * 0.52,
    s * (bd * 0.50),
    hw - bevel,
    s * (bd * 0.42),
    hw - bevel,
    -s * (sweep * 0.48),
  );
  shape.lineTo(hw - bevel - thick * 0.75, -s * (sweep * 0.48));
  shape.bezierCurveTo(
    hw - bevel - thick * 0.75,
    s * (bd * 0.42 - thick * 0.85),
    hw * 0.48,
    s * (bd * 0.50 - thick),
    0,
    s * (bd * 0.50 - thick),
  );
  shape.bezierCurveTo(
    -hw * 0.48,
    s * (bd * 0.50 - thick),
    -hw + bevel + thick * 0.75,
    s * (bd * 0.42 - thick * 0.85),
    -hw + bevel + thick * 0.75,
    -s * (sweep * 0.48),
  );
  shape.closePath();

  const innerH = Math.max(0.03, bh - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerH,
    steps: 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: cityMode ? 2 : 5,
    curveSegments: cityMode ? 12 : 24,
  });
  geo.translate(0, 0, -innerH * 0.5);
  geo.rotateX(-Math.PI / 2);

  // Subtle lower bumper chin tuck for automotive stance
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hy = Math.max(0.02, bh * 0.5);
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const ny = THREE.MathUtils.clamp(py / hy, -1, 1);
    if (ny < 0) {
      pos.setZ(i, pz + (isFront ? -1 : 1) * Math.abs(ny) * 0.016);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createBeveledWheelArchAssembly(
  archR: number,
  bodyLift: number,
  archCenterY: number,
  width: number,
  mats: VehicleMaterialSet,
  side: -1 | 1,
  wz: number,
  cityMode = false,
): THREE.Group {
  const grp = new THREE.Group();
  const sinMin = THREE.MathUtils.clamp((bodyLift + 0.012 - archCenterY) / archR, -0.44, 0.0);
  const thetaLow = Math.asin(sinMin);
  const thetaStart = Math.PI - thetaLow;
  const thetaEnd = thetaLow;

  // 1. Outer painted sculpted beveled wheel-arch flare (ExtrudeGeometry with smooth bevel)
  const flareBevel = 0.015;
  const flareInnerR = archR + flareBevel;
  const flareOuterR = archR + 0.070 - flareBevel;
  const flareShape = new THREE.Shape();
  flareShape.absarc(0, 0, flareOuterR, thetaEnd, thetaStart, false);
  flareShape.absarc(0, 0, flareInnerR, thetaStart, thetaEnd, true);
  flareShape.closePath();

  const flareGeo = createExtrudedProfile(
    flareShape,
    0.056,
    flareBevel,
    flareBevel,
    cityMode ? 2 : 5,
    cityMode ? 16 : 30,
    1,
  );
  // Subtle wheel-lip taper at top/sides for muscular fender eyebrow profile
  const fPos = flareGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fPos.count; i++) {
    const px = fPos.getX(i);
    const py = fPos.getY(i);
    if (px * side > 0) {
      const rNorm = THREE.MathUtils.clamp(Math.max(0, py) / (archR + 0.07), 0, 1);
      fPos.setX(i, px + side * 0.010 * Math.sin(rNorm * Math.PI));
    }
  }
  fPos.needsUpdate = true;
  flareGeo.computeVertexNormals();

  const flareMesh = new THREE.Mesh(flareGeo, mats.body);
  flareMesh.position.set(side * (width * 0.490), archCenterY, wz);
  grp.add(flareMesh);

  // 2. Crisp dark beveled inner wheel-arch trim molding framing the tire opening
  const trimBevel = 0.006;
  const trimInnerR = archR + trimBevel * 0.6;
  const trimOuterR = archR + 0.024 - trimBevel * 0.4;
  const trimShape = new THREE.Shape();
  trimShape.absarc(0, 0, trimOuterR, thetaEnd, thetaStart, false);
  trimShape.absarc(0, 0, trimInnerR, thetaStart, thetaEnd, true);
  trimShape.closePath();

  const trimGeo = createExtrudedProfile(
    trimShape,
    0.044,
    trimBevel,
    trimBevel,
    cityMode ? 2 : 3,
    cityMode ? 14 : 26,
    1,
  );
  const trimMesh = new THREE.Mesh(trimGeo, mats.trim);
  trimMesh.position.set(side * (width * 0.482), archCenterY, wz);
  grp.add(trimMesh);

  return grp;
}

function createBeveledHatchHoodGeo(
  hoodW: number,
  hoodSpan: number,
  hoodRise: number,
  cityMode = false,
): THREE.BufferGeometry {
  // Side profile in (Z_local, Y_local) relative to hood hinge at (0, 0, 0) extending forward along +Z
  const thick = 0.048;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.012);
  shape.bezierCurveTo(
    hoodSpan * 0.35,
    -hoodRise * 0.20,
    hoodSpan * 0.72,
    -hoodRise * 0.56,
    hoodSpan,
    -hoodRise,
  );
  shape.quadraticCurveTo(
    hoodSpan + 0.018,
    -hoodRise - thick * 0.45,
    hoodSpan - 0.01,
    -hoodRise - thick,
  );
  shape.bezierCurveTo(
    hoodSpan * 0.68,
    -hoodRise * 0.58 - thick,
    hoodSpan * 0.34,
    -hoodRise * 0.22 - thick,
    0,
    -thick + 0.010,
  );
  shape.closePath();

  const geo = createExtrudedProfile(
    shape,
    hoodW,
    0.024,
    0.024,
    cityMode ? 2 : 5,
    cityMode ? 12 : 22,
    cityMode ? 2 : 6,
  );
  // Lateral double-curvature crown + twin sculpted hood character ribs
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hx = Math.max(0.1, hoodW * 0.5);
  const hz = Math.max(0.2, hoodSpan);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = THREE.MathUtils.clamp(Math.abs(px) / hx, 0, 1);
    const tz01 = THREE.MathUtils.clamp(pz / hz, 0, 1);
    const latCrown = 0.028 * Math.cos(nx * Math.PI * 0.5);
    const noseDrop = -0.014 * Math.pow(tz01, 2.2) * (nx * 0.5 + 0.5);
    const twinCrease =
      0.008 * Math.exp(-Math.pow((nx - (0.38 - tz01 * 0.08)) / 0.13, 2)) * (1 - tz01 * 0.35);
    pos.setY(i, py + latCrown + noseDrop + twinCrease);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createBeveledHatchTailgateGeo(
  tailW: number,
  topLocalZ: number,
  topLocalY: number,
  botLocalZ: number,
  botLocalY: number,
  cityMode = false,
): THREE.BufferGeometry {
  // Side profile in (Z_local, Y_local) relative to roof hatch hinge
  const thick = 0.064;
  const midZ = Math.min(topLocalZ, botLocalZ) - 0.038;
  const midY = (topLocalY + botLocalY) * 0.5 + 0.02;

  const shape = new THREE.Shape();
  shape.moveTo(topLocalZ, topLocalY + 0.015);
  shape.quadraticCurveTo(midZ, midY, botLocalZ, botLocalY);
  shape.lineTo(botLocalZ + thick, botLocalY + 0.012);
  shape.quadraticCurveTo(midZ + thick, midY, topLocalZ + thick, topLocalY + 0.008);
  shape.closePath();

  const geo = createExtrudedProfile(
    shape,
    tailW,
    0.026,
    0.026,
    cityMode ? 2 : 5,
    cityMode ? 12 : 20,
    cityMode ? 2 : 6,
  );
  // Subtle lateral convex curve across tailgate width
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hx = Math.max(0.1, tailW * 0.5);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const pz = pos.getZ(i);
    const nx = THREE.MathUtils.clamp(Math.abs(px) / hx, 0, 1);
    pos.setZ(i, pz - 0.024 * Math.cos(nx * Math.PI * 0.5));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createHatchQuarterSail(
  side: -1 | 1,
  zGlassFront: number,
  zRearBot: number,
  zRearTop: number,
  botY: number,
  topY: number,
  baseHalfW: number,
  topHalfW: number,
  mats: VehicleMaterialSet,
  cityMode = false,
): THREE.Group {
  const grp = new THREE.Group();
  const zSailSplitBot = THREE.MathUtils.lerp(zGlassFront, zRearBot, 0.54);
  const zSailSplitTop = THREE.MathUtils.lerp(zGlassFront, zRearTop, 0.58);

  // 1. Rear quarter opera glass + satin-black perimeter trim bridging rear door to C-pillar sail
  if (zGlassFront - zSailSplitBot > 0.14 && zGlassFront - zSailSplitTop > 0.10) {
    const gShape = new THREE.Shape();
    gShape.moveTo(zSailSplitBot + 0.02, botY + 0.025);
    gShape.lineTo(zGlassFront - 0.01, botY + 0.012);
    gShape.lineTo(zGlassFront - 0.01, topY - 0.032);
    gShape.lineTo(zSailSplitTop + 0.02, topY - 0.032);
    gShape.closePath();

    const gGeo = new THREE.ShapeGeometry(gShape);
    gGeo.rotateY(-Math.PI / 2);
    const gPos = gGeo.attributes.position as THREE.BufferAttribute;
    const hSpan = Math.max(0.1, topY - botY);
    for (let i = 0; i < gPos.count; i++) {
      const t = THREE.MathUtils.clamp((gPos.getY(i) - botY) / hSpan, 0, 1);
      gPos.setX(i, side * THREE.MathUtils.lerp(baseHalfW * 0.96, topHalfW * 0.95, t));
    }
    gGeo.computeVertexNormals();
    const qGlass = new THREE.Mesh(gGeo, mats.glass);
    qGlass.userData.noShadow = true;
    qGlass.renderOrder = 2;
    grp.add(qGlass);

    const qSill = new THREE.Mesh(
      createRoundedBoxGeo(0.024, 0.020, Math.max(0.1, zGlassFront - zSailSplitBot), 0.005, 1, 6),
      mats.windowTrim,
    );
    qSill.position.set(side * (baseHalfW * 0.97), botY + 0.010, (zGlassFront + zSailSplitBot) * 0.5);
    const qTopTrim = new THREE.Mesh(
      createRoundedBoxGeo(0.022, 0.018, Math.max(0.08, zGlassFront - zSailSplitTop), 0.004, 1, 4),
      mats.windowTrim,
    );
    qTopTrim.position.set(side * (topHalfW * 0.96), topY - 0.026, (zGlassFront + zSailSplitTop) * 0.5);
    const qVertTrim = makeBeamBetween(
      new THREE.Vector3(side * (baseHalfW * 0.97), botY + 0.018, zSailSplitBot + 0.015),
      new THREE.Vector3(side * (topHalfW * 0.96), topY - 0.026, zSailSplitTop + 0.015),
      0.022,
      0.020,
      mats.windowTrim,
      new THREE.Vector3(side * 0.4, 0.1, 0),
      0.004,
    );
    grp.add(qSill, qTopTrim, qVertTrim);
  }

  // 2. Beveled ExtrudeGeometry painted C-Pillar sail haunch
  const sailShape = new THREE.Shape();
  sailShape.moveTo(zRearBot + 0.02, botY - 0.01);
  sailShape.lineTo(zSailSplitBot, botY + 0.01);
  sailShape.lineTo(zSailSplitTop, topY - 0.012);
  sailShape.lineTo(zRearTop - 0.01, topY - 0.012);
  sailShape.closePath();

  const sailGeo = createExtrudedProfile(
    sailShape,
    0.054,
    0.014,
    0.014,
    cityMode ? 2 : 4,
    cityMode ? 8 : 14,
    2,
  );
  const sPos = sailGeo.attributes.position as THREE.BufferAttribute;
  const hSpan = Math.max(0.1, topY - botY);
  for (let i = 0; i < sPos.count; i++) {
    const px = sPos.getX(i);
    const py = sPos.getY(i);
    const t = THREE.MathUtils.clamp((py - botY) / hSpan, 0, 1);
    sPos.setX(i, px + side * THREE.MathUtils.lerp(baseHalfW * 0.97, topHalfW * 0.97, t));
  }
  sPos.needsUpdate = true;
  sailGeo.computeVertexNormals();
  const sailMesh = new THREE.Mesh(sailGeo, mats.body);
  grp.add(sailMesh);

  return grp;
}

// =========================================================================
// 5. FORMULA 1 CAR (LOFTED MONOCOQUE, SWEPT MULTI-FLAP WINGS, DOUBLE WISHBONES & HALO)
// =========================================================================
function createLoftedFormulaHullGeo(
  stations: { z: number; hw: number; yBot: number; yTop: number; crownDip?: number }[],
): THREE.BufferGeometry {
  // 10-point symmetric chamfered aero cross section per station
  const M = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const h = Math.max(0.02, s.yTop - s.yBot);
    const yMidLow = s.yBot + h * 0.28;
    const yMidHigh = s.yBot + h * 0.72;
    const dip = s.crownDip ?? 0;
    const pts: [number, number][] = [
      [0, s.yBot], // 0: bottom center
      [s.hw * 0.72, s.yBot + h * 0.04], // 1: +X bottom chine
      [s.hw, yMidLow], // 2: +X lower flank
      [s.hw * 0.90, yMidHigh], // 3: +X upper shoulder
      [s.hw * 0.44, s.yTop - dip * 0.25], // 4: +X crown shoulder
      [0, s.yTop - dip], // 5: top spine (dips for recessed cockpit if needed)
      [-s.hw * 0.44, s.yTop - dip * 0.25], // 6: -X crown shoulder
      [-s.hw * 0.90, yMidHigh], // 7: -X upper shoulder
      [-s.hw, yMidLow], // 8: -X lower flank
      [-s.hw * 0.72, s.yBot + h * 0.04], // 9: -X bottom chine
    ];
    for (let j = 0; j < M; j++) {
      positions.push(pts[j][0], pts[j][1], s.z);
    }
  }

  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const jNext = (j + 1) % M;
      const a = i * M + j;
      const b = (i + 1) * M + j;
      const c = i * M + jNext;
      const d = (i + 1) * M + jNext;
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  // Cap front nose tip & rear bulkhead cleanly (outward normals)
  const frontCenter = positions.length / 3;
  const fS = stations[stations.length - 1];
  positions.push(0, (fS.yBot + fS.yTop) * 0.5, fS.z + 0.04);
  const fBase = (stations.length - 1) * M;
  for (let j = 0; j < M; j++) {
    const jNext = (j + 1) % M;
    indices.push(frontCenter, fBase + j, fBase + jNext);
  }

  const backCenter = positions.length / 3;
  const bS = stations[0];
  positions.push(0, (bS.yBot + bS.yTop) * 0.5, bS.z - 0.02);
  for (let j = 0; j < M; j++) {
    const jNext = (j + 1) % M;
    indices.push(backCenter, jNext, j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createLoftedSidepodGeo(
  side: number,
  stations: { z: number; xIn: number; xOut: number; yBot: number; yTop: number }[],
): THREE.BufferGeometry {
  const M = 8;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    const w = Math.max(0.03, s.xOut - s.xIn);
    const h = Math.max(0.03, s.yTop - s.yBot);
    const undercutX = s.xIn + w * 0.42;
    const pts: [number, number][] = [
      [side * s.xIn, s.yBot], // 0: inner bottom
      [side * undercutX, s.yBot + h * 0.06], // 1: undercut inner floor
      [side * s.xOut, s.yBot + h * 0.38], // 2: outer lower flank
      [side * (s.xOut * 0.98), s.yBot + h * 0.78], // 3: outer upper shoulder
      [side * (s.xIn + w * 0.68), s.yTop], // 4: upper outer deck
      [side * (s.xIn + w * 0.25), s.yTop - h * 0.02], // 5: upper inner deck
      [side * s.xIn, s.yTop - h * 0.14], // 6: inner top
      [side * s.xIn, s.yBot + h * 0.45], // 7: inner mid
    ];
    for (let j = 0; j < M; j++) {
      positions.push(pts[j][0], pts[j][1], s.z);
    }
  }

  for (let i = 0; i < stations.length - 1; i++) {
    for (let j = 0; j < M; j++) {
      const jNext = (j + 1) % M;
      const a = i * M + j;
      const b = (i + 1) * M + j;
      const c = i * M + jNext;
      const d = (i + 1) * M + jNext;
      if (side > 0) {
        indices.push(a, c, b);
        indices.push(c, d, b);
      } else {
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  }

  const frontC = positions.length / 3;
  const fS = stations[stations.length - 1];
  positions.push(side * (fS.xIn + fS.xOut) * 0.5, (fS.yBot + fS.yTop) * 0.5, fS.z);
  const fBase = (stations.length - 1) * M;
  for (let j = 0; j < M; j++) {
    const jNext = (j + 1) % M;
    if (side > 0) indices.push(frontC, fBase + j, fBase + jNext);
    else indices.push(frontC, fBase + jNext, fBase + j);
  }

  const backC = positions.length / 3;
  const bS = stations[0];
  positions.push(side * (bS.xIn + bS.xOut) * 0.5, (bS.yBot + bS.yTop) * 0.5, bS.z);
  for (let j = 0; j < M; j++) {
    const jNext = (j + 1) % M;
    if (side > 0) indices.push(backC, jNext, j);
    else indices.push(backC, j, jNext);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildFormulaCar(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, wheelbase } = v.dimensions;
  const g = v.geometry;
  const halfL = length * 0.5;
  const fZ = wheelbase * 0.5;
  const rZ = -wheelbase * 0.5;
  const gc = g.groundClearance; // 0.08m
  const wheelX = width * 0.415;

  // 1. Sculpted Carbon Venturi Floor Plank, T-Tray Splitter, Bargeboards & Rear Diffuser
  // Note: rotateX(-PI/2) maps 2D +Y -> 3D -Z, so we pass -z in 2D shape Y!
  const floorGroup = new THREE.Group();
  const floorShape = new THREE.Shape();
  floorShape.moveTo(-0.22, -0.58);
  floorShape.lineTo(0.22, -0.58);
  floorShape.lineTo(width * 0.37, -0.32);
  floorShape.lineTo(width * 0.38, 1.22);
  floorShape.lineTo(0.28, 1.38);
  floorShape.lineTo(0.27, halfL - 0.16);
  floorShape.lineTo(-0.27, halfL - 0.16);
  floorShape.lineTo(-0.28, 1.38);
  floorShape.lineTo(-width * 0.38, 1.22);
  floorShape.lineTo(-width * 0.37, -0.32);
  floorShape.closePath();

  const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  floorGeo.rotateX(-Math.PI / 2);
  const floorPlank = new THREE.Mesh(floorGeo, mats.trim);
  floorPlank.position.y = gc + 0.005;
  floorGroup.add(floorPlank);

  // Side floor edge strakes + swept bargeboard turning vanes behind front wheels
  [-1, 1].forEach((side) => {
    const edgeLip = new THREE.Mesh(
      createRoundedBoxGeo(0.045, 0.026, 1.56, 0.008, 2, 6),
      mats.accent,
    );
    edgeLip.position.set(side * (width * 0.375), gc + 0.035, -0.45);
    floorGroup.add(edgeLip);

    if (!cityMode) {
      const bargeMain = new THREE.Mesh(
        createRoundedBoxGeo(0.022, 0.16, 0.42, 0.006, 2, 6),
        mats.trim,
      );
      bargeMain.position.set(side * 0.52, gc + 0.11, 0.62);
      bargeMain.rotation.y = side * 0.18;
      const bargeWing = new THREE.Mesh(
        createRoundedBoxGeo(0.24, 0.02, 0.32, 0.005, 2, 6),
        mats.trim,
      );
      bargeWing.position.set(side * 0.56, gc + 0.08, 0.58);
      bargeWing.rotation.z = side * 0.08;
      floorGroup.add(bargeMain, bargeWing);
    }
  });

  // Rear Venturi diffuser ramp & vertical strakes
  const diffRamp = new THREE.Mesh(
    createRoundedBoxGeo(0.56, 0.03, 0.42, 0.008, 2, 6),
    mats.trim,
  );
  diffRamp.position.set(0, gc + 0.09, -halfL + 0.24);
  diffRamp.rotation.x = 0.28;
  floorGroup.add(diffRamp);
  [-0.22, -0.075, 0.075, 0.22].forEach((dx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.11, 0.36), mats.trim);
    fin.position.set(dx, gc + 0.085, -halfL + 0.22);
    floorGroup.add(fin);
  });

  tagPart(floorGroup, 'Assoalho Venturi, Bargeboards & Difusor', 0, -0.2, 0);
  group.add(floorGroup);

  // 2. Lofted Monocoque Tub & Long Sloping Nosecone (joins directly onto Front Wing!)
  const noseTipZ = halfL - 0.06;
  const monoGeo = createLoftedFormulaHullGeo([
    { z: -0.92, hw: 0.21, yBot: gc + 0.03, yTop: gc + 0.44 },
    { z: -0.36, hw: 0.28, yBot: gc + 0.025, yTop: gc + 0.51, crownDip: 0.04 },
    { z: 0.05, hw: 0.295, yBot: gc + 0.025, yTop: gc + 0.49, crownDip: 0.23 },
    { z: 0.42, hw: 0.275, yBot: gc + 0.025, yTop: gc + 0.49, crownDip: 0.18 },
    { z: 0.62, hw: 0.255, yBot: gc + 0.03, yTop: gc + 0.48 },
    { z: 1.05, hw: 0.22, yBot: gc + 0.055, yTop: gc + 0.40 },
    { z: fZ, hw: 0.18, yBot: gc + 0.075, yTop: gc + 0.29 },
    { z: noseTipZ - 0.38, hw: 0.135, yBot: gc + 0.045, yTop: gc + 0.18 },
    { z: noseTipZ, hw: 0.08, yBot: gc + 0.025, yTop: gc + 0.105 },
  ]);
  const monoGroup = new THREE.Group();
  const monoMesh = new THREE.Mesh(monoGeo, mats.body);
  monoGroup.add(monoMesh);

  // Raised cockpit rim bolsters + dark cockpit tub interior + nose racing stripe
  [-1, 1].forEach((side) => {
    const bolster = new THREE.Mesh(
      createRoundedBoxGeo(0.065, 0.11, 0.72, 0.022, 2, 8),
      mats.body,
    );
    bolster.position.set(side * 0.235, gc + 0.47, 0.08);
    monoGroup.add(bolster);
  });
  const tubDark = new THREE.Mesh(
    createRoundedBoxGeo(0.41, 0.08, 0.68, 0.02, 2, 8),
    mats.interior,
  );
  tubDark.position.set(0, gc + 0.24, 0.08);
  monoGroup.add(tubDark);

  const noseStripe = new THREE.Mesh(
    createRoundedBoxGeo(0.085, 0.02, 1.56, 0.008, 2, 6),
    mats.liveryStripe,
  );
  noseStripe.position.set(0, gc + 0.31, 1.44);
  noseStripe.rotation.x = 0.21;
  monoGroup.add(noseStripe);

  if (!cityMode) {
    // Nose pitot mast + front wing camera winglets (from reference!)
    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.08, 6), mats.chrome);
    pitot.position.set(0, gc + 0.44, 0.92);
    monoGroup.add(pitot);

    [-1, 1].forEach((side) => {
      const camPod = new THREE.Mesh(
        createRoundedBoxGeo(0.11, 0.025, 0.08, 0.006, 2, 6),
        mats.trim,
      );
      camPod.position.set(side * 0.16, gc + 0.22, fZ + 0.28);
      monoGroup.add(camPod);
    });
  }

  tagPart(monoGroup, 'Monocoque & Bico Aerodinâmico', 0, 0.16, 0.1);
  group.add(monoGroup);

  // 3. Sculpted Undercut Sidepods + Overbite Radiator Intakes + Coke-Bottle Taper + Aero Mirrors
  const sidepodsGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const podGeo = createLoftedSidepodGeo(side, [
      { z: -1.42, xIn: 0.14, xOut: 0.26, yBot: gc + 0.04, yTop: gc + 0.22 },
      { z: -0.95, xIn: 0.17, xOut: 0.42, yBot: gc + 0.06, yTop: gc + 0.30 },
      { z: -0.35, xIn: 0.22, xOut: 0.62, yBot: gc + 0.09, yTop: gc + 0.40 },
      { z: 0.18, xIn: 0.24, xOut: 0.66, yBot: gc + 0.12, yTop: gc + 0.44 },
      { z: 0.46, xIn: 0.23, xOut: 0.62, yBot: gc + 0.16, yTop: gc + 0.43 },
    ]);
    const podMesh = new THREE.Mesh(podGeo, mats.body);
    sidepodsGroup.add(podMesh);

    // Side radiator intake cavity + upper overbite intake lip
    const intake = new THREE.Mesh(
      createRoundedBoxGeo(0.32, 0.18, 0.05, 0.022, 2, 8),
      mats.grille,
    );
    intake.position.set(side * 0.43, gc + 0.29, 0.455);
    sidepodsGroup.add(intake);

    const overbite = new THREE.Mesh(
      createRoundedBoxGeo(0.36, 0.028, 0.12, 0.01, 2, 8),
      mats.body,
    );
    overbite.position.set(side * 0.43, gc + 0.415, 0.48);
    sidepodsGroup.add(overbite);

    // Sidepod sponsor/accent trim stripe
    const podStripe = new THREE.Mesh(
      createRoundedBoxGeo(0.03, 0.045, 0.88, 0.01, 2, 6),
      mats.accent,
    );
    podStripe.position.set(side * 0.61, gc + 0.30, -0.18);
    podStripe.rotation.y = side * -0.16;
    sidepodsGroup.add(podStripe);

    if (!cityMode) {
      const mirRoot = new THREE.Vector3(side * 0.26, gc + 0.44, 0.36);
      const mirPos = new THREE.Vector3(side * 0.45, gc + 0.50, 0.38);
      const stalk = makeStrutBetween(mirRoot, mirPos, 0.011, 0.012, mats.trim, 6);
      const mirShell = new THREE.Mesh(
        createRoundedBoxGeo(0.11, 0.055, 0.075, 0.015, 2, 8),
        mats.body,
      );
      mirShell.position.copy(mirPos);
      const mirFace = new THREE.Mesh(
        createRoundedBoxGeo(0.09, 0.04, 0.012, 0.008, 2, 6),
        mats.mirrorGlass,
      );
      mirFace.position.set(mirPos.x, mirPos.y, mirPos.z - 0.036);
      sidepodsGroup.add(stalk, mirShell, mirFace);
    }
  });
  tagPart(sidepodsGroup, 'Sidepods Esculpidos & Coke-Bottle', 0, 0.14, 0);
  group.add(sidepodsGroup);

  // 4. Recessed Cockpit, Driver Helmet, Compact Butterfly Wheel & Titanium Halo
  const cockpitGroup = new THREE.Group();
  cockpitGroup.userData.xrayRole = 'interior';
  const seat = new THREE.Mesh(
    createRoundedBoxGeo(0.36, 0.26, 0.44, 0.06, 2, 8),
    mats.interior,
  );
  seat.position.set(0, gc + 0.28, -0.06);
  seat.rotation.x = -0.52;
  cockpitGroup.add(seat);

  const headrest = new THREE.Mesh(
    createRoundedBoxGeo(0.32, 0.16, 0.18, 0.04, 2, 8),
    mats.interior,
  );
  headrest.position.set(0, gc + 0.46, -0.22);
  cockpitGroup.add(headrest);

  // Driver Helmet + Tinted Visor cleanly framed inside Halo
  const helmetGrp = new THREE.Group();
  helmetGrp.position.set(0, gc + 0.46, -0.06);
  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, cityMode ? 10 : 18, cityMode ? 8 : 14),
    mats.accent,
  );
  helmetShell.scale.set(0.94, 1.0, 1.12);
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.115, 0.062, 16, 1, false, -Math.PI * 0.34, Math.PI * 0.68),
    mats.trim,
  );
  visor.position.set(0, 0.01, 0.02);
  helmetGrp.add(helmetShell, visor);
  cockpitGroup.add(helmetGrp);

  // Compact F1 Butterfly Steering Wheel tucked inside cockpit below Halo
  const f1SteerMount = new THREE.Group();
  f1SteerMount.position.set(0, gc + 0.38, 0.28);
  f1SteerMount.rotation.x = -0.34;
  const f1SteerWheel = new THREE.Group();
  const f1Body = new THREE.Mesh(
    createRoundedBoxGeo(0.20, 0.105, 0.028, 0.018, 2, 8),
    mats.trim,
  );
  f1SteerWheel.add(f1Body);
  [-1, 1].forEach((side) => {
    const grip = new THREE.Mesh(
      createRoundedBoxGeo(0.032, 0.095, 0.034, 0.012, 2, 6),
      mats.interior,
    );
    grip.position.set(side * 0.088, -0.005, 0);
    f1SteerWheel.add(grip);
  });
  const f1Screen = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.048, 0.032), mats.sirenBlue);
  f1Screen.position.set(0, 0.012, -0.004);
  f1SteerWheel.add(f1Screen);
  f1SteerMount.add(f1SteerWheel);
  cockpitGroup.add(f1SteerMount);
  animated.steeringWheels.push(f1SteerWheel);

  tagPart(cockpitGroup, 'Cockpit, Capacete & Volante F1', 0, 0.38, 0);
  group.add(cockpitGroup);

  // Titanium Halo framing driver helmet
  const haloGroup = new THREE.Group();
  const haloCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, gc + 0.51, -0.24),
    new THREE.Vector3(-0.21, gc + 0.58, 0.08),
    new THREE.Vector3(0, gc + 0.61, 0.42),
    new THREE.Vector3(0.21, gc + 0.58, 0.08),
    new THREE.Vector3(0.22, gc + 0.51, -0.24),
  ]);
  const haloTube = new THREE.Mesh(
    new THREE.TubeGeometry(haloCurve, cityMode ? 14 : 24, 0.024, 10, false),
    mats.trim,
  );
  const haloPylon = makeStrutBetween(
    new THREE.Vector3(0, gc + 0.47, 0.52),
    new THREE.Vector3(0, gc + 0.61, 0.41),
    0.02,
    0.028,
    mats.trim,
    8,
  );
  haloGroup.add(haloTube, haloPylon);
  tagPart(haloGroup, 'Proteção Halo Titânio', 0, 0.58, 0);
  group.add(haloGroup);

  // 5. V6 Turbo Power Unit + Hinged Openable Airbox, T-Cam & Coke-Bottle Engine Cover
  const powerUnit = createEngineBayAssembly(width * 0.22, 0.72, mats, false);
  powerUnit.position.set(0, gc + 0.22, -0.82);
  group.add(powerUnit);

  const cowlPivot = new THREE.Group();
  cowlPivot.position.set(0, gc + 0.24, -1.52);

  // Tapered sculpted engine cover shell
  const engineCowlGeo = createLoftedFormulaHullGeo([
    { z: 0.02, hw: 0.13, yBot: 0.0, yTop: 0.22 },
    { z: 0.45, hw: 0.19, yBot: 0.02, yTop: 0.36 },
    { z: 0.92, hw: 0.22, yBot: 0.06, yTop: 0.50 },
    { z: 1.24, hw: 0.18, yBot: 0.16, yTop: 0.58 },
  ]);
  cowlPivot.add(new THREE.Mesh(engineCowlGeo, mats.body));

  // Overhead Airbox Scoop + Dark Intake + Dorsal T-Cam Pod + Shark Fin
  const airboxBody = new THREE.Mesh(
    createRoundedBoxGeo(0.21, 0.18, 0.38, 0.05, 2, 10),
    mats.body,
  );
  airboxBody.position.set(0, 0.56, 1.18);
  const airboxIntake = new THREE.Mesh(
    createRoundedBoxGeo(0.15, 0.12, 0.04, 0.02, 2, 8),
    mats.grille,
  );
  airboxIntake.position.set(0, 0.57, 1.36);

  const tCamStem = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.09, 0.06), mats.trim);
  tCamStem.position.set(0, 0.67, 1.18);
  const tCamBar = new THREE.Mesh(createRoundedBoxGeo(0.22, 0.026, 0.065, 0.008, 2, 6), mats.trim);
  tCamBar.position.set(0, 0.71, 1.18);

  const sharkShape = new THREE.Shape();
  sharkShape.moveTo(0.06, 0.14);
  sharkShape.lineTo(1.06, 0.52);
  sharkShape.lineTo(1.06, 0.30);
  sharkShape.lineTo(0.06, 0.10);
  sharkShape.closePath();
  const sharkGeo = createExtrudedProfile(sharkShape, 0.026, 0.006, 0.006, 1, 6);
  const sharkFin = new THREE.Mesh(sharkGeo, mats.accent);
  sharkFin.position.set(0, 0.04, 0.0);

  cowlPivot.add(airboxBody, airboxIntake, tCamStem, tCamBar, sharkFin);
  tagPart(cowlPivot, 'Airbox, T-Cam & Capô Motor V6', 0, 0.5, -0.15);
  group.add(cowlPivot);
  registerOpenable(animated, cowlPivot, 'Capô do Motor F1', { x: 0.55 });

  // 6. Swept Multi-Element Curved Front Wing with Contoured Endplates (integrated with nose tip!)
  const fWingGroup = new THREE.Group();
  const fWingCenter = new THREE.Mesh(
    createRoundedBoxGeo(0.42, 0.032, 0.28, 0.01, 2, 8),
    mats.trim,
  );
  fWingCenter.position.set(0, gc + 0.025, noseTipZ - 0.14);
  fWingGroup.add(fWingCenter);

  [-1, 1].forEach((side) => {
    // 4 stepped swept wing elements per side (matching reference F1 front wing!)
    const wingSpan = width * 0.38;
    const xCenter = side * (0.17 + wingSpan * 0.5);
    const wingColors = [mats.trim, mats.body, mats.body, mats.accent];
    for (let e = 0; e < 4; e++) {
      const elem = new THREE.Mesh(
        createRoundedBoxGeo(wingSpan, 0.022, 0.105, 0.006, 2, 6),
        wingColors[e],
      );
      elem.position.set(
        xCenter,
        gc + 0.022 + e * 0.026,
        noseTipZ - 0.06 - e * 0.09,
      );
      elem.rotation.y = side * -0.14;
      elem.rotation.x = 0.08 + e * 0.075;
      fWingGroup.add(elem);
    }

    // Sculpted curved outer Front Wing Endplate + footplate strake
    const epShape = new THREE.Shape();
    epShape.moveTo(-0.22, 0.0);
    epShape.lineTo(0.24, 0.0);
    epShape.lineTo(0.20, 0.07);
    epShape.quadraticCurveTo(0.06, 0.20, -0.22, 0.23);
    epShape.closePath();
    const epGeo = createExtrudedProfile(epShape, 0.024, 0.006, 0.006, 2, 10);
    const ep = new THREE.Mesh(epGeo, mats.body);
    ep.position.set(side * (width * 0.472), gc + 0.01, noseTipZ - 0.18);
    ep.rotation.z = side * -0.06;
    fWingGroup.add(ep);

    const footplate = new THREE.Mesh(
      createRoundedBoxGeo(0.055, 0.016, 0.44, 0.005, 2, 6),
      mats.trim,
    );
    footplate.position.set(side * (width * 0.485), gc + 0.014, noseTipZ - 0.18);
    fWingGroup.add(footplate);
  });

  tagPart(fWingGroup, 'Asa Dianteira Multi-Elementos F1', 0, 0.05, 0.65);
  group.add(fWingGroup);

  // 7. Contoured High-Downforce Rear Wing, Beam Wing, Twin Pylons & Articulated DRS Flap
  const rWingZ = -halfL + 0.18;
  const rWingStruct = new THREE.Group();
  const rWingMain = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.50, 0.032, 0.24, 0.01, 2, 8),
    mats.trim,
  );
  rWingMain.position.set(0, gc + 0.72, rWingZ + 0.04);
  rWingMain.rotation.x = 0.16;
  rWingStruct.add(rWingMain);

  const beamWing = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.38, 0.024, 0.16, 0.008, 2, 6),
    mats.trim,
  );
  beamWing.position.set(0, gc + 0.38, rWingZ + 0.12);
  beamWing.rotation.x = 0.22;
  rWingStruct.add(beamWing);

  [-0.14, 0.14].forEach((px) => {
    const pylon = makeStrutBetween(
      new THREE.Vector3(px, gc + 0.24, rWingZ + 0.36),
      new THREE.Vector3(px, gc + 0.72, rWingZ + 0.06),
      0.018,
      0.024,
      mats.trim,
      6,
    );
    rWingStruct.add(pylon);
  });

  [-1, 1].forEach((side) => {
    const repShape = new THREE.Shape();
    repShape.moveTo(-0.18, 0.22);
    repShape.lineTo(0.08, 0.22);
    repShape.lineTo(0.20, 0.84);
    repShape.lineTo(-0.18, 0.84);
    repShape.closePath();
    const repGeo = createExtrudedProfile(repShape, 0.024, 0.006, 0.006, 2, 8);
    const rep = new THREE.Mesh(repGeo, mats.body);
    rep.position.set(side * (width * 0.255), gc + 0.04, rWingZ);
    rWingStruct.add(rep);
  });
  tagPart(rWingStruct, 'Asa Traseira & Beam Wing', 0, 0.45, -0.5);
  group.add(rWingStruct);

  const drsPivot = new THREE.Group();
  drsPivot.position.set(0, gc + 0.81, rWingZ - 0.06);
  const drsFlap = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.48, 0.026, 0.14, 0.008, 2, 8),
    mats.accent,
  );
  drsFlap.position.set(0, 0, 0.06);
  drsFlap.rotation.x = 0.28;
  drsPivot.add(drsFlap);
  tagPart(drsPivot, 'Flap DRS Traseiro Articulado', 0, 0.58, -0.55);
  group.add(drsPivot);
  registerOpenable(animated, drsPivot, 'Flap DRS Traseiro', { x: 0.46 });

  // Central FIA Rain Light & High Exhaust Tailpipe
  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.095, 0.04), mats.taillight);
  rainLight.position.set(0, gc + 0.20, -halfL + 0.08);
  group.add(rainLight);

  const exhaustTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.052, 0.34, 14).rotateX(Math.PI / 2),
    mats.chrome,
  );
  exhaustTube.position.set(0, gc + 0.29, -halfL + 0.40);
  const exhaustBore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12).rotateX(Math.PI / 2),
    mats.exhaustBore,
  );
  exhaustBore.position.set(0, gc + 0.29, -halfL + 0.23);
  group.add(exhaustTube, exhaustBore);

  // 8. True Double-Wishbone Suspension, Brake Cooling Ducts, Drivetrain & 4 Wide F1 Slicks
  const frontSteerPivots: { left?: THREE.Group; right?: THREE.Group } = {};
  [fZ, rZ].forEach((wz, idx) => {
    const isFront = idx === 0;
    const tireW = g.wheelWidth * (isFront ? 0.96 : 1.24);
    const uprightX = wheelX - tireW * 0.36;

    [-1, 1].forEach((side) => {
      if (cityMode) {
        const duct = new THREE.Mesh(
          new THREE.CylinderGeometry(g.wheelRadius * 0.42, g.wheelRadius * 0.42, 0.055, 14).rotateZ(Math.PI / 2),
          mats.trim,
        );
        duct.position.set(side * uprightX, g.wheelRadius, wz);
        group.add(duct);
      }

      const w = createCraftedWheel(
        g.wheelRadius,
        tireW,
        wheelStyle,
        mats,
        side > 0,
        false,
        cityMode,
      );
      if (isFront) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * wheelX, g.wheelRadius, wz);
        steerPivot.add(w);
        tagPart(steerPivot, 'Roda Slick Dianteira', side * 0.48, 0, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
        if (side < 0) frontSteerPivots.left = steerPivot;
        else frontSteerPivots.right = steerPivot;
      } else {
        w.position.set(side * wheelX, g.wheelRadius, wz);
        tagPart(w, 'Roda Slick Traseira', side * 0.48, 0, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  addDetailedMechanicalChassis({
    group,
    v,
    mats,
    animated,
    frontWheelZ: fZ,
    rearWheelZ: rZ,
    wheelX,
    wheelY: g.wheelRadius,
    wheelRadius: g.wheelRadius,
    wheelWidth: g.wheelWidth,
    maxTopY: gc + 0.48,
    frontSteerPivots,
    layout: 'formula',
    cityMode,
  });

  enableShadows(group);
  return group;
}

function buildPickupBedAssembly(
  group: THREE.Group,
  width: number,
  length: number,
  bodyLift: number,
  floorHeight: number,
  rearH: number,
  cabRearZ: number,
  rearWheelZ: number,
  archR: number,
  archCenterY: number,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  hasHollowCockpit: boolean,
  isMonster: boolean,
  cityMode: boolean,
) {
  const halfL = length / 2;
  const bedTopY = bodyLift + rearH;
  const bedFloorY = hasHollowCockpit
    ? bodyLift + Math.max(floorHeight + 0.06, rearH * 0.44)
    : bodyLift + Math.max(floorHeight + 0.10, rearH * 0.48);
  const bedWallH = Math.max(0.24, bedTopY - bedFloorY);
  const bedFrontZ = hasHollowCockpit
    ? Math.max(rearWheelZ + archR + 0.04, cabRearZ - 0.11)
    : cabRearZ - 0.06;
  const bedRearZ = -halfL + 0.08;
  const bedLen = Math.max(0.65, bedFrontZ - bedRearZ);
  const bedMidZ = (bedFrontZ + bedRearZ) * 0.5;
  const innerBedW = width * (hasHollowCockpit ? 0.62 : 0.72);
  const innerWallX = hasHollowCockpit ? width * 0.315 : width * 0.355;

  const bedGrp = new THREE.Group();

  // 1. Structural under-bed painted pan & chassis rails (hollowed pickups) OR outer painted bed walls (monster/cityMode)
  if (hasHollowCockpit) {
    const underPan = new THREE.Mesh(
      createRoundedBoxGeo(innerBedW * 0.98, 0.06, bedLen * 0.96, 0.015, 1, 6),
      mats.body,
    );
    underPan.position.set(0, bedFloorY - 0.036, bedMidZ);
    bedGrp.add(underPan);

    [-1, 1].forEach((side) => {
      const frameRail = new THREE.Mesh(
        createRoundedBoxGeo(0.08, 0.11, bedLen * 0.92, 0.014, 1, 6),
        mats.trim,
      );
      frameRail.position.set(side * (width * 0.20), bodyLift + 0.06, bedMidZ);
      bedGrp.add(frameRail);
    });
  } else {
    const outerWallW = width * 0.145;
    [-1, 1].forEach((side) => {
      const outerWall = new THREE.Mesh(
        createRoundedBoxGeo(outerWallW, bedWallH + 0.02, bedLen + 0.04, 0.028, cityMode ? 2 : 3, 8),
        mats.body,
      );
      outerWall.position.set(side * (width * 0.425), bedFloorY + bedWallH * 0.5, bedMidZ);
      bedGrp.add(outerWall);
    });
  }

  // 2. Heavy-duty dark textured bedliner floor + longitudinal cargo ribs
  const floorSlab = new THREE.Mesh(
    createRoundedBoxGeo(innerBedW, 0.042, bedLen, 0.012, 2, 6),
    mats.trim,
  );
  floorSlab.position.set(0, bedFloorY + 0.012, bedMidZ);
  bedGrp.add(floorSlab);

  if (!cityMode) {
    const ribCount = 6;
    for (let i = 0; i < ribCount; i++) {
      const t = i / (ribCount - 1) - 0.5;
      const rib = new THREE.Mesh(
        createRoundedBoxGeo(0.022, 0.016, bedLen * 0.90, 0.005, 1, 4),
        mats.grille,
      );
      rib.position.set(t * innerBedW * 0.78, bedFloorY + 0.036, bedMidZ);
      bedGrp.add(rib);
    }
  }

  // 3. Front cab bulkhead wall + inner bedliner side panels + bed-rail protective caps
  const frontBulkhead = new THREE.Mesh(
    createRoundedBoxGeo(innerBedW + 0.06, bedWallH + 0.02, 0.068, 0.016, 2, 6),
    mats.trim,
  );
  frontBulkhead.position.set(0, bedFloorY + bedWallH * 0.5, bedFrontZ - 0.015);
  bedGrp.add(frontBulkhead);

  const bulkheadBody = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.80, bedWallH, 0.06, 0.018, 2, 6),
    mats.body,
  );
  bulkheadBody.position.set(0, bedFloorY + bedWallH * 0.5, bedFrontZ + 0.025);
  bedGrp.add(bulkheadBody);

  [-1, 1].forEach((side) => {
    const innerSide = new THREE.Mesh(
      createRoundedBoxGeo(0.048, bedWallH, bedLen, 0.012, 1, 6),
      mats.trim,
    );
    innerSide.position.set(side * innerWallX, bedFloorY + bedWallH * 0.5, bedMidZ);
    bedGrp.add(innerSide);

    const railCap = new THREE.Mesh(
      createRoundedBoxGeo(hasHollowCockpit ? width * 0.16 : width * 0.15, 0.026, bedLen + 0.02, 0.01, 2, 6),
      mats.trim,
    );
    railCap.position.set(
      side * (hasHollowCockpit ? width * 0.395 : width * 0.422),
      bedTopY + 0.008,
      bedMidZ,
    );
    bedGrp.add(railCap);

    // Sculpted interior rear wheelwell humps inside the cargo bed
    if (!isMonster) {
      const humpTopY = Math.min(bedTopY - 0.04, Math.max(bedFloorY + 0.15, archCenterY + archR + 0.035));
      const humpH = Math.max(0.12, humpTopY - bedFloorY);
      const humpLen = Math.min(bedLen * 0.65, archR * 2.05);
      const hump = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.11, humpH, humpLen, 0.036, 2, 8),
        mats.trim,
      );
      hump.position.set(side * (innerWallX - width * 0.042), bedFloorY + humpH * 0.5, rearWheelZ);
      bedGrp.add(hump);
    }
  });

  tagPart(bedGrp, 'Caçamba Rebaixada com Protetor', 0, 0.22, -0.35);
  group.add(bedGrp);

  // 4. Articulated folding pickup tailgate (outer painted skin + inner bedliner + top cap + handle)
  const tailgatePivot = new THREE.Group();
  tailgatePivot.position.set(0, bedFloorY + 0.015, bedRearZ);
  const tgW = hasHollowCockpit ? width * 0.60 : width * 0.72;
  const tgH = Math.max(0.24, bedWallH - 0.005);

  const tgOuter = new THREE.Mesh(
    createSculptedPanelGeo(tgW, tgH, 0.056, 10, 4, 2, 0.018, (pos, idx, hx) => {
      const nx = THREE.MathUtils.clamp(Math.abs(pos.getX(idx)) / Math.max(0.1, hx), 0, 1);
      pos.setZ(idx, pos.getZ(idx) - 0.010 * Math.cos(nx * Math.PI * 0.5));
    }),
    mats.body,
  );
  tgOuter.position.set(0, tgH * 0.5, -0.015);
  tailgatePivot.add(tgOuter);

  const tgLiner = new THREE.Mesh(
    createRoundedBoxGeo(tgW * 0.94, tgH * 0.88, 0.022, 0.008, 1, 6),
    mats.trim,
  );
  tgLiner.position.set(0, tgH * 0.48, 0.016);
  const tgCap = new THREE.Mesh(
    createRoundedBoxGeo(tgW * 0.99, 0.026, 0.072, 0.01, 2, 6),
    mats.trim,
  );
  tgCap.position.set(0, tgH + 0.006, -0.005);
  const tgHandle = new THREE.Mesh(
    createRoundedBoxGeo(0.18, 0.038, 0.022, 0.006, 1, 6),
    mats.chrome,
  );
  tgHandle.position.set(0, tgH * 0.76, -0.048);
  tailgatePivot.add(tgLiner, tgCap, tgHandle);

  tagPart(tailgatePivot, 'Tampa Traseira da Caçamba', 0, 0.1, -0.45);
  group.add(tailgatePivot);
  registerOpenable(animated, tailgatePivot, 'Tampa da Caçamba', { x: -1.42 });
}

// =========================================================================
// 6. STANDARD WHEELED CARS, PICKUPS, VANS, BUSES & HEAVY TRUCKS
// =========================================================================
export function buildStandardWheeledVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  livery: PaintLivery,
  wheelStyle: WheelStyle,
  cityMode = false,
): THREE.Group {
  const g = v.geometry;
  if (g.archetype === 'formula') {
    return buildFormulaCar(v, mats, wheelStyle, animated, cityMode);
  }
  if (g.archetype === 'bus' || g.archetype === 'articulated_bus') {
    return buildBusOrArticulatedBus(v, mats, animated, wheelStyle, cityMode);
  }
  if (
    g.archetype === 'semi_truck' ||
    g.archetype === 'dump_truck' ||
    g.archetype === 'mixer_truck' ||
    g.archetype === 'firetruck' ||
    g.archetype === 'tow_truck'
  ) {
    return buildHeavyTruckVehicle(v, mats, animated, wheelStyle, cityMode);
  }
  if (g.archetype === 'van' || g.archetype === 'ambulance' || g.archetype === 'armored') {
    return buildVanOrArmoredVehicle(v, mats, animated, wheelStyle, cityMode);
  }

  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const halfL = length / 2;
  const frontWheelZ = wheelbase > 0 ? wheelbase * 0.5 : length * 0.32;
  const rearWheelZ = wheelbase > 0 ? -wheelbase * 0.5 : -length * 0.32;
  const isElectric = v.palette.finish === 'pearl' && g.archetype === 'micro';
  const exhaustStyle: ExhaustStyle =
    g.exhaustStyle ??
    (g.attachments.includes('quad_exhaust')
      ? 'quad'
      : g.attachments.includes('side_exhaust')
        ? 'side_pipes'
        : g.attachments.includes('dual_exhaust')
          ? 'dual'
          : isElectric
            ? 'none'
            : 'single');

  // C. PASSENGER CARS / SPORTS / SUPERCARS / SUV / PICKUPS / MONSTER / BUGGY
  const isPickup = g.archetype === 'pickup' || g.archetype === 'monster';
  const isMonster = g.archetype === 'monster';
  const isBuggy = g.archetype === 'buggy';
  const isHatch = g.archetype === 'hatch';
  const isOpenTop = g.archetype === 'roadster' || g.archetype === 'convertible' || isBuggy;
  const isSupercar = g.archetype === 'supercar';
  const aeroTier = getVehicleAeroTier(v);
  const isHyper = aeroTier === 'hyper';
  const isSport = aeroTier === 'sport';
  const isLuxury = aeroTier === 'luxury';
  const isAero = isHyper || isSport || isLuxury;
  const hasHollowCockpit = !cityMode && !isMonster;

  const isOffroad = aeroTier === 'offroad';
  const isOffroadArch = isOffroad || g.groundClearance >= 0.23;

  const bodyLift = isMonster ? g.groundClearance * 0.55 : g.groundClearance;
  const bodyH = (height - bodyLift) * (1 - g.cabinHeightRatio);
  const archScale = isMonster
    ? 0.72
    : isOffroadArch
      ? 1.20
      : isHyper
        ? 1.13
        : isSport
          ? 1.15
          : isHatch
            ? 1.17
            : 1.18;
  const archR = g.wheelRadius * archScale;
  const rideDelta = Math.max(0, bodyLift - 0.14);
  const archCenterY =
    isHyper || isSport
      ? Math.max(bodyLift + 0.02, g.wheelRadius - 0.005)
      : Math.max(bodyLift + 0.03, g.wheelRadius + rideDelta * (isOffroadArch ? 0.42 : 0.32));
  const minFenderTopY =
    !isMonster && !isBuggy
      ? archCenterY + archR + (isHatch ? 0.068 : 0.045)
      : bodyLift + bodyH * 0.7;
  const minFenderH = Math.max(0, minFenderTopY - bodyLift);
  const hoodH = Math.max(
    bodyH * (isHyper ? 0.72 : isSport ? 0.82 : isLuxury ? 0.86 : 0.88),
    minFenderH - (isHatch ? 0.0 : 0.01),
  );
  const rearH = Math.max(
    isPickup
      ? bodyH * 0.92
      : bodyH * (isHatch || g.archetype === 'wagon' ? 0.98 : isHyper ? 0.96 : 0.94),
    minFenderH,
  );

  const beltlineY = Math.max(bodyLift + bodyH - 0.03, bodyLift + Math.max(hoodH, rearH) - 0.02);
  const cabH = Math.max(0.32, height - beltlineY);
  const sculptedCabH =
    isHyper && !isOpenTop
      ? Math.max(0.30, cabH * 0.88)
      : isSport && !isOpenTop
        ? Math.max(0.32, cabH * 0.92)
        : isHatch
          ? Math.max(0.36, cabH - 0.036)
          : cabH;

  let cabLen = length * g.cabinLengthRatio;
  let cabCenterZ = isPickup
    ? length * 0.08
    : isBuggy
      ? -length * 0.04
      : g.archetype === 'muscle' || g.archetype === 'classic' || isOpenTop || g.archetype === 'coupe'
        ? -length * 0.05
        : isSupercar
          ? length * 0.04
          : -length * (g.rearDeckRatio * 0.35 - 0.05);

  let cabFrontZ = cabCenterZ + cabLen * 0.48;
  let cabRearZ = cabCenterZ - cabLen * 0.48;

  if (isHatch) {
    // Authentic hatchback cab-back proportions: windshield cowl clears front wheel well,
    // C-pillar extends cleanly to the curved rear hatch tailgate behind the rear wheel arch
    cabFrontZ = Math.min(frontWheelZ - archR - 0.035, halfL * 0.46);
    cabRearZ = Math.max(-halfL + 0.22, -halfL + length * 0.065);
    cabLen = Math.max(1.6, cabFrontZ - cabRearZ);
    cabCenterZ = (cabFrontZ + cabRearZ) * 0.5;
  }

  const floorHeight = bodyH * 0.28;
  const interiorDropY = Math.max(0.18, beltlineY - (bodyLift + floorHeight));

  // Shared windshield & rear-glass rake ratios (aligned across doors, pillars & glass)
  const wsRake = isHatch
    ? THREE.MathUtils.clamp((sculptedCabH * Math.tan(THREE.MathUtils.degToRad(32))) / (cabLen * 0.5), 0.22, 0.54)
    : isHyper
      ? 0.76
      : isSport
        ? 0.56
        : isLuxury
          ? 0.50
          : 0.44;
  const rRake = isHatch
    ? THREE.MathUtils.clamp((sculptedCabH * Math.tan(THREE.MathUtils.degToRad(30))) / (cabLen * 0.5), 0.22, 0.50)
    : g.archetype === 'wagon' || g.archetype === 'suv'
      ? 0.18
      : isHyper
        ? 0.70
        : isSport
          ? 0.62
          : isLuxury
            ? 0.54
            : 0.48;

  const aeroSculptOpts = getAeroSculptOpts(
    aeroTier,
    bodyLift,
    Math.max(beltlineY, bodyLift + rearH),
    halfL,
    isHatch,
  );

  if (hasHollowCockpit && isBuggy) {
    // 1. Open Tubular Desert Buggy Chassis (hollowed narrow tub + exposed cut fenders + coilover struts + rear engine cage!)
    const buggyTubShape = buildHollowedSideProfile(
      length,
      bodyLift,
      floorHeight,
      hoodH,
      rearH,
      cabFrontZ,
      cabRearZ,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      true,
    );
    const buggyTubGeo = createExtrudedProfile(buggyTubShape, width * 0.64, 0.04, 0.04, 3, 14);
    const buggyTub = new THREE.Mesh(buggyTubGeo, mats.body);
    tagPart(buggyTub, 'Chassi Tubular Buggy Aberto', 0, 0.05, 0);
    group.add(buggyTub);

    // Flared Baja cut fenders + exposed offroad coil-over shocks + tubular side nerf bars
    [-1, 1].forEach((side) => {
      [frontWheelZ, rearWheelZ].forEach((wz, idx) => {
        const fenderFlare = new THREE.Mesh(
          new THREE.TorusGeometry(g.wheelRadius * 1.14, 0.048, 8, 16, Math.PI * 0.85),
          mats.body,
        );
        fenderFlare.rotation.y = Math.PI / 2;
        fenderFlare.position.set(
          side * (width * 0.41),
          Math.max(g.wheelRadius * 1.02, g.wheelRadius + Math.max(0, bodyLift - 0.24) * 0.45),
          wz,
        );
        group.add(fenderFlare);

        if (cityMode) {
          const shock = makeStrutBetween(
            new THREE.Vector3(side * (width * 0.24), bodyLift + hoodH * 0.85, wz),
            new THREE.Vector3(side * (width * 0.42), g.wheelRadius + 0.06, wz),
            0.026,
            0.022,
            mats.accent,
            8,
          );
          group.add(shock);
          if (idx === 0) {
            const arm = makeStrutBetween(
              new THREE.Vector3(side * (width * 0.16), g.wheelRadius, wz),
              new THREE.Vector3(side * (width * 0.42), g.wheelRadius, wz),
              0.022,
              0.022,
              mats.trim,
              8,
            );
            group.add(arm);
          }
        }
      });

      // Tubular side nerf bars along open buggy doorway (no solid side doors blocking the cockpit!)
      const nerf = makeStrutBetween(
        new THREE.Vector3(side * (width * 0.40), bodyLift + floorHeight + 0.08, cabFrontZ + 0.08),
        new THREE.Vector3(side * (width * 0.40), bodyLift + floorHeight + 0.08, cabRearZ - 0.08),
        0.028,
        0.028,
        mats.trim,
        10,
      );
      group.add(nerf);
    });

    // Exposed rear desert engine block + front aluminum bash skidplate
    const rearEng = createEngineBayAssembly(width * 0.46, Math.max(0.45, cabRearZ - (-halfL + 0.16)), mats, false);
    rearEng.position.set(0, bodyLift + rearH * 0.52, (cabRearZ + (-halfL + 0.16)) * 0.5);
    const skid = new THREE.Mesh(createRoundedBoxGeo(width * 0.44, 0.04, 0.36, 0.015, 2, 6), mats.alloy);
    skid.position.set(0, bodyLift + 0.02, halfL - 0.14);
    skid.rotation.x = -0.35;
    group.add(rearEng, skid);
  } else if (hasHollowCockpit) {
    // 1. Hollowed lower chassis tub (narrowed to 0.84*width so flush doors sit OUTSIDE the structural sill!)
    const tubShape = buildHollowedSideProfile(
      length,
      bodyLift,
      floorHeight,
      hoodH,
      rearH,
      cabFrontZ,
      cabRearZ,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      true,
      archCenterY,
      isPickup,
      aeroTier,
    );
    const tubGeo = createExtrudedProfile(
      tubShape,
      width * 0.84,
      isHatch ? 0.052 : 0.045,
      isHatch ? 0.052 : 0.045,
      cityMode ? 2 : isHatch || isAero ? 6 : 5,
      cityMode ? 12 : isHatch || isAero ? 28 : 24,
      cityMode ? 2 : 6,
    );
    sculptSideVolumeVertices(tubGeo, {
      ...aeroSculptOpts,
      sideSign: 0,
      halfWidthAtMid: width * 0.42,
    });
    const tubMesh = new THREE.Mesh(tubGeo, mats.body);
    tagPart(tubMesh, 'Chassi Monobloco Esculpido', 0, 0.05, 0);
    group.add(tubMesh);

    // 2. Sculpted Contoured Outer Front & Rear Fenders with Integrated Wheel Arch Cutouts (zero square towers!)
    const fStopZLim = Math.min(halfL - 0.15, cabFrontZ + 0.06);
    const fDoorHingeZLim = cabFrontZ - 0.02;
    const fFenderRearZ = Math.min(fDoorHingeZLim + 0.015, fStopZLim - 0.01);
    const fFenderFrontZ = halfL - 0.06;
    const hoodSpan = Math.max(0.45, halfL - (isHatch ? 0.045 : 0.12) - cabFrontZ);
    const hoodCenterZ = (cabFrontZ + halfL - 0.12) * 0.5;

    const hoodBackY = bodyLift + hoodH * 0.96;
    const hoodFrontY = bodyLift + hoodH * (1 - getHoodSlopeFactor(aeroTier, g.hoodSlope));
    const fArchPeakY = Math.max(
      (hoodBackY + hoodFrontY) * 0.5 + (isAero ? 0.032 : 0.02),
      archCenterY + archR + (isAero ? 0.052 : 0.045),
    );

    const isFourDoor =
      !isOpenTop &&
      v.unitySpec.seats >= 4 &&
      (g.archetype === 'sedan' ||
        g.archetype === 'wagon' ||
        g.archetype === 'suv' ||
        isHatch ||
        (isPickup && cabLen > 1.8));
    const hatchDoorSpanMax = isHatch
      ? Math.max(1.2, fDoorHingeZLim - (rearWheelZ + archR + 0.022))
      : Math.max(1.1, fDoorHingeZLim - (cabRearZ + 0.06));
    const hatchDoorGap = 0.032;
    const hatchFDoorLen = (hatchDoorSpanMax - hatchDoorGap) * (isHatch ? 0.53 : 0.52);
    const hatchRDoorHingeZ = fDoorHingeZLim - hatchFDoorLen - hatchDoorGap;
    const hatchRDoorLen = Math.max(0.48, hatchDoorSpanMax - hatchFDoorLen - hatchDoorGap);
    const hatchRDoorRearEdgeZ = hatchRDoorHingeZ - hatchRDoorLen;

    const rFenderFrontZ = isHatch
      ? hatchRDoorRearEdgeZ + 0.015
      : Math.max(-halfL + 0.35, cabRearZ - 0.02);
    const rFenderRearZ = -halfL + 0.06;
    const rArchPeakY = Math.max(bodyLift + rearH, archCenterY + archR + (isAero ? 0.068 : 0.055));

    const fFenderShape = buildQuarterFenderProfile(
      fFenderRearZ,
      fFenderFrontZ,
      bodyLift,
      frontWheelZ,
      archR,
      hoodBackY,
      fArchPeakY,
      hoodFrontY,
      true,
      archCenterY,
      aeroTier,
    );
    const baseFFenderGeo = createExtrudedProfile(
      fFenderShape,
      width * 0.195,
      isHatch ? 0.044 : 0.038,
      isHatch ? 0.044 : 0.038,
      cityMode ? 2 : isHatch || isAero ? 6 : 5,
      cityMode ? 12 : isHatch || isAero ? 28 : 22,
      cityMode ? 2 : 4,
    );

    const rFenderShape = buildQuarterFenderProfile(
      rFenderRearZ,
      rFenderFrontZ,
      bodyLift,
      rearWheelZ,
      archR,
      bodyLift + rearH * (isHatch ? 0.90 : 0.96),
      rArchPeakY,
      Math.max(bodyLift + rearH, beltlineY * 0.98),
      false,
      archCenterY,
      aeroTier,
    );
    const baseRFenderGeo = createExtrudedProfile(
      rFenderShape,
      width * 0.195,
      isHatch ? 0.044 : 0.038,
      isHatch ? 0.044 : 0.038,
      cityMode ? 2 : isHatch || isAero ? 6 : 5,
      cityMode ? 12 : isHatch || isAero ? 28 : 22,
      cityMode ? 2 : 4,
    );

    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const fGeo = baseFFenderGeo.clone();
      sculptSideVolumeVertices(fGeo, {
        ...aeroSculptOpts,
        sideSign: side,
      });
      const fFender = new THREE.Mesh(fGeo, mats.body);
      fFender.position.set(side * (width * 0.397), 0, 0);
      tagPart(fFender, 'Para-lama Dianteiro Esculpido', side * 0.35, 0.05, 0.2);
      group.add(fFender);

      const rGeo = baseRFenderGeo.clone();
      sculptSideVolumeVertices(rGeo, {
        ...aeroSculptOpts,
        sideSign: side,
      });
      const rFender = new THREE.Mesh(rGeo, mats.body);
      rFender.position.set(side * (width * 0.397), 0, 0);
      tagPart(rFender, 'Para-lama Traseiro Esculpido', side * 0.35, 0.05, -0.2);
      group.add(rFender);

      // Well-defined rounded beveled ExtrudeGeometry wheel-arch flares around each tire
      [frontWheelZ, rearWheelZ].forEach((wz, aIdx) => {
        if (isHatch) {
          const archFlare = createBeveledWheelArchAssembly(
            archR,
            bodyLift,
            archCenterY,
            width,
            mats,
            side,
            wz,
            cityMode,
          );
          tagPart(
            archFlare,
            aIdx === 0 ? 'Arco de Roda Dianteiro Chanfrado' : 'Arco de Roda Traseiro Chanfrado',
            side * 0.42,
            0.04,
            0,
          );
          group.add(archFlare);
        } else {
          const archLip = new THREE.Mesh(
            new THREE.TorusGeometry(archR * 1.01, 0.018, 8, 22, Math.PI * 0.92),
            mats.body,
          );
          archLip.rotation.y = Math.PI / 2;
          archLip.rotation.z = 0.04 * Math.PI;
          archLip.position.set(side * (width * 0.488), archCenterY, wz);
          group.add(archLip);
        }
      });
    });

    baseFFenderGeo.dispose();
    baseRFenderGeo.dispose();

    // Recessed engine bay + flush-sloped double-curved sculpted hinged hood with power creases!
    const bay = createEngineBayAssembly(width * 0.54, hoodSpan * 0.85, mats, isElectric || isSupercar);
    bay.position.set(0, bodyLift + hoodH * 0.68, hoodCenterZ);
    group.add(bay);

    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, hoodBackY, cabFrontZ + 0.02);
    const hoodRise = hoodBackY - hoodFrontY;
    const hoodAngle = Math.atan2(hoodRise, Math.max(0.2, hoodSpan));
    const hoodLenDiag = Math.hypot(hoodSpan, hoodRise);
    const hasPowerDome = isSupercar || g.archetype === 'coupe' || g.archetype === 'muscle';
    if (isHatch) {
      const hatchHoodGeo = createBeveledHatchHoodGeo(width * 0.60, hoodSpan, hoodRise, cityMode);
      const hoodLid = new THREE.Mesh(hatchHoodGeo, mats.body);
      hoodPivot.add(hoodLid);
    } else {
      const hoodGeo = createSculptedPanelGeo(
        width * 0.59,
        0.058,
        hoodLenDiag,
        cityMode ? 6 : 12,
        3,
        cityMode ? 6 : 12,
        0.026,
        (pos, idx, hx, _hy, hz) => {
          const x = pos.getX(idx);
          const y = pos.getY(idx);
          const z = pos.getZ(idx);
          const nx = THREE.MathUtils.clamp(Math.abs(x) / Math.max(0.1, hx), 0, 1);
          const tz = THREE.MathUtils.clamp(z / Math.max(0.1, hz), -1, 1);
          const tz01 = (tz + 1) * 0.5;
          const lateralCrown = 0.026 * Math.cos(nx * Math.PI * 0.5);
          const longCam = 0.012 * Math.sin(tz01 * Math.PI);
          const noseDip = -0.016 * Math.pow(Math.max(0, tz), 2.1);
          const twinVCrease =
            (hasPowerDome ? 0.014 : 0.007) *
            Math.exp(-Math.pow((nx - (0.34 - tz01 * 0.08)) / 0.14, 2)) *
            (1 - Math.abs(tz) * 0.45);
          const centerDome = hasPowerDome
            ? 0.018 * Math.exp(-Math.pow(nx / 0.36, 2)) * Math.sin(tz01 * Math.PI)
            : 0;
          pos.setY(idx, y + lateralCrown + longCam + noseDip + twinVCrease + centerDome);
        },
      );
      const hoodLid = new THREE.Mesh(hoodGeo, mats.body);
      hoodLid.position.set(0, -Math.sin(hoodAngle) * hoodLenDiag * 0.5 - 0.014, Math.cos(hoodAngle) * hoodLenDiag * 0.5);
      hoodLid.rotation.x = hoodAngle;
      hoodPivot.add(hoodLid);
    }

    if (livery === 'racing_stripes' || livery === 'rally') {
      [-0.14, 0.14].forEach((sx) => {
        const hs = new THREE.Mesh(
          createRoundedBoxGeo(0.14, 0.016, hoodLenDiag * 0.90, 0.005, 1, 6),
          mats.liveryStripe,
        );
        hs.position.set(sx, -Math.sin(hoodAngle) * hoodLenDiag * 0.5 + 0.022, Math.cos(hoodAngle) * hoodLenDiag * 0.5);
        hs.rotation.x = hoodAngle;
        hoodPivot.add(hs);
      });
    }
    if (
      isHyper &&
      !cityMode &&
      !g.attachments.includes('blower_v8') &&
      !g.attachments.includes('hood_scoop')
    ) {
      [-1, 1].forEach((side) => {
        const vent = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.14, 0.016, hoodLenDiag * 0.22, 0.005, 1, 6),
          mats.grilleMesh,
        );
        vent.position.set(
          side * (width * 0.16),
          -Math.sin(hoodAngle) * hoodLenDiag * 0.45 + 0.026,
          Math.cos(hoodAngle) * hoodLenDiag * 0.45,
        );
        vent.rotation.x = hoodAngle + 0.06;
        vent.rotation.y = side * -0.10;
        hoodPivot.add(vent);
      });
    }
    tagPart(hoodPivot, isSupercar ? 'Capô Frontal (Porta-Malas)' : 'Capô do Motor Articulado', 0, 0.35, 0.25);
    group.add(hoodPivot);
    registerOpenable(animated, hoodPivot, 'Capô Dianteiro', { x: -0.68 });

    // Tucked full-width sculpted windshield cowl bulkhead bridging hood cleanly up to cabin beltlineY
    const cowlBotY = bodyLift + Math.min(hoodH, floorHeight + 0.14);
    const cowlTopY = beltlineY + 0.008;
    const cowlBridgeH = Math.max(0.11, cowlTopY - cowlBotY);
    const cowlPanel = new THREE.Mesh(
      createSculptedPanelGeo(width * 0.84, cowlBridgeH, 0.18, 10, 3, 4, 0.024, (pos, idx, hx) => {
        const nx = THREE.MathUtils.clamp(Math.abs(pos.getX(idx)) / Math.max(0.1, hx), 0, 1);
        pos.setY(idx, pos.getY(idx) + 0.020 * Math.cos(nx * Math.PI * 0.5));
      }),
      mats.body,
    );
    cowlPanel.position.set(0, cowlBotY + cowlBridgeH * 0.5, cabCenterZ + cabLen * 0.45);
    const cowlGrille = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.80, 0.022, 0.10, 0.008, 1, 6),
      mats.grille,
    );
    cowlGrille.position.set(0, beltlineY + 0.004, cabCenterZ + cabLen * 0.47);
    group.add(cowlPanel, cowlGrille);

    // Rear trunk lid (non-pickup, non-hatch; pickup bed & tailgate built below in buildPickupBedAssembly)
    const rearSpan = Math.max(0.36, cabRearZ - (-halfL + 0.12));
    if (!isPickup && !isHatch && g.archetype !== 'wagon' && g.archetype !== 'suv') {
      if (isSupercar) {
        const rearBay = createEngineBayAssembly(width * 0.54, rearSpan * 0.85, mats, false);
        rearBay.position.set(0, bodyLift + rearH * 0.65, cabRearZ - rearSpan * 0.5);
        group.add(rearBay);
      }
      const trunkPivot = new THREE.Group();
      trunkPivot.position.set(0, bodyLift + rearH * 0.96, cabRearZ - 0.02);
      const hasWingAlready = g.attachments.includes('wing_swan') || g.attachments.includes('spoiler_gt');
      const hasDucktail = (isHyper || isSport) && !hasWingAlready;
      const trunkGeo = createSculptedPanelGeo(
        width * 0.59,
        0.056,
        rearSpan,
        cityMode ? 6 : 12,
        3,
        cityMode ? 6 : 12,
        0.026,
        (pos, idx, hx, _hy, hz) => {
          const nx = THREE.MathUtils.clamp(Math.abs(pos.getX(idx)) / Math.max(0.1, hx), 0, 1);
          const tz = THREE.MathUtils.clamp(pos.getZ(idx) / Math.max(0.1, hz), -1, 1);
          const crown = (isAero ? 0.028 : 0.022) * Math.cos(nx * Math.PI * 0.5);
          const duckKick =
            hasDucktail && tz < -0.45
              ? 0.036 * Math.pow((-0.45 - tz) / 0.55, 1.45) * (1 - Math.pow(nx, 2.2) * 0.35)
              : 0;
          const rearDrop =
            !hasDucktail && tz < -0.55 ? -0.012 * Math.pow((-0.55 - tz) / 0.45, 1.5) : 0;
          pos.setY(idx, pos.getY(idx) + crown + duckKick + rearDrop);
        },
      );
      const trunkLid = new THREE.Mesh(trunkGeo, mats.body);
      trunkLid.position.set(0, -0.014, -rearSpan * 0.5);
      trunkPivot.add(trunkLid);
      if (hasDucktail && !cityMode) {
        const duckLip = new THREE.Mesh(
          createSculptedPanelGeo(width * 0.72, 0.024, 0.11, 10, 2, 3, 0.010, (p, idx, hx) => {
            const nx = THREE.MathUtils.clamp(Math.abs(p.getX(idx)) / Math.max(0.1, hx), 0, 1);
            p.setZ(idx, p.getZ(idx) + Math.pow(nx, 1.8) * 0.030);
          }),
          mats.trim,
        );
        duckLip.position.set(0, 0.044, -rearSpan + 0.032);
        duckLip.rotation.x = -0.26;
        trunkPivot.add(duckLip);
      }
      if (livery === 'racing_stripes' || livery === 'rally') {
        [-0.14, 0.14].forEach((sx) => {
          const rs = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, rearSpan * 0.9), mats.liveryStripe);
          rs.position.set(sx, 0.020, -rearSpan * 0.5);
          trunkPivot.add(rs);
        });
      }
      tagPart(trunkPivot, isSupercar ? 'Tampa do Motor Traseiro' : 'Porta-Malas Articulado', 0, 0.35, -0.25);
      group.add(trunkPivot);
      registerOpenable(animated, trunkPivot, 'Porta-Malas Traseiro', { x: 0.72 });
    } else if (isHatch) {
      // Sculpted beveled ExtrudeGeometry hatchback tailgate hinged at roof trailing header
      const rTopZ = cabRearZ + cabLen * 0.5 * rRake;
      const pivY = beltlineY + sculptedCabH - 0.018;
      const pivZ = rTopZ;
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(0, pivY, pivZ);

      const hatchPanelGeo = createBeveledHatchTailgateGeo(
        width * 0.65,
        cabRearZ - pivZ,
        beltlineY - pivY,
        -halfL + 0.062 - pivZ,
        bodyLift + 0.21 - pivY,
        cityMode,
      );
      const hatchPanel = new THREE.Mesh(hatchPanelGeo, mats.body);

      const hatchLip = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.68, 0.036, 0.14, 0.016, 4, 10),
        mats.body,
      );
      hatchLip.position.set(0, 0.018, -0.05);
      hatchLip.rotation.x = 0.08;
      hatchPivot.add(hatchPanel, hatchLip);

      // High-mounted 3rd brake light (CHMSL) + compact rear hatch window wiper
      if (!cityMode) {
        const chmsl = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.24, 0.014, 0.022, 0.004, 1, 4),
          mats.taillight,
        );
        chmsl.position.set(0, 0.016, -0.115);
        hatchPivot.add(chmsl);

        const rearWiperArm = new THREE.Mesh(
          createRoundedBoxGeo(0.24, 0.013, 0.016, 0.004, 1, 4),
          mats.grille,
        );
        rearWiperArm.position.set(0.09, beltlineY - pivY + 0.032, cabRearZ - pivZ - 0.018);
        rearWiperArm.rotation.z = -0.06;
        const rearWiperPivot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.014, 0.016, 0.022, 10).rotateX(Math.PI / 2),
          mats.trim,
        );
        rearWiperPivot.position.set(0, beltlineY - pivY + 0.024, cabRearZ - pivZ - 0.016);
        hatchPivot.add(rearWiperArm, rearWiperPivot);
      }

      tagPart(hatchPivot, 'Tampa Traseira Articulada', 0, 0.35, -0.35);
      group.add(hatchPivot);
      registerOpenable(animated, hatchPivot, 'Tampa Traseira', { x: 0.78 });
    } else {
      // Rear wagon/SUV tailgate hinged at roof rear edge + integrated sculpted roof lip spoiler
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(0, beltlineY + sculptedCabH - 0.03, cabRearZ + cabLen * 0.07);
      const hatchGeo = createSculptedPanelGeo(
        width * 0.68,
        rearH * 0.48,
        0.065,
        10,
        6,
        3,
        0.026,
        (pos, idx, hx) => {
          const nx = THREE.MathUtils.clamp(Math.abs(pos.getX(idx)) / Math.max(0.1, hx), 0, 1);
          pos.setZ(idx, pos.getZ(idx) - 0.022 * Math.cos(nx * Math.PI * 0.5));
        },
      );
      const hatchPanel = new THREE.Mesh(hatchGeo, mats.body);
      hatchPanel.position.set(0, -sculptedCabH - rearH * 0.23, -0.07);
      const hatchLip = new THREE.Mesh(
        createSculptedPanelGeo(width * 0.68, 0.032, 0.12, 8, 2, 4, 0.014, (pos, idx, hx) => {
          const nx = THREE.MathUtils.clamp(Math.abs(pos.getX(idx)) / Math.max(0.1, hx), 0, 1);
          pos.setY(idx, pos.getY(idx) + 0.016 * Math.cos(nx * Math.PI * 0.5));
        }),
        mats.body,
      );
      hatchLip.position.set(0, 0.015, -0.05);
      hatchPivot.add(hatchPanel, hatchLip);
      tagPart(hatchPivot, 'Tampa Traseira Articulada', 0, 0.35, -0.35);
      group.add(hatchPivot);
      registerOpenable(animated, hatchPivot, 'Tampa Traseira', { x: 0.78 });
    }

    // 3. Sealed Side Rocker Sills, Door Jambs, Quarter Flanks & Flush Articulated Doors
    const doorBaseTopY = beltlineY;
    const sillTopY = bodyLift + floorHeight;
    const doorH = Math.max(0.28, doorBaseTopY - sillTopY + 0.01);
    const sideGlassH = isOpenTop ? 0 : Math.max(0, sculptedCabH - 0.05);
    const effectiveRoofTaper = Math.max(
      g.roofTaper,
      isHyper ? 0.44 : isSport ? 0.36 : isLuxury ? 0.32 : isHatch ? 0.32 : 0.28,
    );
    const cabTopHalfX =
      width *
      (1 - effectiveRoofTaper * (isHyper ? 0.48 : isSport ? 0.45 : 0.42)) *
      (isHatch || isAero ? 0.455 : 0.468);
    // Outer door skin is 0.068 thick; setting hingeX at (width*0.495 - 0.034) makes outer face 100% flush with fenders!
    const doorHingeXAbs = width * 0.495 - 0.034;
    const topShift = Math.max(0.025, doorHingeXAbs - cabTopHalfX * 0.98);
    const fStopZ = Math.min(halfL - 0.15, cabFrontZ + 0.06);
    const rStopZ = isHatch
      ? hatchRDoorRearEdgeZ - 0.02
      : Math.max(-halfL + 0.15, cabRearZ - 0.06);
    const fDoorHingeZ = cabFrontZ - 0.02;
    const aPillarTopZ = cabCenterZ + cabLen * 0.5 * (1 - wsRake);
    const cPillarTopZ = cabCenterZ - cabLen * 0.5 * (1 - rRake);
    const frontSlopeInset = Math.max(0.06, fDoorHingeZ - aPillarTopZ + 0.03);

    const rockerH = Math.max(0.08, floorHeight + 0.015);
    const rockerLen = isHatch
      ? Math.max(0.8, frontWheelZ - archR - (rearWheelZ + archR) + 0.08)
      : Math.max(0.8, fStopZ - rStopZ + 0.12);
    const rockerMidZ = isHatch ? (frontWheelZ + rearWheelZ) * 0.5 : (fStopZ + rStopZ) * 0.5;
    const doorAeroCurve =
      !isPickup && aeroTier !== 'offroad'
        ? {
            yMin: bodyLift,
            yMax: Math.max(beltlineY, bodyLift + rearH),
            zMin: -halfL + 0.05,
            zMax: halfL - 0.05,
            sculptOpts: aeroSculptOpts,
            cleanFlank: isHyper || isSport,
          }
        : undefined;

    const addSidePanelGapFiller = (side: -1 | 1, zFront: number, zRear: number, topY: number, label: string) => {
      const span = zFront - zRear;
      if (span <= 0.02) return;
      const panelH = Math.max(0.18, topY - sillTopY + 0.02);
      const panelW = width * 0.11;
      const panelCenterY = sillTopY + panelH * 0.5 - 0.01;
      const panelCenterZ = (zFront + zRear) * 0.5;
      const panelGeo = createSculptedPanelGeo(
        panelW,
        panelH,
        span + 0.02,
        3,
        cityMode ? 4 : 8,
        cityMode ? 3 : 6,
        0.02,
        (pos, idx, hx) => {
          const x = pos.getX(idx);
          const yWorld = panelCenterY + pos.getY(idx);
          const zWorld = panelCenterZ + pos.getZ(idx);
          const tY = THREE.MathUtils.clamp(
            (yWorld - aeroSculptOpts.yMin) / Math.max(0.05, aeroSculptOpts.yMax - aeroSculptOpts.yMin),
            0,
            1,
          );
          if (x * side > -hx * 0.15) {
            pos.setX(
              idx,
              x + side * evalAeroSideOffset(tY, zWorld, -halfL + 0.05, halfL - 0.05, aeroSculptOpts),
            );
          }
        },
      );
      const panel = new THREE.Mesh(panelGeo, mats.body);
      panel.position.set(side * (width * 0.495 - panelW * 0.5), panelCenterY, panelCenterZ);
      tagPart(panel, label, side * 0.35, 0.05, 0);
      group.add(panel);
    };

    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;

      // Finished beveled ExtrudeGeometry rocker sill threshold bar along door bottom
      const sillGeo = isHatch
        ? createRoundedBoxGeo(width * 0.14, rockerH, rockerLen, 0.026, cityMode ? 2 : 4, 10)
        : createSculptedPanelGeo(
            width * 0.14,
            rockerH,
            rockerLen,
            3,
            4,
            cityMode ? 4 : 8,
            0.024,
            (pos, idx, hx, hy) => {
              const x = pos.getX(idx);
              const y = pos.getY(idx);
              const tY = THREE.MathUtils.clamp((y + hy) / Math.max(0.04, hy * 2), 0, 1);
              if (x * side > 0) {
                const rockerUnder = -Math.pow(1 - tY, 1.8) * (aeroSculptOpts.rockerTuck ?? 0.022);
                const pinch = isAero ? -(aeroSculptOpts.waistPinch ?? 0) * 0.65 : 0;
                pos.setX(idx, x + side * (rockerUnder + pinch));
              }
            },
          );
      const sill = new THREE.Mesh(sillGeo, mats.body);
      sill.position.set(side * (width * 0.492 - width * 0.07), bodyLift + rockerH * 0.5, rockerMidZ);
      tagPart(sill, 'Soleira Lateral da Porta', side * 0.38, -0.05, 0);
      group.add(sill);

      // Front cowl jamb cheek sealing space between front fender and door hinge
      addSidePanelGapFiller(side, fStopZ + 0.02, fDoorHingeZ - 0.01, doorBaseTopY, 'Coluna Dianteira Lateral');

      if (isFourDoor) {
        const doorSpan = isHatch
          ? hatchDoorSpanMax
          : Math.max(1.1, fDoorHingeZ - (cabRearZ + 0.06));
        const bGap = 0.032;
        const fDoorLen = (doorSpan - bGap) * (isHatch ? 0.53 : 0.52);
        const rDoorHingeZ = fDoorHingeZ - fDoorLen - bGap;
        const rDoorLen = Math.max(0.48, doorSpan - fDoorLen - bGap);
        const rDoorRearEdgeZ = rDoorHingeZ - rDoorLen;
        const rearSlopeInset = isHatch
          ? 0.02
          : Math.max(0.04, cPillarTopZ - rDoorRearEdgeZ + 0.04);

        // Lower B-pillar jamb post between front & rear doors
        addSidePanelGapFiller(side, fDoorHingeZ - fDoorLen + 0.01, rDoorHingeZ - 0.01, doorBaseTopY, 'Coluna B Lateral');
        // Rear quarter flank sealing space between rear door and rear fender
        if (!isHatch) {
          addSidePanelGapFiller(side, rDoorRearEdgeZ + 0.01, rStopZ - 0.02, Math.max(doorBaseTopY, bodyLift + rearH), 'Lateral Traseira');
        } else {
          // Sculpted rear quarter opera glass + beveled C-pillar sail bridging rear door to 30-deg tailgate
          const sail = createHatchQuarterSail(
            side,
            rDoorRearEdgeZ + 0.02,
            cabRearZ,
            cPillarTopZ,
            beltlineY,
            beltlineY + sculptedCabH,
            width * 0.89 * 0.482,
            cabTopHalfX,
            mats,
            cityMode,
          );
          tagPart(sail, 'Coluna C Esculpida e Vidro Vigia', side * 0.36, 0.12, -0.2);
          group.add(sail);
        }

        const fDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: fDoorHingeZ,
            doorLen: fDoorLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: Math.min(fDoorLen * 0.72, frontSlopeInset),
            glassTopZInsetRear: 0.02,
            topInwardShift: topShift,
            hasMirror: true,
            isScissor: false,
            isRearDoor: false,
            label: side < 0 ? 'Porta Dianteira Esquerda' : 'Porta Dianteira Direita',
            aeroCurve: doorAeroCurve,
          },
          mats,
          animated,
          cityMode,
        );
        group.add(fDoor);

        const rDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: rDoorHingeZ,
            doorLen: rDoorLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: 0.02,
            glassTopZInsetRear: Math.min(rDoorLen * 0.68, rearSlopeInset),
            topInwardShift: topShift,
            hasMirror: false,
            isScissor: false,
            isRearDoor: true,
            label: side < 0 ? 'Porta Traseira Esquerda' : 'Porta Traseira Direita',
            aeroCurve: doorAeroCurve,
          },
          mats,
          animated,
          cityMode,
        );
        group.add(rDoor);
      } else {
        const maxDoorSpan = Math.max(0.85, fDoorHingeZ - (cabRearZ + 0.05));
        const dLen = Math.min(1.52, maxDoorSpan, Math.max(0.95, cabLen * 0.78));
        const doorRearEdgeZ = fDoorHingeZ - dLen;
        const rearSlopeInset = Math.max(0.06, cPillarTopZ - doorRearEdgeZ + 0.04);

        // Rear quarter flank sealing space behind 2-door opening
        addSidePanelGapFiller(side, doorRearEdgeZ + 0.01, rStopZ - 0.02, Math.max(doorBaseTopY, bodyLift + rearH), 'Lateral Traseira (Quarter Panel)');

        const door = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: fDoorHingeZ,
            doorLen: dLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: Math.min(dLen * 0.65, frontSlopeInset),
            glassTopZInsetRear: Math.min(dLen * 0.45, rearSlopeInset),
            topInwardShift: topShift,
            hasMirror: true,
            isScissor: isSupercar,
            isRearDoor: false,
            label: isSupercar
              ? side < 0
                ? 'Porta Tesoura Esquerda'
                : 'Porta Tesoura Direita'
              : side < 0
                ? 'Porta Esquerda'
                : 'Porta Direita',
            aeroCurve: doorAeroCurve,
          },
          mats,
          animated,
          cityMode,
        );
        group.add(door);
      }

      // Mid-engine side air intake scoops + rear quarter flying buttresses for hyper/supercars
      if ((isHyper || isSupercar) && !cityMode) {
        const scoopZ = Math.min(cabRearZ + 0.08, rearWheelZ + archR + 0.24);
        const scoopY = bodyLift + Math.max(floorHeight + 0.12, rearH * 0.62);
        const scoopHousing = new THREE.Mesh(
          createRoundedBoxGeo(0.065, Math.min(0.24, rearH * 0.38), 0.34, 0.016, 2, 8),
          mats.grilleMesh,
        );
        scoopHousing.position.set(side * (width * 0.472), scoopY, scoopZ);
        scoopHousing.rotation.y = side * 0.14;
        const scoopBlade = new THREE.Mesh(
          createRoundedBoxGeo(0.052, Math.min(0.26, rearH * 0.40), 0.16, 0.014, 2, 8),
          mats.body,
        );
        scoopBlade.position.set(side * (width * 0.492), scoopY, scoopZ - 0.10);
        scoopBlade.rotation.y = side * 0.18;
        tagPart(scoopBlade, 'Tomada de Ar Lateral (Side Scoop)', side * 0.42, 0.08, -0.1);
        group.add(scoopHousing, scoopBlade);

        if (!isOpenTop) {
          const buttress = makeBeamBetween(
            new THREE.Vector3(side * (cabTopHalfX * 0.90), beltlineY + sculptedCabH - 0.025, cPillarTopZ),
            new THREE.Vector3(side * (width * 0.35), bodyLift + rearH + 0.015, -halfL + 0.24),
            0.056,
            0.072,
            mats.body,
            new THREE.Vector3(side * 0.4, 0.8, -0.3),
            0.016,
          );
          tagPart(buttress, 'Coluna Aerodinâmica (Flying Buttress)', side * 0.32, 0.28, -0.35);
          group.add(buttress);
        }
      }
    });

    // 4. Fine Panel Gaps (Linhas de Recorte) separating hood, doors, rocker sills, and tailgate
    if (!cityMode) {
      const panelGapsGrp = new THREE.Group();
      const gapT = 0.0055;
      const hoodHalfW = width * 0.302;
      const hoodStartZ = cabFrontZ + 0.02;
      const hoodEndZ = hoodStartZ + hoodSpan;

      // Hood-to-fender angled panel shutlines + front hood lip & rear cowl gap
      [-1, 1].forEach((side) => {
        const hGap = makeBeamBetween(
          new THREE.Vector3(side * hoodHalfW, hoodBackY + 0.012, hoodStartZ),
          new THREE.Vector3(side * hoodHalfW, hoodFrontY + 0.008, hoodEndZ),
          gapT,
          gapT,
          mats.panelGap,
          new THREE.Vector3(0, 1, 0),
          0.001,
        );
        panelGapsGrp.add(hGap);
      });
      const hoodFrontGap = new THREE.Mesh(
        new THREE.BoxGeometry(hoodHalfW * 1.98, gapT, gapT),
        mats.panelGap,
      );
      hoodFrontGap.position.set(0, hoodFrontY + 0.006, hoodEndZ);
      const hoodCowlGap = new THREE.Mesh(
        new THREE.BoxGeometry(hoodHalfW * 2.02, gapT, gapT),
        mats.panelGap,
      );
      hoodCowlGap.position.set(0, hoodBackY + 0.014, hoodStartZ);
      panelGapsGrp.add(hoodFrontGap, hoodCowlGap);

      // Door-to-fender, B-pillar, rear-quarter & rocker-sill shutlines along outer sculpted skin
      const doorSkinX = (yVal: number, zVal: number) => {
        if (doorAeroCurve) {
          const tY = THREE.MathUtils.clamp(
            (yVal - doorAeroCurve.yMin) / Math.max(0.05, doorAeroCurve.yMax - doorAeroCurve.yMin),
            0,
            1,
          );
          return (
            width * 0.495 +
            evalAeroSideOffset(tY, zVal, -halfL + 0.05, halfL - 0.05, aeroSculptOpts) +
            0.003
          );
        }
        const tY = THREE.MathUtils.clamp((yVal - sillTopY) / Math.max(0.1, doorH), 0, 1);
        const belly = Math.sin(tY * Math.PI) * 0.022;
        const lowerTuck = -Math.pow(1 - tY, 2.2) * 0.018;
        const upperLean = -Math.pow(Math.max(0, (tY - 0.52) / 0.48), 1.35) * 0.020;
        return width * 0.495 + belly + lowerTuck + upperLean + 0.003;
      };
      const addVerticalDoorGap = (side: -1 | 1, zLine: number) => {
        const yBot = sillTopY + 0.006;
        const yMid = sillTopY + doorH * 0.52;
        const yTop = doorBaseTopY - 0.006;
        const gLow = makeBeamBetween(
          new THREE.Vector3(side * doorSkinX(yBot, zLine), yBot, zLine),
          new THREE.Vector3(side * doorSkinX(yMid, zLine), yMid, zLine),
          gapT,
          gapT,
          mats.panelGap,
          new THREE.Vector3(side, 0, 0),
          0.001,
        );
        const gHigh = makeBeamBetween(
          new THREE.Vector3(side * doorSkinX(yMid, zLine), yMid, zLine),
          new THREE.Vector3(side * doorSkinX(yTop, zLine), yTop, zLine),
          gapT,
          gapT,
          mats.panelGap,
          new THREE.Vector3(side, 0, 0),
          0.001,
        );
        panelGapsGrp.add(gLow, gHigh);
      };

      [-1, 1].forEach((s) => {
        const side = s as -1 | 1;
        addVerticalDoorGap(side, fDoorHingeZ + 0.002);
        if (isFourDoor) {
          const dSpan = isHatch
            ? hatchDoorSpanMax
            : Math.max(1.1, fDoorHingeZ - (cabRearZ + 0.06));
          const bG = 0.032;
          const fLen = (dSpan - bG) * (isHatch ? 0.53 : 0.52);
          const rHingeZ = fDoorHingeZ - fLen - bG;
          const rLen = Math.max(0.48, dSpan - fLen - bG);
          addVerticalDoorGap(side, fDoorHingeZ - fLen - bG * 0.5);
          addVerticalDoorGap(side, rHingeZ - rLen - 0.002);

          const sillMidZ = fDoorHingeZ - dSpan * 0.5;
          const sillGap = new THREE.Mesh(
            new THREE.BoxGeometry(gapT, gapT, Math.max(0.4, dSpan)),
            mats.panelGap,
          );
          sillGap.position.set(
            side * (doorSkinX(sillTopY + 0.02, sillMidZ) - 0.002),
            sillTopY + 0.004,
            sillMidZ,
          );
          panelGapsGrp.add(sillGap);
        } else {
          const maxDSpan = Math.max(0.85, fDoorHingeZ - (cabRearZ + 0.05));
          const dLen = Math.min(1.52, maxDSpan, Math.max(0.95, cabLen * 0.78));
          addVerticalDoorGap(side, fDoorHingeZ - dLen - 0.002);

          const sillMidZ = fDoorHingeZ - dLen * 0.5;
          const sillGap = new THREE.Mesh(
            new THREE.BoxGeometry(gapT, gapT, Math.max(0.4, dLen)),
            mats.panelGap,
          );
          sillGap.position.set(
            side * (doorSkinX(sillTopY + 0.02, sillMidZ) - 0.002),
            sillTopY + 0.004,
            sillMidZ,
          );
          panelGapsGrp.add(sillGap);
        }
      });

      // Tailgate / trunk lid panel shutlines
      if (!isPickup) {
        const tGapW = width * (isHatch ? 0.326 : 0.298);
        const tTopZ = isHatch ? cabRearZ : cabRearZ - 0.02;
        const tTopY = isHatch ? beltlineY : bodyLift + rearH * 0.96 + 0.012;
        const tBotZ = isHatch ? -halfL + 0.054 : -halfL + 0.075;
        const tBotY = isHatch ? bodyLift + 0.215 : bodyLift + rearH * 0.94;
        [-1, 1].forEach((side) => {
          panelGapsGrp.add(
            makeBeamBetween(
              new THREE.Vector3(side * tGapW, tTopY, tTopZ),
              new THREE.Vector3(side * tGapW, tBotY, tBotZ),
              gapT,
              gapT,
              mats.panelGap,
              new THREE.Vector3(0, 0.5, -0.5),
              0.001,
            ),
          );
        });
        const tailBotGap = new THREE.Mesh(
          new THREE.BoxGeometry(tGapW * 2, gapT, gapT),
          mats.panelGap,
        );
        tailBotGap.position.set(0, tBotY, tBotZ);
        panelGapsGrp.add(tailBotGap);
      }

      tagPart(panelGapsGrp, 'Linhas de Recorte dos Painéis (Panel Gaps)', 0, 0.08, 0);
      group.add(panelGapsGrp);
    }
  } else if (!hasHollowCockpit) {
    // Monster or cityMode lightweight chassis (also sculpted with tumblehome, belly curvature & recessed pickup bed!)
    const solidBedFloorY = bodyLift + Math.max(floorHeight + 0.10, rearH * 0.48);
    const shape = buildSolidSideProfile(
      length,
      bodyLift,
      Math.max(bodyH, minFenderH),
      hoodH,
      rearH,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      !isMonster,
      archCenterY,
      isHatch ? cabRearZ : undefined,
      isPickup ? { cabRearZ: cabRearZ - 0.06, bedFloorY: solidBedFloorY } : undefined,
      aeroTier,
    );
    const bodyGeo = createExtrudedProfile(
      shape,
      width,
      isHatch ? 0.072 : 0.065,
      isHatch ? 0.072 : 0.065,
      cityMode ? (isHatch ? 3 : 2) : 5,
      cityMode ? (isHatch ? 16 : 12) : 24,
      cityMode ? (isHatch ? 3 : 2) : 6,
    );
    sculptSideVolumeVertices(bodyGeo, {
      ...aeroSculptOpts,
      yMax: bodyLift + Math.max(bodyH, hoodH, rearH, minFenderH),
      sideSign: 0,
      halfWidthAtMid: width * 0.5,
      crownDomeY: isPickup ? 0.006 : aeroSculptOpts.crownDomeY ?? 0.022,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
    tagPart(bodyMesh, 'Carroceria Principal Esculpida', 0, 0.15, 0);
    group.add(bodyMesh);

    if (isHatch && !isMonster) {
      [-1, 1].forEach((s) => {
        const side = s as -1 | 1;
        [frontWheelZ, rearWheelZ].forEach((wz) => {
          group.add(
            createBeveledWheelArchAssembly(
              archR,
              bodyLift,
              archCenterY,
              width,
              mats,
              side,
              wz,
              cityMode,
            ),
          );
        });
      });
    }
  }

  if (!isMonster) {
    buildWheelWellLiners(
      group,
      g.wheelRadius,
      g.wheelWidth,
      width,
      frontWheelZ,
      rearWheelZ,
      mats,
      cityMode,
      archCenterY,
      archScale,
    );
  }

  if (isMonster) {
    const subFrame = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.52, 0.2, length * 0.72, 0.04, 2, 8),
      mats.trim,
    );
    subFrame.position.set(0, g.wheelRadius * 0.95, 0);
    tagPart(subFrame, 'Subchassi Tubular Elevado', 0, -0.25, 0);
    group.add(subFrame);
    if (cityMode) {
      [frontWheelZ, rearWheelZ].forEach((wz) => {
        const axle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, width * 1.04, 14),
          mats.trim,
        );
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, g.wheelRadius, wz);
        tagPart(axle, 'Eixo Rígido Reforçado', 0, -0.35, 0);
        group.add(axle);
        [-1, 1].forEach((s) => {
          const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 10), mats.accent);
          shock.position.set(s * width * 0.34, g.wheelRadius + 0.25, wz);
          shock.rotation.z = s * 0.18;
          tagPart(shock, 'Amortecedor Duplo', s * 0.3, -0.15, 0);
          group.add(shock);
        });
      });
    }
  }

  // Cabin / Open-Top Cockpit with Non-Clipping Interior & Unique Per-Car Differentiation
  const interiorStyle = {
    styleId: v.id,
    archetype: g.archetype,
    maxSpeedKmh: v.unitySpec.maxSpeedKmh,
    category: v.category,
  };
  if (isOpenTop) {
    const cockpitGroup = new THREE.Group();
    cockpitGroup.userData.xrayRole = 'interior';
    const interior = buildVisibleInterior(
      cabLen,
      cabH * 0.9,
      width,
      v.unitySpec.seats,
      mats,
      true,
      hasHollowCockpit ? interiorDropY : 0.06,
      cityMode,
      interiorStyle,
      animated,
    );
    interior.position.y = hasHollowCockpit ? -interiorDropY : -0.02;
    cockpitGroup.add(interior);

    const wsZ = cabLen * 0.42;
    const wsTilt = isBuggy ? 0.38 : 0.52;
    const wsH = cabH * 1.05;
    const wsTopZ = wsZ - Math.sin(wsTilt) * wsH * 0.46;
    const wsBotZ = wsZ + Math.sin(wsTilt) * wsH * 0.46;
    const wsTopY = wsH * 0.44 + Math.cos(wsTilt) * wsH * 0.46;
    const wsBotY = wsH * 0.44 - Math.cos(wsTilt) * wsH * 0.46;
    const wsWBot = width * (isBuggy ? 0.68 : 0.82);
    const wsWTop = width * (isBuggy ? 0.62 : 0.76);

    const wsGlass = new THREE.Mesh(
      createTrapezoidGlassGeo(wsWBot, wsWTop, wsH * 0.94, 0.02),
      mats.glass,
    );
    wsGlass.position.set(0, wsH * 0.44, wsZ);
    wsGlass.rotation.x = -wsTilt;
    wsGlass.userData.noShadow = true;
    wsGlass.renderOrder = 2;
    cockpitGroup.add(wsGlass);

    [-1, 1].forEach((side) => {
      const pBot = new THREE.Vector3(side * (wsWBot * 0.51), wsBotY, wsBotZ);
      const pTop = new THREE.Vector3(side * (wsWTop * 0.51), wsTopY, wsTopZ);
      cockpitGroup.add(
        makeBeamBetween(
          pBot,
          pTop,
          0.048,
          0.046,
          mats.body,
          new THREE.Vector3(side * 0.55, 0.25, 0.45),
          0.012,
        ),
      );
      if (isBuggy) {
        const mir = createAerodynamicMirror(side, mats, cityMode);
        mir.position.lerpVectors(pBot, pTop, 0.28);
        tagPart(
          mir,
          side < 0 ? 'Retrovisor Externo Esquerdo' : 'Retrovisor Externo Direito',
          side * 0.42,
          0.12,
          0.08,
        );
        cockpitGroup.add(mir);
      }
    });
    const topRail = new THREE.Mesh(
      createRoundedBoxGeo(wsWTop * 1.06, 0.045, 0.055, 0.015, 2, 8),
      mats.windowTrim,
    );
    topRail.position.set(0, wsTopY, wsTopZ);
    cockpitGroup.add(topRail);

    // Lower black cowl trim + articulated windshield wipers at glass base
    const cowlLip = new THREE.Mesh(
      createRoundedBoxGeo(wsWBot * 0.98, 0.035, 0.075, 0.012, 2, 6),
      mats.windowTrim,
    );
    cowlLip.position.set(0, wsBotY, wsBotZ);
    cockpitGroup.add(cowlLip);
    [-0.16, 0.14].forEach((wx) => {
      const wBase = new THREE.Vector3(wx * width, wsBotY + 0.022, wsBotZ + 0.01);
      const wTip = new THREE.Vector3(wx * width + 0.25, wsBotY + 0.048, wsBotZ - 0.016);
      const wBoss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.013, 0.016, 8),
        mats.windowTrim,
      );
      wBoss.position.copy(wBase);
      const wArm = makeBeamBetween(
        wBase,
        wTip,
        0.009,
        0.008,
        mats.windowTrim,
        new THREE.Vector3(0, 0.3, 0.9),
        0.002,
      );
      const wBlade = makeBeamBetween(
        new THREE.Vector3(wx * width + 0.08, wsBotY + 0.034, wsBotZ - 0.005),
        new THREE.Vector3(wx * width + 0.31, wsBotY + 0.056, wsBotZ - 0.024),
        0.008,
        0.012,
        mats.grille,
        new THREE.Vector3(0, 0.3, 0.9),
        0.002,
      );
      cockpitGroup.add(wBoss, wArm, wBlade);
    });

    // Attached Interior Rear-View Mirror with Chrome Stem anchored directly onto topRail (ZERO floating!)
    const mirStem = makeStrutBetween(
      new THREE.Vector3(0, wsTopY - 0.01, wsTopZ),
      new THREE.Vector3(0, wsTopY - 0.055, wsTopZ - 0.02),
      0.008,
      0.008,
      mats.chrome,
      8,
    );
    const rvMirror = new THREE.Mesh(
      createRoundedBoxGeo(0.18, 0.046, 0.028, 0.01, 2, 8),
      mats.grille,
    );
    rvMirror.position.set(0, wsTopY - 0.06, wsTopZ - 0.025);
    cockpitGroup.add(mirStem, rvMirror);

    if (!isBuggy) {
      const tonneau = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.86, 0.09, cabLen * 0.24, 0.03, 2, 8),
        mats.secondary,
      );
      tonneau.position.set(0, 0.05, -cabLen * 0.42);
      cockpitGroup.add(tonneau);

      // Unique per-car open-top deck styling (VHC-57 speedster humps vs VHC-52/VHC-67 pleated convertible boot!)
      if (g.archetype === 'roadster' || g.attachments.includes('twin_rollbar')) {
        [-1, 1].forEach((side) => {
          const hump = new THREE.Mesh(
            createRoundedBoxGeo(width * 0.24, 0.12, cabLen * 0.26, 0.045, 3, 10),
            mats.body,
          );
          hump.position.set(side * (width * 0.24), 0.11, -cabLen * 0.40);
          cockpitGroup.add(hump);
        });
      } else {
        // Pleated convertible soft-top boot cover with chrome retaining strip (VHC-52 / VHC-67)
        const bootRoll = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.84, 0.065, cabLen * 0.18, 0.028, 3, 10),
          mats.secondary,
        );
        bootRoll.position.set(0, 0.095, -cabLen * 0.41);
        const bootTrim = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.82, 0.018, 0.024),
          mats.chrome,
        );
        bootTrim.position.set(0, 0.128, -cabLen * 0.48);
        cockpitGroup.add(bootRoll, bootTrim);
      }
    }

    cockpitGroup.position.set(0, beltlineY + 0.02, cabCenterZ);
    tagPart(cockpitGroup, isBuggy ? 'Cockpit Tubular Buggy Aberto' : 'Cabine Conversível com Interior Visível', 0, 0.35, 0);
    group.add(cockpitGroup);
  } else {
    const cab = buildSculptedCabin(
      cabLen,
      sculptedCabH,
      width,
      g.roofTaper,
      wsRake,
      rRake,
      mats,
      g.attachments.includes('panoramic_roof'),
      v.unitySpec.seats,
      hasHollowCockpit ? interiorDropY : 0.06,
      cityMode,
      hasHollowCockpit, // Doors carry their own moving window glass when hollowed!
      undefined,
      interiorStyle,
      animated,
      { roundedRoof: isHatch, aeroTier },
    );
    cab.position.set(0, beltlineY, cabCenterZ);
    tagPart(cab, 'Cabine com Vidros Aparentes e Interior 3D', 0, 0.48, 0);
    group.add(cab);
  }

  if (isPickup) {
    buildPickupBedAssembly(
      group,
      width,
      length,
      bodyLift,
      floorHeight,
      rearH,
      cabRearZ,
      rearWheelZ,
      archR,
      archCenterY,
      mats,
      animated,
      hasHollowCockpit,
      isMonster,
      cityMode,
    );
  }

  const wheelY = g.wheelRadius;
  const wheelX = width * (isMonster ? 0.56 : 0.46);
  const frontSteerPivots: { left?: THREE.Group; right?: THREE.Group } = {};
  [
    { z: frontWheelZ, label: 'Roda Dianteira', isFront: true },
    { z: rearWheelZ, label: 'Roda Traseira', isFront: false },
  ].forEach((axle) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(
        g.wheelRadius,
        g.wheelWidth,
        wheelStyle,
        mats,
        side > 0,
        false,
        cityMode,
      );
      if (axle.isFront) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * wheelX, wheelY, axle.z);
        steerPivot.add(w);
        tagPart(steerPivot, `${axle.label} ${side < 0 ? 'Esquerda' : 'Direita'}`, side * 0.48, -0.05, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
        if (side < 0) frontSteerPivots.left = steerPivot;
        else frontSteerPivots.right = steerPivot;
      } else {
        w.position.set(side * wheelX, wheelY, axle.z);
        tagPart(w, `${axle.label} ${side < 0 ? 'Esquerda' : 'Direita'}`, side * 0.48, -0.05, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  addDetailedMechanicalChassis({
    group,
    v,
    mats,
    animated,
    frontWheelZ,
    rearWheelZ,
    wheelX,
    wheelY,
    wheelRadius: g.wheelRadius,
    wheelWidth: g.wheelWidth,
    maxTopY:
      isBuggy || isMonster
        ? wheelY + g.wheelRadius * 1.08
        : isOffroadArch
          ? Math.min(bodyLift + hoodH * 0.94, wheelY + g.wheelRadius * 1.12)
          : Math.min(bodyLift + hoodH * 0.92, wheelY + g.wheelRadius * 0.72),
    frontSteerPivots,
    layout: isBuggy ? 'buggy' : isMonster ? 'monster' : isSupercar ? 'supercar' : 'standard',
    cityMode,
  });

  const skirtLen = Math.max(0.8, wheelbase - g.wheelRadius * 2.3);
  const skirtMidZ = (frontWheelZ + rearWheelZ) * 0.5;
  [-1, 1].forEach((side) => {
    if (isHyper || isSport) {
      const skirtBladeGeo = createSculptedPanelGeo(
        0.092,
        0.036,
        skirtLen * 1.04,
        3,
        2,
        cityMode ? 4 : 8,
        0.010,
        (pos, idx, hx, _hy, hz) => {
          const tz = THREE.MathUtils.clamp(pos.getZ(idx) / Math.max(0.1, hz), -1, 1);
          const sweepOut = side * (0.018 * Math.pow(Math.abs(tz), 1.4));
          pos.setX(idx, pos.getX(idx) + sweepOut);
          if (Math.abs(pos.getX(idx)) > hx * 0.4 && tz < -0.55) {
            pos.setY(idx, pos.getY(idx) + 0.032 * Math.pow((-0.55 - tz) / 0.45, 1.4));
          }
        },
      );
      const skirt = new THREE.Mesh(skirtBladeGeo, mats.trim);
      skirt.position.set(side * (width * 0.478), bodyLift + 0.018, skirtMidZ);
      tagPart(skirt, 'Saia Lateral Aerodinâmica com Winglet', side * 0.42, -0.1, 0);
      group.add(skirt);
    } else {
      const skirt = new THREE.Mesh(
        createRoundedBoxGeo(isLuxury ? 0.068 : 0.056, isLuxury ? 0.046 : 0.058, skirtLen, 0.018, 2, 6),
        mats.trim,
      );
      skirt.position.set(side * (width * 0.478), bodyLift + 0.030, skirtMidZ);
      if (isLuxury && !cityMode) {
        const chromeInlay = new THREE.Mesh(
          new THREE.BoxGeometry(0.014, 0.014, skirtLen * 0.92),
          mats.chrome,
        );
        chromeInlay.position.set(side * (width * 0.506), bodyLift + 0.034, skirtMidZ);
        group.add(chromeInlay);
      }
      tagPart(skirt, 'Saia Lateral / Estribo', side * 0.42, -0.1, 0);
      group.add(skirt);
    }
  });

  addCarBodyDetailsAndLivery(
    group,
    v,
    mats,
    bodyLift,
    bodyH,
    hoodH,
    rearH,
    beltlineY + sculptedCabH,
    cabCenterZ,
    cabLen,
    livery,
    hasHollowCockpit,
  );
  addFrontAndRearFascias(
    group,
    length,
    width,
    bodyLift,
    hoodH,
    rearH,
    mats,
    g.attachments,
    g.archetype,
    !hasHollowCockpit && !isBuggy,
    cityMode,
    animated,
    aeroTier,
  );
  addExhaustSystem(group, width, halfL, bodyLift, mats, exhaustStyle);
  addVehicleAttachments(
    group,
    v,
    mats,
    beltlineY + sculptedCabH,
    bodyLift + rearH,
    bodyLift + hoodH,
    animated,
    aeroTier,
    archCenterY,
  );
  enableShadows(group);
  return group;
}
