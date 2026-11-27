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

function toUnityNodeName(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function tagPart(
  obj: THREE.Object3D,
  label: string,
  explodeX = 0,
  explodeY = 0,
  explodeZ = 0,
): THREE.Object3D {
  if (!obj.name) {
    obj.name = toUnityNodeName(label);
  }
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
  if (!pivot.name) {
    pivot.name = toUnityNodeName(label);
  }
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

const _geoCache = new Map<string, THREE.BufferGeometry>();
const MAX_GEO_CACHE = 450;

function getOrBuildCachedGeo(key: string, build: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let cached = _geoCache.get(key);
  if (!cached) {
    cached = build();
    if (_geoCache.size >= MAX_GEO_CACHE) {
      const oldestKey = _geoCache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldGeo = _geoCache.get(oldestKey);
        _geoCache.delete(oldestKey);
        oldGeo?.dispose();
      }
    }
    _geoCache.set(key, cached);
  }
  return cached.clone();
}

function qMm(n: number): number {
  return Math.round(n * 2000);
}

export function createRoundedBoxGeo(
  w: number,
  h: number,
  d: number,
  radius = 0.04,
  bevelSegs = 4,
  curveSegs = 12,
): THREE.BufferGeometry {
  const key = `rb|${qMm(w)}|${qMm(h)}|${qMm(d)}|${qMm(radius)}|${bevelSegs}|${curveSegs}`;
  return getOrBuildCachedGeo(key, () => {
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
  });
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
  const s = side >= 0 ? 1 : -1;
  const seg = cityMode ? 6 : 12;

  // Triangular door-shoulder sail mount + satin-black aerodynamic neck stalk
  const baseMount = new THREE.Mesh(
    createRoundedBoxGeo(0.026, 0.056, 0.088, 0.010, cityMode ? 1 : 2, seg),
    mats.windowTrim,
  );
  baseMount.rotation.x = 0.14;
  mirrorGroup.add(baseMount);

  const stalk = makeBeamBetween(
    new THREE.Vector3(0, 0.008, 0.004),
    new THREE.Vector3(s * 0.092, 0.036, -0.012),
    0.020,
    0.042,
    mats.windowTrim,
    new THREE.Vector3(0, 1, 0),
    0.006,
  );
  mirrorGroup.add(stalk);

  // Swept sculpted teardrop mirror cap (tapers outboard and curves smoothly toward +Z nose)
  const capGeo = createSculptedPanelGeo(
    0.148,
    0.068,
    0.088,
    cityMode ? 4 : 8,
    cityMode ? 3 : 6,
    cityMode ? 4 : 8,
    0.024,
    (pos, idx, hx, hy, hz) => {
      const px = pos.getX(idx);
      const py = pos.getY(idx);
      const pz = pos.getZ(idx);
      const tOut = THREE.MathUtils.clamp((px * s + hx) / (hx * 2), 0, 1);
      const ny = py / Math.max(0.01, hy);
      // Taper height & thickness cleanly toward wingtip + sweep leading edge backward
      const yScale = THREE.MathUtils.lerp(1.0, 0.72, Math.pow(tOut, 1.5));
      const zSweep = -0.024 * Math.pow(tOut, 1.45);
      const aeroCrown = pz > 0 ? 0.010 * Math.cos(ny * Math.PI * 0.5) * (1 - tOut * 0.4) : 0;
      const tipDrop = -0.008 * Math.pow(tOut, 1.8);
      pos.setXYZ(idx, px, py * yScale + tipDrop, pz + zSweep + aeroCrown);
    },
  );
  const housing = new THREE.Mesh(capGeo, mats.body);
  housing.position.set(s * 0.128, 0.042, -0.010);
  housing.rotation.y = -s * 0.16;
  mirrorGroup.add(housing);

  // Satin-black lower aerodynamic chin bezel under painted cap
  const lowerTrim = new THREE.Mesh(
    createRoundedBoxGeo(0.132, 0.020, 0.072, 0.008, cityMode ? 1 : 2, seg),
    mats.windowTrim,
  );
  lowerTrim.position.set(s * 0.124, 0.014, -0.014);
  lowerTrim.rotation.y = -s * 0.16;
  mirrorGroup.add(lowerTrim);

  // Recessed mirror housing collar & reflective glass
  const mirrorCollar = new THREE.Mesh(
    createRoundedBoxGeo(0.126, 0.056, 0.014, 0.014, 1, seg),
    mats.windowTrim,
  );
  mirrorCollar.position.set(s * 0.128, 0.039, -0.052);
  mirrorCollar.rotation.y = -s * 0.16;
  mirrorGroup.add(mirrorCollar);

  const mirrorFace = new THREE.Mesh(
    createRoundedBoxGeo(0.114, 0.046, 0.008, 0.012, 1, seg),
    mats.mirrorGlass,
  );
  mirrorFace.position.set(s * 0.128, 0.039, -0.057);
  mirrorFace.rotation.y = -s * 0.16;
  mirrorGroup.add(mirrorFace);

  // Slim wrap-around LED side turn-signal blade along leading edge
  const sigStrip = new THREE.Mesh(
    createRoundedBoxGeo(0.092, 0.008, 0.014, 0.003, 1, 6),
    s < 0 ? mats.signalLeft : mats.signalRight,
  );
  sigStrip.position.set(s * 0.132, 0.034, 0.032);
  sigStrip.rotation.y = -s * 0.18;
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

function getTrapezoidLampYBounds(
  x: number,
  hw: number,
  hh: number,
  side: -1 | 0 | 1,
  isTail: boolean,
): { yTop: number; yBot: number } {
  if (side === 0) {
    return { yTop: hh, yBot: -hh };
  }
  const nx = THREE.MathUtils.clamp((x * side) / Math.max(0.01, hw), -1, 1);
  // t = 0 at inner edge (near grille/center), t = 1 at outer fender edge
  const t = (nx + 1) * 0.5;
  if (!isTail) {
    // Aggressive swept-back wedge headlamp: narrower inner eye, upswept outer wing
    const yTop = hh * THREE.MathUtils.lerp(0.68, 1.04, Math.pow(t, 0.88));
    const yBot = -hh * THREE.MathUtils.lerp(0.96, 0.58, Math.pow(t, 1.15));
    return { yTop, yBot };
  }
  // Sculpted wrap-around taillight: sleeker inner blade, broader outer shoulder
  const yTop = hh * THREE.MathUtils.lerp(0.76, 1.04, Math.pow(t, 0.85));
  const yBot = -hh * THREE.MathUtils.lerp(0.82, 0.98, Math.pow(t, 1.0));
  return { yTop, yBot };
}

function buildTrapezoidalContourPoints(
  w: number,
  h: number,
  cornerR: number,
  side: -1 | 0 | 1,
  isTail: boolean,
  inset = 0,
): { x: number; y: number }[] {
  const hw = Math.max(0.014, w * 0.5 - inset);
  const hh = Math.max(0.014, h * 0.5 - inset);
  const left = getTrapezoidLampYBounds(-hw, hw, hh, side, isTail);
  const right = getTrapezoidLampYBounds(hw, hw, hh, side, isTail);

  const corners: [number, number][] = [
    [-hw, left.yBot],
    [hw, right.yBot],
    [hw, right.yTop],
    [-hw, left.yTop],
  ];

  const r = Math.min(cornerR, hw * 0.42, hh * 0.42);
  const pts: { x: number; y: number }[] = [];
  const arcSteps = 4;

  for (let i = 0; i < 4; i++) {
    const prev = corners[(i + 3) % 4];
    const curr = corners[i];
    const next = corners[(i + 1) % 4];

    const v1x = prev[0] - curr[0];
    const v1y = prev[1] - curr[1];
    const len1 = Math.hypot(v1x, v1y) || 1;
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];
    const len2 = Math.hypot(v2x, v2y) || 1;

    const rr = Math.min(r, len1 * 0.36, len2 * 0.36);
    const pStartX = curr[0] + (v1x / len1) * rr;
    const pStartY = curr[1] + (v1y / len1) * rr;
    const pEndX = curr[0] + (v2x / len2) * rr;
    const pEndY = curr[1] + (v2y / len2) * rr;

    for (let s = 0; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      pts.push({
        x: omt * omt * pStartX + 2 * omt * t * curr[0] + t * t * pEndX,
        y: omt * omt * pStartY + 2 * omt * t * curr[1] + t * t * pEndY,
      });
    }
  }
  return pts;
}

function createTrapezoidalLampGeo(
  w: number,
  h: number,
  depth: number,
  cornerR: number,
  side: -1 | 0 | 1,
  isTail: boolean,
  bevelSegs = 2,
  curveSegs = 10,
): THREE.BufferGeometry {
  const key = `tl|${qMm(w)}|${qMm(h)}|${qMm(depth)}|${qMm(cornerR)}|${side}|${isTail ? 1 : 0}|${bevelSegs}|${curveSegs}`;
  return getOrBuildCachedGeo(key, () => {
    const b = Math.min(depth * 0.30, w * 0.08, h * 0.12);
    const pts = buildTrapezoidalContourPoints(w - b * 2, h - b * 2, cornerR, side, isTail, 0);
    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i].x, pts[i].y);
    }
    shape.closePath();

    const innerD = Math.max(0.006, depth - b * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: innerD,
      bevelEnabled: b > 0.001,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: bevelSegs,
      curveSegments: curveSegs,
    });
    geo.translate(0, 0, -innerD * 0.5);
    geo.computeVertexNormals();
    return geo;
  });
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
  side: -1 | 0 | 1 = 0,
  isTail = false,
): THREE.BufferGeometry {
  const key = `hf|${qMm(w)}|${qMm(h)}|${qMm(depth)}|${qMm(frameThick)}|${qMm(bevelSize)}|${qMm(cornerR)}|${curveSegs}|${bevelSegs}|${side}|${isTail ? 1 : 0}`;
  return getOrBuildCachedGeo(key, () => {
    const bXY = Math.min(bevelSize, frameThick * 0.42, w * 0.12, h * 0.12);
    const bZ = Math.min(bXY, depth * 0.36);
    const ow = Math.max(0.03, w - bXY * 2);
    const oh = Math.max(0.03, h - bXY * 2);
    const or = Math.min(cornerR, ow * 0.44, oh * 0.44);

    const outerPts = buildTrapezoidalContourPoints(ow, oh, or, side, isTail, 0);
    const outer = new THREE.Shape();
    outer.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) {
      outer.lineTo(outerPts[i].x, outerPts[i].y);
    }
    outer.closePath();

    const iw = Math.max(0.016, w - frameThick * 2 + bXY * 2);
    const ih = Math.max(0.016, h - frameThick * 2 + bXY * 2);
    if (iw < ow - 0.008 && ih < oh - 0.008) {
      const ir = Math.min(or * 0.72, iw * 0.42, ih * 0.42);
      const holePts = buildTrapezoidalContourPoints(iw, ih, ir, side, isTail, 0);
      const hole = new THREE.Path();
      hole.moveTo(holePts[0].x, holePts[0].y);
      for (let i = holePts.length - 1; i >= 0; i--) {
        hole.lineTo(holePts[i].x, holePts[i].y);
      }
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
  });
}

export function createBeveledRoundBezelGeo(
  outerR: number,
  innerR: number,
  depth = 0.036,
  bevelSize = 0.008,
  segs = 18,
): THREE.BufferGeometry {
  const key = `rbz|${qMm(outerR)}|${qMm(innerR)}|${qMm(depth)}|${qMm(bevelSize)}|${segs}`;
  return getOrBuildCachedGeo(key, () => {
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
  });
}

function computeFasciaSweepZ(
  x: number,
  hw: number,
  side: -1 | 0 | 1,
  sweepZ: number,
): number {
  if (sweepZ <= 0.0001) return 0;
  const nx = THREE.MathUtils.clamp(x / Math.max(0.01, hw), -1, 1);
  if (side === 0) {
    return -sweepZ * Math.pow(Math.abs(nx), 1.85);
  }
  const tOut = THREE.MathUtils.clamp((nx * side + 1) * 0.5, 0, 1);
  return -sweepZ * Math.pow(tOut, 1.75) - sweepZ * 0.14 * Math.pow(1 - tOut, 2.0);
}

function applyFasciaSweep(
  geo: THREE.BufferGeometry,
  hw: number,
  side: -1 | 0 | 1,
  sweepZ: number,
  rearFacing = false,
): THREE.BufferGeometry {
  if (sweepZ <= 0.0001) return geo;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const dir = rearFacing ? -1 : 1;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const dz = computeFasciaSweepZ(x, hw, side, sweepZ);
    pos.setZ(i, pos.getZ(i) + dz * dir);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function createHeadlightLensGeo(
  w: number,
  h: number,
  bow = 0.014,
  segX = 16,
  segY = 10,
  side: -1 | 0 | 1 = 0,
  sweepZ = 0,
  rearFacing = false,
  isTail = false,
): THREE.BufferGeometry {
  const key = `hl|${qMm(w)}|${qMm(h)}|${qMm(bow)}|${segX}|${segY}|${side}|${qMm(sweepZ)}|${rearFacing ? 1 : 0}|${isTail ? 1 : 0}`;
  return getOrBuildCachedGeo(key, () => {
    const geo = new THREE.PlaneGeometry(w, h, segX, segY);
    if (rearFacing) {
      geo.rotateY(Math.PI);
    }
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const hw = Math.max(0.01, w * 0.5);
    const hh = Math.max(0.01, h * 0.5);
    const dir = rearFacing ? -1 : 1;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const yRaw = pos.getY(i);
      const nySigned = THREE.MathUtils.clamp(yRaw / hh, -1, 1);
      const nx = Math.min(1, Math.abs(x) / hw);
      const ny = Math.abs(nySigned);

      // Conform Y bounds cleanly to the trapezoidal housing silhouette + rounded corner tuck
      const bounds = getTrapezoidLampYBounds(x, hw, hh, side, isTail);
      const yMid = (bounds.yTop + bounds.yBot) * 0.5;
      const yHalf = Math.max(0.008, (bounds.yTop - bounds.yBot) * 0.5);
      const cornerSoft = 1 - 0.14 * Math.pow(nx, 3.2) * Math.pow(ny, 2.2);
      const y = yMid + nySigned * yHalf * cornerSoft;
      pos.setY(i, y);

      const dome = bow * Math.cos(nx * Math.PI * 0.44) * Math.cos(ny * Math.PI * 0.46);
      const sweep = computeFasciaSweepZ(x, hw, side, sweepZ);
      const cornerTuck = -0.005 * Math.pow(ny, 1.55) - 0.004 * Math.pow(nx, 2.4);
      pos.setZ(i, (dome + sweep + cornerTuck) * dir);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  });
}

export interface BeveledHeadlightOptions {
  width: number;
  height: number;
  depth?: number;
  sweepZ?: number;
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
  const d = opts.depth ?? 0.068;
  const side = opts.side ?? 1;
  const sideSign: -1 | 1 = side === 0 ? 1 : side;
  const style = opts.style ?? 'twin_projector';
  const useTrap = style !== 'bar' && side !== 0;
  const trapSide: -1 | 0 | 1 = useTrap ? side : 0;
  const sweepZ = opts.sweepZ ?? (side === 0 ? Math.min(0.014, w * 0.06) : Math.min(0.044, w * 0.17));
  const frameThick = THREE.MathUtils.clamp(Math.min(w, h) * 0.115, 0.008, 0.018);
  const bevelSize = frameThick * 0.52;
  const cornerR = Math.min(w, h) * 0.20;
  const hw = Math.max(0.01, w * 0.5);

  const grp = new THREE.Group();

  // LAYER 1: Recessed trapezoidal cavity + satin black optical mask + chrome divider ribs
  const cavityGeo = createTrapezoidalLampGeo(
    w * 0.96,
    h * 0.96,
    d * 0.70,
    cornerR * 0.85,
    trapSide,
    false,
    cityMode ? 1 : 2,
    cityMode ? 6 : 10,
  );
  applyFasciaSweep(cavityGeo, hw, side, sweepZ, false);
  const housing = new THREE.Mesh(cavityGeo, mats.grille);
  housing.position.z = -d * 0.18;
  grp.add(housing);

  const innerW = Math.max(0.02, w - frameThick * 2.05);
  const innerH = Math.max(0.02, h - frameThick * 2.05);

  const maskGeo = createTrapezoidalLampGeo(
    innerW * 0.96,
    innerH * 0.92,
    0.014,
    cornerR * 0.55,
    trapSide,
    false,
    1,
    8,
  );
  applyFasciaSweep(maskGeo, hw, side, sweepZ, false);
  const blackMask = new THREE.Mesh(maskGeo, mats.trim);
  blackMask.position.z = -d * 0.08;
  grp.add(blackMask);

  if (!cityMode) {
    // Angled satin-chrome optical eyebrow fin separating upper DRL & main projector bay
    const chromeFinGeo = createRoundedBoxGeo(innerW * 0.84, Math.max(0.006, innerH * 0.085), 0.018, 0.003, 1, 6);
    applyFasciaSweep(chromeFinGeo, hw, side, sweepZ, false);
    const chromeFin = new THREE.Mesh(chromeFinGeo, mats.chrome);
    chromeFin.position.set(0, innerH * 0.30, -d * 0.01);
    if (useTrap) chromeFin.rotation.z = sideSign * 0.08;
    grp.add(chromeFin);

    // 3 micro-reflector louver fins on outer fender corner
    if (useTrap) {
      for (let f = 0; f < 3; f++) {
        const fx = sideSign * (innerW * (0.31 + f * 0.048));
        const fy = innerH * (0.14 - f * 0.08);
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.004, innerW * 0.022), innerH * 0.24, 0.014),
          mats.chrome,
        );
        fin.position.set(fx, fy, d * 0.02 + computeFasciaSweepZ(fx, hw, side, sweepZ));
        fin.rotation.z = sideSign * 0.22;
        grp.add(fin);
      }
    }
  }

  // Sculpted beveled outer frame bezel
  const bezelGeo = createBeveledHeadlightFrameGeo(
    w,
    h,
    d * 0.84,
    frameThick,
    bevelSize,
    cornerR,
    cityMode ? 6 : 12,
    cityMode ? 2 : 3,
    trapSide,
    false,
  );
  applyFasciaSweep(bezelGeo, hw, side, sweepZ, false);
  const bezel = new THREE.Mesh(bezelGeo, opts.frameMat ?? mats.trim);
  bezel.position.z = d * 0.04;
  grp.add(bezel);

  // LAYER 2: Multi-element optical projectors, halo rings, dual LED DRL & sequential amber turn signals
  const addCircularProjector = (px: number, py: number, podR: number, isMain = true) => {
    const zCurve = computeFasciaSweepZ(px, hw, side, sweepZ);
    const projGrp = new THREE.Group();
    projGrp.position.set(px, py, d * 0.06 + zCurve);
    if (side !== 0) {
      projGrp.rotation.y = side * 0.09;
    }

    const segs = cityMode ? 12 : 22;
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(podR, podR * 0.78, 0.026, segs).rotateX(Math.PI / 2),
      mats.chrome,
    );
    shroud.position.z = -0.002;
    projGrp.add(shroud);

    const innerCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(podR * 0.76, podR * 0.65, 0.028, segs).rotateX(Math.PI / 2),
      mats.grille,
    );
    innerCollar.position.z = 0.002;
    projGrp.add(innerCollar);

    const domeGeo = new THREE.SphereGeometry(podR * 0.62, segs, cityMode ? 6 : 10, 0, Math.PI * 2, 0, Math.PI * 0.48);
    domeGeo.rotateX(Math.PI / 2);
    domeGeo.scale(1, 1, 0.58);
    const projectorCore = new THREE.Mesh(domeGeo, mats.headlight);
    projectorCore.position.z = 0.011;
    projGrp.add(projectorCore);

    if (!cityMode) {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(podR * 0.85, Math.max(0.0028, podR * (isMain ? 0.095 : 0.075)), 8, 22),
        mats.drlLed,
      );
      halo.position.z = 0.014;
      projGrp.add(halo);
    }

    grp.add(projGrp);
  };

  const addSequentialTurnBlades = (baseX: number, baseY: number, dirSign: -1 | 1, bladeW: number, bladeH: number) => {
    if (!opts.signalMat) return;
    const count = cityMode ? 1 : 4;
    for (let b = 0; b < count; b++) {
      const t = count === 1 ? 0 : (b - (count - 1) * 0.5) / count;
      const bx = baseX + dirSign * t * bladeW * 1.15;
      const by = baseY + t * bladeH * 0.25;
      const blade = new THREE.Mesh(
        createRoundedBoxGeo(
          Math.max(0.007, (bladeW / count) * 0.74),
          bladeH,
          0.016,
          0.0025,
          1,
          4,
        ),
        opts.signalMat,
      );
      blade.position.set(bx, by, d * 0.14 + computeFasciaSweepZ(bx, hw, side, sweepZ));
      blade.rotation.z = dirSign * 0.20;
      grp.add(blade);
    }
  };

  if (style === 'quad_pods') {
    const podR = Math.min(innerH * 0.34, innerW * 0.175);
    [-0.22, 0.18].forEach((lx, idx) => {
      const px = (side === 0 ? lx : lx * sideSign) * innerW;
      addCircularProjector(px, innerH * (idx === 0 ? 0.05 : 0.10), podR, idx === 0);
    });
    const drlPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      const x = THREE.MathUtils.lerp(-sideSign * innerW * 0.42, sideSign * innerW * 0.42, t);
      const y = -innerH * 0.28 + Math.pow(t, 1.8) * innerH * 0.18;
      drlPts.push(new THREE.Vector3(x, y, d * 0.22 + computeFasciaSweepZ(x, hw, side, sweepZ)));
    }
    const drlCurve = new THREE.CatmullRomCurve3(drlPts);
    const drlTube = new THREE.Mesh(
      new THREE.TubeGeometry(drlCurve, cityMode ? 8 : 16, Math.max(0.0042, innerH * 0.062), cityMode ? 5 : 8, false),
      mats.drlLed,
    );
    grp.add(drlTube);
    addSequentialTurnBlades(sideSign * innerW * 0.36, -innerH * 0.16, sideSign, innerW * 0.18, innerH * 0.24);
  } else if (style === 'bar') {
    const ledGeo = createRoundedBoxGeo(innerW * 0.90, innerH * 0.58, 0.018, Math.min(innerH * 0.2, 0.008), 1, 6);
    applyFasciaSweep(ledGeo, hw, side, sweepZ, false);
    const ledStrip = new THREE.Mesh(ledGeo, mats.drlLed);
    ledStrip.position.set(0, 0, d * 0.08);
    grp.add(ledStrip);
    if (!cityMode) {
      const podR = Math.min(innerH * 0.34, innerW * 0.11);
      for (let p = 0; p < 3; p++) {
        const px = -innerW * 0.28 + (p / 2) * (innerW * 0.56);
        addCircularProjector(px, 0, podR, p === 1);
      }
    }
  } else if (style === 'truck_pod') {
    const podR = Math.min(innerH * 0.28, innerW * 0.20);
    [-0.22, 0.22].forEach((lx, idx) => addCircularProjector(lx * innerW, innerH * 0.14, podR, idx === 0));
    const drlGeo = createRoundedBoxGeo(innerW * 0.88, Math.max(0.010, innerH * 0.10), 0.016, 0.004, 1, 6);
    applyFasciaSweep(drlGeo, hw, side, sweepZ, false);
    const drlBar = new THREE.Mesh(drlGeo, mats.drlLed);
    drlBar.position.set(0, -innerH * 0.14, d * 0.16);
    grp.add(drlBar);
    addSequentialTurnBlades(0, -innerH * 0.34, sideSign, innerW * 0.78, innerH * 0.18);
  } else {
    // 'twin_projector': Sculpted dual circular projectors + dual DRL eyebrow/boomerang + 4-segment sequential turn signal
    const podR = Math.min(innerH * 0.33, innerW * 0.158);
    addCircularProjector(-sideSign * innerW * 0.20, innerH * 0.04, podR, true);
    addCircularProjector(sideSign * innerW * 0.10, innerH * 0.10, podR * 0.88, false);

    // Lower swept L-boomerang LED DRL light guide
    const rTube = Math.max(0.0042, innerH * 0.062);
    const drlAnchors: [number, number][] = [
      [-sideSign * innerW * 0.43, innerH * 0.12],
      [-sideSign * innerW * 0.40, -innerH * 0.26],
      [-sideSign * innerW * 0.14, -innerH * 0.34],
      [sideSign * innerW * 0.18, -innerH * 0.24],
      [sideSign * innerW * 0.42, -innerH * 0.06],
      [sideSign * innerW * 0.45, innerH * 0.26],
    ];
    const drlPts = drlAnchors.map(
      ([ax, ay]) => new THREE.Vector3(ax, ay, d * 0.22 + computeFasciaSweepZ(ax, hw, side, sweepZ)),
    );
    const drlTube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(drlPts), cityMode ? 10 : 20, rTube, cityMode ? 5 : 8, false),
      mats.drlLed,
    );
    grp.add(drlTube);

    // Slim upper LED DRL eyebrow filament hugging hood edge
    if (!cityMode) {
      const browPts = [
        new THREE.Vector3(-sideSign * innerW * 0.36, innerH * 0.24, d * 0.20 + computeFasciaSweepZ(-sideSign * innerW * 0.36, hw, side, sweepZ)),
        new THREE.Vector3(0, innerH * 0.34, d * 0.20),
        new THREE.Vector3(sideSign * innerW * 0.38, innerH * 0.41, d * 0.19 + computeFasciaSweepZ(sideSign * innerW * 0.38, hw, side, sweepZ)),
      ];
      const browTube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(browPts), 12, Math.max(0.003, innerH * 0.036), 6, false),
        mats.drlLed,
      );
      grp.add(browTube);
    }

    // 4-segment sequential amber LED turn signal tucked in outer corner
    addSequentialTurnBlades(sideSign * innerW * 0.31, -innerH * 0.15, sideSign, innerW * 0.22, innerH * 0.19);
  }

  // LAYER 3: Exact-fit trapezoidal curved glass lens (MeshPhysicalMaterial w/ transmission & low roughness)
  const lens = new THREE.Mesh(
    createHeadlightLensGeo(
      w * 0.985,
      h * 0.985,
      Math.min(0.015, d * 0.22),
      cityMode ? 6 : 16,
      cityMode ? 4 : 10,
      trapSide,
      sweepZ,
      false,
      false,
    ),
    mats.headlightLens,
  );
  lens.position.z = d * 0.42;
  lens.userData.noShadow = true;
  lens.renderOrder = 3;
  grp.add(lens);

  return grp;
}

export interface BeveledTaillightOptions {
  width: number;
  height: number;
  depth?: number;
  sweepZ?: number;
  style?: 'modern_blade' | 'twin_round' | 'vertical_truck';
  side?: -1 | 0 | 1;
  signalMat?: THREE.Material;
  frameMat?: THREE.Material;
}

export function createBeveledTaillightAssembly(
  opts: BeveledTaillightOptions,
  mats: VehicleMaterialSet,
  cityMode = false,
): THREE.Group {
  const w = opts.width;
  const h = opts.height;
  const d = opts.depth ?? 0.060;
  const side = opts.side ?? 1;
  const sideSign: -1 | 1 = side === 0 ? 1 : side;
  const style = opts.style ?? 'modern_blade';
  const useTrap = style !== 'vertical_truck' && side !== 0;
  const trapSide: -1 | 0 | 1 = useTrap ? side : 0;
  const sweepZ = opts.sweepZ ?? (side === 0 ? 0.008 : Math.min(0.042, w * 0.16));
  const frameThick = THREE.MathUtils.clamp(Math.min(w, h) * 0.115, 0.008, 0.017);
  const bevelSize = frameThick * 0.5;
  const cornerR = Math.min(w, h) * 0.20;
  const hw = Math.max(0.01, w * 0.5);

  const grp = new THREE.Group();

  // LAYER 1: Recessed trapezoidal rear cavity + matte black mask + chrome reflector fin
  const cavityGeo = createTrapezoidalLampGeo(
    w * 0.96,
    h * 0.96,
    d * 0.68,
    cornerR * 0.85,
    trapSide,
    true,
    cityMode ? 1 : 2,
    cityMode ? 6 : 10,
  );
  applyFasciaSweep(cavityGeo, hw, side, sweepZ, true);
  const housing = new THREE.Mesh(cavityGeo, mats.grille);
  housing.position.z = d * 0.16;
  grp.add(housing);

  const innerW = Math.max(0.02, w - frameThick * 2.05);
  const innerH = Math.max(0.02, h - frameThick * 2.05);

  const maskGeo = createTrapezoidalLampGeo(
    innerW * 0.95,
    innerH * 0.92,
    0.012,
    cornerR * 0.55,
    trapSide,
    true,
    1,
    8,
  );
  applyFasciaSweep(maskGeo, hw, side, sweepZ, true);
  const blackMask = new THREE.Mesh(maskGeo, mats.trim);
  blackMask.position.z = d * 0.07;
  grp.add(blackMask);

  if (!cityMode) {
    const divGeo = createRoundedBoxGeo(innerW * 0.86, Math.max(0.005, innerH * 0.075), 0.014, 0.003, 1, 6);
    applyFasciaSweep(divGeo, hw, side, sweepZ, true);
    const div = new THREE.Mesh(divGeo, mats.chrome);
    div.position.set(0, -innerH * 0.06, -d * 0.02);
    grp.add(div);
  }

  const bezelGeo = createBeveledHeadlightFrameGeo(
    w,
    h,
    d * 0.80,
    frameThick,
    bevelSize,
    cornerR,
    cityMode ? 6 : 12,
    cityMode ? 2 : 3,
    trapSide,
    true,
  );
  applyFasciaSweep(bezelGeo, hw, side, sweepZ, true);
  const bezel = new THREE.Mesh(bezelGeo, opts.frameMat ?? mats.trim);
  bezel.position.z = -d * 0.04;
  grp.add(bezel);

  // LAYER 2: Circular LED brake projectors + C-blade signature + reverse prism + 4-segment turn LED
  const addRearProjector = (px: number, py: number, podR: number) => {
    const zCurve = computeFasciaSweepZ(px, hw, side, sweepZ);
    const pGrp = new THREE.Group();
    pGrp.position.set(px, py, -d * 0.05 - zCurve);
    if (side !== 0) {
      pGrp.rotation.y = -side * 0.09;
    }
    const segs = cityMode ? 12 : 20;
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(podR, podR * 0.78, 0.022, segs).rotateX(Math.PI / 2),
      mats.chrome,
    );
    shroud.position.z = 0.002;
    pGrp.add(shroud);

    const domeGeo = new THREE.SphereGeometry(podR * 0.62, segs, cityMode ? 6 : 10, 0, Math.PI * 2, 0, Math.PI * 0.48);
    domeGeo.rotateX(-Math.PI / 2);
    domeGeo.scale(1, 1, 0.56);
    const core = new THREE.Mesh(domeGeo, mats.taillight);
    core.position.z = -0.009;
    pGrp.add(core);

    if (!cityMode) {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(podR * 0.84, Math.max(0.0026, podR * 0.088), 8, 20),
        mats.taillight,
      );
      halo.position.z = -0.012;
      pGrp.add(halo);
    }
    grp.add(pGrp);
  };

  if (style === 'vertical_truck') {
    const podR = Math.min(innerW * 0.34, innerH * 0.14);
    addRearProjector(0, innerH * 0.24, podR);
    addRearProjector(0, 0.02, podR * 0.9);
    const rev = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.78, innerH * 0.16, 0.015, 0.004, 1, 6),
      mats.drlLed,
    );
    rev.position.set(0, -innerH * 0.34, -d * 0.12);
    grp.add(rev);
    if (opts.signalMat) {
      const amb = new THREE.Mesh(
        createRoundedBoxGeo(innerW * 0.78, innerH * 0.18, 0.015, 0.004, 1, 6),
        opts.signalMat,
      );
      amb.position.set(0, -innerH * 0.16, -d * 0.12);
      grp.add(amb);
    }
  } else {
    const podR = Math.min(innerH * 0.29, innerW * 0.145);
    addRearProjector(-sideSign * innerW * 0.22, innerH * 0.11, podR);
    addRearProjector(sideSign * innerW * 0.08, innerH * 0.13, podR * 0.94);

    // Swept C-blade LED tail signature wrapping upper edge and outer rear quarter corner
    const rTube = Math.max(0.0040, innerH * 0.062);
    const anchors: [number, number][] = [
      [-sideSign * innerW * 0.42, innerH * 0.24],
      [-sideSign * innerW * 0.08, innerH * 0.31],
      [sideSign * innerW * 0.28, innerH * 0.34],
      [sideSign * innerW * 0.42, innerH * 0.02],
      [sideSign * innerW * 0.35, -innerH * 0.29],
      [-sideSign * innerW * 0.14, -innerH * 0.30],
    ];
    const sigPts = anchors.map(
      ([ax, ay]) => new THREE.Vector3(ax, ay, -d * 0.20 - computeFasciaSweepZ(ax, hw, side, sweepZ)),
    );
    const sigTube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sigPts), cityMode ? 10 : 18, rTube, cityMode ? 5 : 8, false),
      mats.taillight,
    );
    grp.add(sigTube);

    // Reverse crystal prism (inner bottom) + 4-segment sequential amber turn LED (outer bottom)
    const rx = -sideSign * (innerW * 0.28);
    const rev = new THREE.Mesh(
      createRoundedBoxGeo(innerW * 0.22, innerH * 0.18, 0.015, 0.004, 1, 6),
      mats.drlLed,
    );
    rev.position.set(rx, -innerH * 0.22, -d * 0.12 - computeFasciaSweepZ(rx, hw, side, sweepZ));
    grp.add(rev);

    if (opts.signalMat) {
      const segs = cityMode ? 1 : 4;
      const bandW = innerW * 0.32;
      for (let b = 0; b < segs; b++) {
        const t = segs === 1 ? 0 : (b - (segs - 1) * 0.5) / segs;
        const sx = sideSign * (innerW * 0.18) + sideSign * t * bandW;
        const amber = new THREE.Mesh(
          createRoundedBoxGeo(Math.max(0.007, (bandW / segs) * 0.72), innerH * 0.17, 0.015, 0.0025, 1, 4),
          opts.signalMat,
        );
        amber.position.set(sx, -innerH * 0.22, -d * 0.12 - computeFasciaSweepZ(sx, hw, side, sweepZ));
        grp.add(amber);
      }
    }
  }

  // LAYER 3: Exact-fit trapezoidal curved ruby glass lens
  const lens = new THREE.Mesh(
    createHeadlightLensGeo(
      w * 0.985,
      h * 0.985,
      Math.min(0.014, d * 0.22),
      cityMode ? 6 : 16,
      cityMode ? 4 : 10,
      trapSide,
      sweepZ,
      true,
      true,
    ),
    mats.taillightLens,
  );
  lens.position.z = -d * 0.40;
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
