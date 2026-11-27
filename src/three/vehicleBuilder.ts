import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VehicleConcept } from '../types/vehicle';
import { createVehicleMaterials } from './materials';
import { BuildVehicleOptions, BuiltVehicle, OpenablePart } from './builders/types';
import { buildStandardWheeledVehicle } from './builders/wheeledVehicles';
import {
  buildAircraftOrHovercraft,
  buildMotorcycleOrAtv,
  buildWatercraft,
} from './builders/specialVehicles';
import { buildBicycleVehicle } from './builders/bicycleVehicles';

export type { BuiltVehicle, BuildVehicleOptions, OpenablePart };

const _invRoot = new THREE.Matrix4();
const _relMat = new THREE.Matrix4();

function optimizeRigidSubtrees(
  rootGroup: THREE.Group,
  animated: BuiltVehicle['animatedParts'],
  options: { cityMode: boolean },
): void {
  rootGroup.updateMatrixWorld(true);

  const protectedRoots = new Set<THREE.Object3D>();
  const skipMergeNodes = new Set<THREE.Object3D>();

  animated.wheels.forEach((w) => protectedRoots.add(w));
  animated.rotors.forEach((r) => protectedRoots.add(r));
  animated.propellers.forEach((p) => protectedRoots.add(p));
  animated.cranks.forEach((c) => protectedRoots.add(c));
  animated.pedals.forEach((p) => protectedRoots.add(p));
  animated.steeringPivots.forEach((s) => protectedRoots.add(s));
  animated.steeringWheels.forEach((sw) => protectedRoots.add(sw));
  animated.headlightBeams.forEach((hb) => {
    protectedRoots.add(hb);
    skipMergeNodes.add(hb);
  });
  if (animated.mixerDrum) protectedRoots.add(animated.mixerDrum);
  animated.sweeperBrushes.forEach((b) => protectedRoots.add(b));
  animated.afterburners.forEach((a) => {
    protectedRoots.add(a);
    skipMergeNodes.add(a);
  });

  if (!options.cityMode) {
    animated.openables.forEach((op) => protectedRoots.add(op.pivot));
    rootGroup.traverse((obj) => {
      if (obj === rootGroup) return;
      if (obj.userData.partLabel || obj.userData.explodeOffset) {
        protectedRoots.add(obj);
      }
      if (obj.userData.extraMaterials) {
        protectedRoots.add(obj);
        skipMergeNodes.add(obj);
      }
      if (obj.userData.sharedGeometry) {
        skipMergeNodes.add(obj);
      }
    });
  }

  const allOriginalGeos = new Set<THREE.BufferGeometry>();
  const sharedGeos = new Set<THREE.BufferGeometry>();
  rootGroup.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      allOriginalGeos.add(mesh.geometry);
      if (mesh.userData.sharedGeometry) {
        sharedGeos.add(mesh.geometry);
      }
    }
  });

  const mergeRigidSubtree = (subtreeRoot: THREE.Object3D) => {
    if (skipMergeNodes.has(subtreeRoot)) return;

    const meshes: THREE.Mesh[] = [];
    const walk = (node: THREE.Object3D) => {
      if (node !== subtreeRoot && protectedRoots.has(node)) return;
      if (skipMergeNodes.has(node)) return;
      const m = node as THREE.Mesh;
      if (m.isMesh && m.geometry && !Array.isArray(m.material)) {
        const pos = m.geometry.getAttribute('position');
        if (pos && pos.count > 0) {
          meshes.push(m);
        }
      }
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    };
    walk(subtreeRoot);

    if (meshes.length < 2) return;

    _invRoot.copy(subtreeRoot.matrixWorld).invert();

    interface Bucket {
      material: THREE.Material;
      castShadow: boolean;
      receiveShadow: boolean;
      renderOrder: number;
      noShadow: boolean;
      hasUv: boolean;
      hasColor: boolean;
      items: { mesh: THREE.Mesh; geo: THREE.BufferGeometry }[];
    }
    const buckets = new Map<string, Bucket>();

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      _relMat.multiplyMatrices(_invRoot, mesh.matrixWorld);
      if (Math.abs(_relMat.determinant()) <= 1e-8) continue;

      const srcGeo = mesh.geometry;
      const hasUv = Boolean(srcGeo.getAttribute('uv'));
      const hasColor = Boolean(srcGeo.getAttribute('color'));
      const mat = mesh.material as THREE.Material;
      const castShadow = mesh.castShadow;
      const receiveShadow = options.cityMode ? false : mesh.receiveShadow;
      const noShadow = Boolean(mesh.userData.noShadow);
      const key = `${mat.uuid}|${castShadow ? 1 : 0}|${receiveShadow ? 1 : 0}|${mesh.renderOrder}|${noShadow ? 1 : 0}|${hasUv ? 1 : 0}|${hasColor ? 1 : 0}`;

      const geo = srcGeo.index ? srcGeo.toNonIndexed() : srcGeo.clone();
      const attrNames = Object.keys(geo.attributes);
      for (let a = 0; a < attrNames.length; a++) {
        const name = attrNames[a];
        if (
          name !== 'position' &&
          name !== 'normal' &&
          !(hasUv && name === 'uv') &&
          !(hasColor && name === 'color')
        ) {
          geo.deleteAttribute(name);
        }
      }
      if (!geo.getAttribute('normal')) {
        geo.computeVertexNormals();
      }
      geo.applyMatrix4(_relMat);

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          material: mat,
          castShadow,
          receiveShadow,
          renderOrder: mesh.renderOrder,
          noShadow,
          hasUv,
          hasColor,
          items: [],
        };
        buckets.set(key, bucket);
      }
      bucket.items.push({ mesh, geo });
    }

    buckets.forEach((bucket) => {
      if (bucket.items.length < 2) {
        for (let i = 0; i < bucket.items.length; i++) {
          bucket.items[i].geo.dispose();
        }
        return;
      }

      const merged = mergeGeometries(
        bucket.items.map((it) => it.geo),
        false,
      );
      for (let i = 0; i < bucket.items.length; i++) {
        bucket.items[i].geo.dispose();
      }
      if (!merged) return;

      for (let i = 0; i < bucket.items.length; i++) {
        const m = bucket.items[i].mesh;
        m.parent?.remove(m);
      }

      const mergedMesh = new THREE.Mesh(merged, bucket.material);
      mergedMesh.castShadow = bucket.castShadow;
      mergedMesh.receiveShadow = bucket.receiveShadow;
      mergedMesh.renderOrder = bucket.renderOrder;
      if (bucket.noShadow) {
        mergedMesh.userData.noShadow = true;
      }
      subtreeRoot.add(mergedMesh);
    });

    // Prune empty non-protected container groups inside this subtree
    const pruneEmpty = (node: THREE.Object3D): boolean => {
      for (let i = node.children.length - 1; i >= 0; i--) {
        const ch = node.children[i];
        if (protectedRoots.has(ch)) continue;
        if (!(ch as THREE.Mesh).isMesh && pruneEmpty(ch)) {
          node.remove(ch);
        }
      }
      return node !== subtreeRoot && !(node as THREE.Mesh).isMesh && node.children.length === 0;
    };
    pruneEmpty(subtreeRoot);
  };

  mergeRigidSubtree(rootGroup);
  protectedRoots.forEach((subRoot) => {
    if (subRoot !== rootGroup) {
      mergeRigidSubtree(subRoot);
    }
  });

  // Dispose only original geometries no longer used by any surviving mesh
  const survivingGeos = new Set<THREE.BufferGeometry>();
  rootGroup.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      survivingGeos.add(mesh.geometry);
    }
  });
  allOriginalGeos.forEach((g) => {
    if (!survivingGeos.has(g) && !sharedGeos.has(g)) {
      g.dispose();
    }
  });

  if (options.cityMode) {
    rootGroup.updateMatrixWorld(true);
    const freezeChild = (node: THREE.Object3D) => {
      if (node !== rootGroup && !protectedRoots.has(node)) {
        node.matrixAutoUpdate = false;
        node.updateMatrix();
      }
      const ch = node.children;
      for (let i = 0; i < ch.length; i++) {
        freezeChild(ch[i]);
      }
    };
    freezeChild(rootGroup);
  }
}

export function buildCraftedVehicle(
  v: VehicleConcept,
  maxAniso = 4,
  options?: BuildVehicleOptions,
): BuiltVehicle {
  const cityMode = Boolean(options?.cityMode);
  const livery = options?.liveryOverride ?? v.palette.livery ?? 'solid';
  const wheelStyle = options?.wheelStyleOverride ?? v.geometry.wheelStyle;
  const arch = v.geometry.archetype;
  const enableSirens =
    v.geometry.attachments.includes('lightbar_police') ||
    v.geometry.attachments.includes('lightbar_amber') ||
    arch === 'ambulance' ||
    arch === 'firetruck' ||
    arch === 'rib_boat' ||
    v.id === 49 ||
    v.id === 100;
  const mats = createVehicleMaterials(
    v.palette.primary,
    v.palette.secondary,
    v.palette.accent,
    v.palette.interior,
    v.palette.finish,
    v.palette.trim,
    maxAniso,
    { cityMode, stripeColor: options?.stripeColorOverride ?? v.palette.stripeColor, enableSirens },
  );

  const animated: BuiltVehicle['animatedParts'] = {
    wheels: [],
    rotors: [],
    propellers: [],
    afterburners: [],
    cranks: [],
    pedals: [],
    steeringPivots: [],
    steeringWheels: [],
    headlightBeams: [],
    mixerDrum: null,
    sweeperBrushes: [],
    openables: [],
  };

  let group: THREE.Group;

  if (arch === 'bicycle') {
    group = buildBicycleVehicle(v, mats, wheelStyle, animated, cityMode);
  } else if (
    arch === 'scooter' ||
    arch === 'sportbike' ||
    arch === 'cruiser' ||
    arch === 'dirtbike' ||
    arch === 'trike' ||
    arch === 'atv'
  ) {
    group = buildMotorcycleOrAtv(v, mats, wheelStyle, animated, cityMode);
  } else if (
    arch === 'speedboat' ||
    arch === 'jetski' ||
    arch === 'rib_boat' ||
    arch === 'tugboat' ||
    arch === 'yacht'
  ) {
    group = buildWatercraft(v, mats, animated, cityMode);
  } else if (
    arch === 'helicopter' ||
    arch === 'hovercraft' ||
    arch === 'airplane' ||
    arch === 'jet'
  ) {
    group = buildAircraftOrHovercraft(v, mats, wheelStyle, animated, cityMode);
  } else {
    group = buildStandardWheeledVehicle(v, mats, animated, livery, wheelStyle, cityMode);
  }

  const skipCityShadow =
    arch === 'helicopter' ||
    arch === 'airplane' ||
    arch === 'jet' ||
    arch === 'bicycle' ||
    arch === 'scooter' ||
    arch === 'sportbike' ||
    arch === 'cruiser' ||
    arch === 'dirtbike' ||
    arch === 'jetski';

  let partsCount = 0;
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      partsCount++;
      if (cityMode) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = mesh.material === mats.body && !skipCityShadow;
        mesh.receiveShadow = false;
      }
    }
  });

  optimizeRigidSubtrees(group, animated, { cityMode });

  const dispose = () => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !child.userData.sharedGeometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
      const extraMats = child.userData.extraMaterials as THREE.Material[] | undefined;
      if (extraMats) {
        extraMats.forEach((m) => m.dispose());
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
