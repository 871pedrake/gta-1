import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CityCameraPreset, CityHotspot, CityTimeOfDay } from '../types/vehicle';
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

export const CITY_HOTSPOTS: Record<CityCameraPreset, CityHotspot> = {
  overview: {
    id: 'overview',
    title: 'Metrópole Cidade Nova · Conceito GTA',
    subtitle: 'Visão Geral da Metrópole Expandida',
    highlights: [
      'Centro financeiro vertical com dezenas de arranha-céus, brises, helipontos e viaduto elevado',
      'Bairro residencial extenso com sobrados, casas térreas, muros, caixas d’água e praças arborizadas',
      '5 pontes conectadas (3 estaiadas + arco + concreto) ligando ao Morro denso e mata atlântica ao vento',
    ],
  },
  flag: {
    id: 'flag',
    title: 'Bandeira Monumental',
    subtitle: 'Praça da Bandeira · Marco Central',
    highlights: [
      'Pedestal octogonal de 3 degraus em granito, mármore e placas de bronze',
      'Mastro telescópico com adriça, roldana e pináculo dourado',
      'Tecido 3D alta resolução (56×34) com vento sincronizado às árvores da cidade',
    ],
  },
  shops: {
    id: 'shops',
    title: 'Rua das Lojas 2.0 & Shopping',
    subtitle: 'Corredor Comercial Completo',
    highlights: [
      'Motors 50, Café Carioca, Cyber 50, Barbearia, Farmácia, Padaria, Burger 50, Oficina e Eletrônicos',
      'Shopping Metrópole com passarela aérea envidraçada sobre a avenida',
      'Bancas de jornal, pontos de ônibus, orelhões, hidrantes, lixeiras e pedestres na calçada',
    ],
  },
  bridges: {
    id: 'bridges',
    title: 'Pontes Estaiadas & Eixo Fluvial',
    subtitle: '5 Travessias Niveladas & Marginais',
    highlights: [
      'Três pontes estaiadas iluminadas, ponte em arco metálico e ponte de concreto sem degraus',
      'Marginais arborizadas com palmeiras reais balançando ao vento e canteiros',
      'Rio refletivo animado com barcos navegando e tráfego contínuo nas faixas',
    ],
  },
  morro: {
    id: 'morro',
    title: 'Morro da Esperança',
    subtitle: 'Comunidade Densa & Encosta Viva',
    highlights: [
      'Mais de 340 lajes e casas em tijolo baiano, reboco e fachadas coloridas com caixas d’água e varais',
      'Muros com grafite urbano, comércios na base, 3 escadões com corrimão amarelo e fiação aérea',
      'Quadra poliesportiva iluminada, Igrejinha no mirante e mata atlântica animada pelo vento',
    ],
  },
  traffic: {
    id: 'traffic',
    title: 'Semáforos, Viaduto & Vida Urbana',
    subtitle: 'Simulação Metropolitana Sincronizada',
    highlights: [
      '10 cruzamentos sincronizados com sinalização horizontal, placas PARE/60 km/h e faixas de pedestre',
      'Frota variada circulando nas avenidas, marginais, pontes e bairros residenciais',
      'Dezenas de NPCs articulados caminhando, aguardando ônibus, correndo na orla e parando no sinal',
    ],
  },
};

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
}

interface BoatActor {
  built: BuiltVehicle;
  dir: 1 | -1;
  x: number;
  z: number;
  speed: number;
}

export interface CityCallbacks {
  onTrafficPhase?: (phaseLabel: string) => void;
  onHotspotSelect?: (preset: CityCameraPreset) => void;
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
  private shopAnimated: ShopAnimatedParts = {};
  private trafficLights: TrafficLightRig[] = [];
  private trafficActors: TrafficActor[] = [];
  private boatActors: BoatActor[] = [];
  private heliActors: { built: BuiltVehicle; cx: number; cz: number; rx: number; rz: number; alt: number; speed: number }[] = [];
  private npcs: ArticulatedNpc[] = [];

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

  private camTransitioning = false;
  private camTargetPos = new THREE.Vector3(-76, 54, -84);
  private camTargetLook = new THREE.Vector3(-2, 6, 4);

  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    this.controls.maxDistance = 260;
    this.controls.target.copy(this.camTargetLook);
    this.controls.addEventListener('start', () => {
      this.camTransitioning = false;
    });

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.atlas = createCityTextureAtlas(maxAniso);

    this.setupLighting();
    this.buildCityWorld(maxAniso);
    this.applyTimeOfDay('sunset');

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.clock.getDelta();
    this.tick();
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xfde68a, 0x1e293b, 0.88);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffb36b, 2.2);
    this.sunLight.position.set(-95, 58, -72);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 15;
    this.sunLight.shadow.camera.far = 360;
    const d = 145;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
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
      ipesYellow: VegetationPlacement[];
      ipesPink: VegetationPlacement[];
      urbanLeafy: VegetationPlacement[];
      atlanticForest: VegetationPlacement[];
      shrubs: VegetationPlacement[];
    } = {
      palms: [],
      ipesYellow: [],
      ipesPink: [],
      urbanLeafy: [],
      atlanticForest: [],
      shrubs: [],
    };

    // 1. Vast continuous outer terrain + inner metropolitan asphalt grid
    const horizonGround = new THREE.Mesh(
      new THREE.PlaneGeometry(920, 920),
      new THREE.MeshStandardMaterial({ color: 0x1b261d, roughness: 0.95 }),
    );
    horizonGround.rotation.x = -Math.PI / 2;
    horizonGround.position.y = -0.15;
    horizonGround.receiveShadow = true;
    this.scene.add(horizonGround);

    const matAsphalt = new THREE.MeshStandardMaterial({
      map: this.atlas.asphalt,
      roughness: 0.88,
      metalness: 0.05,
    });

    const southAsphalt = new THREE.Mesh(new THREE.BoxGeometry(274, 0.2, 142), matAsphalt);
    southAsphalt.position.set(0, -0.06, -63);
    southAsphalt.receiveShadow = true;
    this.scene.add(southAsphalt);

    const northAsphalt = new THREE.Mesh(new THREE.BoxGeometry(274, 0.2, 19), matAsphalt);
    northAsphalt.position.set(0, -0.06, 35.5);
    northAsphalt.receiveShadow = true;
    this.scene.add(northAsphalt);

    // Wide River Channel (Z = 8 .. 26, X = -300 .. +300)
    const riverBed = new THREE.Mesh(
      new THREE.BoxGeometry(600, 0.5, 19),
      new THREE.MeshStandardMaterial({ color: 0x091e29, roughness: 0.95 }),
    );
    riverBed.position.set(0, -2.5, 17);
    this.scene.add(riverBed);

    const matWater = new THREE.MeshPhysicalMaterial({
      map: this.atlas.waterRipple,
      color: 0x0ea5e9,
      roughness: 0.14,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.92,
    });
    const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(600, 18.2), matWater);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -1.25, 17);
    this.scene.add(waterMesh);

    // Stone river embankments (Muralhas da Orla) + Palm boardwalks & crash rails
    const matWall = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const matWalk = new THREE.MeshStandardMaterial({ map: this.atlas.sidewalk, roughness: 0.85 });
    [7.5, 26.5].forEach((wz) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(300, 2.8, 1.2), matWall);
      wall.position.set(0, -1.1, wz);
      this.scene.add(wall);

      const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(272, 0.24, 3.0), matWalk);
      boardwalk.position.set(0, 0.12, wz + (wz < 17 ? -1.4 : 1.4));
      boardwalk.receiveShadow = true;
      this.scene.add(boardwalk);
    });

    // Painted Avenue Road Markings (Av. N-S at X = [-102, -68, -34, 0, 34, 68, 102] & E-W at Z = [-102, -68, -34, 0, 34])
    const matAveMark = new THREE.MeshStandardMaterial({
      map: this.atlas.asphaltAvenue,
      roughness: 0.86,
      metalness: 0.04,
    });
    const roadX = [-102, -68, -34, 0, 34, 68, 102];
    const roadZ = [-102, -68, -34, 0, 34];

    roadX.forEach((rx) => {
      // Continuous avenue marking segments between intersections
      [-119, -85, -51, -17, 35].forEach((cz) => {
        const len = cz === 35 ? 12 : 21;
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(10.4, len), matAveMark);
        lane.rotation.x = -Math.PI / 2;
        lane.position.set(rx, 0.046, cz);
        lane.receiveShadow = true;
        this.scene.add(lane);
      });
    });

    roadZ.forEach((rz) => {
      [-119, -85, -51, -17, 17, 51, 85, 119].forEach((cx) => {
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 21), matAveMark);
        lane.rotation.x = -Math.PI / 2;
        lane.rotation.y = Math.PI / 2;
        lane.position.set(cx, 0.046, rz);
        lane.receiveShadow = true;
        this.scene.add(lane);
      });
    });

    // Landscaped Roundabouts (Rotatórias) at (-68, -68) and (+68, -68)
    const matCurb = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const matTurf = new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 0.9 });
    [-68, 68].forEach((rx, rIdx) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.24, 20), matCurb);
      ring.position.set(rx, 0.12, -68);
      ring.receiveShadow = true;
      this.scene.add(ring);

      const turf = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 0.28, 20), matTurf);
      turf.position.set(rx, 0.14, -68);
      this.scene.add(turf);

      if (rIdx === 0) treeCollector.ipesYellow.push({ x: rx, y: 0.28, z: -68, scale: 1.1 });
      else treeCollector.ipesPink.push({ x: rx, y: 0.28, z: -68, scale: 1.1 });

      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI) / 3;
        treeCollector.shrubs.push({
          x: rx + Math.cos(a) * 3.4,
          y: 0.28,
          z: -68 + Math.sin(a) * 3.4,
          scale: 0.95,
        });
      }
    });

    // Sidewalk pads for Downtown, Plaza, Shopping & Commercial Blocks
    const addSidewalkBlock = (cx: number, cz: number, w = 23, d = 23) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.24, d), matWalk);
      m.position.set(cx, 0.08, cz);
      m.receiveShadow = true;
      this.scene.add(m);
    };
    const coreBlocks: [number, number][] = [
      [-119, -17], [-85, -17], [-51, -17], [-17, -17], [17, -17], [51, -17], [85, -17], [119, -17],
      [-85, -51], [-51, -51], [-17, -51], [17, -51], [51, -51], [85, -51],
      [-51, -85],
    ];
    coreBlocks.forEach(([cx, cz]) => addSidewalkBlock(cx, cz));

    // North Marginal blocks flanking left & right of Morro (X = ±92, ±114, Z = 36)
    [-92, 92, -114, 114].forEach((nx) => addSidewalkBlock(nx, 36, 16, 11));

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

    // Imperial Palms along BOTH river embankments (X = -124 .. +124) & Downtown Boulevards
    for (let px = -124; px <= 124; px += 14) {
      if (Math.abs(px % 34) < 8) continue;
      treeCollector.palms.push({ x: px, y: 0.24, z: 6.2, scale: 0.95 + (Math.abs(px) % 3) * 0.08 });
      treeCollector.palms.push({ x: px, y: 0.24, z: 27.8, scale: 0.95 + (Math.abs(px + 1) % 3) * 0.08 });
      treeCollector.shrubs.push({ x: px + 4.5, y: 0.24, z: 6.2, scale: 0.9 });
      treeCollector.shrubs.push({ x: px - 4.5, y: 0.24, z: 27.8, scale: 0.9 });
    }

    // Sidewalk Ipês & leafy trees lining avenues
    for (let sx = -114; sx <= 114; sx += 22) {
      if (Math.abs(sx % 34) < 9) continue;
      treeCollector.urbanLeafy.push({ x: sx, y: 0.2, z: -6.4, scale: 0.85 });
      if (Math.abs(sx) > 36) {
        treeCollector.ipesYellow.push({ x: sx, y: 0.2, z: -61.2, scale: 0.88 });
      }
      if (sx % 44 === 0) {
        treeCollector.ipesPink.push({ x: sx, y: 0.2, z: -74.8, scale: 0.92 });
      }
    }

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

    // 6. BAIRRO RESIDENCIAL DE CASAS URBANAS + PRAÇA + BARES + POSTES
    this.residentialResult = createResidentialDistrict(
      this.atlas,
      this.windowEmissiveMat,
      this.lampEmissiveMat,
      treeCollector,
    );
    this.scene.add(this.residentialResult.group);

    // 7. MORRO / FAVELA DENSA CONECTADA (~340 CASAS + ESCADÕES + QUADRA + MATA)
    this.scene.add(createMorroDistrict(this.atlas, this.windowEmissiveMat, this.lampEmissiveMat, treeCollector));

    // 8. INSTANCED VEGETATION SYSTEM (ALL TREES SWAYING WITH "VENTO NA BANDEIRA")
    this.vegetation = createVegetationSystem(treeCollector);
    this.scene.add(this.vegetation.group);

    // 9. OUTDOORS, PLACAS DE TRÂNSITO, SEMÁFOROS SINCRONIZADOS & POSTES
    this.buildBillboardsAndTrafficSigns();
    this.buildIntersectionsAndLights();

    // 10. TRÂNSITO INTENSO (Frota 50), BARCOS, HELICÓPTEROS & NPCS
    this.spawnVehiclesAndBoats(maxAniso);
    this.spawnArticulatedNpcs();
  }

  private buildBillboardsAndTrafficSigns() {
    const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.7 });

    // Highway / Avenue Billboards
    [
      [-26, -39.5, 0.35, 0],
      [28, 30, -0.25, 1],
      [74, -27.5, -0.45, 0],
      [-74, -27.5, 0.45, 1],
    ].forEach(([bx, bz, ry, idx]) => {
      const bg = new THREE.Group();
      bg.position.set(bx, 0.2, bz);
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

    // Traffic Signs (PARE & 60 km/h)
    const matStop = new THREE.MeshStandardMaterial({
      map: this.atlas.trafficSignStop,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
    });
    const matSpeed = new THREE.MeshStandardMaterial({
      map: this.atlas.trafficSignSpeed,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
    });
    const signSpots: [number, number, number, boolean][] = [
      [-6.5, -62.2, 0, true],
      [6.5, -73.8, Math.PI, true],
      [-28.2, 6.2, Math.PI / 2, false],
      [28.2, -6.2, -Math.PI / 2, false],
      [-62.2, -39.8, 0, true],
      [62.2, -28.2, Math.PI, false],
    ];
    signSpots.forEach(([sx, sz, ry, isStop]) => {
      const sg = new THREE.Group();
      sg.position.set(sx, 0.2, sz);
      sg.rotation.y = ry;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.8, 8), matDarkSteel);
      pole.position.y = 1.4;
      sg.add(pole);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), isStop ? matStop : matSpeed);
      plate.position.y = 2.65;
      sg.add(plate);
      this.scene.add(sg);
    });
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
    ];

    intersections.forEach(([ix, iz], idx) => {
      // Zebra crosswalk stripes on 4 approaches
      for (let s = -4; s <= 4; s += 1.4) {
        const zx1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.02, 2.2), matCross);
        zx1.position.set(ix + s, 0.055, iz - 6.8);
        this.scene.add(zx1);
        const zx2 = zx1.clone();
        zx2.position.z = iz + 6.8;
        this.scene.add(zx2);

        const zz1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.65), matCross);
        zz1.position.set(ix - 6.8, 0.055, iz + s);
        this.scene.add(zz1);
        const zz2 = zz1.clone();
        zz2.position.x = ix + 6.8;
        this.scene.add(zz2);
      }

      // 4 Functional traffic lights at key downtown intersections (skip outer residential pairs for cleaner draw budget)
      if (idx < 8) {
        const rigZ1 = createTrafficLightRig('z');
        rigZ1.group.position.set(ix - 6.0, 0.2, iz - 6.0);
        this.scene.add(rigZ1.group);
        this.trafficLights.push(rigZ1);

        const rigZ2 = createTrafficLightRig('z');
        rigZ2.group.position.set(ix + 6.0, 0.2, iz + 6.0);
        rigZ2.group.rotation.y = Math.PI;
        this.scene.add(rigZ2.group);
        this.trafficLights.push(rigZ2);

        const rigX1 = createTrafficLightRig('x');
        rigX1.group.position.set(ix + 6.0, 0.2, iz - 6.0);
        rigX1.group.rotation.y = -Math.PI / 2;
        this.scene.add(rigX1.group);
        this.trafficLights.push(rigX1);

        const rigX2 = createTrafficLightRig('x');
        rigX2.group.position.set(ix - 6.0, 0.2, iz + 6.0);
        rigX2.group.rotation.y = Math.PI / 2;
        this.scene.add(rigX2.group);
        this.trafficLights.push(rigX2);
      }
    });

    // Streetlights along main avenues, bridges, commercial strip & plaza
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
      [0, -51, 0, true],
      [-34, -51, 0, true],
      [34, -51, 0, true],
    ];
    lampSpots.forEach(([lx, lz, rot, dbl]) => {
      const lamp = createStreetlightRig(dbl, this.lampEmissiveMat);
      lamp.position.set(lx, 0.2, lz);
      lamp.rotation.y = rot;
      this.scene.add(lamp);
    });
  }

  private spawnVehiclesAndBoats(maxAniso: number) {
    // 24 distinct vehicles circulating cleanly across 5 bridges, avenues, Rua das Lojas, and neighborhoods
    const laneConfigs: {
      vid: number;
      axis: 'x' | 'z';
      dir: 1 | -1;
      laneCoord: number;
      posCoord: number;
      minC: number;
      maxC: number;
      speed: number;
    }[] = [
      // Av. Central & Ponte Estaiada (X = 0)
      { vid: 9, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: -76, minC: -124, maxC: 38, speed: 13.0 },
      { vid: 23, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: -22, minC: -124, maxC: 38, speed: 10.5 }, // Bus
      { vid: 2, axis: 'z', dir: 1, laneCoord: 2.6, posCoord: 14, minC: -124, maxC: 38, speed: 12.0 },
      { vid: 20, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: 26, minC: -124, maxC: 38, speed: 13.5 }, // Ambulance
      { vid: 31, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: -18, minC: -124, maxC: 38, speed: 14.5 }, // Sportbike
      { vid: 5, axis: 'z', dir: -1, laneCoord: -2.6, posCoord: -86, minC: -124, maxC: 38, speed: 12.2 },
      // Av. Oeste & Ponte em Arco (X = -34)
      { vid: 1, axis: 'z', dir: 1, laneCoord: -34 + 2.6, posCoord: -54, minC: -124, maxC: 38, speed: 11.8 },
      { vid: 14, axis: 'z', dir: 1, laneCoord: -34 + 2.6, posCoord: 12, minC: -124, maxC: 38, speed: 12.6 },
      { vid: 17, axis: 'z', dir: -1, laneCoord: -34 - 2.6, posCoord: 22, minC: -124, maxC: 38, speed: 12.4 }, // Police
      { vid: 27, axis: 'z', dir: -1, laneCoord: -34 - 2.6, posCoord: -72, minC: -124, maxC: 38, speed: 10.8 },
      // Av. Leste & Ponte Concreto (X = +34)
      { vid: 12, axis: 'z', dir: 1, laneCoord: 34 + 2.6, posCoord: -44, minC: -124, maxC: 38, speed: 11.5 },
      { vid: 24, axis: 'z', dir: -1, laneCoord: 34 - 2.6, posCoord: 18, minC: -124, maxC: 38, speed: 10.2 }, // Bus
      // Pontes Estaiadas Oeste & Leste (X = -68 & X = +68)
      { vid: 11, axis: 'z', dir: 1, laneCoord: -68 + 2.6, posCoord: -12, minC: -56, maxC: 38, speed: 13.8 },
      { vid: 19, axis: 'z', dir: -1, laneCoord: 68 - 2.6, posCoord: 18, minC: -56, maxC: 38, speed: 12.5 },
      // Av. Beira-Centro (Z = 0)
      { vid: 10, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: -88, minC: -126, maxC: 126, speed: 13.5 },
      { vid: 3, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: -14, minC: -126, maxC: 126, speed: 12.0 }, // Taxi
      { vid: 15, axis: 'x', dir: 1, laneCoord: -2.6, posCoord: 52, minC: -126, maxC: 126, speed: 12.8 },
      { vid: 33, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: 76, minC: -126, maxC: 126, speed: 14.0 }, // Moto
      { vid: 6, axis: 'x', dir: -1, laneCoord: 2.6, posCoord: 12, minC: -126, maxC: 126, speed: 11.4 },
      // Rua das Lojas (Z = -34)
      { vid: 8, axis: 'x', dir: 1, laneCoord: -34 - 2.6, posCoord: -72, minC: -126, maxC: 126, speed: 11.5 },
      { vid: 25, axis: 'x', dir: -1, laneCoord: -34 + 2.6, posCoord: 42, minC: -126, maxC: 126, speed: 10.2 },
      // Av. Marginal Norte (Z = 34)
      { vid: 4, axis: 'x', dir: 1, laneCoord: 34 - 2.6, posCoord: -54, minC: -122, maxC: 122, speed: 12.2 },
      { vid: 35, axis: 'x', dir: -1, laneCoord: 34 + 2.6, posCoord: 48, minC: -122, maxC: 122, speed: 13.2 },
      // Av. Residencial Sul (Z = -68)
      { vid: 7, axis: 'x', dir: 1, laneCoord: -68 - 2.6, posCoord: -32, minC: -56, maxC: 56, speed: 11.0 },
    ];

    laneConfigs.forEach((cfg) => {
      const concept = VEHICLES_50.find((v) => v.id === cfg.vid) ?? VEHICLES_50[0];
      const built = buildCraftedVehicle(concept, maxAniso);
      this.disposableBuilt.push(built);
      built.group.position.set(
        cfg.axis === 'x' ? cfg.posCoord : cfg.laneCoord,
        0.04,
        cfg.axis === 'z' ? cfg.posCoord : cfg.laneCoord,
      );
      built.group.rotation.y =
        cfg.axis === 'z'
          ? (cfg.dir > 0 ? 0 : Math.PI)
          : (cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
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
      });
    });

    // 3 Boats cruising in the river (Z = 13.6, 17.0, 20.5)
    [
      { vid: 41, dir: 1 as const, x: -72, z: 13.8, speed: 6.0 },
      { vid: 44, dir: -1 as const, x: 58, z: 19.8, speed: 4.5 },
      { vid: 42, dir: 1 as const, x: 18, z: 16.8, speed: 5.2 },
    ].forEach((bc) => {
      const concept = VEHICLES_50.find((v) => v.id === bc.vid) ?? VEHICLES_50[40];
      const built = buildCraftedVehicle(concept, maxAniso);
      this.disposableBuilt.push(built);
      built.group.position.set(bc.x, -1.22, bc.z);
      built.group.rotation.y = bc.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(built.group);
      this.boatActors.push({ built, dir: bc.dir, x: bc.x, z: bc.z, speed: bc.speed });
    });

    // 2 Helicopters patrolling above skyscrapers and Morro
    const heliConfigs = [
      { vid: 46, cx: -12, cz: -14, rx: 64, rz: 52, alt: 58, speed: 0.24 },
      { vid: 47, cx: 18, cz: 36, rx: 72, rz: 44, alt: 64, speed: -0.19 },
    ];
    heliConfigs.forEach((hc) => {
      const heliConcept =
        VEHICLES_50.find((v) => v.id === hc.vid) ??
        VEHICLES_50.find((v) => v.geometry.archetype === 'helicopter') ??
        VEHICLES_50[45];
      const built = buildCraftedVehicle(heliConcept, maxAniso);
      this.disposableBuilt.push(built);
      built.group.position.set(hc.cx + hc.rx, hc.alt, hc.cz);
      this.scene.add(built.group);
      this.heliActors.push({ built, ...hc });
    });
  }

  private spawnArticulatedNpcs() {
    // 1. Sidewalk pedestrians across Plaza, Rua das Lojas, Shopping, Riverfront & Residential Bairro
    const walkPaths: { axis: 'x' | 'z'; dir: 1 | -1; laneCoord: number; start: number; min: number; max: number; count: number; mode?: ArticulatedNpc['mode'] }[] = [
      { axis: 'x', dir: 1, laneCoord: -6.4, start: -42, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -6.8, start: 28, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: 1, laneCoord: -27.4, start: -52, min: -84, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -40.2, start: -48, min: -84, max: 84, count: 4 }, // Rua das Lojas crowded sidewalk
      { axis: 'z', dir: 1, laneCoord: -6.6, start: -52, min: -92, max: 4, count: 3 },
      { axis: 'z', dir: -1, laneCoord: 6.6, start: -12, min: -92, max: 4, count: 3 },
      { axis: 'z', dir: 1, laneCoord: -27.5, start: -46, min: -92, max: 4, count: 2 },
      // Residential sidewalks (Av. Z = -68 / -102)
      { axis: 'x', dir: 1, laneCoord: -61.5, start: -42, min: -58, max: 84, count: 3 },
      { axis: 'x', dir: -1, laneCoord: -74.5, start: 34, min: -58, max: 84, count: 3 },
      // River boardwalk joggers!
      { axis: 'x', dir: 1, laneCoord: 6.2, start: -76, min: -96, max: 96, count: 3, mode: 'jog' },
      { axis: 'x', dir: -1, laneCoord: 27.6, start: 44, min: -96, max: 96, count: 3, mode: 'jog' },
    ];

    walkPaths.forEach((wp, idx) => {
      for (let k = 0; k < wp.count; k++) {
        const mode = wp.mode ?? 'walk';
        const npc = createArticulatedNpc(idx * 11 + k * 5 + 1, mode);
        npc.axis = wp.axis;
        npc.dir = k % 2 === 0 ? wp.dir : (-wp.dir as 1 | -1);
        npc.laneCoord = wp.laneCoord + (k % 2 === 0 ? 0.35 : -0.35);
        npc.minLimit = wp.min;
        npc.maxLimit = wp.max;
        const coord = wp.start + k * 24;
        npc.group.position.set(
          npc.axis === 'x' ? coord : npc.laneCoord,
          0.22,
          npc.axis === 'z' ? coord : npc.laneCoord,
        );
        npc.group.rotation.y =
          npc.axis === 'x' ? (npc.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (npc.dir > 0 ? 0 : Math.PI);
        this.scene.add(npc.group);
        this.npcs.push(npc);
      }
    });

    // 2. Seated NPCs on Flag Plaza benches & Bus Stops
    [
      [-17 - 6.6, 0.32, -17, Math.PI / 2],
      [-17 + 6.6, 0.32, -17, -Math.PI / 2],
      [-17, 0.32, -17 + 6.6, Math.PI],
      [-17, 0.32, -39.7, 0], // Waiting at Rua das Lojas bus stop
      [51, 0.32, -39.7, 0],  // Waiting at Burger 50 bus stop
    ].forEach(([sx, sy, sz, rot], idx) => {
      const npc = createArticulatedNpc(40 + idx * 5, 'sit');
      npc.group.position.set(sx, sy, sz);
      npc.group.rotation.y = rot;
      this.scene.add(npc.group);
      this.npcs.push(npc);
    });

    // 3. Conversing pairs near Café, Flag Monument, Bairro Park & Bar do Zé
    [
      [-11.8, 0.22, -37.2, 0.7],
      [-10.8, 0.22, -37.6, -2.4],
      [-13.2, 0.30, -13.5, -2.2],
      [-12.4, 0.30, -14.2, 0.9],
      [16.2, 0.28, -84.6, 0.8],
      [17.2, 0.28, -85.2, -2.3],
      [-12.2, 0.22, -74.6, 0.6],
      [-11.3, 0.22, -75.0, -2.5],
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
        this.camTargetPos.set(-76, 54, -84);
        this.camTargetLook.set(-2, 6, 4);
        break;
      case 'flag':
        // Unobstructed hero close-up of the Monumental Flag, pedestal, plaza & city skyline
        this.camTargetPos.set(-28.5, 13.0, -30.5);
        this.camTargetLook.set(-14.5, 13.5, -17.0);
        break;
      case 'shops':
        // Positioned cleanly along open avenue Z = -34 facing the illuminated storefronts & Shopping!
        this.camTargetPos.set(-30, 9.2, -31);
        this.camTargetLook.set(6, 4.2, -41);
        break;
      case 'bridges':
        // Over open riverfront Marginal framing Cable-Stayed & Arch bridges + boats + palms
        this.camTargetPos.set(-48, 15.5, 4.5);
        this.camTargetLook.set(8, 5.5, 17);
        break;
      case 'morro':
        // Over open river channel framing the 340+ house dense Morro, graffiti wall, escadões & Mirante
        this.camTargetPos.set(-42, 30, 12);
        this.camTargetLook.set(4, 15, 78);
        break;
      case 'traffic':
        // Clean corner view from Plaza edge into (0, 0) synchronized intersection
        this.camTargetPos.set(-14.5, 11.0, -14.5);
        this.camTargetLook.set(1.5, 2.5, 1.5);
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
    if (mode === 'sunset') {
      const bg = new THREE.Color(0x281e32);
      this.scene.background = bg;
      this.scene.fog = new THREE.FogExp2(bg.getHex(), 0.0024);
      this.hemiLight.color.setHex(0xfde68a);
      this.hemiLight.groundColor.setHex(0x1f2937);
      this.hemiLight.intensity = 0.92;
      this.sunLight.color.setHex(0xffab5e);
      this.sunLight.intensity = 2.35;
      this.sunLight.position.set(-95, 52, -72);
      this.lampEmissiveMat.emissiveIntensity = 1.85;
      this.windowEmissiveMat.emissiveIntensity = 1.05;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 0.75));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 48));
    } else if (mode === 'day') {
      const bg = new THREE.Color(0x7cc4f5);
      this.scene.background = bg;
      this.scene.fog = new THREE.FogExp2(bg.getHex(), 0.0017);
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x3f3f46);
      this.hemiLight.intensity = 1.08;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 2.45;
      this.sunLight.position.set(75, 108, -60);
      this.lampEmissiveMat.emissiveIntensity = 0.15;
      this.windowEmissiveMat.emissiveIntensity = 0.22;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 0.08));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 6));
    } else {
      const bg = new THREE.Color(0x090b16);
      this.scene.background = bg;
      this.scene.fog = new THREE.FogExp2(bg.getHex(), 0.0028);
      this.hemiLight.color.setHex(0x3b82f6);
      this.hemiLight.groundColor.setHex(0x09090b);
      this.hemiLight.intensity = 0.48;
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.68;
      this.sunLight.position.set(55, 80, 60);
      this.lampEmissiveMat.emissiveIntensity = 2.9;
      this.windowEmissiveMat.emissiveIntensity = 2.0;
      this.skylineGlowMats.forEach((m) => (m.emissiveIntensity = 1.65));
      this.flagRig.spotlights.forEach((s) => (s.intensity = 95));
    }
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

    // 2. Monumental Flag + ALL 400+ City/Morro/Bairro Trees synced to "Vento na Bandeira"!
    this.flagRig.update(this.elapsed, this.windStrength);
    this.vegetation.update(this.elapsed, this.windStrength);

    if (!this.simPaused) {
      this.atlas.waterRipple.offset.x = (this.elapsed * 0.06) % 1;

      if (this.shopAnimated.showroomCar) {
        this.shopAnimated.showroomCar.rotation.y += dt * 0.6;
      }
      if (this.shopAnimated.barberPole) {
        this.shopAnimated.barberPole.rotation.y += dt * 2.8;
      }

      const blink = Math.sin(this.elapsed * 4.2) > 0 ? 2.4 : 0.15;
      this.beacons.forEach((m) => (m.emissiveIntensity = blink));

      // 3. Synchronized Traffic Lights
      const sig = this.getSignalStates();
      const phaseIdx = Math.floor((this.elapsed % 16) / 2);
      if (phaseIdx !== this.lastPhaseIdx) {
        this.lastPhaseIdx = phaseIdx;
        this.callbacks.onTrafficPhase?.(sig.label);
      }
      this.trafficLights.forEach((rig) => {
        rig.setPhase(rig.axis === 'z' ? sig.zState : sig.xState);
      });

      // 4. Traffic Vehicles obeying signals & spacing
      const stopCoords = [-68, -34, 0, 34];
      this.trafficActors.forEach((actor) => {
        const mySignal = actor.axis === 'z' ? sig.zState : sig.xState;
        let mustStop = false;

        if (mySignal !== 'green') {
          for (let i = 0; i < stopCoords.length; i++) {
            const c = stopCoords[i];
            if (actor.axis === 'z' && c < -68) continue;
            if (actor.axis === 'x' && Math.abs(actor.laneCoord) > 40) continue;
            const distAhead = (c - actor.posCoord) * actor.dir;
            if (distAhead > 5.8 && distAhead < 11.2) {
              mustStop = true;
              break;
            }
          }
        }

        for (let j = 0; j < this.trafficActors.length; j++) {
          const other = this.trafficActors[j];
          if (other === actor || other.axis !== actor.axis || other.dir !== actor.dir) continue;
          if (Math.abs(other.laneCoord - actor.laneCoord) > 1.0) continue;
          const gap = (other.posCoord - actor.posCoord) * actor.dir;
          if (gap > 0 && gap < 9.5) {
            mustStop = true;
            break;
          }
        }

        const targetSpd = mustStop ? 0 : actor.maxSpeed;
        actor.speed = THREE.MathUtils.damp(actor.speed, targetSpd, mustStop ? 8 : 3.5, dt);
        actor.posCoord += actor.dir * actor.speed * dt;
        if (actor.dir > 0 && actor.posCoord > actor.maxC) actor.posCoord = actor.minC;
        if (actor.dir < 0 && actor.posCoord < actor.minC) actor.posCoord = actor.maxC;

        if (actor.axis === 'x') actor.built.group.position.x = actor.posCoord;
        else actor.built.group.position.z = actor.posCoord;

        const wheelSpin = actor.speed * dt * 2.4;
        actor.built.animatedParts.wheels.forEach((w) => (w.rotation.x += wheelSpin));
        if (actor.built.materials.sirenRed) {
          const st = Math.sin(this.elapsed * 14);
          actor.built.materials.sirenRed.emissiveIntensity = st > 0 ? 2.6 : 0.2;
          actor.built.materials.sirenBlue.emissiveIntensity = st <= 0 ? 2.6 : 0.2;
        }
      });

      // 5. River Boats
      this.boatActors.forEach((b) => {
        b.x += b.dir * b.speed * dt;
        if (b.dir > 0 && b.x > 110) b.x = -110;
        if (b.dir < 0 && b.x < -110) b.x = 110;
        b.built.group.position.x = b.x;
        b.built.group.position.y = -1.22 + Math.sin(this.elapsed * 2.4 + b.x * 0.2) * 0.08;
        b.built.group.rotation.z = Math.sin(this.elapsed * 1.9 + b.x * 0.15) * 0.03;
      });

      // 6. Patrol Helicopters high above skyscrapers
      this.heliActors.forEach((h, hIdx) => {
        const ang = this.elapsed * h.speed + hIdx * 1.4;
        const hx = h.cx + Math.cos(ang) * h.rx;
        const hz = h.cz + Math.sin(ang) * h.rz;
        h.built.group.position.set(hx, h.alt + Math.sin(this.elapsed * 1.1 + hIdx) * 1.4, hz);
        h.built.group.rotation.y = h.speed > 0 ? -ang : -ang + Math.PI;
        h.built.group.rotation.x = 0.12;
        h.built.group.rotation.z = h.speed > 0 ? -0.14 : 0.14;
        h.built.animatedParts.rotors.forEach((r, idx) => {
          if (idx === 0) r.rotation.y += dt * 16;
          else r.rotation.x += dt * 20;
        });
      });

      // 7. Articulated Realistic NPCs
      const crossStops = [-68, -34, 0, 34, 68];
      this.npcs.forEach((npc) => {
        if (npc.mode === 'sit') {
          npc.head.rotation.y = Math.sin(this.elapsed * 0.7 + npc.phase) * 0.28;
          return;
        }
        if (npc.mode === 'chat') {
          npc.head.rotation.y = Math.sin(this.elapsed * 1.4 + npc.phase) * 0.22;
          npc.rightArm.rotation.x = -0.45 + Math.sin(this.elapsed * 3.1 + npc.phase) * 0.28;
          npc.leftArm.rotation.x = -0.15 + Math.cos(this.elapsed * 2.2 + npc.phase) * 0.12;
          return;
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
          npc.leftLeg.rotation.x = THREE.MathUtils.damp(npc.leftLeg.rotation.x, 0, 8, dt);
          npc.rightLeg.rotation.x = THREE.MathUtils.damp(npc.rightLeg.rotation.x, 0, 8, dt);
          npc.leftArm.rotation.x = THREE.MathUtils.damp(npc.leftArm.rotation.x, 0, 8, dt);
          npc.rightArm.rotation.x = THREE.MathUtils.damp(npc.rightArm.rotation.x, 0, 8, dt);
          npc.head.rotation.y = Math.sin(this.elapsed * 1.2 + npc.phase) * 0.35;
          return;
        }

        const strideFreq = npc.mode === 'jog' ? 9.5 : 5.2;
        const strideAmp = npc.mode === 'jog' ? 0.72 : 0.45;
        const swing = Math.sin(this.elapsed * strideFreq + npc.phase) * strideAmp;
        npc.leftLeg.rotation.x = swing;
        npc.rightLeg.rotation.x = -swing;
        npc.leftArm.rotation.x = npc.mode === 'jog' ? -1.1 - swing * 0.55 : -swing * 0.75;
        npc.rightArm.rotation.x = npc.mode === 'jog' ? -1.1 + swing * 0.55 : swing * 0.75;

        if (npc.axis === 'x') {
          npc.group.position.x += npc.dir * npc.speed * dt;
          if (npc.group.position.x > npc.maxLimit || npc.group.position.x < npc.minLimit) {
            npc.dir = (npc.dir * -1) as 1 | -1;
            npc.group.rotation.y = npc.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        } else {
          npc.group.position.z += npc.dir * npc.speed * dt;
          if (npc.group.position.z > npc.maxLimit || npc.group.position.z < npc.minLimit) {
            npc.dir = (npc.dir * -1) as 1 | -1;
            npc.group.rotation.y = npc.dir > 0 ? 0 : Math.PI;
          }
        }
      });
    }

    this.controls.update();
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
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.disposableBuilt.forEach((b) => b.dispose());
    this.disposableBuilt = [];
    this.vegetation?.dispose();
    this.financialResult?.dispose();
    this.residentialResult?.dispose();
    this.atlas.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
