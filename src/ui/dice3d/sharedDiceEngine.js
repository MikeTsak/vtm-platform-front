// src/ui/dice3d/sharedDiceEngine.js
import * as THREE from 'three';
import { createD10Geometry, getRotationForFace } from './d10Geometry';
// three.js-free helpers live in diceUi.js; re-exported so existing imports keep working.
import { getD10Image, webglSupported } from './diceUi';
export { D10_ASSETS, getD10Image, getD10Title, getBatterySaverMode, setBatterySaverMode, is2DPreferred } from './diceUi';

// Safely patch WebGL context to prevent precision null crash in Three.js
function patchContextPrecision(gl) {
  if (!gl || !gl.getShaderPrecisionFormat) return gl;
  const original = gl.getShaderPrecisionFormat.bind(gl);
  gl.getShaderPrecisionFormat = function (st, pt) {
    try {
      const res = original(st, pt);
      if (res && typeof res.precision === 'number') return res;
    } catch (e) {}
    return { precision: 23, rangeMin: 127, rangeMax: 127 };
  };
  return gl;
}

class SharedDiceEngine {
  constructor() {
    this.initialized = false;
    this.supported = null;
    this.offscreenCanvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.dirLight = null;
    this.rimLight = null;
    this.mesh = null;
    this.edges = null;
    this.faceNormals = [];
    this.textureCache = new Map();
    this.textureLoader = null;
    this.materialRegular = null;
    this.materialHunger = null;
  }

  isSupported() {
    if (this.supported === null) this.supported = webglSupported();
    return this.supported;
  }

  init() {
    if (this.initialized) return this.supported;
    this.initialized = true;

    if (!this.isSupported()) {
      this.supported = false;
      return false;
    }

    try {
      const width = 160;
      const height = 176;
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;

      let gl = this.offscreenCanvas.getContext('webgl2', { alpha: true, antialias: true })
            || this.offscreenCanvas.getContext('webgl', { alpha: true, antialias: true });
      if (!gl) {
        this.supported = false;
        return false;
      }
      patchContextPrecision(gl);

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.offscreenCanvas,
        context: gl,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setClearColor(0x000000, 0);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
      this.camera.position.set(0, 0, 4.3);

      const ambient = new THREE.AmbientLight(0xffffff, 1.8);
      this.scene.add(ambient);

      this.dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
      this.dirLight.position.set(3, 4, 5);
      this.scene.add(this.dirLight);

      this.rimLight = new THREE.DirectionalLight(0xaa2222, 1.4);
      this.rimLight.position.set(-3, -2, 2);
      this.scene.add(this.rimLight);

      const { geometry, edgesGeom, faceNormals } = createD10Geometry(1.0);
      this.faceNormals = faceNormals;

      this.textureLoader = new THREE.TextureLoader();

      this.materialRegular = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.28,
        metalness: 0.18,
      });

      this.materialHunger = new THREE.MeshStandardMaterial({
        color: 0x99111b,
        roughness: 0.28,
        metalness: 0.18,
      });

      this.mesh = new THREE.Mesh(geometry, this.materialRegular);
      this.scene.add(this.mesh);

      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x3f3f46,
        transparent: true,
        opacity: 0.7,
      });
      this.edges = new THREE.LineSegments(edgesGeom, edgeMaterial);
      this.mesh.add(this.edges);

      this.supported = true;
      return true;
    } catch (err) {
      console.warn('Three.js dice engine init fallback:', err);
      this.supported = false;
      return false;
    }
  }

  loadTexture(url) {
    if (this.textureCache.has(url)) return this.textureCache.get(url);
    if (!this.textureLoader) return null;
    const tex = this.textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.textureCache.set(url, tex);
    return tex;
  }

  getTargetRotation() {
    if (this.faceNormals && this.faceNormals.length > 0) {
      return getRotationForFace(this.faceNormals[0]);
    }
    return new THREE.Quaternion();
  }

  renderDieToContext(ctx2d, targetWidth, targetHeight, {
    value = 1,
    isHunger = false,
    quaternion,
    scaleX = 1,
    scaleY = 1,
    scaleZ = 1,
    posY = 0,
  }) {
    if (!this.supported || !this.renderer || !this.mesh) return;

    try {
      const imgUrl = getD10Image(value, isHunger);
      const texture = this.loadTexture(imgUrl);

      const activeMat = isHunger ? this.materialHunger : this.materialRegular;
      if (this.mesh.material !== activeMat) {
        this.mesh.material = activeMat;
      }
      if (activeMat.map !== texture) {
        activeMat.map = texture;
        activeMat.needsUpdate = true;
      }

      this.rimLight.color.setHex(isHunger ? 0xff2222 : 0xaa2222);

      if (quaternion) {
        this.mesh.quaternion.copy(quaternion);
      }
      this.mesh.position.y = posY;
      this.mesh.scale.set(scaleX, scaleY, scaleZ);

      this.renderer.render(this.scene, this.camera);

      ctx2d.clearRect(0, 0, targetWidth, targetHeight);
      ctx2d.drawImage(
        this.offscreenCanvas,
        0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height,
        0, 0, targetWidth, targetHeight
      );
    } catch (err) {
      // Non-fatal render error fallback
    }
  }
}

export const sharedDiceEngine = new SharedDiceEngine();
