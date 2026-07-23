import * as THREE from 'three';
import { ROOM_SKINS } from '../content/room-skins.js';
import { buildPortal, buildRoomLayer } from './scene-factory.js';
import { enemyMesh, lootMesh, playerMesh, projectileMesh, pulseMesh } from './entity-factory.js';

const UP = new THREE.Vector3(0, 1, 0);

export class WorldRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080d);
    this.scene.fog = new THREE.FogExp2(0x071018, 0.0145);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
    this.camera.position.set(0, 34, 30);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(UP, 0);
    this.pointerWorld = new THREE.Vector3();
    this.cameraTarget = new THREE.Vector3();

    this.world = new THREE.Group();
    this.interlaceWorld = new THREE.Group();
    this.entityLayer = new THREE.Group();
    this.effectLayer = new THREE.Group();
    this.scene.add(this.world, this.interlaceWorld, this.entityLayer, this.effectLayer);
    this.interlaceWorld.visible = false;
    this.playerMesh = null;
    this.portalMesh = null;

    this.installLights();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  installLights() {
    this.scene.add(new THREE.HemisphereLight(0x9eb8c8, 0x110d0a, 1.35));
    const key = new THREE.DirectionalLight(0xffe3b8, 2.4);
    key.position.set(18, 34, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -80;
    key.shadow.camera.right = 80;
    key.shadow.camera.top = 80;
    key.shadow.camera.bottom = -80;
    this.scene.add(key);
    const cool = new THREE.DirectionalLight(0x5d8fd8, 1.1);
    cool.position.set(-26, 18, -20);
    this.scene.add(cool);
  }

  resize() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  resetEntities() {
    this.entityLayer.clear();
    this.effectLayer.clear();
    this.playerMesh = null;
  }

  buildMap(state) {
    this.world.clear();
    this.interlaceWorld.clear();
    this.interlaceWorld.visible = false;
    this.scene.fog.color.setHex(0x071018);
    buildRoomLayer(this.world, state.rooms, state.connections, ROOM_SKINS.travessia, false);
    buildRoomLayer(this.interlaceWorld, state.interlace.rooms, [], ROOM_SKINS.interlace, true);
    const entrance = state.rooms.find((room) => room.id === state.entranceRoomId);
    this.portalMesh = buildPortal(entrance, ROOM_SKINS.travessia);
    this.world.add(this.portalMesh);
  }

  createPlayer(color, position) {
    this.playerMesh = playerMesh(color, position);
    this.entityLayer.add(this.playerMesh);
    return this.playerMesh;
  }

  recolorPlayer(color) {
    if (!this.playerMesh) return;
    const body = this.playerMesh.children[0];
    body.material.color.setHex(color);
    body.material.emissive.setHex(color);
    this.playerMesh.children[1].material.color.setHex(color);
  }

  createEnemy(position, elite, interlaced) {
    const mesh = enemyMesh(position, elite, interlaced);
    this.entityLayer.add(mesh);
    return mesh;
  }

  createProjectile(position, color) {
    const mesh = projectileMesh(position, color);
    this.effectLayer.add(mesh);
    return mesh;
  }

  createLoot(position, color) {
    const mesh = lootMesh(position, color);
    this.entityLayer.add(mesh);
    return mesh;
  }

  createPulse(position, color, radius) {
    const mesh = pulseMesh(position, color, radius);
    this.effectLayer.add(mesh);
    return mesh;
  }

  removeObject(mesh) {
    mesh?.parent?.remove(mesh);
  }

  showInterlace() {
    this.interlaceWorld.visible = true;
    this.scene.fog.color.setHex(0x0d0817);
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.ray.intersectPlane(this.groundPlane, this.pointerWorld);
    return this.pointerWorld.clone();
  }

  update(delta, playerPosition, aimPosition) {
    if (this.portalMesh) {
      this.portalMesh.rotation.y += delta * 0.32;
      this.portalMesh.scale.setScalar(1 + Math.sin(performance.now() * 0.0024) * 0.05);
    }
    if (this.playerMesh && aimPosition) {
      this.playerMesh.rotation.y = Math.atan2(
        aimPosition.x - playerPosition.x,
        aimPosition.z - playerPosition.z,
      );
    }
    for (const effect of [...this.effectLayer.children]) {
      if (typeof effect.userData.life !== 'number') continue;
      effect.userData.life -= delta;
      const progress = 1 - effect.userData.life / effect.userData.maxLife;
      effect.scale.setScalar(0.5 + progress * 2.3);
      effect.material.opacity = Math.max(0, 0.8 * (1 - progress));
      if (effect.userData.life <= 0) this.effectLayer.remove(effect);
    }

    const desired = new THREE.Vector3(playerPosition.x, 31, playerPosition.z + 27);
    this.camera.position.lerp(desired, 1 - Math.exp(-delta * 4.2));
    this.cameraTarget.set(playerPosition.x, 0, playerPosition.z);
    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }
}
