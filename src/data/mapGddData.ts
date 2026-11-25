export interface GddZoneSpec {
  id: 'downtown' | 'condos' | 'corporate' | 'shops' | 'residential' | 'school' | 'beach' | 'morro' | 'plaza' | 'river';
  name: string;
  shortLabel: string;
  boundsLabel: string;
  colorHex: string;
  svgRect: { x: number; z: number; w: number; d: number };
  summary: string;
  blocks: string[];
  assets: string[];
  unityRules: string[];
}

export interface GddMorroFix {
  id: string;
  area: string;
  bugBefore: string;
  fixApplied: string;
  unityPortRule: string;
}

export interface GddSeparationRule {
  district: string;
  coordinates: string;
  borderRule: string;
  whatRemoved: string;
  whatAdded: string;
}

export interface GddExplicitRule {
  code: string;
  title: string;
  scope: string;
  rule: string;
  unityRequirement: string;
}

export const GDD_MAP_METRICS = [
  { label: 'Desnível Total', value: '-0,85m → +13,8m', note: 'Cais/Praia (-0,85m), Baixada (0m), Alta (+9m), Mirante (+13,8m)' },
  { label: 'Malha Viária Expandida', value: 'X ∈ [-153, +153]', note: 'Avenidas externas X=±148 + 6 quadras largas de 33m × 23m' },
  { label: 'Prédios 2-em-1 & Vendas', value: '6 Complexos Novos', note: '3 residenciais largos 2-em-1 + 3 vendas c/ outdoors & estacionamento' },
  { label: 'Residencial & Escola', value: '10 Quadras + E.M.', note: '40 lotes murados, E.M. Cidade Nova (-17,-85) & Mirante (+13,8m)' },
  { label: 'Shopping, Comida & Moda', value: '7 Quadras + Quiosques', note: 'Shopping, Gastronomia (+51), Moda (+85) & Quiosques da Praia' },
  { label: 'Hidrologia & Botânica', value: 'Rio + Baía + Ilha', note: 'Nascente (84,114) → Rio (5 barcos) + Praia Oeste, Ilha do Sol & Reflorestamento' },
];

export const GDD_EXPLICIT_RULES: GddExplicitRule[] = [
  {
    code: 'REGRA-01',
    title: 'Relevo Escalonado com Parte Mais Baixa (-0,85m) e Parte Mais Alta (+13,8m)',
    scope: 'cityElevation · Cais Baixo, Baixada, Ladeiras & Mirante Sul',
    rule: 'Todo o mapa urbano deve respeitar a curva altimétrica unificada: leito do Rio (-1,25m) e Cais Baixo com píer náutico (-0,85m) formando a parte mais baixa; Baixada (0,00m); Terraço Comercial (+2,25m); Av. Panorâmica Média (+4,50m); Residencial 1 (+6,75m); Cidade Alta (+9,00m); e o platô do Mirante Alto da Serra Sul (+13,80m) formando a parte urbana mais alta conectada por rampa pavimentada em X = 0.',
    unityRequirement: 'Replicar cityRoadY(z), blockTerraceY(z) e cityBasinTerrainY(x,z) no C# mantendo saias de arrimo (≥2,8m) em todos os platôs elevados e inclinação de pitch nos veículos nas duas ladeiras.',
  },
  {
    code: 'REGRA-02',
    title: 'Hidrologia Contínua: Nascente na Serra + Córrego Sinuoso + Rio com Barcos',
    scope: 'Morro Norte (84,114) · Galeria Marginal (Z=34) · Rio Central (Z=8..26)',
    rule: 'A água nasce obrigatoriamente na Nascente rochosa com cachoeira na Serra Norte (X=+84, Z=+114), percorre o Córrego sinuoso (creekCenterX) entre pedras musgosas, corredeiras espumantes e pinguela de madeira (Z=62), passa por galeria sob a Marginal Norte (Z=34) e deságua no Rio Central navegável, onde operam embarcações reais do catálogo (4 navegando + 1 atracada no píer do Cais Baixo).',
    unityRequirement: 'Usar shader único de água corrente (UV scroll X/Y sincronizado), CidadeAguaAnimada e CidadeTriggerAgua no canal principal + colisor de ponte/galeria em Z=34.',
  },
  {
    code: 'REGRA-03',
    title: 'Vegetação Botânica Multi-Polígono (Proibido Árvore ou Arbusto de 1 Polígono)',
    scope: 'cityVegetation · Ipês, Árvores Urbanas, Mata Atlântica, Palmeiras & Arbustos',
    rule: 'Nenhuma árvore ou arbusto pode ser modelado como um único cilindro/cone/esfera. Árvores folhosas exigem raízes sapopembas, tronco curvado em segmentos, 4 galhos primários bifurcados, 4 sub-ramos e copa de 13 aglomerados de folhagem orgânica; palmeiras exigem tronco anelado em 6 segmentos, palmito e 11 frondes arqueadas em 2 estágios; arbustos exigem 7 moitas orgânicas com botões florais coloridos.',
    unityRequirement: 'Usar prefabs LOD0 com meshes fundidas em dois draw calls por espécie (tronco + copa instanciada com shader de vento sincronizado à Bandeira) e manter o leito do córrego livre de troncos.',
  },
  {
    code: 'REGRA-04',
    title: 'Sinalização Viária Rica & Pontos de Ônibus Modernos Fora da Pista',
    scope: 'Pórticos Viários · Placas de Esquina · Mapas · Abrigos Linha 50',
    rule: 'A cidade deve conter pórticos metálicos aéreos sobre avenidas arteriais (vão livre ≥5,6m), placas azuis de nome de rua nas esquinas, totens iluminados de mapa guia, placas regulamentares/advertência (PARE, 60 km/h, Ladeira 11%, Faixa de Pedestre, Proibido Estacionar, Placas Turísticas de Nascente e Mirante) e abrigos de ônibus completos (4 pilares, teto iluminado, vidro, banco apoiado em 3 pés, painel MUPI e totem Linha 50 sempre sobre a calçada).',
    unityRequirement: 'Nunca posicionar abrigos, bancos ou placas dentro da caixa de rolamento (10,4m); manter clearance mínimo de 5,3m sob pórticos e passarela.',
  },
  {
    code: 'REGRA-05',
    title: 'Coerência Espacial: Zero Lojas Sem Sentido no Morro ou Viradas Contra Muros',
    scope: 'Base do Morro (Z=38,8) · Terraço Z=-51 · Rua das Lojas Z=-23,5',
    rule: 'Lojas não podem invadir o leito de avenidas (ex.: X=-34) nem olhar contra muros de arrimo ou fundos de prédios. Na base do Morro da Esperança são permitidos exclusivamente comércios comunitários autênticos (Mercearia Esperança, Espetinho da Laje, Açaí do Morro, Corte Real Barber) posicionados nos intervalos livres entre avenidas e escadões; no Terraço Z=-51, fachadas da face sul devem abrir para avenidas transversais ou escadas traseiras.',
    unityRequirement: 'Validar orientação (forward vector voltado para calçada pública acessível na NavMesh) e testar AABB contra a malha viária antes do Bake no Unity.',
  },
  {
    code: 'REGRA-06',
    title: 'Contraste Brasileiro: Escola Pública, Praia Oeste, Ponte, Ilha do Sol & Reflorestamento',
    scope: 'E.M. Cidade Nova (-17,-85) · Praia Oeste (X < -171) · Ilha do Sol (-236,-14)',
    rule: 'A cidade integra contraste urbano legível: Morro da Esperança no maciço Norte; setor financeiro e Cidade Alta; Escola Pública E.M. Cidade Nova (-17,-85 @ +6,75m) com escada/rampa e Área Escolar; e no flanco esquerdo (-X) a Praia Oeste conectada pela Av. Beira-Mar (-162), calçadão em pedra portuguesa, Ponte em Arco com píer e trilha completa cercando a Ilha do Sol (-236,-14), envolvida por amplo reflorestamento multi-espécie.',
    unityRequirement: 'Manter a muralha sul do rio contínua até X = -171,6, gerar terreno contínuo da Praia Oeste/Baía/Ilha via cityBasinTerrainY e InstancedMesh botânico nas zonas de reflorestamento.',
  },
];

export const GDD_ZONES: GddZoneSpec[] = [
  {
    id: 'downtown',
    name: 'Área de Prédios · Torres & Complexos Duplos',
    shortLabel: 'Prédios (Oeste)',
    boundsLabel: 'X ∈ [-102, -34] · Z ∈ [-62.5, +7.5] · Y = 0m / +2,25m',
    colorHex: '#38bdf8',
    svgRect: { x: -102, z: -62.5, w: 68, d: 70 },
    summary:
      'Setor vertical detalhado no quadrante Centro-Oeste em dois patamares (0,0m e +2,25m). Abandona caixas simples para adotar prédios maiores escalonados, prédios duplos ligados por passarelas, fundações em granito, portas duplas de vidro, sacadas e condensadores de ar-condicionado 3D.',
    blocks: [
      'Supertall Horizonte Brasil (-85,-17 @ 0m): Torre maior 80m+antena com exo-colunas, sky-terrace em 49m, anexo corporativo e 2 portarias',
      'Edifício Gêmeo Paulista (-51,-17 @ 0m): Prédios duplos (50m) unidos por núcleo de elevadores e passarelas + 13 andares de sacadas + guarita',
      'Residencial Vista Alta (-51,-51 @ +2,25m): Molduras brancas em C/L envolvendo sacadas de vidro + pilhas laterais de AC',
      'Complexo Duplo Atlântico (-85,-51 @ +2,25m): Duas torres escalonadas (52m & 38m) sobre portal vermelho estilo Paulista + passarela',
    ],
    assets: [
      'Fundações escalonadas em granito ancoradas abaixo da calçada + pilotis, marquises iluminadas e portas duplas de vidro',
      'Centenas de unidades condensadoras de ar-condicionado (caixa + ventoinha + duto vertical) nas laterais e casas de máquinas/chillers no topo',
      'Gradis frontais, portões de garagem com balizadores e canteiros de arbustos na entrada',
    ],
    unityRules: [
      'Layer dedicada "Edificios" com BoxCollider separado para fundação/pódio e corpo das torres',
      'GPU Instancing obrigatório para sacadas, vidros, molduras em C, portas de lobby, condensadores de AC e chillers de cobertura',
      'Separada do Shopping pela Praça da Bandeira (-17,-17) e da Cidade Alta pela Ladeira 1',
    ],
  },
  {
    id: 'condos',
    name: 'Prédios Largos de Moradia · 2 em 1',
    shortLabel: 'Moradia Larga (2-em-1)',
    boundsLabel: 'X = ±125 (33m × 23m) · (-125,-51/-85) e (+125,-85)',
    colorHex: '#a855f7',
    svgRect: { x: -141.5, z: -96.5, w: 33, d: 57 },
    summary:
      'Três condomínios residenciais largos (~30m de largura) assentados em quadras expandidas de 33m × 23m nas avenidas externas X = ±148. Cada complexo une duas alas habitacionais completas através de átrio envidraçado central e três passarelas aéreas.',
    blocks: [
      'Residencial Duplo Alvorada (-125, -51 @ +2,25m): Duas alas ligadas por 3 passarelas de vidro, 9 andares de sacadas N/S e 2 portarias',
      'Condomínio Largo Serra Bela (-125, -85 @ +6,75m): Fachada quente com molduras escuras, guarita, gradil e garagens duplas',
      'Residencial Duplo Mirante Leste (+125, -85 @ +6,75m): Torres gêmeas envidraçadas no flanco leste com pilhas de AC e chillers',
    ],
    assets: [
      'Fundações em granito contínuo (-1,4m abaixo da calçada), pódios compartilhados e duas portarias de vidro duplo com marquise',
      'Dezenas de sacadas largas com guarda-corpo de vidro nas fachadas Norte/Sul + pilhas laterais de condensadores 3D de ar-condicionado',
      'Gradis frontais com guarita, portões de garagem duplos, caixas d’água azuis e heliponto/antena na cobertura',
    ],
    unityRules: [
      'Manter espaçamento livre de 1,3m nas calçadas entre X = ±107,2 e os bulevares externos X = ±148',
      'Consolidar sacadas, molduras e pilhas de ar-condicionado via GPU Instancing com único BoxCollider composto por ala',
    ],
  },
  {
    id: 'corporate',
    name: 'Prédios de Vendas, Outdoors & Estacionamentos',
    shortLabel: 'Vendas & Outdoors',
    boundsLabel: 'X = ±125 (33m × 23m) · (-125,-17) e (+125,-17/-51)',
    colorHex: '#22d3ee',
    svgRect: { x: 108.5, z: -62.5, w: 33, d: 57 },
    summary:
      'Três complexos empresariais de vendas em quadras de 33m × 23m servidos pelas avenidas perimetrais X = ±148. Combinam torres corporativas com showrooms em vidro duplo, grandes outdoors iluminados (topo e esquina) e estacionamentos pavimentados completos.',
    blocks: [
      'Complexo Empresarial Oeste (-125, -17 @ 0,0m): Torre Nexus (30m) + anexo, outdoor de topo + outdoor viário e estacionamento Leste',
      'Centro de Vendas Leste (+125, -17 @ 0,0m): Estacionamento frontal ao Shopping + torre envidraçada (33,5m) com outdoors Metrópole/Alvorada',
      'Hub de Vendas Sul-Leste (+125, -51 @ +2,25m): Showroom de 2 andares + torre com brises + estacionamento lateral com outdoor',
    ],
    assets: [
      '6 outdoors metálicos em treliça iluminados com holofotes (Nexus B2B, Vanguarda Business, Alvorada Trade e Metrópole Prime)',
      '3 estacionamentos completos com asfalto escuro, guias, faixas brancas, bate-rodas amarelos, guarita, cancela vermelho-branca e postes LED',
      'Frota de carros instanciados estacionados nas vagas + portas de vidro duplo, fundações em granito e pilhas de AC',
    ],
    unityRules: [
      'Manter os outdoors com shader Unlit/Emission controlado por ciclo Dia/Noite e fora da faixa de rolamento das avenidas',
      'Adicionar NavMeshObstacle na cancela e BoxCollider leve nas vagas ocupadas dos estacionamentos',
    ],
  },
  {
    id: 'plaza',
    name: 'Praça da Bandeira · Marco Cívico',
    shortLabel: 'Praça (-17, -17)',
    boundsLabel: 'X ∈ [-28.5, -5.5] · Z ∈ [-28.5, -5.5] · Y = 0,0m',
    colorHex: '#f59e0b',
    svgRect: { x: -28.5, z: -28.5, w: 23, d: 23 },
    summary:
      'Quadra cívica 100% desobstruída na Cidade Baixa (0,0m) que funciona como respiro urbano e transição entre os Prédios a Oeste e o Shopping/Comércio a Leste, agora equipada com totem iluminado de Guia da Cidade.',
    blocks: ['Quadra única central (-17, -17) com calçamento Rosa dos Ventos e sem lojas invasoras'],
    assets: [
      'Pedestal octogonal de 3 degraus + mastro telescópico 19,6m + totem Mapa Guia (-17, -9,4)',
      'Bandeira 3D de alta malha (56×34 vértices) com simulação de vento',
      '4 Ipês botânicos multi-galho nos cantos, 4 bancos em madeira/ferro e pares de NPCs',
    ],
    unityRules: [
      'Bandeira com Cloth ou Vertex Shader compartilhando parâmetro global de vento das árvores',
      'Área totalmente Walkable na NavMesh para NPCs sentados e em conversa',
    ],
  },
  {
    id: 'shops',
    name: 'Shopping, Comida & Lojas de Roupa',
    shortLabel: 'Shopping & Lojas (Leste)',
    boundsLabel: 'X ∈ [-28.5, +102] · Z ∈ [-62.5, +7.5] · Y = 0m / +2,25m',
    colorHex: '#fb923c',
    svgRect: { x: -28.5, z: -62.5, w: 130.5, d: 70 },
    summary:
      'Corredor comercial completo em dois níveis: âncoras na Baixada (0,0m) e três polos temáticos no Terraço (+2,25m), com todas as vitrines voltadas para ruas/avenidas abertas e pontos de ônibus modernos com mapa de rota.',
    blocks: [
      'Baixada (Z = -17, Y = 0,0m): Shopping Metrópole (+17), Passarela (+34), Estacionamento (+51), Galeria Moda & Multiplex (+85) + Açaí Tropical & Eletrônicos BR voltados para Z = -34',
      'Terraço Café & Tech (-17, -51 @ +2,25m): Café Carioca, Cyber 50 (Norte) + Express 24H e Barbearia (laterais Leste/Oeste)',
      'Terraço Automotivo (+17, -51 @ +2,25m): Motors 50 (vitrine giratória) e Oficina Turbo (face lateral aberta)',
      'Polo Gastronômico (+51, -51 @ +2,25m): Burger 50, Pizzaria Nobile, Churrascaria Brasa (Oeste) e Padaria Pão Quente (Leste)',
      'Polo Moda & Roupa (+85, -51 @ +2,25m): Moda Urbana, Atelier Vestir, Tênis & Sneakers (Oeste) e Farmácia Popular (Leste)',
    ],
    assets: [
      'Vitrines 2.5D temáticas: araras e manequins nas lojas de roupa; balcões e guarda-sóis nas lojas de comida',
      'Escadarias frontais (Z = -39,5) + escadas de serviço traseiras (Z = -59,8) no terraço +2,25m',
      'Abrigos de ônibus com 4 pilares, vidro, painel MUPI iluminado, banco com 3 pés e totem Linha 50',
    ],
    unityRules: [
      'Pé-direito livre de 5,3m sob a Passarela (+34) e 5,6m sob os pórticos viários',
      'OffMeshLinks na Passarela (+34,-17) e nas escadarias Z = -39,5 e Z = -59,8',
      'Zero lojas olhando contra o barranco da Ladeira 1 (Z = -62,5)',
    ],
  },
  {
    id: 'residential',
    name: 'Área de Residência · Cidade Alta & Mirante Sul',
    shortLabel: 'Residencial + Mirante (+13,8m)',
    boundsLabel: 'X ∈ [-102, +102] · Z ∈ [-152, -68] · Y = +6,75m / +9m / +13,8m',
    colorHex: '#34d399',
    svgRect: { x: -102, z: -150, w: 204, d: 82 },
    summary:
      'Bairro residencial elevado na Cidade Alta (+6,75m e +9,0m) coroado ao Sul pela parte urbana mais alta do mapa: o Mirante Alto da Serra Sul (+13,8m) com rampa asfaltada, guarda-corpo de vidro e vista panorâmica até o Rio e o Morro.',
    blocks: [
      'Av. Panorâmica Média (Z = -68, Y = +4,50m) com 2 rotatórias arborizadas (-68,-68 e +68,-68)',
      'Patamar Intermediário (Z = -85, Y = +6,75m): 4 quadras residenciais, Escola Pública E.M. (-17,-85) e Parque do Bairro (+17,-85)',
      'Platô Cidade Alta (Z = -119, Y = +9,00m): 6 quadras residenciais simétricas (40 lotes murados nos 4 lados)',
      'Mirante Alto da Serra Sul (X = 0, Z = -144, Y = +13,80m): Rampa panorâmica, terraço em granito, obelisco, lunetas e Ipês',
    ],
    assets: [
      '40 lotes murados com quintal, varanda, garagem, telha cerâmica e caixa d’água alinhada',
      'Avenidas N–S inclinadas (~11°) com placas de advertência de ladeira e pórtico direcional',
      'Arbustos floridos e árvores multi-galho envolvendo calçadas, rotatórias e o Mirante Sul',
    ],
    unityRules: [
      'Veículos aplicam pitch dinâmico proporcional a cityRoadSlopeDZ(z) entre 0m e +9,0m',
      'Rampa do Mirante Sul (Z = -124..-144) usa cityBasinTerrainY(0, z) com MeshCollider contínuo',
      'Nenhuma construção residencial fora de X ∈ [-102, +102]',
    ],
  },
  {
    id: 'school',
    name: 'Escola Pública E.M. Cidade Nova',
    shortLabel: 'Escola (-17, -85)',
    boundsLabel: 'X ∈ [-28.5, -5.5] · Z ∈ [-96.5, -73.5] · Y = +6,75m',
    colorHex: '#facc15',
    svgRect: { x: -28.5, z: -96.5, w: 23, d: 23 },
    summary:
      'Equipamento público integrado à malha residencial em frente ao Parque do Bairro (+17,-85), com acesso por escadaria e rampa à Av. Panorâmica Média (+4,5m), pátio com quadra poliesportiva, papelaria de esquina e transporte escolar.',
    blocks: [
      'Quadra Escolar (-17,-85 @ +6,75m): Bloco de aulas em L com 2 pavimentos, varanda coberta e telhado cerâmico',
      'Frente Viária (Z = -68 @ +4,5m): Escadaria em granito + rampa acessível, faixa amarela escolar e Escolar Amarelinho (VHC-33)',
      'Esquina Leste: Quiosque Papelaria do Estudante voltado à Av. Central (X = 0)',
    ],
    assets: [
      'Muro baixo com gradil metálico, pórtico de entrada iluminado e bandeira no pátio',
      'Quadra poliesportiva pintada em azul/terracota com tabelas e Ipê/árvore frondosa na entrada',
      'Duas placas de advertência Área Escolar e NPCs conversando no portão, pátio e papelaria',
    ],
    unityRules: [
      'Conectar calçada da Av. Panorâmica (+4,5m) ao pátio (+6,75m) via OffMeshLinks na escada e rampa',
      'Manter Escolar Amarelinho estacionado fora da faixa de rolamento principal (-71,8)',
    ],
  },
  {
    id: 'beach',
    name: 'Praia Oeste, Ponte, Ilha do Sol & Reflorestamento',
    shortLabel: 'Praia & Ilha (Oeste)',
    boundsLabel: 'X ∈ [-262, -162] · Z ∈ [-46, +14] · Y = -2,6m → +6,4m',
    colorHex: '#fde047',
    svgRect: { x: -260, z: -44, w: 96, d: 58 },
    summary:
      'Orla balneária completa no flanco esquerdo (-X) do mapa, sem colisões de relevo: Av. Beira-Mar Oeste (-162), calçadão em pedra portuguesa, faixa plana e curva de areia dourada, Ponte em Arco com píer náutico até a Ilha do Sol (-236,-14) e trilha perimetral envolvida por reflorestamento de Mata Atlântica, Ipês e coqueiros.',
    blocks: [
      'Acesso & Orla Oeste (-162..-171,6): Av. Beira-Mar conectada às ruas Z=0 e Z=-34 + Calçadão Copacabana e 2 quiosques voltados ao mar',
      'Areia Plana & Lazer (-171,6..-190): Platô nivelado (+0,18m→+0,02m) com futevôlei, posto salva-vidas, guarda-sóis e transição suave até -1,25m',
      'Ponte & Trilha da Ilha do Sol (-208..-260): Ponte em arco sobre a lagoa com píer lateral e trilha contínua ao redor da ilha e do Mirante',
      'Reflorestamento Amplo: Coqueiros, Ipês e Mata Atlântica preenchendo a Ilha, Bosque Noroeste, Costão Sudoeste e Serra Sul',
    ],
    assets: [
      'Malha arenosa orgânica sem recorte de muro, espuma acompanhando a curva da maré e anel de arrebentação em volta da ilha',
      'Ponte em madeira/pedra com pilares submersos (-2,8m), balizadores LED e embarcação atracada no píer',
      'Centenas de árvores botânicas multi-galho instanciadas cobrindo a ilha e reservas florestais periféricas',
    ],
    unityRules: [
      'Usar westMainlandBeachY e westIslandTerrainY integrados ao TerrainCollider contínuo sem recortes na muralha principal do rio',
      'Conectar Calçadão (-169) → Ponte (-171..-208) → Trilha da Ilha via NavMeshLinks contínuos',
    ],
  },
  {
    id: 'river',
    name: 'Cais Baixo (-0,85m), Rio & 5 Pontes',
    shortLabel: 'Cais Baixo & Rio (-1,25m)',
    boundsLabel: 'X ∈ [-108, +108] · Z ∈ [5.0, 26.5] · Y = -1,25m / -0,85m',
    colorHex: '#0ea5e9',
    svgRect: { x: -108, z: 5, w: 216, d: 21.5 },
    summary:
      'Parte mais baixa da metrópole: canal fluvial navegável (-1,25m) com Cais Baixo (-0,85m) em degraus de granito, píer náutico em madeira com embarcação atracada e 4 barcos do catálogo navegando sob 5 pontes niveladas.',
    blocks: [
      'Cais Baixo (-0,85m): Dois terraços em granito flanqueando a Ponte Central (X = -18 e +18, Z = 6,6..9,6) com escadarias e balizadores',
      'Píer Náutico Oeste (-18, Z = 10,6): Estacas submersas, boia salva-vidas, cabeços de amarração e anfíbio/lancha atracada',
      '5 Pontes N–S niveladas (Y = 0,04m): Estaiada Oeste (-68), Arco (-34), Estaiada Central (0), Concreto (+34), Estaiada Leste (+68)',
    ],
    assets: [
      'Água reflexiva com escoamento animado em U/V (CidadeAguaAnimada + CidadeTriggerAgua)',
      '4 embarcações reais navegando (VHC-44 Lancha Ipanema, VHC-45 Jet Ski, VHC-46 Bote Resgate, VHC-47 Rebocador) + VHC-50 atracado',
      'Calçadões com palmeiras segmentadas de 11 frondes arqueadas e arbustos floridos',
    ],
    unityRules: [
      'Tabuleiros das 5 pontes nivelados em Y = 0,04m; Cais Baixo acessível por OffMeshLink nas escadas Z = 5,4..6,8',
      'Manter faixas de navegação dos barcos (Z = 14..21) desobstruídas do píer (Z <= 13)',
    ],
  },
  {
    id: 'morro',
    name: 'Morro da Esperança · Nascente & Córrego',
    shortLabel: 'Morro & Nascente (Norte)',
    boundsLabel: 'X ∈ [-66, +66] · Nascente (84,114) · Z ∈ [41.5, 134]',
    colorHex: '#fb7185',
    svgRect: { x: -104, z: 41.5, w: 208, d: 92 },
    summary:
      'Maciço Norte com favelas concentradas (|X| <= 66), 4 comércios comunitários autênticos fora das avenidas, e no flanco Leste a Nascente da Serra (+84, +114) formando o Córrego da Esperança até desaguar no Rio.',
    blocks: [
      'Nascente (+84, +114) & Córrego Sinuoso (X ≈ 84..86): Poço rochoso com cascata, pedras musgosas, corredeiras, ponte de madeira (Z=62) e galeria sob a Marginal (Z=34)',
      'Base Comercial Autêntica (Z = 38,8): Mercearia Esperança (-56,0), Espetinho da Laje (-24,8), Açaí do Morro (+24,4) e Corte Real Barber (+52,0)',
      'Muro Grafiteado Segmentado (Z = 41,9): 5 trechos com vãos para Escadões (-46, -16, +34), Estrada (+14) e Córrego (+86)',
      'Platôs internos: Campinho iluminado (0, 75) e Mirante com Igrejinha (10, 104)',
    ],
    assets: [
      'Casas com janelas em +Z/-Z, fundações hMin..hMax e varais fixados entre hastes na laje',
      'Mata Atlântica com troncos multi-galho cercando o maciço e emoldurando ambas as margens do Córrego',
      'Placa turística marrom sinalizando Nascente & Córrego da Serra + ponto de ônibus Linha 50 em (-9,2, 39,2)',
    ],
    unityRules: [
      'Esculpir o leito do córrego (dCreek < 5,6m) e da nascente (dSpring < 10,5m) diretamente na malha do Morro e da Marginal',
      'Excluir spawn de casas e troncos de árvores dentro de dCreek < 4,6m ou dSpring < 7,2m',
      'NavMeshLinks conectando Marginal Norte (Z = 34) aos 3 escadões (-46, -16, +34) e pinguela do córrego (Z = 62)',
    ],
  },
];

export const GDD_MORRO_FIXES: GddMorroFix[] = [
  {
    id: 'morro-shops',
    area: 'Lojas Sem Sentido na Base do Morro & Ponto de Ônibus na Pista',
    bugBefore:
      'Havia lojas de shopping repetidas na base do Morro (incluindo uma em X = -34 bem no meio da avenida!) e um ponto de ônibus sobre a pista central X = 0.',
    fixApplied:
      'Criadas 4 lojas comunitárias autênticas (Mercearia Esperança, Espetinho da Laje, Açaí do Morro, Corte Real Barber) em X = -56,0 / -24,8 / +24,4 / +52,0 fora das avenidas e vãos; ponto da Marginal movido para a calçada (-9,2, 39,2).',
    unityPortRule:
      'Usar lista exclusiva de fachadas comunitárias no Morro e validar que nenhum comércio ou abrigo intercepte os corredores roadX[] ou vãos dos escadões.',
  },
  {
    id: 'nascente-corrego',
    area: 'Nascente da Serra, Córrego Sinuoso & Galeria Fluvial',
    bugBefore:
      'Faltava uma origem natural de água ligada ao rio principal, deixando o flanco Leste apenas como encosta seca.',
    fixApplied:
      'Esculpida Nascente rochosa com cachoeira em (+84, +114), córrego sinuoso contínuo com corredeiras, pinguela (Z = 62), mata ciliar nas margens e galeria em ponte sob a Marginal (Z = 34) desaguando no Rio.',
    unityPortRule:
      'Gerar spline creekCenterX(z) antes do terreno e recortar valeta na Marginal Norte mantendo MeshCollider da via sobre a galeria.',
  },
  {
    id: 'scope-windows',
    area: 'Espalhamento Lateral & Fachadas Cegas',
    bugBefore:
      'Barracos invadiam X = ±102 e todas as janelas apontavam só para -Z, deixando a face voltada à cidade sem vida.',
    fixApplied:
      'Maciço concentrado em |X| <= 66 com janelas emissivas em +Z e -Z e Mata Atlântica botânica multi-galho nos flancos.',
    unityPortRule:
      'Restringir gerador de lotes do Morro a Math.Abs(x) <= 66f com janelas nas duas faces longitudinais.',
  },
  {
    id: 'foundation',
    area: 'Flutuação, Muros & Varais',
    bugBefore:
      'Casas flutuavam no declive, muros tapavam escadões e varais ficavam no ar.',
    fixApplied:
      'Amostragem de 5 pontos (piso hMax + 0,14m; fundação hMin - 1,4m), 5 segmentos de muro liberando vãos + saída do córrego, e varais fixados entre hastes na laje.',
    unityPortRule:
      'Calcular yPiso = hMax + 0.14f, escalar BaseFundacao até hMin - 1.4f e agrupar degraus dos escadões em Mesh contínua.',
  },
];

export const GDD_SEPARATION_RULES: GddSeparationRule[] = [
  {
    district: 'Área de Prédios (Centro Financeiro)',
    coordinates: 'X ∈ [-102, -34] · Z ∈ [-62.5, +7.5]',
    borderRule:
      'Delimitada a Leste pela Av. X = -34 e Praça da Bandeira (-17,-17); a Sul pela Ladeira 1 e Av. Z = -68; a Norte pelo Cais/Rio.',
    whatRemoved:
      'Removidas torres periféricas em X = ±119, removidos blocos cinzas do horizonte e eliminada qualquer torre invasora na Cidade Alta ou Marginal Norte.',
    whatAdded:
      '4 quadras financeiras escalonadas (0,0m na orla e +2,25m no terraço) com 4 torres principais, 3 secundárias e helipontos limpos.',
  },
  {
    district: 'Shopping, Comida & Moda (Leste)',
    coordinates: 'X ∈ [-28.5, +102] · Z ∈ [-62.5, +7.5]',
    borderRule:
      'Inicia após a Praça da Bandeira (-17,-17) e segue até X = +102, conectando Baixada (0,0m) e Terraço Comercial (+2,25m) por escadarias em Z = -39,5 e Z = -59,8.',
    whatRemoved:
      'Corrigidas lojas em Z = -23,5 que olhavam para a parede do Multiplex e lojas da face sul em Z = -56,8 que olhavam direto para o barranco da Ladeira 1.',
    whatAdded:
      'Shopping Metrópole, Estacionamento, Multiplex, Polo Gastronômico (+51), Polo Moda (+85), abrigos de ônibus modernos com mapa MUPI e pórticos aéreos.',
  },
  {
    district: 'Área de Residência & Mirante Sul (Cidade Alta)',
    coordinates: 'X ∈ [-102, +102] · Z ∈ [-152, -68]',
    borderRule:
      'Elevada acima da Av. Z = -68 (+4,50m), ocupando patamares (+6,75m e +9,00m) até o Mirante Alto da Serra Sul (+13,80m).',
    whatRemoved:
      'Eliminadas todas as casas perdidas nos extremos laterais (X = ±119) e viaduto que bloqueava cruzamentos.',
    whatAdded:
      '10 quadras residenciais limpas (40 lotes murados), Escola Pública E.M. Cidade Nova (-17,-85), Parque do Bairro e o Mirante Sul (+13,8m).',
  },
];

export const GDD_UNITY_CHECKLIST = [
  {
    phase: '01 · Relevo Extremo (-0,85m → +13,8m) & Hidrologia',
    script: 'GeradorCidadeInicial.Rio.cs / cityElevation',
    tasks: [
      'Implementar cityRoadY(z) (0m → +4,5m → +9m) e platôs Cais Baixo (-0,85m) e Mirante Sul (+13,8m)',
      'Esculpir Nascente (+84, +114), Córrego sinuoso e galeria sob a Marginal Norte (Z = 34) ligando ao Rio (-1,25m)',
      'Instanciar 4 barcos navegando (VHC-44..47) + 1 atracado no píer (VHC-50) integrados ao CidadeTriggerAgua',
    ],
  },
  {
    phase: '02 · Shopping, Comida, Moda, Sinalização & Pontos de Ônibus',
    script: 'GeradorCidadeInicial.Shopping.cs / .Fachadas.cs',
    tasks: [
      'Instanciar 3 pórticos metálicos aéreos (vão ≥5,6m), placas azuis de esquina/Área Escolar, 2 totens de mapa e placas regulamentares',
      'Atualizar abrigos de ônibus com 4 pilares, vidro, banco com 3 pés, painel MUPI Linha 50 e placa fora da pista',
      'Construir E.M. Cidade Nova (-17,-85) com escada/rampa, quadra, papelaria e Praia Oeste + Ponte + Ilha do Sol (-162..-260) com reflorestamento',
    ],
  },
  {
    phase: '03 · Vegetação Botânica, Morro Limpo & NavMesh',
    script: 'GeradorCidadeInicial.Morro.cs · GeradorVegetacao.cs',
    tasks: [
      'Substituir árvores/arbustos simples por prefabs multi-galho (raízes + ramos + 13 clusters) e arbustos floridos',
      'Manter 4 comércios autênticos na base do Morro fora das pistas e excluir árvores/casas do leito do Córrego',
      'Bake de NavMesh Humanoid com OffMeshLinks nas escadas do Cais Baixo, Passarela (+34), Escadões e Pinguela (Z = 62)',
    ],
  },
];

export function buildGddMarkdown(): string {
  const lines: string[] = [
    '# GDD — Mapa 3D Metrópole Cidade Nova (Port para Unity URP)',
    '',
    '**Projeto:** Garagem Conceito 50 · Cidade Nova (Mundo Aberto Estilo GTA)',
    '**Escala:** `1 unidade = 1 metro` (`1u = 1m`) · Malha Expandida `X ∈ [-153, +153]` · Bulevares Externos `X = ±148` · Quadras `23m × 23m` & `33m × 23m`',
    '**Relevo Urbano Completo:** Cais Baixo (`-0,85m`) / Rio (`-1,25m`) → Baixada (`0,0m`) → Terraço (`+2,25m`) → Av. Média (`+4,5m`) → Cidade Alta (`+6,75m` / `+9,0m`) → **Mirante Alto da Serra Sul (`+13,8m`)** e **Morro Norte (`+26m`)**',
    '',
    '## 1. Métricas Gerais do Mapa',
    ...GDD_MAP_METRICS.map((m) => `- **${m.label}:** ${m.value} (${m.note})`),
    '',
    '## 2. Regras Explícitas de Projeto (Obrigatórias no Port Unity)',
  ];

  GDD_EXPLICIT_RULES.forEach((r) => {
    lines.push(`### ${r.code} — ${r.title}`);
    lines.push(`- **Escopo:** \`${r.scope}\``);
    lines.push(`- **Regra Explícita:** ${r.rule}`);
    lines.push(`- **Exigência no Unity:** ${r.unityRequirement}`);
    lines.push('');
  });

  lines.push('## 3. Zoneamento Estrito, Hidrologia e Separação de Distritos');
  GDD_ZONES.forEach((z) => {
    lines.push(`### ${z.name}`);
    lines.push(`- **Limites:** \`${z.boundsLabel}\``);
    lines.push(`- **Resumo:** ${z.summary}`);
    lines.push('- **Quadras e Marcos:**');
    z.blocks.forEach((b) => lines.push(`  - ${b}`));
    lines.push('- **Regras para Unity:**');
    z.unityRules.forEach((r) => lines.push(`  - ${r}`));
    lines.push('');
  });

  lines.push('## 4. Separação: Residência × Shopping/Comércio × Prédios');
  GDD_SEPARATION_RULES.forEach((s) => {
    lines.push(`### ${s.district} (\`${s.coordinates}\`)`);
    lines.push(`- **Fronteira:** ${s.borderRule}`);
    lines.push(`- **Conflitos corrigidos:** ${s.whatRemoved}`);
    lines.push(`- **Consolidado:** ${s.whatAdded}`);
    lines.push('');
  });

  lines.push('## 5. Correções das Favelas, Comércios, Pontos & Hidrologia');
  GDD_MORRO_FIXES.forEach((f) => {
    lines.push(`### ${f.area}`);
    lines.push(`- **Problema anterior:** ${f.bugBefore}`);
    lines.push(`- **Correção aplicada:** ${f.fixApplied}`);
    lines.push(`- **Regra no Unity:** ${f.unityPortRule}`);
    lines.push('');
  });

  lines.push('## 6. Checklist de Port para Unity');
  GDD_UNITY_CHECKLIST.forEach((c) => {
    lines.push(`### ${c.phase} (${c.script})`);
    c.tasks.forEach((t) => lines.push(`- [ ] ${t}`));
    lines.push('');
  });

  return lines.join('\n');
}
