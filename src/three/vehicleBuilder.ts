import * as THREE from 'three';
import { VehicleConcept, VehicleAttachment, WheelStyle } from '../types/vehicle';
import { createVehicleMaterials, VehicleMaterialSet } from './materials';

export interface BuiltVehicle {
  group: THREE.Group;
  materials: VehicleMaterialSet;
  animatedParts: {
    wheels: THREE.Object3D[];
    rotors: THREE.Object3D[];
    propellers: THREE.Object3D[];
    mixerDrum: THREE.Object3D | null;
    sweeperBrushes: THREE.Object3D[];
  };
  partsCount: number;
  dispose: () => void;
}

function tagPart(
  obj: THREE.Object3D,
  label: string,
  explodeX = 0,
  explodeY = 0,
  explodeZ = 0,
): THREE.Object3D {
  obj.userData.partLabel = label;
  obj.userData.basePos = obj.position.clone();
  obj.userData.explodeOffset = new THREE.Vector3(explodeX, explodeY, explodeZ);
  return obj;
}

function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

function createExtrudedProfile(
  shape: THREE.Shape,
  width: number,
  bevelSize = 0.045,
  bevelThickness = 0.045,
  bevelSegments = 3,
): THREE.BufferGeometry {
  const innerDepth = Math.max(0.05, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: bevelSize > 0,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments: 14,
  });
  geo.translate(0, 0, -innerDepth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function createCraftedWheel(
  radius: number,
  width: number,
  style: WheelStyle,
  mats: VehicleMaterialSet,
  isRightSide: boolean,
  isDualRear = false,
): THREE.Group {
  const wheel = new THREE.Group();
  const sign = isRightSide ? 1 : -1;
  const r = Math.max(0.16, radius);
  const w = Math.max(0.1, width);
  const rimR = style === 'monster_tractor' ? r * 0.44 : style === 'atv_balloon' ? r * 0.48 : r * 0.62;

  const buildSingleTire = (xOffset: number, tireW: number) => {
    const hw = tireW / 2;
    const pts = [
      new THREE.Vector2(rimR * 0.96, -hw * 0.85),
      new THREE.Vector2(r * 0.94, -hw),
      new THREE.Vector2(r, -hw * 0.72),
      new THREE.Vector2(r, hw * 0.72),
      new THREE.Vector2(r * 0.94, hw),
      new THREE.Vector2(rimR * 0.96, hw * 0.85),
    ];
    const tireGeo = new THREE.LatheGeometry(pts, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, mats.rubber);
    tireMesh.position.x = xOffset;
    wheel.add(tireMesh);

    if (style === 'classic_whitewall') {
      const wwGeo = new THREE.RingGeometry(rimR * 1.02, r * 0.84, 28);
      wwGeo.rotateY(sign > 0 ? Math.PI / 2 : -Math.PI / 2);
      const wwMat = mats.accent;
      const ww = new THREE.Mesh(wwGeo, wwMat);
      ww.position.x = xOffset + sign * (hw + 0.004);
      wheel.add(ww);
    }

    if (style === 'monster_tractor' || style === 'offroad_beadlock' || style === 'atv_balloon') {
      const lugCount = style === 'monster_tractor' ? 14 : 16;
      const lugGeo = new THREE.BoxGeometry(tireW * 0.88, 0.032, r * 0.14);
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

  // Alloy rim barrel + spokes
  const rimBarrelGeo = new THREE.CylinderGeometry(rimR, rimR, w * 0.86, 24, 1, false);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const rimMat =
    style === 'bbs_mesh'
      ? mats.accent
      : style === 'offroad_beadlock' || style === 'heavy_truck'
        ? mats.trim
        : mats.alloy;
  const barrel = new THREE.Mesh(rimBarrelGeo, rimMat);
  wheel.add(barrel);

  // Outer lip
  const lipGeo = new THREE.TorusGeometry(rimR * 0.97, 0.018, 8, 28);
  lipGeo.rotateY(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, style === 'aero_blade' ? mats.accent : mats.chrome);
  lip.position.x = sign * (w * 0.42);
  wheel.add(lip);

  // Spokes by style
  const spokeX = sign * (w * 0.34);
  if (style === 'aero_blade') {
    const discGeo = new THREE.CylinderGeometry(rimR * 0.92, rimR * 0.92, 0.03, 24);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, mats.secondary);
    disc.position.x = spokeX;
    wheel.add(disc);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, rimR * 0.85, 0.045), mats.accent);
      fin.position.set(spokeX + sign * 0.01, Math.cos(a) * rimR * 0.48, Math.sin(a) * rimR * 0.48);
      fin.rotation.x = -a + 0.25;
      wheel.add(fin);
    }
  } else {
    const spokeCount =
      style === 'bbs_mesh'
        ? 10
        : style === 'moto_spoke'
          ? 12
          : style === 'offroad_beadlock' || style === 'heavy_truck'
            ? 6
            : 5;
    const spokeThick = style === 'moto_spoke' ? 0.012 : style === 'heavy_truck' ? 0.055 : 0.032;
    const spokeGeo = new THREE.BoxGeometry(0.035, rimR * 0.9, spokeThick);
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, rimMat);
      spoke.position.set(spokeX, Math.cos(a) * rimR * 0.45, Math.sin(a) * rimR * 0.45);
      spoke.rotation.x = -a;
      wheel.add(spoke);
    }
  }

  // Center hub cap
  const hubGeo = new THREE.CylinderGeometry(rimR * 0.24, rimR * 0.28, 0.06, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, mats.chrome);
  hub.position.x = spokeX + sign * 0.02;
  wheel.add(hub);

  // Brake disc + caliper inside wheel
  if (style !== 'monster_tractor' && style !== 'scooter_small') {
    const discGeo = new THREE.CylinderGeometry(rimR * 0.72, rimR * 0.72, 0.025, 20);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, mats.brakeDisc);
    disc.position.x = -sign * w * 0.1;
    wheel.add(disc);

    const calGeo = new THREE.BoxGeometry(0.055, rimR * 0.34, rimR * 0.24);
    const cal = new THREE.Mesh(calGeo, mats.caliper);
    cal.position.set(-sign * w * 0.06, rimR * 0.28, -rimR * 0.38);
    wheel.add(cal);
  }

  enableShadows(wheel, true, true);
  return wheel;
}

function buildSideProfileShape(
  length: number,
  groundClearance: number,
  bodyHeight: number,
  hoodHeight: number,
  rearHeight: number,
  frontWheelZ: number,
  rearWheelZ: number,
  wheelArchR: number,
  hoodSlope: number,
  hasWheelArches = true,
): THREE.Shape {
  const halfL = length / 2;
  const shape = new THREE.Shape();

  const bottomY = groundClearance;
  shape.moveTo(-halfL + 0.08, bottomY);

  if (hasWheelArches && wheelArchR > 0.1) {
    // Rear overhang to rear arch
    const rStart = Math.max(-halfL + 0.14, rearWheelZ - wheelArchR);
    const rEnd = Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR);
    shape.lineTo(rStart, bottomY);
    shape.absarc(rearWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(rEnd, bottomY);

    // Rocker panel to front arch
    const fStart = Math.max(rEnd + 0.08, frontWheelZ - wheelArchR);
    const fEnd = Math.min(halfL - 0.14, frontWheelZ + wheelArchR);
    shape.lineTo(fStart, bottomY);
    shape.absarc(frontWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(fEnd, bottomY);
  }

  // Front lower chin and nose
  shape.lineTo(halfL - 0.04, bottomY + 0.05);
  shape.lineTo(halfL, bottomY + hoodHeight * 0.48);
  shape.lineTo(halfL - 0.08, bottomY + hoodHeight * (1 - hoodSlope * 0.28));

  // Hood back to cowl
  const cowlZ = halfL * 0.36;
  shape.lineTo(cowlZ, bottomY + bodyHeight);

  // Beltline back to rear deck
  shape.lineTo(-halfL + 0.12, bottomY + rearHeight);
  shape.lineTo(-halfL, bottomY + rearHeight * 0.72);
  shape.lineTo(-halfL + 0.03, bottomY + 0.08);
  shape.closePath();

  return shape;
}

function buildSculptedCabin(
  cabinLen: number,
  cabinHeight: number,
  width: number,
  taper: number,
  windshieldRake: number,
  rearRake: number,
  mats: VehicleMaterialSet,
  panoramic = false,
): THREE.Group {
  const cabin = new THREE.Group();
  const hl = cabinLen / 2;

  // Main cabin shell
  const shape = new THREE.Shape();
  shape.moveTo(-hl, 0);
  shape.lineTo(hl, 0);
  shape.lineTo(hl - hl * windshieldRake, cabinHeight);
  shape.lineTo(-hl + hl * rearRake, cabinHeight);
  shape.closePath();

  const cabW = width * (1 - taper * 0.24);
  const shellGeo = createExtrudedProfile(shape, cabW, 0.05, 0.08, 3);
  const shellMesh = new THREE.Mesh(shellGeo, mats.body);
  cabin.add(shellMesh);

  // Tinted glass wrap (slightly wider in X/Z inside pillars so windows read cleanly)
  const glassShape = new THREE.Shape();
  glassShape.moveTo(-hl + 0.12, 0.05);
  glassShape.lineTo(hl - 0.12, 0.05);
  glassShape.lineTo(hl - hl * windshieldRake - 0.08, cabinHeight - 0.07);
  glassShape.lineTo(-hl + hl * rearRake + 0.08, cabinHeight - 0.07);
  glassShape.closePath();

  const glassW = cabW + 0.025;
  const glassGeo = createExtrudedProfile(glassShape, glassW, 0.02, 0.02, 2);
  const glassMesh = new THREE.Mesh(glassGeo, mats.glass);
  glassMesh.castShadow = false;
  cabin.add(glassMesh);

  // Windshield & rear glass dark surrounds (slightly extended along Z)
  const frontGlassShape = new THREE.Shape();
  frontGlassShape.moveTo(-hl + 0.06, 0.06);
  frontGlassShape.lineTo(hl - 0.05, 0.06);
  frontGlassShape.lineTo(hl - hl * windshieldRake - 0.04, cabinHeight - 0.06);
  frontGlassShape.lineTo(-hl + hl * rearRake + 0.04, cabinHeight - 0.06);
  frontGlassShape.closePath();
  const fGlassGeo = createExtrudedProfile(frontGlassShape, cabW * 0.84, 0.025, 0.025, 2);
  // Stretch slightly along Z so windshield and rear glass poke through shell cleanly
  fGlassGeo.scale(1, 1, 1.03);
  const fGlassMesh = new THREE.Mesh(fGlassGeo, mats.glass);
  fGlassMesh.castShadow = false;
  cabin.add(fGlassMesh);

  // Roof cap / panoramic glass
  if (panoramic) {
    const roofLen = cabinLen * (1 - (windshieldRake + rearRake) * 0.5) * 0.78;
    const panGeo = new THREE.BoxGeometry(cabW * 0.74, 0.04, roofLen);
    const pan = new THREE.Mesh(panGeo, mats.glass);
    pan.position.set(0, cabinHeight - 0.005, (rearRake - windshieldRake) * hl * 0.25);
    pan.castShadow = false;
    cabin.add(pan);
  }

  return cabin;
}

function addFrontAndRearFascias(
  group: THREE.Group,
  length: number,
  width: number,
  groundClearance: number,
  hoodHeight: number,
  rearHeight: number,
  mats: VehicleMaterialSet,
  attachments: VehicleAttachment[],
) {
  const halfL = length / 2;
  const frontY = groundClearance + hoodHeight * 0.56;
  const rearY = groundClearance + rearHeight * 0.62;

  // Front grille
  const grilleW = width * 0.48;
  const grilleH = Math.max(0.14, hoodHeight * 0.32);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(grilleW, grilleH, 0.06), mats.grille);
  grille.position.set(0, frontY - 0.04, halfL + 0.005);
  tagPart(grille, 'Grade Frontal e Tomada de Ar', 0, 0, 0.45);
  group.add(grille);

  // Chrome/trim surround on grille
  const surround = new THREE.Mesh(
    new THREE.BoxGeometry(grilleW + 0.06, 0.028, 0.07),
    mats.trim,
  );
  surround.position.set(0, frontY + grilleH * 0.5 - 0.03, halfL + 0.008);
  tagPart(surround, 'Friso da Grade', 0, 0, 0.48);
  group.add(surround);

  // Headlights (left & right with DRL accent strip)
  const hlW = width * 0.19;
  const hlH = Math.max(0.08, hoodHeight * 0.18);
  [-1, 1].forEach((side) => {
    const hlGroup = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.BoxGeometry(hlW, hlH, 0.08), mats.headlight);
    hlGroup.add(housing);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(hlW * 1.04, 0.022, 0.09), mats.headlight);
    drl.position.y = -hlH * 0.42;
    hlGroup.add(drl);
    hlGroup.position.set(side * (width * 0.35), frontY + 0.02, halfL - 0.01);
    tagPart(hlGroup, side < 0 ? 'Farol Dianteiro Esquerdo' : 'Farol Dianteiro Direito', side * 0.25, 0.05, 0.45);
    group.add(hlGroup);

    // Taillights
    const tl = new THREE.Mesh(new THREE.BoxGeometry(hlW * 1.15, hlH * 0.9, 0.07), mats.taillight);
    tl.position.set(side * (width * 0.34), rearY, -halfL + 0.01);
    tagPart(tl, side < 0 ? 'Lanterna Traseira Esquerda' : 'Lanterna Traseira Direita', side * 0.25, 0.05, -0.45);
    group.add(tl);

    // Side mirrors
    const mirrorGroup = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.04), mats.trim);
    stalk.position.x = side * 0.05;
    mirrorGroup.add(stalk);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.085, 0.09), mats.body);
    cap.position.set(side * 0.1, 0.01, -0.01);
    mirrorGroup.add(cap);
    mirrorGroup.position.set(side * (width * 0.48), groundClearance + hoodHeight + 0.08, halfL * 0.24);
    tagPart(mirrorGroup, 'Retrovisores Externos', side * 0.4, 0.1, 0);
    group.add(mirrorGroup);
  });

  // Front & rear bumpers
  if (attachments.includes('chrome_bumpers')) {
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.03, 0.12, 0.14), mats.chrome);
    fBumper.position.set(0, groundClearance + 0.1, halfL + 0.04);
    tagPart(fBumper, 'Para-choque Dianteiro Cromado', 0, -0.05, 0.55);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 1.03, 0.12, 0.14), mats.chrome);
    rBumper.position.set(0, groundClearance + 0.1, -halfL - 0.04);
    tagPart(rBumper, 'Para-choque Traseiro Cromado', 0, -0.05, -0.55);
    group.add(rBumper);
  } else {
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.12, 0.1), mats.secondary);
    fBumper.position.set(0, groundClearance + 0.09, halfL + 0.01);
    tagPart(fBumper, 'Para-choque Dianteiro', 0, -0.06, 0.48);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.13, 0.1), mats.secondary);
    rBumper.position.set(0, groundClearance + 0.09, -halfL - 0.01);
    tagPart(rBumper, 'Para-choque Traseiro', 0, -0.06, -0.48);
    group.add(rBumper);
  }
}

function addVehicleAttachments(
  group: THREE.Group,
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  roofY: number,
  rearY: number,
  hoodY: number,
  animated: BuiltVehicle['animatedParts'],
) {
  const { length, width } = v.dimensions;
  const halfL = length / 2;
  const atts = v.geometry.attachments;

  if (atts.includes('spoiler_gt') || atts.includes('wing_swan')) {
    const isSwan = atts.includes('wing_swan');
    const wingGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.04, 0.28), mats.trim);
    blade.position.y = isSwan ? 0.34 : 0.22;
    blade.rotation.x = -0.1;
    wingGroup.add(blade);
    [-1, 1].forEach((side) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.34), mats.accent);
      endplate.position.set(side * (width * 0.47), isSwan ? 0.32 : 0.21, 0);
      wingGroup.add(endplate);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.035, isSwan ? 0.36 : 0.24, 0.14), mats.secondary);
      pylon.position.set(side * (width * 0.24), isSwan ? 0.18 : 0.12, isSwan ? 0.05 : 0);
      wingGroup.add(pylon);
    });
    wingGroup.position.set(0, rearY + 0.02, -halfL + 0.18);
    tagPart(wingGroup, isSwan ? 'Aerofólio Pescoço-de-Cisne' : 'Aerofólio Esportivo GT', 0, 0.45, -0.45);
    group.add(wingGroup);
  }

  if (atts.includes('splitter')) {
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 1.04, 0.035, 0.24), mats.trim);
    splitter.position.set(0, v.geometry.groundClearance + 0.02, halfL + 0.06);
    tagPart(splitter, 'Splitter Aerodinâmico Frontal', 0, -0.15, 0.55);
    group.add(splitter);
  }

  if (atts.includes('diffuser')) {
    const diffGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.08, 0.14), mats.trim);
    diffGroup.add(base);
    for (let i = -2; i <= 2; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.18), mats.trim);
      fin.position.set(i * (width * 0.14), -0.02, -0.02);
      diffGroup.add(fin);
    }
    diffGroup.position.set(0, v.geometry.groundClearance + 0.05, -halfL - 0.02);
    tagPart(diffGroup, 'Difusor Traseiro com Aletas', 0, -0.12, -0.55);
    group.add(diffGroup);
  }

  if (atts.includes('intercooler')) {
    const ic = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.18, 0.08), mats.alloy);
    ic.position.set(0, v.geometry.groundClearance + 0.15, halfL + 0.02);
    tagPart(ic, 'Intercooler Frontal Aparente', 0, 0, 0.6);
    group.add(ic);
  }

  if (atts.includes('dual_exhaust')) {
    const exGroup = new THREE.Group();
    const tipGeo = new THREE.CylinderGeometry(0.042, 0.045, 0.18, 14);
    tipGeo.rotateX(Math.PI / 2);
    [-1, 1].forEach((s) => {
      const tip = new THREE.Mesh(tipGeo, mats.chrome);
      tip.position.x = s * (width * 0.28);
      exGroup.add(tip);
    });
    exGroup.position.set(0, v.geometry.groundClearance + 0.08, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Duplo Esportivo', 0, -0.1, -0.6);
    group.add(exGroup);
  }

  if (atts.includes('blower_v8')) {
    const blower = new THREE.Group();
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.46), mats.chrome);
    blower.add(block);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.34), mats.chrome);
    scoop.position.set(0, 0.16, 0.04);
    blower.add(scoop);
    [-0.1, 0, 0.1].forEach((bx) => {
      const butterfly = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), mats.accent);
      butterfly.rotation.x = Math.PI / 2;
      butterfly.position.set(bx, 0.16, 0.21);
      blower.add(butterfly);
    });
    blower.position.set(0, hoodY + 0.06, halfL * 0.56);
    tagPart(blower, 'Supercharger V8 Cromado', 0, 0.55, 0);
    group.add(blower);
  }

  if (atts.includes('widebody')) {
    [-1, 1].forEach((side) => {
      [0.32 * length, -0.32 * length].forEach((wz, idx) => {
        const flare = new THREE.Mesh(
          new THREE.TorusGeometry(v.geometry.wheelRadius * 1.18, 0.055, 8, 16, Math.PI),
          mats.body,
        );
        flare.rotation.y = Math.PI / 2;
        flare.position.set(side * (width * 0.49), v.geometry.wheelRadius * 0.96, wz);
        tagPart(flare, idx === 0 ? 'Alargador Widebody Dianteiro' : 'Alargador Widebody Traseiro', side * 0.45, 0, 0);
        group.add(flare);
      });
    });
  }

  if (atts.includes('snorkel')) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(width * 0.48, hoodY - 0.1, halfL * 0.38),
      new THREE.Vector3(width * 0.51, hoodY + 0.15, halfL * 0.32),
      new THREE.Vector3(width * 0.50, roofY + 0.06, halfL * 0.18),
    ]);
    const snkGeo = new THREE.TubeGeometry(curve, 16, 0.045, 10, false);
    const snk = new THREE.Mesh(snkGeo, mats.trim);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.14), mats.trim);
    head.position.set(width * 0.50, roofY + 0.1, halfL * 0.16);
    const snkGroup = new THREE.Group();
    snkGroup.add(snk, head);
    tagPart(snkGroup, 'Snorkel de Admissão Elevada', 0.45, 0.25, 0);
    group.add(snkGroup);
  }

  if (atts.includes('bullbar')) {
    const bull = new THREE.Group();
    const barMat = mats.trim;
    const h = 0.36;
    const w = width * 0.68;
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w, 12), barMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = h * 0.5;
    bull.add(topBar);
    const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w, 12), barMat);
    botBar.rotation.z = Math.PI / 2;
    botBar.position.y = -h * 0.3;
    bull.add(botBar);
    [-0.32, 0, 0.32].forEach((bx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, 0.05), barMat);
      post.position.x = bx * w;
      bull.add(post);
    });
    bull.position.set(0, v.geometry.groundClearance + 0.28, halfL + 0.12);
    tagPart(bull, 'Quebra-Mato Tubular Frontal', 0, 0, 0.65);
    group.add(bull);
  }

  if (atts.includes('pushbar')) {
    const push = new THREE.Group();
    [-0.28, 0.28].forEach((px) => {
      const upright = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.12), mats.trim);
      upright.position.x = px * width;
      push.add(upright);
    });
    [0.14, -0.1].forEach((py) => {
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, width * 0.62, 12), mats.trim);
      cross.rotation.z = Math.PI / 2;
      cross.position.y = py;
      push.add(cross);
    });
    push.position.set(0, v.geometry.groundClearance + 0.3, halfL + 0.12);
    tagPart(push, 'Para-Choque de Impulsão (Push-Bar)', 0, 0, 0.62);
    group.add(push);
  }

  if (atts.includes('spare_rear')) {
    const spare = createCraftedWheel(
      v.geometry.wheelRadius * 0.92,
      v.geometry.wheelWidth * 0.9,
      v.geometry.wheelStyle,
      mats,
      true,
    );
    spare.rotation.y = Math.PI / 2;
    spare.position.set(0, rearY + 0.12, -halfL - 0.16);
    tagPart(spare, 'Estepe Traseiro Externo', 0, 0.15, -0.6);
    group.add(spare);
  }

  if (atts.includes('roof_rack') || atts.includes('roof_tent')) {
    const rack = new THREE.Group();
    const rw = width * 0.72;
    const rl = length * 0.42;
    [-1, 1].forEach((s) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, rl), mats.trim);
      rail.position.x = s * (rw / 2);
      rack.add(rail);
    });
    for (let i = -1; i <= 1; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.035, 0.045), mats.trim);
      bar.position.z = i * (rl * 0.35);
      rack.add(bar);
    }
    if (atts.includes('roof_tent')) {
      const tent = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.96, 0.28, rl * 0.92), mats.secondary);
      tent.position.y = 0.16;
      rack.add(tent);
      const cover = new THREE.Mesh(new THREE.BoxGeometry(rw * 0.98, 0.06, rl * 0.94), mats.accent);
      cover.position.y = 0.3;
      rack.add(cover);
    }
    rack.position.set(0, roofY + 0.03, -length * 0.04);
    tagPart(rack, atts.includes('roof_tent') ? 'Barraca Expedicionária de Teto' : 'Rack Utilitário de Teto', 0, 0.55, 0);
    group.add(rack);
  }

  if (atts.includes('taxi_sign')) {
    const sign = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.22), mats.trim);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.14, 0.18), mats.sirenAmber);
    glow.position.y = 0.08;
    sign.add(base, glow);
    sign.position.set(0, roofY + 0.02, 0.05);
    tagPart(sign, 'Luminoso de Teto TÁXI', 0, 0.55, 0);
    group.add(sign);
  }

  if (atts.includes('lightbar_police') || atts.includes('lightbar_amber')) {
    const isPolice = atts.includes('lightbar_police');
    const lb = new THREE.Group();
    const lbW = Math.min(1.32, width * 0.66);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(lbW, 0.06, 0.22), mats.trim);
    lb.add(frame);
    if (isPolice) {
      const leftPod = new THREE.Mesh(new THREE.BoxGeometry(lbW * 0.44, 0.09, 0.2), mats.sirenRed);
      leftPod.position.set(-lbW * 0.25, 0.03, 0);
      const rightPod = new THREE.Mesh(new THREE.BoxGeometry(lbW * 0.44, 0.09, 0.2), mats.sirenBlue);
      rightPod.position.set(lbW * 0.25, 0.03, 0);
      lb.add(leftPod, rightPod);
    } else {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(lbW * 0.88, 0.09, 0.2), mats.sirenAmber);
      pod.position.y = 0.03;
      lb.add(pod);
    }
    const barZ = v.geometry.archetype === 'helicopter' ? 0.5 : length * 0.05;
    lb.position.set(0, roofY + 0.04, barZ);
    tagPart(lb, isPolice ? 'Giroflex LED Bipartido Polícia' : 'Barra Sinalizadora Âmbar', 0, 0.6, 0);
    group.add(lb);
  }

  if (atts.includes('twin_rollbar')) {
    const rbGroup = new THREE.Group();
    const span = v.geometry.archetype === 'roadster' ? width * 0.24 : width * 0.36;
    if (v.geometry.archetype === 'roadster') {
      [-1, 1].forEach((s) => {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 10, 18, Math.PI), mats.chrome);
        hoop.position.x = s * span;
        rbGroup.add(hoop);
      });
      rbGroup.position.set(0, roofY + 0.02, -length * 0.14);
    } else {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(width * 0.4, 0.04, 10, 20, Math.PI), mats.chrome);
      arch.position.set(0, roofY - 0.15, -length * 0.02);
      rbGroup.add(arch);
    }
    tagPart(rbGroup, 'Santantônio Tubular Cromado', 0, 0.5, 0);
    group.add(rbGroup);
  }

  if (atts.includes('rollcage')) {
    const cage = new THREE.Group();
    const cw = width * 0.68;
    const cl = length * 0.42;
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * cw * 0.48, hoodY - 0.05, cl * 0.45),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.04, cl * 0.18),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.04, -cl * 0.42),
        new THREE.Vector3(s * cw * 0.48, rearY - 0.05, -cl * 0.65),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.028, 8, false), mats.accent);
      cage.add(tube);
    });
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, cw * 0.88, 10), mats.accent);
    cross.rotation.z = Math.PI / 2;
    cross.position.set(0, roofY - 0.04, -cl * 0.2);
    cage.add(cross);
    tagPart(cage, 'Gaiola Rollcage Estrutural', 0, 0.55, 0);
    group.add(cage);
  }

  if (atts.includes('bus_ac')) {
    const acCount = length > 14 ? 3 : length > 9 ? 2 : 1;
    const acGroup = new THREE.Group();
    for (let i = 0; i < acCount; i++) {
      const z = acCount === 1 ? 0 : -length * 0.25 + (i / (acCount - 1)) * (length * 0.5);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(width * 0.56, 0.22, 1.35), mats.secondary);
      pod.position.set(0, roofY + 0.11, z);
      acGroup.add(pod);
    }
    tagPart(acGroup, 'Unidades de Ar-Condicionado', 0, 0.65, 0);
    group.add(acGroup);
  }

  if (atts.includes('school_sign')) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.08), mats.secondary);
    sign.position.set(0, roofY + 0.11, halfL - 0.25);
    tagPart(sign, 'Placa ESCOLAR Superior', 0, 0.5, 0.2);
    group.add(sign);
  }

  if (atts.includes('food_awning')) {
    const awningGroup = new THREE.Group();
    const awning = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, length * 0.52), mats.accent);
    awning.rotation.z = -0.22;
    awning.position.set(width * 0.5 + 0.42, roofY - 0.25, -0.2);
    awningGroup.add(awning);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, length * 0.48), mats.chrome);
    counter.position.set(width * 0.5 + 0.14, hoodY + 0.02, -0.2);
    awningGroup.add(counter);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 14), mats.chrome);
    chimney.position.set(-width * 0.22, roofY + 0.16, -0.6);
    awningGroup.add(chimney);

    tagPart(awningGroup, 'Toldo, Balcão Gourmet e Exaustor', 0.65, 0.2, 0);
    group.add(awningGroup);
  }

  if (atts.includes('sweeper_brushes')) {
    [-1, 1].forEach((side) => {
      const brushGroup = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.16, 18), mats.accent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), mats.trim);
      brushGroup.add(disc, hub);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), mats.trim);
      arm.position.set(0, 0.14, -0.25);
      brushGroup.add(arm);
      brushGroup.position.set(side * (width * 0.46), 0.12, halfL + 0.24);
      tagPart(brushGroup, 'Escovas Varredouras Giratórias', side * 0.35, -0.1, 0.65);
      group.add(brushGroup);
      animated.sweeperBrushes.push(disc);
    });
  }

  if (atts.includes('ambulance_box')) {
    const stripeGroup = new THREE.Group();
    [-1, 1].forEach((side) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, length * 0.62), mats.secondary);
      band.position.set(side * (width * 0.5 + 0.005), hoodY + 0.1, -length * 0.14);
      stripeGroup.add(band);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.38, 0.12), mats.secondary);
      crossV.position.set(side * (width * 0.5 + 0.01), hoodY + 0.38, -length * 0.16);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.38), mats.secondary);
      crossH.position.set(side * (width * 0.5 + 0.01), hoodY + 0.38, -length * 0.16);
      stripeGroup.add(crossV, crossH);
    });
    const rearStep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.8, 0.08, 0.24), mats.alloy);
    rearStep.position.set(0, v.geometry.groundClearance + 0.06, -halfL - 0.1);
    stripeGroup.add(rearStep);
    tagPart(stripeGroup, 'Faixas SAMU e Degrau de Maca', 0, 0.1, -0.35);
    group.add(stripeGroup);
  }

  if (atts.includes('delivery_box')) {
    const doors = new THREE.Group();
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, hoodY * 0.85, 0.04), mats.trim);
    seam.position.set(0, hoodY, -halfL - 0.01);
    doors.add(seam);
    [-0.12, 0.12].forEach((hx) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.05), mats.chrome);
      handle.position.set(hx, hoodY - 0.1, -halfL - 0.02);
      doors.add(handle);
    });
    tagPart(doors, 'Portas Traseiras Bipartidas', 0, 0.1, -0.45);
    group.add(doors);
  }
}

function buildStandardWheeledVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;

  const frontWheelZ = wheelbase > 0 ? wheelbase * 0.5 : length * 0.32;
  const rearWheelZ = wheelbase > 0 ? -wheelbase * 0.5 : -length * 0.32;

  // Special multi-module articulated bus
  if (g.archetype === 'articulated_bus') {
    const frontLen = length * 0.55;
    const rearLen = length * 0.38;
    const gap = length * 0.07;

    const frontZ = length * 0.5 - frontLen * 0.5;
    const rearZ = -length * 0.5 + rearLen * 0.5;
    const bellowsZ = (frontZ - frontLen * 0.5 + (rearZ + rearLen * 0.5)) * 0.5;

    const buildBusModule = (modLen: number, zCenter: number, label: string, hasDisplay: boolean) => {
      const mod = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(width, height - g.groundClearance - 0.15, modLen);
      const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
      bodyMesh.position.y = g.groundClearance + (height - g.groundClearance) * 0.5;
      mod.add(bodyMesh);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, 0.24, modLen + 0.01), mats.secondary);
      stripe.position.y = g.groundClearance + 0.55;
      mod.add(stripe);

      const win = new THREE.Mesh(new THREE.BoxGeometry(width + 0.025, height * 0.4, modLen * 0.86), mats.glass);
      win.position.y = g.groundClearance + height * 0.54;
      win.castShadow = false;
      mod.add(win);

      if (hasDisplay) {
        const display = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.22, 0.06), mats.sirenAmber);
        display.position.set(0, height - 0.35, modLen * 0.5 + 0.01);
        mod.add(display);
      }

      mod.position.z = zCenter;
      tagPart(mod, label, 0, 0.15, zCenter > 0 ? 0.45 : -0.45);
      group.add(mod);
    };

    buildBusModule(frontLen, frontZ, 'Módulo Dianteiro Articulado', true);
    buildBusModule(rearLen, rearZ, 'Módulo Traseiro Articulado', false);

    // Corrugated accordion bellows
    const bellowsGroup = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.94, height - g.groundClearance - 0.25, gap * 0.18),
        i % 2 === 0 ? mats.trim : mats.secondary,
      );
      rib.position.set(0, g.groundClearance + (height - g.groundClearance) * 0.5, i * (gap * 0.19));
      bellowsGroup.add(rib);
    }
    bellowsGroup.position.z = bellowsZ;
    tagPart(bellowsGroup, 'Sanfona Articulada Central', 0, 0.35, 0);
    group.add(bellowsGroup);

    const axleZs = [frontZ + frontLen * 0.3, frontZ - frontLen * 0.28, rearZ - rearLen * 0.15];
    axleZs.forEach((az, idx) => {
      [-1, 1].forEach((side) => {
        const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, g.wheelStyle, mats, side > 0, idx > 0);
        w.position.set(side * (width * 0.47), g.wheelRadius, az);
        tagPart(w, `Eixo ${idx + 1}`, side * 0.4, -0.1, 0);
        group.add(w);
        animated.wheels.push(w);
      });
    });

    addFrontAndRearFascias(group, length, width, g.groundClearance, 1.0, 1.0, mats, g.attachments);
    addVehicleAttachments(group, v, mats, height - 0.15, height - 0.15, g.groundClearance + 1.0, animated);
    enableShadows(group);
    return group;
  }

  // Heavy Trucks (Semi, Dump, Mixer, Firetruck, Tow Truck)
  if (
    g.archetype === 'semi_truck' ||
    g.archetype === 'dump_truck' ||
    g.archetype === 'mixer_truck' ||
    g.archetype === 'firetruck' ||
    g.archetype === 'tow_truck'
  ) {
    const cabLen = length * g.cabinLengthRatio;
    const cabZ = halfL - cabLen * 0.5 - 0.1;
    const cabH = height - g.groundClearance - 0.1;

    // Frame rails
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.24, length * 0.94), mats.trim);
    frame.position.set(0, g.groundClearance + 0.16, 0);
    tagPart(frame, 'Longarinas do Chassi Pesado', 0, -0.25, 0);
    group.add(frame);

    // Sculpted Cab
    const cabShape = new THREE.Shape();
    const ch = cabLen / 2;
    cabShape.moveTo(-ch, 0);
    cabShape.lineTo(ch, 0);
    cabShape.lineTo(ch, cabH * 0.45);
    cabShape.lineTo(ch - ch * (1 - g.hoodSlope) * 0.5, cabH);
    cabShape.lineTo(-ch, cabH);
    cabShape.closePath();
    const cabGeo = createExtrudedProfile(cabShape, width * 0.96, 0.06, 0.06, 3);
    const cabMesh = new THREE.Mesh(cabGeo, mats.body);
    cabMesh.position.set(0, g.groundClearance + 0.22, cabZ);
    tagPart(cabMesh, 'Cabine Principal do Caminhão', 0, 0.35, 0.45);
    group.add(cabMesh);

    // Windshield
    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, cabH * 0.38, 0.08), mats.glass);
    ws.position.set(0, g.groundClearance + cabH * 0.72, cabZ + ch * 0.78);
    ws.rotation.x = -0.18;
    ws.castShadow = false;
    tagPart(ws, 'Para-brisa da Cabine', 0, 0.35, 0.55);
    group.add(ws);

    // Fuel tanks on sides
    [-1, 1].forEach((side) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, length * 0.22, 16), mats.chrome);
      tank.rotation.x = Math.PI / 2;
      tank.position.set(side * (width * 0.38), g.groundClearance + 0.25, 0.2);
      tagPart(tank, 'Tanque de Combustível Lateral', side * 0.4, -0.1, 0);
      group.add(tank);
    });

    // Rear functional body by archetype
    const rearLen = length * g.rearDeckRatio;
    const rearZ = -halfL + rearLen * 0.5 + 0.1;

    if (g.archetype === 'semi_truck') {
      const fifthWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.1, 18), mats.trim);
      fifthWheel.position.set(0, g.groundClearance + 0.34, rearZ);
      tagPart(fifthWheel, 'Quinta-Roda de Engate', 0, 0.25, -0.4);
      group.add(fifthWheel);
    } else if (g.archetype === 'dump_truck') {
      const bedGroup = new THREE.Group();
      const bed = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, height * 0.42, rearLen), mats.secondary);
      bedGroup.add(bed);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.08, cabLen * 0.55), mats.secondary);
      visor.position.set(0, height * 0.22, rearLen * 0.5 + cabLen * 0.22);
      bedGroup.add(visor);
      for (let i = -2; i <= 2; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(width + 0.03, height * 0.44, 0.12), mats.accent);
        rib.position.z = i * (rearLen * 0.2);
        bedGroup.add(rib);
      }
      bedGroup.position.set(0, g.groundClearance + 0.95, rearZ);
      bedGroup.rotation.x = 0.08;
      tagPart(bedGroup, 'Caçamba Basculante Nervurada', 0, 0.55, -0.45);
      group.add(bedGroup);
    } else if (g.archetype === 'mixer_truck') {
      const drumGroup = new THREE.Group();
      const drumPts = [
        new THREE.Vector2(0.05, -rearLen * 0.45),
        new THREE.Vector2(width * 0.36, -rearLen * 0.32),
        new THREE.Vector2(width * 0.46, 0),
        new THREE.Vector2(width * 0.32, rearLen * 0.4),
        new THREE.Vector2(0.05, rearLen * 0.45),
      ];
      const drumGeo = new THREE.LatheGeometry(drumPts, 24);
      drumGeo.rotateX(Math.PI / 2);
      const drumMesh = new THREE.Mesh(drumGeo, mats.secondary);
      drumGroup.add(drumMesh);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.465, width * 0.465, 0.24, 24), mats.accent);
      band.rotation.x = Math.PI / 2;
      drumGroup.add(band);

      drumGroup.position.set(0, g.groundClearance + 1.28, rearZ + 0.15);
      drumGroup.rotation.x = 0.22;
      tagPart(drumGroup, 'Tambor Misturador Helicoidal', 0, 0.65, -0.35);
      group.add(drumGroup);
      animated.mixerDrum = drumGroup;

      const chute = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.95), mats.trim);
      chute.position.set(0, g.groundClearance + 0.82, -halfL - 0.15);
      chute.rotation.x = 0.45;
      tagPart(chute, 'Calha de Descarga de Concreto', 0, 0.1, -0.65);
      group.add(chute);
    } else if (g.archetype === 'firetruck') {
      const bodyBox = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, cabH * 0.72, rearLen), mats.body);
      bodyBox.position.set(0, g.groundClearance + 0.22 + cabH * 0.36, rearZ);
      tagPart(bodyBox, 'Compartimento de Bombas e Mangueiras', 0, 0.25, -0.4);
      group.add(bodyBox);

      const shutter = new THREE.Mesh(new THREE.BoxGeometry(width + 0.02, cabH * 0.45, rearLen * 0.8), mats.alloy);
      shutter.position.set(0, g.groundClearance + 0.22 + cabH * 0.36, rearZ);
      tagPart(shutter, 'Persianas de Alumínio Laterais', 0, 0.25, -0.4);
      group.add(shutter);

      // Telescoping Magirus Ladder
      const ladder = new THREE.Group();
      const baseTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.28, 16), mats.trim);
      ladder.add(baseTurret);
      [-0.22, 0.22].forEach((lx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, length * 0.68), mats.alloy);
        rail.position.set(lx, 0.22, length * 0.12);
        ladder.add(rail);
      });
      for (let i = -5; i <= 5; i++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 8), mats.alloy);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, 0.22, length * 0.12 + i * 0.42);
        ladder.add(rung);
      }
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.46, 0.56), mats.accent);
      basket.position.set(0, 0.32, length * 0.46);
      ladder.add(basket);
      ladder.position.set(0, g.groundClearance + 0.28 + cabH * 0.75, rearZ);
      ladder.rotation.x = -0.14;
      tagPart(ladder, 'Escada Magirus Articulada', 0, 0.85, -0.2);
      group.add(ladder);
    } else if (g.archetype === 'tow_truck') {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.16, rearLen), mats.secondary);
      bed.position.set(0, g.groundClearance + 0.56, rearZ);
      bed.rotation.x = 0.06;
      tagPart(bed, 'Plataforma Hidráulica Rollback', 0, 0.35, -0.45);
      group.add(bed);
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.85, 0.22), mats.accent);
      pylon.position.set(0, g.groundClearance + 0.95, rearZ + rearLen * 0.45);
      tagPart(pylon, 'Torre do Guincho Hidráulico', 0, 0.45, -0.2);
      group.add(pylon);
    }

    // 3 Axles (front + dual rear tandem)
    const axles = [
      { z: cabZ + 0.15, dual: false },
      { z: rearZ - rearLen * 0.08, dual: true },
      { z: rearZ - rearLen * 0.34, dual: true },
    ];
    if (g.archetype === 'tow_truck') axles.pop();
    axles.forEach((ax, idx) => {
      [-1, 1].forEach((side) => {
        const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, g.wheelStyle, mats, side > 0, ax.dual);
        w.position.set(side * (width * 0.46), g.wheelRadius, ax.z);
        tagPart(w, `Conjunto Roda Eixo ${idx + 1}`, side * 0.45, -0.1, 0);
        group.add(w);
        animated.wheels.push(w);
      });
    });

    addFrontAndRearFascias(group, length, width, g.groundClearance + 0.22, cabH * 0.55, 0.65, mats, g.attachments);
    addVehicleAttachments(group, v, mats, g.groundClearance + 0.22 + cabH, g.groundClearance + 0.9, g.groundClearance + 0.95, animated);
    enableShadows(group);
    return group;
  }

  // Standard Cars / Hatch / Sedan / Coupe / Supercar / Muscle / Roadster / SUV / Pickup / Monster / Van / Buggy / Armored / Ambulance / Bus
  const isPickup = g.archetype === 'pickup' || g.archetype === 'monster';
  const isBusOrVan = g.archetype === 'bus' || g.archetype === 'van' || g.archetype === 'ambulance' || g.archetype === 'armored';
  const isMonster = g.archetype === 'monster';
  const isRoadster = g.archetype === 'roadster';

  const bodyLift = isMonster ? g.groundClearance * 0.55 : g.groundClearance;
  const bodyH = isBusOrVan ? (height - bodyLift) * 0.84 : (height - bodyLift) * (1 - g.cabinHeightRatio);
  const hoodH = bodyH * (g.archetype === 'supercar' ? 0.68 : 0.88);
  const rearH = isPickup ? bodyH * 0.92 : bodyH * (g.archetype === 'hatch' || g.archetype === 'wagon' || isBusOrVan ? 0.98 : 0.94);

  const archR = g.wheelRadius * (isMonster ? 0.72 : 1.15);
  const shape = buildSideProfileShape(
    length,
    bodyLift,
    bodyH,
    hoodH,
    rearH,
    frontWheelZ,
    rearWheelZ,
    archR,
    g.hoodSlope,
    !isMonster,
  );
  const bodyGeo = createExtrudedProfile(shape, width, 0.055, 0.055, 3);
  const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
  tagPart(bodyMesh, 'Carroceria Principal Esculpida', 0, 0.15, 0);
  group.add(bodyMesh);

  // Monster truck exposed ladder chassis + rigid axles + twin coilovers
  if (isMonster) {
    const subFrame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.52, 0.2, length * 0.72), mats.trim);
    subFrame.position.set(0, g.wheelRadius * 0.95, 0);
    tagPart(subFrame, 'Subchassi Tubular Elevado', 0, -0.25, 0);
    group.add(subFrame);
    [frontWheelZ, rearWheelZ].forEach((wz) => {
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, width * 1.04, 12), mats.trim);
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, g.wheelRadius, wz);
      tagPart(axle, 'Eixo Rígido Reforçado', 0, -0.35, 0);
      group.add(axle);
      [-1, 1].forEach((s) => {
        const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.55, 10), mats.accent);
        shock.position.set(s * width * 0.34, g.wheelRadius + 0.25, wz);
        shock.rotation.z = s * 0.18;
        tagPart(shock, 'Amortecedor Duplo', s * 0.3, -0.15, 0);
        group.add(shock);
      });
    });
  }

  // Cabin / Greenhouse
  const beltlineY = bodyLift + bodyH - 0.03;
  const cabH = isBusOrVan ? (height - beltlineY) * 0.85 : Math.max(0.32, height - beltlineY);
  const cabLen = length * g.cabinLengthRatio;
  const cabCenterZ = isPickup
    ? length * 0.08
    : g.archetype === 'muscle' || g.archetype === 'classic' || isRoadster
      ? -length * 0.05
      : g.archetype === 'supercar'
        ? length * 0.04
        : -length * (g.rearDeckRatio * 0.35 - 0.05);

  if (isRoadster) {
    // Open cockpit interior + tilted windshield
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, cabH * 1.15, 0.06), mats.glass);
    wsFrame.position.set(0, beltlineY + cabH * 0.45, cabCenterZ + cabLen * 0.44);
    wsFrame.rotation.x = -0.58;
    wsFrame.castShadow = false;
    tagPart(wsFrame, 'Para-brisa Esportivo Inclinado', 0, 0.35, 0.2);
    group.add(wsFrame);

    [-1, 1].forEach((side) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.42), mats.interior);
      seat.position.set(side * (width * 0.22), beltlineY + 0.14, cabCenterZ - 0.12);
      seat.rotation.x = -0.18;
      tagPart(seat, 'Banco Concha Esportivo', side * 0.25, 0.35, 0);
      group.add(seat);
    });
    const wheelSteer = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 18), mats.trim);
    wheelSteer.position.set(-width * 0.22, beltlineY + 0.18, cabCenterZ + 0.24);
    wheelSteer.rotation.x = 0.4;
    tagPart(wheelSteer, 'Volante Esportivo', -0.2, 0.35, 0.2);
    group.add(wheelSteer);
  } else {
    const wsRake = isBusOrVan ? 0.12 : g.archetype === 'supercar' ? 0.62 : 0.42;
    const rRake = g.archetype === 'hatch' || g.archetype === 'wagon' || g.archetype === 'suv' || isBusOrVan ? 0.16 : 0.48;
    const cab = buildSculptedCabin(
      cabLen,
      cabH,
      width,
      g.roofTaper,
      wsRake,
      rRake,
      mats,
      g.attachments.includes('panoramic_roof'),
    );
    cab.position.set(0, beltlineY, cabCenterZ);
    tagPart(cab, 'Cabine e Conjunto Envidraçado', 0, 0.48, 0);
    group.add(cab);
  }

  // Pickup bed recess detail + tailgate
  if (isPickup) {
    const bedFloor = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.78, 0.08, length * g.rearDeckRatio * 0.85),
      mats.trim,
    );
    bedFloor.position.set(0, beltlineY + 0.02, -halfL + length * g.rearDeckRatio * 0.45);
    tagPart(bedFloor, 'Assoalho da Caçamba Protetor', 0, 0.25, -0.3);
    group.add(bedFloor);
  }

  // Armored turret & gunports
  if (g.archetype === 'armored') {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.32, 8), mats.secondary);
    turret.position.set(0, beltlineY + cabH + 0.14, 0);
    tagPart(turret, 'Torre de Observação Blindada', 0, 0.7, 0);
    group.add(turret);
  }

  // Wheels
  const wheelY = g.wheelRadius;
  const wheelX = width * (isMonster ? 0.56 : 0.46);
  [
    { z: frontWheelZ, label: 'Roda Dianteira' },
    { z: rearWheelZ, label: 'Roda Traseira' },
  ].forEach((axle) => {
    [-1, 1].forEach((side) => {
      const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, g.wheelStyle, mats, side > 0);
      w.position.set(side * wheelX, wheelY, axle.z);
      tagPart(w, `${axle.label} ${side < 0 ? 'Esquerda' : 'Direita'}`, side * 0.48, -0.05, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  // Side skirts / running boards
  [-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, Math.max(0.8, wheelbase - g.wheelRadius * 2.2)),
      mats.trim,
    );
    skirt.position.set(side * (width * 0.49), bodyLift + 0.04, (frontWheelZ + rearWheelZ) * 0.5);
    tagPart(skirt, 'Saia Lateral / Estribo', side * 0.42, -0.1, 0);
    group.add(skirt);
  });

  addFrontAndRearFascias(group, length, width, bodyLift, hoodH, rearH, mats, g.attachments);
  addVehicleAttachments(group, v, mats, beltlineY + cabH, bodyLift + rearH, bodyLift + hoodH, animated);
  enableShadows(group);
  return group;
}

function buildMotorcycleOrAtv(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const g = v.geometry;
  const fZ = wheelbase * 0.5;
  const rZ = -wheelbase * 0.5;

  if (g.archetype === 'atv') {
    // 4-wheel ATV
    const body = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.34, length * 0.72), mats.body);
    body.position.set(0, g.groundClearance + 0.34, 0);
    tagPart(body, 'Carenagem Central ATV', 0, 0.25, 0);
    group.add(body);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.16, length * 0.38), mats.interior);
    seat.position.set(0, g.groundClearance + 0.55, -0.1);
    tagPart(seat, 'Assento Duplo ATV', 0, 0.45, 0);
    group.add(seat);

    // Tubular racks
    [0.55, -0.62].forEach((rz, idx) => {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.05, 0.48), mats.trim);
      rack.position.set(0, g.groundClearance + 0.54, rz);
      tagPart(rack, idx === 0 ? 'Bagageiro Tubular Dianteiro' : 'Bagageiro Tubular Traseiro', 0, 0.45, rz * 0.5);
      group.add(rack);
    });

    // Handlebars
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, width * 0.64, 10), mats.trim);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, height * 0.85, fZ * 0.45);
    tagPart(bar, 'Guidão Tático', 0, 0.5, 0.2);
    group.add(bar);

    [fZ, rZ].forEach((wz) => {
      [-1, 1].forEach((side) => {
        const w = createCraftedWheel(g.wheelRadius, g.wheelWidth, g.wheelStyle, mats, side > 0);
        w.position.set(side * (width * 0.4), g.wheelRadius, wz);
        tagPart(w, 'Roda Balão ATV', side * 0.4, -0.05, 0);
        group.add(w);
        animated.wheels.push(w);
      });
    });

    addVehicleAttachments(group, v, mats, height, height * 0.6, height * 0.6, animated);
    enableShadows(group);
    return group;
  }

  // Two-wheel Motorcycle / Scooter
  const frontW = createCraftedWheel(g.wheelRadius, g.wheelWidth, g.wheelStyle, mats, true);
  frontW.position.set(0, g.wheelRadius, fZ);
  tagPart(frontW, 'Roda Dianteira', 0, -0.05, 0.35);
  group.add(frontW);
  animated.wheels.push(frontW);

  const rearW = createCraftedWheel(g.wheelRadius, g.wheelWidth * 1.25, g.wheelStyle, mats, true);
  rearW.position.set(0, g.wheelRadius, rZ);
  tagPart(rearW, 'Roda Traseira', 0, -0.05, -0.35);
  group.add(rearW);
  animated.wheels.push(rearW);

  // Frame / Engine block
  const frameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, g.wheelRadius, rZ),
    new THREE.Vector3(0, g.groundClearance + 0.35, -0.15),
    new THREE.Vector3(0, g.groundClearance + 0.65, fZ * 0.55),
  ]);
  const frameMesh = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 16, 0.045, 8, false), mats.trim);
  tagPart(frameMesh, 'Chassi Tubular', 0, 0.15, 0);
  group.add(frameMesh);

  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.38), mats.alloy);
  engine.position.set(0, g.groundClearance + 0.22, 0);
  tagPart(engine, 'Bloco do Motor', 0, -0.15, 0);
  group.add(engine);

  // Front forks
  const rake = g.archetype === 'cruiser' ? 0.52 : 0.32;
  [-0.1, 0.1].forEach((fx) => {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.78, 10), mats.chrome);
    fork.position.set(fx, g.wheelRadius + 0.32, fZ - 0.12);
    fork.rotation.x = -rake;
    tagPart(fork, 'Suspensão Dianteira (Garfo)', fx * 2, 0.2, 0.25);
    group.add(fork);
  });

  // Fuel tank / Fairing / Scooter shield
  if (g.archetype === 'scooter') {
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.18), mats.body);
    shield.position.set(0, g.groundClearance + 0.45, fZ * 0.52);
    shield.rotation.x = -0.22;
    tagPart(shield, 'Escudo Frontal da Scooter', 0, 0.25, 0.3);
    group.add(shield);

    const rearShell = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.72), mats.body);
    rearShell.position.set(0, g.groundClearance + 0.34, rZ + 0.2);
    tagPart(rearShell, 'Carenagem Traseira', 0, 0.2, -0.25);
    group.add(rearShell);
  } else {
    const tankGeo = new THREE.SphereGeometry(0.22, 16, 12);
    tankGeo.scale(0.85, 0.78, 1.45);
    const tank = new THREE.Mesh(tankGeo, mats.body);
    tank.position.set(0, g.groundClearance + 0.62, 0.22);
    tagPart(tank, 'Tanque de Combustível Esculpido', 0, 0.4, 0);
    group.add(tank);

    if (g.archetype === 'sportbike') {
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.52), mats.body);
      cowl.position.set(0, g.groundClearance + 0.58, fZ * 0.58);
      cowl.rotation.x = 0.25;
      tagPart(cowl, 'Carenagem Esportiva Frontal', 0, 0.3, 0.35);
      group.add(cowl);

      const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.24, 0.34), mats.glass);
      windscreen.position.set(0, g.groundClearance + 0.84, fZ * 0.52);
      windscreen.rotation.x = -0.58;
      windscreen.castShadow = false;
      tagPart(windscreen, 'Bolha Acrílica', 0, 0.45, 0.35);
      group.add(windscreen);
    }
  }

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.64), mats.interior);
  seat.position.set(0, g.groundClearance + 0.52, -0.26);
  tagPart(seat, 'Banco Ergonômico', 0, 0.35, -0.1);
  group.add(seat);

  // Handlebars
  const hbar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, width * 0.88, 10), mats.chrome);
  hbar.rotation.z = Math.PI / 2;
  hbar.position.set(0, height * 0.82, fZ * 0.42);
  tagPart(hbar, 'Guidão com Manoplas', 0, 0.5, 0.2);
  group.add(hbar);

  // Headlight & taillight
  const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), mats.headlight);
  hl.rotation.x = Math.PI / 2;
  hl.position.set(0, g.groundClearance + 0.66, fZ * 0.72);
  tagPart(hl, 'Farol Dianteiro', 0, 0.25, 0.4);
  group.add(hl);

  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.06), mats.taillight);
  tl.position.set(0, g.groundClearance + 0.56, rZ - 0.12);
  tagPart(tl, 'Lanterna Traseira', 0, 0.2, -0.4);
  group.add(tl);

  // Exhaust pipe
  const exCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, g.groundClearance + 0.18, 0.15),
    new THREE.Vector3(0.18, g.groundClearance + 0.14, -0.25),
    new THREE.Vector3(0.20, g.archetype === 'dirtbike' ? g.groundClearance + 0.48 : g.groundClearance + 0.22, rZ - 0.05),
  ]);
  const exhaust = new THREE.Mesh(new THREE.TubeGeometry(exCurve, 14, 0.036, 10, false), mats.chrome);
  tagPart(exhaust, 'Escapamento Esportivo', 0.35, 0, -0.2);
  group.add(exhaust);

  // Delivery box for Moto-Entrega
  if (g.attachments.includes('moto_box')) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.48), mats.accent);
    box.position.set(0, g.groundClearance + 0.78, rZ - 0.05);
    tagPart(box, 'Baú Térmico de Entregas', 0, 0.6, -0.3);
    group.add(box);
  }

  enableShadows(group);
  return group;
}

function buildWatercraft(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;

  // Deep-V Boat Hull (top-down shape extruded vertically, then tapered bow)
  const hullShape = new THREE.Shape();
  const hw = width * 0.48;
  hullShape.moveTo(-hw, -halfL);
  hullShape.lineTo(hw, -halfL);
  hullShape.lineTo(hw, halfL * 0.35);
  hullShape.quadraticCurveTo(hw * 0.7, halfL * 0.85, 0, halfL);
  hullShape.quadraticCurveTo(-hw * 0.7, halfL * 0.85, -hw, halfL * 0.35);
  hullShape.closePath();

  const hullH = g.archetype === 'tugboat' ? height * 0.42 : height * 0.48;
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: hullH,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  hullGeo.rotateX(-Math.PI / 2);
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, mats.body);
  hull.position.y = 0.08;
  tagPart(hull, 'Casco Náutico em V', 0, -0.15, 0);
  group.add(hull);

  // Deck / Coaming
  const deck = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.1, length * 0.56), mats.secondary);
  deck.position.set(0, hullH + 0.06, -length * 0.06);
  tagPart(deck, 'Convés e Cockpit', 0, 0.15, 0);
  group.add(deck);

  if (g.archetype === 'rib_boat') {
    // Inflatable perimeter pontoons
    const tubePts = [
      new THREE.Vector3(-hw * 0.95, hullH * 0.85, -halfL + 0.2),
      new THREE.Vector3(-hw, hullH * 0.9, halfL * 0.35),
      new THREE.Vector3(0, hullH * 1.02, halfL + 0.1),
      new THREE.Vector3(hw, hullH * 0.9, halfL * 0.35),
      new THREE.Vector3(hw * 0.95, hullH * 0.85, -halfL + 0.2),
    ];
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tubePts), 28, 0.24, 12, false), mats.body);
    tagPart(tube, 'Flutuadores Infláveis Perimetrais', 0, 0.35, 0);
    group.add(tube);
  }

  if (g.archetype === 'tugboat') {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, height * 0.38, length * 0.36), mats.secondary);
    cabin.position.set(0, hullH + height * 0.19, length * 0.06);
    tagPart(cabin, 'Casario de Comando 360°', 0, 0.45, 0);
    group.add(cabin);

    const glassBand = new THREE.Mesh(new THREE.BoxGeometry(width * 0.64, height * 0.14, length * 0.38), mats.glass);
    glassBand.position.set(0, hullH + height * 0.26, length * 0.06);
    glassBand.castShadow = false;
    group.add(glassBand);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, height * 0.36, 10), mats.accent);
    mast.position.set(0, hullH + height * 0.54, length * 0.05);
    tagPart(mast, 'Mastro de Radar Naval', 0, 0.7, 0);
    group.add(mast);

    // Side rubber tire fenders
    [-1, 1].forEach((side) => {
      for (let i = -2; i <= 2; i++) {
        const fender = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 8, 14), mats.rubber);
        fender.rotation.y = Math.PI / 2;
        fender.position.set(side * (hw + 0.06), hullH * 0.72, i * (length * 0.16));
        tagPart(fender, 'Defensa Lateral de Borracha', side * 0.4, 0, 0);
        group.add(fender);
      }
    });
  } else if (g.archetype === 'jetski') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.24, length * 0.42), mats.interior);
    seat.position.set(0, hullH + 0.2, -0.2);
    tagPart(seat, 'Banco Náutico Esportivo', 0, 0.35, 0);
    group.add(seat);

    const helm = new THREE.Mesh(new THREE.BoxGeometry(width * 0.48, 0.32, 0.42), mats.secondary);
    helm.position.set(0, hullH + 0.28, 0.42);
    helm.rotation.x = -0.35;
    tagPart(helm, 'Coluna de Direção', 0, 0.35, 0.2);
    group.add(helm);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.28, 14), mats.trim);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.25, -halfL - 0.08);
    tagPart(nozzle, 'Bocal de Hidrojato', 0, 0, -0.5);
    group.add(nozzle);
  } else {
    // Wraparound boat windshield & helm
    const ws = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, 0.38, 0.75), mats.glass);
    ws.position.set(0, hullH + 0.26, length * 0.12);
    ws.castShadow = false;
    tagPart(ws, 'Para-brisa Envolvente', 0, 0.4, 0.15);
    group.add(ws);

    const seats = new THREE.Mesh(new THREE.BoxGeometry(width * 0.66, 0.3, length * 0.36), mats.interior);
    seats.position.set(0, hullH + 0.16, -length * 0.16);
    tagPart(seats, 'Estofamento Náutico', 0, 0.3, -0.1);
    group.add(seats);
  }

  // Twin outboards with animated propellers
  if (g.attachments.includes('outboard_twin')) {
    [-0.32, 0.32].forEach((ox) => {
      const obGroup = new THREE.Group();
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.42), mats.trim);
      cowl.position.y = 0.28;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.48, 0.18), mats.trim);
      leg.position.y = -0.14;
      obGroup.add(cowl, leg);

      const propGroup = new THREE.Group();
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.08), mats.chrome);
        blade.rotation.z = (b / 3) * Math.PI * 2;
        propGroup.add(blade);
      }
      propGroup.position.set(0, -0.32, -0.14);
      obGroup.add(propGroup);
      animated.propellers.push(propGroup);

      obGroup.position.set(ox, hullH * 0.85, -halfL - 0.18);
      tagPart(obGroup, 'Motor de Popa com Hélice', ox * 0.6, 0.15, -0.55);
      group.add(obGroup);
    });
  }

  addVehicleAttachments(group, v, mats, hullH + height * 0.4, hullH + 0.3, hullH + 0.3, animated);
  enableShadows(group);
  return group;
}

function buildAircraftOrHovercraft(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, height } = v.dimensions;
  const g = v.geometry;

  if (g.archetype === 'hovercraft') {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(width, 0.44, length * 0.96), mats.rubber);
    skirt.position.set(0, 0.22, 0);
    tagPart(skirt, 'Saia Inflável Periférica', 0, -0.2, 0);
    group.add(skirt);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.24, length * 0.86), mats.body);
    deck.position.set(0, 0.54, 0);
    tagPart(deck, 'Convés Estrutural Anfíbio', 0, 0.1, 0);
    group.add(deck);

    const cab = buildSculptedCabin(length * 0.42, height * 0.46, width * 0.72, 0.25, 0.42, 0.22, mats, true);
    cab.position.set(0, 0.64, length * 0.14);
    tagPart(cab, 'Cabine Panorâmica', 0, 0.45, 0.15);
    group.add(cab);

    // Twin rear ducted fans
    [-1, 1].forEach((side) => {
      const ductGroup = new THREE.Group();
      const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.46, 20, 1, true), mats.secondary);
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

  // Helicopter
  const skidY = 0.08;
  const fuseY = g.groundClearance + 0.78;
  const fuseLen = length * 0.44;
  const fuseW = width * 0.72;

  // Landing skids
  [-1, 1].forEach((side) => {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, length * 0.38, 10), mats.trim);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * (fuseW * 0.46), skidY, 0.2);
    tagPart(skid, 'Esqui de Pouso Tubular', side * 0.35, -0.25, 0);
    group.add(skid);

    [-0.7, 0.9].forEach((sz) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, g.groundClearance + 0.35, 8), mats.trim);
      strut.position.set(side * (fuseW * 0.42), skidY + 0.32, sz);
      strut.rotation.z = side * 0.16;
      group.add(strut);
    });
  });

  // Main fuselage pod
  const podGeo = new THREE.SphereGeometry(1, 24, 18);
  podGeo.scale(fuseW * 0.5, height * 0.26, fuseLen * 0.55);
  const pod = new THREE.Mesh(podGeo, mats.body);
  pod.position.set(0, fuseY, 0.4);
  tagPart(pod, 'Fuselagem Principal Aerodinâmica', 0, 0.15, 0.2);
  group.add(pod);

  // Canopy glass nose
  const canopyGeo = new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
  canopyGeo.scale(fuseW * 0.44, height * 0.22, fuseLen * 0.36);
  canopyGeo.rotateX(Math.PI * 0.38);
  const canopy = new THREE.Mesh(canopyGeo, mats.glass);
  canopy.position.set(0, fuseY + 0.08, 1.35);
  canopy.castShadow = false;
  tagPart(canopy, 'Bolha Panorâmica do Cockpit', 0, 0.2, 0.5);
  group.add(canopy);

  // Twin turbine cowlings on top
  const turbine = new THREE.Mesh(new THREE.BoxGeometry(fuseW * 0.62, 0.48, fuseLen * 0.52), mats.secondary);
  turbine.position.set(0, fuseY + height * 0.26, 0.1);
  tagPart(turbine, 'Conjunto Turboeixo Superior', 0, 0.45, 0);
  group.add(turbine);

  // Tail boom + stabilizers
  const boomLen = length * 0.46;
  const boomGeo = new THREE.CylinderGeometry(0.14, 0.28, boomLen, 14);
  boomGeo.rotateX(Math.PI / 2);
  const boom = new THREE.Mesh(boomGeo, mats.body);
  boom.position.set(0, fuseY + 0.18, -boomLen * 0.5 - 0.8);
  tagPart(boom, 'Cone de Cauda e Estabilizadores', 0, 0.2, -0.65);
  group.add(boom);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.58), mats.accent);
  fin.position.set(0, fuseY + 0.58, -boomLen - 0.6);
  fin.rotation.x = 0.28;
  tagPart(fin, 'Deriva Vertical de Cauda', 0, 0.35, -0.75);
  group.add(fin);

  // Main 4-blade rotor
  const mainRotor = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.48, 14), mats.trim);
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

  // Tail rotor
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
    const winch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.42), mats.accent);
    winch.position.set(fuseW * 0.52, fuseY + 0.15, 0.6);
    tagPart(winch, 'Guincho Lateral de Salvamento', 0.45, 0.15, 0);
    group.add(winch);
  }

  addVehicleAttachments(group, v, mats, fuseY + height * 0.28, fuseY, fuseY, animated);
  enableShadows(group);
  return group;
}

export function buildCraftedVehicle(v: VehicleConcept, maxAniso = 4): BuiltVehicle {
  const mats = createVehicleMaterials(
    v.palette.primary,
    v.palette.secondary,
    v.palette.accent,
    v.palette.interior,
    v.palette.finish,
    v.palette.trim,
    maxAniso,
  );

  const animated: BuiltVehicle['animatedParts'] = {
    wheels: [],
    rotors: [],
    propellers: [],
    mixerDrum: null,
    sweeperBrushes: [],
  };

  let group: THREE.Group;
  const arch = v.geometry.archetype;

  if (arch === 'scooter' || arch === 'sportbike' || arch === 'cruiser' || arch === 'dirtbike' || arch === 'atv') {
    group = buildMotorcycleOrAtv(v, mats, animated);
  } else if (arch === 'speedboat' || arch === 'jetski' || arch === 'rib_boat' || arch === 'tugboat') {
    group = buildWatercraft(v, mats, animated);
  } else if (arch === 'helicopter' || arch === 'hovercraft') {
    group = buildAircraftOrHovercraft(v, mats, animated);
  } else {
    group = buildStandardWheeledVehicle(v, mats, animated);
  }

  let partsCount = 0;
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) partsCount++;
  });

  const dispose = () => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).geometry.dispose();
      }
    });
    mats.dispose();
  };

  return {
    group,
    materials: mats,
    animatedParts: animated,
    partsCount,
    dispose,
  };
}
