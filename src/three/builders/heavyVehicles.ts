import * as THREE from 'three';
import { ExhaustStyle, VehicleConcept, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createEngineBayAssembly,
  createExtrudedProfile,
  createRoundedBoxGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagPart,
} from './types';
import {
  buildVisibleInterior,
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

  [-1, 1].forEach((side) => {
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
      const amber = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.075, 12), mats.amberSignal);
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
        mats.amberSignal,
      );
      turn.position.y = -0.056;
      hlGroup.add(turn);
      const sideAmber = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.078), mats.amberSignal);
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

    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 12), mats.headlight);
    fog.rotation.x = Math.PI / 2;
    fog.position.set(side * (width * 0.36), groundClearance + 0.09, frontZ + 0.135);
    group.add(fog);

    const tlGrp = new THREE.Group();
    const tlFrame = new THREE.Mesh(createRoundedBoxGeo(0.14, 0.38, 0.05, 0.02, 2, 6), mats.grille);
    tlGrp.add(tlFrame);
    const tlRed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.15, 0.062), mats.taillight);
    tlRed.position.y = 0.085;
    const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.085, 0.062), mats.amberSignal);
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
  const safetyBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.045, 0.02), mats.sirenAmber);
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

  // 1. Hollowed Lower Body Tub (interior floor + lower skirt walls so passenger rows sit cleanly inside)
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
  lowerShape.lineTo(options.hasFrontEnd ? hl - 0.055 : hl, groundClearance + 0.28);
  lowerShape.lineTo(options.hasFrontEnd ? hl - 0.075 : hl - 0.03, beltY);
  lowerShape.lineTo(-hl + 0.03, beltY);
  lowerShape.lineTo(-hl, groundClearance + 0.28);
  lowerShape.lineTo(-hl + 0.04, groundClearance + 0.05);
  lowerShape.closePath();

  const lowerGeo = createExtrudedProfile(
    lowerShape,
    width,
    0.045,
    0.045,
    options.cityMode ? 2 : 4,
    options.cityMode ? 10 : 18,
  );
  const lowerMesh = new THREE.Mesh(lowerGeo, mats.body);
  tagPart(lowerMesh, `${options.labelPrefix} — Carroceria Inferior`, 0, 0, 0);
  mod.add(lowerMesh);

  // Wheel-arch flare moldings + lower black rub-rails + contrast belt stripe
  sortedWheels.forEach((wz) => {
    [-1, 1].forEach((side) => {
      const archFlare = new THREE.Mesh(
        new THREE.TorusGeometry(archR * 0.99, 0.038, 8, 18, Math.PI),
        mats.trim,
      );
      archFlare.rotation.y = Math.PI / 2;
      archFlare.position.set(side * (width * 0.494), groundClearance + archR * 0.14, wz);
      mod.add(archFlare);
    });
  });

  const beltStripe = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.016, 0.15, modLen * 0.96),
    mats.secondary,
  );
  beltStripe.position.set(0, beltY - 0.13, 0);
  mod.add(beltStripe);

  [-1, 1].forEach((side) => {
    const rub = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.065, modLen * 0.92), mats.trim);
    rub.position.set(side * (width * 0.502), groundClearance + 0.24, 0);
    mod.add(rub);

    // Side amber marker lamps along beltline
    if (!options.cityMode) {
      for (let m = -2; m <= 2; m++) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.09), mats.amberSignal);
        marker.position.set(side * (width * 0.504), groundClearance + 0.34, m * (modLen * 0.20));
        mod.add(marker);
      }
    }
  });

  // 2. Curved Beveled Roof Shell + Gutter Trim
  const frontTopZ = options.hasFrontEnd ? hl - 0.16 : hl - 0.02;
  const rearTopZ = options.hasRearEnd ? -hl + 0.10 : -hl + 0.02;
  const roofLen = frontTopZ - rearTopZ;
  const roofCenterZ = (frontTopZ + rearTopZ) * 0.5;

  const roofShape = new THREE.Shape();
  const rHalf = roofLen * 0.5;
  roofShape.moveTo(-rHalf, 0);
  roofShape.quadraticCurveTo(0, 0.12, rHalf, 0);
  roofShape.lineTo(rHalf - 0.03, -0.14);
  roofShape.lineTo(-rHalf + 0.03, -0.14);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: width - 0.12,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: options.cityMode ? 2 : 4,
    curveSegments: options.cityMode ? 8 : 16,
  });
  roofGeo.translate(0, 0, -(width - 0.12) / 2);
  roofGeo.rotateY(-Math.PI / 2);
  roofGeo.computeVertexNormals();
  const roofMesh = new THREE.Mesh(roofGeo, mats.secondary);
  roofMesh.position.set(0, height - 0.08, roofCenterZ);
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

    const bayCount = Math.max(3, Math.round(modLen / 1.45));
    const spanZ = frontTopZ - 0.14 - (rearTopZ + 0.18);
    const bayLen = spanZ / bayCount;

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
        const isDoorBay =
          side > 0 &&
          options.hasBoardingDoors &&
          options.doorPositionsZ.some((dz) => Math.abs(dz - bayCenterZ) < bayLen * 0.62);

        if (isDoorBay && !options.cityMode) {
          // Articulated flush curb-side boarding door with twin framed windows & rubber center seal
          const doorPivot = new THREE.Group();
          doorPivot.position.set(side * (width * 0.49), beltY + windowH * 0.25, bayCenterZ + bayLen * 0.44);
          const doorFullH = windowH + (beltY - groundClearance) * 0.72;
          const doorFrame = new THREE.Mesh(
            createRoundedBoxGeo(0.048, doorFullH, bayLen * 0.88, 0.018, 2, 6),
            mats.secondary,
          );
          doorFrame.position.set(0, -doorFullH * 0.12, -bayLen * 0.44);
          doorPivot.add(doorFrame);

          const centerSeal = new THREE.Mesh(
            new THREE.BoxGeometry(0.056, doorFullH * 0.94, 0.04),
            mats.trim,
          );
          centerSeal.position.set(0, -doorFullH * 0.12, -bayLen * 0.44);
          doorPivot.add(centerSeal);

          const upperGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.054, doorFullH * 0.44, bayLen * 0.72, 0.015, 2, 6),
            mats.glass,
          );
          upperGlass.position.set(0, doorFullH * 0.10, -bayLen * 0.44);
          upperGlass.userData.noShadow = true;
          upperGlass.renderOrder = 2;
          doorPivot.add(upperGlass);

          const lowerGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.054, doorFullH * 0.26, bayLen * 0.72, 0.015, 2, 6),
            mats.glass,
          );
          lowerGlass.position.set(0, -doorFullH * 0.34, -bayLen * 0.44);
          lowerGlass.userData.noShadow = true;
          lowerGlass.renderOrder = 2;
          doorPivot.add(lowerGlass);

          tagPart(doorPivot, 'Porta de Embarque Articulada', side * 0.4, 0, 0);
          mod.add(doorPivot);
          registerOpenable(animated, doorPivot, 'Porta Embarque Ônibus', { y: -1.32 });
        } else {
          // Recessed passenger window pane + black gasket surround + sliding transom bar
          const gasket = new THREE.Mesh(
            new THREE.BoxGeometry(0.032, windowH * 0.92, bayLen * 0.94),
            mats.trim,
          );
          gasket.position.set(side * (width * 0.464), beltY + windowH * 0.48, bayCenterZ);
          mod.add(gasket);

          const winGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.026, windowH * 0.84, bayLen * 0.88, 0.014, 2, 6),
            mats.glass,
          );
          winGlass.position.set(side * (width * 0.472), beltY + windowH * 0.48, bayCenterZ);
          winGlass.userData.noShadow = true;
          winGlass.renderOrder = 2;
          mod.add(winGlass);

          const transom = new THREE.Mesh(
            new THREE.BoxGeometry(0.034, 0.034, bayLen * 0.88),
            mats.trim,
          );
          transom.position.set(side * (width * 0.474), beltY + windowH * 0.68, bayCenterZ);
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
      createRoundedBoxGeo(width * 0.88, 0.10, 0.16, 0.02, 2, 8),
      mats.body,
    );
    browCap.position.set(0, roofY - 0.02, frontTopZ);
    mod.add(browCap);

    const wsGeo = createTrapezoidGlassGeo(width * 0.86, width * 0.82, wsLen * 0.86, 0.024);
    const ws = new THREE.Mesh(wsGeo, mats.glass);
    ws.position.set(0, beltY + windowH * 0.48, (fBotZ + frontTopZ) * 0.5 - 0.004);
    ws.rotation.x = -wsAngle;
    ws.userData.noShadow = true;
    ws.renderOrder = 2;
    tagPart(ws, 'Para-brisa Panorâmico', 0, 0.35, 0.45);
    mod.add(ws);

    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.042, windowH * 0.84, 0.045), mats.trim);
    centerBar.position.set(0, beltY + windowH * 0.48, (fBotZ + frontTopZ) * 0.5 - 0.01);
    centerBar.rotation.x = -wsAngle;
    mod.add(centerBar);

    [-0.24, 0.24].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.025, 0.03), mats.trim);
      wiper.position.set(wx * width, beltY + 0.08, fBotZ - 0.03);
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

  // 5. Rear Engine Access Door, Louvered Vents & Framed Rear Window
  if (options.hasRearEnd) {
    const rwFrame = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.92, windowH * 0.96, 0.11, 0.02, 2, 6),
      mats.trim,
    );
    rwFrame.position.set(0, beltY + windowH * 0.48, rearTopZ);
    mod.add(rwFrame);
    const rw = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.78, windowH * 0.68, 0.13, 0.02, 2, 6),
      mats.glass,
    );
    rw.position.set(0, beltY + windowH * 0.48, rearTopZ);
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

  // 6. Visible 3D Bus Interior (Driver Cockpit + Partition + Passenger Rows + Handrails)
  if (!options.cityMode) {
    const interior = new THREE.Group();
    const floorY = groundClearance + 0.24;

    if (options.hasFrontEnd) {
      const dash = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.44, 0.36, 0.48, 0.04, 2, 8),
        mats.trim,
      );
      dash.position.set(-width * 0.20, floorY + 0.62, hl - 0.48);
      interior.add(dash);

      const drvSeat = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.76, 0.48, 0.06, 2, 8),
        mats.interior,
      );
      drvSeat.position.set(-width * 0.24, floorY + 0.58, hl - 0.96);
      interior.add(drvSeat);

      const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.024, 8, 18), mats.trim);
      wheelRim.position.set(-width * 0.24, floorY + 0.94, hl - 0.66);
      wheelRim.rotation.x = Math.PI * 0.24;
      interior.add(wheelRim);
    }

    const seatStartZ = options.hasFrontEnd ? hl - 1.75 : hl - 0.65;
    const seatEndZ = -hl + 0.75;
    const rowStep = 0.88;
    for (let sz = seatStartZ; sz >= seatEndZ; sz -= rowStep) {
      [-1, 1].forEach((side) => {
        const pair = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.32, 0.62, 0.42, 0.05, 2, 8),
          mats.interior,
        );
        pair.position.set(side * (width * 0.28), floorY + 0.48, sz);
        interior.add(pair);
      });
      if (Math.round(sz * 2) % 2 === 0) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.018, roofY - floorY - 0.1, 8),
          mats.accent,
        );
        pole.position.set(-width * 0.12, (floorY + roofY) * 0.5, sz);
        interior.add(pole);
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
  const stopSign = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.03, 8), mats.sirenRed);
  stopSign.rotation.z = Math.PI / 2;
  stopSign.position.set(-0.02, 0, -0.22);
  stopArmPivot.add(stopSign);
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
      w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
      tagPart(w, `Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, g.groundClearance + 0.18, frontWheelZ, rearWheelZ, mats, cityMode);
  buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, hoodFrontZ, -halfL + 0.04, mats, false, true);
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

    // 9-rib pleated bellows + circular turntable + roof guide ribs
    const bellowsGroup = new THREE.Group();
    const belH = height - g.groundClearance - 0.18;
    for (let i = -4; i <= 4; i++) {
      const rib = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.94, belH, gap * 0.095, 0.04, 2, 8),
        i % 2 === 0 ? mats.trim : mats.secondary,
      );
      rib.position.set(0, g.groundClearance + belH * 0.5 + 0.04, i * (gap * 0.105));
      bellowsGroup.add(rib);
    }
    const turntable = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.42, width * 0.42, 0.06, 20),
      mats.alloy,
    );
    turntable.position.set(0, g.groundClearance + 0.25, 0);
    bellowsGroup.add(turntable);
    bellowsGroup.position.z = bellowsZ;
    tagPart(bellowsGroup, 'Sanfona Articulada e Mesa Giratória', 0, 0.35, 0);
    group.add(bellowsGroup);

    axleZs.forEach((az, idx) => {
      [-1, 1].forEach((side) => {
        const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, idx > 0, cityMode);
        w.position.set(side * (width * 0.46), g.wheelRadius, az);
        tagPart(w, `Eixo ${idx + 1} BRT`, side * 0.45, -0.1, 0);
        group.add(w);
        animated.wheels.push(w);
      });
    });

    addChassisDrivetrain(group, width, g.groundClearance + 0.18, axleZs[0], axleZs[2], mats, cityMode);
    buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, axleZs[0], axleZs[1], mats, cityMode);
    addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, false);
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
      doorPositionsZ: [length * 0.34, -length * 0.04],
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
      w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
      tagPart(w, `Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, g.groundClearance + 0.18, frontWheelZ, rearWheelZ, mats, cityMode);
  buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, false);
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

  // 2. Sculpted Heavy Truck Cab Core with OPEN Windshield Aperture (recessed at 0.84*width in doorway so flush doors sit OUTSIDE!)
  const hoodTopH = cabH * (isSemi ? 0.46 : 0.42);
  const noseFrontBevel = 0.045;
  const noseLocalEnd = ch - noseFrontBevel - 0.015;
  const wsTopLocalZ = noseStartZ - cabLen * 0.14;

  // 2a. Lower cab chassis + sloped engine nose (stops cleanly at hoodTopH so windshield bay above is open!)
  const cabLowerShape = new THREE.Shape();
  cabLowerShape.moveTo(-ch, 0);
  cabLowerShape.lineTo(noseLocalEnd, 0);
  cabLowerShape.lineTo(noseLocalEnd, hoodTopH * 0.82);
  cabLowerShape.lineTo(noseStartZ, hoodTopH);
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

  // 2b. Upper Sleeper / Cab Back Wall & Cambered Roof Shell behind windshield top edge
  const upperStartZ = wsTopLocalZ - 0.07;
  const cabUpperShape = new THREE.Shape();
  cabUpperShape.moveTo(-ch, hoodTopH - 0.04);
  cabUpperShape.lineTo(upperStartZ, hoodTopH - 0.04);
  cabUpperShape.lineTo(upperStartZ, cabH - 0.10);
  cabUpperShape.lineTo(wsTopLocalZ - 0.01, cabH - 0.10);
  cabUpperShape.lineTo(wsTopLocalZ - 0.01, cabH - 0.04);
  cabUpperShape.quadraticCurveTo(wsTopLocalZ - cabLen * 0.08, cabH, -ch + 0.12, cabH);
  cabUpperShape.lineTo(-ch, cabH - 0.06);
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
    // Sloped contoured front fenders flush with hood height (zero boxy protrusion!)
    const fenderSpan = noseLen + 0.18;
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
    createTrapezoidGlassGeo(width * 0.78, width * 0.74, wsLen * 0.88, 0.024),
    mats.glass,
  );
  ws.position.set(0, (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5 + 0.012);
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, 'Para-brisa da Cabine', 0, 0.35, 0.55);
  group.add(ws);

  const wsDivider = new THREE.Mesh(new THREE.BoxGeometry(0.036, wsLen * 0.88, 0.032), mats.trim);
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

  // Visible Cab Interior (positioned cleanly inside hollowed cab cavity behind open windshield)
  if (!cityMode) {
    const cabInt = buildVisibleInterior(cabLen * 0.65, cabH * 0.55, width * 0.86, isFire ? 4 : 2, mats, false, 0.14, cityMode);
    cabInt.position.set(0, cabBaseY + 0.14, cabZ - cabLen * 0.12);
    group.add(cabInt);
  }

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

      const slpWin = new THREE.Mesh(
        createRoundedBoxGeo(0.032, cabH * 0.24, cabLen * 0.18, 0.02, 2, 6),
        mats.glass,
      );
      slpWin.position.set(side * (width * 0.494), cabBaseY + cabH * 0.66, cabZ - ch * 0.52);
      slpWin.userData.noShadow = true;
      slpWin.renderOrder = 2;
      group.add(slpWin);
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
      const fDoor = createSideDoorGroup(
        {
          side,
          hingeX: side * doorHingeXAbs,
          hingeY: cabBaseY + hoodTopH + 0.02,
          hingeZ: fDoorHingeZ,
          doorLen,
          doorHeight: hoodTopH * 0.88,
          glassHeight: cabH * 0.38,
          glassTopZInsetFront: (wsBotZ - wsTopZ) * 0.65,
          glassTopZInsetRear: 0.04,
          topInwardShift: 0.065,
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
            glassHeight: cabH * 0.38,
            glassTopZInsetFront: 0.04,
            glassTopZInsetRear: 0.04,
            topInwardShift: 0.065,
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
      w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
      tagPart(w, `Conjunto Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  addChassisDrivetrain(group, width, frameY, frontAxleZ, rearAxleZs[0], mats, cityMode);
  addDualRearFendersAndMudflaps(group, width, g.wheelRadius, rearAxleZs, mats, cityMode);
  // Front face of cab sits at cabZ + noseLocalEnd + noseFrontBevel = halfL - 0.08 - 0.015 = halfL - 0.095 -> place fascia clearly proud!
  addHeavyBumperAndLights(group, width, g.groundClearance, cabZ + ch - 0.01, -halfL + 0.04, mats, useChrome, false, false, cabBaseY + hoodTopH * 0.45);

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

  // 1a. Lower cab chassis & sloped hood (ends cleanly at beltY so windshield above is 100% open!)
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
  cabLowerShape.lineTo(cabRearZ, beltY - 0.03);
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

  // Visible Cab Dashboard, Steering Wheel & Twin Bucket Seats inside cab
  if (!cityMode) {
    const cabInt = buildVisibleInterior(1.05, windowH * 0.72, width * 0.82, 2, mats, false, 0.14, cityMode, {
      styleId: v.id,
      archetype: g.archetype,
    });
    cabInt.position.set(0, g.groundClearance + 0.22, (hoodZ + cabRearZ) * 0.5 - 0.06);
    group.add(cabInt);
  }

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
      const oxyTank = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 10), mats.sirenBlue);
      oxyTank.position.set(width * 0.18, bayFloorY + 0.34, cabRearZ - 0.28);
      group.add(stretcherFrame, mattress, medCabinet, oxyTank);
    } else if (isArmored) {
      [-1, 1].forEach((side) => {
        const bench = new THREE.Mesh(
          createRoundedBoxGeo(0.36, 0.12, cargoLen * 0.76, 0.02, 2, 6),
          mats.interior,
        );
        bench.position.set(side * (width * 0.28), bayFloorY + 0.36, cargoCenterZ);
        group.add(bench);
      });
    } else if (isFoodTruck) {
      const grill = new THREE.Mesh(createRoundedBoxGeo(0.45, 0.76, cargoLen * 0.76, 0.02, 2, 6), mats.chrome);
      grill.position.set(-width * 0.24, bayFloorY + 0.38, cargoCenterZ);
      const innerCounter = new THREE.Mesh(createRoundedBoxGeo(0.38, 0.72, cargoLen * 0.72, 0.02, 2, 6), mats.secondary);
      innerCounter.position.set(width * 0.24, bayFloorY + 0.36, cargoCenterZ);
      group.add(grill, innerCounter);
    } else if (!isSweeper) {
      [-0.22, 0.22].forEach((cx, idx) => {
        const crate = new THREE.Mesh(
          createRoundedBoxGeo(0.54, 0.48, 0.64, 0.02, 2, 6),
          idx === 0 ? mats.secondary : mats.accent,
        );
        crate.position.set(cx * width, bayFloorY + 0.26, cargoCenterZ - idx * 0.35);
        group.add(crate);
      });
    }
  }

  // 2. Flush Trapezoidal Windshield + Gasket Frame + Wipers (100% visible outside cab!)
  const wsLen = Math.hypot(cabTopY - beltY, hoodZ - wsTopZ);
  const wsAngle = Math.atan2(hoodZ - wsTopZ, cabTopY - beltY);
  const wsGlassH = isArmored ? wsLen * 0.46 : wsLen * 0.90;
  const ws = new THREE.Mesh(
    createTrapezoidGlassGeo(width * 0.80, width * 0.76, wsGlassH, 0.024),
    mats.glass,
  );
  ws.position.set(
    0,
    isArmored ? beltY + windowH * 0.56 : (beltY + cabTopY) * 0.5,
    (hoodZ + wsTopZ) * 0.5 + 0.008,
  );
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, isArmored ? 'Visor Blindado Dianteiro' : 'Para-brisa Amplo', 0, 0.35, 0.55);
  group.add(ws);

  [-0.18, 0.18].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.024), mats.trim);
    wiper.position.set(wx * width, beltY + 0.05, hoodZ + 0.02);
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

    const acPod = new THREE.Mesh(createRoundedBoxGeo(width * 0.56, 0.18, 1.15, 0.05, 2, 8), mats.secondary);
    acPod.position.set(0, boxRoofY + 0.08, cargoCenterZ);
    group.add(acPod);
  } else if (isFoodTruck) {
    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(width * 0.502, cabTopY - 0.22, -0.2);
    const awning = new THREE.Mesh(createRoundedBoxGeo(0.06, 0.82, length * 0.44, 0.02, 2, 8), mats.accent);
    awning.position.set(0, -0.41, 0);
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
      w.position.set(side * (width * 0.46), g.wheelRadius, wz);
      tagPart(w, idx === 0 ? 'Roda Dianteira' : 'Roda Traseira', side * 0.45, -0.05, 0);
      group.add(w);
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
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.01, -halfL + 0.04, mats, useChrome, false, isArmored, g.groundClearance + hoodH * 0.44);
  addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'single');
  enableShadows(group);
  return group;
}
