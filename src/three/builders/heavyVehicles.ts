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
// SHARED HEAVY VEHICLE HELPERS (MIRRORS, STEPS, FENDERS, HEADLIGHTS)
// =========================================================================

function createTruckDualMirror(side: -1 | 1, mats: VehicleMaterialSet, cityMode: boolean): THREE.Group {
  const grp = new THREE.Group();
  const seg = cityMode ? 6 : 12;

  // Upper & lower tubular bracket arms
  grp.add(
    makeStrutBetween(
      new THREE.Vector3(0, 0.24, 0),
      new THREE.Vector3(side * 0.16, 0.28, 0.04),
      0.015,
      0.015,
      mats.chrome,
      seg,
    ),
  );
  grp.add(
    makeStrutBetween(
      new THREE.Vector3(0, -0.18, 0),
      new THREE.Vector3(side * 0.16, -0.16, 0.04),
      0.015,
      0.015,
      mats.chrome,
      seg,
    ),
  );
  grp.add(
    makeStrutBetween(
      new THREE.Vector3(side * 0.16, -0.18, 0.04),
      new THREE.Vector3(side * 0.16, 0.30, 0.04),
      0.016,
      0.016,
      mats.chrome,
      seg,
    ),
  );

  // Main upper flat mirror housing
  const mainBody = new THREE.Mesh(
    createRoundedBoxGeo(0.11, 0.30, 0.075, 0.02, 2, seg),
    mats.trim,
  );
  mainBody.position.set(side * 0.18, 0.11, 0.04);
  grp.add(mainBody);

  const mainGlass = new THREE.Mesh(
    createRoundedBoxGeo(0.09, 0.26, 0.014, 0.01, 2, seg),
    mats.mirrorGlass,
  );
  mainGlass.position.set(side * 0.18, 0.11, 0.002);
  grp.add(mainGlass);

  // Lower convex wide-angle blind-spot mirror
  const spotBody = new THREE.Mesh(
    createRoundedBoxGeo(0.10, 0.11, 0.068, 0.02, 2, seg),
    mats.trim,
  );
  spotBody.position.set(side * 0.18, -0.11, 0.04);
  grp.add(spotBody);

  const spotGlass = new THREE.Mesh(
    createRoundedBoxGeo(0.08, 0.085, 0.014, 0.01, 2, seg),
    mats.mirrorGlass,
  );
  spotGlass.position.set(side * 0.18, -0.11, 0.004);
  grp.add(spotGlass);

  return grp;
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
) {
  const bumperMat = isArmored ? mats.trim : useChrome ? mats.chrome : mats.secondary;

  // Sculpted front bumper with recessed fog lamps + central intake + step cutout
  const fBump = new THREE.Mesh(
    createRoundedBoxGeo(width * 1.01, 0.24, 0.18, 0.04, 3, 10),
    bumperMat,
  );
  fBump.position.set(0, groundClearance + 0.10, frontZ + 0.05);
  tagPart(fBump, 'Para-choque Dianteiro Pesado', 0, -0.1, 0.55);
  group.add(fBump);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.02), mats.liveryStripe);
  plate.position.set(0, groundClearance + 0.10, frontZ + 0.145);
  group.add(plate);

  // Front grille + twin or quad recessed headlights
  const grilleW = width * 0.50;
  const grilleH = isSchoolBus ? 0.38 : 0.42;
  const grilleY = groundClearance + (isSchoolBus ? 0.58 : 0.46);
  const grilleBack = new THREE.Mesh(
    createRoundedBoxGeo(grilleW, grilleH, 0.06, 0.02, 2, 8),
    mats.grille,
  );
  grilleBack.position.set(0, grilleY, frontZ + 0.01);
  tagPart(grilleBack, 'Grade Dianteira Ventilada', 0, 0, 0.5);
  group.add(grilleBack);

  const slatCount = 5;
  for (let i = 0; i < slatCount; i++) {
    const sy = grilleY - grilleH * 0.34 + (i / (slatCount - 1)) * (grilleH * 0.68);
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(grilleW * 0.90, 0.024, 0.072),
      useChrome ? mats.chrome : mats.alloy,
    );
    slat.position.set(0, sy, frontZ + 0.014);
    group.add(slat);
  }

  [-1, 1].forEach((side) => {
    const hlGroup = new THREE.Group();
    const bezel = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.18, 0.16, 0.06, 0.02, 2, 8),
      mats.grille,
    );
    hlGroup.add(bezel);
    if (isSchoolBus) {
      const roundHl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.075, 16), mats.headlight);
      roundHl.rotation.x = Math.PI / 2;
      roundHl.position.x = -side * 0.04;
      hlGroup.add(roundHl);
      const amber = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.075, 12), mats.amberSignal);
      amber.rotation.x = Math.PI / 2;
      amber.position.x = side * 0.09;
      hlGroup.add(amber);
    } else {
      const lamp = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.14, 0.11, 0.075, 0.018, 2, 8),
        mats.headlight,
      );
      hlGroup.add(lamp);
      const turn = new THREE.Mesh(
        createRoundedBoxGeo(0.065, 0.09, 0.08, 0.01, 2, 6),
        mats.amberSignal,
      );
      turn.position.x = side * (width * 0.085);
      hlGroup.add(turn);
    }
    hlGroup.position.set(side * (width * 0.37), grilleY - 0.04, frontZ + 0.015);
    tagPart(hlGroup, side < 0 ? 'Farol Dianteiro Esquerdo' : 'Farol Dianteiro Direito', side * 0.25, 0, 0.45);
    group.add(hlGroup);

    // Fog light in bumper
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.04, 12), mats.headlight);
    fog.rotation.x = Math.PI / 2;
    fog.position.set(side * (width * 0.36), groundClearance + 0.09, frontZ + 0.13);
    group.add(fog);

    // Rear taillight cluster
    const tlGrp = new THREE.Group();
    const tlFrame = new THREE.Mesh(createRoundedBoxGeo(0.14, 0.36, 0.05, 0.02, 2, 6), mats.grille);
    tlGrp.add(tlFrame);
    const tlRed = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.06), mats.taillight);
    tlRed.position.y = 0.08;
    const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.06), mats.amberSignal);
    tlAmber.position.y = -0.04;
    const tlRev = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.06), mats.headlight);
    tlRev.position.y = -0.12;
    tlGrp.add(tlRed, tlAmber, tlRev);
    tlGrp.position.set(side * (width * 0.41), groundClearance + 0.46, rearZ - 0.01);
    tagPart(tlGrp, side < 0 ? 'Lanterna Traseira Esquerda' : 'Lanterna Traseira Direita', side * 0.25, 0, -0.45);
    group.add(tlGrp);
  });

  // Rear bumper + mudflaps
  const rBump = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.99, 0.18, 0.14, 0.03, 2, 8),
    bumperMat,
  );
  rBump.position.set(0, groundClearance + 0.08, rearZ - 0.04);
  tagPart(rBump, 'Para-choque Traseiro Pesado', 0, -0.1, -0.55);
  group.add(rBump);

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
    });
  });
  const lastZ = axleZs[axleZs.length - 1];
  [-1, 1].forEach((side) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.54, wheelRadius * 0.62, 0.03), mats.rubber);
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
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.26, 14), mats.chrome);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(s * (width * 0.34), groundClearance + 0.04, rearZ - 0.06);
    group.add(pipe);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.27, 12), mats.exhaustBore);
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
  const beltY = groundClearance + totalBodyH * 0.41;
  const roofY = height - 0.14;
  const windowH = Math.max(0.55, roofY - beltY);
  const archR = wheelRadius * 1.15;

  // 1. Lower Body Tub with Wheel Arches & Interior Floor
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
  lowerShape.lineTo(hl, groundClearance + 0.28);
  lowerShape.lineTo(hl - 0.04, beltY);
  lowerShape.lineTo(-hl + 0.04, beltY);
  lowerShape.lineTo(-hl, groundClearance + 0.28);
  lowerShape.lineTo(-hl + 0.04, groundClearance + 0.05);
  lowerShape.closePath();

  const lowerGeo = createExtrudedProfile(
    lowerShape,
    width,
    0.05,
    0.05,
    options.cityMode ? 2 : 4,
    options.cityMode ? 10 : 18,
  );
  const lowerMesh = new THREE.Mesh(lowerGeo, mats.body);
  tagPart(lowerMesh, `${options.labelPrefix} — Carroceria Inferior`, 0, 0, 0);
  mod.add(lowerMesh);

  // Contrast belt stripe along flanks
  const beltStripe = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.016, 0.16, modLen * 0.96),
    mats.secondary,
  );
  beltStripe.position.set(0, beltY - 0.14, 0);
  mod.add(beltStripe);

  // Lower black rub-rail trim
  [-1, 1].forEach((side) => {
    const rub = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, modLen * 0.92), mats.trim);
    rub.position.set(side * (width * 0.502), groundClearance + 0.24, 0);
    mod.add(rub);
  });

  // 2. Curved Beveled Roof Shell
  const frontTopZ = options.hasFrontEnd ? hl - 0.18 : hl - 0.02;
  const rearTopZ = options.hasRearEnd ? -hl + 0.12 : -hl + 0.02;
  const roofLen = frontTopZ - rearTopZ;
  const roofCenterZ = (frontTopZ + rearTopZ) * 0.5;

  const roofShape = new THREE.Shape();
  const rHalf = roofLen * 0.5;
  roofShape.moveTo(-rHalf, 0);
  roofShape.quadraticCurveTo(0, 0.11, rHalf, 0);
  roofShape.lineTo(rHalf - 0.03, -0.14);
  roofShape.lineTo(-rHalf + 0.03, -0.14);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: width - 0.14,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: options.cityMode ? 2 : 4,
    curveSegments: options.cityMode ? 8 : 16,
  });
  roofGeo.translate(0, 0, -(width - 0.14) / 2);
  roofGeo.rotateY(-Math.PI / 2);
  roofGeo.computeVertexNormals();
  const roofMesh = new THREE.Mesh(roofGeo, mats.secondary);
  roofMesh.position.set(0, height - 0.08, roofCenterZ);
  tagPart(roofMesh, `${options.labelPrefix} — Teto Aerodinâmico`, 0, 0.45, 0);
  mod.add(roofMesh);

  // Roof AC Pods & Escape Hatches
  for (let i = 0; i < options.acCount; i++) {
    const az =
      options.acCount === 1
        ? roofCenterZ
        : rearTopZ + roofLen * 0.26 + (i / Math.max(1, options.acCount - 1)) * (roofLen * 0.48);
    const acPod = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.58, 0.20, 1.35, 0.05, 3, 10),
      mats.secondary,
    );
    acPod.position.set(0, height + 0.07, az);
    const vent = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.04, 0.85, 0.02, 2, 6),
      mats.grille,
    );
    vent.position.set(0, height + 0.17, az);
    tagPart(acPod, 'Unidade de Ar-Condicionado de Teto', 0, 0.65, 0);
    mod.add(acPod, vent);
  }

  // 3. Structural Window Pillars, Framed Side Windows & Openable Boarding Doors
  const pillarW = 0.085;
  const fBotZ = hl - 0.04;
  const rBotZ = -hl + 0.04;

  [-1, 1].forEach((side) => {
    const wallX = side * (width * 0.478);
    const topWallX = side * (width * 0.462);

    // Front corner A-pillar & Rear corner D-pillar
    mod.add(
      makeStrutBetween(
        new THREE.Vector3(wallX, beltY - 0.02, fBotZ - 0.02),
        new THREE.Vector3(topWallX, roofY, frontTopZ),
        0.045,
        0.052,
        mats.body,
        options.cityMode ? 6 : 10,
      ),
    );
    mod.add(
      makeStrutBetween(
        new THREE.Vector3(wallX, beltY - 0.02, rBotZ + 0.02),
        new THREE.Vector3(topWallX, roofY, rearTopZ),
        0.055,
        0.065,
        mats.body,
        options.cityMode ? 6 : 10,
      ),
    );

    // Side window bays with black mullions (excluding door openings on curb side side === 1)
    const bayCount = Math.max(3, Math.round(modLen / 1.45));
    const spanZ = frontTopZ - 0.12 - (rearTopZ + 0.16);
    const bayLen = spanZ / bayCount;

    for (let b = 0; b <= bayCount; b++) {
      const mz = rearTopZ + 0.16 + b * bayLen;
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, windowH + 0.04, pillarW),
        mats.trim,
      );
      mullion.position.set(side * (width * 0.475), beltY + windowH * 0.5, mz);
      mod.add(mullion);

      if (b < bayCount) {
        const bayCenterZ = mz + bayLen * 0.5;
        const isDoorBay =
          side > 0 &&
          options.hasBoardingDoors &&
          options.doorPositionsZ.some((dz) => Math.abs(dz - bayCenterZ) < bayLen * 0.62);

        if (isDoorBay && !options.cityMode) {
          // Articulated curb-side boarding door with framed glass
          const doorPivot = new THREE.Group();
          doorPivot.position.set(side * (width * 0.485), beltY + windowH * 0.25, bayCenterZ + bayLen * 0.44);
          const doorFullH = windowH + (beltY - groundClearance) * 0.72;
          const doorFrame = new THREE.Mesh(
            createRoundedBoxGeo(0.045, doorFullH, bayLen * 0.88, 0.018, 2, 6),
            mats.secondary,
          );
          doorFrame.position.set(0, -doorFullH * 0.12, -bayLen * 0.44);
          doorPivot.add(doorFrame);

          const upperGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.052, doorFullH * 0.48, bayLen * 0.70, 0.015, 2, 6),
            mats.glass,
          );
          upperGlass.position.set(0, doorFullH * 0.08, -bayLen * 0.44);
          upperGlass.userData.noShadow = true;
          upperGlass.renderOrder = 2;
          doorPivot.add(upperGlass);

          const lowerGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.052, doorFullH * 0.28, bayLen * 0.70, 0.015, 2, 6),
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
          // Recessed individual passenger window pane + black window frame trim
          const winGlass = new THREE.Mesh(
            createRoundedBoxGeo(0.025, windowH * 0.86, bayLen * 0.90, 0.015, 2, 6),
            mats.glass,
          );
          winGlass.position.set(side * (width * 0.468), beltY + windowH * 0.48, bayCenterZ);
          winGlass.userData.noShadow = true;
          winGlass.renderOrder = 2;
          mod.add(winGlass);

          // Upper transom vent bar inside window
          const transom = new THREE.Mesh(
            new THREE.BoxGeometry(0.032, 0.035, bayLen * 0.90),
            mats.trim,
          );
          transom.position.set(side * (width * 0.470), beltY + windowH * 0.68, bayCenterZ);
          mod.add(transom);
        }
      }
    }
  });

  // 4. Front Panoramic Windshield, Destination Sign & Wipers
  if (options.hasFrontEnd) {
    const wsSpanZ = fBotZ - frontTopZ;
    const wsLen = Math.hypot(windowH, wsSpanZ);
    const wsAngle = Math.atan2(wsSpanZ, windowH);
    const wsGeo = createTrapezoidGlassGeo(width * 0.86, width * 0.83, wsLen * 0.84, 0.022);
    const ws = new THREE.Mesh(wsGeo, mats.glass);
    ws.position.set(0, beltY + windowH * 0.46, (fBotZ + frontTopZ) * 0.5 - 0.01);
    ws.rotation.x = -wsAngle;
    ws.userData.noShadow = true;
    ws.renderOrder = 2;
    tagPart(ws, 'Para-brisa Panorâmico', 0, 0.35, 0.45);
    mod.add(ws);

    // Center windshield mullion & twin wipers
    const centerBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, windowH * 0.82, 0.04), mats.trim);
    centerBar.position.set(0, beltY + windowH * 0.46, (fBotZ + frontTopZ) * 0.5);
    centerBar.rotation.x = -wsAngle;
    mod.add(centerBar);

    [-0.24, 0.24].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.025, 0.03), mats.trim);
      wiper.position.set(wx * width, beltY + 0.06, fBotZ - 0.01);
      wiper.rotation.z = 0.08;
      mod.add(wiper);
    });

    if (options.hasDestinationSign) {
      const signBezel = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.72, 0.22, 0.08, 0.02, 2, 6),
        mats.trim,
      );
      signBezel.position.set(0, roofY + 0.01, frontTopZ + 0.02);
      const signLed = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.64, 0.14, 0.09),
        mats.sirenAmber,
      );
      signLed.position.copy(signBezel.position);
      tagPart(signBezel, 'Letreiro Digital Luminoso', 0, 0.45, 0.5);
      mod.add(signBezel, signLed);
    }

    // Long-arm transit mirrors
    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const mir = createTruckDualMirror(side, mats, options.cityMode);
      mir.position.set(side * (width * 0.49), beltY + 0.18, frontTopZ + 0.04);
      tagPart(mir, side < 0 ? 'Retrovisor Longo Esquerdo' : 'Retrovisor Longo Direito', side * 0.45, 0.15, 0.35);
      mod.add(mir);
    });
  }

  // 5. Rear Engine Louvers & Rear Window
  if (options.hasRearEnd) {
    const rw = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.76, windowH * 0.56, 0.025, 0.02, 2, 6),
      mats.glass,
    );
    rw.position.set(0, beltY + windowH * 0.52, rearTopZ - 0.01);
    rw.userData.noShadow = true;
    rw.renderOrder = 2;
    mod.add(rw);

    for (let l = 0; l < 4; l++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(width * 0.64, 0.04, 0.04), mats.grille);
      louver.position.set(0, groundClearance + 0.48 + l * 0.11, -hl - 0.005);
      mod.add(louver);
    }
  }

  // 6. Visible 3D Bus Interior (Driver Cockpit + Passenger Seat Rows + Grab Stanchions)
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
      // Vertical grab pole every 2 rows
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
  const hoodFrontZ = halfL - 0.08;
  const cowlZ = hoodFrontZ - hoodLen;
  const beltY = g.groundClearance + (height - g.groundClearance) * 0.46;
  const roofY = height - 0.14;
  const bodyLen = cowlZ - (-halfL + 0.08);
  const bodyCenterZ = (-halfL + 0.08 + cowlZ) * 0.5;
  const archR = g.wheelRadius * 1.15;

  // 1. Nose-hooded School Bus Engine Bay + Openable Front Hood
  const noseSides = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.88, beltY - g.groundClearance - 0.08, hoodLen, 0.06, 3, 10),
    mats.body,
  );
  noseSides.position.set(0, g.groundClearance + (beltY - g.groundClearance) * 0.42, cowlZ + hoodLen * 0.5);
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

  // 2. Main School Bus Body behind Cowl
  const busBody = buildTransitBusModule(
    bodyLen,
    width,
    height,
    g.groundClearance,
    [rearWheelZ],
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

  // Illuminated ESCOLAR header + warning flashers + hinged Stop Arm
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

  // Front fenders around front wheels
  [-1, 1].forEach((side) => {
    const fArch = new THREE.Mesh(
      new THREE.TorusGeometry(archR * 0.96, 0.055, 8, 18, Math.PI),
      mats.body,
    );
    fArch.rotation.y = Math.PI / 2;
    fArch.position.set(side * (width * 0.45), g.wheelRadius * 0.95, frontWheelZ);
    group.add(fArch);
  });

  // Wheels
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

  buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.06, -halfL + 0.04, mats, false, true);
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

    // Corrugated 7-rib bellows + circular articulated turntable disc
    const bellowsGroup = new THREE.Group();
    const belH = height - g.groundClearance - 0.18;
    for (let i = -3; i <= 3; i++) {
      const rib = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.94, belH, gap * 0.12, 0.04, 2, 8),
        i % 2 === 0 ? mats.trim : mats.secondary,
      );
      rib.position.set(0, g.groundClearance + belH * 0.5 + 0.04, i * (gap * 0.135));
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

    buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, axleZs[0], axleZs[1], mats, cityMode);
    addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, false);
    addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'dual');
    enableShadows(group);
    return group;
  }

  // Standard Metropolitan Transit Bus (VHC-31)
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

  // 1. Twin Heavy I-Beam Chassis Rails + Crossmembers
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(
      createRoundedBoxGeo(0.14, 0.22, length * 0.94, 0.02, 2, 6),
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

  // 2. Sculpted Multi-Section Heavy Truck Cab
  const hoodTopH = cabH * (isSemi ? 0.46 : 0.42);
  const cabShape = new THREE.Shape();
  cabShape.moveTo(-ch, 0);
  cabShape.lineTo(ch, 0);
  cabShape.lineTo(ch, hoodTopH * 0.88);
  cabShape.lineTo(noseStartZ, hoodTopH);
  cabShape.lineTo(noseStartZ - cabLen * 0.14, cabH - 0.06);
  cabShape.quadraticCurveTo(noseStartZ - cabLen * 0.20, cabH, -ch + 0.12, cabH);
  cabShape.lineTo(-ch, cabH - 0.06);
  cabShape.closePath();

  const cabGeo = createExtrudedProfile(
    cabShape,
    width * 0.94,
    0.075,
    0.075,
    cityMode ? 2 : 5,
    cityMode ? 10 : 20,
  );
  const cabMesh = new THREE.Mesh(cabGeo, mats.body);
  cabMesh.position.set(0, cabBaseY, cabZ);
  tagPart(cabMesh, isFire ? 'Cabine Dupla Bombeiros' : isSemi ? 'Cabine Leito Estradeira' : 'Cabine Pesada Esculpida', 0, 0.35, 0.45);
  group.add(cabMesh);

  // Tapered Trapezoidal Windshield + Sunvisor + Clearance Marker Lights + Wipers
  const wsBotZ = cabZ + noseStartZ - 0.01;
  const wsTopZ = cabZ + noseStartZ - cabLen * 0.14;
  const wsBotY = cabBaseY + hoodTopH + 0.02;
  const wsTopY = cabBaseY + cabH - 0.06;
  const wsLen = Math.hypot(wsTopY - wsBotY, wsBotZ - wsTopZ);
  const wsAngle = Math.atan2(wsBotZ - wsTopZ, wsTopY - wsBotY);

  const ws = new THREE.Mesh(
    createTrapezoidGlassGeo(width * 0.80, width * 0.76, wsLen * 0.88, 0.024),
    mats.glass,
  );
  ws.position.set(0, (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5 + 0.015);
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, 'Para-brisa da Cabine', 0, 0.35, 0.55);
  group.add(ws);

  const visor = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.86, 0.08, 0.22, 0.02, 2, 8),
    useChrome ? mats.chrome : mats.secondary,
  );
  visor.position.set(0, wsTopY + 0.04, wsTopZ + 0.08);
  visor.rotation.x = 0.22;
  group.add(visor);

  // 5 amber cab roof clearance lights
  for (let m = -2; m <= 2; m++) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.06), mats.amberSignal);
    marker.position.set(m * (width * 0.16), cabBaseY + cabH + 0.02, wsTopZ - 0.06);
    group.add(marker);
  }

  // Visible Cab Interior
  if (!cityMode) {
    const cabInt = buildVisibleInterior(cabLen * 0.65, cabH * 0.55, width * 0.88, isFire ? 4 : 2, mats, false, 0.16, cityMode);
    cabInt.position.set(0, cabBaseY + 0.14, cabZ - cabLen * 0.10);
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

    // Side sleeper windows + twin chrome roof air horns
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.018, 0.42, 12), mats.chrome);
      horn.rotation.x = Math.PI / 2;
      horn.position.set(side * (width * 0.24), cabBaseY + cabH + 0.05, cabZ + ch * 0.12);
      group.add(horn);

      const slpWin = new THREE.Mesh(
        createRoundedBoxGeo(0.03, cabH * 0.24, cabLen * 0.18, 0.02, 2, 6),
        mats.glass,
      );
      slpWin.position.set(side * (width * 0.468), cabBaseY + cabH * 0.66, cabZ - ch * 0.52);
      slpWin.userData.noShadow = true;
      slpWin.renderOrder = 2;
      group.add(slpWin);
    });

    // Openable tilting diesel hood + visible inline-6 diesel engine
    if (!cityMode) {
      const dieselBay = createEngineBayAssembly(width * 0.54, noseLen * 0.85, mats, false);
      dieselBay.position.set(0, cabBaseY + hoodTopH * 0.58, cabZ + ch - noseLen * 0.5);
      group.add(dieselBay);

      const hoodPivot = new THREE.Group();
      hoodPivot.position.set(0, cabBaseY + hoodTopH * 0.88, cabZ + noseStartZ);
      const hoodTop = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.78, 0.09, noseLen * 0.92, 0.035, 3, 10),
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

  // Articulated Cab Doors + Dual Boarding Steps + Grab Handles + Dual Truck Mirrors
  const doorLen = isFire ? Math.min(0.92, cabLen * 0.34) : Math.min(1.02, cabLen * 0.44);
  const fDoorHingeZ = cabZ + noseStartZ - 0.14;
  [-1, 1].forEach((s) => {
    const side = s as -1 | 1;

    // Dual boarding steps & chrome vertical grab handle
    [0.08, 0.28].forEach((sy) => {
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.56), mats.alloy);
      step.position.set(side * (width * 0.46), cabBaseY + sy - 0.18, fDoorHingeZ - doorLen * 0.45);
      group.add(step);
    });
    const grab = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.55, 8), mats.chrome);
    grab.position.set(side * (width * 0.48), cabBaseY + hoodTopH + 0.18, fDoorHingeZ - doorLen - 0.04);
    group.add(grab);

    if (!cityMode) {
      const fDoor = createSideDoorGroup(
        {
          side,
          hingeX: side * (width * 0.465),
          hingeY: cabBaseY + hoodTopH + 0.02,
          hingeZ: fDoorHingeZ,
          doorLen,
          doorHeight: hoodTopH * 0.88,
          glassHeight: cabH * 0.38,
          glassTopZInsetFront: (wsBotZ - wsTopZ) * 0.65,
          glassTopZInsetRear: 0.04,
          topInwardShift: 0.05,
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
      mir.position.set(side * 0.03, 0.16, -0.10);
      fDoor.add(mir);
      group.add(fDoor);

      if (isFire) {
        const crewDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * (width * 0.465),
            hingeY: cabBaseY + hoodTopH + 0.02,
            hingeZ: fDoorHingeZ - doorLen - 0.06,
            doorLen: doorLen * 0.90,
            doorHeight: hoodTopH * 0.88,
            glassHeight: cabH * 0.38,
            glassTopZInsetFront: 0.04,
            glassTopZInsetRear: 0.04,
            topInwardShift: 0.05,
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

    // Cylindrical Strapped Aluminum Fuel Tanks + Vertical Exhaust Stacks with Heatshields
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
      new THREE.CylinderGeometry(0.068, 0.072, cabH * 0.94, cityMode ? 10 : 16),
      mats.chrome,
    );
    stack.position.set(side * (width * 0.455), cabBaseY + cabH * 0.62, cabZ - ch + 0.04);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092, 0.092, cabH * 0.56, 14, 1, true, 0, Math.PI * 1.4),
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
    // 5th-Wheel Hitch Plate + Locking Jaws + Pneumatic Air Hoses
    const fifth = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.11, 24), mats.trim);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.48), mats.grille);
    slot.position.z = -0.22;
    fifth.add(plate, slot);
    fifth.position.set(0, frameY + 0.16, rearZ + 0.15);
    tagPart(fifth, 'Quinta-Roda de Engate Pesado', 0, 0.25, -0.4);
    group.add(fifth);

    // Coiled Red & Blue Air Lines behind cab
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
    // Hollowed 5-Wall Ribbed Steel Dump Bed + Cab Visor + Telescopic Piston + Hinged Tailgate
    const bedPivot = new THREE.Group();
    bedPivot.position.set(0, frameY + 0.26, -halfL + 0.55);
    const bedH = height * 0.42;
    const bedW = width * 0.96;
    const bedLocalZ = rearLen * 0.5 - 0.42;

    // Floor + Left/Right Walls + Front Bulkhead + Cab Canopy Visor
    const bedFloor = new THREE.Mesh(createRoundedBoxGeo(bedW, 0.12, rearLen, 0.03, 2, 8), mats.secondary);
    bedFloor.position.set(0, 0.06, bedLocalZ);
    bedPivot.add(bedFloor);

    [-1, 1].forEach((side) => {
      const wall = new THREE.Mesh(createRoundedBoxGeo(0.10, bedH, rearLen, 0.03, 2, 8), mats.secondary);
      wall.position.set(side * (bedW * 0.46), bedH * 0.5 + 0.06, bedLocalZ);
      bedPivot.add(wall);
      const topRail = new THREE.Mesh(createRoundedBoxGeo(0.14, 0.09, rearLen * 1.01, 0.02, 2, 6), mats.accent);
      topRail.position.set(side * (bedW * 0.46), bedH + 0.08, bedLocalZ);
      bedPivot.add(topRail);
    });

    const frontWall = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.96, bedH, 0.12, 0.03, 2, 8), mats.secondary);
    frontWall.position.set(0, bedH * 0.5 + 0.06, bedLocalZ + rearLen * 0.48);
    bedPivot.add(frontWall);

    const visor = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.96, 0.09, cabLen * 0.56, 0.025, 2, 8), mats.secondary);
    visor.position.set(0, bedH + 0.10, bedLocalZ + rearLen * 0.48 + cabLen * 0.24);
    bedPivot.add(visor);

    // Side structural ribs
    for (let i = -2; i <= 2; i++) {
      [-1, 1].forEach((side) => {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.07, bedH + 0.04, 0.14), mats.accent);
        rib.position.set(side * (bedW * 0.50), bedH * 0.5 + 0.06, bedLocalZ + i * (rearLen * 0.20));
        bedPivot.add(rib);
      });
    }

    // Telescopic hydraulic cylinder visible under bed
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.35, 14), mats.chrome);
    cyl.rotation.x = 0.35;
    cyl.position.set(0, 0.32, bedLocalZ + rearLen * 0.32);
    bedPivot.add(cyl);

    // Hinged rear tailgate (opens together with bed)
    const tailgate = new THREE.Mesh(createRoundedBoxGeo(bedW * 0.88, bedH * 0.92, 0.09, 0.02, 2, 6), mats.accent);
    tailgate.position.set(0, bedH * 0.48 + 0.06, bedLocalZ - rearLen * 0.48);
    bedPivot.add(tailgate);

    tagPart(bedPivot, 'Caçamba Basculante Nervurada', 0, 0.55, -0.45);
    group.add(bedPivot);
    registerOpenable(animated, bedPivot, 'Basculante Caçamba', { x: -0.46 });
  } else if (isMixer) {
    // High-Poly Mixer Drum with Helical Spiral Fins + Cradle + Hopper + Water Tank + Swinging Chute
    const drumGroup = new THREE.Group();
    const drumPts = [
      new THREE.Vector2(0.06, -rearLen * 0.46),
      new THREE.Vector2(width * 0.34, -rearLen * 0.34),
      new THREE.Vector2(width * 0.47, -rearLen * 0.04),
      new THREE.Vector2(width * 0.44, rearLen * 0.20),
      new THREE.Vector2(width * 0.30, rearLen * 0.40),
      new THREE.Vector2(0.08, rearLen * 0.46),
    ];
    const drumGeo = new THREE.LatheGeometry(drumPts, cityMode ? 18 : 34);
    drumGeo.rotateX(Math.PI / 2);
    drumGroup.add(new THREE.Mesh(drumGeo, mats.secondary));

    const band = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.475, width * 0.475, 0.24, 28), mats.accent);
    band.rotation.x = Math.PI / 2;
    drumGroup.add(band);

    // External helical spiral blades wrapping around the drum so rotation is visibly dynamic
    if (!cityMode) {
      const helixPts: THREE.Vector3[] = [];
      const turns = 2.5;
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const z = -rearLen * 0.34 + t * (rearLen * 0.72);
        const r = width * (0.34 + Math.sin(t * Math.PI) * 0.14);
        const a = t * turns * Math.PI * 2;
        helixPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
      }
      const helix = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPts), 40, 0.042, 8, false),
        mats.liveryStripe,
      );
      drumGroup.add(helix);
    }

    drumGroup.position.set(0, frameY + 1.18, rearZ + 0.14);
    drumGroup.rotation.x = 0.22;
    tagPart(drumGroup, 'Tambor Misturador Helicoidal', 0, 0.65, -0.35);
    group.add(drumGroup);
    animated.mixerDrum = drumGroup;

    // Front pedestal + rear A-frame cradle + water tank + rear ladder & hopper
    const frontPed = new THREE.Mesh(createRoundedBoxGeo(width * 0.44, 1.05, 0.36, 0.04, 2, 8), mats.trim);
    frontPed.position.set(0, frameY + 0.56, rearZ + rearLen * 0.44);
    const waterTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, width * 0.72, 16), mats.alloy);
    waterTank.rotation.z = Math.PI / 2;
    waterTank.position.set(0, frameY + 1.28, rearZ + rearLen * 0.46);
    const rearCradle = new THREE.Mesh(createRoundedBoxGeo(width * 0.72, 1.15, 0.28, 0.04, 2, 8), mats.trim);
    rearCradle.position.set(0, frameY + 0.62, rearZ - rearLen * 0.38);
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.46, 16), mats.accent);
    hopper.position.set(0, frameY + 1.65, -halfL + 0.28);
    group.add(frontPed, waterTank, rearCradle, hopper);

    // Swinging concrete discharge chute (openable!)
    const chutePivot = new THREE.Group();
    chutePivot.position.set(0, frameY + 0.85, -halfL + 0.14);
    const chute = new THREE.Mesh(createRoundedBoxGeo(0.34, 0.14, 1.15, 0.02, 2, 6), mats.trim);
    chute.position.set(0, -0.18, -0.52);
    chute.rotation.x = 0.42;
    chutePivot.add(chute);
    tagPart(chutePivot, 'Calha Giratória de Concreto', 0, 0.1, -0.65);
    group.add(chutePivot);
    registerOpenable(animated, chutePivot, 'Calha Betoneira', { y: 0.95 });
  } else if (isFire) {
    // Compartment Body + Pump Panel + Coiled Hoses + Openable Aluminum Shutters + Outriggers + Magirus Ladder
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

      const pumpPanel = new THREE.Mesh(new THREE.BoxGeometry(0.05, cabH * 0.36, 0.85), mats.grille);
      pumpPanel.position.set(side * (width * 0.48), frameY + 0.10 + cabH * 0.36, rearZ - 0.65);
      group.add(pumpPanel);

      const shutter = new THREE.Mesh(
        createRoundedBoxGeo(0.04, cabH * 0.48, rearLen * 0.78, 0.015, 2, 6),
        mats.alloy,
      );
      shutter.position.set(side * (width * 0.495), frameY + 0.10 + cabH * 0.38, rearZ);
      tagPart(shutter, 'Persiana Lateral de Alumínio', side * 0.35, 0.25, -0.4);
      group.add(shutter);
      registerOpenable(animated, shutter, 'Persianas Bombeiro', {}, new THREE.Vector3(0, cabH * 0.40, 0));

      // Hydraulic stabilizer outriggers
      const jack = new THREE.Mesh(createRoundedBoxGeo(0.22, 0.32, 0.22, 0.02, 2, 6), mats.accent);
      jack.position.set(side * (width * 0.44), frameY - 0.08, rearZ - rearLen * 0.44);
      group.add(jack);
    });

    const ladder = new THREE.Group();
    ladder.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.60, 0.32, 20), mats.trim));
    [-0.24, 0.24].forEach((lx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, length * 0.68), mats.alloy);
      rail.position.set(lx, 0.24, length * 0.14);
      ladder.add(rail);
    });
    for (let i = -6; i <= 6; i++) {
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8), mats.alloy);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.24, length * 0.14 + i * 0.38);
      ladder.add(rung);
    }
    const basket = new THREE.Mesh(createRoundedBoxGeo(0.78, 0.48, 0.58, 0.04, 2, 8), mats.accent);
    basket.position.set(0, 0.36, length * 0.48);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.42, 10), mats.chrome);
    cannon.rotation.x = Math.PI / 3;
    cannon.position.set(0, 0.60, length * 0.50);
    ladder.add(basket, cannon);
    ladder.position.set(0, frameY + 0.16 + cabH * 0.74, rearZ);
    ladder.rotation.x = -0.14;
    tagPart(ladder, 'Escada Magirus com Canhão', 0, 0.85, -0.2);
    group.add(ladder);
    registerOpenable(animated, ladder, 'Escada Magirus', { x: -0.38, y: 0.42 });
  } else if (isTow) {
    // Winch Pylon + Cable Drum + Articulated Rollback Deck + Folding Ramp + Wheel-Lift Stinger
    const pylon = new THREE.Mesh(createRoundedBoxGeo(width * 0.86, 0.96, 0.24, 0.04, 2, 8), mats.accent);
    pylon.position.set(0, frameY + 0.56, rearZ + rearLen * 0.45);
    const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.52, 14), mats.chrome);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, frameY + 0.44, rearZ + rearLen * 0.34);
    tagPart(pylon, 'Torre do Guincho com Carretel', 0, 0.45, -0.2);
    group.add(pylon, winchDrum);

    const deckPivot = new THREE.Group();
    deckPivot.position.set(0, frameY + 0.20, -halfL + 0.85);
    const deck = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.96, 0.14, rearLen, 0.03, 2, 8),
      mats.secondary,
    );
    deck.position.set(0, 0.08, rearLen * 0.5 - 0.72);
    deckPivot.add(deck);
    [-1, 1].forEach((side) => {
      const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, rearLen * 0.96), mats.accent);
      sideRail.position.set(side * (width * 0.46), 0.18, rearLen * 0.5 - 0.72);
      deckPivot.add(sideRail);
    });
    const ramp = new THREE.Mesh(createRoundedBoxGeo(width * 0.92, 0.08, 0.55, 0.02, 2, 6), mats.alloy);
    ramp.position.set(0, 0.04, -0.78);
    ramp.rotation.x = 0.24;
    deckPivot.add(ramp);
    tagPart(deckPivot, 'Plataforma Rollback Hidráulica', 0, 0.35, -0.45);
    group.add(deckPivot);
    registerOpenable(animated, deckPivot, 'Plataforma Rollback', { x: -0.26 }, new THREE.Vector3(0, 0.12, -0.65));

    const stinger = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.65), mats.trim);
    stinger.position.set(0, frameY - 0.05, -halfL - 0.14);
    group.add(stinger);
  }

  // 4. Heavy Axles + Dual Rear Wheels + Rear Fenders & Mudflaps
  const rearAxleZs = isTow
    ? [rearZ - rearLen * 0.12]
    : [rearZ - rearLen * 0.08, rearZ - rearLen * 0.34];
  const axles = [{ z: cabZ + 0.18, dual: false }, ...rearAxleZs.map((z) => ({ z, dual: true }))];

  axles.forEach((ax, idx) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, wheelStyle, mats, side > 0, ax.dual, cityMode);
      w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
      tagPart(w, `Conjunto Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  addDualRearFendersAndMudflaps(group, width, g.wheelRadius, rearAxleZs, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, useChrome);

  // Lightbar / Siren bar on Cab Roof
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
  const hoodH = (height - g.groundClearance) * (isSweeper ? 0.30 : isArmored ? 0.54 : 0.44);
  const beltY = g.groundClearance + hoodH;
  const hoodZ = halfL - (isSweeper ? 0.32 : isArmored ? 1.10 : 0.72);
  const wsTopZ = hoodZ - (isSweeper ? 0.16 : isArmored ? 0.45 : 0.42);
  const cabTopY = height - (g.attachments.includes('bus_ac') ? 0.16 : 0.08);
  const windowH = cabTopY - beltY;
  const cabRearZ = wsTopZ - (isArmored ? 0.85 : 0.65);

  // 1. Sculpted Forward Cab Profile + Hollowed Rear Cargo/Medical/Troop Bay
  const cabShape = new THREE.Shape();
  cabShape.moveTo(cabRearZ, g.groundClearance);
  const fStart = Math.max(cabRearZ + 0.06, frontWheelZ - archR);
  const fEnd = Math.min(halfL - 0.14, frontWheelZ + archR);
  if (fEnd > fStart + 0.1) {
    cabShape.lineTo(fStart, g.groundClearance);
    cabShape.absarc(frontWheelZ, g.groundClearance + archR * 0.15, archR, Math.PI, 0, true);
    cabShape.lineTo(fEnd, g.groundClearance);
  }
  cabShape.lineTo(halfL - 0.04, g.groundClearance + 0.06);
  cabShape.lineTo(halfL, g.groundClearance + hoodH * 0.65);
  cabShape.lineTo(hoodZ, beltY);
  cabShape.lineTo(wsTopZ, cabTopY - 0.04);
  cabShape.quadraticCurveTo(wsTopZ - 0.10, cabTopY, cabRearZ, cabTopY);
  cabShape.closePath();

  const cabGeo = createExtrudedProfile(
    cabShape,
    width,
    0.055,
    0.055,
    cityMode ? 2 : 5,
    cityMode ? 10 : 20,
  );
  const cabMesh = new THREE.Mesh(cabGeo, mats.body);
  tagPart(
    cabMesh,
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
  group.add(cabMesh);

  // Hollowed Rear Cargo / Medical / Tactical / Hopper Bay (real openable interior!)
  const cargoLen = Math.max(0.9, cabRearZ - (-halfL + 0.04));
  const cargoCenterZ = (-halfL + 0.04 + cabRearZ) * 0.5;
  const wallT = 0.09;
  const bayFloorY = g.groundClearance + 0.12;
  const bayFloor = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.96, 0.12, cargoLen, 0.025, 2, 8),
    mats.trim,
  );
  bayFloor.position.set(0, bayFloorY - 0.04, cargoCenterZ);
  group.add(bayFloor);

  const bayRoof = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.98, 0.11, cargoLen + 0.06, 0.04, 3, 10),
    mats.body,
  );
  bayRoof.position.set(0, cabTopY - 0.05, cargoCenterZ);
  group.add(bayRoof);

  // Left/right rear cargo side walls with wheel-arch lower clearance
  const wallH = cabTopY - bayFloorY;
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(
      createRoundedBoxGeo(wallT, wallH, cargoLen + 0.04, 0.03, 2, 8),
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

    // Side armored gunports on Caveirão
    if (isArmored) {
      for (let gp = -1; gp <= 1; gp += 2) {
        const port = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.22), mats.grille);
        port.position.set(side * (width * 0.502), beltY + 0.18, cargoCenterZ + gp * 0.65);
        group.add(port);
      }
    }
  });

  // Interior Role-Specific Cargo / Stretcher / Troop Benches / Kitchen Equipment
  if (!cityMode) {
    if (isAmbulance) {
      const stretcherFrame = new THREE.Mesh(
        createRoundedBoxGeo(0.62, 0.10, cargoLen * 0.72, 0.02, 2, 6),
        mats.chrome,
      );
      stretcherFrame.position.set(-width * 0.14, bayFloorY + 0.34, cargoCenterZ);
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
      // Stacked courier cargo crates inside van
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

  // 2. Raked Trapezoidal Windshield (Narrow Armored Slit on Caveirão, Panoramic on Sweeper/Van)
  const wsLen = Math.hypot(cabTopY - beltY, hoodZ - wsTopZ);
  const wsAngle = Math.atan2(hoodZ - wsTopZ, cabTopY - beltY);
  const wsGlassH = isArmored ? wsLen * 0.42 : wsLen * 0.86;
  const ws = new THREE.Mesh(
    createTrapezoidGlassGeo(width * 0.82, width * 0.78, wsGlassH, 0.024),
    mats.glass,
  );
  ws.position.set(
    0,
    isArmored ? beltY + windowH * 0.56 : (beltY + cabTopY) * 0.5,
    (hoodZ + wsTopZ) * 0.5 + 0.022,
  );
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  tagPart(ws, isArmored ? 'Visor Blindado Dianteiro' : 'Para-brisa Amplo', 0, 0.35, 0.55);
  group.add(ws);

  if (isArmored) {
    // Steel armored windshield divider + mesh cage guard
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.08, wsGlassH, 0.05), mats.trim);
    divider.position.copy(ws.position);
    divider.rotation.x = -wsAngle;
    group.add(divider);

    // Armored turret cupola with openable gunner hatch + ballistic gunports
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

  // 3. Articulated Front Cab Doors + Rear Split Double Cargo/Ambulance/Troop Doors
  if (!cityMode) {
    const fDoorLen = Math.min(1.04, length * 0.22);
    const fDoorHingeZ = hoodZ - 0.10;
    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;
      const door = createSideDoorGroup(
        {
          side,
          hingeX: side * (width * 0.48),
          hingeY: beltY,
          hingeZ: fDoorHingeZ,
          doorLen: fDoorLen,
          doorHeight: hoodH * 0.72,
          glassHeight: isArmored ? windowH * 0.42 : windowH * 0.82,
          glassTopZInsetFront: (hoodZ - wsTopZ) * 0.75,
          glassTopZInsetRear: 0.04,
          topInwardShift: 0.045,
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

      // Rear Split Double Doors
      const rDoorH = Math.max(0.75, cabTopY - g.groundClearance - 0.22);
      const rearDoorPivot = new THREE.Group();
      rearDoorPivot.position.set(side * (width * 0.44), g.groundClearance + rDoorH * 0.5 + 0.12, -halfL - 0.008);
      const leafW = width * 0.43;
      const leaf = new THREE.Mesh(createRoundedBoxGeo(leafW, rDoorH, 0.05, 0.02, 2, 8), mats.body);
      leaf.position.set(-side * (leafW * 0.5), 0, 0);
      rearDoorPivot.add(leaf);
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
    [-1, 1].forEach((side) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, length * 0.56), mats.secondary);
      band.position.set(side * (width * 0.504), beltY - 0.12, -length * 0.12);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.12), mats.secondary);
      crossV.position.set(side * (width * 0.506), beltY + 0.26, -length * 0.12);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.38), mats.secondary);
      crossH.position.copy(crossV.position);
      group.add(band, crossV, crossH);
    });
    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.08, 0.24), mats.alloy);
    rearStep.position.set(0, g.groundClearance + 0.06, -halfL - 0.10);
    tagPart(rearStep, 'Degrau de Maca SAMU', 0, -0.1, -0.5);
    group.add(rearStep);

    const acPod = new THREE.Mesh(createRoundedBoxGeo(width * 0.54, 0.18, 1.15, 0.05, 2, 8), mats.secondary);
    acPod.position.set(0, cabTopY + 0.09, -length * 0.14);
    group.add(acPod);
  } else if (isFoodTruck) {
    // Hinged Gourmet Serving Window Hatch + Stainless Counter + Roof Chimney
    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(width * 0.502, cabTopY - 0.22, -0.2);
    const awning = new THREE.Mesh(createRoundedBoxGeo(0.06, 0.82, length * 0.44, 0.02, 2, 8), mats.accent);
    awning.position.set(0, -0.41, 0);
    hatchPivot.add(awning);
    tagPart(hatchPivot, 'Janela Balcão Gourmet Articulada', 0.6, 0.2, 0);
    group.add(hatchPivot);
    registerOpenable(animated, hatchPivot, 'Janela Food Truck', { z: 1.38 });

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.07, length * 0.42), mats.chrome);
    counter.position.set(width * 0.52, beltY - 0.06, -0.2);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 14), mats.chrome);
    chimney.position.set(-width * 0.22, cabTopY + 0.16, -0.55);
    group.add(counter, chimney);
  } else if (isSweeper) {
    [-1, 1].forEach((side) => {
      const brushGroup = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.40, 0.16, 20), mats.accent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 14), mats.trim);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), mats.trim);
      arm.position.set(0, 0.14, -0.25);
      brushGroup.add(disc, hub, arm);
      brushGroup.position.set(side * (width * 0.46), 0.12, halfL + 0.24);
      tagPart(brushGroup, 'Escovas Varredouras Giratórias', side * 0.35, -0.1, 0.65);
      group.add(brushGroup);
      animated.sweeperBrushes.push(disc);
    });
  } else {
    // Courier Van: ribbed side cargo panels + sliding side door + roof rack
    const sideDoor = new THREE.Group();
    sideDoor.position.set(width * 0.504, (g.groundClearance + cabTopY) * 0.52, -0.15);
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
    sideDoor.add(sLeaf, sWin);
    tagPart(sideDoor, 'Porta Lateral Corrediça Carga', 0.45, 0, 0);
    group.add(sideDoor);
    registerOpenable(animated, sideDoor, 'Porta Lateral Carga', {}, new THREE.Vector3(0.08, 0, -length * 0.22));
  }

  // Roof Rack / Lightbars
  if (g.attachments.includes('roof_rack')) {
    const rw = width * 0.76;
    const rl = length * 0.52;
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
    const lbW = Math.min(1.26, width * 0.62);
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
    lb.position.set(0, cabTopY + 0.05, wsTopZ - 0.16);
    group.add(lb);
  }

  // Pushbar / Bullbar for Armored Tactical
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

  // Wheels + Running Boards
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

  buildWheelWellLiners(group, g.wheelRadius, g.wheelWidth, width, frontWheelZ, rearWheelZ, mats, cityMode);
  addHeavyBumperAndLights(group, width, g.groundClearance, halfL - 0.04, -halfL + 0.04, mats, useChrome, false, isArmored);
  addBusAndTruckExhaust(group, width, -halfL, g.groundClearance, mats, 'single');
  enableShadows(group);
  return group;
}
