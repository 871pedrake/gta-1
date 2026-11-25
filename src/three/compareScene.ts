import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VehicleConcept } from '../types/vehicle';
import { buildCraftedVehicle, BuiltVehicle } from './vehicleBuilder';
import { getStudioFloorTexture, isSoftwareGl } from './materials';

function buildUnityNpcReference(): THREE.Group {
  // Matches 1.75m proportions from AparenciaPersonagem.cs
  const npc = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.6 });

  // Legs
  [-0.095, 0.095].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.82, 12), pantsMat);
    leg.position.set(lx, 0.45, 0);
    npc.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.25), shoeMat);
    shoe.position.set(lx, 0.045, 0.04);
    npc.add(shoe);
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.34, 6, 12), shirtMat);
  torso.position.set(0, 1.15, 0);
  npc.add(torso);

  // Arms
  [-0.24, 0.24].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.44, 6, 10), skinMat);
    arm.position.set(ax, 1.13, 0);
    npc.add(arm);
  });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 14), skinMat);
  head.position.set(0, 1.62, 0);
  npc.add(head);

  npc.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return npc;
}

export class ScaleCompareController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private vehicleSlots: BuiltVehicle[] = [];
  private lineupGroup = new THREE.Group();
  private npcRef: THREE.Group;
  private frameId = 0;
  private disposed = false;
  private renderBusy = false;
  private renderDirty = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const bgHex = 0x0b0b0f;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 800) / (container.clientHeight || 600),
      0.1,
      160,
    );
    this.camera.position.set(11, 5.2, 14);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1c1917, 0.78));
    const key = new THREE.DirectionalLight(0xfff1dc, 1.85);
    key.position.set(10, 16, 12);
    key.castShadow = !isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const floorTex = getStudioFloorTexture(this.renderer.capabilities.getMaxAnisotropy());
    floorTex.repeat.set(2, 2);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(48, 36),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7, metalness: 0.15 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.npcRef = buildUnityNpcReference();
    this.scene.add(this.npcRef);
    this.scene.add(this.lineupGroup);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 1.2, 0);
    this.controls.addEventListener('change', () => this.requestRender());

    window.addEventListener('resize', this.handleResize);
    this.requestRender();
  }

  public setLineup(vehicles: VehicleConcept[]) {
    this.vehicleSlots.forEach((b) => {
      this.lineupGroup.remove(b.group);
      b.dispose();
    });
    this.vehicleSlots = [];

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const gap = 1.6;
    const totalWidth =
      vehicles.reduce((acc, v) => acc + v.dimensions.width, 0) +
      Math.max(0, vehicles.length - 1) * gap;

    let cursorX = -totalWidth / 2;
    vehicles.forEach((v) => {
      const built = buildCraftedVehicle(v, maxAniso);
      const centerX = cursorX + v.dimensions.width / 2;
      built.group.position.set(centerX, 0, 0);
      this.lineupGroup.add(built.group);
      this.vehicleSlots.push(built);
      cursorX += v.dimensions.width + gap;
    });

    // Place 1.75m Unity NPC reference right on the left side of the lineup
    this.npcRef.position.set(-totalWidth / 2 - 1.35, 0, 0.8);
    this.controls.target.set(0, 1.1, 0);
    this.requestRender();
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.requestRender();
  };

  private requestRender() {
    if (this.disposed || this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = 0;
      this.renderDirty = false;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty && !this.disposed) this.requestRender();
      };
      if (isSoftwareGl) {
        this.frameId = window.setTimeout(done, 80);
      } else {
        done();
      }
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.vehicleSlots.forEach((b) => b.dispose());
    this.npcRef.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        (c as THREE.Mesh).geometry.dispose();
      }
    });
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
