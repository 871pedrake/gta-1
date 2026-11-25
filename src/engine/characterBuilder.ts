import * as THREE from 'three';
import {
  AppearanceConfig,
  EstiloCabelo,
  PALETA_CABELOS,
  PALETA_CALCAS,
  PALETA_CAMISAS,
  PALETA_MOCHILAS,
  PALETA_PELES,
  PALETA_SAPATOS,
  TipoCalca,
  TipoCamisa,
} from '../types/game';
import { getCharacterMaterial } from './materials';

export interface ArticulatedCharacter {
  root: THREE.Group;
  corpoPivo: THREE.Group;
  cabecaPivo: THREE.Group;
  torso: THREE.Mesh;
  pivoPernaE: THREE.Group;
  pivoPernaD: THREE.Group;
  joelhoE: THREE.Group;
  joelhoD: THREE.Group;
  pivoBracoE: THREE.Group;
  pivoBracoD: THREE.Group;
  cotoveloE: THREE.Group;
  cotoveloD: THREE.Group;
  celularObj: THREE.Group;
  faseAndar: number;
  velocidadeSuave: number;
  sentadoFator: number;
  deslocFase: number;
  alturaVisual: number;
  yawCabeca: number;
  pitchCabeca: number;
}

export interface CharacterAnimInput {
  dt: number;
  elapsed: number;
  speed: number;
  correndo: boolean;
  agachado: boolean;
  nadando: boolean;
  noAr: boolean;
  timerSoco: number;
  timerAceno: number;
  sentado?: boolean;
  celular?: boolean;
  conversando?: boolean;
  assustado?: boolean;
  headTargetYaw?: number;
  headTargetPitch?: number;
}

const DEG2RAD = Math.PI / 180;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomAppearanceConfig(): AppearanceConfig {
  const estilos: EstiloCabelo[] = ['Careca', 'Curto', 'Topete', 'Longo', 'Coque'];
  const r = Math.random();
  const tipoCamisa: TipoCamisa = r < 0.7 ? 'Curta' : r < 0.85 ? 'Regata' : 'Longa';
  const tipoCalca: TipoCalca = Math.random() < 0.7 ? 'Longa' : 'Bermuda';
  const estiloCabelo = pick(estilos);

  return {
    aparenciaAleatoria: true,
    corPele: pick(PALETA_PELES),
    corCabelo: pick(PALETA_CABELOS),
    corCamisa: pick(PALETA_CAMISAS),
    corCalca: pick(PALETA_CALCAS),
    corSapato: pick(PALETA_SAPATOS),
    estiloCabelo,
    tipoCamisa,
    tipoCalca,
    usarBone: Math.random() < 0.2,
    corBone: pick(PALETA_CAMISAS),
    usarOculos: Math.random() < 0.2,
    usarMochila: Math.random() < 0.25,
    corMochila: pick(PALETA_MOCHILAS),
    usarBarba: estiloCabelo !== 'Longo' && Math.random() < 0.15,
  };
}

function darkenHex(hex: string, factor: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

function createPart(
  geo: THREE.BufferGeometry,
  parent: THREE.Object3D,
  pos: [number, number, number],
  scale: [number, number, number],
  colorHex: string,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, getCharacterMaterial(colorHex));
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Shared primitive geometries (unit scale, reused across all characters)
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const SPHERE_GEO = new THREE.SphereGeometry(0.5, 14, 12);
const CYL_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
const CAPSULE_GEO = new THREE.CapsuleGeometry(0.5, 1, 6, 12);

export function buildArticulatedCharacter(
  config: AppearanceConfig,
  scaleVariation = false,
): ArticulatedCharacter {
  const cfg = config.aparenciaAleatoria ? randomAppearanceConfig() : config;

  const root = new THREE.Group();
  const altura = scaleVariation ? 0.94 + Math.random() * 0.12 : 1;
  const largura = scaleVariation ? 0.92 + Math.random() * 0.16 : 1;

  const corpoPivo = new THREE.Group();
  corpoPivo.scale.set(largura, altura, largura);
  root.add(corpoPivo);

  const isBermuda = cfg.tipoCalca === 'Bermuda';

  // Pelvis
  createPart(BOX_GEO, corpoPivo, [0, 0.93, 0], [0.34, 0.16, 0.21], cfg.corCalca);

  // Legs (matching AparenciaPersonagem.cs proportions, +Z is forward)
  const buildLeg = (x: number): { pivo: THREE.Group; joelho: THREE.Group } => {
    const pivo = new THREE.Group();
    pivo.position.set(x, 0.92, 0);
    corpoPivo.add(pivo);

    createPart(CYL_GEO, pivo, [0, -0.21, 0], [0.16, 0.43, 0.16], cfg.corCalca);

    const joelho = new THREE.Group();
    joelho.position.set(0, -0.42, 0);
    pivo.add(joelho);

    const shinColor = isBermuda ? cfg.corPele : cfg.corCalca;
    const shinWidth = isBermuda ? 0.13 : 0.155;
    createPart(SPHERE_GEO, joelho, [0, 0, 0], [0.15, 0.15, 0.15], shinColor);
    createPart(CYL_GEO, joelho, [0, -0.21, 0], [shinWidth, 0.43, shinWidth], shinColor);
    createPart(BOX_GEO, joelho, [0, -0.455, 0.04], [0.14, 0.09, 0.27], cfg.corSapato);

    return { pivo, joelho };
  };

  const legL = buildLeg(-0.095);
  const legR = buildLeg(0.095);

  // Torso & neck
  const torso = createPart(CAPSULE_GEO, corpoPivo, [0, 1.22, 0], [0.38, 0.3, 0.24], cfg.corCamisa);
  createPart(CYL_GEO, corpoPivo, [0, 1.55, 0], [0.1, 0.1, 0.1], cfg.corPele);

  // Arms
  const buildArm = (x: number): { pivo: THREE.Group; cotovelo: THREE.Group } => {
    const pivo = new THREE.Group();
    pivo.position.set(x, 1.46, 0);
    corpoPivo.add(pivo);

    const upperColor = cfg.tipoCamisa === 'Regata' ? cfg.corPele : cfg.corCamisa;
    const foreColor = cfg.tipoCamisa === 'Longa' ? cfg.corCamisa : cfg.corPele;

    createPart(CAPSULE_GEO, pivo, [0, -0.15, 0], [0.095, 0.15, 0.095], upperColor);

    const cotovelo = new THREE.Group();
    cotovelo.position.set(0, -0.28, 0);
    pivo.add(cotovelo);

    createPart(CAPSULE_GEO, cotovelo, [0, -0.13, 0], [0.08, 0.14, 0.08], foreColor);
    createPart(SPHERE_GEO, cotovelo, [0, -0.29, 0], [0.085, 0.085, 0.085], cfg.corPele);

    return { pivo, cotovelo };
  };

  const armL = buildArm(-0.255);
  const armR = buildArm(0.255);

  // Head
  const cabecaPivo = new THREE.Group();
  cabecaPivo.position.set(0, 1.67, 0);
  corpoPivo.add(cabecaPivo);

  createPart(SPHERE_GEO, cabecaPivo, [0, 0, 0], [0.24, 0.27, 0.25], cfg.corPele);
  createPart(SPHERE_GEO, cabecaPivo, [-0.045, 0.02, 0.108], [0.032, 0.032, 0.032], '#121212', false);
  createPart(SPHERE_GEO, cabecaPivo, [0.045, 0.02, 0.108], [0.032, 0.032, 0.032], '#121212', false);

  const browColor = cfg.estiloCabelo === 'Careca' ? darkenHex(cfg.corPele, 0.4) : cfg.corCabelo;
  createPart(BOX_GEO, cabecaPivo, [-0.045, 0.058, 0.104], [0.05, 0.01, 0.012], browColor, false);
  createPart(BOX_GEO, cabecaPivo, [0.045, 0.058, 0.104], [0.05, 0.01, 0.012], browColor, false);
  createPart(BOX_GEO, cabecaPivo, [0, -0.012, 0.123], [0.035, 0.04, 0.04], darkenHex(cfg.corPele, 0.92), false);
  createPart(BOX_GEO, cabecaPivo, [0, -0.055, 0.112], [0.045, 0.01, 0.01], '#993333', false);
  createPart(SPHERE_GEO, cabecaPivo, [-0.118, 0, 0], [0.04, 0.06, 0.045], cfg.corPele, false);
  createPart(SPHERE_GEO, cabecaPivo, [0.118, 0, 0], [0.04, 0.06, 0.045], cfg.corPele, false);

  // Hair
  if (cfg.estiloCabelo !== 'Careca') {
    if (!cfg.usarBone) {
      createPart(SPHERE_GEO, cabecaPivo, [0, 0.075, -0.012], [0.255, 0.19, 0.265], cfg.corCabelo);
    }
    if (cfg.estiloCabelo === 'Topete' && !cfg.usarBone) {
      createPart(SPHERE_GEO, cabecaPivo, [0, 0.14, 0.04], [0.16, 0.09, 0.16], cfg.corCabelo);
    }
    if (cfg.estiloCabelo === 'Coque' && !cfg.usarBone) {
      createPart(SPHERE_GEO, cabecaPivo, [0, 0.17, -0.09], [0.11, 0.11, 0.11], cfg.corCabelo);
    }
    if (cfg.estiloCabelo === 'Longo') {
      createPart(CAPSULE_GEO, cabecaPivo, [0, -0.08, -0.09], [0.22, 0.13, 0.1], cfg.corCabelo);
    }
  }

  if (cfg.usarBarba) {
    createPart(SPHERE_GEO, cabecaPivo, [0, -0.075, 0.045], [0.17, 0.09, 0.13], cfg.corCabelo);
  }

  // Accessories
  if (cfg.usarBone) {
    createPart(SPHERE_GEO, cabecaPivo, [0, 0.075, -0.005], [0.265, 0.17, 0.275], cfg.corBone);
    createPart(BOX_GEO, cabecaPivo, [0, 0.055, 0.16], [0.2, 0.015, 0.13], cfg.corBone);
  }

  if (cfg.usarOculos) {
    createPart(SPHERE_GEO, cabecaPivo, [-0.05, 0.025, 0.117], [0.06, 0.048, 0.02], '#0F0F0F', false);
    createPart(SPHERE_GEO, cabecaPivo, [0.05, 0.025, 0.117], [0.06, 0.048, 0.02], '#0F0F0F', false);
    createPart(BOX_GEO, cabecaPivo, [0, 0.03, 0.118], [0.03, 0.01, 0.01], '#0F0F0F', false);
  }

  if (cfg.usarMochila) {
    createPart(BOX_GEO, corpoPivo, [0, 1.25, -0.2], [0.3, 0.38, 0.14], cfg.corMochila);
  }

  // Smartphone in right hand (for NPCs in Celular state)
  const celularObj = new THREE.Group();
  celularObj.position.set(0, -0.29, 0.06);
  const phoneBody = new THREE.Mesh(BOX_GEO, getCharacterMaterial('#141418'));
  phoneBody.scale.set(0.085, 0.16, 0.015);
  celularObj.add(phoneBody);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x55b8ff });
  const screenMesh = new THREE.Mesh(BOX_GEO, screenMat);
  screenMesh.position.set(0, 0, 0.009);
  screenMesh.scale.set(0.072, 0.14, 0.003);
  celularObj.add(screenMesh);
  celularObj.visible = false;
  armR.cotovelo.add(celularObj);

  return {
    root,
    corpoPivo,
    cabecaPivo,
    torso,
    pivoPernaE: legL.pivo,
    pivoPernaD: legR.pivo,
    joelhoE: legL.joelho,
    joelhoD: legR.joelho,
    pivoBracoE: armL.pivo,
    pivoBracoD: armR.pivo,
    cotoveloE: armL.cotovelo,
    cotoveloD: armR.cotovelo,
    celularObj,
    faseAndar: Math.random() * Math.PI * 2,
    velocidadeSuave: 0,
    sentadoFator: 0,
    deslocFase: Math.random() * Math.PI * 2,
    alturaVisual: 0,
    yawCabeca: 0,
    pitchCabeca: 0,
  };
}

export function animateCharacter(char: ArticulatedCharacter, input: CharacterAnimInput): void {
  const { dt, elapsed, speed, correndo, agachado, nadando, noAr, timerSoco, timerAceno } = input;
  if (dt <= 0) return;

  char.velocidadeSuave = THREE.MathUtils.lerp(char.velocidadeSuave, speed, 1 - Math.exp(-12 * dt));
  const tLerp = 1 - Math.exp(-14 * dt);

  char.celularObj.visible = Boolean(input.celular);

  if (nadando) {
    char.faseAndar += (2.5 + char.velocidadeSuave * 1.8) * dt;
    char.corpoPivo.position.y = THREE.MathUtils.lerp(char.corpoPivo.position.y, 0.35, tLerp);
    char.corpoPivo.rotation.x = THREE.MathUtils.lerp(char.corpoPivo.rotation.x, 68 * DEG2RAD, tLerp);
    char.corpoPivo.rotation.z = THREE.MathUtils.lerp(
      char.corpoPivo.rotation.z,
      Math.sin(char.faseAndar * 0.5) * 8 * DEG2RAD,
      tLerp,
    );

    const kick = Math.sin(char.faseAndar * 1.4) * 24 * DEG2RAD;
    char.pivoPernaE.rotation.x = THREE.MathUtils.lerp(char.pivoPernaE.rotation.x, kick, tLerp);
    char.pivoPernaD.rotation.x = THREE.MathUtils.lerp(char.pivoPernaD.rotation.x, -kick, tLerp);
    char.joelhoE.rotation.x = THREE.MathUtils.lerp(char.joelhoE.rotation.x, 18 * DEG2RAD, tLerp);
    char.joelhoD.rotation.x = THREE.MathUtils.lerp(char.joelhoD.rotation.x, 18 * DEG2RAD, tLerp);

    char.pivoBracoE.rotation.set(
      THREE.MathUtils.lerp(char.pivoBracoE.rotation.x, (-90 + Math.sin(char.faseAndar) * 55) * DEG2RAD, tLerp),
      0,
      THREE.MathUtils.lerp(char.pivoBracoE.rotation.z, -18 * DEG2RAD, tLerp),
    );
    char.pivoBracoD.rotation.set(
      THREE.MathUtils.lerp(char.pivoBracoD.rotation.x, (-90 - Math.sin(char.faseAndar) * 55) * DEG2RAD, tLerp),
      0,
      THREE.MathUtils.lerp(char.pivoBracoD.rotation.z, 18 * DEG2RAD, tLerp),
    );
    char.cotoveloE.rotation.x = THREE.MathUtils.lerp(char.cotoveloE.rotation.x, -25 * DEG2RAD, tLerp);
    char.cotoveloD.rotation.x = THREE.MathUtils.lerp(char.cotoveloD.rotation.x, -25 * DEG2RAD, tLerp);
    char.cabecaPivo.rotation.set(-52 * DEG2RAD, 0, 0);
    return;
  }

  const intensidade = THREE.MathUtils.clamp(char.velocidadeSuave / 1.4, 0, 1);
  const fatorCorrida = correndo ? THREE.MathUtils.clamp((char.velocidadeSuave - 4.0) / 3.5, 0, 1) : 0;
  char.faseAndar += dt * (2.5 + char.velocidadeSuave * (correndo ? 1.85 : 1.65));

  const ampPerna = THREE.MathUtils.lerp(32, 58, fatorCorrida) * intensidade;
  const angSeno = Math.sin(char.faseAndar);

  let pE = angSeno * ampPerna;
  let pD = -angSeno * ampPerna;
  let jE = Math.max(0, -angSeno) * THREE.MathUtils.lerp(26, 62, fatorCorrida) * intensidade;
  let jD = Math.max(0, angSeno) * THREE.MathUtils.lerp(26, 62, fatorCorrida) * intensidade;

  let bE = -angSeno * THREE.MathUtils.lerp(28, 55, fatorCorrida) * intensidade;
  let bD = angSeno * THREE.MathUtils.lerp(28, 55, fatorCorrida) * intensidade;
  let cE = THREE.MathUtils.lerp(-12, -68, fatorCorrida);
  let cD = THREE.MathUtils.lerp(-12, -68, fatorCorrida);
  let bEZ = -5;
  let bDZ = 5;

  char.sentadoFator = THREE.MathUtils.lerp(
    char.sentadoFator,
    input.sentado ? 1 : 0,
    1 - Math.exp(-8 * dt),
  );

  let corpoPosY = Math.abs(angSeno) * (correndo ? 0.07 : 0.03) * intensidade;
  let corpoRotX = fatorCorrida * 15;
  let corpoRotY = 0;
  const corpoRotZ = Math.sin(char.faseAndar) * 2.2 * intensidade;

  if (char.sentadoFator > 0.01) {
    corpoPosY = THREE.MathUtils.lerp(corpoPosY, -0.42, char.sentadoFator);
    pE = THREE.MathUtils.lerp(pE, -80, char.sentadoFator);
    pD = THREE.MathUtils.lerp(pD, -80, char.sentadoFator);
    jE = THREE.MathUtils.lerp(jE, 85, char.sentadoFator);
    jD = THREE.MathUtils.lerp(jD, 85, char.sentadoFator);
  }

  if (agachado) {
    corpoPosY -= 0.34;
    corpoRotX += 18;
    pE = pE * 0.55 - 48;
    pD = pD * 0.55 - 48;
    jE = Math.max(jE, 72);
    jD = Math.max(jD, 72);
  }

  if (noAr) {
    pE = -32;
    pD = 18;
    jE = 58;
    jD = 22;
    bE = -38;
    bD = -22;
    cE = -45;
    cD = -45;
    corpoRotX = 6;
  }

  // NPC & Player gestures
  if (timerSoco > 0) {
    const p = Math.sin((timerSoco / 0.42) * Math.PI);
    corpoRotY -= 28 * p;
    bD = THREE.MathUtils.lerp(bD, -98, p);
    cD = THREE.MathUtils.lerp(cD, -8, p);
  } else if (timerAceno > 0) {
    bD = -145;
    bDZ = 22;
    cD = -20 + Math.sin(elapsed * 12) * 22;
  } else if (input.celular) {
    bD = -52;
    cD = -72;
    bDZ = -10;
  } else if (input.assustado) {
    bDZ = 110 + Math.sin(elapsed * 18) * 15;
    bEZ = -110 - Math.sin(elapsed * 18) * 15;
    cD = -45;
    cE = -45;
  } else if (input.conversando) {
    bD = -25;
    cD = -45 + Math.sin(elapsed * 3.5 + char.deslocFase) * 18;
  }

  char.corpoPivo.position.y = THREE.MathUtils.lerp(char.corpoPivo.position.y, corpoPosY, tLerp);
  char.corpoPivo.rotation.set(
    THREE.MathUtils.lerp(char.corpoPivo.rotation.x, corpoRotX * DEG2RAD, tLerp),
    THREE.MathUtils.lerp(char.corpoPivo.rotation.y, corpoRotY * DEG2RAD, tLerp),
    THREE.MathUtils.lerp(char.corpoPivo.rotation.z, corpoRotZ * DEG2RAD, tLerp),
  );

  // Note: Three.js positive X rotation swings leg backward, negative swings forward (Unity reversed sign)
  // Using -pE * DEG2RAD matches Unity's forward-swing convention visually
  char.pivoPernaE.rotation.x = THREE.MathUtils.lerp(char.pivoPernaE.rotation.x, pE * DEG2RAD, tLerp);
  char.pivoPernaD.rotation.x = THREE.MathUtils.lerp(char.pivoPernaD.rotation.x, pD * DEG2RAD, tLerp);
  char.joelhoE.rotation.x = THREE.MathUtils.lerp(char.joelhoE.rotation.x, jE * DEG2RAD, tLerp);
  char.joelhoD.rotation.x = THREE.MathUtils.lerp(char.joelhoD.rotation.x, jD * DEG2RAD, tLerp);

  char.pivoBracoE.rotation.set(
    THREE.MathUtils.lerp(char.pivoBracoE.rotation.x, bE * DEG2RAD, tLerp),
    0,
    THREE.MathUtils.lerp(char.pivoBracoE.rotation.z, bEZ * DEG2RAD, tLerp),
  );
  char.pivoBracoD.rotation.set(
    THREE.MathUtils.lerp(char.pivoBracoD.rotation.x, bD * DEG2RAD, tLerp),
    0,
    THREE.MathUtils.lerp(char.pivoBracoD.rotation.z, bDZ * DEG2RAD, tLerp),
  );
  char.cotoveloE.rotation.x = THREE.MathUtils.lerp(char.cotoveloE.rotation.x, cE * DEG2RAD, tLerp);
  char.cotoveloD.rotation.x = THREE.MathUtils.lerp(char.cotoveloD.rotation.x, cD * DEG2RAD, tLerp);

  const cabYawTarget =
    input.headTargetYaw !== undefined
      ? input.headTargetYaw
      : intensidade < 0.1
        ? Math.sin(elapsed * 0.9 + char.deslocFase) * 14
        : 0;
  const cabPitchTarget =
    input.headTargetPitch !== undefined
      ? input.headTargetPitch
      : input.celular
        ? 30
        : agachado
          ? -12
          : -corpoRotX * 0.4;

  const th = 1 - Math.exp(-6 * dt);
  char.yawCabeca = THREE.MathUtils.lerp(char.yawCabeca, cabYawTarget, th);
  char.pitchCabeca = THREE.MathUtils.lerp(char.pitchCabeca, cabPitchTarget, th);
  char.cabecaPivo.rotation.set(char.pitchCabeca * DEG2RAD, char.yawCabeca * DEG2RAD, 0);

  const resp = 1 + Math.sin(elapsed * (correndo ? 4 : 1.7) + char.deslocFase) * 0.015;
  char.torso.scale.y = 0.3 * resp;
}
