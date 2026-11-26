import * as THREE from 'three';
import { VehicleConcept, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createRoundedBoxGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagPart,
} from './types';
import { createCraftedWheel } from './wheelsAndInterior';

function buildBicycleHandlebarMesh(
  variant: 'normal' | 'bmx' | 'speed',
  barWidth: number,
  mats: VehicleMaterialSet,
): THREE.Group {
  const barGroup = new THREE.Group();
  const hw = barWidth * 0.5;
  const barMat = variant === 'bmx' ? mats.secondary : mats.trim;
  const gripMat = mats.rubber;

  if (variant === 'bmx') {
    // Tall BMX U-bar with welded horizontal crossbar & flanged grips
    const rise = 0.23;
    const pts = [
      new THREE.Vector3(-hw, rise, -0.02),
      new THREE.Vector3(-hw * 0.62, rise, 0.01),
      new THREE.Vector3(-hw * 0.42, 0.015, 0.015),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(hw * 0.42, 0.015, 0.015),
      new THREE.Vector3(hw * 0.62, rise, 0.01),
      new THREE.Vector3(hw, rise, -0.02),
    ];
    const barGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.011, 10, false);
    barGroup.add(new THREE.Mesh(barGeo, barMat));

    // Welded crossbar + foam pad
    const crossP1 = new THREE.Vector3(-hw * 0.58, rise * 0.76, 0.01);
    const crossP2 = new THREE.Vector3(hw * 0.58, rise * 0.76, 0.01);
    barGroup.add(makeStrutBetween(crossP1, crossP2, 0.0085, 0.0085, barMat, 8));
    const crossPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, hw * 0.76, 10).rotateZ(Math.PI / 2),
      mats.body,
    );
    crossPad.position.set(0, rise * 0.76, 0.01);
    barGroup.add(crossPad);

    [-1, 1].forEach((s) => {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.125, 10).rotateZ(Math.PI / 2),
        gripMat,
      );
      grip.position.set(s * (hw - 0.06), rise, -0.01);
      grip.rotation.y = -s * 0.08;
      barGroup.add(grip);

      const flange = new THREE.Mesh(
        new THREE.CylinderGeometry(0.023, 0.023, 0.008, 12).rotateZ(Math.PI / 2),
        mats.accent,
      );
      flange.position.set(s * (hw - 0.12), rise, -0.005);
      barGroup.add(flange);
    });

    const lever = new THREE.Mesh(createRoundedBoxGeo(0.075, 0.012, 0.018, 0.004, 2, 6), mats.alloy);
    lever.position.set(hw - 0.145, rise - 0.016, 0.026);
    lever.rotation.y = 0.22;
    barGroup.add(lever);
  } else if (variant === 'speed') {
    // Racing Drop-Bar with STI Brake Hoods & Curved Levers clearly forward/above 700c wheel
    const flatPts = [
      new THREE.Vector3(-hw * 0.94, 0, 0),
      new THREE.Vector3(-hw * 0.45, 0.002, 0.006),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(hw * 0.45, 0.002, 0.006),
      new THREE.Vector3(hw * 0.94, 0, 0),
    ];
    const topGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flatPts), 20, 0.0115, 10, false);
    barGroup.add(new THREE.Mesh(topGeo, mats.secondary));

    [-1, 1].forEach((s) => {
      const dropCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * hw * 0.94, 0, 0),
        new THREE.Vector3(s * hw, -0.006, 0.075),
        new THREE.Vector3(s * hw, -0.068, 0.115),
        new THREE.Vector3(s * hw, -0.125, 0.072),
        new THREE.Vector3(s * hw, -0.128, -0.032),
      ]);
      const dropGeo = new THREE.TubeGeometry(dropCurve, 22, 0.0115, 10, false);
      barGroup.add(new THREE.Mesh(dropGeo, mats.secondary));

      const hood = new THREE.Mesh(createRoundedBoxGeo(0.028, 0.044, 0.062, 0.01, 2, 8), mats.rubber);
      hood.position.set(s * hw, 0.024, 0.088);
      hood.rotation.x = 0.24;
      barGroup.add(hood);

      const stiLever = new THREE.Mesh(createRoundedBoxGeo(0.014, 0.084, 0.015, 0.005, 2, 6), mats.alloy);
      stiLever.position.set(s * hw, -0.028, 0.124);
      stiLever.rotation.x = -0.18;
      barGroup.add(stiLever);
    });
  } else {
    // Wide MTB / Trail Riser Handlebar with grips & hydraulic brake levers
    const pts = [
      new THREE.Vector3(-hw, 0.042, -0.045),
      new THREE.Vector3(-hw * 0.48, 0.035, -0.012),
      new THREE.Vector3(-hw * 0.16, 0.01, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(hw * 0.16, 0.01, 0),
      new THREE.Vector3(hw * 0.48, 0.035, -0.012),
      new THREE.Vector3(hw, 0.042, -0.045),
    ];
    const barGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0115, 10, false);
    barGroup.add(new THREE.Mesh(barGeo, barMat));

    [-1, 1].forEach((s) => {
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0155, 0.0155, 0.13, 10).rotateZ(Math.PI / 2),
        gripMat,
      );
      grip.position.set(s * (hw - 0.065), 0.04, -0.038);
      grip.rotation.y = s * 0.12;
      barGroup.add(grip);

      const lockRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.012, 10).rotateZ(Math.PI / 2),
        mats.accent,
      );
      lockRing.position.set(s * (hw - 0.128), 0.039, -0.031);
      barGroup.add(lockRing);

      const lever = new THREE.Mesh(createRoundedBoxGeo(0.075, 0.011, 0.016, 0.004, 2, 6), mats.alloy);
      lever.position.set(s * (hw - 0.17), 0.025, -0.006);
      lever.rotation.y = s * 0.2;
      barGroup.add(lever);
    });
  }

  return barGroup;
}

export function buildBicycleVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { width, wheelbase } = v.dimensions;
  const r = Math.max(0.22, v.geometry.wheelRadius || 0.34);
  const wWheel = Math.max(0.026, v.geometry.wheelWidth || 0.045);

  const atts = v.geometry.attachments;
  const isBmx = atts.includes('bike_bmx');
  const isSpeed = atts.includes('bike_speed');
  const hasSuspension = atts.includes('bike_suspension');
  const hasFenders = atts.includes('bike_fenders');
  const hasPegs = atts.includes('bike_pegs');
  const isAero = wheelStyle === 'bike_aero' || v.id === 105;

  const variant: 'normal' | 'bmx' | 'speed' = isBmx
    ? 'bmx'
    : isSpeed
      ? 'speed'
      : 'normal';

  const fZ = wheelbase * 0.5;
  const rZ = -wheelbase * 0.5;
  const seg = cityMode ? 6 : 12;

  // CRITICAL: Every bike fork crown & head tube MUST sit CLEAR ABOVE the tire top (y = 2 * r)!
  const bbY = isBmx ? 0.275 : isSpeed || isAero ? 0.285 : hasSuspension ? 0.31 : 0.285;
  const bbZ = isBmx ? -0.04 : -0.095;

  // Seat-tube cluster height (tall horizontal diamond on Road/Aero, sloped on MTB/Trail, compact ONLY on BMX)
  const seatTopY = isBmx
    ? 0.565
    : isSpeed || isAero
      ? 0.895
      : 0.78;
  const seatTopZ = bbZ - (seatTopY - bbY) * 0.29;

  // Head-tube axis aligned cleanly so fork rake places front axle at (0, r, fZ)
  const headTheta = isBmx ? -0.24 : isSpeed || isAero ? -0.27 : -0.33;
  const forkOffset = isBmx ? 0.032 : 0.042;
  const cosT = Math.cos(headTheta);
  const sinT = Math.sin(headTheta);
  const axisZAtAxle = fZ - forkOffset / cosT;
  const axisPointAtY = (y: number) =>
    new THREE.Vector3(0, y, axisZAtAxle + (y - r) * Math.tan(headTheta));

  // Fork crown height ALWAYS > 2*r + clearance so handlebar & crown are cleanly ABOVE the tire!
  const crownClearance = hasSuspension ? 0.085 : isBmx ? 0.045 : 0.038;
  const headBotY = r * 2 + crownClearance;
  const headLenY = isBmx ? 0.125 : hasSuspension ? 0.155 : 0.165;
  const headTopY = headBotY + headLenY;
  const headBot = axisPointAtY(headBotY);
  const headTop = axisPointAtY(headTopY);

  // =========================================================================
  // 1. MAIN BICYCLE FRAME + SEAT + REAR WHEEL
  // =========================================================================
  const frameGroup = new THREE.Group();
  const tubeMainR = isAero ? 0.025 : isBmx ? 0.017 : isSpeed ? 0.0175 : 0.021;
  const tubeTopR = isAero ? 0.021 : isBmx ? 0.0155 : 0.0165;
  const stayR = isAero ? 0.0135 : 0.0105;

  // Head tube
  frameGroup.add(makeStrutBetween(headBot, headTop, tubeMainR * 1.18, tubeMainR * 1.18, mats.body, seg));

  // Bottom bracket shell
  const bbShell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.072, seg).rotateZ(Math.PI / 2),
    mats.body,
  );
  bbShell.position.set(0, bbY, bbZ);
  frameGroup.add(bbShell);

  const bbPos = new THREE.Vector3(0, bbY, bbZ);
  const seatClusterPos = new THREE.Vector3(0, seatTopY, seatTopZ);
  const headTopJoin = headBot.clone().lerp(headTop, 0.82);
  const headBotJoin = headBot.clone().lerp(headTop, 0.18);

  // Seat tube
  frameGroup.add(makeStrutBetween(bbPos, seatClusterPos, tubeMainR * 0.95, tubeMainR * 0.95, mats.body, seg));

  // Road Speed / Aero: crisp horizontal top tube! MTB Trail: sloped athletic tube! BMX: compact sloped tube!
  const topTubeRear = isBmx
    ? bbPos.clone().lerp(seatClusterPos, 0.90)
    : isSpeed || isAero
      ? seatClusterPos.clone().lerp(bbPos, 0.02)
      : seatClusterPos.clone().lerp(bbPos, 0.14);
  frameGroup.add(makeStrutBetween(headTopJoin, topTubeRear, tubeTopR, tubeTopR, mats.body, seg));
  frameGroup.add(makeStrutBetween(headBotJoin, bbPos, tubeMainR * 1.1, tubeMainR * 1.15, mats.body, seg));

  if (isAero) {
    // Sculpted aero seat-tube rear wheel cutout + gusset
    const aeroFairing = new THREE.Mesh(
      createRoundedBoxGeo(0.032, 0.30, 0.072, 0.012, 2, 8),
      mats.body,
    );
    aeroFairing.position.set(0, bbY + 0.24, bbZ - 0.048);
    aeroFairing.rotation.x = 0.28;
    frameGroup.add(aeroFairing);
  }

  if (hasSuspension) {
    // Trail MTB rear shock absorber & rocker link (matching blue mind-map MTB!)
    const rocker = bbPos.clone().lerp(seatClusterPos, 0.56);
    const shockAnchor = bbPos.clone().lerp(headBotJoin, 0.34);
    frameGroup.add(makeStrutBetween(shockAnchor, rocker, 0.017, 0.017, mats.secondary, 8));
    frameGroup.add(makeStrutBetween(shockAnchor.clone().lerp(rocker, 0.28), shockAnchor.clone().lerp(rocker, 0.72), 0.022, 0.022, mats.accent, 8));
  }

  // Rear triangle: twin chainstays & seatstays + dropouts
  const dropoutX = 0.056;
  const seatStayTopY = isBmx ? bbY + 0.24 : isSpeed || isAero ? seatTopY - 0.03 : seatTopY - 0.08;
  const seatStayAnchor = bbPos.clone().lerp(seatClusterPos, (seatStayTopY - bbY) / Math.max(0.08, seatTopY - bbY));

  [-1, 1].forEach((s) => {
    const dropout = new THREE.Vector3(s * dropoutX, r, rZ);
    const bbSide = new THREE.Vector3(s * 0.032, bbY, bbZ);
    const stayTopSide = new THREE.Vector3(s * 0.022, seatStayAnchor.y, seatStayAnchor.z);
    frameGroup.add(makeStrutBetween(bbSide, dropout, stayR, stayR * 0.85, mats.body, seg));
    frameGroup.add(makeStrutBetween(stayTopSide, dropout, stayR * 0.9, stayR * 0.8, mats.body, seg));

    const dropoutPlate = new THREE.Mesh(createRoundedBoxGeo(0.008, 0.034, 0.04, 0.004, 2, 6), mats.alloy);
    dropoutPlate.position.copy(dropout);
    frameGroup.add(dropoutPlate);
  });

  // Rear derailleur cage detail on geared bikes (Speed / Trail MTB / Cruiser)
  if (!isBmx && !isAero) {
    const derArm = new THREE.Mesh(createRoundedBoxGeo(0.014, 0.078, 0.024, 0.004, 2, 6), mats.secondary);
    derArm.position.set(0.046, r - 0.042, rZ + 0.008);
    derArm.rotation.x = 0.28;
    frameGroup.add(derArm);
  }

  // Seatpost clamp, seatpost & sculpted saddle
  const clamp = new THREE.Mesh(new THREE.CylinderGeometry(tubeMainR * 1.15, tubeMainR * 1.15, 0.022, 12), mats.alloy);
  clamp.position.copy(seatClusterPos);
  clamp.rotation.x = Math.atan2(seatClusterPos.z - bbZ, seatClusterPos.y - bbY);
  frameGroup.add(clamp);

  const postLen = isBmx ? 0.065 : isSpeed || isAero ? 0.135 : 0.18;
  const postDir = new THREE.Vector3().subVectors(seatClusterPos, bbPos).normalize();
  const saddlePos = seatClusterPos.clone().addScaledVector(postDir, postLen);
  frameGroup.add(
    makeStrutBetween(
      seatClusterPos,
      saddlePos,
      isAero ? 0.017 : 0.013,
      isAero ? 0.017 : 0.013,
      mats.trim,
      10,
    ),
  );

  // Saddle mesh tailored to bike style
  const saddleGroup = new THREE.Group();
  saddleGroup.position.copy(saddlePos);
  const saddleMat = isAero ? mats.body : mats.secondary;
  const saddleW = isBmx ? 0.135 : 0.125;
  const saddleL = isBmx ? 0.21 : 0.27;
  const saddleBase = new THREE.Mesh(
    createRoundedBoxGeo(saddleW, 0.04, saddleL * 0.56, 0.016, 2, 8),
    saddleMat,
  );
  saddleBase.position.set(0, 0.024, -0.04);
  saddleGroup.add(saddleBase);
  const saddleNose = new THREE.Mesh(
    createRoundedBoxGeo(saddleW * 0.42, 0.03, saddleL * 0.56, 0.013, 2, 8),
    saddleMat,
  );
  saddleNose.position.set(0, 0.024, 0.045);
  saddleGroup.add(saddleNose);
  frameGroup.add(saddleGroup);

  // Rear wheel
  const rearWheel = createCraftedWheel(r, wWheel, wheelStyle, mats, true, false, cityMode);
  rearWheel.position.set(0, r, rZ);
  animated.wheels.push(rearWheel);
  frameGroup.add(rearWheel);

  // Rear cassette (multi-cog cluster) on +X side
  const cogCount = isBmx || isAero ? 1 : 6;
  for (let c = 0; c < cogCount; c++) {
    const cogR = 0.044 - c * 0.0045;
    const cog = new THREE.Mesh(
      new THREE.CylinderGeometry(cogR, cogR, 0.004, 14).rotateZ(Math.PI / 2),
      mats.chrome,
    );
    cog.position.set(0.026 + c * 0.0042, r, rZ);
    frameGroup.add(cog);
  }

  // Rear axle pegs for BMX ONLY
  if (hasPegs) {
    [-1, 1].forEach((s) => {
      const peg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.095, 10).rotateZ(Math.PI / 2),
        mats.trim,
      );
      peg.position.set(s * 0.105, r, rZ);
      frameGroup.add(peg);
    });
  }

  // Rear mudguard (no taillight — bicycles have no lights)
  if (hasFenders) {
    const rearFenderGeo = new THREE.TorusGeometry(r + 0.026, wWheel * 0.52, 6, 22, Math.PI * 0.85);
    rearFenderGeo.rotateY(Math.PI / 2);
    const rearFender = new THREE.Mesh(rearFenderGeo, mats.body);
    rearFender.rotation.x = Math.PI * 0.05;
    rearFender.scale.set(1.15, 1, 1);
    rearFender.position.set(0, r, rZ);
    frameGroup.add(rearFender);
  }

  // Openable kickstand (on non-race bikes)
  if (!isSpeed && !isAero) {
    const standPivot = new THREE.Group();
    standPivot.position.set(-0.056, bbY - 0.01, bbZ - 0.06);
    const standLeg = makeStrutBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.04, -(bbY - 0.01), -0.04),
      0.007,
      0.006,
      mats.trim,
      8,
    );
    standPivot.add(standLeg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.01, 0.03), mats.rubber);
    foot.position.set(-0.04, -(bbY - 0.015), -0.04);
    standPivot.add(foot);
    tagPart(standPivot, 'Descanso Lateral (Articulado)', -0.15, -0.05, 0);
    registerOpenable(animated, standPivot, 'Descanso Lateral', { z: 0.42 });
    frameGroup.add(standPivot);
  }

  tagPart(frameGroup, 'Quadro, Selim & Roda Traseira', 0, 0.06, -0.14);
  group.add(frameGroup);

  // =========================================================================
  // 2. DRIVETRAIN: CHAIN + ANIMATED CRANKSET & HORIZONTAL COUNTER-ROTATING PEDALS
  // =========================================================================
  const crankR = isBmx ? 0.058 : isSpeed || isAero ? 0.10 : 0.08;
  const crankArmLen = isBmx ? 0.165 : 0.174;
  const chainX = 0.036;

  const rearCogR = 0.032;
  const chainTopStart = new THREE.Vector3(chainX, bbY + crankR * 0.92, bbZ);
  const chainTopEnd = new THREE.Vector3(0.034, r + rearCogR * 0.92, rZ);
  const chainBotStart = new THREE.Vector3(chainX, bbY - crankR * 0.92, bbZ);
  const chainBotEnd = new THREE.Vector3(0.034, r - rearCogR * 0.92, rZ);

  const chainGroup = new THREE.Group();
  chainGroup.add(makeStrutBetween(chainTopStart, chainTopEnd, 0.0045, 0.0045, mats.trim, 6));
  chainGroup.add(makeStrutBetween(chainBotStart, chainBotEnd, 0.0045, 0.0045, mats.trim, 6));
  tagPart(chainGroup, 'Corrente & Transmissão', 0.18, 0, -0.06);
  group.add(chainGroup);

  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, bbY, bbZ);

  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.125, 10).rotateZ(Math.PI / 2),
    mats.chrome,
  );
  crankPivot.add(spindle);

  const ringDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(crankR, crankR, 0.006, 20).rotateZ(Math.PI / 2),
    isAero ? mats.secondary : mats.alloy,
  );
  ringDisc.position.x = chainX;
  crankPivot.add(ringDisc);

  if (!isAero) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spiderArm = new THREE.Mesh(new THREE.BoxGeometry(0.008, crankR * 0.85, 0.012), mats.trim);
      spiderArm.position.set(chainX + 0.002, Math.cos(a) * crankR * 0.45, Math.sin(a) * crankR * 0.45);
      spiderArm.rotation.x = -a;
      crankPivot.add(spiderArm);
    }
  }

  [-1, 1].forEach((side) => {
    const armX = side * 0.066;
    const tipY = side * crankArmLen;
    crankPivot.add(
      makeStrutBetween(
        new THREE.Vector3(armX, 0, 0),
        new THREE.Vector3(armX, tipY, 0),
        0.012,
        0.015,
        isBmx ? mats.chrome : mats.secondary,
        8,
      ),
    );

    const pedalPivot = new THREE.Group();
    pedalPivot.position.set(side * 0.105, tipY, 0);

    const pAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.078, 8).rotateZ(Math.PI / 2),
      mats.chrome,
    );
    pAxle.position.x = -side * 0.015;
    pedalPivot.add(pAxle);

    const pedalBody = new THREE.Mesh(
      createRoundedBoxGeo(0.088, 0.018, 0.074, 0.005, 2, 6),
      isSpeed ? mats.secondary : mats.rubber,
    );
    pedalPivot.add(pedalBody);

    [-1, 1].forEach((zRef) => {
      const refl = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.009, 0.005), mats.amberSignal);
      refl.position.set(0, 0, zRef * 0.038);
      pedalPivot.add(refl);
    });

    animated.pedals.push(pedalPivot);
    crankPivot.add(pedalPivot);
  });

  animated.cranks.push(crankPivot);
  tagPart(crankPivot, 'Pedivela, Coroa & Pedais Animados', 0.22, -0.06, 0);
  group.add(crankPivot);

  // =========================================================================
  // 3. STEERABLE FRONT ASSEMBLY (STEER RIG -> STEERING PIVOT)
  // =========================================================================
  const steerRig = new THREE.Group();
  steerRig.position.copy(headTop);
  steerRig.rotation.x = headTheta;
  tagPart(steerRig, 'Conjunto Dianteiro Esterçante (Garfo, Guidão & Roda)', 0, 0.14, 0.24);
  group.add(steerRig);

  const steeringPivot = new THREE.Group();
  animated.steeringPivots.push(steeringPivot);
  steerRig.add(steeringPivot);

  const toSteerLocal = (worldPt: THREE.Vector3) => {
    const dy = worldPt.y - headTop.y;
    const dz = worldPt.z - headTop.z;
    return new THREE.Vector3(
      worldPt.x - headTop.x,
      dy * cosT + dz * sinT,
      -dy * sinT + dz * cosT,
    );
  };

  const headBotLocal = toSteerLocal(headBot);
  const frontAxleLocal = toSteerLocal(new THREE.Vector3(0, r, fZ));
  const forkHalfW = 0.056;

  // Lower fork crown cleanly above tire top
  const lowerCrown = new THREE.Mesh(
    createRoundedBoxGeo(forkHalfW * 2.4, 0.026, 0.048, 0.008, 2, 8),
    hasSuspension ? mats.alloy : mats.body,
  );
  lowerCrown.position.set(0, headBotLocal.y - 0.012, 0.006);
  steeringPivot.add(lowerCrown);

  if (hasSuspension) {
    // Dual-crown trail MTB fork matching the blue mind-map MTB!
    const upperCrown = new THREE.Mesh(
      createRoundedBoxGeo(forkHalfW * 2.4, 0.024, 0.046, 0.008, 2, 8),
      mats.alloy,
    );
    upperCrown.position.set(0, 0.006, 0.004);
    steeringPivot.add(upperCrown);

    [-1, 1].forEach((s) => {
      const topStanchion = new THREE.Vector3(s * forkHalfW, 0.012, 0.004);
      const midStanchion = new THREE.Vector3(s * forkHalfW, headBotLocal.y - 0.02, 0.012);
      const botLeg = new THREE.Vector3(s * forkHalfW, frontAxleLocal.y, frontAxleLocal.z);
      steeringPivot.add(makeStrutBetween(topStanchion, midStanchion, 0.016, 0.016, mats.chrome, 10));
      steeringPivot.add(makeStrutBetween(midStanchion, botLeg, 0.021, 0.019, mats.body, 10));
    });

    const archY = THREE.MathUtils.lerp(headBotLocal.y - 0.02, frontAxleLocal.y, 0.28);
    const archZ = THREE.MathUtils.lerp(0.012, frontAxleLocal.z, 0.28);
    steeringPivot.add(
      makeStrutBetween(
        new THREE.Vector3(-forkHalfW, archY, archZ),
        new THREE.Vector3(forkHalfW, archY, archZ),
        0.013,
        0.013,
        mats.body,
        8,
      ),
    );
  } else {
    // Rigid fork blades (Road / Aero / Cruiser / BMX)
    [-1, 1].forEach((s) => {
      const topLeg = new THREE.Vector3(s * forkHalfW, headBotLocal.y - 0.014, 0.006);
      const botLeg = new THREE.Vector3(s * forkHalfW, frontAxleLocal.y, frontAxleLocal.z);
      steeringPivot.add(
        makeStrutBetween(
          topLeg,
          botLeg,
          isAero ? 0.020 : 0.015,
          isBmx ? 0.014 : 0.010,
          mats.body,
          seg,
        ),
      );
    });
  }

  // Stem steerer + stem extension + Handlebar CLEAR ABOVE front tire (no headlights on bicycles)
  const stemH = isBmx ? 0.048 : isAero ? 0.032 : isSpeed ? 0.045 : 0.055;
  const stemReach = isBmx ? 0.048 : isSpeed || isAero ? 0.105 : 0.052;
  const stemMat = mats.trim;

  steeringPivot.add(
    makeStrutBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, stemH, 0), 0.014, 0.014, stemMat, 10),
  );
  steeringPivot.add(
    makeStrutBetween(
      new THREE.Vector3(0, stemH, 0),
      new THREE.Vector3(0, stemH + 0.006, stemReach),
      0.016,
      0.016,
      stemMat,
      10,
    ),
  );

  const barWidth = Math.max(0.40, width * 0.94);
  const handlebar = buildBicycleHandlebarMesh(variant, barWidth, mats);
  handlebar.position.set(0, stemH + 0.006, stemReach);
  handlebar.rotation.x = -headTheta;
  tagPart(handlebar, 'Guidão, Manoplas & Manetes', 0, 0.16, 0);
  steeringPivot.add(handlebar);

  // Front Wheel (aligned horizontally inside frontWheelAlign so wheel.rotation.x spins true while steeringPivot steers around headtube)
  const frontWheelAlign = new THREE.Group();
  frontWheelAlign.position.copy(frontAxleLocal);
  frontWheelAlign.rotation.x = -headTheta;
  const frontWheel = createCraftedWheel(r, wWheel, wheelStyle, mats, false, false, cityMode);
  animated.wheels.push(frontWheel);
  frontWheelAlign.add(frontWheel);
  steeringPivot.add(frontWheelAlign);

  // Front mudguard (properly rotated into YZ plane over the top of front wheel!)
  if (hasFenders) {
    const frontFenderGeo = new THREE.TorusGeometry(r + 0.026, wWheel * 0.52, 6, 20, Math.PI * 0.65);
    frontFenderGeo.rotateY(Math.PI / 2);
    const frontFender = new THREE.Mesh(frontFenderGeo, mats.body);
    frontFender.rotation.x = Math.PI * 0.175;
    frontFender.scale.set(1.15, 1, 1);
    frontWheelAlign.add(frontFender);
  }

  // Front axle pegs for BMX ONLY
  if (hasPegs) {
    [-1, 1].forEach((s) => {
      const peg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.095, 10).rotateZ(Math.PI / 2),
        mats.trim,
      );
      peg.position.set(s * 0.105, frontAxleLocal.y, frontAxleLocal.z);
      steeringPivot.add(peg);
    });
  }

  enableShadows(group, true, true);
  return group;
}
