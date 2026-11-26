import * as THREE from 'three';
import { PaintLivery, WheelStyle } from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';

export interface OpenablePart {
  pivot: THREE.Object3D;
  openRotX: number;
  openRotY: number;
  openRotZ: number;
  openOffset?: THREE.Vector3;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  label: string;
}

export interface BuiltVehicle {
  group: THREE.Group;
  materials: VehicleMaterialSet;
  animatedParts: {
    wheels: THREE.Object3D[];
    rotors: THREE.Object3D[];
    propellers: THREE.Object3D[];
    mixerDrum: THREE.Object3D | null;
    sweeperBrushes: THREE.Object3D[];
    openables: OpenablePart[];
  };
  partsCount: number;
  dispose: () => void;
}

export interface BuildVehicleOptions {
  cityMode?: boolean;
  liveryOverride?: PaintLivery;
  wheelStyleOverride?: WheelStyle;
  stripeColorOverride?: string;
}

export function tagPart(
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

export function registerOpenable(
  animated: BuiltVehicle['animatedParts'],
  pivot: THREE.Object3D,
  label: string,
  openRot: { x?: number; y?: number; z?: number },
  openOffset?: THREE.Vector3,
) {
  animated.openables.push({
    pivot,
    openRotX: openRot.x ?? 0,
    openRotY: openRot.y ?? 0,
    openRotZ: openRot.z ?? 0,
    openOffset,
    basePos: pivot.position.clone(),
    baseRot: pivot.rotation.clone(),
    label,
  });
}

export function enableShadows(root: THREE.Object3D, cast = true, receive = true) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      if (m.userData.noShadow) {
        m.castShadow = false;
        m.receiveShadow = false;
      } else {
        m.castShadow = cast;
        m.receiveShadow = receive;
      }
    }
  });
}

export function createExtrudedProfile(
  shape: THREE.Shape,
  width: number,
  bevelSize = 0.045,
  bevelThickness = 0.045,
  bevelSegments = 5,
  curveSegments = 22,
): THREE.BufferGeometry {
  const innerDepth = Math.max(0.03, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: bevelSize > 0,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments,
  });
  geo.translate(0, 0, -innerDepth / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(r, hw * 0.85, hh * 0.85);
  const s = new THREE.Shape();
  s.moveTo(-hw + rr, -hh);
  s.lineTo(hw - rr, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + rr);
  s.lineTo(hw, hh - rr);
  s.quadraticCurveTo(hw, hh, hw - rr, hh);
  s.lineTo(-hw + rr, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - rr);
  s.lineTo(-hw, -hh + rr);
  s.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
  return s;
}

export function createRoundedBoxGeo(
  w: number,
  h: number,
  d: number,
  radius = 0.04,
  bevelSegs = 4,
  curveSegs = 12,
): THREE.BufferGeometry {
  const r = Math.min(radius, w * 0.35, h * 0.35, d * 0.35);
  const bevel = Math.min(r * 0.65, d * 0.25);
  const shape = createRoundedRectShape(Math.max(0.01, w - bevel * 2), Math.max(0.01, h - bevel * 2), r);
  const innerD = Math.max(0.008, d - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: bevel > 0.002,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
  });
  geo.translate(0, 0, -innerD / 2);
  geo.computeVertexNormals();
  return geo;
}

export function makeStrutBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radiusTop: number,
  radiusBot: number,
  mat: THREE.Material,
  radialSegments = 12,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = Math.max(0.01, dir.length());
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBot, len, radialSegments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export function createAerodynamicMirror(
  side: number,
  mats: VehicleMaterialSet,
  cityMode = false,
): THREE.Group {
  const mirrorGroup = new THREE.Group();
  const seg = cityMode ? 6 : 12;

  const baseMount = new THREE.Mesh(
    createRoundedBoxGeo(0.036, 0.064, 0.08, 0.014, cityMode ? 2 : 3, seg),
    mats.trim,
  );
  mirrorGroup.add(baseMount);

  const stalk = makeStrutBetween(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * 0.1, 0.035, -0.01),
    0.016,
    0.02,
    mats.trim,
    seg,
  );
  mirrorGroup.add(stalk);

  const capGeo = new THREE.CapsuleGeometry(0.044, 0.09, cityMode ? 3 : 6, seg);
  capGeo.rotateZ(Math.PI / 2);
  capGeo.scale(1.0, 0.9, 1.15);
  const cap = new THREE.Mesh(capGeo, mats.body);
  cap.position.set(side * 0.125, 0.038, -0.01);
  mirrorGroup.add(cap);

  const mirrorFace = new THREE.Mesh(
    createRoundedBoxGeo(0.115, 0.062, 0.014, 0.016, 2, seg),
    mats.mirrorGlass,
  );
  mirrorFace.position.set(side * 0.125, 0.038, -0.056);
  mirrorGroup.add(mirrorFace);

  const sigStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.012, 0.018),
    mats.amberSignal,
  );
  sigStrip.position.set(side * 0.125, 0.038, 0.038);
  mirrorGroup.add(sigStrip);

  return mirrorGroup;
}

export function createEngineBayAssembly(
  bayW: number,
  bayL: number,
  mats: VehicleMaterialSet,
  isElectric = false,
): THREE.Group {
  const engine = new THREE.Group();
  const tub = new THREE.Mesh(new THREE.BoxGeometry(bayW * 0.94, 0.05, bayL * 0.92), mats.grille);
  tub.position.y = -0.14;
  engine.add(tub);

  if (isElectric) {
    const frunkTub = new THREE.Mesh(
      createRoundedBoxGeo(bayW * 0.72, 0.16, bayL * 0.68, 0.04, 3, 10),
      mats.trim,
    );
    frunkTub.position.y = -0.06;
    engine.add(frunkTub);
    const hvCable = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, bayW * 0.62, 10), mats.accent);
    hvCable.rotation.z = Math.PI / 2;
    hvCable.position.set(0, 0.03, -bayL * 0.25);
    engine.add(hvCable);
    return engine;
  }

  // Sculpted V6/V8 engine block + intake plenum + strut brace + radiator
  const block = new THREE.Mesh(
    createRoundedBoxGeo(bayW * 0.44, 0.22, bayL * 0.56, 0.04, 3, 10),
    mats.alloy,
  );
  block.position.set(0, -0.04, 0);
  engine.add(block);

  [-1, 1].forEach((s) => {
    const valveCover = new THREE.Mesh(
      createRoundedBoxGeo(bayW * 0.14, 0.07, bayL * 0.52, 0.025, 3, 10),
      mats.accent,
    );
    valveCover.position.set(s * bayW * 0.17, 0.06, 0);
    valveCover.rotation.z = -s * 0.24;
    engine.add(valveCover);
  });

  const plenum = new THREE.Mesh(
    createRoundedBoxGeo(bayW * 0.22, 0.08, bayL * 0.46, 0.03, 3, 10),
    mats.chrome,
  );
  plenum.position.set(0, 0.09, 0);
  engine.add(plenum);

  const strutBar = makeStrutBetween(
    new THREE.Vector3(-bayW * 0.42, 0.08, -bayL * 0.18),
    new THREE.Vector3(bayW * 0.42, 0.08, -bayL * 0.18),
    0.016,
    0.016,
    mats.accent,
    10,
  );
  engine.add(strutBar);

  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(bayW * 0.68, 0.2, 0.05),
    mats.grille,
  );
  radiator.position.set(0, -0.02, bayL * 0.36);
  engine.add(radiator);

  return engine;
}
