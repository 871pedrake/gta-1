import * as THREE from 'three';
import { VehicleConcept, WheelStyle } from '../../types/vehicle';
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
  buildSculptedCabin,
  createCraftedWheel,
  createTrapezoidGlassGeo,
} from './wheelsAndInterior';
import { addExhaustSystem, addVehicleAttachments } from './wheeledVehicles';
import { buildAirplaneOrJetVehicle, buildHelicopterVehicle } from './airVehicles';

function buildCoilShockMesh(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  coilR: number,
  wireR: number,
  turns: number,
  bodyMat: THREE.Material,
  springMat: THREE.Material,
  cityMode = false,
): THREE.Group {
  const shock = new THREE.Group();
  shock.add(makeStrutBetween(p1, p2, wireR * 1.4, wireR * 1.4, bodyMat, cityMode ? 6 : 8));
  if (!cityMode) {
    const axis = new THREE.Vector3().subVectors(p2, p1);
    const len = axis.length();
    const dir = axis.clone().normalize();
    const upRef = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(dir, upRef).normalize();
    const wVec = new THREE.Vector3().crossVectors(dir, u).normalize();
    const pts: THREE.Vector3[] = [];
    const steps = Math.max(18, Math.round(turns * 8));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const axial = 0.16 + t * 0.68;
      const a = t * turns * Math.PI * 2;
      const pt = p1
        .clone()
        .addScaledVector(dir, len * axial)
        .addScaledVector(u, Math.cos(a) * coilR)
        .addScaledVector(wVec, Math.sin(a) * coilR);
      pts.push(pt);
    }
    const springMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 26, wireR, 6, false),
      springMat,
    );
    shock.add(springMesh);
  }
  return shock;
}

interface HandlebarOpts {
  barW: number;
  barY: number;
  barZ: number;
  mountY: number;
  mountZ: number;
  forkSpanX?: number;
  style: 'cruiser' | 'naked' | 'sport_clipon' | 'dirt' | 'scooter' | 'atv' | 'trike' | 'jetski';
  sweepBack?: number;
  barRise?: number;
  hasCrossbar?: boolean;
  hasHandguards?: boolean;
  hasMirrors?: boolean;
  barMat?: THREE.Material;
}

function buildConnectedHandlebar(
  group: THREE.Group,
  mats: VehicleMaterialSet,
  opts: HandlebarOpts,
  cityMode = false,
): THREE.Group {
  const barGrp = new THREE.Group();
  barGrp.position.set(0, opts.mountY, opts.mountZ);
  const ly = (y: number) => y - opts.mountY;
  const lz = (z: number) => z - opts.mountZ;

  const halfW = opts.barW * 0.5;
  const sweep = opts.sweepBack ?? (opts.style === 'cruiser' ? 0.11 : opts.style === 'atv' ? 0.05 : 0.06);
  const rise = opts.barRise ?? (opts.style === 'cruiser' ? 0.05 : opts.style === 'dirt' ? 0.035 : 0.02);
  const barMat = opts.barMat ?? (opts.style === 'cruiser' || opts.style === 'naked' ? mats.chrome : mats.trim);
  const tubeR = opts.style === 'jetski' ? 0.015 : 0.016;

  // Perch & grip coordinates along the swept bar (local to mountY/mountZ)
  const perchRatio = 0.66;
  const perchX = halfW * perchRatio;
  const perchY = ly(opts.barY + rise * 0.82);
  const perchZ = lz(opts.barZ - sweep * 0.62);
  const gripEndY = ly(opts.barY + rise);
  const gripEndZ = lz(opts.barZ - sweep);
  const locBarY = ly(opts.barY);
  const locBarZ = lz(opts.barZ);

  if (opts.style === 'sport_clipon') {
    const fSpan = opts.forkSpanX ?? 0.105;
    [-1, 1].forEach((side) => {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.042, 12),
        mats.alloy,
      );
      collar.position.set(side * fSpan, 0, 0);
      barGrp.add(collar);

      const clipBar = makeStrutBetween(
        new THREE.Vector3(side * fSpan, 0, 0),
        new THREE.Vector3(side * halfW, gripEndY - 0.018, locBarZ - sweep),
        tubeR,
        tubeR,
        mats.alloy,
        10,
      );
      barGrp.add(clipBar);
    });
  } else {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-halfW, gripEndY, gripEndZ),
      new THREE.Vector3(-perchX, perchY, perchZ),
      new THREE.Vector3(-halfW * 0.24, locBarY, locBarZ),
      new THREE.Vector3(0, locBarY, locBarZ + 0.008),
      new THREE.Vector3(halfW * 0.24, locBarY, locBarZ),
      new THREE.Vector3(perchX, perchY, perchZ),
      new THREE.Vector3(halfW, gripEndY, gripEndZ),
    ]);
    const barMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, cityMode ? 12 : 24, tubeR, cityMode ? 6 : 10, false),
      barMat,
    );
    barGrp.add(barMesh);

    if (opts.style === 'atv' || opts.style === 'trike' || opts.style === 'jetski' || opts.style === 'scooter') {
      const stemBase = new THREE.Vector3(0, -0.08, 0.03);
      const stemTop = new THREE.Vector3(0, locBarY - 0.012, locBarZ + 0.005);
      const stemShaft = makeStrutBetween(stemBase, stemTop, 0.024, 0.021, mats.trim, 12);
      const bootCollar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.052, 0.06, 12),
        mats.rubber,
      );
      bootCollar.position.set(0, 0.01, 0.01);
      const topClamp = new THREE.Mesh(
        createRoundedBoxGeo(0.115, 0.036, 0.058, 0.012, 2, 8),
        mats.alloy,
      );
      topClamp.position.set(0, locBarY - 0.004, locBarZ + 0.006);
      barGrp.add(stemShaft, bootCollar, topClamp);
    } else {
      const clampX = Math.min(0.068, halfW * 0.24);
      [-1, 1].forEach((side) => {
        const pClamp = new THREE.Vector3(side * clampX, 0.01, 0);
        const pBar = new THREE.Vector3(side * clampX, locBarY, locBarZ + 0.003);
        const riser = makeStrutBetween(pClamp, pBar, 0.021, 0.024, mats.alloy, 10);
        const saddle = new THREE.Mesh(
          createRoundedBoxGeo(0.044, 0.032, 0.048, 0.01, 2, 6),
          mats.alloy,
        );
        saddle.position.copy(pBar);
        barGrp.add(riser, saddle);
      });
      const bridge = new THREE.Mesh(
        createRoundedBoxGeo(clampX * 2.2, 0.026, 0.042, 0.01, 2, 6),
        mats.alloy,
      );
      bridge.position.set(0, locBarY - 0.018, locBarZ + 0.002);
      barGrp.add(bridge);
    }

    if (opts.hasCrossbar) {
      const cbY = locBarY + rise * 0.65;
      const cbZ = locBarZ - sweep * 0.35;
      const crossbar = makeStrutBetween(
        new THREE.Vector3(-halfW * 0.52, cbY, cbZ),
        new THREE.Vector3(halfW * 0.52, cbY, cbZ),
        0.009,
        0.009,
        mats.alloy,
        8,
      );
      const pad = new THREE.Mesh(
        createRoundedBoxGeo(halfW * 0.42, 0.042, 0.046, 0.015, 2, 8),
        mats.secondary,
      );
      pad.position.set(0, cbY, cbZ);
      barGrp.add(crossbar, pad);
    }
  }

  // Grips, bar ends, switch housings, brake/clutch levers & optional wraparound handguards
  [-1, 1].forEach((side) => {
    const gStart =
      opts.style === 'sport_clipon'
        ? new THREE.Vector3(
            THREE.MathUtils.lerp(opts.forkSpanX ?? 0.105, halfW, 0.42) * side,
            THREE.MathUtils.lerp(0, gripEndY - 0.018, 0.42),
            THREE.MathUtils.lerp(0, locBarZ - sweep, 0.42),
          )
        : new THREE.Vector3(side * perchX * 1.04, perchY, perchZ);
    const gEnd =
      opts.style === 'sport_clipon'
        ? new THREE.Vector3(side * halfW, gripEndY - 0.018, locBarZ - sweep)
        : new THREE.Vector3(side * halfW, gripEndY, gripEndZ);

    const grip = makeStrutBetween(gStart, gEnd, 0.023, 0.023, mats.rubber, cityMode ? 6 : 10);
    const barEnd = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.024, 10),
      mats.chrome,
    );
    barEnd.rotation.z = Math.PI / 2;
    barEnd.position.copy(gEnd);
    barGrp.add(grip, barEnd);

    if (!cityMode) {
      const switchHousing = new THREE.Mesh(
        createRoundedBoxGeo(0.048, 0.044, 0.052, 0.012, 2, 6),
        mats.trim,
      );
      switchHousing.position.copy(gStart);
      const lever = makeStrutBetween(
        new THREE.Vector3(gStart.x, gStart.y - 0.008, gStart.z + 0.032),
        new THREE.Vector3(gEnd.x * 0.94, gEnd.y - 0.014, gEnd.z + 0.042),
        0.007,
        0.006,
        mats.alloy,
        6,
      );
      barGrp.add(switchHousing, lever);

      if (opts.hasHandguards) {
        const guardMount = makeStrutBetween(
          new THREE.Vector3(gStart.x * 0.88, gStart.y + 0.008, gStart.z + 0.02),
          new THREE.Vector3(gEnd.x * 0.98, gEnd.y + 0.008, gEnd.z + 0.055),
          0.014,
          0.016,
          mats.body,
          6,
        );
        const guardEndStrut = makeStrutBetween(
          new THREE.Vector3(gEnd.x * 0.98, gEnd.y + 0.008, gEnd.z + 0.055),
          gEnd,
          0.01,
          0.01,
          mats.trim,
          6,
        );
        const guardShield = new THREE.Mesh(
          createRoundedBoxGeo(0.13, 0.068, 0.028, 0.012, 2, 6),
          mats.body,
        );
        guardShield.position.set(
          (gStart.x + gEnd.x) * 0.5,
          gEnd.y + 0.01,
          (gStart.z + gEnd.z) * 0.5 + 0.052,
        );
        barGrp.add(guardMount, guardEndStrut, guardShield);
      }
    }

    if (opts.hasMirrors !== false) {
      const mBase =
        opts.style === 'sport_clipon'
          ? new THREE.Vector3(side * (halfW * 0.62), gripEndY * 0.5 + 0.01, locBarZ - sweep * 0.45)
          : new THREE.Vector3(side * perchX, perchY + 0.012, perchZ);
      const mirTop = new THREE.Vector3(mBase.x + side * 0.075, mBase.y + 0.105, mBase.z - 0.025);

      const clampBoss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.032, 8),
        mats.trim,
      );
      clampBoss.position.copy(mBase);
      const stalk = makeStrutBetween(mBase, mirTop, 0.009, 0.009, mats.chrome, cityMode ? 6 : 10);
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(0.105, 0.058, 0.032, 0.014, 2, 8),
        mats.trim,
      );
      pod.position.set(mirTop.x + side * 0.028, mirTop.y + 0.006, mirTop.z);
      pod.rotation.y = side * -0.18;
      const face = new THREE.Mesh(
        createRoundedBoxGeo(0.088, 0.044, 0.01, 0.008, 2, 6),
        mats.mirrorGlass,
      );
      face.position.set(pod.position.x, pod.position.y, pod.position.z - 0.016);
      face.rotation.y = pod.rotation.y;
      barGrp.add(clampBoss, stalk, pod, face);
    }
  });

  tagPart(barGrp, 'Guidão Conectado, Mesa & Retrovisores', 0, 0.48, 0.18);
  group.add(barGrp);
  return barGrp;
}

// =========================================================================
// 7. HIGH-POLY MOTORCYCLES, SCOOTERS, SPORT TRIKES & ATVS
// =========================================================================
export function buildMotorcycleOrAtv(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const g = v.geometry;
  const fZ = wheelbase * 0.5;
  const rZ = -wheelbase * 0.5;

  if (g.archetype === 'trike') {
    const hull = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.36, 0.38, length * 0.72, 0.09, cityMode ? 2 : 5, 14),
      mats.body,
    );
    hull.position.set(0, g.groundClearance + 0.32, 0.02);
    tagPart(hull, 'Carenagem Central Sport Trike', 0, 0.25, 0);
    group.add(hull);

    // Sculpted side radiator cowls & front suspension frame
    [-1, 1].forEach((side) => {
      const cowl = new THREE.Mesh(
        createRoundedBoxGeo(0.14, 0.24, length * 0.38, 0.04, 2, 8),
        mats.secondary,
      );
      cowl.position.set(side * (width * 0.20), g.groundClearance + 0.34, 0.14);
      cowl.rotation.y = side * 0.16;
      group.add(cowl);
    });

    // Openable front luggage hood + recessed storage tub
    const tub = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.32, 0.14, length * 0.22, 0.03, 2, 8),
      mats.grille,
    );
    tub.position.set(0, g.groundClearance + 0.28, length * 0.28);
    group.add(tub);

    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, g.groundClearance + 0.43, length * 0.16);
    const hood = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.14, length * 0.32, 0.055, cityMode ? 2 : 4, 12),
      mats.body,
    );
    hood.position.set(0, -0.06, length * 0.14);
    hood.rotation.x = 0.22;
    hoodPivot.add(hood);
    tagPart(hoodPivot, 'Capô Dianteiro Porta-Capacete', 0, 0.2, 0.35);
    group.add(hoodPivot);
    if (!cityMode) {
      registerOpenable(animated, hoodPivot, 'Capô Trike', { x: -0.62 });
    }

    const screen = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.38, 0.28, 0.028, 0.012, 2, 8),
      mats.glass,
    );
    screen.position.set(0, g.groundClearance + 0.62, length * 0.14);
    screen.rotation.x = -0.58;
    screen.userData.noShadow = true;
    screen.renderOrder = 2;
    tagPart(screen, 'Para-brisa Esportivo', 0, 0.4, 0.2);
    group.add(screen);

    const seat = new THREE.Mesh(
      createRoundedBoxGeo(0.42, 0.18, 0.76, 0.06, 3, 12),
      mats.interior,
    );
    seat.position.set(0, g.groundClearance + 0.52, -0.18);
    tagPart(seat, 'Banco Esportivo Bipartido', 0, 0.35, -0.1);
    group.add(seat);

    // Connected steering column, billet clamp, digital TFT pod & perch mirrors
    const trikeBarY = g.groundClearance + 0.68;
    const trikeBarZ = length * 0.04;
    const trikeBar = buildConnectedHandlebar(
      group,
      mats,
      {
        barW: width * 0.48,
        barY: trikeBarY,
        barZ: trikeBarZ,
        mountY: g.groundClearance + 0.50,
        mountZ: length * 0.09,
        style: 'trike',
        sweepBack: 0.065,
        barRise: 0.025,
        hasMirrors: true,
      },
      cityMode,
    );
    animated.steeringPivots.push(trikeBar);

    if (!cityMode) {
      const dash = new THREE.Mesh(
        createRoundedBoxGeo(0.16, 0.075, 0.026, 0.01, 2, 6),
        mats.sirenBlue,
      );
      dash.position.set(0, trikeBarY + 0.02, trikeBarZ + 0.055);
      dash.rotation.x = -0.45;
      group.add(dash);
    }

    [-1, 1].forEach((side) => {
      const lowerArm = makeStrutBetween(
        new THREE.Vector3(side * width * 0.14, g.wheelRadius - 0.02, fZ),
        new THREE.Vector3(side * width * 0.44, g.wheelRadius - 0.02, fZ),
        0.02,
        0.02,
        mats.trim,
        8,
      );
      const upperArm = makeStrutBetween(
        new THREE.Vector3(side * width * 0.14, g.wheelRadius + 0.11, fZ - 0.02),
        new THREE.Vector3(side * width * 0.42, g.wheelRadius + 0.07, fZ),
        0.016,
        0.016,
        mats.alloy,
        8,
      );
      const fShock = buildCoilShockMesh(
        new THREE.Vector3(side * width * 0.34, g.wheelRadius, fZ),
        new THREE.Vector3(side * width * 0.17, g.groundClearance + 0.38, fZ - 0.06),
        0.03,
        0.008,
        5,
        mats.trim,
        mats.accent,
        cityMode,
      );
      group.add(lowerArm, upperArm, fShock);

      const steerPivot = new THREE.Group();
      steerPivot.position.set(side * (width * 0.44), g.wheelRadius, fZ);
      const fw = createCraftedWheel(
        g.wheelRadius,
        g.wheelWidth,
        wheelStyle,
        mats,
        side > 0,
        false,
        cityMode,
      );
      tagPart(fw, 'Roda Dianteira Trike', side * 0.45, -0.05, 0);
      steerPivot.add(fw);
      group.add(steerPivot);
      animated.steeringPivots.push(steerPivot);
      animated.wheels.push(fw);

      const hl = new THREE.Mesh(
        createRoundedBoxGeo(0.14, 0.07, 0.06, 0.02, 2, 8),
        mats.headlight,
      );
      hl.position.set(side * width * 0.16, g.groundClearance + 0.36, length * 0.44);
      const blinkF = new THREE.Mesh(
        createRoundedBoxGeo(0.055, 0.032, 0.035, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkF.position.set(side * (width * 0.25), g.groundClearance + 0.36, length * 0.43);
      const beam = createHeadlightBeamMesh(3.6, 0.72, 0.08);
      beam.position.set(side * width * 0.16, g.groundClearance + 0.36, length * 0.46);
      group.add(hl, blinkF, beam);
      animated.headlightBeams.push(beam);
    });

    const rearW = createCraftedWheel(
      g.wheelRadius * 1.06,
      g.wheelWidth * 1.45,
      wheelStyle,
      mats,
      true,
      false,
      cityMode,
    );
    rearW.position.set(0, g.wheelRadius * 1.06, rZ);
    tagPart(rearW, 'Roda Traseira Larga', 0, -0.05, -0.4);
    group.add(rearW);
    animated.wheels.push(rearW);

    const rearTl = new THREE.Mesh(
      createRoundedBoxGeo(0.22, 0.055, 0.045, 0.015, 2, 8),
      mats.taillight,
    );
    rearTl.position.set(0, g.groundClearance + 0.48, -length * 0.43);
    group.add(rearTl);
    [-1, 1].forEach((side) => {
      const blinkR = new THREE.Mesh(
        createRoundedBoxGeo(0.06, 0.035, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkR.position.set(side * 0.17, g.groundClearance + 0.48, -length * 0.43);
      group.add(blinkR);
    });

    addExhaustSystem(group, width * 0.5, length * 0.48, g.groundClearance + 0.05, mats, 'dual');
    enableShadows(group);
    return group;
  }

  if (g.archetype === 'atv') {
    // Cyberquad-inspired angular faceted quadricycle architecture (image_52ac7ca8.png)
    const halfL = length * 0.5;
    const baseChassisY = g.groundClearance + 0.06;

    // 1. Central tubular steel frame + front aluminum bash/skid plate + engine/EV battery core
    const chassisCore = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.34, 0.24, length * 0.66, 0.035, 2, 8),
      mats.trim,
    );
    chassisCore.position.set(0, baseChassisY + 0.14, -0.02);
    group.add(chassisCore);

    const skidPlate = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.30, 0.04, 0.44, 0.015, 2, 6),
      mats.alloy,
    );
    skidPlate.position.set(0, baseChassisY + 0.08, fZ * 0.72);
    skidPlate.rotation.x = -0.58;
    group.add(skidPlate);

    const motorCore = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.30, 0.24, 0.42, 0.03, 2, 8),
      mats.grille,
    );
    motorCore.position.set(0, baseChassisY + 0.16, 0.02);
    tagPart(motorCore, 'Chassi Tubular e Bloco Motor', 0, 0.12, 0);
    group.add(motorCore);

    // 2. Faceted angular Cyberquad upper nose & side tank body (ExtrudeGeometry side silhouette)
    const hullProfile = new THREE.Shape();
    hullProfile.moveTo(-halfL * 0.84, baseChassisY + 0.22); // rear tail lower
    hullProfile.lineTo(-halfL * 0.20, baseChassisY + 0.16); // rider footwell cut
    hullProfile.lineTo(fZ * 0.46, baseChassisY + 0.22); // front lower nose
    hullProfile.lineTo(halfL * 0.96, baseChassisY + 0.32); // sharp angular front prow
    hullProfile.lineTo(halfL * 0.82, baseChassisY + 0.49); // nose brow ridge
    hullProfile.lineTo(fZ * 0.38, baseChassisY + 0.62); // faceted hood peak ahead of stem
    hullProfile.lineTo(0.08, baseChassisY + 0.46); // saddle pocket transition
    hullProfile.lineTo(-halfL * 0.88, baseChassisY + 0.56); // upswept cyber rear tail
    hullProfile.closePath();

    const mainHull = new THREE.Mesh(
      createExtrudedProfile(hullProfile, width * 0.36, 0.03, 0.025, 1, 6),
      mats.body,
    );
    tagPart(mainHull, 'Carenagem Angular Cyberquad', 0, 0.32, 0);
    group.add(mainHull);

    // Angular faceted front hood cowl + recessed openable cargo hatch
    const noseUpper = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.48, 0.16, length * 0.30, 0.02, 1, 6),
      mats.body,
    );
    noseUpper.position.set(0, baseChassisY + 0.44, fZ * 0.72);
    noseUpper.rotation.x = 0.36;
    group.add(noseUpper);

    const frontBoxPivot = new THREE.Group();
    frontBoxPivot.position.set(0, baseChassisY + 0.52, fZ * 0.44);
    const frontLid = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.46, 0.06, 0.36, 0.015, 1, 6),
      mats.secondary,
    );
    frontLid.position.set(0, -0.02, 0.18);
    frontLid.rotation.x = 0.34;
    frontBoxPivot.add(frontLid);
    tagPart(frontBoxPivot, 'Compartimento Dianteiro ATV', 0, 0.45, 0.3);
    group.add(frontBoxPivot);
    if (!cityMode) {
      registerOpenable(animated, frontBoxPivot, 'Baú Dianteiro ATV', { x: -0.75 });
    }

    // 3. Flared angular quad wheel fenders + side footwell boards & twin tail fins (matching Cyberquad!)
    [-1, 1].forEach((side) => {
      // Flared front angular fender wing
      const fFender = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.24, 0.055, length * 0.34, 0.015, 1, 6),
        mats.body,
      );
      fFender.position.set(side * (width * 0.32), baseChassisY + 0.40, fZ * 0.76);
      fFender.rotation.z = side * -0.24;
      fFender.rotation.x = 0.22;
      group.add(fFender);

      // Angular side knee/tank shroud + footwell running board + heel guard
      const sidePod = new THREE.Mesh(
        createRoundedBoxGeo(0.11, 0.22, length * 0.38, 0.015, 1, 6),
        mats.secondary,
      );
      sidePod.position.set(side * (width * 0.21), baseChassisY + 0.30, 0.06);
      sidePod.rotation.y = side * 0.18;
      const footwell = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.22, 0.045, 0.42, 0.015, 1, 6),
        mats.trim,
      );
      footwell.position.set(side * (width * 0.25), baseChassisY + 0.07, -0.04);
      const rFender = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.24, 0.065, length * 0.34, 0.015, 1, 6),
        mats.body,
      );
      rFender.position.set(side * (width * 0.31), baseChassisY + 0.44, rZ * 0.78);
      rFender.rotation.z = side * -0.22;
      rFender.rotation.x = -0.26;
      const tailFin = new THREE.Mesh(
        createRoundedBoxGeo(0.065, 0.14, 0.42, 0.012, 1, 6),
        mats.body,
      );
      tailFin.position.set(side * (width * 0.14), baseChassisY + 0.56, rZ * 0.84);
      tailFin.rotation.x = -0.28;
      group.add(sidePod, footwell, rFender, tailFin);
    });

    // 4. Exposed Dual A-Arm Front Suspension, Rear Swingarm & Coil-Over Shocks
    const wheelX = width * 0.41;
    [-1, 1].forEach((side) => {
      const hubPtL = new THREE.Vector3(side * (wheelX - 0.04), g.wheelRadius - 0.03, fZ);
      const hubPtU = new THREE.Vector3(side * (wheelX - 0.06), g.wheelRadius + 0.09, fZ);
      const fArmL = makeStrutBetween(
        new THREE.Vector3(side * 0.12, baseChassisY + 0.06, fZ - 0.06),
        hubPtL,
        0.016,
        0.016,
        mats.alloy,
        8,
      );
      const fArmU = makeStrutBetween(
        new THREE.Vector3(side * 0.13, baseChassisY + 0.18, fZ - 0.05),
        hubPtU,
        0.014,
        0.014,
        mats.alloy,
        8,
      );
      const fShock = buildCoilShockMesh(
        new THREE.Vector3(side * (wheelX * 0.68), g.wheelRadius + 0.03, fZ),
        new THREE.Vector3(side * 0.16, baseChassisY + 0.34, fZ - 0.04),
        0.028,
        0.008,
        5,
        mats.trim,
        mats.accent,
        cityMode,
      );
      const rSwing = makeStrutBetween(
        new THREE.Vector3(side * 0.13, baseChassisY + 0.10, -0.18),
        new THREE.Vector3(side * (wheelX - 0.06), g.wheelRadius, rZ),
        0.02,
        0.022,
        mats.alloy,
        8,
      );
      group.add(fArmL, fArmU, fShock, rSwing);
    });
    const rShock = buildCoilShockMesh(
      new THREE.Vector3(0, g.wheelRadius + 0.04, rZ + 0.12),
      new THREE.Vector3(0, baseChassisY + 0.38, rZ + 0.36),
      0.036,
      0.01,
      5,
      mats.trim,
      mats.accent,
      cityMode,
    );
    const rearAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, wheelX * 1.9, 10),
      mats.alloy,
    );
    rearAxle.rotation.z = Math.PI / 2;
    rearAxle.position.set(0, g.wheelRadius, rZ);
    group.add(rShock, rearAxle);

    // 5. Recessed LED Headlight Strip + Turn Signals + Headlight Beams
    const hlBar = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.055, 0.05, 0.012, 2, 6),
      mats.headlight,
    );
    hlBar.position.set(0, baseChassisY + 0.38, halfL * 0.90);
    hlBar.rotation.x = 0.22;
    const tlBar = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.36, 0.045, 0.045, 0.01, 2, 6),
      mats.taillight,
    );
    tlBar.position.set(0, baseChassisY + 0.48, -halfL * 0.88);
    group.add(hlBar, tlBar);

    [-1, 1].forEach((side) => {
      const fBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.06, 0.038, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      fBlink.position.set(side * (width * 0.26), baseChassisY + 0.38, halfL * 0.89);
      const rBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.06, 0.038, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      rBlink.position.set(side * (width * 0.24), baseChassisY + 0.48, -halfL * 0.88);
      group.add(fBlink, rBlink);

      const beam = createHeadlightBeamMesh(3.2, 0.54, 0.09);
      beam.position.set(side * (width * 0.14), baseChassisY + 0.38, halfL * 0.92);
      group.add(beam);
      animated.headlightBeams.push(beam);
    });

    if (g.attachments.includes('bullbar')) {
      const bullGrp = new THREE.Group();
      const bTop = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, width * 0.56, 10), mats.trim);
      bTop.rotation.z = Math.PI / 2;
      bTop.position.set(0, baseChassisY + 0.30, halfL * 0.95);
      const bBot = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, width * 0.48, 10), mats.trim);
      bBot.rotation.z = Math.PI / 2;
      bBot.position.set(0, baseChassisY + 0.14, halfL * 0.92);
      bullGrp.add(bTop, bBot);
      [-1, 1].forEach((side) => {
        bullGrp.add(
          makeStrutBetween(
            new THREE.Vector3(side * width * 0.18, baseChassisY + 0.14, halfL * 0.65),
            new THREE.Vector3(side * width * 0.22, baseChassisY + 0.30, halfL * 0.95),
            0.02,
            0.02,
            mats.trim,
            8,
          ),
        );
      });
      tagPart(bullGrp, 'Quebra-Mato Tubular Integrado', 0, 0.18, 0.45);
      group.add(bullGrp);
    }

    const rearRackGrp = new THREE.Group();
    const rearRackPlate = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.58, 0.04, 0.38, 0.015, 2, 8),
      mats.trim,
    );
    rearRackPlate.position.set(0, baseChassisY + 0.56, rZ * 0.84);
    rearRackGrp.add(rearRackPlate);
    [-1, 1].forEach((side) => {
      rearRackGrp.add(
        makeStrutBetween(
          new THREE.Vector3(side * width * 0.15, baseChassisY + 0.42, rZ * 0.72),
          new THREE.Vector3(side * width * 0.24, baseChassisY + 0.55, rZ * 0.84),
          0.014,
          0.014,
          mats.trim,
          6,
        ),
      );
    });
    tagPart(rearRackGrp, 'Bagageiro Tubular Traseiro', 0, 0.45, -0.35);
    group.add(rearRackGrp);

    // 6. Sculpted ATV Straddle Saddle + Solid Steering Stem + Braced Handlebar & Connected Mirrors
    const seat = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.28, 0.12, length * 0.40, 0.045, 3, 10),
      mats.interior,
    );
    seat.position.set(0, baseChassisY + 0.52, -0.14);
    tagPart(seat, 'Assento Anatômico ATV', 0, 0.45, 0);
    group.add(seat);

    const atvBar = buildConnectedHandlebar(
      group,
      mats,
      {
        barW: width * 0.74,
        barY: Math.max(height * 0.88, baseChassisY + 0.72),
        barZ: fZ * 0.34,
        mountY: baseChassisY + 0.56,
        mountZ: fZ * 0.44,
        style: 'atv',
        sweepBack: 0.055,
        barRise: 0.032,
        hasCrossbar: true,
        hasHandguards: true,
        hasMirrors: true,
      },
      cityMode,
    );
    animated.steeringPivots.push(atvBar);

    // 7. Four Chunky Balloon Quad Wheels (front wheels steered; tagPart AFTER positioning!)
    [fZ, rZ].forEach((wz) => {
      const isFront = wz === fZ;
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
        if (isFront) {
          const steerPivot = new THREE.Group();
          steerPivot.position.set(side * wheelX, g.wheelRadius, wz);
          steerPivot.add(w);
          tagPart(steerPivot, 'Roda Balão ATV Dianteira', side * 0.4, -0.05, 0);
          group.add(steerPivot);
          animated.steeringPivots.push(steerPivot);
        } else {
          w.position.set(side * wheelX, g.wheelRadius, wz);
          tagPart(w, 'Roda Balão ATV Traseira', side * 0.4, -0.05, 0);
          group.add(w);
        }
        animated.wheels.push(w);
      });
    });

    if (g.exhaustStyle !== 'none') {
      addExhaustSystem(group, width * 0.42, length * 0.45, g.groundClearance + 0.22, mats, g.exhaustStyle ?? 'single');
    }
    enableShadows(group);
    return group;
  }

  // Two-wheel Motorcycle / Scooter (High-Poly Stylized Mechanical Architecture)
  const buildCoilShock = (
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    coilR: number,
    wireR: number,
    turns: number,
    springMat: THREE.Material,
  ): THREE.Group => {
    const shock = new THREE.Group();
    shock.add(makeStrutBetween(p1, p2, wireR * 1.4, wireR * 1.4, mats.trim, cityMode ? 6 : 8));
    if (!cityMode) {
      const axis = new THREE.Vector3().subVectors(p2, p1);
      const len = axis.length();
      const dir = axis.clone().normalize();
      const upRef = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const u = new THREE.Vector3().crossVectors(dir, upRef).normalize();
      const wVec = new THREE.Vector3().crossVectors(dir, u).normalize();
      const pts: THREE.Vector3[] = [];
      const steps = Math.max(18, Math.round(turns * 8));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const axial = 0.16 + t * 0.68;
        const a = t * turns * Math.PI * 2;
        const pt = p1
          .clone()
          .addScaledVector(dir, len * axial)
          .addScaledVector(u, Math.cos(a) * coilR)
          .addScaledVector(wVec, Math.sin(a) * coilR);
        pts.push(pt);
      }
      const springMesh = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, wireR, 6, false),
        springMat,
      );
      shock.add(springMesh);
    }
    return shock;
  };

  const isScooter = g.archetype === 'scooter';
  const isCruiser = g.archetype === 'cruiser';
  const isDirt = g.archetype === 'dirtbike';
  const isNaked = g.archetype === 'sportbike' && (v.id === 71 || v.id === 72);
  const isFairedSport = g.archetype === 'sportbike' && !isNaked;
  const isMaxiScooter = isScooter && v.id === 77;
  const isElectricMoto = g.exhaustStyle === 'none';

  const headZ = isCruiser ? fZ * 0.52 : isDirt ? fZ * 0.62 : isScooter ? fZ * 0.66 : fZ * 0.65;
  const headY = isCruiser ? g.groundClearance + 0.68 : isDirt ? g.groundClearance + 0.78 : g.groundClearance + 0.70;
  const forkSpanX = isScooter ? 0.085 : 0.105;
  const forkMat = isFairedSport || isDirt ? mats.accent : mats.chrome;
  const sliderMat = isCruiser || isNaked ? mats.trim : mats.alloy;

  const frontForkPivot = new THREE.Group();
  frontForkPivot.position.set(0, headY, headZ);
  group.add(frontForkPivot);
  animated.steeringPivots.push(frontForkPivot);

  // 1. Front & Rear Crafted Wheels + Brake Discs + Calipers + Drive Chain / Sprocket
  const frontW = createCraftedWheel(
    g.wheelRadius,
    g.wheelWidth,
    wheelStyle,
    mats,
    true,
    false,
    cityMode,
  );
  frontW.position.set(0, g.wheelRadius - headY, fZ - headZ);
  tagPart(frontW, 'Roda Dianteira', 0, -0.05, 0.35);
  frontForkPivot.add(frontW);
  animated.wheels.push(frontW);

  const rearW = createCraftedWheel(
    g.wheelRadius,
    g.wheelWidth * (isFairedSport || isCruiser ? 1.32 : 1.2),
    wheelStyle,
    mats,
    true,
    false,
    cityMode,
  );
  rearW.position.set(0, g.wheelRadius, rZ);
  tagPart(rearW, 'Roda Traseira', 0, -0.05, -0.35);
  group.add(rearW);
  animated.wheels.push(rearW);

  if (!cityMode && !isScooter) {
    // Explicit perforated front & rear brake discs + rear drive sprocket & chain
    const fDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(g.wheelRadius * 0.56, g.wheelRadius * 0.56, 0.016, 20),
      mats.brakeDisc,
    );
    fDisc.rotation.z = Math.PI / 2;
    fDisc.position.set(g.wheelWidth * 0.56, g.wheelRadius - headY, fZ - headZ);
    const rSprocket = new THREE.Mesh(
      new THREE.CylinderGeometry(g.wheelRadius * 0.38, g.wheelRadius * 0.38, 0.018, 18),
      mats.alloy,
    );
    rSprocket.rotation.z = Math.PI / 2;
    rSprocket.position.set(-g.wheelWidth * 0.72, g.wheelRadius, rZ);
    frontForkPivot.add(fDisc);
    group.add(rSprocket);
  }

  // 2. Steering Head, Upper & Lower Triple Clamps, USD/Telescopic Forks & Front Fender
  const neck = makeStrutBetween(
    new THREE.Vector3(0, -0.14, 0.05),
    new THREE.Vector3(0, 0.04, -0.02),
    0.036,
    0.038,
    mats.trim,
    10,
  );
  frontForkPivot.add(neck);

  [0.02, -0.13].forEach((dy, idx) => {
    const clamp = new THREE.Mesh(
      createRoundedBoxGeo(forkSpanX * 2.5, 0.032, 0.085, 0.012, 2, 8),
      mats.alloy,
    );
    clamp.position.set(0, dy, idx === 1 ? 0.045 : -0.01);
    frontForkPivot.add(clamp);
  });

  [-1, 1].forEach((side) => {
    const botPt = new THREE.Vector3(side * forkSpanX, g.wheelRadius - headY, fZ - headZ);
    const midPt = new THREE.Vector3(
      side * forkSpanX,
      THREE.MathUtils.lerp(g.wheelRadius, headY, 0.56) - headY,
      THREE.MathUtils.lerp(fZ, headZ, 0.56) - headZ,
    );
    const topPt = new THREE.Vector3(side * forkSpanX, 0.04, -0.015);
    const lowerTube = makeStrutBetween(botPt, midPt, 0.022, 0.020, sliderMat, cityMode ? 6 : 12);
    const upperStanchion = makeStrutBetween(midPt, topPt, 0.027, 0.027, forkMat, cityMode ? 6 : 12);
    tagPart(upperStanchion, 'Suspensão Dianteira (Garfo)', side * 0.25, 0.2, 0.25);
    frontForkPivot.add(lowerTube, upperStanchion);
  });

  // Front Fender (High motocross beak on dirtbikes, valanced arc on others)
  if (isDirt) {
    const beakPts = new THREE.Shape();
    beakPts.moveTo(-0.08, 0.02);
    beakPts.quadraticCurveTo(0.18, 0.08, 0.44, -0.02);
    beakPts.lineTo(0.42, -0.055);
    beakPts.quadraticCurveTo(0.16, 0.03, -0.08, -0.02);
    beakPts.closePath();
    const beakGeo = createExtrudedProfile(beakPts, 0.16, 0.015, 0.015, 2, 10);
    const beak = new THREE.Mesh(beakGeo, mats.body);
    beak.position.set(0, -0.15, 0.05);
    frontForkPivot.add(beak);
  } else {
    const fenderArc = isCruiser ? Math.PI * 0.68 : Math.PI * 0.55;
    const fFender = new THREE.Mesh(
      new THREE.TorusGeometry(g.wheelRadius * 1.07, isCruiser ? 0.052 : 0.04, 8, 18, fenderArc),
      mats.body,
    );
    fFender.rotation.y = Math.PI / 2;
    fFender.rotation.x = isCruiser ? -0.24 : -0.35;
    fFender.position.set(0, g.wheelRadius - headY, fZ - headZ);
    frontForkPivot.add(fFender);
  }

  // 3. Tubular Cradle / Trellis Frame, Swingarm, Coil-Over Shocks & Kickstand
  const swingPivotY = g.groundClearance + (isDirt ? 0.22 : 0.16);
  const swingPivotZ = -0.22;
  const subRearY = g.groundClearance + (isDirt ? 0.68 : isCruiser ? 0.44 : 0.58);
  const subRearZ = rZ + 0.06;

  [-1, 1].forEach((side) => {
    const sx = side * 0.11;
    // Lower cradle rail + upper perimeter / trellis backbone rail
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx * 0.85, g.groundClearance + 0.08, 0.24),
        new THREE.Vector3(0, headY - 0.14, headZ + 0.04),
        0.02,
        0.022,
        mats.trim,
        8,
      ),
    );
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx * 0.85, g.groundClearance + 0.08, 0.24),
        new THREE.Vector3(sx, swingPivotY, swingPivotZ),
        0.02,
        0.02,
        mats.trim,
        8,
      ),
    );
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx, headY - 0.02, headZ - 0.04),
        new THREE.Vector3(sx, g.groundClearance + 0.48, swingPivotZ - 0.02),
        0.024,
        0.022,
        isNaked ? mats.accent : mats.trim,
        10,
      ),
    );
    // Subframe trellis strut supporting tail/seat
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx, g.groundClearance + 0.44, swingPivotZ - 0.02),
        new THREE.Vector3(sx * 0.88, subRearY, subRearZ),
        0.018,
        0.018,
        isNaked ? mats.accent : mats.trim,
        8,
      ),
    );
    // Box-section Rear Swingarm arms
    const swingarm = makeStrutBetween(
      new THREE.Vector3(sx * 1.12, swingPivotY, swingPivotZ),
      new THREE.Vector3(side * (g.wheelWidth * 0.78), g.wheelRadius, rZ),
      0.024,
      0.028,
      mats.alloy,
      8,
    );
    tagPart(swingarm, 'Balança Traseira e Suspensão', side * 0.2, 0, -0.2);
    group.add(swingarm);

    // Rider footpegs
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 8), mats.trim);
    peg.rotation.z = Math.PI / 2;
    peg.position.set(side * 0.21, g.groundClearance + 0.14, -0.10);
    group.add(peg);
  });

  // Rear Coil-Over Shock Springs (Twin exposed chrome coil-overs on naked/cruiser/scooter; central monoshock on sport/dirt)
  if (isNaked || isCruiser || isScooter) {
    [-1, 1].forEach((side) => {
      const pBot = new THREE.Vector3(side * 0.13, g.wheelRadius + 0.06, rZ + 0.08);
      const pTop = new THREE.Vector3(side * 0.12, subRearY - 0.02, rZ + 0.26);
      const shock = buildCoilShock(pBot, pTop, 0.032, 0.0085, 6.5, mats.chrome);
      tagPart(shock, 'Amortecedor Traseiro Coil-Over', side * 0.22, 0.15, -0.2);
      group.add(shock);
    });
  } else {
    const monoBot = new THREE.Vector3(0, swingPivotY + 0.04, swingPivotZ - 0.12);
    const monoTop = new THREE.Vector3(0, g.groundClearance + 0.44, swingPivotZ - 0.02);
    const monoshock = buildCoilShock(monoBot, monoTop, 0.042, 0.0105, 5.5, mats.accent);
    tagPart(monoshock, 'Monoamortecedor Central Traseiro', 0, 0.12, -0.15);
    group.add(monoshock);
  }

  // Left-side kickstand + chain run
  if (!cityMode) {
    const stand = makeStrutBetween(
      new THREE.Vector3(-0.12, g.groundClearance + 0.09, -0.16),
      new THREE.Vector3(-0.24, 0.02, -0.32),
      0.014,
      0.012,
      mats.trim,
      8,
    );
    group.add(stand);

    if (!isScooter) {
      const chainTop = makeStrutBetween(
        new THREE.Vector3(-g.wheelWidth * 0.72, swingPivotY + 0.04, swingPivotZ),
        new THREE.Vector3(-g.wheelWidth * 0.72, g.wheelRadius + g.wheelRadius * 0.34, rZ),
        0.012,
        0.012,
        mats.grille,
        6,
      );
      const chainBot = makeStrutBetween(
        new THREE.Vector3(-g.wheelWidth * 0.72, swingPivotY - 0.04, swingPivotZ),
        new THREE.Vector3(-g.wheelWidth * 0.72, g.wheelRadius - g.wheelRadius * 0.34, rZ),
        0.012,
        0.012,
        mats.grille,
        6,
      );
      group.add(chainTop, chainBot);
    }
  }

  // 4. Sculpted Air-Cooled / Finned Engine Block + Crankcase + Side Covers (or EV Motor Core)
  const engineGrp = new THREE.Group();
  const engBaseY = g.groundClearance + 0.18;
  const crankcase = new THREE.Mesh(
    createRoundedBoxGeo(0.27, 0.20, 0.36, 0.04, 3, 10),
    mats.alloy,
  );
  crankcase.position.set(0, engBaseY, -0.02);
  engineGrp.add(crankcase);

  if (isElectricMoto) {
    const battPack = new THREE.Mesh(
      createRoundedBoxGeo(0.28, 0.32, 0.40, 0.045, 3, 10),
      mats.trim,
    );
    battPack.position.set(0, engBaseY + 0.12, 0.04);
    const cyanCore = new THREE.Mesh(
      createRoundedBoxGeo(0.30, 0.10, 0.28, 0.02, 2, 8),
      mats.accent,
    );
    cyanCore.position.set(0, engBaseY + 0.14, 0.04);
    engineGrp.add(battPack, cyanCore);
  } else if (isCruiser) {
    // Classic V-Twin angled finned cylinders + chrome round air filter + metallic side covers
    [-1, 1].forEach((vDir) => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.082, 0.24, 12), mats.trim);
      cyl.position.set(0, engBaseY + 0.18, 0.02 + vDir * 0.10);
      cyl.rotation.x = vDir * 0.38;
      engineGrp.add(cyl);
      for (let f = 0; f < 5; f++) {
        const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.014, 12), mats.alloy);
        fin.position.set(0, engBaseY + 0.11 + f * 0.036, 0.02 + vDir * (0.06 + f * 0.016));
        fin.rotation.x = vDir * 0.38;
        engineGrp.add(fin);
      }
    });
    const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 16), mats.chrome);
    airCleaner.rotation.z = Math.PI / 2;
    airCleaner.position.set(0.17, engBaseY + 0.18, 0.02);
    engineGrp.add(airCleaner);
  } else if (!isScooter) {
    // Layered inline / thumper cylinder bank with 5 cooling fins (exact 113606 style!) + clutch/stator covers
    const cylBlock = new THREE.Mesh(
      createRoundedBoxGeo(0.24, 0.22, 0.24, 0.025, 2, 8),
      mats.trim,
    );
    cylBlock.position.set(0, engBaseY + 0.18, 0.08);
    cylBlock.rotation.x = 0.24;
    engineGrp.add(cylBlock);

    if (!cityMode) {
      for (let f = 0; f < 5; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.014, 0.26), mats.grille);
        fin.position.set(0, engBaseY + 0.11 + f * 0.036, 0.06 + f * 0.008);
        fin.rotation.x = 0.24;
        engineGrp.add(fin);
      }
    }

    // Metallic sculpted clutch & stator side covers
    [-1, 1].forEach((side) => {
      const cover = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.105, 0.06, 16),
        isNaked || isDirt ? mats.chrome : mats.alloy,
      );
      cover.rotation.z = Math.PI / 2;
      cover.position.set(side * 0.13, engBaseY - 0.01, -0.02);
      engineGrp.add(cover);
    });

    // Radiator in front of engine for sportbikes / naked streetfighters
    if (isFairedSport || v.id === 72) {
      const rad = new THREE.Mesh(
        createRoundedBoxGeo(0.28, 0.20, 0.045, 0.015, 2, 8),
        mats.grille,
      );
      rad.position.set(0, engBaseY + 0.16, 0.30);
      rad.rotation.x = 0.28;
      engineGrp.add(rad);
    }
  }

  tagPart(engineGrp, isElectricMoto ? 'Motor Elétrico & Bateria' : 'Motor Aletado e Cárter', 0, -0.15, 0);
  group.add(engineGrp);

  // 5. Archetype-Specific Bodywork, Faceted Fuel Tank, Cowlings & Seats
  if (isScooter) {
    // Curved Scooter Front Legshield + Stepped Floorboard + Side Cowls (Vespa vs Maxi-Scooter)
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(fZ * 0.28, g.groundClearance + 0.06);
    shieldShape.lineTo(fZ * 0.48, g.groundClearance + 0.14);
    shieldShape.quadraticCurveTo(fZ * 0.72, g.groundClearance + 0.42, headZ + 0.05, headY + 0.06);
    shieldShape.lineTo(headZ - 0.10, headY + 0.06);
    shieldShape.lineTo(fZ * 0.34, g.groundClearance + 0.18);
    shieldShape.closePath();

    const shieldGeo = createExtrudedProfile(
      shieldShape,
      isMaxiScooter ? 0.50 : 0.42,
      0.04,
      0.04,
      cityMode ? 2 : 4,
      14,
    );
    const shield = new THREE.Mesh(shieldGeo, mats.body);
    tagPart(shield, 'Escudo Frontal da Scooter', 0, 0.25, 0.3);
    group.add(shield);

    // Front classic tie/horn grille on legshield
    const tie = new THREE.Mesh(
      createRoundedBoxGeo(0.08, 0.34, 0.05, 0.015, 2, 6),
      isMaxiScooter ? mats.grille : mats.chrome,
    );
    tie.position.set(0, g.groundClearance + 0.42, fZ * 0.61);
    tie.rotation.x = -0.35;
    group.add(tie);

    // Flat/tunneled floorboard + rubber mat
    const floor = new THREE.Mesh(
      createRoundedBoxGeo(0.40, 0.08, 0.52, 0.03, 2, 8),
      mats.trim,
    );
    floor.position.set(0, g.groundClearance + 0.09, 0.10);
    group.add(floor);

    // Faceted rear body shell + side engine vent slats (113642 Vespa style!)
    const rearShell = new THREE.Mesh(
      createRoundedBoxGeo(isMaxiScooter ? 0.48 : 0.44, 0.34, 0.76, 0.08, cityMode ? 2 : 5, 14),
      mats.body,
    );
    rearShell.position.set(0, g.groundClearance + 0.33, rZ + 0.22);
    tagPart(rearShell, 'Carenagem Traseira', 0, 0.2, -0.25);
    group.add(rearShell);

    if (!cityMode) {
      const tub = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.14, 0.46, 0.04, 2, 8),
        mats.grille,
      );
      tub.position.set(0, g.groundClearance + 0.44, -0.22);
      group.add(tub);

      [-1, 1].forEach((side) => {
        for (let vIdx = 0; vIdx < 3; vIdx++) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.18), mats.trim);
          slat.position.set(side * (isMaxiScooter ? 0.24 : 0.22), g.groundClearance + 0.30 + vIdx * 0.042, rZ + 0.12);
          group.add(slat);
        }
      });
    }
  } else {
    // Faceted Sculpted Fuel Tank (ExtrudeGeometry silhouette with crisp chamfered facets like 113606 & 113632!)
    const tankShape = new THREE.Shape();
    if (isCruiser) {
      tankShape.moveTo(-0.26, -0.05);
      tankShape.quadraticCurveTo(-0.08, 0.14, 0.26, 0.13);
      tankShape.quadraticCurveTo(0.34, 0.04, 0.24, -0.06);
      tankShape.closePath();
    } else if (isDirt) {
      tankShape.moveTo(-0.24, -0.04);
      tankShape.lineTo(0.02, 0.11);
      tankShape.lineTo(0.28, 0.12);
      tankShape.lineTo(0.32, -0.04);
      tankShape.closePath();
    } else {
      // Angular faceted naked / sport tank (113606 & 113632)
      tankShape.moveTo(-0.28, -0.06);
      tankShape.lineTo(-0.12, 0.13);
      tankShape.lineTo(0.16, 0.16);
      tankShape.lineTo(0.32, 0.06);
      tankShape.lineTo(0.26, -0.08);
      tankShape.closePath();
    }
    const tankGeo = createExtrudedProfile(
      tankShape,
      isDirt ? 0.24 : isCruiser ? 0.34 : 0.36,
      0.045,
      0.045,
      cityMode ? 2 : 3,
      10,
    );
    const tank = new THREE.Mesh(tankGeo, mats.body);
    tank.position.set(0, g.groundClearance + (isCruiser ? 0.56 : 0.62), 0.18);
    tagPart(tank, 'Tanque de Combustível Esculpido', 0, 0.4, 0);
    group.add(tank);

    // Fuel filler cap + tank racing stripe / console
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 12), mats.chrome);
    cap.position.set(0, tank.position.y + 0.17, 0.22);
    group.add(cap);

    const tankStripe = new THREE.Mesh(
      createRoundedBoxGeo(0.07, 0.025, 0.42, 0.01, 2, 6),
      isCruiser ? mats.chrome : mats.liveryStripe,
    );
    tankStripe.position.set(0, tank.position.y + 0.15, 0.18);
    group.add(tankStripe);

    // Naked Streetfighter radiator shrouds + side tank panels (113606 / VHC-72)
    if (isNaked) {
      [-1, 1].forEach((side) => {
        const shroud = new THREE.Mesh(
          createRoundedBoxGeo(0.045, 0.20, 0.26, 0.015, 2, 8),
          v.id === 72 ? mats.body : mats.secondary,
        );
        shroud.position.set(side * 0.16, g.groundClearance + 0.48, 0.32);
        shroud.rotation.y = side * 0.18;
        group.add(shroud);
      });
    }

    // Faired Superbike Angular Nose Cowling, Side Fairings, Belly Pan & Upswept Tail Cowl (113632 & 113620!)
    if (isFairedSport) {
      const noseShape = new THREE.Shape();
      noseShape.moveTo(-0.20, -0.14);
      noseShape.lineTo(0.28, -0.06);
      noseShape.lineTo(0.36, 0.06);
      noseShape.lineTo(0.10, 0.26);
      noseShape.lineTo(-0.22, 0.18);
      noseShape.closePath();
      const noseGeo = createExtrudedProfile(noseShape, 0.42, 0.035, 0.035, 2, 8);
      const nose = new THREE.Mesh(noseGeo, mats.body);
      nose.position.set(0, g.groundClearance + 0.62, fZ * 0.62);
      tagPart(nose, 'Carenagem Frontal Esportiva', 0, 0.3, 0.35);
      group.add(nose);

      // Dark angular nose intake bridge (signature 113632 detail!)
      const noseBridge = new THREE.Mesh(
        createRoundedBoxGeo(0.16, 0.22, 0.28, 0.02, 2, 6),
        mats.trim,
      );
      noseBridge.position.set(0, g.groundClearance + 0.72, fZ * 0.72);
      noseBridge.rotation.x = -0.35;
      group.add(noseBridge);

      // Multi-faceted layered side fairings with engine vents
      [-1, 1].forEach((side) => {
        const sideFairing = new THREE.Mesh(
          createRoundedBoxGeo(0.055, 0.38, 0.62, 0.025, 2, 8),
          mats.body,
        );
        sideFairing.position.set(side * 0.20, g.groundClearance + 0.40, 0.24);
        sideFairing.rotation.y = side * 0.10;
        sideFairing.rotation.x = 0.18;
        group.add(sideFairing);

        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.11, 0.18), mats.grille);
        vent.position.set(side * 0.205, g.groundClearance + 0.38, 0.12);
        vent.rotation.x = 0.18;
        group.add(vent);
      });

      // Lower aerodynamic belly pan
      const belly = new THREE.Mesh(
        createRoundedBoxGeo(0.30, 0.18, 0.62, 0.045, 3, 10),
        mats.secondary,
      );
      belly.position.set(0, g.groundClearance + 0.16, 0.04);
      group.add(belly);

      // Tinted angular sport windscreen (113632)
      const windscreen = new THREE.Mesh(
        createRoundedBoxGeo(0.30, 0.24, 0.025, 0.015, 2, 8),
        mats.glass,
      );
      windscreen.position.set(0, g.groundClearance + 0.90, fZ * 0.56);
      windscreen.rotation.x = -0.68;
      windscreen.userData.noShadow = true;
      windscreen.renderOrder = 2;
      tagPart(windscreen, 'Bolha Acrílica Transparente', 0, 0.45, 0.35);
      group.add(windscreen);
    }

    // Sharply upswept sculpted Tail Cowl + Rear Plate Holder ("Tail-Tidy" on sport/naked)
    const tailY = isDirt ? g.groundClearance + 0.72 : isCruiser ? g.groundClearance + 0.50 : g.groundClearance + 0.66;
    const tailCowl = new THREE.Mesh(
      createRoundedBoxGeo(isDirt ? 0.22 : 0.26, 0.11, 0.46, 0.03, 2, 8),
      mats.body,
    );
    tailCowl.position.set(0, tailY, rZ + 0.02);
    tailCowl.rotation.x = isCruiser ? -0.06 : 0.22;
    group.add(tailCowl);

    if (!isCruiser) {
      const tailTidy = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.03), mats.trim);
      tailTidy.position.set(0, tailY - 0.11, rZ - 0.19);
      tailTidy.rotation.x = 0.55;
      group.add(tailTidy);
    } else {
      // Deep valanced rear cruiser fender
      const rFender = new THREE.Mesh(
        new THREE.TorusGeometry(g.wheelRadius * 1.09, 0.055, 8, 18, Math.PI * 0.65),
        mats.body,
      );
      rFender.rotation.y = Math.PI / 2;
      rFender.rotation.x = 0.28;
      rFender.position.set(0, g.wheelRadius, rZ);
      group.add(rFender);
    }
  }

  // Touring Windscreen + Saddlebags + Engine Crash Guard ("Mata-Cachorro")
  if (g.attachments.includes('moto_windscreen')) {
    const ws = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.38, 0.025, 0.02, 2, 8),
      mats.glass,
    );
    ws.position.set(0, g.groundClearance + 0.94, fZ * 0.52);
    ws.rotation.x = -0.35;
    ws.userData.noShadow = true;
    ws.renderOrder = 2;
    tagPart(ws, 'Para-brisa Alto Touring', 0, 0.5, 0.35);
    group.add(ws);
  }

  if (v.id === 42) {
    // Tubular front crash bars ("mata-cachorro") on Moto-Entrega
    [-1, 1].forEach((side) => {
      const bar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 14, Math.PI), mats.chrome);
      bar.rotation.y = side * (Math.PI / 2);
      bar.position.set(side * 0.15, g.groundClearance + 0.26, 0.26);
      group.add(bar);
    });
  }

  if (g.attachments.includes('moto_saddlebags')) {
    [-1, 1].forEach((side) => {
      const bag = new THREE.Mesh(
        createRoundedBoxGeo(0.18, 0.26, 0.44, 0.04, 3, 10),
        mats.secondary,
      );
      bag.position.set(side * 0.26, g.groundClearance + 0.42, rZ + 0.06);
      tagPart(bag, 'Alforges Laterais Touring', side * 0.3, 0.2, -0.2);
      group.add(bag);

      if (!cityMode) {
        const lidPivot = new THREE.Group();
        lidPivot.position.set(side * 0.18, g.groundClearance + 0.55, rZ + 0.06);
        const lid = new THREE.Mesh(
          createRoundedBoxGeo(0.19, 0.05, 0.45, 0.02, 2, 8),
          mats.accent,
        );
        lid.position.set(side * 0.08, 0.015, 0);
        lidPivot.add(lid);
        group.add(lidPivot);
        registerOpenable(animated, lidPivot, 'Tampas dos Alforges', { z: side * 0.85 });
      }
    });
  }

  // 6. Ergonomic Sculpted Seat (Split Rider/Pillion on sportbike, Stepped Café/Retro, Flat Dirt Gripper, Cruiser Solo)
  const seatPivot = new THREE.Group();
  const seatBaseY = isCruiser ? g.groundClearance + 0.45 : isDirt ? g.groundClearance + 0.64 : g.groundClearance + 0.56;
  seatPivot.position.set(0, seatBaseY, 0.02);

  if (isFairedSport) {
    const riderPad = new THREE.Mesh(createRoundedBoxGeo(0.26, 0.09, 0.36, 0.04, 3, 10), mats.interior);
    riderPad.position.set(0, 0, -0.22);
    const pillionPad = new THREE.Mesh(createRoundedBoxGeo(0.20, 0.08, 0.26, 0.03, 3, 8), mats.interior);
    pillionPad.position.set(0, 0.09, -0.54);
    pillionPad.rotation.x = 0.18;
    seatPivot.add(riderPad, pillionPad);
  } else {
    const seat = new THREE.Mesh(
      createRoundedBoxGeo(isCruiser ? 0.34 : 0.28, 0.12, isDirt ? 0.72 : 0.62, 0.05, cityMode ? 2 : 4, 12),
      mats.interior,
    );
    seat.position.set(0, 0, -0.30);
    seatPivot.add(seat);
    if (v.id === 71) {
      // Classic Café Racer rear seat hump
      const hump = new THREE.Mesh(createRoundedBoxGeo(0.26, 0.14, 0.26, 0.06, 3, 10), mats.body);
      hump.position.set(0, 0.06, -0.54);
      seatPivot.add(hump);
    }
  }
  tagPart(seatPivot, 'Banco Ergonômico', 0, 0.35, -0.1);
  group.add(seatPivot);
  if (!cityMode && isScooter) {
    registerOpenable(animated, seatPivot, 'Banco Baú Scooter', { x: 0.78 });
  }

  // 7. Connected Handlebars + Billet Risers/Clip-Ons + Rubber Grips + Levers + Gauges + Perch Mirrors
  const barY = isFairedSport
    ? headY + 0.04
    : isCruiser
      ? headY + 0.14
      : isDirt
        ? headY + 0.11
        : headY + 0.10;
  const barZ = isFairedSport ? headZ - 0.04 : headZ - 0.055;
  const barW = width * (isFairedSport ? 0.78 : isCruiser ? 0.92 : 0.88);
  const hbStyle: HandlebarOpts['style'] = isFairedSport
    ? 'sport_clipon'
    : isCruiser
      ? 'cruiser'
      : isDirt
        ? 'dirt'
        : isScooter
          ? 'scooter'
          : 'naked';

  buildConnectedHandlebar(
    frontForkPivot,
    mats,
    {
      barW,
      barY: barY - headY,
      barZ: barZ - headZ,
      mountY: 0.02,
      mountZ: -0.01,
      forkSpanX,
      style: hbStyle,
      sweepBack: isCruiser ? 0.11 : isFairedSport ? 0.08 : 0.06,
      barRise: isCruiser ? 0.045 : isDirt ? 0.03 : 0.02,
      hasCrossbar: isDirt,
      hasHandguards: isDirt,
      hasMirrors: true,
    },
    cityMode,
  );

  if (!cityMode) {
    // Twin round gauges (113606 Naked / Cruiser) or TFT digital dash (Sport / Dirt / Maxi)
    if (isNaked || isCruiser) {
      [-0.055, 0.055].forEach((gx) => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.06, 12), mats.trim);
        pod.rotation.x = Math.PI / 3;
        pod.position.set(gx, 0.09, 0.04);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.064, 12), mats.sirenBlue);
        dial.rotation.x = Math.PI / 3;
        dial.position.copy(pod.position);
        frontForkPivot.add(pod, dial);
      });
    } else {
      const tft = new THREE.Mesh(createRoundedBoxGeo(0.14, 0.075, 0.024, 0.01, 2, 6), mats.sirenBlue);
      tft.position.set(0, 0.09, 0.02);
      tft.rotation.x = -0.48;
      frontForkPivot.add(tft);
    }
  }

  // 8. Authentic Headlights + Turn Signals + Beams & Taillight
  if (isFairedSport || isMaxiScooter) {
    [-1, 1].forEach((side) => {
      const bezel = new THREE.Mesh(createRoundedBoxGeo(0.12, 0.075, 0.06, 0.015, 2, 8), mats.grille);
      bezel.position.set(side * 0.105, g.groundClearance + 0.65, fZ * 0.80);
      bezel.rotation.y = side * -0.22;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.07, 12), mats.headlight);
      lens.rotation.x = Math.PI / 2;
      lens.position.copy(bezel.position);
      const blinkF = new THREE.Mesh(
        createRoundedBoxGeo(0.052, 0.03, 0.035, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkF.position.set(side * 0.22, g.groundClearance + 0.64, fZ * 0.72);
      const beam = createHeadlightBeamMesh(3.8, 0.72, 0.08);
      beam.position.set(side * 0.105, g.groundClearance + 0.65, fZ * 0.84);
      group.add(bezel, lens, blinkF, beam);
      animated.headlightBeams.push(beam);
    });
    tagPart(group.children[group.children.length - 1], 'Conjunto Óptico Duplo Projetor', 0, 0.25, 0.4);
  } else {
    const hlBucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.108, 0.09, 0.14, 16),
      isCruiser || isNaked ? mats.chrome : mats.trim,
    );
    hlBucket.rotation.x = Math.PI / 2;
    hlBucket.position.set(0, -0.02, 0.10);
    const hlLens = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 16), mats.headlight);
    hlLens.rotation.x = Math.PI / 2;
    hlLens.position.set(0, -0.02, 0.16);
    const beam = createHeadlightBeamMesh(3.6, 0.72, 0.08);
    beam.position.set(0, -0.02, 0.18);
    tagPart(hlBucket, 'Farol Dianteiro Projetor', 0, 0.25, 0.4);
    frontForkPivot.add(hlBucket, hlLens, beam);
    animated.headlightBeams.push(beam);

    [-1, 1].forEach((side) => {
      const blinkF = new THREE.Mesh(
        createRoundedBoxGeo(0.05, 0.032, 0.036, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkF.position.set(side * 0.14, -0.02, 0.08);
      frontForkPivot.add(blinkF);
    });
  }

  const tl = new THREE.Mesh(
    createRoundedBoxGeo(0.14, 0.055, 0.055, 0.018, 2, 8),
    mats.taillight,
  );
  tl.position.set(
    0,
    g.groundClearance + (isScooter ? 0.42 : isCruiser ? 0.48 : 0.62),
    isScooter ? rZ - 0.16 : rZ - 0.14,
  );
  tagPart(tl, 'Lanterna Traseira LED', 0, 0.2, -0.4);
  group.add(tl);

  [-1, 1].forEach((side) => {
    const blinkR = new THREE.Mesh(
      createRoundedBoxGeo(0.05, 0.032, 0.038, 0.01, 2, 6),
      side < 0 ? mats.signalLeft : mats.signalRight,
    );
    blinkR.position.set(side * 0.13, tl.position.y, tl.position.z);
    group.add(blinkR);
  });

  // 9. Sculpted Exhaust Headers + Upswept / Megaphone / Shotgun Muffler (none on Electric EV!)
  if (!isElectricMoto) {
    const buildMotoExhaust = (sideSign: number) => {
      const exCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sideSign * 0.08, engBaseY + 0.12, 0.24),
        new THREE.Vector3(sideSign * 0.15, g.groundClearance + 0.10, 0.08),
        new THREE.Vector3(sideSign * 0.18, g.groundClearance + 0.13, -0.26),
        new THREE.Vector3(
          sideSign * 0.20,
          isDirt ? g.groundClearance + 0.50 : isCruiser ? g.groundClearance + 0.16 : g.groundClearance + 0.26,
          rZ - 0.02,
        ),
      ]);
      const exGrp = new THREE.Group();
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(exCurve, 18, 0.028, 10, false),
        isNaked || isCruiser ? mats.chrome : mats.alloy,
      );
      const mufLen = isCruiser ? 0.52 : 0.38;
      const mufAngle = isDirt ? 0.32 : isCruiser ? 0.03 : 0.28;
      const mufY = isDirt
        ? g.groundClearance + 0.48
        : isCruiser
          ? g.groundClearance + 0.16
          : g.groundClearance + 0.26;
      const muffler = new THREE.Mesh(
        new THREE.CylinderGeometry(isCruiser ? 0.044 : 0.058, 0.042, mufLen, 8),
        isCruiser ? mats.chrome : isNaked ? mats.alloy : mats.trim,
      );
      muffler.rotation.x = Math.PI / 2 - mufAngle;
      muffler.position.set(sideSign * 0.20, mufY, rZ + 0.04);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 10), mats.exhaustBore);
      bore.rotation.x = muffler.rotation.x;
      bore.position.set(sideSign * 0.20, mufY + Math.sin(mufAngle) * (mufLen * 0.5), rZ + 0.04 - mufLen * 0.48);
      exGrp.add(pipe, muffler, bore);
      tagPart(exGrp, 'Escapamento Esportivo', sideSign * 0.35, 0, -0.2);
      group.add(exGrp);
    };
    buildMotoExhaust(1);
    if (g.attachments.includes('dual_exhaust') || g.exhaustStyle === 'dual') buildMotoExhaust(-1);
  }

  if (g.attachments.includes('moto_box')) {
    const box = new THREE.Mesh(
      createRoundedBoxGeo(0.48, 0.36, 0.48, 0.05, 3, 10),
      mats.accent,
    );
    box.position.set(0, g.groundClearance + 0.74, rZ - 0.05);
    tagPart(box, 'Baú Térmico de Entregas', 0, 0.6, -0.3);
    group.add(box);

    if (!cityMode) {
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, g.groundClearance + 0.92, rZ - 0.28);
      const lid = new THREE.Mesh(
        createRoundedBoxGeo(0.49, 0.08, 0.49, 0.04, 2, 8),
        mats.secondary,
      );
      lid.position.set(0, 0.03, 0.23);
      lidPivot.add(lid);
      group.add(lidPivot);
      registerOpenable(animated, lidPivot, 'Tampa Baú Delivery', { x: -0.92 });
    }
  }

  if (g.attachments.includes('lightbar_police')) {
    [-1, 1].forEach((side) => {
      const sirenPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), mats.chrome);
      sirenPole.position.set(side * 0.18, g.groundClearance + 0.78, rZ - 0.12);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.09, 14),
        side < 0 ? mats.sirenBlue : mats.sirenRed,
      );
      beacon.position.set(side * 0.18, g.groundClearance + 0.96, rZ - 0.12);
      tagPart(beacon, 'Giroflex Traseiro Polícia', side * 0.2, 0.5, -0.2);
      group.add(sirenPole, beacon);

      const frontStrobe = new THREE.Mesh(
        createRoundedBoxGeo(0.06, 0.036, 0.04, 0.01, 2, 6),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      frontStrobe.position.set(side * 0.14, g.groundClearance + 0.54, fZ * 0.84);
      group.add(frontStrobe);
    });
  }

  enableShadows(group);
  return group;
}

// =========================================================================
// 8. WATERCRAFT (LOFTED 3D V-HULLS, DETAILED INTERIORS & OPENABLE DOORS)
// =========================================================================
interface LoftedHullOptions {
  vDepth: number;
  bowLift: number;
  deckRatio: number;
  aftDeckRatio: number;
  cockpitFloorRatio: number;
  wallThick: number;
  stations?: number;
}

function createLoftedBoatHullGeo(
  length: number,
  width: number,
  hullH: number,
  opts: LoftedHullOptions,
): THREE.BufferGeometry {
  const N = opts.stations ?? 16;
  const halfL = length * 0.5;
  const maxBeam = width * 0.5;
  const deckStartT = 1 - opts.deckRatio;
  const aftEndT = opts.aftDeckRatio;

  const rings: THREE.Vector3[][] = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N; // 0 = stern (-halfL), 1 = bow (+halfL)
    const z = -halfL + t * length;

    // Planform beam curve: full aft/mid, tapering gracefully to bow stem
    const beamFactor =
      t >= 0.999
        ? 0
        : t < 0.35
          ? 0.88 + 0.12 * Math.sin((t / 0.35) * (Math.PI * 0.5))
          : Math.pow(Math.max(0, 1 - (t - 0.35) / 0.65), 0.58);

    const beamW = maxBeam * beamFactor;
    const chineW = beamW * 0.83;

    // Sheer & keel rise gracefully toward bow
    const sheerY = hullH * (1 + opts.bowLift * Math.pow(t, 1.75));
    const keelY = t < 0.55 ? 0.05 : 0.05 + hullH * (0.64 * Math.pow((t - 0.55) / 0.45, 2.2));
    const chineY = Math.min(sheerY - 0.02, keelY + hullH * opts.vDepth * (1 + t * 0.35));

    const innerBeamW = t > 0.94 ? 0 : Math.max(0, beamW - Math.min(opts.wallThick, beamW * 0.48));
    const innerFloorW = innerBeamW * 0.72;

    // Determine cockpit recess vs raised foredeck / aft bulkhead
    let floorY = sheerY;
    if (t > aftEndT && t < deckStartT) {
      const targetFloor = Math.max(keelY + 0.12, hullH * opts.cockpitFloorRatio);
      const aftBlend = THREE.MathUtils.smoothstep(t, aftEndT, aftEndT + 0.05);
      const bowBlend = 1 - THREE.MathUtils.smoothstep(t, deckStartT - 0.06, deckStartT);
      const blend = Math.min(aftBlend, bowBlend);
      floorY = THREE.MathUtils.lerp(sheerY, targetFloor, blend);
    } else if (t >= deckStartT && t < 0.96) {
      // Subtle cambered foredeck crown
      floorY = sheerY + 0.045 * Math.sin(((t - deckStartT) / Math.max(0.05, 1 - deckStartT)) * Math.PI);
    }

    const ring: THREE.Vector3[] = [
      new THREE.Vector3(0, keelY, z), // 0: keel
      new THREE.Vector3(chineW, chineY, z), // 1: stbd chine
      new THREE.Vector3(beamW, sheerY, z), // 2: stbd outer gunwale
      new THREE.Vector3(innerBeamW, sheerY, z), // 3: stbd inner gunwale
      new THREE.Vector3(innerFloorW, floorY, z), // 4: stbd cockpit floor
      new THREE.Vector3(0, floorY, z), // 5: centerline cockpit/deck
      new THREE.Vector3(-innerFloorW, floorY, z), // 6: port cockpit floor
      new THREE.Vector3(-innerBeamW, sheerY, z), // 7: port inner gunwale
      new THREE.Vector3(-beamW, sheerY, z), // 8: port outer gunwale
      new THREE.Vector3(-chineW, chineY, z), // 9: port chine
    ];
    rings.push(ring);
  }

  const M = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j < M; j++) {
      const p = rings[i][j];
      positions.push(p.x, p.y, p.z);
    }
  }

  // Loft quads between longitudinal stations with verified outward normals
  for (let i = 0; i < N; i++) {
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

  // Stern transom cap at i = 0 (normals pointing -Z)
  // Fan from centerline floor/transom point (index 5) around outer hull & gunwale
  const centerIdx = 5;
  for (let j = 0; j < M; j++) {
    const jNext = (j + 1) % M;
    if (j === centerIdx || jNext === centerIdx) continue;
    indices.push(centerIdx, jNext, j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addHullSheerStripes(
  group: THREE.Group,
  length: number,
  width: number,
  hullH: number,
  bowLift: number,
  mat: THREE.Material,
  cityMode: boolean,
) {
  const halfL = length * 0.5;
  const maxBeam = width * 0.5;
  [-1, 1].forEach((side) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const z = -halfL + t * length;
      const beamFactor =
        t >= 0.999
          ? 0
          : t < 0.35
            ? 0.88 + 0.12 * Math.sin((t / 0.35) * (Math.PI * 0.5))
            : Math.pow(Math.max(0, 1 - (t - 0.35) / 0.65), 0.58);
      const sheerY = hullH * (1 + bowLift * Math.pow(t, 1.75));
      pts.push(new THREE.Vector3(side * (maxBeam * beamFactor * 1.005), sheerY - hullH * 0.14, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, cityMode ? 12 : 24, 0.036, 8, false),
      mat,
    );
    group.add(tube);
  });
}

function addBowPulpitRail(
  group: THREE.Group,
  length: number,
  width: number,
  deckY: number,
  bowLift: number,
  mat: THREE.Material,
  cityMode: boolean,
) {
  const halfL = length * 0.5;
  const maxBeam = width * 0.5;
  const railPts: THREE.Vector3[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const u = -1 + (2 * i) / steps; // -1 port -> 0 bow -> +1 stbd
    const t = 1 - Math.abs(u) * 0.38;
    const z = -halfL + t * length - 0.08;
    const beamFactor =
      t >= 0.999 ? 0 : Math.pow(Math.max(0, 1 - (t - 0.35) / 0.65), 0.58);
    const x = Math.sign(u) * maxBeam * beamFactor * 0.86;
    const y = deckY * (1 + bowLift * Math.pow(t, 1.75)) + 0.24;
    railPts.push(new THREE.Vector3(x, y, z));
  }
  const railCurve = new THREE.CatmullRomCurve3(railPts);
  const rail = new THREE.Mesh(
    new THREE.TubeGeometry(railCurve, cityMode ? 12 : 24, 0.02, 8, false),
    mat,
  );
  tagPart(rail, 'Guarda-Mancebo Inox de Proa', 0, 0.35, 0.35);
  group.add(rail);

  [0, 2, 4, 6, 8].forEach((idx) => {
    const p = railPts[idx];
    const stanchion = makeStrutBetween(
      new THREE.Vector3(p.x, p.y - 0.24, p.z),
      p,
      0.016,
      0.016,
      mat,
      8,
    );
    group.add(stanchion);
  });
}

function addMarineHelmConsole(
  group: THREE.Group,
  width: number,
  floorY: number,
  helmZ: number,
  mats: VehicleMaterialSet,
  sideOffset = 0,
  cityMode = false,
  animated?: BuiltVehicle['animatedParts'],
) {
  const helm = new THREE.Group();
  const cons = new THREE.Mesh(
    createRoundedBoxGeo(Math.min(0.82, width * 0.38), 0.72, 0.48, 0.06, 3, 10),
    mats.secondary,
  );
  cons.position.set(0, 0.36, 0);
  helm.add(cons);

  const binnacle = new THREE.Mesh(
    createRoundedBoxGeo(Math.min(0.68, width * 0.32), 0.16, 0.26, 0.03, 2, 8),
    mats.trim,
  );
  binnacle.position.set(0, 0.74, 0.04);
  helm.add(binnacle);

  const gpsScreen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.03), mats.sirenBlue);
  gpsScreen.position.set(-0.08, 0.75, -0.09);
  gpsScreen.rotation.x = -0.25;
  helm.add(gpsScreen);

  // Stainless 3-spoke marine helm wheel inside tilted column mount
  const wheelMount = new THREE.Group();
  wheelMount.position.set(0.12, 0.68, -0.24);
  wheelMount.rotation.x = 0.42;

  const wheelGrp = new THREE.Group();
  wheelGrp.add(
    new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, cityMode ? 14 : 24), mats.chrome),
  );
  for (let s = 0; s < 3; s++) {
    const a = (s * Math.PI * 2) / 3;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.15, 0.014), mats.chrome);
    sp.position.set(Math.sin(a) * 0.075, Math.cos(a) * 0.075, 0);
    sp.rotation.z = -a;
    wheelGrp.add(sp);
  }
  wheelMount.add(wheelGrp);
  helm.add(wheelMount);
  animated?.steeringWheels.push(wheelGrp);

  // Twin chrome throttle levers
  const thrBase = new THREE.Mesh(
    createRoundedBoxGeo(0.1, 0.08, 0.16, 0.02, 2, 6),
    mats.chrome,
  );
  thrBase.position.set(0.28, 0.74, -0.04);
  helm.add(thrBase);
  const thrLever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), mats.accent);
  thrLever.position.set(0.28, 0.82, -0.04);
  thrLever.rotation.x = 0.28;
  helm.add(thrLever);

  helm.position.set(sideOffset, floorY, helmZ);
  tagPart(helm, 'Console de Comando e Timão Náutico', 0, 0.35, 0.15);
  group.add(helm);
}

function addFramedBoatWindshield(
  group: THREE.Group,
  width: number,
  baseY: number,
  frontZ: number,
  h: number,
  mats: VehicleMaterialSet,
  cityMode = false,
) {
  const wsGrp = new THREE.Group();
  const centerW = width * 0.46;
  const wingLen = width * 0.34;
  const wingX = centerW * 0.5 + wingLen * 0.42;
  const tilt = 0.58;
  const topY = h * Math.cos(tilt);
  const topDropZ = h * Math.sin(tilt);

  // Center raked trapezoidal windshield pane + upper & side mullions
  const centerPane = new THREE.Mesh(
    createTrapezoidGlassGeo(centerW * 1.06, centerW * 0.94, h * 0.96, 0.022),
    mats.glass,
  );
  centerPane.position.set(0, topY * 0.5, frontZ - topDropZ * 0.5);
  centerPane.rotation.x = -tilt;
  centerPane.userData.noShadow = true;
  centerPane.renderOrder = 2;
  wsGrp.add(centerPane);

  // Top header bar across center & side wings
  const topHeader = new THREE.Mesh(
    createRoundedBoxGeo(centerW * 0.98, 0.036, 0.042, 0.012, 2, 8),
    mats.chrome,
  );
  topHeader.position.set(0, topY, frontZ - topDropZ);
  wsGrp.add(topHeader);

  [-1, 1].forEach((side) => {
    // Center A-pillar mullion
    wsGrp.add(
      makeStrutBetween(
        new THREE.Vector3(side * (centerW * 0.52), 0, frontZ),
        new THREE.Vector3(side * (centerW * 0.47), topY, frontZ - topDropZ),
        0.02,
        0.024,
        mats.chrome,
        cityMode ? 6 : 10,
      ),
    );

    // Swept side glass wing flush between A-pillar and rear wing post
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-wingLen, 0);
    wingShape.lineTo(-wingLen * 0.86, topY);
    wingShape.lineTo(-topDropZ, topY);
    wingShape.closePath();

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    wingGeo.rotateY(-Math.PI / 2);
    const pos = wingGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const t = THREE.MathUtils.clamp(py / topY, 0, 1);
      const pz = pos.getZ(i);
      const backFraction = THREE.MathUtils.clamp(-pz / wingLen, 0, 1);
      const baseX = THREE.MathUtils.lerp(centerW * 0.52, wingX, backFraction);
      pos.setX(i, side * (baseX - t * 0.05));
    }
    wingGeo.computeVertexNormals();
    const wingPane = new THREE.Mesh(wingGeo, mats.glass);
    wingPane.position.z = frontZ;
    wingPane.userData.noShadow = true;
    wingPane.renderOrder = 2;
    wsGrp.add(wingPane);

    // Side top rail + aft post
    wsGrp.add(
      makeStrutBetween(
        new THREE.Vector3(side * (centerW * 0.47), topY, frontZ - topDropZ),
        new THREE.Vector3(side * (wingX - 0.05), topY, frontZ - wingLen * 0.86),
        0.018,
        0.018,
        mats.chrome,
        8,
      ),
    );
    wsGrp.add(
      makeStrutBetween(
        new THREE.Vector3(side * wingX, 0, frontZ - wingLen),
        new THREE.Vector3(side * (wingX - 0.05), topY, frontZ - wingLen * 0.86),
        0.02,
        0.022,
        mats.chrome,
        8,
      ),
    );
  });

  wsGrp.position.y = baseY;
  tagPart(wsGrp, 'Para-brisa Náutico Envolvente com Moldura Inox', 0, 0.38, 0.15);
  group.add(wsGrp);
}

export function buildWatercraft(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;

  const hullH =
    g.archetype === 'tugboat'
      ? height * 0.42
      : g.archetype === 'yacht'
        ? height * 0.35
        : g.archetype === 'jetski'
          ? height * 0.48
          : height * 0.54;

  const hullOpts: LoftedHullOptions =
    g.archetype === 'jetski'
      ? {
          vDepth: 0.36,
          bowLift: 0.2,
          deckRatio: 0.42,
          aftDeckRatio: 0.08,
          cockpitFloorRatio: 0.58,
          wallThick: 0.1,
          stations: cityMode ? 8 : 16,
        }
      : g.archetype === 'tugboat'
        ? {
            vDepth: 0.22,
            bowLift: 0.24,
            deckRatio: 0.32,
            aftDeckRatio: 0.34,
            cockpitFloorRatio: 0.72,
            wallThick: 0.2,
            stations: cityMode ? 10 : 18,
          }
        : g.archetype === 'yacht'
          ? {
              vDepth: 0.28,
              bowLift: 0.18,
              deckRatio: 0.34,
              aftDeckRatio: 0.06,
              cockpitFloorRatio: 0.48,
              wallThick: 0.22,
              stations: cityMode ? 10 : 18,
            }
          : g.archetype === 'rib_boat'
            ? {
                vDepth: 0.34,
                bowLift: 0.22,
                deckRatio: 0.28,
                aftDeckRatio: 0.06,
                cockpitFloorRatio: 0.42,
                wallThick: 0.14,
                stations: cityMode ? 10 : 16,
              }
            : {
                vDepth: 0.38,
                bowLift: 0.22,
                deckRatio: length > 7.2 ? 0.38 : 0.26,
                aftDeckRatio: 0.05,
                cockpitFloorRatio: 0.4,
                wallThick: Math.min(0.22, width * 0.1),
                stations: cityMode ? 10 : 18,
              };

  // 1. Lofted Multi-Station Deep-V 3D Hull + Hollowed Cockpit Tub
  const hullGeo = createLoftedBoatHullGeo(length, width, hullH, hullOpts);
  const hull = new THREE.Mesh(hullGeo, mats.body);
  tagPart(hull, 'Casco 3D em V Profundo Esculpido', 0, -0.15, 0);
  group.add(hull);

  // Curved Sheer Boot-Stripe hugging both hull sides
  addHullSheerStripes(group, length, width, hullH, hullOpts.bowLift, mats.liveryStripe, cityMode);

  const floorY = hullH * hullOpts.cockpitFloorRatio + 0.025;

  // 2. Archetype-specific Superstructure, Interior & Articulated Doors/Hatches
  if (g.archetype === 'jetski') {
    const engineBay = createEngineBayAssembly(width * 0.42, length * 0.34, mats, false);
    engineBay.position.set(0, hullH * 0.62, -0.2);
    group.add(engineBay);

    const bowPivot = new THREE.Group();
    bowPivot.position.set(0, hullH * 0.94, halfL * 0.08);
    const cowling = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.7, 0.18, length * 0.42, 0.08, cityMode ? 2 : 5, 14),
      mats.body,
    );
    cowling.position.set(0, 0.02, length * 0.18);
    cowling.rotation.x = 0.16;
    bowPivot.add(cowling);
    tagPart(bowPivot, 'Carenagem Frontal Jet Ski (Porta-Objetos)', 0, 0.28, 0.2);
    group.add(bowPivot);
    if (!cityMode) {
      registerOpenable(animated, bowPivot, 'Capô Frontal Jet Ski', { x: -0.65 });
    }

    const seatPivot = new THREE.Group();
    seatPivot.position.set(0, hullH * 0.86, 0.14);
    const seat = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.22, length * 0.44, 0.085, cityMode ? 2 : 5, 14),
      mats.interior,
    );
    seat.position.set(0, 0.08, -length * 0.19);
    seatPivot.add(seat);
    tagPart(seatPivot, 'Banco Náutico Ergonômico (Acesso Motor)', 0, 0.35, 0);
    group.add(seatPivot);
    if (!cityMode) {
      registerOpenable(animated, seatPivot, 'Banco Motor Jet Ski', { x: 0.72 });
    }

    const helm = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.46, 0.28, 0.4, 0.08, 4, 12),
      mats.secondary,
    );
    helm.position.set(0, hullH + 0.18, 0.38);
    helm.rotation.x = -0.35;
    tagPart(helm, 'Coluna de Direção e Painel Digital', 0, 0.35, 0.2);
    group.add(helm);

    const dashScreen = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.03), mats.sirenBlue);
    dashScreen.position.set(0, hullH + 0.29, 0.34);
    dashScreen.rotation.x = -0.5;
    group.add(dashScreen);

    const wind = new THREE.Mesh(
      createTrapezoidGlassGeo(width * 0.42, width * 0.32, 0.18, 0.022),
      mats.glass,
    );
    wind.position.set(0, hullH + 0.36, 0.43);
    wind.rotation.x = -0.58;
    wind.userData.noShadow = true;
    wind.renderOrder = 2;
    tagPart(wind, 'Defletor Acrílico Transparente', 0, 0.45, 0.25);
    group.add(wind);

    const jetBar = buildConnectedHandlebar(
      group,
      mats,
      {
        barW: width * 0.64,
        barY: hullH + 0.34,
        barZ: 0.25,
        mountY: hullH + 0.24,
        mountZ: 0.31,
        style: 'jetski',
        sweepBack: 0.05,
        barRise: 0.02,
        hasMirrors: true,
      },
      cityMode,
    );
    animated.steeringPivots.push(jetBar);

    [-1, 1].forEach((side) => {
      const hl = new THREE.Mesh(
        createRoundedBoxGeo(0.09, 0.048, 0.06, 0.015, 2, 6),
        mats.headlight,
      );
      hl.position.set(side * (width * 0.14), hullH * 1.18, halfL * 0.62);
      const beam = createHeadlightBeamMesh(3.4, 0.56, 0.08);
      beam.position.set(side * (width * 0.14), hullH * 1.18, halfL * 0.66);
      const fBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.055, 0.032, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      fBlink.position.set(side * (width * 0.25), hullH * 1.13, halfL * 0.52);
      const rBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.055, 0.032, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      rBlink.position.set(side * (width * 0.24), hullH * 0.96, -halfL * 0.88);
      group.add(hl, beam, fBlink, rBlink);
      animated.headlightBeams.push(beam);
    });
    const sternTl = new THREE.Mesh(
      createRoundedBoxGeo(0.18, 0.045, 0.04, 0.012, 2, 6),
      mats.taillight,
    );
    sternTl.position.set(0, hullH * 0.96, -halfL * 0.88);
    group.add(sternTl);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.28, 18), mats.trim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.22, -halfL - 0.08);
    tagPart(nozzle, 'Bocal de Hidrojato Direcional', 0, 0, -0.5);
    group.add(nozzle);
  } else if (g.archetype === 'rib_boat') {
    // Sculpted perimeter inflatable Hypalon tubes wrapping full V-bow
    const hw = width * 0.48;
    const tubePts = [
      new THREE.Vector3(-hw * 0.86, hullH * 0.96, -halfL + 0.15),
      new THREE.Vector3(-hw * 0.94, hullH * 0.98, 0),
      new THREE.Vector3(-hw * 0.72, hullH * 1.06, halfL * 0.56),
      new THREE.Vector3(0, hullH * 1.18, halfL * 0.96),
      new THREE.Vector3(hw * 0.72, hullH * 1.06, halfL * 0.56),
      new THREE.Vector3(hw * 0.94, hullH * 0.98, 0),
      new THREE.Vector3(hw * 0.86, hullH * 0.96, -halfL + 0.15),
    ];
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tubePts), cityMode ? 18 : 36, 0.23, 16, false),
      mats.body,
    );
    tagPart(tube, 'Flutuadores Infláveis Perimetrais', 0, 0.35, 0);
    group.add(tube);

    // Non-skid cockpit deck sole
    const sole = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.58, 0.04, length * 0.58, 0.02, 2, 8),
      mats.grille,
    );
    sole.position.set(0, floorY, -length * 0.06);
    group.add(sole);

    // Center Jockey Console + Framed Windshield (elevated above bow collar) + Rescue Jockey Seats
    addMarineHelmConsole(group, width, floorY + 0.14, length * 0.06, mats, 0, cityMode, animated);
    addFramedBoatWindshield(group, width * 0.46, floorY + 0.88, length * 0.14, 0.46, mats, cityMode);

    [-0.22, 0.22].forEach((sx) => {
      const seat = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.44, 0.48, 0.06, 3, 10),
        mats.interior,
      );
      seat.position.set(sx, floorY + 0.22, -length * 0.14);
      group.add(seat);
    });

    // Articulated Bow Locker Hatch + Articulated Console Access Door + Side Rescue Gate
    if (!cityMode) {
      const bowHatchPivot = new THREE.Group();
      bowHatchPivot.position.set(0, hullH * 1.08, halfL * 0.62);
      const bowHatch = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.42, 0.06, length * 0.2, 0.03, 2, 8),
        mats.secondary,
      );
      bowHatch.position.set(0, 0.02, -length * 0.1);
      bowHatchPivot.add(bowHatch);
      tagPart(bowHatchPivot, 'Escotilha Paiol de Proa', 0, 0.35, 0.3);
      group.add(bowHatchPivot);
      registerOpenable(animated, bowHatchPivot, 'Escotilha Proa RIB', { x: -0.82 });

      const consDoorPivot = new THREE.Group();
      consDoorPivot.position.set(-width * 0.19, floorY + 0.34, length * 0.12);
      const cDoor = new THREE.Mesh(
        createRoundedBoxGeo(0.04, 0.52, 0.34, 0.015, 2, 6),
        mats.accent,
      );
      cDoor.position.set(0, 0, -0.17);
      consDoorPivot.add(cDoor);
      tagPart(consDoorPivot, 'Porta Compartimento Console', -0.25, 0.2, 0);
      group.add(consDoorPivot);
      registerOpenable(animated, consDoorPivot, 'Porta Console RIB', { y: 1.25 });

      const sideGatePivot = new THREE.Group();
      sideGatePivot.position.set(width * 0.41, hullH * 0.98, -length * 0.22);
      const gate = new THREE.Mesh(
        createRoundedBoxGeo(0.08, 0.28, 0.62, 0.03, 2, 8),
        mats.accent,
      );
      gate.position.set(0, 0, -0.31);
      sideGatePivot.add(gate);
      tagPart(sideGatePivot, 'Portão Lateral de Resgate', 0.35, 0.2, -0.2);
      group.add(sideGatePivot);
      registerOpenable(animated, sideGatePivot, 'Portão Resgate RIB', { y: 1.35 });
    }

    // Stainless Rescue A-frame arch + rescue strobe lightbar
    const archPts = [
      new THREE.Vector3(-width * 0.34, hullH * 0.96, -halfL + 0.36),
      new THREE.Vector3(-width * 0.28, hullH + 0.95, -halfL + 0.3),
      new THREE.Vector3(width * 0.28, hullH + 0.95, -halfL + 0.3),
      new THREE.Vector3(width * 0.34, hullH * 0.96, -halfL + 0.36),
    ];
    const arch = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 18, 0.036, 10, false),
      mats.chrome,
    );
    tagPart(arch, 'Arco de Resgate com Sinalizador', 0, 0.65, -0.4);
    group.add(arch);

    const podW = width * 0.12;
    const strobeL = new THREE.Mesh(
      createRoundedBoxGeo(podW, 0.09, 0.14, 0.02, 2, 6),
      mats.sirenRed,
    );
    strobeL.position.set(-podW * 1.05, hullH + 1.0, -halfL + 0.3);
    const strobeC = new THREE.Mesh(
      createRoundedBoxGeo(podW, 0.09, 0.14, 0.02, 2, 6),
      mats.sirenAmber,
    );
    strobeC.position.set(0, hullH + 1.0, -halfL + 0.3);
    const strobeR = new THREE.Mesh(
      createRoundedBoxGeo(podW, 0.09, 0.14, 0.02, 2, 6),
      mats.sirenBlue,
    );
    strobeR.position.set(podW * 1.05, hullH + 1.0, -halfL + 0.3);
    group.add(strobeL, strobeC, strobeR);
  } else if (g.archetype === 'yacht') {
    // Teak foredeck + cockpit floor + stern swim platform
    const foreDeck = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.64, 0.06, length * 0.28, 0.04, 3, 10),
      mats.interior,
    );
    foreDeck.position.set(0, hullH * 1.04, halfL * 0.44);
    group.add(foreDeck);

    addBowPulpitRail(group, length, width, hullH, hullOpts.bowLift, mats.chrome, cityMode);

    // Recessed hull portholes (3 per side, flush inside curved hull)
    if (!cityMode) {
      [-1, 1].forEach((side) => {
        [0.06, 0.22, 0.38].forEach((pz) => {
          const portGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16),
            mats.glass,
          );
          portGlass.rotation.z = Math.PI / 2;
          portGlass.scale.set(1, 1, 1.85);
          portGlass.position.set(side * (width * 0.44), hullH * 0.68, length * pz);
          portGlass.userData.noShadow = true;
          group.add(portGlass);
        });
      });
    }

    // Main Salon Superstructure with Structural Pillars + Flush Recessed Glass + Interior Lounge
    const salW = width * 0.74;
    const salH = height * 0.3;
    const salL = length * 0.44;
    const salZ = -length * 0.02;

    const salFloor = new THREE.Mesh(
      createRoundedBoxGeo(salW, 0.06, salL, 0.03, 2, 8),
      mats.interior,
    );
    salFloor.position.set(0, hullH + 0.03, salZ);
    group.add(salFloor);

    // Interior L-Sofa + Table inside Main Salon
    const sofa = new THREE.Mesh(
      createRoundedBoxGeo(salW * 0.62, 0.28, salL * 0.56, 0.05, 3, 10),
      mats.interior,
    );
    sofa.position.set(-salW * 0.1, hullH + 0.18, salZ - salL * 0.08);
    group.add(sofa);
    addMarineHelmConsole(group, width, hullH + 0.06, salZ + salL * 0.26, mats, salW * 0.18, cityMode, animated);

    // Salon Side & Aft Pillars + Roof Deck
    const salRoof = new THREE.Mesh(
      createRoundedBoxGeo(salW * 1.02, 0.12, salL * 1.06, 0.05, 4, 12),
      mats.body,
    );
    salRoof.position.set(0, hullH + salH + 0.06, salZ - 0.04);
    tagPart(salRoof, 'Teto do Salão Principal', 0, 0.42, 0);
    group.add(salRoof);

    // Framed Front Salon Windshield (trapezoidal tapered inside front pillars)
    addFramedBoatWindshield(group, salW * 0.94, hullH + 0.08, salZ + salL * 0.46, salH * 0.95, mats, cityMode);

    // Flush Side Windows & Corner Mullions (recessed cleanly inside salW)
    [-1, 1].forEach((side) => {
      [-salL * 0.44, 0, salL * 0.34].forEach((mz) => {
        const post = new THREE.Mesh(
          createRoundedBoxGeo(0.08, salH, 0.12, 0.02, 2, 6),
          mats.secondary,
        );
        post.position.set(side * (salW * 0.47), hullH + salH * 0.5, salZ + mz);
        group.add(post);
      });
      const sidePane = new THREE.Mesh(
        createRoundedBoxGeo(0.025, salH * 0.72, salL * 0.76, 0.01, 2, 6),
        mats.glass,
      );
      sidePane.position.set(side * (salW * 0.465), hullH + salH * 0.52, salZ - salL * 0.04);
      sidePane.userData.noShadow = true;
      sidePane.renderOrder = 2;
      group.add(sidePane);
    });

    // Articulated Twin Sliding Salon Glass Doors + Transom Boarding Gate + Bow Deck Hatch
    if (!cityMode) {
      [-1, 1].forEach((side) => {
        const sDoor = new THREE.Group();
        const frame = new THREE.Mesh(
          createRoundedBoxGeo(salW * 0.34, salH * 0.86, 0.04, 0.015, 2, 6),
          mats.trim,
        );
        const glass = new THREE.Mesh(
          createRoundedBoxGeo(salW * 0.28, salH * 0.72, 0.046, 0.01, 2, 6),
          mats.glass,
        );
        glass.userData.noShadow = true;
        glass.renderOrder = 2;
        sDoor.add(frame, glass);
        sDoor.position.set(side * (salW * 0.18), hullH + salH * 0.46, salZ - salL * 0.46);
        tagPart(sDoor, 'Portas Deslizantes do Salão', side * 0.3, 0.3, -0.2);
        group.add(sDoor);
        registerOpenable(
          animated,
          sDoor,
          'Portas Salão Iate',
          {},
          new THREE.Vector3(side * (salW * 0.28), 0, 0),
        );
      });

      // Transom boarding gate leading to swim platform
      const gatePivot = new THREE.Group();
      gatePivot.position.set(width * 0.32, hullH * 0.94, -halfL + 0.12);
      const gate = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.26, hullH * 0.48, 0.07, 0.02, 2, 8),
        mats.secondary,
      );
      gate.position.set(-width * 0.13, -hullH * 0.12, 0);
      gatePivot.add(gate);
      tagPart(gatePivot, 'Portão de Embarque na Popa', 0.25, 0.2, -0.4);
      group.add(gatePivot);
      registerOpenable(animated, gatePivot, 'Portão de Popa Iate', { y: 1.45 });

      // Bow Cabin Hatch
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(0, hullH * 1.07, halfL * 0.64);
      const hatch = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.28, 0.06, length * 0.12, 0.025, 2, 8),
        mats.glass,
      );
      hatch.position.set(0, 0.015, -length * 0.06);
      hatch.userData.noShadow = true;
      hatchPivot.add(hatch);
      tagPart(hatchPivot, 'Escotilha da Cabine de Proa', 0, 0.35, 0.35);
      group.add(hatchPivot);
      registerOpenable(animated, hatchPivot, 'Escotilha de Proa Iate', { x: -0.78 });
    }

    // Flybridge Upper Deck + Radar Arch + Radome
    const flyY = hullH + salH + 0.12;
    const flyLounge = new THREE.Mesh(
      createRoundedBoxGeo(salW * 0.78, 0.28, salL * 0.54, 0.06, 3, 10),
      mats.interior,
    );
    flyLounge.position.set(0, flyY + 0.14, salZ - 0.18);
    group.add(flyLounge);
    addMarineHelmConsole(group, salW * 0.72, flyY, salZ + salL * 0.2, mats, 0, cityMode, animated);
    addFramedBoatWindshield(group, salW * 0.74, flyY + 0.16, salZ + salL * 0.36, 0.34, mats, cityMode);

    const archPts = [
      new THREE.Vector3(-salW * 0.44, flyY, salZ - salL * 0.22),
      new THREE.Vector3(-salW * 0.36, flyY + height * 0.28, salZ - salL * 0.32),
      new THREE.Vector3(salW * 0.36, flyY + height * 0.28, salZ - salL * 0.32),
      new THREE.Vector3(salW * 0.44, flyY, salZ - salL * 0.22),
    ];
    const targa = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPts), 22, 0.09, 12, false),
      mats.body,
    );
    tagPart(targa, 'Arco Targa e Domo de Radar', 0, 0.75, -0.15);
    group.add(targa);

    const radarDome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), mats.liveryStripe);
    radarDome.scale.set(1.25, 0.62, 1.25);
    radarDome.position.set(0, flyY + height * 0.34, salZ - salL * 0.32);
    group.add(radarDome);
  } else if (g.archetype === 'tugboat') {
    // Heavy perimeter rubber D-fenders hugging curved hull sheer
    [-1, 1].forEach((side) => {
      for (let i = -2; i <= 2; i++) {
        const fender = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 10, 18), mats.rubber);
        fender.rotation.y = Math.PI / 2;
        fender.position.set(side * (width * 0.48), hullH * 0.74, i * (length * 0.16));
        tagPart(fender, 'Defensa Lateral de Borracha', side * 0.4, 0, 0);
        group.add(fender);
      }
    });
    const bowFender = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.26, hullH * 0.65, 0.32, 0.08, 3, 10),
      mats.rubber,
    );
    bowFender.position.set(0, hullH * 0.65, halfL - 0.06);
    group.add(bowFender);

    // Towing H-Bitt + Mooring Winch + Articulated Engine Room Aft Hatch
    const hBitt = new THREE.Mesh(
      createRoundedBoxGeo(0.55, 0.56, 0.22, 0.04, 2, 8),
      mats.accent,
    );
    hBitt.position.set(0, hullH * 0.96, -halfL * 0.48);
    tagPart(hBitt, 'Cabeço de Reboque H-Bitt', 0, 0.25, -0.4);
    group.add(hBitt);

    if (!cityMode) {
      const aftHatchPivot = new THREE.Group();
      aftHatchPivot.position.set(0, hullH * 0.82, -halfL * 0.68);
      const hatch = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.36, 0.1, length * 0.14, 0.03, 2, 8),
        mats.secondary,
      );
      hatch.position.set(0, 0.04, -length * 0.06);
      aftHatchPivot.add(hatch);
      tagPart(aftHatchPivot, 'Escotilha Casa de Máquinas', 0, 0.35, -0.5);
      group.add(aftHatchPivot);
      registerOpenable(animated, aftHatchPivot, 'Escotilha Máquinas Rebocador', { x: 0.85 });
    }

    // Two-tier Command Wheelhouse with Structural Corner Posts & Flush Bridge Windows
    const cabW = width * 0.6;
    const cabL = length * 0.34;
    const cabH = height * 0.4;
    const cabZ = length * 0.08;
    const cabY = hullH + 0.02;

    const cabBase = new THREE.Mesh(
      createRoundedBoxGeo(cabW, cabH * 0.48, cabL, 0.06, 3, 10),
      mats.secondary,
    );
    cabBase.position.set(0, cabY + cabH * 0.24, cabZ);
    tagPart(cabBase, 'Casario Inferior de Comando', 0, 0.35, 0);
    group.add(cabBase);

    // Upper bridge interior + helm wheel
    addMarineHelmConsole(group, cabW * 0.72, cabY + cabH * 0.42, cabZ + cabL * 0.14, mats, 0, cityMode, animated);

    // Bridge corner posts + flush window bands (inside cabW/cabL!)
    [-1, 1].forEach((sx) => {
      [-1, 1].forEach((sz) => {
        const corner = new THREE.Mesh(
          createRoundedBoxGeo(0.09, cabH * 0.48, 0.09, 0.02, 2, 6),
          mats.secondary,
        );
        corner.position.set(sx * (cabW * 0.46), cabY + cabH * 0.72, cabZ + sz * (cabL * 0.45));
        group.add(corner);
      });
      const sideBridgeWin = new THREE.Mesh(
        createRoundedBoxGeo(0.025, cabH * 0.38, cabL * 0.78, 0.01, 2, 6),
        mats.glass,
      );
      sideBridgeWin.position.set(sx * (cabW * 0.455), cabY + cabH * 0.72, cabZ);
      sideBridgeWin.userData.noShadow = true;
      sideBridgeWin.renderOrder = 2;
      group.add(sideBridgeWin);
    });
    const frontBridgeWin = new THREE.Mesh(
      createTrapezoidGlassGeo(cabW * 0.88, cabW * 0.86, cabH * 0.54, 0.045),
      mats.glass,
    );
    frontBridgeWin.position.set(0, cabY + cabH * 0.72, cabZ + cabL * 0.44);
    frontBridgeWin.rotation.x = -0.14;
    frontBridgeWin.userData.noShadow = true;
    frontBridgeWin.renderOrder = 2;
    group.add(frontBridgeWin);

    const cabRoof = new THREE.Mesh(
      createRoundedBoxGeo(cabW * 1.06, 0.1, cabL * 1.08, 0.04, 3, 10),
      mats.body,
    );
    cabRoof.position.set(0, cabY + cabH * 0.98, cabZ);
    tagPart(cabRoof, 'Passadiço e Teto da Ponte', 0, 0.55, 0);
    group.add(cabRoof);

    // Articulated Port & Starboard Wheelhouse Wing Doors
    if (!cityMode) {
      [-1, 1].forEach((side) => {
        const doorPivot = new THREE.Group();
        doorPivot.position.set(side * (cabW * 0.485), cabY + cabH * 0.42, cabZ + 0.25);
        const doorLeaf = new THREE.Mesh(
          createRoundedBoxGeo(0.05, cabH * 0.7, 0.68, 0.02, 2, 6),
          mats.accent,
        );
        doorLeaf.position.set(0, 0, -0.34);
        const doorGlass = new THREE.Mesh(
          createRoundedBoxGeo(0.056, cabH * 0.28, 0.44, 0.015, 2, 6),
          mats.glass,
        );
        doorGlass.position.set(0, cabH * 0.14, -0.34);
        doorGlass.userData.noShadow = true;
        doorPivot.add(doorLeaf, doorGlass);
        tagPart(doorPivot, 'Portas da Ponte de Comando', side * 0.35, 0.4, 0);
        group.add(doorPivot);
        registerOpenable(animated, doorPivot, 'Portas Ponte Rebocador', { y: -side * 1.25 });
      });
    }

    // Twin funnels + radar mast + orange life rings
    [-1, 1].forEach((side) => {
      const funnel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, height * 0.34, 14),
        mats.trim,
      );
      funnel.position.set(side * (cabW * 0.32), cabY + cabH * 0.58, cabZ - cabL * 0.40);
      group.add(funnel);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 8, 16), mats.accent);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * (cabW * 0.51), cabY + cabH * 0.34, cabZ - cabL * 0.24);
      group.add(ring);
    });

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, height * 0.3, 12),
      mats.chrome,
    );
    mast.position.set(0, cabY + cabH + height * 0.15, cabZ);
    tagPart(mast, 'Mastro e Radar Naval', 0, 0.75, 0);
    group.add(mast);
  } else {
    // SPEEDBOATS (Ipanema & Lancha Offshore Cigarra V12):
    // 1. Hollowed Teak / Non-Skid Cockpit Floor + Bow Pulpit Rail + Bow Navigation Lights
    const sole = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.66, 0.04, length * 0.56, 0.03, 2, 8),
      mats.interior,
    );
    sole.position.set(0, floorY, -length * 0.08);
    group.add(sole);

    addBowPulpitRail(group, length, width, hullH, hullOpts.bowLift, mats.chrome, cityMode);

    [-1, 1].forEach((side) => {
      const navL = new THREE.Mesh(
        createRoundedBoxGeo(0.08, 0.05, 0.14, 0.015, 2, 6),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      navL.position.set(side * (width * 0.22), hullH * (1 + hullOpts.bowLift * 0.6) + 0.04, halfL * 0.55);
      group.add(navL);
    });

    // 2. Wrap-Around Framed 3-Piece Windshield + Optional T-Top Hardtop Canopy on Offshore Models
    const isOffshore = length >= 7.2;
    const wsBaseZ = isOffshore ? length * 0.12 : length * 0.18;
    addFramedBoatWindshield(group, width * 0.84, hullH * 1.02, wsBaseZ, 0.42, mats, cityMode);

    if (isOffshore || g.attachments.includes('ski_wake_tower')) {
      const topH = hullH + 0.92;
      const topZ = wsBaseZ - 0.55;
      const hardtop = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.72, 0.08, length * 0.28, 0.04, 3, 12),
        mats.secondary,
      );
      hardtop.position.set(0, topH, topZ);
      tagPart(hardtop, 'Teto T-Top Aerodinâmico', 0, 0.65, 0);
      group.add(hardtop);

      [-1, 1].forEach((side) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * (width * 0.31), floorY + 0.1, topZ + length * 0.09),
            new THREE.Vector3(side * (width * 0.28), topH - 0.02, topZ + length * 0.09),
            0.024,
            0.026,
            mats.chrome,
            10,
          ),
        );
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * (width * 0.34), hullH * 0.98, topZ - length * 0.1),
            new THREE.Vector3(side * (width * 0.3), topH - 0.02, topZ - length * 0.1),
            0.024,
            0.026,
            mats.chrome,
            10,
          ),
        );
      });
    }

    // 3. Detailed Helm Console + Twin Bolster Captain Seats + Aft Bench Sofa
    addMarineHelmConsole(group, width, floorY, wsBaseZ - 0.22, mats, width * 0.16, cityMode, animated);
    [-1, 1].forEach((side) => {
      const seatGrp = new THREE.Group();
      const base = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.14, 0.46, 0.04, 3, 10),
        mats.interior,
      );
      const back = new THREE.Mesh(
        createRoundedBoxGeo(0.44, 0.5, 0.14, 0.04, 3, 10),
        mats.interior,
      );
      back.position.set(0, 0.28, -0.18);
      back.rotation.x = -0.15;
      const accentPiping = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.05, 0.05, 0.015, 2, 6),
        mats.accent,
      );
      accentPiping.position.set(0, 0.42, -0.14);
      seatGrp.add(base, back, accentPiping);
      seatGrp.position.set(side * (width * 0.2), floorY + 0.14, wsBaseZ - 0.72);
      tagPart(seatGrp, 'Bancos Esportivos Náuticos', side * 0.25, 0.3, -0.1);
      group.add(seatGrp);
    });

    const aftBench = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.72, 0.28, 0.48, 0.05, 3, 10),
      mats.interior,
    );
    aftBench.position.set(0, floorY + 0.16, -halfL + length * 0.26);
    group.add(aftBench);

    // 4. Articulated Doors & Hatches on ALL Speedboats:
    // (a) Hinged Bow Cuddy Hatch, (b) Cabin Companionway Door, (c) Transom Walk-Through Gate, (d) Aft Sundeck Engine Hatch
    if (!cityMode) {
      const bowHatchPivot = new THREE.Group();
      bowHatchPivot.position.set(0, hullH * 1.12, halfL * 0.62);
      const bowHatch = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.36, 0.055, length * 0.14, 0.025, 2, 8),
        mats.glass,
      );
      bowHatch.position.set(0, 0.015, -length * 0.07);
      bowHatch.userData.noShadow = true;
      bowHatchPivot.add(bowHatch);
      tagPart(bowHatchPivot, 'Escotilha da Cabine de Proa', 0, 0.35, 0.3);
      group.add(bowHatchPivot);
      registerOpenable(animated, bowHatchPivot, 'Escotilha de Proa', { x: -0.82 });

      // Cabin companionway door beside helm
      const cabDoorPivot = new THREE.Group();
      cabDoorPivot.position.set(-width * 0.28, floorY + 0.36, wsBaseZ - 0.18);
      const cabDoorLeaf = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.24, 0.62, 0.045, 0.02, 2, 8),
        mats.secondary,
      );
      cabDoorLeaf.position.set(width * 0.12, 0, 0);
      cabDoorPivot.add(cabDoorLeaf);
      tagPart(cabDoorPivot, 'Porta da Cabine Interna', -0.2, 0.3, 0.1);
      group.add(cabDoorPivot);
      registerOpenable(animated, cabDoorPivot, 'Porta da Cabine', { y: -1.35 });

      // Transom boarding gate onto swim platform
      const gatePivot = new THREE.Group();
      gatePivot.position.set(width * 0.32, hullH * 0.92, -halfL + 0.16);
      const gate = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.26, hullH * 0.44, 0.06, 0.02, 2, 8),
        mats.secondary,
      );
      gate.position.set(-width * 0.13, -hullH * 0.12, 0);
      gatePivot.add(gate);
      tagPart(gatePivot, 'Portão de Embarque na Popa', 0.25, 0.25, -0.45);
      group.add(gatePivot);
      registerOpenable(animated, gatePivot, 'Portão de Popa', { y: 1.42 });

      // Engine bay / bilge bay under articulated sunpad hatch
      const bay = createEngineBayAssembly(width * 0.48, length * 0.18, mats, false);
      bay.position.set(0, floorY + 0.18, -halfL + length * 0.14);
      group.add(bay);

      const sunpadPivot = new THREE.Group();
      sunpadPivot.position.set(0, hullH * 0.96, -halfL + length * 0.22);
      const sunpad = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.56, 0.1, length * 0.16, 0.04, 3, 10),
        mats.accent,
      );
      sunpad.position.set(0, 0.04, -length * 0.08);
      sunpadPivot.add(sunpad);
      tagPart(sunpadPivot, 'Capô Solário do Motor Náutico', 0, 0.38, -0.35);
      group.add(sunpadPivot);
      registerOpenable(animated, sunpadPivot, 'Capô Solário Motor', { x: 0.78 });
    } else {
      const sunpad = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.56, 0.1, length * 0.16, 0.04, 2, 8),
        mats.accent,
      );
      sunpad.position.set(0, hullH * 0.98, -halfL + length * 0.14);
      group.add(sunpad);
    }
  }

  // 3. Stern Swim Platform & Folding Boarding Ladder (non-jetski boats)
  if (g.archetype !== 'jetski') {
    const plat = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.72, 0.07, 0.42, 0.025, 2, 8),
      mats.trim,
    );
    plat.position.set(0, hullH * 0.48, -halfL - 0.16);
    tagPart(plat, 'Plataforma de Popa com Escada', 0, -0.1, -0.5);
    group.add(plat);

    if (!cityMode) {
      [-0.14, 0.14].forEach((lx) => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8), mats.chrome);
        rail.position.set(width * 0.24 + lx, hullH * 0.32, -halfL - 0.36);
        rail.rotation.x = 0.28;
        group.add(rail);
      });
    }
  }

  if (g.attachments.includes('ski_wake_tower')) {
    const towerGrp = new THREE.Group();
    const archR = width * 0.36;
    const archY = hullH + 0.44;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(archR, 0.032, 10, 22, Math.PI),
      mats.chrome,
    );
    arch.position.set(0, archY, -0.1);
    towerGrp.add(arch);
    [-1, 1].forEach((side) => {
      const topPt = new THREE.Vector3(side * archR, archY, -0.1);
      towerGrp.add(
        makeStrutBetween(
          topPt,
          new THREE.Vector3(side * (width * 0.34), hullH * 0.82, 0.08),
          0.024,
          0.028,
          mats.chrome,
          10,
        ),
        makeStrutBetween(
          topPt,
          new THREE.Vector3(side * (width * 0.34), hullH * 0.82, -0.28),
          0.024,
          0.028,
          mats.chrome,
          10,
        ),
      );
    });
    tagPart(towerGrp, 'Torre de Wakeboard Cromada', 0, 0.55, 0);
    group.add(towerGrp);
  }

  if (g.attachments.includes('outboard_twin')) {
    [-0.32, 0.32].forEach((ox) => {
      const obGroup = new THREE.Group();
      const cowl = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.44, 0.44, 0.08, 4, 12),
        mats.trim,
      );
      cowl.position.y = 0.28;
      const cowlCap = new THREE.Mesh(
        createRoundedBoxGeo(0.28, 0.1, 0.38, 0.04, 2, 8),
        mats.accent,
      );
      cowlCap.position.y = 0.48;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.18), mats.trim);
      leg.position.y = -0.14;
      obGroup.add(cowl, cowlCap, leg);

      const propGroup = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), mats.chrome);
        blade.rotation.z = (b / 3) * Math.PI * 2;
        propGroup.add(blade);
      }
      propGroup.position.set(0, -0.32, -0.14);
      obGroup.add(propGroup);
      animated.propellers.push(propGroup);

      obGroup.position.set(ox, hullH * 0.72, -halfL - 0.2);
      tagPart(obGroup, 'Motor de Popa com Hélice', ox * 0.6, 0.15, -0.55);
      group.add(obGroup);
    });
  }

  // Bow marine spotlights, directional blinkers & stern taillight for all non-jetski watercraft
  if (g.archetype !== 'jetski') {
    const spotY =
      g.archetype === 'yacht'
        ? hullH * 1.12
        : g.archetype === 'tugboat'
          ? hullH * 1.04
          : hullH * (1 + hullOpts.bowLift * 0.52);
    const spotZ = halfL * 0.56;
    const spotX = width * 0.25;
    [-1, 1].forEach((side) => {
      const spot = new THREE.Mesh(
        createRoundedBoxGeo(0.14, 0.08, 0.08, 0.02, 2, 6),
        mats.headlight,
      );
      spot.position.set(side * spotX, spotY, spotZ);
      const beam = createHeadlightBeamMesh(5.0, 1.0, 0.05);
      beam.position.set(side * spotX, spotY, spotZ + 0.04);
      const bBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.08, 0.045, 0.07, 0.015, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      bBlink.position.set(side * (width * 0.38), hullH * 1.04, halfL * 0.36);
      const sBlink = new THREE.Mesh(
        createRoundedBoxGeo(0.08, 0.05, 0.06, 0.015, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      sBlink.position.set(side * (width * 0.34), hullH * 0.96, -halfL + 0.14);
      group.add(spot, beam, bBlink, sBlink);
      animated.headlightBeams.push(beam);
    });
  }

  addVehicleAttachments(group, v, mats, hullH + height * 0.4, hullH + 0.3, hullH + 0.3, animated);
  enableShadows(group);
  return group;
}

// =========================================================================
// 9. AIRCRAFT: HIGH-POLY JETS, AIRPLANES, HELICOPTERS & HOVERCRAFT
// =========================================================================
export function buildAircraftOrHovercraft(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const g = v.geometry;
  if (g.archetype === 'airplane' || g.archetype === 'jet') {
    return buildAirplaneOrJetVehicle(v, mats, wheelStyle, animated, cityMode);
  }
  if (g.archetype === 'helicopter') {
    return buildHelicopterVehicle(v, mats, animated, cityMode);
  }

  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;

  if (g.archetype === 'hovercraft') {
    const skirt = new THREE.Mesh(
      createRoundedBoxGeo(width, 0.44, length * 0.96, 0.16, cityMode ? 2 : 5, 16),
      mats.rubber,
    );
    skirt.position.set(0, 0.22, 0);
    tagPart(skirt, 'Saia Inflável Periférica', 0, -0.2, 0);
    group.add(skirt);

    const deck = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.88, 0.24, length * 0.86, 0.08, 3, 12),
      mats.body,
    );
    deck.position.set(0, 0.54, 0);
    tagPart(deck, 'Convés Estrutural Anfíbio', 0, 0.1, 0);
    group.add(deck);

    const cab = buildSculptedCabin(
      length * 0.42,
      height * 0.46,
      width * 0.72,
      0.25,
      0.42,
      0.22,
      mats,
      true,
      4,
      0.06,
      cityMode,
    );
    cab.position.set(0, 0.64, length * 0.14);
    tagPart(cab, 'Cabine Panorâmica', 0, 0.45, 0.15);
    group.add(cab);

    if (!cityMode) {
      [-1, 1].forEach((side) => {
        const door = new THREE.Mesh(
          createRoundedBoxGeo(0.05, height * 0.36, 0.75, 0.02, 2, 8),
          mats.glass,
        );
        door.position.set(side * (width * 0.34), 0.64 + height * 0.22, length * 0.14);
        door.userData.noShadow = true;
        group.add(door);
        registerOpenable(animated, door, 'Portas Hovercraft', { y: -side * 1.15 });
      });
    }

    [-1, 1].forEach((side) => {
      const ductGroup = new THREE.Group();
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.62, 0.46, 24, 1, true),
        mats.secondary,
      );
      shroud.rotation.x = Math.PI / 2;
      ductGroup.add(shroud);

      const fan = new THREE.Group();
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.12, 0.04), mats.accent);
        blade.rotation.z = (b / 4) * Math.PI;
        fan.add(blade);
      }
      ductGroup.add(fan);
      animated.propellers.push(fan);

      const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.34), mats.accent);
      rudder.position.z = -0.35;
      ductGroup.add(rudder);

      ductGroup.position.set(side * (width * 0.26), 1.24, -length * 0.32);
      tagPart(ductGroup, 'Duto de Propulsão Traseiro', side * 0.4, 0.35, -0.5);
      group.add(ductGroup);
    });

    addVehicleAttachments(group, v, mats, 0.64 + height * 0.46, 0.7, 0.7, animated);
    enableShadows(group);
    return group;
  }

  return buildHelicopterVehicle(v, mats, animated, cityMode);
}
