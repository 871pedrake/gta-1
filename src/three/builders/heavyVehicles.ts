import * as THREE from 'three';
import { ExhaustStyle, VehicleConcept, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createEngineBayAssembly,
  createExtrudedProfile,
  createHeadlightBeamMesh,
  createRoundedBoxGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagPart,
} from './types';
import {
  buildHeavyCabinInterior,
  buildWheelWellLiners,
  createCraftedWheel,
  createSideDoorGroup,
  createTrapezoidGlassGeo,
} from './wheelsAndInterior';

// =========================================================================
// SHARED HEAVY VEHICLE HELPERS (MIRRORS, DRIVETRAIN, FENDERS, FASCIAS)
// =========================================================================

function createTruckDualMirror(side: -1 | 1, mats: VehicleMaterialSet, cityMode: boolean): THREE.Group {
  const grp = new THREE.Group();
  const seg = cityMode ? 6 : 12;

  grp.add(
    makeStrutBetween(
      new THREE.Vector3(0, 0.24, 0),
      new THREE.Vector3(side * 0.17, 0.28, 0.04),
      0.015,
      0.015,
      mats.chrome,
      seg,
    ),
  );
  grp.add(
    makeStrutBetween(
      new THREE.Vector3(0, -0.18, 0),
      new THREE.Vector3(side * 0.17, -0.16, 0.04),
      0.015,
      0.015,
      mats.chrome,
      seg,
    ),
  );
  grp.add(
    makeStrutBetween(
      new THREE.Vector3(side * 0.17, -0.18, 0.04),
      new THREE.Vector3(side * 0.17, 0.30, 0.04),
      0.016,
      0.016,
      mats.chrome,
      seg,
    ),
  );

  const mainBody = new THREE.Mesh(
    createRoundedBoxGeo(0.11, 0.31, 0.075, 0.02, 2, seg),
    mats.trim,
  );
  mainBody.position.set(side * 0.19, 0.11, 0.04);
  grp.add(mainBody);

  const mainGlass = new THREE.Mesh(
    createRoundedBoxGeo(0.09, 0.27, 0.014, 0.01, 2, seg),
    mats.mirrorGlass,
  );
  mainGlass.position.set(side * 0.19, 0.11, 0.001);
  grp.add(mainGlass);

  const spotBody = new THREE.Mesh(
    createRoundedBoxGeo(0.10, 0.11, 0.068, 0.02, 2, seg),
    mats.trim,
  );
  spotBody.position.set(side * 0.19, -0.11, 0.04);
  grp.add(spotBody);

  const spotGlass = new THREE.Mesh(
    createRoundedBoxGeo(0.08, 0.085, 0.014, 0.01, 2, seg),
    mats.mirrorGlass,
  );
  spotGlass.position.set(side * 0.19, -0.11, 0.003);
  grp.add(spotGlass);

  return grp;
}

function addChassisDrivetrain(
  group: THREE.Group,
  width: number,
  frameY: number,
  frontAxleZ: number,
  rearAxleZ: number,
  mats: VehicleMaterialSet,
  cityMode: boolean,
) {
  if (cityMode) return;
  const span = Math.max(0.8, frontAxleZ - rearAxleZ);
  const midZ = (frontAxleZ + rearAxleZ) * 0.5;

  // Center driveshaft + universal joints
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, span * 0.86, 10), mats.alloy);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, frameY - 0.12, midZ);
  group.add(shaft);

  // Rear differential pumpkin + axle tube
  const diff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mats.trim);
  diff.position.set(0, frameY - 0.14, rearAxleZ);
  const axleTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, width * 0.84, 12),
    mats.trim,
  );
  axleTube.rotation.z = Math.PI / 2;
  axleTube.position.set(0, frameY - 0.14, rearAxleZ);
  group.add(diff, axleTube);

  // Twin pneumatic air brake tanks + battery box
  [-1, 1].forEach((side) => {
    const airTank = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.56, 12), mats.trim);
    airTank.rotation.x = Math.PI / 2;
    airTank.position.set(side * (width * 0.24), frameY - 0.12, midZ + 0.18);
    group.add(airTank);

    const leafPack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.96), mats.trim);
    leafPack.position.set(side * (width * 0.28), frameY - 0.08, rearAxleZ);
    group.add(leafPack);
  });
}

function addHeavyBumperAndLights(
  group: THREE.Group,
  width: number,
  groundClearance: number,
  frontZ: number,
  rearZ: number,
  mats: VehicleMaterialSet,
  useChrome: boolean,
  isSchoolBus = false,
  isArmored = false,
  grilleCenterY?: number,
  animated?: BuiltVehicle['animatedParts'],
) {
  const bumperMat = isArmored ? mats.trim : useChrome ? mats.chrome : mats.secondary;

  // Multi-tier sculpted heavy front bumper + center step recess + tow shackles
  const fBump = new THREE.Mesh(
    createRoundedBoxGeo(width * 1.02, 0.25, 0.19, 0.04, 3, 12),
    bumperMat,
  );
  fBump.position.set(0, groundClearance + 0.10, frontZ + 0.055);
  tagPart(fBump, 'Para-choque Dianteiro Pesado', 0, -0.1, 0.55);
  group.add(fBump);

  const lowerValance = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.94, 0.08, 0.14, 0.02, 2, 8),
    mats.trim,
  );
  lowerValance.position.set(0, groundClearance - 0.01, frontZ + 0.04);
  group.add(lowerValance);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.02), mats.liveryStripe);
  plate.position.set(0, groundClearance + 0.10, frontZ + 0.155);
  group.add(plate);

  // Twin front tow shackles
  [-width * 0.24, width * 0.24].forEach((tx) => {
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 8, 12), mats.chrome);
    shackle.position.set(tx, groundClearance + 0.06, frontZ + 0.145);
    group.add(shackle);
  });

  // Framed multi-slat grille + recessed radiator + emblem bar
  const grilleW = width * 0.50;
  const grilleH = isSchoolBus ? 0.38 : 0.40;
  const grilleY = grilleCenterY ?? groundClearance + (isSchoolBus ? 0.58 : 0.46);

  const grilleFrame = new THREE.Mesh(
    createRoundedBoxGeo(grilleW + 0.06, grilleH + 0.06, 0.055, 0.02, 2, 8),
    useChrome ? mats.chrome : mats.trim,
  );
  grilleFrame.position.set(0, grilleY, frontZ + 0.008);
  group.add(grilleFrame);

  const grilleBack = new THREE.Mesh(
    createRoundedBoxGeo(grilleW, grilleH, 0.06, 0.02, 2, 8),
    mats.grille,
  );
  grilleBack.position.set(0, grilleY, frontZ + 0.015);
  tagPart(grilleBack, 'Grade Dianteira Ventilada', 0, 0, 0.5);
  group.add(grilleBack);

  const slatCount = 5;
  for (let i = 0; i < slatCount; i++) {
    const sy = grilleY - grilleH * 0.34 + (i / (slatCount - 1)) * (grilleH * 0.68);
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(grilleW * 0.92, 0.024, 0.072),
      useChrome ? mats.chrome : mats.alloy,
    );
    slat.position.set(0, sy, frontZ + 0.018);
    group.add(slat);
  }
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.045, grilleH * 0.92, 0.074), mats.trim);
  vBar.position.set(0, grilleY, frontZ + 0.02);
  group.add(vBar);

  if (!isSchoolBus) {
    const emblemRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.022, 18),
      mats.chrome,
    );
    emblemRing.rotation.x = Math.PI / 2;
    emblemRing.position.set(0, grilleY + grilleH * 0.12, frontZ + 0.056);
    const emblemDot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.026, 16),
      isArmored ? mats.trim : mats.accent,
    );
    emblemDot.rotation.x = Math.PI / 2;
    emblemDot.position.set(0, grilleY + grilleH * 0.12, frontZ + 0.058);
    group.add(emblemRing, emblemDot);
  }

  [-1, 1].forEach((side) => {
    const sigMat = side < 0 ? mats.signalLeft : mats.signalRight;
    const hlGroup = new THREE.Group();
    const bezel = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.19, 0.18, 0.06, 0.02, 2, 8),
      mats.grille,
    );
    hlGroup.add(bezel);
    if (isSchoolBus) {
      const roundHl = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.075, 16), mats.headlight);
      roundHl.rotation.x = Math.PI / 2;
      roundHl.position.x = -side * 0.04;
      hlGroup.add(roundHl);
      const amber = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.075, 12), sigMat);
      amber.rotation.x = Math.PI / 2;
      amber.position.x = side * 0.095;
      hlGroup.add(amber);
    } else {
      const lamp = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.15, 0.11, 0.075, 0.018, 2, 8),
        mats.headlight,
      );
      lamp.position.y = 0.022;
      hlGroup.add(lamp);
      const turn = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.15, 0.048, 0.078, 0.01, 2, 6),
        sigMat,
      );
      turn.position.y = -0.056;
      hlGroup.add(turn);
      const sideAmber = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.078), sigMat);
      sideAmber.position.set(side * (width * 0.088), 0, -0.01);
      hlGroup.add(sideAmber);
    }
    if (isArmored) {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(width * 0.19, 0.02, 0.09), mats.trim);
      guard.position.z = 0.01;
      hlGroup.add(guard);
    }
    hlGroup.position.set(side * (width * 0.375), grilleY - 0.02, frontZ + 0.016);
    tagPart(hlGroup, side < 0 ? 'Farol Dianteiro Esquerdo' : 'Farol Dianteiro Direito', side * 0.25, 0, 0.45);
    group.add(hlGroup);

    const beam = createHeadlightBeamMesh(5.2, 0.95, 0.09);
    beam.position.set(side * (width * 0.375), grilleY - 0.02, frontZ + 0.06);
    group.add(beam);
    animated?.headlightBeams.push(beam);

    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 12), mats.headlight);
    fog.rotation.x = Math.PI / 2;
    fog.position.set(side * (width * 0.36), groundClearance + 0.09, frontZ + 0.135);
    group.add(fog);

    const tlGrp = new THREE.Group();
    const tlFrame = new THREE.Mesh(createRoundedBoxGeo(0.14, 0.38, 0.05, 0.02, 2, 6), mats.grille);
    tlGrp.add(tlFrame);
    const tlRed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.15, 0.062), mats.taillight);
    tlRed.position.y = 0.085;
    const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.085, 0.062), sigMat);
    tlAmber.position.y = -0.035;
    const tlRev = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.065, 0.062), mats.headlight);
    tlRev.position.y = -0.125;
    tlGrp.add(tlRed, tlAmber, tlRev);
    tlGrp.position.set(side * (width * 0.42), groundClearance + 0.46, rearZ - 0.015);
    tagPart(tlGrp, side < 0 ? 'Lanterna Traseira Esquerda' : 'Lanterna Traseira Direita', side * 0.25, 0, -0.45);
    group.add(tlGrp);
  });

  const rBump = new THREE.Mesh(
    createRoundedBoxGeo(width * 1.0, 0.19, 0.15, 0.03, 2, 8),
    bumperMat,
  );
  rBump.position.set(0, groundClearance + 0.08, rearZ - 0.045);
  tagPart(rBump, 'Para-choque Traseiro Pesado', 0, -0.1, -0.55);
  group.add(rBump);

  // Reflective safety chevron bar on rear bumper
  const safetyBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.045, 0.02), mats.amberSignal);
  safetyBar.position.set(0, groundClearance + 0.08, rearZ - 0.12);
  group.add(safetyBar);

  const rPlate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.02), mats.liveryStripe);
  rPlate.position.set(0, groundClearance + 0.28, rearZ - 0.02);
  group.add(rPlate);
}

function addDualRearFendersAndMudflaps(
  group: THREE.Group,
  width: number,
  wheelRadius: number,
  axleZs: number[],
  mats: VehicleMaterialSet,
  cityMode: boolean,
) {
  const seg = cityMode ? 10 : 20;
  axleZs.forEach((az) => {
    [-1, 1].forEach((side) => {
      const fenderGeo = new THREE.CylinderGeometry(
        wheelRadius * 1.16,
        wheelRadius * 1.16,
        0.58,
        seg,
        1,
        true,
        0,
        Math.PI,
      );
      fenderGeo.rotateZ(Math.PI / 2);
      fenderGeo.rotateX(-Math.PI / 2);
      const fender = new THREE.Mesh(fenderGeo, mats.trim);
      fender.position.set(side * (width * 0.40), wheelRadius * 1.04, az);
      group.add(fender);

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.06), mats.alloy);
      bracket.position.set(side * (width * 0.36), wheelRadius * 0.96, az - wheelRadius * 1.14);
      group.add(bracket);
    });
  });
  const lastZ = axleZs[axleZs.length - 1];
  [-1, 1].forEach((side) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.54, wheelRadius * 0.65, 0.03), mats.rubber);
    flap.position.set(side * (width * 0.40), wheelRadius * 0.46, lastZ - wheelRadius * 1.12);
    group.add(flap);
  });
}

function addBusAndTruckExhaust(
  group: THREE.Group,
  width: number,
  rearZ: number,
  groundClearance: number,
  mats: VehicleMaterialSet,
  style: ExhaustStyle,
) {
  if (style === 'none') return;
  const sideCount = style === 'dual' || style === 'quad' ? [-1, 1] : [-1];
  sideCount.forEach((s) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.28, 14), mats.chrome);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(s * (width * 0.34), groundClearance + 0.04, rearZ - 0.06);
    group.add(pipe);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.29, 12), mats.exhaustBore);
    bore.rotation.x = Math.PI / 2;
    bore.position.copy(pipe.position);
    group.add(bore);
  });
}

// =========================================================================
// 1. TRANSIT BUS, ARTICULATED BRT & SCHOOL BUS BUILDER
// =========================================================================
function buildTransitBusModule(
  modLen: number,
  width: number,
  height: number,
  groundClearance: number,
  wheelZs: number[],
  wheelRadius: number,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  options: {
    hasFrontEnd: boolean;
    hasRearEnd: boolean;
    hasDestinationSign: boolean;
    hasBoardingDoors: boolean;
    doorPositionsZ: number[];
    labelPrefix: string;
    cityMode: boolean;
    acCount: number;
  },
): THREE.Group {
  const mod = new THREE.Group();
  const hl = modLen * 0.5;
  const totalBodyH = height - groundClearance;
  const beltY = groundClearance + totalBodyH * 0.42;
  const roofY = height - 0.14;
  const windowH = Math.max(0.55, roofY - beltY);
  const archR = wheelRadius * 1.15;

  const floorTopY = groundClearance + 0.25;

  // 1. Hollowed Bus Floor Chassis Pan + Side Lower Skirts (leaves interior 100% open above floorTopY!)
  const lowerShape = new THREE.Shape();
  lowerShape.moveTo(-hl + 0.08, groundClearance);
  const sortedWheels = [...wheelZs].sort((a, b) => a - b);
  let cursor = -hl + 0.12;
  for (const wz of sortedWheels) {
    const wStart = Math.max(cursor + 0.04, wz - archR);
    const wEnd = Math.min(hl - 0.12, wz + archR);
    lowerShape.lineTo(wStart, groundClearance);
    lowerShape.absarc(wz, groundClearance + archR * 0.14, archR, Math.PI, 0, true);
    lowerShape.lineTo(wEnd, groundClearance);
    cursor = wEnd;
  }
  lowerShape.lineTo(hl - 0.06, groundClearance + 0.05);
  lowerShape.lineTo(options.hasFrontEnd ? hl - 0.055 : hl, floorTopY);
  lowerShape.lineTo(-hl, floorTopY);
  lowerShape.lineTo(-hl + 0.04, groundClearance + 0.05);
  lowerShape.closePath();

  const lowerGeo = createExtrudedProfile(
    lowerShape,
    width * 0.66,
    0.03,
    0.03,
    options.cityMode ? 2 : 4,
    options.cityMode ? 10 : 16,
  );
  const lowerMesh = new THREE.Mesh(lowerGeo, mats.body);
  tagPart(lowerMesh, `${options.labelPrefix} — Assoalho e Chassi`, 0, 0, 0);
  mod.add(lowerMesh);

  // Lower outer side body walls (groundClearance+0.04 .. beltY) sculpted with real semicircular wheel-arch cutouts & boarding door stepwells
  const frontTopZ = options.hasFrontEnd ? hl - 0.16 : hl - 0.02;
  const rearTopZ = options.hasRearEnd ? -hl + 0.10 : -hl + 0.02;
  const bayCount = Math.max(3, Math.round(modLen / 1.45));
  const spanZ = frontTopZ - 0.14 - (rearTopZ + 0.18);
  const bayLen = spanZ / bayCount;
  const doorBayIndices = new Set<number>();
  if (options.hasBoardingDoors) {
    for (const dz of options.doorPositionsZ) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let b = 0; b < bayCount; b++) {
        const bc = rearTopZ + 0.18 + (b + 0.5) * bayLen;
        const d = Math.abs(dz - bc);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = b;
        }
      }
      if (bestDist < bayLen * 0.95) doorBayIndices.add(bestIdx);
    }
  }
  const doorBayCenters = Array.from(doorBayIndices)
    .sort((a, b) => a - b)
    .map((b) => rearTopZ + 0.18 + (b + 0.5) * bayLen);

  const doorCutHalf = bayLen * 0.45;
  const doorRanges =
    options.hasBoardingDoors && !options.cityMode
      ? doorBayCenters.map((dbc) => [dbc - doorCutHalf, dbc + doorCutHalf] as const)
      : [];

  const skirtBotY = groundClearance + 0.05;
  const skirtTopY = beltY + 0.015;
  const archCutR = archR * 1.02;
  const archDy = THREE.MathUtils.clamp(wheelRadius - skirtBotY, 0, archCutR * 0.92);
  const archHalfSpan = Math.sqrt(Math.max(0.01, archCutR * archCutR - archDy * archDy));
  const archAngStart = Math.PI + Math.asin(archDy / archCutR);
  const archAngEnd = -Math.asin(archDy / archCutR);

  const buildSculptedSkirtSegment = (zStart: number, zEnd: number, side: -1 | 1) => {
    if (zEnd - zStart < 0.12) return;
    const s = new THREE.Shape();
    let startedOnLeftArch = false;
    for (const wz of sortedWheels) {
      const a0 = wz - archHalfSpan;
      const a1 = wz + archHalfSpan;
      if (a0 < zStart && a1 > zStart + 0.02) {
        const dz0 = THREE.MathUtils.clamp(zStart - wz, -archCutR * 0.96, archCutR * 0.96);
        const startY = Math.max(skirtBotY, wheelRadius + Math.sqrt(Math.max(0.01, archCutR * archCutR - dz0 * dz0)));
        s.moveTo(zStart, startY);
        startedOnLeftArch = true;
        break;
      }
    }
    if (!startedOnLeftArch) {
      s.moveTo(zStart, skirtBotY);
    }

    let endedOnRightArch = false;
    for (const wz of sortedWheels) {
      const a0 = wz - archHalfSpan;
      const a1 = wz + archHalfSpan;
      if (a1 <= zStart + 0.04 || a0 >= zEnd - 0.04) continue;

      const startOnSegment = a0 >= zStart;
      if (startOnSegment) {
        s.lineTo(a0, skirtBotY);
      }
      const clampZ0 = Math.max(zStart, a0);
      const clampZ1 = Math.min(zEnd, a1);
      const y0 = startOnSegment
        ? skirtBotY
        : wheelRadius + Math.sqrt(Math.max(0.01, archCutR * archCutR - Math.pow(clampZ0 - wz, 2)));
      const y1 =
        a1 <= zEnd
          ? skirtBotY
          : wheelRadius + Math.sqrt(Math.max(0.01, archCutR * archCutR - Math.pow(clampZ1 - wz, 2)));

      const aStart = startOnSegment ? archAngStart : Math.atan2(y0 - wheelRadius, clampZ0 - wz);
      const aEnd = a1 <= zEnd ? archAngEnd : Math.atan2(y1 - wheelRadius, clampZ1 - wz);
      s.absarc(wz, wheelRadius, archCutR, aStart, aEnd, true);

      if (a1 <= zEnd) {
        s.lineTo(a1, skirtBotY);
      } else {
        endedOnRightArch = true;
      }
    }

    if (!endedOnRightArch) {
      s.lineTo(zEnd, skirtBotY);
    }
    s.lineTo(zEnd, skirtTopY);
    s.lineTo(zStart, skirtTopY);
    s.closePath();

    const geo = createExtrudedProfile(s, 0.052, 0.012, 0.012, 2, options.cityMode ? 10 : 18);
    const mesh = new THREE.Mesh(geo, mats.body);
    mesh.position.x = side * (width * 0.468);
    mod.add(mesh);
  };

  buildSculptedSkirtSegment(-hl + 0.06, hl - 0.06, -1);

  let rCursor = -hl + 0.06;
  const rEnd = hl - 0.06;
  for (const [d0, d1] of doorRanges) {
    const segEnd = Math.min(rEnd, d0);
    buildSculptedSkirtSegment(rCursor, segEnd, 1);
    rCursor = Math.max(rCursor, d1);
  }
  buildSculptedSkirtSegment(rCursor, rEnd, 1);

  // Dark inner wheel-well arch baffles flanking each tire (completely outboard of main floor, zero tire clipping!)
  const archLinerGeo = new THREE.CylinderGeometry(
    archR * 1.01,
    archR * 1.01,
    width * 0.145,
    options.cityMode ? 12 : 20,
    1,
    true,
    0,
    Math.PI,
  );
  archLinerGeo.rotateZ(Math.PI / 2);
  archLinerGeo.rotateX(-Math.PI / 2);
  sortedWheels.forEach((wz) => {
    [-1, 1].forEach((side) => {
      const liner = new THREE.Mesh(archLinerGeo, mats.grille);
      liner.position.set(side * (width * 0.402), wheelRadius, wz);
      mod.add(liner);
    });
  });

  if (options.hasFrontEnd) {
    const frontMask = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.94, beltY - groundClearance - 0.12, 0.18, 0.03, 2, 8),
      mats.body,
    );
    frontMask.position.set(0, groundClearance + 0.12 + (beltY - groundClearance - 0.12) * 0.5, hl - 0.11);
    mod.add(frontMask);
  }
  if (options.hasRearEnd) {
    const rearBulk = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.94, beltY - groundClearance - 0.12, 0.36, 0.03, 2, 8),
      mats.body,
    );
    rearBulk.position.set(0, groundClearance + 0.12 + (beltY - groundClearance - 0.12) * 0.5, -hl + 0.20);
    mod.add(rearBulk);
  }

  // Wheel-arch flare moldings + lower black rub-rails + contrast belt stripe (avoiding wheel cutouts)
  sortedWheels.forEach((wz) => {
    [-1, 1].forEach((side) => {
      const archFlare = new THREE.Mesh(
        new THREE.TorusGeometry(archCutR * 1.01, 0.036, 8, 20, Math.PI),
        mats.trim,
      );
      archFlare.rotation.y = Math.PI / 2;
      archFlare.position.set(side * (width * 0.496), wheelRadius, wz);
      mod.add(archFlare);
    });
  });

  // Outer side contrast belt stripes & rub-rails (strictly outer skin only, split cleanly around door cutouts!)
  const addSegmentedSideStrip = (
    side: -1 | 1,
    stripX: number,
    stripY: number,
    stripW: number,
    stripH: number,
    zStart: number,
    zEnd: number,
    mat: THREE.Material,
    skipWheelArches = false,
  ) => {
    const rawGaps: Array<readonly [number, number]> = [];
    if (side > 0) {
      for (const dr of doorRanges) rawGaps.push(dr);
    }
    if (skipWheelArches) {
      for (const wz of sortedWheels) {
        rawGaps.push([wz - archHalfSpan - 0.04, wz + archHalfSpan + 0.04]);
      }
    }
    rawGaps.sort((a, b) => a[0] - b[0]);

    let zCur = zStart;
    for (const [d0, d1] of rawGaps) {
      const segEnd = Math.min(zEnd, d0);
      if (segEnd - zCur > 0.08) {
        const seg = new THREE.Mesh(
          new THREE.BoxGeometry(stripW, stripH, segEnd - zCur),
          mat,
        );
        seg.position.set(stripX, stripY, (zCur + segEnd) * 0.5);
        mod.add(seg);
      }
      zCur = Math.max(zCur, d1);
    }
    if (zEnd - zCur > 0.08) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(stripW, stripH, zEnd - zCur),
        mat,
      );
      seg.position.set(stripX, stripY, (zCur + zEnd) * 0.5);
      mod.add(seg);
    }
  };

  if (options.hasFrontEnd) {
    const frontBelt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, 0.15, 0.03),
      mats.secondary,
    );
    frontBelt.position.set(0, beltY - 0.13, hl - 0.025);
    mod.add(frontBelt);
  }
  if (options.hasRearEnd) {
    const rearBelt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.96, 0.15, 0.03),
      mats.secondary,
    );
    rearBelt.position.set(0, beltY - 0.13, -hl + 0.025);
    mod.add(rearBelt);
  }

  [-1, 1].forEach((s) => {
    const side = s as -1 | 1;
    addSegmentedSideStrip(
      side,
      side * (width * 0.496),
      beltY - 0.13,
      0.026,
      0.15,
      -hl + 0.06,
      hl - 0.06,
      mats.secondary,
      false,
    );
    addSegmentedSideStrip(
      side,
      side * (width * 0.502),
      groundClearance + 0.24,
      0.032,
      0.065,
      -hl + 0.12,
      hl - 0.12,
      mats.trim,
      true,
    );

    // Side amber marker lamps along beltline (skipping open boarding door cutouts)
    if (!options.cityMode) {
      for (let m = -2; m <= 2; m++) {
        const mz = m * (modLen * 0.20);
        if (side > 0 && doorRanges.some(([d0, d1]) => mz >= d0 - 0.06 && mz <= d1 + 0.06)) {
          continue;
        }
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.09), mats.amberSignal);
        marker.position.set(side * (width * 0.504), beltY - 0.24, mz);
        mod.add(marker);
      }
    }
  });

  // 2. Curved Beveled Roof Shell seated cleanly ABOVE roofY (zero downward overlap into ceiling/windshield!)
  const roofLen = frontTopZ - rearTopZ;
  const roofCenterZ = (frontTopZ + rearTopZ) * 0.5;

  const roofShape = new THREE.Shape();
  const rHalf = roofLen * 0.5;
  roofShape.moveTo(-rHalf, 0);
  roofShape.quadraticCurveTo(0, 0.10, rHalf, 0);
  roofShape.lineTo(rHalf - 0.02, -0.05);
  roofShape.lineTo(-rHalf + 0.02, -0.05);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: width - 0.10,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: options.cityMode ? 2 : 4,
    curveSegments: options.cityMode ? 8 : 16,
  });
  roofGeo.translate(0, 0, -(width - 0.10) / 2);
  roofGeo.rotateY(-Math.PI / 2);
  roofGeo.computeVertexNormals();
  const roofMesh = new THREE.Mesh(roofGeo, mats.secondary);
  roofMesh.position.set(0, height - 0.05, roofCenterZ);
  tagPart(roofMesh, `${options.labelPrefix} — Teto Aerodinâmico`, 0, 0.45, 0);
  mod.add(roofMesh);

  // Detailed Roof AC Pods with twin fan louvers + escape hatches
  for (let i = 0; i < options.acCount; i++) {
    const az =
      options.acCount === 1
        ? roofCenterZ
        : rearTopZ + roofLen * 0.26 + (i / Math.max(1, options.acCount - 1)) * (roofLen * 0.48);
    const acPod = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.60, 0.21, 1.42, 0.05, 3, 10),
      mats.secondary,
    );
    acPod.position.set(0, height + 0.07, az);
    const vent = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.44, 0.045, 0.96, 0.02, 2, 6),
      mats.grille,
    );
    vent.position.set(0, height + 0.17, az);
    tagPart(acPod, 'Unidade de Ar-Condicionado de Teto', 0, 0.65, 0);
    mod.add(acPod, vent);

    if (!options.cityMode) {
      [-0.24, 0.24].forEach((fz) => {
        const fanRing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.20, 0.20, 0.05, 16),
          mats.trim,
        );
        fanRing.position.set(0, height + 0.185, az + fz);
        mod.add(fanRing);
      });
    }
  }

  // 3. Structural Corner Cheek Pillars, Window Mullions, Framed Side Windows & Flush Boarding Doors
  const pillarW = 0.088;
  const fBotZ = hl - 0.03;
  const rBotZ = -hl + 0.03;

  [-1, 1].forEach((side) => {
    const wallX = side * (width * 0.48);
    const topWallX = side * (width * 0.464);

    // Thick structural A-pillar & D-pillar wrapping cleanly from beltline to roof
    mod.add(
      makeStrutBetween(
        new THREE.Vector3(wallX, beltY - 0.02, fBotZ - 0.02),
        new THREE.Vector3(topWallX, roofY, frontTopZ),
        0.052,
        0.058,
        mats.body,
        options.cityMode ? 6 : 10,
      ),
    );
    mod.add(
      makeStrutBetween(
        new THREE.Vector3(wallX, beltY - 0.02, rBotZ + 0.02),
        new THREE.Vector3(topWallX, roofY, rearTopZ),
        0.06,
        0.068,
        mats.body,
        options.cityMode ? 6 : 10,
      ),
    );

    // Side window cantrail header + belt sill trim
    mod.add(
      makeStrutBetween(
        new THREE.Vector3(topWallX, roofY - 0.02, frontTopZ - 0.05),
        new THREE.Vector3(topWallX, roofY - 0.02, rearTopZ + 0.05),
        0.036,
        0.036,
        mats.trim,
        8,
      ),
    );

    for (let b = 0; b <= bayCount; b++) {
      const mz = rearTopZ + 0.18 + b * bayLen;
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, windowH + 0.04, pillarW),
        mats.trim,
      );
      mullion.position.set(side * (width * 0.476), beltY + windowH * 0.5, mz);
      mod.add(mullion);

      if (b < bayCount) {
        const bayCenterZ = mz + bayLen * 0.5;
        const isDoorBay = side > 0 && options.hasBoardingDoors && doorBayIndices.has(b);

        if (isDoorBay && !options.cityMode) {
          // Hollow-frame twin-leaf outward-opening pantograph doors (opens cleanly to BOTH sides!)
          const doorSpan = bayLen * 0.90;
          const leafW = doorSpan * 0.485;
          const doorFullH = windowH + (beltY - groundClearance) * 0.72;
          const doorX = side * (width * 0.49);
          const doorY = beltY + windowH * 0.25;

          const buildBusDoorLeaf = (dir: -1 | 1, leafLabel: string) => {
            const leafPivot = new THREE.Group();
            const hingeZ = bayCenterZ - dir * (doorSpan * 0.49);
            leafPivot.position.set(doorX, doorY, hingeZ);

            const leafMidZ = dir * (leafW * 0.5);
            const railThick = 0.038;
            const stileW = 0.044;

            // Lower painted kick panel + hollow upper/lower window perimeter frame
            const kickPanel = new THREE.Mesh(
              createRoundedBoxGeo(railThick, doorFullH * 0.14, leafW, 0.012, 2, 6),
              mats.body,
            );
            kickPanel.position.set(0, -doorFullH * 0.55, leafMidZ);
            leafPivot.add(kickPanel);

            const waistRail = new THREE.Mesh(
              new THREE.BoxGeometry(railThick, 0.055, leafW),
              mats.trim,
            );
            waistRail.position.set(0, -doorFullH * 0.16, leafMidZ);
            leafPivot.add(waistRail);

            const topRail = new THREE.Mesh(
              new THREE.BoxGeometry(railThick, 0.055, leafW),
              mats.trim,
            );
            topRail.position.set(0, doorFullH * 0.35, leafMidZ);
            leafPivot.add(topRail);

            const hingeStile = new THREE.Mesh(
              new THREE.BoxGeometry(railThick, doorFullH * 0.96, stileW),
              mats.trim,
            );
            hingeStile.position.set(0, -doorFullH * 0.12, dir * (stileW * 0.5));
            leafPivot.add(hingeStile);

            const meetStile = new THREE.Mesh(
              new THREE.BoxGeometry(railThick, doorFullH * 0.96, stileW),
              mats.trim,
            );
            meetStile.position.set(0, -doorFullH * 0.12, dir * (leafW - stileW * 0.5));
            leafPivot.add(meetStile);

            const meetingSeal = new THREE.Mesh(
              new THREE.BoxGeometry(0.046, doorFullH * 0.95, 0.022),
              mats.grille,
            );
            meetingSeal.position.set(0, -doorFullH * 0.12, dir * (leafW - 0.01));
            leafPivot.add(meetingSeal);

            const glassW = Math.max(0.12, leafW - stileW * 2);
            const upperGlass = new THREE.Mesh(
              new THREE.PlaneGeometry(glassW, doorFullH * 0.45),
              mats.glass,
            );
            upperGlass.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
            upperGlass.position.set(0, doorFullH * 0.10, leafMidZ);
            upperGlass.userData.noShadow = true;
            upperGlass.renderOrder = 2;
            leafPivot.add(upperGlass);

            const lowerGlass = new THREE.Mesh(
              new THREE.PlaneGeometry(glassW, doorFullH * 0.27),
              mats.glass,
            );
            lowerGlass.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
            lowerGlass.position.set(0, -doorFullH * 0.33, leafMidZ);
            lowerGlass.userData.noShadow = true;
            lowerGlass.renderOrder = 2;
            leafPivot.add(lowerGlass);

            const innerGrab = new THREE.Mesh(
              new THREE.CylinderGeometry(0.012, 0.012, doorFullH * 0.40, 8),
              mats.safetyYellow,
            );
            innerGrab.position.set(-side * 0.032, -doorFullH * 0.08, leafMidZ);
            leafPivot.add(innerGrab);

            tagPart(leafPivot, leafLabel, side * 0.4, 0, dir * 0.15);
            mod.add(leafPivot);
            // Front leaf (extends -Z, dir=-1) rotates -1.42 rad; Rear leaf (extends +Z, dir=+1) rotates +1.42 rad -> both swing outward!
            registerOpenable(animated, leafPivot, leafLabel, { y: dir * 1.42 });
          };

          buildBusDoorLeaf(-1, 'Porta Basculante Dianteira Ônibus');
          buildBusDoorLeaf(1, 'Porta Basculante Traseira Ônibus');
        } else {
          // Hollow 4-bar rubber perimeter window frame + single-layer transparent smoked glass + slim transom
          const frameW = bayLen * 0.92;
          const frameH = windowH * 0.90;
          const frameX = side * (width * 0.474);
          const frameY = beltY + windowH * 0.48;
          const barThick = 0.036;

          const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.038, barThick, frameW), mats.trim);
          topBar.position.set(frameX, frameY + frameH * 0.5 - barThick * 0.5, bayCenterZ);
          const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.038, barThick, frameW), mats.trim);
          botBar.position.set(frameX, frameY - frameH * 0.5 + barThick * 0.5, bayCenterZ);
          const fwdJamb = new THREE.Mesh(new THREE.BoxGeometry(0.038, frameH, barThick), mats.trim);
          fwdJamb.position.set(frameX, frameY, bayCenterZ + frameW * 0.5 - barThick * 0.5);
          const aftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.038, frameH, barThick), mats.trim);
          aftJamb.position.set(frameX, frameY, bayCenterZ - frameW * 0.5 + barThick * 0.5);
          mod.add(topBar, botBar, fwdJamb, aftJamb);

          const winGlass = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.max(0.2, frameW - barThick * 1.6), Math.max(0.2, frameH - barThick * 1.6)),
            mats.glass,
          );
          winGlass.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          winGlass.position.set(side * (width * 0.476), frameY, bayCenterZ);
          winGlass.userData.noShadow = true;
          winGlass.renderOrder = 2;
          mod.add(winGlass);

          const transom = new THREE.Mesh(
            new THREE.BoxGeometry(0.030, 0.022, frameW - barThick * 1.4),
            mats.trim,
          );
          transom.position.set(side * (width * 0.475), beltY + windowH * 0.68, bayCenterZ);
          mod.add(transom);
        }
      }
    }
  });

  // 4. Sculpted Front Windshield Mask, Recessed Panoramic Glass, Destination Sign & Wipers
  if (options.hasFrontEnd) {
    const wsSpanZ = fBotZ - frontTopZ;
    const wsLen = Math.hypot(windowH, wsSpanZ);
    const wsAngle = Math.atan2(wsSpanZ, windowH);

    // Lower windshield cowl lip & upper header brow so glass sits 100% flush inside body contour
    const cowlCap = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.92, 0.08, 0.14, 0.02, 2, 8),
      mats.trim,
    );
    cowlCap.position.set(0, beltY + 0.02, fBotZ - 0.04);
    mod.add(cowlCap);

    const browCap = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.88, 0.07, 0.14, 0.02, 2, 8),
      mats.body,
    );
    browCap.position.set(0, roofY + 0.02, frontTopZ);
    mod.add(browCap);

    const wsGeo = createTrapezoidGlassGeo(width * 0.88, width * 0.85, wsLen * 0.95, 0.024);
    const ws = new THREE.Mesh(wsGeo, mats.glass);
    ws.position.set(0, beltY + windowH * 0.49, (fBotZ + frontTopZ) * 0.5 - 0.004);
    ws.rotation.x = -wsAngle;
    ws.userData.noShadow = true;
    ws.renderOrder = 2;
    tagPart(ws, 'Para-brisa Panorâmico', 0, 0.35, 0.45);
    mod.add(ws);

    [-1, 1].forEach((side) => {
      mod.add(
        makeStrutBetween(
          new THREE.Vector3(side * (width * 0.445), beltY + 0.02, fBotZ - 0.02),
          new THREE.Vector3(side * (width * 0.43), roofY - 0.02, frontTopZ),
          0.024,
          0.024,
          mats.trim,
          6,
        ),
      );
    });

    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.042, wsLen * 0.92, 0.045), mats.trim);
    centerBar.position.set(0, beltY + windowH * 0.49, (fBotZ + frontTopZ) * 0.5 - 0.008);
    centerBar.rotation.x = -wsAngle;
    mod.add(centerBar);

    [-0.24, 0.24].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.025, 0.03), mats.trim);
      wiper.position.set(wx * width, beltY + 0.08, fBotZ - 0.02);
      wiper.rotation.z = 0.08;
      mod.add(wiper);
    });

    if (options.hasDestinationSign) {
      const signBezel = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.72, 0.22, 0.08, 0.02, 2, 6),
        mats.trim,
      );
      signBezel.position.set(0, roofY + 0.01, frontTopZ + 0.025);
      const signLed = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.64, 0.14, 0.09),
        mats.sirenAmber,
      );
      signLed.position.copy(signBezel.position);
      tagPart(signBezel, 'Letreiro Digital Luminoso', 0, 0.45, 0.5);
      mod.add(signBezel, signLed);
    }

    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const mir = createTruckDualMirror(side, mats, options.cityMode);
      mir.position.set(side * (width * 0.49), beltY + 0.18, frontTopZ + 0.04);
      tagPart(mir, side < 0 ? 'Retrovisor Longo Esquerdo' : 'Retrovisor Longo Direito', side * 0.45, 0.15, 0.35);
      mod.add(mir);
    });
  }

  // 5. Rear Engine Access Door, Louvered Vents & Hollow Framed Rear Window
  if (options.hasRearEnd) {
    const rwW = width * 0.88;
    const rwH = windowH * 0.86;
    const rwY = beltY + windowH * 0.48;
    const rwBar = 0.075;

    const rwTop = new THREE.Mesh(new THREE.BoxGeometry(rwW, rwBar, 0.08), mats.trim);
    rwTop.position.set(0, rwY + rwH * 0.5 - rwBar * 0.5, rearTopZ);
    const rwBot = new THREE.Mesh(new THREE.BoxGeometry(rwW, rwBar, 0.08), mats.trim);
    rwBot.position.set(0, rwY - rwH * 0.5 + rwBar * 0.5, rearTopZ);
    const rwLeft = new THREE.Mesh(new THREE.BoxGeometry(rwBar, rwH, 0.08), mats.trim);
    rwLeft.position.set(-rwW * 0.5 + rwBar * 0.5, rwY, rearTopZ);
    const rwRight = new THREE.Mesh(new THREE.BoxGeometry(rwBar, rwH, 0.08), mats.trim);
    rwRight.position.set(rwW * 0.5 - rwBar * 0.5, rwY, rearTopZ);
    mod.add(rwTop, rwBot, rwLeft, rwRight);

    const rw = new THREE.Mesh(
      new THREE.PlaneGeometry(rwW - rwBar * 1.6, rwH - rwBar * 1.6),
      mats.glass,
    );
    rw.rotation.y = Math.PI;
    rw.position.set(0, rwY, rearTopZ);
    rw.userData.noShadow = true;
    rw.renderOrder = 2;
    mod.add(rw);

    const engDoor = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.68, (beltY - groundClearance) * 0.62, 0.03, 0.02, 2, 6),
      mats.secondary,
    );
    engDoor.position.set(0, groundClearance + (beltY - groundClearance) * 0.42, -hl - 0.005);
    mod.add(engDoor);

    for (let l = 0; l < 4; l++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.035, 0.042), mats.grille);
      louver.position.set(0, groundClearance + 0.44 + l * 0.10, -hl - 0.01);
      mod.add(louver);
    }
  }

  // 6. Full Hollowed Brazilian Transit Bus Interior (Contoured Seats, Priority Seats, Turnstile, Yellow Stanchions & Straps)
  {
    const interior = new THREE.Group();
    const floorY = floorTopY + 0.025;
    const busInnerH = Math.max(1.4, roofY - floorY);

    // Non-slip matte rubber center aisle + segmented side bay floors (zero overlap with wheelhouses or stepwells!)
    const floorDeck = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.66, 0.03, modLen * 0.90, 0.014, 2, 6),
      mats.trim,
    );
    floorDeck.position.set(0, floorY, 0);
    interior.add(floorDeck);

    // Outer side floor strips strictly between wheel arches and door stepwells
    const wheelBoxTopY = Math.max(floorY + 0.16, wheelRadius * 2.04);
    const wheelBoxH = wheelBoxTopY - floorY;
    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const sideGaps: Array<readonly [number, number]> = [];
      if (side > 0) {
        for (const dr of doorRanges) sideGaps.push(dr);
      }
      for (const wz of sortedWheels) {
        sideGaps.push([wz - archCutR, wz + archCutR]);
      }
      sideGaps.sort((a, b) => a[0] - b[0]);

      let zCur = -hl + 0.12;
      const zEnd = hl - 0.12;
      for (const [g0, g1] of sideGaps) {
        const segEnd = Math.min(zEnd, g0);
        if (segEnd - zCur > 0.10) {
          const sideFloor = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.145, 0.028, segEnd - zCur),
            mats.trim,
          );
          sideFloor.position.set(side * (width * 0.398), floorY, (zCur + segEnd) * 0.5);
          interior.add(sideFloor);
        }
        zCur = Math.max(zCur, g1);
      }
      if (zEnd - zCur > 0.10) {
        const sideFloor = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.145, 0.028, zEnd - zCur),
          mats.trim,
        );
        sideFloor.position.set(side * (width * 0.398), floorY, (zCur + zEnd) * 0.5);
        interior.add(sideFloor);
      }

      // Sealed interior wheelhouse boxes tightly enclosing top of tires & supporting wheel-arch seat pedestals
      for (const wz of sortedWheels) {
        const whBox = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.21, wheelBoxH, archCutR * 1.94, 0.02, 2, 6),
          mats.trim,
        );
        whBox.position.set(side * (width * 0.365), floorY + wheelBoxH * 0.5, wz);
        const whCap = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.20, 0.02, archCutR * 1.88),
          mats.grille,
        );
        whCap.position.set(side * (width * 0.365), wheelBoxTopY + 0.004, wz);
        interior.add(whBox, whCap);
      }
    });

    const aisleRunner = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.036, modLen * 0.86),
      mats.grille,
    );
    aisleRunner.position.set(0, floorY + 0.004, 0);
    interior.add(aisleRunner);

    [-1, 1].forEach((side) => {
      const safetyStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.038, modLen * 0.84),
        mats.safetyYellow,
      );
      safetyStrip.position.set(side * (width * 0.145), floorY + 0.005, 0);
      interior.add(safetyStrip);
    });

    if (!options.cityMode) {
      const cabinFillLight = new THREE.PointLight(0xf8fafc, 0.72, modLen * 0.75, 1.5);
      cabinFillLight.position.set(0, roofY - 0.18, options.hasFrontEnd ? hl * 0.25 : 0);
      interior.add(cabinFillLight);
    }

    if (options.hasFrontEnd) {
      const cockpitDepth = Math.min(1.35, modLen * 0.28);
      const driverCockpit = buildHeavyCabinInterior({
        cabWidth: width * 0.84,
        cabDepth: cockpitDepth,
        cabHeight: busInnerH,
        dashTopY: Math.max(0.72, beltY - floorY + 0.04),
        seatsCount: 1,
        isBus: true,
        wsSlopeInset: Math.max(0, fBotZ - frontTopZ),
        mats,
        cityMode: options.cityMode,
        animated,
      });
      driverCockpit.position.set(0, floorY, hl - cockpitDepth * 0.5 - 0.16);
      interior.add(driverCockpit);

      // Driver Partition Wall + Acrylic Screen + Red Extinguisher + Torino Turnstile (Catraca)
      if (!options.cityMode) {
        const partZ = hl - cockpitDepth - 0.14;
        const modesty = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.32, 0.60, 0.04, 0.015, 2, 6),
          mats.trim,
        );
        modesty.position.set(-width * 0.25, floorY + 0.36, partZ);
        const acrylic = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.30, 0.48),
          mats.glass,
        );
        acrylic.position.set(-width * 0.25, floorY + 0.94, partZ);
        acrylic.userData.noShadow = true;
        acrylic.renderOrder = 2;
        const partRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.017, 0.017, width * 0.34, 8),
          mats.safetyYellow,
        );
        partRail.rotation.z = Math.PI / 2;
        partRail.position.set(-width * 0.25, floorY + 0.68, partZ);
        const modRail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, busInnerH - 0.06, 8),
          mats.safetyYellow,
        );
        modRail.position.set(-width * 0.09, floorY + busInnerH * 0.48, partZ);
        const extinguisher = new THREE.Mesh(
          new THREE.CylinderGeometry(0.052, 0.052, 0.34, 10),
          mats.sirenRed,
        );
        extinguisher.position.set(-width * 0.38, floorY + 0.48, partZ - 0.05);
        interior.add(modesty, acrylic, partRail, modRail, extinguisher);

        if (options.hasBoardingDoors) {
          // Authentic Brazilian CATRACA MECÂNICA 4BR (4 curved S-loop arms around upright spindle + oval card validator + 3-bar divider)
          const turnZ = partZ - 0.38;
          const turnX = -width * 0.02;

          // Tapered trapezoidal 4BR pedestal + black rubber boot + stainless front kick shield + 5-digit odometer counter
          const bootBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.145, 0.16, 0.045, 4),
            mats.grille,
          );
          bootBase.rotation.y = Math.PI / 4;
          bootBase.position.set(turnX, floorY + 0.022, turnZ);

          const pedBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.092, 0.14, 0.42, 4),
            mats.trim,
          );
          pedBody.rotation.y = Math.PI / 4;
          pedBody.position.set(turnX, floorY + 0.24, turnZ);

          const steelShield = new THREE.Mesh(
            new THREE.BoxGeometry(0.165, 0.22, 0.02),
            mats.chrome,
          );
          steelShield.position.set(turnX, floorY + 0.18, turnZ + 0.105);
          steelShield.rotation.x = -0.11;

          const counterWin = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.036, 0.024),
            mats.sirenRed,
          );
          counterWin.position.set(turnX, floorY + 0.35, turnZ + 0.09);
          counterWin.rotation.x = -0.11;

          const spindleBoot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.044, 0.056, 0.06, 12),
            mats.grille,
          );
          spindleBoot.position.set(turnX, floorY + 0.47, turnZ);

          const spindleShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, 0.62, 14),
            mats.trim,
          );
          spindleShaft.position.set(turnX, floorY + 0.78, turnZ);

          const spindleCap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12),
            mats.chrome,
          );
          spindleCap.position.set(turnX, floorY + 1.09, turnZ);

          interior.add(bootBase, pedBody, steelShield, counterWin, spindleBoot, spindleShaft, spindleCap);

          // 4 iconic 4BR hourglass S-loop tubular arms spaced 90° around the vertical central shaft
          const armCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.025, 0.56, 0),
            new THREE.Vector3(0.24, 0.56, 0),
            new THREE.Vector3(0.35, 0.51, 0),
            new THREE.Vector3(0.29, 0.32, 0),
            new THREE.Vector3(0.32, 0.14, 0),
            new THREE.Vector3(0.24, 0.02, 0),
            new THREE.Vector3(0.17, 0.16, 0),
            new THREE.Vector3(0.16, 0.34, 0),
            new THREE.Vector3(0.025, 0.36, 0),
          ]);
          const armGeo = new THREE.TubeGeometry(armCurve, 24, 0.015, 8, false);
          for (let armIdx = 0; armIdx < 4; armIdx++) {
            const armMesh = new THREE.Mesh(armGeo, mats.safetyYellow);
            armMesh.position.set(turnX, floorY + 0.50, turnZ);
            armMesh.rotation.y = (armIdx * Math.PI) / 2 + 0.42;
            interior.add(armMesh);
          }

          // Curb-side 3-rod chrome + yellow barrier rack bordering the catraca lane
          const rackX = width * 0.22;
          [-0.26, 0.26].forEach((gz) => {
            const post = new THREE.Mesh(
              new THREE.CylinderGeometry(0.018, 0.018, busInnerH - 0.06, 8),
              mats.safetyYellow,
            );
            post.position.set(rackX, floorY + busInnerH * 0.48, turnZ + gz);
            interior.add(post);
          });
          [0.10, 0.94].forEach((gy) => {
            const bar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.015, 0.015, 0.54, 8),
              mats.safetyYellow,
            );
            bar.rotation.x = Math.PI / 2;
            bar.position.set(rackX, floorY + gy, turnZ);
            interior.add(bar);
          });
          [-0.12, 0, 0.12].forEach((rz) => {
            const rod = new THREE.Mesh(
              new THREE.CylinderGeometry(0.012, 0.012, 0.84, 8),
              mats.chrome,
            );
            rod.position.set(rackX, floorY + 0.52, turnZ + rz);
            interior.add(rod);
          });

          // Electronic Contactless Card Validator on yellow left stanchion (top-left reference detail)
          const valX = -width * 0.18;
          const validatorPost = new THREE.Mesh(
            new THREE.CylinderGeometry(0.019, 0.019, busInnerH - 0.06, 8),
            mats.safetyYellow,
          );
          validatorPost.position.set(valX, floorY + busInnerH * 0.48, turnZ + 0.22);
          const valCrossBar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8),
            mats.safetyYellow,
          );
          valCrossBar.rotation.x = Math.PI / 2;
          valCrossBar.position.set(valX, floorY + 1.06, turnZ + 0.32);
          const validatorPod = new THREE.Mesh(
            createRoundedBoxGeo(0.15, 0.22, 0.08, 0.035, 2, 8),
            mats.safetyYellow,
          );
          validatorPod.position.set(valX + 0.04, floorY + 1.24, turnZ + 0.25);
          const valFace = new THREE.Mesh(
            createRoundedBoxGeo(0.12, 0.17, 0.022, 0.02, 2, 6),
            mats.trim,
          );
          valFace.position.set(valX + 0.04, floorY + 1.24, turnZ + 0.295);
          const valScreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.026), mats.sirenBlue);
          valScreen.position.set(valX + 0.04, floorY + 1.27, turnZ + 0.298);
          interior.add(validatorPost, valCrossBar, validatorPod, valFace, valScreen);
        }
      }
    }

    if (!options.cityMode) {
      const seatStartZ = options.hasFrontEnd
        ? options.hasBoardingDoors
          ? hl - 2.42
          : hl - 1.84
        : hl - 0.58;
      const seatEndZ = options.hasRearEnd ? -hl + 1.24 : -hl + 0.58;
      const rowStep = 0.82;

      // Interior Side Dado Trim Panels + Continuous Window Sill Ledges + Pillar Emergency Hammers
      const dadoH = Math.max(0.24, beltY - floorY - 0.04);
      const dadoY = floorY + dadoH * 0.5 + 0.02;
      [-1, 1].forEach((s) => {
        const side = s as -1 | 1;
        const innerX = side * (width * 0.452);
        const sillX = side * (width * 0.448);
        const gaps = side > 0 ? doorRanges : [];
        let zCur = -hl + 0.14;
        const zEnd = hl - 0.14;
        for (const [d0, d1] of gaps) {
          const segEnd = Math.min(zEnd, d0);
          if (segEnd - zCur > 0.12) {
            const dado = new THREE.Mesh(
              new THREE.BoxGeometry(0.022, dadoH, segEnd - zCur),
              mats.alloy,
            );
            dado.position.set(innerX, dadoY, (zCur + segEnd) * 0.5);
            const sill = new THREE.Mesh(
              new THREE.BoxGeometry(0.045, 0.028, segEnd - zCur),
              mats.trim,
            );
            sill.position.set(sillX, beltY - 0.01, (zCur + segEnd) * 0.5);
            interior.add(dado, sill);
          }
          zCur = Math.max(zCur, d1);
        }
        if (zEnd - zCur > 0.12) {
          const dado = new THREE.Mesh(
            new THREE.BoxGeometry(0.022, dadoH, zEnd - zCur),
            mats.alloy,
          );
          dado.position.set(innerX, dadoY, (zCur + zEnd) * 0.5);
          const sill = new THREE.Mesh(
            new THREE.BoxGeometry(0.045, 0.028, zEnd - zCur),
            mats.trim,
          );
          sill.position.set(sillX, beltY - 0.01, (zCur + zEnd) * 0.5);
          interior.add(dado, sill);
        }

        // Red emergency window hammers on alternating window mullions
        for (let b = 1; b < bayCount; b += 2) {
          const hz = rearTopZ + 0.18 + b * bayLen;
          if (side > 0 && (doorBayIndices.has(b) || doorBayIndices.has(b - 1))) continue;
          const hammer = new THREE.Mesh(
            new THREE.BoxGeometry(0.024, 0.095, 0.032),
            mats.sirenRed,
          );
          hammer.position.set(side * (width * 0.448), beltY + windowH * 0.46, hz);
          interior.add(hammer);
        }
      });

      // Checkered alloy entry floor plate ahead of turnstile + Priority Wheelchair Box marking
      if (options.hasFrontEnd && options.hasBoardingDoors) {
        const entryPlate = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.44, 0.038, 0.92),
          mats.alloy,
        );
        entryPlate.position.set(width * 0.12, floorY + 0.005, hl - 1.55);
        interior.add(entryPlate);
      }

      // Ceiling Headliner Panel + Side AC Soffits + Dual Longitudinal LED Diffusers + Emergency Roof Hatches
      const headliner = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.86, 0.018, Math.max(0.5, roofLen - 0.16)),
        mats.alloy,
      );
      headliner.position.set(0, roofY - 0.012, roofCenterZ);
      interior.add(headliner);

      if (options.hasFrontEnd) {
        const stopMarquee = new THREE.Mesh(
          createRoundedBoxGeo(0.52, 0.075, 0.06, 0.012, 2, 6),
          mats.trim,
        );
        stopMarquee.position.set(0, roofY - 0.075, frontTopZ - 0.18);
        const stopLed = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.036, 0.068), mats.sirenRed);
        stopLed.position.copy(stopMarquee.position);
        interior.add(stopMarquee, stopLed);
      }

      [-1, 1].forEach((side) => {
        const soffit = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.25, 0.032, Math.max(0.5, roofLen - 0.22)),
          mats.alloy,
        );
        soffit.position.set(side * (width * 0.30), roofY - 0.032, roofCenterZ);
        const ledChannel = new THREE.Mesh(
          new THREE.BoxGeometry(0.052, 0.022, Math.max(0.5, roofLen - 0.32)),
          mats.headlight,
        );
        ledChannel.position.set(side * (width * 0.14), roofY - 0.028, roofCenterZ);
        interior.add(soffit, ledChannel);

        const railLen = Math.max(0.8, seatStartZ - seatEndZ + 0.6);
        const railMidZ = (seatStartZ + seatEndZ) * 0.5;
        const rail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.017, 0.017, railLen, 8),
          mats.safetyYellow,
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.set(side * (width * 0.15), roofY - 0.20, railMidZ);
        interior.add(rail);

        const strapCount = Math.max(3, Math.floor(railLen / 0.85));
        for (let st = 0; st < strapCount; st++) {
          const sz = seatEndZ + (st + 0.5) * (railLen / strapCount);
          const dropMount = new THREE.Mesh(
            new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6),
            mats.safetyYellow,
          );
          dropMount.position.set(side * (width * 0.15), roofY - 0.11, sz);
          const strapStem = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.14, 0.022), mats.trim);
          strapStem.position.set(side * (width * 0.15), roofY - 0.27, sz);
          const strapLoop = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.009, 6, 12), mats.trim);
          strapLoop.rotation.y = Math.PI / 2;
          strapLoop.position.set(side * (width * 0.15), roofY - 0.36, sz);
          interior.add(dropMount, strapStem, strapLoop);
        }
      });

      const hatchCount = modLen > 7.5 ? 2 : 1;
      for (let hIdx = 0; hIdx < hatchCount; hIdx++) {
        const hz = hatchCount === 1 ? roofCenterZ : (hIdx === 0 ? roofCenterZ + modLen * 0.20 : roofCenterZ - modLen * 0.20);
        const hatchFrame = new THREE.Mesh(
          createRoundedBoxGeo(0.56, 0.032, 0.52, 0.015, 2, 6),
          mats.trim,
        );
        hatchFrame.position.set(0, roofY - 0.026, hz);
        const hatchLid = new THREE.Mesh(
          createRoundedBoxGeo(0.46, 0.038, 0.42, 0.012, 2, 6),
          mats.alloy,
        );
        hatchLid.position.set(0, roofY - 0.030, hz);
        interior.add(hatchFrame, hatchLid);
      }

      const addErgonomicBusSeatUnit = (
        px: number,
        py: number,
        pz: number,
        seatW: number,
        count: number,
        isPriority: boolean,
        aisleSide: -1 | 1 | 0,
      ) => {
        const unit = new THREE.Group();
        const eachW = (seatW - (count - 1) * 0.025) / count;
        const padMat = isPriority ? mats.safetyYellow : mats.transitBlue;

        const pedLeg = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.31, 0.10),
          mats.trim,
        );
        pedLeg.position.set(0, 0.155, 0);
        unit.add(pedLeg);

        for (let s = 0; s < count; s++) {
          const sx = -seatW * 0.5 + eachW * 0.5 + s * (eachW + 0.025);
          const shellBase = new THREE.Mesh(
            createRoundedBoxGeo(eachW * 0.94, 0.045, 0.38, 0.016, 2, 6),
            mats.trim,
          );
          shellBase.position.set(sx, 0.33, 0.04);

          const seatPad = new THREE.Mesh(
            createRoundedBoxGeo(eachW * 0.84, 0.045, 0.34, 0.016, 2, 6),
            padMat,
          );
          seatPad.position.set(sx, 0.36, 0.045);

          const backShell = new THREE.Mesh(
            createRoundedBoxGeo(eachW * 0.92, 0.50, 0.032, 0.016, 2, 8),
            mats.alloy,
          );
          backShell.position.set(sx, 0.61, -0.148);
          backShell.rotation.x = -0.14;

          const backPad = new THREE.Mesh(
            createRoundedBoxGeo(eachW * 0.82, 0.43, 0.034, 0.015, 2, 6),
            padMat,
          );
          backPad.position.set(sx, 0.61, -0.126);
          backPad.rotation.x = -0.14;

          unit.add(shellBase, seatPad, backShell, backPad);
        }

        // Upper corner molded grab handle + slim aisle armrest
        if (aisleSide !== 0) {
          const cornerGrab = new THREE.Mesh(
            createRoundedBoxGeo(0.10, 0.04, 0.036, 0.01, 2, 6),
            isPriority ? mats.trim : mats.safetyYellow,
          );
          cornerGrab.position.set(-aisleSide * (seatW * 0.36), 0.87, -0.175);
          const armrest = new THREE.Mesh(
            createRoundedBoxGeo(0.032, 0.028, 0.24, 0.008, 2, 6),
            mats.trim,
          );
          armrest.position.set(-aisleSide * (seatW * 0.48), 0.51, 0.04);
          unit.add(cornerGrab, armrest);
        }

        unit.position.set(px, py, pz);
        interior.add(unit);
      };

      // Recessed 2-step boarding stairwells and entry assist rails centered inside each door bay
      for (const dbc of doorBayCenters) {
        const stepLen = bayLen * 0.86;
        const riserBack = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, floorY - groundClearance - 0.04, stepLen),
          mats.trim,
        );
        riserBack.position.set(width * 0.335, (floorY + groundClearance) * 0.5 + 0.02, dbc);
        const stepEdge = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.032, stepLen),
          mats.safetyYellow,
        );
        stepEdge.position.set(width * 0.355, floorY + 0.016, dbc);
        const midStep = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.035, stepLen),
          mats.grille,
        );
        midStep.position.set(width * 0.405, groundClearance + 0.20, dbc);
        const lowerStep = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.035, stepLen),
          mats.grille,
        );
        lowerStep.position.set(width * 0.455, groundClearance + 0.09, dbc);
        const lowerStepNose = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.036, stepLen),
          mats.safetyYellow,
        );
        lowerStepNose.position.set(width * 0.498, groundClearance + 0.09, dbc);
        const entryPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.016, busInnerH * 0.82, 8),
          mats.safetyYellow,
        );
        entryPole.position.set(width * 0.34, floorY + busInnerH * 0.41, dbc + stepLen * 0.42);
        interior.add(riserBack, stepEdge, midStep, lowerStep, lowerStepNose, entryPole);
      }

      let rowIdx = 0;
      for (let sz = seatStartZ; sz >= seatEndZ; sz -= rowStep) {
        [-1, 1].forEach((s) => {
          const side = s as -1 | 1;
          const blockedByDoor =
            side > 0 &&
            options.hasBoardingDoors &&
            doorBayCenters.some((dbc) => Math.abs(dbc - sz) < bayLen * 0.56);
          if (blockedByDoor) {
            return;
          }

          const overWheel = sortedWheels.some((wz) => Math.abs(wz - sz) < archCutR * 0.92);
          const seatBaseY = overWheel ? wheelBoxTopY + 0.01 : floorY;
          const isPriority = options.hasFrontEnd && rowIdx < 2;
          addErgonomicBusSeatUnit(
            side * (width * 0.31),
            seatBaseY,
            sz,
            width * 0.28,
            2,
            isPriority,
            side,
          );
        });

        // Alternating vertical yellow stanchions with red stop-request buttons
        if (rowIdx % 2 === 0) {
          const poleSide = rowIdx % 4 === 0 ? -1 : 1;
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, busInnerH - 0.06, 8),
            mats.safetyYellow,
          );
          pole.position.set(poleSide * (width * 0.15), floorY + busInnerH * 0.48, sz);
          const stopBtn = new THREE.Mesh(
            new THREE.BoxGeometry(0.042, 0.062, 0.036),
            mats.sirenRed,
          );
          stopBtn.position.set(poleSide * (width * 0.15), floorY + 1.18, sz);
          interior.add(pole, stopBtn);
        }
        rowIdx++;
      }

      // Rearmost full-width 5-seat contoured bank + rear clock/route display (when hasRearEnd)
      if (options.hasRearEnd) {
        addErgonomicBusSeatUnit(0, floorY + 0.06, -hl + 0.60, width * 0.84, 5, false, 0);
      }
    }
    mod.add(interior);
  }

  return mod;
}

function buildSchoolBusVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  wheelStyle: WheelStyle,
  cityMode: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;
  const frontWheelZ = wheelbase * 0.5;
  const rearWheelZ = -wheelbase * 0.5;
  const hoodLen = Math.min(1.48, length * 0.21);
  const hoodFrontZ = halfL - 0.11;
  const cowlZ = hoodFrontZ - hoodLen;
  const beltY = g.groundClearance + (height - g.groundClearance) * 0.46;
  const roofY = height - 0.14;
  const bodyLen = cowlZ - (-halfL + 0.08);
  const bodyCenterZ = (-halfL + 0.08 + cowlZ) * 0.5;
  const archR = g.wheelRadius * 1.15;

  // 1. Nose-hooded School Bus Engine Bay + Openable Front Hood + Crossover Mirrors
  const noseSides = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.88, beltY - g.groundClearance - 0.08, hoodLen - 0.04, 0.045, 3, 10),
    mats.body,
  );
  noseSides.position.set(0, g.groundClearance + (beltY - g.groundClearance) * 0.42, cowlZ + (hoodLen - 0.04) * 0.5);
  group.add(noseSides);

  if (!cityMode) {
    const bay = createEngineBayAssembly(width * 0.62, hoodLen * 0.82, mats, false);
    bay.position.set(0, g.groundClearance + (beltY - g.groundClearance) * 0.64, cowlZ + hoodLen * 0.5);
    group.add(bay);
  }

  const hoodPivot = new THREE.Group();
  hoodPivot.position.set(0, beltY - 0.04, cowlZ);
  const hoodLid = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.78, 0.14, hoodLen * 0.96, 0.05, 3, 10),
    mats.body,
  );
  hoodLid.position.set(0, -0.02, hoodLen * 0.48);
  hoodLid.rotation.x = 0.08;
  hoodPivot.add(hoodLid);
  tagPart(hoodPivot, 'Capô do Motor Escolar', 0, 0.35, 0.35);
  group.add(hoodPivot);
  registerOpenable(animated, hoodPivot, 'Capô Motor Escolar', { x: -0.68 });

  // Convex crossover mirrors on front hood corners
  [-1, 1].forEach((side) => {
    const arm = makeStrutBetween(
      new THREE.Vector3(side * (width * 0.42), beltY - 0.18, hoodFrontZ - 0.18),
      new THREE.Vector3(side * (width * 0.48), beltY + 0.06, hoodFrontZ - 0.05),
      0.012,
      0.012,
      mats.chrome,
      8,
    );
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mats.chrome);
    dish.position.set(side * (width * 0.48), beltY + 0.06, hoodFrontZ - 0.05);
    group.add(arm, dish);
  });

  // 2. Main School Bus Body behind Cowl
  const busBody = buildTransitBusModule(
    bodyLen,
    width,
    height,
    g.groundClearance,
    [rearWheelZ - bodyCenterZ],
    g.wheelRadius,
    mats,
    animated,
    {
      hasFrontEnd: true,
      hasRearEnd: true,
      hasDestinationSign: false,
      hasBoardingDoors: true,
      doorPositionsZ: [bodyLen * 0.38],
      labelPrefix: 'Ônibus Escolar',
      cityMode,
      acCount: 0,
    },
  );
  busBody.position.z = bodyCenterZ;
  group.add(busBody);

  // Classic 3 horizontal black rub-rails on school bus sides
  [-1, 1].forEach((side) => {
    [0.24, 0.48, beltY - g.groundClearance - 0.08].forEach((ry) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.055, bodyLen * 0.92), mats.trim);
      rail.position.set(side * (width * 0.504), g.groundClearance + ry, bodyCenterZ);
      group.add(rail);
    });
  });

  const sign = new THREE.Mesh(
    createRoundedBoxGeo(1.18, 0.22, 0.08, 0.02, 2, 8),
    mats.secondary,
  );
  sign.position.set(0, roofY + 0.06, cowlZ - 0.14);
  tagPart(sign, 'Placa ESCOLAR Superior', 0, 0.55, 0.25);
  group.add(sign);

  [-1, 1].forEach((s) => {
    const amber = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), mats.sirenAmber);
    amber.rotation.x = Math.PI / 2;
    amber.position.set(s * (width * 0.34), roofY + 0.04, cowlZ - 0.12);
    const red = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), mats.sirenRed);
    red.rotation.x = Math.PI / 2;
    red.position.set(s * (width * 0.41), roofY + 0.04, cowlZ - 0.12);
    group.add(amber, red);
  });

  const stopArmPivot = new THREE.Group();
  stopArmPivot.position.set(-width * 0.505, beltY - 0.12, cowlZ - 0.35);
  const stopBracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.18), mats.chrome);
  stopBracket.position.set(-0.01, 0, -0.09);
  const stopBorder = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.022, 8), mats.liveryStripe);
  stopBorder.rotation.z = Math.PI / 2;
  stopBorder.position.set(-0.022, 0, -0.22);
  const stopSign = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.028, 8), mats.taillight);
  stopSign.rotation.z = Math.PI / 2;
  stopSign.position.set(-0.024, 0, -0.22);
  stopArmPivot.add(stopBracket, stopBorder, stopSign);
  tagPart(stopArmPivot, 'Placa PARE Articulada', -0.45, 0, 0);
  group.add(stopArmPivot);
  registerOpenable(animated, stopArmPivot, 'Placa PARE Escolar', { y: 1.45 });

  [-1, 1].forEach((side) => {
    const fArch = new THREE.Mesh(
      new THREE.TorusGeometry(archR * 0.96, 0.055, 8, 18, Math.PI),
      mats.body,
    );
    fArch.rotation.y = Math.PI / 2;
    fArch.position.set(side * (width * 0.45), g.wheelRadius * 0.95, frontWheelZ);
    group.add(fArch);
  });

  [
    { z: frontWheelZ, dual: false },
    { z: rearWheelZ, dual: true },
  ].forEach((ax, idx) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, ax.dual, cityMode);
      if (idx === 0) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        steerPivot.add(w);
        tagPart(steerPivot, `Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
      } else {
        w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        tagPart(w, `Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, g.groundClearance + 0.18, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, hoodFrontZ, -halfL + 0.04, mats, false, true, false, undefined, animated);
  addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'single');
  enableShadows(group);
  return group;
}

export function buildBusOrArticulatedBus(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  wheelStyle: WheelStyle,
  cityMode: boolean,
): THREE.Group {
  const g = v.geometry;
  if (g.attachments.includes('school_sign')) {
    return buildSchoolBusVehicle(v, mats, animated, wheelStyle, cityMode);
  }

  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const halfL = length / 2;

  if (g.archetype === 'articulated_bus') {
    const frontLen = length * 0.55;
    const rearLen = length * 0.37;
    const gap = length * 0.08;
    const frontZ = halfL - frontLen * 0.5;
    const rearZ = -halfL + rearLen * 0.5;
    const bellowsZ = (frontZ - frontLen * 0.5 + (rearZ + rearLen * 0.5)) * 0.5;
    const axleZs = [frontZ + frontLen * 0.30, frontZ - frontLen * 0.28, rearZ - rearLen * 0.14];

    const frontMod = buildTransitBusModule(
      frontLen,
      width,
      height,
      g.groundClearance,
      [axleZs[0] - frontZ, axleZs[1] - frontZ],
      g.wheelRadius,
      mats,
      animated,
      {
        hasFrontEnd: true,
        hasRearEnd: false,
        hasDestinationSign: true,
        hasBoardingDoors: true,
        doorPositionsZ: [frontLen * 0.34, -frontLen * 0.14],
        labelPrefix: 'Módulo Dianteiro BRT',
        cityMode,
        acCount: 2,
      },
    );
    frontMod.position.z = frontZ;
    group.add(frontMod);

    const rearMod = buildTransitBusModule(
      rearLen,
      width,
      height,
      g.groundClearance,
      [axleZs[2] - rearZ],
      g.wheelRadius,
      mats,
      animated,
      {
        hasFrontEnd: false,
        hasRearEnd: true,
        hasDestinationSign: false,
        hasBoardingDoors: true,
        doorPositionsZ: [rearLen * 0.18],
        labelPrefix: 'Módulo Traseiro BRT',
        cityMode,
        acCount: 1,
      },
    );
    rearMod.position.z = rearZ;
    group.add(rearMod);

    // Hollow U-arch pleated bellows + flush circular turntable walkway (open corridor from front module to rear module!)
    const bellowsGroup = new THREE.Group();
    const belFloorY = g.groundClearance + 0.275;
    const belRoofY = height - 0.14;
    const belWallH = belRoofY - belFloorY;
    for (let i = -4; i <= 4; i++) {
      const ribMat = i % 2 === 0 ? mats.trim : mats.secondary;
      const rz = i * (gap * 0.105);
      const rThick = gap * 0.095;
      [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(
          createRoundedBoxGeo(0.11, belWallH, rThick, 0.025, 2, 6),
          ribMat,
        );
        wall.position.set(side * (width * 0.44), belFloorY + belWallH * 0.5, rz);
        bellowsGroup.add(wall);
      });
      const topArch = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.94, 0.14, rThick, 0.03, 2, 6),
        ribMat,
      );
      topArch.position.set(0, belRoofY - 0.02, rz);
      bellowsGroup.add(topArch);
    }
    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.42, width * 0.42, 0.045, 24),
      mats.alloy,
    );
    turntable.position.set(0, belFloorY, 0);
    bellowsGroup.add(turntable);
    bellowsGroup.position.z = bellowsZ;
    tagPart(bellowsGroup, 'Sanfona Articulada e Mesa Giratória', 0, 0.35, 0);
    group.add(bellowsGroup);

    axleZs.forEach((az, idx) => {
      [-1, 1].forEach((side) => {
        const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, idx > 0, cityMode);
        if (idx === 0) {
          const steerPivot = new THREE.Group();
          steerPivot.position.set(side * (width * 0.46), g.wheelRadius, az);
          steerPivot.add(w);
          tagPart(steerPivot, `Eixo ${idx + 1} BRT`, side * 0.45, -0.1, 0);
          group.add(steerPivot);
          animated.steeringPivots.push(steerPivot);
        } else {
          w.position.set(side * (width * 0.46), g.wheelRadius, az);
          tagPart(w, `Eixo ${idx + 1} BRT`, side * 0.45, -0.1, 0);
          group.add(w);
        }
        animated.wheels.push(w);
      });
    });

    addChassisDrivetrain(group, width, g.groundClearance + 0.18, axleZs[0], axleZs[2], mats, cityMode);
    addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, false, false, false, undefined, animated);
    addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'dual');
    enableShadows(group);
    return group;
  }

  const frontWheelZ = wheelbase * 0.5;
  const rearWheelZ = -wheelbase * 0.5;
  const busMod = buildTransitBusModule(
    length,
    width,
    height,
    g.groundClearance,
    [frontWheelZ, rearWheelZ],
    g.wheelRadius,
    mats,
    animated,
    {
      hasFrontEnd: true,
      hasRearEnd: true,
      hasDestinationSign: true,
      hasBoardingDoors: true,
      doorPositionsZ: [length * 0.39, -length * 0.04],
      labelPrefix: 'Ônibus Urbano',
      cityMode,
      acCount: 2,
    },
  );
  group.add(busMod);

  [
    { z: frontWheelZ, dual: false },
    { z: rearWheelZ, dual: true },
  ].forEach((ax, idx) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, ax.dual, cityMode);
      if (idx === 0) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        steerPivot.add(w);
        tagPart(steerPivot, `Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
      } else {
        w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        tagPart(w, `Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, g.groundClearance + 0.18, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, false, false, false, undefined, animated);
  addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'single');
  enableShadows(group);
  return group;
}

// =========================================================================
// 2. HIGH-DETAIL HEAVY TRUCKS (SEMI, DUMP, MIXER, FIRETRUCK, TOW TRUCK)
// =========================================================================
export function buildHeavyTruckVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  wheelStyle: WheelStyle,
  cityMode: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;
  const isSemi = g.archetype === 'semi_truck';
  const isFire = g.archetype === 'firetruck';
  const isDump = g.archetype === 'dump_truck';
  const isMixer = g.archetype === 'mixer_truck';
  const isTow = g.archetype === 'tow_truck';
  const useChrome = v.palette.trim === 'chrome' || g.attachments.includes('chrome_bumpers');

  const cabLen = length * g.cabinLengthRatio;
  const cabZ = halfL - cabLen * 0.5 - 0.08;
  const frameY = g.groundClearance + 0.16;
  const cabBaseY = frameY + 0.10;
  const cabH = height - cabBaseY - (isSemi ? 0.24 : 0.12);
  const ch = cabLen * 0.5;
  const noseLen = isSemi ? cabLen * 0.34 : cabLen * 0.16;
  const noseStartZ = ch - noseLen;

  // 1. Twin Heavy I-Beam Chassis Rails + Crossmembers + Rear Light Valance
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(
      createRoundedBoxGeo(0.14, 0.22, length * 0.99, 0.02, 2, 6),
      mats.trim,
    );
    rail.position.set(side * (width * 0.22), frameY, 0);
    group.add(rail);
  });
  for (let i = -3; i <= 3; i++) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.14, 0.12), mats.trim);
    cross.position.set(0, frameY, (i / 3) * halfL * 0.78);
    group.add(cross);
  }
  const rearValance = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.96, 0.48, 0.14, 0.02, 2, 6),
    mats.trim,
  );
  rearValance.position.set(0, g.groundClearance + 0.28, -halfL + 0.06);
  group.add(rearValance);

  // 2. Hollowed Sculpted Heavy Truck Cab Core (open cockpit bay + open windshield bay!)
  const hoodTopH = cabH * (isSemi ? 0.46 : 0.42);
  const noseFrontBevel = 0.045;
  const noseLocalEnd = ch - noseFrontBevel - 0.015;
  const wsTopLocalZ = noseStartZ - cabLen * 0.14;
  const cabFloorH = 0.14;
  const cabWallThick = 0.14;

  // 2a. Hollowed lower cab chassis + sloped engine nose (drops to cabFloorH inside cab!)
  const cabLowerShape = new THREE.Shape();
  cabLowerShape.moveTo(-ch, 0);
  cabLowerShape.lineTo(noseLocalEnd, 0);
  cabLowerShape.lineTo(noseLocalEnd, hoodTopH * 0.82);
  cabLowerShape.lineTo(noseStartZ, hoodTopH);
  cabLowerShape.lineTo(noseStartZ - 0.05, cabFloorH);
  cabLowerShape.lineTo(-ch + cabWallThick, cabFloorH);
  cabLowerShape.lineTo(-ch + cabWallThick, hoodTopH);
  cabLowerShape.lineTo(-ch, hoodTopH);
  cabLowerShape.closePath();

  const cabLowerGeo = createExtrudedProfile(
    cabLowerShape,
    cityMode ? width * 0.94 : width * 0.84,
    noseFrontBevel,
    noseFrontBevel,
    cityMode ? 2 : 4,
    cityMode ? 10 : 18,
  );
  const cabLowerMesh = new THREE.Mesh(cabLowerGeo, mats.body);
  cabLowerMesh.position.set(0, cabBaseY, cabZ);
  tagPart(cabLowerMesh, isFire ? 'Cabine Dupla Bombeiros' : isSemi ? 'Cabine Leito Estradeira' : 'Cabine Pesada Esculpida', 0, 0.35, 0.45);
  group.add(cabLowerMesh);

  // 2b. Hollowed Upper Rear Bulkhead & Cambered Roof Shell (leaves cab interior AND rear cab window open!)
  const cabInnerH = cabH - cabFloorH - 0.11;
  const rearWallCutH = isSemi ? cabH - 0.11 : Math.max(hoodTopH + 0.10, cabFloorH + cabInnerH * 0.46);
  const cabUpperShape = new THREE.Shape();
  cabUpperShape.moveTo(-ch, hoodTopH - 0.02);
  cabUpperShape.lineTo(-ch + cabWallThick, hoodTopH - 0.02);
  cabUpperShape.lineTo(-ch + cabWallThick, rearWallCutH);
  cabUpperShape.lineTo(-ch, rearWallCutH);
  cabUpperShape.closePath();

  const cabUpperGeo = createExtrudedProfile(
    cabUpperShape,
    cityMode ? width * 0.94 : width * 0.84,
    0.04,
    0.04,
    cityMode ? 2 : 4,
    cityMode ? 10 : 18,
  );
  const cabUpperMesh = new THREE.Mesh(cabUpperGeo, mats.body);
  cabUpperMesh.position.set(0, cabBaseY, cabZ);
  group.add(cabUpperMesh);

  // Cambered Roof Slab & Rear Upper Header Beam (separates roof cleanly so rear window opening stays clear!)
  const roofCurve = new THREE.Shape();
  roofCurve.moveTo(wsTopLocalZ - 0.01, cabH - 0.11);
  roofCurve.lineTo(-ch + 0.04, cabH - 0.11);
  roofCurve.lineTo(-ch, cabH - 0.06);
  roofCurve.lineTo(-ch + 0.12, cabH);
  roofCurve.quadraticCurveTo(wsTopLocalZ - cabLen * 0.08, cabH, wsTopLocalZ - 0.01, cabH - 0.04);
  roofCurve.closePath();

  const cabRoofGeo = createExtrudedProfile(
    roofCurve,
    cityMode ? width * 0.94 : width * 0.84,
    0.04,
    0.04,
    cityMode ? 2 : 4,
    cityMode ? 10 : 18,
  );
  const cabRoofMesh = new THREE.Mesh(cabRoofGeo, mats.body);
  cabRoofMesh.position.set(0, cabBaseY, cabZ);
  group.add(cabRoofMesh);

  if (!isSemi) {
    // Upper rear cab window header beam + side corner pillars framing the open rear cab window
    const rearHeaderH = Math.max(0.14, cabH - (cabFloorH + cabInnerH * 0.81));
    const rearHeader = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.88, rearHeaderH, cabWallThick, 0.02, 2, 8),
      mats.body,
    );
    rearHeader.position.set(0, cabBaseY + cabH - rearHeaderH * 0.5 - 0.02, cabZ - ch + cabWallThick * 0.5);
    group.add(rearHeader);

    const sidePostH = Math.max(0.24, cabH - rearWallCutH - rearHeaderH + 0.06);
    [-1, 1].forEach((side) => {
      const post = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.16, sidePostH, cabWallThick, 0.02, 2, 8),
        mats.body,
      );
      post.position.set(
        side * (width * 0.36),
        cabBaseY + rearWallCutH + sidePostH * 0.5 - 0.02,
        cabZ - ch + cabWallThick * 0.5,
      );
      group.add(post);
    });
  }

  // Cab roof brow header sealing cleanly above windshield
  const cabBrow = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.88, 0.085, 0.14, 0.02, 2, 8),
    mats.body,
  );
  cabBrow.position.set(0, cabBaseY + cabH - 0.055, cabZ + wsTopLocalZ - 0.02);
  group.add(cabBrow);

  // Full-width sculpted front fenders & rear sleeper shell (width * 0.96, flush with cab doors!)
  const frontAxleZ = cabZ + 0.18;
  const fDoorHingeZ = cabZ + noseStartZ - 0.12;
  const doorLen = isFire ? Math.min(0.92, cabLen * 0.34) : Math.min(1.02, cabLen * 0.42);
  const wsBotZ = cabZ + noseStartZ - 0.01;
  const wsTopZ = cabZ + wsTopLocalZ;
  const wsBotY = cabBaseY + hoodTopH + 0.02;
  const wsTopY = cabBaseY + cabH - 0.06;

  [-1, 1].forEach((side) => {
    // Sloped contoured front fenders flush with hood height & terminating cleanly at fDoorHingeZ
    const fenderSpan = noseLen + 0.08;
    const fFender = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.22, hoodTopH * 0.56, fenderSpan, 0.035, 3, 10),
      mats.body,
    );
    fFender.position.set(side * (width * 0.38), cabBaseY + hoodTopH * 0.42, cabZ + ch - 0.04 - fenderSpan * 0.5);
    group.add(fFender);

    const fFlare = new THREE.Mesh(
      new THREE.TorusGeometry(g.wheelRadius * 1.16, 0.052, 8, 18, Math.PI),
      mats.trim,
    );
    fFlare.rotation.y = Math.PI / 2;
    fFlare.position.set(side * (width * 0.47), g.wheelRadius * 0.98, frontAxleZ);
    group.add(fFlare);

    // Structural A-pillars framing the open windshield bay
    group.add(
      makeStrutBetween(
        new THREE.Vector3(side * (width * 0.44), wsBotY - 0.02, wsBotZ),
        new THREE.Vector3(side * (width * 0.42), wsTopY, wsTopZ),
        0.042,
        0.046,
        mats.body,
        10,
      ),
    );

    // Chrome external cowl air breather canisters (classic heavy truck detail!)
    if (!cityMode) {
      const breather = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.44, 14),
        useChrome ? mats.chrome : mats.trim,
      );
      breather.position.set(side * (width * 0.465), cabBaseY + hoodTopH * 0.88, fDoorHingeZ + 0.10);
      group.add(breather);

      const hoodBadge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.04, noseLen * 0.65), mats.chrome);
      hoodBadge.position.set(side * (width * 0.38), cabBaseY + hoodTopH * 0.68, cabZ + ch - noseLen * 0.5);
      group.add(hoodBadge);
    }

    // Rear cab corner pillar / sleeper flank sealing behind cab doors
    const sleeperRearZ = cabZ - ch;
    const doorEndZ = isFire ? fDoorHingeZ - doorLen * 1.96 - 0.06 : fDoorHingeZ - doorLen;
    const rearFlankSpan = Math.max(0.16, doorEndZ - sleeperRearZ);
    const flank = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.14, cabH * 0.94, rearFlankSpan, 0.03, 2, 8),
      mats.body,
    );
    flank.position.set(side * (width * 0.495 - width * 0.07), cabBaseY + cabH * 0.48, sleeperRearZ + rearFlankSpan * 0.5);
    group.add(flank);
  });

  // Lower black rubber cowl gasket + Tapered Trapezoidal Windshield + Center Divider + Wipers
  const cowlGasket = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.84, 0.055, 0.09, 0.015, 2, 6),
    mats.trim,
  );
  cowlGasket.position.set(0, wsBotY - 0.01, wsBotZ);
  group.add(cowlGasket);

  const wsLen = Math.hypot(wsTopY - wsBotY, wsBotZ - wsTopZ);
  const wsAngle = Math.atan2(wsBotZ - wsTopZ, wsTopY - wsBotY);

  const ws = new THREE.Mesh(
    createTrapezoidGlassGeo(width * 0.82, width * 0.78, wsLen * 0.96, 0.024),
    mats.glass,
  );
  ws.position.set(0, (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5 + 0.006);
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, 'Para-brisa da Cabine', 0, 0.35, 0.55);
  group.add(ws);

  // Side & upper windshield rubber seals framing glass cleanly inside A-pillars
  [-1, 1].forEach((side) => {
    group.add(
      makeStrutBetween(
        new THREE.Vector3(side * (width * 0.415), wsBotY, wsBotZ),
        new THREE.Vector3(side * (width * 0.395), wsTopY - 0.01, wsTopZ),
        0.022,
        0.022,
        mats.trim,
        6,
      ),
    );
  });

  const wsDivider = new THREE.Mesh(new THREE.BoxGeometry(0.036, wsLen * 0.94, 0.032), mats.trim);
  wsDivider.position.copy(ws.position);
  wsDivider.rotation.x = -wsAngle;
  group.add(wsDivider);

  [-0.20, 0.20].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.025), mats.trim);
    wiper.position.set(wx * width, wsBotY + 0.03, wsBotZ + 0.015);
    wiper.rotation.z = 0.08;
    group.add(wiper);
  });

  const visor = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.88, 0.08, 0.22, 0.02, 2, 8),
    useChrome ? mats.chrome : mats.secondary,
  );
  visor.position.set(0, wsTopY + 0.04, wsTopZ + 0.08);
  visor.rotation.x = 0.22;
  group.add(visor);

  for (let m = -2; m <= 2; m++) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.06), mats.amberSignal);
    marker.position.set(m * (width * 0.16), cabBaseY + cabH + 0.02, wsTopZ - 0.06);
    group.add(marker);
  }

  // Full Hollowed Heavy Truck Cockpit Interior (wraparound dash, gauges, air-ride seats, shifter, sleeper/crew)
  const cabCockpitFrontZ = cabZ + noseStartZ - 0.06;
  const cabCockpitRearZ = cabZ - ch + cabWallThick + 0.02;
  const cabCockpitDepth = Math.max(1.0, cabCockpitFrontZ - cabCockpitRearZ);
  const cabInt = buildHeavyCabinInterior({
    cabWidth: width * 0.82,
    cabDepth: cabCockpitDepth,
    cabHeight: cabH - cabFloorH - 0.11,
    dashTopY: hoodTopH - cabFloorH + 0.02,
    seatsCount: isFire ? 4 : 2,
    isSemi,
    hasRearWindow: !isSemi,
    wsSlopeInset: Math.max(0, wsBotZ - wsTopZ),
    mats,
    cityMode,
    animated,
  });
  cabInt.position.set(0, cabBaseY + cabFloorH, (cabCockpitFrontZ + cabCockpitRearZ) * 0.5);
  group.add(cabInt);

  // Semi-truck Aerodynamic Sleeper Deflector + Air Horns + Openable Hood Engine
  if (isSemi) {
    const deflShape = new THREE.Shape();
    const dLen = cabLen * 0.62;
    deflShape.moveTo(-dLen * 0.5, 0);
    deflShape.lineTo(dLen * 0.5, 0);
    deflShape.quadraticCurveTo(dLen * 0.12, 0.38, -dLen * 0.5, 0.48);
    deflShape.closePath();
    const deflGeo = createExtrudedProfile(deflShape, width * 0.88, 0.04, 0.04, 3, 14);
    const defl = new THREE.Mesh(deflGeo, mats.body);
    defl.position.set(0, cabBaseY + cabH - 0.02, cabZ - ch * 0.26);
    tagPart(defl, 'Defletor Aerodinâmico de Teto', 0, 0.75, 0);
    group.add(defl);

    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.018, 0.44, 12), mats.chrome);
      horn.rotation.x = Math.PI / 2;
      horn.position.set(side * (width * 0.24), cabBaseY + cabH + 0.05, cabZ + ch * 0.12);
      group.add(horn);

      const slpGasket = new THREE.Mesh(
        createRoundedBoxGeo(0.026, cabH * 0.27, cabLen * 0.20, 0.02, 2, 6),
        mats.trim,
      );
      slpGasket.position.set(side * (width * 0.490), cabBaseY + cabH * 0.66, cabZ - ch * 0.52);
      const slpWin = new THREE.Mesh(
        createRoundedBoxGeo(0.032, cabH * 0.22, cabLen * 0.17, 0.02, 2, 6),
        mats.glass,
      );
      slpWin.position.set(side * (width * 0.494), cabBaseY + cabH * 0.66, cabZ - ch * 0.52);
      slpWin.userData.noShadow = true;
      slpWin.renderOrder = 2;
      group.add(slpGasket, slpWin);
    });

    if (!cityMode) {
      const dieselBay = createEngineBayAssembly(width * 0.54, noseLen * 0.85, mats, false);
      dieselBay.position.set(0, cabBaseY + hoodTopH * 0.58, cabZ + ch - noseLen * 0.5);
      group.add(dieselBay);

      const hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, cabBaseY + hoodTopH * 0.88, cabZ + noseStartZ);
      const hoodTop = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.76, 0.09, noseLen * 0.92, 0.035, 3, 10),
        mats.body,
      );
      hoodTop.position.set(0, 0.02, noseLen * 0.46);
      hoodTop.rotation.x = 0.06;
      hoodPivot.add(hoodTop);
      tagPart(hoodPivot, 'Capô Basculante do Motor Diesel', 0, 0.4, 0.45);
      group.add(hoodPivot);
      registerOpenable(animated, hoodPivot, 'Capô Caminhão', { x: -0.66 });
    }
  }

  // Flush Articulated Cab Doors + 3-Step Ladder + Grab Handles + Dual Truck Mirrors + Fuel Tanks + Stacks
  const doorHingeXAbs = width * 0.495 - 0.034;
  [-1, 1].forEach((s) => {
    const side = s as -1 | 1;

    [0.04, 0.22, 0.40].forEach((sy) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.038, 0.58), mats.alloy);
      step.position.set(side * (width * 0.46), cabBaseY + sy - 0.22, fDoorHingeZ - doorLen * 0.45);
      group.add(step);
    });
    const grab = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 8), mats.chrome);
    grab.position.set(side * (width * 0.502), cabBaseY + hoodTopH + 0.16, fDoorHingeZ - doorLen - 0.03);
    group.add(grab);

    if (!cityMode) {
      const cabTopShift = Math.max(0.065, doorHingeXAbs - width * 0.435);
      const fDoor = createSideDoorGroup(
        {
          side,
          hingeX: side * doorHingeXAbs,
          hingeY: cabBaseY + hoodTopH + 0.02,
          hingeZ: fDoorHingeZ,
          doorLen,
          doorHeight: hoodTopH * 0.88,
          glassHeight: Math.max(0.32, wsTopY - wsBotY - 0.02),
          glassTopZInsetFront: (wsBotZ - wsTopZ) * 0.65,
          glassTopZInsetRear: 0.04,
          topInwardShift: cabTopShift,
          hasMirror: false,
          isScissor: false,
          isRearDoor: false,
          label: side < 0 ? 'Porta Cabine Esquerda' : 'Porta Cabine Direita',
        },
        mats,
        animated,
        cityMode,
      );
      const mir = createTruckDualMirror(side, mats, cityMode);
      mir.position.set(side * 0.035, 0.16, -0.10);
      fDoor.add(mir);
      group.add(fDoor);

      if (isFire) {
        const crewDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: cabBaseY + hoodTopH + 0.02,
            hingeZ: fDoorHingeZ - doorLen - 0.05,
            doorLen: doorLen * 0.90,
            doorHeight: hoodTopH * 0.88,
            glassHeight: Math.max(0.32, wsTopY - wsBotY - 0.02),
            glassTopZInsetFront: 0.04,
            glassTopZInsetRear: 0.04,
            topInwardShift: cabTopShift,
            hasMirror: false,
            isScissor: false,
            isRearDoor: true,
            label: side < 0 ? 'Porta Guarnição Esquerda' : 'Porta Guarnição Direita',
          },
          mats,
          animated,
          cityMode,
        );
        group.add(crewDoor);
      }
    }

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, length * 0.20, cityMode ? 12 : 22),
      mats.chrome,
    );
    tank.rotation.x = Math.PI / 2;
    tank.position.set(side * (width * 0.39), frameY + 0.08, cabZ - ch - 0.45);
    tagPart(tank, 'Tanque de Diesel com Cintas', side * 0.4, -0.1, 0);
    group.add(tank);

    [-0.25, 0.25].forEach((tz) => {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.015, 6, 18), mats.trim);
      strap.position.set(side * (width * 0.39), frameY + 0.08, cabZ - ch - 0.45 + tz);
      group.add(strap);
    });

    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.072, cabH * 0.96, cityMode ? 10 : 16),
      mats.chrome,
    );
    stack.position.set(side * (width * 0.46), cabBaseY + cabH * 0.64, cabZ - ch + 0.04);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092, 0.092, cabH * 0.58, 14, 1, true, 0, Math.PI * 1.4),
      mats.alloy,
    );
    shield.position.copy(stack.position);
    tagPart(stack, 'Chaminé de Escape com Protetor', side * 0.45, 0.3, 0);
    group.add(stack, shield);
  });

  // 3. Specialized Heavy Superstructure Behind Cab
  const rearLen = length * g.rearDeckRatio;
  const rearZ = -halfL + rearLen * 0.5 + 0.12;

  if (isSemi) {
    // Aluminum Catwalk Deck Plate + Stanchion + Coiled Air Lines + 5th-Wheel Jaws
    const catwalk = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.58, 0.04, 0.72, 0.015, 2, 6),
      mats.alloy,
    );
    catwalk.position.set(0, frameY + 0.13, cabZ - ch - 0.40);
    group.add(catwalk);

    const fifth = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.11, 24), mats.trim);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.48), mats.grille);
    slot.position.z = -0.22;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.04), mats.chrome);
    handle.position.set(0.45, 0, 0);
    fifth.add(plate, slot, handle);
    fifth.position.set(0, frameY + 0.16, rearZ + 0.15);
    tagPart(fifth, 'Quinta-Roda de Engate Pesado', 0, 0.25, -0.4);
    group.add(fifth);

    [-0.14, 0.14].forEach((hx, idx) => {
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(hx, cabBaseY + 0.95, cabZ - ch - 0.02),
        new THREE.Vector3(hx * 1.4, cabBaseY + 0.55, cabZ - ch - 0.28),
        new THREE.Vector3(hx, frameY + 0.24, cabZ - ch - 0.42),
      ]);
      const hose = new THREE.Mesh(
        new THREE.TubeGeometry(hoseCurve, 14, 0.024, 8, false),
        idx === 0 ? mats.sirenRed : mats.sirenBlue,
      );
      group.add(hose);
    });
  } else if (isDump) {
    // Hollowed 5-Wall Ribbed Heavy Steel Dump Bed + Cab Canopy Visor + Telescopic Hoist + Hinged Tailgate
    const bedPivot = new THREE.Group();
    bedPivot.position.set(0, frameY + 0.26, -halfL + 0.55);
    const bedH = height * 0.42;
    const bedW = width * 0.96;
    const bedLocalZ = rearLen * 0.5 - 0.42;

    const bedFloor = new THREE.Mesh(createRoundedBoxGeo(bedW, 0.12, rearLen, 0.03, 2, 8), mats.secondary);
    bedFloor.position.set(0, 0.06, bedLocalZ);
    bedPivot.add(bedFloor);

    [-1, 1].forEach((side) => {
      const wall = new THREE.Mesh(createRoundedBoxGeo(0.11, bedH, rearLen, 0.03, 2, 8), mats.secondary);
      wall.position.set(side * (bedW * 0.46), bedH * 0.5 + 0.06, bedLocalZ);
      bedPivot.add(wall);
      const topRail = new THREE.Mesh(createRoundedBoxGeo(0.16, 0.09, rearLen * 1.01, 0.02, 2, 6), mats.accent);
      topRail.position.set(side * (bedW * 0.46), bedH + 0.08, bedLocalZ);
      bedPivot.add(topRail);
    });

    const frontWall = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.96, bedH, 0.12, 0.03, 2, 8), mats.secondary);
    frontWall.position.set(0, bedH * 0.5 + 0.06, bedLocalZ + rearLen * 0.48);
    bedPivot.add(frontWall);

    const canopyVisor = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.96, 0.09, cabLen * 0.58, 0.025, 2, 8), mats.secondary);
    canopyVisor.position.set(0, bedH + 0.10, bedLocalZ + rearLen * 0.48 + cabLen * 0.24);
    bedPivot.add(canopyVisor);

    for (let i = -2; i <= 2; i++) {
      [-1, 1].forEach((side) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, bedH + 0.04, 0.14), mats.accent);
        rib.position.set(side * (bedW * 0.50), bedH * 0.5 + 0.06, bedLocalZ + i * (rearLen * 0.20));
        bedPivot.add(rib);
      });
    }

    // Multi-stage telescopic chrome hoist cylinder
    const cylBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.72, 14), mats.trim);
    cylBase.rotation.x = 0.35;
    cylBase.position.set(0, 0.22, bedLocalZ + rearLen * 0.34);
    const cylRod = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 1.35, 14), mats.chrome);
    cylRod.rotation.x = 0.35;
    cylRod.position.set(0, 0.42, bedLocalZ + rearLen * 0.30);
    bedPivot.add(cylBase, cylRod);

    const tailgate = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.88, bedH * 0.92, 0.09, 0.02, 2, 6), mats.accent);
    tailgate.position.set(0, bedH * 0.48 + 0.06, bedLocalZ - rearLen * 0.48);
    bedPivot.add(tailgate);

    [-1, 1].forEach((side) => {
      const tgHinge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.14), mats.trim);
      tgHinge.position.set(side * (bedW * 0.44), bedH + 0.04, bedLocalZ - rearLen * 0.48);
      bedPivot.add(tgHinge);
    });

    tagPart(bedPivot, 'Caçamba Basculante Nervurada', 0, 0.55, -0.45);
    group.add(bedPivot);
    registerOpenable(animated, bedPivot, 'Basculante Caçamba', { x: -0.46 });
  } else if (isMixer) {
    // High-Poly Mixer Drum with Twin Helical Fins + Hatch + Cradle + Water Tank + Ladder + Chute
    const drumGroup = new THREE.Group();
    const drumPts = [
      new THREE.Vector2(0.06, -rearLen * 0.46),
      new THREE.Vector2(width * 0.35, -rearLen * 0.34),
      new THREE.Vector2(width * 0.47, -rearLen * 0.04),
      new THREE.Vector2(width * 0.44, rearLen * 0.20),
      new THREE.Vector2(width * 0.30, rearLen * 0.40),
      new THREE.Vector2(0.08, rearLen * 0.46),
    ];
    const drumGeo = new THREE.LatheGeometry(drumPts, cityMode ? 18 : 38);
    drumGeo.rotateX(Math.PI / 2);
    drumGroup.add(new THREE.Mesh(drumGeo, mats.secondary));

    const band = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.475, width * 0.475, 0.24, 28), mats.accent);
    band.rotation.x = Math.PI / 2;
    drumGroup.add(band);

    const hatchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.32), mats.trim);
    hatchPlate.position.set(0, width * 0.47, 0);
    drumGroup.add(hatchPlate);

    if (!cityMode) {
      [0, Math.PI].forEach((phase) => {
        const helixPts: THREE.Vector3[] = [];
        const turns = 2.5;
        const steps = 38;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const z = -rearLen * 0.34 + t * (rearLen * 0.72);
          const r = width * (0.34 + Math.sin(t * Math.PI) * 0.14);
          const a = phase + t * turns * Math.PI * 2;
          helixPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
        }
        const helix = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 42, 0.04, 8, false),
          phase === 0 ? mats.liveryStripe : mats.accent,
        );
        drumGroup.add(helix);
      });
    }

    drumGroup.position.set(0, frameY + 1.18, rearZ + 0.14);
    drumGroup.rotation.x = 0.22;
    tagPart(drumGroup, 'Tambor Misturador Helicoidal', 0, 0.65, -0.35);
    group.add(drumGroup);
    animated.mixerDrum = drumGroup;

    const frontPed = new THREE.Mesh(createRoundedBoxGeo(width * 0.46, 1.05, 0.36, 0.04, 2, 8), mats.trim);
    frontPed.position.set(0, frameY + 0.56, rearZ + rearLen * 0.44);
    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, width * 0.74, 16), mats.alloy);
    waterTank.rotation.z = Math.PI / 2;
    waterTank.position.set(0, frameY + 1.28, rearZ + rearLen * 0.46);
    const rearCradle = new THREE.Mesh(createRoundedBoxGeo(width * 0.74, 1.15, 0.28, 0.04, 2, 8), mats.trim);
    rearCradle.position.set(0, frameY + 0.62, rearZ - rearLen * 0.38);
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.22, 0.48, 16), mats.accent);
    hopper.position.set(0, frameY + 1.66, -halfL + 0.28);
    group.add(frontPed, waterTank, rearCradle, hopper);

    // Rear climb ladder with rungs & brackets anchored cleanly onto rearCradle
    const ladderZ = rearZ - rearLen * 0.38 - 0.16;
    [-0.18, 0.18].forEach((lx) => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 8), mats.chrome);
      rail.position.set(lx + width * 0.26, frameY + 0.92, ladderZ);
      group.add(rail);
      [0.35, 1.35].forEach((by) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(lx + width * 0.26, frameY + by, ladderZ),
            new THREE.Vector3(lx + width * 0.26, frameY + by, rearZ - rearLen * 0.38),
            0.016,
            0.016,
            mats.trim,
            6,
          ),
        );
      });
    });
    for (let r = 0; r < 5; r++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), mats.chrome);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(width * 0.26, frameY + 0.32 + r * 0.30, ladderZ);
      group.add(rung);
    }

    const chutePivot = new THREE.Group();
    chutePivot.position.set(0, frameY + 0.85, rearZ - rearLen * 0.38 - 0.10);
    const chuteCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 12), mats.trim);
    chutePivot.add(chuteCollar);
    const chute = new THREE.Mesh(createRoundedBoxGeo(0.36, 0.14, 1.20, 0.02, 2, 6), mats.trim);
    chute.position.set(0, -0.18, -0.54);
    chute.rotation.x = 0.42;
    chutePivot.add(chute);
    tagPart(chutePivot, 'Calha Giratória de Concreto', 0, 0.1, -0.65);
    group.add(chutePivot);
    registerOpenable(animated, chutePivot, 'Calha Betoneira', { y: 0.95 });
  } else if (isFire) {
    const bodyBox = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.96, cabH * 0.74, rearLen, 0.06, 3, 10),
      mats.body,
    );
    bodyBox.position.set(0, frameY + 0.10 + cabH * 0.37, rearZ);
    tagPart(bodyBox, 'Módulo de Bombas e Mangueiras', 0, 0.25, -0.4);
    group.add(bodyBox);

    // Firetruck front grille + rear upper warning strobes (red/blue alternating)
    [-1, 1].forEach((side) => {
      const fStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.075, 0.045),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      fStrobe.position.set(side * (width * 0.14), cabBaseY + hoodTopH * 0.45, cabZ + ch + 0.015);
      const rStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.095, 0.075),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      rStrobe.position.set(side * (width * 0.36), frameY + 0.10 + cabH * 0.76, rearZ - rearLen * 0.48);
      group.add(fStrobe, rStrobe);
    });

    [-1, 1].forEach((side) => {
      const hose = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 10, 20), mats.accent);
      hose.rotation.y = Math.PI / 2;
      hose.position.set(side * (width * 0.44), frameY + 0.10 + cabH * 0.38, rearZ + 0.35);
      group.add(hose);

      const pumpPanel = new THREE.Mesh(new THREE.BoxGeometry(0.055, cabH * 0.38, 0.88), mats.grille);
      pumpPanel.position.set(side * (width * 0.482), frameY + 0.10 + cabH * 0.36, rearZ - 0.65);
      group.add(pumpPanel);

      // Colored pressure dials & brass valve handles on pump panel
      if (!cityMode) {
        [-0.22, 0, 0.22].forEach((pz, pIdx) => {
          const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.065, 10), pIdx === 1 ? mats.sirenBlue : mats.liveryStripe);
          gauge.rotation.z = Math.PI / 2;
          gauge.position.set(side * (width * 0.49), frameY + 0.10 + cabH * 0.44, rearZ - 0.65 + pz);
          group.add(gauge);
        });
      }

      const shutter = new THREE.Mesh(
        createRoundedBoxGeo(0.04, cabH * 0.48, rearLen * 0.78, 0.015, 2, 6),
        mats.alloy,
      );
      shutter.position.set(side * (width * 0.496), frameY + 0.10 + cabH * 0.38, rearZ);
      tagPart(shutter, 'Persiana Lateral de Alumínio', side * 0.35, 0.25, -0.4);
      group.add(shutter);
      registerOpenable(animated, shutter, 'Persianas Bombeiro', {}, new THREE.Vector3(0, cabH * 0.40, 0));

      const jack = new THREE.Mesh(createRoundedBoxGeo(0.22, 0.34, 0.22, 0.02, 2, 6), mats.accent);
      jack.position.set(side * (width * 0.44), frameY - 0.08, rearZ - rearLen * 0.44);
      group.add(jack);
    });

    const ladder = new THREE.Group();
    ladder.add(new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.62, 0.34, 20), mats.trim));
    [-0.25, 0.25].forEach((lx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.24, length * 0.68), mats.alloy);
      rail.position.set(lx, 0.24, length * 0.14);
      ladder.add(rail);
    });
    for (let i = -7; i <= 7; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.50, 8), mats.alloy);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.24, length * 0.14 + i * 0.34);
      ladder.add(rung);
    }
    const basket = new THREE.Mesh(createRoundedBoxGeo(0.80, 0.48, 0.58, 0.04, 2, 8), mats.accent);
    basket.position.set(0, 0.36, length * 0.48);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.44, 10), mats.chrome);
    cannon.rotation.x = Math.PI / 3;
    cannon.position.set(0, 0.60, length * 0.50);
    ladder.add(basket, cannon);
    ladder.position.set(0, frameY + 0.16 + cabH * 0.74, rearZ);
    ladder.rotation.x = -0.14;
    tagPart(ladder, 'Escada Magirus com Canhão', 0, 0.85, -0.2);
    group.add(ladder);
    registerOpenable(animated, ladder, 'Escada Magirus', { x: -0.38, y: 0.42 });
  } else if (isTow) {
    const pylon = new THREE.Mesh(createRoundedBoxGeo(width * 0.88, 0.98, 0.24, 0.04, 2, 8), mats.accent);
    pylon.position.set(0, frameY + 0.56, rearZ + rearLen * 0.45);
    const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.56, 14), mats.chrome);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, frameY + 0.44, rearZ + rearLen * 0.34);
    tagPart(pylon, 'Torre do Guincho com Carretel', 0, 0.45, -0.2);
    group.add(pylon, winchDrum);

    [-0.28, 0.28].forEach((wx) => {
      const workLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.06), mats.headlight);
      workLamp.position.set(wx * width, frameY + 0.96, rearZ + rearLen * 0.45 - 0.11);
      group.add(workLamp);
    });

    const deckPivot = new THREE.Group();
    deckPivot.position.set(0, frameY + 0.20, -halfL + 0.85);
    const deck = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.96, 0.14, rearLen, 0.03, 2, 8),
      mats.secondary,
    );
    deck.position.set(0, 0.08, rearLen * 0.5 - 0.72);
    deckPivot.add(deck);
    [-1, 1].forEach((side) => {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, rearLen * 0.96), mats.accent);
      sideRail.position.set(side * (width * 0.46), 0.18, rearLen * 0.5 - 0.72);
      deckPivot.add(sideRail);
    });
    const ramp = new THREE.Mesh(createRoundedBoxGeo(width * 0.92, 0.08, 0.58, 0.02, 2, 6), mats.alloy);
    ramp.position.set(0, 0.04, -0.78);
    ramp.rotation.x = 0.24;
    deckPivot.add(ramp);
    tagPart(deckPivot, 'Plataforma Rollback Hidráulica', 0, 0.35, -0.45);
    group.add(deckPivot);
    registerOpenable(animated, deckPivot, 'Plataforma Rollback', { x: -0.26 }, new THREE.Vector3(0, 0.12, -0.65));

    const stinger = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.09, 0.68), mats.trim);
    stinger.position.set(0, frameY - 0.05, -halfL - 0.14);
    group.add(stinger);
  }

  // 4. Heavy Axles + Dual Rear Wheels + Rear Fenders & Mudflaps + Drivetrain
  const rearAxleZs = isTow
    ? [rearZ - rearLen * 0.12]
    : [rearZ - rearLen * 0.08, rearZ - rearLen * 0.34];
  const axles = [{ z: frontAxleZ, dual: false }, ...rearAxleZs.map((z) => ({ z, dual: true }))];

  axles.forEach((ax, idx) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, ax.dual, cityMode);
      if (idx === 0) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        steerPivot.add(w);
        tagPart(steerPivot, `Conjunto Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
      } else {
        w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        tagPart(w, `Conjunto Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, frameY, frontAxleZ, rearAxleZs[0], mats, cityMode);
  addDualRearFendersAndMudflaps(group, width, g.wheelRadius, rearAxleZs, mats, cityMode);
  // Front face of cab sits at cabZ + noseLocalEnd + noseFrontBevel = halfL - 0.08 - 0.015 = halfL - 0.095 -> place fascia clearly proud!
  addHeavyBumperAndLights(group, width, g.groundClearance, cabZ + ch - 0.01, -halfL + 0.04, mats, useChrome, false, false, cabBaseY + hoodTopH * 0.45, animated);

  if (g.attachments.includes('lightbar_police') || g.attachments.includes('lightbar_amber')) {
    const isPolice = g.attachments.includes('lightbar_police');
    const lb = new THREE.Group();
    const lbW = Math.min(1.42, width * 0.62);
    lb.add(new THREE.Mesh(createRoundedBoxGeo(lbW, 0.06, 0.22, 0.02, 2, 8), mats.trim));
    if (isPolice) {
      const lPod = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.025, 2, 8), mats.sirenRed);
      lPod.position.set(-lbW * 0.25, 0.03, 0);
      const rPod = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.025, 2, 8), mats.sirenBlue);
      rPod.position.set(lbW * 0.25, 0.03, 0);
      lb.add(lPod, rPod);
    } else {
      const aPod = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.88, 0.09, 0.2, 0.025, 2, 8), mats.sirenAmber);
      aPod.position.y = 0.03;
      lb.add(aPod);
    }
    lb.position.set(0, cabBaseY + cabH + 0.05, cabZ + ch * 0.22);
    tagPart(lb, isPolice ? 'Giroflex Bombeiros LED' : 'Barra Sinalizadora Âmbar', 0, 0.6, 0);
    group.add(lb);
  }

  enableShadows(group);
  return group;
}

// =========================================================================
// 3. COMMERCIAL VANS, AMBULANCE, FOOD TRUCK, SWEEPER & ARMORED TACTICAL
// =========================================================================
export function buildVanOrArmoredVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  wheelStyle: WheelStyle,
  cityMode: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;
  const frontWheelZ = wheelbase * 0.5;
  const rearWheelZ = -wheelbase * 0.5;
  const isArmored = g.archetype === 'armored';
  const isAmbulance = g.archetype === 'ambulance';
  const isSweeper = g.attachments.includes('sweeper_brushes');
  const isFoodTruck = g.attachments.includes('food_awning');
  const useChrome = v.palette.trim === 'chrome';

  const archR = g.wheelRadius * 1.15;
  const hoodH = (height - g.groundClearance) * (isSweeper ? 0.30 : isArmored ? 0.52 : 0.40);
  const beltY = g.groundClearance + hoodH;
  const hoodZ = halfL - (isSweeper ? 0.26 : isArmored ? 0.95 : 0.52);
  const wsTopZ = hoodZ - (isSweeper ? 0.16 : isArmored ? 0.42 : 0.38);
  const cabTopY = height - (isAmbulance ? 0.16 : g.attachments.includes('bus_ac') ? 0.14 : 0.08);
  const windowH = cabTopY - beltY;
  const cabRearZ = wsTopZ - (isArmored ? 0.85 : 0.70);

  // 1. Sculpted Sloped Cab Nose + Open Windshield Greenhouse (ZERO solid metal burying windshield/grille, ZERO boxy fender ears!)
  const noseFrontBevel = 0.04;
  const noseFrontPt = halfL - noseFrontBevel - 0.015; // extruded outer nose lands cleanly at halfL - 0.015
  const noseStartY = g.groundClearance + hoodH * 0.66;

  const cabFloorY = g.groundClearance + 0.20;

  // 1a. Hollowed cab chassis floor pan + sloped engine nose (drops cleanly to cabFloorY inside cab!)
  const cabLowerShape = new THREE.Shape();
  cabLowerShape.moveTo(cabRearZ, g.groundClearance);
  const fStart = Math.max(cabRearZ + 0.06, frontWheelZ - archR);
  const fEnd = Math.min(noseFrontPt - 0.10, frontWheelZ + archR);
  if (fEnd > fStart + 0.1) {
    cabLowerShape.lineTo(fStart, g.groundClearance);
    cabLowerShape.absarc(frontWheelZ, g.groundClearance + archR * 0.15, archR, Math.PI, 0, true);
    cabLowerShape.lineTo(fEnd, g.groundClearance);
  }
  cabLowerShape.lineTo(noseFrontPt - 0.03, g.groundClearance + 0.06);
  cabLowerShape.lineTo(noseFrontPt, noseStartY);
  cabLowerShape.lineTo(hoodZ, beltY - 0.03);
  cabLowerShape.lineTo(hoodZ - 0.05, cabFloorY);
  cabLowerShape.lineTo(cabRearZ, cabFloorY);
  cabLowerShape.closePath();

  const cabLowerGeo = createExtrudedProfile(
    cabLowerShape,
    cityMode ? width : width * 0.84,
    noseFrontBevel,
    noseFrontBevel,
    cityMode ? 2 : 4,
    cityMode ? 10 : 18,
  );
  const cabLowerMesh = new THREE.Mesh(cabLowerGeo, mats.body);
  tagPart(
    cabLowerMesh,
    isArmored
      ? 'Cabine Frontal Blindada'
      : isAmbulance
        ? 'Cabine Avançada SAMU'
        : isSweeper
          ? 'Cabine Panorâmica'
          : 'Cabine Dianteira Furgão',
    0,
    0.15,
    0.2,
  );
  group.add(cabLowerMesh);

  // 1b. Upper Cab Roof Cap & Back Bulkhead behind wsTopZ (open front windshield bay!)
  const cabRoofCap = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.90, 0.11, Math.max(0.32, wsTopZ - cabRearZ + 0.06), 0.035, 3, 10),
    mats.body,
  );
  cabRoofCap.position.set(0, cabTopY - 0.055, (wsTopZ + cabRearZ) * 0.5);
  group.add(cabRoofCap);

  // 1c. Contoured Front Wheel Fenders matching the exact sloped hood profile (NO protruding boxy corner ears!)
  const fFenderStart = Math.max(cabRearZ + 0.04, frontWheelZ - archR);
  const fFenderShape = new THREE.Shape();
  fFenderShape.moveTo(hoodZ - 0.04, g.groundClearance + 0.10);
  fFenderShape.lineTo(fFenderStart, g.groundClearance);
  if (fEnd > fFenderStart + 0.1) {
    fFenderShape.absarc(frontWheelZ, g.groundClearance + archR * 0.15, archR, Math.PI, 0, true);
    fFenderShape.lineTo(fEnd, g.groundClearance);
  }
  fFenderShape.lineTo(noseFrontPt - 0.03, g.groundClearance + 0.06);
  fFenderShape.lineTo(noseFrontPt, noseStartY);
  fFenderShape.lineTo(hoodZ - 0.02, beltY - 0.03);
  fFenderShape.closePath();

  const fFenderGeo = createExtrudedProfile(
    fFenderShape,
    width * 0.135,
    0.032,
    0.032,
    cityMode ? 2 : 3,
    cityMode ? 8 : 14,
  );
  [-1, 1].forEach((side) => {
    const fFender = new THREE.Mesh(fFenderGeo, mats.body);
    fFender.position.x = side * (width * 0.495 - width * 0.068 - 0.032);
    group.add(fFender);

    // Flared front & rear wheel arch moldings (TurboSquid 80s van / ambulance detail!)
    [frontWheelZ, rearWheelZ].forEach((wz) => {
      const flare = new THREE.Mesh(
        new THREE.TorusGeometry(archR * 0.99, 0.042, 8, 18, Math.PI),
        mats.trim,
      );
      flare.rotation.y = Math.PI / 2;
      flare.position.set(side * (width * 0.494), g.groundClearance + archR * 0.15, wz);
      group.add(flare);
    });

    // Front A-pillar connecting hood corner cleanly to roof corner
    group.add(
      makeStrutBetween(
        new THREE.Vector3(side * (width * 0.468), beltY - 0.01, hoodZ - 0.01),
        new THREE.Vector3(side * (width * 0.438), cabTopY - 0.04, wsTopZ),
        0.040,
        0.046,
        mats.body,
        10,
      ),
    );
  });

  // 1d. Lower Black Cowl Vent & Upper Brow Header framing the Open Windshield
  const cowlVent = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.86, 0.06, 0.11, 0.015, 2, 6),
    mats.trim,
  );
  cowlVent.position.set(0, beltY - 0.01, hoodZ + 0.01);
  group.add(cowlVent);

  const upperBrow = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.88, 0.085, 0.12, 0.02, 2, 8),
    mats.body,
  );
  upperBrow.position.set(0, cabTopY - 0.055, wsTopZ);
  group.add(upperBrow);

  // Full Hollowed Van / Food Truck / Ambulance / Armored Cab Cockpit
  const vanCabFrontZ = hoodZ - 0.05;
  const vanCabDepth = Math.max(0.95, vanCabFrontZ - cabRearZ);
  const cabInt = buildHeavyCabinInterior({
    cabWidth: width * 0.82,
    cabDepth: vanCabDepth,
    cabHeight: cabTopY - cabFloorY - 0.08,
    dashTopY: Math.max(0.58, beltY - cabFloorY + 0.02),
    seatsCount: 2,
    isVan: true,
    hasWalkthrough: !isArmored && !isSweeper,
    wsSlopeInset: Math.max(0, hoodZ - wsTopZ),
    mats,
    cityMode,
    animated,
  });
  cabInt.position.set(0, cabFloorY, (vanCabFrontZ + cabRearZ) * 0.5);
  group.add(cabInt);

  // Hollowed Rear Cargo / Medical / Tactical / Hopper Bay
  const cargoLen = Math.max(0.9, cabRearZ - (-halfL + 0.04));
  const cargoCenterZ = (-halfL + 0.04 + cabRearZ) * 0.5;
  const wallT = 0.095;
  const bayFloorY = g.groundClearance + 0.12;
  const bayFloor = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.96, 0.12, cargoLen, 0.025, 2, 8),
    mats.trim,
  );
  bayFloor.position.set(0, bayFloorY - 0.04, cargoCenterZ);
  group.add(bayFloor);

  const boxRoofY = isAmbulance ? cabTopY + 0.14 : cabTopY;
  const bayRoof = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.99, 0.12, cargoLen + 0.06, 0.04, 3, 10),
    mats.body,
  );
  bayRoof.position.set(0, boxRoofY - 0.05, cargoCenterZ);
  group.add(bayRoof);

  const wallH = boxRoofY - bayFloorY;
  const fDoorLen = Math.min(1.02, Math.max(0.72, hoodZ - cabRearZ - 0.04));
  const fDoorHingeZ = hoodZ - 0.04;
  const doorRearEdgeZ = fDoorHingeZ - fDoorLen;

  [-1, 1].forEach((side) => {
    if (side > 0 && isFoodTruck && !cityMode) {
      // Food Truck curb-side wall with real serving window cutout matching hinged awning hatch
      const hatchHalfZ = length * 0.22;
      const hatchFrontZ = Math.min(cabRearZ + 0.02, -0.2 + hatchHalfZ);
      const hatchRearZ = Math.max(-halfL + 0.06, -0.2 - hatchHalfZ);
      const sillTopY = beltY - 0.04;
      const headerBotY = cabTopY - 0.22;
      const wallX = width * 0.5 - wallT * 0.5;

      const lowerSkirtH = Math.max(0.24, sillTopY - bayFloorY + 0.02);
      const lowerSkirt = new THREE.Mesh(
        createRoundedBoxGeo(wallT, lowerSkirtH, cargoLen + 0.06, 0.03, 2, 8),
        mats.body,
      );
      lowerSkirt.position.set(wallX, bayFloorY + lowerSkirtH * 0.5 - 0.02, cargoCenterZ);
      group.add(lowerSkirt);

      const upperHeaderH = Math.max(0.14, boxRoofY - headerBotY);
      const upperHeader = new THREE.Mesh(
        createRoundedBoxGeo(wallT, upperHeaderH, cargoLen + 0.06, 0.03, 2, 8),
        mats.body,
      );
      upperHeader.position.set(wallX, boxRoofY - upperHeaderH * 0.5, cargoCenterZ);
      group.add(upperHeader);

      const frontColLen = cabRearZ + 0.03 - hatchFrontZ;
      if (frontColLen > 0.06) {
        const fCol = new THREE.Mesh(
          createRoundedBoxGeo(wallT, wallH, frontColLen, 0.03, 2, 8),
          mats.body,
        );
        fCol.position.set(wallX, bayFloorY + wallH * 0.5 - 0.02, (cabRearZ + 0.03 + hatchFrontZ) * 0.5);
        group.add(fCol);
      }
      const rearColLen = hatchRearZ - (-halfL + 0.01);
      if (rearColLen > 0.06) {
        const rCol = new THREE.Mesh(
          createRoundedBoxGeo(wallT, wallH, rearColLen, 0.03, 2, 8),
          mats.body,
        );
        rCol.position.set(wallX, bayFloorY + wallH * 0.5 - 0.02, (hatchRearZ + (-halfL + 0.01)) * 0.5);
        group.add(rCol);
      }
    } else {
      const wall = new THREE.Mesh(
        createRoundedBoxGeo(wallT, wallH, cargoLen + 0.06, 0.03, 2, 8),
        mats.body,
      );
      wall.position.set(side * (width * 0.5 - wallT * 0.5), bayFloorY + wallH * 0.5 - 0.02, cargoCenterZ);
      tagPart(
        wall,
        isArmored ? 'Blindagem Lateral Balística' : isAmbulance ? 'Parede Módulo Médico' : 'Lateral Baú Furgão',
        side * 0.35,
        0.15,
        -0.2,
      );
      group.add(wall);
    }

    // Side B-pillar cheek sealing space between cab door rear edge & cargo wall
    if (doorRearEdgeZ > cabRearZ + 0.02) {
      const span = doorRearEdgeZ - cabRearZ;
      const bCheek = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.12, wallH, span + 0.04, 0.02, 2, 8),
        mats.body,
      );
      bCheek.position.set(side * (width * 0.495 - width * 0.06), bayFloorY + wallH * 0.5 - 0.02, (doorRearEdgeZ + cabRearZ) * 0.5);
      group.add(bCheek);
    }

    if (isArmored) {
      for (let gp = -1; gp <= 1; gp += 2) {
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.24), mats.grille);
        port.position.set(side * (width * 0.502), beltY + 0.18, cargoCenterZ + gp * 0.65);
        group.add(port);
      }
      // Bolted ballistic applique armor panel + side running board
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.026, wallH * 0.65, cargoLen * 0.82), mats.secondary);
      plate.position.set(side * (width * 0.502), bayFloorY + wallH * 0.48, cargoCenterZ);
      const stepBar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, length * 0.48), mats.trim);
      stepBar.position.set(side * (width * 0.48), g.groundClearance + 0.08, 0.1);
      group.add(plate, stepBar);
    }
  });

  // Interior Role-Specific Equipment
  if (!cityMode) {
    if (isAmbulance) {
      const stretcherFrame = new THREE.Mesh(
        createRoundedBoxGeo(0.62, 0.10, cargoLen * 0.72, 0.02, 2, 6),
        mats.chrome,
      );
      stretcherFrame.position.set(-width * 0.14, bayFloorY + 0.34, cargoCenterZ);
      [-0.24, 0.24].forEach((lx) => {
        [-cargoLen * 0.26, cargoLen * 0.26].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8), mats.chrome);
          leg.position.set(-width * 0.14 + lx, bayFloorY + 0.17, cargoCenterZ + lz);
          group.add(leg);
        });
      });
      const mattress = new THREE.Mesh(
        createRoundedBoxGeo(0.56, 0.12, cargoLen * 0.68, 0.03, 2, 6),
        mats.accent,
      );
      mattress.position.set(-width * 0.14, bayFloorY + 0.44, cargoCenterZ);
      const medCabinet = new THREE.Mesh(
        createRoundedBoxGeo(0.32, wallH * 0.72, cargoLen * 0.76, 0.02, 2, 6),
        mats.secondary,
      );
      medCabinet.position.set(width * 0.28, bayFloorY + wallH * 0.36, cargoCenterZ);
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.12), mats.sirenBlue);
      monitor.position.set(width * 0.24, bayFloorY + wallH * 0.56, cargoCenterZ + 0.25);
      const squadBench = new THREE.Mesh(
        createRoundedBoxGeo(0.30, 0.34, cargoLen * 0.52, 0.02, 2, 6),
        mats.interior,
      );
      squadBench.position.set(width * 0.24, bayFloorY + 0.17, cargoCenterZ - 0.15);
      const oxyTank = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 10), mats.sirenBlue);
      oxyTank.position.set(width * 0.18, bayFloorY + 0.34, cabRearZ - 0.28);
      const grabRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, cargoLen * 0.68, 8),
        mats.chrome,
      );
      grabRail.rotation.x = Math.PI / 2;
      grabRail.position.set(0, boxRoofY - 0.16, cargoCenterZ);
      group.add(stretcherFrame, mattress, medCabinet, monitor, squadBench, oxyTank, grabRail);
    } else if (isArmored) {
      [-1, 1].forEach((side) => {
        const bench = new THREE.Mesh(
          createRoundedBoxGeo(0.36, 0.12, cargoLen * 0.76, 0.02, 2, 6),
          mats.interior,
        );
        bench.position.set(side * (width * 0.28), bayFloorY + 0.36, cargoCenterZ);
        const backPad = new THREE.Mesh(
          createRoundedBoxGeo(0.08, 0.38, cargoLen * 0.74, 0.02, 2, 6),
          mats.interior,
        );
        backPad.position.set(side * (width * 0.39), bayFloorY + 0.60, cargoCenterZ);
        group.add(bench, backPad);
      });
      const gearRack = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.54, wallH * 0.62, 0.14, 0.02, 2, 6),
        mats.trim,
      );
      gearRack.position.set(0, bayFloorY + wallH * 0.34, cabRearZ - 0.10);
      group.add(gearRack);
    } else if (isFoodTruck) {
      // Full Gourmet Kitchen Interior: Stainless Cooking Line, Exhaust Hood, Serving Counter & POS
      const stoveBase = new THREE.Mesh(
        createRoundedBoxGeo(0.50, 0.78, cargoLen * 0.80, 0.02, 2, 6),
        mats.chrome,
      );
      stoveBase.position.set(-width * 0.24, bayFloorY + 0.39, cargoCenterZ);
      const griddleTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.05, cargoLen * 0.36),
        mats.grille,
      );
      griddleTop.position.set(-width * 0.23, bayFloorY + 0.80, cargoCenterZ + cargoLen * 0.14);
      const rangeHood = new THREE.Mesh(
        createRoundedBoxGeo(0.54, 0.20, cargoLen * 0.72, 0.02, 2, 6),
        mats.alloy,
      );
      rangeHood.position.set(-width * 0.23, boxRoofY - 0.26, cargoCenterZ);

      const servingCounter = new THREE.Mesh(
        createRoundedBoxGeo(0.42, 0.76, cargoLen * 0.78, 0.02, 2, 6),
        mats.secondary,
      );
      servingCounter.position.set(width * 0.25, bayFloorY + 0.38, cargoCenterZ);
      const counterTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.04, cargoLen * 0.78),
        mats.chrome,
      );
      counterTop.position.set(width * 0.25, bayFloorY + 0.78, cargoCenterZ);
      const posScreen = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.18), mats.sirenBlue);
      posScreen.position.set(width * 0.22, bayFloorY + 0.88, cargoCenterZ + 0.26);
      const fridge = new THREE.Mesh(
        createRoundedBoxGeo(0.44, wallH * 0.78, 0.54, 0.02, 2, 6),
        mats.chrome,
      );
      fridge.position.set(-width * 0.24, bayFloorY + wallH * 0.39, -halfL + 0.36);
      const kitchenLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.03, cargoLen * 0.64),
        mats.headlight,
      );
      kitchenLight.position.set(0, boxRoofY - 0.12, cargoCenterZ);
      group.add(stoveBase, griddleTop, rangeHood, servingCounter, counterTop, posScreen, fridge, kitchenLight);
    } else if (!isSweeper) {
      // Courier Van Cargo Shelving Rack + Stacked Parcels + Ceiling Dome Light
      const rack = new THREE.Mesh(
        createRoundedBoxGeo(0.36, wallH * 0.72, cargoLen * 0.78, 0.02, 2, 6),
        mats.alloy,
      );
      rack.position.set(-width * 0.28, bayFloorY + wallH * 0.36, cargoCenterZ);
      group.add(rack);
      [-0.18, 0.22].forEach((cx, idx) => {
        const crate = new THREE.Mesh(
          createRoundedBoxGeo(0.48, 0.44, 0.58, 0.02, 2, 6),
          idx === 0 ? mats.secondary : mats.accent,
        );
        crate.position.set(cx * width, bayFloorY + 0.24, cargoCenterZ - idx * 0.35);
        group.add(crate);
      });
      const dome = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.52), mats.headlight);
      dome.position.set(0, boxRoofY - 0.12, cargoCenterZ);
      group.add(dome);
    }
  }

  // 2. Flush Trapezoidal Windshield + Gasket Frame + Wipers (100% visible outside cab!)
  const wsLen = Math.hypot(cabTopY - beltY, hoodZ - wsTopZ);
  const wsAngle = Math.atan2(hoodZ - wsTopZ, cabTopY - beltY);
  const wsGlassH = isArmored ? wsLen * 0.48 : wsLen * 0.96;
  const ws = new THREE.Mesh(
    createTrapezoidGlassGeo(width * 0.86, width * 0.82, wsGlassH, 0.024),
    mats.glass,
  );
  ws.position.set(
    0,
    isArmored ? beltY + windowH * 0.56 : (beltY + cabTopY) * 0.5,
    (hoodZ + wsTopZ) * 0.5 + 0.004,
  );
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, isArmored ? 'Visor Blindado Dianteiro' : 'Para-brisa Amplo', 0, 0.35, 0.55);
  group.add(ws);

  // Slim side rubber seals along A-pillars framing the windshield glass cleanly
  [-1, 1].forEach((side) => {
    group.add(
      makeStrutBetween(
        new THREE.Vector3(side * (width * 0.43), beltY + 0.01, hoodZ),
        new THREE.Vector3(side * (width * 0.41), cabTopY - 0.03, wsTopZ),
        0.022,
        0.022,
        mats.trim,
        6,
      ),
    );
  });

  [-0.18, 0.18].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.024), mats.trim);
    wiper.position.set(wx * width, beltY + 0.05, hoodZ + 0.018);
    wiper.rotation.z = 0.08;
    group.add(wiper);
  });

  if (isArmored) {
    // Lower armored cowl plate below visor slit so slit stays clear & framed!
    const lowerPlate = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.82, windowH * 0.34, 0.06, 0.015, 2, 6),
      mats.body,
    );
    lowerPlate.position.set(0, beltY + windowH * 0.16, hoodZ - 0.05);
    lowerPlate.rotation.x = -wsAngle;
    group.add(lowerPlate);

    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.08, wsGlassH, 0.05), mats.trim);
    divider.position.copy(ws.position);
    divider.rotation.x = -wsAngle;
    group.add(divider);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.30, 12), mats.secondary);
    turret.position.set(0, cabTopY + 0.14, 0.15);
    group.add(turret);

    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(0, cabTopY + 0.29, 0.48);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.42, 0.06, 12), mats.trim);
    hatch.position.set(0, 0, -0.33);
    hatchPivot.add(hatch);
    tagPart(hatchPivot, 'Escotilha da Torre Blindada', 0, 0.75, 0);
    group.add(hatchPivot);
    registerOpenable(animated, hatchPivot, 'Escotilha Torre Blindada', { x: -1.15 });
  }

  // 3. Flush Articulated Cab Doors + Rear Double Cargo/Ambulance/Troop Doors
  if (!cityMode) {
    const doorHingeXAbs = width * 0.495 - 0.034;
    const topShift = Math.max(0.03, doorHingeXAbs - width * 0.445);
    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const door = createSideDoorGroup(
        {
          side,
          hingeX: side * doorHingeXAbs,
          hingeY: beltY,
          hingeZ: fDoorHingeZ,
          doorLen: fDoorLen,
          doorHeight: hoodH * 0.74,
          glassHeight: isArmored ? windowH * 0.42 : windowH * 0.84,
          glassTopZInsetFront: (hoodZ - wsTopZ) * 0.78,
          glassTopZInsetRear: 0.03,
          topInwardShift: topShift,
          hasMirror: true,
          isScissor: false,
          isRearDoor: false,
          label: side < 0 ? 'Porta Dianteira Esquerda' : 'Porta Dianteira Direita',
        },
        mats,
        animated,
        cityMode,
      );
      group.add(door);

      // Rear Split Double Doors with exposed hinges & lock rods
      const rDoorH = Math.max(0.75, boxRoofY - g.groundClearance - 0.22);
      const rearDoorPivot = new THREE.Group();
      rearDoorPivot.position.set(side * (width * 0.44), g.groundClearance + rDoorH * 0.5 + 0.12, -halfL - 0.008);
      const leafW = width * 0.43;
      const leaf = new THREE.Mesh(createRoundedBoxGeo(leafW, rDoorH, 0.05, 0.02, 2, 8), mats.body);
      leaf.position.set(-side * (leafW * 0.5), 0, 0);
      rearDoorPivot.add(leaf);
      const lockRod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, rDoorH * 0.76, 8), mats.chrome);
      lockRod.position.set(-side * (leafW * 0.84), 0, -0.03);
      rearDoorPivot.add(lockRod);
      const rWin = new THREE.Mesh(
        createRoundedBoxGeo(leafW * 0.66, windowH * (isArmored ? 0.34 : 0.52), 0.056, 0.02, 2, 6),
        mats.glass,
      );
      rWin.position.set(-side * (leafW * 0.5), rDoorH * 0.24, 0);
      rWin.userData.noShadow = true;
      rWin.renderOrder = 2;
      rearDoorPivot.add(rWin);
      tagPart(rearDoorPivot, 'Porta Traseira Bipartida', side * 0.3, 0.1, -0.45);
      group.add(rearDoorPivot);
      registerOpenable(animated, rearDoorPivot, 'Portas Traseiras', { y: -side * 1.72 });
    });
  }

  // 4. Role-Specific Cargo, Medical, Gourmet & Sweeper Details
  if (isAmbulance) {
    // Aerodynamic roof module fairing bridging cab to tall SAMU medical box + integrated brow strobes (TurboSquid 80s ambulance look!)
    const fairing = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.94, 0.22, 0.58, 0.04, 2, 10),
      mats.body,
    );
    fairing.position.set(0, cabTopY + 0.04, cabRearZ + 0.18);
    fairing.rotation.x = 0.22;
    group.add(fairing);

    // Multi-lamp brow strobe pods on the raised medical overhang
    [-0.36, -0.18, 0, 0.18, 0.36].forEach((lx, idx) => {
      const podMat = idx === 2 ? mats.headlight : idx % 2 === 0 ? mats.sirenRed : mats.sirenAmber;
      const browPod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.065, 0.08), podMat);
      browPod.position.set(lx * width, boxRoofY - 0.03, cabRearZ + 0.05);
      group.add(browPod);
    });

    [-1, 1].forEach((side) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.18, cargoLen * 0.92), mats.secondary);
      band.position.set(side * (width * 0.504), beltY - 0.10, cargoCenterZ);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.38, 0.12), mats.secondary);
      crossV.position.set(side * (width * 0.506), beltY + 0.28, cargoCenterZ);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.38), mats.secondary);
      crossH.position.copy(crossV.position);
      group.add(band, crossV, crossH);

      // Side compartment locker door + chrome latch + roof scene strobe
      const locker = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.72), mats.trim);
      locker.position.set(side * (width * 0.502), bayFloorY + 0.32, cargoCenterZ - cargoLen * 0.22);
      const sceneLight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.10, 0.22), mats.sirenRed);
      sceneLight.position.set(side * (width * 0.502), boxRoofY - 0.06, cargoCenterZ + cargoLen * 0.28);
      group.add(locker, sceneLight);
    });

    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.08, 0.26), mats.alloy);
    rearStep.position.set(0, g.groundClearance + 0.06, -halfL - 0.10);
    tagPart(rearStep, 'Degrau de Maca SAMU', 0, -0.1, -0.5);
    group.add(rearStep);

    // Front grille + rear upper SAMU emergency strobes
    [-1, 1].forEach((side) => {
      const fStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.065, 0.045),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      fStrobe.position.set(side * (width * 0.13), g.groundClearance + hoodH * 0.44, halfL + 0.015);
      const rStrobe = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.085, 0.07),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      rStrobe.position.set(side * (width * 0.34), boxRoofY - 0.04, -halfL - 0.01);
      group.add(fStrobe, rStrobe);
    });

    const acPod = new THREE.Mesh(createRoundedBoxGeo(width * 0.56, 0.18, 1.15, 0.05, 2, 8), mats.secondary);
    acPod.position.set(0, boxRoofY + 0.08, cargoCenterZ);
    group.add(acPod);
  } else if (isFoodTruck) {
    const hatchH = Math.max(0.82, cabTopY - 0.22 - (beltY - 0.04));
    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(width * 0.502, cabTopY - 0.22, -0.2);
    const awning = new THREE.Mesh(createRoundedBoxGeo(0.06, hatchH, length * 0.44, 0.02, 2, 8), mats.accent);
    awning.position.set(0, -hatchH * 0.5, 0);
    hatchPivot.add(awning);
    tagPart(hatchPivot, 'Janela Balcão Gourmet Articulada', 0.6, 0.2, 0);
    group.add(hatchPivot);
    registerOpenable(animated, hatchPivot, 'Janela Food Truck', { z: 1.38 });

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, length * 0.44), mats.chrome);
    counter.position.set(width * 0.52, beltY - 0.06, -0.2);
    [-0.18, 0.18].forEach((bz) => {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), mats.trim);
      bracket.position.set(width * 0.49, beltY - 0.14, -0.2 + bz * length);
      bracket.rotation.z = 0.6;
      group.add(bracket);
    });
    const menuSign = new THREE.Mesh(createRoundedBoxGeo(0.05, 0.24, length * 0.36, 0.02, 2, 6), mats.trim);
    menuSign.position.set(width * 0.504, cabTopY - 0.06, -0.2);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 14), mats.chrome);
    chimney.position.set(-width * 0.22, cabTopY + 0.16, -0.55);
    const roofFan = new THREE.Mesh(createRoundedBoxGeo(0.52, 0.14, 0.52, 0.03, 2, 6), mats.alloy);
    roofFan.position.set(width * 0.18, cabTopY + 0.06, -0.75);
    group.add(counter, menuSign, chimney, roofFan);
  } else if (isSweeper) {
    [-1, 1].forEach((side) => {
      const brushGroup = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 0.16, 20), mats.accent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 14), mats.trim);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.58), mats.trim);
      arm.position.set(0, 0.14, -0.25);
      brushGroup.add(disc, hub, arm);
      brushGroup.position.set(side * (width * 0.46), 0.12, halfL + 0.24);
      tagPart(brushGroup, 'Escovas Varredouras Giratórias', side * 0.35, -0.1, 0.65);
      group.add(brushGroup);
      animated.sweeperBrushes.push(disc);
    });
    const vacuumHead = new THREE.Mesh(createRoundedBoxGeo(width * 0.64, 0.12, 0.32, 0.02, 2, 6), mats.trim);
    vacuumHead.position.set(0, 0.14, -0.15);
    const cyclonePod = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.48, 14), mats.alloy);
    cyclonePod.rotation.x = Math.PI / 2;
    cyclonePod.position.set(0, boxRoofY + 0.16, cargoCenterZ);
    group.add(vacuumHead, cyclonePod);
  } else {
    // Courier Van: stamped horizontal side cargo ribs + sliding side door with black rail track
    [-1, 1].forEach((side) => {
      [0.35, 0.62].forEach((ry) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.045, cargoLen * 0.88), mats.secondary);
        rib.position.set(side * (width * 0.502), bayFloorY + wallH * ry, cargoCenterZ);
        group.add(rib);
      });
    });

    const railTrack = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, cargoLen * 0.72), mats.trim);
    railTrack.position.set(width * 0.504, beltY - 0.06, cargoCenterZ - 0.15);
    group.add(railTrack);

    const sideDoor = new THREE.Group();
    sideDoor.position.set(width * 0.506, (g.groundClearance + cabTopY) * 0.52, cargoCenterZ + cargoLen * 0.18);
    const sLeaf = new THREE.Mesh(
      createRoundedBoxGeo(0.04, cabTopY - g.groundClearance - 0.34, length * 0.26, 0.02, 2, 6),
      mats.body,
    );
    const sWin = new THREE.Mesh(
      createRoundedBoxGeo(0.048, windowH * 0.62, length * 0.20, 0.015, 2, 6),
      mats.glass,
    );
    sWin.position.y = windowH * 0.45;
    sWin.userData.noShadow = true;
    sWin.renderOrder = 2;
    const sHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.03), mats.chrome);
    sHandle.position.set(0.025, -0.05, length * 0.08);
    sideDoor.add(sLeaf, sWin, sHandle);
    tagPart(sideDoor, 'Porta Lateral Corrediça Carga', 0.45, 0, 0);
    group.add(sideDoor);
    registerOpenable(animated, sideDoor, 'Porta Lateral Carga', {}, new THREE.Vector3(0.08, 0, -length * 0.22));
  }

  // Roof Rack / Lightbars
  if (g.attachments.includes('roof_rack')) {
    const rw = width * 0.78;
    const rl = length * 0.54;
    [-1, 1].forEach((s) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, rl), mats.trim);
      rail.position.set(s * (rw * 0.5), cabTopY + 0.04, -length * 0.06);
      group.add(rail);
    });
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.035, 0.045), mats.trim);
      bar.position.set(0, cabTopY + 0.04, -length * 0.06 + i * (rl * 0.22));
      group.add(bar);
    }
  }
  if (g.attachments.includes('lightbar_police') || g.attachments.includes('lightbar_amber')) {
    const isPol = g.attachments.includes('lightbar_police');
    const lb = new THREE.Group();
    const lbW = Math.min(1.32, width * 0.64);
    lb.add(new THREE.Mesh(createRoundedBoxGeo(lbW, 0.06, 0.22, 0.02, 2, 8), mats.trim));
    if (isPol) {
      const lP = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.02, 2, 8), mats.sirenRed);
      lP.position.set(-lbW * 0.25, 0.03, 0);
      const rP = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.02, 2, 8), mats.sirenBlue);
      rP.position.set(lbW * 0.25, 0.03, 0);
      lb.add(lP, rP);
    } else {
      const aP = new THREE.Mesh(createRoundedBoxGeo(lbW * 0.88, 0.09, 0.2, 0.02, 2, 8), mats.sirenAmber);
      aP.position.y = 0.03;
      lb.add(aP);
    }
    lb.position.set(0, (isAmbulance ? boxRoofY : cabTopY) + 0.05, wsTopZ - 0.28);
    group.add(lb);
  }

  if (g.attachments.includes('pushbar') || g.attachments.includes('bullbar')) {
    [-0.28, 0.28].forEach((px) => {
      const up = new THREE.Mesh(createRoundedBoxGeo(0.08, 0.52, 0.14, 0.02, 2, 6), mats.trim);
      up.position.set(px * width, g.groundClearance + 0.34, halfL + 0.14);
      group.add(up);
    });
    [0.24, 0.48].forEach((py) => {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, width * 0.66, 12), mats.trim);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, g.groundClearance + py, halfL + 0.14);
      group.add(bar);
    });
  }

  [frontWheelZ, rearWheelZ].forEach((wz, idx) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, false, cityMode);
      if (idx === 0) {
        const steerPivot = new THREE.Group();
        steerPivot.position.set(side * (width * 0.46), g.wheelRadius, wz);
        steerPivot.add(w);
        tagPart(steerPivot, 'Roda Dianteira', side * 0.45, -0.05, 0);
        group.add(steerPivot);
        animated.steeringPivots.push(steerPivot);
      } else {
        w.position.set(side * (width * 0.46), g.wheelRadius, wz);
        tagPart(w, 'Roda Traseira', side * 0.45, -0.05, 0);
        group.add(w);
      }
      animated.wheels.push(w);
    });
  });

  [-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(
      createRoundedBoxGeo(0.10, 0.08, Math.max(0.7, wheelbase - g.wheelRadius * 2.2), 0.02, 2, 6),
      mats.trim,
    );
    skirt.position.set(side * (width * 0.49), g.groundClearance + 0.04, (frontWheelZ + rearWheelZ) * 0.5);
    group.add(skirt);
  });

  addChassisDrivetrain(group, width, g.groundClearance + 0.12, frontWheelZ, rearWheelZ, mats, cityMode);
  buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, frontWheelZ, rearWheelZ, mats, cityMode);
  // Front face of cab sits cleanly at halfL - 0.015; frontZ = halfL - 0.01 places grille & headlights 100% PROUD and visible!
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.01, -halfL + 0.04, mats, useChrome, false, isArmored, g.groundClearance + hoodH * 0.44, animated);
  addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'single');
  enableShadows(group);
  return group;
}
