import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CityCameraPreset, CityHotspot, CityTimeOfDay, VehicleConcept } from '../types/vehicle';
import { VEHICLES_50 } from '../data/vehicles50';
import { buildCraftedVehicle, BuiltVehicle } from './vehicleBuilder';
import { isSoftwareGl } from './materials';
import { createCityTextureAtlas, CityTextureAtlas } from './city/cityTextures';
import {
  CityVegetationSystem,
  createVegetationSystem,
  VegetationPlacement,
} from './city/cityVegetation';
import {
  createExpandedBuildingsDistrict,
  createFinancialCenterAndHorizon,
  createResidentialDistrict,
  NeighborhoodBuildResult,
} from './city/cityNeighborhoods';
import {
  ArticulatedNpc,
  createArticulatedNpc,
  createConnectedBridges,
  createMonumentalFlag,
  createMorroDistrict,
  createShopsAndShoppingDistrict,
  createStreetlightRig,
  createTrafficLightRig,
  MonumentalFlagRig,
  ShopAnimatedParts,
  TrafficLightRig,
} from './city/cityParts';
import {
  blockTerraceY,
  cityBasinTerrainY,
  cityRoadSlopeDZ,
  cityRoadY,
  creekCenterX,
  WEST_ISLANDS,
} from './city/cityElevation';
import {
  BeachBuildResult,
  BeachNpcPlacements,
  createWestBeachAndIsland,
} from './city/cityBeach';

export const CITY_HOTSPOTS: Record<CityCameraPreset, CityHotspot> = {
  overview: {
    id: 'overview',
    title: 'Metrópole Cidade Nova · Conceito GTA',
    subtitle: 'Cais Baixo (-0,85m) → Cidade Alta (+9m) → Mirante (+13,8m)',
    highlights: [
      'Desnível dramático com Cais Baixo (-0,85m), Baixada (0,0m), Terraço (+2,25m), Av. Média (+4,5m), Cidade Alta (+9,0m) e Mirante Sul (+13,8m)',
      'Grande Praia Oeste (120m) conectada por avenida litorânea, calçadão, ponte em arco e Arquipélago do Sol com 5 ilhas reflorestadas',
      'Hidrologia completa: Nascente na Serra Norte (84,114), Córrego com corredeiras, Rio com barcos e Baía Oeste ampliada',
    ],
  },
  downtown: {
    id: 'downtown',
    title: 'Área de Prédios · Torres & Complexos Duplos',
    subtitle: 'Quadrante Centro-Oeste (X = -102..-34)',
    highlights: [
      '4 complexos arquitetônicos: Supertall Horizonte Brasil (84m+torre), Prédios Duplos Gêmeo Paulista, Torre Molduras em C e Complexo Duplo Atlântico',
      'Fundações escalonadas em granito, pilotis, portas duplas de vidro com marquise iluminada, guaritas e portões de garagem',
      'Centenas de condensadores de ar-condicionado 3D com ventoinha e dutos, sacadas com guarda-corpo de vidro e chillers na cobertura',
    ],
  },
  shops: {
    id: 'shops',
    title: 'Shopping, Comida & Lojas de Roupa',
    subtitle: 'Setor Leste · Metrópole, Gastronomia & Moda',
    highlights: [
      'Shopping Metrópole (+17,-17), Passarela Aérea (+34), Estacionamento com carros (+51) e Galeria Moda & Multiplex (+85)',
      'Polo Gastronômico (+51,-51): Burger 50, Pizzaria Nobile, Churrascaria Brasa, Padaria Pão Quente e Açaí Tropical',
      'Polo Moda & Comércio (+85,-51): Moda Urbana, Atelier Vestir, Tênis & Sneakers, Express 24H e pontos de ônibus com abrigo e mapa',
    ],
  },
  residential: {
    id: 'residential',
    title: 'Área de Residência & Mirante Alto Sul',
    subtitle: 'Cidade Alta (+6,75m / +9,0m) & Mirante (+13,8m)',
    highlights: [
      '11 quadras residenciais simétricas (44 lotes murados nos 4 lados) sem casas perdidas nas bordas laterais',
      'Rampa panorâmica até o Mirante Alto da Serra Sul (+13,8m) com guarda-corpo de vidro, lunetas e vista da metrópole',
      'Parque do Bairro com Coreto central em (+17,-85) e rotatórias arborizadas com Ipês e arbustos floridos',
    ],
  },
  morro: {
    id: 'morro',
    title: 'Morro da Esperança · Nascente & Córrego',
    subtitle: 'Maciço Central Limpo · Mata Atlântica & Cachoeira',
    highlights: [
      'Nascente em paredão rochoso (+84, +114) alimentando córrego sinuoso com ponte rústica até desaguar no Rio',
      '4 comércios autênticos na base (Mercearia, Espetinho, Açaí e Barbearia) livres das avenidas e escadões',
      'Mata Atlântica com troncos ramificados multi-galho nos flancos e casas com janelas +Z/-Z e fundações hMin..hMax',
    ],
  },
  bridges: {
    id: 'bridges',
    title: 'Cais Baixo, Pontes & Rio com Barcos',
    subtitle: 'Orla Baixa (-0,85m) · Píer Náutico & 5 Embarcações',
    highlights: [
      'Cais Baixo em -0,85m ligado por escadarias em granito ao calçadão, com píer de madeira e lancha atracada',
      '4 embarcações reais do catálogo (Lancha, Jet Ski, Bote Resgate e Rebocador) navegando sob as 5 pontes niveladas',
      'Calçadões com palmeiras segmentadas de 11 frondes arqueadas, arbustos floridos e iluminação noturna',
    ],
  },
  flag: {
    id: 'flag',
    title: 'Bandeira Monumental & Guias Urbanos',
    subtitle: 'Praça da Bandeira (-17, -17) · Marco Cívico',
    highlights: [
      'Pedestal octogonal de 3 degraus em granito, mármore e bronze + totem de mapa turístico da cidade',
      'Mastro telescópico com adriça, roldana e pináculo dourado entre Prédios e Shopping',
      'Tecido 3D alta resolução (56×34) com vento sincronizado às copas multi-cluster das árvores',
    ],
  },
  traffic: {
    id: 'traffic',
    title: 'Frota Completa (104 Veículos) & Trânsito',
    subtitle: '73 Terrestres · 4 Bicicletas · 11 Aquáticos · 16 Aéreos',
    highlights: [
      'Todos os 104 veículos do catálogo em operação simultânea: carros, superesportivos, ônibus BRT, caminhões, motos, bicicletas, barcos, helicópteros, aviões e jatos',
      'Trânsito com espaçamento proporcional ao comprimento de cada veículo, parada exata pelo para-choque nos semáforos e pitch real nas ladeiras',
      'Ciclovia no Calçadão/Orla com pedais e guidões animados, barcos no rio e baía oeste, e tráfego aéreo em camadas de altitude com turbinas e pós-combustão',
    ],
  },
  school: {
    id: 'school',
    title: 'Escola Pública E.M. Cidade Nova',
    subtitle: 'Quadra (-17, -85) · Patamar +6,75m · Acesso & Sinalização',
    highlights: [
      'Inserida no tecido residencial em frente ao Parque do Bairro, ligada à Av. Panorâmica (+4,5m) por escadaria e rampa acessível',
      'Portão monumental com letreiro iluminado, muro gradil, blocos de aula em L com varanda sombreada e quadra poliesportiva',
      'Sinalização amarela de Área Escolar, faixa exclusiva na avenida, Escolar Amarelinho estacionado e Papelaria do Estudante na esquina',
    ],
  },
  beach: {
    id: 'beach',
    title: 'Grande Praia Oeste & Arquipélago do Sol (5 Ilhas)',
    subtitle: 'Enseada de 120m (Z ∈ [-116, +10]) · Calçadão, 11 Lojas & 5 Ilhas',
    highlights: [
      'Grande calçadão de 120m em pedra portuguesa (+0,30m) com 5 escadarias, 2 praças à beira-mar (Arco Ponta Negra & Pérgola Sul) e 4 ilhas azuis',
      'Faixa de areia alargada (21–28m) com caminho sinuoso de 118m, 11 lojas/quiosques, 24 conjuntos de cadeiras/espreguiçadeiras, futevôlei e futebol de areia',
      'Mar azul-turquesa ampliado com 5 ilhas tropicais: Ilha do Sol (ponte em arco), Ilha da Restinga (passarela), Ilha do Farol, Morro Verde e Ilhote das Pedras',
    ],
  },
  condos: {
    id: 'condos',
    title: 'Prédios Largos de Moradia · 2 em 1',
    subtitle: 'Quadras Largas 33×23m · (-125,-51/-85) e (+125,-85)',
    highlights: [
      '3 complexos residenciais largos (~30m) formados por dois prédios unidos por átrio envidraçado e passarelas elevadas',
      'Fundações em granito, gradis com guarita, duas portarias envidraçadas com marquise e portões de garagem nos dois lados',
      'Dezenas de sacadas com guarda-corpo de vidro, pilhas de condensadores 3D de ar-condicionado, caixas d’água e chillers',
    ],
  },
  corporate: {
    id: 'corporate',
    title: 'Prédios de Vendas, Outdoors & Estacionamentos',
    subtitle: 'Setores Empresariais · (-125,-17) e (+125,-17/-51)',
    highlights: [
      '3 complexos corporativos de vendas com showrooms em vidro duplo, torres envidraçadas, portarias e condensadores de AC',
      'Outdoors metálicos iluminados no topo das torres e nas esquinas viárias divulgando salas comerciais e showrooms',
      'Estacionamentos completos com asfalto, vagas demarcadas, bate-rodas amarelos, guarita, cancela, postes e carros estacionados',
    ],
  },
};

const _drvCamPos = new THREE.Vector3();
const _drvCamLook = new THREE.Vector3();
const _drvLocalOffset = new THREE.Vector3();
const _drvLocalLook = new THREE.Vector3();

export type PlayerCameraMode = 'chase' | 'cockpit';
export type PlayerBlinkerMode = 'off' | 'left' | 'right' | 'hazard';

export interface PlayerDriveState {
  active: boolean;
  vehicleId: number;
  vehicleName: string;
  kind: 'land' | 'water' | 'helicopter';
  cameraMode: PlayerCameraMode;
  lightsOn: boolean;
  blinker: PlayerBlinkerMode;
  sirenOn: boolean;
  hasSiren: boolean;
  speedKmh: number;
}

interface TrafficActor {
  built: BuiltVehicle;
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  posCoord: number;
  minC: number;
  maxC: number;
  maxSpeed: number;
  speed: number;
  halfLen: number;
  wheelRadius: number;
  customY?: number;
  ignoreSignals?: boolean;
  lanePeers: TrafficActor[];
}

interface BoatActor {
  built: BuiltVehicle;
  axis: 'x' | 'z';
  dir: 1 | -1;
  x: number;
  z: number;
  minC: number;
  maxC: number;
  speed: number;
}

interface AirActor {
  built: BuiltVehicle;
  kind: 'helicopter' | 'airplane' | 'jet';
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  alt: number;
  speed: number;
}

interface EmergencyActor {
  built: BuiltVehicle;
  mode: 'police_fire' | 'amber';
  phase: number;
}

interface PlayerActor {
  concept: VehicleConcept;
  built: BuiltVehicle;
  kind: 'land' | 'water' | 'helicopter';
  hasSiren: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  maxSpeed: number;
  steer: number;
  wheelRadius: number;
  cameraMode: PlayerCameraMode;
  lightsOn: boolean;
  blinker: PlayerBlinkerMode;
  sirenOn: boolean;
}

export interface CityCallbacks {
  onTrafficPhase?: (phaseLabel: string) => void;
  onHotspotSelect?: (preset: CityCameraPreset) => void;
  onDriveStateChange?: (state: PlayerDriveState | null) => void;
}

export class CityConceptController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private callbacks: CityCallbacks;

  private atlas: CityTextureAtlas;
  private flagRig!: MonumentalFlagRig;
  private vegetation!: CityVegetationSystem;
  private financialResult!: NeighborhoodBuildResult;
  private residentialResult!: NeighborhoodBuildResult;
  private expandedResult!: NeighborhoodBuildResult;
  private beachResult!: BeachBuildResult;
  private beachNpcSpots: BeachNpcPlacements = { seated: [], chatting: [] };
  private shopAnimated: ShopAnimatedParts = {};
  private trafficLights: TrafficLightRig[] = [];
  private trafficActors: TrafficActor[] = [];
  private boatActors: BoatActor[] = [];
  private airActors: AirActor[] = [];
  private emergencyActors: EmergencyActor[] = [];
  private allCityVehicles: BuiltVehicle[] = [];
  private npcs: ArticulatedNpc[] = [];
  private playerActor: PlayerActor | null = null;
  private keysDown = new Set<string>();
  private lastDriveUiSyncMs = 0;
  private currentTimeOfDay: CityTimeOfDay = 'sunset';
  private currentHeadlightsOn = true;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private lampEmissiveMat!: THREE.MeshStandardMaterial;
  private windowEmissiveMat!: THREE.MeshStandardMaterial;
  private beacons: THREE.MeshStandardMaterial[] = [];
  private skylineGlowMats: THREE.MeshStandardMaterial[] = [];
  private disposableBuilt: BuiltVehicle[] = [];

  private windStrength = 1.0;
  private simPaused = false;
  private lastPhaseIdx = -1;
  private lastBeaconOn: boolean | null = null;

  private camTransitioning = false;
  private camTargetPos = new THREE.Vector3(-76, 54, -84);
  private camTargetLook = new THREE.Vector3(-2, 6, 4);

  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private frameCount = 0;
  private disposed = false;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();

  constructor(container: HTMLElement, callbacks: CityCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.00;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.25));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setSize(container.clientWidth || 1000, container.clientHeight || 680);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1f192b);
    this.scene.fog = new THREE.FogExp2(0x1f192b, 0.0024);

    const aspect = (container.clientWidth || 1000) / (container.clientHeight || 680);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.4, 900);
    this.camera.position.copy(this.camTargetPos);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 340;
    this.controls.target.copy(this.camTargetLook);
    this.controls.addEventListener('start', () => {
      this.camTransitioning = false;
    });

    const maxAniso = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4);
    this.atlas = createCityTextureAtlas(maxAniso);

    this.setupLighting();
    this.buildCityWorld(maxAniso);
    this.applyTimeOfDay('sunset');
    this.freezeStaticMatrices();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.clock.getDelta();
    this.tick();
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xfde68a, 0x1e293b, 0.74);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffb36b, 1.80);
    this.sunLight.position.set(-95, 58, -72);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 15;
    this.sunLight.shadow.camera.far = 360;
    const d = 158;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.radius = 3.0;
    this.sunLight.shadow.blurSamples = 12;
    this.sunLight.shadow.intensity = 0.66;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight);

    this.lampEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    });
    this.windowEmissiveMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    });
  }

  private buildCityWorld(maxAniso: number) {
    const treeCollector: {
      palms: VegetationPlacement[];
      beachPalms: VegetationPlacement[];
      ipesYellow: VegetationPlacement[];
      ipesPink: VegetationPlacement[];
      urbanLeafy: VegetationPlacement[];
      atlanticForest: VegetationPlacement[];
      shrubs: VegetationPlacement[];
    } = {
      palms: [],
      beachPalms: [],
      ipesYellow: [],
      ipesPink: [],
      urbanLeafy: [],
      atlanticForest: [],
      shrubs: [],
    };

    // 1. Continuous sloped urban basin + sculpted West Bay, 5-Island Archipelago & lush coastal hills
    const basinGeo = new THREE.PlaneGeometry(760, 480, 144, 96);
    basinGeo.rotateX(-Math.PI / 2);
    basinGeo.translate(-85, 0, -25);
    const basinPos = basinGeo.attributes.position;
    const basinColors = new Float32Array(basinPos.count * 3);
    const colTmp = new THREE.Color();
    for (let i = 0; i < basinPos.count; i++) {
      const x = basinPos.getX(i);
      const z = basinPos.getZ(i);
      const rawY = cityBasinTerrainY(x, z);
      let y = rawY - 0.14;
      if (Math.abs(x) < 153.2 && z > -130 && z < 7.5) {
        y -= 0.28;
      } else if (x <= -156.2 && x >= -176.4 && z >= -114.0 && z <= 7.8) {
        y -= 0.28;
      } else if (x < -153.0 && x > -156.4 && z >= -40.5 && z <= 7.8) {
        y -= 0.28;
      } else if (x < -175.8 && x >= -232.5 && z >= -120.5 && z <= 14.5) {
        // Depress slightly under dedicated high-res beach sand mesh to eliminate any z-fighting
        y -= 0.18;
      } else if (WEST_ISLANDS.some((isl) => Math.hypot(x - isl.x, z - isl.z) < isl.baseRadius * 1.32)) {
        // Depress slightly under high-res archipelago island terrain meshes
        y -= 0.22;
      }
      basinPos.setY(i, y);

      if (rawY < -1.35) {
        colTmp.setHex(0x0b2330);
      } else if (x < -175.8 && z >= -118 && z <= 28 && rawY <= 0.42) {
        colTmp.setHex(rawY < -0.25 ? 0xb49763 : 0xdcc288);
      } else {
        const shade = ((Math.abs(Math.round(x * 0.11 + z * 0.09)) % 3) - 1) * 0.018;
        colTmp.setRGB(0.135 + shade * 0.5, 0.235 + shade, 0.145 + shade * 0.5);
      }
      basinColors[i * 3] = colTmp.r;
      basinColors[i * 3 + 1] = colTmp.g;
      basinColors[i * 3 + 2] = colTmp.b;
    }
    basinGeo.setAttribute('color', new THREE.BufferAttribute(basinColors, 3));
    basinGeo.computeVertexNormals();
    const horizonGround = new THREE.Mesh(
      basinGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }),
    );
    horizonGround.receiveShadow = true;
    this.scene.add(horizonGround);

    const matAsphalt = new THREE.MeshStandardMaterial({
      map: this.atlas.asphalt,
      roughness: 0.88,
      metalness: 0.05,
    });

    // Continuous sloped metropolitan asphalt under-deck (X = -153.5..+153.5, Z = -130..+7.5)
    const urbanDeckGeo = new THREE.PlaneGeometry(307, 137.5, 2, 96);
    urbanDeckGeo.rotateX(-Math.PI / 2);
    urbanDeckGeo.translate(0, 0, -61.25);
    const deckPos = urbanDeckGeo.attributes.position;
    for (let i = 0; i < deckPos.count; i++) {
      deckPos.setY(i, cityRoadY(deckPos.getZ(i)) - 0.03);
    }
    urbanDeckGeo.computeVertexNormals();
    const southAsphalt = new THREE.Mesh(urbanDeckGeo, matAsphalt);
    southAsphalt.receiveShadow = true;
    this.scene.add(southAsphalt);

    // West Coastal Drive asphalt under-deck (north flat zone Z ∈ [-40.4, +7.6] + south waterfront Z ∈ [-112.5, -40.0])
    const westCoastalDeck = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 48.0), matAsphalt);
    westCoastalDeck.rotation.x = -Math.PI / 2;
    westCoastalDeck.position.set(-160.3, -0.03, -16.4);
    westCoastalDeck.receiveShadow = true;
    this.scene.add(westCoastalDeck);

    const westCoastalSouthDeck = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 72.5), matAsphalt);
    westCoastalSouthDeck.rotation.x = -Math.PI / 2;
    westCoastalSouthDeck.position.set(-161.9, -0.03, -76.25);
    westCoastalSouthDeck.receiveShadow = true;
    this.scene.add(westCoastalSouthDeck);

    // North Marginal asphalt strip (Z = 26.5..42.5, X = -112..+112)
    const northAsphalt = new THREE.Mesh(new THREE.BoxGeometry(224, 0.2, 16.5), matAsphalt);
    northAsphalt.position.set(0, -0.06, 34.5);
    northAsphalt.receiveShadow = true;
    this.scene.add(northAsphalt);

    // River Bed (X = -176.2 .. +300) + Two Non-Overlapping Water Sheets (River + West Ocean Bay)
    const riverBed = new THREE.Mesh(
      new THREE.BoxGeometry(476.2, 0.5, 19),
      new THREE.MeshStandardMaterial({ color: 0x091e29, roughness: 0.95 }),
    );
    riverBed.position.set(61.9, -2.5, 17);
    this.scene.add(riverBed);

    const matWater = new THREE.MeshStandardMaterial({
      map: this.atlas.waterRipple,
      color: 0x0ea5e9,
      roughness: 0.14,
      metalness: 0.45,
      transparent: true,
      opacity: 0.90,
    });
    const riverWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(476.2, 18.2), matWater);
    riverWaterMesh.rotation.x = -Math.PI / 2;
    riverWaterMesh.position.set(61.9, -1.25, 17);
    this.scene.add(riverWaterMesh);

    const westBayWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(250.0, 270.0), matWater);
    westBayWaterMesh.rotation.x = -Math.PI / 2;
    westBayWaterMesh.position.set(-301.2, -1.25, -42.0);
    this.scene.add(westBayWaterMesh);

    // Stone river embankments (Muralhas da Orla) & Continuous Granite Boardwalks
    const matWall = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const matWalk = new THREE.MeshStandardMaterial({ map: this.atlas.sidewalk, roughness: 0.85 });

    // North embankment continuous wall + boardwalk
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(230, 2.8, 1.2), matWall);
    northWall.position.set(0, -1.1, 26.5);
    this.scene.add(northWall);
    const northBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(216, 0.24, 3.0), matWalk);
    northBoardwalk.position.set(0, 0.12, 27.9);
    northBoardwalk.receiveShadow = true;
    this.scene.add(northBoardwalk);

    // Continuous South river embankment wall from West Beach sea-wall (-176.2) to East Edge (+154)
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(330.2, 2.8, 1.2), matWall);
    southWall.position.set(-11.1, -1.1, 7.5);
    this.scene.add(southWall);

    // Continuous South granite boardwalk joining flush with West Calçadão (-167.2 .. +153)
    const southBoardwalk = new THREE.Mesh(new THREE.BoxGeometry(320.2, 0.24, 3.0), matWalk);
    southBoardwalk.position.set(-7.1, 0.12, 6.1);
    southBoardwalk.receiveShadow = true;
    this.scene.add(southBoardwalk);

    // Clean, Continuous Avenue Grid:
    // N-S at X = [-102, -68, -34, 0, 34, 68, 102] (sloped along Ladeira 1 & 2)
    // E-W at Z = [-102, -68, -34, 0, 34] (strictly horizontal via geometry rotation!)
    const matAveMark = new THREE.MeshStandardMaterial({
      map: this.atlas.asphaltAvenue,
      roughness: 0.86,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const matIntersection = new THREE.MeshStandardMaterial({
      map: this.atlas.asphaltIntersection,
      roughness: 0.86,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const roadX = [-102, -68, -34, 0, 34, 68, 102];
    const outerRoadX = [-148, 148];
    const southRoadZ = [-102, -68, -34, 0];
    const roadZ = [...southRoadZ, 34];

    const nsSouthGeo = new THREE.PlaneGeometry(10.4, 135.5, 1, 96);
    nsSouthGeo.rotateX(-Math.PI / 2);
    nsSouthGeo.translate(0, 0, -60.25);
    const nsPos = nsSouthGeo.attributes.position;
    const nsUv = nsSouthGeo.attributes.uv;
    for (let i = 0; i < nsPos.count; i++) {
      nsPos.setY(i, cityRoadY(nsPos.getZ(i)) + 0.04);
      nsUv.setY(i, nsUv.getY(i) * 6);
    }
    nsSouthGeo.computeVertexNormals();

    const nsNorthStubGeo = new THREE.PlaneGeometry(10.4, 13);
    nsNorthStubGeo.rotateX(-Math.PI / 2);

    roadX.forEach((rx) => {
      const southAve = new THREE.Mesh(nsSouthGeo, matAveMark);
      southAve.position.x = rx;
      southAve.receiveShadow = true;
      this.scene.add(southAve);

      const northStub = new THREE.Mesh(nsNorthStubGeo, matAveMark);
      northStub.position.set(rx, 0.04, 33);
      northStub.receiveShadow = true;
      this.scene.add(northStub);
    });

    // Outer West & East Boulevard Avenues (X = -148 & +148, spanning Z = -107.2 .. +5.2 across the 33m wide expansion)
    const nsOuterGeo = new THREE.PlaneGeometry(10.4, 112.4, 1, 84);
    nsOuterGeo.rotateX(-Math.PI / 2);
    nsOuterGeo.translate(0, 0, -51.0);
    const outerPos = nsOuterGeo.attributes.position;
    const outerUv = nsOuterGeo.attributes.uv;
    for (let i = 0; i < outerPos.count; i++) {
      outerPos.setY(i, cityRoadY(outerPos.getZ(i)) + 0.04);
      outerUv.setY(i, outerUv.getY(i) * 5);
    }
    nsOuterGeo.computeVertexNormals();

    outerRoadX.forEach((rx) => {
      const outerAve = new THREE.Mesh(nsOuterGeo, matAveMark);
      outerAve.position.x = rx;
      outerAve.receiveShadow = true;
      this.scene.add(outerAve);
    });

    // Continuous E-W lanes rotated on geometry (South-half avenues extended to X = ±153.2; Marginal Norte kept at ±107.2)
    const ewWideGeo = new THREE.PlaneGeometry(10.4, 306.4);
    ewWideGeo.rotateX(-Math.PI / 2);
    ewWideGeo.rotateY(Math.PI / 2);
    const ewWideUv = ewWideGeo.attributes.uv;
    for (let i = 0; i < ewWideUv.count; i++) {
      ewWideUv.setY(i, ewWideUv.getY(i) * 13);
    }

    const ewNorthGeo = new THREE.PlaneGeometry(10.4, 214.4);
    ewNorthGeo.rotateX(-Math.PI / 2);
    ewNorthGeo.rotateY(Math.PI / 2);
    const ewNorthUv = ewNorthGeo.attributes.uv;
    for (let i = 0; i < ewNorthUv.count; i++) {
      ewNorthUv.setY(i, ewNorthUv.getY(i) * 9);
    }

    roadZ.forEach((rz) => {
      const geo = rz === 34 ? ewNorthGeo : ewWideGeo;
      const ewAve = new THREE.Mesh(geo, matAveMark);
      ewAve.position.set(0, cityRoadY(rz) + 0.044, rz);
      ewAve.receiveShadow = true;
      this.scene.add(ewAve);
    });

    // Crisp intersection squares covering all core crossings + 8 outer boulevard crossings
    const interGeo = new THREE.PlaneGeometry(10.6, 10.6);
    interGeo.rotateX(-Math.PI / 2);
    roadX.forEach((rx) => {
      roadZ.forEach((rz) => {
        const inter = new THREE.Mesh(interGeo, matIntersection);
        inter.position.set(rx, cityRoadY(rz) + 0.052, rz);
        inter.receiveShadow = true;
        this.scene.add(inter);
      });
    });
    outerRoadX.forEach((rx) => {
      southRoadZ.forEach((rz) => {
        const inter = new THREE.Mesh(interGeo, matIntersection);
        inter.position.set(rx, cityRoadY(rz) + 0.052, rz);
        inter.receiveShadow = true;
        this.scene.add(inter);
      });
    });

    // Av. Beira-Mar Oeste (X = -162, Z ∈ [-108.6, +6.2]) & E-W Connector Spurs from Av. Oeste (-148) at Z = 0 and Z = -34
    const coastalAveGeo = new THREE.PlaneGeometry(10.4, 114.8);
    coastalAveGeo.rotateX(-Math.PI / 2);
    const coastalUv = coastalAveGeo.attributes.uv;
    for (let i = 0; i < coastalUv.count; i++) coastalUv.setY(i, coastalUv.getY(i) * 5.2);
    const coastalAve = new THREE.Mesh(coastalAveGeo, matAveMark);
    coastalAve.position.set(-162, 0.044, -51.2);
    coastalAve.receiveShadow = true;
    this.scene.add(coastalAve);

    // South Beach Turnaround Rotunda at (-162, -108.5)
    const southBeachTurnPad = new THREE.Mesh(new THREE.CircleGeometry(7.2, 24), matAsphalt);
    southBeachTurnPad.rotation.x = -Math.PI / 2;
    southBeachTurnPad.position.set(-162, 0.048, -108.5);
    southBeachTurnPad.receiveShadow = true;
    this.scene.add(southBeachTurnPad);

    const spurGeo = new THREE.PlaneGeometry(10.4, 15.0);
    spurGeo.rotateX(-Math.PI / 2);
    spurGeo.rotateY(Math.PI / 2);
    [0, -34].forEach((sz) => {
      const spur = new THREE.Mesh(spurGeo, matAveMark);
      spur.position.set(-155.5, 0.046, sz);
      spur.receiveShadow = true;
      this.scene.add(spur);

      const cInter = new THREE.Mesh(interGeo, matIntersection);
      cInter.position.set(-162, 0.054, sz);
      cInter.receiveShadow = true;
      this.scene.add(cInter);
    });

    // Landscaped Median Island between Av. Oeste Externa (-148) & Av. Beira-Mar Oeste (-162)
    [-17].forEach((mz) => {
      const median = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.22, 23.0), matWalk);
      median.position.set(-155.0, 0.11, mz);
      median.receiveShadow = true;
      this.scene.add(median);
    });

    // Landscaped Roundabouts (Rotatórias) at (-68, -68), (+68, -68) & South Beach (-162, -108.5)
    const matCurb = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const matTurf = new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 0.9 });
    const southTurnRing = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 0.22, 18), matCurb);
    southTurnRing.position.set(-162, 0.11, -108.5);
    southTurnRing.receiveShadow = true;
    this.scene.add(southTurnRing);
    const southTurnTurf = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.26, 18), matTurf);
    southTurnTurf.position.set(-162, 0.13, -108.5);
    this.scene.add(southTurnTurf);
    treeCollector.palms.push({ x: -162, y: 0.26, z: -108.5, scale: 1.05 });
    treeCollector.shrubs.push({ x: -160.2, y: 0.26, z: -108.5, scale: 0.85 });
    treeCollector.shrubs.push({ x: -163.8, y: 0.26, z: -108.5, scale: 0.85 });
    const rotY = cityRoadY(-68);
    [-68, 68].forEach((rx, rIdx) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.24, 20), matCurb);
      ring.position.set(rx, rotY + 0.12, -68);
      ring.receiveShadow = true;
      this.scene.add(ring);

      const turf = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 0.28, 20), matTurf);
      turf.position.set(rx, rotY + 0.14, -68);
      this.scene.add(turf);

      if (rIdx === 0) treeCollector.ipesYellow.push({ x: rx, y: rotY + 0.28, z: -68, scale: 1.1 });
      else treeCollector.ipesPink.push({ x: rx, y: rotY + 0.28, z: -68, scale: 1.1 });

      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI) / 3;
        treeCollector.shrubs.push({
          x: rx + Math.cos(a) * 3.4,
          y: rotY + 0.28,
          z: -68 + Math.sin(a) * 3.4,
          scale: 0.95,
        });
      }
    });

    // Sidewalk pads for Downtown (West), Praça (-17,-17) & Shopping/Gastronomia/Moda (East)
    const matRetain = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.88 });
    const addSidewalkBlock = (cx: number, cz: number, w = 23, d = 23) => {
      const ty = blockTerraceY(cz);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), matWalk);
      m.position.set(cx, ty + 0.08, cz);
      m.receiveShadow = true;
      this.scene.add(m);

      if (ty > 0.1) {
        const skirtH = 2.8;
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, skirtH, d - 0.2), matRetain);
        skirt.position.set(cx, ty - skirtH * 0.5 + 0.02, cz);
        skirt.receiveShadow = true;
        this.scene.add(skirt);
      }
    };
    const coreBlocks: [number, number][] = [
      // Prédios (Centro-Oeste) — Baixada (0,0m) e Terraço (+2,1m)
      [-85, -17], [-51, -17],
      [-85, -51], [-51, -51],
      // Praça da Bandeira (Marco Cívico — 0,0m)
      [-17, -17],
      // Shopping, Polo Gastronômico & Polo Moda (Leste — 0,0m e Terraço +2,1m)
      [17, -17], [51, -17], [85, -17],
      [-17, -51], [17, -51], [51, -51], [85, -51],
    ];
    coreBlocks.forEach(([cx, cz]) => addSidewalkBlock(cx, cz));

    // 6 Wide Sidewalk Blocks (33m × 23m) along X = -125 & +125 for Wide 2-in-1 Condos & Corporate Sales Hubs
    const expandedBlocks: [number, number][] = [
      [-125, -17],
      [-125, -51],
      [-125, -85],
      [125, -17],
      [125, -51],
      [125, -85],
    ];
    expandedBlocks.forEach(([cx, cz]) => addSidewalkBlock(cx, cz, 33, 23));

    // Marginal Norte: ipês de respiro fora da pista
    [-85, -51, 51, 85].forEach((nx) => {
      treeCollector.ipesYellow.push({ x: nx, y: 0.2, z: 28.4, scale: 0.9 });
    });

    // 2. PRAÇA DA BANDEIRA (X = -17, Z = -17) + BANDEIRA MONUMENTAL
    const plazaPad = new THREE.Mesh(
      new THREE.BoxGeometry(22.4, 0.12, 22.4),
      new THREE.MeshStandardMaterial({ map: this.atlas.plazaCompass, roughness: 0.72 }),
    );
    plazaPad.position.set(-17, 0.24, -17);
    plazaPad.receiveShadow = true;
    this.scene.add(plazaPad);

    this.flagRig = createMonumentalFlag(this.atlas);
    this.flagRig.group.position.set(-17, 0.30, -17);
    this.scene.add(this.flagRig.group);

    // Plaza benches
    const matBenchWood = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 });
    const matBenchIron = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.6 });
    [
      [-17 - 6.8, -17, Math.PI / 2],
      [-17 + 6.8, -17, -Math.PI / 2],
      [-17, -17 + 6.8, Math.PI],
      [-17, -17 - 6.8, 0],
    ].forEach(([bx, bz, rot]) => {
      const bench = new THREE.Group();
      bench.position.set(bx, 0.30, bz);
      bench.rotation.y = rot;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.10, 0.55), matBenchWood);
      seat.position.y = 0.45;
      bench.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.08), matBenchWood);
      back.position.set(0, 0.72, -0.24);
      bench.add(back);
      [-0.95, 0.95].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.45, 0.50), matBenchIron);
        leg.position.set(lx, 0.225, 0);
        bench.add(leg);
      });
      this.scene.add(bench);
    });

    // Collect Praça da Bandeira Ipês + Riverfront Palms + Avenue Shrubs & Street Trees
    [
      [-26, 0.3, -26, 'y'],
      [-8, 0.3, -26, 'p'],
      [-26, 0.3, -8, 'p'],
      [-8, 0.3, -8, 'y'],
    ].forEach(([tx, ty, tz, kind]) => {
      if (kind === 'y') treeCollector.ipesYellow.push({ x: tx as number, y: ty as number, z: tz as number, scale: 1.02 });
      else treeCollector.ipesPink.push({ x: tx as number, y: ty as number, z: tz as number, scale: 1.02 });
    });

    // Imperial Palms along BOTH continuous river embankments (Z = 6.2 & Z = 27.8)
    for (let px = -100; px <= 100; px += 14) {
      if (Math.abs(px % 34) < 8) continue;
      treeCollector.palms.push({
        x: px,
        y: 0.24,
        z: 6.2,
        scale: 0.95 + (Math.abs(px) % 3) * 0.08,
      });
      treeCollector.palms.push({ x: px, y: 0.24, z: 27.8, scale: 0.95 + (Math.abs(px + 1) % 3) * 0.08 });
      treeCollector.shrubs.push({ x: px + 4.5, y: 0.24, z: 6.2, scale: 0.9 });
      treeCollector.shrubs.push({ x: px - 4.5, y: 0.24, z: 27.8, scale: 0.9 });
    }

    // Sidewalk Ipês & leafy trees lining avenues (grounded on cityRoadY!)
    for (let sx = -138; sx <= 138; sx += 20) {
      if (Math.abs(sx) > 100 && Math.abs(sx) < 110) continue;
      if (Math.abs(sx) <= 102 && Math.abs(sx % 34) < 9) continue;
      treeCollector.urbanLeafy.push({ x: sx, y: cityRoadY(-6.4) + 0.2, z: -6.4, scale: 0.85 });
      if (Math.abs(sx) > 36) {
        treeCollector.ipesYellow.push({ x: sx, y: cityRoadY(-61.2) + 0.2, z: -61.2, scale: 0.88 });
      }
      if (sx % 40 === 0) {
        treeCollector.ipesPink.push({ x: sx, y: cityRoadY(-74.8) + 0.2, z: -74.8, scale: 0.92 });
      }
    }
    // Palms extending along South Waterfront boardwalk toward West Beach & East Boulevard
    [-155, -142, -128, -114, 114, 128, 142].forEach((px, idx) => {
      treeCollector.palms.push({ x: px, y: 0.24, z: 6.2, scale: 0.98 + (idx % 2) * 0.08 });
      treeCollector.shrubs.push({ x: px + 3.5, y: 0.24, z: 6.2, scale: 0.9 });
    });

    // 3. 5 PONTES CONECTADAS (3 ESTAIADAS + ARCO + CONCRETO)
    this.scene.add(createConnectedBridges(this.atlas, this.lampEmissiveMat));

    // 4. RUA DAS LOJAS 2.0 & SHOPPING METRÓPOLE + PASSARELA + MOBILIÁRIO URBANO
    const shops = createShopsAndShoppingDistrict(this.atlas, this.windowEmissiveMat);
    this.shopAnimated = shops.animated;
    this.scene.add(shops.group);

    // 5. CENTRO FINANCEIRO VERTICAL + VIADUTO + HORIZONTE CONTÍNUO
    this.financialResult = createFinancialCenterAndHorizon(
      this.atlas,
      this.lampEmissiveMat,
      treeCollector,
    );
    this.beacons.push(...this.financialResult.beaconMats);
    this.skylineGlowMats.push(...this.financialResult.skylineGlowMats);
    this.scene.add(this.financialResult.group);

    // 5B. EXPANSÃO LATERAL: 3 PRÉDIOS LARGOS DE MORADIA (2-EM-1) + 3 PRÉDIOS DE VENDAS C/ OUTDOORS & ESTACIONAMENTOS
    this.expandedResult = createExpandedBuildingsDistrict(
      this.atlas,
      this.lampEmissiveMat,
      treeCollector,
    );
    this.beacons.push(...this.expandedResult.beaconMats);
    this.skylineGlowMats.push(...this.expandedResult.skylineGlowMats);
    this.scene.add(this.expandedResult.group);

    // 6. BAIRRO RESIDENCIAL DE CASAS URBANAS + PRAÇA + BARES + POSTES
    this.residentialResult = createResidentialDistrict(
      this.atlas,
      this.windowEmissiveMat,
      this.lampEmissiveMat,
      treeCollector,
    );
    this.scene.add(this.residentialResult.group);

    // 7. MORRO / FAVELA DENSA CONECTADA + NASCENTE & CÓRREGO
    this.scene.add(createMorroDistrict(this.atlas, this.windowEmissiveMat, this.lampEmissiveMat, treeCollector));

    // 7B. CAIS BAIXO (-0.85m) NA ORLA + MIRANTE ALTO DA SERRA SUL (+13.8m)
    this.buildWaterfrontCaisAndOverlook(treeCollector);

    // 7C. PRAIA OESTE PONTA NEGRA (X < -176.2), CALÇADÃO 9M, ESCADAS, LOJAS, CADEIRAS, PONTE & ILHA DO SOL
    const { result: beachRes, npcSpots: beachNpcs } = createWestBeachAndIsland(
      this.atlas,
      this.lampEmissiveMat,
      treeCollector,
    );
    this.beachResult = beachRes;
    this.beachNpcSpots = beachNpcs;
    this.scene.add(this.beachResult.group);

    // 7D. REFLORESTAMENTO COMPLETO (Ilha do Sol, Orla Oeste, Bosques N/S, Serra Sul & Flancos)
    this.populateReforestation(treeCollector);

    // Extra flowering shrubs framing avenues, Praça, Cidade Alta & Expanded Boulevards
    for (let sx = -136; sx <= 136; sx += 18) {
      if (Math.abs(sx) > 96 && Math.abs(sx) < 112) continue;
      if (Math.abs(sx) <= 102 && Math.abs(sx % 34) < 8) continue;
      treeCollector.shrubs.push({ x: sx, y: cityRoadY(-6.2) + 0.14, z: -6.2, scale: 0.85 });
      treeCollector.shrubs.push({ x: sx, y: cityRoadY(-27.8) + 0.14, z: -27.8, scale: 0.85 });
    }

    // 8. INSTANCED BOTANICAL VEGETATION SYSTEM (MULTI-BRANCH TREES + FLOWERING SHRUBS)
    this.vegetation = createVegetationSystem(treeCollector);
    this.scene.add(this.vegetation.group);

    // 9. OUTDOORS, PÓRTICOS, PLACAS DE ESQUINA/TRÂNSITO, MAPAS & SEMÁFOROS
    this.buildBillboardsAndTrafficSigns();
    this.buildIntersectionsAndLights();

    // 10. TRÂNSITO INTENSO (Frota 50), 5 BARCOS REAIS, HELICÓPTEROS & NPCS
    this.spawnVehiclesAndBoats(maxAniso);
    this.spawnArticulatedNpcs();
  }

  private buildWaterfrontCaisAndOverlook(treeCollector: {
    ipesYellow: VegetationPlacement[];
    ipesPink: VegetationPlacement[];
    shrubs: VegetationPlacement[];
  }) {
    const matGranite = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.78 });
    const matCaisDeck = new THREE.MeshStandardMaterial({ map: this.atlas.sidewalk, roughness: 0.82 });
    const matWoodPier = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.76 });
    const matIron = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.75 });
    const matBuoy = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
    const matGlassRail = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.38,
      roughness: 0.12,
      metalness: 0.45,
    });

    // CAIS BAIXO (-0.85m) flanking Central Bridge on South Riverbank: X ∈ [-28, -8] & [+8, +28]
    [
      { xCenter: -18, hasPier: true },
      { xCenter: 18, hasPier: false },
    ].forEach(({ xCenter, hasPier }) => {
      // Lower riverside granite terrace at Y = -0.85m (top at -0.80m)
      const deck = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1.3, 3.2), matCaisDeck);
      deck.position.set(xCenter, -1.45, 8.2);
      deck.receiveShadow = true;
      this.scene.add(deck);

      // Granite stairs stepping down from 0.24m boardwalk to -0.80m Cais Baixo
      for (let st = 0; st < 5; st++) {
        const stepY = 0.08 - st * 0.21;
        const stepZ = 5.4 + st * 0.34;
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.24, 0.44), matGranite);
        stepMesh.position.set(xCenter, stepY, stepZ);
        stepMesh.receiveShadow = true;
        this.scene.add(stepMesh);
      }

      // Guardrails flanking the stair gap + promenade lantern bollards
      [-6.8, 6.8].forEach((ox) => {
        const bx = xCenter + ox;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.85, 0.12), matIron);
        rail.position.set(bx, 0.65, 6.7);
        this.scene.add(rail);

        const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.9, 10), matIron);
        bollard.position.set(bx, -0.35, 9.45);
        this.scene.add(bollard);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.18, 10), this.lampEmissiveMat);
        cap.position.set(bx, 0.12, 9.45);
        this.scene.add(cap);
      });

      treeCollector.shrubs.push({ x: xCenter - 8.2, y: 0.24, z: 5.1, scale: 0.9 });
      treeCollector.shrubs.push({ x: xCenter + 8.2, y: 0.24, z: 5.1, scale: 0.9 });

      if (hasPier) {
        // Timber Yacht Pier jutting out over the river at -0.85m
        const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 2.8), matWoodPier);
        pierDeck.position.set(xCenter, -0.84, 10.6);
        pierDeck.castShadow = true;
        pierDeck.receiveShadow = true;
        this.scene.add(pierDeck);

        [-4.8, 0, 4.8].forEach((px) => {
          [9.5, 11.7].forEach((pz) => {
            const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.1, 8), matWoodPier);
            piling.position.set(xCenter + px, -1.75, pz);
            this.scene.add(piling);
          });
          const cleat = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.34, 8), matIron);
          cleat.position.set(xCenter + px, -0.58, 11.75);
          this.scene.add(cleat);
        });

        const lifeRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 16), matBuoy);
        lifeRing.position.set(xCenter + 4.8, -0.30, 9.45);
        this.scene.add(lifeRing);
      }
    });

    // MIRANTE ALTO DA SERRA SUL (+13.8m) at South Summit (X = 0, Z = -144)
    const matAsphalt = new THREE.MeshStandardMaterial({ map: this.atlas.asphaltAvenue, roughness: 0.85 });
    const rampSegs = 20;
    const rampGeo = new THREE.PlaneGeometry(10.0, 20.0, 1, rampSegs);
    rampGeo.rotateX(-Math.PI / 2);
    rampGeo.translate(0, 0, -133.5);
    const rPos = rampGeo.attributes.position;
    const rUv = rampGeo.attributes.uv;
    for (let i = 0; i < rPos.count; i++) {
      const rz = rPos.getZ(i);
      rPos.setY(i, cityBasinTerrainY(0, rz) + 0.08);
      rUv.setY(i, rUv.getY(i) * 2.2);
    }
    rampGeo.computeVertexNormals();
    const overlookRamp = new THREE.Mesh(rampGeo, matAsphalt);
    overlookRamp.receiveShadow = true;
    this.scene.add(overlookRamp);

    const miranteY = 13.85;
    const overlookDeck = new THREE.Mesh(new THREE.CylinderGeometry(13.5, 14.8, 1.8, 28), matGranite);
    overlookDeck.position.set(0, miranteY - 0.85, -144);
    overlookDeck.receiveShadow = true;
    overlookDeck.castShadow = true;
    this.scene.add(overlookDeck);

    const overlookSurface = new THREE.Mesh(new THREE.CylinderGeometry(13.0, 13.0, 0.14, 28), matCaisDeck);
    overlookSurface.position.set(0, miranteY + 0.06, -144);
    overlookSurface.receiveShadow = true;
    this.scene.add(overlookSurface);

    // Panoramic glass balcony rim looking North over the entire metropolis
    for (let a = -Math.PI * 0.38; a <= Math.PI * 0.38; a += Math.PI * 0.095) {
      const gx = Math.sin(a) * 12.6;
      const gz = -144 + Math.cos(a) * 12.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.15, 8), matIron);
      post.position.set(gx, miranteY + 0.65, gz);
      this.scene.add(post);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.92, 0.06), matGlassRail);
      glass.position.set(gx, miranteY + 0.62, gz);
      glass.rotation.y = a;
      this.scene.add(glass);
    }

    // Architectural Lookout Monument + Observation Binoculars + Lamps at Mirante Sul
    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.95, 5.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 }),
    );
    obelisk.position.set(0, miranteY + 2.75, -149.5);
    obelisk.rotation.y = Math.PI / 4;
    obelisk.castShadow = true;
    this.scene.add(obelisk);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), this.lampEmissiveMat);
    beacon.position.set(0, miranteY + 5.65, -149.5);
    this.scene.add(beacon);

    [-4.2, 4.2].forEach((bx) => {
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.35, 8), matIron);
      stand.position.set(bx, miranteY + 0.72, -133.0);
      this.scene.add(stand);
      const bino = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.45), matIron);
      bino.position.set(bx, miranteY + 1.44, -132.9);
      this.scene.add(bino);
    });

    // Flowering Ipês & shrubs crowning the Mirante Sul terrace
    treeCollector.ipesYellow.push({ x: -10.5, y: miranteY + 0.1, z: -146.5, scale: 1.05 });
    treeCollector.ipesPink.push({ x: 10.5, y: miranteY + 0.1, z: -146.5, scale: 1.05 });
    [-8.5, -5.5, 5.5, 8.5].forEach((sx) => {
      treeCollector.shrubs.push({ x: sx, y: miranteY + 0.1, z: -148.5, scale: 0.95 });
    });
  }

  private populateReforestation(treeCollector: {
    palms: VegetationPlacement[];
    beachPalms: VegetationPlacement[];
    ipesYellow: VegetationPlacement[];
    ipesPink: VegetationPlacement[];
    urbanLeafy: VegetationPlacement[];
    atlanticForest: VegetationPlacement[];
    shrubs: VegetationPlacement[];
  }) {
    const canPlant = (x: number, z: number): boolean => {
      if (z > 6.5 && z < 27.5 && x >= -176.5) return false; // river channel
      if (Math.abs(x) <= 154.5 && z >= -131 && z <= 7.6) return false; // urban asphalt grid
      if (Math.abs(x) <= 113.5 && z >= 26 && z <= 43.2) return false; // Marginal Norte
      if (x >= -176.8 && x <= -156.2 && z >= -114.5 && z <= 8.5) return false; // Av. Beira-Mar + Grand Calçadão
      if (x > -156.4 && x <= -153.0 && z >= -42.0 && z <= 8.5) return false; // Coastal connector spurs
      if (Math.hypot(x + 162, z + 108.5) < 8.5) return false; // South Beach roundabout
      if (x > 73 && x < 97 && z > 25 && z < 122 && Math.abs(x - creekCenterX(z)) < 5.8) return false; // Córrego
      if (Math.hypot(x, z + 144) < 16.0) return false; // Mirante Sul terrace
      if (Math.abs(x) < 7.5 && z < -123 && z > -145) return false; // Mirante Sul ramp
      return cityBasinTerrainY(x, z) >= 0.32;
    };

    const pushSpecies = (idx: number, x: number, y: number, z: number, scale: number) => {
      const m = idx % 10;
      if (m < 5) treeCollector.atlanticForest.push({ x, y, z, scale });
      else if (m < 7) treeCollector.urbanLeafy.push({ x, y, z, scale: scale * 0.92 });
      else if (m === 7) treeCollector.ipesYellow.push({ x, y, z, scale: scale * 0.92 });
      else if (m === 8) treeCollector.ipesPink.push({ x, y, z, scale: scale * 0.92 });
      else treeCollector.palms.push({ x, y, z, scale: scale * 0.95 });
    };

    // 1. BOSQUE DE REFLORESTAMENTO NOROESTE (X ∈ [-204, -116], Z ∈ [+34, +110])
    for (let i = 0; i < 88; i++) {
      const tx = -202 + ((i * 37) % 86);
      const tz = 35 + ((i * 23) % 74);
      if (!canPlant(tx, tz)) continue;
      const ty = cityBasinTerrainY(tx, tz);
      pushSpecies(i + 2, tx, ty, tz, 0.96 + (i % 4) * 0.13);
      if (i % 4 === 0) treeCollector.shrubs.push({ x: tx + 1.5, y: ty, z: tz + 1.2, scale: 0.95 });
    }

    // 2. MATA DO COSTÃO & MORRO DA DUNA SUL (X ∈ [-242, -157], Z ∈ [-188, -116])
    for (let i = 0; i < 92; i++) {
      const tx = -240 + ((i * 31) % 82);
      const tz = -186 + ((i * 29) % 69);
      if (!canPlant(tx, tz)) continue;
      const ty = cityBasinTerrainY(tx, tz);
      pushSpecies(i + 5, tx, ty, tz, 0.95 + (i % 3) * 0.14);
      if (i % 4 === 0) treeCollector.shrubs.push({ x: tx, y: ty, z: tz - 1.6, scale: 0.95 });
    }

    // 4. SERRA SUL & CINTURÃO VERDE LESTE (Z ∈ [-192, -135] & X ∈ [+157, +225])
    for (let i = 0; i < 72; i++) {
      const tx = -148 + ((i * 43) % 296);
      const tz = -188 + ((i * 19) % 52);
      if (!canPlant(tx, tz)) continue;
      const ty = cityBasinTerrainY(tx, tz);
      pushSpecies(i + 1, tx, ty, tz, 1.0 + (i % 4) * 0.12);
    }
    for (let i = 0; i < 82; i++) {
      const tx = 158 + ((i * 29) % 66);
      const tz = -165 + ((i * 37) % 270);
      if (!canPlant(tx, tz)) continue;
      const ty = cityBasinTerrainY(tx, tz);
      pushSpecies(i + 3, tx, ty, tz, 0.96 + (i % 3) * 0.14);
      if (i % 5 === 0) treeCollector.shrubs.push({ x: tx - 1.4, y: ty, z: tz, scale: 0.95 });
    }
  }

  private buildBillboardsAndTrafficSigns() {
    const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.7 });
    const matGalvanized = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.82 });

    // Highway Advertising Billboards on sidewalk corners
    [
      [-28.2, -39.5, 0.35, 0],
      [28.0, 29.2, -0.25, 1],
      [74.0, -28.0, -0.45, 0],
      [-74.0, -28.0, 0.45, 1],
    ].forEach(([bx, bz, ry, idx]) => {
      const bg = new THREE.Group();
      bg.position.set(bx, cityRoadY(bz) + 0.15, bz);
      bg.rotation.y = ry;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7.5, 10), matDarkSteel);
      post.position.y = 3.75;
      bg.add(post);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(8.8, 4.4, 0.35),
        new THREE.MeshStandardMaterial({
          map: this.atlas.billboard[idx],
          emissive: 0xffffff,
          emissiveMap: this.atlas.billboard[idx],
          emissiveIntensity: 0.45,
        }),
      );
      board.position.y = 8.4;
      board.castShadow = true;
      bg.add(board);
      this.scene.add(bg);
    });

    // 3 Overhead Steel Truss Highway Gantries (Pórticos Viários com placas direcionais)
    [
      { x: 0, z: -40.5, rotY: 0, texIdx: 0 },
      { x: 0, z: -63.5, rotY: 0, texIdx: 1 },
      { x: 16.5, z: 34, rotY: Math.PI / 2, texIdx: 2 },
    ].forEach(({ x, z, rotY, texIdx }) => {
      const gGroup = new THREE.Group();
      gGroup.position.set(x, cityRoadY(z) + 0.08, z);
      gGroup.rotation.y = rotY;
      [-6.2, 6.2].forEach((px) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7.2, 8), matGalvanized);
        leg.position.set(px, 3.6, 0);
        leg.castShadow = true;
        gGroup.add(leg);
      });
      const beamTop = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.24, 0.34), matGalvanized);
      beamTop.position.set(0, 7.1, 0);
      gGroup.add(beamTop);
      const beamBot = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.18, 0.30), matGalvanized);
      beamBot.position.set(0, 5.65, 0);
      gGroup.add(beamBot);

      const signMat = new THREE.MeshStandardMaterial({
        map: this.atlas.gantrySigns[texIdx],
        emissive: 0xffffff,
        emissiveMap: this.atlas.gantrySigns[texIdx],
        emissiveIntensity: 0.25,
        roughness: 0.35,
      });
      const signBox = new THREE.Mesh(new THREE.BoxGeometry(10.8, 2.35, 0.22), signMat);
      signBox.position.set(0, 6.42, 0);
      signBox.castShadow = true;
      gGroup.add(signBox);
      this.scene.add(gGroup);
    });

    // 5 Corner Blue Street-Name Totems (Placas de Nome de Rua)
    [
      [-6.0, -5.8, 0, 0],
      [6.0, -28.2, Math.PI, 1],
      [-6.0, -73.8, Math.PI, 3],
      [6.0, 28.2, 0, 4],
      [40.2, -28.2, -Math.PI / 2, 2],
    ].forEach(([sx, sz, ry, pIdx]) => {
      const st = new THREE.Group();
      st.position.set(sx, cityRoadY(sz) + 0.14, sz);
      st.rotation.y = ry;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.1, 8), matDarkSteel);
      pole.position.y = 1.55;
      st.add(pole);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.65, 0.08),
        new THREE.MeshStandardMaterial({ map: this.atlas.streetNamePlates[pIdx], roughness: 0.4 }),
      );
      plate.position.y = 2.95;
      st.add(plate);
      this.scene.add(st);
    });

    // 2 City Wayfinding Map Kiosks (Praça da Bandeira & Parque do Bairro)
    [
      [-17, 0.30, -9.4, 0],
      [17, blockTerraceY(-85) + 0.22, -77.5, Math.PI],
    ].forEach(([kx, ky, kz, ry]) => {
      const kiosk = new THREE.Group();
      kiosk.position.set(kx, ky, kz);
      kiosk.rotation.y = ry;
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.45, 0.26), matDarkSteel);
      base.position.y = 1.22;
      base.castShadow = true;
      kiosk.add(base);
      const mapMat = new THREE.MeshStandardMaterial({
        map: this.atlas.wayfindingMap,
        emissive: 0xffffff,
        emissiveMap: this.atlas.wayfindingMap,
        emissiveIntensity: 0.3,
        roughness: 0.3,
      });
      const faceF = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.55), mapMat);
      faceF.position.set(0, 1.45, 0.14);
      kiosk.add(faceF);
      const faceB = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.55), mapMat);
      faceB.position.set(0, 1.45, -0.14);
      faceB.rotation.y = Math.PI;
      kiosk.add(faceB);
      this.scene.add(kiosk);
    });

    // Regulatory, Warning & Tourist Signs (PARE, 60km/h, Pedestre, Ladeira 11%, Proibido Estacionar, Mirante)
    const makeSignMat = (tex: THREE.Texture, alpha = true) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        transparent: alpha,
        alphaTest: alpha ? 0.3 : 0,
        side: THREE.DoubleSide,
        roughness: 0.42,
      });
    const signMats = {
      stop: makeSignMat(this.atlas.trafficSignStop),
      speed: makeSignMat(this.atlas.trafficSignSpeed),
      ped: makeSignMat(this.atlas.trafficSignPedestrian),
      slope: makeSignMat(this.atlas.trafficSignSlope),
      noPark: makeSignMat(this.atlas.trafficSignNoParking),
      overlook: makeSignMat(this.atlas.trafficSignTouristOverlook, false),
      school: makeSignMat(this.atlas.trafficSignSchool),
    };
    const signSpots: [number, number, number, keyof typeof signMats, number, number][] = [
      [-6.5, -62.2, 0, 'stop', 0.95, 0.95],
      [6.5, -73.8, Math.PI, 'stop', 0.95, 0.95],
      [-28.2, 6.2, Math.PI / 2, 'speed', 0.95, 0.95],
      [28.2, -6.2, -Math.PI / 2, 'speed', 0.95, 0.95],
      [-62.2, -39.8, 0, 'stop', 0.95, 0.95],
      [62.2, -28.2, Math.PI, 'speed', 0.95, 0.95],
      [-5.8, -40.2, 0, 'slope', 0.98, 0.98],
      [5.8, -74.5, Math.PI, 'slope', 0.98, 0.98],
      [-6.2, -7.8, 0, 'ped', 0.95, 0.95],
      [6.2, -26.2, Math.PI, 'ped', 0.95, 0.95],
      [-39.8, -7.8, Math.PI / 2, 'ped', 0.95, 0.95],
      [-5.8, 5.2, 0, 'noPark', 0.88, 0.88],
      [5.8, 28.6, Math.PI, 'noPark', 0.88, 0.88],
      [-6.2, -125.5, 0, 'overlook', 1.85, 0.92],
      // Escola Pública E.M. Cidade Nova — Área Escolar signs
      [-25.4, -73.4, -Math.PI / 2, 'school', 1.05, 1.05],
      [-8.8, -73.4, Math.PI / 2, 'school', 1.05, 1.05],
    ];
    const signPoleGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.8, 8);
    signSpots.forEach(([sx, sz, ry, kind, pw, ph]) => {
      const sg = new THREE.Group();
      sg.position.set(sx, cityRoadY(sz) + 0.12, sz);
      sg.rotation.y = ry;
      const pole = new THREE.Mesh(signPoleGeo, matDarkSteel);
      pole.position.y = 1.4;
      sg.add(pole);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), signMats[kind]);
      plate.position.y = 2.65;
      sg.add(plate);
      this.scene.add(sg);
    });

    // Dedicated yellow-accented school crosswalk across Av. Panorâmica Z = -68 (InstancedMesh)
    const unitCrossGeo = new THREE.BoxGeometry(1, 1, 1);
    const crossDummy = new THREE.Object3D();
    const matSchoolCross = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
    const crossY = cityRoadY(-68) + 0.068;
    const schoolCoords: number[] = [];
    for (let sz = -72.0; sz <= -64.0; sz += 1.45) {
      schoolCoords.push(sz);
    }
    const schoolCrossInst = new THREE.InstancedMesh(unitCrossGeo, matSchoolCross, schoolCoords.length);
    schoolCrossInst.frustumCulled = false;
    schoolCoords.forEach((sz, i) => {
      crossDummy.position.set(-17, crossY, sz);
      crossDummy.scale.set(2.6, 0.02, 0.65);
      crossDummy.updateMatrix();
      schoolCrossInst.setMatrixAt(i, crossDummy.matrix);
    });
    schoolCrossInst.instanceMatrix.needsUpdate = true;
    this.scene.add(schoolCrossInst);
  }

  private buildIntersectionsAndLights() {
    const matCross = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.6 });
    const intersections: [number, number][] = [
      [0, 0],
      [-34, 0],
      [34, 0],
      [-68, 0],
      [68, 0],
      [0, -34],
      [-34, -34],
      [34, -34],
      [0, -68],
      [34, -68],
      [-68, -34],
      [68, -34],
      [-148, 0],
      [148, 0],
      [-148, -34],
      [148, -34],
      [-148, -68],
      [148, -68],
      [-148, -102],
      [148, -102],
      [-162, 0],
      [-162, -34],
    ];

    // Batch all ~560 crosswalk stripes into 1 single InstancedMesh!
    const crossTransforms: THREE.Matrix4[] = [];
    const crossDummy = new THREE.Object3D();
    intersections.forEach(([ix, iz]) => {
      const iy = cityRoadY(iz);
      for (let s = -4; s <= 4; s += 1.4) {
        crossDummy.scale.set(0.65, 0.02, 2.2);
        crossDummy.position.set(ix + s, iy + 0.065, iz - 6.8);
        crossDummy.updateMatrix();
        crossTransforms.push(crossDummy.matrix.clone());

        crossDummy.position.set(ix + s, iy + 0.065, iz + 6.8);
        crossDummy.updateMatrix();
        crossTransforms.push(crossDummy.matrix.clone());

        crossDummy.scale.set(2.2, 0.02, 0.65);
        crossDummy.position.set(ix - 6.8, iy + 0.065, iz + s);
        crossDummy.updateMatrix();
        crossTransforms.push(crossDummy.matrix.clone());

        crossDummy.position.set(ix + 6.8, iy + 0.065, iz + s);
        crossDummy.updateMatrix();
        crossTransforms.push(crossDummy.matrix.clone());
      }
    });
    const whiteCrossInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matCross, crossTransforms.length);
    whiteCrossInst.frustumCulled = false;
    crossTransforms.forEach((m, i) => whiteCrossInst.setMatrixAt(i, m));
    whiteCrossInst.instanceMatrix.needsUpdate = true;
    this.scene.add(whiteCrossInst);

    intersections.forEach(([ix, iz], idx) => {
      const iy = cityRoadY(iz);

      if (idx < 8 || Math.abs(ix) === 148 && iz >= -34) {
        const rigZ1 = createTrafficLightRig('z');
        rigZ1.group.position.set(ix - 6.0, iy + 0.15, iz - 6.0);
        this.scene.add(rigZ1.group);
        this.trafficLights.push(rigZ1);

        const rigZ2 = createTrafficLightRig('z');
        rigZ2.group.position.set(ix + 6.0, iy + 0.15, iz + 6.0);
        rigZ2.group.rotation.y = Math.PI;
        this.scene.add(rigZ2.group);
        this.trafficLights.push(rigZ2);

        const rigX1 = createTrafficLightRig('x');
        rigX1.group.position.set(ix + 6.0, iy + 0.15, iz - 6.0);
        rigX1.group.rotation.y = -Math.PI / 2;
        this.scene.add(rigX1.group);
        this.trafficLights.push(rigX1);

        const rigX2 = createTrafficLightRig('x');
        rigX2.group.position.set(ix - 6.0, iy + 0.15, iz + 6.0);
        rigX2.group.rotation.y = Math.PI / 2;
        this.scene.add(rigX2.group);
        this.trafficLights.push(rigX2);
      }
    });

    const lampSpots: [number, number, number, boolean][] = [
      [-17, -6.2, Math.PI / 2, false],
      [-17, -27.8, -Math.PI / 2, false],
      [17, -6.2, Math.PI / 2, false],
      [17, -27.8, -Math.PI / 2, false],
      [51, -6.2, Math.PI / 2, false],
      [-51, -6.2, Math.PI / 2, false],
      [-51, -27.8, -Math.PI / 2, false],
      [51, -27.8, -Math.PI / 2, false],
      [-6.2, -17, 0, false],
      [6.2, -17, Math.PI, false],
      [0, -17, 0, true],
      [-34, -17, 0, true],
      [34, -17, 0, true],
      [-68, -17, 0, true],
      [68, -17, 0, true],
      [0, -68, Math.PI / 2, true],
      [-34, -68, Math.PI / 2, true],
      [34, -68, Math.PI / 2, true],
      // Outer Boulevards X = ±148 & Wide Blocks X = ±125
      [-125, -6.2, Math.PI / 2, false],
      [125, -6.2, Math.PI / 2, false],
      [-125, -39.8, Math.PI / 2, false],
      [125, -39.8, Math.PI / 2, false],
      [-125, -73.8, Math.PI / 2, false],
      [125, -73.8, Math.PI / 2, false],
      [-142.2, -17, Math.PI, false],
      [-142.2, -51, Math.PI, false],
      [-142.2, -85, Math.PI, false],
      [142.2, -17, 0, false],
      [142.2, -51, 0, false],
      [142.2, -85, 0, false],
      // Av. Beira-Mar Oeste (X = -162) & 120m Grand Calçadão streetlights
      [-167.0, 4, Math.PI, false],
      [-167.0, -10, Math.PI, false],
      [-167.0, -24, Math.PI, false],
      [-167.0, -38, Math.PI, false],
      [-167.0, -52, Math.PI, false],
      [-167.0, -66, Math.PI, false],
      [-167.0, -80, Math.PI, false],
      [-167.0, -94, Math.PI, false],
      [-167.0, -106, Math.PI, false],
    ];
    lampSpots.forEach(([lx, lz, rot, dbl]) => {
      const lamp = createStreetlightRig(dbl, this.lampEmissiveMat);
      lamp.position.set(lx, cityRoadY(lz) + 0.16, lz);
      lamp.rotation.y = rot;
      this.scene.add(lamp);
    });
  }

  private getEmergencyMode(concept: VehicleConcept): 'police_fire' | 'amber' | null {
    const arch = concept.geometry.archetype;
    if (
      concept.geometry.attachments.includes('lightbar_police') ||
      arch === 'ambulance' ||
      arch === 'firetruck' ||
      arch === 'rib_boat' ||
      concept.id === 49 ||
      concept.id === 100
    ) {
      return 'police_fire';
    }
    if (concept.geometry.attachments.includes('lightbar_amber')) {
      return 'amber';
    }
    return null;
  }

  private registerCityVehicle(built: BuiltVehicle, concept: VehicleConcept, phaseIndex: number) {
    this.allCityVehicles.push(built);
    const emergencyMode = this.getEmergencyMode(concept);
    if (emergencyMode) {
      this.emergencyActors.push({
        built,
        mode: emergencyMode,
        phase: phaseIndex * 0.85,
      });
    }
  }

  private spawnVehiclesAndBoats(maxAniso: number) {
    const placedIds = new Set<number>();

    type LaneCfg = {
      vid: number;
      axis: 'x' | 'z';
      dir: 1 | -1;
      laneCoord: number;
      posCoord: number;
      minC: number;
      maxC: number;
      speed: number;
      customY?: number;
      ignoreSignals?: boolean;
    };

    const laneConfigs: LaneCfg[] = [
      // 1. Av. Central & Ponte Estaiada (X = 0) — sobe e desce as ladeiras!
      { vid: 9, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: -96, minC: -124, maxC: 38, speed: 13.5 },
      { vid: 23, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: -42, minC: -124, maxC: 38, speed: 11.2 },
      { vid: 2, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: 12, minC: -124, maxC: 38, speed: 12.0 },
      { vid: 20, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: 28, minC: -124, maxC: 38, speed: 13.2 },
      { vid: 31, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: -26, minC: -124, maxC: 38, speed: 10.6 },
      { vid: 5, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: -86, minC: -124, maxC: 38, speed: 11.8 },

      // 2. Av. Oeste & Ponte em Arco (X = -34)
      { vid: 1, axis: 'z', dir: 1, laneCoord: -34 + 2.6, posCoord: -102, minC: -124, maxC: 38, speed: 11.8 },
      { vid: 14, axis: 'z', dir: 1, laneCoord: -34 + 2.6, posCoord: -48, minC: -124, maxC: 38, speed: 12.8 },
      { vid: 51, axis: 'z', dir: 1, laneCoord: -34 + 2.6, posCoord: 8, minC: -124, maxC: 38, speed: 13.4 },
      { vid: 17, axis: 'z', dir: -1, laneCoord: -34 - 2.6, posCoord: 24, minC: -124, maxC: 38, speed: 12.2 },
      { vid: 27, axis: 'z', dir: -1, laneCoord: -34 - 2.6, posCoord: -30, minC: -124, maxC: 38, speed: 13.0 },
      { vid: 38, axis: 'z', dir: -1, laneCoord: -34 - 2.6, posCoord: -84, minC: -124, maxC: 38, speed: 11.6 },

      // 3. Av. Leste & Ponte Concreto (X = +34)
      { vid: 12, axis: 'z', dir: 1, laneCoord: 34 + 2.6, posCoord: -98, minC: -124, maxC: 38, speed: 12.6 },
      { vid: 59, axis: 'z', dir: 1, laneCoord: 34 + 2.6, posCoord: -44, minC: -124, maxC: 38, speed: 11.8 },
      { vid: 72, axis: 'z', dir: 1, laneCoord: 34 + 2.6, posCoord: 12, minC: -124, maxC: 38, speed: 14.4 },
      { vid: 24, axis: 'z', dir: -1, laneCoord: 34 - 2.6, posCoord: 22, minC: -124, maxC: 38, speed: 12.8 },
      { vid: 36, axis: 'z', dir: -1, laneCoord: 34 - 2.6, posCoord: -32, minC: -124, maxC: 38, speed: 9.8 },
      { vid: 64, axis: 'z', dir: -1, laneCoord: 34 - 2.6, posCoord: -86, minC: -124, maxC: 38, speed: 12.4 },

      // 4. Pontes Estaiadas Oeste & Leste (X = -68 & X = +68, antes das rotatórias em Z = -68)
      { vid: 11, axis: 'z', dir: 1, laneCoord: -68 + 2.6, posCoord: -42, minC: -56, maxC: 38, speed: 14.5 },
      { vid: 39, axis: 'z', dir: 1, laneCoord: -68 + 2.6, posCoord: 4, minC: -56, maxC: 38, speed: 15.0 },
      { vid: 25, axis: 'z', dir: -1, laneCoord: -68 - 2.6, posCoord: 26, minC: -56, maxC: 38, speed: 14.2 },
      { vid: 68, axis: 'z', dir: -1, laneCoord: -68 - 2.6, posCoord: -22, minC: -56, maxC: 38, speed: 12.5 },

      { vid: 19, axis: 'z', dir: 1, laneCoord: 68 + 2.6, posCoord: -40, minC: -56, maxC: 38, speed: 12.0 },
      { vid: 71, axis: 'z', dir: 1, laneCoord: 68 + 2.6, posCoord: 6, minC: -56, maxC: 38, speed: 13.8 },
      { vid: 28, axis: 'z', dir: -1, laneCoord: 68 - 2.6, posCoord: 24, minC: -56, maxC: 38, speed: 11.4 },
      { vid: 54, axis: 'z', dir: -1, laneCoord: 68 - 2.6, posCoord: -24, minC: -56, maxC: 38, speed: 13.6 },

      // 5. Avenidas Médias Oeste & Leste (X = -102 & X = +102, trecho sul até Z = +0)
      { vid: 52, axis: 'z', dir: 1, laneCoord: -102 + 2.6, posCoord: -96, minC: -124, maxC: 2, speed: 12.6, ignoreSignals: true },
      { vid: 74, axis: 'z', dir: 1, laneCoord: -102 + 2.6, posCoord: -32, minC: -124, maxC: 2, speed: 13.4, ignoreSignals: true },
      { vid: 26, axis: 'z', dir: -1, laneCoord: -102 - 2.6, posCoord: -14, minC: -124, maxC: 2, speed: 10.6, ignoreSignals: true },
      { vid: 61, axis: 'z', dir: -1, laneCoord: -102 - 2.6, posCoord: -78, minC: -124, maxC: 2, speed: 13.2, ignoreSignals: true },

      { vid: 56, axis: 'z', dir: 1, laneCoord: 102 + 2.6, posCoord: -92, minC: -124, maxC: 2, speed: 13.0, ignoreSignals: true },
      { vid: 75, axis: 'z', dir: 1, laneCoord: 102 + 2.6, posCoord: -28, minC: -124, maxC: 2, speed: 13.8, ignoreSignals: true },
      { vid: 34, axis: 'z', dir: -1, laneCoord: 102 - 2.6, posCoord: -16, minC: -124, maxC: 2, speed: 10.2, ignoreSignals: true },
      { vid: 62, axis: 'z', dir: -1, laneCoord: 102 - 2.6, posCoord: -80, minC: -124, maxC: 2, speed: 12.2, ignoreSignals: true },

      // 6. Avenidas Periféricas Oeste & Leste (X = -148 e X = +148)
      { vid: 18, axis: 'z', dir: 1, laneCoord: -148 + 2.6, posCoord: -88, minC: -104, maxC: 2, speed: 12.4 },
      { vid: 41, axis: 'z', dir: 1, laneCoord: -148 + 2.6, posCoord: -34, minC: -104, maxC: 2, speed: 13.8 },
      { vid: 22, axis: 'z', dir: -1, laneCoord: -148 - 2.6, posCoord: -14, minC: -104, maxC: 2, speed: 12.2 },
      { vid: 57, axis: 'z', dir: -1, laneCoord: -148 - 2.6, posCoord: -70, minC: -104, maxC: 2, speed: 13.5 },

      { vid: 29, axis: 'z', dir: 1, laneCoord: 148 + 2.6, posCoord: -86, minC: -104, maxC: 2, speed: 8.6 },
      { vid: 63, axis: 'z', dir: 1, laneCoord: 148 + 2.6, posCoord: -30, minC: -104, maxC: 2, speed: 13.2 },
      { vid: 30, axis: 'z', dir: -1, laneCoord: 148 - 2.6, posCoord: -12, minC: -104, maxC: 2, speed: 11.4 },
      { vid: 58, axis: 'z', dir: -1, laneCoord: 148 - 2.6, posCoord: -68, minC: -104, maxC: 2, speed: 13.6 },

      // 7. Av. Beira-Mar Oeste (X = -162) + Bikes Speed na ciclovia viária
      { vid: 43, axis: 'z', dir: 1, laneCoord: -162 + 2.6, posCoord: -90, minC: -102, maxC: 2, speed: 11.2 },
      { vid: 67, axis: 'z', dir: 1, laneCoord: -162 + 2.6, posCoord: -54, minC: -102, maxC: 2, speed: 12.0 },
      { vid: 103, axis: 'z', dir: 1, laneCoord: -162 + 2.6, posCoord: -18, minC: -102, maxC: 2, speed: 8.4 },
      { vid: 80, axis: 'z', dir: -1, laneCoord: -162 - 2.6, posCoord: -10, minC: -102, maxC: 2, speed: 11.6 },
      { vid: 60, axis: 'z', dir: -1, laneCoord: -162 - 2.6, posCoord: -46, minC: -102, maxC: 2, speed: 11.0 },
      { vid: 105, axis: 'z', dir: -1, laneCoord: -162 - 2.6, posCoord: -82, minC: -102, maxC: 2, speed: 8.8 },

      // 8. Grand Calçadão da Praia & Orla Fluvial — Bicicletas em movimento contínuo!
      { vid: 101, axis: 'z', dir: 1, laneCoord: -169.0, posCoord: -78, minC: -104, maxC: 2, speed: 5.2, customY: 0.30, ignoreSignals: true },
      { vid: 102, axis: 'z', dir: -1, laneCoord: -170.8, posCoord: -22, minC: -104, maxC: 2, speed: 4.8, customY: 0.30, ignoreSignals: true },
      { vid: 101, axis: 'x', dir: 1, laneCoord: 5.3, posCoord: -46, minC: -146, maxC: 102, speed: 4.4, customY: 0.24, ignoreSignals: true },

      // 9. Av. Beira-Centro (Z = 0, Y = 0.0m, 292m de extensão)
      { vid: 10, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: -130, minC: -146, maxC: 146, speed: 13.6 },
      { vid: 3, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: -70, minC: -146, maxC: 146, speed: 12.4 },
      { vid: 15, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: -12, minC: -146, maxC: 146, speed: 13.8 },
      { vid: 32, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: 50, minC: -146, maxC: 146, speed: 10.2 },
      { vid: 76, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: 112, minC: -146, maxC: 146, speed: 14.6 },
      { vid: 53, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: 124, minC: -146, maxC: 146, speed: 15.2 },
      { vid: 65, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: 56, minC: -146, maxC: 146, speed: 14.0 },
      { vid: 78, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: -12, minC: -146, maxC: 146, speed: 13.4 },
      { vid: 6, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: -78, minC: -146, maxC: 146, speed: 11.2 },

      // 10. Rua das Lojas (Z = -34, Y = 0.0m, 292m de extensão)
      { vid: 8, axis: 'x', dir: 1, laneCoord: -34 - 2.6, posCoord: -122, minC: -146, maxC: 146, speed: 11.6 },
      { vid: 40, axis: 'x', dir: 1, laneCoord: -34 - 2.6, posCoord: -50, minC: -146, maxC: 146, speed: 12.6 },
      { vid: 66, axis: 'x', dir: 1, laneCoord: -34 - 2.6, posCoord: 22, minC: -146, maxC: 146, speed: 14.4 },
      { vid: 77, axis: 'x', dir: 1, laneCoord: -34 - 2.6, posCoord: 94, minC: -146, maxC: 146, speed: 12.8 },
      { vid: 21, axis: 'x', dir: -1, laneCoord: -34 + 2.6, posCoord: 126, minC: -146, maxC: 146, speed: 10.8 },
      { vid: 55, axis: 'x', dir: -1, laneCoord: -34 + 2.6, posCoord: 52, minC: -146, maxC: 146, speed: 13.6 },
      { vid: 69, axis: 'x', dir: -1, laneCoord: -34 + 2.6, posCoord: -20, minC: -146, maxC: 146, speed: 14.8 },
      { vid: 42, axis: 'x', dir: -1, laneCoord: -34 + 2.6, posCoord: -92, minC: -146, maxC: 146, speed: 13.2 },

      // 11. Av. Marginal Norte (Z = +34, Y = 0.0m)
      { vid: 4, axis: 'x', dir: 1, laneCoord: 34 - 2.6, posCoord: -68, minC: -100, maxC: 100, speed: 12.0 },
      { vid: 70, axis: 'x', dir: 1, laneCoord: 34 - 2.6, posCoord: 22, minC: -100, maxC: 100, speed: 15.6 },
      { vid: 35, axis: 'x', dir: -1, laneCoord: 34 + 2.6, posCoord: 68, minC: -100, maxC: 100, speed: 10.4 },
      { vid: 79, axis: 'x', dir: -1, laneCoord: 34 + 2.6, posCoord: -24, minC: -100, maxC: 100, speed: 13.2 },

      // 12. Av. Panorâmica / Cidade Alta (Z = -68, Y = +4.5m — entre as rotatórias X ∈ [-54, +54])
      { vid: 7, axis: 'x', dir: 1, laneCoord: -68 - 2.6, posCoord: -38, minC: -54, maxC: 54, speed: 11.4, ignoreSignals: true },
      { vid: 33, axis: 'x', dir: 1, laneCoord: -68 - 2.6, posCoord: 12, minC: -54, maxC: 54, speed: 10.2, ignoreSignals: true },
      { vid: 13, axis: 'x', dir: -1, laneCoord: -68 + 2.6, posCoord: 36, minC: -54, maxC: 54, speed: 14.2, ignoreSignals: true },
      { vid: 73, axis: 'x', dir: -1, laneCoord: -68 + 2.6, posCoord: -14, minC: -54, maxC: 54, speed: 12.8, ignoreSignals: true },

      // 13. Av. Residencial Alta (Z = -102, Y = +9.0m, 288m contínuos sem rotatória!)
      { vid: 16, axis: 'x', dir: 1, laneCoord: -102 - 2.6, posCoord: -104, minC: -144, maxC: 144, speed: 11.8, ignoreSignals: true },
      { vid: 37, axis: 'x', dir: 1, laneCoord: -102 - 2.6, posCoord: 18, minC: -144, maxC: 144, speed: 10.4, ignoreSignals: true },
    ];

    const addTrafficActor = (cfg: LaneCfg) => {
      const concept = VEHICLES_50.find((v) => v.id === cfg.vid);
      if (!concept) return;
      placedIds.add(concept.id);
      const built = buildCraftedVehicle(concept, maxAniso, { cityMode: true });
      this.disposableBuilt.push(built);
      this.registerCityVehicle(built, concept, this.allCityVehicles.length);
      built.group.rotation.order = 'YXZ';
      const vx = cfg.axis === 'x' ? cfg.posCoord : cfg.laneCoord;
      const vz = cfg.axis === 'z' ? cfg.posCoord : cfg.laneCoord;
      const baseY = cfg.customY !== undefined ? cfg.customY : cityRoadY(vz) + 0.04;
      built.group.position.set(vx, baseY, vz);
      built.group.rotation.y =
        cfg.axis === 'z'
          ? (cfg.dir > 0 ? 0 : Math.PI)
          : (cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      if (cfg.axis === 'z' && cfg.customY === undefined) {
        built.group.rotation.x = -cfg.dir * Math.atan(cityRoadSlopeDZ(vz));
      }
      this.scene.add(built.group);
      this.trafficActors.push({
        built,
        axis: cfg.axis,
        dir: cfg.dir,
        laneCoord: cfg.laneCoord,
        posCoord: cfg.posCoord,
        minC: cfg.minC,
        maxC: cfg.maxC,
        maxSpeed: cfg.speed,
        speed: cfg.speed,
        halfLen: Math.max(0.7, concept.dimensions.length * 0.5),
        wheelRadius: Math.max(0.18, concept.geometry.wheelRadius || 0.34),
        customY: cfg.customY,
        ignoreSignals: cfg.ignoreSignals,
        lanePeers: [],
      });
    };

    laneConfigs.forEach(addTrafficActor);

    // Real Aquatic & Amphibious Fleet (ALL 11 navigating smoothly on River & West Ocean Bay!)
    const boatConfigs: {
      vid: number;
      axis: 'x' | 'z';
      dir: 1 | -1;
      x: number;
      z: number;
      minC: number;
      maxC: number;
      speed: number;
    }[] = [
      // Rio Central (Z ∈ [11.4, 22.2], X ∈ [-162, +110] — sob as 5 pontes!)
      { vid: 50, axis: 'x', dir: 1, x: -136, z: 11.4, minC: -162, maxC: 110, speed: 7.4 }, // Hovercraft
      { vid: 44, axis: 'x', dir: 1, x: -72, z: 13.8, minC: -162, maxC: 110, speed: 6.8 },  // Lancha Ipanema
      { vid: 45, axis: 'x', dir: 1, x: 22, z: 16.4, minC: -162, maxC: 110, speed: 8.8 },   // Jet Ski Turbinado
      { vid: 46, axis: 'x', dir: -1, x: 64, z: 19.6, minC: -162, maxC: 110, speed: 6.0 },  // Bote Salva-Vidas
      { vid: 47, axis: 'x', dir: -1, x: -24, z: 22.0, minC: -162, maxC: 110, speed: 4.2 }, // Rebocador Fluvial

      // Enseada Oeste & Arquipélago do Sol (livres de ilhas e da ponte Z = -12)
      { vid: 81, axis: 'z', dir: 1, x: -222, z: -84, minC: -100, maxC: -22, speed: 8.6 },  // Jet Ski Freestyle
      { vid: 83, axis: 'z', dir: -1, x: -228, z: -32, minC: -100, maxC: -22, speed: 8.0 }, // Jet Ski Guarda Costeira
      { vid: 82, axis: 'z', dir: 1, x: -234, z: -60, minC: -100, maxC: -22, speed: 9.6 },  // Jet Ski Carbon GP
      { vid: 84, axis: 'z', dir: -1, x: -254, z: 42, minC: 8, maxC: 54, speed: 7.4 },      // Jet Ski 3-Lugares
      { vid: 85, axis: 'z', dir: 1, x: -264, z: 14, minC: 8, maxC: 58, speed: 8.4 },       // Lancha Offshore V12
      { vid: 86, axis: 'z', dir: -1, x: -346, z: 10, minC: -105, maxC: 45, speed: 5.2 },   // Iate Costa Verde
    ];

    boatConfigs.forEach((bc) => {
      const concept = VEHICLES_50.find((v) => v.id === bc.vid);
      if (!concept) return;
      placedIds.add(concept.id);
      const built = buildCraftedVehicle(concept, maxAniso, { cityMode: true });
      this.disposableBuilt.push(built);
      this.registerCityVehicle(built, concept, this.allCityVehicles.length);
      built.group.rotation.order = 'YXZ';
      built.group.position.set(bc.x, -1.22, bc.z);
      built.group.rotation.y =
        bc.axis === 'x'
          ? (bc.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
          : (bc.dir > 0 ? 0 : Math.PI);
      this.scene.add(built.group);
      this.boatActors.push({ built, ...bc });
    });

    // Complete Airspace Fleet (ALL 16 Aircraft: 6 Helicopters + 5 Airplanes + 5 Jets in layered altitudes!)
    const airConfigs: {
      vid: number;
      kind: AirActor['kind'];
      cx: number;
      cz: number;
      rx: number;
      rz: number;
      alt: number;
      speed: number;
    }[] = [
      // 6 Helicopters (44m .. 80m)
      { vid: 97, kind: 'helicopter', cx: -115, cz: -48, rx: 46, rz: 44, alt: 44, speed: 0.22 },
      { vid: 48, kind: 'helicopter', cx: -20, cz: -20, rx: 58, rz: 46, alt: 50, speed: 0.24 },
      { vid: 49, kind: 'helicopter', cx: 22, cz: 26, rx: 64, rz: 42, alt: 58, speed: -0.19 },
      { vid: 98, kind: 'helicopter', cx: 110, cz: -45, rx: 48, rz: 46, alt: 64, speed: -0.25 },
      { vid: 99, kind: 'helicopter', cx: -15, cz: -75, rx: 72, rz: 40, alt: 72, speed: 0.21 },
      { vid: 100, kind: 'helicopter', cx: 35, cz: 62, rx: 54, rz: 36, alt: 80, speed: -0.16 },
      // 5 Airplanes (24m .. 110m)
      { vid: 88, kind: 'airplane', cx: -242, cz: -38, rx: 46, rz: 66, alt: 24, speed: 0.28 },
      { vid: 89, kind: 'airplane', cx: -175, cz: -45, rx: 68, rz: 58, alt: 46, speed: -0.30 },
      { vid: 87, kind: 'airplane', cx: 0, cz: -20, rx: 112, rz: 82, alt: 88, speed: 0.22 },
      { vid: 90, kind: 'airplane', cx: -15, cz: -25, rx: 132, rz: 96, alt: 98, speed: -0.24 },
      { vid: 91, kind: 'airplane', cx: 15, cz: -15, rx: 150, rz: 108, alt: 110, speed: 0.19 },
      // 5 Jets with spinning turbines & rear afterburner flames (122m .. 172m)
      { vid: 95, kind: 'jet', cx: -40, cz: -30, rx: 165, rz: 112, alt: 122, speed: 0.34 },
      { vid: 94, kind: 'jet', cx: 10, cz: -20, rx: 185, rz: 125, alt: 134, speed: -0.36 },
      { vid: 93, kind: 'jet', cx: -20, cz: -10, rx: 205, rz: 135, alt: 146, speed: 0.38 },
      { vid: 92, kind: 'jet', cx: 0, cz: -25, rx: 175, rz: 120, alt: 158, speed: -0.28 },
      { vid: 96, kind: 'jet', cx: -30, cz: -20, rx: 225, rz: 148, alt: 172, speed: 0.32 },
    ];

    airConfigs.forEach((ac) => {
      const concept = VEHICLES_50.find((v) => v.id === ac.vid);
      if (!concept) return;
      placedIds.add(concept.id);
      const built = buildCraftedVehicle(concept, maxAniso, { cityMode: true });
      this.disposableBuilt.push(built);
      this.registerCityVehicle(built, concept, this.allCityVehicles.length);
      built.group.rotation.order = 'YXZ';
      built.group.position.set(ac.cx + ac.rx, ac.alt, ac.cz);
      this.scene.add(built.group);
      this.airActors.push({ built, ...ac });
    });

    // Defensive fallback: ensure 100% of VEHICLES_50 are spawned even if catalog grows
    let fallbackIdx = 0;
    VEHICLES_50.forEach((v) => {
      if (placedIds.has(v.id)) return;
      const pos = -110 + ((fallbackIdx * 36) % 220);
      addTrafficActor({
        vid: v.id,
        axis: 'x',
        dir: fallbackIdx % 2 === 0 ? 1 : -1,
        laneCoord: -102 + (fallbackIdx % 2 === 0 ? -2.6 : 2.6),
        posCoord: pos,
        minC: -144,
        maxC: 144,
        speed: 11.5,
        ignoreSignals: true,
      });
      fallbackIdx++;
    });

    // Pre-bucket vehicles per lane so tick() checks only 1-5 lane peers instead of all 78 actors
    const laneBuckets = new Map<string, TrafficActor[]>();
    for (let i = 0; i < this.trafficActors.length; i++) {
      const a = this.trafficActors[i];
      const key = `${a.axis}_${a.dir}_${Math.round(a.laneCoord * 10)}`;
      let bucket = laneBuckets.get(key);
      if (!bucket) {
        bucket = [];
        laneBuckets.set(key, bucket);
      }
      bucket.push(a);
    }
    laneBuckets.forEach((bucket) => {
      for (let i = 0; i < bucket.length; i++) {
        bucket[i].lanePeers = bucket;
      }
    });
  }

  private freezeStaticMatrices() {
    const dynamicRoots = new Set<THREE.Object3D>();
    dynamicRoots.add(this.sunLight);
    if (this.flagRig?.group) dynamicRoots.add(this.flagRig.group);
    if (this.shopAnimated.showroomCar) dynamicRoots.add(this.shopAnimated.showroomCar);
    if (this.shopAnimated.barberPole) dynamicRoots.add(this.shopAnimated.barberPole);
    if (this.beachResult?.group) dynamicRoots.add(this.beachResult.group);
    for (let i = 0; i < this.trafficActors.length; i++) dynamicRoots.add(this.trafficActors[i].built.group);
    for (let i = 0; i < this.boatActors.length; i++) dynamicRoots.add(this.boatActors[i].built.group);
    for (let i = 0; i < this.airActors.length; i++) dynamicRoots.add(this.airActors[i].built.group);
    for (let i = 0; i < this.npcs.length; i++) dynamicRoots.add(this.npcs[i].group);

    this.scene.updateMatrixWorld(true);

    const freezeNode = (obj: THREE.Object3D) => {
      if (dynamicRoots.has(obj)) return;
      obj.matrixAutoUpdate = false;
      for (let i = 0; i < obj.children.length; i++) {
        freezeNode(obj.children[i]);
      }
    };
    freezeNode(this.scene);
  }

  private spawnArticulatedNpcs() {
    const walkPaths: { axis: 'x' | 'z'; dir: 1 | -1; laneCoord: number; start: number; min: number; max: number; count: number; mode?: ArticulatedNpc['mode'] }[] = [
      { axis: 'x', dir: 1, laneCoord: -6.4, start: -42, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -6.8, start: 28, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: 1, laneCoord: -27.4, start: -52, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -38.8, start: -48, min: -84, max: 84, count: 4 },
      { axis: 'z', dir: 1, laneCoord: -6.6, start: -52, min: -92, max: 4, count: 3 },
      { axis: 'z', dir: -1, laneCoord: 6.6, start: -12, min: -92, max: 4, count: 3 },
      { axis: 'z', dir: 1, laneCoord: -27.5, start: -46, min: -92, max: 4, count: 2 },
      // Calçadas da Cidade Alta (Z = -68 -> Y = +4.2m)
      { axis: 'x', dir: 1, laneCoord: -62.5, start: -42, min: -58, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -73.4, start: 34, min: -58, max: 84, count: 3 },
      // Orla fluvial
      { axis: 'x', dir: 1, laneCoord: 6.2, start: -76, min: -90, max: 90, count: 3, mode: 'jog' },
      { axis: 'x', dir: -1, laneCoord: 27.6, start: 44, min: -90, max: 90, count: 3, mode: 'jog' },
      // Calçadas da Expansão (Moradias Largas & Prédios de Vendas X = ±125..±142)
      { axis: 'z', dir: 1, laneCoord: -142.3, start: -82, min: -96, max: -6, count: 3 },
      { axis: 'z', dir: -1, laneCoord: 142.3, start: -12, min: -96, max: -6, count: 3 },
      { axis: 'x', dir: 1, laneCoord: -6.4, start: -136, min: -142, max: -108, count: 2 },
      { axis: 'x', dir: -1, laneCoord: -6.4, start: 116, min: 108, max: 142, count: 2 },
      // Grand Calçadão 120m da Praia Oeste (Y = +0.30m)
      { axis: 'z', dir: 1, laneCoord: -174.4, start: -102, min: -108, max: 5, count: 6, mode: 'jog' },
      { axis: 'z', dir: -1, laneCoord: -172.6, start: -94, min: -106, max: 4, count: 5 },
    ];

    walkPaths.forEach((wp, idx) => {
      const span = Math.max(1, wp.max - wp.min);
      for (let k = 0; k < wp.count; k++) {
        const mode = wp.mode ?? 'walk';
        const npc = createArticulatedNpc(idx * 11 + k * 5 + 1, mode);
        npc.axis = wp.axis;
        npc.dir = k % 2 === 0 ? wp.dir : (-wp.dir as 1 | -1);
        npc.laneCoord = wp.laneCoord + (k % 2 === 0 ? 0.35 : -0.35);
        npc.minLimit = wp.min;
        npc.maxLimit = wp.max;
        const coord = wp.min + ((wp.start - wp.min + k * (span / Math.max(1, wp.count))) % span);
        const nx = npc.axis === 'x' ? coord : npc.laneCoord;
        const nz = npc.axis === 'z' ? coord : npc.laneCoord;
        const ny = npc.axis === 'z' && npc.laneCoord < -167.2 ? 0.30 : cityRoadY(nz) + 0.16;
        npc.group.position.set(nx, ny, nz);
        npc.group.rotation.y =
          npc.axis === 'x' ? (npc.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (npc.dir > 0 ? 0 : Math.PI);
        this.scene.add(npc.group);
        this.npcs.push(npc);
      }
    });

    // Seated NPCs on Flag Plaza benches, Bus Stops, School & West Beach Chairs / Loungers / Promenade
    [
      [-17 - 6.6, 0.32, -17, Math.PI / 2],
      [-17 + 6.6, 0.32, -17, -Math.PI / 2],
      [-17, 0.32, -17 + 6.6, Math.PI],
      [-17, 0.14, -27.75, Math.PI],
      [51, 0.14, -27.75, Math.PI],
      [-9.2, 0.14, 38.95, 0],
      ...this.beachNpcSpots.seated,
    ].forEach(([sx, sy, sz, rot], idx) => {
      const npc = createArticulatedNpc(40 + idx * 5, 'sit');
      npc.group.position.set(sx, sy, sz);
      npc.group.rotation.y = rot;
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });

    // Conversing pairs at Café, Praça, Parque, Escola, Praia Oeste, Ponte & Mirante da Ilha
    const cafeY = blockTerraceY(-51) + 0.22;
    const parkY = blockTerraceY(-85) + 0.28;
    [
      [-11.8, cafeY, -39.5, 0.7],
      [-10.8, cafeY, -39.9, -2.4],
      [-13.2, 0.30, -13.5, -2.2],
      [-12.4, 0.30, -14.2, 0.9],
      [16.2, parkY, -84.6, 0.8],
      [17.2, parkY, -85.2, -2.3],
      // School Gate, Courtyard & Papelaria do Estudante NPCs
      [-17.6, parkY, -75.4, 0.5],
      [-16.4, parkY, -75.8, -2.5],
      [-14.2, parkY, -82.0, 0.7],
      [-13.1, parkY, -82.4, -2.3],
      [-7.2, parkY, -77.4, -1.5],
      // West Beach Futevôlei, Semicircle Arch, Bridge & Ilha do Sol Visitors
      ...this.beachNpcSpots.chatting,
      [-16.2, -0.80, 8.2, 0.4],
      [-15.1, -0.80, 8.6, -2.6],
      [-1.1, 13.98, -135.8, 0.5],
      [0.9, 13.98, -136.2, -2.4],
    ].forEach(([cx, cy, cz, rot], idx) => {
      const npc = createArticulatedNpc(70 + idx * 3, 'chat');
      npc.group.position.set(cx, cy, cz);
      npc.group.rotation.y = rot;
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });
  }

  public setCameraPreset(preset: CityCameraPreset, immediate = false) {
    switch (preset) {
      case 'overview':
        this.camTargetPos.set(-96, 60, -112);
        this.camTargetLook.set(0, 7, -18);
        break;
      case 'downtown':
        this.camTargetPos.set(-24, 24, 10);
        this.camTargetLook.set(-66, 22, -34);
        break;
      case 'shops':
        this.camTargetPos.set(-14, 18, -32);
        this.camTargetLook.set(52, 4.5, -42);
        break;
      case 'residential':
        this.camTargetPos.set(-44, 29, -58);
        this.camTargetLook.set(4, 9.5, -114);
        break;
      case 'morro':
        this.camTargetPos.set(-16, 34, 2);
        this.camTargetLook.set(22, 12, 78);
        break;
      case 'bridges':
        this.camTargetPos.set(-46, 14.5, 2.5);
        this.camTargetLook.set(0, 2.0, 14.5);
        break;
      case 'flag':
        this.camTargetPos.set(-28.5, 13.0, -30.5);
        this.camTargetLook.set(-14.5, 13.5, -17.0);
        break;
      case 'traffic':
        this.camTargetPos.set(-14.5, 13.0, -14.5);
        this.camTargetLook.set(1.5, 2.5, -12.0);
        break;
      case 'school':
        this.camTargetPos.set(-33.5, 19.5, -60.5);
        this.camTargetLook.set(-15.5, 7.2, -84.0);
        break;
      case 'beach':
        this.camTargetPos.set(-134.0, 44.0, -124.0);
        this.camTargetLook.set(-228.0, 0.5, -34.0);
        break;
      case 'condos':
        this.camTargetPos.set(-168, 34, -22);
        this.camTargetLook.set(-124, 15, -66);
        break;
      case 'corporate':
        this.camTargetPos.set(166, 26, 14);
        this.camTargetLook.set(122, 11, -30);
        break;
    }

    if (immediate) {
      this.camera.position.copy(this.camTargetPos);
      this.controls.target.copy(this.camTargetLook);
      this.controls.update();
      this.camTransitioning = false;
    } else {
      this.camTransitioning = true;
    }
  }

  public applyTimeOfDay(mode: CityTimeOfDay) {
    this.currentTimeOfDay = mode;
    const sceneBg = this.scene.background as THREE.Color;
    const sceneFog = this.scene.fog as THREE.FogExp2;
    if (mode === 'sunset') {
      sceneBg.setHex(0x281e32);
      sceneFog.color.setHex(0x281e32);
      sceneFog.density = 0.0024;
      this.hemiLight.color.setHex(0xfde68a);
      this.hemiLight.groundColor.setHex(0x1f2937);
      this.hemiLight.intensity = 0.74;
      this.sunLight.color.setHex(0xffab5e);
      this.sunLight.intensity = 1.80;
      this.sunLight.position.set(-95, 52, -72);
      this.lampEmissiveMat.emissiveIntensity = 1.55;
      this.windowEmissiveMat.emissiveIntensity = 0.90;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 0.65));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 26));
    } else if (mode === 'day') {
      sceneBg.setHex(0x7cc4f5);
      sceneFog.color.setHex(0x7cc4f5);
      sceneFog.density = 0.0017;
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x3f3f46);
      this.hemiLight.intensity = 0.85;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.85;
      this.sunLight.position.set(75, 108, -60);
      this.lampEmissiveMat.emissiveIntensity = 0.15;
      this.windowEmissiveMat.emissiveIntensity = 0.22;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 0.08));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 6));
    } else {
      sceneBg.setHex(0x090b16);
      sceneFog.color.setHex(0x090b16);
      sceneFog.density = 0.0028;
      this.hemiLight.color.setHex(0x3b82f6);
      this.hemiLight.groundColor.setHex(0x09090b);
      this.hemiLight.intensity = 0.45;
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.62;
      this.sunLight.position.set(55, 80, 60);
      this.lampEmissiveMat.emissiveIntensity = 2.35;
      this.windowEmissiveMat.emissiveIntensity = 1.65;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 1.35));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 48));
    }
    this.currentHeadlightsOn = mode !== 'day';
    this.applyVehicleHeadlights(this.currentHeadlightsOn);
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  private applyVehicleHeadlights(lightsOn: boolean) {
    for (let i = 0; i < this.allCityVehicles.length; i++) {
      const b = this.allCityVehicles[i];
      b.materials.headlight.emissiveIntensity = lightsOn ? 1.65 : 0.08;
      b.materials.taillight.emissiveIntensity = lightsOn ? 1.35 : 0.08;
      const beams = b.animatedParts.headlightBeams;
      for (let bi = 0; bi < beams.length; bi++) {
        beams[bi].visible = lightsOn;
      }
    }
  }

  private applySingleVehicleLights(built: BuiltVehicle, lightsOn: boolean) {
    built.materials.headlight.emissiveIntensity = lightsOn ? 1.85 : 0.08;
    built.materials.taillight.emissiveIntensity = lightsOn ? 1.45 : 0.08;
    const beams = built.animatedParts.headlightBeams;
    for (let bi = 0; bi < beams.length; bi++) {
      beams[bi].visible = lightsOn;
    }
  }

  public startDriving(vehicleId: number) {
    const concept = VEHICLES_50.find((v) => v.id === vehicleId);
    if (!concept) return;

    const prevCamMode: PlayerCameraMode = this.playerActor?.cameraMode ?? 'chase';
    this.cleanupPlayerActor();

    const arch = concept.geometry.archetype;
    const kind: PlayerActor['kind'] =
      arch === 'helicopter'
        ? 'helicopter'
        : arch === 'speedboat' || arch === 'jetski' || arch === 'rib_boat' || arch === 'tugboat' || arch === 'yacht'
          ? 'water'
          : 'land';

    const maxAniso = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4);
    const built = buildCraftedVehicle(concept, maxAniso, { cityMode: true });
    built.group.rotation.order = 'YXZ';

    const x = kind === 'water' ? -194 : kind === 'helicopter' ? -17 : 2.6;
    const z = kind === 'water' ? -45 : kind === 'helicopter' ? -24 : -18;
    const y = kind === 'water' ? -1.22 : kind === 'helicopter' ? 16 : cityRoadY(z) + 0.04;
    const heading = kind === 'helicopter' ? 0.35 : 0;

    built.group.position.set(x, y, z);
    built.group.rotation.y = heading;
    this.scene.add(built.group);

    const hasSiren = this.getEmergencyMode(concept) !== null;
    const lightsOn = this.currentTimeOfDay !== 'day' || true;
    this.applySingleVehicleLights(built, lightsOn);

    const maxMs = Math.max(8, Math.min(48, (concept.unitySpec.maxSpeedKmh || 120) / 3.8));
    this.playerActor = {
      concept,
      built,
      kind,
      hasSiren,
      x,
      y,
      z,
      heading,
      speed: 0,
      maxSpeed: maxMs,
      steer: 0,
      wheelRadius: Math.max(0.18, concept.geometry.wheelRadius || 0.34),
      cameraMode: prevCamMode,
      lightsOn,
      blinker: 'off',
      sirenOn: hasSiren,
    };

    this.camTransitioning = false;
    this.controls.enabled = false;
    this.emitDriveState(true);
  }

  public stopDriving() {
    if (!this.playerActor) return;
    this.cleanupPlayerActor();
    this.controls.enabled = true;
    this.setCameraPreset('overview', false);
    this.callbacks.onDriveStateChange?.(null);
  }

  private cleanupPlayerActor() {
    if (!this.playerActor) return;
    this.scene.remove(this.playerActor.built.group);
    this.playerActor.built.dispose();
    this.playerActor = null;
  }

  public setPlayerCameraMode(mode: PlayerCameraMode) {
    if (!this.playerActor) return;
    this.playerActor.cameraMode = mode;
    this.emitDriveState(true);
  }

  public setPlayerLights(on: boolean) {
    if (!this.playerActor) return;
    this.playerActor.lightsOn = on;
    this.applySingleVehicleLights(this.playerActor.built, on);
    this.emitDriveState(true);
  }

  public setPlayerBlinker(mode: PlayerBlinkerMode) {
    if (!this.playerActor) return;
    this.playerActor.blinker = mode;
    this.emitDriveState(true);
  }

  public setPlayerSiren(on: boolean) {
    if (!this.playerActor || !this.playerActor.hasSiren) return;
    this.playerActor.sirenOn = on;
    if (!on) {
      this.playerActor.built.materials.sirenRed.emissiveIntensity = 0.08;
      this.playerActor.built.materials.sirenBlue.emissiveIntensity = 0.08;
      this.playerActor.built.materials.sirenAmber.emissiveIntensity = 0.08;
    }
    this.emitDriveState(true);
  }

  private emitDriveState(force = false) {
    if (!this.playerActor || !this.callbacks.onDriveStateChange) return;
    const now = performance.now();
    if (!force && now - this.lastDriveUiSyncMs < 110) return;
    this.lastDriveUiSyncMs = now;
    const p = this.playerActor;
    this.callbacks.onDriveStateChange({
      active: true,
      vehicleId: p.concept.id,
      vehicleName: p.concept.name,
      kind: p.kind,
      cameraMode: p.cameraMode,
      lightsOn: p.lightsOn,
      blinker: p.blinker,
      sirenOn: p.sirenOn,
      hasSiren: p.hasSiren,
      speedKmh: Math.round(Math.abs(p.speed) * 3.6),
    });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const code = e.code;
    this.keysDown.add(code);

    if (!this.playerActor) return;
    if (e.repeat) return;

    if (code === 'KeyQ') {
      this.setPlayerBlinker(this.playerActor.blinker === 'left' ? 'off' : 'left');
    } else if (code === 'KeyE') {
      this.setPlayerBlinker(this.playerActor.blinker === 'right' ? 'off' : 'right');
    } else if (code === 'KeyX') {
      this.setPlayerBlinker(this.playerActor.blinker === 'hazard' ? 'off' : 'hazard');
    } else if (code === 'KeyF') {
      this.setPlayerLights(!this.playerActor.lightsOn);
    } else if (code === 'KeyG') {
      if (this.playerActor.hasSiren) {
        this.setPlayerSiren(!this.playerActor.sirenOn);
      }
    } else if (code === 'KeyC') {
      this.setPlayerCameraMode(this.playerActor.cameraMode === 'chase' ? 'cockpit' : 'chase');
    } else if (code === 'Escape') {
      this.stopDriving();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
  };

  private updatePlayerDriving(dt: number, rawDt: number) {
    const p = this.playerActor;
    if (!p) return;

    const accelIn = (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp') ? 1 : 0) -
      (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown') ? 1 : 0);
    const steerIn = (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft') ? 1 : 0) -
      (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight') ? 1 : 0);
    const vertIn = (this.keysDown.has('Space') ? 1 : 0) -
      (this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight') ? 1 : 0);

    const tau = Math.PI * 2;
    const targetSteer = steerIn * (p.kind === 'helicopter' ? 0.55 : 0.44);
    p.steer = THREE.MathUtils.damp(p.steer, targetSteer, 11, dt);

    if (p.kind === 'helicopter') {
      const targetSpd = accelIn !== 0 ? accelIn * p.maxSpeed * 0.72 : 0;
      p.speed = THREE.MathUtils.damp(p.speed, targetSpd, accelIn !== 0 ? 3.2 : 2.2, dt);
      p.heading += p.steer * 1.9 * dt;
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      p.y = THREE.MathUtils.clamp(p.y + vertIn * 14 * dt, 1.8, 95);
      p.x = THREE.MathUtils.clamp(p.x, -340, 152);
      p.z = THREE.MathUtils.clamp(p.z, -116, 65);

      const bob = Math.sin(this.elapsed * 2.2) * 0.14;
      p.built.group.position.set(p.x, p.y + bob, p.z);
      p.built.group.rotation.set(
        THREE.MathUtils.clamp(p.speed / Math.max(1, p.maxSpeed), -1, 1) * 0.22,
        p.heading,
        -p.steer * 0.35,
      );

      const rotors = p.built.animatedParts.rotors;
      for (let ri = 0; ri < rotors.length; ri++) {
        const r = rotors[ri];
        const axis = r.userData.rotorAxis ?? (ri === 0 ? 'y' : 'x');
        if (axis === 'y') r.rotation.y = (r.rotation.y + dt * 16) % tau;
        else r.rotation.x = (r.rotation.x + dt * 22) % tau;
      }
    } else {
      const targetSpd = accelIn > 0 ? p.maxSpeed : accelIn < 0 ? -p.maxSpeed * 0.42 : 0;
      p.speed = THREE.MathUtils.damp(p.speed, targetSpd, accelIn !== 0 ? 3.8 : 2.8, dt);

      const turnFactor = p.kind === 'water'
        ? 1.55 * Math.min(1, Math.abs(p.speed) / 4.5 + 0.35)
        : 2.1 * Math.min(1, Math.abs(p.speed) / 5.5);
      const revSign = p.speed >= -0.2 ? 1 : -1;
      p.heading += p.steer * turnFactor * revSign * dt;

      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;

      if (p.kind === 'water') {
        p.x = THREE.MathUtils.clamp(p.x, -355, 115);
        p.z = THREE.MathUtils.clamp(p.z, -112, 52);
        const wave = Math.sin(this.elapsed * 2.5 + p.x * 0.15) * 0.06;
        p.y = -1.22 + wave;
        p.built.group.position.set(p.x, p.y, p.z);
        p.built.group.rotation.set(-Math.min(0.12, Math.max(-0.04, p.speed * 0.005)), p.heading, -p.steer * 0.24);
        const props = p.built.animatedParts.propellers;
        for (let pi = 0; pi < props.length; pi++) {
          props[pi].rotation.z = (props[pi].rotation.z + dt * (12 + Math.abs(p.speed) * 1.8)) % tau;
        }
      } else {
        p.x = THREE.MathUtils.clamp(p.x, -166, 152);
        p.z = THREE.MathUtils.clamp(p.z, -112, 38);
        p.y = cityRoadY(p.z) + 0.04;
        const slopePitch = -Math.atan(cityRoadSlopeDZ(p.z)) * Math.cos(p.heading);
        const isTwoWheel = p.concept.geometry.archetype === 'bicycle' ||
          p.concept.geometry.archetype === 'scooter' ||
          p.concept.geometry.archetype === 'sportbike' ||
          p.concept.geometry.archetype === 'cruiser' ||
          p.concept.geometry.archetype === 'dirtbike';
        const leanRoll = isTwoWheel ? -p.steer * Math.min(1, Math.abs(p.speed) / 8) * 0.42 : 0;
        p.built.group.position.set(p.x, p.y, p.z);
        p.built.group.rotation.set(slopePitch, p.heading, leanRoll);
      }
    }

    const anim = p.built.animatedParts;
    const wheelStep = (p.speed * dt) / p.wheelRadius;
    for (let wi = 0; wi < anim.wheels.length; wi++) {
      anim.wheels[wi].rotation.x = (anim.wheels[wi].rotation.x + wheelStep) % tau;
    }
    if (anim.cranks.length > 0) {
      const crankStep = (p.speed * dt) / 1.15;
      for (let ci = 0; ci < anim.cranks.length; ci++) {
        anim.cranks[ci].rotation.x = (anim.cranks[ci].rotation.x + crankStep) % tau;
      }
      const crankAngle = anim.cranks[0].rotation.x;
      for (let pi = 0; pi < anim.pedals.length; pi++) {
        anim.pedals[pi].rotation.x = -crankAngle;
      }
    }
    for (let si = 0; si < anim.steeringPivots.length; si++) {
      anim.steeringPivots[si].rotation.y = p.steer;
    }
    for (let swi = 0; swi < anim.steeringWheels.length; swi++) {
      anim.steeringWheels[swi].rotation.z = -p.steer * 3.0;
    }

    // Player turn signals (manual Q/E/X or auto-flash while steering strongly)
    const flash = Math.sin(this.elapsed * 9.5) > 0 ? 2.8 : 0.1;
    const autoLeft = p.blinker === 'off' && p.steer > 0.16;
    const autoRight = p.blinker === 'off' && p.steer < -0.16;
    const leftActive = p.blinker === 'left' || p.blinker === 'hazard' || autoLeft;
    const rightActive = p.blinker === 'right' || p.blinker === 'hazard' || autoRight;
    p.built.materials.signalLeft.emissiveIntensity = leftActive ? flash : 0.08;
    p.built.materials.signalRight.emissiveIntensity = rightActive ? flash : 0.08;

    // Player siren strobes
    if (p.hasSiren && p.sirenOn) {
      const tFlash = this.elapsed * 16;
      const alt = Math.sin(tFlash) > 0;
      const dbl = Math.sin(tFlash * 2.0) > 0.15 ? 1.0 : 0.45;
      p.built.materials.sirenRed.emissiveIntensity = alt ? 3.2 * dbl : 0.15;
      p.built.materials.sirenBlue.emissiveIntensity = !alt ? 3.2 * dbl : 0.15;
      p.built.materials.sirenAmber.emissiveIntensity =
        0.25 + Math.pow(Math.max(0, Math.sin(this.elapsed * 10)), 2) * 2.6;
    }

    // Update chase / cockpit camera (zero allocations)
    p.built.group.updateMatrixWorld(true);
    if (p.cameraMode === 'cockpit') {
      if (anim.steeringWheels.length > 0) {
        anim.steeringWheels[0].getWorldPosition(_drvLocalOffset);
        _drvCamPos.set(0, 0.34, -0.52).applyQuaternion(p.built.group.quaternion).add(_drvLocalOffset);
        _drvCamLook.set(0, 0.04, 3.6).applyQuaternion(p.built.group.quaternion).add(_drvLocalOffset);
      } else {
        const h = p.concept.dimensions.height;
        const l = p.concept.dimensions.length;
        const eyeY = p.kind === 'helicopter' ? h * 0.56 : h * 0.92;
        const eyeZ = p.kind === 'helicopter' ? l * 0.16 : -l * 0.06;
        _drvCamPos.set(0, eyeY, eyeZ).applyMatrix4(p.built.group.matrixWorld);
        _drvLocalLook.set(0, eyeY - 0.22, eyeZ + 5.0);
        _drvCamLook.copy(_drvLocalLook).applyMatrix4(p.built.group.matrixWorld);
      }
      this.camera.position.copy(_drvCamPos);
      this.camera.lookAt(_drvCamLook);
    } else {
      const span = Math.max(4.5, p.concept.dimensions.length * 1.45);
      const dist = p.kind === 'helicopter' ? span * 1.55 : span * 1.65;
      const camH = p.kind === 'helicopter' ? 4.8 : Math.max(2.6, p.concept.dimensions.height * 1.85);
      const sinH = Math.sin(p.heading);
      const cosH = Math.cos(p.heading);
      _drvCamPos.set(p.x - sinH * dist, p.y + camH, p.z - cosH * dist);
      _drvCamLook.set(p.x + sinH * 3.5, p.y + p.concept.dimensions.height * 0.65, p.z + cosH * 3.5);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _drvCamPos.x, 8.5, rawDt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _drvCamPos.y, 8.5, rawDt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _drvCamPos.z, 8.5, rawDt);
      this.camera.lookAt(_drvCamLook);
    }

    this.emitDriveState(false);
  }

  public setWindStrength(val: number) {
    this.windStrength = val;
  }

  public setSimPaused(paused: boolean) {
    this.simPaused = paused;
  }

  public captureDataUrl(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  private getSignalStates(): { zState: 'green' | 'amber' | 'red'; xState: 'green' | 'amber' | 'red'; label: string } {
    const cycle = this.elapsed % 16;
    if (cycle < 6) {
      return { zState: 'green', xState: 'red', label: 'Avenidas N-S: Verde · Cruzamentos E-O: Pare' };
    }
    if (cycle < 8) {
      return { zState: 'amber', xState: 'red', label: 'Avenidas N-S: Atenção · Cruzamentos E-O: Pare' };
    }
    if (cycle < 14) {
      return { zState: 'red', xState: 'green', label: 'Avenidas E-O: Verde · Pontes/N-S: Pare' };
    }
    return { zState: 'red', xState: 'amber', label: 'Avenidas E-O: Atenção · Pontes/N-S: Pare' };
  }

  private tick = () => {
    if (this.disposed) return;
    this.frameId = 0;

    const rawDt = Math.min(this.clock.getDelta(), 0.08);
    const dt = this.simPaused ? 0 : rawDt;
    this.elapsed += dt;
    this.frameCount++;

    if (this.renderer.shadowMap.enabled && !this.simPaused && this.frameCount % 3 === 0) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    // 1. Camera smooth damping
    if (this.camTransitioning) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camTargetPos.x, 6.5, rawDt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camTargetPos.y, 6.5, rawDt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camTargetPos.z, 6.5, rawDt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.camTargetLook.x, 7.5, rawDt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.camTargetLook.y, 7.5, rawDt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.camTargetLook.z, 7.5, rawDt);
      if (this.camera.position.distanceTo(this.camTargetPos) < 0.05) {
        this.camTransitioning = false;
      }
    }

    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;

    // 2. Monumental Flag + ALL 400+ City/Morro/Bairro Trees synced to "Vento na Bandeira"!
    const fdx = this.flagRig.group.position.x - camX;
    const fdz = this.flagRig.group.position.z - camZ;
    const flagDistSq = fdx * fdx + fdz * fdz;
    if (flagDistSq < 110 * 110 || this.frameCount % 3 === 0) {
      this.flagRig.update(this.elapsed, this.windStrength);
    }
    this.vegetation.update(this.elapsed, this.windStrength);

    if (!this.simPaused) {
      this.atlas.waterRipple.offset.x = (this.elapsed * 0.06) % 1;
      this.atlas.waterRipple.offset.y = -((this.elapsed * 0.16) % 1);
      this.beachResult?.update(this.elapsed);

      if (this.shopAnimated.showroomCar) {
        this.shopAnimated.showroomCar.rotation.y += dt * 0.6;
      }
      if (this.shopAnimated.barberPole) {
        this.shopAnimated.barberPole.rotation.y += dt * 2.8;
      }

      const blinkOn = Math.sin(this.elapsed * 4.2) > 0;
      if (blinkOn !== this.lastBeaconOn) {
        this.lastBeaconOn = blinkOn;
        const blink = blinkOn ? 2.4 : 0.15;
        for (let bi = 0; bi < this.beacons.length; bi++) {
          this.beacons[bi].emissiveIntensity = blink;
        }
      }

      // 3. Synchronized Traffic Lights (only mutate shared materials on phase transition!)
      const sig = this.getSignalStates();
      const phaseIdx = Math.floor((this.elapsed % 16) / 2);
      if (phaseIdx !== this.lastPhaseIdx) {
        this.lastPhaseIdx = phaseIdx;
        this.callbacks.onTrafficPhase?.(sig.label);
        for (let ti = 0; ti < this.trafficLights.length; ti++) {
          const rig = this.trafficLights[ti];
          rig.setPhase(rig.axis === 'z' ? sig.zState : sig.xState);
        }
      }

      // Update emergency police, ambulance, fire & amber beacons with distance LOD
      const emergencyLodDistSq = 210 * 210;
      for (let ei = 0; ei < this.emergencyActors.length; ei++) {
        const ea = this.emergencyActors[ei];
        const ePos = ea.built.group.position;
        const edx = ePos.x - camX;
        const edz = ePos.z - camZ;
        if (edx * edx + edz * edz > emergencyLodDistSq) continue;
        const m = ea.built.materials;
        if (ea.mode === 'police_fire') {
          const tFlash = this.elapsed * 16 + ea.phase;
          const alt = Math.sin(tFlash) > 0;
          const dbl = Math.sin(tFlash * 2.0) > 0.15 ? 1.0 : 0.45;
          m.sirenRed.emissiveIntensity = alt ? 3.0 * dbl : 0.15;
          m.sirenBlue.emissiveIntensity = !alt ? 3.0 * dbl : 0.15;
          m.sirenAmber.emissiveIntensity =
            0.25 + Math.pow(Math.max(0, Math.sin(this.elapsed * 10 + ea.phase)), 2) * 2.5;
        } else {
          m.sirenAmber.emissiveIntensity =
            0.2 + Math.pow(Math.max(0, Math.sin(this.elapsed * 7.5 + ea.phase)), 2) * 2.4;
        }
      }

      // 4. Traffic Vehicles & Bicycles obeying signals, length-aware spacing & slope physics
      const stopCoords = [-68, -34, 0, 34];
      const tau = Math.PI * 2;
      const wheelLodDistSq = 155 * 155;
      for (let aIdx = 0; aIdx < this.trafficActors.length; aIdx++) {
        const actor = this.trafficActors[aIdx];
        const mySignal = actor.axis === 'z' ? sig.zState : sig.xState;
        let mustStop = false;

        if (!actor.ignoreSignals && mySignal !== 'green') {
          for (let i = 0; i < stopCoords.length; i++) {
            const c = stopCoords[i];
            if (actor.axis === 'z' && c === -68 && Math.abs(actor.laneCoord) > 72) continue;
            if (actor.axis === 'x' && Math.abs(actor.laneCoord) > 40) continue;
            const frontBumperDist = (c - actor.posCoord) * actor.dir - actor.halfLen;
            if (frontBumperDist > 5.0 && frontBumperDist < 10.6) {
              mustStop = true;
              break;
            }
          }
        }

        const span = Math.max(1, actor.maxC - actor.minC);
        const peers = actor.lanePeers;
        for (let j = 0; j < peers.length; j++) {
          const other = peers[j];
          if (other === actor) continue;
          const rawGap = (other.posCoord - actor.posCoord) * actor.dir;
          const modGap = ((rawGap % span) + span) % span;
          const minSafeGap = actor.halfLen + other.halfLen + 3.2;
          if (modGap > 0.05 && modGap < minSafeGap) {
            mustStop = true;
            break;
          }
        }

        const targetSpd = mustStop ? 0 : actor.maxSpeed;
        actor.speed = THREE.MathUtils.damp(actor.speed, targetSpd, mustStop ? 8 : 3.5, dt);
        actor.posCoord += actor.dir * actor.speed * dt;
        if (actor.dir > 0 && actor.posCoord > actor.maxC) actor.posCoord = actor.minC;
        if (actor.dir < 0 && actor.posCoord < actor.minC) actor.posCoord = actor.maxC;

        const grpPos = actor.built.group.position;
        if (actor.axis === 'x') {
          grpPos.x = actor.posCoord;
          grpPos.y = actor.customY !== undefined ? actor.customY : cityRoadY(actor.laneCoord) + 0.04;
        } else {
          grpPos.z = actor.posCoord;
          if (actor.customY !== undefined) {
            grpPos.y = actor.customY;
          } else {
            grpPos.y = cityRoadY(actor.posCoord) + 0.04;
            actor.built.group.rotation.x = -actor.dir * Math.atan(cityRoadSlopeDZ(actor.posCoord));
          }
        }

        const dxCam = grpPos.x - camX;
        const dzCam = grpPos.z - camZ;
        if (dxCam * dxCam + dzCam * dzCam < wheelLodDistSq) {
          const wheelSpin = (actor.speed * dt) / actor.wheelRadius;
          const anim = actor.built.animatedParts;
          for (let wi = 0; wi < anim.wheels.length; wi++) {
            anim.wheels[wi].rotation.x = (anim.wheels[wi].rotation.x + wheelSpin) % tau;
          }
          if (anim.cranks.length > 0) {
            const crankStep = (actor.speed * dt) / 1.15;
            for (let ci = 0; ci < anim.cranks.length; ci++) {
              anim.cranks[ci].rotation.x = (anim.cranks[ci].rotation.x + crankStep) % tau;
            }
            const crankAngle = anim.cranks[0].rotation.x;
            for (let pi = 0; pi < anim.pedals.length; pi++) {
              anim.pedals[pi].rotation.x = -crankAngle;
            }
          }
          const steerAngle = Math.sin(this.elapsed * 1.15 + aIdx * 0.9) * (actor.speed > 0.5 ? 0.14 : 0.04);
          for (let si = 0; si < anim.steeringPivots.length; si++) {
            anim.steeringPivots[si].rotation.y = steerAngle;
          }
          for (let swi = 0; swi < anim.steeringWheels.length; swi++) {
            anim.steeringWheels[swi].rotation.z = -steerAngle * 2.8;
          }
          const sigCycle = (this.elapsed + aIdx * 1.7) % 11.0;
          const signaling = (mustStop && actor.speed > 0.25) || sigCycle < 3.6;
          if (signaling) {
            const flash = Math.sin(this.elapsed * 9.0) > 0 ? 2.4 : 0.1;
            const useLeft = aIdx % 2 === 0;
            actor.built.materials.signalLeft.emissiveIntensity = useLeft ? flash : 0.08;
            actor.built.materials.signalRight.emissiveIntensity = !useLeft ? flash : 0.08;
          } else {
            if (actor.built.materials.signalLeft.emissiveIntensity !== 0.08) {
              actor.built.materials.signalLeft.emissiveIntensity = 0.08;
            }
            if (actor.built.materials.signalRight.emissiveIntensity !== 0.08) {
              actor.built.materials.signalRight.emissiveIntensity = 0.08;
            }
          }
          if (anim.mixerDrum) {
            anim.mixerDrum.rotation.z = (anim.mixerDrum.rotation.z + dt * 1.4) % tau;
          }
          for (let bi = 0; bi < anim.sweeperBrushes.length; bi++) {
            anim.sweeperBrushes[bi].rotation.y =
              (anim.sweeperBrushes[bi].rotation.y + dt * (bi === 0 ? 5.5 : -5.5)) % tau;
          }
        }
      }

      // 5. Aquatic & Amphibious Fleet (River & West Ocean Bay)
      const boatLodDistSq = 190 * 190;
      for (let bIdx = 0; bIdx < this.boatActors.length; bIdx++) {
        const b = this.boatActors[bIdx];
        if (b.speed > 0) {
          if (b.axis === 'x') {
            b.x += b.dir * b.speed * dt;
            if (b.dir > 0 && b.x > b.maxC) b.x = b.minC;
            if (b.dir < 0 && b.x < b.minC) b.x = b.maxC;
          } else {
            b.z += b.dir * b.speed * dt;
            if (b.dir > 0 && b.z > b.maxC) b.z = b.minC;
            if (b.dir < 0 && b.z < b.minC) b.z = b.maxC;
          }
        }
        b.built.group.position.x = b.x;
        b.built.group.position.z = b.z;
        const phase = b.x * 0.2 + b.z * 0.17;
        b.built.group.position.y = -1.22 + Math.sin(this.elapsed * 2.4 + phase) * (b.speed > 0 ? 0.08 : 0.04);
        b.built.group.rotation.z = Math.sin(this.elapsed * 1.9 + phase) * (b.speed > 0 ? 0.035 : 0.015);
        const bdx = b.x - camX;
        const bdz = b.z - camZ;
        if (bdx * bdx + bdz * bdz < boatLodDistSq) {
          const bAnim = b.built.animatedParts;
          const props = bAnim.propellers;
          for (let pi = 0; pi < props.length; pi++) {
            const spinSpeed = (props[pi].userData.spinSpeed as number | undefined) ?? 18;
            props[pi].rotation.z = (props[pi].rotation.z + dt * spinSpeed) % tau;
          }
          const boatSteer = Math.sin(this.elapsed * 1.1 + bIdx * 1.3) * 0.24;
          for (let si = 0; si < bAnim.steeringPivots.length; si++) {
            bAnim.steeringPivots[si].rotation.y = boatSteer;
          }
          for (let swi = 0; swi < bAnim.steeringWheels.length; swi++) {
            bAnim.steeringWheels[swi].rotation.z = -boatSteer * 2.8;
          }
          if ((this.elapsed + bIdx * 2.1) % 10.0 < 3.2) {
            const flash = Math.sin(this.elapsed * 8.5) > 0 ? 2.4 : 0.1;
            const useLeft = bIdx % 2 === 0;
            b.built.materials.signalLeft.emissiveIntensity = useLeft ? flash : 0.08;
            b.built.materials.signalRight.emissiveIntensity = !useLeft ? flash : 0.08;
          } else {
            if (b.built.materials.signalLeft.emissiveIntensity !== 0.08) {
              b.built.materials.signalLeft.emissiveIntensity = 0.08;
            }
            if (b.built.materials.signalRight.emissiveIntensity !== 0.08) {
              b.built.materials.signalRight.emissiveIntensity = 0.08;
            }
          }
        }
      }

      // 6. Airspace Fleet (Helicopters, Airplanes & Jets with turbines & afterburner flames)
      const airLodDistSq = 260 * 260;
      for (let aIdx = 0; aIdx < this.airActors.length; aIdx++) {
        const a = this.airActors[aIdx];
        const ang = this.elapsed * a.speed + aIdx * 1.15;
        const ax = a.cx + Math.cos(ang) * a.rx;
        const az = a.cz + Math.sin(ang) * a.rz;
        const vx = -a.speed * a.rx * Math.sin(ang);
        const vz = a.speed * a.rz * Math.cos(ang);
        const bobAmp = a.kind === 'helicopter' ? 1.3 : 0.65;
        a.built.group.position.set(ax, a.alt + Math.sin(this.elapsed * 1.1 + aIdx) * bobAmp, az);
        a.built.group.rotation.y = Math.atan2(vx, vz);
        a.built.group.rotation.x = a.kind === 'helicopter' ? 0.09 : -0.02;
        a.built.group.rotation.z =
          a.kind === 'helicopter'
            ? (a.speed > 0 ? -0.11 : 0.11)
            : (a.speed > 0 ? -0.22 : 0.22);

        const adx = ax - camX;
        const adz = az - camZ;
        if (adx * adx + adz * adz < airLodDistSq) {
          const anim = a.built.animatedParts;
          for (let ri = 0; ri < anim.rotors.length; ri++) {
            const r = anim.rotors[ri];
            const axis = r.userData.rotorAxis ?? (ri === 0 ? 'y' : 'x');
            if (axis === 'y') {
              r.rotation.y = (r.rotation.y + dt * 15) % tau;
            } else {
              r.rotation.x = (r.rotation.x + dt * 21) % tau;
            }
          }
          for (let pi = 0; pi < anim.propellers.length; pi++) {
            const p = anim.propellers[pi];
            const spinSpeed = (p.userData.spinSpeed as number | undefined) ?? 18;
            p.rotation.z = (p.rotation.z + dt * spinSpeed) % tau;
          }
          const airSteer = a.speed > 0 ? -0.18 : 0.18;
          for (let si = 0; si < anim.steeringPivots.length; si++) {
            anim.steeringPivots[si].rotation.y = airSteer;
          }
          const airFlash = Math.sin(this.elapsed * 6.5 + aIdx) > 0.25 ? 2.2 : 0.12;
          a.built.materials.signalLeft.emissiveIntensity = a.speed > 0 ? airFlash : 0.12;
          a.built.materials.signalRight.emissiveIntensity = a.speed <= 0 ? airFlash : 0.12;
          for (let fi = 0; fi < anim.afterburners.length; fi++) {
            const ab = anim.afterburners[fi];
            ab.visible = true;
            const flicker =
              0.88 +
              0.12 * Math.sin(this.elapsed * 38 + fi * 1.9 + aIdx) +
              0.07 * Math.cos(this.elapsed * 63 + fi * 2.7);
            const xyScale = 0.88 + 0.14 * flicker;
            const zScale = 0.82 + 0.30 * flicker;
            ab.scale.set(xyScale, xyScale, zScale);
            ab.rotation.z = (ab.rotation.z + dt * 10) % tau;
          }
        }
      }

      // 7. Articulated Realistic NPCs (with distance LOD for distant limb articulation)
      const crossStops = [-148, -68, -34, 0, 34, 68, 148];
      const npcLodDistSq = 105 * 105;
      for (let nIdx = 0; nIdx < this.npcs.length; nIdx++) {
        const npc = this.npcs[nIdx];
        const dxNpc = npc.group.position.x - camX;
        const dzNpc = npc.group.position.z - camZ;
        const nearCam = dxNpc * dxNpc + dzNpc * dzNpc < npcLodDistSq;

        if (npc.mode === 'sit') {
          if (nearCam) {
            npc.head.rotation.y = Math.sin(this.elapsed * 0.7 + npc.phase) * 0.28;
          }
          continue;
        }
        if (npc.mode === 'chat') {
          if (nearCam) {
            npc.head.rotation.y = Math.sin(this.elapsed * 1.4 + npc.phase) * 0.22;
            npc.rightArm.rotation.x = -0.45 + Math.sin(this.elapsed * 3.1 + npc.phase) * 0.28;
            npc.leftArm.rotation.x = -0.15 + Math.cos(this.elapsed * 2.2 + npc.phase) * 0.12;
          }
          continue;
        }

        let waitingAtCurb = false;
        if (npc.mode === 'walk') {
          const curbSignal = npc.axis === 'x' ? sig.zState : sig.xState;
          if (curbSignal === 'green') {
            const coord = npc.axis === 'x' ? npc.group.position.x : npc.group.position.z;
            for (let i = 0; i < crossStops.length; i++) {
              const dist = (crossStops[i] - coord) * npc.dir;
              if (dist > 5.4 && dist < 7.6) {
                waitingAtCurb = true;
                break;
              }
            }
          }
        }

        if (waitingAtCurb) {
          if (nearCam) {
            npc.leftLeg.rotation.x = THREE.MathUtils.damp(npc.leftLeg.rotation.x, 0, 8, dt);
            npc.rightLeg.rotation.x = THREE.MathUtils.damp(npc.rightLeg.rotation.x, 0, 8, dt);
            npc.leftArm.rotation.x = THREE.MathUtils.damp(npc.leftArm.rotation.x, 0, 8, dt);
            npc.rightArm.rotation.x = THREE.MathUtils.damp(npc.rightArm.rotation.x, 0, 8, dt);
            npc.head.rotation.y = Math.sin(this.elapsed * 1.2 + npc.phase) * 0.35;
          }
          continue;
        }

        if (nearCam) {
          const strideFreq = npc.mode === 'jog' ? 9.5 : 5.2;
          const strideAmp = npc.mode === 'jog' ? 0.72 : 0.45;
          const swing = Math.sin(this.elapsed * strideFreq + npc.phase) * strideAmp;
          npc.leftLeg.rotation.x = swing;
          npc.rightLeg.rotation.x = -swing;
          npc.leftArm.rotation.x = npc.mode === 'jog' ? -1.1 - swing * 0.55 : -swing * 0.75;
          npc.rightArm.rotation.x = npc.mode === 'jog' ? -1.1 + swing * 0.55 : swing * 0.75;
        }

        if (npc.axis === 'x') {
          npc.group.position.x += npc.dir * npc.speed * dt;
          npc.group.position.y = cityRoadY(npc.laneCoord) + 0.16;
          if (npc.group.position.x > npc.maxLimit || npc.group.position.x < npc.minLimit) {
            npc.dir = (npc.dir * -1) as 1 | -1;
            npc.group.rotation.y = npc.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        } else {
          npc.group.position.z += npc.dir * npc.speed * dt;
          npc.group.position.y =
            npc.laneCoord < -167.2 ? 0.30 : cityRoadY(npc.group.position.z) + 0.16;
          if (npc.group.position.z > npc.maxLimit || npc.group.position.z < npc.minLimit) {
            npc.dir = (npc.dir * -1) as 1 | -1;
            npc.group.rotation.y = npc.dir > 0 ? 0 : Math.PI;
          }
        }
      }
    }

    if (this.playerActor && !this.simPaused) {
      this.updatePlayerDriving(dt, rawDt);
    } else {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);

    if (isSoftwareGl) this.afterDraw(this.tick);
    else this.frameId = requestAnimationFrame(this.tick);
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos.set(e.clientX, e.clientY);
  };

  private handlePointerUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (moved > 6 || !this.callbacks.onHotspotSelect) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (let i = 0; i < hits.length; i++) {
      let cur: THREE.Object3D | null = hits[i].object;
      while (cur) {
        if (cur.userData.hotspot) {
          const preset = cur.userData.hotspot as CityCameraPreset;
          this.setCameraPreset(preset);
          this.callbacks.onHotspotSelect(preset);
          return;
        }
        cur = cur.parent;
      }
    }
  };

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || 1000;
    const h = this.container.clientHeight || 680;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.cleanupPlayerActor();
    this.disposableBuilt.forEach((b) => b.dispose());
    this.disposableBuilt = [];
    this.vegetation?.dispose();
    this.beachResult?.dispose();
    this.financialResult?.dispose();
    this.expandedResult?.dispose();
    this.residentialResult?.dispose();
    this.atlas.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
