import * as THREE from 'three';
import { VehicleConcept, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createExtrudedProfile,
  createRoundedBoxGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagPart,
} from './types';
import { createCraftedWheel, createTrapezoidGlassGeo } from './wheelsAndInterior';

// =========================================================================
// SHARED AIRCRAFT HELPERS
// =========================================================================

function buildSculptedWing(
  span: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness: number,
  dihedralY: number,
  mats: VehicleMaterialSet,
  opts: {
    hasWinglet?: boolean;
    hasAileronAccent?: boolean;
    hasFlapFairings?: boolean;
    hasNavLights?: boolean;
    isDelta?: boolean;
    cityMode?: boolean;
  } = {},
): THREE.Group {
  const wingGrp = new THREE.Group();
  const halfSpan = span * 0.5;

  [-1, 1].forEach((side) => {
    const s = new THREE.Shape();
    s.moveTo(0, rootChord * 0.52);
    if (opts.isDelta) {
      // Ogival / compound-delta curve for supersonic Concorde & fighters
      s.quadraticCurveTo(halfSpan * 0.35, rootChord * 0.18 - sweepZ * 0.35, halfSpan, tipChord * 0.42 - sweepZ);
      s.lineTo(halfSpan, -tipChord * 0.58 - sweepZ);
      s.lineTo(0, -rootChord * 0.48);
    } else {
      s.lineTo(halfSpan, tipChord * 0.45 - sweepZ);
      s.lineTo(halfSpan, -tipChord * 0.55 - sweepZ);
      s.lineTo(0, -rootChord * 0.48);
    }
    s.closePath();

    const wGeo = new THREE.ExtrudeGeometry(s, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: thickness * 0.32,
      bevelSize: thickness * 0.28,
      bevelSegments: opts.cityMode ? 2 : 4,
      curveSegments: opts.cityMode ? 8 : 14,
    });
    wGeo.rotateX(Math.PI / 2);
    if (side < 0) wGeo.scale(-1, 1, 1);
    wGeo.computeVertexNormals();

    const wingPivot = new THREE.Group();
    const wMesh = new THREE.Mesh(wGeo, mats.body);
    wMesh.position.y = thickness * 0.5;
    wingPivot.add(wMesh);

    // Trailing-edge flap / aileron trim strip
    if (opts.hasAileronAccent) {
      const stripLen = halfSpan * 0.72;
      const stripAngle = Math.atan2(
        (-tipChord * 0.55 - sweepZ) - (-rootChord * 0.48),
        halfSpan,
      );
      const strip = new THREE.Mesh(
        createRoundedBoxGeo(stripLen, thickness * 0.7, tipChord * 0.24, 0.015, 2, 6),
        mats.secondary,
      );
      strip.position.set(
        side * (halfSpan * 0.52),
        0,
        THREE.MathUtils.lerp(-rootChord * 0.46, -tipChord * 0.50 - sweepZ, 0.52),
      );
      strip.rotation.y = side * stripAngle;
      wingPivot.add(strip);
    }

    // Flap track fairings under executive/cargo wings
    if (opts.hasFlapFairings && !opts.cityMode) {
      [0.34, 0.62].forEach((ft) => {
        const fz = THREE.MathUtils.lerp(-rootChord * 0.42, -tipChord * 0.48 - sweepZ, ft);
        const fairing = new THREE.Mesh(
          createRoundedBoxGeo(0.11, 0.12, 0.64, 0.03, 2, 6),
          mats.secondary,
        );
        fairing.position.set(side * (halfSpan * ft), -thickness * 0.65, fz);
        wingPivot.add(fairing);
      });
    }

    // Upturned blended winglets
    if (opts.hasWinglet) {
      const wlet = new THREE.Mesh(
        createRoundedBoxGeo(0.06, Math.max(0.45, tipChord * 0.85), tipChord * 0.72, 0.02, 2, 6),
        mats.accent,
      );
      wlet.position.set(side * (halfSpan + 0.02), Math.max(0.22, tipChord * 0.36), -sweepZ - tipChord * 0.08);
      wlet.rotation.z = -side * 0.22;
      wlet.rotation.x = 0.28;
      wingPivot.add(wlet);
    }

    // Wingtip navigation pods
    if (opts.hasNavLights !== false) {
      const tipCap = new THREE.Mesh(
        createRoundedBoxGeo(0.10, thickness * 1.15, tipChord * 0.82, 0.03, 2, 6),
        mats.trim,
      );
      tipCap.position.set(side * halfSpan, 0, -sweepZ - tipChord * 0.05);
      const nav = new THREE.Mesh(
        createRoundedBoxGeo(0.08, thickness * 0.75, 0.18, 0.02, 2, 6),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      nav.position.set(side * (halfSpan + 0.03), 0, -sweepZ + tipChord * 0.22);
      wingPivot.add(tipCap, nav);
    }

    wingPivot.rotation.z = side * Math.atan2(dihedralY, halfSpan);
    wingGrp.add(wingPivot);
  });

  return wingGrp;
}

function buildSculptedFin(
  height: number,
  rootChord: number,
  tipChord: number,
  sweepZ: number,
  thickness: number,
  mat: THREE.Material,
  rudderMat: THREE.Material,
  cityMode = false,
): THREE.Group {
  const grp = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-rootChord * 0.5, 0);
  s.lineTo(rootChord * 0.5, 0);
  s.lineTo(tipChord * 0.45 - sweepZ, height);
  s.lineTo(-tipChord * 0.55 - sweepZ, height);
  s.closePath();

  const geo = createExtrudedProfile(s, thickness, 0.022, 0.022, cityMode ? 1 : 3, 8);
  const mesh = new THREE.Mesh(geo, mat);
  grp.add(mesh);

  // Rudder accent cap or beacon at fin tip
  const tipCap = new THREE.Mesh(
    createRoundedBoxGeo(thickness * 1.1, 0.07, tipChord * 0.86, 0.02, 2, 6),
    rudderMat,
  );
  tipCap.position.set(0, height + 0.02, -sweepZ - tipChord * 0.05);
  grp.add(tipCap);

  return grp;
}

function buildBladeRotorAssembly(
  bladeCount: number,
  radius: number,
  bladeChord: number,
  mats: VehicleMaterialSet,
  tipMat: THREE.Material,
  hasLongbowDome = false,
  cityMode = false,
): THREE.Group {
  const rotor = new THREE.Group();

  // Mast shaft extending down into turbine deck
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.46, 16), mats.trim);
  mast.position.y = -0.05;
  rotor.add(mast);

  // Swashplate collar + scissors
  const swash = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.055, 16), mats.alloy);
  swash.position.y = 0.02;
  rotor.add(swash);

  // Central hub + aerodynamic dome cap
  const hubCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.25, 0.14, 18),
    mats.secondary,
  );
  hubCap.position.y = 0.18;
  rotor.add(hubCap);

  for (let b = 0; b < bladeCount; b++) {
    const angle = (b / bladeCount) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.y = angle;

    // Blade grip yoke + pitch link rod
    const grip = new THREE.Mesh(
      createRoundedBoxGeo(bladeChord * 0.82, 0.065, 0.34, 0.015, 2, 6),
      mats.trim,
    );
    grip.position.set(0, 0.18, 0.28);
    arm.add(grip);

    if (!cityMode) {
      arm.add(
        makeStrutBetween(
          new THREE.Vector3(0.06, 0.04, 0.18),
          new THREE.Vector3(0.06, 0.18, 0.24),
          0.012,
          0.012,
          mats.chrome,
          6,
        ),
      );
    }

    // Tapered beveled airfoil blade with subtle natural droop + high-vis tip stripe
    const bladeLen = radius - 0.34;
    const blade = new THREE.Mesh(
      createRoundedBoxGeo(bladeChord, 0.026, bladeLen * 0.86, 0.008, 2, 6),
      mats.trim,
    );
    blade.position.set(0, 0.175, 0.36 + bladeLen * 0.43);
    blade.rotation.x = 0.014;
    arm.add(blade);

    const tip = new THREE.Mesh(
      createRoundedBoxGeo(bladeChord * 0.96, 0.028, bladeLen * 0.14, 0.008, 2, 6),
      tipMat,
    );
    tip.position.set(0, 0.168, 0.36 + bladeLen * 0.93);
    tip.rotation.x = 0.014;
    arm.add(tip);

    rotor.add(arm);
  }

  // Apache AN/APG-78 Longbow mast-mounted millimeter-wave radar dome
  if (hasLongbowDome) {
    const rNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.11, 0.28, 12), mats.trim);
    rNeck.position.y = 0.34;
    const rDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), mats.secondary);
    rDome.scale.set(1.15, 0.42, 1.15);
    rDome.position.y = 0.48;
    rotor.add(rNeck, rDome);
  }

  return rotor;
}

// =========================================================================
// 1. MIND-MAP HELICOPTER BUILDER (Bell VIP, Rescue, Police, Apache, Stealth, Skycrane)
// =========================================================================
export function buildHelicopterVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;

  const isApache = v.id === 98;
  const isStealth = v.id === 99;
  const isSkycrane = v.id === 100;
  const isVIP = v.id === 97;
  const isRescue = v.id === 49;
  const isPolice = v.id === 48;

  // Authentic fuselage width (never stretch VHC-98 stub-wing width across fuselage!)
  const fuseW = isApache
    ? Math.min(1.36, width * 0.36)
    : isSkycrane
      ? Math.min(1.96, width * 0.64)
      : Math.min(2.08, width * 0.72);
  const cabBaseY = isSkycrane ? g.groundClearance + 0.84 : g.groundClearance + 0.24;
  const cabH = isApache ? height * 0.38 : isSkycrane ? height * 0.36 : height * 0.46;
  const fuseLen = length * (isApache ? 0.50 : isSkycrane ? 0.42 : 0.48);
  const cabCenterZ = length * (isSkycrane ? 0.14 : 0.08);
  const cabFrontZ = cabCenterZ + fuseLen * 0.5;
  const cabRearZ = cabCenterZ - fuseLen * 0.5;
  const cowlY = cabBaseY + cabH * (isApache ? 0.42 : 0.40);
  const roofY = cabBaseY + cabH;

  // 1. Hollowed Sculpted Fuselage Tub (NO solid floating egg! Open cockpit windshield & doorway bay!)
  const tubShape = new THREE.Shape();
  const cf = fuseLen * 0.5;
  const noseTip = isStealth || isApache ? cf + 0.24 : cf + 0.08;
  const floorH = Math.max(0.14, cabH * 0.13);
  const cowlRelY = cowlY - cabBaseY;
  const bulkZ = -cf * (isApache ? 0.42 : 0.28);
  const wsTopRelZ = isApache ? -cf * 0.18 : cf * 0.20;

  if (isSkycrane) {
    // High-straddle crane operator cab + dorsal spine truss
    tubShape.moveTo(-cf, cabH * 0.48);
    tubShape.lineTo(-cf * 0.12, cabH * 0.48);
    tubShape.lineTo(0, 0.04);
    tubShape.lineTo(noseTip * 0.78, 0.04);
    tubShape.lineTo(noseTip, cowlRelY * 0.85);
    tubShape.lineTo(cf * 0.68, cowlRelY);
    tubShape.lineTo(cf * 0.26, floorH);
    tubShape.lineTo(-cf * 0.04, floorH);
    tubShape.lineTo(-cf * 0.06, cabH * 0.85);
    tubShape.lineTo(-cf, cabH * 0.85);
    tubShape.closePath();
  } else {
    tubShape.moveTo(-cf, cabH * 0.22);
    tubShape.lineTo(-cf * 0.72, 0.02);
    tubShape.lineTo(cf * 0.55, 0);
    if (isStealth || isApache) {
      tubShape.lineTo(noseTip, cowlRelY * 0.72);
      tubShape.lineTo(cf * 0.78, cowlRelY);
    } else {
      tubShape.quadraticCurveTo(noseTip, 0.04, noseTip, cowlRelY * 0.84);
      tubShape.lineTo(cf * 0.72, cowlRelY);
    }
    // Hollow cockpit & cabin floor recess!
    tubShape.lineTo(cf * 0.34, floorH);
    tubShape.lineTo(bulkZ, floorH);
    // Rear cabin bulkhead rising cleanly up to turbine roof deck!
    tubShape.lineTo(bulkZ - 0.14, cabH * 0.94);
    tubShape.lineTo(-cf + 0.12, cabH * 0.94);
    tubShape.lineTo(-cf, cabH * 0.72);
    tubShape.closePath();
  }

  const tubGeo = createExtrudedProfile(
    tubShape,
    fuseW * 0.86,
    isStealth || isApache ? 0.035 : 0.08,
    isStealth || isApache ? 0.035 : 0.08,
    cityMode ? 2 : 4,
    cityMode ? 10 : 18,
  );
  const tubMesh = new THREE.Mesh(tubGeo, mats.body);
  tubMesh.position.set(0, cabBaseY, cabCenterZ);
  tagPart(tubMesh, 'Fuselagem Esculpida com Cabine Aberta', 0, 0.15, 0.1);
  group.add(tubMesh);

  // Side cheek nose fairings & rear cabin C-pillars flanking the hollow cockpit
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.13, cowlRelY * 0.92, fuseLen * 0.32, 0.04, 2, 8),
      mats.body,
    );
    cheek.position.set(side * (fuseW * 0.435), cabBaseY + cowlRelY * 0.48, cabFrontZ - fuseLen * 0.16);
    group.add(cheek);

    const rearQuarter = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.13, cabH * 0.92, fuseLen * 0.30, 0.04, 2, 8),
      mats.body,
    );
    rearQuarter.position.set(side * (fuseW * 0.435), cabBaseY + cabH * 0.48, cabRearZ + fuseLen * 0.17);
    group.add(rearQuarter);

    // Side cockpit quarter window + rear quarter window framed cleanly
    if (!isSkycrane) {
      const qWin = new THREE.Mesh(
        createRoundedBoxGeo(0.035, cabH * 0.38, fuseLen * 0.18, 0.015, 2, 6),
        mats.glass,
      );
      qWin.position.set(side * (fuseW * 0.45), cabBaseY + cabH * 0.68, cabRearZ + fuseLen * 0.22);
      qWin.userData.noShadow = true;
      group.add(qWin);
    }

    // Livery accent stripe along fuselage waist
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.08, fuseLen * 0.72),
      mats.liveryStripe,
    );
    stripe.position.set(side * (fuseW * 0.495), cabBaseY + cowlRelY * 0.56, cabCenterZ - fuseLen * 0.05);
    group.add(stripe);
  });

  // 2. Framed Cockpit Roof Header, Overhead Console Spine & Flush Wrap-Around Windshield Panes (ZERO floating dome!)
  const wsTopZ = cabCenterZ + wsTopRelZ;
  const wsBotZ = cabCenterZ + cf * (isStealth || isApache ? 0.78 : 0.72);
  const wsTopY = roofY - 0.04;
  const wsBotY = cowlY;
  const wsSpanZ = wsBotZ - wsTopZ;
  const wsSpanY = wsTopY - wsBotY;
  const wsLen = Math.hypot(wsSpanZ, wsSpanY);
  const wsAngle = Math.atan2(wsSpanZ, wsSpanY);

  // Structural roof crown spanning from wsTopZ back to rear fuselage
  const roofSpineLen = Math.max(0.6, wsTopZ - cabRearZ);
  const roofCrown = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.78, 0.12, roofSpineLen, 0.04, 3, 10),
    mats.body,
  );
  roofCrown.position.set(0, roofY - 0.04, (wsTopZ + cabRearZ) * 0.5);
  group.add(roofCrown);

  // Windshield eyebrow header & lower cowl glare-shield
  const wsHeader = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.78, 0.075, 0.14, 0.02, 2, 8),
    mats.body,
  );
  wsHeader.position.set(0, wsTopY, wsTopZ);
  const wsCowl = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.80, 0.06, 0.12, 0.02, 2, 8),
    mats.trim,
  );
  wsCowl.position.set(0, wsBotY, wsBotZ);
  group.add(wsHeader, wsCowl);

  // Main angled framed front windshield (flush inside fuselage frame!)
  const wsWBot = fuseW * 0.82;
  const wsWTop = fuseW * 0.74;
  const wsGlass = new THREE.Mesh(
    createTrapezoidGlassGeo(wsWBot, wsWTop, wsLen * 0.94, 0.024),
    mats.glass,
  );
  wsGlass.position.set(0, (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5);
  wsGlass.rotation.x = -wsAngle;
  wsGlass.userData.noShadow = true;
  wsGlass.renderOrder = 2;
  tagPart(wsGlass, 'Para-brisa Panorâmico Embutido', 0, 0.25, 0.45);
  group.add(wsGlass);

  // Structural A-pillars + center windshield mullion + twin wipers
  [-1, 1].forEach((side) => {
    group.add(
      makeStrutBetween(
        new THREE.Vector3(side * (wsWBot * 0.51), wsBotY - 0.02, wsBotZ),
        new THREE.Vector3(side * (wsWTop * 0.51), wsTopY + 0.02, wsTopZ),
        0.036,
        0.04,
        mats.body,
        10,
      ),
    );
    // Cheek triangular glass filling side of windshield A-pillar down to door frame
    const cheekGlass = new THREE.Mesh(
      createRoundedBoxGeo(0.025, wsSpanY * 0.82, wsSpanZ * 0.72, 0.015, 2, 6),
      mats.glass,
    );
    cheekGlass.position.set(
      side * (fuseW * 0.445),
      (wsBotY + wsTopY) * 0.5,
      (wsBotZ + wsTopZ) * 0.5 - 0.06,
    );
    cheekGlass.userData.noShadow = true;
    cheekGlass.renderOrder = 2;
    group.add(cheekGlass);
  });

  const centerPost = makeStrutBetween(
    new THREE.Vector3(0, wsBotY - 0.01, wsBotZ + 0.01),
    new THREE.Vector3(0, wsTopY + 0.01, wsTopZ + 0.01),
    0.024,
    0.026,
    mats.trim,
    8,
  );
  group.add(centerPost);

  // Lower nose chin observation windows (classic Bell 407 / AS350 / H160 feature on mind map!)
  if (!isApache && !isStealth) {
    [-1, 1].forEach((side) => {
      const chinGlass = new THREE.Mesh(
        createRoundedBoxGeo(fuseW * 0.26, cowlRelY * 0.42, 0.03, 0.015, 2, 6),
        mats.glass,
      );
      chinGlass.position.set(side * (fuseW * 0.22), cabBaseY + cowlRelY * 0.54, cabCenterZ + noseTip - 0.06);
      chinGlass.rotation.x = -0.72;
      chinGlass.userData.noShadow = true;
      chinGlass.renderOrder = 2;
      group.add(chinGlass);
    });
  }

  // 3. Detailed Cutaway Cockpit Interior (Contoured Seats, Cyclic Stick, Collective, MFD Console — Mind Map Top-Left!)
  const interior = new THREE.Group();
  const seatFloorY = cabBaseY + floorH + 0.02;
  const frontSeatZ = isApache ? cabCenterZ + cf * 0.34 : cabCenterZ + cf * 0.22;

  const buildHeliSeat = (sx: number, sy: number, sz: number) => {
    const sGrp = new THREE.Group();
    const cushion = new THREE.Mesh(createRoundedBoxGeo(0.36, 0.09, 0.38, 0.03, 2, 8), mats.interior);
    cushion.position.y = 0.08;
    const back = new THREE.Mesh(createRoundedBoxGeo(0.34, 0.44, 0.09, 0.03, 2, 8), mats.interior);
    back.position.set(0, 0.31, -0.15);
    back.rotation.x = -0.16;
    const head = new THREE.Mesh(createRoundedBoxGeo(0.20, 0.15, 0.08, 0.025, 2, 6), mats.accent);
    head.position.set(0, 0.56, -0.20);
    sGrp.add(cushion, back, head);
    sGrp.position.set(sx, sy, sz);
    return sGrp;
  };

  if (isApache) {
    // Tandem stepped gunner (front) + pilot (rear elevated) cockpit!
    interior.add(buildHeliSeat(0, seatFloorY, frontSeatZ + 0.35));
    interior.add(buildHeliSeat(0, seatFloorY + 0.16, frontSeatZ - 0.45));
  } else {
    [-fuseW * 0.22, fuseW * 0.22].forEach((sx) => {
      interior.add(buildHeliSeat(sx, seatFloorY, frontSeatZ));
      // Cyclic stick & collective lever
      const cyclic = makeStrutBetween(
        new THREE.Vector3(sx, seatFloorY, frontSeatZ + 0.20),
        new THREE.Vector3(sx, seatFloorY + 0.34, frontSeatZ + 0.14),
        0.012,
        0.014,
        mats.trim,
        6,
      );
      interior.add(cyclic);
    });
    // Aft VIP / passenger cabin seats
    if (v.unitySpec.seats >= 4 && !isSkycrane) {
      const rearRowZ = cabCenterZ - cf * 0.14;
      [-fuseW * 0.22, fuseW * 0.22].forEach((sx) => {
        interior.add(buildHeliSeat(sx, seatFloorY, rearRowZ));
      });
    }
  }

  // Angled avionics instrument pedestal + glowing MFD screens
  const glare = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.56, 0.22, 0.32, 0.04, 2, 8),
    mats.trim,
  );
  glare.position.set(0, seatFloorY + 0.28, wsBotZ - 0.16);
  const mfd = new THREE.Mesh(new THREE.BoxGeometry(fuseW * 0.42, 0.11, 0.04), mats.sirenBlue);
  mfd.position.set(0, seatFloorY + 0.31, wsBotZ - 0.30);
  mfd.rotation.x = -0.35;
  interior.add(glare, mfd);
  tagPart(interior, 'Cabine Interior com Assentos e Aviônica', 0, 0.2, 0.2);
  group.add(interior);

  // 4. Articulated Sliding / Hinged Cabin Doors (flush inside doorway!)
  if (!cityMode) {
    [-1, 1].forEach((side) => {
      const hDoor = new THREE.Group();
      const dLen = fuseLen * (isApache ? 0.28 : 0.34);
      const dH = cabH * (isApache ? 0.42 : 0.68);
      const dLower = new THREE.Mesh(
        createRoundedBoxGeo(0.055, dH * 0.50, dLen, 0.02, 2, 6),
        mats.body,
      );
      dLower.position.y = -dH * 0.24;
      const dPostF = new THREE.Mesh(new THREE.BoxGeometry(0.05, dH * 0.52, 0.05), mats.body);
      dPostF.position.set(0, dH * 0.24, dLen * 0.46);
      const dPostR = new THREE.Mesh(new THREE.BoxGeometry(0.05, dH * 0.52, 0.05), mats.body);
      dPostR.position.set(0, dH * 0.24, -dLen * 0.46);
      const dTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, dLen), mats.body);
      dTop.position.set(0, dH * 0.48, 0);
      const dWin = new THREE.Mesh(
        createRoundedBoxGeo(0.03, dH * 0.44, dLen * 0.84, 0.015, 2, 6),
        mats.glass,
      );
      dWin.position.y = dH * 0.24;
      dWin.userData.noShadow = true;
      dWin.renderOrder = 2;
      hDoor.add(dLower, dPostF, dPostR, dTop, dWin);
      hDoor.position.set(
        side * (fuseW * 0.46),
        cabBaseY + floorH + dH * 0.52,
        cabCenterZ + (isApache ? 0.68 : 0.02),
      );
      tagPart(
        hDoor,
        isApache
          ? (side < 0 ? 'Escotilha Blindada Esquerda' : 'Escotilha Blindada Direita')
          : (side < 0 ? 'Porta Deslizante Esquerda' : 'Porta Deslizante Direita'),
        side * 0.4,
        0,
        isApache ? 0.15 : -0.3,
      );
      group.add(hDoor);
      registerOpenable(
        animated,
        hDoor,
        isApache ? 'Escotilhas Apache' : 'Portas Helicóptero',
        isApache ? { y: -side * 0.68 } : {},
        isApache ? new THREE.Vector3(side * 0.12, 0, 0) : new THREE.Vector3(side * 0.14, 0, -dLen * 0.92),
      );
    });
  }

  // 5. Overhead Twin-Turbine Cowling, Intakes, Exhaust Ducts & Wire-Strike Cutters
  const turbDeckY = roofY + 0.08;
  const turbLen = fuseLen * (isSkycrane ? 0.68 : 0.52);
  const turbZ = cabCenterZ - fuseLen * 0.14;
  const turbMain = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.64, 0.34, turbLen, 0.10, cityMode ? 2 : 4, 12),
    mats.secondary,
  );
  turbMain.position.set(0, turbDeckY + 0.08, turbZ);
  tagPart(turbMain, 'Conjunto Turboeixo Duplo Superior', 0, 0.45, 0);
  group.add(turbMain);

  // Twin side engine pods / turbine cowlings + exhaust nozzles
  [-1, 1].forEach((side) => {
    const podX = side * (isApache || isSkycrane ? fuseW * 0.54 : fuseW * 0.24);
    const podY = isApache ? turbDeckY - 0.02 : turbDeckY + 0.10;
    const pod = new THREE.Mesh(
      new THREE.CylinderGeometry(isApache ? 0.22 : 0.16, isApache ? 0.24 : 0.18, turbLen * 0.88, 14),
      mats.secondary,
    );
    pod.rotation.x = Math.PI / 2;
    pod.position.set(podX, podY, turbZ);
    const intakeLip = new THREE.Mesh(
      new THREE.TorusGeometry(isApache ? 0.19 : 0.13, 0.032, 8, 14),
      mats.grille,
    );
    intakeLip.position.set(podX, podY, turbZ + turbLen * 0.44);
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.28, 12),
      mats.chrome,
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.rotation.y = side * 0.22;
    exhaust.position.set(podX + side * 0.05, podY, turbZ - turbLen * 0.48);
    group.add(pod, intakeLip, exhaust);
  });

  if (isPolice || isRescue || isApache) {
    const wsCutter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.16), mats.trim);
    wsCutter.position.set(0, roofY + 0.12, wsTopZ + 0.05);
    wsCutter.rotation.x = 0.48;
    group.add(wsCutter);
  }

  // 6. Tapered Sculpted Tail Boom, Ventral Fin, Horizontal Stabilizer w/ Endplates, Swept Vertical Fin & Tail Rotor / Fenestron
  const boomStartZ = cabRearZ + 0.35;
  const boomEndZ = -halfL + 0.42;
  const boomLen = Math.max(2.2, boomStartZ - boomEndZ);
  const boomY = cabBaseY + cabH * (isSkycrane ? 0.78 : 0.72);
  const boomGeo = new THREE.CylinderGeometry(0.13, 0.30, boomLen, 16);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, mats.body);
  boom.position.set(0, boomY, (boomStartZ + boomEndZ) * 0.5);
  tagPart(boom, 'Cone de Cauda Estrutural', 0, 0.2, -0.65);
  group.add(boom);

  // Horizontal stabilizer with twin endplate winglets (Mind Map Top-Right Bell 407 / H160!)
  const hStabZ = boomEndZ + boomLen * 0.28;
  const hStab = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.92, 0.055, 0.42, 0.02, 2, 6),
    mats.body,
  );
  hStab.position.set(0, boomY, hStabZ);
  group.add(hStab);
  [-1, 1].forEach((side) => {
    const endFin = new THREE.Mesh(
      createRoundedBoxGeo(0.04, 0.32, 0.36, 0.015, 2, 6),
      mats.accent,
    );
    endFin.position.set(side * (fuseW * 0.46), boomY + 0.04, hStabZ);
    group.add(endFin);
  });

  // Ventral tail skid / guard fin
  const vSkid = makeStrutBetween(
    new THREE.Vector3(0, boomY - 0.12, boomEndZ + 0.48),
    new THREE.Vector3(0, boomY - 0.42, boomEndZ + 0.14),
    0.022,
    0.018,
    mats.trim,
    6,
  );
  group.add(vSkid);

  // Vertical tail fin + Fenestron ducted tail fan (VIP & Stealth) OR articulated tail rotor
  const useFenestron = isVIP || isStealth;
  if (isStealth) {
    // Twin canted stealth V-tail fins + ducted Fenestron ring (Mind Map Bottom-Left!)
    [-1, 1].forEach((side) => {
      const sFin = buildSculptedFin(0.95, 0.68, 0.38, 0.42, 0.055, mats.body, mats.accent, cityMode);
      sFin.position.set(side * 0.12, boomY + 0.04, boomEndZ + 0.20);
      sFin.rotation.z = -side * 0.34;
      group.add(sFin);
    });
  } else {
    const vFin = buildSculptedFin(
      height * 0.36,
      0.72,
      0.40,
      0.38,
      0.075,
      mats.body,
      mats.sirenRed,
      cityMode,
    );
    vFin.position.set(0, boomY + 0.04, boomEndZ + 0.18);
    tagPart(vFin, 'Deriva Vertical de Cauda', 0, 0.35, -0.75);
    group.add(vFin);
  }

  const tailRotor = new THREE.Group();
  const trRadius = 0.56;
  if (useFenestron) {
    // Ducted Fenestron shroud integrated into tail fin
    const shroud = new THREE.Mesh(
      new THREE.TorusGeometry(trRadius * 0.85, 0.085, 10, 22),
      mats.body,
    );
    shroud.rotation.y = Math.PI / 2;
    group.add(shroud);
    shroud.position.set(0, boomY + 0.42, boomEndZ + 0.10);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12), mats.trim);
    hub.rotation.z = Math.PI / 2;
    tailRotor.add(hub);
    for (let b = 0; b < 6; b++) {
      const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.025, trRadius * 1.45, 0.075), mats.accent);
      tBlade.rotation.x = (b / 6) * Math.PI;
      tailRotor.add(tBlade);
    }
    tailRotor.position.set(0, boomY + 0.42, boomEndZ + 0.10);
    tagPart(tailRotor, 'Rotor Antipar Fenestron Carenado', 0.35, 0.35, -0.75);
  } else {
    const gearbox = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.18, 12), mats.trim);
    gearbox.rotation.z = Math.PI / 2;
    tailRotor.add(gearbox);
    for (let b = 0; b < 4; b++) {
      const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.025, trRadius * 1.9, 0.09), mats.accent);
      tBlade.rotation.x = (b / 4) * Math.PI;
      tBlade.position.x = 0.09;
      tailRotor.add(tBlade);
    }
    tailRotor.position.set(0.10, boomY + height * 0.30, boomEndZ + 0.02);
    tagPart(tailRotor, 'Rotor Antipar de Cauda', 0.4, 0.35, -0.75);
  }
  group.add(tailRotor);
  animated.rotors.push(tailRotor);

  // 7. Landing Gear (Taildragger wheels on Apache, Tall Crane wheels on Skycrane, Rescue wheels/sponsons, or Aerodynamic Skids)
  if (isApache) {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(0.28, 0.16, 'aircraft_gear', mats, side > 0, false, cityMode);
      w.position.set(side * (fuseW * 0.72), 0.28, cabFrontZ - 0.55);
      group.add(w);
      animated.wheels.push(w);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.36), cabBaseY + 0.14, cabFrontZ - 0.65),
          new THREE.Vector3(side * (fuseW * 0.72), 0.28, cabFrontZ - 0.55),
          0.04,
          0.032,
          mats.trim,
          8,
        ),
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.36), cabBaseY + 0.20, cabFrontZ - 0.30),
          new THREE.Vector3(side * (fuseW * 0.72), 0.28, cabFrontZ - 0.55),
          0.03,
          0.028,
          mats.trim,
          8,
        ),
      );
    });
    const tw = createCraftedWheel(0.16, 0.10, 'aircraft_gear', mats, true, false, cityMode);
    tw.position.set(0, 0.16, boomEndZ + 0.20);
    group.add(
      tw,
      makeStrutBetween(
        new THREE.Vector3(0, 0.16, boomEndZ + 0.20),
        new THREE.Vector3(0, boomY - 0.08, boomEndZ + 0.34),
        0.028,
        0.032,
        mats.trim,
        8,
      ),
    );
    animated.wheels.push(tw);
  } else if (isSkycrane) {
    // Tall straddle quad crane landing gear with overhead outrigger truss & forward drag braces
    const zFront = cabCenterZ + 0.45;
    const zRear = cabRearZ - 0.45;
    // Upper rear outrigger crossbeam anchored solidly through the tail boom
    const rearOutrigger = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 1.12, 0.14, 0.18, 0.03, 2, 6),
      mats.secondary,
    );
    rearOutrigger.position.set(0, boomY - 0.06, zRear);
    group.add(rearOutrigger);

    [-1, 1].forEach((side) => {
      // Front crane leg anchored to forward fuselage bulkhead
      const wFront = createCraftedWheel(0.30, 0.18, 'heavy_truck', mats, side > 0, false, cityMode);
      wFront.position.set(side * (fuseW * 0.68), 0.30, zFront);
      group.add(wFront);
      animated.wheels.push(wFront);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.38), cabBaseY + cabH * 0.46, zFront),
          new THREE.Vector3(side * (fuseW * 0.68), 0.30, zFront),
          0.05,
          0.045,
          mats.secondary,
          8,
        ),
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.36), cabBaseY + cabH * 0.22, zFront + 0.42),
          new THREE.Vector3(side * (fuseW * 0.64), 0.65, zFront),
          0.032,
          0.032,
          mats.trim,
          8,
        ),
      );

      // Rear crane leg anchored to rear outrigger truss + forward drag brace into fuselage bulkhead
      const wRear = createCraftedWheel(0.30, 0.18, 'heavy_truck', mats, side > 0, false, cityMode);
      wRear.position.set(side * (fuseW * 0.68), 0.30, zRear);
      group.add(wRear);
      animated.wheels.push(wRear);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.54), boomY - 0.06, zRear),
          new THREE.Vector3(side * (fuseW * 0.68), 0.30, zRear),
          0.05,
          0.045,
          mats.secondary,
          8,
        ),
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.38), cabBaseY + cabH * 0.50, cabRearZ + 0.18),
          new THREE.Vector3(side * (fuseW * 0.64), 0.78, zRear),
          0.034,
          0.032,
          mats.trim,
          8,
        ),
      );
    });
  } else {
    // Authentic Tubular Helicopter Skids with Curved Cross-Tubes & Boarding Steps!
    const skidX = fuseW * 0.50;
    const skidLen = fuseLen * 0.84;
    const skidY = 0.055;
    [-1, 1].forEach((side) => {
      const skidPts = [
        new THREE.Vector3(side * skidX, skidY, cabRearZ + 0.15),
        new THREE.Vector3(side * skidX, skidY, cabCenterZ),
        new THREE.Vector3(side * skidX, skidY, cabFrontZ - 0.20),
        new THREE.Vector3(side * skidX, skidY + 0.18, cabFrontZ + 0.12),
      ];
      const runner = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(skidPts), 16, 0.042, 10, false),
        mats.trim,
      );
      tagPart(runner, 'Esqui de Pouso Tubular', side * 0.35, -0.25, 0);
      group.add(runner);

      // Angled front & rear skid cross-tubes anchored solidly into fuselage belly
      [cabCenterZ + fuseLen * 0.22, cabCenterZ - fuseLen * 0.22].forEach((sz) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * (fuseW * 0.28), cabBaseY + 0.08, sz - 0.06),
            new THREE.Vector3(side * skidX, skidY, sz),
            0.032,
            0.032,
            mats.trim,
            8,
          ),
        );
      });

      if (isVIP || isPolice || isRescue) {
        const stepBar = new THREE.Mesh(
          createRoundedBoxGeo(0.11, 0.032, fuseLen * 0.36, 0.012, 2, 6),
          isVIP ? mats.chrome : mats.alloy,
        );
        stepBar.position.set(side * (skidX + 0.03), skidY + 0.12, cabCenterZ);
        group.add(stepBar);
      }
    });
  }

  // 8. Main Rotor Hub, Swashplate, Pitch Links & Tapered Airfoil Blades
  const mainRotor = buildBladeRotorAssembly(
    isVIP || isSkycrane || isRescue ? 5 : 4,
    length * 0.44,
    isSkycrane || isApache ? 0.24 : 0.19,
    mats,
    isStealth ? mats.accent : mats.sirenAmber,
    isApache,
    cityMode,
  );
  mainRotor.position.set(0, turbDeckY + 0.26, cabCenterZ - fuseLen * 0.06);
  tagPart(mainRotor, isApache ? 'Rotor Tático com Radar Longbow' : 'Rotor Principal Articulado', 0, 0.9, 0);
  group.add(mainRotor);
  animated.rotors.push(mainRotor);

  // 9. Role-Specific Helicopter Details (Apache Gunship Armament, Police Searchlight/FLIR, Rescue Hoist, Skycrane Winch)
  if (isApache) {
    // Chin TADS/PNVS sensor turret + 30mm M230 chain gun under nose
    const tads = new THREE.Mesh(
      createRoundedBoxGeo(0.36, 0.24, 0.34, 0.05, 2, 8),
      mats.secondary,
    );
    tads.position.set(0, cabBaseY + 0.14, cabCenterZ + noseTip + 0.05);
    const flirEye = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), mats.sirenBlue);
    flirEye.rotation.x = Math.PI / 2;
    flirEye.position.set(0.08, cabBaseY + 0.14, cabCenterZ + noseTip + 0.20);
    const gunTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 10), mats.trim);
    gunTurret.position.set(0, cabBaseY - 0.04, cabCenterZ + noseTip - 0.35);
    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.95, 10), mats.trim);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, cabBaseY - 0.08, cabCenterZ + noseTip + 0.10);
    group.add(tads, flirEye, gunTurret, gunBarrel);

    // Stub weapon wings + 70mm Hydra rocket pods + quad Hellfire missile racks!
    const wingBaseZ = cabCenterZ - 0.85;
    const stubWings = buildSculptedWing(
      width * 0.94,
      0.85,
      0.55,
      0.16,
      0.09,
      -0.06,
      mats,
      { hasNavLights: true, cityMode },
    );
    stubWings.position.set(0, cabBaseY + cabH * 0.44, wingBaseZ);
    tagPart(stubWings, 'Asas Táticas com Foguetes e Mísseis', 0, 0.25, 0);
    group.add(stubWings);

    [-1, 1].forEach((side) => {
      const podX = side * (width * 0.26);
      const podY = cabBaseY + cabH * 0.26;
      const podPylon = new THREE.Mesh(
        createRoundedBoxGeo(0.08, cabH * 0.20, 0.52, 0.015, 2, 6),
        mats.trim,
      );
      podPylon.position.set(podX, cabBaseY + cabH * 0.35, wingBaseZ);
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.05, 14), mats.secondary);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(podX, podY, wingBaseZ);
      const podCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14), mats.accent);
      podCap.rotation.x = Math.PI / 2;
      podCap.position.set(podX, podY, wingBaseZ + 0.53);
      group.add(podPylon, pod, podCap);

      // Underwing M299 Hellfire pylon + horizontal dual-rail launcher crossbar
      const rackX = side * (width * 0.39);
      const rackPylon = new THREE.Mesh(
        createRoundedBoxGeo(0.08, cabH * 0.20, 0.46, 0.015, 2, 6),
        mats.trim,
      );
      rackPylon.position.set(rackX, cabBaseY + cabH * 0.35, wingBaseZ);
      const rackBar = new THREE.Mesh(
        createRoundedBoxGeo(0.22, 0.05, 0.42, 0.01, 2, 6),
        mats.trim,
      );
      rackBar.position.set(rackX, podY + 0.04, wingBaseZ);
      group.add(rackPylon, rackBar);

      [-0.06, 0.06].forEach((mx) => {
        const hellfire = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.15, 10), mats.trim);
        hellfire.rotation.x = Math.PI / 2;
        hellfire.position.set(rackX + mx, podY, wingBaseZ + 0.03);
        group.add(hellfire);
      });
    });
  }

  if (isPolice) {
    // Chin gyro-FLIR camera sphere + nose Nightsun searchlight + police strobe bar
    const flir = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), mats.trim);
    flir.position.set(0, cabBaseY + 0.02, cabCenterZ + noseTip - 0.12);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), mats.sirenBlue);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, cabBaseY + 0.02, cabCenterZ + noseTip + 0.04);
    const search = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 14), mats.chrome);
    search.rotation.x = Math.PI / 2;
    search.position.set(-fuseW * 0.44, cabBaseY + 0.14, cabFrontZ - 0.20);
    const searchLens = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 12), mats.headlight);
    searchLens.rotation.x = Math.PI / 2;
    searchLens.position.set(-fuseW * 0.44, cabBaseY + 0.14, cabFrontZ - 0.05);
    const pBar = new THREE.Mesh(createRoundedBoxGeo(fuseW * 0.56, 0.08, 0.16, 0.02, 2, 6), mats.sirenRed);
    pBar.position.set(0, turbDeckY + 0.26, turbZ + turbLen * 0.38);
    group.add(flir, lens, search, searchLens, pBar);
  }

  if (isRescue || g.attachments.includes('heli_winch')) {
    const winchBoom = makeStrutBetween(
      new THREE.Vector3(fuseW * 0.42, roofY - 0.05, cabCenterZ + 0.15),
      new THREE.Vector3(fuseW * 0.68, roofY + 0.10, cabCenterZ + 0.15),
      0.032,
      0.028,
      mats.accent,
      8,
    );
    const winchDrum = new THREE.Mesh(
      createRoundedBoxGeo(0.24, 0.22, 0.36, 0.04, 2, 8),
      mats.accent,
    );
    winchDrum.position.set(fuseW * 0.56, roofY - 0.04, cabCenterZ + 0.15);
    tagPart(winchDrum, 'Guincho Lateral de Salvamento', 0.45, 0.15, 0);
    group.add(winchBoom, winchDrum);

    if (isSkycrane) {
      // Heavy-duty under-spine hoist sling hook + amber work strobe
      const craneBeacon = new THREE.Mesh(
        createRoundedBoxGeo(fuseW * 0.42, 0.09, 0.18, 0.02, 2, 6),
        mats.sirenAmber,
      );
      craneBeacon.position.set(0, turbDeckY + 0.27, turbZ + turbLen * 0.36);
      group.add(craneBeacon);

      const slingMount = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.16, 0.65, 0.04, 2, 8),
        mats.accent,
      );
      slingMount.position.set(0, cabBaseY + cabH * 0.42, cabCenterZ - fuseLen * 0.28);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8), mats.chrome);
      cable.position.set(0, cabBaseY + cabH * 0.20, cabCenterZ - fuseLen * 0.28);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 8, 14, Math.PI * 1.4), mats.accent);
      hook.position.set(0, cabBaseY + cabH * 0.05, cabCenterZ - fuseLen * 0.28);
      group.add(slingMount, cable, hook);
    }
  }

  enableShadows(group);
  return group;
}

// =========================================================================
// 2. REWORKED AIRPLANE & SUPERSONIC JET BUILDER (VHC-87..96)
// =========================================================================
export function buildAirplaneOrJetVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;

  const isJet = g.archetype === 'jet';
  const isCessna = v.id === 87;
  const isSeaplane = v.id === 88 || g.attachments.includes('seaplane_floats');
  const isBiplane = v.id === 89 || g.attachments.includes('biplane_wings');
  const isKingAir = v.id === 90;
  const isCargoProp = v.id === 91;
  const isLearJet = v.id === 92;
  const isF22 = v.id === 93;
  const isF16 = v.id === 94;
  const isAcroJet = v.id === 95;
  const isConcorde = v.id === 96;

  const isFighter = isF22 || isF16 || isAcroJet;
  const isTwinProp = isKingAir || isCargoProp || g.attachments.includes('twin_prop_nacelles');
  const isCargoOrAirliner = v.unitySpec.seats >= 8 && !isConcorde;

  const fuseW = isFighter
    ? Math.min(1.42, width * 0.16)
    : isConcorde
      ? 1.32
      : isCargoProp
        ? 1.92
        : Math.min(1.48, width * 0.14);
  const fuseH = isCargoProp ? height * 0.42 : height * 0.36;
  const fuseY = isSeaplane ? g.groundClearance + 0.88 : g.groundClearance + fuseH * 0.58;

  // 1. Sculpted Role-Specific Multi-Section Fuselage + Framed Cockpit Windshield Step (ZERO plain banana tube!)
  const fuseGrp = new THREE.Group();
  const fShape = new THREE.Shape();

  if (isFighter) {
    // Sleek supersonic fuselage with nose radome, recessed canopy saddle & feathered afterburner tail
    fShape.moveTo(-halfL + 0.25, -fuseH * 0.32);
    fShape.lineTo(halfL * 0.36, -fuseH * 0.42);
    fShape.quadraticCurveTo(halfL * 0.78, -fuseH * 0.28, halfL, -0.02);
    fShape.quadraticCurveTo(halfL * 0.78, fuseH * 0.24, halfL * 0.34, fuseH * 0.34);
    // Open cockpit saddle
    fShape.lineTo(halfL * 0.22, fuseH * 0.12);
    fShape.lineTo(-halfL * 0.04, fuseH * 0.12);
    // Dorsal avionics spine back to tail
    fShape.lineTo(-halfL * 0.10, fuseH * 0.48);
    fShape.lineTo(-halfL + 0.25, fuseH * 0.36);
    fShape.closePath();
  } else if (isConcorde) {
    // Slender ogival Concorde supersonic fuselage with iconic droop-snoot needle nose!
    fShape.moveTo(-halfL + 0.25, -fuseH * 0.24);
    fShape.lineTo(halfL * 0.58, -fuseH * 0.36);
    fShape.lineTo(halfL, -fuseH * 0.18);
    fShape.lineTo(halfL * 0.68, fuseH * 0.14);
    fShape.lineTo(halfL * 0.50, fuseH * 0.44);
    fShape.lineTo(-halfL * 0.64, fuseH * 0.46);
    fShape.lineTo(-halfL + 0.25, fuseH * 0.18);
    fShape.closePath();
  } else if (isBiplane) {
    // Radial-nosed aerobatic biplane with open tandem cockpit cutout
    fShape.moveTo(-halfL + 0.18, -fuseH * 0.18);
    fShape.lineTo(halfL * 0.52, -fuseH * 0.44);
    fShape.lineTo(halfL * 0.88, -fuseH * 0.38);
    fShape.lineTo(halfL * 0.90, fuseH * 0.36);
    fShape.lineTo(halfL * 0.36, fuseH * 0.42);
    // Open aerobatic cockpit cutout
    fShape.lineTo(halfL * 0.26, fuseH * 0.16);
    fShape.lineTo(-halfL * 0.08, fuseH * 0.16);
    fShape.lineTo(-halfL * 0.16, fuseH * 0.44);
    fShape.lineTo(-halfL + 0.18, fuseH * 0.16);
    fShape.closePath();
  } else {
    // GA Cessna / Amphibian / King Air / Cargo / LearJet with real stepped nose cowl + recessed windshield frame!
    const cowlEnd = isCargoProp || isLearJet ? halfL * 0.58 : halfL * 0.46;
    const wsTopZ = isCargoProp || isLearJet ? halfL * 0.40 : halfL * 0.22;
    fShape.moveTo(-halfL + 0.20, isCargoProp ? -fuseH * 0.18 : -fuseH * 0.16);
    if (isCargoProp) {
      fShape.lineTo(-halfL * 0.48, -fuseH * 0.46);
      fShape.lineTo(halfL * 0.64, -fuseH * 0.46);
    } else {
      fShape.lineTo(halfL * 0.56, -fuseH * 0.44);
    }
    fShape.quadraticCurveTo(halfL * 0.94, -fuseH * 0.30, halfL, -0.02);
    fShape.quadraticCurveTo(halfL * 0.88, fuseH * 0.22, cowlEnd, fuseH * 0.18);
    // Open windshield step + cabin roof
    fShape.lineTo(wsTopZ, fuseH * 0.14);
    fShape.lineTo(wsTopZ - 0.06, fuseH * 0.56);
    fShape.lineTo(-halfL * 0.54, fuseH * 0.54);
    fShape.lineTo(-halfL + 0.20, fuseH * 0.18);
    fShape.closePath();
  }

  const fuseGeo = createExtrudedProfile(
    fShape,
    fuseW * 0.86,
    isF22 ? 0.06 : 0.14,
    isF22 ? 0.06 : 0.14,
    cityMode ? 2 : 5,
    cityMode ? 10 : 18,
  );
  const fuseMesh = new THREE.Mesh(fuseGeo, mats.body);
  fuseGrp.add(fuseMesh);

  // Tapered nose radome / cowling cone & fuselage livery stripes
  if (isF22) {
    // Angular stealth nose chines on F-22
    [-1, 1].forEach((side) => {
      const chine = new THREE.Mesh(
        createRoundedBoxGeo(fuseW * 0.36, 0.08, length * 0.38, 0.02, 2, 6),
        mats.body,
      );
      chine.position.set(side * (fuseW * 0.44), 0.02, halfL * 0.42);
      chine.rotation.y = -side * 0.28;
      fuseGrp.add(chine);
    });
  } else if (isF16) {
    // Blended Wing-Body LEX strakes + ventral smiling chin air intake on F-16!
    [-1, 1].forEach((side) => {
      const lex = new THREE.Mesh(
        createRoundedBoxGeo(fuseW * 0.46, 0.09, length * 0.32, 0.03, 2, 8),
        mats.body,
      );
      lex.position.set(side * (fuseW * 0.48), 0.06, length * 0.06);
      lex.rotation.y = -side * 0.26;
      fuseGrp.add(lex);
    });
    const chinScoop = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.62, 0.32, length * 0.24, 0.08, 3, 10),
      mats.trim,
    );
    chinScoop.position.set(0, -fuseH * 0.48, length * 0.14);
    const chinLip = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.52, 0.22, 0.08, 0.04, 2, 8),
      mats.grille,
    );
    chinLip.position.set(0, -fuseH * 0.48, length * 0.26);
    fuseGrp.add(chinScoop, chinLip);
  } else if (isBiplane) {
    // Radial engine cowling + 7 radial engine cylinders + exhaust collector ring!
    const cowl = new THREE.Mesh(
      new THREE.CylinderGeometry(fuseW * 0.46, fuseW * 0.50, 0.52, 20),
      mats.secondary,
    );
    cowl.rotation.x = Math.PI / 2;
    cowl.position.set(0, 0, halfL * 0.78);
    fuseGrp.add(cowl);
    for (let c = 0; c < 7; c++) {
      const ang = (c / 7) * Math.PI * 2;
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8), mats.alloy);
      cyl.position.set(Math.cos(ang) * (fuseW * 0.40), Math.sin(ang) * (fuseW * 0.40), halfL * 0.80);
      cyl.rotation.z = ang - Math.PI / 2;
      fuseGrp.add(cyl);
    }
  } else if (isCessna || isSeaplane) {
    // Engine cowl cooling intake grilles on Cessna / Amphibian nose
    [-1, 1].forEach((side) => {
      const grill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), mats.grille);
      grill.position.set(side * (fuseW * 0.22), 0.04, halfL - 0.28);
      fuseGrp.add(grill);
    });
  }

  // Livery stripes hugging fuselage sides (fuselage extruded width = fuseW * 0.86 => half-width fuseW * 0.43)
  [-1, 1].forEach((side) => {
    const fStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, fuseH * 0.12, length * 0.60),
      mats.liveryStripe,
    );
    fStripe.position.set(side * (fuseW * 0.43), 0.04, -length * 0.02);
    fuseGrp.add(fStripe);
  });

  fuseGrp.position.set(0, fuseY, 0);
  tagPart(fuseGrp, isJet ? 'Fuselagem Supersônica Esculpida' : 'Fuselagem Aeronáutica Detalhada', 0, 0.15, 0);
  group.add(fuseGrp);

  // 2. Cockpit Interior + Framed Windshield OR Fighter Tear-Drop Canopy Frame (NO giant floating sphere!)
  const seatCount = isAcroJet || isFighter ? (isAcroJet ? 2 : 1) : Math.min(2, v.unitySpec.seats);
  const cockpitInterior = new THREE.Group();
  for (let s = 0; s < seatCount; s++) {
    const seat = new THREE.Mesh(
      createRoundedBoxGeo(0.34, 0.42, 0.34, 0.05, 2, 8),
      mats.interior,
    );
    const sz = isFighter
      ? halfL * 0.18 - s * 0.82
      : isConcorde
        ? halfL * 0.54
        : halfL * 0.32;
    seat.position.set(
      seatCount === 2 && !isFighter ? (s === 0 ? -0.22 : 0.22) : 0,
      fuseY + fuseH * 0.22,
      sz,
    );
    cockpitInterior.add(seat);
  }
  const hud = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.06), mats.sirenBlue);
  hud.position.set(0, fuseY + fuseH * 0.36, isConcorde ? halfL * 0.64 : halfL * 0.42);
  cockpitInterior.add(hud);
  group.add(cockpitInterior);

  if (isFighter) {
    // Sleek Teardrop Fighter Canopy snugly seated inside Titanium Frame Sill (with real articulated hinge!)
    const canopyPivot = new THREE.Group();
    const cLen = length * (isAcroJet ? 0.28 : 0.22);
    const cRearZ = -halfL * 0.06;
    canopyPivot.position.set(0, fuseY + fuseH * 0.18, cRearZ);

    const frameSill = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.56, 0.07, cLen, 0.02, 2, 8),
      mats.trim,
    );
    frameSill.position.set(0, 0.02, cLen * 0.5);
    canopyPivot.add(frameSill);

    const canopyGeo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
    canopyGeo.scale(fuseW * 0.27, fuseH * 0.36, cLen * 0.48);
    const canopy = new THREE.Mesh(canopyGeo, mats.glass);
    canopy.position.set(0, 0.02, cLen * 0.5);
    canopy.userData.noShadow = true;
    canopy.renderOrder = 2;
    canopyPivot.add(canopy);
    tagPart(canopyPivot, 'Canopy Caça com Moldura Titânio', 0, 0.45, 0.2);
    group.add(canopyPivot);
    if (!cityMode) {
      registerOpenable(animated, canopyPivot, 'Canopy do Caça', { x: -0.66 });
    }
  } else if (isBiplane) {
    // Classic padded leather cockpit coaming + small aero windscreen!
    const coaming = new THREE.Mesh(new THREE.TorusGeometry(fuseW * 0.30, 0.055, 8, 18), mats.interior);
    coaming.rotation.x = Math.PI / 2;
    coaming.position.set(0, fuseY + fuseH * 0.28, halfL * 0.08);
    const aeroScreen = new THREE.Mesh(
      createTrapezoidGlassGeo(fuseW * 0.50, fuseW * 0.38, 0.22, 0.02),
      mats.glass,
    );
    aeroScreen.position.set(0, fuseY + fuseH * 0.38, halfL * 0.28);
    aeroScreen.rotation.x = -0.45;
    aeroScreen.userData.noShadow = true;
    aeroScreen.renderOrder = 2;
    tagPart(aeroScreen, 'Para-brisa Clássico Biplano', 0, 0.35, 0.2);
    group.add(coaming, aeroScreen);
  } else {
    // Framed Multi-Pane Aircraft Flight-Deck Windshield (100% flush with stepped fuselage!)
    const wsBotZ = isConcorde ? halfL * 0.68 : isCargoProp || isLearJet ? halfL * 0.56 : halfL * 0.44;
    const wsTopZ = isConcorde ? halfL * 0.50 : isCargoProp || isLearJet ? halfL * 0.40 : halfL * 0.22;
    const wsBotY = fuseY + fuseH * 0.20;
    const wsTopY = fuseY + fuseH * (isConcorde ? 0.46 : 0.56);
    const wsLen = Math.hypot(wsBotZ - wsTopZ, wsTopY - wsBotY);
    const wsAngle = Math.atan2(wsBotZ - wsTopZ, wsTopY - wsBotY);

    const wsGlass = new THREE.Mesh(
      createTrapezoidGlassGeo(fuseW * 0.80, fuseW * 0.72, wsLen * 0.94, 0.025),
      mats.glass,
    );
    wsGlass.position.set(0, (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5);
    wsGlass.rotation.x = -wsAngle;
    wsGlass.userData.noShadow = true;
    wsGlass.renderOrder = 2;
    tagPart(wsGlass, 'Para-brisa Panorâmico da Cabine', 0, 0.35, 0.3);
    group.add(wsGlass);

    // Center windshield post + side A-pillars
    group.add(
      makeStrutBetween(
        new THREE.Vector3(0, wsBotY, wsBotZ + 0.01),
        new THREE.Vector3(0, wsTopY, wsTopZ + 0.01),
        0.022,
        0.024,
        mats.trim,
        6,
      ),
    );
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.41), wsBotY, wsBotZ),
          new THREE.Vector3(side * (fuseW * 0.37), wsTopY, wsTopZ),
          0.032,
          0.034,
          mats.body,
          8,
        ),
      );
      const sideCockpitWin = new THREE.Mesh(
        createRoundedBoxGeo(0.03, (wsTopY - wsBotY) * 0.72, (wsBotZ - wsTopZ) * 0.76, 0.015, 2, 6),
        mats.glass,
      );
      sideCockpitWin.position.set(side * (fuseW * 0.42), (wsBotY + wsTopY) * 0.5, (wsBotZ + wsTopZ) * 0.5 - 0.08);
      sideCockpitWin.userData.noShadow = true;
      group.add(sideCockpitWin);
    });
  }

  // Side passenger cabin porthole windows + folding airstair door for VIP / executive / cargo planes
  if (v.unitySpec.seats >= 4 && !isFighter) {
    const winCount = isConcorde ? 7 : Math.min(6, Math.max(2, Math.floor(v.unitySpec.seats / 2)));
    [-1, 1].forEach((side) => {
      for (let i = 0; i < winCount; i++) {
        const wz = length * 0.10 - i * (length * 0.065);
        const wPane = new THREE.Mesh(
          createRoundedBoxGeo(0.04, 0.20, 0.26, 0.04, 2, 6),
          mats.glass,
        );
        wPane.position.set(side * (fuseW * 0.425), fuseY + fuseH * 0.16, wz);
        wPane.userData.noShadow = true;
        group.add(wPane);
      }
    });

    if (!cityMode) {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-fuseW * 0.43, fuseY - fuseH * 0.16, length * 0.14);
      const stairDoor = new THREE.Mesh(
        createRoundedBoxGeo(0.06, fuseH * 0.54, 0.72, 0.02, 2, 8),
        mats.secondary,
      );
      stairDoor.position.set(0, fuseH * 0.26, 0);
      doorPivot.add(stairDoor);
      for (let st = 1; st <= 3; st++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.028, 0.54), mats.alloy);
        step.position.set(-0.08, st * (fuseH * 0.14), 0);
        doorPivot.add(step);
      }
      tagPart(doorPivot, 'Escada de Embarque / Porta Cabine', -0.45, 0, 0);
      group.add(doorPivot);
      registerOpenable(animated, doorPivot, 'Porta Escada Aeronave', { z: 1.48 });
    }
  }

  // Rear lowering cargo ramp on tactical cargo turboprop (VHC-91)
  if (!cityMode && isCargoProp) {
    const rampPivot = new THREE.Group();
    rampPivot.position.set(0, fuseY - fuseH * 0.22, -halfL * 0.56);
    const ramp = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.68, 0.09, length * 0.16, 0.02, 2, 8),
      mats.secondary,
    );
    ramp.position.set(0, 0, -length * 0.08);
    rampPivot.add(ramp);
    tagPart(rampPivot, 'Rampa Traseira de Carga', 0, -0.25, -0.5);
    group.add(rampPivot);
    registerOpenable(animated, rampPivot, 'Rampa de Carga', { x: -0.44 });
  }

  // 3. Sculpted Tapered Airfoil Wings + Wing Struts / Ornaments
  const isHighWing = isCessna || isSeaplane || isCargoProp;
  const wingY = isConcorde
    ? fuseY - fuseH * 0.18
    : isFighter || isLearJet || isKingAir
      ? fuseY - fuseH * 0.10
      : isBiplane
        ? fuseY - fuseH * 0.26
        : fuseY + fuseH * 0.44;
  const wingZ = isConcorde ? -length * 0.08 : isFighter ? -0.35 : 0.25;

  const mainWing = buildSculptedWing(
    width * 0.94,
    isConcorde ? length * 0.54 : isFighter ? length * 0.36 : length * 0.18,
    isConcorde ? 0.55 : isFighter ? length * 0.10 : length * 0.10,
    isConcorde ? length * 0.28 : isFighter ? length * 0.24 : isKingAir || isLearJet ? length * 0.11 : 0.22,
    isCargoProp ? 0.15 : 0.10,
    isKingAir || isLearJet ? 0.32 : isBiplane ? 0.18 : 0.04,
    mats,
    {
      hasWinglet: isKingAir || isLearJet,
      hasAileronAccent: true,
      hasFlapFairings: isKingAir || isCargoProp || isLearJet,
      isDelta: isConcorde || isF22,
      cityMode,
    },
  );
  mainWing.position.set(0, wingY, wingZ);
  tagPart(mainWing, isConcorde ? 'Asas Ogivais Duplo Delta' : isFighter ? 'Asas em Delta Enflechadas' : 'Asas Tapered com Flaps e Winglets', 0, 0.2, 0);
  group.add(mainWing);

  // Wingtip missiles & underwing drop tanks for F-22 / F-16
  if (g.attachments.includes('wingtip_missiles') || g.attachments.includes('drop_tanks')) {
    const tipZ = wingZ - (isFighter ? length * 0.24 : 0.22);
    [-1, 1].forEach((side) => {
      if (g.attachments.includes('wingtip_missiles')) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 1.35), mats.trim);
        rail.position.set(side * (width * 0.47 + 0.04), wingY + 0.04, tipZ);
        const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.92, 12), mats.liveryStripe);
        missile.rotation.x = Math.PI / 2;
        missile.position.set(side * (width * 0.47 + 0.11), wingY + 0.04, tipZ + 0.12);
        group.add(rail, missile);
      }
      if (g.attachments.includes('drop_tanks')) {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.72), mats.trim);
        pylon.position.set(side * (width * 0.26), wingY - 0.12, wingZ - 0.12);
        const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.75, 8, 16), mats.secondary);
        tank.rotation.x = Math.PI / 2;
        tank.position.set(side * (width * 0.26), wingY - 0.28, wingZ - 0.08);
        group.add(pylon, tank);
      }
    });
  }

  // Biplane upper wing + N-struts + cabane struts OR Cessna high-wing V-struts!
  if (isBiplane) {
    const upWingY = fuseY + fuseH * 0.92;
    const upperWing = buildSculptedWing(width * 0.92, length * 0.17, length * 0.14, 0.12, 0.09, 0.08, mats, {
      hasAileronAccent: true,
      cityMode,
    });
    upperWing.position.set(0, upWingY, wingZ + 0.22);
    tagPart(upperWing, 'Asa Superior Biplano com Cabane', 0, 0.55, 0);
    group.add(upperWing);
    [-1, 1].forEach((side) => {
      // Interplane N-struts + center cabane struts
      [0.32, 0.10].forEach((wx) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * width * wx, wx > 0.2 ? wingY : fuseY + fuseH * 0.36, wingZ + 0.18),
            new THREE.Vector3(side * width * wx, upWingY, wingZ + 0.32),
            0.026,
            0.026,
            mats.trim,
            8,
          ),
          makeStrutBetween(
            new THREE.Vector3(side * width * wx, wx > 0.2 ? wingY : fuseY + fuseH * 0.36, wingZ - 0.16),
            new THREE.Vector3(side * width * wx, upWingY, wingZ - 0.02),
            0.026,
            0.026,
            mats.trim,
            8,
          ),
        );
      });
    });
  } else if (isHighWing && !isCargoProp) {
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.42), fuseY - fuseH * 0.20, 0.25),
          new THREE.Vector3(side * (width * 0.26), wingY - 0.02, 0.28),
          0.028,
          0.028,
          mats.trim,
          8,
        ),
      );
    });
  }

  // 4. Sculpted Tail Empennage (T-Tail on King Air & LearJet, Canted Twin Fins on F-22, Swept Fin on others)
  const tailZ = -halfL + length * 0.12;
  const isTTail = isKingAir || isLearJet;
  const vFinH = height * (isTTail ? 0.46 : 0.44);

  if (isF22) {
    [-1, 1].forEach((side) => {
      const fin = buildSculptedFin(vFinH, length * 0.18, length * 0.08, 0.42, 0.065, mats.body, mats.accent, cityMode);
      fin.position.set(side * (fuseW * 0.48), fuseY + fuseH * 0.28, tailZ + 0.12);
      fin.rotation.z = -side * 0.32;
      tagPart(fin, 'Deriva Dupla Inclinada Stealth', side * 0.3, 0.35, -0.55);
      group.add(fin);
    });
  } else {
    const vFin = buildSculptedFin(vFinH, length * 0.16, length * 0.085, 0.38, 0.08, mats.body, mats.accent, cityMode);
    vFin.position.set(0, fuseY + fuseH * 0.22, tailZ + 0.10);
    tagPart(vFin, 'Estabilizador Vertical e Leme', 0, 0.45, -0.55);
    group.add(vFin);
  }

  // Horizontal stabilizer (no horizontal stab on pure-delta Concorde, T-tail high on King Air / LearJet!)
  if (!isConcorde) {
    const hStab = buildSculptedWing(
      width * (isFighter ? 0.48 : 0.34),
      length * 0.11,
      length * 0.055,
      isFighter || isTTail ? 0.28 : 0.10,
      0.06,
      isTTail ? 0 : 0.04,
      mats,
      { hasNavLights: false, hasAileronAccent: true, cityMode },
    );
    hStab.position.set(
      0,
      isTTail ? fuseY + fuseH * 0.22 + vFinH - 0.06 : fuseY + (isFighter ? 0.02 : fuseH * 0.16),
      isTTail ? tailZ - 0.26 : tailZ,
    );
    tagPart(hStab, isTTail ? 'Empenagem Horizontal T-Tail' : 'Estabilizador Horizontal', 0, 0.25, -0.55);
    group.add(hStab);
  }

  // 5. Propulsion (Detailed Turboprops w/ Scoops & Exhausts, Jet Nachos/Afterburners, Rear Lear Turbofans, Concorde Boxes)
  const makeSpinnerProp = (
    px: number,
    py: number,
    pz: number,
    propRadius: number,
    blades = 3,
  ) => {
    const pGrp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.30, 12), mats.trim);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.11;
    pGrp.add(shaft);
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 18), mats.chrome);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.14;
    pGrp.add(spinner);

    for (let b = 0; b < blades; b++) {
      const blade = new THREE.Mesh(
        createRoundedBoxGeo(0.085, propRadius * 1.85, 0.022, 0.008, 2, 6),
        mats.trim,
      );
      blade.rotation.z = (b / blades) * Math.PI * 2;
      blade.rotation.y = 0.28;
      pGrp.add(blade);
    }
    pGrp.position.set(px, py, pz);
    tagPart(pGrp, 'Hélice Aeronáutica Giratória', 0, 0, 0.6);
    group.add(pGrp);
    animated.propellers.push(pGrp);
  };

  if (isLearJet) {
    // Aft-fuselage mounted twin turbofan nacelles with intake rings & exhaust cones!
    [-1, 1].forEach((side) => {
      const nacX = side * (fuseW * 0.78);
      const nacY = fuseY + fuseH * 0.26;
      const nacZ = -halfL * 0.44;
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.42), nacY, nacZ),
          new THREE.Vector3(nacX, nacY, nacZ),
          0.08,
          0.08,
          mats.body,
          8,
        ),
      );
      const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 1.55, 18), mats.secondary);
      nac.rotation.x = Math.PI / 2;
      nac.position.set(nacX, nacY, nacZ);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 18), mats.chrome);
      ring.position.set(nacX, nacY, nacZ + 0.77);
      const fanFace = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.05, 14), mats.grille);
      fanFace.rotation.x = Math.PI / 2;
      fanFace.position.set(nacX, nacY, nacZ + 0.72);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 14), mats.trim);
      cone.rotation.x = -Math.PI / 2;
      cone.position.set(nacX, nacY, nacZ - 0.84);
      tagPart(nac, 'Turbina Turbofan Traseira', side * 0.35, 0.15, -0.35);
      group.add(nac, ring, fanFace, cone);
    });
  } else if (isConcorde) {
    // Twin underwing rectangular twin-engine Olympus boxes
    [-1, 1].forEach((side) => {
      const box = new THREE.Mesh(
        createRoundedBoxGeo(0.76, 0.36, 2.25, 0.05, 2, 8),
        mats.secondary,
      );
      box.position.set(side * (width * 0.20), wingY - 0.20, wingZ - 0.45);
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.08), mats.grille);
      intake.position.set(side * (width * 0.20), wingY - 0.20, wingZ + 0.68);
      group.add(box, intake);
      [-0.18, 0.18].forEach((nx) => {
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.42, 14), mats.trim);
        noz.rotation.x = Math.PI / 2;
        noz.position.set(side * (width * 0.20) + nx, wingY - 0.20, wingZ - 1.65);
        const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.44, 12), mats.sirenAmber);
        glow.rotation.x = Math.PI / 2;
        glow.position.copy(noz.position);
        group.add(noz, glow);
      });
    });
  } else if (isFighter) {
    const nozzleCount = isF22 || isAcroJet ? 2 : 1;
    for (let i = 0; i < nozzleCount; i++) {
      const nx = nozzleCount === 2 ? (i === 0 ? -fuseW * 0.28 : fuseW * 0.28) : 0;
      const nozzleGrp = new THREE.Group();
      const shroud = new THREE.Mesh(
        isF22
          ? createRoundedBoxGeo(0.42, 0.24, 0.62, 0.04, 2, 6)
          : new THREE.CylinderGeometry(0.28, 0.34, 0.62, 18),
        mats.trim,
      );
      if (!isF22) shroud.rotation.x = Math.PI / 2;
      nozzleGrp.add(shroud);
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.65, 14), mats.sirenAmber);
      glow.rotation.x = Math.PI / 2;
      nozzleGrp.add(glow);
      nozzleGrp.position.set(nx, fuseY, -halfL + 0.22);
      tagPart(nozzleGrp, 'Turbina Jato Pós-Combustor', nx * 0.3, 0, -0.65);
      group.add(nozzleGrp);
    }
    if (!isF16) {
      [-1, 1].forEach((side) => {
        const intake = new THREE.Mesh(
          createRoundedBoxGeo(0.30, 0.26, 0.95, 0.04, 2, 8),
          mats.grille,
        );
        intake.position.set(side * (fuseW * 0.48), fuseY - 0.02, length * 0.08);
        group.add(intake);
      });
    }
  } else if (isTwinProp) {
    // Detailed PT6 / C-130 turboprop nacelles with lower chin intake scoop + twin chrome exhaust stubs + 4-blade props!
    [-1, 1].forEach((side) => {
      const nacX = side * (width * 0.22);
      const nacY = wingY - 0.05;
      const nacZ = wingZ + 0.35;
      const nac = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.48, 1.55, 0.16, 3, 12),
        mats.secondary,
      );
      nac.position.set(nacX, nacY, nacZ);
      const chin = new THREE.Mesh(
        createRoundedBoxGeo(0.26, 0.14, 0.52, 0.04, 2, 6),
        mats.grille,
      );
      chin.position.set(nacX, nacY - 0.22, nacZ + 0.44);
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 10), mats.chrome);
      exhaust.rotation.z = side * 0.45;
      exhaust.position.set(nacX + side * 0.24, nacY - 0.04, nacZ + 0.30);
      tagPart(nac, 'Nacele Turboélice com Escapamento', side * 0.35, 0, 0.2);
      group.add(nac, chin, exhaust);
      makeSpinnerProp(nacX, nacY + 0.04, nacZ + 0.86, isCargoProp ? 1.05 : 0.84, 4);
    });
  } else {
    makeSpinnerProp(0, fuseY, halfL - 0.02, 0.92, isBiplane ? 2 : 3);
    [-1, 1].forEach((side) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10), mats.chrome);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * (fuseW * 0.34), fuseY - fuseH * 0.42, length * 0.24);
      group.add(pipe);
    });
  }

  // 6. Landing Gear / Amphibious Pontoons with Wheel Pants & Oleo Torque Links
  if (isSeaplane) {
    [-1, 1].forEach((side) => {
      const pontoon = new THREE.Mesh(
        createRoundedBoxGeo(0.48, 0.38, length * 0.56, 0.10, 3, 12),
        mats.secondary,
      );
      pontoon.position.set(side * 1.15, 0.22, 0.30);
      const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.18), mats.accent);
      rudder.position.set(side * 1.15, 0.16, 0.30 - length * 0.28);
      tagPart(pontoon, 'Flutuador Anfíbio com Leme', side * 0.4, -0.3, 0);
      group.add(pontoon, rudder);
      // Fore/aft struts + cross spreader bar
      [0.65, -0.45].forEach((sz) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * 1.15, 0.38, sz),
            new THREE.Vector3(side * (fuseW * 0.32), fuseY - fuseH * 0.32, sz - 0.08),
            0.035,
            0.035,
            mats.trim,
            8,
          ),
        );
      });
      group.add(
        makeStrutBetween(
          new THREE.Vector3(-1.15, 0.38, 0.25),
          new THREE.Vector3(1.15, 0.38, 0.25),
          0.024,
          0.024,
          mats.trim,
          6,
        ),
      );
    });
  } else {
    const wr = Math.max(0.20, g.wheelRadius || 0.26);
    const addGearPant = (gx: number, gy: number, gz: number, radius: number) => {
      if (!isCessna && !isBiplane) return;
      const pant = new THREE.Mesh(
        createRoundedBoxGeo(radius * 0.72, radius * 1.25, radius * 2.4, 0.08, 3, 10),
        mats.body,
      );
      pant.position.set(gx, gy + radius * 0.16, gz);
      group.add(pant);
    };

    if (isBiplane) {
      // Taildragger main gear forward + small tail wheel
      [-1, 1].forEach((side) => {
        const mg = createCraftedWheel(wr, wr * 0.56, wheelStyle, mats, side > 0, false, cityMode);
        mg.position.set(side * (fuseW * 0.85), wr, length * 0.18);
        group.add(mg);
        animated.wheels.push(mg);
        addGearPant(side * (fuseW * 0.85), wr, length * 0.18, wr);
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * (fuseW * 0.85), wr, length * 0.18),
            new THREE.Vector3(side * (fuseW * 0.32), fuseY - fuseH * 0.32, length * 0.14),
            0.032,
            0.036,
            mats.chrome,
            8,
          ),
        );
      });
      const tw = createCraftedWheel(wr * 0.48, wr * 0.34, wheelStyle, mats, true, false, cityMode);
      tw.position.set(0, wr * 0.48, -halfL + 0.45);
      group.add(
        tw,
        makeStrutBetween(
          new THREE.Vector3(0, wr * 0.48, -halfL + 0.45),
          new THREE.Vector3(0, fuseY - fuseH * 0.14, -halfL + 0.58),
          0.022,
          0.024,
          mats.trim,
          6,
        ),
      );
      animated.wheels.push(tw);
    } else {
      const noseZ = length * (isConcorde ? 0.24 : 0.30);
      const noseGear = createCraftedWheel(wr * 0.80, wr * 0.52, wheelStyle, mats, true, false, cityMode);
      noseGear.position.set(0, wr * 0.80, noseZ);
      group.add(noseGear);
      animated.wheels.push(noseGear);
      addGearPant(0, wr * 0.80, noseZ, wr * 0.80);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(0, wr * 0.80, noseZ),
          new THREE.Vector3(0, fuseY - fuseH * 0.32, noseZ - 0.08),
          0.036,
          0.042,
          mats.chrome,
          8,
        ),
      );

      // Cargo plane side gear sponsons + tandem main wheels
      if (isCargoProp) {
        [-1, 1].forEach((side) => {
          const sponson = new THREE.Mesh(
            createRoundedBoxGeo(0.55, 0.65, 2.25, 0.12, 3, 10),
            mats.secondary,
          );
          sponson.position.set(side * (fuseW * 0.56), fuseY - fuseH * 0.25, -0.35);
          group.add(sponson);
        });
      }

      const mainZ = isConcorde ? -0.85 : -0.35;
      [-1, 1].forEach((side) => {
        const mx = side * (isCargoProp ? fuseW * 0.62 : fuseW * 0.92);
        const mainGear = createCraftedWheel(wr, wr * 0.62, wheelStyle, mats, side > 0, isCargoProp || isConcorde, cityMode);
        mainGear.position.set(mx, wr, mainZ);
        tagPart(mainGear, 'Trem de Pouso Principal', side * 0.35, -0.25, 0);
        group.add(mainGear);
        animated.wheels.push(mainGear);
        addGearPant(mx, wr, mainZ, wr);
        group.add(
          makeStrutBetween(
            new THREE.Vector3(mx, wr, mainZ),
            new THREE.Vector3(side * (fuseW * 0.36), fuseY - fuseH * 0.30, mainZ),
            0.04,
            0.046,
            mats.chrome,
            8,
          ),
        );
      });
    }
  }

  enableShadows(group);
  return group;
}
