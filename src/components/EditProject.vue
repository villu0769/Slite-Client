<template>
  <div id="edit-project-container">
    <!-- three.js canvas is appended to this container in onMounted -->
    <div id="bottom-menu">
      <p @click="switchTo2D">2D</p>
      <p @click="switchTo3D">3D</p>
    </div>

    <SelectionToolbar
      :visible="isToolbarVisible"
      :position="toolbarPosition"
      @duplicate="handleDuplicate"
      @rotate="handleToolbarRotate"
      @flip="handleFlip"
      @delete="handleDelete"
    />

    <PropsMenu
      :visible="propsPanelData.visible"
      :name="propsPanelData.name"
      :details="propsPanelData.details"
      :rotation="propsPanelData.rotation"
      @rotate-delta="handleRotateDelta"
      @update-rotation="handleUpdateRotation"
    />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, reactive, watch } from 'vue';
import * as THREE from 'three';
import { useRoute } from 'vue-router';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { getGLTFLoader } from '../services/gltfLoader';
import { loadLayout } from '../services/layoutService';
import { updateProjectLayout } from '../services/layoutService';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';

import SelectionToolbar from '../components/SelectionToolbar.vue';
import PropsMenu from './PropsMenu.vue';
import { useTheme } from '../composables/useTheme';

// ------------------ Props / route / initial state ------------------
const props = defineProps({ projectData: { type: Object, required: true } });
const route = useRoute();
const projectId = route.params.id;

const layoutData = ref(Array.isArray(props.projectData.layoutData) ? [...props.projectData.layoutData] : []);

const propsPanelData = reactive({ visible: false, name: '', details: '', rotation: 0 });

// Toolbar refs
const isToolbarVisible = ref(false);
const toolbarPosition = reactive({ x: 0, y: 0 });

// ------------------ Renderer / cameras / scene ------------------
let renderWidth = window.innerWidth;
let renderHeight = window.innerHeight - 56;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5bbcf);

const aspect = renderWidth / renderHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
perspectiveCamera.position.set(0, 50, 50);

const frustumSize = 25;
const orthoCamera = new THREE.OrthographicCamera(
  (-frustumSize * aspect) / 2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  -frustumSize / 2,
  0.1,
  10000
);
orthoCamera.position.set(0, 2, 0);

let activeCamera = perspectiveCamera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
else if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.touchAction = 'none';

// ------------------ Controls / lights / floor ------------------
let controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(10, 10, 10);
scene.add(ambientLight, dirLight);

const gridSize = 10;
const divisions = 15;
const grid = new THREE.GridHelper(gridSize, divisions, 0xa2a2a6, 0xaaaaaa);
grid.position.y = 0;
grid.name = 'floor';
scene.add(grid);

// Load initial layout into scene (keeps your existing loader)
const manager = new THREE.LoadingManager();
const planeSize = 40;
const maxHeight = 15;
loadLayout(layoutData.value, manager, maxHeight, scene, perspectiveCamera, controls, planeSize);

// ------------------ Composer + outline ------------------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);

const outlinePass3D = new OutlinePass(new THREE.Vector2(renderWidth, renderHeight), scene, perspectiveCamera);
outlinePass3D.edgeThickness = 2.0; outlinePass3D.edgeStrength = 3.0; outlinePass3D.visibleEdgeColor.set(0xffffff);

const outlinePass2D = new OutlinePass(new THREE.Vector2(renderWidth, renderHeight), scene, orthoCamera);
outlinePass2D.edgeThickness = 2.0; outlinePass2D.edgeStrength = 3.0; outlinePass2D.visibleEdgeColor.set(0xffffff);

let activeOutlinePass = outlinePass3D;
composer.addPass(activeOutlinePass);

const gammaPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaPass);
composer.setSize(renderWidth, renderHeight);

// utility to update outline sizes
function setOutlineSize(w, h) {
  if (typeof outlinePass3D.setSize === 'function') outlinePass3D.setSize(w, h);
  if (typeof outlinePass2D.setSize === 'function') outlinePass2D.setSize(w, h);
}

// ------------------ Selection / raycaster / helpers ------------------
const raycaster = new THREE.Raycaster();
const selectedObjects = [];

function findRootForSelection(obj) {
  let o = obj;
  while (o.parent && o.parent !== scene && o.parent.type !== 'Scene') o = o.parent;
  return o;
}

function getWorldPosition(obj, target = new THREE.Vector3()) {
  obj.updateWorldMatrix(true, false);
  return obj.getWorldPosition(target);
}

function setObjectWorldPosition(obj, worldPos) {
  if (!obj.parent) obj.position.copy(worldPos);
  else {
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

// ------------------ Drag existing objects ------------------
const DRAG_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const GRID_SNAP = { enabled: false, size: 0.1 };
let dragging = false;
let dragObject = null;
let dragOffset = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const intersectionPoint = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
dragPlane.normal.copy(DRAG_PLANE_NORMAL);

function onPointerDownForDrag(e) {
  if (e.button !== undefined && e.button !== 0) return;
  const hit = firstIntersectableObjectFromPointer(e.clientX, e.clientY);
  if (!hit) { clearSelection(); return; }
  const rawPicked = hit.object;
  const root = findRootForSelection(rawPicked);
  if (root.name === 'floor' || rawPicked.name === 'floor') { clearSelection(); return; }

  dragging = true;
  dragObject = root;
  controls.enabled = false;

  const objWorldPos = getWorldPosition(dragObject, tmpA);
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL, objWorldPos);

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  raycaster.ray.intersectPlane(dragPlane, intersectionPoint);
  dragOffset.copy(objWorldPos).sub(intersectionPoint);

  selectedObjects.length = 0;
  selectedObjects.push(dragObject);

  updateProps(dragObject);
  updateToolbarPosition();
  activeOutlinePass.selectedObjects = selectedObjects;
  
  e.preventDefault();
}
// Търси всички подове в сцената
function getAllFloors() {
  const floors = [];
  scene.traverse((child) => {
    // Проверяваме дали обектът е маркиран като под в userData (виж createRoom функцията)
    if (child.userData && child.userData.filename === 'custom_floor') {
      floors.push(child);
    }
  });
  return floors;
}

// Ограничава позицията спрямо намерения под
function constrainPositionToFloors(targetPos, object) {
  const floors = getAllFloors();
  if (floors.length === 0) return targetPos; // Няма стаи, движим свободно

  // 1. Пускаме лъч от високо надолу към позицията, където искаме да отидем
  const raycasterDown = new THREE.Raycaster();
  const rayOrigin = targetPos.clone();
  rayOrigin.y = 50; // Вдигаме високо
  raycasterDown.set(rayOrigin, new THREE.Vector3(0, -1, 0)); // Сочи надолу

  // 2. Проверяваме дали улучваме някой под
  const intersects = raycasterDown.intersectObjects(floors, false);

  if (intersects.length > 0) {
    const floorMesh = intersects[0].object;
    
    // 3. Взимаме границите на ТОЗИ конкретен под
    const floorBox = new THREE.Box3().setFromObject(floorMesh);
    const objBox = new THREE.Box3().setFromObject(object);

    // Изчисляваме размерите на обекта, за да не излиза половината навън
    const objWidth = objBox.max.x - objBox.min.x;
    const objDepth = objBox.max.z - objBox.min.z;

    const halfWidth = objWidth / 2;
    const halfDepth = objDepth / 2;

    // 4. Математика за ограничаване (Clamp)
    // Пода е min/max. Обектът трябва да е между (min + half) и (max - half)
    const minX = floorBox.min.x + halfWidth;
    const maxX = floorBox.max.x - halfWidth;
    const minZ = floorBox.min.z + halfDepth;
    const maxZ = floorBox.max.z - halfDepth;

    const clampedX = Math.max(minX, Math.min(maxX, targetPos.x));
    const clampedZ = Math.max(minZ, Math.min(maxZ, targetPos.z));

    return new THREE.Vector3(clampedX, targetPos.y, clampedZ);
  }

  // Ако сме във "въздуха" (извън стая), връщаме оригиналната позиция 
  // или може да върнете `object.position` ако искате да не може да излиза от стаята изобщо.
  return targetPos;
}

function onPointerMoveForDrag(e) {
  if (!dragging || !dragObject) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

  const targetWorld = tmpB.copy(intersectionPoint).add(dragOffset);
  const currentWorld = getWorldPosition(dragObject, tmpA);
  targetWorld.y = currentWorld.y;

  if (GRID_SNAP.enabled && GRID_SNAP.size > 0) {
    const snapped = snapVec(targetWorld, GRID_SNAP.size);
    targetWorld.copy(snapped);
    targetWorld.y = currentWorld.y;
  }

  const floorBox = new THREE.Box3().setFromObject(grid);
  const objBox = new THREE.Box3().setFromObject(dragObject);

  const desiredDelta = new THREE.Vector3().subVectors(targetWorld, currentWorld);
  const minAllowedDeltaX = floorBox.min.x - objBox.min.x;
  const maxAllowedDeltaX = floorBox.max.x - objBox.max.x;
  const minAllowedDeltaZ = floorBox.min.z - objBox.min.z;
  const maxAllowedDeltaZ = floorBox.max.z - objBox.max.z;

  desiredDelta.x = Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, desiredDelta.x));
  desiredDelta.z = Math.max(minAllowedDeltaZ, Math.min(maxAllowedDeltaZ, desiredDelta.z));

  const adjustedTargetWorld = tmpB.copy(currentWorld).add(desiredDelta);
  adjustedTargetWorld.y = targetWorld.y;

  const constrainedWorld = constrainPositionToFloors(targetWorld, dragObject);

  // Прилагаме ограничената позиция
  setObjectWorldPosition(dragObject, constrainedWorld);

  e.preventDefault();
}

function onPointerUpForDrag(e) {
  // Проверяваме дали наистина влачим нещо (dragging) И дали имаме обект (dragObject)
  if (dragging && dragObject) {
    
    // 1. ВАЖНО: Обновяваме данните в Vue (layoutData) с новата позиция от 3D сцената
    updateLayoutEntryFromObject(dragObject);

    // 2. ВАЖНО: Запазваме промените (към базата данни/сървъра)
    saveLayoutDebounced();

    // 3. Обновяваме менюто с координати (за да покаже новите X и Z числа)
    updateProps(dragObject);

    // 4. Местим тулбара над новата позиция на мебелта
    updateToolbarPosition();

    // --- Стандартно почистване ---
    try { 
      renderer.domElement.releasePointerCapture && renderer.domElement.releasePointerCapture(e.pointerId); 
    } catch (_) {}
    
    controls.enabled = true; // Пускаме камерата да се върти отново
    dragging = false;
    dragObject = null;
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDownForDrag, { passive: false });
window.addEventListener('pointermove', onPointerMoveForDrag, { passive: false });
window.addEventListener('pointerup', onPointerUpForDrag, { passive: false });

// ------------------ Drag-from-menu (async) ------------------

const gltfLoader = getGLTFLoader();

const gltfCache = new Map();

function loadGLTF(url) {
  if (gltfCache.has(url)) return gltfCache.get(url);
  const promise = new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
  gltfCache.set(url, promise);
  return promise;
}

function deepCloneScene(sceneObj) {
  return sceneObj.clone(true);
}

function makePreviewMaterials(node) {
  if (!node.isMesh || !node.material) return;
  if (Array.isArray(node.material)) {
    node.material = node.material.map(m => { const cm = m.clone(); cm.transparent = true; cm.opacity = 0.45; return cm; });
  } else { const cm = node.material.clone(); cm.transparent = true; cm.opacity = 0.45; node.material = cm; }
}

function makeFinalMaterials(node) {
  if (!node.isMesh || !node.material) return;
  if (Array.isArray(node.material)) node.material = node.material.map(m => { const cm = m.clone(); cm.transparent = false; cm.opacity = 1; return cm; });
  else { const cm = node.material.clone(); cm.transparent = false; cm.opacity = 1; node.material = cm; }
}

function groundObjectToFloor(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const minY = box.min.y || 0;
  obj.position.y -= minY;
}

let draggingFromMenu = false;
let previewObject = null;
let finalObject = null;
let draggedItem = null;
let finalizeRequested = false;
let finalizeDropPosition = null;

function cancelMenuDragIfAny() {
  if (!draggingFromMenu) return;
  draggingFromMenu = false; finalizeRequested = false; finalizeDropPosition = null; draggedItem = null;
  if (previewObject && previewObject.parent) previewObject.parent.remove(previewObject);
  previewObject = null; finalObject = null;
  controls && (controls.enabled = true);
  window.removeEventListener('pointermove', onMenuDragMove);
  window.removeEventListener('pointerup', onMenuDragEnd);
}

async function startDragFromMenu(item) {
  if (!item) return;
  cancelMenuDragIfAny();
  draggingFromMenu = true; draggedItem = item; finalizeRequested = false; finalizeDropPosition = null;
  if (controls) controls.enabled = false;
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL, new THREE.Vector3(0, 0, 0));

  const url = `/models/${draggedItem.filename}.glb`;
  let gltf;
  try {
    const gltfPromise = loadGLTF(url);
    window.addEventListener('pointermove', onMenuDragMove, { passive: false });
    window.addEventListener('pointerup', onMenuDragEnd, { passive: false });
    gltf = await gltfPromise;
  } catch (err) {
    alert('Failed to load model for drag: ' + (err && err.message ? err.message : err));
    cancelMenuDragIfAny();
    return;
  }

  finalObject = deepCloneScene(gltf.scene);
  previewObject = deepCloneScene(gltf.scene);

  finalObject.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });
  previewObject.traverse(n => { if (n.isMesh) makePreviewMaterials(n); });

  try {
    groundObjectToFloor(finalObject);
    const finalBox = new THREE.Box3().setFromObject(finalObject);
    const finalMinY = finalBox.min.y || 0;
    previewObject.position.y -= finalMinY;
  } catch (e) { console.warn('Grounding failed:', e); }

  scene.add(previewObject);

  if (finalizeRequested) finalizeDropAt(finalizeDropPosition || intersectionPoint.clone());
}

function onMenuDragMove(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) { if (previewObject) previewObject.visible = false; return; }

  if (previewObject) {
    previewObject.visible = true;
    const pos = intersectionPoint.clone();
    const bb = new THREE.Box3().setFromObject(previewObject);
    const size = new THREE.Vector3(); bb.getSize(size);
    previewObject.position.set(pos.x, pos.y + size.y / 2, pos.z);
  }
}

function finalizeDropAt(posWorld) {
  if (!finalObject) { finalizeRequested = true; finalizeDropPosition = posWorld ? posWorld.clone() : null; return; }

  if (posWorld) finalObject.position.copy(posWorld);
  finalObject.name = draggedItem.name;
  finalObject.userData = { filename: draggedItem.filename };
  scene.add(finalObject);
  addToLayoutData(finalObject);

  selectedObjects.length = 0; selectedObjects.push(finalObject); activeOutlinePass.selectedObjects = selectedObjects;

  if (previewObject && previewObject.parent) previewObject.parent.remove(previewObject);
  if (previewObject) previewObject.traverse(n => { if (n.isMesh && n.material) { if (Array.isArray(n.material)) n.material.forEach(m => m.dispose && m.dispose()); else n.material.dispose && n.material.dispose(); } });

  previewObject = null; finalObject = null; finalizeRequested = false; finalizeDropPosition = null; draggingFromMenu = false; draggedItem = null;
  controls && (controls.enabled = true);
}

function onMenuDragEnd(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  let dropPos = null;
  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) dropPos = intersectionPoint.clone();
  if (finalObject) finalizeDropAt(dropPos); else { finalizeRequested = true; finalizeDropPosition = dropPos; }
  window.removeEventListener('pointermove', onMenuDragMove); window.removeEventListener('pointerup', onMenuDragEnd);
}

// ------------------ Layout / props / save ------------------
function addToLayoutData(object3D) {
  const entry = {
    id: uuidv4(),
    name: object3D.name,
    filename: object3D.userData.filename,
    dims: object3D.userData.dims || null,
    position: { x: object3D.position.x, y: object3D.position.y, z: object3D.position.z },
    rotation: { x: object3D.rotation.x, y: object3D.rotation.y, z: object3D.rotation.z },
    scale: { x: object3D.scale.x, y: object3D.scale.y, z: object3D.scale.z }
  };
  layoutData.value.push(entry);
  saveLayoutDebounced();
}

const isSavingLayout = ref(false);

async function saveLayout() {
  try {
    isSavingLayout.value = true;
    await updateProjectLayout(projectId, layoutData.value);
    
  } catch (err) {
    alert('Failed to save layout: ' + (err && err.message ? err.message : err));
  } finally { isSavingLayout.value = false; }
}

const saveLayoutDebounced = debounce(saveLayout, 500);

// ------------------ Rotation / props UI ------------------
function degToRad(d) { return d * Math.PI / 180; }
function radToDeg(r) { return r * 180 / Math.PI; }

function rotateSelectedDelta(deltaDeg) {
  const obj = selectedObjects[0]; if (!obj) return;
  obj.rotation.y += degToRad(deltaDeg);
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}

function handleRotateDelta(delta) {
  const obj = selectedObjects[0]; if (!obj) return;
  obj.rotation.y += degToRad(delta);
  updatePropsRotation(obj);
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}

function updateProps(obj) {
  console.log('updateProps', obj);  
  if (!obj) { propsPanelData.visible = false; return; }
  propsPanelData.visible = true; propsPanelData.name = obj.name || 'Element';
  const x = obj.position.x.toFixed(2); const z = obj.position.z.toFixed(2);
  propsPanelData.details = `X: ${x}  Z: ${z}`;
  const deg = Math.round((obj.rotation.y * 180 / Math.PI + 360) % 360);
  propsPanelData.rotation = deg;
}

function updateLayoutEntryFromObject(object3D) {
  if (!object3D || !object3D.userData) return;
  const id = object3D.userData.id || object3D.userData._id; if (!id) return;
  const entry = layoutData.value.find(x => x.id === id); if (!entry) return;
  entry.position.x = object3D.position.x; entry.position.y = object3D.position.y; entry.position.z = object3D.position.z;
  entry.rotation.y = object3D.rotation.y;
  entry.scale.x = object3D.scale.x; entry.scale.y = object3D.scale.y; entry.scale.z = object3D.scale.z;
}

function handleUpdateRotation(newDegrees) {
  const obj = selectedObjects[0]; if (!obj) return;
  obj.rotation.y = degToRad(newDegrees);
  updatePropsRotation(obj); updateLayoutEntryFromObject(obj); saveLayoutDebounced();
}
function updatePropsRotation(obj) { const deg = Math.round((radToDeg(obj.rotation.y) + 360) % 360); propsPanelData.rotation = deg; }

// ------------------ Toolbar position ------------------
function updateToolbarPosition() {
  if (selectedObjects.length === 0) { isToolbarVisible.value = false; return; }
  const obj = selectedObjects[0]; if (!obj) return;
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  center.y = box.max.y + 2;
  const vector = center.clone(); vector.project(activeCamera);
  const rect = renderer.domElement.getBoundingClientRect();
  toolbarPosition.x = (vector.x * rect.width) / 2 + rect.left + rect.width / 2;
  toolbarPosition.y = -(vector.y * rect.height) / 2 + rect.top + rect.height / 2;
  isToolbarVisible.value = true;
}

// ------------------ Selection / toolbar actions ------------------
function clearSelection() {
  selectedObjects.length = 0; activeOutlinePass.selectedObjects = selectedObjects; isToolbarVisible.value = false; propsPanelData.visible = false;
}

function handleDuplicate() {
  const original = selectedObjects[0]; if (!original) return;
  const clone = deepCloneScene(original);
  clone.position.x += 2; clone.position.z += 2;
  clone.userData.id = uuidv4(); clone.userData.filename = original.userData.filename;
  scene.add(clone); addToLayoutData(clone);
  selectedObjects[0] = clone; activeOutlinePass.selectedObjects = selectedObjects; updateToolbarPosition();
}

function handleToolbarRotate(angleDeg) { rotateSelectedDelta(angleDeg); }

function handleFlip(axis) {
  const obj = selectedObjects[0]; if (!obj) return;
  if (axis === 'x') obj.scale.x *= -1; else if (axis === 'z') obj.scale.z *= -1;
  obj.updateMatrix(); updateLayoutEntryFromObject(obj); saveLayoutDebounced();
}

function handleDelete() {
  const obj = selectedObjects[0]; if (!obj) return;
  scene.remove(obj);
  const id = obj.userData.id || obj.userData._id;
  if (id) layoutData.value = layoutData.value.filter(item => item.id !== id);
  obj.traverse(child => { if (child.isMesh) { if (child.geometry) child.geometry.dispose(); if (child.material) { if (Array.isArray(child.material)) child.material.forEach(m => m.dispose && m.dispose()); else child.material.dispose && child.material.dispose(); } } });
  clearSelection(); saveLayoutDebounced();
}

// ------------------ Room creation helper ------------------
function createRoom(width, length) {
  const height = 3; const thickness = 0.2; const newObjects = [];
  const floorGeo = new THREE.BoxGeometry(width, 0.1, length);
  const roomFloorMaterial = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });

  const floor = new THREE.Mesh(floorGeo, roomFloorMaterial);
  floor.position.set(0, 0, 0); floor.name = "Room Floor";
  floor.userData = { filename: 'custom_floor', id: uuidv4(), dims: { w: width, h: 0.1, d: length } };
  newObjects.push(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + (thickness * 2), height, thickness), wallMaterial);
  backWall.position.set(0, height / 2, -(length / 2) - (thickness / 2)); backWall.name = "Wall Back";
  backWall.userData = { filename: 'custom_wall', id: uuidv4(), dims: { w: width + (thickness * 2), h: height, d: thickness } };
  newObjects.push(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, length), wallMaterial);
  leftWall.position.set(-(width / 2) - (thickness / 2), height / 2, 0); leftWall.name = "Wall Left";
  leftWall.userData = { filename: 'custom_wall', id: uuidv4(), dims: { w: thickness, h: height, d: length } };
  newObjects.push(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, length), wallMaterial);
  rightWall.position.set((width / 2) + (thickness / 2), height / 2, 0); rightWall.name = "Wall Right";
  rightWall.userData = { filename: 'custom_wall', id: uuidv4(), dims: { w: thickness, h: height, d: length } };
  newObjects.push(rightWall);

  newObjects.forEach(obj => { scene.add(obj); addToLayoutData(obj); });

  clearSelection(); selectedObjects.push(...newObjects); activeOutlinePass.selectedObjects = selectedObjects; saveLayoutDebounced();
}

// ------------------ Resize / camera switch ------------------
function onWindowResize() {
  renderWidth = window.innerWidth; renderHeight = window.innerHeight * 15 / 16;
  const w = renderWidth; const h = renderHeight;
  perspectiveCamera.aspect = w / h; perspectiveCamera.updateProjectionMatrix();
  const aspectNow = w / h;
  orthoCamera.left = (-frustumSize * aspectNow) / 2; orthoCamera.right = (frustumSize * aspectNow) / 2;
  orthoCamera.top = frustumSize / 2; orthoCamera.bottom = -frustumSize / 2; orthoCamera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio || 1); renderer.setSize(w, h); composer.setSize(w, h);
  setOutlineSize(w, h);
}

function bindControllerToCamera(cam) {
  if (controls) try { controls.dispose(); } catch (_) {}
  controls = new OrbitControls(cam, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.08; controls.update();
}

let currMode = 3;
function switchTo2D() {
  if (currMode === 2) return; currMode = 2; dirLight.intensity = 0; activeCamera = orthoCamera; activeOutlinePass = outlinePass2D;
  bindControllerToCamera(activeCamera); renderPass.camera = activeCamera; composer.removePass(outlinePass3D); composer.addPass(outlinePass2D); controls.enableRotate = false; activeCamera.updateProjectionMatrix();
}
function switchTo3D() {
  if (currMode === 3) return; currMode = 3; dirLight.intensity = 1; activeCamera = perspectiveCamera; activeOutlinePass = outlinePass3D;
  bindControllerToCamera(activeCamera); renderPass.camera = activeCamera; composer.removePass(outlinePass2D); composer.addPass(outlinePass3D); controls.enableRotate = true; activeCamera.updateProjectionMatrix();
}

// ------------------ Animation / lifecycle ------------------
function animate() {
  if (controls) controls.update();
  if (selectedObjects.length > 0) updateToolbarPosition();
  composer.render();
}
renderer.setAnimationLoop(animate);

onMounted(() => {
  const container = document.getElementById('edit-project-container'); if (container) container.appendChild(renderer.domElement);
  composer.setSize(renderWidth, renderHeight); setOutlineSize(renderWidth, renderHeight);
  window.addEventListener('resize', onWindowResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  try { renderer.domElement.removeEventListener('pointerdown', onPointerDownForDrag); } catch (e) {}
  window.removeEventListener('pointermove', onPointerMoveForDrag); window.removeEventListener('pointerup', onPointerUpForDrag);
  cancelMenuDragIfAny();
  if (renderer && renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  if (controls) controls.dispose();
});

// Theme watcher
const { theme } = useTheme();
watch(theme, (t) => { scene.background = new THREE.Color(t === 'dark' ? 0x303541 : 0xb5bbcf); });

// Expose API to parent
defineExpose({ startDragFromMenu, createRoom });
</script>

<style>
@import './EditProjectStyle.css';
</style>
