<template>
  <div id="edit-project-container">
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
      :visible="isPropsMenuVisible"
      :name="propsName"
      :details="propsDetails"
      :rotation="propsRotation"
      @update:rotation="handlePropsMenuRotation"
    />
  </div>
</template>

<script setup>
/* EditProject.vue: Cleaned & Integrated with PropsMenu */

import { onMounted, onBeforeUnmount, ref, watch, reactive } from 'vue';
import { useRoute } from 'vue-router';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash.debounce';

// Services & Components
import { loadLayout, updateProjectLayout } from '../services/layoutService';
import SelectionToolbar from '../components/SelectionToolbar.vue';
import PropsMenu from '../components/PropsMenu.vue'; // Импортираме твоя компонент
import { useTheme } from '../composables/useTheme';

/* -------------------------
   Props & State
------------------------- */
const props = defineProps({
  projectData: { type: Object, required: true }
});

const route = useRoute();
const projectId = route.params.id;
const layoutData = ref(Array.isArray(props.projectData.layoutData) ? [...props.projectData.layoutData] : []);

// Toolbar State (Floating)
const isToolbarVisible = ref(false);
const toolbarPosition = reactive({ x: 0, y: 0 });

// Props Menu State (Right Sidebar)
const isPropsMenuVisible = ref(false);
const propsName = ref('');
const propsDetails = ref('');
const propsRotation = ref(0);

// Saving State
const saveLayoutDebounced = debounce(saveLayout, 500);
const isSavingLayout = ref(false);

/* -------------------------
   Scene Setup
------------------------- */
let renderWidth = window.innerWidth;
let renderHeight = window.innerHeight - 56;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5bbcf);

// Cameras
const aspect = renderWidth / renderHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
perspectiveCamera.position.set(0, 50, 50);

const frustumSize = 25;
const orthoCamera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2, (frustumSize * aspect) / 2,
  frustumSize / 2, frustumSize / -2,
  0.1, 10000
);
orthoCamera.position.set(0, 2, 0);

let activeCamera = perspectiveCamera;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
else if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.touchAction = 'none';

// Controls
let controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Lights
const light = new THREE.AmbientLight(0xFFFFFF, 1);
const light2 = new THREE.AmbientLight(0xFFFFFF, 1);
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(10, 10, 10);
scene.add(light, light2, dir);

// Grid & Helpers
const planeSize = 40;
const maxHeight = 15;
const gridSize = 40;
const divisions = 40;
const grid = new THREE.GridHelper(gridSize, divisions, 0x999999, 0x888888);
grid.position.y = 0;
grid.name = 'floor';
scene.add(grid);

var hasWalls=false;
const manager = new THREE.LoadingManager();
loadLayout(layoutData.value, manager, maxHeight, scene, perspectiveCamera, controls, planeSize,hasWalls);

/* -------------------------
   Post-Processing
------------------------- */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);

const outlinePass3D = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, perspectiveCamera);
outlinePass3D.edgeThickness = 2.0;
outlinePass3D.edgeStrength = 3.0;
outlinePass3D.visibleEdgeColor.set(0xffffff);
composer.addPass(outlinePass3D);

const outlinePass2D = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, orthoCamera);
outlinePass2D.edgeThickness = 2.0;
outlinePass2D.edgeStrength = 3.0;
outlinePass2D.visibleEdgeColor.set(0xffffff);

let activeOutlinePass = outlinePass3D;
const gammaPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaPass);

/* -------------------------
   Raycasting & Selection Helper
------------------------- */
const raycaster = new THREE.Raycaster();
const selectedObjects = [];

function findRootForSelection(obj) {
  let o = obj;
  while (o.parent && o.parent !== scene && o.parent.type !== 'Scene') {
    o = o.parent;
  }
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

/* -------------------------
   ROOM / FLOOR LOGIC
------------------------- */
function getAllFloors() {
  const floors = [];
  scene.traverse((child) => {
    if (child.userData && child.userData.filename === 'custom_floor') {
      floors.push(child);
    }
  });
  return floors;
}

function constrainPositionToFloors(targetPos, object) {
  const floors = getAllFloors();
  if (floors.length === 0) {
    // Fallback logic
    const floorBox = new THREE.Box3().setFromObject(grid);
    const objBox = new THREE.Box3().setFromObject(object);
    
    const halfW = (objBox.max.x - objBox.min.x) / 2;
    const halfD = (objBox.max.z - objBox.min.z) / 2;
    
    const minX = floorBox.min.x + halfW;
    const maxX = floorBox.max.x - halfW;
    const minZ = floorBox.min.z + halfD;
    const maxZ = floorBox.max.z - halfD;
    
    return new THREE.Vector3(
        Math.max(minX, Math.min(maxX, targetPos.x)),
        targetPos.y,
        Math.max(minZ, Math.min(maxZ, targetPos.z))
    );
  }

  // Logic for inside the room
  const raycasterDown = new THREE.Raycaster();
  const rayOrigin = targetPos.clone();
  rayOrigin.y = 50; 
  raycasterDown.set(rayOrigin, new THREE.Vector3(0, -1, 0));

  const intersects = raycasterDown.intersectObjects(floors, false);

  if (intersects.length > 0) {
    const floorMesh = intersects[0].object;
    const floorBox = new THREE.Box3().setFromObject(floorMesh);
    const objBox = new THREE.Box3().setFromObject(object);

    const halfWidth = (objBox.max.x - objBox.min.x) / 2;
    const halfDepth = (objBox.max.z - objBox.min.z) / 2;

    const minX = floorBox.min.x + halfWidth;
    const maxX = floorBox.max.x - halfWidth;
    const minZ = floorBox.min.z + halfDepth;
    const maxZ = floorBox.max.z - halfDepth;

    const clampedX = Math.max(minX, Math.min(maxX, targetPos.x));
    const clampedZ = Math.max(minZ, Math.min(maxZ, targetPos.z));

    return new THREE.Vector3(clampedX, targetPos.y, clampedZ);
  }

  return targetPos;
}

/* -------------------------
   Drag Existing Objects
------------------------- */
const DRAG_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const GRID_SNAP = { enabled: false, size: 0.1 };
let dragging = false;
let dragObject = null;
let dragOffset = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const intersectionPoint = new THREE.Vector3();
const tempVec = new THREE.Vector3();
const tempVec2 = new THREE.Vector3();
dragPlane.normal.copy(DRAG_PLANE_NORMAL);

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
  if (!hit) { clearSelection(); return; }
  
  const rawPicked = hit.object;
  const root = findRootForSelection(rawPicked);
  if (root.name === 'floor' || rawPicked.name === 'floor') { clearSelection(); return; }
  
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
  
  // Selection
  if (selectedObjects.length === 0) selectedObjects.push(dragObject);
  else selectedObjects[0] = dragObject;
  activeOutlinePass.selectedObjects = selectedObjects;
  
  // Update UI (Toolbar & PropsMenu)
  updateSelectionUI(dragObject);
  
  e.preventDefault();
}

function onPointerMoveForDrag(e) {
  if (!dragging || !dragObject) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

  let targetWorld = tempVec2.copy(intersectionPoint).add(dragOffset);
  const currentWorld = getWorldPosition(dragObject, tempVec);
  targetWorld.y = currentWorld.y;

  if (GRID_SNAP.enabled && GRID_SNAP.size > 0) {
    const snapped = snapVec(targetWorld, GRID_SNAP.size);
    targetWorld.copy(snapped);
    targetWorld.y = currentWorld.y;
  }

  // --- ROOM CONSTRAINT LOGIC ---
  const constrainedPosition = constrainPositionToFloors(targetWorld, dragObject);
  setObjectWorldPosition(dragObject, constrainedPosition);

  // Update Props Menu while dragging (coords change)
  updateSelectionUI(dragObject);

  e.preventDefault();
}

function onPointerUpForDrag(e) {
  if (dragging) {
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { }
    controls.enabled = true;
    updateLayoutEntryFromObject(dragObject);
    saveLayoutDebounced();
    
    updateSelectionUI(dragObject);
    
    dragging = false;
    dragObject = null;
  }
}

/* -------------------------
   Drag from Menu (Async)
------------------------- */
const gltfLoader = new GLTFLoader();
const gltfCache = new Map();
let draggingFromMenu = false;
let previewObject = null;
let finalObject = null;
let draggedItem = null;
let finalizeRequested = false;
let finalizeDropPosition = null;

async function loadGLTF(url) {
  if (gltfCache.has(url)) return gltfCache.get(url);
  const promise = new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject));
  gltfCache.set(url, promise);
  return promise;
}

function deepCloneScene(sceneObj) { return sceneObj.clone(true); }

function cancelMenuDragIfAny() {
  if (!draggingFromMenu) return;
  draggingFromMenu = false;
  finalizeRequested = false;
  finalizeDropPosition = null;
  draggedItem = null;
  if (previewObject && previewObject.parent) previewObject.parent.remove(previewObject);
  previewObject = null;
  finalObject = null;
  if (controls) controls.enabled = true;
  window.removeEventListener('pointermove', onMenuDragMove);
  window.removeEventListener('pointerup', onMenuDragEnd);
}

function makePreviewMaterials(node) {
  if (!node.isMesh || !node.material) return;
  const apply = (m) => { const cm = m.clone(); cm.transparent = true; cm.opacity = 0.45; return cm; };
  node.material = Array.isArray(node.material) ? node.material.map(apply) : apply(node.material);
}

function makeFinalMaterials(node) {
  if (!node.isMesh || !node.material) return;
  const apply = (m) => { const cm = m.clone(); cm.transparent = false; cm.opacity = 1; return cm; };
  node.material = Array.isArray(node.material) ? node.material.map(apply) : apply(node.material);
}

async function startDragFromMenu(item) {
  if (!item) return;
  cancelMenuDragIfAny();
  draggingFromMenu = true;
  draggedItem = item;
  
  if (controls) controls.enabled = false;
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL, new THREE.Vector3(0, 0, 0));

  const url = `/src/models/${draggedItem.filename}.glb`;
  let gltf;
  try {
    const gltfPromise = loadGLTF(url);
    window.addEventListener('pointermove', onMenuDragMove, { passive: false });
    window.addEventListener('pointerup', onMenuDragEnd, { passive: false });
    gltf = await gltfPromise;
  } catch (err) {
    alert('Failed to load model');
    cancelMenuDragIfAny();
    return;
  }

  finalObject = deepCloneScene(gltf.scene);
  previewObject = deepCloneScene(gltf.scene);

  finalObject.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });
  previewObject.traverse(n => { if (n.isMesh) makePreviewMaterials(n); });

  const box = new THREE.Box3().setFromObject(finalObject);
  const offset = box.min.y || 0;
  finalObject.position.y -= offset;
  previewObject.position.y -= offset;

  scene.add(previewObject);
  if (finalizeRequested) finalizeDropAt(finalizeDropPosition || intersectionPoint.clone());
}

function onMenuDragMove(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    if (previewObject) previewObject.visible = false;
    return;
  }

  if (previewObject) {
    previewObject.visible = true;
    const pos = intersectionPoint.clone();
    
    // Constrain preview
    const constrainedPos = constrainPositionToFloors(pos, previewObject);
    previewObject.position.set(constrainedPos.x, previewObject.position.y, constrainedPos.z);
  }
}

function onMenuDragEnd(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  raycaster.setFromCamera(ndc, activeCamera);
  let dropPos = null;
  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    dropPos = intersectionPoint.clone();
  }

  if (finalObject) finalizeDropAt(dropPos);
  else {
    finalizeRequested = true;
    finalizeDropPosition = dropPos;
  }

  window.removeEventListener('pointermove', onMenuDragMove);
  window.removeEventListener('pointerup', onMenuDragEnd);
}

function finalizeDropAt(posWorld) {
  if (!finalObject) return;
  
  if (posWorld) {
      const constrained = constrainPositionToFloors(posWorld, finalObject);
      finalObject.position.set(constrained.x, finalObject.position.y, constrained.z);
  }
  
  finalObject.name = draggedItem.name;
  finalObject.userData = { filename: draggedItem.filename };
  scene.add(finalObject);
  addToLayoutData(finalObject);

  // Auto-select dropped object
  selectedObjects.length = 0;
  selectedObjects.push(finalObject);
  activeOutlinePass.selectedObjects = selectedObjects;
  
  updateSelectionUI(finalObject);

  // Cleanup
  if (previewObject && previewObject.parent) previewObject.parent.remove(previewObject);
  previewObject = null;
  finalObject = null;
  draggingFromMenu = false;
  if (controls) controls.enabled = true;
}

/* -------------------------
   Layout Data & Persistence
------------------------- */
function addToLayoutData(object3D) {
  const entry = {
    id: uuidv4(),
    name: object3D.name,
    filename: object3D.userData.filename,
    position: { x: object3D.position.x, y: object3D.position.y, z: object3D.position.z },
    rotation: { x: object3D.rotation.x, y: object3D.rotation.y, z: object3D.rotation.z },
    scale: { x: object3D.scale.x, y: object3D.scale.y, z: object3D.scale.z }
  };
  object3D.userData.id = entry.id; // Sync ID
  layoutData.value.push(entry);
  saveLayoutDebounced();
}

function updateLayoutEntryFromObject(object3D) {
  if (!object3D || !object3D.userData) return;
  const id = object3D.userData.id || object3D.userData._id; if (!id) return;
  const entry = layoutData.value.find(x => x.id === id); if (!entry) return;
  entry.position = { ...object3D.position };
  entry.rotation = { x: object3D.rotation.x, y: object3D.rotation.y, z: object3D.rotation.z };
  entry.scale = { ...object3D.scale };
}

async function saveLayout() {
  try {
    isSavingLayout.value = true;
    await updateProjectLayout(projectId, layoutData.value);
  } catch (err) {
    console.error('Failed to save layout', err);
  } finally {
    isSavingLayout.value = false;
  }
}

/* -------------------------
   Toolbar & Props Interaction Logic
------------------------- */

// Unified helper to update both Toolbar and PropsMenu state
function updateSelectionUI(obj) {
  if (!obj) {
    clearSelection();
    return;
  }

  // 1. Update Floating Toolbar Position
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  center.y = box.max.y + 3; 

  const vector = center.clone();
  vector.project(activeCamera);

  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  toolbarPosition.x = (vector.x * halfWidth) + halfWidth;
  toolbarPosition.y = -(vector.y * halfHeight) + halfHeight;
  isToolbarVisible.value = true;

  // 2. Update Props Menu (Vue Refs)
  const size = new THREE.Vector3(); 
  box.getSize(size);
  
  isPropsMenuVisible.value = true;
  propsName.value = obj.name || 'Unknown Object';
  // Format: w:20 h:30 d:40
  propsDetails.value = `w:${size.x.toFixed(2)} h:${size.y.toFixed(2)} d:${size.z.toFixed(2)}`;
  
  // Convert Radians to Degrees for UI
  const degrees = Math.round((obj.rotation.y * 180 / Math.PI));
  propsRotation.value = degrees; 
}

function clearSelection() {
  selectedObjects.length = 0;
  activeOutlinePass.selectedObjects = selectedObjects;
  
  // Hide UI
  isToolbarVisible.value = false;
  isPropsMenuVisible.value = false;
}

// Handler for when user rotates via the Props Menu Input/Buttons
function handlePropsMenuRotation(newDegrees) {
  const obj = selectedObjects[0];
  if (!obj) return;

  // Convert Degrees to Radians
  obj.rotation.y = newDegrees * Math.PI / 180;
  
  // Update UI and Save
  propsRotation.value = newDegrees; // Sync ref back immediately
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}

// Handlers for Toolbar Actions
function handleDuplicate() {
  const original = selectedObjects[0];
  if (!original) return;
  const clone = deepCloneScene(original);
  clone.position.x += 2;
  clone.position.z += 2;
  clone.userData.id = uuidv4(); 
  clone.userData.filename = original.userData.filename;
  
  const constrained = constrainPositionToFloors(clone.position, clone);
  clone.position.copy(constrained);

  scene.add(clone);
  addToLayoutData(clone);
  
  selectedObjects[0] = clone;
  activeOutlinePass.selectedObjects = selectedObjects;
  updateSelectionUI(clone);
}

function handleToolbarRotate(angleDeg) {
  // Rotates relative to current position
  const obj = selectedObjects[0];
  if (!obj) return;
  obj.rotation.y += (angleDeg * Math.PI / 180);
  
  // Update internal logic
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
  
  // Sync the Props Menu input
  updateSelectionUI(obj);
}

function handleFlip(axis) {
  const obj = selectedObjects[0];
  if (!obj) return;
  if (axis === 'x') obj.scale.x *= -1;
  else if (axis === 'z') obj.scale.z *= -1;
  obj.updateMatrix();
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
  updateSelectionUI(obj);
}

function handleDelete() {
  const obj = selectedObjects[0];
  if (!obj) return;
  scene.remove(obj);
  const id = obj.userData.id || obj.userData._id;
  if (id) layoutData.value = layoutData.value.filter(item => item.id !== id);
  
  obj.traverse(child => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
  });
  clearSelection();
  saveLayoutDebounced();
}

/* -------------------------
   Camera & Window Logic
------------------------- */
function onWindowResize() {
  renderWidth = window.innerWidth;
  renderHeight = window.innerHeight * 15 / 16;
  
  perspectiveCamera.aspect = renderWidth / renderHeight;
  perspectiveCamera.updateProjectionMatrix();
  
  const aspectNow = renderWidth / renderHeight;
  orthoCamera.left = (-frustumSize * aspectNow) / 2;
  orthoCamera.right = (frustumSize * aspectNow) / 2;
  orthoCamera.top = frustumSize / 2;
  orthoCamera.bottom = -frustumSize / 2;
  orthoCamera.updateProjectionMatrix();

  renderer.setSize(renderWidth, renderHeight);
  composer.setSize(renderWidth, renderHeight);
  if (outlinePass3D.setSize) outlinePass3D.setSize(renderWidth, renderHeight);
  if (outlinePass2D.setSize) outlinePass2D.setSize(renderWidth, renderHeight);
}

function bindControllerToCamera(cam) {
  if (controls) try { controls.dispose(); } catch (_) { }
  controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();
}

function switchTo2D() {
  dir.intensity = 0;
  activeCamera = orthoCamera;
  activeOutlinePass = outlinePass2D;
  bindControllerToCamera(activeCamera);
  controls.enableRotate = false;
  controls.reset(); 
  activeCamera.position.set(0, 20, 0); 
  activeCamera.lookAt(0,0,0);
  
  renderPass.camera = activeCamera;
  composer.removePass(outlinePass3D);
  composer.addPass(outlinePass2D);
}

function switchTo3D() {
  dir.intensity = 1;
  activeCamera = perspectiveCamera;
  activeOutlinePass = outlinePass3D;
  bindControllerToCamera(activeCamera);
  controls.enableRotate = true;
  
  renderPass.camera = activeCamera;
  composer.removePass(outlinePass2D);
  composer.addPass(outlinePass3D);
}

function onKeyDown(e) {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    clearSelection();
    cancelMenuDragIfAny();
  }
}

/* -------------------------
   Lifecycle
------------------------- */
function animate() {
  if (controls) controls.update();
  if (selectedObjects.length > 0) {
    // Optional: Keep toolbar strictly synced every frame if camera moves
    updateSelectionUI(selectedObjects[0]); 
  }
  composer.render();
}

const { theme } = useTheme();
watch(theme, (t) => { scene.background = new THREE.Color(t === 'dark' ? 0x303541 : 0xb5bbcf); });

onMounted(() => {
  const container = document.getElementById('edit-project-container');
  if (container) container.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  renderer.domElement.addEventListener('pointerdown', onPointerDownForDrag, { passive: false });
  window.addEventListener('pointermove', onPointerMoveForDrag, { passive: false });
  window.addEventListener('pointerup', onPointerUpForDrag, { passive: false });
  
  renderer.setAnimationLoop(animate);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('pointermove', onPointerMoveForDrag);
  window.removeEventListener('pointerup', onPointerUpForDrag);
  try { renderer.domElement.removeEventListener('pointerdown', onPointerDownForDrag); } catch (e) { }
  
  cancelMenuDragIfAny();
  renderer.setAnimationLoop(null);
  
  if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  if (controls) controls.dispose();
});

defineExpose({ startDragFromMenu ,hasWalls});
</script>

<style>
@import './EditProjectStyle.css';
</style>