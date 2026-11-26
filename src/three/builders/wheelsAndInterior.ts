import * as THREE from 'three';
import { WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createAerodynamicMirror,
  createRoundedBoxGeo,
  createSculptedPanelGeo,
  enableShadows,
  makeBeamBetween,
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
  const isBikeWheel = style === 'bike_spoke' || style === 'bike_aero';
  const w = isBikeWheel ? Math.max(0.025, width) : Math.max(0.09, width);
  const latheSegs = cityMode ? 18 : 36;
  const rimR =
    style === 'monster_tractor'
      ? r * 0.42
      : style === 'atv_balloon'
        ? r * 0.48
        : style === 'aircraft_gear'
          ? r * 0.5
          : style === 'bike_aero'
            ? r * 0.75
            : style === 'bike_spoke'
              ? r * (width <= 0.035 ? 0.92 : 0.87)
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
    } else if (!cityMode && style === 'bike_spoke' && tireW >= 0.049) {
      const lugCount = 28;
      const lugGeo = new THREE.BoxGeometry(tireW * 0.78, 0.007, 0.016);
      for (let i = 0; i < lugCount; i++) {
        const a = (i / lugCount) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, mats.rubber);
        lug.position.set(xOffset, Math.cos(a) * r * 0.995, Math.sin(a) * r * 0.995);
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

  if (isBikeWheel) {
    // Hollow bicycle rim hoop (double-wall alloy or deep-section aero carbon)
    const rimDepth = style === 'bike_aero' ? r * 0.18 : 0.018;
    const outerRimR = style === 'bike_aero' ? r * 0.92 : rimR;
    const innerRimR = Math.max(0.08, outerRimR - rimDepth);
    const hw = w * 0.45;
    const rimPts = [
      new THREE.Vector2(innerRimR, -hw * 0.45),
      new THREE.Vector2(outerRimR * 0.995, -hw),
      new THREE.Vector2(outerRimR * 0.995, hw),
      new THREE.Vector2(innerRimR, hw * 0.45),
      new THREE.Vector2(innerRimR, -hw * 0.45),
    ];
    const rimGeo = new THREE.LatheGeometry(rimPts, latheSegs);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(
      rimGeo,
      style === 'bike_aero' ? mats.body : mats.alloy,
    );
    wheel.add(rimMesh);

    // Braking track lip ring
    const lipGeo = new THREE.TorusGeometry(outerRimR * 0.985, 0.004, 8, latheSegs);
    lipGeo.rotateY(Math.PI / 2);
    [-1, 1].forEach((sideSign) => {
      const lip = new THREE.Mesh(lipGeo, style === 'bike_aero' ? mats.secondary : mats.chrome);
      lip.position.x = sideSign * (hw * 0.92);
      wheel.add(lip);
    });

    // Crossed wire spokes (or bladed aero spokes) anchored to central hub flanges
    const spokeCount = cityMode ? 12 : style === 'bike_aero' ? 12 : 24;
    const hubFlangeX = 0.024;
    const spokeRadius = style === 'bike_aero' ? 0.0042 : 0.0022;
    const spokeMat = style === 'bike_aero' ? mats.alloy : mats.chrome;
    for (let i = 0; i < spokeCount; i++) {
      const rimAng = (i / spokeCount) * Math.PI * 2;
      const flangeSign = i % 2 === 0 ? 1 : -1;
      const hubAng = rimAng + (style === 'bike_aero' ? 0.12 : i % 4 < 2 ? 0.36 : -0.36);
      const pHub = new THREE.Vector3(
        flangeSign * hubFlangeX,
        Math.cos(hubAng) * 0.02,
        Math.sin(hubAng) * 0.02,
      );
      const pRim = new THREE.Vector3(
        0,
        Math.cos(rimAng) * innerRimR,
        Math.sin(rimAng) * innerRimR,
      );
      wheel.add(makeStrutBetween(pHub, pRim, spokeRadius, spokeRadius, spokeMat, 5));
    }

    // Precision bike hub barrel, flanges & axle
    const hubBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.088, 12).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    wheel.add(hubBarrel);
    [-1, 1].forEach((s) => {
      const flange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.006, 14).rotateZ(Math.PI / 2),
        mats.chrome,
      );
      flange.position.x = s * hubFlangeX;
      wheel.add(flange);
    });
    const axle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.118, 10).rotateZ(Math.PI / 2),
      mats.chrome,
    );
    wheel.add(axle);

    // Valve stem detail
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.003, 0.003, 0.028, 6),
      mats.chrome,
    );
    valve.position.set(0, innerRimR - 0.014, 0);
    wheel.add(valve);

    // Slim bicycle disc brake rotor on left side (-X) for MTB/Trail
    if (style === 'bike_spoke' && w >= 0.047) {
      const rotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.082, 0.004, 18).rotateZ(Math.PI / 2),
        mats.brakeDisc,
      );
      rotor.position.x = -0.032;
      wheel.add(rotor);
    }

    enableShadows(wheel, true, true);
    return wheel;
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
export interface InteriorStyleOptions {
  styleId?: number;
  archetype?: string;
  maxSpeedKmh?: number;
  category?: string;
}

export function buildVisibleInterior(
  cabLen: number,
  cabH: number,
  width: number,
  seatsCount: number,
  mats: VehicleMaterialSet,
  isOpenTop = false,
  tubDepth = 0.26,
  cityMode = false,
  interiorStyle: InteriorStyleOptions = {},
  animated?: BuiltVehicle['animatedParts'],
): THREE.Group {
  const interior = new THREE.Group();
  const innerW = Math.max(0.85, width * 0.8);
  const innerL = Math.max(1.0, cabLen * 0.88);
  const totalH = cabH + tubDepth;
  const styleVariant = (interiorStyle.styleId ?? 0) % 5;
  const arch = interiorStyle.archetype ?? '';
  const topSpeed = interiorStyle.maxSpeedKmh ?? 0;
  const isBuggy = arch === 'buggy';
  const isSupercar = arch === 'supercar' || topSpeed >= 295;
  const isHighSpeed = !isBuggy && (isSupercar || arch === 'roadster' || arch === 'muscle' || topSpeed >= 245);
  const isLuxury =
    !isBuggy &&
    (isHighSpeed ||
      arch === 'coupe' ||
      arch === 'sedan' ||
      arch === 'convertible' ||
      arch === 'classic' ||
      arch === 'suv' ||
      topSpeed >= 200);
  const isTrackSpyder = arch === 'convertible' && styleVariant === 2;
  const isLuxuryCruiser =
    (arch === 'convertible' || arch === 'roadster') &&
    (styleVariant === 2 || styleVariant === 1 || styleVariant === 4);

  // 1. Plush Floor Carpet + Stitched Floor Mats + Metallic Sill Kick Strips
  const floor = new THREE.Mesh(
    createRoundedBoxGeo(innerW, 0.035, innerL, 0.02, 2, 8),
    mats.grille,
  );
  floor.position.set(0, 0.018, 0);
  interior.add(floor);

  if (!cityMode) {
    [-1, 1].forEach((side) => {
      const mat = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.32, 0.014, innerL * 0.42, 0.012, 2, 6),
        mats.trim,
      );
      mat.position.set(side * (innerW * 0.27), 0.038, innerL * 0.08);
      interior.add(mat);

      if (isLuxury) {
        const sillPlate = new THREE.Mesh(
          new THREE.BoxGeometry(0.036, 0.014, innerL * 0.56),
          mats.chrome,
        );
        sillPlate.position.set(side * (innerW * 0.48), 0.042, 0);
        interior.add(sillPlate);
      }
    });
  }

  // 2. Sculpted Flowing Center Console + Diagonal Y-Bridge Stack + Armrest + Cupholders + Rear Climate Module
  const consoleLen = innerL * 0.62;
  const consoleH = Math.min(0.25, Math.max(0.16, tubDepth * 0.80));
  const consoleW = innerW * 0.19;
  const consoleBox = new THREE.Mesh(
    createRoundedBoxGeo(consoleW, consoleH, consoleLen, 0.035, cityMode ? 2 : 4, 10),
    mats.trim,
  );
  consoleBox.position.set(0, consoleH * 0.5 + 0.02, innerL * 0.01);
  interior.add(consoleBox);

  // Dash & console positions (pulled slightly back on supercars to clear raked windshields!)
  const dashZ = isSupercar ? innerL * 0.30 : innerL * 0.34;
  const dashY = Math.min(tubDepth + 0.075, totalH * 0.50);

  // Angled flowing center console bridge connecting tunnel smoothly up to dashboard (per CGTrader/TurboSquid refs)
  if (!cityMode && !isBuggy) {
    const bridgeStart = new THREE.Vector3(0, consoleH + 0.015, innerL * 0.14);
    const bridgeEnd = new THREE.Vector3(0, dashY - 0.03, dashZ - 0.10);
    const bridgeDir = new THREE.Vector3().subVectors(bridgeEnd, bridgeStart);
    const bridgeLen = Math.max(0.14, bridgeDir.length());
    const bridge = new THREE.Mesh(
      createRoundedBoxGeo(consoleW * 0.94, 0.07, bridgeLen, 0.02, 2, 8),
      mats.trim,
    );
    bridge.position.copy(bridgeStart).add(bridgeEnd).multiplyScalar(0.5);
    bridge.rotation.x = -Math.atan2(bridgeDir.y, Math.max(0.05, bridgeDir.z));
    interior.add(bridge);

    // Satin chrome/accent side bolsters & subtle ambient light piping along console bridge
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.014, 0.022, consoleLen * 0.86),
        isHighSpeed ? mats.accent : mats.chrome,
      );
      rail.position.set(side * (consoleW * 0.49), consoleH + 0.016, innerL * 0.02);
      interior.add(rail);

      const bridgeTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.010, 0.014, bridgeLen * 0.90),
        isHighSpeed ? mats.accent : mats.chrome,
      );
      bridgeTrim.position.set(
        side * (consoleW * 0.46),
        bridge.position.y + 0.025,
        bridge.position.z,
      );
      bridgeTrim.rotation.x = bridge.rotation.x;
      interior.add(bridgeTrim);
    });
  }

  // Twin-stitched leather center armrest + rear digital climate panel
  const armrest = new THREE.Mesh(
    createRoundedBoxGeo(consoleW * 0.92, 0.065, consoleLen * 0.38, 0.028, 3, 8),
    mats.interior,
  );
  armrest.position.set(0, consoleH + 0.045, -consoleLen * 0.16);
  interior.add(armrest);

  if (!cityMode) {
    if (isLuxury) {
      const armSeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.012, consoleLen * 0.34),
        isHighSpeed ? mats.accent : mats.secondary,
      );
      armSeam.position.set(0, consoleH + 0.076, -consoleLen * 0.16);
      interior.add(armSeam);

      // Rear-facing climate panel on back of center console (per CGTrader ref)
      const rearCli = new THREE.Mesh(
        createRoundedBoxGeo(consoleW * 0.68, 0.07, 0.024, 0.008, 2, 6),
        mats.grille,
      );
      rearCli.position.set(0, consoleH * 0.68, -consoleLen * 0.48);
      const rearCliScreen = new THREE.Mesh(new THREE.BoxGeometry(consoleW * 0.42, 0.032, 0.028), mats.sirenBlue);
      rearCliScreen.position.copy(rearCli.position);
      interior.add(rearCli, rearCliScreen);
    }

    // Twin chrome-rimmed cupholders & electronic parking/drive-mode rotary selector
    [0.015, 0.095].forEach((cz) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.007, 8, 16), mats.chrome);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, consoleH + 0.025, cz);
      interior.add(ring);
    });

    const modeDial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.022, 14), mats.chrome);
    modeDial.position.set(consoleW * 0.24, consoleH + 0.028, innerL * 0.13);
    interior.add(modeDial);

    if (!isHighSpeed) {
      const handbrake = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.11, 4, 8), mats.trim);
      handbrake.rotation.x = 1.15;
      handbrake.position.set(-innerW * 0.052, consoleH + 0.048, -0.04);
      interior.add(handbrake);
    }

    // Brushed aluminum drilled pedals on driver footwell
    [-0.105, -0.02, 0.065].forEach((px, idx) => {
      const pedal = new THREE.Mesh(
        new THREE.BoxGeometry(idx === 1 ? 0.062 : 0.042, idx === 2 ? 0.11 : 0.082, 0.016),
        mats.alloy,
      );
      pedal.position.set(-innerW * 0.255 + px, 0.115, dashZ + 0.02);
      pedal.rotation.x = -0.45;
      interior.add(pedal);
    });
  }

  // Gloss selector plinth + knurled gear shifter / electronic drive stalk
  const gaiter = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.046, 0.046, 12), mats.grille);
  gaiter.position.set(0, consoleH + 0.038, innerL * 0.145);
  interior.add(gaiter);

  const shifter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.014, isHighSpeed ? 0.095 : 0.125, 10),
    mats.chrome,
  );
  shifter.position.set(0, consoleH + (isHighSpeed ? 0.09 : 0.105), innerL * 0.145);
  shifter.rotation.x = -0.15;
  interior.add(shifter);

  const shiftKnob = new THREE.Mesh(
    isHighSpeed
      ? createRoundedBoxGeo(0.048, 0.036, 0.056, 0.014, 2, 8)
      : new THREE.SphereGeometry(0.025, 12, 10),
    isHighSpeed ? mats.accent : mats.trim,
  );
  shiftKnob.position.set(0, consoleH + (isHighSpeed ? 0.135 : 0.175), innerL * 0.155);
  interior.add(shiftKnob);

  // 3. Sculpted Wraparound Luxury / Performance Dashboard + Cowl Deck + Firewall Bulkhead (ZERO gaps!)
  const dashFullW = Math.min(width * 0.84, innerW * 1.06);
  const dash = new THREE.Mesh(
    createRoundedBoxGeo(dashFullW, 0.175, 0.27, 0.045, cityMode ? 2 : 4, 12),
    mats.trim,
  );
  dash.position.set(0, dashY, dashZ);
  interior.add(dash);

  const dashPad = new THREE.Mesh(
    createRoundedBoxGeo(dashFullW * 0.98, 0.042, 0.24, 0.02, 2, 10),
    mats.secondary,
  );
  dashPad.position.set(0, dashY + 0.088, dashZ + 0.012);
  interior.add(dashPad);

  // Lower knee bolster skirt beneath dashboard
  const lowerBolster = new THREE.Mesh(
    createRoundedBoxGeo(dashFullW * 0.96, 0.095, 0.18, 0.025, 2, 8),
    mats.trim,
  );
  lowerBolster.position.set(0, Math.max(0.12, dashY - 0.08), dashZ + 0.03);
  interior.add(lowerBolster);

  // Full-width lower firewall bulkhead sealing the footwell completely behind the pedals
  const fwHeight = Math.max(0.18, Math.max(tubDepth, dashY) + 0.03);
  const fwZ = Math.max(dashZ + 0.13, cabLen * 0.45);
  const firewallBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(dashFullW, fwHeight, 0.08),
    mats.grille,
  );
  firewallBulkhead.position.set(0, fwHeight * 0.5 + 0.015, fwZ);
  interior.add(firewallBulkhead);

  // Sloped upper defroster cowl deck bridging smoothly from dashPad forward under the windshield base
  const cowlStartZ = dashZ + 0.04;
  const cowlEndZ = Math.max(cowlStartZ + 0.10, cabLen * 0.50);
  const cowlStartY = dashY + 0.066;
  const cowlEndY = Math.min(tubDepth - 0.014, cowlStartY - 0.024);
  const cowlSpanZ = cowlEndZ - cowlStartZ;
  const cowlSpanY = cowlEndY - cowlStartY;
  const cowlLen = Math.hypot(cowlSpanZ, cowlSpanY);
  const cowlDeck = new THREE.Mesh(
    createRoundedBoxGeo(dashFullW, 0.042, cowlLen + 0.04, 0.014, 2, 6),
    mats.trim,
  );
  cowlDeck.position.set(0, (cowlStartY + cowlEndY) * 0.5, (cowlStartZ + cowlEndZ) * 0.5);
  cowlDeck.rotation.x = -Math.atan2(cowlSpanY, cowlSpanZ);
  interior.add(cowlDeck);

  if (!cityMode && !isBuggy) {
    const defrostGrille = new THREE.Mesh(
      new THREE.BoxGeometry(dashFullW * 0.66, 0.014, 0.044),
      mats.grille,
    );
    defrostGrille.position.set(
      0,
      THREE.MathUtils.lerp(cowlStartY, cowlEndY, 0.55) + 0.016,
      THREE.MathUtils.lerp(cowlStartZ, cowlEndZ, 0.55),
    );
    defrostGrille.rotation.x = cowlDeck.rotation.x;
    interior.add(defrostGrille);
  }

  if (!cityMode && isLuxury) {
    // Sweeping horizontal luxury inlay strip across passenger dash
    const dashInlay = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.86, 0.020, 0.022, 0.008, 2, 6),
      isHighSpeed ? mats.accent : mats.chrome,
    );
    dashInlay.position.set(0, dashY + 0.015, dashZ - 0.124);
    interior.add(dashInlay);

    // 4 Satin-chrome turbine/linear climate air vents + center lower climate button strip
    [-innerW * 0.38, -innerW * 0.06, innerW * 0.06, innerW * 0.38].forEach((vx) => {
      const ventFrame = new THREE.Mesh(
        createRoundedBoxGeo(0.072, 0.032, 0.020, 0.008, 2, 6),
        mats.chrome,
      );
      ventFrame.position.set(vx, dashY + 0.015, dashZ - 0.128);
      const ventLouvers = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.018, 0.023), mats.grille);
      ventLouvers.position.copy(ventFrame.position);
      interior.add(ventFrame, ventLouvers);
    });

    const climateStrip = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.24, 0.030, 0.022, 0.008, 2, 6),
      mats.grille,
    );
    climateStrip.position.set(0, dashY - 0.032, dashZ - 0.128);
    interior.add(climateStrip);
  }

  // Hooded Driver Binnacle OR Recessed Dual-Screen Glass Cockpit under Sculpted Visor Brow
  if (!cityMode && isLuxury) {
    const glassHousing = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.60, 0.092, 0.024, 0.012, 2, 8),
      mats.grille,
    );
    glassHousing.position.set(-innerW * 0.06, dashY + 0.088, dashZ - 0.095);
    glassHousing.rotation.x = -0.10;
    interior.add(glassHousing);

    const dashBrow = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.64, 0.028, 0.095, 0.012, 2, 8),
      mats.secondary,
    );
    dashBrow.position.set(-innerW * 0.06, dashY + 0.132, dashZ - 0.075);
    interior.add(dashBrow);

    // Left Digital Instrument Cluster + twin illuminated dial rings
    const clusterScreen = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.23, 0.064, 0.014, 0.006, 2, 6),
      mats.sirenBlue,
    );
    clusterScreen.position.set(-innerW * 0.21, dashY + 0.088, dashZ - 0.104);
    clusterScreen.rotation.x = -0.10;
    interior.add(clusterScreen);

    [-0.048, 0.048].forEach((gx) => {
      const dial = new THREE.Mesh(
        new THREE.TorusGeometry(0.020, 0.004, 8, 18),
        isHighSpeed ? mats.sirenRed : mats.chrome,
      );
      dial.position.set(-innerW * 0.21 + gx, dashY + 0.088, dashZ - 0.114);
      interior.add(dial);
    });

    // Right Wide Infotainment Display angled slightly toward driver
    const infoScreen = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.29, 0.068, 0.014, 0.008, 2, 8),
      mats.sirenBlue,
    );
    infoScreen.position.set(innerW * 0.08, dashY + 0.088, dashZ - 0.108);
    infoScreen.rotation.x = -0.10;
    infoScreen.rotation.y = 0.10;
    interior.add(infoScreen);

    if (isHighSpeed) {
      const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.016, 12), mats.sirenRed);
      startBtn.rotation.x = Math.PI / 2;
      startBtn.position.set(-innerW * 0.11, dashY + 0.02, dashZ - 0.132);
      interior.add(startBtn);
    }
  } else {
    const binnacle = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.30, 0.082, 0.13, 0.028, 3, 10),
      mats.grille,
    );
    binnacle.position.set(-innerW * 0.26, dashY + 0.095, dashZ - 0.02);
    interior.add(binnacle);

    if (!cityMode) {
      [-0.055, 0.055].forEach((gx) => {
        const dial = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0045, 8, 16), mats.sirenBlue);
        dial.position.set(-innerW * 0.26 + gx, dashY + 0.095, dashZ - 0.086);
        interior.add(dial);
      });
    }

    const infoFrame = new THREE.Mesh(
      createRoundedBoxGeo(0.22, 0.092, 0.022, 0.01, 2, 8),
      mats.grille,
    );
    infoFrame.position.set(0, dashY + 0.092, dashZ - 0.098);
    infoFrame.rotation.x = -0.12;
    const infoScreen = new THREE.Mesh(
      createRoundedBoxGeo(0.19, 0.070, 0.014, 0.008, 2, 6),
      mats.sirenBlue,
    );
    infoScreen.position.set(0, dashY + 0.092, dashZ - 0.106);
    infoScreen.rotation.x = -0.12;
    interior.add(infoFrame, infoScreen);
  }

  // 4. Sculpted Steering Column + D-Ring / 3-Spoke Sport Wheel + F1 Paddle Shifters
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.25, 12), mats.trim);
  col.position.set(-innerW * 0.26, dashY + 0.045, dashZ - 0.13);
  col.rotation.x = 1.05;
  interior.add(col);

  const steerMount = new THREE.Group();
  steerMount.position.set(-innerW * 0.26, dashY + 0.105, dashZ - 0.225);
  steerMount.rotation.x = isHighSpeed ? 0.30 : 0.38;

  const steerGroup = new THREE.Group();
  const wheelR = isHighSpeed ? 0.132 : 0.14;
  if (!cityMode && isLuxury) {
    // Sport flat-bottom D-ring wheel: top 290° curved grip + sculpted flat bottom alloy chord
    const arcRim = new THREE.Mesh(
      new THREE.TorusGeometry(wheelR, 0.022, 10, 26, Math.PI * 1.56),
      mats.grille,
    );
    arcRim.rotation.z = -Math.PI * 0.28;
    const flatBottom = new THREE.Mesh(
      createRoundedBoxGeo(wheelR * 1.32, 0.032, 0.042, 0.014, 2, 8),
      mats.grille,
    );
    flatBottom.position.set(0, -wheelR * 0.84, 0);
    const alloyVSpoke = new THREE.Mesh(
      createRoundedBoxGeo(wheelR * 0.72, 0.036, 0.022, 0.008, 2, 6),
      mats.chrome,
    );
    alloyVSpoke.position.set(0, -wheelR * 0.50, 0);
    steerGroup.add(arcRim, flatBottom, alloyVSpoke);

    if (isHighSpeed) {
      // 12-o'clock racing centering band + metallic F1 paddle shifters behind wheel
      const topMarker = new THREE.Mesh(
        new THREE.BoxGeometry(0.022, 0.048, 0.048),
        mats.accent,
      );
      topMarker.position.set(0, wheelR, 0);
      steerGroup.add(topMarker);

      [-1, 1].forEach((ps) => {
        const paddle = new THREE.Mesh(
          createRoundedBoxGeo(0.036, 0.095, 0.010, 0.006, 2, 6),
          mats.chrome,
        );
        paddle.position.set(ps * (wheelR * 0.66), 0.015, 0.032);
        paddle.rotation.z = -ps * 0.16;
        steerGroup.add(paddle);
      });
    }
  } else {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(wheelR, 0.021, cityMode ? 6 : 12, cityMode ? 16 : 28),
      mats.grille,
    );
    steerGroup.add(rim);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.034, 16), mats.trim);
  hub.rotation.x = Math.PI / 2;
  steerGroup.add(hub);
  if (!cityMode) {
    const hornRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 6, 16), mats.chrome);
    hornRing.position.z = -0.018;
    steerGroup.add(hornRing);
  }
  const spokeAngles = isLuxury ? [-Math.PI / 2, Math.PI / 2, Math.PI] : [Math.PI, Math.PI / 3, -Math.PI / 3];
  for (const a of spokeAngles) {
    const spokeLen = a === Math.PI ? wheelR * 0.78 : wheelR * 0.88;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.026, spokeLen, 0.018), mats.chrome);
    spoke.position.set(Math.sin(a) * spokeLen * 0.5, Math.cos(a) * spokeLen * 0.5, 0);
    spoke.rotation.z = -a;
    steerGroup.add(spoke);
  }
  steerMount.add(steerGroup);
  interior.add(steerMount);
  animated?.steeringWheels.push(steerGroup);

  // Passenger grab handle on dash for buggies & track roadsters
  if (!cityMode && (isBuggy || arch === 'roadster' || styleVariant === 2)) {
    const grabBar = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.26, 0.022, 0.055, 0.008, 2, 6),
      isBuggy ? mats.accent : mats.chrome,
    );
    grabBar.position.set(innerW * 0.28, dashY + 0.02, dashZ - 0.13);
    interior.add(grabBar);
  }

  // 5. Sculpted High-Speed Racing Bucket Seats & Quilted Luxury GT Seats (per Image #4 Reference Board!)
  const seatZ = seatsCount >= 4 ? innerL * 0.02 : -innerL * 0.06;
  const maxSeatBackH = Math.min(isHighSpeed ? 0.50 : 0.48, Math.max(0.32, totalH * 0.62));
  const seatW = Math.min(0.45, innerW * 0.35);

  [-1, 1].forEach((side) => {
    const seatGroup = new THREE.Group();
    const bolsterMat = isHighSpeed || isLuxury ? mats.secondary : mats.interior;

    // Sculpted deep bucket cushion + forward thigh extension + flared hip bolsters
    const cushion = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.90, 0.105, 0.43, 0.04, cityMode ? 2 : 4, 10),
      mats.interior,
    );
    cushion.position.set(0, 0.075, 0.03);
    cushion.rotation.x = isHighSpeed ? 0.08 : 0.04;
    seatGroup.add(cushion);

    if (!cityMode) {
      // Forward extendable thigh support lip + quilted base ribs
      const thighExt = new THREE.Mesh(
        createRoundedBoxGeo(seatW * 0.64, 0.065, 0.11, 0.026, 3, 8),
        mats.interior,
      );
      thighExt.position.set(0, 0.088, 0.22);
      thighExt.rotation.x = 0.12;
      seatGroup.add(thighExt);

      for (let cRib = 0; cRib < 3; cRib++) {
        const cPad = new THREE.Mesh(
          createRoundedBoxGeo(seatW * 0.56, 0.024, 0.075, 0.008, 2, 6),
          bolsterMat,
        );
        cPad.position.set(0, 0.125 + cRib * 0.006, -0.05 + cRib * 0.095);
        cPad.rotation.x = isHighSpeed ? 0.08 : 0.04;
        seatGroup.add(cPad);
      }

      // Tall cupped lateral thigh bolsters with contrast racing piping
      [-1, 1].forEach((bs) => {
        const thigh = new THREE.Mesh(
          createRoundedBoxGeo(0.082, isHighSpeed ? 0.125 : 0.098, 0.44, 0.028, 3, 8),
          bolsterMat,
        );
        thigh.position.set(bs * (seatW * 0.45), isHighSpeed ? 0.125 : 0.11, 0.04);
        thigh.rotation.z = -bs * (isHighSpeed ? 0.30 : 0.22);
        seatGroup.add(thigh);

        if (isHighSpeed || isLuxury) {
          const thighPipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.38, 6),
            isHighSpeed ? mats.accent : mats.chrome,
          );
          thighPipe.rotation.x = Math.PI / 2;
          thighPipe.position.set(bs * (seatW * 0.48), isHighSpeed ? 0.17 : 0.145, 0.04);
          seatGroup.add(thighPipe);
        }
      });
    }

    // Reclined ergonomic backrest core
    const recline = isHighSpeed ? -0.22 : -0.18;
    const backrest = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.84, maxSeatBackH, 0.115, 0.042, cityMode ? 2 : 4, 10),
      mats.interior,
    );
    backrest.position.set(0, 0.11 + maxSeatBackH * 0.46, -0.15);
    backrest.rotation.x = recline;
    seatGroup.add(backrest);

    // Deep lateral ribcage & flared upper shoulder racing wings (iconic supercar / GT profile!)
    if (!cityMode) {
      [-1, 1].forEach((ls) => {
        const wing = new THREE.Mesh(
          createRoundedBoxGeo(0.076, maxSeatBackH * 0.74, isHighSpeed ? 0.165 : 0.135, 0.026, 3, 8),
          bolsterMat,
        );
        wing.position.set(ls * (seatW * 0.42), 0.11 + maxSeatBackH * 0.42, -0.115);
        wing.rotation.x = recline;
        wing.rotation.y = -ls * (isHighSpeed ? 0.34 : 0.24);
        seatGroup.add(wing);

        if (isHighSpeed || isLuxury) {
          const shoulderEar = new THREE.Mesh(
            createRoundedBoxGeo(0.085, maxSeatBackH * 0.28, 0.145, 0.028, 3, 8),
            bolsterMat,
          );
          shoulderEar.position.set(ls * (seatW * 0.45), 0.11 + maxSeatBackH * 0.74, -0.165);
          shoulderEar.rotation.x = recline + 0.05;
          shoulderEar.rotation.y = -ls * 0.32;
          shoulderEar.rotation.z = ls * 0.14;
          seatGroup.add(shoulderEar);

          const wingPiping = new THREE.Mesh(
            createRoundedBoxGeo(0.012, maxSeatBackH * 0.68, 0.018, 0.004, 2, 6),
            isHighSpeed ? mats.accent : mats.chrome,
          );
          wingPiping.position.set(ls * (seatW * 0.44), 0.11 + maxSeatBackH * 0.44, -0.052);
          wingPiping.rotation.x = recline;
          seatGroup.add(wingPiping);
        }
      });
    }

    // Integrated high-speed racing headrest OR plush GT luxury headrest
    const headrest = new THREE.Mesh(
      createRoundedBoxGeo(seatW * (isHighSpeed ? 0.48 : 0.56), isHighSpeed ? 0.175 : 0.15, 0.098, 0.04, 3, 10),
      mats.interior,
    );
    headrest.position.set(0, 0.15 + maxSeatBackH * 0.94, isHighSpeed ? -0.24 : -0.22);
    headrest.rotation.x = -0.10;
    seatGroup.add(headrest);

    // Shoulder collar / center GT crest
    const bolster = new THREE.Mesh(
      createRoundedBoxGeo(seatW * 0.74, 0.036, 0.034, 0.012, 2, 8),
      isHighSpeed ? mats.accent : mats.secondary,
    );
    bolster.position.set(0, 0.12 + maxSeatBackH * 0.76, -0.13);
    bolster.rotation.x = recline;
    seatGroup.add(bolster);

    // Per-vehicle quilted / stitched / 4-point harness seat center detailing
    if (!cityMode) {
      if (isBuggy || isTrackSpyder || isHighSpeed) {
        // Racing 4-point harness eyelets (metallic carbon bezels) + quilted center ribs
        [-0.078, 0.078].forEach((hx) => {
          const bezel = new THREE.Mesh(
            createRoundedBoxGeo(0.058, 0.044, 0.125, 0.012, 2, 6),
            isBuggy ? mats.accent : mats.chrome,
          );
          bezel.position.set(hx, 0.13 + maxSeatBackH * 0.80, -0.215);
          bezel.rotation.x = recline;
          seatGroup.add(bezel);

          if (isBuggy || isTrackSpyder || styleVariant === 1) {
            const strap = new THREE.Mesh(
              createRoundedBoxGeo(0.038, maxSeatBackH * 0.72, 0.022, 0.008, 2, 6),
              isBuggy ? mats.accent : mats.sirenRed,
            );
            strap.position.set(hx, 0.11 + maxSeatBackH * 0.44, -0.095);
            strap.rotation.x = recline;
            seatGroup.add(strap);
          }
        });
      }

      if (isLuxury && !isBuggy) {
        // Horizontal diamond/ribbed luxury leather backrest pleats (per Aston/Bentley/GT ref)
        for (let r = 0; r < 4; r++) {
          const pleat = new THREE.Mesh(
            createRoundedBoxGeo(seatW * 0.52, 0.042, 0.024, 0.01, 2, 6),
            styleVariant === 3 ? mats.accent : mats.secondary,
          );
          pleat.position.set(0, 0.14 + maxSeatBackH * (0.18 + r * 0.15), -0.105 - r * 0.018);
          pleat.rotation.x = recline;
          seatGroup.add(pleat);
        }
        if (!isHighSpeed) {
          [-0.075, 0.075].forEach((px) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.08, 8), mats.chrome);
            post.position.set(px, 0.12 + maxSeatBackH * 0.88, -0.205);
            seatGroup.add(post);
          });
        }
      } else if (!isBuggy) {
        [-0.055, 0.055].forEach((sx) => {
          const stripe = new THREE.Mesh(
            createRoundedBoxGeo(0.036, maxSeatBackH * 0.68, 0.024, 0.008, 2, 6),
            mats.accent,
          );
          stripe.position.set(sx, 0.11 + maxSeatBackH * 0.44, -0.098);
          stripe.rotation.x = recline;
          seatGroup.add(stripe);
        });
      }

      // Gloss / Carbon Molded Seatback Shell + metallic twin spine accents (visible from rear 3/4 view!)
      const shellBack = new THREE.Mesh(
        createRoundedBoxGeo(seatW * 0.82, maxSeatBackH * 0.88, 0.036, 0.016, 2, 8),
        isHighSpeed || styleVariant === 2 ? mats.trim : mats.secondary,
      );
      shellBack.position.set(0, 0.11 + maxSeatBackH * 0.46, -0.218);
      shellBack.rotation.x = recline;
      seatGroup.add(shellBack);

      if (isHighSpeed || isLuxury) {
        const backSpine = new THREE.Mesh(
          createRoundedBoxGeo(0.044, maxSeatBackH * 0.66, 0.018, 0.008, 2, 6),
          mats.chrome,
        );
        backSpine.position.set(0, 0.12 + maxSeatBackH * 0.48, -0.238);
        backSpine.rotation.x = recline;
        seatGroup.add(backSpine);
      }
    }

    seatGroup.position.set(side * (innerW * 0.27), 0.02, seatZ);
    interior.add(seatGroup);
  });

  // 6. Sculpted Rear Luxury Seats (Contoured Outboard Seats + Center Folding Console on 4+ seaters)
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
    rearBack.position.set(0, 0.10 + maxSeatBackH * 0.42, -innerL * 0.44);
    rearBack.rotation.x = -0.18;
    interior.add(rearBack);

    if (!cityMode && isLuxury) {
      [-1, 1].forEach((rs) => {
        const rBolster = new THREE.Mesh(
          createRoundedBoxGeo(0.068, maxSeatBackH * 0.68, 0.125, 0.022, 2, 8),
          mats.secondary,
        );
        rBolster.position.set(rs * (innerW * 0.39), 0.11 + maxSeatBackH * 0.40, -innerL * 0.41);
        rBolster.rotation.x = -0.18;
        rBolster.rotation.y = -rs * 0.20;
        interior.add(rBolster);
      });

      const rearCenterArm = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.18, 0.075, 0.28, 0.025, 2, 8),
        mats.secondary,
      );
      rearCenterArm.position.set(0, 0.19, -innerL * 0.29);
      const rearCupTrim = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 14), mats.chrome);
      rearCupTrim.rotation.x = Math.PI / 2;
      rearCupTrim.position.set(0, 0.23, -innerL * 0.21);
      interior.add(rearCenterArm, rearCupTrim);
    }

    if (!isOpenTop) {
      [-0.28, 0.28].forEach((rx) => {
        const hr = new THREE.Mesh(
          createRoundedBoxGeo(0.20, 0.13, 0.085, 0.03, 2, 8),
          mats.interior,
        );
        hr.position.set(rx * innerW, 0.14 + maxSeatBackH * 0.88, -innerL * 0.48);
        interior.add(hr);
      });
    }
  }

  // 7. Interior Rear-View Mirror, Sun Visors & Soft Cabin Ambient Light (Closed Studio Cars)
  if (!isOpenTop) {
    const rvMirror = new THREE.Mesh(
      createRoundedBoxGeo(0.18, 0.05, 0.032, 0.012, 2, 8),
      mats.grille,
    );
    rvMirror.position.set(0, totalH * 0.82, innerL * 0.30);
    interior.add(rvMirror);

    if (!cityMode) {
      [-0.25, 0.25].forEach((vx) => {
        const visor = new THREE.Mesh(
          createRoundedBoxGeo(innerW * 0.34, 0.075, 0.018, 0.01, 2, 6),
          mats.secondary,
        );
        visor.position.set(vx * innerW, totalH * 0.94, innerL * 0.27);
        visor.rotation.x = 0.22;
        interior.add(visor);
      });

      const cabinAmbient = new THREE.PointLight(0xf1f5f9, 0.65, 2.0, 1.8);
      cabinAmbient.position.set(0, totalH * 0.84, innerL * 0.05);
      interior.add(cabinAmbient);
    }
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
  // Door extends along -Z from front hinge (hingeZ), sculpted with convex barrel curvature,
  // upper shoulder character crease, lower rocker tumble-under, and tumblehome lean
  const skinGeo = createSculptedPanelGeo(
    skinThick,
    spec.doorHeight,
    spec.doorLen,
    cityMode ? 2 : 4,
    cityMode ? 4 : 10,
    cityMode ? 4 : 10,
    0.022,
    (pos, idx, hx, hy) => {
      const x = pos.getX(idx);
      const y = pos.getY(idx);
      const tY = THREE.MathUtils.clamp((y + hy) / Math.max(0.05, hy * 2), 0, 1);
      if (x * spec.side > -hx * 0.25) {
        const belly = Math.sin(tY * Math.PI) * 0.022;
        const lowerTuck = -Math.pow(1 - tY, 2.2) * 0.018;
        const upperLean = -Math.pow(Math.max(0, (tY - 0.52) / 0.48), 1.35) * 0.022;
        const crease = 0.008 * Math.exp(-Math.pow((tY - 0.80) / 0.10, 2));
        pos.setX(idx, x + spec.side * (belly + lowerTuck + upperLean + crease));
      } else if (tY > 0.52) {
        pos.setX(idx, x - spec.side * Math.pow((tY - 0.52) / 0.48, 1.35) * 0.014);
      }
    },
  );
  const skin = new THREE.Mesh(skinGeo, mats.body);
  skin.position.set(0, -spec.doorHeight * 0.5, -spec.doorLen * 0.5);
  pivot.add(skin);

  // Upper beltline weatherstrip scraper trim seated on tumblehome shoulder
  const beltTrim = new THREE.Mesh(
    new THREE.BoxGeometry(skinThick * 0.38, 0.016, spec.doorLen * 0.96),
    mats.trim,
  );
  beltTrim.position.set(-spec.side * 0.014, -0.006, -spec.doorLen * 0.5);
  pivot.add(beltTrim);

  // Subtle lower character molding following convex curve
  const molding = new THREE.Mesh(
    createRoundedBoxGeo(0.012, 0.020, spec.doorLen * 0.90, 0.005, 2, 6),
    mats.trim,
  );
  molding.position.set(spec.side * (skinThick * 0.50), -spec.doorHeight * 0.56, -spec.doorLen * 0.5);
  pivot.add(molding);

  // Sleek outer flush-pull handle aligned with upper shoulder crease
  const handle = new THREE.Mesh(
    createRoundedBoxGeo(0.020, 0.022, 0.13, 0.009, 2, 6),
    mats.chrome,
  );
  handle.position.set(spec.side * (skinThick * 0.42), -spec.doorHeight * 0.22, -spec.doorLen * 0.78);
  pivot.add(handle);

  // Finished interior door card (quilted upper insert, metallic inlay strip, armrest, chrome latch & speaker ring)
  if (!cityMode) {
    const card = new THREE.Mesh(
      createRoundedBoxGeo(0.03, spec.doorHeight * 0.84, spec.doorLen * 0.92, 0.02, 2, 8),
      mats.trim,
    );
    card.position.set(-spec.side * (skinThick * 0.42), -spec.doorHeight * 0.48, -spec.doorLen * 0.5);
    pivot.add(card);

    const inlayTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.018, spec.doorLen * 0.78),
      mats.chrome,
    );
    inlayTrim.position.set(-spec.side * (skinThick * 0.58), -spec.doorHeight * 0.18, -spec.doorLen * 0.5);
    pivot.add(inlayTrim);

    const latchHandle = new THREE.Mesh(
      createRoundedBoxGeo(0.02, 0.022, 0.085, 0.008, 2, 6),
      mats.chrome,
    );
    latchHandle.position.set(-spec.side * (skinThick * 0.60), -spec.doorHeight * 0.18, -spec.doorLen * 0.28);
    pivot.add(latchHandle);

    const armrest = new THREE.Mesh(
      createRoundedBoxGeo(0.048, 0.045, spec.doorLen * 0.52, 0.015, 2, 6),
      mats.interior,
    );
    armrest.position.set(-spec.side * (skinThick * 0.65), -spec.doorHeight * 0.36, -spec.doorLen * 0.52);
    pivot.add(armrest);

    const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.015, 14), mats.grille);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(-spec.side * (skinThick * 0.56), -spec.doorHeight * 0.68, -spec.doorLen * 0.22);
    const speakerRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.006, 6, 16), mats.chrome);
    speakerRing.rotation.y = Math.PI / 2;
    speakerRing.position.set(-spec.side * (skinThick * 0.64), -spec.doorHeight * 0.68, -spec.doorLen * 0.22);
    pivot.add(speaker, speakerRing);
  }

  // Side window glass attached to door (tapers inward at top; rotateY(-PI/2) maps +X -> +Z so negative X -> -Z along door length!)
  if (spec.glassHeight > 0.12) {
    const fZ = -0.03;
    const rZ = -spec.doorLen + 0.03;
    const fTopZ = Math.max(rZ + 0.12, fZ - spec.glassTopZInsetFront);
    const rTopZ = Math.min(fTopZ - 0.08, rZ + spec.glassTopZInsetRear);

    const winShape = new THREE.Shape();
    winShape.moveTo(rZ, 0);
    winShape.lineTo(fZ, 0);
    winShape.lineTo(fTopZ, spec.glassHeight);
    winShape.lineTo(rTopZ, spec.glassHeight);
    winShape.closePath();

    const winGeo = new THREE.ShapeGeometry(winShape);
    winGeo.rotateY(-Math.PI / 2);
    const pos = winGeo.attributes.position;
    const baseInsetX = -spec.side * 0.012;
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

    // Slim flush rectangular black door window sash frame for framed doors (frameless on supercars)
    if (!spec.isScissor) {
      const topX = -spec.side * spec.topInwardShift;
      const sideHint = new THREE.Vector3(spec.side, 0, 0);
      const topFrame = makeBeamBetween(
        new THREE.Vector3(topX, spec.glassHeight, fTopZ),
        new THREE.Vector3(topX, spec.glassHeight, rTopZ),
        0.024,
        0.022,
        mats.trim,
        sideHint,
        0.005,
      );
      const rearSash = makeBeamBetween(
        new THREE.Vector3(baseInsetX, 0, rZ),
        new THREE.Vector3(topX, spec.glassHeight, rTopZ),
        0.024,
        0.022,
        mats.trim,
        sideHint,
        0.005,
      );
      const frontSash = makeBeamBetween(
        new THREE.Vector3(baseInsetX, 0, fZ),
        new THREE.Vector3(topX, spec.glassHeight, fTopZ),
        0.020,
        0.020,
        mats.trim,
        sideHint,
        0.005,
      );
      pivot.add(topFrame, rearSash, frontSash);
    }
  }

  // Wing mirror mounted onto front corner of front doors
  if (spec.hasMirror) {
    const mirror = createAerodynamicMirror(spec.side, mats, cityMode);
    mirror.position.set(spec.side * (skinThick * 0.45), 0.025, -0.13);
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
  convexBow = 0.026,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(1, 1, 10, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hh = Math.max(0.05, slantLen) * 0.5;
  const hb = Math.max(0.05, botW) * 0.5;
  const ht = Math.max(0.05, topW) * 0.5;
  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i); // -0.5 .. +0.5
    const uy = pos.getY(i); // -0.5 .. +0.5
    const tY = uy + 0.5; // 0 (bottom) .. 1 (top)
    const halfW = THREE.MathUtils.lerp(hb, ht, tY);
    const x = ux * 2 * halfW;
    const y = uy * 2 * hh;
    const zBow = convexBow * Math.cos(ux * Math.PI) * (0.45 + 0.55 * Math.sin(tY * Math.PI));
    pos.setXYZ(i, x, y, zBow + thickness * 0.15);
  }
  pos.needsUpdate = true;
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
  interiorStyle: InteriorStyleOptions = {},
  animated?: BuiltVehicle['animatedParts'],
): THREE.Group {
  const cabin = new THREE.Group();
  const hl = cabinLen / 2;
  const effectiveTaper = Math.max(taper, 0.28);
  const baseW = width * 0.89;
  const topW = width * (1 - effectiveTaper * 0.42);

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
    interiorStyle,
    animated,
  );
  interior.position.y = -interiorDropY;
  cabin.add(interior);

  // 2. Double-Curved Beveled Roof Shell (ExtrudeGeometry longitudinal camber + lateral convex dome)
  const roofCurve = new THREE.Shape();
  const rh = roofLen * 0.5 + 0.04;
  roofCurve.moveTo(-rh, 0);
  roofCurve.bezierCurveTo(-rh * 0.45, 0.036, rh * 0.45, 0.036, rh, 0);
  roofCurve.lineTo(rh - 0.02, -0.036);
  roofCurve.quadraticCurveTo(0, 0.004, -rh + 0.02, -0.036);
  roofCurve.closePath();

  const roofSpanW = Math.max(0.2, topW - 0.07);
  const roofGeo = new THREE.ExtrudeGeometry(roofCurve, {
    depth: roofSpanW,
    steps: cityMode ? 2 : 8,
    bevelEnabled: true,
    bevelSize: 0.034,
    bevelThickness: 0.034,
    bevelSegments: cityMode ? 2 : 5,
    curveSegments: cityMode ? 8 : 20,
  });
  roofGeo.translate(0, 0, -roofSpanW / 2);
  roofGeo.rotateY(-Math.PI / 2);

  // Sculpt lateral convex roof dome across X so studio light wraps across both axes
  const roofPos = roofGeo.attributes.position as THREE.BufferAttribute;
  const halfRoofW = Math.max(0.15, topW * 0.5);
  for (let i = 0; i < roofPos.count; i++) {
    const rx = roofPos.getX(i);
    const ry = roofPos.getY(i);
    const nx = THREE.MathUtils.clamp(Math.abs(rx) / halfRoofW, 0, 1);
    const latDome = 0.032 * Math.cos(nx * Math.PI * 0.5);
    roofPos.setY(i, ry + latDome);
  }
  roofPos.needsUpdate = true;
  roofGeo.computeVertexNormals();

  const roofMesh = new THREE.Mesh(roofGeo, mats.body);
  roofMesh.position.set(0, cabinHeight - 0.012, roofCenterZ);
  cabin.add(roofMesh);

  if (panoramic) {
    const panBezel = new THREE.Mesh(
      createSculptedPanelGeo(topW * 0.78, 0.032, roofLen * 0.74, 8, 2, 8, 0.016, (p, idx, hx) => {
        const nx = THREE.MathUtils.clamp(Math.abs(p.getX(idx)) / Math.max(0.1, hx), 0, 1);
        p.setY(idx, p.getY(idx) + 0.024 * Math.cos(nx * Math.PI * 0.5));
      }),
      mats.grille,
    );
    panBezel.position.set(0, cabinHeight + 0.008, roofCenterZ);
    const panGeo = createSculptedPanelGeo(topW * 0.72, 0.034, roofLen * 0.68, 8, 2, 8, 0.014, (p, idx, hx) => {
      const nx = THREE.MathUtils.clamp(Math.abs(p.getX(idx)) / Math.max(0.1, hx), 0, 1);
      p.setY(idx, p.getY(idx) + 0.026 * Math.cos(nx * Math.PI * 0.5));
    });
    const pan = new THREE.Mesh(panGeo, mats.glass);
    pan.position.set(0, cabinHeight + 0.011, roofCenterZ);
    pan.userData.noShadow = true;
    pan.renderOrder = 2;
    cabin.add(panBezel, pan);
  }

  // 3. Flush Rectangular/Chamfered Structural A, B & C Pillars + Cantrails (no pipe gaps!)
  const wsSpanZ = fBotZ - fTopZ;
  const wsLen = Math.hypot(cabinHeight, wsSpanZ);
  const wsAngle = Math.atan2(wsSpanZ, cabinHeight);
  const rwSpanZ = rTopZ - rBotZ;
  const rwLen = Math.hypot(cabinHeight, rwSpanZ);
  const rwAngle = Math.atan2(rwSpanZ, cabinHeight);

  [-1, 1].forEach((side) => {
    const botX = side * (baseW * 0.482);
    const topX = side * (topW * 0.468);
    const pillarOut = new THREE.Vector3(side * 0.55, 0.25, 0.45);
    const rearOut = new THREE.Vector3(side * 0.55, 0.25, -0.45);
    const sideOut = new THREE.Vector3(side, 0.15, 0);

    // Flush A-pillar (wider face aligned to windshield edge)
    cabin.add(
      makeBeamBetween(
        new THREE.Vector3(botX, -0.015, fBotZ - 0.015),
        new THREE.Vector3(topX, cabinHeight - 0.012, fTopZ + 0.012),
        0.056,
        0.052,
        mats.body,
        pillarOut,
        0.014,
      ),
    );

    // Flush C-pillar
    cabin.add(
      makeBeamBetween(
        new THREE.Vector3(botX, -0.015, rBotZ + 0.015),
        new THREE.Vector3(topX, cabinHeight - 0.012, rTopZ - 0.012),
        0.072,
        0.056,
        mats.body,
        rearOut,
        0.016,
      ),
    );

    // Sleek blackout B-pillar
    if (cabinLen > 1.7) {
      const bZ = roofCenterZ - roofLen * 0.04;
      cabin.add(
        makeBeamBetween(
          new THREE.Vector3(botX * 0.99, -0.01, bZ),
          new THREE.Vector3(topX, cabinHeight - 0.012, bZ),
          0.062,
          0.036,
          mats.trim,
          sideOut,
          0.010,
        ),
      );
    }

    // Side roof cantrail bridging A-pillar to C-pillar flush with roof edge
    cabin.add(
      makeBeamBetween(
        new THREE.Vector3(topX, cabinHeight - 0.014, fTopZ + 0.01),
        new THREE.Vector3(topX, cabinHeight - 0.014, rTopZ - 0.01),
        0.046,
        0.046,
        mats.body,
        sideOut,
        0.012,
      ),
    );

    if (!omitSideGlass) {
      const fBotEdge =
        sideGlassMaxLocalZ !== undefined ? Math.min(fBotZ - 0.07, sideGlassMaxLocalZ) : fBotZ - 0.05;
      const fTopEdge =
        sideGlassMaxLocalZ !== undefined ? Math.min(fTopZ - 0.01, sideGlassMaxLocalZ) : fTopZ - 0.01;
      if (fBotEdge > rBotZ + 0.14 && fTopEdge > rTopZ + 0.1) {
        const sideWinShape = new THREE.Shape();
        sideWinShape.moveTo(rBotZ + 0.05, 0.01);
        sideWinShape.lineTo(fBotEdge, 0.01);
        sideWinShape.lineTo(fTopEdge, cabinHeight - 0.035);
        sideWinShape.lineTo(rTopZ + 0.01, cabinHeight - 0.035);
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

  // 4. Tapered Trapezoidal Front Windshield + Flush Black Perimeter Gasket + Wipers + Rear Window
  const wsGeo = createTrapezoidGlassGeo(baseW * 0.92, topW * 0.90, wsLen * 0.98, 0.018);
  const ws = new THREE.Mesh(wsGeo, mats.glass);
  ws.position.set(0, cabinHeight * 0.495, (fBotZ + fTopZ) * 0.5 - 0.008);
  ws.rotation.x = -wsAngle;
  ws.userData.noShadow = true;
  ws.renderOrder = 2;
  cabin.add(ws);

  const wsTopSeal = new THREE.Mesh(
    createRoundedBoxGeo(topW * 0.91, 0.032, 0.042, 0.01, 2, 6),
    mats.grille,
  );
  wsTopSeal.position.set(0, cabinHeight - 0.018, fTopZ + 0.008);
  const wsBotSeal = new THREE.Mesh(
    createRoundedBoxGeo(baseW * 0.92, 0.030, 0.048, 0.01, 2, 6),
    mats.grille,
  );
  wsBotSeal.position.set(0, 0.006, fBotZ - 0.012);
  cabin.add(wsTopSeal, wsBotSeal);

  [-0.2, 0.15].forEach((wx) => {
    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.014, 0.018), mats.grille);
    wiper.position.set(wx * width, 0.025, fBotZ - 0.008);
    wiper.rotation.z = 0.08;
    cabin.add(wiper);
  });

  const rwGeo = createTrapezoidGlassGeo(baseW * 0.91, topW * 0.89, rwLen * 0.96, 0.018);
  const rw = new THREE.Mesh(rwGeo, mats.glass);
  rw.position.set(0, cabinHeight * 0.495, (rBotZ + rTopZ) * 0.5 + 0.008);
  rw.rotation.x = rwAngle;
  rw.userData.noShadow = true;
  rw.renderOrder = 2;
  cabin.add(rw);

  const rwTopSeal = new THREE.Mesh(
    createRoundedBoxGeo(topW * 0.90, 0.032, 0.042, 0.01, 2, 6),
    mats.grille,
  );
  rwTopSeal.position.set(0, cabinHeight - 0.018, rTopZ - 0.008);
  const rwBotSeal = new THREE.Mesh(
    createRoundedBoxGeo(baseW * 0.91, 0.028, 0.045, 0.01, 2, 6),
    mats.grille,
  );
  rwBotSeal.position.set(0, 0.006, rBotZ + 0.012);
  cabin.add(rwTopSeal, rwBotSeal);

  return cabin;
}

export interface HeavyCabinInteriorOptions {
  cabWidth: number;
  cabDepth: number;
  cabHeight: number;
  dashTopY?: number;
  seatsCount?: number;
  isBus?: boolean;
  isSemi?: boolean;
  isVan?: boolean;
  hasRearWindow?: boolean;
  hasWalkthrough?: boolean;
  wsSlopeInset?: number;
  mats: VehicleMaterialSet;
  cityMode?: boolean;
  animated?: BuiltVehicle['animatedParts'];
}

export function buildHeavyCabinInterior(opts: HeavyCabinInteriorOptions): THREE.Group {
  const {
    cabWidth,
    cabDepth,
    cabHeight,
    seatsCount = 2,
    isBus = false,
    isSemi = false,
    isVan = false,
    hasRearWindow = false,
    hasWalkthrough = false,
    wsSlopeInset = 0.12,
    mats,
    cityMode = false,
    animated,
  } = opts;

  const grp = new THREE.Group();
  const w = Math.max(1.2, cabWidth);
  const d = Math.max(0.95, cabDepth);
  const h = Math.max(1.05, cabHeight);
  const dashTopY = THREE.MathUtils.clamp(opts.dashTopY ?? h * 0.50, 0.56, h * 0.72);
  const driverX = -w * 0.255;
  const passX = w * 0.255;
  const dashZ = d * 0.34 - Math.min(0.06, wsSlopeInset * 0.15);

  // 1. Ribbed Rubber Cab Floor Mat + Pedestal Step Lip
  const floorMat = new THREE.Mesh(
    createRoundedBoxGeo(w * 0.96, 0.03, d * 0.94, 0.012, 2, 8),
    mats.grille,
  );
  floorMat.position.set(0, 0.015, 0);
  grp.add(floorMat);

  if (cityMode) {
    // Lightweight dash + rotating commercial steering wheel for City view
    const dash = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.92, 0.24, 0.34, 0.03, 2, 8),
      mats.trim,
    );
    dash.position.set(0, dashTopY - 0.12, dashZ);
    grp.add(dash);

    const drvSeat = new THREE.Mesh(
      createRoundedBoxGeo(0.46, 0.72, 0.46, 0.05, 2, 8),
      mats.interior,
    );
    drvSeat.position.set(driverX, 0.44, -d * 0.04);
    grp.add(drvSeat);

    const wheelMount = new THREE.Group();
    wheelMount.position.set(driverX, dashTopY + 0.16, dashZ - 0.22);
    wheelMount.rotation.x = isBus ? 0.65 : 0.48;
    const wheelGrp = new THREE.Group();
    const wheelR = isBus ? 0.21 : isVan ? 0.165 : 0.19;
    wheelGrp.add(new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.022, 6, 16), mats.trim));
    for (let s = 0; s < 4; s++) {
      const a = (s * Math.PI) / 2 + Math.PI / 4;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.024, wheelR * 0.92, 0.016), mats.alloy);
      sp.position.set(Math.sin(a) * wheelR * 0.46, Math.cos(a) * wheelR * 0.46, 0);
      sp.rotation.z = -a;
      wheelGrp.add(sp);
    }
    wheelMount.add(wheelGrp);
    grp.add(wheelMount);
    animated?.steeringWheels.push(wheelGrp);
    return grp;
  }

  // 2. Center Engine Tunnel / Console + Gear Shifter + Cupholders + Air-Brake Valves
  if (!isBus) {
    const tunnelH = isVan ? 0.24 : 0.30;
    const tunnelL = Math.min(d * 0.66, 0.92);
    const tunnel = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.22, tunnelH, tunnelL, 0.04, 3, 10),
      mats.trim,
    );
    tunnel.position.set(0, tunnelH * 0.5 + 0.02, d * 0.04);
    grp.add(tunnel);

    const tray = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.19, 0.04, tunnelL * 0.72, 0.015, 2, 6),
      mats.secondary,
    );
    tray.position.set(0, tunnelH + 0.03, d * 0.02);
    grp.add(tray);

    [-0.045, 0.045].forEach((cx) => {
      const cup = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 14), mats.chrome);
      cup.rotation.x = Math.PI / 2;
      cup.position.set(cx, tunnelH + 0.055, -0.02);
      grp.add(cup);
    });

    // Tall Heavy-Duty Gear Shifter + Range Splitter Knob
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.056, 0.08, 12), mats.grille);
    boot.position.set(-w * 0.04, tunnelH + 0.06, d * 0.14);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.28, 10), mats.chrome);
    stalk.position.set(-w * 0.04, tunnelH + 0.22, d * 0.12);
    stalk.rotation.x = -0.18;
    const knob = new THREE.Mesh(createRoundedBoxGeo(0.052, 0.068, 0.058, 0.02, 2, 8), mats.trim);
    knob.position.set(-w * 0.04, tunnelH + 0.36, d * 0.095);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.03), mats.accent);
    splitter.position.set(-w * 0.04, tunnelH + 0.365, d * 0.12);
    grp.add(boot, stalk, knob, splitter);
  } else {
    // Slim Driver Side Console Pod (leaves curb-side boarding corridor completely unobstructed for turnstile)
    const sidePod = new THREE.Mesh(
      createRoundedBoxGeo(0.16, 0.36, 0.52, 0.03, 2, 8),
      mats.trim,
    );
    sidePod.position.set(driverX - 0.32, 0.22, dashZ - 0.28);
    grp.add(sidePod);
  }

  // Driver Footwell Pedals (Clutch, Wide Brake, Accelerator)
  [-0.12, -0.02, 0.09].forEach((px, idx) => {
    const pedal = new THREE.Mesh(
      new THREE.BoxGeometry(idx === 1 ? 0.075 : 0.048, 0.11, 0.018),
      mats.alloy,
    );
    pedal.position.set(driverX + px, 0.14, dashZ + 0.04);
    pedal.rotation.x = -0.45;
    grp.add(pedal);
  });

  // 3. Wraparound Commercial Cockpit Dashboard (inspired by Reference Board top-center)
  const dashWidth = isBus ? w * 0.52 : w * 0.94;
  const dashCenterX = isBus ? driverX + 0.06 : 0;
  const dashBodyH = Math.max(0.28, dashTopY * 0.56);

  const lowerDash = new THREE.Mesh(
    createRoundedBoxGeo(dashWidth, dashBodyH, 0.36, 0.045, 3, 12),
    mats.trim,
  );
  lowerDash.position.set(dashCenterX, dashTopY - dashBodyH * 0.5, dashZ);
  grp.add(lowerDash);

  const upperDashPad = new THREE.Mesh(
    createRoundedBoxGeo(dashWidth * 0.98, 0.065, 0.38, 0.025, 3, 10),
    mats.secondary,
  );
  upperDashPad.position.set(dashCenterX, dashTopY + 0.01, dashZ + 0.01);
  grp.add(upperDashPad);

  // Hooded Driver Instrument Binnacle + Illuminated Speedo/Tach/Air Gauges
  const binnacleW = Math.min(0.56, w * 0.34);
  const binnacle = new THREE.Mesh(
    createRoundedBoxGeo(binnacleW, 0.16, 0.22, 0.04, 3, 10),
    mats.grille,
  );
  binnacle.position.set(driverX, dashTopY + 0.08, dashZ - 0.05);
  grp.add(binnacle);

  [-0.14, 0.14].forEach((gx) => {
    const mainDial = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.007, 8, 18), mats.sirenBlue);
    mainDial.position.set(driverX + gx, dashTopY + 0.085, dashZ - 0.162);
    grp.add(mainDial);
  });
  [-0.045, 0.045].forEach((gx) => {
    const auxDial = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12), mats.amberSignal);
    auxDial.position.set(driverX + gx, dashTopY + 0.11, dashZ - 0.162);
    grp.add(auxDial);
  });
  const tripDisplay = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.042, 0.015), mats.sirenBlue);
  tripDisplay.position.set(driverX, dashTopY + 0.055, dashZ - 0.16);
  grp.add(tripDisplay);

  // Angled Center Telemetry / Switchboard Wing facing driver
  const wingX = isBus ? driverX + 0.30 : 0.02;
  const wing = new THREE.Mesh(
    createRoundedBoxGeo(0.32, 0.24, 0.18, 0.03, 3, 10),
    mats.grille,
  );
  wing.position.set(wingX, dashTopY - 0.01, dashZ - 0.12);
  wing.rotation.y = 0.28;
  grp.add(wing);

  const gpsScreen = new THREE.Mesh(
    createRoundedBoxGeo(0.16, 0.10, 0.02, 0.008, 2, 6),
    mats.sirenBlue,
  );
  gpsScreen.position.set(wingX - 0.03, dashTopY + 0.03, dashZ - 0.205);
  gpsScreen.rotation.y = 0.28;
  gpsScreen.rotation.x = -0.15;
  grp.add(gpsScreen);

  // Yellow & Red Air-Brake Parking Valves + Chrome Toggle Switches
  if (!isVan) {
    [-0.06, 0.02].forEach((vx, idx) => {
      const valve = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.032, 0.035),
        idx === 0 ? mats.sirenAmber : mats.sirenRed,
      );
      valve.position.set(wingX + vx + 0.05, dashTopY - 0.05, dashZ - 0.205);
      valve.rotation.y = 0.28;
      grp.add(valve);
    });
  }

  // Passenger-side Glovebox & Grab Handle
  if (!isBus) {
    const glove = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.28, 0.15, 0.03, 0.015, 2, 6),
      mats.secondary,
    );
    glove.position.set(passX, dashTopY - 0.14, dashZ - 0.17);
    const grab = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.22, 0.025, 0.06, 0.01, 2, 6),
      mats.chrome,
    );
    grab.position.set(passX, dashTopY + 0.02, dashZ - 0.18);
    grp.add(glove, grab);
  }

  // 4. Heavy-Duty Angled Steering Column, Column Stalks & 4-Spoke Commercial Steering Wheel
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.044, 0.34, 12), mats.trim);
  col.position.set(driverX, dashTopY + 0.03, dashZ - 0.18);
  col.rotation.x = isBus ? 0.85 : 1.02;
  grp.add(col);

  const stalkL = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), mats.trim);
  stalkL.rotation.z = Math.PI / 2;
  stalkL.position.set(driverX - 0.08, dashTopY + 0.09, dashZ - 0.22);
  grp.add(stalkL);

  const steerMount = new THREE.Group();
  steerMount.position.set(driverX, dashTopY + 0.13, dashZ - 0.28);
  steerMount.rotation.x = isBus ? 0.62 : 0.48;

  const steerGrp = new THREE.Group();
  const wheelR = isBus ? 0.21 : isVan ? 0.165 : 0.19;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.023, 10, 26), mats.grille);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.042, 16), mats.trim);
  wheelHub.rotation.x = Math.PI / 2;
  const hornBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.046, 12), mats.chrome);
  hornBadge.rotation.x = Math.PI / 2;
  steerGrp.add(wheelRim, wheelHub, hornBadge);
  for (let s = 0; s < 4; s++) {
    const a = (s * Math.PI) / 2 + Math.PI / 4;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.028, wheelR * 0.90, 0.018), mats.alloy);
    spoke.position.set(Math.sin(a) * wheelR * 0.45, Math.cos(a) * wheelR * 0.45, 0);
    spoke.rotation.z = -a;
    steerGrp.add(spoke);
  }
  steerMount.add(steerGrp);
  grp.add(steerMount);
  animated?.steeringWheels.push(steerGrp);

  // 5. High-Back Air-Ride Captain Seats positioned cleanly above cowl/dash eye-line
  const seatBaseLift = isBus ? Math.max(0, dashTopY - 0.72) : Math.max(0, dashTopY - 0.66);
  const buildCaptainSeat = (sx: number, sz: number, hasArmrests = true) => {
    const seatGrp = new THREE.Group();
    const sW = Math.min(0.48, w * 0.30);
    const backH = Math.min(0.62, Math.max(0.44, h * 0.44));
    const pedH = 0.18 + seatBaseLift;

    // Air-ride suspension pedestal base + accordion boot anchored cleanly to floor y = 0
    const pedBase = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.68, pedH, 0.34, 0.025, 2, 8),
      mats.grille,
    );
    pedBase.position.set(0, pedH * 0.5, 0);
    seatGrp.add(pedBase);

    const pedCollar = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.76, 0.045, 0.38, 0.015, 2, 6),
      mats.trim,
    );
    pedCollar.position.set(0, pedH - 0.02, 0);
    seatGrp.add(pedCollar);

    const cushionY = pedH + 0.04;
    const cushion = new THREE.Mesh(
      createRoundedBoxGeo(sW, 0.12, 0.46, 0.04, 3, 10),
      mats.interior,
    );
    cushion.position.set(0, cushionY, 0.03);
    seatGrp.add(cushion);

    // Side thigh bolsters
    [-1, 1].forEach((bs) => {
      const thigh = new THREE.Mesh(
        createRoundedBoxGeo(0.075, 0.095, 0.42, 0.022, 2, 8),
        mats.secondary,
      );
      thigh.position.set(bs * (sW * 0.44), cushionY + 0.03, 0.03);
      thigh.rotation.z = -bs * 0.20;
      seatGrp.add(thigh);
    });

    const backrest = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.94, backH, 0.13, 0.045, 3, 10),
      mats.interior,
    );
    backrest.position.set(0, cushionY + 0.04 + backH * 0.46, -0.17);
    backrest.rotation.x = -0.14;
    seatGrp.add(backrest);

    // Horizontal pleated comfort ribs & rear molded shell
    for (let r = 0; r < 3; r++) {
      const pleat = new THREE.Mesh(
        createRoundedBoxGeo(sW * 0.64, 0.055, 0.03, 0.012, 2, 6),
        mats.secondary,
      );
      pleat.position.set(0, cushionY + 0.10 + backH * (0.20 + r * 0.20), -0.11 - r * 0.014);
      pleat.rotation.x = -0.14;
      seatGrp.add(pleat);
    }
    const backShell = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.86, backH * 0.88, 0.035, 0.015, 2, 8),
      mats.trim,
    );
    backShell.position.set(0, cushionY + 0.04 + backH * 0.46, -0.235);
    backShell.rotation.x = -0.14;
    seatGrp.add(backShell);

    const headrest = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.56, 0.18, 0.10, 0.04, 3, 10),
      mats.interior,
    );
    headrest.position.set(0, cushionY + 0.08 + backH * 0.96, -0.22);
    headrest.rotation.x = -0.08;
    seatGrp.add(headrest);

    const collar = new THREE.Mesh(
      createRoundedBoxGeo(sW * 0.92, 0.045, 0.04, 0.012, 2, 6),
      mats.accent,
    );
    collar.position.set(0, cushionY + 0.05 + backH * 0.78, -0.125);
    seatGrp.add(collar);

    if (hasArmrests) {
      [-1, 1].forEach((as) => {
        const arm = new THREE.Mesh(
          createRoundedBoxGeo(0.055, 0.055, 0.30, 0.018, 2, 6),
          mats.trim,
        );
        arm.position.set(as * (sW * 0.52), cushionY + 0.20, -0.02);
        seatGrp.add(arm);
      });
    }

    seatGrp.position.set(sx, 0.02, sz);
    grp.add(seatGrp);
  };

  const frontSeatZ = isSemi ? d * 0.02 : seatsCount >= 4 ? d * 0.08 : -d * 0.06;
  buildCaptainSeat(driverX, frontSeatZ, true);
  if (!isBus) {
    buildCaptainSeat(passX, frontSeatZ, true);
  }

  // 6. Crew Cab Bench (Firetrucks) OR Semi Sleeper Bunk + Storage Cabinet
  if (!isBus && seatsCount >= 4 && d >= 1.55) {
    const crewBench = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.86, 0.14, 0.44, 0.04, 2, 8),
      mats.interior,
    );
    crewBench.position.set(0, 0.22, -d * 0.26);
    const crewBase = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.82, 0.18, 0.38, 0.02, 2, 6),
      mats.trim,
    );
    crewBase.position.set(0, 0.09, -d * 0.26);
    const crewBack = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.86, Math.min(0.52, h * 0.42), 0.13, 0.04, 2, 8),
      mats.interior,
    );
    crewBack.position.set(0, 0.46, -d * 0.44);
    crewBack.rotation.x = -0.12;
    grp.add(crewBench, crewBase, crewBack);

    [-0.28, 0, 0.28].forEach((hx) => {
      const hr = new THREE.Mesh(createRoundedBoxGeo(0.20, 0.14, 0.09, 0.03, 2, 8), mats.interior);
      hr.position.set(hx * w, 0.76, -d * 0.47);
      grp.add(hr);
    });
  } else if (isSemi && d >= 1.55) {
    // Sleeper Bunk Mattress + Pillow + Side Wardrobe Locker
    const bunkBase = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.90, 0.24, d * 0.34, 0.03, 2, 8),
      mats.trim,
    );
    bunkBase.position.set(0, 0.14, -d * 0.30);
    const mattress = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.86, 0.12, d * 0.31, 0.04, 3, 10),
      mats.interior,
    );
    mattress.position.set(0, 0.31, -d * 0.30);
    const pillow = new THREE.Mesh(
      createRoundedBoxGeo(0.24, 0.08, 0.36, 0.03, 2, 8),
      mats.accent,
    );
    pillow.position.set(-w * 0.30, 0.39, -d * 0.30);
    grp.add(bunkBase, mattress, pillow);
  }

  // 7. Overhead Header Console Shelf + Tachograph/CB Radio + Sun Visors + Convex Mirror + Interior Dome Light
  const overheadY = h - 0.11;
  const overheadZ = Math.min(dashZ - 0.08, d * 0.45 - wsSlopeInset - 0.18);
  const shelfW = isBus ? w * 0.46 : w * 0.88;
  const shelf = new THREE.Mesh(
    createRoundedBoxGeo(shelfW, 0.08, 0.24, 0.025, 2, 8),
    mats.trim,
  );
  shelf.position.set(dashCenterX, overheadY, overheadZ);
  grp.add(shelf);

  const radioFace = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.055, 0.02), mats.sirenBlue);
  radioFace.position.set(dashCenterX, overheadY - 0.005, overheadZ - 0.115);
  grp.add(radioFace);

  // Upholstered Cab Headliner + LED Dome Light Point (eliminates bright paint reflection inside cab!)
  if (!isBus) {
    const headliner = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.025, Math.max(0.4, d * 0.72 - wsSlopeInset)),
      mats.trim,
    );
    headliner.position.set(0, h - 0.02, -wsSlopeInset * 0.5 - 0.06);
    grp.add(headliner);

    const domeHousing = new THREE.Mesh(
      createRoundedBoxGeo(0.24, 0.03, 0.14, 0.012, 2, 6),
      mats.chrome,
    );
    domeHousing.position.set(0, h - 0.035, overheadZ - 0.26);
    const domeLens = new THREE.Mesh(
      createRoundedBoxGeo(0.18, 0.022, 0.09, 0.01, 2, 6),
      mats.headlight,
    );
    domeLens.position.set(0, h - 0.044, overheadZ - 0.26);
    grp.add(domeHousing, domeLens);

    const cabDomePoint = new THREE.PointLight(0xfff5e4, 1.35, 3.4, 1.6);
    cabDomePoint.position.set(0, h - 0.18, overheadZ - 0.24);
    grp.add(cabDomePoint);
  }

  const rvMirror = new THREE.Mesh(
    createRoundedBoxGeo(0.22, 0.06, 0.035, 0.012, 2, 8),
    mats.grille,
  );
  rvMirror.position.set(dashCenterX, overheadY - 0.08, overheadZ - 0.06);
  grp.add(rvMirror);

  [-0.24, 0.24].forEach((vx) => {
    if (isBus && vx > 0) return;
    const visor = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.32, 0.085, 0.018, 0.008, 2, 6),
      mats.secondary,
    );
    visor.position.set((isBus ? driverX : vx * w), overheadY - 0.03, overheadZ + 0.08);
    visor.rotation.x = 0.25;
    grp.add(visor);
  });

  // 8. Upholstered Interior Bulkhead Liner / Walkthrough Divider / Rear Window Framing
  if (hasWalkthrough && !isBus) {
    // Behind driver partition bulkhead with center walk-through opening into cargo/kitchen/medical bay
    const partW = w * 0.32;
    const part = new THREE.Mesh(
      createRoundedBoxGeo(partW, h * 0.84, 0.05, 0.02, 2, 6),
      mats.secondary,
    );
    part.position.set(driverX - w * 0.08, h * 0.44, -d * 0.46);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, h * 0.90, 8),
      mats.chrome,
    );
    pole.position.set(driverX + partW * 0.5 - w * 0.08, h * 0.46, -d * 0.46);
    grp.add(part, pole);
  } else if (hasRearWindow) {
    const rearTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, h * 0.44, 0.025),
      mats.trim,
    );
    rearTrim.position.set(0, h * 0.24, -d * 0.48);
    const rwFrame = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.62, h * 0.36, 0.04, 0.015, 2, 6),
      mats.trim,
    );
    rwFrame.position.set(0, h * 0.64, -d * 0.47);
    const rwGlass = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.54, h * 0.28, 0.05, 0.01, 2, 6),
      mats.glass,
    );
    rwGlass.position.copy(rwFrame.position);
    rwGlass.userData.noShadow = true;
    rwGlass.renderOrder = 2;
    grp.add(rearTrim, rwFrame, rwGlass);
  } else if (!isBus) {
    // Sleeper cab upholstered rear liner & privacy curtains so painted body never bleeds inside
    const sleeperWallLiner = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.92, h * 0.88, 0.035, 0.015, 2, 6),
      mats.trim,
    );
    sleeperWallLiner.position.set(0, h * 0.46, -d * 0.485);
    const upperShelf = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.86, 0.05, d * 0.24, 0.015, 2, 6),
      mats.secondary,
    );
    upperShelf.position.set(0, h * 0.72, -d * 0.34);
    grp.add(sleeperWallLiner, upperShelf);
  }

  return grp;
}

