import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
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
    afterburners: THREE.Object3D[];
    cranks: THREE.Object3D[];
    pedals: THREE.Object3D[];
    steeringPivots: THREE.Object3D[];
    steeringWheels: THREE.Object3D[];
    headlightBeams: THREE.Object3D[];
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
  steps = 4,
): THREE.BufferGeometry {
  const innerDepth = Math.max(0.03, width - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    steps,
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

export function createSculptedPanelGeo(
  w: number,
  h: number,
  d: number,
  segX = 8,
  segY = 6,
  segZ = 10,
  roundRadius = 0.025,
  sculptFn?: (
    pos: THREE.BufferAttribute,
    idx: number,
    hx: number,
    hy: number,
    hz: number,
  ) => void,
): THREE.BufferGeometry {
  const raw = new THREE.BoxGeometry(w, h, d, segX, segY, segZ);
  raw.deleteAttribute('normal');
  raw.deleteAttribute('uv');
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hx = Math.max(0.005, w * 0.5);
  const hy = Math.max(0.005, h * 0.5);
  const hz = Math.max(0.005, d * 0.5);
  const r = Math.min(roundRadius, hx * 0.48, hy * 0.48, hz * 0.48);
  const ix = Math.max(0.001, hx - r);
  const iy = Math.max(0.001, hy - r);
  const iz = Math.max(0.001, hz - r);

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    if (r > 0.002) {
      const cx = THREE.MathUtils.clamp(x, -ix, ix);
      const cy = THREE.MathUtils.clamp(y, -iy, iy);
      const cz = THREE.MathUtils.clamp(z, -iz, iz);
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      const len = Math.hypot(dx, dy, dz);
      if (len > 1e-6) {
        const s = r / len;
        x = cx + dx * s;
        y = cy + dy * s;
        z = cz + dz * s;
        pos.setXYZ(i, x, y, z);
      }
    }

    if (sculptFn) {
      sculptFn(pos, i, hx, hy, hz);
    }
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export interface SideSculptOptions {
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  sideSign?: -1 | 0 | 1;
  halfWidthAtMid?: number;
  bellyBulge?: number;
  tumblehomeInset?: number;
  rockerTuck?: number;
  creaseBoost?: number;
  noseTailTaper?: number;
  crownDomeY?: number;
}

export function sculptSideVolumeVertices(
  geo: THREE.BufferGeometry,
  opts: SideSculptOptions,
): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ySpan = Math.max(0.05, opts.yMax - opts.yMin);
  const zMid = (opts.zMin + opts.zMax) * 0.5;
  const zHalf = Math.max(0.1, (opts.zMax - opts.zMin) * 0.5);
  const bulge = opts.bellyBulge ?? 0.024;
  const tumble = opts.tumblehomeInset ?? 0.026;
  const rockerTuck = opts.rockerTuck ?? 0.022;
  const crease = opts.creaseBoost ?? 0.010;
  const endTaper = opts.noseTailTaper ?? 0.065;
  const crown = opts.crownDomeY ?? 0;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    const z = pos.getZ(i);

    const tY = THREE.MathUtils.clamp((y - opts.yMin) / ySpan, 0, 1);
    const tZ = THREE.MathUtils.clamp((z - zMid) / zHalf, -1, 1);

    // Determine whether this vertex sits on the outer sculpted skin
    const dirSign = opts.sideSign
      ? x * opts.sideSign > -0.015
        ? opts.sideSign
        : 0
      : Math.abs(x) > 0.05
        ? Math.sign(x)
        : 0;

    if (dirSign !== 0) {
      // Smooth convex door/fender barrel belly + lower rocker tuck + upper beltline character crease + tumblehome lean
      const belly = Math.sin(tY * Math.PI) * bulge;
      const lowerTuck = -Math.pow(1 - tY, 2.2) * rockerTuck;
      const upperLean = -Math.pow(Math.max(0, (tY - 0.52) / 0.48), 1.35) * tumble;
      const shoulderCrease = crease * Math.exp(-Math.pow((tY - 0.80) / 0.10, 2));
      const cornerSweep = -Math.pow(Math.abs(tZ), 2.4) * endTaper;
      x += dirSign * (belly + lowerTuck + upperLean + shoulderCrease + cornerSweep);
    }

    if (crown > 0 && tY > 0.72 && opts.halfWidthAtMid) {
      const nx = THREE.MathUtils.clamp(Math.abs(x) / opts.halfWidthAtMid, 0, 1);
      y += crown * Math.cos(nx * Math.PI * 0.5) * ((tY - 0.72) / 0.28);
    }

    pos.setXYZ(i, x, y, z);
  }

  pos.needsUpdate = true;
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

const _beamX = new THREE.Vector3();
const _beamY = new THREE.Vector3();
const _beamZ = new THREE.Vector3();
const _beamMat4 = new THREE.Matrix4();

export function makeBeamBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  width: number,
  depth: number,
  mat: THREE.Material,
  outwardHint?: THREE.Vector3,
  bevelRadius = 0.008,
): THREE.Mesh {
  _beamY.subVectors(p2, p1);
  const len = Math.max(0.01, _beamY.length());
  _beamY.normalize();

  if (outwardHint && outwardHint.lengthSq() > 1e-6) {
    _beamZ.copy(outwardHint).normalize();
  } else {
    _beamZ.set(0, 0, 1);
  }
  if (Math.abs(_beamY.dot(_beamZ)) > 0.96) {
    _beamZ.set(1, 0, 0);
  }
  _beamX.crossVectors(_beamY, _beamZ).normalize();
  _beamZ.crossVectors(_beamX, _beamY).normalize();

  const geo = createRoundedBoxGeo(width, len, depth, Math.min(bevelRadius, width * 0.3, depth * 0.3), 2, 6);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
  _beamMat4.makeBasis(_beamX, _beamY, _beamZ);
  mesh.quaternion.setFromRotationMatrix(_beamMat4);
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
    createRoundedBoxGeo(0.028, 0.048, 0.072, 0.01, cityMode ? 2 : 3, seg),
    mats.trim,
  );
  mirrorGroup.add(baseMount);

  const stalk = makeBeamBetween(
    new THREE.Vector3(0, 0.005, 0),
    new THREE.Vector3(side * 0.088, 0.032, -0.012),
    0.022,
    0.036,
    mats.trim,
    new THREE.Vector3(0, 1, 0),
    0.006,
  );
  mirrorGroup.add(stalk);

  const housing = new THREE.Mesh(
    createRoundedBoxGeo(0.128, 0.064, 0.082, 0.024, cityMode ? 2 : 4, seg),
    mats.body,
  );
  housing.position.set(side * 0.118, 0.036, -0.012);
  housing.rotation.y = -side * 0.14;
  mirrorGroup.add(housing);

  const mirrorFace = new THREE.Mesh(
    createRoundedBoxGeo(0.112, 0.052, 0.012, 0.016, 2, seg),
    mats.mirrorGlass,
  );
  mirrorFace.position.set(side * 0.118, 0.036, -0.052);
  mirrorFace.rotation.y = -side * 0.14;
  mirrorGroup.add(mirrorFace);

  const sigStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.078, 0.009, 0.012),
    side < 0 ? mats.signalLeft : mats.signalRight,
  );
  sigStrip.position.set(side * 0.122, 0.034, 0.028);
  sigStrip.rotation.y = -side * 0.14;
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

let cachedBeamGeo: THREE.BufferGeometry | null = null;
let cachedBeamMat: THREE.MeshBasicMaterial | null = null;

function getSoftBeamTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0.0, 'rgba(255, 246, 210, 0.65)');
  grad.addColorStop(0.28, 'rgba(255, 246, 210, 0.24)');
  grad.addColorStop(0.68, 'rgba(255, 246, 210, 0.06)');
  grad.addColorStop(1.0, 'rgba(255, 246, 210, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createHeadlightBeamMesh(
  length = 3.8,
  endRadius = 0.62,
  downPitch = 0.09,
): THREE.Mesh {
  if (!cachedBeamGeo) {
    const geo = new THREE.ConeGeometry(1, 1, 14, 1, true);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 0.5);
    cachedBeamGeo = geo;
  }
  if (!cachedBeamMat) {
    const beamTex = getSoftBeamTexture();
    cachedBeamMat = new THREE.MeshBasicMaterial({
      color: 0xfff5cc,
      map: beamTex ?? undefined,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }
  const mesh = new THREE.Mesh(cachedBeamGeo, cachedBeamMat);
  mesh.scale.set(endRadius, endRadius * 0.68, length);
  mesh.rotation.x = downPitch;
  mesh.userData.sharedGeometry = true;
  mesh.userData.noShadow = true;
  mesh.renderOrder = 3;
  return mesh;
}

export function createBeveledHeadlightFrameGeo(
  w: number,
  h: number,
  depth = 0.044,
  frameThick = 0.016,
  bevelSize = 0.009,
  cornerR = 0.02,
  curveSegs = 8,
  bevelSegs = 3,
): THREE.BufferGeometry {
  const bXY = Math.min(bevelSize, frameThick * 0.42, w * 0.12, h * 0.12);
  const bZ = Math.min(bXY, depth * 0.36);
  const ow = Math.max(0.03, w - bXY * 2);
  const oh = Math.max(0.03, h - bXY * 2);
  const or = Math.min(cornerR, ow * 0.44, oh * 0.44);
  const outer = createRoundedRectShape(ow, oh, or);

  const iw = Math.max(0.016, w - frameThick * 2 + bXY * 2);
  const ih = Math.max(0.016, h - frameThick * 2 + bXY * 2);
  if (iw < ow - 0.008 && ih < oh - 0.008) {
    const ir = Math.min(or * 0.72, iw * 0.42, ih * 0.42);
    const hhw = iw * 0.5;
    const hhh = ih * 0.5;
    const hole = new THREE.Path();
    hole.moveTo(-hhw + ir, -hhh);
    hole.quadraticCurveTo(-hhw, -hhh, -hhw, -hhh + ir);
    hole.lineTo(-hhw, hhh - ir);
    hole.quadraticCurveTo(-hhw, hhh, -hhw + ir, hhh);
    hole.lineTo(hhw - ir, hhh);
    hole.quadraticCurveTo(hhw, hhh, hhw, hhh - ir);
    hole.lineTo(hhw, -hhh + ir);
    hole.quadraticCurveTo(hhw, -hhh, hhw - ir, -hhh);
    hole.closePath();
    outer.holes.push(hole);
  }

  const innerD = Math.max(0.008, depth - bZ * 2);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: innerD,
    bevelEnabled: bXY > 0.001,
    bevelThickness: bZ,
    bevelSize: bXY,
    bevelSegments: bevelSegs,
    curveSegments: curveSegs,
  });
  geo.translate(0, 0, -innerD * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function createBeveledRoundBezelGeo(
  outerR: number,
  innerR: number,
  depth = 0.036,
  bevelSize = 0.008,
  segs = 18,
): THREE.BufferGeometry {
  const b = Math.min(bevelSize, (outerR - innerR) * 0.38, depth * 0.35);
  const shape = new THREE.Shape();
  shape.absarc(0, 0, Math.max(0.01, outerR - b), 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.max(0.006, innerR + b), 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const innerD = Math.max(0.008, depth - b * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerD,
    bevelEnabled: b > 0.001,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: segs,
  });
  geo.translate(0, 0, -innerD * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function createHeadlightLensGeo(
  w: number,
  h: number,
  bow = 0.014,
  segX = 8,
  segY = 6,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = Math.max(0.01, w * 0.5);
  const hh = Math.max(0.01, h * 0.5);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = Math.abs(x) / hw;
    const ny = Math.abs(y) / hh;
    const dome = bow * Math.cos(nx * Math.PI * 0.48) * Math.cos(ny * Math.PI * 0.48);
    const cornerTuck = -0.005 * Math.pow(nx * ny, 1.5);
    pos.setZ(i, dome + cornerTuck);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export interface BeveledHeadlightOptions {
  width: number;
  height: number;
  depth?: number;
  style?: 'twin_projector' | 'quad_pods' | 'bar' | 'truck_pod';
  side?: -1 | 0 | 1;
  signalMat?: THREE.Material;
  frameMat?: THREE.Material;
}

export function createBeveledHeadlightAssembly(
  opts: BeveledHeadlightOptions,
  mats: VehicleMaterialSet,
  cityMode = false,
): THREE.Group {
  const w = opts.width;
  const h = opts.height;
  const d = opts.depth ?? 0.05;
  const side = opts.side ?? 1;
  const sideSign = side === 0 ? 1 : side;
  const style = opts.style ?? 'twin_projector';
  const frameThick = THREE.MathUtils.clamp(Math.min(w, h) * 0.14, 0.010, 0.022);
  const bevelSize = frameThick * 0.52;
  const cornerR = Math.min(w, h) * 0.22;

  const grp = new THREE.Group();

  // 1. Dark sealed housing base + chrome parabolic inner reflector backing
  const housing = new THREE.Mesh(
    createRoundedBoxGeo(w * 0.96, h * 0.96, d * 0.72, cornerR * 0.85, cityMode ? 1 : 2, cityMode ? 6 : 8),
    mats.grille,
  );
  housing.position.z = -d * 0.16;
  grp.add(housing);

  const innerW = Math.max(0.02, w - frameThick * 2.1);
  const innerH = Math.max(0.02, h - frameThick * 2.1);
  const reflector = new THREE.Mesh(
    createRoundedBoxGeo(innerW * 0.96, innerH * 0.94, 0.012, cornerR * 0.5, 1, 6),
    mats.chrome,
  );
  reflector.position.z = -d * 0.04;
  grp.add(reflector);

  // 2. Beveled outer frame molding (moldura chanfrada com bevel)
  const bezel = new THREE.Mesh(
    createBeveledHeadlightFrameGeo(
      w,
      h,
      d * 0.86,
      frameThick,
      bevelSize,
      cornerR,
      cityMode ? 6 : 10,
      cityMode ? 2 : 3,
    ),
    opts.frameMat ?? mats.trim,
  );
  bezel.position.z = d * 0.04;
  grp.add(bezel);

  // 3. Recessed internal emitters (projectors / quad rounds / LED bar / truck block + DRL + signal)
  if (style === 'quad_pods') {
    [-0.24, 0.24].forEach((lx) => {
      const podR = Math.min(innerH * 0.38, innerW * 0.20);
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(podR, podR * 0.88, 0.022, cityMode ? 10 : 16).rotateX(Math.PI / 2),
        mats.chrome,
      );
      shroud.position.set(lx * innerW, innerH * 0.08, d * 0.02);
      const bulb = new THREE.Mesh(
        new THREE.CylinderGeometry(podR * 0.72, podR * 0.72, 0.026, cityMode ? 10 : 14).rotateX(Math.PI / 2),
        mats.headlight,
      );
      bulb.position.set(lx * innerW, innerH * 0.08, d * 0.04);
      grp.add(shroud, bulb);
    });
    if (opts.signalMat) {
      const amber = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.44, Math.max(0.012, innerH * 0.18), 0.02, 0.005, 1, 6),
        opts.signalMat,
      );
      amber.position.set(sideSign * (innerW * 0.22), -innerH * 0.34, d * 0.05);
      grp.add(amber);
    }
  } else if (style === 'bar') {
    const ledStrip = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.90, innerH * 0.62, 0.022, Math.min(innerH * 0.2, 0.008), 1, 6),
      mats.headlight,
    );
    ledStrip.position.set(0, 0, d * 0.03);
    grp.add(ledStrip);
    if (!cityMode) {
      const podCount = 4;
      for (let p = 0; p < podCount; p++) {
        const px = -innerW * 0.32 + (p / (podCount - 1)) * (innerW * 0.64);
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(innerW * 0.14, innerH * 0.48, 0.026),
          mats.headlight,
        );
        cube.position.set(px, 0, d * 0.05);
        grp.add(cube);
      }
    }
  } else if (style === 'truck_pod') {
    const mainLamp = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.90, innerH * 0.56, 0.024, 0.012, 2, 8),
      mats.headlight,
    );
    mainLamp.position.set(0, innerH * 0.14, d * 0.04);
    grp.add(mainLamp);
    if (opts.signalMat) {
      const turnBar = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.90, innerH * 0.24, 0.024, 0.008, 1, 6),
        opts.signalMat,
      );
      turnBar.position.set(0, -innerH * 0.30, d * 0.04);
      grp.add(turnBar);
    }
  } else {
    [-0.18, 0.16].forEach((lx) => {
      const podR = Math.min(innerH * 0.34, innerW * 0.18);
      const shroud = new THREE.Mesh(
        new THREE.CylinderGeometry(podR, podR * 0.85, 0.022, cityMode ? 10 : 14).rotateX(Math.PI / 2),
        mats.chrome,
      );
      shroud.position.set(lx * innerW, innerH * 0.08, d * 0.02);
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(podR * 0.70, podR * 0.70, 0.026, cityMode ? 10 : 14).rotateX(Math.PI / 2),
        mats.headlight,
      );
      pod.position.set(lx * innerW, innerH * 0.08, d * 0.04);
      grp.add(shroud, pod);
    });
    const drl = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.92, Math.max(0.012, innerH * 0.18), 0.02, 0.005, 1, 6),
      mats.headlight,
    );
    drl.position.set(0, -innerH * 0.32, d * 0.05);
    grp.add(drl);
    if (opts.signalMat) {
      const amber = new THREE.Mesh(
        createRoundedBoxGeo(Math.max(0.024, innerW * 0.14), innerH * 0.56, 0.02, 0.005, 1, 6),
        opts.signalMat,
      );
      amber.position.set(sideSign * (innerW * 0.42), innerH * 0.06, d * 0.04);
      grp.add(amber);
    }
  }

  // 4. Translucent curved polycarbonate outer cover lens (lente translúcida)
  const lens = new THREE.Mesh(
    createHeadlightLensGeo(
      innerW * 1.03,
      innerH * 1.03,
      Math.min(0.018, d * 0.32),
      cityMode ? 4 : 8,
      cityMode ? 3 : 6,
    ),
    mats.headlightLens,
  );
  lens.position.z = d * 0.36;
  lens.userData.noShadow = true;
  lens.renderOrder = 3;
  grp.add(lens);

  return grp;
}

export function createBeveledRoundHeadlightUnit(
  radius: number,
  depth = 0.10,
  mats: VehicleMaterialSet,
  frameMat?: THREE.Material,
  cityMode = false,
): THREE.Group {
  const seg = cityMode ? 12 : 20;
  const grp = new THREE.Group();

  // Rear bucket shell
  const bucket = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.96, radius * 0.78, depth, seg).rotateX(Math.PI / 2),
    frameMat ?? mats.chrome,
  );
  bucket.position.z = -depth * 0.35;
  grp.add(bucket);

  // Front chamfered/beveled ring bezel (moldura chanfrada circular)
  const bezel = new THREE.Mesh(
    createBeveledRoundBezelGeo(radius * 1.05, radius * 0.84, 0.032, 0.008, seg),
    frameMat ?? mats.chrome,
  );
  bezel.position.z = depth * 0.14;
  grp.add(bezel);

  // Inner parabolic chrome reflector + glowing projector core
  const reflector = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.84, radius * 0.62, 0.028, seg).rotateX(Math.PI / 2),
    mats.chrome,
  );
  reflector.position.z = depth * 0.04;
  const emitter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.56, 0.026, seg).rotateX(Math.PI / 2),
    mats.headlight,
  );
  emitter.position.z = depth * 0.09;
  grp.add(reflector, emitter);

  // Domed translucent clear glass cover lens (lente translúcida abaulada)
  const domeGeo = new THREE.SphereGeometry(radius * 0.92, seg, cityMode ? 6 : 10, 0, Math.PI * 2, 0, Math.PI * 0.34);
  domeGeo.rotateX(Math.PI / 2);
  domeGeo.scale(1, 1, 0.45);
  const lens = new THREE.Mesh(domeGeo, mats.headlightLens);
  lens.position.z = depth * 0.04;
  lens.userData.noShadow = true;
  lens.renderOrder = 3;
  grp.add(lens);

  return grp;
}

export interface LicensePlateOptions {
  variant?: 'car' | 'moto';
  isRear?: boolean;
  width?: number;
  height?: number;
  withLightHood?: boolean;
}

export function createLicensePlateGroup(
  opts: LicensePlateOptions,
  mats: VehicleMaterialSet,
  cityMode = false,
): THREE.Group {
  const variant = opts.variant ?? 'car';
  const w = opts.width ?? (variant === 'moto' ? 0.21 : 0.43);
  const h = opts.height ?? (variant === 'moto' ? 0.145 : 0.115);

  const grp = new THREE.Group();

  // Beveled dark frame holder
  const holder = new THREE.Mesh(
    createRoundedBoxGeo(w + 0.024, h + 0.022, 0.016, 0.007, cityMode ? 1 : 2, 6),
    mats.trim,
  );
  grp.add(holder);

  if (!cityMode) {
    const innerRim = new THREE.Mesh(
      createRoundedBoxGeo(w + 0.010, h + 0.008, 0.018, 0.005, 1, 6),
      mats.chrome,
    );
    grp.add(innerRim);
  }

  // Mercosul plate face
  const plateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    variant === 'moto' ? mats.motoPlate : mats.licensePlate,
  );
  plateFace.position.z = 0.0105;
  grp.add(plateFace);

  if (opts.withLightHood !== false && !cityMode) {
    const hood = new THREE.Mesh(
      createRoundedBoxGeo(w * 0.36, 0.012, 0.020, 0.004, 1, 4),
      mats.trim,
    );
    hood.position.set(0, h * 0.5 + 0.009, 0.008);
    grp.add(hood);
  }

  if (opts.isRear) {
    grp.rotation.y = Math.PI;
  }

  return grp;
}
