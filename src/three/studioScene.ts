import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { PaintLivery, StudioCameraPreset, VehicleConcept, WheelStyle } from '../types/vehicle';
import { buildCraftedVehicle, BuiltVehicle } from './vehicleBuilder';
import { getContactShadowTexture, getStudioFloorTexture, isSoftwareGl } from './materials';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _interiorSteerLocal = new THREE.Vector3();
const _interiorEyeLocal = new THREE.Vector3();
const _interiorLookLocal = new THREE.Vector3();
const _cabinLightLocal = new THREE.Vector3();

export interface StudioCallbacks {
  onHoverPart?: (partLabel: string | null) => void;
  onPartsCount?: (count: number) => void;
  onOpenablesCount?: (count: number) => void;
  onAutoRotateChange?: (enabled: boolean) => void;
}

export class VehicleStudioController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private callbacks: StudioCallbacks;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private outputPass: OutputPass | null = null;

  private currentBuilt: BuiltVehicle | null = null;
  private currentVehicle: VehicleConcept | null = null;
  private customLivery: PaintLivery | undefined = undefined;
  private customWheelStyle: WheelStyle | undefined = undefined;
  private customPaintHex: string | undefined = undefined;
  private customPaintFinish: VehicleConcept['palette']['finish'] | undefined = undefined;
  private customStripeHex: string | undefined = undefined;
  private keyLight!: THREE.DirectionalLight;
  private contactShadow: THREE.Mesh;
  private turntable: THREE.Mesh;
  private blueprintGroup: THREE.Group;
  private cabinLight: THREE.PointLight;
  private cabinLightLocalPos = new THREE.Vector3();
  private currentPreset: StudioCameraPreset = 'hero';

  private explodeTarget = 0;
  private explodeCurrent = 0;
  private doorsTarget = 0;
  private doorsCurrent = 0;
  private autoRotate = true;
  private animateSystems = true;
  private rotorSpeedFactor = 1;
  private engineSpeedFactor = 1;
  private lightsOn = true;
  private wireframeMode = false;

  private camTransitioning = false;
  private camTargetPos = new THREE.Vector3(5.8, 2.7, 6.4);
  private camTargetLook = new THREE.Vector3(0, 0.85, 0);

  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private renderBusy = false;
  private renderDirty = false;
  private lastRaycastMs = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  constructor(container: HTMLElement, callbacks: StudioCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    const initW = container.clientWidth || 800;
    const initH = container.clientHeight || 600;
    this.renderer.setSize(initW, initH);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const bgHex = 0x0b0b0f;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, 0.022);

    const aspect = initW / initH;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 140);
    this.camera.position.copy(this.camTargetPos);

    // Environment map for metallic paint & glass
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    // 3-Point Studio Lighting + Cool/Warm Contrast (calibrated for AgX without highlight blowout)
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1c1917, 0.52);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e4, 1.32);
    keyLight.position.set(8, 12, 9);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 36;
    const d = 6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.radius = 4.5;
    keyLight.shadow.blurSamples = 16;
    keyLight.shadow.intensity = 0.58;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.normalBias = 0.015;
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    const fillLight = new THREE.DirectionalLight(0xcbd5e1, 0.34);
    fillLight.position.set(-7, 4, 7);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.76);
    rimLight.position.set(-9, 6, -10);
    this.scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const topSoftbox = new THREE.RectAreaLight(0xffffff, 1.28, 9, 4);
      topSoftbox.position.set(0, 8.5, 1.5);
      topSoftbox.lookAt(0, 0.8, 0);
      this.scene.add(topSoftbox);

      const sideSoftbox = new THREE.RectAreaLight(0xfff7ed, 0.82, 8, 2.5);
      sideSoftbox.position.set(-8, 3.2, 2);
      sideSoftbox.lookAt(0, 1, 0);
      this.scene.add(sideSoftbox);
    }

    // Soft warm dome light inside the vehicle cabin so interior details read through glass & in Interior view
    this.cabinLight = new THREE.PointLight(0xfff7ed, 1.5, 4.2, 1.4);
    this.cabinLight.position.set(0, 1.15, -0.15);
    this.scene.add(this.cabinLight);

    // Studio calibration turntable floor
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const floorTex = getStudioFloorTexture(maxAniso);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.62,
      metalness: 0.25,
    });
    this.turntable = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.8, 0.14, 64), floorMat);
    this.turntable.position.y = -0.07;
    this.turntable.receiveShadow = true;
    this.scene.add(this.turntable);

    // Soft underbody contact occlusion plane directly under vehicle
    const shadowMat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.42,
    });
    this.contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), shadowMat);
    this.contactShadow.rotation.order = 'YXZ';
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.008;
    this.contactShadow.matrixAutoUpdate = false;
    this.contactShadow.updateMatrix();
    this.scene.add(this.contactShadow);

    this.blueprintGroup = new THREE.Group();
    this.scene.add(this.blueprintGroup);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 0.65;
    this.controls.maxDistance = 32;
    this.controls.target.copy(this.camTargetLook);
    this.controls.addEventListener('start', () => {
      this.camTransitioning = false;
    });
    this.controls.addEventListener('change', () => {
      if (!this.needsContinuousLoop()) this.requestRender();
    });

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);

    if (!isSoftwareGl) {
      const pr = this.renderer.getPixelRatio();
      const hdrTarget = new THREE.WebGLRenderTarget(initW * pr, initH * pr, {
        type: THREE.HalfFloatType,
        samples: pr > 1.25 ? 2 : 4,
      });
      this.composer = new EffectComposer(this.renderer, hdrTarget);
      this.composer.setPixelRatio(pr);
      this.composer.setSize(initW, initH);

      this.composer.addPass(new RenderPass(this.scene, this.camera));

      // HDR Bloom tuned so only emissive LEDs/DRLs/lights glow cleanly with zero bleed onto car paint
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.floor((initW * pr) / 2)), Math.max(1, Math.floor((initH * pr) / 2))),
        0.24,
        0.38,
        1.48,
      );
      this.composer.addPass(this.bloomPass);

      // Subtle automotive studio vignette before tone mapping + sRGB output
      this.vignettePass = new ShaderPass(VignetteShader);
      this.vignettePass.uniforms['offset'].value = 1.12;
      this.vignettePass.uniforms['darkness'].value = 0.36;
      this.composer.addPass(this.vignettePass);

      // Final AgX ToneMapping + sRGB output conversion after Bloom & Vignette
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private needsContinuousLoop(): boolean {
    const hasSpinningRotors =
      (this.currentBuilt?.animatedParts.rotors.length ?? 0) > 0 && this.rotorSpeedFactor > 0.002;
    const hasSpinningPropsOrFlames =
      ((this.currentBuilt?.animatedParts.propellers.length ?? 0) > 0 ||
        (this.currentBuilt?.animatedParts.afterburners.length ?? 0) > 0 ||
        (this.currentBuilt?.animatedParts.cranks.length ?? 0) > 0 ||
        (this.currentBuilt?.animatedParts.steeringPivots.length ?? 0) > 0) &&
      this.engineSpeedFactor > 0.002;
    return (
      this.autoRotate ||
      this.animateSystems ||
      hasSpinningRotors ||
      hasSpinningPropsOrFlames ||
      this.camTransitioning ||
      Math.abs(this.explodeCurrent - this.explodeTarget) > 0.002 ||
      Math.abs(this.doorsCurrent - this.doorsTarget) > 0.002
    );
  }

  public setVehicle(v: VehicleConcept, preserveCamera = false, keepCustomization = false) {
    const prevRotationY = preserveCamera && this.currentBuilt ? this.currentBuilt.group.rotation.y : 0;

    if (this.currentBuilt) {
      this.scene.remove(this.currentBuilt.group);
      this.currentBuilt.dispose();
      this.currentBuilt = null;
    }

    if (!keepCustomization) {
      this.customLivery = undefined;
      this.customWheelStyle = undefined;
      this.customPaintHex = undefined;
      this.customPaintFinish = undefined;
      this.customStripeHex = undefined;
    }

    this.currentVehicle = v;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const built = buildCraftedVehicle(v, maxAniso, {
      liveryOverride: this.customLivery,
      wheelStyleOverride: this.customWheelStyle,
      stripeColorOverride: this.customStripeHex,
    });
    built.group.rotation.y = prevRotationY;
    this.currentBuilt = built;
    this.rotorSpeedFactor = this.animateSystems ? 0.35 : 0;
    this.engineSpeedFactor = this.animateSystems ? 0.35 : 0;
    this.scene.add(built.group);

    if (this.customPaintHex || this.customPaintFinish) {
      this.applyCustomPaintToBuilt(
        this.customPaintHex ?? v.palette.primary,
        this.customPaintFinish ?? v.palette.finish,
        this.customStripeHex,
      );
    }

    // Resize contact shadow, turntable scale, and tight shadow frustum for each vehicle
    const span = Math.max(v.dimensions.length, v.dimensions.width);
    this.contactShadow.scale.set((v.dimensions.width * 1.42) / 6, (v.dimensions.length * 1.32) / 9, 1);
    this.contactShadow.rotation.y = built.group.rotation.y;
    this.contactShadow.updateMatrix();
    const shadowHalf = Math.max(3.6, span * 0.95);
    this.keyLight.shadow.camera.left = -shadowHalf;
    this.keyLight.shadow.camera.right = shadowHalf;
    this.keyLight.shadow.camera.top = shadowHalf;
    this.keyLight.shadow.camera.bottom = -shadowHalf;
    this.keyLight.shadow.camera.far = Math.max(36, span * 3.5);
    this.keyLight.shadow.camera.updateProjectionMatrix();
    const floorScale = Math.max(1, span / 11);
    this.turntable.scale.set(floorScale, 1, floorScale);
    this.controls.maxDistance = Math.max(32, span * 2.8);

    // Apply current toggles
    this.applyLightsState();
    this.applyWireframeState();
    this.applyExplodePositions(this.explodeCurrent);
    this.applyOpenables(this.doorsCurrent);

    this.callbacks.onPartsCount?.(built.partsCount);
    this.callbacks.onOpenablesCount?.(built.animatedParts.openables.length);
    this.computeCabinLightLocalPos();
    this.updateCabinLightTransform();

    if (!preserveCamera) {
      this.setCameraPreset('hero', true);
    } else if (!this.needsContinuousLoop()) {
      this.requestRender();
    }
  }

  private computeCabinLightLocalPos() {
    const v = this.currentVehicle;
    if (!v) return;
    const arch = v.geometry.archetype;
    const isAir = arch === 'helicopter' || arch === 'airplane' || arch === 'jet';
    const isHeavy =
      arch === 'semi_truck' ||
      arch === 'dump_truck' ||
      arch === 'mixer_truck' ||
      arch === 'firetruck' ||
      arch === 'tow_truck' ||
      arch === 'bus';
    const cabY = isAir
      ? v.dimensions.height * 0.56
      : isHeavy
        ? v.dimensions.height * 0.72
        : v.dimensions.height * 0.78;
    const cabZ = isAir
      ? v.dimensions.length * 0.12
      : arch === 'semi_truck' || arch === 'dump_truck' || arch === 'mixer_truck'
        ? v.dimensions.length * 0.22
        : -v.dimensions.length * 0.08;
    this.cabinLightLocalPos.set(0, cabY, cabZ);
    this.cabinLight.distance = Math.max(3.6, Math.max(v.dimensions.length, v.dimensions.width) * 1.1);
  }

  private updateCabinLightTransform() {
    if (!this.currentVehicle || !this.currentBuilt) return;
    _cabinLightLocal.copy(this.cabinLightLocalPos).applyQuaternion(this.currentBuilt.group.quaternion);
    this.cabinLight.position.copy(_cabinLightLocal);
    const inInterior = this.currentPreset === 'interior';
    this.cabinLight.intensity = inInterior
      ? (this.lightsOn ? 3.2 : 2.1)
      : (this.lightsOn ? 1.55 : 0.95);
  }

  public updateCustomization(opts: {
    livery?: PaintLivery;
    wheelStyle?: WheelStyle;
    stripeColor?: string;
  }) {
    if (!this.currentVehicle) return;
    if ('livery' in opts) this.customLivery = opts.livery;
    if ('wheelStyle' in opts) this.customWheelStyle = opts.wheelStyle;
    if ('stripeColor' in opts) this.customStripeHex = opts.stripeColor;
    this.setVehicle(this.currentVehicle, true, true);
  }

  private applyCustomPaintToBuilt(
    primaryHex: string,
    finish?: VehicleConcept['palette']['finish'],
    stripeHex?: string,
  ) {
    if (!this.currentBuilt) return;
    const mat = this.currentBuilt.materials.body;
    mat.color.set(primaryHex);
    if (finish) {
      const isMatte = finish === 'matte';
      const isMetallic = finish === 'metallic' || finish === 'pearl';
      mat.metalness = isMatte ? 0.22 : isMetallic ? 0.65 : 0.38;
      mat.roughness = isMatte ? 0.39 : finish === 'pearl' ? 0.25 : isMetallic ? 0.27 : 0.30;
      mat.envMapIntensity = 0.95;
      mat.needsUpdate = true;
    }
    if (stripeHex) {
      this.currentBuilt.materials.liveryStripe.color.set(stripeHex);
    }
  }

  public updateCustomPaint(
    primaryHex: string,
    finish?: VehicleConcept['palette']['finish'],
    stripeHex?: string,
  ) {
    this.customPaintHex = primaryHex;
    if (finish) this.customPaintFinish = finish;
    if (stripeHex) this.customStripeHex = stripeHex;
    this.applyCustomPaintToBuilt(primaryHex, finish, stripeHex);
    if (!this.needsContinuousLoop()) this.requestRender();
  }

  public setCameraPreset(preset: StudioCameraPreset, immediate = false) {
    const wasInterior = this.currentPreset === 'interior';
    this.currentPreset = preset;
    const v = this.currentVehicle;
    const len = v ? v.dimensions.length : 4.5;
    const wid = v ? v.dimensions.width : 1.9;
    const hgt = v ? v.dimensions.height : 1.6;
    const widFactor = wid > 4.5 ? 1.08 : 1.6;
    const minRadius = len < 2.2 ? 2.15 : 3.6;
    const radius = Math.max(len * 0.92, wid * widFactor, hgt * 1.8, minRadius);
    const lookY = hgt * 0.45;
    const snapNow = immediate || wasInterior || preset === 'interior';

    if (preset === 'interior') {
      if (this.autoRotate) {
        this.autoRotate = false;
        this.callbacks.onAutoRotateChange?.(false);
      }
      this.camera.near = 0.035;
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
      this.controls.minDistance = 0.10;
      this.controls.maxDistance = Math.max(1.35, len * 0.42);
      this.controls.maxPolarAngle = Math.PI * 0.78;

      if (this.currentBuilt) {
        this.currentBuilt.group.updateMatrixWorld(true);
      }

      if (this.currentBuilt && this.currentBuilt.animatedParts.steeringWheels.length > 0) {
        this.currentBuilt.animatedParts.steeringWheels[0].getWorldPosition(_interiorSteerLocal);
        this.currentBuilt.group.worldToLocal(_interiorSteerLocal);
        // Position camera in open center-left aisle between front headrests, looking forward over wheel & dash
        _interiorEyeLocal.set(
          _interiorSteerLocal.x * 0.16,
          _interiorSteerLocal.y + 0.17,
          _interiorSteerLocal.z - 0.44,
        );
        _interiorLookLocal.set(
          _interiorSteerLocal.x * 0.42,
          _interiorSteerLocal.y - 0.04,
          _interiorSteerLocal.z + 0.08,
        );
        _interiorEyeLocal.applyMatrix4(this.currentBuilt.group.matrixWorld);
        _interiorLookLocal.applyMatrix4(this.currentBuilt.group.matrixWorld);
        this.camTargetPos.copy(_interiorEyeLocal);
        this.camTargetLook.copy(_interiorLookLocal);
      } else {
        const arch = v?.geometry.archetype ?? '';
        const isAir = arch === 'helicopter' || arch === 'airplane' || arch === 'jet';
        const eyeY = isAir ? hgt * 0.56 : hgt * 0.80;
        const eyeZ = isAir ? len * 0.14 : -len * 0.14;
        _interiorEyeLocal.set(0, eyeY, eyeZ);
        _interiorLookLocal.set(0, eyeY - 0.16, eyeZ + Math.max(0.60, len * 0.22));
        if (this.currentBuilt) {
          _interiorEyeLocal.applyMatrix4(this.currentBuilt.group.matrixWorld);
          _interiorLookLocal.applyMatrix4(this.currentBuilt.group.matrixWorld);
        }
        this.camTargetPos.copy(_interiorEyeLocal);
        this.camTargetLook.copy(_interiorLookLocal);
      }
    } else {
      this.camera.near = 0.1;
      this.camera.fov = 42;
      this.camera.updateProjectionMatrix();
      this.controls.minDistance = 0.65;
      this.controls.maxDistance = Math.max(32, Math.max(len, wid) * 2.8);
      this.controls.maxPolarAngle = Math.PI * 0.485;
      this.camTargetLook.set(0, lookY, 0);

      switch (preset) {
        case 'hero':
          this.camTargetPos.set(radius * 0.96, lookY + radius * 0.42, radius * 1.05);
          break;
        case 'side':
          this.camTargetPos.set(radius * 1.42, lookY + 0.35, 0.01);
          break;
        case 'front':
          this.camTargetPos.set(0.01, lookY + 0.35, radius * 1.35);
          break;
        case 'rear':
          this.camTargetPos.set(0.01, lookY + 0.45, -radius * 1.35);
          break;
        case 'top':
          this.camTargetPos.set(0.01, radius * 1.65, 0.4);
          break;
      }
    }

    this.updateCabinLightTransform();

    if (snapNow) {
      this.camera.position.copy(this.camTargetPos);
      this.controls.target.copy(this.camTargetLook);
      this.controls.update();
      this.camTransitioning = false;
      this.requestRender();
    } else {
      this.camTransitioning = true;
      this.ensureLoopRunning();
    }
  }

  public setExplode(amount: number) {
    this.explodeTarget = THREE.MathUtils.clamp(amount, 0, 1);
    this.ensureLoopRunning();
  }

  public setDoorsOpen(open: boolean) {
    this.doorsTarget = open ? 1 : 0;
    this.ensureLoopRunning();
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
    if (enabled) this.ensureLoopRunning();
  }

  public setAnimateSystems(enabled: boolean) {
    this.animateSystems = enabled;
    if (enabled) this.ensureLoopRunning();
  }

  public setLightsOn(enabled: boolean) {
    this.lightsOn = enabled;
    this.applyLightsState();
    this.updateCabinLightTransform();
    if (!this.needsContinuousLoop()) this.requestRender();
  }

  public setWireframe(enabled: boolean) {
    this.wireframeMode = enabled;
    this.applyWireframeState();
    if (!this.needsContinuousLoop()) this.requestRender();
  }

  private applyLightsState() {
    if (!this.currentBuilt) return;
    const m = this.currentBuilt.materials;
    m.headlight.emissiveIntensity = this.lightsOn ? 2.25 : 0.05;
    m.drlLed.emissiveIntensity = this.lightsOn ? 2.55 : 0.06;
    m.taillight.emissiveIntensity = this.lightsOn ? 1.95 : 0.05;
    m.signalLeft.emissiveIntensity = this.lightsOn ? 0.12 : 0.04;
    m.signalRight.emissiveIntensity = this.lightsOn ? 0.12 : 0.04;
    m.sirenRed.emissiveIntensity = this.lightsOn ? 2.3 : 0.05;
    m.sirenBlue.emissiveIntensity = this.lightsOn ? 2.3 : 0.05;
    m.sirenAmber.emissiveIntensity = this.lightsOn ? 1.95 : 0.05;
    for (let i = 0; i < this.currentBuilt.animatedParts.headlightBeams.length; i++) {
      this.currentBuilt.animatedParts.headlightBeams[i].visible = this.lightsOn;
    }
  }

  private applyWireframeState() {
    if (!this.currentBuilt) return;
    this.currentBuilt.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if ('wireframe' in mat) {
            (mat as THREE.MeshStandardMaterial).wireframe = this.wireframeMode;
          }
        });
      }
    });
  }

  private applyExplodePositions(factor: number) {
    if (!this.currentBuilt) return;
    this.currentBuilt.group.traverse((obj) => {
      if (obj.userData.basePos && obj.userData.explodeOffset) {
        _vec3A.copy(obj.userData.basePos);
        _vec3B.copy(obj.userData.explodeOffset).multiplyScalar(factor);
        obj.position.copy(_vec3A).add(_vec3B);
      }
    });
    if (this.doorsCurrent > 0.001) {
      this.applyOpenables(this.doorsCurrent);
    }
  }

  private applyOpenables(factor: number) {
    if (!this.currentBuilt) return;
    const explodeFactor = this.explodeCurrent;
    for (const op of this.currentBuilt.animatedParts.openables) {
      op.pivot.rotation.set(
        op.baseRot.x + op.openRotX * factor,
        op.baseRot.y + op.openRotY * factor,
        op.baseRot.z + op.openRotZ * factor,
      );
      op.pivot.position.copy(op.basePos);
      if (op.pivot.userData.explodeOffset && explodeFactor > 0.001) {
        _vec3B.copy(op.pivot.userData.explodeOffset).multiplyScalar(explodeFactor);
        op.pivot.position.add(_vec3B);
      }
      if (op.openOffset) {
        _vec3A.copy(op.openOffset).multiplyScalar(factor);
        op.pivot.position.add(_vec3A);
      }
    }
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (!this.needsContinuousLoop()) this.requestRender();
  };

  private renderScene() {
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.currentBuilt || !this.callbacks.onHoverPart) return;
    const now = performance.now();
    if (now - this.lastRaycastMs < 60) return;
    this.lastRaycastMs = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.currentBuilt.group.children, true);
    if (hits.length > 0) {
      let curr: THREE.Object3D | null = hits[0].object;
      let label: string | null = null;
      while (curr) {
        if (curr.userData.partLabel) {
          label = curr.userData.partLabel;
          break;
        }
        curr = curr.parent;
      }
      this.callbacks.onHoverPart(label);
    } else {
      this.callbacks.onHoverPart(null);
    }
  };

  private handlePointerLeave = () => {
    this.callbacks.onHoverPart?.(null);
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

  private ensureLoopRunning() {
    if (!this.frameId && !this.disposed) {
      this.clock.getDelta();
      this.tick();
    }
  }

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
      this.renderScene();
      const done = () => {
        this.renderBusy = false;
        if (this.renderDirty && !this.disposed) this.requestRender();
      };
      if (isSoftwareGl) this.afterDraw(done);
      else done();
    });
  }

  private startLoop() {
    this.clock.getDelta();
    this.tick();
  }

  private tick = () => {
    if (this.disposed) return;
    this.frameId = 0;

    const dt = Math.min(this.clock.getDelta(), 0.08);
    this.elapsed += dt;

    if (this.camTransitioning) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camTargetPos.x, 7, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camTargetPos.y, 7, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camTargetPos.z, 7, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.camTargetLook.x, 8, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.camTargetLook.y, 8, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.camTargetLook.z, 8, dt);
      if (this.camera.position.distanceTo(this.camTargetPos) < 0.03) {
        this.camTransitioning = false;
      }
    }

    if (Math.abs(this.explodeCurrent - this.explodeTarget) > 0.001) {
      this.explodeCurrent = THREE.MathUtils.damp(this.explodeCurrent, this.explodeTarget, 9, dt);
      this.applyExplodePositions(this.explodeCurrent);
    }

    if (Math.abs(this.doorsCurrent - this.doorsTarget) > 0.001) {
      this.doorsCurrent = THREE.MathUtils.damp(this.doorsCurrent, this.doorsTarget, 7.5, dt);
      this.applyOpenables(this.doorsCurrent);
    }

    if (this.currentBuilt) {
      if (this.autoRotate) {
        this.currentBuilt.group.rotation.y += dt * 0.34;
        this.turntable.rotation.y += dt * 0.34;
        this.contactShadow.rotation.y = this.currentBuilt.group.rotation.y;
        this.contactShadow.updateMatrix();
        this.updateCabinLightTransform();
      }

      const targetSpeed = this.animateSystems ? 1 : 0;
      this.rotorSpeedFactor = THREE.MathUtils.damp(this.rotorSpeedFactor, targetSpeed, 3.8, dt);
      this.engineSpeedFactor = THREE.MathUtils.damp(this.engineSpeedFactor, targetSpeed, 4.2, dt);

      const anim = this.currentBuilt.animatedParts;
      const tau = Math.PI * 2;

      if (this.rotorSpeedFactor > 0.002 && anim.rotors.length > 0) {
        anim.rotors.forEach((r, idx) => {
          const axis = r.userData.rotorAxis ?? (idx === 0 ? 'y' : 'x');
          if (axis === 'y') {
            r.rotation.y = (r.rotation.y + dt * 14.5 * this.rotorSpeedFactor) % tau;
          } else {
            r.rotation.x = (r.rotation.x + dt * 20 * this.rotorSpeedFactor) % tau;
          }
        });
      }

      if (this.engineSpeedFactor > 0.002 && anim.propellers.length > 0) {
        anim.propellers.forEach((p) => {
          const spinSpeed = (p.userData.spinSpeed as number | undefined) ?? 15;
          p.rotation.z = (p.rotation.z + dt * spinSpeed * this.engineSpeedFactor) % tau;
        });
      }

      if (anim.afterburners.length > 0) {
        const showFlame = this.engineSpeedFactor > 0.02;
        anim.afterburners.forEach((ab, idx) => {
          ab.visible = showFlame;
          if (!showFlame) return;
          const flicker =
            0.88 +
            0.12 * Math.sin(this.elapsed * 38 + idx * 1.9) +
            0.07 * Math.cos(this.elapsed * 63 + idx * 2.7);
          const xyScale = (0.88 + 0.14 * flicker) * (0.45 + 0.55 * this.engineSpeedFactor);
          const zScale = (0.78 + 0.32 * flicker) * this.engineSpeedFactor;
          ab.scale.set(xyScale, xyScale, zScale);
          ab.rotation.z = (ab.rotation.z + dt * 10) % tau;
        });
      }

      if (this.engineSpeedFactor > 0.002 && anim.cranks.length > 0) {
        anim.cranks.forEach((c) => {
          c.rotation.x = (c.rotation.x + dt * 4.2 * this.engineSpeedFactor) % tau;
        });
        const crankAngle = anim.cranks[0]?.rotation.x ?? 0;
        anim.pedals.forEach((p) => {
          p.rotation.x = -crankAngle;
        });
      }

      if (anim.steeringPivots.length > 0 || anim.steeringWheels.length > 0) {
        const steerAngle = Math.sin(this.elapsed * 1.35) * 0.34 * this.engineSpeedFactor;
        anim.steeringPivots.forEach((sp) => {
          sp.rotation.y = steerAngle;
        });
        anim.steeringWheels.forEach((sw) => {
          sw.rotation.z = -steerAngle * 3.0;
        });
      }

      if (this.animateSystems) {
        const wheelSpeed = anim.cranks.length > 0 ? 4.4 : 2.8;
        anim.wheels.forEach((w) => {
          w.rotation.x = (w.rotation.x + dt * wheelSpeed) % tau;
        });
        if (anim.mixerDrum) {
          anim.mixerDrum.rotation.z += dt * 1.4;
        }
        anim.sweeperBrushes.forEach((b, i) => {
          b.rotation.y += dt * (i === 0 ? 5.5 : -5.5);
        });

        // Turn signals, emergency police/fire/ambulance strobes & amber beacons
        if (this.lightsOn) {
          const pulse = Math.sin(this.elapsed * 14);
          this.currentBuilt.materials.sirenRed.emissiveIntensity = pulse > 0 ? 3.2 : 0.22;
          this.currentBuilt.materials.sirenBlue.emissiveIntensity = pulse <= 0 ? 3.2 : 0.22;
          this.currentBuilt.materials.sirenAmber.emissiveIntensity =
            0.22 + Math.pow(Math.max(0, Math.sin(this.elapsed * 8)), 2) * 2.8;

          const blinkCycle = this.elapsed % 4.0;
          const flash = Math.sin(this.elapsed * 9) > 0 ? 2.85 : 0.10;
          this.currentBuilt.materials.signalLeft.emissiveIntensity = blinkCycle < 2.0 ? flash : 0.10;
          this.currentBuilt.materials.signalRight.emissiveIntensity = blinkCycle >= 2.0 ? flash : 0.10;
        }
      }
    }

    this.controls.update();
    this.renderScene();

    if (this.needsContinuousLoop()) {
      if (isSoftwareGl) this.afterDraw(this.tick);
      else this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public captureDataUrl(): string {
    this.renderScene();
    return this.renderer.domElement.toDataURL('image/png');
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    if (this.currentBuilt) {
      this.currentBuilt.dispose();
      this.currentBuilt = null;
    }
    this.bloomPass?.dispose();
    this.vignettePass?.dispose();
    this.outputPass?.dispose();
    this.composer?.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// =========================================================================
// Shared Offscreen Thumbnail & 4-Angle Concept Sheet Generator (1 WebGL Context)
// =========================================================================
class OffscreenThumbnailRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private contactShadow: THREE.Mesh | null = null;
  private cache = new Map<number, string>();

  private ensureInit() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(420, 270);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131318);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x18181b, 0.58);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff4e4, 1.38);
    key.position.set(7, 10, 8);
    key.castShadow = !isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 36;
    key.shadow.radius = 4.5;
    key.shadow.blurSamples = 14;
    key.shadow.intensity = 0.56;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.015;
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.DirectionalLight(0xcbd5e1, 0.32);
    fill.position.set(-6, 4, 6);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.72);
    rim.position.set(-7, 5, -8);
    this.scene.add(rim);

    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.36 }),
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.y = 0.002;
    shadowCatcher.receiveShadow = true;
    this.scene.add(shadowCatcher);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 9),
      new THREE.MeshBasicMaterial({
        map: getContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.40,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.006;
    this.scene.add(shadow);
    this.contactShadow = shadow;

    this.camera = new THREE.PerspectiveCamera(38, 420 / 270, 0.1, 100);
  }

  private fitShadowForVehicle(v: VehicleConcept) {
    if (this.contactShadow) {
      this.contactShadow.scale.set((v.dimensions.width * 1.42) / 6, (v.dimensions.length * 1.32) / 9, 1);
    }
    if (this.keyLight) {
      const span = Math.max(v.dimensions.length, v.dimensions.width);
      const half = Math.max(3.6, span * 0.95);
      this.keyLight.shadow.camera.left = -half;
      this.keyLight.shadow.camera.right = half;
      this.keyLight.shadow.camera.top = half;
      this.keyLight.shadow.camera.bottom = -half;
      this.keyLight.shadow.camera.far = Math.max(36, span * 3.5);
      this.keyLight.shadow.camera.updateProjectionMatrix();
    }
  }

  public getCached(id: number): string | undefined {
    return this.cache.get(id);
  }

  public renderThumbnail(v: VehicleConcept): string {
    const existing = this.cache.get(v.id);
    if (existing) return existing;

    this.ensureInit();
    const renderer = this.renderer!;
    const scene = this.scene!;
    const camera = this.camera!;

    const built = buildCraftedVehicle(v, 2);
    scene.add(built.group);
    this.fitShadowForVehicle(v);

    const widFactor = v.dimensions.width > 4.5 ? 1.06 : 1.55;
    const minSpan = v.dimensions.length < 2.2 ? 2.05 : 3.4;
    const span = Math.max(v.dimensions.length * 0.92, v.dimensions.width * widFactor, v.dimensions.height * 1.75, minSpan);
    const lookY = v.dimensions.height * 0.45;
    camera.position.set(span * 0.96, lookY + span * 0.42, span * 1.04);
    camera.lookAt(0, lookY, 0);

    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');

    scene.remove(built.group);
    built.dispose();
    this.cache.set(v.id, url);
    return url;
  }

  public renderFourAngleSheet(v: VehicleConcept): {
    hero: string;
    side: string;
    front: string;
    top: string;
  } {
    this.ensureInit();
    const renderer = this.renderer!;
    const scene = this.scene!;
    const camera = this.camera!;

    const built = buildCraftedVehicle(v, 4);
    scene.add(built.group);
    this.fitShadowForVehicle(v);

    const widFactor = v.dimensions.width > 4.5 ? 1.08 : 1.6;
    const minSpan = v.dimensions.length < 2.2 ? 2.05 : 3.4;
    const span = Math.max(v.dimensions.length * 0.94, v.dimensions.width * widFactor, v.dimensions.height * 1.8, minSpan);
    const lookY = v.dimensions.height * 0.45;

    const snap = (x: number, y: number, z: number) => {
      camera.position.set(x, y, z);
      camera.lookAt(0, lookY, 0);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };

    const hero = snap(span * 0.96, lookY + span * 0.42, span * 1.04);
    const side = snap(span * 1.38, lookY + 0.25, 0.01);
    const front = snap(0.01, lookY + 0.25, span * 1.32);
    const top = snap(0.01, span * 1.58, 0.25);

    scene.remove(built.group);
    built.dispose();
    return { hero, side, front, top };
  }
}

export const thumbnailRenderer = new OffscreenThumbnailRenderer();
