import * as THREE from 'three';
import {
  ExhaustStyle,
  PaintLivery,
  VehicleAttachment,
  VehicleConcept,
  WheelStyle,
} from '../../types/vehicle';
import { VehicleMaterialSet } from '../materials';
import {
  BuiltVehicle,
  createAerodynamicMirror,
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
  buildVisibleInterior,
  buildWheelWellLiners,
  createCraftedWheel,
  createSideDoorGroup,
  createTrapezoidGlassGeo,
} from './wheelsAndInterior';
import {
  buildBusOrArticulatedBus,
  buildHeavyTruckVehicle,
  buildVanOrArmoredVehicle,
} from './heavyVehicles';

// =========================================================================
// 3. FASCIAS, EXHAUSTS, LIVERIES & VEHICLE ATTACHMENTS
// =========================================================================
export function addExhaustSystem(
  group: THREE.Group,
  width: number,
  halfL: number,
  groundClearance: number,
  mats: VehicleMaterialSet,
  style: ExhaustStyle,
) {
  if (style === 'none') return;
  const exGroup = new THREE.Group();

  const buildTip = (x: number, y: number, z: number, r = 0.042, len = 0.18) => {
    const tipGrp = new THREE.Group();
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, len, 16), mats.chrome);
    pipe.rotation.x = Math.PI / 2;
    tipGrp.add(pipe);
    const bore = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.78, r * 0.78, len + 0.012, 14),
      mats.exhaustBore,
    );
    bore.rotation.x = Math.PI / 2;
    tipGrp.add(bore);
    tipGrp.position.set(x, y, z);
    return tipGrp;
  };

  if (style === 'quad') {
    [-1, 1].forEach((side) => {
      exGroup.add(buildTip(side * width * 0.3, 0, 0, 0.036, 0.18));
      exGroup.add(buildTip(side * width * 0.38, 0, 0.01, 0.036, 0.18));
    });
    exGroup.position.set(0, groundClearance + 0.08, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Quádruplo Esportivo', 0, -0.1, -0.6);
  } else if (style === 'center_twin') {
    exGroup.add(buildTip(-0.075, 0, 0, 0.044, 0.2));
    exGroup.add(buildTip(0.075, 0, 0, 0.044, 0.2));
    exGroup.position.set(0, groundClearance + 0.09, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Central Duplo', 0, -0.1, -0.6);
  } else if (style === 'side_pipes') {
    [-1, 1].forEach((side) => {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, halfL * 1.05, 14),
        mats.chrome,
      );
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(side * (width * 0.51), 0, 0);
      exGroup.add(pipe);
      const tip = buildTip(side * (width * 0.52), 0, -halfL * 0.48, 0.046, 0.16);
      tip.rotation.y = side * 0.45;
      exGroup.add(tip);
    });
    exGroup.position.set(0, groundClearance + 0.06, -halfL * 0.05);
    tagPart(exGroup, 'Escapamentos Laterais Cromados', 0, -0.15, 0);
  } else if (style === 'single') {
    exGroup.add(buildTip(width * 0.28, 0, 0, 0.04, 0.18));
    exGroup.position.set(0, groundClearance + 0.07, -halfL - 0.03);
    tagPart(exGroup, 'Escapamento Traseiro Cromado', 0.2, -0.1, -0.55);
  } else {
    [-1, 1].forEach((side) => {
      exGroup.add(buildTip(side * width * 0.28, 0, 0, 0.042, 0.18));
    });
    exGroup.position.set(0, groundClearance + 0.08, -halfL - 0.04);
    tagPart(exGroup, 'Escapamento Duplo Esportivo', 0, -0.1, -0.6);
  }

  const muffler = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.44, 0.11, 0.26, 0.03, 2, 8),
    mats.alloy,
  );
  muffler.position.set(0, 0.02, 0.22);
  exGroup.add(muffler);
  group.add(exGroup);
}

export function addFrontAndRearFascias(
  group: THREE.Group,
  length: number,
  width: number,
  groundClearance: number,
  hoodHeight: number,
  rearHeight: number,
  mats: VehicleMaterialSet,
  attachments: VehicleAttachment[],
  archetype: string,
  includeMirrors = true,
  cityMode = false,
) {
  const halfL = length / 2;
  const frontY = groundClearance + hoodHeight * 0.56;
  const rearY = groundClearance + rearHeight * 0.62;
  const isQuad =
    attachments.includes('quad_headlights') ||
    archetype === 'coupe' ||
    archetype === 'convertible' ||
    archetype === 'muscle';

  const grilleW = width * (isQuad ? 0.44 : 0.48);
  const grilleH = Math.max(0.13, hoodHeight * 0.3);
  const grille = new THREE.Mesh(
    createRoundedBoxGeo(grilleW, grilleH, 0.06, 0.02, 2, 8),
    mats.grille,
  );
  grille.position.set(0, frontY - 0.04, halfL + 0.006);
  tagPart(grille, 'Grade Frontal e Tomada de Ar', 0, 0, 0.45);
  group.add(grille);

  const lowerIntake = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.56, 0.09, 0.065, 0.02, 2, 8),
    mats.grille,
  );
  lowerIntake.position.set(0, groundClearance + 0.12, halfL + 0.018);
  tagPart(lowerIntake, 'Tomada de Ar Inferior', 0, -0.05, 0.48);
  group.add(lowerIntake);

  const surround = new THREE.Mesh(
    createRoundedBoxGeo(grilleW + 0.06, 0.028, 0.07, 0.01, 2, 6),
    mats.trim,
  );
  surround.position.set(0, frontY + grilleH * 0.5 - 0.03, halfL + 0.009);
  tagPart(surround, 'Friso da Grade', 0, 0, 0.48);
  group.add(surround);

  const hlW = width * 0.21;
  const hlH = Math.max(0.085, hoodHeight * 0.19);
  [-1, 1].forEach((side) => {
    const hlGroup = new THREE.Group();
    if (isQuad) {
      const bezel = new THREE.Mesh(
        createRoundedBoxGeo(hlW * 1.18, hlH * 1.16, 0.07, 0.018, 2, 8),
        mats.grille,
      );
      hlGroup.add(bezel);
      [-0.27, 0.27].forEach((lx) => {
        const lamp = new THREE.Mesh(
          createRoundedBoxGeo(hlW * 0.44, hlH * 0.76, 0.08, 0.014, 2, 8),
          mats.headlight,
        );
        lamp.position.x = lx * hlW;
        hlGroup.add(lamp);
      });
      const amber = new THREE.Mesh(
        createRoundedBoxGeo(hlW * 0.36, hlH * 0.62, 0.08, 0.012, 2, 6),
        mats.amberSignal,
      );
      amber.position.set(side * (hlW * 0.34), -hlH * 0.95, 0.01);
      hlGroup.add(amber);
    } else {
      const bezel = new THREE.Mesh(
        createRoundedBoxGeo(hlW * 1.06, hlH * 1.08, 0.07, 0.024, 2, 8),
        mats.grille,
      );
      hlGroup.add(bezel);
      const housing = new THREE.Mesh(
        createRoundedBoxGeo(hlW * 0.92, hlH * 0.84, 0.085, 0.02, 2, 8),
        mats.headlight,
      );
      hlGroup.add(housing);
      const drl = new THREE.Mesh(new THREE.BoxGeometry(hlW * 1.02, 0.022, 0.095), mats.headlight);
      drl.position.y = -hlH * 0.42;
      hlGroup.add(drl);
      const amber = new THREE.Mesh(new THREE.BoxGeometry(0.055, hlH * 0.55, 0.09), mats.amberSignal);
      amber.position.set(side * (hlW * 0.46), 0, 0.005);
      hlGroup.add(amber);
    }
    hlGroup.position.set(side * (width * 0.35), frontY + 0.02, halfL - 0.005);
    tagPart(
      hlGroup,
      side < 0 ? 'Conjunto Óptico Dianteiro Esquerdo' : 'Conjunto Óptico Dianteiro Direito',
      side * 0.25,
      0.05,
      0.45,
    );
    group.add(hlGroup);

    const tlGroup = new THREE.Group();
    const tlFrame = new THREE.Mesh(
      createRoundedBoxGeo(hlW * 1.24, hlH * 1.04, 0.06, 0.022, 2, 8),
      mats.grille,
    );
    tlGroup.add(tlFrame);
    const tl = new THREE.Mesh(
      createRoundedBoxGeo(hlW * 1.05, hlH * 0.78, 0.075, 0.018, 2, 8),
      mats.taillight,
    );
    tl.position.x = -side * (hlW * 0.08);
    tlGroup.add(tl);
    const rev = new THREE.Mesh(new THREE.BoxGeometry(hlW * 0.24, hlH * 0.56, 0.08), mats.headlight);
    rev.position.set(side * (hlW * 0.42), 0, 0);
    tlGroup.add(rev);
    tlGroup.position.set(side * (width * 0.34), rearY, -halfL + 0.005);
    tagPart(
      tlGroup,
      side < 0 ? 'Lanterna Traseira Esquerda' : 'Lanterna Traseira Direita',
      side * 0.25,
      0.05,
      -0.45,
    );
    group.add(tlGroup);

    if (includeMirrors) {
      const mirrorGroup = createAerodynamicMirror(side, mats, cityMode);
      mirrorGroup.position.set(
        side * (width * 0.48),
        groundClearance + hoodHeight + 0.06,
        halfL * 0.22,
      );
      tagPart(
        mirrorGroup,
        side < 0 ? 'Retrovisor Externo Esquerdo' : 'Retrovisor Externo Direito',
        side * 0.45,
        0.12,
        0,
      );
      group.add(mirrorGroup);
    }
  });

  const plateGeo = new THREE.BoxGeometry(0.42, 0.11, 0.02);
  const fPlate = new THREE.Mesh(plateGeo, mats.liveryStripe);
  fPlate.position.set(0, groundClearance + 0.12, halfL + 0.065);
  tagPart(fPlate, 'Placa Dianteira', 0, -0.05, 0.52);
  group.add(fPlate);

  const rPlate = new THREE.Mesh(plateGeo, mats.liveryStripe);
  rPlate.position.set(0, rearY - 0.04, -halfL - 0.02);
  tagPart(rPlate, 'Placa Traseira', 0, -0.05, -0.52);
  group.add(rPlate);

  if (attachments.includes('chrome_bumpers')) {
    const fBumper = new THREE.Mesh(
      createRoundedBoxGeo(width * 1.03, 0.12, 0.15, 0.04, 3, 10),
      mats.chrome,
    );
    fBumper.position.set(0, groundClearance + 0.1, halfL + 0.04);
    tagPart(fBumper, 'Para-choque Dianteiro Cromado', 0, -0.05, 0.55);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(
      createRoundedBoxGeo(width * 1.03, 0.12, 0.15, 0.04, 3, 10),
      mats.chrome,
    );
    rBumper.position.set(0, groundClearance + 0.1, -halfL - 0.04);
    tagPart(rBumper, 'Para-choque Traseiro Cromado', 0, -0.05, -0.55);
    group.add(rBumper);
  } else {
    const fBumper = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.99, 0.13, 0.12, 0.04, cityMode ? 2 : 4, 10),
      mats.secondary,
    );
    fBumper.position.set(0, groundClearance + 0.09, halfL + 0.015);
    tagPart(fBumper, 'Para-choque Dianteiro Esculpido', 0, -0.06, 0.48);
    group.add(fBumper);

    const rBumper = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.99, 0.13, 0.12, 0.04, cityMode ? 2 : 4, 10),
      mats.secondary,
    );
    rBumper.position.set(0, groundClearance + 0.09, -halfL - 0.015);
    tagPart(rBumper, 'Para-choque Traseiro Esculpido', 0, -0.06, -0.48);
    group.add(rBumper);
  }
}

export function addCarBodyDetailsAndLivery(
  group: THREE.Group,
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  bodyLift: number,
  bodyH: number,
  hoodH: number,
  rearH: number,
  roofY: number,
  cabCenterZ: number,
  cabLen: number,
  livery: PaintLivery,
  skipSideTrim = false,
) {
  const { length, width } = v.dimensions;
  const halfL = length / 2;
  const isTruck =
    v.geometry.archetype === 'semi_truck' ||
    v.geometry.archetype === 'dump_truck' ||
    v.geometry.archetype === 'mixer_truck' ||
    v.geometry.archetype === 'firetruck' ||
    v.geometry.archetype === 'tow_truck';

  if (!isTruck) {
    if (!skipSideTrim) {
      [-1, 1].forEach((side) => {
        const handle = new THREE.Mesh(
          createRoundedBoxGeo(0.032, 0.032, 0.15, 0.01, 2, 6),
          mats.chrome,
        );
        handle.position.set(side * (width * 0.502), bodyLift + bodyH * 0.8, 0.04);
        tagPart(handle, 'Maçanetas Cromadas', side * 0.4, 0.05, 0);
        group.add(handle);

        const molding = new THREE.Mesh(
          new THREE.BoxGeometry(0.022, 0.034, length * 0.48),
          mats.trim,
        );
        molding.position.set(side * (width * 0.501), bodyLift + bodyH * 0.44, 0);
        tagPart(molding, 'Friso Lateral da Carroceria', side * 0.4, 0, 0);
        group.add(molding);
      });
    }

    const fuelCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.022, 14),
      mats.trim,
    );
    fuelCap.rotation.z = Math.PI / 2;
    fuelCap.position.set(width * 0.502, bodyLift + rearH * 0.72, -halfL * 0.58);
    tagPart(fuelCap, 'Portinhola de Combustível', 0.4, 0.05, -0.2);
    group.add(fuelCap);

    if (
      v.geometry.archetype !== 'convertible' &&
      v.geometry.archetype !== 'roadster' &&
      v.geometry.archetype !== 'classic' &&
      v.geometry.archetype !== 'buggy'
    ) {
      const fin = new THREE.Mesh(
        createRoundedBoxGeo(0.03, 0.068, 0.15, 0.012, 2, 6),
        mats.trim,
      );
      fin.position.set(0, roofY + 0.045, cabCenterZ - cabLen * 0.25);
      tagPart(fin, 'Antena Shark-Fin', 0, 0.5, 0);
      group.add(fin);
    }

    // Extra bespoke exterior details for open-top cars (side fender gills, fog lamps, rear deck garnish & sill blades)
    if (v.geometry.archetype === 'convertible' || v.geometry.archetype === 'roadster') {
      [-1, 1].forEach((side) => {
        // Side front fender extractor vent/gill ahead of door
        const gill = new THREE.Mesh(
          createRoundedBoxGeo(0.024, 0.095, 0.24, 0.008, 2, 6),
          mats.grille,
        );
        gill.position.set(side * (width * 0.494), bodyLift + hoodH * 0.66, cabCenterZ + cabLen * 0.52 + 0.18);
        group.add(gill);

        // Fog lamp pod inset into lower front bumper apron
        const fog = new THREE.Mesh(
          createRoundedBoxGeo(0.14, 0.055, 0.04, 0.01, 2, 6),
          mats.amberSignal,
        );
        fog.position.set(side * (width * 0.31), bodyLift + 0.11, halfL + 0.042);
        group.add(fog);
      });

      // Center rear trunk garnish / retro reflector bar + high-mount brake lamp
      const deckBadge = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.34, 0.06, 0.032, 0.01, 2, 6),
        v.palette.trim === 'chrome' ? mats.chrome : mats.grille,
      );
      deckBadge.position.set(0, bodyLift + rearH * 0.62, -halfL - 0.005);
      const thirdBrake = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.024, 0.03),
        mats.taillight,
      );
      thirdBrake.position.set(0, bodyLift + rearH + 0.01, -halfL + 0.10);
      group.add(deckBadge, thirdBrake);
    }
  }

  if (livery === 'racing_stripes' || livery === 'rally') {
    const stripeGrp = new THREE.Group();
    [-0.14, 0.14].forEach((sx) => {
      if (v.geometry.archetype !== 'convertible' && v.geometry.archetype !== 'roadster') {
        const roofS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, cabLen * 0.52),
          mats.liveryStripe,
        );
        roofS.position.set(sx, roofY + 0.025, cabCenterZ);
        stripeGrp.add(roofS);
      }
      if (skipSideTrim) {
        // Short bumper/nose accent when hood opens separately
        const noseS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, 0.18),
          mats.liveryStripe,
        );
        noseS.position.set(sx, bodyLift + hoodH * 0.94, halfL - 0.12);
        stripeGrp.add(noseS);
      } else {
        const hoodS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, length * 0.34),
          mats.liveryStripe,
        );
        hoodS.position.set(sx, bodyLift + hoodH + 0.04, halfL * 0.62);
        hoodS.rotation.x = v.geometry.hoodSlope * 0.24;
        stripeGrp.add(hoodS);

        const rearS = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.018, Math.max(0.32, length * v.geometry.rearDeckRatio * 0.9)),
          mats.liveryStripe,
        );
        rearS.position.set(sx, bodyLift + rearH + 0.01, -halfL * 0.72);
        stripeGrp.add(rearS);
      }
    });
    if (livery === 'rally') {
      [-1, 1].forEach((side) => {
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 0.02, 20),
          mats.liveryStripe,
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.set(side * (width * 0.504), bodyLift + bodyH * 0.56, -halfL * 0.56);
        stripeGrp.add(plate);
      });
    }
    tagPart(stripeGrp, 'Pintura Faixas Esportivas GT', 0, 0.35, 0);
    group.add(stripeGrp);
  } else if (livery === 'two_tone') {
    const ttGrp = new THREE.Group();
    if (skipSideTrim) {
      [-1, 1].forEach((side) => {
        const rocker = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, bodyH * 0.22, length * 0.92),
          mats.secondary,
        );
        rocker.position.set(side * (width * 0.492), bodyLift + bodyH * 0.14, 0);
        ttGrp.add(rocker);
      });
    } else {
      const wrap = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.015, bodyH * 0.22, length * 0.92),
        mats.secondary,
      );
      wrap.position.set(0, bodyLift + bodyH * 0.14, 0);
      ttGrp.add(wrap);
    }
    tagPart(ttGrp, 'Pintura Bicolor com Filete', 0, 0.1, 0);
    group.add(ttGrp);
  } else if (livery === 'side_stripe' && !skipSideTrim) {
    const sideGrp = new THREE.Group();
    [-1, 1].forEach((side) => {
      const spear = new THREE.Mesh(
        new THREE.BoxGeometry(0.024, 0.09, length * 0.68),
        mats.liveryStripe,
      );
      spear.position.set(side * (width * 0.502), bodyLift + bodyH * 0.58, 0);
      sideGrp.add(spear);
    });
    tagPart(sideGrp, 'Pintura Faixa Lateral Esportiva', 0, 0.15, 0);
    group.add(sideGrp);
  }
}

export function addVehicleAttachments(
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
    const blade = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.94, 0.042, 0.28, 0.015, 3, 10),
      mats.trim,
    );
    blade.position.y = isSwan ? 0.34 : 0.22;
    blade.rotation.x = -0.1;
    wingGroup.add(blade);
    [-1, 1].forEach((side) => {
      const endplate = new THREE.Mesh(
        createRoundedBoxGeo(0.025, 0.16, 0.34, 0.01, 2, 6),
        mats.accent,
      );
      endplate.position.set(side * (width * 0.47), isSwan ? 0.32 : 0.21, 0);
      wingGroup.add(endplate);
      const pylon = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, isSwan ? 0.36 : 0.24, 0.14),
        mats.secondary,
      );
      pylon.position.set(side * (width * 0.24), isSwan ? 0.18 : 0.12, isSwan ? 0.05 : 0);
      wingGroup.add(pylon);
    });
    wingGroup.position.set(0, rearY + 0.02, -halfL + 0.18);
    tagPart(
      wingGroup,
      isSwan ? 'Aerofólio Pescoço-de-Cisne' : 'Aerofólio Esportivo GT',
      0,
      0.45,
      -0.45,
    );
    group.add(wingGroup);
  }

  if (atts.includes('splitter')) {
    const splitter = new THREE.Mesh(
      createRoundedBoxGeo(width * 1.04, 0.038, 0.25, 0.014, 2, 8),
      mats.trim,
    );
    splitter.position.set(0, v.geometry.groundClearance + 0.02, halfL + 0.06);
    tagPart(splitter, 'Splitter Aerodinâmico Frontal', 0, -0.15, 0.55);
    group.add(splitter);
  }

  if (atts.includes('canards')) {
    [-1, 1].forEach((side) => {
      const canard = new THREE.Mesh(
        createRoundedBoxGeo(0.18, 0.025, 0.24, 0.01, 2, 6),
        mats.trim,
      );
      canard.position.set(side * (width * 0.48), v.geometry.groundClearance + 0.16, halfL - 0.04);
      canard.rotation.z = side * 0.28;
      tagPart(canard, 'Canards Aerodinâmicos', side * 0.3, 0, 0.5);
      group.add(canard);
    });
  }

  if (atts.includes('diffuser')) {
    const diffGroup = new THREE.Group();
    const base = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.72, 0.08, 0.14, 0.02, 2, 8),
      mats.trim,
    );
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
    const ic = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.42, 0.18, 0.08, 0.018, 2, 8),
      mats.alloy,
    );
    ic.position.set(0, v.geometry.groundClearance + 0.15, halfL + 0.02);
    tagPart(ic, 'Intercooler Frontal Aparente', 0, 0, 0.6);
    group.add(ic);
  }

  if (atts.includes('hood_scoop')) {
    const scoop = new THREE.Group();
    const body = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.28, 0.08, 0.56, 0.025, 3, 8),
      mats.secondary,
    );
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(width * 0.24, 0.055, 0.04), mats.grille);
    mouth.position.set(0, 0, 0.28);
    scoop.add(body, mouth);
    scoop.position.set(0, hoodY + 0.04, halfL * 0.55);
    tagPart(scoop, 'Entrada de Ar no Capô (Hood Scoop)', 0, 0.45, 0.1);
    group.add(scoop);
  }

  if (atts.includes('roof_scoop')) {
    const rScoop = new THREE.Mesh(
      createRoundedBoxGeo(0.32, 0.11, 0.55, 0.03, 3, 8),
      mats.trim,
    );
    rScoop.position.set(0, roofY + 0.05, -0.05);
    tagPart(rScoop, 'Tomada de Ar de Teto', 0, 0.55, 0);
    group.add(rScoop);
  }

  if (atts.includes('window_louvers')) {
    const louvers = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(width * 0.66, 0.022, 0.12), mats.trim);
      slat.position.set(0, roofY - 0.08 - i * 0.065, -halfL * 0.34 - i * 0.12);
      slat.rotation.x = 0.25;
      louvers.add(slat);
    }
    tagPart(louvers, 'Veneziana Traseira Retrô', 0, 0.4, -0.45);
    group.add(louvers);
  }

  if (atts.includes('blower_v8')) {
    const blower = new THREE.Group();
    const block = new THREE.Mesh(
      createRoundedBoxGeo(0.36, 0.22, 0.46, 0.035, 3, 8),
      mats.chrome,
    );
    blower.add(block);
    const scoop = new THREE.Mesh(
      createRoundedBoxGeo(0.38, 0.12, 0.34, 0.03, 3, 8),
      mats.chrome,
    );
    scoop.position.set(0, 0.16, 0.04);
    blower.add(scoop);
    [-0.1, 0, 0.1].forEach((bx) => {
      const butterfly = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.04, 14),
        mats.accent,
      );
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
          new THREE.TorusGeometry(v.geometry.wheelRadius * 1.18, 0.058, 10, 22, Math.PI),
          mats.body,
        );
        flare.rotation.y = Math.PI / 2;
        flare.position.set(side * (width * 0.49), v.geometry.wheelRadius * 0.96, wz);
        tagPart(
          flare,
          idx === 0 ? 'Alargador Widebody Dianteiro' : 'Alargador Widebody Traseiro',
          side * 0.45,
          0,
          0,
        );
        group.add(flare);
      });
    });
  }

  if (atts.includes('snorkel')) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(width * 0.48, hoodY - 0.1, halfL * 0.38),
      new THREE.Vector3(width * 0.51, hoodY + 0.15, halfL * 0.32),
      new THREE.Vector3(width * 0.5, roofY + 0.06, halfL * 0.18),
    ]);
    const snk = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.045, 12, false), mats.trim);
    const head = new THREE.Mesh(createRoundedBoxGeo(0.11, 0.12, 0.14, 0.02, 2, 6), mats.trim);
    head.position.set(width * 0.5, roofY + 0.1, halfL * 0.16);
    const snkGroup = new THREE.Group();
    snkGroup.add(snk, head);
    tagPart(snkGroup, 'Snorkel de Admissão Elevada', 0.45, 0.25, 0);
    group.add(snkGroup);
  }

  if (atts.includes('bullbar')) {
    const bull = new THREE.Group();
    const h = 0.36;
    const w = width * 0.68;
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, w, 14), mats.trim);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = h * 0.5;
    bull.add(topBar);
    const botBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, w, 14), mats.trim);
    botBar.rotation.z = Math.PI / 2;
    botBar.position.y = -h * 0.3;
    bull.add(botBar);
    [-0.32, 0, 0.32].forEach((bx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, 0.05), mats.trim);
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
      const upright = new THREE.Mesh(
        createRoundedBoxGeo(0.07, 0.46, 0.12, 0.02, 2, 6),
        mats.trim,
      );
      upright.position.x = px * width;
      push.add(upright);
    });
    [0.14, -0.1].forEach((py) => {
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, width * 0.62, 14),
        mats.trim,
      );
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
      const tent = new THREE.Mesh(
        createRoundedBoxGeo(rw * 0.96, 0.28, rl * 0.92, 0.05, 3, 10),
        mats.secondary,
      );
      tent.position.y = 0.16;
      rack.add(tent);
      const cover = new THREE.Mesh(
        createRoundedBoxGeo(rw * 0.98, 0.06, rl * 0.94, 0.025, 2, 8),
        mats.accent,
      );
      cover.position.y = 0.3;
      rack.add(cover);
    }
    rack.position.set(0, roofY + 0.03, -length * 0.04);
    tagPart(
      rack,
      atts.includes('roof_tent') ? 'Barraca Expedicionária de Teto' : 'Rack Utilitário de Teto',
      0,
      0.55,
      0,
    );
    group.add(rack);
  }

  if (atts.includes('taxi_sign')) {
    const sign = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.22), mats.trim);
    const glow = new THREE.Mesh(
      createRoundedBoxGeo(0.5, 0.14, 0.18, 0.03, 2, 8),
      mats.sirenAmber,
    );
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
    const frame = new THREE.Mesh(createRoundedBoxGeo(lbW, 0.06, 0.22, 0.02, 2, 8), mats.trim);
    lb.add(frame);
    if (isPolice) {
      const leftPod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.025, 2, 8),
        mats.sirenRed,
      );
      leftPod.position.set(-lbW * 0.25, 0.03, 0);
      const rightPod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.44, 0.09, 0.2, 0.025, 2, 8),
        mats.sirenBlue,
      );
      rightPod.position.set(lbW * 0.25, 0.03, 0);
      lb.add(leftPod, rightPod);
    } else {
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(lbW * 0.88, 0.09, 0.2, 0.025, 2, 8),
        mats.sirenAmber,
      );
      pod.position.y = 0.03;
      lb.add(pod);
    }
    const isBuggy = v.geometry.archetype === 'buggy';
    const isOpenCar = v.geometry.archetype === 'roadster' || v.geometry.archetype === 'convertible';
    let barY = roofY + 0.04;
    let barZ = v.geometry.archetype === 'helicopter' ? 0.5 : length * 0.05;
    if (isBuggy) {
      // Anchor directly onto the buggy's overhead tubular rollcage header!
      const cabC = -length * 0.04;
      const cLen = length * v.geometry.cabinLengthRatio;
      barY = roofY - 0.015;
      barZ = cabC + cLen * 0.16;
    } else if (isOpenCar) {
      barY = rearY + 0.24;
      barZ = -length * 0.18;
    }
    lb.position.set(0, barY, barZ);
    tagPart(lb, isPolice ? 'Giroflex LED Bipartido Polícia' : 'Barra Sinalizadora Âmbar', 0, 0.6, 0);
    group.add(lb);
  }

  if (atts.includes('twin_rollbar')) {
    const rbGroup = new THREE.Group();
    const isOpen = v.geometry.archetype === 'roadster' || v.geometry.archetype === 'convertible' || v.geometry.archetype === 'buggy';
    const cabC = -length * 0.05;
    const cLen = length * v.geometry.cabinLengthRatio;
    const span = isOpen ? width * 0.24 : width * 0.36;
    if (isOpen) {
      // Anchor firmly ON the rear tonneau deck right behind the headrests (ZERO floating!)
      const hoopDeckZ = cabC - cLen * 0.30;
      [-1, 1].forEach((s) => {
        const hoop = new THREE.Mesh(
          new THREE.TorusGeometry(0.145, 0.026, 12, 22, Math.PI),
          mats.chrome,
        );
        hoop.position.set(s * span, 0.06, 0);
        rbGroup.add(hoop);

        // Chrome mounting base collars + vertical leg sockets anchored down into deck
        [-0.145, 0.145].forEach((ox) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.08, 10), mats.chrome);
          leg.position.set(s * span + ox, 0.03, 0);
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.044, 0.022, 12), mats.trim);
          collar.position.set(s * span + ox, 0.005, 0);
          rbGroup.add(leg, collar);
        });

        // Diagonal rear kicker strut bracing each hoop into rear deck
        rbGroup.add(
          makeStrutBetween(
            new THREE.Vector3(s * span, 0.19, -0.01),
            new THREE.Vector3(s * span, 0.0, -0.22),
            0.018,
            0.022,
            mats.chrome,
            10,
          ),
        );
        const kickPad = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.02, 10), mats.trim);
        kickPad.position.set(s * span, 0.004, -0.22);
        rbGroup.add(kickPad);
      });
      rbGroup.position.set(0, rearY + 0.01, hoopDeckZ);
    } else {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(width * 0.4, 0.04, 12, 24, Math.PI),
        mats.chrome,
      );
      arch.position.set(0, roofY - 0.15, -length * 0.02);
      rbGroup.add(arch);
    }
    tagPart(rbGroup, 'Santantônio Tubular Cromado', 0, 0.5, 0);
    group.add(rbGroup);
  }

  if (atts.includes('rollcage')) {
    const cage = new THREE.Group();
    const cw = width * (v.geometry.archetype === 'buggy' ? 0.72 : 0.68);
    const cabC = v.geometry.archetype === 'buggy' ? -length * 0.04 : -length * 0.05;
    const cl = length * v.geometry.cabinLengthRatio;
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * cw * 0.48, hoodY - 0.04, cabC + cl * 0.46),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.03, cabC + cl * 0.22),
        new THREE.Vector3(s * cw * 0.44, roofY - 0.03, cabC - cl * 0.34),
        new THREE.Vector3(s * cw * 0.48, rearY - 0.03, cabC - cl * 0.64),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.030, 10, false), mats.accent);
      cage.add(tube);
    });
    // Overhead front + rear cage crossbars (support overhead LED lightbar & frame cockpit)
    [cabC + cl * 0.18, cabC - cl * 0.32].forEach((cz) => {
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.028, cw * 0.88, 10),
        mats.accent,
      );
      cross.rotation.z = Math.PI / 2;
      cross.position.set(0, roofY - 0.03, cz);
      cage.add(cross);
    });
    tagPart(cage, 'Gaiola Rollcage Estrutural', 0, 0.55, 0);
    group.add(cage);
  }

  if (atts.includes('bus_ac')) {
    const acCount = length > 14 ? 3 : length > 9 ? 2 : 1;
    const acGroup = new THREE.Group();
    for (let i = 0; i < acCount; i++) {
      const z = acCount === 1 ? 0 : -length * 0.25 + (i / (acCount - 1)) * (length * 0.5);
      const pod = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.56, 0.22, 1.35, 0.06, 3, 10),
        mats.secondary,
      );
      pod.position.set(0, roofY + 0.11, z);
      acGroup.add(pod);
    }
    tagPart(acGroup, 'Unidades de Ar-Condicionado', 0, 0.65, 0);
    group.add(acGroup);
  }

  if (atts.includes('school_sign')) {
    const sign = new THREE.Mesh(
      createRoundedBoxGeo(1.1, 0.22, 0.08, 0.02, 2, 8),
      mats.secondary,
    );
    sign.position.set(0, roofY + 0.11, halfL - 0.25);
    tagPart(sign, 'Placa ESCOLAR Superior', 0, 0.5, 0.2);
    group.add(sign);
  }

  if (atts.includes('food_awning')) {
    const awningGroup = new THREE.Group();
    const awning = new THREE.Mesh(
      createRoundedBoxGeo(0.92, 0.06, length * 0.52, 0.02, 2, 8),
      mats.accent,
    );
    awning.rotation.z = -0.22;
    awning.position.set(width * 0.5 + 0.42, roofY - 0.25, -0.2);
    awningGroup.add(awning);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, length * 0.48), mats.chrome);
    counter.position.set(width * 0.5 + 0.14, hoodY + 0.02, -0.2);
    awningGroup.add(counter);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 16), mats.chrome);
    chimney.position.set(-width * 0.22, roofY + 0.16, -0.6);
    awningGroup.add(chimney);

    tagPart(awningGroup, 'Toldo, Balcão Gourmet e Exaustor', 0.65, 0.2, 0);
    group.add(awningGroup);
  }

  if (atts.includes('sweeper_brushes')) {
    [-1, 1].forEach((side) => {
      const brushGroup = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.16, 20), mats.accent);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 14), mats.trim);
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
}

// =========================================================================
// 4. HOLLOWED CHASSIS TUB PROFILE (ELIMINATES INTERIOR CLIPPING)
// =========================================================================
function buildHollowedSideProfile(
  length: number,
  groundClearance: number,
  floorHeight: number,
  hoodHeight: number,
  rearHeight: number,
  cabFrontZ: number,
  cabRearZ: number,
  frontWheelZ: number,
  rearWheelZ: number,
  wheelArchR: number,
  hoodSlope: number,
  hasWheelArches: boolean,
): THREE.Shape {
  const halfL = length / 2;
  const shape = new THREE.Shape();
  const bottomY = groundClearance;
  shape.moveTo(-halfL + 0.08, bottomY);

  if (hasWheelArches && wheelArchR > 0.1) {
    const rStart = Math.max(-halfL + 0.14, rearWheelZ - wheelArchR);
    const rEnd = Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR);
    shape.lineTo(rStart, bottomY);
    shape.absarc(rearWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(rEnd, bottomY);

    const fStart = Math.max(rEnd + 0.08, frontWheelZ - wheelArchR);
    const fEnd = Math.min(halfL - 0.14, frontWheelZ + wheelArchR);
    shape.lineTo(fStart, bottomY);
    shape.absarc(frontWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(fEnd, bottomY);
  }

  shape.lineTo(halfL - 0.04, bottomY + 0.05);
  shape.lineTo(halfL, bottomY + hoodHeight * 0.48);
  shape.lineTo(halfL - 0.08, bottomY + hoodHeight * (1 - hoodSlope * 0.28));

  // Drop down into the recessed cabin floor tub!
  const fStop = Math.min(halfL - 0.15, cabFrontZ + 0.06);
  const rStop = Math.max(-halfL + 0.15, cabRearZ - 0.06);
  shape.lineTo(fStop, bottomY + hoodHeight);
  shape.lineTo(fStop - 0.08, bottomY + floorHeight);
  shape.lineTo(rStop + 0.08, bottomY + floorHeight);
  shape.lineTo(rStop, bottomY + rearHeight);

  shape.lineTo(-halfL + 0.12, bottomY + rearHeight);
  shape.lineTo(-halfL, bottomY + rearHeight * 0.72);
  shape.lineTo(-halfL + 0.03, bottomY + 0.08);
  shape.closePath();

  return shape;
}

function buildSolidSideProfile(
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
    const rStart = Math.max(-halfL + 0.14, rearWheelZ - wheelArchR);
    const rEnd = Math.min(frontWheelZ - wheelArchR - 0.1, rearWheelZ + wheelArchR);
    shape.lineTo(rStart, bottomY);
    shape.absarc(rearWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(rEnd, bottomY);

    const fStart = Math.max(rEnd + 0.08, frontWheelZ - wheelArchR);
    const fEnd = Math.min(halfL - 0.14, frontWheelZ + wheelArchR);
    shape.lineTo(fStart, bottomY);
    shape.absarc(frontWheelZ, bottomY + wheelArchR * 0.15, wheelArchR, Math.PI, 0, true);
    shape.lineTo(fEnd, bottomY);
  }

  shape.lineTo(halfL - 0.04, bottomY + 0.05);
  shape.lineTo(halfL, bottomY + hoodHeight * 0.48);
  shape.lineTo(halfL - 0.08, bottomY + hoodHeight * (1 - hoodSlope * 0.28));
  shape.lineTo(halfL * 0.36, bottomY + bodyHeight);
  shape.lineTo(-halfL + 0.12, bottomY + rearHeight);
  shape.lineTo(-halfL, bottomY + rearHeight * 0.72);
  shape.lineTo(-halfL + 0.03, bottomY + 0.08);
  shape.closePath();
  return shape;
}

// =========================================================================
// 5. FORMULA 1 CAR (SMOOTH MONOCOQUE + OPEN ENGINE COWL + DRS FLAP)
// =========================================================================
export function buildFormulaCar(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  wheelStyle: WheelStyle,
  animated: BuiltVehicle['animatedParts'],
  cityMode = false,
): THREE.Group {
  const group = new THREE.Group();
  const { length, width, wheelbase } = v.dimensions;
  const g = v.geometry;
  const halfL = length / 2;
  const fZ = wheelbase * 0.5;
  const rZ = -wheelbase * 0.5;
  const seg = cityMode ? 12 : 24;

  // Carbon Venturi floor plank
  const floor = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.72, 0.05, length * 0.82, 0.02, 2, 10),
    mats.trim,
  );
  floor.position.set(0, g.groundClearance + 0.03, -0.1);
  tagPart(floor, 'Assoalho e Difusor Venturi', 0, -0.2, 0);
  group.add(floor);

  // Smooth sculpted Lathe monocoque & tapered nosecone
  const monoPts = [
    new THREE.Vector2(0.03, halfL - 0.06),
    new THREE.Vector2(width * 0.09, halfL - 0.32),
    new THREE.Vector2(width * 0.14, halfL * 0.48),
    new THREE.Vector2(width * 0.18, 0.15),
    new THREE.Vector2(width * 0.17, -0.45),
    new THREE.Vector2(width * 0.12, -halfL + 0.45),
    new THREE.Vector2(0.05, -halfL + 0.18),
  ];
  const monoGeo = new THREE.LatheGeometry(monoPts, seg);
  monoGeo.rotateX(Math.PI / 2);
  monoGeo.scale(1.0, 0.76, 1.0);
  const mono = new THREE.Mesh(monoGeo, mats.body);
  mono.position.set(0, g.groundClearance + 0.25, 0);
  tagPart(mono, 'Monocoque Central Aerodinâmico', 0, 0.15, 0);
  group.add(mono);

  // Curved beveled sidepods
  [-1, 1].forEach((side) => {
    const pod = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.25, 0.3, length * 0.42, 0.08, cityMode ? 2 : 4, 14),
      mats.body,
    );
    pod.position.set(side * width * 0.25, g.groundClearance + 0.23, -0.15);
    tagPart(pod, 'Sidepod Aerodinâmico Esculpido', side * 0.4, 0.1, 0);
    group.add(pod);

    const intake = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.19, 0.22, 0.05, 0.03, 2, 8),
      mats.grille,
    );
    intake.position.set(side * width * 0.25, g.groundClearance + 0.24, -0.15 + length * 0.21);
    group.add(intake);

    if (!cityMode) {
      const mirPos = new THREE.Vector3(side * width * 0.24, g.groundClearance + 0.48, 0.34);
      const mirRoot = new THREE.Vector3(side * width * 0.22, g.groundClearance + 0.34, 0.24);
      const stalk = makeStrutBetween(mirRoot, mirPos, 0.014, 0.014, mats.trim, 6);
      group.add(stalk);
      const mirror = createAerodynamicMirror(side, mats, cityMode);
      mirror.position.copy(mirPos);
      tagPart(mirror, 'Retrovisores Aero F1', side * 0.35, 0.2, 0);
      group.add(mirror);
    }
  });

  // Recessed Formula cockpit + bucket seat + LCD steering wheel + Halo
  const seat = new THREE.Mesh(
    createRoundedBoxGeo(0.42, 0.38, 0.46, 0.08, 3, 10),
    mats.interior,
  );
  seat.position.set(0, g.groundClearance + 0.36, -0.06);
  seat.rotation.x = -0.4;
  tagPart(seat, 'Cockpit do Piloto e Volante F1', 0, 0.35, 0);
  group.add(seat);

  const f1Wheel = new THREE.Mesh(
    createRoundedBoxGeo(0.24, 0.14, 0.035, 0.025, 2, 8),
    mats.trim,
  );
  f1Wheel.position.set(0, g.groundClearance + 0.44, 0.26);
  f1Wheel.rotation.x = -0.25;
  group.add(f1Wheel);
  const f1Screen = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.04), mats.sirenBlue);
  f1Screen.position.set(0, g.groundClearance + 0.46, 0.255);
  f1Screen.rotation.x = -0.25;
  group.add(f1Screen);

  const haloCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, g.groundClearance + 0.56, -0.22),
    new THREE.Vector3(0, g.groundClearance + 0.67, 0.36),
    new THREE.Vector3(0.22, g.groundClearance + 0.56, -0.22),
  ]);
  const halo = new THREE.Mesh(new THREE.TubeGeometry(haloCurve, 22, 0.028, 12, false), mats.trim);
  tagPart(halo, 'Proteção Halo Titânio', 0, 0.55, 0);
  group.add(halo);
  group.add(
    makeStrutBetween(
      new THREE.Vector3(0, g.groundClearance + 0.45, 0.46),
      new THREE.Vector3(0, g.groundClearance + 0.67, 0.35),
      0.025,
      0.03,
      mats.trim,
      10,
    ),
  );

  // V6 Turbo Power Unit inside rear engine bay + Hinged Openable Airbox Cowl
  const powerUnit = createEngineBayAssembly(width * 0.28, 0.72, mats, false);
  powerUnit.position.set(0, g.groundClearance + 0.35, -0.68);
  group.add(powerUnit);

  const cowlPivot = new THREE.Group();
  cowlPivot.position.set(0, g.groundClearance + 0.46, -1.05);
  const airbox = new THREE.Mesh(
    createRoundedBoxGeo(0.3, 0.34, 0.92, 0.08, cityMode ? 2 : 4, 12),
    mats.body,
  );
  airbox.position.set(0, 0.14, 0.44);
  cowlPivot.add(airbox);
  const sharkFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.78), mats.accent);
  sharkFin.position.set(0, 0.28, 0.38);
  cowlPivot.add(sharkFin);
  tagPart(cowlPivot, 'Carenagem do Motor V6 Turbo', 0, 0.48, -0.15);
  group.add(cowlPivot);
  registerOpenable(animated, cowlPivot, 'Capô do Motor F1', { x: 0.58 });

  // Multi-element Front & Active DRS Rear Wing
  const fWing = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.98, 0.042, 0.38, 0.015, 2, 10),
    mats.trim,
  );
  fWing.position.set(0, g.groundClearance + 0.08, halfL - 0.04);
  tagPart(fWing, 'Asa Dianteira Multi-Elementos', 0, 0, 0.65);
  group.add(fWing);

  const rWingBase = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.72, 0.035, 0.24, 0.012, 2, 8),
    mats.trim,
  );
  rWingBase.position.set(0, g.groundClearance + 0.82, -halfL + 0.15);
  group.add(rWingBase);

  const drsPivot = new THREE.Group();
  drsPivot.position.set(0, g.groundClearance + 0.9, -halfL + 0.08);
  const drsFlap = new THREE.Mesh(
    createRoundedBoxGeo(width * 0.7, 0.03, 0.16, 0.01, 2, 8),
    mats.accent,
  );
  drsFlap.position.set(0, 0, 0.06);
  drsPivot.add(drsFlap);
  tagPart(drsPivot, 'Asa Traseira DRS Articulada', 0, 0.55, -0.55);
  group.add(drsPivot);
  registerOpenable(animated, drsPivot, 'Flap DRS Traseiro', { x: 0.44 });

  [-0.22, 0.22].forEach((px) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.44, 0.18), mats.trim);
    pylon.position.set(px, g.groundClearance + 0.64, -halfL + 0.14);
    group.add(pylon);
  });

  const rainLight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.05), mats.taillight);
  rainLight.position.set(0, g.groundClearance + 0.24, -halfL - 0.02);
  group.add(rainLight);

  addExhaustSystem(group, width, halfL, g.groundClearance + 0.18, mats, 'center_twin');

  [fZ, rZ].forEach((wz, idx) => {
    [-1, 1].forEach((side) => {
      const wishbone = makeStrutBetween(
        new THREE.Vector3(side * width * 0.15, g.wheelRadius + 0.06, wz),
        new THREE.Vector3(side * width * 0.44, g.wheelRadius, wz),
        0.02,
        0.02,
        mats.trim,
      );
      group.add(wishbone);
      const w = createCraftedWheel(
        g.wheelRadius,
        g.wheelWidth * (idx === 1 ? 1.25 : 1.0),
        wheelStyle,
        mats,
        side > 0,
        false,
        cityMode,
      );
      w.position.set(side * (width * 0.45), g.wheelRadius, wz);
      tagPart(w, idx === 0 ? 'Roda Slick Dianteira' : 'Roda Slick Traseira', side * 0.48, 0, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  enableShadows(group);
  return group;
}

// =========================================================================
// 6. STANDARD WHEELED CARS, PICKUPS, VANS, BUSES & HEAVY TRUCKS
// =========================================================================
export function buildStandardWheeledVehicle(
  v: VehicleConcept,
  mats: VehicleMaterialSet,
  animated: BuiltVehicle['animatedParts'],
  livery: PaintLivery,
  wheelStyle: WheelStyle,
  cityMode = false,
): THREE.Group {
  const g = v.geometry;
  if (g.archetype === 'formula') {
    return buildFormulaCar(v, mats, wheelStyle, animated, cityMode);
  }
  if (g.archetype === 'bus' || g.archetype === 'articulated_bus') {
    return buildBusOrArticulatedBus(v, mats, animated, wheelStyle, cityMode);
  }
  if (
    g.archetype === 'semi_truck' ||
    g.archetype === 'dump_truck' ||
    g.archetype === 'mixer_truck' ||
    g.archetype === 'firetruck' ||
    g.archetype === 'tow_truck'
  ) {
    return buildHeavyTruckVehicle(v, mats, animated, wheelStyle, cityMode);
  }
  if (g.archetype === 'van' || g.archetype === 'ambulance' || g.archetype === 'armored') {
    return buildVanOrArmoredVehicle(v, mats, animated, wheelStyle, cityMode);
  }

  const group = new THREE.Group();
  const { length, width, height, wheelbase } = v.dimensions;
  const halfL = length / 2;
  const frontWheelZ = wheelbase > 0 ? wheelbase * 0.5 : length * 0.32;
  const rearWheelZ = wheelbase > 0 ? -wheelbase * 0.5 : -length * 0.32;
  const isElectric = v.palette.finish === 'pearl' && g.archetype === 'micro';
  const exhaustStyle: ExhaustStyle =
    g.exhaustStyle ??
    (g.attachments.includes('quad_exhaust')
      ? 'quad'
      : g.attachments.includes('side_exhaust')
        ? 'side_pipes'
        : g.attachments.includes('dual_exhaust')
          ? 'dual'
          : isElectric
            ? 'none'
            : 'single');

  // C. PASSENGER CARS / SPORTS / SUPERCARS / SUV / PICKUPS / MONSTER / BUGGY
  const isPickup = g.archetype === 'pickup' || g.archetype === 'monster';
  const isMonster = g.archetype === 'monster';
  const isBuggy = g.archetype === 'buggy';
  const isOpenTop = g.archetype === 'roadster' || g.archetype === 'convertible' || isBuggy;
  const isSupercar = g.archetype === 'supercar';
  const hasHollowCockpit = !cityMode && !isMonster;

  const bodyLift = isMonster ? g.groundClearance * 0.55 : g.groundClearance;
  const bodyH = (height - bodyLift) * (1 - g.cabinHeightRatio);
  const minFenderTopY =
    !isMonster && !isBuggy ? g.wheelRadius * 2 + 0.042 : bodyLift + bodyH * 0.7;
  const minFenderH = Math.max(0, minFenderTopY - bodyLift);
  const hoodH = Math.max(bodyH * (isSupercar ? 0.74 : 0.88), minFenderH - 0.01);
  const rearH = Math.max(
    isPickup
      ? bodyH * 0.92
      : bodyH * (g.archetype === 'hatch' || g.archetype === 'wagon' ? 0.98 : 0.94),
    minFenderH,
  );

  const beltlineY = Math.max(bodyLift + bodyH - 0.03, bodyLift + Math.max(hoodH, rearH) - 0.02);
  const cabH = Math.max(0.32, height - beltlineY);
  const cabLen = length * g.cabinLengthRatio;
  const cabCenterZ = isPickup
    ? length * 0.08
    : isBuggy
      ? -length * 0.04
      : g.archetype === 'muscle' || g.archetype === 'classic' || isOpenTop || g.archetype === 'coupe'
        ? -length * 0.05
        : isSupercar
          ? length * 0.04
          : -length * (g.rearDeckRatio * 0.35 - 0.05);

  const cabFrontZ = cabCenterZ + cabLen * 0.48;
  const cabRearZ = cabCenterZ - cabLen * 0.48;
  const archR = g.wheelRadius * (isMonster ? 0.72 : 1.15);
  const floorHeight = bodyH * 0.28;
  const interiorDropY = Math.max(0.18, beltlineY - (bodyLift + floorHeight));

  if (hasHollowCockpit && isBuggy) {
    // 1. Open Tubular Desert Buggy Chassis (hollowed narrow tub + exposed cut fenders + coilover struts + rear engine cage!)
    const buggyTubShape = buildHollowedSideProfile(
      length,
      bodyLift,
      floorHeight,
      hoodH,
      rearH,
      cabFrontZ,
      cabRearZ,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      true,
    );
    const buggyTubGeo = createExtrudedProfile(buggyTubShape, width * 0.64, 0.04, 0.04, 3, 14);
    const buggyTub = new THREE.Mesh(buggyTubGeo, mats.body);
    tagPart(buggyTub, 'Chassi Tubular Buggy Aberto', 0, 0.05, 0);
    group.add(buggyTub);

    // Flared Baja cut fenders + exposed offroad coil-over shocks + tubular side nerf bars
    [-1, 1].forEach((side) => {
      [frontWheelZ, rearWheelZ].forEach((wz, idx) => {
        const fenderFlare = new THREE.Mesh(
          new THREE.TorusGeometry(g.wheelRadius * 1.14, 0.048, 8, 16, Math.PI * 0.85),
          mats.body,
        );
        fenderFlare.rotation.y = Math.PI / 2;
        fenderFlare.position.set(side * (width * 0.41), g.wheelRadius * 1.02, wz);
        group.add(fenderFlare);

        const shock = makeStrutBetween(
          new THREE.Vector3(side * (width * 0.24), bodyLift + hoodH * 0.85, wz),
          new THREE.Vector3(side * (width * 0.42), g.wheelRadius + 0.06, wz),
          0.026,
          0.022,
          mats.accent,
          8,
        );
        group.add(shock);
        if (idx === 0) {
          const arm = makeStrutBetween(
            new THREE.Vector3(side * (width * 0.16), g.wheelRadius, wz),
            new THREE.Vector3(side * (width * 0.42), g.wheelRadius, wz),
            0.022,
            0.022,
            mats.trim,
            8,
          );
          group.add(arm);
        }
      });

      // Tubular side nerf bars along open buggy doorway (no solid side doors blocking the cockpit!)
      const nerf = makeStrutBetween(
        new THREE.Vector3(side * (width * 0.40), bodyLift + floorHeight + 0.08, cabFrontZ + 0.08),
        new THREE.Vector3(side * (width * 0.40), bodyLift + floorHeight + 0.08, cabRearZ - 0.08),
        0.028,
        0.028,
        mats.trim,
        10,
      );
      group.add(nerf);
    });

    // Exposed rear desert engine block + front aluminum bash skidplate
    const rearEng = createEngineBayAssembly(width * 0.46, Math.max(0.45, cabRearZ - (-halfL + 0.16)), mats, false);
    rearEng.position.set(0, bodyLift + rearH * 0.52, (cabRearZ + (-halfL + 0.16)) * 0.5);
    const skid = new THREE.Mesh(createRoundedBoxGeo(width * 0.44, 0.04, 0.36, 0.015, 2, 6), mats.alloy);
    skid.position.set(0, bodyLift + 0.02, halfL - 0.14);
    skid.rotation.x = -0.35;
    group.add(rearEng, skid);
  } else if (hasHollowCockpit) {
    // 1. Hollowed lower chassis tub (narrowed to 0.84*width so flush doors sit OUTSIDE the structural sill!)
    const tubShape = buildHollowedSideProfile(
      length,
      bodyLift,
      floorHeight,
      hoodH,
      rearH,
      cabFrontZ,
      cabRearZ,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      true,
    );
    const tubGeo = createExtrudedProfile(tubShape, width * 0.84, 0.045, 0.045, 4, 20);
    const tubMesh = new THREE.Mesh(tubGeo, mats.body);
    tagPart(tubMesh, 'Chassi Monobloco Esculpido', 0, 0.05, 0);
    group.add(tubMesh);

    // 2. Sculpted outer front & rear fenders flush at +-width * 0.495 (covering tires cleanly) + recessed engine bay + hinged hood
    const hoodSpan = Math.max(0.45, halfL - 0.14 - cabFrontZ);
    const hoodCenterZ = (cabFrontZ + halfL - 0.14) * 0.5;
    const fFenderH = Math.max(hoodH * 0.68, minFenderTopY - (bodyLift + hoodH * 0.34));
    const fFenderBotY = bodyLift + hoodH * 0.34;
    const rSpan = Math.max(0.4, cabRearZ - (-halfL + 0.14));
    const rCenterZ = (cabRearZ + (-halfL + 0.14)) * 0.5;
    const rFenderH = Math.max(rearH * 0.68, minFenderTopY - (bodyLift + rearH * 0.34));
    const rFenderBotY = bodyLift + rearH * 0.34;

    [-1, 1].forEach((side) => {
      const fFender = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.21, fFenderH, hoodSpan + 0.08, 0.042, 4, 12),
        mats.body,
      );
      fFender.position.set(side * (width * 0.39), fFenderBotY + fFenderH * 0.5, hoodCenterZ);
      tagPart(fFender, 'Para-lama Dianteiro Esculpido', side * 0.35, 0.05, 0.2);
      group.add(fFender);

      const rFender = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.21, rFenderH, rSpan + 0.08, 0.042, 4, 12),
        mats.body,
      );
      rFender.position.set(side * (width * 0.39), rFenderBotY + rFenderH * 0.5, rCenterZ);
      tagPart(rFender, 'Para-lama Traseiro Esculpido', side * 0.35, 0.05, -0.2);
      group.add(rFender);

      // Sculpted wheel-arch eyebrows for clean fender clearance over front/rear tires
      [frontWheelZ, rearWheelZ].forEach((wz) => {
        const eyebrow = new THREE.Mesh(
          new THREE.TorusGeometry(g.wheelRadius * 1.14, 0.036, 8, 18, Math.PI),
          mats.body,
        );
        eyebrow.rotation.y = Math.PI / 2;
        eyebrow.position.set(side * (width * 0.486), g.wheelRadius * 0.96, wz);
        group.add(eyebrow);
      });
    });

    // Recessed engine bay + hinged hood (for supercar rear engine, hood opens front frunk!)
    const bay = createEngineBayAssembly(width * 0.54, hoodSpan * 0.85, mats, isElectric || isSupercar);
    bay.position.set(0, bodyLift + hoodH * 0.68, hoodCenterZ);
    group.add(bay);

    const hoodPivot = new THREE.Group();
    hoodPivot.position.set(0, bodyLift + hoodH * 0.96, cabFrontZ + 0.04);
    const hoodLid = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.60, 0.065, hoodSpan, 0.03, 4, 12),
      mats.body,
    );
    hoodLid.position.set(0, -0.015, hoodSpan * 0.5);
    hoodLid.rotation.x = g.hoodSlope * 0.2;
    hoodPivot.add(hoodLid);
    if (livery === 'racing_stripes' || livery === 'rally') {
      [-0.14, 0.14].forEach((sx) => {
        const hs = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, hoodSpan * 0.92), mats.liveryStripe);
        hs.position.set(sx, 0.02, hoodSpan * 0.5);
        hs.rotation.x = g.hoodSlope * 0.2;
        hoodPivot.add(hs);
      });
    }
    tagPart(hoodPivot, isSupercar ? 'Capô Frontal (Porta-Malas)' : 'Capô do Motor Articulado', 0, 0.35, 0.25);
    group.add(hoodPivot);
    registerOpenable(animated, hoodPivot, 'Capô Dianteiro', { x: -0.68 });

    // Rear trunk lid (non-pickup, non-hatch) or folding pickup tailgate
    const rearSpan = Math.max(0.36, cabRearZ - (-halfL + 0.14));
    if (isPickup) {
      const tailgatePivot = new THREE.Group();
      tailgatePivot.position.set(0, bodyLift + floorHeight + 0.05, -halfL + 0.06);
      const tg = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.88, rearH - floorHeight, 0.08, 0.03, 3, 10),
        mats.body,
      );
      tg.position.set(0, (rearH - floorHeight) * 0.5, 0);
      tailgatePivot.add(tg);
      tagPart(tailgatePivot, 'Tampa Traseira da Caçamba', 0, 0.1, -0.45);
      group.add(tailgatePivot);
      registerOpenable(animated, tailgatePivot, 'Tampa da Caçamba', { x: -1.42 });
    } else if (g.archetype !== 'hatch' && g.archetype !== 'wagon' && g.archetype !== 'suv') {
      if (isSupercar) {
        const rearBay = createEngineBayAssembly(width * 0.54, rearSpan * 0.85, mats, false);
        rearBay.position.set(0, bodyLift + rearH * 0.65, cabRearZ - rearSpan * 0.5);
        group.add(rearBay);
      }
      const trunkPivot = new THREE.Group();
      trunkPivot.position.set(0, bodyLift + rearH * 0.96, cabRearZ - 0.02);
      const trunkLid = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.60, 0.06, rearSpan, 0.03, 4, 12),
        mats.body,
      );
      trunkLid.position.set(0, -0.015, -rearSpan * 0.5);
      trunkPivot.add(trunkLid);
      if (livery === 'racing_stripes' || livery === 'rally') {
        [-0.14, 0.14].forEach((sx) => {
          const rs = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, rearSpan * 0.9), mats.liveryStripe);
          rs.position.set(sx, 0.018, -rearSpan * 0.5);
          trunkPivot.add(rs);
        });
      }
      tagPart(trunkPivot, isSupercar ? 'Tampa do Motor Traseiro' : 'Porta-Malas Articulado', 0, 0.35, -0.25);
      group.add(trunkPivot);
      registerOpenable(animated, trunkPivot, 'Porta-Malas Traseiro', { x: 0.72 });
    } else {
      // Rear hatchback/SUV tailgate hinged at roof rear edge
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(0, beltlineY + cabH - 0.04, cabRearZ + cabLen * 0.08);
      const hatchPanel = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.72, rearH * 0.52, 0.07, 0.03, 3, 10),
        mats.body,
      );
      hatchPanel.position.set(0, -cabH - rearH * 0.24, -0.08);
      hatchPivot.add(hatchPanel);
      tagPart(hatchPivot, 'Tampa Traseira Articulada', 0, 0.35, -0.35);
      group.add(hatchPivot);
      registerOpenable(animated, hatchPivot, 'Tampa Traseira', { x: 0.78 });
    }

    // 3. Sealed Side Rocker Sills, Door Jambs, Quarter Flanks & Flush Articulated Doors
    const wsRakeDoor = isSupercar ? 0.62 : 0.42;
    const rRakeDoor =
      g.archetype === 'hatch' || g.archetype === 'wagon' || g.archetype === 'suv'
        ? 0.16
        : 0.48;
    const isFourDoor =
      !isOpenTop &&
      v.unitySpec.seats >= 4 &&
      (g.archetype === 'sedan' ||
        g.archetype === 'wagon' ||
        g.archetype === 'suv' ||
        (isPickup && cabLen > 1.8));
    const doorBaseTopY = beltlineY;
    const sillTopY = bodyLift + floorHeight;
    const doorH = Math.max(0.28, doorBaseTopY - sillTopY + 0.01);
    const sideGlassH = isOpenTop ? 0 : Math.max(0, cabH - 0.05);
    const cabTopHalfX = width * (1 - g.roofTaper * 0.34) * 0.465;
    // Outer door skin is 0.068 thick; setting hingeX at (width*0.495 - 0.034) makes outer face 100% flush with fenders!
    const doorHingeXAbs = width * 0.495 - 0.034;
    const topShift = Math.max(0.025, doorHingeXAbs - cabTopHalfX * 0.98);
    const fStopZ = Math.min(halfL - 0.15, cabFrontZ + 0.06);
    const rStopZ = Math.max(-halfL + 0.15, cabRearZ - 0.06);
    const fDoorHingeZ = cabFrontZ - 0.02;
    const aPillarTopZ = cabCenterZ + cabLen * 0.5 * (1 - wsRakeDoor);
    const cPillarTopZ = cabCenterZ - cabLen * 0.5 * (1 - rRakeDoor);
    const frontSlopeInset = Math.max(0.06, fDoorHingeZ - aPillarTopZ + 0.03);

    const rockerH = Math.max(0.08, floorHeight + 0.015);
    const rockerLen = Math.max(0.8, fStopZ - rStopZ + 0.12);
    const rockerMidZ = (fStopZ + rStopZ) * 0.5;

    const addSidePanelGapFiller = (side: -1 | 1, zFront: number, zRear: number, topY: number, label: string) => {
      const span = zFront - zRear;
      if (span <= 0.02) return;
      const panelH = Math.max(0.18, topY - sillTopY + 0.02);
      const panelW = width * 0.11;
      const panel = new THREE.Mesh(
        createRoundedBoxGeo(panelW, panelH, span + 0.02, 0.02, 2, 8),
        mats.body,
      );
      panel.position.set(side * (width * 0.495 - panelW * 0.5), sillTopY + panelH * 0.5 - 0.01, (zFront + zRear) * 0.5);
      tagPart(panel, label, side * 0.35, 0.05, 0);
      group.add(panel);
    };

    [-1, 1].forEach((s) => {
      const side = s as -1 | 1;

      // Finished rocker sill threshold bar along door bottom
      const sill = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.14, rockerH, rockerLen, 0.024, 2, 8),
        mats.body,
      );
      sill.position.set(side * (width * 0.492 - width * 0.07), bodyLift + rockerH * 0.5, rockerMidZ);
      tagPart(sill, 'Soleira Lateral da Porta', side * 0.38, -0.05, 0);
      group.add(sill);

      // Front cowl jamb cheek sealing space between front fender and door hinge
      addSidePanelGapFiller(side, fStopZ + 0.02, fDoorHingeZ - 0.01, doorBaseTopY, 'Coluna Dianteira Lateral');

      if (isFourDoor) {
        const doorSpan = Math.max(1.1, fDoorHingeZ - (cabRearZ + 0.06));
        const bGap = 0.032;
        const fDoorLen = (doorSpan - bGap) * 0.52;
        const rDoorHingeZ = fDoorHingeZ - fDoorLen - bGap;
        const rDoorLen = Math.max(0.48, doorSpan - fDoorLen - bGap);
        const rDoorRearEdgeZ = rDoorHingeZ - rDoorLen;
        const rearSlopeInset = Math.max(0.04, cPillarTopZ - rDoorRearEdgeZ + 0.04);

        // Lower B-pillar jamb post between front & rear doors
        addSidePanelGapFiller(side, fDoorHingeZ - fDoorLen + 0.01, rDoorHingeZ - 0.01, doorBaseTopY, 'Coluna B Lateral');
        // Rear quarter flank sealing space between rear door and rear fender
        addSidePanelGapFiller(side, rDoorRearEdgeZ + 0.01, rStopZ - 0.02, Math.max(doorBaseTopY, bodyLift + rearH), 'Lateral Traseira');

        const fDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: fDoorHingeZ,
            doorLen: fDoorLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: Math.min(fDoorLen * 0.72, frontSlopeInset),
            glassTopZInsetRear: 0.02,
            topInwardShift: topShift,
            hasMirror: true,
            isScissor: false,
            isRearDoor: false,
            label: side < 0 ? 'Porta Dianteira Esquerda' : 'Porta Dianteira Direita',
          },
          mats,
          animated,
          cityMode,
        );
        group.add(fDoor);

        const rDoor = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: rDoorHingeZ,
            doorLen: rDoorLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: 0.02,
            glassTopZInsetRear: Math.min(rDoorLen * 0.68, rearSlopeInset),
            topInwardShift: topShift,
            hasMirror: false,
            isScissor: false,
            isRearDoor: true,
            label: side < 0 ? 'Porta Traseira Esquerda' : 'Porta Traseira Direita',
          },
          mats,
          animated,
          cityMode,
        );
        group.add(rDoor);
      } else {
        const maxDoorSpan = Math.max(0.85, fDoorHingeZ - (cabRearZ + 0.05));
        const dLen = Math.min(1.52, maxDoorSpan, Math.max(0.95, cabLen * 0.78));
        const doorRearEdgeZ = fDoorHingeZ - dLen;
        const rearSlopeInset = Math.max(0.06, cPillarTopZ - doorRearEdgeZ + 0.04);

        // Rear quarter flank sealing space behind 2-door opening (fixes gaping hole on supercars/coupes/pickups!)
        addSidePanelGapFiller(side, doorRearEdgeZ + 0.01, rStopZ - 0.02, Math.max(doorBaseTopY, bodyLift + rearH), 'Lateral Traseira (Quarter Panel)');

        const door = createSideDoorGroup(
          {
            side,
            hingeX: side * doorHingeXAbs,
            hingeY: doorBaseTopY,
            hingeZ: fDoorHingeZ,
            doorLen: dLen,
            doorHeight: doorH,
            glassHeight: sideGlassH,
            glassTopZInsetFront: Math.min(dLen * 0.65, frontSlopeInset),
            glassTopZInsetRear: Math.min(dLen * 0.45, rearSlopeInset),
            topInwardShift: topShift,
            hasMirror: true,
            isScissor: isSupercar,
            isRearDoor: false,
            label: isSupercar
              ? side < 0
                ? 'Porta Tesoura Esquerda'
                : 'Porta Tesoura Direita'
              : side < 0
                ? 'Porta Esquerda'
                : 'Porta Direita',
          },
          mats,
          animated,
          cityMode,
        );
        group.add(door);
      }
    });
  } else if (!hasHollowCockpit) {
    // Monster or cityMode lightweight chassis (also respects wheel clearance!)
    const shape = buildSolidSideProfile(
      length,
      bodyLift,
      Math.max(bodyH, minFenderH),
      hoodH,
      rearH,
      frontWheelZ,
      rearWheelZ,
      archR,
      g.hoodSlope,
      !isMonster,
    );
    const bodyGeo = createExtrudedProfile(
      shape,
      width,
      0.065,
      0.065,
      cityMode ? 2 : 5,
      cityMode ? 10 : 22,
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, mats.body);
    tagPart(bodyMesh, 'Carroceria Principal Esculpida', 0, 0.15, 0);
    group.add(bodyMesh);
  }

  if (!isMonster) {
    buildWheelWellLiners(
      group,
      g.wheelRadius,
      g.wheelWidth,
      width,
      frontWheelZ,
      rearWheelZ,
      mats,
      cityMode,
    );
  }

  if (isMonster) {
    const subFrame = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.52, 0.2, length * 0.72, 0.04, 2, 8),
      mats.trim,
    );
    subFrame.position.set(0, g.wheelRadius * 0.95, 0);
    tagPart(subFrame, 'Subchassi Tubular Elevado', 0, -0.25, 0);
    group.add(subFrame);
    [frontWheelZ, rearWheelZ].forEach((wz) => {
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, width * 1.04, 14),
        mats.trim,
      );
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

  // Cabin / Open-Top Cockpit with Non-Clipping Interior & Unique Per-Car Differentiation
  const interiorStyle = { styleId: v.id, archetype: g.archetype };
  if (isOpenTop) {
    const cockpitGroup = new THREE.Group();
    const interior = buildVisibleInterior(
      cabLen,
      cabH * 0.9,
      width,
      v.unitySpec.seats,
      mats,
      true,
      hasHollowCockpit ? interiorDropY : 0.06,
      cityMode,
      interiorStyle,
    );
    interior.position.y = hasHollowCockpit ? -interiorDropY : -0.02;
    cockpitGroup.add(interior);

    const wsZ = cabLen * 0.42;
    const wsTilt = isBuggy ? 0.38 : 0.52;
    const wsH = cabH * 1.05;
    const wsTopZ = wsZ - Math.sin(wsTilt) * wsH * 0.46;
    const wsBotZ = wsZ + Math.sin(wsTilt) * wsH * 0.46;
    const wsTopY = wsH * 0.44 + Math.cos(wsTilt) * wsH * 0.46;
    const wsBotY = wsH * 0.44 - Math.cos(wsTilt) * wsH * 0.46;
    const wsWBot = width * (isBuggy ? 0.68 : 0.82);
    const wsWTop = width * (isBuggy ? 0.62 : 0.76);

    const wsGlass = new THREE.Mesh(
      createTrapezoidGlassGeo(wsWBot, wsWTop, wsH * 0.94, 0.02),
      mats.glass,
    );
    wsGlass.position.set(0, wsH * 0.44, wsZ);
    wsGlass.rotation.x = -wsTilt;
    wsGlass.userData.noShadow = true;
    wsGlass.renderOrder = 2;
    cockpitGroup.add(wsGlass);

    [-1, 1].forEach((side) => {
      const pBot = new THREE.Vector3(side * (wsWBot * 0.515), wsBotY, wsBotZ);
      const pTop = new THREE.Vector3(side * (wsWTop * 0.515), wsTopY, wsTopZ);
      cockpitGroup.add(makeStrutBetween(pBot, pTop, 0.028, 0.032, mats.body, 10));
      if (isBuggy) {
        const mir = createAerodynamicMirror(side, mats, cityMode);
        mir.position.lerpVectors(pBot, pTop, 0.28);
        tagPart(
          mir,
          side < 0 ? 'Retrovisor Externo Esquerdo' : 'Retrovisor Externo Direito',
          side * 0.42,
          0.12,
          0.08,
        );
        cockpitGroup.add(mir);
      }
    });
    const topRail = new THREE.Mesh(
      createRoundedBoxGeo(wsWTop * 1.06, 0.045, 0.055, 0.015, 2, 8),
      mats.trim,
    );
    topRail.position.set(0, wsTopY, wsTopZ);
    cockpitGroup.add(topRail);

    // Lower black cowl trim + windshield wipers at glass base
    const cowlLip = new THREE.Mesh(
      createRoundedBoxGeo(wsWBot * 0.98, 0.035, 0.075, 0.012, 2, 6),
      mats.trim,
    );
    cowlLip.position.set(0, wsBotY, wsBotZ);
    cockpitGroup.add(cowlLip);
    [-0.18, 0.16].forEach((wx) => {
      const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.014, 0.018), mats.grille);
      wiper.position.set(wx * width, wsBotY + 0.03, wsBotZ - 0.01);
      wiper.rotation.z = 0.08;
      cockpitGroup.add(wiper);
    });

    // Attached Interior Rear-View Mirror with Chrome Stem anchored directly onto topRail (ZERO floating!)
    const mirStem = makeStrutBetween(
      new THREE.Vector3(0, wsTopY - 0.01, wsTopZ),
      new THREE.Vector3(0, wsTopY - 0.055, wsTopZ - 0.02),
      0.008,
      0.008,
      mats.chrome,
      8,
    );
    const rvMirror = new THREE.Mesh(
      createRoundedBoxGeo(0.18, 0.046, 0.028, 0.01, 2, 8),
      mats.grille,
    );
    rvMirror.position.set(0, wsTopY - 0.06, wsTopZ - 0.025);
    cockpitGroup.add(mirStem, rvMirror);

    if (!isBuggy) {
      const tonneau = new THREE.Mesh(
        createRoundedBoxGeo(width * 0.86, 0.09, cabLen * 0.24, 0.03, 2, 8),
        mats.secondary,
      );
      tonneau.position.set(0, 0.05, -cabLen * 0.42);
      cockpitGroup.add(tonneau);

      // Unique per-car open-top deck styling (VHC-57 speedster humps vs VHC-52/VHC-67 pleated convertible boot!)
      if (g.archetype === 'roadster' || g.attachments.includes('twin_rollbar')) {
        [-1, 1].forEach((side) => {
          const hump = new THREE.Mesh(
            createRoundedBoxGeo(width * 0.24, 0.12, cabLen * 0.26, 0.045, 3, 10),
            mats.body,
          );
          hump.position.set(side * (width * 0.24), 0.11, -cabLen * 0.40);
          cockpitGroup.add(hump);
        });
      } else {
        // Pleated convertible soft-top boot cover with chrome retaining strip (VHC-52 / VHC-67)
        const bootRoll = new THREE.Mesh(
          createRoundedBoxGeo(width * 0.84, 0.065, cabLen * 0.18, 0.028, 3, 10),
          mats.secondary,
        );
        bootRoll.position.set(0, 0.095, -cabLen * 0.41);
        const bootTrim = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.82, 0.018, 0.024),
          mats.chrome,
        );
        bootTrim.position.set(0, 0.128, -cabLen * 0.48);
        cockpitGroup.add(bootRoll, bootTrim);
      }
    }

    cockpitGroup.position.set(0, beltlineY + 0.02, cabCenterZ);
    tagPart(cockpitGroup, isBuggy ? 'Cockpit Tubular Buggy Aberto' : 'Cabine Conversível com Interior Visível', 0, 0.35, 0);
    group.add(cockpitGroup);
  } else {
    const wsRake = isSupercar ? 0.62 : 0.42;
    const rRake =
      g.archetype === 'hatch' || g.archetype === 'wagon' || g.archetype === 'suv'
        ? 0.16
        : 0.48;
    const cab = buildSculptedCabin(
      cabLen,
      cabH,
      width,
      g.roofTaper,
      wsRake,
      rRake,
      mats,
      g.attachments.includes('panoramic_roof'),
      v.unitySpec.seats,
      hasHollowCockpit ? interiorDropY : 0.06,
      cityMode,
      hasHollowCockpit, // Doors carry their own moving window glass when hollowed!
      undefined,
      interiorStyle,
    );
    cab.position.set(0, beltlineY, cabCenterZ);
    tagPart(cab, 'Cabine com Vidros Aparentes e Interior 3D', 0, 0.48, 0);
    group.add(cab);
  }

  if (isPickup) {
    const bedFloor = new THREE.Mesh(
      createRoundedBoxGeo(width * 0.78, 0.08, length * g.rearDeckRatio * 0.85, 0.02, 2, 8),
      mats.trim,
    );
    bedFloor.position.set(
      0,
      hasHollowCockpit ? bodyLift + floorHeight + 0.04 : beltlineY + 0.02,
      -halfL + length * g.rearDeckRatio * 0.45,
    );
    tagPart(bedFloor, 'Assoalho da Caçamba Protetor', 0, 0.25, -0.3);
    group.add(bedFloor);
  }

  const wheelY = g.wheelRadius;
  const wheelX = width * (isMonster ? 0.56 : 0.46);
  [
    { z: frontWheelZ, label: 'Roda Dianteira' },
    { z: rearWheelZ, label: 'Roda Traseira' },
  ].forEach((axle) => {
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
      w.position.set(side * wheelX, wheelY, axle.z);
      tagPart(w, `${axle.label} ${side < 0 ? 'Esquerda' : 'Direita'}`, side * 0.48, -0.05, 0);
      group.add(w);
      animated.wheels.push(w);
    });
  });

  [-1, 1].forEach((side) => {
    const skirt = new THREE.Mesh(
      createRoundedBoxGeo(0.08, 0.08, Math.max(0.8, wheelbase - g.wheelRadius * 2.2), 0.02, 2, 6),
      mats.trim,
    );
    skirt.position.set(side * (width * 0.49), bodyLift + 0.04, (frontWheelZ + rearWheelZ) * 0.5);
    tagPart(skirt, 'Saia Lateral / Estribo', side * 0.42, -0.1, 0);
    group.add(skirt);
  });

  addCarBodyDetailsAndLivery(
    group,
    v,
    mats,
    bodyLift,
    bodyH,
    hoodH,
    rearH,
    beltlineY + cabH,
    cabCenterZ,
    cabLen,
    livery,
    hasHollowCockpit,
  );
  addFrontAndRearFascias(
    group,
    length,
    width,
    bodyLift,
    hoodH,
    rearH,
    mats,
    g.attachments,
    g.archetype,
    !hasHollowCockpit && !isBuggy,
    cityMode,
  );
  addExhaustSystem(group, width, halfL, bodyLift, mats, exhaustStyle);
  addVehicleAttachments(group, v, mats, beltlineY + cabH, bodyLift + rearH, bodyLift + hoodH, animated);
  enableShadows(group);
  return group;
}
