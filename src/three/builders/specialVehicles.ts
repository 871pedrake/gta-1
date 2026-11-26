import * as THREE from 'three';
import { VehicleConcept, WheelStyle } from '../../types/vehicle';
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
  buildSculptedCabin,
  createCraftedWheel,
  createTrapezoidGlassGeo,
} from './wheelsAndInterior';
import { addExhaustSystem, addVehicleAttachments } from './wheeledVehicles';

function addHandlebarMirrors(
  group: THREE.Group,
  width: number,
  barY: number,
  barZ: number,
  mats: VehicleMaterialSet,
  cityMode = false,
) {
  [-1, 1].forEach((side) => {
    const mirGrp = new THREE.Group();
    const stalk = makeStrutBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.09, 0.11, -0.03),
      0.01,
      0.01,
      mats.chrome,
      cityMode ? 6 : 10,
    );
    mirGrp.add(stalk);
    const pod = new THREE.Mesh(
      createRoundedBoxGeo(0.11, 0.06, 0.032, 0.015, 2, 8),
      mats.trim,
    );
    pod.position.set(side * 0.11, 0.12, -0.03);
    mirGrp.add(pod);
    const face = new THREE.Mesh(
      createRoundedBoxGeo(0.092, 0.046, 0.01, 0.01, 2, 6),
      mats.mirrorGlass,
    );
    face.position.set(side * 0.11, 0.12, -0.048);
    mirGrp.add(face);
    mirGrp.position.set(side * (width * 0.34), barY, barZ);
    tagPart(mirGrp, 'Retrovisores de Guidão', side * 0.25, 0.2, 0);
    group.add(mirGrp);
  });
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
  const seg = cityMode ? 12 : 24;

  if (g.archetype === 'trike') {
    const hull = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.36, 0.38, length * 0.72, 0.09, cityMode ? 2 : 5, 14),
      mats.body,
    );
    hull.position.set(0, g.groundClearance + 0.32, 0.02);
    tagPart(hull, 'Carenagem Central Sport Trike', 0, 0.25, 0);
    group.add(hull);

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
    tagPart(screen, 'Para-brisa Esportivo', 0, 0.4, 0.2);
    group.add(screen);

    const seat = new THREE.Mesh(
      createRoundedBoxGeo(0.42, 0.18, 0.76, 0.06, 3, 12),
      mats.interior,
    );
    seat.position.set(0, g.groundClearance + 0.52, -0.18);
    tagPart(seat, 'Banco Esportivo Bipartido', 0, 0.35, -0.1);
    group.add(seat);

    const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width * 0.44, 12), mats.chrome);
    hbar.rotation.z = Math.PI / 2;
    hbar.position.set(0, g.groundClearance + 0.62, length * 0.08);
    tagPart(hbar, 'Guidão de Pilotagem', 0, 0.45, 0.1);
    group.add(hbar);
    addHandlebarMirrors(group, width * 0.5, g.groundClearance + 0.62, length * 0.08, mats, cityMode);

    [-1, 1].forEach((side) => {
      const wish = makeStrutBetween(
        new THREE.Vector3(side * width * 0.14, g.wheelRadius + 0.04, fZ),
        new THREE.Vector3(side * width * 0.44, g.wheelRadius, fZ),
        0.022,
        0.022,
        mats.trim,
        10,
      );
      group.add(wish);
      const fw = createCraftedWheel(
        g.wheelRadius,
        g.wheelWidth,
        wheelStyle,
        mats,
        side > 0,
        false,
        cityMode,
      );
      fw.position.set(side * (width * 0.44), g.wheelRadius, fZ);
      tagPart(fw, 'Roda Dianteira Trike', side * 0.45, -0.05, 0);
      group.add(fw);
      animated.wheels.push(fw);

      const hl = new THREE.Mesh(
        createRoundedBoxGeo(0.14, 0.07, 0.06, 0.02, 2, 8),
        mats.headlight,
      );
      hl.position.set(side * width * 0.16, g.groundClearance + 0.36, length * 0.44);
      group.add(hl);
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

    addExhaustSystem(group, width * 0.5, length * 0.48, g.groundClearance + 0.05, mats, 'dual');
    enableShadows(group);
    return group;
  }

  if (g.archetype === 'atv') {
    const body = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.62, 0.34, length * 0.72, 0.08, cityMode ? 2 : 4, 12),
      mats.body,
    );
    body.position.set(0, g.groundClearance + 0.34, 0);
    tagPart(body, 'Carenagem Central ATV', 0, 0.25, 0);
    group.add(body);

    const seat = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.34, 0.16, length * 0.38, 0.05, 3, 10),
      mats.interior,
    );
    seat.position.set(0, g.groundClearance + 0.55, -0.1);
    tagPart(seat, 'Assento Duplo ATV', 0, 0.45, 0);
    group.add(seat);

    // Front openable utility cargo lid + rear rack
    const frontBoxPivot = new THREE.Group();
    frontBoxPivot.position.set(0, g.groundClearance + 0.55, 0.32);
    const frontRack = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.72, 0.09, 0.46, 0.03, 2, 8),
      mats.trim,
    );
    frontRack.position.set(0, 0, 0.22);
    frontBoxPivot.add(frontRack);
    tagPart(frontBoxPivot, 'Compartimento Dianteiro ATV', 0, 0.45, 0.3);
    group.add(frontBoxPivot);
    if (!cityMode) {
      registerOpenable(animated, frontBoxPivot, 'Baú Dianteiro ATV', { x: -0.75 });
    }

    const rearRack = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.76, 0.055, 0.48, 0.02, 2, 8),
      mats.trim,
    );
    rearRack.position.set(0, g.groundClearance + 0.54, -0.62);
    tagPart(rearRack, 'Bagageiro Tubular Traseiro', 0, 0.45, -0.35);
    group.add(rearRack);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width * 0.64, 12), mats.trim);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, height * 0.85, fZ * 0.45);
    tagPart(bar, 'Guidão Tático', 0, 0.5, 0.2);
    group.add(bar);
    addHandlebarMirrors(group, width * 0.85, height * 0.85, fZ * 0.45, mats, cityMode);

    [fZ, rZ].forEach((wz) => {
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
        w.position.set(side * (width * 0.4), g.wheelRadius, wz);
        tagPart(w, 'Roda Balão ATV', side * 0.4, -0.05, 0);
        group.add(w);
        animated.wheels.push(w);
      });
    });

    addExhaustSystem(group, width * 0.45, length * 0.45, g.groundClearance + 0.22, mats, 'single');
    addVehicleAttachments(group, v, mats, height, height * 0.6, height * 0.6, animated);
    enableShadows(group);
    return group;
  }

  // Two-wheel Motorcycle / Scooter
  const frontW = createCraftedWheel(
    g.wheelRadius,
    g.wheelWidth,
    wheelStyle,
    mats,
    true,
    false,
    cityMode,
  );
  frontW.position.set(0, g.wheelRadius, fZ);
  tagPart(frontW, 'Roda Dianteira', 0, -0.05, 0.35);
  group.add(frontW);
  animated.wheels.push(frontW);

  const rearW = createCraftedWheel(
    g.wheelRadius,
    g.wheelWidth * 1.25,
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

  // Curved tubular frame + swingarm + detailed finned engine
  const frameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, g.wheelRadius, rZ),
    new THREE.Vector3(0, g.groundClearance + 0.36, -0.14),
    new THREE.Vector3(0, g.groundClearance + 0.66, fZ * 0.56),
  ]);
  const frameMesh = new THREE.Mesh(
    new THREE.TubeGeometry(frameCurve, cityMode ? 10 : 20, 0.045, 10, false),
    mats.trim,
  );
  tagPart(frameMesh, 'Chassi Tubular', 0, 0.15, 0);
  group.add(frameMesh);

  const engine = new THREE.Mesh(
    createRoundedBoxGeo(0.28, 0.32, 0.38, 0.05, 3, 10),
    mats.alloy,
  );
  engine.position.set(0, g.groundClearance + 0.22, 0);
  tagPart(engine, 'Bloco do Motor', 0, -0.15, 0);
  group.add(engine);

  if (!cityMode) {
    // Cylinder cooling head + clutch cover
    const cylHead = new THREE.Mesh(
      createRoundedBoxGeo(0.24, 0.16, 0.22, 0.03, 2, 8),
      mats.trim,
    );
    cylHead.position.set(0, g.groundClearance + 0.4, 0.05);
    cylHead.rotation.x = 0.25;
    group.add(cylHead);

    const clutch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.32, 16), mats.chrome);
    clutch.rotation.z = Math.PI / 2;
    clutch.position.set(0, g.groundClearance + 0.18, -0.02);
    group.add(clutch);
  }

  // Front USD forks + curved fender
  const rake = g.archetype === 'cruiser' ? 0.52 : 0.32;
  [-0.1, 0.1].forEach((fx) => {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.78, 12), mats.chrome);
    fork.position.set(fx, g.wheelRadius + 0.32, fZ - 0.12);
    fork.rotation.x = -rake;
    tagPart(fork, 'Suspensão Dianteira (Garfo)', fx * 2, 0.2, 0.25);
    group.add(fork);
  });

  const fender = new THREE.Mesh(
    new THREE.TorusGeometry(g.wheelRadius * 1.06, 0.042, 8, 18, Math.PI * 0.55),
    mats.body,
  );
  fender.rotation.y = Math.PI / 2;
  fender.rotation.x = -0.35;
  fender.position.set(0, g.wheelRadius, fZ);
  group.add(fender);

  // Bodywork & Tank (smooth LatheGeometry or curved beveled fairing)
  if (g.archetype === 'scooter') {
    const shield = new THREE.Mesh(
      createRoundedBoxGeo(0.42, 0.68, 0.18, 0.075, cityMode ? 2 : 5, 14),
      mats.body,
    );
    shield.position.set(0, g.groundClearance + 0.45, fZ * 0.52);
    shield.rotation.x = -0.22;
    tagPart(shield, 'Escudo Frontal da Scooter', 0, 0.25, 0.3);
    group.add(shield);

    const rearShell = new THREE.Mesh(
      createRoundedBoxGeo(0.44, 0.34, 0.72, 0.08, cityMode ? 2 : 5, 14),
      mats.body,
    );
    rearShell.position.set(0, g.groundClearance + 0.33, rZ + 0.2);
    tagPart(rearShell, 'Carenagem Traseira', 0, 0.2, -0.25);
    group.add(rearShell);

    // Under-seat storage tub
    if (!cityMode) {
      const tub = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.14, 0.46, 0.04, 2, 8),
        mats.grille,
      );
      tub.position.set(0, g.groundClearance + 0.44, -0.22);
      group.add(tub);
    }
  } else {
    // High-poly Lathe teardrop motorcycle fuel tank
    const tankPts = [
      new THREE.Vector2(0.02, -0.28),
      new THREE.Vector2(0.14, -0.2),
      new THREE.Vector2(0.21, 0.04),
      new THREE.Vector2(0.18, 0.22),
      new THREE.Vector2(0.04, 0.28),
    ];
    const tankGeo = new THREE.LatheGeometry(tankPts, seg);
    tankGeo.rotateX(Math.PI / 2);
    tankGeo.scale(0.95, 0.8, 1.0);
    const tank = new THREE.Mesh(tankGeo, mats.body);
    tank.position.set(0, g.groundClearance + 0.62, 0.22);
    tagPart(tank, 'Tanque de Combustível Esculpido', 0, 0.4, 0);
    group.add(tank);

    const tankStripe = new THREE.Mesh(
      createRoundedBoxGeo(0.08, 0.03, 0.44, 0.01, 2, 6),
      mats.liveryStripe,
    );
    tankStripe.position.set(0, g.groundClearance + 0.76, 0.22);
    group.add(tankStripe);

    if (g.archetype === 'sportbike') {
      const cowl = new THREE.Mesh(
        createRoundedBoxGeo(0.4, 0.46, 0.56, 0.09, cityMode ? 2 : 5, 16),
        mats.body,
      );
      cowl.position.set(0, g.groundClearance + 0.56, fZ * 0.58);
      cowl.rotation.x = 0.26;
      tagPart(cowl, 'Carenagem Esportiva Aerodinâmica', 0, 0.3, 0.35);
      group.add(cowl);

      // Lower belly pan
      const belly = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.22, 0.58, 0.06, 3, 10),
        mats.secondary,
      );
      belly.position.set(0, g.groundClearance + 0.2, 0.04);
      group.add(belly);

      const windscreen = new THREE.Mesh(
        createRoundedBoxGeo(0.3, 0.24, 0.34, 0.06, 3, 10),
        mats.glass,
      );
      windscreen.position.set(0, g.groundClearance + 0.84, fZ * 0.52);
      windscreen.rotation.x = -0.58;
      windscreen.userData.noShadow = true;
      tagPart(windscreen, 'Bolha Acrílica Transparente', 0, 0.45, 0.35);
      group.add(windscreen);
    }
  }

  if (g.attachments.includes('moto_windscreen')) {
    const ws = new THREE.Mesh(
      createRoundedBoxGeo(0.36, 0.36, 0.025, 0.02, 2, 8),
      mats.glass,
    );
    ws.position.set(0, g.groundClearance + 0.92, fZ * 0.52);
    ws.rotation.x = -0.35;
    ws.userData.noShadow = true;
    tagPart(ws, 'Para-brisa Alto Touring', 0, 0.5, 0.35);
    group.add(ws);
  }

  // Saddlebags with openable lids
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

  // Ergonomic sculpted seat (hinged on scooters so under-seat trunk opens!)
  const seatPivot = new THREE.Group();
  seatPivot.position.set(0, g.groundClearance + 0.52, 0.04);
  const seat = new THREE.Mesh(
    createRoundedBoxGeo(0.3, 0.13, 0.66, 0.055, cityMode ? 2 : 4, 12),
    mats.interior,
  );
  seat.position.set(0, 0, -0.3);
  seatPivot.add(seat);
  tagPart(seatPivot, 'Banco Ergonômico', 0, 0.35, -0.1);
  group.add(seatPivot);
  if (!cityMode && g.archetype === 'scooter') {
    registerOpenable(animated, seatPivot, 'Banco Baú Scooter', { x: 0.78 });
  }

  const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, width * 0.88, 12), mats.chrome);
  hbar.rotation.z = Math.PI / 2;
  hbar.position.set(0, height * 0.82, fZ * 0.42);
  tagPart(hbar, 'Guidão com Manoplas', 0, 0.5, 0.2);
  group.add(hbar);
  addHandlebarMirrors(group, width, height * 0.82, fZ * 0.42, mats, cityMode);

  // Round projector headlight & sculpted taillight
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.12, 20), mats.headlight);
  hl.rotation.x = Math.PI / 2;
  hl.position.set(0, g.groundClearance + 0.66, fZ * 0.72);
  tagPart(hl, 'Farol Dianteiro Projetor', 0, 0.25, 0.4);
  group.add(hl);

  const tl = new THREE.Mesh(
    createRoundedBoxGeo(0.14, 0.06, 0.06, 0.02, 2, 8),
    mats.taillight,
  );
  tl.position.set(0, g.groundClearance + 0.56, rZ - 0.12);
  tagPart(tl, 'Lanterna Traseira', 0, 0.2, -0.4);
  group.add(tl);

  const buildMotoExhaust = (sideSign: number) => {
    const exCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideSign * 0.14, g.groundClearance + 0.18, 0.15),
      new THREE.Vector3(sideSign * 0.18, g.groundClearance + 0.14, -0.25),
      new THREE.Vector3(
        sideSign * 0.2,
        g.archetype === 'dirtbike' ? g.groundClearance + 0.48 : g.groundClearance + 0.22,
        rZ - 0.05,
      ),
    ]);
    const exGrp = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.TubeGeometry(exCurve, 16, 0.036, 12, false), mats.chrome);
    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.044, 0.36, 16), mats.trim);
    muffler.rotation.x = Math.PI / 2 - (g.archetype === 'dirtbike' ? 0.35 : 0.12);
    muffler.position.set(
      sideSign * 0.2,
      g.archetype === 'dirtbike' ? g.groundClearance + 0.44 : g.groundClearance + 0.21,
      rZ + 0.05,
    );
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 12), mats.exhaustBore);
    bore.rotation.x = muffler.rotation.x;
    bore.position.set(sideSign * 0.2, muffler.position.y + 0.02, rZ - 0.13);
    exGrp.add(pipe, muffler, bore);
    tagPart(exGrp, 'Escapamento Esportivo', sideSign * 0.35, 0, -0.2);
    group.add(exGrp);
  };
  buildMotoExhaust(1);
  if (g.attachments.includes('dual_exhaust')) buildMotoExhaust(-1);

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
    const sirenPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 10), mats.chrome);
    sirenPole.position.set(-0.18, g.groundClearance + 0.78, rZ - 0.12);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.09, 14), mats.sirenBlue);
    beacon.position.set(-0.18, g.groundClearance + 0.96, rZ - 0.12);
    tagPart(beacon, 'Giroflex Traseiro Polícia', -0.2, 0.5, -0.2);
    group.add(sirenPole, beacon);
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

  // Stainless 3-spoke marine helm wheel
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
  wheelGrp.position.set(0.12, 0.68, -0.24);
  wheelGrp.rotation.x = 0.42;
  helm.add(wheelGrp);

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

    const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, width * 0.62, 12), mats.chrome);
    hbar.rotation.z = Math.PI / 2;
    hbar.position.set(0, hullH + 0.32, 0.25);
    group.add(hbar);
    addHandlebarMirrors(group, width * 0.8, hullH + 0.32, 0.25, mats, cityMode);

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

    // Center Jockey Console + Framed Windshield + Rescue Jockey Seats
    addMarineHelmConsole(group, width, floorY, length * 0.06, mats, 0, cityMode);
    addFramedBoatWindshield(group, width * 0.46, floorY + 0.74, length * 0.14, 0.38, mats, cityMode);

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

    const strobe = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.34, 0.09, 0.14, 0.02, 2, 6),
      mats.sirenAmber,
    );
    strobe.position.set(0, hullH + 1.0, -halfL + 0.3);
    group.add(strobe);
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
    addMarineHelmConsole(group, width, hullH + 0.06, salZ + salL * 0.26, mats, salW * 0.18, cityMode);

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
    addMarineHelmConsole(group, salW * 0.72, flyY, salZ + salL * 0.2, mats, 0, cityMode);
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
    addMarineHelmConsole(group, cabW * 0.72, cabY + cabH * 0.42, cabZ + cabL * 0.14, mats, 0, cityMode);

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
      createTrapezoidGlassGeo(cabW * 0.84, cabW * 0.82, cabH * 0.38, 0.025),
      mats.glass,
    );
    frontBridgeWin.position.set(0, cabY + cabH * 0.72, cabZ + cabL * 0.45);
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
        new THREE.CylinderGeometry(0.16, 0.2, height * 0.22, 14),
        mats.trim,
      );
      funnel.position.set(side * (cabW * 0.32), cabY + cabH * 0.72, cabZ - cabL * 0.68);
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
    addMarineHelmConsole(group, width, floorY, wsBaseZ - 0.22, mats, width * 0.16, cityMode);
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
    const tower = new THREE.Mesh(
      new THREE.TorusGeometry(width * 0.38, 0.035, 10, 22, Math.PI),
      mats.chrome,
    );
    tower.position.set(0, hullH + 0.55, -0.1);
    tagPart(tower, 'Torre de Wakeboard Cromada', 0, 0.55, 0);
    group.add(tower);
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

  addVehicleAttachments(group, v, mats, hullH + height * 0.4, hullH + 0.3, hullH + 0.3, animated);
  enableShadows(group);
  return group;
}

// =========================================================================
// 9. AIRCRAFT: HIGH-POLY JETS, AIRPLANES, HELICOPTERS & HOVERCRAFT
// =========================================================================
function buildAirplaneOrJet(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const isJet = g.archetype === 'jet';
  const isBiplane = g.attachments.includes('biplane_wings');
  const isTwinProp = g.attachments.includes('twin_prop_nacelles');
  const isSeaplane = g.attachments.includes('seaplane_floats');
  const isTwinAfterburner = g.attachments.includes('jet_afterburners');
  const isCargoOrAirliner = v.unitySpec.seats >= 8;

  const halfL = length / 2;
  const fuseW = isJet ? Math.min(width * 0.18, 1.55) : Math.min(width * 0.16, 1.45);
  const fuseH = height * 0.38;
  const fuseY = isSeaplane ? g.groundClearance + 0.95 : g.groundClearance + fuseH * 0.62;
  const seg = cityMode ? 16 : 32;

  // 1. Smooth Continuous Lathe Fuselage (replaces stepped cylinders!)
  const fuseGroup = new THREE.Group();
  const mainFuseLen = length * 0.62;
  const rMid = fuseW * 0.52;
  const lathePts = [
    new THREE.Vector2(0.01, -halfL + 0.12),
    new THREE.Vector2(rMid * 0.32, -halfL + length * 0.14),
    new THREE.Vector2(rMid * 0.88, -mainFuseLen * 0.48),
    new THREE.Vector2(rMid, 0),
    new THREE.Vector2(rMid * 0.96, mainFuseLen * 0.46),
    new THREE.Vector2(rMid * 0.56, halfL - length * 0.12),
    new THREE.Vector2(0.01, halfL),
  ];
  const fuseGeo = new THREE.LatheGeometry(lathePts, seg);
  fuseGeo.rotateX(Math.PI / 2);
  fuseGeo.scale(1.0, fuseH / fuseW, 1.0);
  const fuseMesh = new THREE.Mesh(fuseGeo, mats.body);
  fuseGroup.add(fuseMesh);

  [-1, 1].forEach((side) => {
    const fStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, fuseH * 0.13, mainFuseLen * 0.92),
      mats.liveryStripe,
    );
    fStripe.position.set(side * (rMid * 0.98), 0, 0);
    fuseGroup.add(fStripe);
  });

  fuseGroup.position.set(0, fuseY, 0.05);
  tagPart(fuseGroup, isJet ? 'Fuselagem Supersônica Contínua' : 'Fuselagem Aeronáutica', 0, 0.15, 0);
  group.add(fuseGroup);

  // 2. Cockpit Interior + Articulated Opening Canopy OR Airstair Cabin Door + Cargo Ramp
  const seatCount = Math.min(2, v.unitySpec.seats);
  const cockpitInterior = new THREE.Group();
  for (let s = 0; s < seatCount; s++) {
    const seat = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.46, 0.38, 0.06, 3, 10),
      mats.interior,
    );
    seat.position.set(
      seatCount === 2 && !isJet ? (s === 0 ? -0.24 : 0.24) : 0,
      fuseY + fuseH * 0.24,
      isJet ? length * 0.18 - s * 0.9 : length * 0.14,
    );
    cockpitInterior.add(seat);
  }
  const hud = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.08), mats.sirenBlue);
  hud.position.set(0, fuseY + fuseH * 0.36, length * 0.25);
  cockpitInterior.add(hud);
  group.add(cockpitInterior);

  const canopyPivot = new THREE.Group();
  const canopyLen = length * (isJet ? 0.32 : 0.26);
  const canopyCenterZ = length * 0.16;
  canopyPivot.position.set(0, fuseY + fuseH * 0.32, canopyCenterZ - canopyLen * 0.45);

  const canopyGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
  canopyGeo.scale(fuseW * 0.42, fuseH * 0.44, canopyLen * 0.54);
  const canopy = new THREE.Mesh(canopyGeo, mats.glass);
  canopy.position.set(0, 0, canopyLen * 0.45);
  canopy.userData.noShadow = true;
  canopy.renderOrder = 2;
  canopyPivot.add(canopy);
  tagPart(canopyPivot, 'Canopy Transparente Articulado', 0, 0.45, 0.2);
  group.add(canopyPivot);

  if (!cityMode && isJet && !isCargoOrAirliner) {
    // Fighter / sport jet: canopy lifts upward from rear hinge!
    registerOpenable(animated, canopyPivot, 'Canopy do Caça', { x: -0.66 });
  }

  // Side cabin porthole windows + folding airstair door for VIP / executive / cargo planes
  if (v.unitySpec.seats >= 4) {
    const winCount = Math.min(6, Math.max(3, Math.floor(v.unitySpec.seats / 2)));
    [-1, 1].forEach((side) => {
      for (let i = 0; i < winCount; i++) {
        const wz = length * 0.06 - i * (mainFuseLen * 0.11);
        const wPane = new THREE.Mesh(
          createRoundedBoxGeo(0.04, 0.22, 0.3, 0.04, 2, 8),
          mats.glass,
        );
        wPane.position.set(side * (rMid * 0.96), fuseY + fuseH * 0.12, wz);
        wPane.userData.noShadow = true;
        group.add(wPane);
      }
    });

    if (!cityMode) {
      // Folding airstair entry door on left forward cabin (-X)
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-rMid * 0.96, fuseY - fuseH * 0.18, length * 0.12);
      const stairDoor = new THREE.Mesh(
        createRoundedBoxGeo(0.06, fuseH * 0.56, 0.76, 0.025, 2, 8),
        mats.secondary,
      );
      stairDoor.position.set(0, fuseH * 0.28, 0);
      doorPivot.add(stairDoor);
      for (let st = 1; st <= 3; st++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.58), mats.alloy);
        step.position.set(-0.08, st * (fuseH * 0.14), 0);
        doorPivot.add(step);
      }
      tagPart(doorPivot, 'Escada de Embarque / Porta Cabine', -0.45, 0, 0);
      group.add(doorPivot);
      registerOpenable(animated, doorPivot, 'Porta Escada Aeronave', { z: 1.48 });
    }
  }

  // Rear lowering cargo ramp on cargo / transport planes
  if (!cityMode && isCargoOrAirliner) {
    const rampPivot = new THREE.Group();
    rampPivot.position.set(0, fuseY - fuseH * 0.26, -halfL + length * 0.24);
    const ramp = new THREE.Mesh(
      createRoundedBoxGeo(fuseW * 0.72, 0.09, length * 0.18, 0.02, 2, 8),
      mats.secondary,
    );
    ramp.position.set(0, 0, -length * 0.09);
    rampPivot.add(ramp);
    tagPart(rampPivot, 'Rampa Traseira de Carga', 0, -0.25, -0.5);
    group.add(rampPivot);
    registerOpenable(animated, rampPivot, 'Rampa de Carga', { x: -0.44 });
  }

  // 3. Curved Beveled Wings + Wingtip Lights
  const buildWingPair = (yOffset: number, span: number, chord: number, sweepZ: number) => {
    const wingGrp = new THREE.Group();
    [-1, 1].forEach((side) => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, chord * 0.55);
      wingShape.lineTo(span * 0.5, chord * 0.2 - sweepZ);
      wingShape.lineTo(span * 0.5, -chord * 0.35 - sweepZ);
      wingShape.lineTo(0, -chord * 0.45);
      wingShape.closePath();

      const wGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.11,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: cityMode ? 2 : 4,
      });
      wGeo.rotateX(Math.PI / 2);
      if (side < 0) wGeo.scale(-1, 1, 1);
      wGeo.computeVertexNormals();

      const wMesh = new THREE.Mesh(wGeo, mats.body);
      wMesh.position.set(side * (fuseW * 0.34), 0, 0);
      wingGrp.add(wMesh);

      const navLight = new THREE.Mesh(
        createRoundedBoxGeo(0.14, 0.08, 0.22, 0.02, 2, 6),
        side < 0 ? mats.sirenRed : mats.sirenBlue,
      );
      navLight.position.set(side * (span * 0.5 + fuseW * 0.32), 0, -sweepZ);
      wingGrp.add(navLight);

      if (g.attachments.includes('wingtip_missiles')) {
        const missile = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 1.85, 12),
          mats.liveryStripe,
        );
        missile.rotation.x = Math.PI / 2;
        missile.position.set(side * (span * 0.5 + fuseW * 0.34), -0.02, -sweepZ + 0.1);
        wingGrp.add(missile);
      }
      if (g.attachments.includes('drop_tanks')) {
        const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.8, 8, 16), mats.secondary);
        tank.rotation.x = Math.PI / 2;
        tank.position.set(side * (span * 0.28), -0.32, -sweepZ * 0.4);
        wingGrp.add(tank);
      }
    });
    wingGrp.position.set(0, yOffset, isJet ? -0.35 : 0.25);
    return wingGrp;
  };

  const wingY = isJet ? fuseY - 0.05 : isBiplane ? fuseY - 0.2 : fuseY + fuseH * 0.42;
  const mainWing = buildWingPair(
    wingY,
    width * 0.94,
    length * (isJet ? 0.34 : 0.18),
    isJet ? length * 0.22 : 0.3,
  );
  tagPart(mainWing, isJet ? 'Asas em Delta / Enfleshadas' : 'Asa Principal com Flaps', 0, 0.2, 0);
  group.add(mainWing);

  if (isBiplane) {
    const upperWing = buildWingPair(fuseY + fuseH * 0.85, width * 0.92, length * 0.17, 0.15);
    tagPart(upperWing, 'Asa Superior Biplano', 0, 0.55, 0);
    group.add(upperWing);
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * width * 0.32, wingY, 0.25),
          new THREE.Vector3(side * width * 0.32, fuseY + fuseH * 0.85, 0.25),
          0.03,
          0.03,
          mats.trim,
        ),
      );
    });
  } else if (!isJet && !isTwinProp) {
    [-1, 1].forEach((side) => {
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * fuseW * 0.42, fuseY - fuseH * 0.2, 0.25),
          new THREE.Vector3(side * width * 0.28, wingY - 0.04, 0.25),
          0.03,
          0.03,
          mats.trim,
        ),
      );
    });
  }

  // 4. Tail Empennage
  const tailZ = -halfL + length * 0.12;
  const hStab = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.34, 0.08, length * 0.13, 0.02, 2, 8),
    mats.body,
  );
  hStab.position.set(0, fuseY + (isJet ? 0.04 : 0.15), tailZ);
  tagPart(hStab, 'Estabilizador Horizontal', 0, 0.25, -0.55);
  group.add(hStab);

  if (isTwinAfterburner) {
    [-1, 1].forEach((side) => {
      const vFin = new THREE.Mesh(
        createRoundedBoxGeo(0.08, height * 0.42, length * 0.18, 0.02, 2, 8),
        mats.body,
      );
      vFin.position.set(side * (fuseW * 0.65), fuseY + height * 0.26, tailZ + 0.15);
      vFin.rotation.z = -side * 0.28;
      vFin.rotation.x = 0.26;
      tagPart(vFin, 'Deriva Dupla Inclinada', side * 0.3, 0.35, -0.55);
      group.add(vFin);
    });
  } else {
    const vFin = new THREE.Mesh(
      createRoundedBoxGeo(0.09, height * 0.44, length * 0.16, 0.025, 2, 8),
      mats.accent,
    );
    vFin.position.set(0, fuseY + height * 0.28, tailZ + 0.1);
    vFin.rotation.x = 0.25;
    tagPart(vFin, 'Estabilizador Vertical e Leme', 0, 0.45, -0.55);
    group.add(vFin);
  }

  // 5. Propulsion
  const makeSpinnerProp = (px: number, py: number, pz: number, propRadius: number) => {
    const pGrp = new THREE.Group();
    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 18), mats.chrome);
    spinner.rotation.x = Math.PI / 2;
    spinner.position.z = 0.14;
    pGrp.add(spinner);

    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, propRadius * 1.9, 0.03), mats.trim);
      blade.rotation.z = (b / 3) * Math.PI * 2;
      pGrp.add(blade);
    }
    pGrp.position.set(px, py, pz);
    tagPart(pGrp, 'Hélice Aeronáutica Giratória', 0, 0, 0.6);
    group.add(pGrp);
    animated.propellers.push(pGrp);
  };

  if (isJet) {
    const nozzleCount = isTwinAfterburner ? 2 : 1;
    for (let i = 0; i < nozzleCount; i++) {
      const nx = nozzleCount === 2 ? (i === 0 ? -fuseW * 0.34 : fuseW * 0.34) : 0;
      const nozzleGrp = new THREE.Group();
      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.65, 20), mats.trim);
      shroud.rotation.x = Math.PI / 2;
      nozzleGrp.add(shroud);
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.68, 18), mats.sirenAmber);
      glow.rotation.x = Math.PI / 2;
      nozzleGrp.add(glow);
      nozzleGrp.position.set(nx, fuseY, -halfL + 0.25);
      tagPart(nozzleGrp, 'Turbina Jato Pós-Combustor', nx * 0.3, 0, -0.65);
      group.add(nozzleGrp);
    }
    [-1, 1].forEach((side) => {
      const intake = new THREE.Mesh(
        createRoundedBoxGeo(0.32, 0.28, 0.9, 0.04, 2, 8),
        mats.grille,
      );
      intake.position.set(side * (fuseW * 0.48), fuseY - 0.04, length * 0.08);
      group.add(intake);
    });
  } else if (isTwinProp) {
    [-1, 1].forEach((side) => {
      const nac = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 1.35, 18), mats.secondary);
      nac.rotation.x = Math.PI / 2;
      nac.position.set(side * (width * 0.22), wingY - 0.06, 0.55);
      tagPart(nac, 'Nacele Motor Turbohélice', side * 0.35, 0, 0.2);
      group.add(nac);
      makeSpinnerProp(side * (width * 0.22), wingY - 0.06, 1.3, 0.85);
    });
  } else {
    makeSpinnerProp(0, fuseY, halfL + 0.12, 0.95);
    [-1, 1].forEach((side) => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 10), mats.chrome);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * (fuseW * 0.34), fuseY - fuseH * 0.42, mainFuseLen * 0.42);
      group.add(pipe);
    });
  }

  // 6. Landing Gear / Seaplane Pontoons
  if (isSeaplane) {
    [-1, 1].forEach((side) => {
      const pontoon = new THREE.Mesh(
        createRoundedBoxGeo(0.46, 0.38, length * 0.54, 0.1, 3, 12),
        mats.secondary,
      );
      pontoon.position.set(side * 1.15, 0.22, 0.35);
      tagPart(pontoon, 'Flutuador Anfíbio (Pontoon)', side * 0.4, -0.3, 0);
      group.add(pontoon);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 1.15, 0.4, 0.7),
          new THREE.Vector3(side * fuseW * 0.32, fuseY - fuseH * 0.35, 0.6),
          0.035,
          0.035,
          mats.trim,
        ),
      );
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * 1.15, 0.4, -0.4),
          new THREE.Vector3(side * fuseW * 0.32, fuseY - fuseH * 0.35, -0.4),
          0.035,
          0.035,
          mats.trim,
        ),
      );
    });
  } else {
    const wr = Math.max(0.2, g.wheelRadius || 0.28);
    const noseGear = createCraftedWheel(wr * 0.82, wr * 0.55, wheelStyle, mats, true, false, cityMode);
    noseGear.position.set(0, wr * 0.82, length * 0.28);
    group.add(noseGear);
    animated.wheels.push(noseGear);
    group.add(
      makeStrutBetween(
        new THREE.Vector3(0, wr * 0.82, length * 0.28),
        new THREE.Vector3(0, fuseY - fuseH * 0.35, length * 0.24),
        0.035,
        0.04,
        mats.chrome,
      ),
    );

    [-1, 1].forEach((side) => {
      const mainGear = createCraftedWheel(wr, wr * 0.65, wheelStyle, mats, side > 0, false, cityMode);
      mainGear.position.set(side * (fuseW * 0.95), wr, -0.35);
      tagPart(mainGear, 'Trem de Pouso Principal', side * 0.35, -0.25, 0);
      group.add(mainGear);
      animated.wheels.push(mainGear);
      group.add(
        makeStrutBetween(
          new THREE.Vector3(side * (fuseW * 0.95), wr, -0.35),
          new THREE.Vector3(side * (fuseW * 0.38), fuseY - fuseH * 0.32, -0.35),
          0.038,
          0.044,
          mats.chrome,
        ),
      );
    });
  }

  enableShadows(group);
  return group;
}

export function buildAircraftOrHovercraft(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const g = v.geometry;
  if (g.archetype === 'airplane' || g.archetype === 'jet') {
    return buildAirplaneOrJet(v, mats, wheelStyle, animated, cityMode);
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

  // Helicopter (high-poly rounded pod + detailed pilot interior + sliding cabin doors!)
  const skidY = 0.08;
  const fuseY = g.groundClearance + 0.78;
  const fuseLen = length * 0.44;
  const fuseW = width * 0.72;

  [-1, 1].forEach((side) => {
    const skid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, length * 0.38, 12),
      mats.trim,
    );
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * (fuseW * 0.46), skidY, 0.2);
    tagPart(skid, 'Esqui de Pouso Tubular', side * 0.35, -0.25, 0);
    group.add(skid);

    [-0.7, 0.9].forEach((sz) => {
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, g.groundClearance + 0.35, 10),
        mats.trim,
      );
      strut.position.set(side * (fuseW * 0.42), skidY + 0.32, sz);
      strut.rotation.z = side * 0.16;
      group.add(strut);
    });
  });

  const podGeo = new THREE.SphereGeometry(1, cityMode ? 16 : 32, cityMode ? 12 : 24);
  podGeo.scale(fuseW * 0.5, height * 0.26, fuseLen * 0.55);
  const pod = new THREE.Mesh(podGeo, mats.body);
  pod.position.set(0, fuseY, 0.4);
  tagPart(pod, 'Fuselagem Principal Aerodinâmica', 0, 0.15, 0.2);
  group.add(pod);

  // Visible pilot seats + cyclic + avionics glass panel
  [-0.26, 0.26].forEach((sx) => {
    const pSeat = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.48, 0.38, 0.06, 3, 10),
      mats.interior,
    );
    pSeat.position.set(sx, fuseY + 0.05, 1.1);
    group.add(pSeat);
  });
  const avionics = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.16), mats.sirenBlue);
  avionics.position.set(0, fuseY + 0.04, 1.56);
  group.add(avionics);

  const canopyGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55);
  canopyGeo.scale(fuseW * 0.44, height * 0.22, fuseLen * 0.36);
  canopyGeo.rotateX(Math.PI * 0.38);
  const canopy = new THREE.Mesh(canopyGeo, mats.glass);
  canopy.position.set(0, fuseY + 0.08, 1.35);
  canopy.userData.noShadow = true;
  canopy.renderOrder = 2;
  tagPart(canopy, 'Bolha Panorâmica do Cockpit', 0, 0.2, 0.5);
  group.add(canopy);

  // Sliding side cabin doors on helicopter!
  if (!cityMode) {
    [-1, 1].forEach((side) => {
      const hDoor = new THREE.Group();
      const frame = new THREE.Mesh(
        createRoundedBoxGeo(0.06, height * 0.32, fuseLen * 0.34, 0.025, 2, 8),
        mats.secondary,
      );
      hDoor.add(frame);
      const win = new THREE.Mesh(
        createRoundedBoxGeo(0.062, height * 0.18, fuseLen * 0.24, 0.02, 2, 6),
        mats.glass,
      );
      win.position.y = height * 0.04;
      win.userData.noShadow = true;
      win.renderOrder = 2;
      hDoor.add(win);
      hDoor.position.set(side * (fuseW * 0.48), fuseY + 0.04, 0.42);
      tagPart(
        hDoor,
        side < 0 ? 'Porta Deslizante Esquerda' : 'Porta Deslizante Direita',
        side * 0.4,
        0,
        -0.3,
      );
      group.add(hDoor);
      registerOpenable(
        animated,
        hDoor,
        'Portas Helicóptero',
        {},
        new THREE.Vector3(side * 0.16, 0, -fuseLen * 0.32),
      );
    });
  }

  const turbine = new THREE.Mesh(
    createRoundedBoxGeo(fuseW * 0.62, 0.48, fuseLen * 0.52, 0.12, 4, 12),
    mats.secondary,
  );
  turbine.position.set(0, fuseY + height * 0.26, 0.1);
  tagPart(turbine, 'Conjunto Turboeixo Superior', 0, 0.45, 0);
  group.add(turbine);

  const boomLen = length * 0.46;
  const boomGeo = new THREE.CylinderGeometry(0.14, 0.28, boomLen, 18);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, mats.body);
  boom.position.set(0, fuseY + 0.18, -boomLen * 0.5 - 0.8);
  tagPart(boom, 'Cone de Cauda e Estabilizadores', 0, 0.2, -0.65);
  group.add(boom);

  const fin = new THREE.Mesh(
    createRoundedBoxGeo(0.08, 1.1, 0.58, 0.025, 2, 8),
    mats.accent,
  );
  fin.position.set(0, fuseY + 0.58, -boomLen - 0.6);
  fin.rotation.x = 0.28;
  tagPart(fin, 'Deriva Vertical de Cauda', 0, 0.35, -0.75);
  group.add(fin);

  const mainRotor = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.48, 16), mats.trim);
  mainRotor.add(mast);
  const bladeLen = length * 0.82;
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, bladeLen), mats.trim);
    blade.position.y = 0.22;
    blade.rotation.y = (b / 4) * Math.PI * 2;
    mainRotor.add(blade);
  }
  mainRotor.position.set(0, fuseY + height * 0.38, 0.25);
  tagPart(mainRotor, 'Rotor Principal de 4 Pás', 0, 0.9, 0);
  group.add(mainRotor);
  animated.rotors.push(mainRotor);

  const tailRotor = new THREE.Group();
  for (let b = 0; b < 2; b++) {
    const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.25, 0.12), mats.accent);
    tBlade.rotation.x = (b / 2) * Math.PI;
    tailRotor.add(tBlade);
  }
  tailRotor.position.set(0.16, fuseY + 0.72, -boomLen - 0.68);
  tagPart(tailRotor, 'Rotor Antipar de Cauda', 0.4, 0.35, -0.75);
  group.add(tailRotor);
  animated.rotors.push(tailRotor);

  if (g.attachments.includes('heli_winch')) {
    const winch = new THREE.Mesh(
      createRoundedBoxGeo(0.32, 0.22, 0.42, 0.04, 2, 8),
      mats.accent,
    );
    winch.position.set(fuseW * 0.52, fuseY + 0.15, 0.6);
    tagPart(winch, 'Guincho Lateral de Salvamento', 0.45, 0.15, 0);
    group.add(winch);
  }

  addVehicleAttachments(group, v, mats, fuseY + height * 0.28, fuseY, fuseY, animated);
  enableShadows(group);
  return group;
}
