import * as THREE from 'three';
import { VehicleConcept, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createBeveledHeadlightAssembly,
  createBeveledRoundHeadlightUnit,
  createEngineBayAssembly,
  createExtrudedProfile,
  createHeadlightBeamMesh,
  createLicensePlateGroup,
  createRoundedBoxGeo,
  createSculptedPanelGeo,
  enableShadows,
  makeStrutBetween,
  registerOpenable,
  tagMechPart,
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
      if (side > 0 && opts.style !== 'scooter') {
        const resStem = makeStrutBetween(
          new THREE.Vector3(gStart.x - 0.012, gStart.y + 0.01, gStart.z + 0.01),
          new THREE.Vector3(gStart.x - 0.018, gStart.y + 0.042, gStart.z + 0.022),
          0.004,
          0.004,
          mats.trim,
          6,
        );
        const resCup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.014, 0.024, 10),
          mats.glass,
        );
        resCup.position.set(gStart.x - 0.018, gStart.y + 0.050, gStart.z + 0.022);
        const resCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.016, 0.008, 10),
          mats.trim,
        );
        resCap.position.set(gStart.x - 0.018, gStart.y + 0.063, gStart.z + 0.022);
        barGrp.add(resStem, resCup, resCap);
      }

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
      const mirMid = new THREE.Vector3(mBase.x + side * 0.032, mBase.y + 0.078, mBase.z - 0.008);
      const mirTop = new THREE.Vector3(mBase.x + side * 0.088, mBase.y + 0.118, mBase.z - 0.032);

      const clampBoss = new THREE.Mesh(
        new THREE.CylinderGeometry(0.019, 0.021, 0.032, 10),
        mats.trim,
      );
      clampBoss.position.copy(mBase);
      const lockNut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.015, 0.016, 6),
        mats.chrome,
      );
      lockNut.position.set(mBase.x, mBase.y + 0.018, mBase.z);

      const stalkCurve = new THREE.CatmullRomCurve3([mBase, mirMid, mirTop]);
      const stalkMat = opts.style === 'cruiser' ? mats.chrome : mats.trim;
      const stalk = new THREE.Mesh(
        new THREE.TubeGeometry(stalkCurve, cityMode ? 8 : 14, 0.0075, 8, false),
        stalkMat,
      );
      const ballJoint = new THREE.Mesh(
        new THREE.SphereGeometry(0.013, 10, 8),
        mats.alloy,
      );
      ballJoint.position.copy(mirTop);

      const podGrp = new THREE.Group();
      podGrp.position.set(mirTop.x + side * 0.034, mirTop.y + 0.006, mirTop.z - 0.006);
      podGrp.rotation.y = side * -0.22;
      podGrp.rotation.z = side * 0.06;

      const shellGeo = createSculptedPanelGeo(
        0.122,
        0.064,
        0.038,
        8,
        5,
        4,
        0.018,
        (pos, idx, hx, hy) => {
          const px = pos.getX(idx);
          const py = pos.getY(idx);
          const pz = pos.getZ(idx);
          const nx = THREE.MathUtils.clamp((px * side) / Math.max(0.02, hx), -1, 1);
          const ny = THREE.MathUtils.clamp(py / Math.max(0.01, hy), -1, 1);
          // Teardrop taper toward outer tip + aerodynamic nose dome forward
          const outerTaper = nx > 0 ? 1 - Math.pow(nx, 1.5) * 0.34 : 1 - Math.pow(-nx, 1.8) * 0.14;
          const domeFwd = pz > 0 ? (1 - Math.abs(ny) * 0.55) * (1 - Math.abs(nx) * 0.45) * 0.016 : 0;
          pos.setXYZ(idx, px, py * outerTaper, pz + domeFwd);
        },
      );
      const podShell = new THREE.Mesh(shellGeo, opts.style === 'cruiser' ? mats.chrome : mats.trim);
      const podBezel = new THREE.Mesh(
        createRoundedBoxGeo(0.104, 0.052, 0.010, 0.006, 2, 8),
        mats.grille,
      );
      podBezel.position.z = -0.015;
      const face = new THREE.Mesh(
        createRoundedBoxGeo(0.094, 0.044, 0.008, 0.006, 2, 8),
        mats.mirrorGlass,
      );
      face.position.z = -0.018;
      podGrp.add(podShell, podBezel, face);
      barGrp.add(clampBoss, lockNut, stalk, ballJoint, podGrp);
    }
  });

  tagPart(barGrp, 'Guidão Conectado, Mesa & Retrovisores', 0, 0.48, 0.18);
  group.add(barGrp);
  return barGrp;
}

interface MotoLoftStation {
  z: number;
  cy: number;
  rx: number;
  ryTop: number;
  ryBot: number;
  topTaper?: number;
  botTaper?: number;
  bottomArch?: number;
}

function createLoftedMotoShell(
  stations: MotoLoftStation[],
  radialSegs = 16,
  longSegs = 14,
): THREE.BufferGeometry {
  const nSt = stations.length;
  const lerpStation = (t: number): MotoLoftStation => {
    const s = THREE.MathUtils.clamp(t, 0, 1) * (nSt - 1);
    const i0 = Math.min(nSt - 2, Math.floor(s));
    const i1 = i0 + 1;
    const f = s - i0;
    // Smooth cosine blend for silky aerodynamic longitudinal curvature
    const u = f * f * (3 - 2 * f);
    const a = stations[i0];
    const b = stations[i1];
    return {
      z: THREE.MathUtils.lerp(a.z, b.z, u),
      cy: THREE.MathUtils.lerp(a.cy, b.cy, u),
      rx: THREE.MathUtils.lerp(a.rx, b.rx, u),
      ryTop: THREE.MathUtils.lerp(a.ryTop, b.ryTop, u),
      ryBot: THREE.MathUtils.lerp(a.ryBot, b.ryBot, u),
      topTaper: THREE.MathUtils.lerp(a.topTaper ?? 0, b.topTaper ?? 0, u),
      botTaper: THREE.MathUtils.lerp(a.botTaper ?? 0, b.botTaper ?? 0, u),
      bottomArch: THREE.MathUtils.lerp(a.bottomArch ?? 0, b.bottomArch ?? 0, u),
    };
  };

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= longSegs; i++) {
    const v = i / longSegs;
    const st = lerpStation(v);
    const topTap = st.topTaper ?? 0;
    const botTap = st.botTaper ?? 0;
    const arch = st.bottomArch ?? 0;
    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);
      const widthScale =
        1 - Math.max(0, cosT) * topTap - Math.max(0, -cosT) * botTap;
      const x = sinT * st.rx * Math.max(0.15, widthScale);
      let y = st.cy + (cosT >= 0 ? cosT * st.ryTop : cosT * st.ryBot);
      if (cosT < 0 && arch > 0) {
        y += arch * Math.pow(-cosT, 1.3) * (1 - Math.abs(sinT) * 0.45);
      }
      positions.push(x, y, st.z);
      uvs.push(j / radialSegs, v);
    }
  }

  for (let i = 0; i < longSegs; i++) {
    const rowA = i * radialSegs;
    const rowB = (i + 1) * radialSegs;
    for (let j = 0; j < radialSegs; j++) {
      const jNext = (j + 1) % radialSegs;
      const a = rowA + j;
      const b = rowA + jNext;
      const c = rowB + j;
      const d = rowB + jNext;
      indices.push(a, c, b);
      indices.push(c, d, b);
    }
  }

  // Rear & Front end caps
  const rearCenterIdx = positions.length / 3;
  positions.push(0, stations[0].cy, stations[0].z);
  uvs.push(0.5, 0);
  for (let j = 0; j < radialSegs; j++) {
    const jNext = (j + 1) % radialSegs;
    indices.push(rearCenterIdx, j, jNext);
  }

  const frontCenterIdx = positions.length / 3;
  const lastSt = stations[nSt - 1];
  const lastRow = longSegs * radialSegs;
  positions.push(0, lastSt.cy, lastSt.z);
  uvs.push(0.5, 1);
  for (let j = 0; j < radialSegs; j++) {
    const jNext = (j + 1) % radialSegs;
    indices.push(frontCenterIdx, lastRow + jNext, lastRow + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
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
    const trikeRearR = g.wheelRadius * 1.06;
    const hullRearZ = rZ + trikeRearR + 0.045;
    const hullFrontZ = length * 0.38;
    const hullLen = Math.max(0.85, hullFrontZ - hullRearZ);
    const hull = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.36, 0.38, hullLen, 0.09, cityMode ? 2 : 5, 14),
      mats.body,
    );
    hull.position.set(0, g.groundClearance + 0.32, (hullFrontZ + hullRearZ) * 0.5);
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
      const knuckleInnerX = side * (width * 0.44 - g.wheelWidth * 0.42 - 0.035);
      const lowerArm = makeStrutBetween(
        new THREE.Vector3(side * width * 0.14, g.wheelRadius - 0.02, fZ),
        new THREE.Vector3(knuckleInnerX, g.wheelRadius - 0.02, fZ),
        0.02,
        0.02,
        mats.trim,
        8,
      );
      tagMechPart(lowerArm, 'wishbones', 'Bandeja Inferior Trike', side * 0.2, -0.05, 0);
      const upperArm = makeStrutBetween(
        new THREE.Vector3(side * width * 0.14, g.wheelRadius + 0.11, fZ - 0.02),
        new THREE.Vector3(knuckleInnerX, g.wheelRadius + 0.07, fZ),
        0.016,
        0.016,
        mats.alloy,
        8,
      );
      tagMechPart(upperArm, 'wishbones', 'Bandeja Superior Trike', side * 0.2, -0.05, 0);
      const fShock = buildCoilShockMesh(
        new THREE.Vector3(side * width * 0.30, g.wheelRadius, fZ),
        new THREE.Vector3(side * width * 0.17, g.groundClearance + 0.38, fZ - 0.06),
        0.03,
        0.008,
        5,
        mats.trim,
        mats.accent,
        cityMode,
      );
      tagMechPart(fShock, 'shocks_springs', 'Amortecedor Dianteiro Trike', side * 0.2, 0.05, 0);
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
        true,
      );
      tagPart(fw, 'Roda Dianteira Trike', side * 0.45, -0.05, 0);
      steerPivot.add(fw);
      // Knuckle upright + inner brake disc & caliper anchored to steerPivot
      const knuckle = makeStrutBetween(
        new THREE.Vector3(-side * (g.wheelWidth * 0.42 + 0.035), -0.04, 0),
        new THREE.Vector3(-side * (g.wheelWidth * 0.42 + 0.02), 0.08, 0),
        0.018,
        0.016,
        mats.alloy,
        8,
      );
      tagMechPart(knuckle, 'knuckle_tie_rods', 'Manga de Eixo Trike', side * 0.3, -0.05, 0);
      const tDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(g.wheelRadius * 0.48, g.wheelRadius * 0.48, 0.014, 18).rotateZ(Math.PI / 2),
        mats.brakeDisc,
      );
      tDisc.position.x = -side * (g.wheelWidth * 0.36);
      const tCal = new THREE.Mesh(
        createRoundedBoxGeo(0.038, 0.075, 0.052, 0.01, 2, 6),
        mats.caliper,
      );
      tCal.position.set(-side * (g.wheelWidth * 0.36), g.wheelRadius * 0.28, -g.wheelRadius * 0.28);
      steerPivot.add(knuckle, tDisc, tCal);
      group.add(steerPivot);
      animated.steeringPivots.push(steerPivot);
      animated.wheels.push(fw);

      const hl = createBeveledHeadlightAssembly(
        {
          width: 0.155,
          height: 0.078,
          depth: 0.056,
          style: 'twin_projector',
          side: side as -1 | 1,
          frameMat: mats.grille,
        },
        mats,
        cityMode,
      );
      hl.position.set(side * width * 0.16, g.groundClearance + 0.36, length * 0.445);
      tagPart(hl, side < 0 ? 'Farol Dianteiro Esquerdo' : 'Farol Dianteiro Direito', side * 0.15, 0.08, 0.35);
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
      true,
    );
    rearW.position.set(0, g.wheelRadius * 1.06, rZ);
    tagPart(rearW, 'Roda Traseira Larga', 0, -0.05, -0.4);
    group.add(rearW);
    animated.wheels.push(rearW);

    // Connected Trike rear swingarm + rear axle connecting hull cleanly to rearW
    const trikeRearW = g.wheelWidth * 1.45;
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 0.14, g.groundClearance + 0.16, -length * 0.18),
          new THREE.Vector3(side * (trikeRearW * 0.56 + 0.025), g.wheelRadius * 1.06, rZ),
          0.024,
          0.024,
          mats.alloy,
          8,
        ),
      );
    });
    const trikeRearAxle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, trikeRearW + 0.09, 10).rotateZ(Math.PI / 2),
      mats.chrome,
    );
    trikeRearAxle.position.set(0, g.wheelRadius * 1.06, rZ);
    group.add(trikeRearAxle);

    const rearTlY = Math.max(g.groundClearance + 0.48, trikeRearR * 2 + 0.06);
    const rearTlZ = Math.min(-length * 0.43, rZ - trikeRearR - 0.03);
    const rearTl = new THREE.Mesh(
      createRoundedBoxGeo(0.22, 0.055, 0.045, 0.015, 2, 8),
      mats.taillight,
    );
    rearTl.position.set(0, rearTlY, rearTlZ);
    group.add(rearTl);
    [-1, 1].forEach((side) => {
      const tailArm = makeStrutBetween(
        new THREE.Vector3(side * (trikeRearW * 0.52 + 0.03), trikeRearR, rZ),
        new THREE.Vector3(side * 0.14, rearTlY - 0.01, rearTlZ + 0.02),
        0.014,
        0.014,
        mats.alloy,
        6,
      );
      const blinkR = new THREE.Mesh(
        createRoundedBoxGeo(0.06, 0.035, 0.04, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkR.position.set(side * 0.17, rearTlY, rearTlZ);
      group.add(tailArm, blinkR);
    });

    const trikePlateY = Math.max(g.groundClearance + 0.34, rearTlY - 0.14);
    const trikePlateZ = Math.min(-length * 0.455, rZ - trikeRearR - 0.055);
    const trikeBracket = makeStrutBetween(
      new THREE.Vector3(0, rearTlY - 0.02, rearTlZ + 0.01),
      new THREE.Vector3(0, trikePlateY + 0.03, trikePlateZ + 0.012),
      0.016,
      0.016,
      mats.trim,
      6,
    );
    const trikePlate = createLicensePlateGroup(
      { variant: 'moto', isRear: true, width: 0.21, height: 0.145 },
      mats,
      cityMode,
    );
    trikePlate.position.set(0, trikePlateY, trikePlateZ);
    trikePlate.rotation.x = -0.18;
    tagPart(trikePlate, 'Placa Traseira Triciclo', 0, -0.05, -0.42);
    group.add(trikeBracket, trikePlate);

    // Outboard dual sport mufflers flanking clear outside the wide center rear tire
    const trikeExX = trikeRearW * 0.5 + 0.085;
    [-1, 1].forEach((side) => {
      const exPipe = makeStrutBetween(
        new THREE.Vector3(side * 0.13, g.groundClearance + 0.14, 0.02),
        new THREE.Vector3(side * trikeExX, g.groundClearance + 0.18, rZ + 0.16),
        0.022,
        0.022,
        mats.alloy,
        8,
      );
      const muffler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.038, 0.42, 10).rotateX(Math.PI / 2 - 0.12),
        mats.chrome,
      );
      muffler.position.set(side * trikeExX, g.groundClearance + 0.21, rZ - 0.03);
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.030, 0.030, 0.04, 10).rotateX(Math.PI / 2 - 0.12),
        mats.exhaustBore,
      );
      tip.position.set(side * trikeExX, g.groundClearance + 0.235, rZ - 0.23);
      tagPart(muffler, 'Escapamento Duplo Trike', side * 0.35, -0.05, -0.2);
      group.add(exPipe, muffler, tip);
    });
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
      const knuckle = makeStrutBetween(hubPtL, hubPtU, 0.018, 0.016, mats.trim, 8);
      const hubSpindle = makeStrutBetween(
        new THREE.Vector3(side * (wheelX - 0.06), g.wheelRadius, fZ),
        new THREE.Vector3(side * wheelX, g.wheelRadius, fZ),
        0.022,
        0.022,
        mats.alloy,
        8,
      );
      const rSwing = makeStrutBetween(
        new THREE.Vector3(side * 0.13, baseChassisY + 0.10, -0.18),
        new THREE.Vector3(side * (wheelX - 0.06), g.wheelRadius, rZ),
        0.02,
        0.022,
        mats.alloy,
        8,
      );
      group.add(fArmL, fArmU, fShock, knuckle, hubSpindle, rSwing);
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

    // 5. Beveled Recessed LED Headlight Bar with Translucent Lens + Turn Signals + Rear Plate + Beams
    const hlBar = createBeveledHeadlightAssembly(
      {
        width: width * 0.44,
        height: 0.068,
        depth: 0.052,
        style: 'bar',
        side: 0,
        frameMat: mats.trim,
      },
      mats,
      cityMode,
    );
    hlBar.position.set(0, baseChassisY + 0.38, halfL * 0.905);
    hlBar.rotation.x = 0.22;
    tagPart(hlBar, 'Farol LED Dianteiro Quadriciclo', 0, 0.12, 0.38);
    const tlBar = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.36, 0.045, 0.045, 0.01, 2, 6),
      mats.taillight,
    );
    tlBar.position.set(0, baseChassisY + 0.48, -halfL * 0.88);
    group.add(hlBar, tlBar);

    const atvPlateY = baseChassisY + 0.34;
    const atvPlateZ = -halfL * 0.915;
    const atvBracket = makeStrutBetween(
      new THREE.Vector3(0, baseChassisY + 0.47, -halfL * 0.86),
      new THREE.Vector3(0, atvPlateY + 0.03, atvPlateZ + 0.012),
      0.015,
      0.015,
      mats.trim,
      6,
    );
    const atvPlate = createLicensePlateGroup(
      { variant: 'moto', isRear: true, width: 0.21, height: 0.145 },
      mats,
      cityMode,
    );
    atvPlate.position.set(0, atvPlateY, atvPlateZ);
    atvPlate.rotation.x = -0.18;
    tagPart(atvPlate, 'Placa Traseira Quadriciclo', 0, -0.05, -0.40);
    group.add(atvBracket, atvPlate);

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
          true,
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
  const headY = isCruiser
    ? g.groundClearance + 0.68
    : isDirt
      ? g.groundClearance + 0.78
      : isFairedSport
        ? g.groundClearance + 0.62
        : g.groundClearance + 0.70;
  const rearWidth = g.wheelWidth * (isFairedSport || isCruiser ? 1.32 : 1.2);
  const forkSpanX = Math.max(isScooter ? 0.105 : 0.125, g.wheelWidth * 0.62 + 0.034);
  const rearSwingSpanX = Math.max(0.145, rearWidth * 0.62 + 0.034);
  const forkMat = isFairedSport || isDirt ? mats.accent : mats.chrome;
  const sliderMat = isCruiser || isNaked ? mats.trim : mats.alloy;

  const frontForkPivot = new THREE.Group();
  frontForkPivot.position.set(0, headY, headZ);
  group.add(frontForkPivot);
  animated.steeringPivots.push(frontForkPivot);

  const frontAxleLocal = new THREE.Vector3(0, g.wheelRadius - headY, fZ - headZ);

  // 1. Front & Rear Crafted Wheels + Connected Axles + Floating Brake Discs + Fork/Swingarm Calipers + Chain/Sprocket
  const frontW = createCraftedWheel(
    g.wheelRadius,
    g.wheelWidth,
    wheelStyle,
    mats,
    true,
    false,
    cityMode,
    true,
  );
  frontW.position.copy(frontAxleLocal);
  tagPart(frontW, 'Roda Dianteira', 0, -0.05, 0.35);
  frontForkPivot.add(frontW);
  animated.wheels.push(frontW);

  const rearW = createCraftedWheel(
    g.wheelRadius,
    rearWidth,
    wheelStyle,
    mats,
    true,
    false,
    cityMode,
    true,
  );
  rearW.position.set(0, g.wheelRadius, rZ);
  tagPart(rearW, 'Roda Traseira', 0, -0.05, -0.35);
  group.add(rearW);
  animated.wheels.push(rearW);

  // Front Through-Axle Shaft + Hub Spacers + Dual/Single Floating Brake Rotors & Fork-Mounted Radial Calipers
  const fAxleShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, forkSpanX * 2 + 0.032, 12).rotateZ(Math.PI / 2),
    mats.chrome,
  );
  fAxleShaft.position.copy(frontAxleLocal);
  frontForkPivot.add(fAxleShaft);

  const frontDiscSides = isFairedSport || v.id === 72 || v.id === 78 ? [-1, 1] : [1];
  const fDiscR = g.wheelRadius * (isScooter ? 0.46 : 0.56);
  const fDiscXOffset = g.wheelWidth * 0.60 + 0.012;

  [-1, 1].forEach((side) => {
    const fSpacer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, Math.max(0.014, forkSpanX - g.wheelWidth * 0.34), 12).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    fSpacer.position.set(
      side * ((forkSpanX + g.wheelWidth * 0.34) * 0.5),
      frontAxleLocal.y,
      frontAxleLocal.z,
    );
    const axleNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.022, 6).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    axleNut.position.set(side * (forkSpanX + 0.012), frontAxleLocal.y, frontAxleLocal.z);
    frontForkPivot.add(fSpacer, axleNut);
  });

  frontDiscSides.forEach((side) => {
    const fDiscX = side * fDiscXOffset;
    const fDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(fDiscR, fDiscR, 0.010, cityMode ? 14 : 24).rotateZ(Math.PI / 2),
      mats.brakeDisc,
    );
    fDisc.position.set(fDiscX, frontAxleLocal.y, frontAxleLocal.z);
    const fCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(fDiscR * 0.52, fDiscR * 0.56, 0.014, 16).rotateZ(Math.PI / 2),
      mats.trim,
    );
    fCarrier.position.set(fDiscX, frontAxleLocal.y, frontAxleLocal.z);
    frontForkPivot.add(fDisc, fCarrier);

    if (!cityMode) {
      for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2;
        const bobbin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.016, 6).rotateZ(Math.PI / 2),
          mats.accent,
        );
        bobbin.position.set(
          fDiscX,
          frontAxleLocal.y + Math.cos(ang) * fDiscR * 0.55,
          frontAxleLocal.z + Math.sin(ang) * fDiscR * 0.55,
        );
        frontForkPivot.add(bobbin);
      }
    }

    // Radial Brake Caliper bolted via bracket directly onto lower fork lug behind axle
    const calY = frontAxleLocal.y + fDiscR * 0.14;
    const calZ = frontAxleLocal.z - fDiscR * 0.72;
    const calBody = new THREE.Mesh(
      createRoundedBoxGeo(0.036, 0.088, 0.056, 0.012, 2, 6),
      mats.caliper,
    );
    calBody.position.set(side * (fDiscXOffset + 0.004), calY, calZ);
    calBody.rotation.x = 0.25;
    const calMount = makeStrutBetween(
      new THREE.Vector3(side * forkSpanX, frontAxleLocal.y, frontAxleLocal.z),
      new THREE.Vector3(side * forkSpanX, calY, calZ),
      0.014,
      0.012,
      sliderMat,
      8,
    );
    frontForkPivot.add(calBody, calMount);

    if (!cityMode) {
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * (fDiscXOffset + 0.008), calY + 0.035, calZ),
        new THREE.Vector3(side * (forkSpanX + 0.016), frontAxleLocal.y + 0.22, frontAxleLocal.z - 0.04),
        new THREE.Vector3(side * (forkSpanX * 0.85), -0.12, 0.03),
      ]);
      const brakeHose = new THREE.Mesh(
        new THREE.TubeGeometry(hoseCurve, 12, 0.0045, 6, false),
        mats.trim,
      );
      frontForkPivot.add(brakeHose);
    }
  });

  // Rear Through-Axle Shaft, Chain Adjuster Blocks, Countershaft + Rear Sprocket, Rear Brake Disc & Caliper
  const sprocketX = -(rearWidth * 0.5 + 0.014);
  const rAxleShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, rearSwingSpanX * 2 + 0.034, 12).rotateZ(Math.PI / 2),
    mats.chrome,
  );
  rAxleShaft.position.set(0, g.wheelRadius, rZ);
  group.add(rAxleShaft);

  [-1, 1].forEach((side) => {
    const rSpacer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, Math.max(0.014, rearSwingSpanX - rearWidth * 0.34), 12).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    rSpacer.position.set(side * ((rearSwingSpanX + rearWidth * 0.34) * 0.5), g.wheelRadius, rZ);
    const adjBlock = new THREE.Mesh(
      createRoundedBoxGeo(0.024, 0.046, 0.068, 0.008, 2, 6),
      mats.trim,
    );
    adjBlock.position.set(side * rearSwingSpanX, g.wheelRadius, rZ);
    const rNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.020, 0.020, 0.022, 6).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    rNut.position.set(side * (rearSwingSpanX + 0.014), g.wheelRadius, rZ);
    group.add(rSpacer, adjBlock, rNut);
  });

  if (!isScooter) {
    const rSprocket = new THREE.Mesh(
      new THREE.CylinderGeometry(g.wheelRadius * 0.38, g.wheelRadius * 0.38, 0.014, 20).rotateZ(Math.PI / 2),
      mats.alloy,
    );
    rSprocket.position.set(sprocketX, g.wheelRadius, rZ);
    const sprocketCarrier = new THREE.Mesh(
      new THREE.CylinderGeometry(g.wheelRadius * 0.24, g.wheelRadius * 0.26, 0.020, 14).rotateZ(Math.PI / 2),
      mats.trim,
    );
    sprocketCarrier.position.set(sprocketX + 0.006, g.wheelRadius, rZ);
    group.add(rSprocket, sprocketCarrier);
  }

  // Rear Drilled Brake Disc + Swingarm-Mounted Rear Caliper on Right Side
  const rDiscX = rearWidth * 0.5 + 0.012;
  const rDiscR = g.wheelRadius * 0.42;
  const rDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(rDiscR, rDiscR, 0.010, 18).rotateZ(Math.PI / 2),
    mats.brakeDisc,
  );
  rDisc.position.set(rDiscX, g.wheelRadius, rZ);
  const rCal = new THREE.Mesh(
    createRoundedBoxGeo(0.034, 0.062, 0.048, 0.01, 2, 6),
    isFairedSport || v.id === 72 ? mats.caliper : mats.alloy,
  );
  rCal.position.set(rDiscX + 0.004, g.wheelRadius + rDiscR * 0.72, rZ + rDiscR * 0.28);
  const rCalBracket = makeStrutBetween(
    new THREE.Vector3(rearSwingSpanX, g.wheelRadius, rZ),
    new THREE.Vector3(rearSwingSpanX, g.wheelRadius + rDiscR * 0.72, rZ + rDiscR * 0.28),
    0.012,
    0.012,
    mats.alloy,
    6,
  );
  group.add(rDisc, rCal, rCalBracket);

  // 2. Steering Head, Upper & Lower Triple Clamps, Stem Nut, USD/Telescopic Forks & Front Fender
  const neck = makeStrutBetween(
    new THREE.Vector3(0, -0.14, 0.05),
    new THREE.Vector3(0, 0.04, -0.02),
    0.036,
    0.038,
    mats.trim,
    10,
  );
  const stemNut = new THREE.Mesh(
    new THREE.CylinderGeometry(0.020, 0.022, 0.018, 6),
    mats.chrome,
  );
  stemNut.position.set(0, 0.042, -0.012);
  frontForkPivot.add(neck, stemNut);

  [0.02, -0.13].forEach((dy, idx) => {
    const clamp = new THREE.Mesh(
      createRoundedBoxGeo(forkSpanX * 2.45, 0.032, 0.085, 0.012, 2, 8),
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
    const axleLug = new THREE.Mesh(
      createRoundedBoxGeo(0.040, 0.056, 0.058, 0.012, 2, 6),
      sliderMat,
    );
    axleLug.position.copy(botPt);
    const preloadCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.020, 0.022, 0.016, 10),
      mats.accent,
    );
    preloadCap.position.set(topPt.x, topPt.y + 0.008, topPt.z);
    tagPart(upperStanchion, 'Suspensão Dianteira (Garfo)', side * 0.25, 0.2, 0.25);
    frontForkPivot.add(lowerTube, upperStanchion, axleLug, preloadCap);

    if (!cityMode) {
      const reflector = new THREE.Mesh(
        createRoundedBoxGeo(0.010, 0.042, 0.022, 0.004, 1, 4),
        mats.signalRight,
      );
      reflector.position.set(
        side * (forkSpanX + 0.022),
        THREE.MathUtils.lerp(botPt.y, midPt.y, 0.45),
        THREE.MathUtils.lerp(botPt.z, midPt.z, 0.45),
      );
      frontForkPivot.add(reflector);
    }
  });

  // Front Fender (High motocross beak on dirtbikes, concentric sculpted hugger + stays on sportbikes, valanced arc + stays on others)
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
  } else if (isFairedSport) {
    const fenderR = g.wheelRadius * 1.11;
    const fFenderGeo = createSculptedPanelGeo(
      g.wheelWidth * 1.14,
      0.028,
      g.wheelRadius * 1.32,
      6,
      2,
      10,
      0.012,
      (pos, idx, hx, _hy, hz) => {
        const px = pos.getX(idx);
        const py = pos.getY(idx);
        const pz = pos.getZ(idx);
        const nx = THREE.MathUtils.clamp(Math.abs(px) / Math.max(0.02, hx), 0, 1);
        const nz = THREE.MathUtils.clamp(pz / Math.max(0.05, hz), -1, 1);
        const circArc = Math.sqrt(Math.max(0.002, fenderR * fenderR - pz * pz)) - fenderR;
        const sideDrop = -Math.pow(nx, 2) * 0.038;
        const tipTaper = nz > 0.38 ? 1 - ((nz - 0.38) / 0.62) * 0.28 : 1;
        pos.setXYZ(idx, px * tipTaper, py + circArc + sideDrop, pz);
      },
    );
    const fFender = new THREE.Mesh(fFenderGeo, mats.body);
    fFender.position.set(0, frontAxleLocal.y + fenderR, frontAxleLocal.z);
    fFender.rotation.x = 0.02;
    frontForkPivot.add(fFender);

    // Side fender stay brackets connecting fender wings down to lower fork sliders
    [-1, 1].forEach((side) => {
      const fStay = makeStrutBetween(
        new THREE.Vector3(side * forkSpanX, frontAxleLocal.y + g.wheelRadius * 0.56, frontAxleLocal.z - 0.06),
        new THREE.Vector3(side * (g.wheelWidth * 0.54), frontAxleLocal.y + fenderR * 0.86, frontAxleLocal.z + 0.04),
        0.012,
        0.010,
        mats.trim,
        6,
      );
      frontForkPivot.add(fStay);
    });
  } else {
    const fenderArc = isCruiser ? Math.PI * 0.68 : Math.PI * 0.55;
    const fTubeR = isCruiser ? 0.034 : 0.030;
    const fTorusR = g.wheelRadius + fTubeR + 0.024;
    const fFender = new THREE.Mesh(
      new THREE.TorusGeometry(fTorusR, fTubeR, 8, 18, fenderArc),
      mats.body,
    );
    fFender.rotation.y = Math.PI / 2;
    fFender.rotation.x = isCruiser ? 0.36 : 0.42;
    fFender.position.set(0, frontAxleLocal.y, frontAxleLocal.z);
    frontForkPivot.add(fFender);

    [-1, 1].forEach((side) => {
      const fStay = makeStrutBetween(
        new THREE.Vector3(side * forkSpanX, frontAxleLocal.y + g.wheelRadius * 0.50, frontAxleLocal.z - 0.04),
        new THREE.Vector3(
          side * Math.max(g.wheelWidth * 0.60, fTubeR * 0.95),
          frontAxleLocal.y + fTorusR,
          frontAxleLocal.z,
        ),
        0.010,
        0.009,
        isCruiser ? mats.chrome : mats.trim,
        6,
      );
      frontForkPivot.add(fStay);
    });
  }

  // 3. Tubular Cradle / Trellis Frame, Cast Pivot Plates, Triangulated Subframe, Swingarm, Shocks & Kickstand
  const swingPivotY = g.groundClearance + (isDirt ? 0.22 : 0.16);
  const swingPivotZ = -0.22;
  const subRearY = isDirt
    ? g.groundClearance + 0.68
    : isCruiser
      ? Math.max(g.groundClearance + 0.44, g.wheelRadius * 1.90)
      : g.groundClearance + 0.68;
  const subRearZ = rZ + 0.06;

  // Swingarm pivot through-bolt & swingarm front cross-bridge
  const pivotBolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, rearSwingSpanX * 2 + 0.02, 10).rotateZ(Math.PI / 2),
    mats.chrome,
  );
  pivotBolt.position.set(0, swingPivotY, swingPivotZ);
  const swingBridge = new THREE.Mesh(
    createRoundedBoxGeo(rearSwingSpanX * 1.85, 0.042, 0.075, 0.012, 2, 8),
    mats.alloy,
  );
  swingBridge.position.set(0, THREE.MathUtils.lerp(swingPivotY, g.wheelRadius, 0.28), swingPivotZ - 0.12);
  group.add(pivotBolt, swingBridge);

  [-1, 1].forEach((side) => {
    const sx = side * 0.115;
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
        new THREE.Vector3(sx, g.groundClearance + 0.50, swingPivotZ - 0.02),
        0.024,
        0.022,
        isNaked ? mats.accent : mats.trim,
        10,
      ),
    );
    // Cast Aluminum Swingarm Pivot Plate uniting upper frame spar, lower rail & swingarm axle
    const pivotPlate = new THREE.Mesh(
      createRoundedBoxGeo(0.028, 0.34, 0.12, 0.012, 2, 8),
      isNaked || isCruiser ? mats.trim : mats.alloy,
    );
    pivotPlate.position.set(side * 0.122, swingPivotY + 0.14, swingPivotZ - 0.01);
    pivotPlate.rotation.x = 0.12;
    group.add(pivotPlate);

    // Triangulated Subframe (upper seat rail + lower diagonal compression strut) supporting seat & tail outboard of tire
    const subRearX = side * Math.max(0.098, rearWidth * 0.5 + 0.018);
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx, g.groundClearance + 0.52, swingPivotZ - 0.02),
        new THREE.Vector3(subRearX, subRearY, subRearZ),
        0.017,
        0.015,
        isNaked ? mats.accent : mats.trim,
        8,
      ),
    );
    group.add(
      makeStrutBetween(
        new THREE.Vector3(sx, swingPivotY + 0.16, swingPivotZ - 0.04),
        new THREE.Vector3(subRearX, subRearY - 0.04, subRearZ + 0.04),
        0.015,
        0.014,
        isNaked ? mats.accent : mats.trim,
        8,
      ),
    );

    // Box-section Rear Swingarm arms spanning cleanly to rear axle
    const swingarm = makeStrutBetween(
      new THREE.Vector3(side * (rearSwingSpanX * 0.86), swingPivotY, swingPivotZ),
      new THREE.Vector3(side * rearSwingSpanX, g.wheelRadius, rZ),
      0.026,
      0.030,
      mats.alloy,
      8,
    );
    tagPart(swingarm, 'Balança Traseira e Suspensão', side * 0.2, 0, -0.2);
    group.add(swingarm);

    // Rider rearset bracket + footpeg + heel guard + gear/brake lever
    const rearset = makeStrutBetween(
      new THREE.Vector3(side * 0.122, swingPivotY + 0.04, swingPivotZ + 0.04),
      new THREE.Vector3(side * 0.16, g.groundClearance + 0.14, -0.10),
      0.015,
      0.014,
      mats.alloy,
      6,
    );
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.095, 8).rotateZ(Math.PI / 2), mats.trim);
    peg.position.set(side * 0.205, g.groundClearance + 0.14, -0.10);
    group.add(rearset, peg);

    if (!cityMode) {
      const heelGuard = new THREE.Mesh(
        createRoundedBoxGeo(0.012, 0.055, 0.068, 0.005, 1, 4),
        mats.alloy,
      );
      heelGuard.position.set(side * 0.155, g.groundClearance + 0.18, -0.13);
      const pedalLever = makeStrutBetween(
        new THREE.Vector3(side * 0.165, g.groundClearance + 0.14, -0.10),
        new THREE.Vector3(side * 0.185, g.groundClearance + 0.125, 0.01),
        0.008,
        0.007,
        mats.alloy,
        6,
      );
      group.add(heelGuard, pedalLever);
    }

    // Passenger Pillion Footpeg Brackets anchored to subframe on street motorcycles
    if ((isFairedSport || isNaked || isCruiser) && v.id !== 71) {
      const pPegY = g.groundClearance + (isCruiser ? 0.30 : 0.44);
      const pPegZ = rZ + 0.24;
      const pStay = makeStrutBetween(
        new THREE.Vector3(sx * 0.92, subRearY - 0.08, pPegZ + 0.05),
        new THREE.Vector3(side * 0.185, pPegY, pPegZ),
        0.013,
        0.011,
        mats.alloy,
        6,
      );
      const pPeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.068, 8).rotateZ(Math.PI / 2),
        mats.trim,
      );
      pPeg.position.set(side * 0.215, pPegY, pPegZ);
      group.add(pStay, pPeg);
    }
  });

  // Rear Tire Hugger Fender + Contoured Chain Guard mounted cleanly to swingarm
  if ((isFairedSport || isNaked) && !cityMode) {
    const huggerTubeR = Math.min(0.032, rearWidth * 0.24);
    const huggerR = g.wheelRadius + huggerTubeR + 0.024;
    const hugger = new THREE.Mesh(
      new THREE.TorusGeometry(huggerR, huggerTubeR, 8, 16, Math.PI * 0.38),
      mats.trim,
    );
    hugger.rotation.y = Math.PI / 2;
    hugger.rotation.x = 0.08;
    hugger.position.set(0, g.wheelRadius, rZ);
    group.add(hugger);
  }

  // Rear Coil-Over Shock Springs (Twin exposed chrome coil-overs on naked/cruiser/scooter; central monoshock on sport/dirt)
  if (isNaked || isCruiser || isScooter) {
    [-1, 1].forEach((side) => {
      const pBot = new THREE.Vector3(
        side * Math.max(rearSwingSpanX * 0.96, rearWidth * 0.5 + 0.052),
        g.wheelRadius + 0.06,
        rZ + 0.08,
      );
      const pTop = new THREE.Vector3(
        side * Math.max(0.13, rearWidth * 0.5 + 0.028),
        subRearY - 0.02,
        rZ + 0.24,
      );
      const shock = buildCoilShock(pBot, pTop, 0.032, 0.0085, 6.5, mats.chrome);
      tagPart(shock, 'Amortecedor Traseiro Coil-Over', side * 0.22, 0.15, -0.2);
      group.add(shock);
    });
  } else {
    const monoBot = new THREE.Vector3(0, THREE.MathUtils.lerp(swingPivotY, g.wheelRadius, 0.28), swingPivotZ - 0.12);
    const monoTop = new THREE.Vector3(0, g.groundClearance + 0.48, swingPivotZ - 0.02);
    const monoshock = buildCoilShock(monoBot, monoTop, 0.042, 0.0105, 5.5, mats.accent);
    tagPart(monoshock, 'Monoamortecedor Central Traseiro', 0, 0.12, -0.15);
    group.add(monoshock);
  }

  // Left-side kickstand + countershaft front sprocket, chain run & chain guard
  if (!cityMode) {
    const stand = makeStrutBetween(
      new THREE.Vector3(-0.12, g.groundClearance + 0.09, -0.16),
      new THREE.Vector3(-0.24, 0.02, -0.32),
      0.014,
      0.012,
      mats.trim,
      8,
    );
    const standFoot = new THREE.Mesh(
      createRoundedBoxGeo(0.052, 0.014, 0.062, 0.004, 1, 4),
      mats.trim,
    );
    standFoot.position.set(-0.24, 0.018, -0.32);
    group.add(stand, standFoot);

    if (!isScooter) {
      const frontSprocket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.014, 12).rotateZ(Math.PI / 2),
        mats.alloy,
      );
      frontSprocket.position.set(sprocketX, swingPivotY, swingPivotZ);
      const chainTop = makeStrutBetween(
        new THREE.Vector3(sprocketX, swingPivotY + 0.038, swingPivotZ),
        new THREE.Vector3(sprocketX, g.wheelRadius + g.wheelRadius * 0.36, rZ),
        0.011,
        0.011,
        mats.grille,
        6,
      );
      const chainBot = makeStrutBetween(
        new THREE.Vector3(sprocketX, swingPivotY - 0.038, swingPivotZ),
        new THREE.Vector3(sprocketX, g.wheelRadius - g.wheelRadius * 0.36, rZ),
        0.011,
        0.011,
        mats.grille,
        6,
      );
      const chainGuard = makeStrutBetween(
        new THREE.Vector3(sprocketX, swingPivotY + 0.068, swingPivotZ - 0.10),
        new THREE.Vector3(sprocketX, g.wheelRadius + g.wheelRadius * 0.42, rZ + 0.06),
        0.016,
        0.014,
        mats.trim,
        6,
      );
      group.add(frontSprocket, chainTop, chainBot, chainGuard);
    }
  }

  // 4. Sculpted Detailed Engine Block, Valve Cover, Clutch/Stator Covers, Sump, Oil Filter & Radiator
  const engineGrp = new THREE.Group();
  const engBaseY = g.groundClearance + 0.18;
  const crankcase = new THREE.Mesh(
    createRoundedBoxGeo(0.27, 0.19, 0.36, 0.045, 3, 10),
    mats.alloy,
  );
  crankcase.position.set(0, engBaseY, -0.02);
  engineGrp.add(crankcase);

  if (isElectricMoto) {
    const battPack = new THREE.Mesh(
      createRoundedBoxGeo(0.26, 0.30, 0.38, 0.055, 3, 12),
      mats.trim,
    );
    battPack.position.set(0, engBaseY + 0.12, 0.04);
    const cyanCore = new THREE.Mesh(
      createRoundedBoxGeo(0.28, 0.08, 0.26, 0.02, 2, 8),
      mats.accent,
    );
    cyanCore.position.set(0, engBaseY + 0.14, 0.04);
    engineGrp.add(battPack, cyanCore);
    if (!cityMode) {
      for (let r = 0; r < 5; r++) {
        const fin = new THREE.Mesh(
          createRoundedBoxGeo(0.28, 0.012, 0.32, 0.005, 1, 4),
          mats.alloy,
        );
        fin.position.set(0, engBaseY + 0.01 + r * 0.026, 0.04);
        engineGrp.add(fin);
      }
      [-0.08, 0.08].forEach((cx) => {
        const hvCable = new THREE.Mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(cx, engBaseY + 0.24, 0.06),
              new THREE.Vector3(cx * 1.4, engBaseY + 0.08, -0.06),
              new THREE.Vector3(cx * 0.9, engBaseY - 0.02, -0.18),
            ]),
            12,
            0.011,
            8,
            false,
          ),
          mats.accent,
        );
        engineGrp.add(hvCable);
      });
    }
  } else if (isCruiser) {
    // Classic V-Twin angled finned cylinders + pushrod tubes + chrome round air filter + metallic side covers
    [-1, 1].forEach((vDir) => {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.082, 0.24, 14), mats.trim);
      cyl.position.set(0, engBaseY + 0.18, 0.02 + vDir * 0.10);
      cyl.rotation.x = vDir * 0.38;
      const headCap = new THREE.Mesh(
        createRoundedBoxGeo(0.17, 0.055, 0.17, 0.02, 2, 8),
        mats.chrome,
      );
      headCap.position.set(0, engBaseY + 0.29, 0.02 + vDir * 0.145);
      headCap.rotation.x = vDir * 0.38;
      engineGrp.add(cyl, headCap);
      for (let f = 0; f < 6; f++) {
        const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.013, 14), mats.alloy);
        fin.position.set(0, engBaseY + 0.10 + f * 0.032, 0.02 + vDir * (0.055 + f * 0.014));
        fin.rotation.x = vDir * 0.38;
        engineGrp.add(fin);
      }
      if (!cityMode) {
        const pushrod = makeStrutBetween(
          new THREE.Vector3(0.075, engBaseY + 0.05, 0.02 + vDir * 0.04),
          new THREE.Vector3(0.075, engBaseY + 0.27, 0.02 + vDir * 0.13),
          0.010,
          0.010,
          mats.chrome,
          8,
        );
        engineGrp.add(pushrod);
      }
    });
    const airCleaner = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.08, 18), mats.chrome);
    airCleaner.rotation.z = Math.PI / 2;
    airCleaner.position.set(0.17, engBaseY + 0.18, 0.02);
    const cleanerCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 14), mats.trim);
    cleanerCenter.rotation.z = Math.PI / 2;
    cleanerCenter.position.copy(airCleaner.position);
    engineGrp.add(airCleaner, cleanerCenter);
  } else if (!isScooter) {
    // High-detail Inline-4 / Thumper engine block: oil sump, cylinder bank, finned jackets, valve cover & side covers
    const oilSump = new THREE.Mesh(
      createRoundedBoxGeo(0.22, 0.065, 0.28, 0.02, 2, 8),
      mats.trim,
    );
    oilSump.position.set(0, engBaseY - 0.105, -0.01);
    engineGrp.add(oilSump);

    const cylBlock = new THREE.Mesh(
      createRoundedBoxGeo(0.25, 0.21, 0.22, 0.025, 2, 8),
      mats.trim,
    );
    cylBlock.position.set(0, engBaseY + 0.17, 0.08);
    cylBlock.rotation.x = 0.26;
    engineGrp.add(cylBlock);

    // Sculpted Cam / Valve Cover with raised ribs & 4 ignition coil caps
    const valveCover = new THREE.Mesh(
      createRoundedBoxGeo(0.265, 0.055, 0.23, 0.022, 2, 8),
      isFairedSport ? mats.accent : mats.alloy,
    );
    valveCover.position.set(0, engBaseY + 0.285, 0.11);
    valveCover.rotation.x = 0.26;
    engineGrp.add(valveCover);

    if (!cityMode) {
      for (let f = 0; f < 3; f++) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.275, 0.013, 0.24),
          mats.grille,
        );
        fin.position.set(0, engBaseY + 0.11 + f * 0.048, 0.06 + f * 0.012);
        fin.rotation.x = 0.26;
        engineGrp.add(fin);
      }

      // 4 Individual Cylinder Head Ignition Coil Caps + Front Exhaust Port Collars
      [-0.084, -0.028, 0.028, 0.084].forEach((cx) => {
        const coil = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.017, 0.026, 6),
          mats.trim,
        );
        coil.position.set(cx, engBaseY + 0.315, 0.115);
        coil.rotation.x = 0.26;
        const portCollar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.024, 0.024, 0.032, 6).rotateX(Math.PI / 2),
          mats.alloy,
        );
        portCollar.position.set(cx, engBaseY + 0.18, 0.20);
        engineGrp.add(coil, portCollar);
      });

      // Spin-on oil filter canister & starter motor cylinder
      const oilFilter = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 0.075, 12).rotateX(Math.PI / 2),
        mats.trim,
      );
      oilFilter.position.set(0.04, engBaseY - 0.04, 0.17);
      const starterMotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.036, 0.14, 12).rotateZ(Math.PI / 2),
        mats.alloy,
      );
      starterMotor.position.set(0, engBaseY + 0.08, -0.14);
      engineGrp.add(oilFilter, starterMotor);
    }

    // Machined Right Clutch Cover (window/bolt ring + water pump) & Left Stator/Sprocket Cover
    [-1, 1].forEach((side) => {
      const coverBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.108, 0.056, 18).rotateZ(Math.PI / 2),
        isNaked || isDirt ? mats.chrome : mats.alloy,
      );
      coverBase.position.set(side * 0.132, engBaseY - 0.008, -0.02);
      engineGrp.add(coverBase);

      if (!cityMode) {
        const ringBezel = new THREE.Mesh(
          new THREE.TorusGeometry(0.074, 0.011, 8, 18).rotateY(Math.PI / 2),
          mats.trim,
        );
        ringBezel.position.set(side * 0.160, engBaseY - 0.008, -0.02);
        const centerWindow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.054, 0.054, 0.018, 16).rotateZ(Math.PI / 2),
          side > 0 ? mats.grille : mats.accent,
        );
        centerWindow.position.set(side * 0.156, engBaseY - 0.008, -0.02);
        engineGrp.add(ringBezel, centerWindow);

        for (let b = 0; b < 4; b++) {
          const ang = (b / 4) * Math.PI * 2;
          const bolt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.0065, 0.0065, 0.014, 6).rotateZ(Math.PI / 2),
            mats.chrome,
          );
          bolt.position.set(
            side * 0.162,
            engBaseY - 0.008 + Math.cos(ang) * 0.074,
            -0.02 + Math.sin(ang) * 0.074,
          );
          engineGrp.add(bolt);
        }
      }
    });

    if (!cityMode) {
      // Water pump housing & braided coolant hose on right side
      const waterPump = new THREE.Mesh(
        new THREE.CylinderGeometry(0.040, 0.044, 0.045, 12).rotateZ(Math.PI / 2),
        mats.alloy,
      );
      waterPump.position.set(0.145, engBaseY - 0.055, 0.10);
      const coolantHose = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.145, engBaseY - 0.055, 0.12),
            new THREE.Vector3(0.155, engBaseY + 0.04, 0.22),
            new THREE.Vector3(0.125, engBaseY + 0.12, 0.29),
          ]),
          10,
          0.013,
          8,
          false,
        ),
        mats.trim,
      );
      engineGrp.add(waterPump, coolantHose);
    }

    // Curved Aluminum Radiator + Side End-Tanks + Filler Cap for Sportbikes & Nakeds
    if (isFairedSport || v.id === 72) {
      const radCore = new THREE.Mesh(
        createSculptedPanelGeo(0.28, 0.19, 0.042, 8, 4, 2, 0.012, (pos, idx, hx) => {
          const nx = Math.abs(pos.getX(idx)) / Math.max(0.05, hx);
          pos.setZ(idx, pos.getZ(idx) - Math.pow(nx, 1.8) * 0.028);
        }),
        mats.grilleMesh,
      );
      radCore.position.set(0, engBaseY + 0.16, 0.305);
      radCore.rotation.x = 0.28;
      engineGrp.add(radCore);

      if (!cityMode) {
        [-1, 1].forEach((side) => {
          const endTank = new THREE.Mesh(
            createRoundedBoxGeo(0.028, 0.195, 0.048, 0.008, 2, 6),
            mats.alloy,
          );
          endTank.position.set(side * 0.145, engBaseY + 0.16, 0.282);
          endTank.rotation.x = 0.28;
          endTank.rotation.y = side * -0.18;
          engineGrp.add(endTank);
        });
        const radCap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.016, 10), mats.chrome);
        radCap.position.set(0.135, engBaseY + 0.25, 0.31);
        engineGrp.add(radCap);
      }
    }
  }

  tagPart(
    engineGrp,
    isElectricMoto ? 'Motor Elétrico & Bateria' : 'Motor 4 Cilindros, Cárter & Radiador',
    0,
    -0.15,
    0,
  );
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

    // Front classic tie/horn grille on legshield + Maxi-Scooter nose headlight nacelle
    const tie = new THREE.Mesh(
      createRoundedBoxGeo(0.08, 0.34, 0.05, 0.015, 2, 6),
      isMaxiScooter ? mats.grille : mats.chrome,
    );
    tie.position.set(0, g.groundClearance + 0.42, fZ * 0.61);
    tie.rotation.x = -0.35;
    group.add(tie);

    if (isMaxiScooter) {
      const maxiNoseCowl = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.24, 0.24, 0.06, 3, 10),
        mats.body,
      );
      maxiNoseCowl.position.set(0, g.groundClearance + 0.62, headZ + 0.04);
      maxiNoseCowl.rotation.x = 0.25;
      group.add(maxiNoseCowl);
    }

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
    // Sculpted 3D Lofted Organic Fuel Tank (round muscular airbox crown + pinched rider knee waist!)
    const tankBaseY = g.groundClearance + (isCruiser ? 0.56 : isDirt ? 0.62 : 0.57);
    const tankStations: MotoLoftStation[] = isCruiser
      ? [
          { z: -0.26, cy: 0.01, rx: 0.085, ryTop: 0.055, ryBot: 0.042, topTaper: 0.16 },
          { z: -0.06, cy: 0.05, rx: 0.148, ryTop: 0.102, ryBot: 0.068, topTaper: 0.22 },
          { z: 0.14, cy: 0.075, rx: 0.176, ryTop: 0.125, ryBot: 0.080, topTaper: 0.24 },
          { z: 0.28, cy: 0.055, rx: 0.135, ryTop: 0.095, ryBot: 0.065, topTaper: 0.20 },
          { z: 0.36, cy: 0.02, rx: 0.055, ryTop: 0.042, ryBot: 0.036, topTaper: 0.16 },
        ]
      : isDirt
        ? [
            { z: -0.24, cy: 0.01, rx: 0.068, ryTop: 0.048, ryBot: 0.036, topTaper: 0.20 },
            { z: 0.0, cy: 0.055, rx: 0.115, ryTop: 0.082, ryBot: 0.058, topTaper: 0.25 },
            { z: 0.22, cy: 0.07, rx: 0.132, ryTop: 0.092, ryBot: 0.068, topTaper: 0.26 },
            { z: 0.34, cy: 0.035, rx: 0.072, ryTop: 0.050, ryBot: 0.044, topTaper: 0.22 },
          ]
        : [
            { z: -0.26, cy: 0.01, rx: 0.088, ryTop: 0.054, ryBot: 0.042, topTaper: 0.14 },
            { z: -0.10, cy: 0.064, rx: 0.134, ryTop: 0.095, ryBot: 0.068, topTaper: 0.25 },
            { z: 0.08, cy: 0.090, rx: 0.172, ryTop: 0.118, ryBot: 0.084, topTaper: 0.28 },
            { z: 0.22, cy: 0.068, rx: 0.156, ryTop: 0.092, ryBot: 0.076, topTaper: 0.26 },
            { z: 0.34, cy: 0.018, rx: 0.096, ryTop: 0.052, ryBot: 0.046, topTaper: 0.22 },
          ];
    const tankGeo = createLoftedMotoShell(tankStations, cityMode ? 12 : 18, cityMode ? 8 : 14);
    const tank = new THREE.Mesh(tankGeo, mats.body);
    tank.position.set(0, tankBaseY, 0.18);
    tagPart(tank, 'Tanque de Combustível Esculpido', 0, 0.4, 0);
    group.add(tank);

    // Flush machined billet fuel cap + curved tank pad / stripe + sportbike knee grip pads
    const capYOffset = isCruiser ? 0.125 : isDirt ? 0.095 : 0.118;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.039, 0.016, 12), mats.chrome);
    cap.position.set(0, tankBaseY + capYOffset, 0.27);
    cap.rotation.x = 0.08;
    group.add(cap);

    const tankStripe = new THREE.Mesh(
      createSculptedPanelGeo(0.062, 0.014, 0.34, 4, 2, 6, 0.006, (pos, idx, _hx, _hy, hz) => {
        const nz = pos.getZ(idx) / Math.max(0.05, hz);
        pos.setY(idx, pos.getY(idx) - Math.pow(nz, 2) * 0.036);
      }),
      isCruiser ? mats.chrome : mats.liveryStripe,
    );
    tankStripe.position.set(0, tankBaseY + capYOffset - 0.006, 0.21);
    group.add(tankStripe);

    if (isFairedSport && !cityMode) {
      [-1, 1].forEach((side) => {
        const kneePad = new THREE.Mesh(
          createRoundedBoxGeo(0.014, 0.068, 0.18, 0.007, 1, 6),
          mats.trim,
        );
        kneePad.position.set(side * 0.138, tankBaseY + 0.042, 0.11);
        kneePad.rotation.y = side * 0.24;
        kneePad.rotation.z = side * -0.18;
        group.add(kneePad);
      });
    }

    // Naked Streetfighter radiator shrouds + side tank air scoops (only Streetfighter VHC-72, not classic Café Racer)
    if (isNaked && v.id === 72) {
      [-1, 1].forEach((side) => {
        const shroud = new THREE.Mesh(
          createSculptedPanelGeo(0.045, 0.19, 0.26, 3, 4, 6, 0.016, (pos, idx, _hx, _hy, hz) => {
            const nz = pos.getZ(idx) / Math.max(0.05, hz);
            pos.setX(idx, pos.getX(idx) - side * Math.pow(nz, 2) * 0.018);
          }),
          mats.body,
        );
        shroud.position.set(side * 0.16, g.groundClearance + 0.48, 0.32);
        shroud.rotation.y = side * 0.22;
        group.add(shroud);
      });
    }

    // Faired Superbike Aerodynamic Shark-Nose Wedge, Swept Side Fairings + MotoGP Winglets & Fairing Mirrors!
    if (isFairedSport) {
      const noseBaseY = g.groundClearance + 0.56;
      const noseStations: MotoLoftStation[] = [
        { z: headZ - 0.14, cy: noseBaseY + 0.02, rx: 0.150, ryTop: 0.078, ryBot: 0.068, topTaper: 0.28, bottomArch: 0.025 },
        { z: headZ + 0.02, cy: noseBaseY + 0.04, rx: 0.158, ryTop: 0.076, ryBot: 0.058, topTaper: 0.34, bottomArch: 0.035 },
        { z: headZ + 0.12, cy: noseBaseY + 0.015, rx: 0.138, ryTop: 0.058, ryBot: 0.044, topTaper: 0.36, bottomArch: 0.030 },
        { z: fZ * 0.86, cy: noseBaseY - 0.008, rx: 0.092, ryTop: 0.038, ryBot: 0.028, topTaper: 0.32, bottomArch: 0.018 },
        { z: fZ * 0.93, cy: noseBaseY - 0.022, rx: 0.042, ryTop: 0.018, ryBot: 0.014, topTaper: 0.22 },
        { z: fZ * 0.96, cy: noseBaseY - 0.026, rx: 0.012, ryTop: 0.007, ryBot: 0.007, topTaper: 0.15 },
      ];
      const noseGeo = createLoftedMotoShell(noseStations, cityMode ? 12 : 18, cityMode ? 8 : 14);
      const nose = new THREE.Mesh(noseGeo, mats.body);
      tagPart(nose, 'Carenagem Frontal Aerodinâmica', 0, 0.3, 0.35);
      group.add(nose);

      // Flush recessed Ram-Air intake mouth + center splitter vane tucked cleanly at nose prow above fender
      const ramAirHousing = new THREE.Mesh(
        createRoundedBoxGeo(0.068, 0.024, 0.036, 0.009, 1, 6),
        mats.grille,
      );
      ramAirHousing.position.set(0, noseBaseY - 0.020, fZ * 0.905);
      ramAirHousing.rotation.x = 0.20;
      const ramAirSplitter = new THREE.Mesh(
        createRoundedBoxGeo(0.009, 0.020, 0.038, 0.003, 1, 4),
        mats.accent,
      );
      ramAirSplitter.position.copy(ramAirHousing.position);
      ramAirSplitter.rotation.x = 0.20;
      group.add(ramAirHousing, ramAirSplitter);

      // Contoured shark-fin side fairings seated behind front tire steering arc & tucking cleanly into belly pan
      const sideFairingGrp = new THREE.Group();
      [-1, 1].forEach((side) => {
        const cowlGeo = createSculptedPanelGeo(
          0.034,
          0.38,
          0.34,
          3,
          8,
          8,
          0.014,
          (pos, idx, _hx, hy, hz) => {
            const px = pos.getX(idx);
            const py = pos.getY(idx);
            const pz = pos.getZ(idx);
            const ny = THREE.MathUtils.clamp(py / Math.max(0.05, hy), -1, 1);
            const nz = THREE.MathUtils.clamp(pz / Math.max(0.05, hz), -1, 1);
            // Smooth aerodynamic barrel curvature + inward tuck at top (into frame/nose) and bottom (into belly)
            const bow = side * (Math.cos(ny * Math.PI * 0.5) * Math.cos(nz * Math.PI * 0.5) * 0.022);
            const yTuck = ny > 0 ? Math.pow(ny, 2) * 0.018 : Math.pow(ny, 2) * 0.032;
            const topBotTuck = -side * (yTuck + Math.pow(nz, 2) * 0.016);
            // Sweep front leading edge cleanly back behind fork/tire arc, and scallop rear bottom to expose engine covers
            const frontSweep = nz > 0.2 && ny < 0.4 ? -(nz - 0.2) * (0.4 - ny) * 0.055 : 0;
            const rearCut = nz < -0.15 && ny < 0.35 ? (-nz - 0.15) * (0.35 - ny) * 0.11 : 0;
            pos.setXYZ(idx, px + bow + topBotTuck, py + rearCut, pz + frontSweep);
          },
        );
        const sideCowl = new THREE.Mesh(cowlGeo, mats.body);
        sideCowl.position.set(side * 0.138, g.groundClearance + 0.36, 0.21);
        sideCowl.rotation.y = side * -0.08;
        sideFairingGrp.add(sideCowl);

        // Twin-spar sculpted aluminum perimeter frame beam bridging fairing to swingarm
        const spar = makeStrutBetween(
          new THREE.Vector3(side * 0.132, headY - 0.04, headZ - 0.06),
          new THREE.Vector3(side * 0.122, g.groundClearance + 0.42, -0.22),
          0.022,
          0.024,
          mats.alloy,
          8,
        );
        sideFairingGrp.add(spar);

        // 3 Curved Shark-Gill Heat Extractor Vents recessed cleanly along fairing flank
        if (!cityMode) {
          for (let gv = 0; gv < 3; gv++) {
            const gill = new THREE.Mesh(
              createRoundedBoxGeo(0.016, 0.046 - gv * 0.006, 0.016, 0.004, 1, 4),
              mats.grille,
            );
            gill.position.set(
              side * 0.156,
              g.groundClearance + 0.39 - gv * 0.036,
              0.20 - gv * 0.038,
            );
            gill.rotation.y = side * -0.06;
            gill.rotation.x = 0.42;
            sideFairingGrp.add(gill);
          }
        }

        // MotoGP Bi-Plane Aerodynamic Downforce Winglets swept smoothly off nose/upper-cowl flank
        const wingletGeo = createSculptedPanelGeo(
          0.072,
          0.012,
          0.090,
          5,
          2,
          4,
          0.005,
          (pos, idx, hx) => {
            const nx = THREE.MathUtils.clamp((pos.getX(idx) * side) / Math.max(0.02, hx), -1, 1);
            const sweep = -Math.pow(Math.max(0, nx), 1.4) * 0.026;
            const anhedral = -Math.pow(Math.max(0, nx), 1.5) * 0.013;
            pos.setXYZ(idx, pos.getX(idx), pos.getY(idx) + anhedral, pos.getZ(idx) + sweep);
          },
        );
        const winglet = new THREE.Mesh(wingletGeo, mats.trim);
        winglet.position.set(side * 0.168, g.groundClearance + 0.53, headZ + 0.05);
        winglet.rotation.x = 0.18;
        const wingletEndplate = new THREE.Mesh(
          createRoundedBoxGeo(0.010, 0.032, 0.068, 0.003, 1, 4),
          mats.accent,
        );
        wingletEndplate.position.set(side * 0.205, g.groundClearance + 0.518, headZ + 0.014);
        wingletEndplate.rotation.x = 0.14;
        sideFairingGrp.add(winglet, wingletEndplate);
      });
      tagPart(sideFairingGrp, 'Carenagens Laterais & Winglets MotoGP', 0.25, 0.05, 0.15);
      group.add(sideFairingGrp);

      // Sculpted aerodynamic boat-tail Belly Pan hugging under crankcase & exhaust collector
      const bellyGeo = createLoftedMotoShell(
        [
          { z: -0.24, cy: g.groundClearance + 0.10, rx: 0.080, ryTop: 0.046, ryBot: 0.026, topTaper: 0.15 },
          { z: 0.02, cy: g.groundClearance + 0.115, rx: 0.142, ryTop: 0.082, ryBot: 0.038, topTaper: 0.12 },
          { z: 0.28, cy: g.groundClearance + 0.135, rx: 0.134, ryTop: 0.076, ryBot: 0.036, topTaper: 0.18 },
          { z: 0.39, cy: g.groundClearance + 0.172, rx: 0.072, ryTop: 0.044, ryBot: 0.024, topTaper: 0.25 },
        ],
        cityMode ? 10 : 14,
        cityMode ? 6 : 10,
      );
      const belly = new THREE.Mesh(bellyGeo, mats.secondary);
      tagPart(belly, 'Quilha Aerodinâmica Inferior (Belly Pan)', 0, -0.18, 0.1);
      group.add(belly);

      // Curved Double-Bubble Tinted Aero Windscreen continuing the shark-nose brow slope cleanly
      const wsGeo = createSculptedPanelGeo(
        0.24,
        0.24,
        0.016,
        8,
        6,
        2,
        0.007,
        (pos, idx, hx, hy) => {
          const px = pos.getX(idx);
          const py = pos.getY(idx);
          const nx = THREE.MathUtils.clamp(px / Math.max(0.05, hx), -1, 1);
          const ny = THREE.MathUtils.clamp(py / Math.max(0.05, hy), -1, 1);
          const wrapZ = -Math.pow(nx, 2) * 0.064;
          const doubleBubble = Math.cos(nx * Math.PI * 0.5) * Math.cos(ny * Math.PI * 0.5) * 0.028;
          const topTaper = ny > 0 ? 1 - ny * 0.24 : 1;
          pos.setXYZ(idx, px * topTaper, py, pos.getZ(idx) + wrapZ + doubleBubble);
        },
      );
      const windscreen = new THREE.Mesh(wsGeo, mats.glass);
      windscreen.position.set(0, g.groundClearance + 0.71, headZ - 0.02);
      windscreen.rotation.x = -0.88;
      windscreen.userData.noShadow = true;
      windscreen.renderOrder = 2;
      tagPart(windscreen, 'Bolha Aerodinâmica Dupla Curvatura', 0, 0.45, 0.35);
      group.add(windscreen);

      // Dedicated Frame-Mounted Aerodynamic Fairing Rearview Mirrors + Integrated LED Turn Signals!
      const fairingMirrorsGrp = new THREE.Group();
      [-1, 1].forEach((side) => {
        const mountPt = new THREE.Vector3(side * 0.122, g.groundClearance + 0.642, headZ + 0.03);
        const stalkElbow = new THREE.Vector3(side * 0.195, g.groundClearance + 0.732, headZ + 0.01);
        const podPivot = new THREE.Vector3(side * 0.255, g.groundClearance + 0.772, headZ - 0.025);

        const baseFoot = new THREE.Mesh(
          createRoundedBoxGeo(0.032, 0.020, 0.052, 0.007, 1, 6),
          mats.trim,
        );
        baseFoot.position.copy(mountPt);
        baseFoot.rotation.y = side * 0.28;
        baseFoot.rotation.z = side * -0.35;
        fairingMirrorsGrp.add(baseFoot);

        const armCurve = new THREE.CatmullRomCurve3([mountPt, stalkElbow, podPivot]);
        const armMesh = new THREE.Mesh(
          new THREE.TubeGeometry(armCurve, cityMode ? 6 : 10, 0.009, 6, false),
          mats.trim,
        );
        fairingMirrorsGrp.add(armMesh);

        const mirrorPod = new THREE.Group();
        mirrorPod.position.set(podPivot.x + side * 0.034, podPivot.y + 0.008, podPivot.z);
        mirrorPod.rotation.y = side * -0.20;
        mirrorPod.rotation.z = side * 0.10;

        const podGeo = createSculptedPanelGeo(
          0.124,
          0.058,
          0.038,
          6,
          4,
          3,
          0.016,
          (pos, idx, hx, hy) => {
            const px = pos.getX(idx);
            const py = pos.getY(idx);
            const pz = pos.getZ(idx);
            const nx = THREE.MathUtils.clamp((px * side) / Math.max(0.02, hx), -1, 1);
            const ny = THREE.MathUtils.clamp(py / Math.max(0.01, hy), -1, 1);
            const taper = nx > 0 ? 1 - Math.pow(nx, 1.45) * 0.40 : 1 - Math.pow(-nx, 1.8) * 0.15;
            const aeroNose = pz > 0 ? (1 - Math.abs(ny) * 0.5) * (1 - Math.abs(nx) * 0.35) * 0.018 : 0;
            pos.setXYZ(idx, px, py * taper, pz + aeroNose);
          },
        );
        const podShell = new THREE.Mesh(podGeo, mats.body);
        const bezel = new THREE.Mesh(
          createRoundedBoxGeo(0.104, 0.044, 0.010, 0.006, 1, 6),
          mats.trim,
        );
        bezel.position.z = -0.015;
        const mirrorGlass = new THREE.Mesh(
          createRoundedBoxGeo(0.092, 0.036, 0.008, 0.006, 1, 6),
          mats.mirrorGlass,
        );
        mirrorGlass.position.z = -0.018;
        const ledBlink = new THREE.Mesh(
          createRoundedBoxGeo(0.082, 0.010, 0.010, 0.003, 1, 4),
          side < 0 ? mats.signalLeft : mats.signalRight,
        );
        ledBlink.position.set(side * 0.008, -0.003, 0.022);
        mirrorPod.add(podShell, bezel, mirrorGlass, ledBlink);
        fairingMirrorsGrp.add(mirrorPod);
      });
      tagPart(fairingMirrorsGrp, 'Retrovisores Aerodinâmicos com Pisca LED', 0.2, 0.35, 0.25);
      group.add(fairingMirrorsGrp);
    }

    // Sharply upswept sculpted Tail Cowl + Sealed Undertail Pan + Side Frame Infill Panels
    const tailY = isDirt
      ? g.groundClearance + 0.72
      : isCruiser
        ? Math.max(g.groundClearance + 0.50, g.wheelRadius * 2 + 0.095)
        : g.groundClearance + 0.66;
    if (isFairedSport || isNaked) {
      const tailStations: MotoLoftStation[] = [
        { z: rZ - 0.16, cy: tailY + 0.075, rx: 0.042, ryTop: 0.025, ryBot: 0.022, topTaper: 0.25 },
        { z: rZ - 0.04, cy: tailY + 0.045, rx: 0.090, ryTop: 0.048, ryBot: 0.036, topTaper: 0.24 },
        { z: rZ + 0.16, cy: tailY - 0.01, rx: 0.138, ryTop: 0.068, ryBot: 0.050, topTaper: 0.22 },
        { z: rZ + 0.34, cy: tailY - 0.055, rx: 0.125, ryTop: 0.058, ryBot: 0.044, topTaper: 0.18 },
      ];
      const tailGeo = createLoftedMotoShell(tailStations, cityMode ? 10 : 16, cityMode ? 6 : 12);
      const tailCowl = new THREE.Mesh(tailGeo, mats.body);
      tagPart(tailCowl, 'Rabeta Aerodinâmica Esculpida', 0, 0.25, -0.35);
      group.add(tailCowl);

      // Undertail pan & side frame infill panels sealing under rider seat and tail
      const underTail = new THREE.Mesh(
        createRoundedBoxGeo(0.18, 0.032, 0.48, 0.012, 2, 6),
        mats.trim,
      );
      underTail.position.set(0, tailY - 0.042, rZ + 0.11);
      underTail.rotation.x = 0.26;
      group.add(underTail);

      [-1, 1].forEach((side) => {
        const frameInfill = new THREE.Mesh(
          createRoundedBoxGeo(0.022, 0.115, 0.26, 0.008, 1, 6),
          mats.trim,
        );
        frameInfill.position.set(side * 0.110, g.groundClearance + 0.52, -0.14);
        frameInfill.rotation.x = -0.16;
        group.add(frameInfill);
      });
    } else {
      const tailCowl = new THREE.Mesh(
        createRoundedBoxGeo(isDirt ? 0.22 : 0.26, 0.11, isCruiser ? 0.42 : 0.46, 0.03, 2, 8),
        mats.body,
      );
      tailCowl.position.set(0, tailY, isCruiser ? rZ + 0.08 : rZ + 0.02);
      tailCowl.rotation.x = isCruiser ? 0 : 0.22;
      group.add(tailCowl);
    }

    if (!isCruiser && !isFairedSport && !isNaked) {
      const tailTidy = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.03), mats.trim);
      tailTidy.position.set(
        0,
        Math.max(tailY - 0.11, g.wheelRadius * 1.65),
        Math.min(rZ - 0.19, rZ - g.wheelRadius - 0.03),
      );
      tailTidy.rotation.x = 0.55;
      group.add(tailTidy);
    } else if (isCruiser) {
      // Deep valanced rear cruiser fender + bolted fender struts
      const rTubeR = 0.036;
      const rTorusR = g.wheelRadius + rTubeR + 0.024;
      const rFender = new THREE.Mesh(
        new THREE.TorusGeometry(rTorusR, rTubeR, 8, 18, Math.PI * 0.65),
        mats.body,
      );
      rFender.rotation.y = Math.PI / 2;
      rFender.rotation.x = 0.28;
      rFender.position.set(0, g.wheelRadius, rZ);
      group.add(rFender);
      [-1, 1].forEach((side) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * Math.max(0.11, rearWidth * 0.5 + 0.015), subRearY + 0.02, rZ + 0.18),
            new THREE.Vector3(side * (rearWidth * 0.5 + 0.018), g.wheelRadius + rTorusR * 0.88, rZ - 0.10),
            0.012,
            0.010,
            mats.chrome,
            6,
          ),
        );
      });
    }
  }

  // Touring Windscreen anchored directly to Front Fork / Maxi-Scooter cowl (skip on faired sportbikes that already have double-bubble aero windscreen)
  if (g.attachments.includes('moto_windscreen') && !isFairedSport) {
    if (isMaxiScooter) {
      const ws = new THREE.Mesh(
        createRoundedBoxGeo(0.38, 0.36, 0.022, 0.018, 2, 8),
        mats.glass,
      );
      ws.position.set(0, g.groundClearance + 0.90, headZ + 0.03);
      ws.rotation.x = -0.38;
      ws.userData.noShadow = true;
      ws.renderOrder = 2;
      tagPart(ws, 'Para-brisa Alto Touring', 0, 0.5, 0.35);
      group.add(ws);
      [-1, 1].forEach((side) => {
        group.add(
          makeStrutBetween(
            new THREE.Vector3(side * 0.12, g.groundClearance + 0.72, headZ + 0.06),
            new THREE.Vector3(side * 0.12, g.groundClearance + 0.86, headZ + 0.01),
            0.010,
            0.010,
            mats.trim,
            6,
          ),
        );
      });
    } else {
      const ws = new THREE.Mesh(
        createRoundedBoxGeo(0.38, 0.36, 0.022, 0.018, 2, 8),
        mats.glass,
      );
      ws.position.set(0, 0.25, 0.08);
      ws.rotation.x = -0.35;
      ws.userData.noShadow = true;
      ws.renderOrder = 2;
      tagPart(ws, 'Para-brisa Alto Touring', 0, 0.5, 0.35);
      frontForkPivot.add(ws);
      [-1, 1].forEach((side) => {
        frontForkPivot.add(
          makeStrutBetween(
            new THREE.Vector3(side * forkSpanX, 0.02, 0.01),
            new THREE.Vector3(side * 0.12, 0.20, 0.09),
            0.009,
            0.009,
            isCruiser ? mats.chrome : mats.trim,
            6,
          ),
        );
      });
    }
  }

  if (v.id === 42) {
    // Tubular front crash bars ("mata-cachorro") anchored directly to main cradle frame
    [-1, 1].forEach((side) => {
      const bar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 14, Math.PI), mats.chrome);
      bar.rotation.y = side * (Math.PI / 2);
      bar.position.set(side * 0.15, g.groundClearance + 0.26, 0.26);
      const topArm = makeStrutBetween(
        new THREE.Vector3(side * 0.06, g.groundClearance + 0.40, 0.26),
        new THREE.Vector3(side * 0.15, g.groundClearance + 0.40, 0.26),
        0.014,
        0.014,
        mats.chrome,
        6,
      );
      const botArm = makeStrutBetween(
        new THREE.Vector3(side * 0.09, g.groundClearance + 0.12, 0.24),
        new THREE.Vector3(side * 0.15, g.groundClearance + 0.12, 0.26),
        0.014,
        0.014,
        mats.chrome,
        6,
      );
      group.add(bar, topArm, botArm);
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

      // Tubular steel pannier rack bridging subframe to each saddlebag
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 0.10, subRearY - 0.04, rZ + 0.22),
          new THREE.Vector3(side * 0.18, g.groundClearance + 0.46, rZ + 0.20),
          0.012,
          0.012,
          mats.trim,
          6,
        ),
        makeStrutBetween(
          new THREE.Vector3(side * 0.10, subRearY - 0.06, rZ - 0.02),
          new THREE.Vector3(side * 0.18, g.groundClearance + 0.44, rZ - 0.08),
          0.012,
          0.012,
          mats.trim,
          6,
        ),
      );

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
      createRoundedBoxGeo(isCruiser ? 0.34 : 0.28, 0.12, isDirt ? 0.72 : v.id === 71 ? 0.46 : 0.62, 0.05, cityMode ? 2 : 4, 12),
      mats.interior,
    );
    seat.position.set(0, 0, v.id === 71 ? -0.23 : -0.30);
    seatPivot.add(seat);
  }
  tagPart(seatPivot, 'Banco Ergonômico', 0, 0.35, -0.1);
  group.add(seatPivot);
  if (!cityMode && isScooter) {
    registerOpenable(animated, seatPivot, 'Banco Baú Scooter', { x: 0.78 });
  }

  // 7. Connected Handlebars + Billet Risers/Clip-Ons + Rubber Grips + Levers + Gauges + Perch Mirrors
  const barY = isFairedSport
    ? headY + 0.015
    : isCruiser
      ? headY + 0.14
      : isDirt
        ? headY + 0.11
        : headY + 0.10;
  const barZ = isFairedSport ? headZ - 0.045 : headZ - 0.055;
  const barW = width * (isFairedSport ? 0.76 : isCruiser ? 0.92 : 0.88);
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
      barRise: isCruiser ? 0.045 : isDirt ? 0.03 : isFairedSport ? 0.005 : 0.02,
      hasCrossbar: isDirt,
      hasHandguards: isDirt,
      hasMirrors: !isFairedSport,
    },
    cityMode,
  );

  if (!cityMode) {
    // Twin round gauges (Naked / Cruiser) or tucked cockpit TFT digital dash (Sport / Dirt / Maxi)
    if (isNaked || isCruiser) {
      frontForkPivot.add(
        makeStrutBetween(
          new THREE.Vector3(0, 0.025, 0.005),
          new THREE.Vector3(0, 0.085, 0.025),
          0.016,
          0.014,
          mats.trim,
          6,
        ),
      );
      [-0.055, 0.055].forEach((gx) => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.06, 12), mats.trim);
        pod.rotation.x = Math.PI / 3;
        pod.position.set(gx, 0.09, 0.04);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.064, 12), mats.sirenBlue);
        dial.rotation.x = Math.PI / 3;
        dial.position.copy(pod.position);
        const podArm = makeStrutBetween(
          new THREE.Vector3(0, 0.075, 0.025),
          pod.position,
          0.010,
          0.010,
          mats.trim,
          6,
        );
        frontForkPivot.add(pod, dial, podArm);
      });
    } else {
      const dashY = isFairedSport ? 0.032 : 0.035;
      const dashZ = isFairedSport ? -0.018 : 0.015;
      const tftBezel = new THREE.Mesh(createRoundedBoxGeo(0.110, 0.052, 0.015, 0.007, 1, 6), mats.trim);
      tftBezel.position.set(0, dashY, dashZ);
      tftBezel.rotation.x = -0.58;
      const tftFace = new THREE.Mesh(new THREE.PlaneGeometry(0.092, 0.036), mats.sirenBlue);
      tftFace.position.set(0, dashY + 0.004, dashZ - 0.0085);
      tftFace.rotation.y = Math.PI;
      tftFace.rotation.x = 0.58;
      frontForkPivot.add(tftBezel, tftFace);
    }
  }

  // 8. Authentic Beveled Headlights with Translucent Lenses + Turn Signals + Beams & Taillight + Rear Plate
  if (isFairedSport || isMaxiScooter) {
    [-1, 1].forEach((side) => {
      const hlUnit = createBeveledHeadlightAssembly(
        {
          width: isFairedSport ? 0.106 : 0.124,
          height: isFairedSport ? 0.042 : 0.056,
          depth: isFairedSport ? 0.056 : 0.072,
          sweepZ: isFairedSport ? 0.024 : 0.028,
          style: 'twin_projector',
          side: side as -1 | 1,
          frameMat: mats.grille,
        },
        mats,
        cityMode,
      );
      if (isFairedSport) {
        hlUnit.position.set(side * 0.075, g.groundClearance + 0.562, headZ + 0.152);
        hlUnit.rotation.y = side * 0.42;
        hlUnit.rotation.x = 0.24;
      } else {
        hlUnit.position.set(side * 0.105, g.groundClearance + 0.62, headZ + 0.135);
        hlUnit.rotation.y = side * 0.20;
        hlUnit.rotation.x = 0.20;
      }
      tagPart(
        hlUnit,
        side < 0 ? 'Farol Dianteiro Projetor Esquerdo' : 'Farol Dianteiro Projetor Direito',
        side * 0.12,
        0.15,
        0.35,
      );
      const beam = createHeadlightBeamMesh(3.8, 0.72, 0.08);
      beam.position.set(
        side * (isFairedSport ? 0.082 : 0.105),
        g.groundClearance + (isFairedSport ? 0.560 : 0.60),
        isFairedSport ? headZ + 0.185 : headZ + 0.18,
      );
      group.add(hlUnit, beam);
      if (!isFairedSport) {
        // Maxi-scooter cowl-integrated blinkers
        const blinkF = new THREE.Mesh(
          createRoundedBoxGeo(0.052, 0.03, 0.035, 0.01, 2, 6),
          side < 0 ? mats.signalLeft : mats.signalRight,
        );
        blinkF.position.set(side * 0.21, g.groundClearance + 0.63, headZ + 0.08);
        group.add(blinkF);
      }
      animated.headlightBeams.push(beam);
    });
  } else {
    const hlUnit = createBeveledRoundHeadlightUnit(
      0.104,
      0.135,
      mats,
      isCruiser || isNaked ? mats.chrome : mats.trim,
      cityMode,
    );
    hlUnit.position.set(0, -0.02, 0.125);
    const beam = createHeadlightBeamMesh(3.6, 0.72, 0.08);
    beam.position.set(0, -0.02, 0.18);
    tagPart(hlUnit, 'Farol Dianteiro Projetor', 0, 0.25, 0.4);
    frontForkPivot.add(hlUnit, beam);
    animated.headlightBeams.push(beam);

    // Fork-mounted headlight ears + blinker stalks so headlight & signals never float off the fork tubes
    [-1, 1].forEach((side) => {
      const hlEar = makeStrutBetween(
        new THREE.Vector3(side * forkSpanX, -0.02, 0.005),
        new THREE.Vector3(side * 0.095, -0.02, 0.105),
        0.011,
        0.010,
        isCruiser || isNaked ? mats.chrome : mats.trim,
        6,
      );
      const blinkStalk = makeStrutBetween(
        new THREE.Vector3(side * forkSpanX, -0.02, 0.04),
        new THREE.Vector3(side * 0.145, -0.02, 0.08),
        0.008,
        0.008,
        mats.trim,
        6,
      );
      const blinkF = new THREE.Mesh(
        createRoundedBoxGeo(0.05, 0.032, 0.036, 0.01, 2, 6),
        side < 0 ? mats.signalLeft : mats.signalRight,
      );
      blinkF.position.set(side * 0.155, -0.02, 0.08);
      frontForkPivot.add(hlEar, blinkStalk, blinkF);
    });
  }

  const tl = new THREE.Mesh(
    createRoundedBoxGeo(isFairedSport || isNaked ? 0.115 : 0.14, 0.048, 0.055, 0.018, 2, 8),
    mats.taillight,
  );
  const tlY =
    isFairedSport || isNaked
      ? g.groundClearance + 0.728
      : Math.max(
          g.groundClearance + (isScooter ? 0.42 : isCruiser ? 0.48 : 0.62),
          g.wheelRadius * (isCruiser ? 1.72 : 1.95),
        );
  const tlZ =
    isFairedSport || isNaked
      ? rZ - 0.155
      : Math.min(isScooter ? rZ - 0.16 : rZ - 0.14, rZ - g.wheelRadius - 0.06);
  tl.position.set(0, tlY, tlZ);
  if (isFairedSport || isNaked) {
    tl.rotation.x = -0.18;
  }
  tagPart(tl, 'Lanterna Traseira LED', 0, 0.2, -0.4);
  group.add(tl);

  const blinkY = isFairedSport || isNaked ? tl.position.y - 0.052 : tl.position.y;
  const blinkZ = isFairedSport || isNaked ? tl.position.z - 0.015 : tl.position.z;
  const blinkX = isFairedSport || isNaked ? 0.108 : 0.13;
  const blinkCrossBar = makeStrutBetween(
    new THREE.Vector3(-blinkX, blinkY, blinkZ),
    new THREE.Vector3(blinkX, blinkY, blinkZ),
    0.008,
    0.008,
    mats.trim,
    6,
  );
  group.add(blinkCrossBar);

  [-1, 1].forEach((side) => {
    const blinkR = new THREE.Mesh(
      createRoundedBoxGeo(0.05, 0.032, 0.038, 0.01, 2, 6),
      side < 0 ? mats.signalLeft : mats.signalRight,
    );
    blinkR.position.set(side * blinkX, blinkY, blinkZ);
    group.add(blinkR);
  });

  // Rear motorcycle/scooter Mercosul license plate mounted on angled tail-tidy fender bracket clearing rear tire
  const motoPlateY = Math.max(g.groundClearance + 0.24, tl.position.y - 0.14);
  const motoPlateZ = Math.min(tl.position.z - 0.065, rZ - g.wheelRadius - 0.075);
  const tailTidyArm = makeStrutBetween(
    new THREE.Vector3(0, tl.position.y - 0.015, tl.position.z + 0.02),
    new THREE.Vector3(0, motoPlateY + 0.035, motoPlateZ + 0.016),
    0.014,
    0.014,
    mats.trim,
    6,
  );
  const motoPlate = createLicensePlateGroup(
    { variant: 'moto', isRear: true, width: 0.19, height: 0.13 },
    mats,
    cityMode,
  );
  motoPlate.position.set(0, motoPlateY, motoPlateZ);
  motoPlate.rotation.x = -0.22;
  tagPart(motoPlate, 'Placa Traseira Moto', 0, 0.08, -0.42);
  group.add(tailTidyArm, motoPlate);

  // 9. Sculpted 4-into-1 / Dual Exhaust Headers + Collector + Carbon/Titanium Muffler (none on Electric EV!)
  if (!isElectricMoto) {
    const isFourCylHeaders = (isFairedSport || isNaked) && !cityMode;
    if (isFourCylHeaders) {
      const headerGrp = new THREE.Group();
      [-0.084, -0.028, 0.028, 0.084].forEach((hx) => {
        const hCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(hx, engBaseY + 0.18, 0.21),
          new THREE.Vector3(hx * 1.05, engBaseY + 0.045, 0.285),
          new THREE.Vector3(hx * 0.85, g.groundClearance + 0.065, 0.21),
          new THREE.Vector3(hx * 0.40, g.groundClearance + 0.075, 0.02),
        ]);
        const hPipe = new THREE.Mesh(
          new THREE.TubeGeometry(hCurve, 14, 0.016, 8, false),
          mats.alloy,
        );
        headerGrp.add(hPipe);
      });
      const collector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.042, 0.14, 12).rotateX(Math.PI / 2),
        mats.alloy,
      );
      collector.position.set(0, g.groundClearance + 0.075, -0.05);
      headerGrp.add(collector);
      tagPart(headerGrp, 'Coletores de Escape 4-em-1', 0, -0.1, 0.1);
      group.add(headerGrp);
    }

    const buildMotoExhaust = (sideSign: number) => {
      const exX = Math.max(0.20, rearWidth * 0.5 + 0.068);
      const exCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(
          isFourCylHeaders ? sideSign * 0.03 : sideSign * 0.08,
          isFourCylHeaders ? g.groundClearance + 0.075 : engBaseY + 0.12,
          isFourCylHeaders ? -0.10 : 0.24,
        ),
        new THREE.Vector3(sideSign * 0.14, g.groundClearance + 0.095, 0.02),
        new THREE.Vector3(sideSign * (exX - 0.015), g.groundClearance + 0.13, -0.26),
        new THREE.Vector3(
          sideSign * exX,
          isDirt ? g.groundClearance + 0.50 : isCruiser ? g.groundClearance + 0.16 : g.groundClearance + 0.26,
          rZ - 0.02,
        ),
      ]);
      const exGrp = new THREE.Group();
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(exCurve, 18, 0.026, 10, false),
        isNaked || isCruiser ? mats.chrome : mats.alloy,
      );
      const mufLen = isCruiser ? 0.52 : 0.36;
      const mufAngle = isDirt ? 0.32 : isCruiser ? 0.03 : 0.32;
      const mufY = isDirt
        ? g.groundClearance + 0.48
        : isCruiser
          ? g.groundClearance + 0.16
          : g.groundClearance + 0.27;
      const muffler = new THREE.Mesh(
        new THREE.CylinderGeometry(isCruiser ? 0.044 : 0.056, 0.042, mufLen, isFairedSport ? 6 : 10),
        isCruiser ? mats.chrome : isNaked ? mats.alloy : mats.trim,
      );
      muffler.rotation.x = Math.PI / 2 - mufAngle;
      muffler.position.set(sideSign * exX, mufY, rZ + 0.04);
      const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 10), mats.exhaustBore);
      bore.rotation.x = muffler.rotation.x;
      bore.position.set(sideSign * exX, mufY + Math.sin(mufAngle) * (mufLen * 0.5), rZ + 0.04 - mufLen * 0.48);
      exGrp.add(pipe, muffler, bore);

      // Muffler clamp collar + structural hanger stay bolted up to rear subframe / passenger peg mount
      const clampBand = new THREE.Mesh(
        new THREE.CylinderGeometry(isCruiser ? 0.048 : 0.059, isCruiser ? 0.048 : 0.059, 0.028, 10),
        mats.alloy,
      );
      clampBand.rotation.x = muffler.rotation.x;
      clampBand.position.set(sideSign * exX, mufY + Math.sin(mufAngle) * 0.04, rZ + 0.04);
      const hangerAnchorX = isCruiser ? 0.15 : isDirt || v.id === 71 ? 0.105 : 0.185;
      const hangerAnchorY = isCruiser
        ? g.groundClearance + 0.32
        : isDirt
          ? subRearY - 0.04
          : v.id === 71
            ? subRearY - 0.12
            : g.groundClearance + 0.44;
      const hangerAnchorZ = isDirt || v.id === 71 ? rZ + 0.16 : rZ + 0.22;
      const hangerStay = makeStrutBetween(
        new THREE.Vector3(sideSign * (exX - 0.005), mufY + 0.03, rZ + 0.04),
        new THREE.Vector3(sideSign * hangerAnchorX, hangerAnchorY, hangerAnchorZ),
        0.011,
        0.010,
        isCruiser ? mats.chrome : mats.alloy,
        6,
      );
      exGrp.add(clampBand, hangerStay);

      if (!cityMode && isFairedSport) {
        const endCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.058, 0.054, 0.045, 6),
          mats.alloy,
        );
        endCap.rotation.x = muffler.rotation.x;
        endCap.position.set(
          sideSign * exX,
          mufY + Math.sin(mufAngle) * (mufLen * 0.48),
          rZ + 0.04 - mufLen * 0.46,
        );
        exGrp.add(endCap);
      }
      tagPart(exGrp, 'Escapamento Esportivo', sideSign * 0.35, 0, -0.2);
      group.add(exGrp);
    };
    buildMotoExhaust(1);
    if (g.attachments.includes('dual_exhaust') || g.exhaustStyle === 'dual') buildMotoExhaust(-1);
  }

  if (g.attachments.includes('moto_box')) {
    // Tubular steel rear carrier rack anchored cleanly from subframe under the delivery box
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 0.10, g.groundClearance + 0.66, rZ + 0.20),
          new THREE.Vector3(side * 0.16, g.groundClearance + 0.56, rZ - 0.14),
          0.014,
          0.014,
          mats.trim,
          6,
        ),
        makeStrutBetween(
          new THREE.Vector3(side * 0.12, g.groundClearance + 0.44, rZ + 0.18),
          new THREE.Vector3(side * 0.16, g.groundClearance + 0.56, rZ - 0.10),
          0.012,
          0.012,
          mats.trim,
          6,
        ),
      );
    });
    const rackBase = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.026, 0.40, 0.01, 1, 4),
      mats.trim,
    );
    rackBase.position.set(0, g.groundClearance + 0.56, rZ - 0.04);
    group.add(rackBase);

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
    // Welded rear police radio/beacon rack bridging saddlebags & subframe
    const policeBridge = new THREE.Mesh(
      createRoundedBoxGeo(0.40, 0.032, 0.24, 0.01, 2, 6),
      mats.trim,
    );
    policeBridge.position.set(0, g.groundClearance + 0.56, rZ - 0.06);
    group.add(policeBridge);

    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 0.11, g.groundClearance + 0.44, rZ + 0.08),
          new THREE.Vector3(side * 0.17, g.groundClearance + 0.56, rZ - 0.08),
          0.013,
          0.013,
          mats.chrome,
          6,
        ),
      );
      const sirenPole = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.022, 0.38, 10), mats.chrome);
      sirenPole.position.set(side * 0.17, g.groundClearance + 0.74, rZ - 0.08);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.085, 14),
        side < 0 ? mats.sirenBlue : mats.sirenRed,
      );
      beacon.position.set(side * 0.17, g.groundClearance + 0.95, rZ - 0.08);
      tagPart(beacon, 'Giroflex Traseiro Polícia', side * 0.2, 0.5, -0.2);
      group.add(sirenPole, beacon);

      // Front fork-mounted strobe pods anchored cleanly to lower fork sliders
      const strobeArm = makeStrutBetween(
        new THREE.Vector3(side * forkSpanX, -0.14, 0.045),
        new THREE.Vector3(side * (forkSpanX + 0.048), -0.14, 0.08),
        0.010,
        0.010,
        mats.trim,
        6,
      );
      const frontStrobe = new THREE.Mesh(
        createRoundedBoxGeo(0.056, 0.036, 0.04, 0.01, 2, 6),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      frontStrobe.position.set(side * (forkSpanX + 0.055), -0.14, 0.09);
      frontForkPivot.add(strobeArm, frontStrobe);
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
