import { VehicleConcept, VehicleTierClass } from '../types/vehicle';

export const VEHICLE_TIER_CLASSES: VehicleTierClass[] = [
  'Hipercarros & Fórmula',
  'Superesportivos & Esportivos',
  'Muscle & Clássicos',
  'Urbanos & Executivos',
  'SUVs & Off-Road',
  'Emergência & Polícia',
  'Carga & Transporte Pesado',
  'Motos, Triciclos & ATV',
  'Jet Skis & Náuticos',
  'Aviões & Helicópteros',
  'Jatos & Caças Supersônicos',
];

export interface TierMeta {
  rank: string;
  tagline: string;
  unityHandlingSummary: string;
}

export const VEHICLE_TIER_META: Record<VehicleTierClass, TierMeta> = {
  'Hipercarros & Fórmula': {
    rank: 'Classe S+',
    tagline: 'Os carros mais rápidos, aerodinâmicos e de pista extrema',
    unityHandlingSummary:
      'Downforce alto em velocidade máxima, aceleração instantânea, freios de carbono e aderência lateral máxima para circuitos e retas expressas na Unity.',
  },
  'Superesportivos & Esportivos': {
    rank: 'Classe S / A',
    tagline: 'Cupês GT, roadsters, conversíveis e hatches esportivos de alta performance',
    unityHandlingSummary:
      'Resposta rápida de direção, suspensão firme com baixo vão livre e equilíbrio entre velocidade final e controle de drift em avenidas urbanas.',
  },
  'Muscle & Clássicos': {
    rank: 'Classe B+',
    tagline: 'Motores V8 de alto torque e silhuetas retrô icônicas',
    unityHandlingSummary:
      'Tração traseira com torque forte nas saídas, traseira comunicativa para derrapagens controladas estilo GTA e suspensão clássica confortável.',
  },
  'Urbanos & Executivos': {
    rank: 'Classe C / B',
    tagline: 'Hatchbacks, sedãs executivos, peruas, táxis e vans leves do dia a dia',
    unityHandlingSummary:
      'Dirigibilidade previsível, suspensão macia para lombadas e calçadas urbanas, ideal para tráfego civil de IA e veículos iniciais do jogador.',
  },
  'SUVs & Off-Road': {
    rank: 'Classe B · 4x4',
    tagline: 'Utilitários esportivos, picapes, buggies de duna e monster trucks',
    unityHandlingSummary:
      'Curso longo de suspensão por roda, tração 4x4 e vão livre elevado para subir o morro, atravessar areia da praia e superar obstáculos sem capotar.',
  },
  'Emergência & Polícia': {
    rank: 'Classe Serviço',
    tagline: 'Viaturas policiais, interceptadores, ambulância SAMU, bombeiros e resgate',
    unityHandlingSummary:
      'Equipados com giroflex LED funcional, barras de impulsão (push-bar), suspensão reforçada e portas de acesso rápido para missões e perseguições.',
  },
  'Carga & Transporte Pesado': {
    rank: 'Classe Pesada',
    tagline: 'Ônibus urbanos/articulados, cavalos mecânicos, basculantes e betoneiras',
    unityHandlingSummary:
      'Massa elevada no Rigidbody, entre-eixos longo com rodado duplo traseiro, menor ângulo de giro em cruzamentos e torque pesado constante.',
  },
  'Motos, Triciclos & ATV': {
    rank: 'Classe Moto / Trike',
    tagline: 'Superbikes, nakeds, cruisers, trail, scooters, sport trike e quadriciclos',
    unityHandlingSummary:
      'Inclinação dinâmica nas curvas (MotoControle), agilidade extrema no corredor do trânsito, piloto visível no assento e esterçamento ágil.',
  },
  'Jet Skis & Náuticos': {
    rank: 'Classe Náutica',
    tagline: 'Jet skis freestyle/racing, lanchas offshore, botes, rebocadores e iate',
    unityHandlingSummary:
      'Flutuabilidade integrada com CidadeTriggerAgua e Rio, inclinação realista nas curvas sobre a água e propulsão por hidrojato ou hélice de popa.',
  },
  'Aviões & Helicópteros': {
    rank: 'Classe Aérea',
    tagline: 'Monomotores, hidroavião, biplano, turboélices, helicópteros e hovercraft',
    unityHandlingSummary:
      'Sustentação aerodinâmica progressiva (AeronaveControle), rotores/hélices animados em alta rotação, trem de pouso e controle de altitude W/S + Espaço/Ctrl.',
  },
  'Jatos & Caças Supersônicos': {
    rank: 'Classe Supersônica',
    tagline: 'Jato executivo VIP, caças furtivos F-22/F-16, acrobáticos e Concorde GT',
    unityHandlingSummary:
      'Empuxo pós-combustor de velocidade extrema (840 a 1680 km/h), rolagem ágil de combate, cockpit canopy articulado e decolagem rápida.',
  },
};

export function classifyVehicle(v: VehicleConcept): {
  tierClass: VehicleTierClass;
  performanceRank: string;
  classificationDescription: string;
} {
  const arch = v.geometry.archetype;
  const speed = v.unitySpec.maxSpeedKmh;

  let tierClass: VehicleTierClass;

  if (arch === 'jet') {
    tierClass = 'Jatos & Caças Supersônicos';
  } else if (arch === 'helicopter' || arch === 'airplane' || arch === 'hovercraft') {
    tierClass = 'Aviões & Helicópteros';
  } else if (
    arch === 'jetski' ||
    arch === 'speedboat' ||
    arch === 'rib_boat' ||
    arch === 'tugboat' ||
    arch === 'yacht'
  ) {
    tierClass = 'Jet Skis & Náuticos';
  } else if (
    arch === 'scooter' ||
    arch === 'sportbike' ||
    arch === 'cruiser' ||
    arch === 'dirtbike' ||
    arch === 'trike' ||
    arch === 'atv'
  ) {
    tierClass = 'Motos, Triciclos & ATV';
  } else if (v.category === 'Emergência & Polícia') {
    tierClass = 'Emergência & Polícia';
  } else if (
    arch === 'bus' ||
    arch === 'articulated_bus' ||
    arch === 'semi_truck' ||
    arch === 'dump_truck' ||
    arch === 'mixer_truck' ||
    arch === 'tow_truck' ||
    v.category === 'Carga & Transporte'
  ) {
    tierClass = 'Carga & Transporte Pesado';
  } else if (
    arch === 'suv' ||
    arch === 'pickup' ||
    arch === 'monster' ||
    (arch === 'buggy' && v.category === 'SUVs & Off-Road')
  ) {
    tierClass = 'SUVs & Off-Road';
  } else if (arch === 'formula' || (arch === 'supercar' && speed >= 310) || v.id === 57) {
    tierClass = 'Hipercarros & Fórmula';
  } else if (arch === 'muscle' || arch === 'classic' || v.id === 67) {
    tierClass = 'Muscle & Clássicos';
  } else if (
    arch === 'supercar' ||
    arch === 'coupe' ||
    arch === 'convertible' ||
    arch === 'roadster' ||
    (v.category === 'Esportivos & Super' && speed >= 218) ||
    speed >= 240
  ) {
    tierClass = 'Superesportivos & Esportivos';
  } else {
    tierClass = 'Urbanos & Executivos';
  }

  const meta = VEHICLE_TIER_META[tierClass];

  // Add vehicle-specific contextual flavor for Unity import clarity
  let specificNote = '';
  if (arch === 'formula') {
    specificNote =
      'Classificado no topo absoluto (Hipercarros & Fórmula): monoposto leve com asas F1, Halo e foco total em voltas rápidas.';
  } else if (arch === 'jetski') {
    specificNote =
      'Jet Ski ágil para a praia e rio: banco/capô articulados com motor marinho aparente e hidrojato direcional para manobras fechadas.';
  } else if (arch === 'trike') {
    specificNote =
      'Triciclo esportivo (2 rodas dianteiras + traseira larga): estabilidade superior à moto com postura agressiva de supercarro.';
  } else if (arch === 'firetruck') {
    specificNote =
      'Caminhão de bombeiros pesado com escada Magirus, persianas laterais articuladas e portas de cabine operacionais.';
  } else if (arch === 'ambulance') {
    specificNote =
      'Ambulância SAMU com portas de cabine e portas traseiras bipartidas para acesso direto à maca.';
  } else if (arch === 'jet') {
    specificNote =
      'Canopy/porta articulada e turbina pós-combustor calibrada para cruzar o mapa inteiro da cidade em segundos.';
  } else if (arch === 'helicopter') {
    specificNote =
      'Portas laterais de cabine articuladas, cockpit panorâmico com instrumentos e rotor principal de alta sustentação.';
  } else {
    specificNote = meta.unityHandlingSummary;
  }

  const classificationDescription = `${meta.rank} (${tierClass}) — ${meta.tagline}. ${specificNote}`;

  return {
    tierClass,
    performanceRank: meta.rank,
    classificationDescription,
  };
}
