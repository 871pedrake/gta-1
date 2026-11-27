import { BodyArchetype, VehicleConcept } from '../types/vehicle';

export type MechPartId =
  | 'shocks_springs'
  | 'wishbones'
  | 'bushings'
  | 'knuckle_tie_rods'
  | 'anti_roll_bar'
  | 'gearbox'
  | 'cv_joints'
  | 'drivetrain';

export type MechGroup = 'suspension_steering' | 'transmission_drivetrain';

export interface MechComponentSpec {
  id: MechPartId;
  group: MechGroup;
  name: string;
  shortSpec: string;
  description: string;
  role: string;
}

export interface DriveArchitecture {
  isElectric: boolean;
  isHybrid: boolean;
  isAWD: boolean;
  isFWD: boolean;
  isRWD: boolean;
  frontDriven: boolean;
  rearDriven: boolean;
  isMidEngine: boolean;
  isRearEngine: boolean;
}

const UNSUPPORTED_ARCHETYPES = new Set<BodyArchetype>([
  'bicycle',
  'scooter',
  'sportbike',
  'cruiser',
  'dirtbike',
  'trike',
  'atv',
  'speedboat',
  'jetski',
  'rib_boat',
  'tugboat',
  'yacht',
  'helicopter',
  'hovercraft',
  'airplane',
  'jet',
]);

export function isMechanicalSupportedVehicle(v: VehicleConcept): boolean {
  return v.geometry.wheelStyle !== 'none' && !UNSUPPORTED_ARCHETYPES.has(v.geometry.archetype);
}

export function parseDriveArchitecture(v: VehicleConcept): DriveArchitecture {
  const drive = (v.unitySpec.driveType ?? '').toLowerCase();
  const arch = v.geometry.archetype;

  const isElectric = /el[eé]tric|electric|\bev\b|bateria/.test(drive);
  const isHybrid = /h[ií]brid|hybrid/.test(drive);
  const isAWD = /awd|4x4|4wd|integral|6x4|6x6/.test(drive);
  const isFWD = !isAWD && /fwd|dianteira/.test(drive);
  const isRWD = !isAWD && !isFWD;

  const frontDriven = isAWD || isFWD;
  const rearDriven = isAWD || isRWD;

  const isMidEngine = arch === 'supercar' || arch === 'formula' || arch === 'buggy';
  const isRearEngine = arch === 'bus' || arch === 'articulated_bus';

  return {
    isElectric,
    isHybrid,
    isAWD,
    isFWD,
    isRWD,
    frontDriven,
    rearDriven,
    isMidEngine,
    isRearEngine,
  };
}

export function getSuspensionProfileLabel(v: VehicleConcept): string {
  const arch = v.geometry.archetype;
  const gc = v.geometry.groundClearance;
  if (arch === 'formula' || arch === 'supercar' || (gc > 0 && gc <= 0.14 && arch !== 'bus' && arch !== 'articulated_bus')) {
    return 'Esportiva Rebaixada';
  }
  if (
    arch === 'monster' ||
    arch === 'buggy' ||
    arch === 'pickup' ||
    arch === 'suv' ||
    arch === 'atv' ||
    arch === 'dirtbike' ||
    gc >= 0.24
  ) {
    if (
      arch === 'semi_truck' ||
      arch === 'dump_truck' ||
      arch === 'mixer_truck' ||
      arch === 'firetruck' ||
      arch === 'tow_truck' ||
      arch === 'bus' ||
      arch === 'articulated_bus' ||
      arch === 'armored'
    ) {
      return 'Carga Pesada / Reforçada';
    }
    return 'Elevada Off-Road / 4x4';
  }
  if (
    arch === 'semi_truck' ||
    arch === 'dump_truck' ||
    arch === 'mixer_truck' ||
    arch === 'firetruck' ||
    arch === 'tow_truck' ||
    arch === 'bus' ||
    arch === 'articulated_bus' ||
    arch === 'armored'
  ) {
    return 'Carga Pesada / Reforçada';
  }
  return 'Padrão Urbano / Passeio';
}

export function getVehicleMechanicalSpecs(v: VehicleConcept): MechComponentSpec[] {
  const arch = v.geometry.archetype;
  const gcCm = Math.round(v.geometry.groundClearance * 100);
  const drive = parseDriveArchitecture(v);
  const isHyperOrSuper = arch === 'supercar' || v.unitySpec.maxSpeedKmh >= 295;
  const isFormula = arch === 'formula';
  const isMonster = arch === 'monster';
  const isBuggy = arch === 'buggy';
  const isOffroad = arch === 'pickup' || arch === 'suv' || v.geometry.groundClearance >= 0.23;
  const isHeavy =
    arch === 'semi_truck' ||
    arch === 'dump_truck' ||
    arch === 'mixer_truck' ||
    arch === 'firetruck' ||
    arch === 'tow_truck' ||
    arch === 'bus' ||
    arch === 'articulated_bus' ||
    arch === 'armored';

  const shocksSpec = isFormula
    ? `Inboard pushrod + molas helicoidais (${gcCm} cm)`
    : isMonster || isBuggy
      ? `Coilovers longo curso c/ reservatório (${gcCm} cm)`
      : isHeavy
        ? `Amortecedores hidráulicos + feixe/bolsa (${gcCm} cm)`
        : isOffroad
          ? `Amortecedores reforçados longo curso (${gcCm} cm)`
          : isHyperOrSuper
            ? `Coilovers monotubo esportivos (${gcCm} cm)`
            : `Conjunto mola-amortecedor urbano (${gcCm} cm)`;

  const wishbonesSpec = isMonster
    ? 'Braços 4-link + barra Panhard'
    : isHeavy
      ? 'Bandejas reforçadas / eixos rígidos'
      : isFormula || isHyperOrSuper
        ? 'Duplo A (Double Wishbone) em liga leve'
        : 'Bandejas triangulares superior e inferior';

  const bushingsSpec = isFormula || isHyperOrSuper
    ? 'Buchas esféricas e poliuretano 95A'
    : isMonster || isHeavy
      ? 'Buchas elastoméricas de alta carga'
      : 'Buchas de borracha vulcanizada c/ aço';

  const knuckleSpec = isFormula
    ? 'Mangas de carbono + caixa direta'
    : isMonster || isHeavy
      ? 'Mangas forjadas + barra de direção'
      : 'Caixa pinhão-cremalheira + terminais';

  const swaySpec = isFormula
    ? 'Barras torsionais internas dianteira/traseira'
    : isHeavy
      ? 'Barras estabilizadoras tubulares grossas'
      : 'Barras estabilizadoras dianteira e traseira';

  const gearboxSpec = isFormula
    ? 'Sequencial 8 marchas longitudinal traseiro'
    : isHyperOrSuper && drive.isMidEngine
      ? drive.isHybrid
        ? 'DCT 7 marchas central + e-Axle frontal'
        : 'DCT 7 marchas longitudinal central-traseiro'
      : drive.isElectric
        ? 'Redutor planetário de relação única'
        : drive.isAWD
          ? 'Automático multi-marchas + caixa transf.'
          : drive.isFWD
            ? 'Transaxle transversal integrado'
            : 'Câmbio longitudinal + carcaça alumínio';

  const cvSpec =
    drive.frontDriven && drive.rearDriven
      ? '4 semieixos c/ coifas sanfonadas'
      : drive.rearDriven
        ? 'Semieixos traseiros c/ juntas homocinéticas'
        : 'Semieixos dianteiros c/ juntas e coifas';

  const drivetrainSpec =
    drive.isHybrid && drive.isMidEngine && drive.isAWD
      ? `AWD Híbrido: dif. traseiro + e-Axle dianteiro`
      : drive.isAWD
        ? `${v.unitySpec.driveType}: cardã + diferenciais ant./post.`
        : drive.rearDriven
          ? `${v.unitySpec.driveType}: eixo cardã + diferencial traseiro`
          : `${v.unitySpec.driveType}: diferencial integrado dianteiro`;

  return [
    {
      id: 'shocks_springs',
      group: 'suspension_steering',
      name: 'Amortecedores e molas',
      shortSpec: shocksSpec,
      description:
        'Absorvem os impactos do solo, dissipam energia cinética e mantêm o contato constante dos pneus com o asfalto, garantindo estabilidade em frenagens e irregularidades.',
      role: isFormula
        ? 'Atuadores horizontais acionados por hastes pushrod mantêm a altura aerodinâmica constante em alta velocidade.'
        : isHyperOrSuper
          ? 'Conjunto coilover de corpo roscado e vão livre reduzido maximiza o efeito solo e a precisão em curvas.'
          : isOffroad || isMonster || isBuggy
            ? 'Curso ampliado de molas e amortecedores com maior número de espiras garante absorção de impactos e vão livre elevado em trilhas e terrenos acidentados.'
            : 'Calibração urbana com vão livre equilibrado absorve lombadas, valetas e piso irregular preservando conforto e folga nos para-lamas.',
    },
    {
      id: 'wishbones',
      group: 'suspension_steering',
      name: 'Bandejas (ou balanças)',
      shortSpec: wishbonesSpec,
      description:
        'Sustentam o conjunto da suspensão ligando as mangas de eixo ao subchassi e à carroceria, controlando o curso vertical, o ângulo de cambagem e o cáster das rodas.',
      role: isMonster
        ? 'Braços tensores 4-link ancoram os eixos rígidos ao chassi elevado para suportar grandes articulações.'
        : 'Geometria em triângulo (braços superior e inferior) isola forças laterais em curvas mantendo a folga com para-lamas.',
    },
    {
      id: 'bushings',
      group: 'suspension_steering',
      name: 'Buchas',
      shortSpec: bushingsSpec,
      description:
        'Absorvem vibrações de alta frequência e reduzem ruídos entre peças metálicas nos pontos de articulação das bandejas e da barra estabilizadora.',
      role: 'Casquilhos metálicos revestidos em elastômero/poliuretano evitam contato metal-metal e preservam o alinhamento sob carga.',
    },
    {
      id: 'knuckle_tie_rods',
      group: 'suspension_steering',
      name: 'Pivô, bieleta e terminal de direção',
      shortSpec: knuckleSpec,
      description:
        'Ligam os componentes da suspensão, a caixa de direção e a barra estabilizadora às rodas, permitindo esterçamento preciso e articulação livre em todos os ângulos.',
      role: 'Mangas de eixo articuladas por pivôs recebem o movimento da cremalheira via terminais axiais enquanto as bieletas acoplam a barra estabilizadora.',
    },
    {
      id: 'anti_roll_bar',
      group: 'suspension_steering',
      name: 'Barra estabilizadora',
      shortSpec: swaySpec,
      description:
        'Barra de torção transversal que conecta os lados esquerdo e direito da suspensão para reduzir a inclinação (rolagem) da carroceria em curvas rápidas.',
      role: 'Ao comprimir a roda externa na curva, torce elasticamente transferindo parte da carga para o lado interno sem endurecer o curso reto.',
    },
    {
      id: 'gearbox',
      group: 'transmission_drivetrain',
      name: 'Câmbio (caixa de marchas)',
      shortSpec: gearboxSpec,
      description:
        'Controla a relação de marchas e multiplica o torque entregue pelo conjunto propulsor de acordo com a velocidade e a demanda de aceleração.',
      role:
        drive.isHybrid && drive.isMidEngine && drive.isAWD
          ? 'Transaxle central-traseiro de dupla embreagem trabalha em conjunto com o redutor elétrico dianteiro para respostas instantâneas.'
          : 'Carcaça nervurada em liga leve abriga o trem de engrenagens e o acoplamento de saída para os eixos motrizes.',
    },
    {
      id: 'cv_joints',
      group: 'transmission_drivetrain',
      name: 'Juntas homocinéticas e coifas',
      shortSpec: cvSpec,
      description:
        'Transmitem força do câmbio e dos diferenciais para as rodas mesmo sob esterçamento e movimento vertical da suspensão, protegendo as esferas com graxa sob coifas sanfonadas.',
      role: 'Semieixos articulados nas pontas interna e externa mantêm velocidade angular constante em todas as rodas tracionadas.',
    },
    {
      id: 'drivetrain',
      group: 'transmission_drivetrain',
      name: 'Eixo de transmissão / diferencial',
      shortSpec: drivetrainSpec,
      description:
        'Distribuem a força do motor e do câmbio entre os eixos e permitem que as rodas esquerda e direita girem em velocidades diferentes ao contornar curvas.',
      role:
        drive.isHybrid && drive.isMidEngine && drive.isAWD
          ? 'Diferencial traseiro autoblocante e unidade diferencial dianteira conectam-se pela espinha estrutural central de alta tensão.'
          : drive.rearDriven
            ? 'Eixo cardã longitudinal com juntas universais e mancal central alimenta o diferencial traseiro com pinhão e coroa.'
            : 'Diferencial dianteiro integrado distribui o torque diretamente aos semieixos homocinéticos dianteiros.',
    },
  ];
}
