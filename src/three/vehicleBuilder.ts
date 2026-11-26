import * as THREE from 'three';
import { VehicleConcept } from '../types/vehicle';
import { createVehicleMaterials } from './materials';
import { BuildVehicleOptions, BuiltVehicle, OpenablePart } from './builders/types';
import { buildStandardWheeledVehicle } from './builders/wheeledVehicles';
import {
  buildAircraftOrHovercraft,
  buildMotorcycleOrAtv,
  buildWatercraft,
} from './builders/specialVehicles';

export type { BuiltVehicle, BuildVehicleOptions, OpenablePart };

export function buildCraftedVehicle(
  v: VehicleConcept,
  maxAniso = 4,
  options?: BuildVehicleOptions,
): BuiltVehicle {
  const cityMode = Boolean(options?.cityMode);
  const livery = options?.liveryOverride ?? v.palette.livery ?? 'solid';
  const wheelStyle = options?.wheelStyleOverride ?? v.geometry.wheelStyle;
  const mats = createVehicleMaterials(
    v.palette.primary,
    v.palette.secondary,
    v.palette.accent,
    v.palette.interior,
    v.palette.finish,
    v.palette.trim,
    maxAniso,
    { cityMode, stripeColor: options?.stripeColorOverride ?? v.palette.stripeColor },
  );

  const animated: BuiltVehicle['animatedParts'] = {
    wheels: [],
    rotors: [],
    propellers: [],
    mixerDrum: null,
    sweeperBrushes: [],
    openables: [],
  };

  let group: THREE.Group;
  const arch = v.geometry.archetype;

  if (
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

  let partsCount = 0;
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      partsCount++;
      if (cityMode) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = mesh.material === mats.body && arch !== 'helicopter';
        mesh.receiveShadow = false;
      }
    }
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
