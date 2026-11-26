import * as THREE from 'three';
import { WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createAerodynamicMirror,
  createRoundedBoxGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagPart,
} from './types';

// =========================================================================
// 1. HIGH-POLY MULTI-STYLE CRAFTED WHEELS + WHEEL-WELL LINERS
// =========================================================================
export function createCraftedWheel(
  radius: number,
  width: number,
  style: WheelStyle,
  mats: VehicleMaterialSet,
  isRightSide: boolean,
  isDualRear = false,
  cityMode = false,
): THREE.Group {
  const wheel = new THREE.Group();
  const sign = isRightSide ? 1 : -1;
  const r = Math.max(0.14, radius);
  const w = Math.max(0.09, width);
  const latheSegs = cityMode ? 18 : 36;
  const rimR =
    style === 'monster_tractor'
      ? r * 0.42
      : style === 'atv_balloon'
        ? r * 0.48
        : style === 'aircraft_gear'
          ? r * 0.5
          : style === 'deep_dish_6' || style === 'sport_5spoke' || style === 'retro_turbofan'
            ? r * 0.66
            : r * 0.62;

  const buildSingleTire = (xOffset: number, tireW: number) => {
    const hw = tireW / 2;
    const shoulderR = rimR + (r - rimR) * 0.78;
    const pts = [
      new THREE.Vector2(rimR * 0.94, -hw * 0.8),
      new THREE.Vector2(shoulderR, -hw),
      new THREE.Vector2(r * 0.96, -hw * 0.9),
      new THREE.Vector2(r, -hw * 0.56),
      new THREE.Vector2(r, hw * 0.56),
      new THREE.Vector2(r * 0.96, hw * 0.9),
      new THREE.Vector2(shoulderR, hw),
      new THREE.Vector2(rimR * 0.94, hw * 0.8),
    ];
    const tireGeo = new THREE.LatheGeometry(pts, latheSegs);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, mats.rubber);
    tireMesh.position.x = xOffset;
    wheel.add(tireMesh);

    if (style === 'classic_whitewall') {
      const wwGeo = new THREE.RingGeometry(rimR * 1.02, r * 0.85, latheSegs);
      wwGeo.rotateY(sign > 0 ? Math.PI / 2 : -Math.PI / 2);
      const ww = new THREE.Mesh(wwGeo, mats.liveryStripe);
      ww.position.x = xOffset + sign * (hw + 0.005);
      wheel.add(ww);
    }

    if (
      !cityMode &&
      (style === 'monster_tractor' || style === 'offroad_beadlock' || style === 'atv_balloon')
    ) {
      const lugCount = style === 'monster_tractor' ? 16 : 18;
      const lugGeo = createRoundedBoxGeo(tireW * 0.88, 0.032, r * 0.13, 0.01, 2, 6);
      for (let i = 0; i < lugCount; i++) {
        const a = (i / lugCount) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, mats.rubber);
        lug.position.set(xOffset, Math.cos(a) * r * 0.99, Math.sin(a) * r * 0.99);
        lug.rotation.x = -a;
        wheel.add(lug);
      }
    }
  };

  if (isDualRear) {
    buildSingleTire(-sign * w * 0.56, w * 0.88);
    buildSingleTire(sign * w * 0.42, w * 0.88);
  } else {
    buildSingleTire(0, w);
  }

  // Rim barrel
  const rimBarrelGeo = new THREE.CylinderGeometry(rimR, rimR, w * 0.86, latheSegs, 1, false);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const rimMat =
    style === 'bbs_mesh'
      ? mats.accent
      : style === 'offroad_beadlock' || style === 'heavy_truck'
        ? mats.trim
        : style === 'deep_dish_6'
          ? mats.secondary
          : mats.alloy;
  const barrel = new THREE.Mesh(rimBarrelGeo, rimMat);
  wheel.add(barrel);

  // Outer stepped lip
  const lipGeo = new THREE.TorusGeometry(rimR * 0.97, 0.019, cityMode ? 6 : 10, latheSegs);
  lipGeo.rotateY(Math.PI / 2);
  const lipMat =
    style === 'aero_blade' || style === 'deep_dish_6' ? mats.accent : mats.chrome;
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.position.x = sign * (w * 0.43);
  wheel.add(lip);

  const spokeX = sign * (w * 0.34);

  if (style === 'aero_blade') {
    const discGeo = new THREE.CylinderGeometry(rimR * 0.92, rimR * 0.92, 0.03, latheSegs);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, mats.secondary);
    disc.position.x = spokeX;
    wheel.add(disc);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, rimR * 0.85, 0.045), mats.accent);
      fin.position.set(spokeX + sign * 0.01, Math.cos(a) * rimR * 0.48, Math.sin(a) * rimR * 0.48);
      fin.rotation.x = -a + 0.28;
      wheel.add(fin);
    }
  } else if (style === 'retro_turbofan') {
    const backDiscGeo = new THREE.CylinderGeometry(rimR * 0.9, rimR * 0.9, 0.024, latheSegs);
    backDiscGeo.rotateZ(Math.PI / 2);
    const backDisc = new THREE.Mesh(backDiscGeo, mats.grille);
    backDisc.position.x = spokeX - sign * 0.015;
    wheel.add(backDisc);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.034, rimR * 0.88, 0.044), mats.alloy);
      spoke.position.set(spokeX + sign * 0.01, Math.cos(a) * rimR * 0.46, Math.sin(a) * rimR * 0.46);
      spoke.rotation.x = -a;
      wheel.add(spoke);
    }
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(rimR * 0.62, 0.014, 8, 24), mats.alloy);
    innerRing.rotation.y = Math.PI / 2;
    innerRing.position.x = spokeX + sign * 0.012;
    wheel.add(innerRing);
  } else if (style === 'deep_dish_6') {
    const dishX = spokeX - sign * (w * 0.14);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, rimR * 0.9, 0.042), mats.alloy);
      spoke.position.set(dishX + sign * 0.05, Math.cos(a) * rimR * 0.46, Math.sin(a) * rimR * 0.46);
      spoke.rotation.x = -a;
      spoke.rotation.y = sign * 0.14;
      wheel.add(spoke);
    }
  } else if (style === 'wire_spoke') {
    const wireCount = cityMode ? 10 : 16;
    for (let i = 0; i < wireCount; i++) {
      const a = (i / wireCount) * Math.PI * 2;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, rimR * 1.88, 6), mats.chrome);
      wire.position.set(spokeX + sign * (i % 2 === 0 ? 0.01 : -0.01), 0, 0);
      wire.rotation.x = a + (i % 2 === 0 ? 0.2 : -0.2);
      wheel.add(wire);
    }
  } else if (style === 'offroad_beadlock') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.038, rimR * 0.88, 0.048), mats.trim);
      spoke.position.set(spokeX, Math.cos(a) * rimR * 0.45, Math.sin(a) * rimR * 0.45);
      spoke.rotation.x = -a;
      wheel.add(spoke);
    }
    if (!cityMode) {
      const boltGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.025, 6);
      boltGeo.rotateZ(Math.PI / 2);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const bolt = new THREE.Mesh(boltGeo, mats.chrome);
        bolt.position.set(sign * (w * 0.44), Math.cos(a) * rimR * 0.93, Math.sin(a) * rimR * 0.93);
        wheel.add(bolt);
      }
    }
  } else {
    const spokeCount =
      style === 'bbs_mesh'
        ? 10
        : style === 'moto_spoke'
          ? 12
          : style === 'heavy_truck' || style === 'aircraft_gear'
            ? 6
            : 5;
    const spokeThick =
      style === 'moto_spoke' ? 0.012 : style === 'heavy_truck' ? 0.055 : 0.032;
    const spokeGeo = new THREE.BoxGeometry(0.035, rimR * 0.9, spokeThick);
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(spokeX, Math.cos(a) * rimR * 0.45, Math.sin(a) * rimR * 0.45);
      spoke.rotation.x = -a;
      wheel.add(spoke);
    }
  }

  // Center hub cap + lug bolts
  const hubGeo = new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.28, 0.06, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hubMat =
    style === 'deep_dish_6' || style === 'sport_5spoke' ? mats.accent : mats.chrome;
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.position.x = spokeX + sign * 0.02;
  wheel.add(hub);

  if (!cityMode && style !== 'aero_blade' && style !== 'scooter_small' && style !== 'moto_spoke') {
    const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.025, 6);
    lugGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const nut = new THREE.Mesh(lugGeo, mats.chrome);
      nut.position.set(
        spokeX + sign * 0.035,
        Math.cos(a) * rimR * 0.16,
        Math.sin(a) * rimR * 0.16,
      );
      wheel.add(nut);
    }
  }

  // Brake disc + colored caliper inside wheel
  if (style !== 'monster_tractor' && style !== 'scooter_small') {
    const discGeo = new THREE.CylinderGeometry(rimR * 0.74, rimR * 0.74, 0.024, cityMode ? 14 : 24);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, mats.brakeDisc);
    disc.position.x = -sign * w * 0.1;
    wheel.add(disc);

    const calGeo = createRoundedBoxGeo(0.055, rimR * 0.34, rimR * 0.24, 0.015, 2, 6);
    const cal = new THREE.Mesh(calGeo, mats.caliper);
    cal.position.set(-sign * w * 0.06, rimR * 0.28, -rimR * 0.38);
    wheel.add(cal);
  }

  enableShadows(wheel, true, true);
  return wheel;
}

export function buildWheelWellLiners(
  group: THREE.Group,
  wheelRadius: number,
  wheelWidth: number,
  width: number,
  frontWheelZ: number,
  rearWheelZ: number,
  mats: VehicleMaterialSet,
  cityMode = false,
) {
  const archR = wheelRadius * 1.15;
  const wellGeo = new THREE.CylinderGeometry(
    archR,
    archR,
    wheelWidth * 1.16,
    cityMode ? 14 : 24,
    1,
    false,
    0,
    Math.PI,
  );
  wellGeo.rotateZ(Math.PI / 2);
  wellGeo.rotateX(-Math.PI / 2);

  [frontWheelZ, rearWheelZ].forEach((wz, idx) => {
    [-1, 1].forEach((side) => {
      const well = new THREE.Mesh(wellGeo, mats.grille);
      well.position.set(side * (width * 0.415), wheelRadius * 0.96, wz);
      tagPart(
        well,
        idx === 0 ? 'Caixa de Roda Dianteira' : 'Caixa de Roda Traseira',
        side * 0.35,
        0,
        0,
      );
      group.add(well);
    });
  });
}

// =========================================================================
// 2. NON-CLIPPING DETAILED 3D CABIN INTERIOR + ROUNDED GREENHOUSE & DOORS
// =========================================================================
export function buildVisibleInterior(
  cabLen: number,
  cabH: number,
  width: number,
  seatsCount: number,
  mats: VehicleMaterialSet,
  isOpenTop = false,
  tubDepth = 0.26,
  cityMode = false,
): THREE.Group {
  const interior = new THREE.Group();
  const innerW = Math.max(0.85, width * 0.8);
  const innerL = Math.max(1.0, cabLen * 0.88);
  const totalH = cabH + tubDepth;

  // Floor carpet sits at y = 0 inside this group (caller positions group at floorTopY!)
  const floor = new THREE.Mesh(
    createRoundedBoxGeo(innerW, 0.035, innerL, 0.02, 2, 8),
    mats.grille,
  );
  floor.position.set(0, 0.018, 0);
  interior.add(floor);

  // Sculpted center transmission tunnel + console + armrest + cupholders + gear shifter
  const consoleLen = innerL * 0.64;
  const consoleH = Math.min(0.24, tubDepth * 0.78);
  const consoleBox = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.18, consoleH, consoleLen, 0.035, cityMode ? 2 : 4, 10),
    mats.trim,
  );
  consoleBox.position.set(0, consoleH * 0.5 + 0.02, innerL * 0.02);
  interior.add(consoleBox);

  const armrest = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.16, 0.06, consoleLen * 0.36, 0.025, 3, 8),
    mats.interior,
  );
  armrest.position.set(0, consoleH + 0.04, -consoleLen * 0.16);
  interior.add(armrest);

  if (!cityMode) {
    // Twin cupholders & handbrake lever
    [0.02, 0.11].forEach((cz) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 16), mats.chrome);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, consoleH + 0.025, cz);
      interior.add(ring);
    });

    const handbrake = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.12, 4, 8), mats.trim);
    handbrake.rotation.x = 1.15;
    handbrake.position.set(-innerW * 0.055, consoleH + 0.05, -0.04);
    interior.add(handbrake);

    // Pedals on driver footwell (left side)
    [-0.1, -0.02, 0.06].forEach((px, idx) => {
      const pedal = new THREE.Mesh(
        new THREE.BoxGeometry(idx === 1 ? 0.055 : 0.042, 0.08, 0.016),
        mats.alloy,
      );
      pedal.position.set(-innerW * 0.25 + px, 0.11, innerL * 0.34);
      pedal.rotation.x = -0.45;
      interior.add(pedal);
    });
  }

  // Gear shifter stalk + metallic gaiter + colored knob
  const gaiter = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.046, 0.05, 12), mats.grille);
  gaiter.position.set(0, consoleH + 0.04, innerL * 0.14);
  interior.add(gaiter);

  const shifter = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.13, 10), mats.chrome);
  shifter.position.set(0, consoleH + 0.11, innerL * 0.14);
  shifter.rotation.x = -0.15;
  interior.add(shifter);

  const shiftKnob = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), mats.accent);
  shiftKnob.position.set(0, consoleH + 0.18, innerL * 0.15);
  interior.add(shiftKnob);

  // Curved multi-tier dashboard + hooded gauge binnacle + illuminated dial rings + screen
  const dashZ = innerL * 0.34;
  const dashY = Math.min(tubDepth + 0.08, totalH * 0.52);
  const dash = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.96, 0.19, 0.29, 0.045, cityMode ? 2 : 4, 12),
    mats.trim,
  );
  dash.position.set(0, dashY, dashZ);
  interior.add(dash);

  const dashPad = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.92, 0.045, 0.24, 0.02, 2, 10),
    mats.secondary,
  );
  dashPad.position.set(0, dashY + 0.095, dashZ + 0.01);
  interior.add(dashPad);

  const binnacle = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.32, 0.095, 0.15, 0.035, 3, 10),
    mats.grille,
  );
  binnacle.position.set(-innerW * 0.26, dashY + 0.11, dashZ - 0.02);
  interior.add(binnacle);

  if (!cityMode) {
    [-0.06, 0.06].forEach((gx) => {
      const dial = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 8, 16), mats.sirenBlue);
      dial.position.set(-innerW * 0.26 + gx, dashY + 0.11, dashZ - 0.096);
      interior.add(dial);
    });
  }

  const infoScreen = new THREE.Mesh(
    createRoundedBoxGeo(0.24, 0.12, 0.035, 0.012, 2, 8),
    mats.sirenBlue,
  );
  infoScreen.position.set(0, dashY + 0.11, dashZ - 0.11);
  infoScreen.rotation.x = -0.15;
  interior.add(infoScreen);

  // Steering column + 3-spoke leather/alloy steering wheel
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.26, 12), mats.trim);
  col.position.set(-innerW * 0.26, dashY + 0.05, dashZ - 0.14);
  col.rotation.x = 1.05;
  interior.add(col);

  const steerGroup = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.021, cityMode ? 6 : 12, cityMode ? 16 : 28),
    mats.grille,
  );
  steerGroup.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.034, 16), mats.trim);
  hub.rotation.x = Math.PI / 2;
  steerGroup.add(hub);
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.125, 0.018), mats.alloy);
    const a = (s * Math.PI * 2) / 3 + Math.PI;
    spoke.position.set(Math.sin(a) * 0.062, Math.cos(a) * 0.062, 0);
    spoke.rotation.z = -a;
    steerGroup.add(spoke);
  }
  steerGroup.position.set(-innerW * 0.26, dashY + 0.11, dashZ - 0.24);
  steerGroup.rotation.x = 0.38;
  interior.add(steerGroup);

  // Ergonomic sculpted bucket seats (positioned strictly on floor y >= 0.04, well below roof)
  const seatZ = seatsCount >= 4 ? innerL * 0.03 : -innerL * 0.05;
  const maxSeatBackH = Math.min(0.48, Math.max(0.32, totalH * 0.62));
  const seatW = Math.min(0.44, innerW * 0.34);

  [-1, 1].forEach((side) => {
    const seatGroup = new THREE.Group();

    const cushion = new THREE.Mesh(
      createRoundedBoxGeo(seatW, 0.11, 0.45, 0.04, cityMode ? 2 : 4, 10),
      mats.interior,
    );
    cushion.position.set(0, 0.08, 0.04);
    seatGroup.add(cushion);

    // Side thigh bolsters
    if (!cityMode) {
      [-1, 1].forEach((bs) => {
        const thigh = new THREE.Mesh(
          createRoundedBoxGeo(0.075, 0.09, 0.42, 0.025, 3, 8),
          mats.secondary,
        );
        thigh.position.set(bs * (seatW * 0.44), 0.11, 0.04);
        thigh.rotation.z = -bs * 0.2;
        seatGroup.add(thigh);
      });
    }

    const backrest = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.94, maxSeatBackH, 0.12, 0.045, cityMode ? 2 : 4, 10),
      mats.interior,
    );
    backrest.position.set(0, 0.11 + maxSeatBackH * 0.46, -0.15);
    backrest.rotation.x = -0.18;
    seatGroup.add(backrest);

    const headrest = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.54, 0.15, 0.095, 0.04, 3, 10),
      mats.interior,
    );
    headrest.position.set(0, 0.16 + maxSeatBackH * 0.94, -0.22);
    headrest.rotation.x = -0.12;
    seatGroup.add(headrest);

    // Shoulder racing stripe bolster
    const bolster = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.96, 0.042, 0.04, 0.015, 2, 8),
      mats.accent,
    );
    bolster.position.set(0, 0.12 + maxSeatBackH * 0.72, -0.11);
    seatGroup.add(bolster);

    seatGroup.position.set(side * (innerW * 0.27), 0.02, seatZ);
    interior.add(seatGroup);
  });

  // Rear contoured bench seat (when 4+ seats)
  if (seatsCount >= 4 && innerL > 1.32) {
    const rearBench = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.88, 0.13, 0.42, 0.04, cityMode ? 2 : 3, 10),
      mats.interior,
    );
    rearBench.position.set(0, 0.08, -innerL * 0.27);
    interior.add(rearBench);

    const rearBack = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.88, maxSeatBackH * 0.86, 0.12, 0.04, cityMode ? 2 : 3, 10),
      mats.interior,
    );
    rearBack.position.set(0, 0.1 + maxSeatBackH * 0.42, -innerL * 0.44);
    rearBack.rotation.x = -0.18;
    interior.add(rearBack);

    if (!isOpenTop) {
      [-0.28, 0.28].forEach((rx) => {
        const hr = new THREE.Mesh(
          createRoundedBoxGeo(0.2, 0.13, 0.085, 0.03, 2, 8),
          mats.interior,
        );
        hr.position.set(rx * innerW, 0.14 + maxSeatBackH * 0.88, -innerL * 0.48);
        interior.add(hr);
      });
    }
  }

  // Interior rear-view mirror & sun visors
  const rvMirror = new THREE.Mesh(
    createRoundedBoxGeo(0.18, 0.05, 0.032, 0.012, 2, 8),
    mats.grille,
  );
  rvMirror.position.set(0, totalH * 0.82, innerL * 0.32);
  interior.add(rvMirror);

  if (!cityMode && !isOpenTop) {
    [-0.25, 0.25].forEach((vx) => {
      const visor = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.34, 0.075, 0.018, 0.01, 2, 6),
        mats.secondary,
      );
      visor.position.set(vx * innerW, totalH * 0.87, innerL * 0.28);
      visor.rotation.x = 0.22;
      interior.add(visor);
    });
  }

  return interior;
}

export interface DoorSpec {
  side: -1 | 1;
  hingeX: number;
  hingeY: number;
  hingeZ: number;
  doorLen: number;
  doorHeight: number;
  glassHeight: number;
  glassTopZInsetFront: number;
  glassTopZInsetRear: number;
  topInwardShift: number;
  hasMirror: boolean;
  isScissor: boolean;
  isRearDoor: boolean;
  label: string;
}

export function createSideDoorGroup(
  spec: DoorSpec,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(spec.hingeX, spec.hingeY, spec.hingeZ);

  const skinThick = 0.068;
  // Door extends along -Z from front hinge (hingeZ)
  const skinGeo = createRoundedBoxGeo(
    skinThick,
    spec.doorHeight,
    spec.doorLen,
    0.025,
    cityMode ? 2 : 4,
    10,
  );
  const skin = new THREE.Mesh(skinGeo, mats.body);
  skin.position.set(0, -spec.doorHeight * 0.5, -spec.doorLen * 0.5);
  pivot.add(skin);

  // Lower trim molding
  const molding = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.036, spec.doorLen * 0.92),
    mats.trim,
  );
  molding.position.set(spec.side * (skinThick * 0.45), -spec.doorHeight * 0.54, -spec.doorLen * 0.5);
  pivot.add(molding);

  // Outer chrome/accent handle
  const handle = new THREE.Mesh(
    createRoundedBoxGeo(0.032, 0.032, 0.14, 0.01, 2, 6),
    mats.chrome,
  );
  handle.position.set(spec.side * (skinThick * 0.52), -0.09, -spec.doorLen * 0.78);
  pivot.add(handle);

  // Finished interior door card (armrest + speaker + inner handle)
  if (!cityMode) {
    const card = new THREE.Mesh(
      createRoundedBoxGeo(0.03, spec.doorHeight * 0.84, spec.doorLen * 0.92, 0.02, 2, 8),
      mats.trim,
    );
    card.position.set(-spec.side * (skinThick * 0.42), -spec.doorHeight * 0.48, -spec.doorLen * 0.5);
    pivot.add(card);

    const armrest = new THREE.Mesh(
      createRoundedBoxGeo(0.048, 0.045, spec.doorLen * 0.52, 0.015, 2, 6),
      mats.interior,
    );
    armrest.position.set(-spec.side * (skinThick * 0.65), -spec.doorHeight * 0.34, -spec.doorLen * 0.52);
    pivot.add(armrest);

    const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.015, 14), mats.grille);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(-spec.side * (skinThick * 0.56), -spec.doorHeight * 0.68, -spec.doorLen * 0.22);
    pivot.add(speaker);
  }

  // Side window glass attached to door (tapers inward at top; rotateY(-PI/2) preserves -Z along door length!)
  if (spec.glassHeight > 0.12) {
    const winShape = new THREE.Shape();
    winShape.moveTo(-spec.doorLen + 0.03, 0);
    winShape.lineTo(-0.025, 0);
    winShape.lineTo(-0.025 - spec.glassTopZInsetFront, spec.glassHeight);
    winShape.lineTo(-spec.doorLen + 0.03 + spec.glassTopZInsetRear, spec.glassHeight);
    winShape.closePath();

    const winGeo = new THREE.ShapeGeometry(winShape);
    winGeo.rotateY(-Math.PI / 2);
    const pos = winGeo.attributes.position;
    const baseInsetX = -spec.side * 0.022;
    for (let i = 0; i < pos.count; i++) {
      const py = pos.getY(i);
      const t = THREE.MathUtils.clamp(py / spec.glassHeight, 0, 1);
      pos.setX(i, THREE.MathUtils.lerp(baseInsetX, -spec.side * spec.topInwardShift, t));
    }
    winGeo.computeVertexNormals();

    const winMesh = new THREE.Mesh(winGeo, mats.glass);
    winMesh.userData.noShadow = true;
    winMesh.renderOrder = 2;
    pivot.add(winMesh);

    // Upper slim door frame for sedan/SUV/hatch doors (frameless on supercars/coupes)
    if (!spec.isScissor) {
      const topFrame = makeStrutBetween(
        new THREE.Vector3(
          -spec.side * spec.topInwardShift,
          spec.glassHeight,
          -0.025 - spec.glassTopZInsetFront,
        ),
        new THREE.Vector3(
          -spec.side * spec.topInwardShift,
          spec.glassHeight,
          -spec.doorLen + 0.03 + spec.glassTopZInsetRear,
        ),
        0.017,
        0.017,
        mats.trim,
        8,
      );
      pivot.add(topFrame);
    }
  }

  // Wing mirror mounted onto front corner of front doors
  if (spec.hasMirror) {
    const mirror = createAerodynamicMirror(spec.side, mats, cityMode);
    mirror.position.set(spec.side * 0.02, 0.04, -0.14);
    pivot.add(mirror);
  }

  tagPart(pivot, spec.label, spec.side * 0.45, 0.08, 0);

  if (spec.isScissor) {
    registerOpenable(animated, pivot, spec.label, {
      x: 0.78,
      y: -spec.side * 0.24,
      z: spec.side * 0.12,
    });
  } else {
    registerOpenable(animated, pivot, spec.label, {
      y: -spec.side * (spec.isRearDoor ? 0.84 : 0.92),
    });
  }

  return pivot;
}

export function createTrapezoidGlassGeo(
  botW: number,
  topW: number,
  slantLen: number,
  thickness = 0.02,
): THREE.BufferGeometry {
  const hh = Math.max(0.05, slantLen) * 0.5;
  const hb = Math.max(0.05, botW) * 0.5;
  const ht = Math.max(0.05, topW) * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-hb, -hh);
  shape.lineTo(hb, -hh);
  shape.lineTo(ht, hh);
  shape.lineTo(-ht, hh);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -thickness * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function buildSculptedCabin(
  cabinLen: number,
  cabinHeight: number,
  width: number,
  taper: number,
  windshieldRake: number,
  rearRake: number,
  mats: VehicleMaterialSet,
  panoramic = false,
  seatsCount = 4,
  interiorDropY = 0.24,
  cityMode = false,
  omitSideGlass = false,
  sideGlassMaxLocalZ?: number,
): THREE.Group {
  const cabin = new THREE.Group();
  const hl = cabinLen / 2;
  const baseW = width * 0.92;
  const topW = width * (1 - taper * 0.34);

  const fBotZ = hl;
  const rBotZ = -hl;
  const fTopZ = hl - hl * windshieldRake;
  const rTopZ = -hl + hl * rearRake;
  const roofLen = Math.max(0.4, fTopZ - rTopZ);
  const roofCenterZ = (fTopZ + rTopZ) * 0.5;

  // 1. Visible 3D Interior seated cleanly in the hollowed tub floor (y = -interiorDropY)
  const interior = buildVisibleInterior(
    cabinLen,
    cabinHeight,
    width,
    seatsCount,
    mats,
    false,
    interiorDropY,
    cityMode,
  );
  interior.position.y = -interiorDropY;
  cabin.add(interior);

  // 2. Curved Beveled Roof Shell (cambered dome profile instead of flat box)
  const roofCurve = new THREE.Shape();
  const rh = roofLen * 0.5 + 0.05;
  roofCurve.moveTo(-rh, 0);
  roofCurve.quadraticCurveTo(0, 0.055, rh, 0);
  roofCurve.lineTo(rh - 0.02, -0.05);
  roofCurve.quadraticCurveTo(0, 0.005, -rh + 0.02, -0.05);
  roofCurve.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofCurve, {
    depth: Math.max(0.2, topW - 0.08),
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: cityMode ? 2 : 5,
    curveSegments: cityMode ? 8 : 20,
  });
  roofGeo.translate(0, 0, -(topW - 0.08) / 2);
  roofGeo.rotateY(-Math.PI / 2);
  roofGeo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(roofGeo, mats.body);
  roofMesh.position.set(0, cabinHeight - 0.015, roofCenterZ);
  cabin.add(roofMesh);

  if (panoramic) {
    const panGeo = createRoundedBoxGeo(topW * 0.78, 0.068, roofLen * 0.74, 0.04, 3, 12);
    const pan = new THREE.Mesh(panGeo, mats.glass);
    pan.position.set(0, cabinHeight + 0.008, roofCenterZ);
    pan.userData.noShadow = true;
    pan.renderOrder = 2;
    cabin.add(pan);
  }

  // 3. Structural A, B & C Pillars (hollow greenhouse)
  const pillarR = 0.036;
  [-1, 1].forEach((side) => {
    const botX = side * (baseW * 0.475);
    const topX = side * (topW * 0.465);

    // A-pillar
    cabin.add(
      makeStrutBetween(
        new THREE.Vector3(botX, 0.0, fBotZ - 0.03),
        new THREE.Vector3(topX, cabinHeight - 0.015, fTopZ + 0.01),
        pillarR,
        pillarR * 1.15,
        mats.body,
        cityMode ? 6 : 12,
      ),
    );

    // C-pillar
    cabin.add(
      makeStrutBetween(
        new THREE.Vector3(botX, 0.0, rBotZ + 0.03),
        new THREE.Vector3(topX, cabinHeight - 0.015, rTopZ - 0.01),
        pillarR * 1.2,
        pillarR * 1.45,
        mats.body,
        cityMode ? 6 : 12,
      ),
    );

    // B-pillar
    if (cabinLen > 1.7) {
      const bZ = roofCenterZ - roofLen * 0.04;
      cabin.add(
        makeStrutBetween(
          new THREE.Vector3(botX, 0.0, bZ),
          new THREE.Vector3(topX, cabinHeight - 0.015, bZ),
          0.028,
          0.034,
          mats.trim,
          cityMode ? 6 : 10,
        ),
      );
    }

    // Side roof cantrail
    cabin.add(
      makeStrutBetween(
        new THREE.Vector3(topX, cabinHeight - 0.015, fTopZ),
        new THREE.Vector3(topX, cabinHeight - 0.015, rTopZ),
        0.028,
        0.028,
        mats.body,
        8,
      ),
    );

    if (!omitSideGlass) {
      const fBotEdge =
        sideGlassMaxLocalZ !== undefined ? Math.min(fBotZ - 0.08, sideGlassMaxLocalZ) : fBotZ - 0.06;
      const fTopEdge =
        sideGlassMaxLocalZ !== undefined ? Math.min(fTopZ - 0.02, sideGlassMaxLocalZ) : fTopZ - 0.02;
      if (fBotEdge > rBotZ + 0.14 && fTopEdge > rTopZ + 0.1) {
        const sideWinShape = new THREE.Shape();
        sideWinShape.moveTo(rBotZ + 0.06, 0.02);
        sideWinShape.lineTo(fBotEdge, 0.02);
        sideWinShape.lineTo(fTopEdge, cabinHeight - 0.045);
        sideWinShape.lineTo(rTopZ + 0.02, cabinHeight - 0.045);
        sideWinShape.closePath();

        const sideWinGeo = new THREE.ShapeGeometry(sideWinShape);
        sideWinGeo.rotateY(-Math.PI / 2);
        const pos = sideWinGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const py = pos.getY(i);
          const t = THREE.MathUtils.clamp(py / cabinHeight, 0, 1);
          pos.setX(i, THREE.MathUtils.lerp(botX * 0.96, topX * 0.96, t));
        }
        sideWinGeo.computeVertexNormals();
        const sideWin = new THREE.Mesh(sideWinGeo, mats.glass);
        sideWin.userData.noShadow = true;
        sideWin.renderOrder = 2;
        cabin.add(sideWin);
      }
    }
  });

  // 4. Tapered Trapezoidal Front Windshield + Wipers + Tapered Rear Window (zero corner protrusion!)
  const wsSpanZ = fBotZ - fTopZ;
  const wsLen = Math.hypot(cabinHeight, wsSpanZ);
  const wsAngle = Math.atan2(wsSpanZ, cabinHeight);
  const wsGeo = createTrapezoidGlassGeo(baseW * 0.88, topW * 0.87, wsLen * 0.93, 0.02);
  const ws = new THREE.Mesh(wsGeo, mats.glass);
  ws.position.set(0, cabinHeight * 0.5, (fBotZ + fTopZ) * 0.5 - 0.012);
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  cabin.add(ws);

  [-0.2, 0.15].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.016, 0.02), mats.grille);
    wiper.position.set(wx * width, 0.03, fBotZ - 0.01);
    wiper.rotation.z = 0.08;
    cabin.add(wiper);
  });

  const rwSpanZ = rTopZ - rBotZ;
  const rwLen = Math.hypot(cabinHeight, rwSpanZ);
  const rwAngle = Math.atan2(rwSpanZ, cabinHeight);
  const rwGeo = createTrapezoidGlassGeo(baseW * 0.87, topW * 0.86, rwLen * 0.91, 0.02);
  const rw = new THREE.Mesh(rwGeo, mats.glass);
  rw.position.set(0, cabinHeight * 0.5, (rBotZ + rTopZ) * 0.5 + 0.012);
  rw.rotation.x = rwAngle;
  rw.userData.noShadow = true;
  rw.renderOrder = 2;
  cabin.add(rw);

  return cabin;
}
