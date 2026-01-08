<template>
  <div id="bottom-menu">
    <p @click="switchTo2D()">2D</p>
    <p @click="switchTo3D()">3D</p>
  </div>
</template>

<script setup>
const props = defineProps({
  projectData: {
    type: Object,
    required: true,
  },
});

import { onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { loadLayout } from '../services/layoutService'

const renderWidth = window.innerWidth, renderHeight = window.innerHeight * 15 / 16;
var propsMenu,selectedName,selectedCoords;
let menuResizing = false;
let menuResizeDir = null; 
let menuStartX = 0, menuStartY = 0, menuStartW = 0, menuStartH = 0;
const MENU_MIN_W = 160;
const MENU_MIN_H = 80;
const MENU_EDGE_PAD = 40; 

function init(){
  propsMenu = document.createElement('div');
  propsMenu.id = 'props-menu';
  propsMenu.style.touchAction = 'none';
  propsMenu.style.userSelect = 'none';
  selectedName = document.createElement('p');
  selectedCoords = document.createElement('p');
  selectedName.className = 'props-selected-name';
  selectedCoords.className = 'props-selected-coords';
  propsMenu.appendChild(selectedName);
  propsMenu.appendChild(selectedCoords);
  const rightHandle = document.createElement('div');
  rightHandle.className = 'props-resize-handle right-handle';
  const bottomHandle = document.createElement('div');
  bottomHandle.className = 'props-resize-handle bottom-handle';
  propsMenu.appendChild(rightHandle);
  propsMenu.appendChild(bottomHandle);
  const appEl = document.getElementById('app') || document.body;
  appEl.appendChild(propsMenu);
  rightHandle.addEventListener('pointerdown', (ev) => startMenuResize(ev, 'right'));
  bottomHandle.addEventListener('pointerdown', (ev) => startMenuResize(ev, 'bottom'));
}

init();

function startMenuResize(ev, dir) {
  ev.preventDefault();
  ev.stopPropagation();
  if (!propsMenu) return;

  menuResizing = true;
  menuResizeDir = dir;

  const rect = propsMenu.getBoundingClientRect();
  menuStartX = ev.clientX;
  menuStartY = ev.clientY;
  menuStartW = rect.width;
  menuStartH = rect.height;

  try { ev.target.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }

  window.addEventListener('pointermove', onMenuResizeMove, { passive: false });
  window.addEventListener('pointerup', onMenuResizeEnd, { passive: false });

  document.body.style.cursor = (dir === 'right') ? 'ew-resize' : 'ns-resize';
}

function onMenuResizeMove(ev) {
  if (!menuResizing || !propsMenu) return;
  ev.preventDefault();

  const dx = ev.clientX - menuStartX;
  const dy = ev.clientY - menuStartY;

  const maxW = Math.max(MENU_MIN_W, window.innerWidth - MENU_EDGE_PAD);
  const maxH = Math.max(MENU_MIN_H, window.innerHeight - MENU_EDGE_PAD);

  if (menuResizeDir === 'right') {
    let newW = Math.round(menuStartW + dx);
    newW = Math.max(MENU_MIN_W, Math.min(maxW, newW));
    propsMenu.style.width = newW + 'px';
  } else if (menuResizeDir === 'bottom') {
    let newH = Math.round(menuStartH + dy);
    newH = Math.max(MENU_MIN_H, Math.min(maxH, newH));
    propsMenu.style.height = newH + 'px';
  }
}

function onMenuResizeEnd(ev) {
  if (!menuResizing) return;
  try { ev.target.releasePointerCapture && ev.target.releasePointerCapture(ev.pointerId); } catch (_) {}
  menuResizing = false;
  menuResizeDir = null;
  window.removeEventListener('pointermove', onMenuResizeMove, { passive: false });
  window.removeEventListener('pointerup', onMenuResizeEnd, { passive: false });
  document.body.style.cursor = '';
}

function updateProps(name,coords){
  propsMenu.style.opacity=1;
  selectedName.innerHTML=name;
  selectedCoords.innerHTML=coords;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x70787A);

// --- Cameras: create both perspective and orthographic ---
const aspect = renderWidth / renderHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
perspectiveCamera.position.set(0, 50, 50);
perspectiveCamera.lookAt(0, 0, 0);

const frustumSize = 50; // scale of the ortho view
const orthoCamera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  10000
);
orthoCamera.position.set(0, 50, 0);
orthoCamera.lookAt(0, 0, 0);

// active camera starts as perspective
let activeCamera = perspectiveCamera;

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) { try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch (_) { } }
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.touchAction = 'none';


// --- Controls (will be recreated when switching cameras) ---
let controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// --- Lights ---
const light = new THREE.AmbientLight(0xFFFFFF, 1);
const light2 = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(light); scene.add(light2);
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(10, 10, 10);
scene.add(dir);

// --- Floor / plane + textures ---
const manager = new THREE.LoadingManager();
const planeSize = 40, maxHeight = 15;
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/src/assets/checker.png');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.magFilter = THREE.NearestFilter;
try { texture.colorSpace = THREE.SRGBColorSpace; } catch (e) { /* ignore */ }
texture.repeat.set(planeSize / 2, planeSize / 2);

const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
const planeMat = new THREE.MeshPhongMaterial({
  map: texture,
  side: THREE.DoubleSide,
});
const mesh = new THREE.Mesh(planeGeo, planeMat);
mesh.name = 'floor';
mesh.rotation.x = Math.PI * -0.5;
scene.add(mesh);

// --- GLTF loading ---
loadLayout(props.projectData.layoutData,manager,maxHeight,scene,perspectiveCamera,controls, planeSize);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);

const outlinePass3D = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, perspectiveCamera);
outlinePass3D.edgeThickness = 2.0;
outlinePass3D.edgeStrength = 3.0;
outlinePass3D.visibleEdgeColor.set(0xffffff);
composer.addPass(outlinePass3D);
let activeOutlinePass = outlinePass3D;

const outlinePass2D = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  orthoCamera
);
outlinePass2D.edgeThickness = 2.0;
outlinePass2D.edgeStrength = 3.0;
outlinePass2D.visibleEdgeColor.set(0xffffff);

const gammaPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaPass);

composer.setSize(renderWidth, renderHeight);

// --- Render loop ---
let fps = 0;
function animate() {
  fps++;
  if (fps & 1) return;
  if (controls) controls.update();
  composer.render();
}
renderer.setAnimationLoop(animate);

const raycaster = new THREE.Raycaster();
const selectedObjects = [];

function findRootForSelection(obj) {
  let o = obj;
  while (o.parent && o.parent !== scene && o.parent.type !== 'Scene') {
    o = o.parent;
  }
  return o;
}

function clearSelection() {
  selectedObjects.length = 0;
  activeOutlinePass.selectedObjects = selectedObjects;
  propsMenu.style.opacity=0;
} 

function onKeyDown(e) {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    clearSelection();
  }
}
window.addEventListener('keydown', onKeyDown);

// --- Dragging logic (uses activeCamera) ---
const DRAG_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const GRID_SNAP = { enabled: false, size: 0.1 };
let dragging = false;
let dragObject = null;
let dragOffset = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const intersectionPoint = new THREE.Vector3();
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();

function getWorldPosition(obj, target = new THREE.Vector3()) {
  obj.updateWorldMatrix(true, false);
  return obj.getWorldPosition(target);
}
dragPlane.normal.copy(DRAG_PLANE_NORMAL);

function setObjectWorldPosition(obj, worldPos) {
  if (!obj.parent) {
    obj.position.copy(worldPos);
  } else {
    obj.parent.updateMatrixWorld(true);
    obj.position.copy(obj.parent.worldToLocal(worldPos.clone()));
  }
}

function snapVec(v, size) {
  return new THREE.Vector3(
    Math.round(v.x / size) * size,
    Math.round(v.y / size) * size,
    Math.round(v.z / size) * size
  );
}

function firstIntersectableObjectFromPointer(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera({ x, y }, activeCamera);
  const intersects = raycaster.intersectObjects(scene.children, true)
    .filter(hit => {
      const o = hit.object;
      if (!o) return false;
      if (o.userData && o.userData.__isSilhouette) return false;
      if (typeof o.name === 'string' && o.name.endsWith('_silhouette')) return false;
      return o.isMesh;
    });
  return intersects.length ? intersects[0] : null;
}

function onPointerDownForDrag(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const hit = firstIntersectableObjectFromPointer(e.clientX, e.clientY);
  if (!hit)  {clearSelection(); return;}
  const rawPicked = hit.object;
  const root = findRootForSelection(rawPicked);
  if (root.name === 'floor' || rawPicked.name === 'floor') {clearSelection(); return;}
  dragging = true;
  dragObject = root;
  controls.enabled = false;
  const objWorldPos = getWorldPosition(dragObject, tempVec);
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL, objWorldPos);
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
  dragOffset.copy(objWorldPos).sub(intersectionPoint);
  if (selectedObjects.length == 0) {selectedObjects.push(dragObject);}
  else selectedObjects[0] = dragObject;
  const box = new THREE.Box3().setFromObject(dragObject);
  const size = new THREE.Vector3();
  box.getSize(size);
  updateProps(root.name,`width: ${size.x.toFixed(2)}, height: ${size.y.toFixed(2)}, depth: ${size.z.toFixed(2)}`);
  activeOutlinePass.selectedObjects = selectedObjects;
  e.preventDefault();
}

function onPointerMoveForDrag(e) {
  if (!dragging || !dragObject) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };
  raycaster.setFromCamera(ndc, activeCamera);
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

  const targetWorld = tempVec2.copy(intersectionPoint).add(dragOffset);
  const currentWorld = getWorldPosition(dragObject, tempVec);

  targetWorld.y = currentWorld.y;

  if (GRID_SNAP.enabled && GRID_SNAP.size > 0) {
    const snapped = snapVec(targetWorld, GRID_SNAP.size);
    targetWorld.copy(snapped);
    targetWorld.y = currentWorld.y;
  }

  const floorBox = new THREE.Box3().setFromObject(mesh);         
  const objBox = new THREE.Box3().setFromObject(dragObject);  

  const desiredDelta = new THREE.Vector3().subVectors(targetWorld, currentWorld);
  const minAllowedDeltaX = floorBox.min.x - objBox.min.x;
  const maxAllowedDeltaX = floorBox.max.x - objBox.max.x;
  const minAllowedDeltaZ = floorBox.min.z - objBox.min.z;
  const maxAllowedDeltaZ = floorBox.max.z - objBox.max.z;

  desiredDelta.x = Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, desiredDelta.x));
  desiredDelta.z = Math.max(minAllowedDeltaZ, Math.min(maxAllowedDeltaZ, desiredDelta.z));

  const adjustedTargetWorld = tempVec2.copy(currentWorld).add(desiredDelta);
  adjustedTargetWorld.y = targetWorld.y;

  setObjectWorldPosition(dragObject, adjustedTargetWorld);

  e.preventDefault();
}

function onPointerUpForDrag(e) {
  if (dragging) {
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { }
    controls.enabled = true;
    dragging = false;
    dragObject = null;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDownForDrag, { passive: false });
window.addEventListener('pointermove', onPointerMoveForDrag, { passive: false });
window.addEventListener('pointerup', onPointerUpForDrag, { passive: false });

function onWindowResize() {
  renderWidth = window.innerWidth; renderHeight = window.innerHeight * 15 / 16;
  const w = renderWidth;
  const h = renderHeight;
  perspectiveCamera.aspect = w / h;
  perspectiveCamera.updateProjectionMatrix();

  const aspectNow = w / h;
  orthoCamera.left = (-frustumSize * aspectNow) / 2;
  orthoCamera.right = (frustumSize * aspectNow) / 2;
  orthoCamera.top = frustumSize / 2;
  orthoCamera.bottom = -frustumSize / 2;
  orthoCamera.updateProjectionMatrix();

  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(w, h);
  composer.setSize(w, h);
  if (typeof outlinePass3D.setSize === 'function') outlinePass3D.setSize(w, h);
  if (typeof outlinePass2D.setSize === 'function') outlinePass2D.setSize(w, h);
}

onMounted(() => {
  const w = renderWidth, h = renderHeight;
  renderer.setSize(w, h);
  document.getElementById("app").appendChild(renderer.domElement);
  composer.setSize(w, h);
  if (typeof outlinePass3D.setSize === 'function') outlinePass3D.setSize(w, h);
  if (typeof outlinePass3D.setSize === 'function') outlinePass3D.setSize(w, h);
  window.addEventListener('resize', onWindowResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  // cleanup DOM
  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
  // dispose controls
  if (controls) controls.dispose();
});

let currMode = 3; 
function bindControllerToCamera(cam) {
  // dispose old controls
  if (controls) {
    try { controls.dispose(); } catch (_) { }
  }
  controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();
}
function switchTo2D() {
  if (currMode === 2) return;
  currMode = 2;
  dir.intensity = 0;
  activeCamera = orthoCamera;
  activeOutlinePass = outlinePass2D;
  bindControllerToCamera(activeCamera);
  renderPass.camera = activeCamera;
  composer.removePass(outlinePass3D);
  composer.addPass(outlinePass2D);
  controls.enableRotate = false;
  activeCamera.updateProjectionMatrix();
}

function switchTo3D() {
  if (currMode === 3) return;
  currMode = 3;
  dir.intensity = 1;
  activeCamera = perspectiveCamera;
  activeOutlinePass = outlinePass3D;
  bindControllerToCamera(activeCamera);
  renderPass.camera = activeCamera;
  composer.removePass(outlinePass2D);
  composer.addPass(outlinePass3D);
  controls.enableRotate = true;
  activeCamera.updateProjectionMatrix();
}
</script>

<style>
@import './EditProjectStyle.scss';
</style>
