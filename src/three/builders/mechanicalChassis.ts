import * as THREE from 'three';
import { parseDriveArchitecture } from '../../data/mechanicalSpecs';
import { VehicleConcept } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createRoundedBoxGeo,
  makeBeamBetween,
  makeStrutBetween,
  tagMechPart,
} from './types';

export interface DetailedMechanicalChassisOptions {
  group: THREE.Group;
  v: VehicleConcept;
  mats: VehicleMaterialSet;
  animated: BuiltVehicle['animatedParts'];
  frontWheelZ: number;
  rearWheelZ: number;
  extraRearAxleZs?: number[];
  wheelX: number;
  wheelY: number;
  wheelRadius: number;
  wheelWidth: number;
  maxTopY?: number;
  frontSteerPivots?: { left?: THREE.Group; right?: THREE.Group };
  layout?: 'standard' | 'supercar' | 'buggy' | 'monster' | 'formula' | 'heavy';
  cityMode?: boolean;
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function createHelicalSpringGeo(
  coilR: number,
  wireR: number,
  length: number,
  turns = 6.5,
  tubularSegs = 40,
  radialSegs = 6,
): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const totalSteps = Math.max(24, Math.round(turns * 8));
  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const ang = t * turns * Math.PI * 2;
    const y = (t - 0.5) * length;
    pts.push(new THREE.Vector3(Math.cos(ang) * coilR, y, Math.sin(ang) * coilR));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, tubularSegs, wireR, radialSegs, false);
}

function createAccordionBootGeo(
  len: number,
  rSmall: number,
  rLarge: number,
  ribs = 4,
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = ribs * 2 + 1;
  pts.push(new THREE.Vector2(rSmall * 0.85, -len * 0.5));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = (t - 0.5) * len;
    const taper = THREE.MathUtils.lerp(rSmall, rLarge, Math.pow(t, 0.85));
    const rib = i % 2 === 1 ? taper * 1.18 : taper * 0.86;
    pts.push(new THREE.Vector2(Math.max(0.008, rib), y));
  }
  pts.push(new THREE.Vector2(rLarge * 0.85, len * 0.5));
  return new THREE.LatheGeometry(pts, 14);
}

function buildCoaxialCoilover(
  pBottom: THREE.Vector3,
  pTop: THREE.Vector3,
  bodyR: number,
  springR: number,
  mats: VehicleMaterialSet,
  springTurns = 6,
): THREE.Group {
  const grp = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(pTop, pBottom);
  const len = Math.max(0.12, dir.length());
  const unit = dir.clone().divideScalar(len);

  grp.position.copy(pBottom).add(pTop).multiplyScalar(0.5);
  grp.quaternion.setFromUnitVectors(UP_AXIS, unit);

  // Lower shock cylinder body
  const cylLen = len * 0.56;
  const shockBody = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR, bodyR * 0.94, cylLen, 10),
    mats.trim,
  );
  shockBody.position.y = -len * 0.5 + cylLen * 0.5;
  grp.add(shockBody);

  // Upper chrome piston rod
  const rodLen = len * 0.54;
  const pistonRod = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyR * 0.48, bodyR * 0.48, rodLen, 8),
    mats.chrome,
  );
  pistonRod.position.y = len * 0.5 - rodLen * 0.5;
  grp.add(pistonRod);

  // Threaded upper & lower anodized spring perches
  const springLen = len * 0.62;
  const springBotY = -len * 0.5 + len * 0.14;
  const springTopY = springBotY + springLen;
  [springBotY, springTopY].forEach((py) => {
    const perch = new THREE.Mesh(
      new THREE.CylinderGeometry(springR * 1.14, springR * 1.14, 0.018, 12),
      mats.alloy,
    );
    perch.position.y = py;
    grp.add(perch);
  });

  // Helical coil spring
  const springMesh = new THREE.Mesh(
    createHelicalSpringGeo(
      springR,
      Math.max(0.0055, springR * 0.21),
      springLen,
      springTurns,
      Math.max(36, Math.round(springTurns * 6)),
      6,
    ),
    mats.caliper,
  );
  springMesh.position.y = (springBotY + springTopY) * 0.5;
  grp.add(springMesh);

  // Top & bottom eye mounting clevises
  [-len * 0.49, len * 0.49].forEach((ey) => {
    const eye = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyR * 0.85, bodyR * 0.85, bodyR * 1.9, 8).rotateX(Math.PI / 2),
      mats.alloy,
    );
    eye.position.y = ey;
    grp.add(eye);
  });

  return grp;
}

function buildBushingCollar(
  pos: THREE.Vector3,
  radius: number,
  length: number,
  axis: 'x' | 'z',
  mats: VehicleMaterialSet,
): THREE.Group {
  const b = new THREE.Group();
  b.position.copy(pos);
  if (axis === 'x') b.rotation.z = Math.PI / 2;
  else b.rotation.x = Math.PI / 2;

  const elastomer = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 10),
    mats.accent,
  );
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.58, radius * 0.58, length * 1.24, 10),
    mats.chrome,
  );
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.22, radius * 1.22, length * 0.62, 10),
    mats.trim,
  );
  b.add(elastomer, sleeve, housing);
  return b;
}

function buildHalfShaftWithCV(
  pInner: THREE.Vector3,
  pOuter: THREE.Vector3,
  shaftR: number,
  mats: VehicleMaterialSet,
): THREE.Group {
  const grp = new THREE.Group();
  const dir = new THREE.Vector3().subVectors(pOuter, pInner);
  const len = Math.max(0.12, dir.length());
  const unit = dir.clone().divideScalar(len);

  grp.position.copy(pInner).add(pOuter).multiplyScalar(0.5);
  grp.quaternion.setFromUnitVectors(UP_AXIS, unit);

  // Central tempered steel axle shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, len * 0.88, 10),
    mats.alloy,
  );
  grp.add(shaft);

  const bellLen = Math.min(0.082, len * 0.20);
  const bootLen = Math.min(0.105, len * 0.25);

  // Inner tripod CV housing + accordion boot + stainless clamps
  const innerBell = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR * 2.3, shaftR * 1.9, bellLen, 12),
    mats.trim,
  );
  innerBell.position.y = -len * 0.5 + bellLen * 0.48;
  grp.add(innerBell);

  const innerBoot = new THREE.Mesh(
    createAccordionBootGeo(bootLen, shaftR * 2.15, shaftR * 1.25, 4),
    mats.rubber,
  );
  innerBoot.position.y = -len * 0.5 + bellLen + bootLen * 0.45;
  grp.add(innerBoot);

  // Outer Rzeppa CV joint housing + accordion boot
  const outerBell = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR * 1.9, shaftR * 2.35, bellLen, 12),
    mats.trim,
  );
  outerBell.position.y = len * 0.5 - bellLen * 0.48;
  grp.add(outerBell);

  const outerBoot = new THREE.Mesh(
    createAccordionBootGeo(bootLen, shaftR * 1.25, shaftR * 2.2, 4),
    mats.rubber,
  );
  outerBoot.position.y = len * 0.5 - bellLen - bootLen * 0.45;
  grp.add(outerBoot);

  // Stainless clamp bands securing both boots
  [-len * 0.5 + bellLen + 0.008, len * 0.5 - bellLen - 0.008].forEach((cy) => {
    const clamp = new THREE.Mesh(
      new THREE.CylinderGeometry(shaftR * 2.25, shaftR * 2.25, 0.012, 12),
      mats.chrome,
    );
    clamp.position.y = cy;
    grp.add(clamp);
  });

  return grp;
}

export function addDetailedMechanicalChassis(opts: DetailedMechanicalChassisOptions): void {
  const {
    group,
    v,
    mats,
    animated,
    frontWheelZ,
    rearWheelZ,
    extraRearAxleZs = [],
    wheelX,
    wheelY,
    wheelRadius,
    wheelWidth,
    maxTopY = wheelY + wheelRadius * 0.9,
    frontSteerPivots,
    layout = 'standard',
    cityMode = false,
  } = opts;

  if (cityMode) return;

  const { width, length } = v.dimensions;
  const gc = Math.max(0.05, v.geometry.groundClearance);
  const drive = parseDriveArchitecture(v);

  const isFormula = layout === 'formula';
  const isMonster = layout === 'monster';
  const isBuggy = layout === 'buggy';
  const isHeavy = layout === 'heavy';
  const isSupercar = layout === 'supercar' || v.geometry.archetype === 'supercar';
  const isOffroadLifted =
    !isFormula &&
    !isMonster &&
    !isHeavy &&
    (v.geometry.archetype === 'pickup' ||
      v.geometry.archetype === 'suv' ||
      v.geometry.archetype === 'buggy' ||
      gc >= 0.23);

  const uprightX = isFormula
    ? wheelX - wheelWidth * 0.36
    : wheelX - wheelWidth * (isMonster ? 0.58 : 0.56);

  // Outer hub ball joints stay centered around the wheel hub (wheelY = wheelRadius)
  const lowerBallY = Math.max(0.095, wheelY - Math.min(wheelRadius * 0.31, 0.125));
  const upperBallY = wheelY + Math.min(wheelRadius * 0.29, 0.115);

  // Inner chassis subframe pivots lift cleanly with groundClearance so wishbones slope realistically on lifted vehicles
  const innerLowerY = isFormula
    ? Math.max(gc + 0.03, lowerBallY - 0.008)
    : Math.max(gc + 0.042, Math.min(maxTopY - 0.14, Math.max(lowerBallY, gc + 0.055)));
  const innerUpperY = isFormula
    ? Math.max(innerLowerY + 0.10, upperBallY - 0.01)
    : Math.max(
        innerLowerY + 0.11,
        Math.min(maxTopY - 0.055, Math.max(upperBallY, innerLowerY + (upperBallY - lowerBallY) * 0.88)),
      );
  const monsterFrameY = Math.max(wheelY + 0.02, Math.max(gc * 0.55 + 0.14, wheelY * 0.96));

  const innerLowerX = isFormula
    ? 0.15
    : Math.min(uprightX - 0.16, Math.max(0.18, width * (isMonster ? 0.22 : 0.19)));
  const innerUpperX = isFormula
    ? 0.16
    : Math.min(uprightX - 0.14, Math.max(0.20, width * (isMonster ? 0.24 : 0.22)));

  const armSpreadZ = Math.min(wheelRadius * 0.50, isFormula ? 0.20 : 0.18);
  const armR = isHeavy ? 0.022 : isMonster ? 0.024 : isFormula ? 0.011 : 0.0145;
  const springTurns = isMonster || isOffroadLifted || isBuggy ? 8.5 : isHeavy ? 7 : isSupercar ? 5.5 : 6.5;
  const shockTopY = isMonster
    ? Math.max(monsterFrameY + 0.18, wheelY + wheelRadius * 0.92)
    : Math.min(
        maxTopY - 0.035,
        Math.max(
          innerUpperY + 0.11,
          wheelY +
            Math.min(
              wheelRadius * (isOffroadLifted ? 0.92 : isBuggy ? 0.82 : isHeavy ? 0.68 : 0.50),
              isOffroadLifted ? 0.38 : 0.24,
            ),
        ),
      );

  // Subsystem groups (tagged with mechPartId so clicking & X-Ray highlighting work per subsystem!)
  const wishbonesGrp = new THREE.Group();
  const shocksGrp = new THREE.Group();
  const bushingsGrp = new THREE.Group();
  const knuckleSteeringGrp = new THREE.Group();
  const swayBarGrp = new THREE.Group();
  const gearboxGrp = new THREE.Group();
  const cvJointsGrp = new THREE.Group();
  const drivetrainGrp = new THREE.Group();

  const allRearAxles = [rearWheelZ, ...extraRearAxleZs];
  const primaryAxles = [
    { z: frontWheelZ, isFront: true },
    ...allRearAxles.map((z) => ({ z, isFront: false })),
  ];

  // =========================================================================
  // 1. SUBFRAME CROSSMEMBERS + BANDEJAS (WISHBONES / 4-LINK) + BUCHAS
  // =========================================================================
  if (isMonster) {
    // Solid axle housings + 4-link trailing arms + Panhard bars + dual coilovers with bypass reservoirs
    primaryAxles.forEach((ax) => {
      const axleHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, wheelX * 1.92, 14).rotateZ(Math.PI / 2),
        mats.trim,
      );
      axleHousing.position.set(0, wheelY, ax.z);
      drivetrainGrp.add(axleHousing);

      const dirSign = ax.isFront ? -1 : 1;
      [-1, 1].forEach((side) => {
        const axlePtLo = new THREE.Vector3(side * (width * 0.28), wheelY - 0.06, ax.z);
        const axlePtHi = new THREE.Vector3(side * (width * 0.22), wheelY + 0.09, ax.z);
        const framePtLo = new THREE.Vector3(side * (width * 0.22), monsterFrameY - 0.06, ax.z + dirSign * 0.62);
        const framePtHi = new THREE.Vector3(side * (width * 0.18), monsterFrameY + 0.08, ax.z + dirSign * 0.54);

        wishbonesGrp.add(
          makeStrutBetween(axlePtLo, framePtLo, armR, armR, mats.trim, 8),
          makeStrutBetween(axlePtHi, framePtHi, armR * 0.85, armR * 0.85, mats.trim, 8),
        );
        bushingsGrp.add(
          buildBushingCollar(framePtLo, armR * 1.65, 0.06, 'x', mats),
          buildBushingCollar(framePtHi, armR * 1.55, 0.055, 'x', mats),
        );

        // Dual long-travel coilover shock + bypass reservoir
        const shockBot = new THREE.Vector3(side * (width * 0.34), wheelY + 0.04, ax.z + 0.04);
        const shockTop = new THREE.Vector3(side * (width * 0.25), shockTopY, ax.z + 0.02);
        shocksGrp.add(buildCoaxialCoilover(shockBot, shockTop, 0.036, 0.068, mats, springTurns));

        const reservoir = makeStrutBetween(
          new THREE.Vector3(side * (width * 0.22), shockTopY - 0.06, ax.z - 0.06),
          new THREE.Vector3(side * (width * 0.24), shockTopY - 0.28, ax.z - 0.06),
          0.028,
          0.028,
          mats.alloy,
          10,
        );
        shocksGrp.add(reservoir);
      });

      // Transverse Panhard / Track bar
      const panhardL = new THREE.Vector3(-width * 0.26, wheelY + 0.06, ax.z + (ax.isFront ? 0.10 : -0.10));
      const panhardR = new THREE.Vector3(width * 0.24, monsterFrameY + 0.04, ax.z + (ax.isFront ? 0.10 : -0.10));
      wishbonesGrp.add(makeStrutBetween(panhardL, panhardR, 0.019, 0.019, mats.alloy, 8));
      bushingsGrp.add(buildBushingCollar(panhardR, 0.032, 0.05, 'z', mats));
    });
  } else {
    primaryAxles.forEach((ax, axIdx) => {
      const wz = ax.z;
      // Structural front/rear suspension subframe cradle connecting left & right inner arm pivots
      const subBeam = new THREE.Mesh(
        createRoundedBoxGeo(innerLowerX * 2.15, 0.046, armSpreadZ * 2.1, 0.012, 2, 6),
        mats.trim,
      );
      subBeam.position.set(0, innerLowerY - 0.01, wz);
      wishbonesGrp.add(subBeam);

      [-1, 1].forEach((side) => {
        const upOuter = new THREE.Vector3(side * uprightX, upperBallY, wz);
        const loOuter = new THREE.Vector3(side * uprightX, lowerBallY, wz);

        const upInF = new THREE.Vector3(side * innerUpperX, innerUpperY, wz + armSpreadZ);
        const upInR = new THREE.Vector3(side * innerUpperX, innerUpperY, wz - armSpreadZ);
        const loInF = new THREE.Vector3(side * innerLowerX, innerLowerY, wz + armSpreadZ * 1.06);
        const loInR = new THREE.Vector3(side * innerLowerX, innerLowerY, wz - armSpreadZ * 1.06);

        // Upper & Lower A-Arm Wishbones (Bandejas)
        wishbonesGrp.add(
          makeStrutBetween(upInF, upOuter, armR * 0.88, armR * 0.88, mats.trim, 8),
          makeStrutBetween(upInR, upOuter, armR * 0.88, armR * 0.88, mats.trim, 8),
          makeStrutBetween(loInF, loOuter, armR * 1.05, armR * 1.05, mats.trim, 8),
          makeStrutBetween(loInR, loOuter, armR * 1.05, armR * 1.05, mats.trim, 8),
        );

        // Inner Pivot Bushings (Buchas)
        const bushR = armR * 1.65;
        const bushL = armR * 2.6;
        bushingsGrp.add(
          buildBushingCollar(upInF, bushR * 0.9, bushL, 'z', mats),
          buildBushingCollar(upInR, bushR * 0.9, bushL, 'z', mats),
          buildBushingCollar(loInF, bushR, bushL * 1.1, 'z', mats),
          buildBushingCollar(loInR, bushR, bushL * 1.1, 'z', mats),
        );

        // Shocks & Helical Coil Springs (Amortecedores e Molas)
        if (isFormula) {
          // Carbon diagonal pushrod + inboard horizontal torsion damper & coil spring on monocoque deck
          const pushTop = new THREE.Vector3(side * (innerUpperX + 0.01), innerUpperY + 0.04, wz + (ax.isFront ? -0.05 : 0.08));
          shocksGrp.add(makeStrutBetween(loOuter, pushTop, 0.0105, 0.0105, mats.alloy, 8));
          const inboardEnd = new THREE.Vector3(
            side * 0.06,
            innerUpperY + 0.05,
            wz + (ax.isFront ? -0.22 : 0.24),
          );
          shocksGrp.add(buildCoaxialCoilover(pushTop, inboardEnd, 0.018, 0.032, mats, 5.5));
        } else {
          const loInMid = new THREE.Vector3().addVectors(loInF, loInR).multiplyScalar(0.5);
          const shockBot = new THREE.Vector3()
            .lerpVectors(loInMid, loOuter, 0.72)
            .add(new THREE.Vector3(0, 0.024, -0.015));
          const shockTop = new THREE.Vector3(
            side * (innerUpperX + 0.055),
            shockTopY,
            wz - 0.015,
          );
          const bodyR = isHeavy ? 0.034 : isOffroadLifted ? 0.026 : 0.022;
          const springR = isHeavy ? 0.062 : isOffroadLifted ? 0.050 : 0.044;
          shocksGrp.add(buildCoaxialCoilover(shockBot, shockTop, bodyR, springR, mats, springTurns));

          if (isBuggy) {
            const res = makeStrutBetween(
              new THREE.Vector3(side * (innerUpperX + 0.01), shockTopY - 0.03, wz - 0.075),
              new THREE.Vector3(side * (innerUpperX + 0.01), shockTopY - 0.19, wz - 0.075),
              0.019,
              0.019,
              mats.alloy,
              8,
            );
            shocksGrp.add(res);
          }
        }
      });

      // Leaf spring helper packs for tandem heavy truck rear axles
      if (isHeavy && !ax.isFront && axIdx <= 2) {
        [-1, 1].forEach((side) => {
          const leafPack = new THREE.Mesh(
            createRoundedBoxGeo(0.075, 0.065, 0.78, 0.012, 2, 6),
            mats.trim,
          );
          leafPack.position.set(side * (width * 0.28), Math.max(upperBallY, innerUpperY) + 0.04, wz);
          shocksGrp.add(leafPack);
        });
      }
    });
  }

  // =========================================================================
  // 2. BARRA ESTABILIZADORA + BIELETAS + BUCHAS DA BARRA
  // =========================================================================
  const swayAxles = [
    { z: frontWheelZ, offsetDir: -1 },
    { z: rearWheelZ, offsetDir: 1 },
  ];
  swayAxles.forEach((sa) => {
    const barZ = sa.z + sa.offsetDir * Math.min(0.24, wheelRadius * 0.65);
    const armEndZ = sa.z + sa.offsetDir * Math.min(0.06, wheelRadius * 0.16);
    const barY = isMonster ? monsterFrameY - 0.02 : Math.max(gc + 0.048, innerLowerY + 0.022);
    const barHalfW = Math.max(0.22, innerLowerX * 0.96);
    const armOutX = Math.min(uprightX - 0.09, barHalfW + 0.14);
    const barR = isHeavy || isMonster ? 0.018 : isFormula ? 0.0085 : 0.0125;

    const barCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-armOutX, barY, armEndZ),
      new THREE.Vector3(-barHalfW, barY, barZ),
      new THREE.Vector3(0, barY, barZ),
      new THREE.Vector3(barHalfW, barY, barZ),
      new THREE.Vector3(armOutX, barY, armEndZ),
    ]);
    const swayMesh = new THREE.Mesh(
      new THREE.TubeGeometry(barCurve, 22, barR, 8, false),
      mats.accent,
    );
    swayBarGrp.add(swayMesh);

    [-1, 1].forEach((side) => {
      // Sway bar chassis mounting bushings (Buchas)
      bushingsGrp.add(
        buildBushingCollar(new THREE.Vector3(side * (barHalfW * 0.76), barY, barZ), barR * 1.75, 0.046, 'x', mats),
      );

      // Bieleta (sway bar drop link connecting bar end to lower wishbone / solid axle)
      const linkTop = new THREE.Vector3(side * armOutX, barY, armEndZ);
      const linkBotY = isMonster
        ? wheelY + 0.02
        : THREE.MathUtils.lerp(innerLowerY, lowerBallY, 0.72) + 0.015;
      const linkBot = new THREE.Vector3(side * (armOutX + side * 0.015), linkBotY, sa.z);
      const linkMid = makeStrutBetween(linkTop, linkBot, 0.0075, 0.0075, mats.chrome, 8);
      const jointTop = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), mats.alloy);
      jointTop.position.copy(linkTop);
      const jointBot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), mats.alloy);
      jointBot.position.copy(linkBot);
      knuckleSteeringGrp.add(linkMid, jointTop, jointBot);
    });
  });

  // =========================================================================
  // 3. MANGAS DE EIXO, PIVÔS, CAIXA DE DIREÇÃO & TERMINAIS ARTICULADOS
  // =========================================================================
  const localSteerArmZ = -Math.min(0.115, wheelRadius * 0.34);
  const localSteerArmInX = 0.032;
  const rackZ = frontWheelZ + localSteerArmZ - 0.015;
  const rackY = isMonster
    ? monsterFrameY - 0.04
    : THREE.MathUtils.clamp(
        innerLowerY + 0.035,
        lowerBallY + 0.02,
        Math.max(lowerBallY + 0.05, upperBallY + 0.04),
      );
  const rackHousingHalfW = Math.max(0.16, innerLowerX * 0.82);
  const rackShaftHalfW = rackHousingHalfW + 0.055;

  // Steering rack housing + pinion + accordion boots
  const rackHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, rackHousingHalfW * 2, 12).rotateZ(Math.PI / 2),
    mats.alloy,
  );
  rackHousing.position.set(0, rackY, rackZ);
  knuckleSteeringGrp.add(rackHousing);

  const pinionTower = makeStrutBetween(
    new THREE.Vector3(-width * 0.08, rackY, rackZ),
    new THREE.Vector3(-width * 0.14, rackY + 0.14, rackZ - 0.08),
    0.022,
    0.026,
    mats.trim,
    10,
  );
  knuckleSteeringGrp.add(pinionTower);

  // Moving inner rack shaft
  const rackBar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, rackShaftHalfW * 2, 10).rotateZ(Math.PI / 2),
    mats.chrome,
  );
  rackBar.position.set(0, rackY, rackZ);
  knuckleSteeringGrp.add(rackBar);

  [-1, 1].forEach((side) => {
    const rackBoot = new THREE.Mesh(
      createAccordionBootGeo(0.095, 0.030, 0.017, 4).rotateZ(side * (Math.PI / 2)),
      mats.rubber,
    );
    rackBoot.position.set(side * (rackHousingHalfW + 0.022), rackY, rackZ);
    knuckleSteeringGrp.add(rackBoot);
  });

  // Build front steering knuckles INSIDE frontSteerPivots so they steer cleanly around Y!
  const tieRodsAnim: BuiltVehicle['animatedParts']['steeringLinkages'][number]['rods'] = [];

  [-1, 1].forEach((side) => {
    const steerPivot = side < 0 ? frontSteerPivots?.left : frontSteerPivots?.right;
    const localUprightX = -side * (wheelX - uprightX);
    const dyLo = lowerBallY - wheelY;
    const dyHi = upperBallY - wheelY;
    const armOnKnuckleY = THREE.MathUtils.clamp(rackY - wheelY, dyLo + 0.025, dyHi - 0.02);
    const outerArmLocal = new THREE.Vector3(
      localUprightX - side * localSteerArmInX,
      armOnKnuckleY,
      localSteerArmZ,
    );

    const knuckleUnit = new THREE.Group();
    const uprightBeam = makeBeamBetween(
      new THREE.Vector3(localUprightX, dyLo, 0),
      new THREE.Vector3(localUprightX, dyHi, 0),
      0.036,
      0.068,
      mats.alloy,
      new THREE.Vector3(side, 0, 0),
      0.008,
    );
    const hubBoss = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelRadius * 0.24, wheelRadius * 0.26, 0.048, 14).rotateZ(Math.PI / 2),
      mats.trim,
    );
    hubBoss.position.set(localUprightX + side * 0.018, 0, 0);

    const steerArmBeam = makeBeamBetween(
      new THREE.Vector3(localUprightX, armOnKnuckleY + 0.01, -0.02),
      outerArmLocal,
      0.020,
      0.024,
      mats.alloy,
      new THREE.Vector3(0, 1, 0),
      0.004,
    );

    // Upper & lower ball joints (Pivôs) + outer tie-rod ball stud
    const addBallJoint = (pos: THREE.Vector3) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 10), mats.chrome);
      ball.position.copy(pos);
      const boot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.022, 0.022, 10),
        mats.rubber,
      );
      boot.position.set(pos.x, pos.y + (pos.y < 0 ? 0.010 : -0.010), pos.z);
      knuckleUnit.add(ball, boot);
    };
    addBallJoint(new THREE.Vector3(localUprightX, dyLo, 0));
    addBallJoint(new THREE.Vector3(localUprightX, dyHi, 0));
    addBallJoint(outerArmLocal);

    knuckleUnit.add(uprightBeam, hubBoss, steerArmBeam);
    tagMechPart(
      knuckleUnit,
      'knuckle_tie_rods',
      side < 0 ? 'Manga de Eixo e Pivô Dianteiro Esq.' : 'Manga de Eixo e Pivô Dianteiro Dir.',
      0,
      0,
      0,
    );

    if (steerPivot) {
      steerPivot.add(knuckleUnit);
    } else {
      knuckleUnit.position.set(side * wheelX, wheelY, frontWheelZ);
      knuckleSteeringGrp.add(knuckleUnit);
    }

    // Dynamic Tie-Rod + Terminal de Direção spanning from rack shaft tip to outer steering arm
    const innerAnchor = new THREE.Vector3(side * rackShaftHalfW, rackY, rackZ);
    const pivotCenter = new THREE.Vector3(side * wheelX, wheelY, frontWheelZ);
    const outerNeutral = pivotCenter.clone().add(outerArmLocal);
    const rodVec = new THREE.Vector3().subVectors(outerNeutral, innerAnchor);
    const baseLen = Math.max(0.08, rodVec.length());

    const rodPivot = new THREE.Group();
    const rodShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, baseLen * 0.88, 8),
      mats.chrome,
    );
    rodShaft.position.y = baseLen * 0.44;
    const jamNut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.016, 6),
      mats.alloy,
    );
    jamNut.position.y = baseLen * 0.82;
    const tieRodEnd = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.017, 0.032, 10),
      mats.trim,
    );
    tieRodEnd.position.y = baseLen * 0.94;
    rodPivot.add(rodShaft, jamNut, tieRodEnd);

    rodPivot.position.copy(innerAnchor);
    rodPivot.quaternion.setFromUnitVectors(UP_AXIS, rodVec.clone().normalize());
    knuckleSteeringGrp.add(rodPivot);

    tieRodsAnim.push({
      rod: rodPivot,
      innerAnchor,
      pivotCenter,
      outerLocal: outerArmLocal,
      baseLen,
    });

    // Rear fixed upright carrier + ball joints
    allRearAxles.forEach((rz) => {
      const rUpright = makeBeamBetween(
        new THREE.Vector3(side * uprightX, lowerBallY, rz),
        new THREE.Vector3(side * uprightX, upperBallY, rz),
        0.034,
        0.064,
        mats.alloy,
        new THREE.Vector3(side, 0, 0),
        0.008,
      );
      const rHub = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.24, wheelRadius * 0.26, 0.048, 14).rotateZ(Math.PI / 2),
        mats.trim,
      );
      rHub.position.set(side * (uprightX + side * 0.018), wheelY, rz);
      knuckleSteeringGrp.add(rUpright, rHub);
    });
  });

  animated.steeringLinkages.push({
    rackBar,
    rackBasePos: rackBar.position.clone(),
    rackTravelScale: Math.min(0.065, wheelRadius * 0.16),
    rods: tieRodsAnim,
  });

  // =========================================================================
  // 4. CÂMBIO (CAIXA DE MARCHAS)
  // =========================================================================
  const gearboxY = isMonster
    ? monsterFrameY + 0.05
    : Math.max(gc + 0.08, innerLowerY + 0.025);
  if (isFormula || (isSupercar && drive.isMidEngine)) {
    // Mid-rear longitudinal DCT / Sequential Transaxle housing immediately ahead/at rear axle
    const transZ = rearWheelZ + (isFormula ? 0.34 : 0.42);
    const transLen = Math.min(0.76, Math.max(0.45, Math.abs(frontWheelZ - rearWheelZ) * 0.28));
    const bellhousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.115, transLen * 0.45, 14).rotateX(Math.PI / 2),
      mats.alloy,
    );
    bellhousing.position.set(0, gearboxY + 0.02, transZ + transLen * 0.24);
    const mainCase = new THREE.Mesh(
      createRoundedBoxGeo(0.26, 0.22, transLen * 0.56, 0.035, 2, 8),
      mats.alloy,
    );
    mainCase.position.set(0, gearboxY + 0.01, transZ - transLen * 0.16);
    const ribCover = new THREE.Mesh(
      createRoundedBoxGeo(0.29, 0.05, transLen * 0.48, 0.012, 2, 6),
      mats.trim,
    );
    ribCover.position.set(0, gearboxY + 0.11, transZ - transLen * 0.16);
    gearboxGrp.add(bellhousing, mainCase, ribCover);

    if (drive.isHybrid && drive.isAWD) {
      // Front hybrid e-Axle motor + planetary reducer unit
      const eAxle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.105, 0.105, 0.34, 14).rotateZ(Math.PI / 2),
        mats.alloy,
      );
      eAxle.position.set(0, gearboxY, frontWheelZ + 0.03);
      const hvInverter = new THREE.Mesh(
        createRoundedBoxGeo(0.24, 0.075, 0.22, 0.02, 2, 6),
        mats.accent,
      );
      hvInverter.position.set(0, gearboxY + 0.10, frontWheelZ + 0.03);
      gearboxGrp.add(eAxle, hvInverter);
    }
  } else if (drive.isElectric && !drive.isHybrid) {
    // Compact electric single-speed reduction gearbox(es)
    const axlesForEv = [
      ...(drive.frontDriven ? [frontWheelZ + 0.02] : []),
      ...(drive.rearDriven ? [rearWheelZ - 0.02] : []),
    ];
    axlesForEv.forEach((ez) => {
      const eUnit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.115, 0.34, 14).rotateZ(Math.PI / 2),
        mats.alloy,
      );
      eUnit.position.set(0, gearboxY, ez);
      const finBox = new THREE.Mesh(
        createRoundedBoxGeo(0.24, 0.12, 0.24, 0.025, 2, 6),
        mats.trim,
      );
      finBox.position.set(0, gearboxY + 0.04, ez);
      gearboxGrp.add(eUnit, finBox);
    });
  } else if (drive.isFWD) {
    // Transverse FWD transaxle housing
    const trans = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.20, 0.26, 0.035, 2, 8),
      mats.alloy,
    );
    trans.position.set(-0.08, gearboxY + 0.02, frontWheelZ - 0.02);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.10, 0.18, 12).rotateZ(Math.PI / 2),
      mats.trim,
    );
    bell.position.set(0.14, gearboxY + 0.02, frontWheelZ - 0.02);
    gearboxGrp.add(trans, bell);
  } else {
    // Longitudinal gearbox (+ transfer case on AWD/4x4)
    const gbZ = drive.isRearEngine
      ? rearWheelZ + 0.48
      : frontWheelZ - Math.min(0.68, Math.abs(frontWheelZ - rearWheelZ) * 0.26);
    const gbScale = isHeavy || isMonster ? 1.28 : 1.0;
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * gbScale, 0.115 * gbScale, 0.26 * gbScale, 14).rotateX(Math.PI / 2),
      mats.alloy,
    );
    bell.position.set(0, gearboxY + 0.02, gbZ + 0.22 * gbScale);
    const gbCase = new THREE.Mesh(
      createRoundedBoxGeo(0.24 * gbScale, 0.22 * gbScale, 0.44 * gbScale, 0.035, 2, 8),
      mats.alloy,
    );
    gbCase.position.set(0, gearboxY + 0.01, gbZ - 0.08 * gbScale);
    const pan = new THREE.Mesh(
      createRoundedBoxGeo(0.22 * gbScale, 0.045, 0.36 * gbScale, 0.01, 2, 6),
      mats.trim,
    );
    pan.position.set(0, gearboxY - 0.10 * gbScale, gbZ - 0.08 * gbScale);
    gearboxGrp.add(bell, gbCase, pan);

    if (drive.isAWD) {
      const tCase = new THREE.Mesh(
        createRoundedBoxGeo(0.26 * gbScale, 0.20 * gbScale, 0.28 * gbScale, 0.03, 2, 8),
        mats.trim,
      );
      tCase.position.set(0.05 * gbScale, gearboxY - 0.02, gbZ - 0.40 * gbScale);
      gearboxGrp.add(tCase);
    }
  }

  // =========================================================================
  // 5. EIXO DE TRANSMISSÃO / DIFERENCIAIS
  // =========================================================================
  const diffY = isMonster ? wheelY : Math.max(gc + 0.05, wheelY - 0.015);
  const diffR = isHeavy || isMonster ? 0.145 : isFormula ? 0.095 : 0.11;

  const addDifferentialPumpkin = (zPos: number) => {
    const pumpkin = new THREE.Mesh(
      new THREE.SphereGeometry(diffR, 14, 12),
      mats.alloy,
    );
    pumpkin.scale.set(1.05, 0.96, 1.15);
    pumpkin.position.set(0, diffY, zPos);

    const cover = new THREE.Mesh(
      new THREE.CylinderGeometry(diffR * 0.88, diffR * 0.88, 0.045, 14).rotateX(Math.PI / 2),
      mats.trim,
    );
    cover.position.set(0, diffY, zPos - diffR * 0.85);

    const flangeBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(diffR * 0.45, diffR * 0.45, diffR * 2.6, 12).rotateZ(Math.PI / 2),
      mats.trim,
    );
    flangeBarrel.position.set(0, diffY, zPos);
    drivetrainGrp.add(pumpkin, cover, flangeBarrel);
  };

  if (drive.rearDriven) {
    allRearAxles.forEach((rz) => addDifferentialPumpkin(rz));
  }
  if (drive.frontDriven) {
    addDifferentialPumpkin(frontWheelZ - 0.01);
  }

  // Central longitudinal driveshaft (Eixo Cardã) or Hybrid torque spine
  const spanLen = Math.max(0.4, frontWheelZ - rearWheelZ);
  if (drive.rearDriven && !isFormula) {
    if (drive.isMidEngine && drive.isHybrid && drive.isAWD) {
      // Carbon structural central spine + HV bus connecting front e-Axle diff to mid-rear transaxle
      const spineZ0 = frontWheelZ - 0.14;
      const spineZ1 = rearWheelZ + 0.56;
      if (spineZ0 - spineZ1 > 0.2) {
        const spine = makeStrutBetween(
          new THREE.Vector3(0, diffY + 0.02, spineZ0),
          new THREE.Vector3(0, diffY + 0.02, spineZ1),
          0.036,
          0.036,
          mats.trim,
          12,
        );
        const hvBus = makeStrutBetween(
          new THREE.Vector3(0.042, diffY + 0.03, spineZ0),
          new THREE.Vector3(0.042, diffY + 0.03, spineZ1),
          0.014,
          0.014,
          mats.accent,
          8,
        );
        drivetrainGrp.add(spine, hvBus);
      }
    } else if (!drive.isMidEngine && !(drive.isElectric && !drive.isHybrid)) {
      const cardanStartZ = frontWheelZ - Math.min(0.88, spanLen * 0.34);
      const cardanEndZ = rearWheelZ + 0.14;
      if (cardanStartZ - cardanEndZ > 0.25) {
        const shaftR = isHeavy || isMonster ? 0.048 : 0.032;
        const cardan = makeStrutBetween(
          new THREE.Vector3(0, diffY + 0.01, cardanStartZ),
          new THREE.Vector3(0, diffY + 0.01, cardanEndZ),
          shaftR,
          shaftR,
          isSupercar ? mats.trim : mats.alloy,
          12,
        );
        drivetrainGrp.add(cardan);

        // Front & rear universal Cardan joints + center carrier bearing
        [cardanStartZ, (cardanStartZ + cardanEndZ) * 0.5, cardanEndZ].forEach((uz, uIdx) => {
          const joint = new THREE.Mesh(
            new THREE.CylinderGeometry(shaftR * 1.45, shaftR * 1.45, 0.075, 10).rotateX(Math.PI / 2),
            uIdx === 1 ? mats.trim : mats.chrome,
          );
          joint.position.set(0, diffY + 0.01, uz);
          drivetrainGrp.add(joint);
        });
      }
    }
  }

  // Also add front mechanical prop-shaft from transfer case to front diff on 4x4 / AWD non-hybrid trucks/cars
  if (drive.frontDriven && drive.rearDriven && !drive.isMidEngine && !(drive.isElectric && !drive.isHybrid)) {
    const tCaseZ = frontWheelZ - Math.min(0.95, spanLen * 0.36);
    if (frontWheelZ - 0.14 - tCaseZ > 0.15) {
      const fShaft = makeStrutBetween(
        new THREE.Vector3(0.06, diffY - 0.01, tCaseZ),
        new THREE.Vector3(0.02, diffY, frontWheelZ - 0.12),
        0.026,
        0.026,
        mats.alloy,
        10,
      );
      drivetrainGrp.add(fShaft);
    }
  }

  // =========================================================================
  // 6. SEMIEIXOS COM JUNTAS HOMOCINÉTICAS E COIFAS SANFONADAS
  // =========================================================================
  const drivenAxles: { z: number; isFront: boolean }[] = [];
  if (drive.frontDriven) drivenAxles.push({ z: frontWheelZ, isFront: true });
  if (drive.rearDriven) {
    allRearAxles.forEach((rz) => drivenAxles.push({ z: rz, isFront: false }));
  }

  const cvShaftR = isHeavy || isMonster ? 0.024 : isFormula ? 0.015 : 0.0185;
  const diffOutX = diffR * 1.15;

  drivenAxles.forEach((dax) => {
    [-1, 1].forEach((side) => {
      const zOff = dax.isFront ? -0.01 : 0;
      const pInner = new THREE.Vector3(side * diffOutX, diffY, dax.z + zOff);
      const pOuter = new THREE.Vector3(side * uprightX, wheelY, dax.z);
      cvJointsGrp.add(buildHalfShaftWithCV(pInner, pOuter, cvShaftR, mats));
    });
  });

  // =========================================================================
  // TAG & ATTACH SUBSYSTEMS TO VEHICLE GROUP
  // =========================================================================
  tagMechPart(shocksGrp, 'shocks_springs', 'Amortecedores e Molas Helicoidais', 0, -0.08, 0);
  tagMechPart(wishbonesGrp, 'wishbones', 'Bandejas de Suspensão (Balanças)', 0, -0.14, 0);
  tagMechPart(bushingsGrp, 'bushings', 'Buchas Elastoméricas e Metálicas', 0, -0.14, 0);
  tagMechPart(knuckleSteeringGrp, 'knuckle_tie_rods', 'Caixa de Direção, Pivôs, Bieletas e Terminais', 0, -0.10, 0);
  tagMechPart(swayBarGrp, 'anti_roll_bar', 'Barras Estabilizadoras', 0, -0.16, 0);
  tagMechPart(gearboxGrp, 'gearbox', 'Câmbio (Caixa de Marchas)', 0, -0.22, 0);
  tagMechPart(cvJointsGrp, 'cv_joints', 'Juntas Homocinéticas e Coifas', 0, -0.12, 0);
  tagMechPart(drivetrainGrp, 'drivetrain', 'Eixo de Transmissão e Diferenciais', 0, -0.24, 0);

  group.add(
    wishbonesGrp,
    bushingsGrp,
    shocksGrp,
    swayBarGrp,
    knuckleSteeringGrp,
    gearboxGrp,
    drivetrainGrp,
    cvJointsGrp,
  );
}
