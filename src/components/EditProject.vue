<template>
  <div id="edit-project-container">
    <!-- three.js canvas is appended to this container in onMounted -->
    <div id="bottom-menu">
      <p @click="switchTo2D()">2D</p>
      <p @click="switchTo3D()">3D</p>
    </div>
    <SelectionToolbar :visible="isToolbarVisible" :position="toolbarPosition" @duplicate="handleDuplicate"
      @rotate="handleToolbarRotate" @flip="handleFlip" @delete="handleDelete" />
  </div>
</template>

<script setup>
/* EditProject.vue: three.js scene + async drag/drop of GLB from floating menu */

import { onMounted, onBeforeUnmount, ref, watch,reactive } from 'vue';
import * as THREE from 'three';
import { useRoute } from 'vue-router';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadLayout } from '../services/layoutService'; // your existing layout loader
import { v4 as uuidv4 } from 'uuid';//генериране на уникални id-та
import debounce from 'lodash.debounce';
import { updateProjectLayout } from '../services/layoutService';
const saveLayoutDebounced = debounce(saveLayout, 500);

const props = defineProps({
  projectData: { type: Object, required: true }
});

const route = useRoute();
const projectId = route.params.id;

const layoutData = ref(
  Array.isArray(props.projectData.layoutData)
    ? [...props.projectData.layoutData]
    : []
);
/* -------------------------
   Renderer / scene setup
------------------------- */
let renderWidth = window.innerWidth;
let renderHeight = window.innerHeight - 56;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb5bbcf);

const aspect = renderWidth / renderHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
perspectiveCamera.position.set(0, 50, 50);
perspectiveCamera.lookAt(0, 0, 0);

const frustumSize = 50;
const orthoCamera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1, 10000
);
orthoCamera.position.set(0, 50, 0);
orthoCamera.lookAt(0, 0, 0);

let activeCamera = perspectiveCamera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
try { renderer.outputEncoding = THREE.sRGBEncoding; } catch (e) { try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch (_) { } }
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.touchAction = 'none';

/* Controls */
let controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

/* Lights */
const light = new THREE.AmbientLight(0xFFFFFF, 1);
const light2 = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(light, light2);
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(10, 10, 10);
scene.add(dir);

/* Floor */
const manager = new THREE.LoadingManager();
const planeSize = 40;
const maxHeight = 15;

/* -------------------------
   Floor Grid
------------------------- */
const gridSize = 40;
const divisions = 40;

const grid = new THREE.GridHelper(
  gridSize,
  divisions,
  0x999999, // main lines
  0x888888  // secondary lines
);

grid.position.y = 0;
grid.name = 'floor';

scene.add(grid);

/* Load initial layout into scene (your existing function) */
loadLayout(layoutData.value, manager, maxHeight, scene, perspectiveCamera, controls, planeSize);

/* Composer + outline passes */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);

const outlinePass3D = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, perspectiveCamera);
outlinePass3D.edgeThickness = 2.0;
outlinePass3D.edgeStrength = 3.0;
outlinePass3D.visibleEdgeColor.set(0xffffff);
composer.addPass(outlinePass3D);
let activeOutlinePass = outlinePass3D;

const outlinePass2D = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, orthoCamera);
outlinePass2D.edgeThickness = 2.0;
outlinePass2D.edgeStrength = 3.0;
outlinePass2D.visibleEdgeColor.set(0xffffff);

const gammaPass = new ShaderPass(GammaCorrectionShader);
composer.addPass(gammaPass);
composer.setSize(renderWidth, renderHeight);

/* Render loop */
let fps = 0;


/* Raycaster, helpers, selection */
const raycaster = new THREE.Raycaster();
const selectedObjects = [];

function findRootForSelection(obj) {
  let o = obj;
  while (o.parent && o.parent !== scene && o.parent.type !== 'Scene') {
    o = o.parent;
  }
  return o;
}

/* Keyboard */
function onKeyDown(e) {
  if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
    clearSelection();
    // also cancel menu drag if needed
    cancelMenuDragIfAny();
  }
}
window.addEventListener('keydown', onKeyDown);

/* -------------------------
   Dragging existing objects
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

/* Helper functions */
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

/* Pointer selection & dragging of existing meshes */
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
  if (selectedObjects.length == 0) selectedObjects.push(dragObject);
  else selectedObjects[0] = dragObject;
  const box = new THREE.Box3().setFromObject(dragObject);
  const size = new THREE.Vector3();
  box.getSize(size);
  updateToolbarPosition(); 
  updateProps(root.name, `width: ${size.x.toFixed(2)}, height: ${size.y.toFixed(2)}, depth: ${size.z.toFixed(2)}`);
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

  const floorBox = new THREE.Box3().setFromObject(grid);
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
    updateProps(
      dragObject.name || 'Object',
      `w:${20} h:${40} d:${11}`
    );
    dragging = false;
    dragObject = null;
  }
}

/* Attach selection/drag listeners for existing objects */
renderer.domElement.addEventListener('pointerdown', onPointerDownForDrag, { passive: false });
window.addEventListener('pointermove', onPointerMoveForDrag, { passive: false });
window.addEventListener('pointerup', onPointerUpForDrag, { passive: false });

/* -------------------------
   Drag-from-menu logic (async)
   - loads GLTF (cached)
   - creates preview (transparent) and final (opaque) clones
   - grounds model bottom to floor
   - finalizes drop when pointer released (even if model loaded later)
------------------------- */

const gltfLoader = new GLTFLoader();
const gltfCache = new Map(); // cache loaded GLTFs by URL

// utility to load GLTF (async/await) with caching
async function loadGLTF(url) {
  if (gltfCache.has(url)) {
    return gltfCache.get(url);
  }
  const promise = new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
  gltfCache.set(url, promise);
  return promise;
}

// deep clone helper for scenes (use .clone(true) for geometry; materials will be replaced/cloned)
function deepCloneScene(sceneObj) {
  return sceneObj.clone(true);
}

let draggingFromMenu = false;
let previewObject = null; // preview shown while dragging
let finalObject = null; // final object to add to scene
let draggedItem = null;
let finalizeRequested = false;
let finalizeDropPosition = null;

/* Cancel any in-progress menu drag (used for ESC or cleanup) */
function cancelMenuDragIfAny() {
  if (!draggingFromMenu) return;
  draggingFromMenu = false;
  finalizeRequested = false;
  finalizeDropPosition = null;
  draggedItem = null;
  // remove preview
  if (previewObject && previewObject.parent) {
    previewObject.parent.remove(previewObject);
  }
  previewObject = null;
  finalObject = null;
  controls && (controls.enabled = true);
  window.removeEventListener('pointermove', onMenuDragMove);
  window.removeEventListener('pointerup', onMenuDragEnd);
}

/* Helper: clone materials for a mesh and make preview/final materials distinct */
function makePreviewMaterials(node) {
  if (!node.isMesh || !node.material) return;
  if (Array.isArray(node.material)) {
    node.material = node.material.map(m => {
      const cm = m.clone();
      cm.transparent = true;
      cm.opacity = 0.45;
      return cm;
    });
  } else {
    const cm = node.material.clone();
    cm.transparent = true;
    cm.opacity = 0.45;
    node.material = cm;
  }
}

function makeFinalMaterials(node) {
  if (!node.isMesh || !node.material) return;
  if (Array.isArray(node.material)) {
    node.material = node.material.map(m => {
      const cm = m.clone();
      cm.transparent = false;
      cm.opacity = 1;
      return cm;
    });
  } else {
    const cm = node.material.clone();
    cm.transparent = false;
    cm.opacity = 1;
    node.material = cm;
  }
}

// ground an object so its bottom sits at y=0
function groundObjectToFloor(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const minY = box.min.y || 0;
  obj.position.y -= minY;
}

/* Start drag from menu (exposed to parent) */
async function startDragFromMenu(item) {
  if (!item) return;
  // if a previous menu drag is active, cancel it
  cancelMenuDragIfAny();

  draggingFromMenu = true;
  draggedItem = item;
  finalizeRequested = false;
  finalizeDropPosition = null;

  // disable orbit controls while dragging
  if (controls) controls.enabled = false;

  // set drag plane on floor
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL, new THREE.Vector3(0, 0, 0));

  // start loading model async
  const url = `/src/models/${draggedItem.filename}.glb`;
  let gltf;
  try {
    // We intentionally don't await here to avoid blocking UI; we use the promise result when ready.
    const gltfPromise = loadGLTF(url);
    // Meanwhile, attach global listeners so pointer movement works even before model loads
    window.addEventListener('pointermove', onMenuDragMove, { passive: false });
    window.addEventListener('pointerup', onMenuDragEnd, { passive: false });

    gltf = await gltfPromise; // wait for model to finish loading (async)
  } catch (err) {
    alert('Failed to load model for drag:', err);
    cancelMenuDragIfAny();
    return;
  }

  // create independent clones for preview & final
  finalObject = deepCloneScene(gltf.scene);
  previewObject = deepCloneScene(gltf.scene);

  // clone materials for final and preview (so they're independent)
  finalObject.traverse((n) => {
    if (n.isMesh) makeFinalMaterials(n);
  });
  previewObject.traverse((n) => {
    if (n.isMesh) makePreviewMaterials(n);
  });

  // ground both clones (use final for measuring)
  try {
    groundObjectToFloor(finalObject);
    // apply the same shift to preview so they align
    const finalBox = new THREE.Box3().setFromObject(finalObject);
    const finalMinY = finalBox.min.y || 0;
    previewObject.position.y -= finalMinY;
  } catch (e) {
    console.warn('Grounding failed:', e);
  }

  // add preview to scene immediately (visible when pointer moves over canvas)
  scene.add(previewObject);

  // If user already released pointer before model loaded (finalizeRequested), finalize now
  if (finalizeRequested) {
    finalizeDropAt(finalizeDropPosition || intersectionPoint.clone());
  }
}

/* pointermove handler — move preview along plane */
function onMenuDragMove(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();

  // compute ndc relative to renderer dom element
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
  };

  raycaster.setFromCamera(ndc, activeCamera);
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    if (previewObject) previewObject.visible = false;
    return;
  }

  if (previewObject) {
    previewObject.visible = true;
    // place preview so bottom sits on the floor
    const pos = intersectionPoint.clone();

    // compute bounding box to offset by half height (since we grounded earlier, we set y to intersection + size.y/2)
    const bb = new THREE.Box3().setFromObject(previewObject);
    const size = new THREE.Vector3();
    bb.getSize(size);
    previewObject.position.set(pos.x, pos.y + size.y / 2, pos.z);
  }
}

/* finalize drop: insert finalObject into the scene at given world pos */
function finalizeDropAt(posWorld) {
  if (!finalObject) {
    // final model not yet ready: remember the request, will finalize in loader success
    finalizeRequested = true;
    finalizeDropPosition = posWorld ? posWorld.clone() : null;
    return;
  }

  // position finalObject (finalObject has been grounded so its bottom is at y=0)
  if (posWorld) {
    finalObject.position.copy(posWorld);
    // ensure bottom sits on floor: use bounding box height to set Y
    const bb = new THREE.Box3().setFromObject(finalObject);
    const size = new THREE.Vector3();
    bb.getSize(size);
    // finalObject.position.y = posWorld.y + size.y / 2;
  }
  finalObject.name = draggedItem.name;
  finalObject.userData = { filename: draggedItem.filename };
  // add to scene
  scene.add(finalObject);
  addToLayoutData(finalObject);

  // select it
  selectedObjects.length = 0;
  selectedObjects.push(finalObject);
  activeOutlinePass.selectedObjects = selectedObjects;

  // update props panel
  const box = new THREE.Box3().setFromObject(finalObject);
  const size = new THREE.Vector3();
  box.getSize(size);
  updateProps(finalObject.name || draggedItem?.name || 'Furniture', `w:${size.x.toFixed(2)} h:${size.y.toFixed(2)} d:${size.z.toFixed(2)}`);

  // remove preview safely
  if (previewObject && previewObject.parent) {
    previewObject.parent.remove(previewObject);
  }

  // dispose preview materials
  previewObject && previewObject.traverse((n) => {
    if (n.isMesh) {
      if (Array.isArray(n.material)) {
        n.material.forEach(mat => mat.dispose && mat.dispose());
      } else if (n.material) {
        n.material.dispose && n.material.dispose();
      }
    }
  });

  // reset state
  previewObject = null;
  finalObject = null;
  finalizeRequested = false;
  finalizeDropPosition = null;
  draggingFromMenu = false;
  draggedItem = null;
  controls && (controls.enabled = true);
}

/* pointerup handler for menu drag */
function onMenuDragEnd(e) {
  if (!draggingFromMenu) return;
  e.preventDefault();

  // compute intersection to place object
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
  };
  raycaster.setFromCamera(ndc, activeCamera);

  let dropPos = null;
  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    dropPos = intersectionPoint.clone();
  }

  if (finalObject) {
    finalizeDropAt(dropPos);
  } else {
    // not ready yet -> schedule
    finalizeRequested = true;
    finalizeDropPosition = dropPos;
  }

  // cleanup listeners
  window.removeEventListener('pointermove', onMenuDragMove);
  window.removeEventListener('pointerup', onMenuDragEnd);
}

/* -------------------------
   Utilities / UI props panel (your existing code)
------------------------- */
var propsMenu, selectedName, selectedCoords;
let rotateInput, rotateLeftBtn, rotateRightBtn;

function initPropsMenu() {
  propsMenu = document.createElement('div');
  propsMenu.id = 'props-menu';
  propsMenu.style.touchAction = 'none';
  propsMenu.style.userSelect = 'none';

  selectedName = document.createElement('p');
  selectedCoords = document.createElement('p');
  selectedName.id = 'props-selected-name';
  selectedCoords.id = 'props-selected-coords';

  propsMenu.appendChild(selectedName);
  propsMenu.appendChild(selectedCoords);

  // --- rotate UI block ---
  const rotateContainer = document.createElement('div');
  rotateContainer.id = 'props-rotate';
  rotateContainer.style.display = 'flex';
  rotateContainer.style.gap = '6px';
  rotateContainer.style.alignItems = 'center';
  rotateContainer.style.marginTop = '8px';

  // left rotate (-15deg)
  rotateLeftBtn = document.createElement('button');
  rotateLeftBtn.type = 'button';
  rotateLeftBtn.innerText = '⟲';
  rotateLeftBtn.title = 'Rotate -15°';
  rotateLeftBtn.addEventListener('click', () => rotateSelectedDelta(-15));

  // right rotate (+15deg)
  rotateRightBtn = document.createElement('button');
  rotateRightBtn.type = 'button';
  rotateRightBtn.innerText = '⟳';
  rotateRightBtn.title = 'Rotate +15°';
  rotateRightBtn.addEventListener('click', () => rotateSelectedDelta(15));

  // numeric input (degrees)
  rotateInput = document.createElement('input');
  rotateInput.type = 'number';
  rotateInput.step = '1';
  rotateInput.min = '-360';
  rotateInput.max = '360';
  rotateInput.value = '0';
  rotateInput.style.width = '64px';
  rotateInput.title = 'Rotation (degrees)';
  rotateInput.addEventListener('change', onRotateInputChange);
  rotateInput.addEventListener('blur', onRotateInputChange);
  rotateInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') onRotateInputChange(); });

  rotateContainer.appendChild(rotateLeftBtn);
  rotateContainer.appendChild(rotateRightBtn);
  rotateContainer.appendChild(rotateInput);

  propsMenu.appendChild(rotateContainer);
  // --- end rotate UI ---



  const appEl = document.getElementById('app') || document.body;
  appEl.appendChild(propsMenu);

}

initPropsMenu();

function addToLayoutData(object3D) {
  const entry = {
    id: uuidv4(),
    name: object3D.name,
    filename: object3D.userData.filename,
    position: {
      x: object3D.position.x,
      y: object3D.position.y,
      z: object3D.position.z
    },
    rotation: {
      x: object3D.rotation.x,
      y: object3D.rotation.y,
      z: object3D.rotation.z
    },
    scale: {
      x: object3D.scale.x,
      y: object3D.scale.y,
      z: object3D.scale.z
    }
  };

  layoutData.value.push(entry);
  saveLayoutDebounced();
}
const isSavingLayout = ref(false);

async function saveLayout() {
  try {
    isSavingLayout.value = true;
    console.log('Saving layout...', projectId);
    await updateProjectLayout(
      projectId,
      layoutData.value
    );

  } catch (err) {
    alert('Failed to save layout', err);
  } finally {
    isSavingLayout.value = false;
  }
}


function updateProps(name, coords) {
  // original behavior
  try {
    propsMenu.style.width = '220px';
    propsMenu.style.opacity = 1;
    if (selectedName) selectedName.innerHTML = name || '';
    if (selectedCoords) selectedCoords.innerHTML = coords || '';
  } catch (e) {
    // ignore if propsMenu missing
  }

  // sync rotate UI to currently selected object
  if (!rotateInput) return; // UI not created yet
  const obj = selectedObjects[0];
  if (!obj) {
    // no selection → disable / clear input
    rotateInput.value = '0';
    rotateLeftBtn.disabled = true;
    rotateRightBtn.disabled = true;
  } else {
    rotateLeftBtn.disabled = false;
    rotateRightBtn.disabled = false;
    refreshRotationUI(obj);
  }
}
/* -------------------------Rotation UI logic------------------------- */
function degToRad(d) { return d * Math.PI / 180; }
function radToDeg(r) { return r * 180 / Math.PI; }

function refreshRotationUI(obj) {
  if (!rotateInput || !obj) return;
  const deg = Math.round((radToDeg(obj.rotation.y) + 360) % 360);
  rotateInput.value = String(deg);
}

function rotateSelectedDelta(deltaDeg) {
  const obj = selectedObjects[0];
  if (!obj) return;
  obj.rotation.y += degToRad(deltaDeg);
  refreshRotationUI(obj);
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}

function onRotateInputChange() {
  const obj = selectedObjects[0];
  if (!obj || !rotateInput) return;
  const num = Number(rotateInput.value);
  if (isNaN(num)) return;
  obj.rotation.y = degToRad(num);
  refreshRotationUI(obj);
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}


/** update layoutData entry for the object (by userData.id) */
function updateLayoutEntryFromObject(object3D) {
  if (!object3D || !object3D.userData) return;
  const id = object3D.userData.id || object3D.userData._id;
  if (!id) return;
  const entry = layoutData.value.find(x => x.id === id);
  if (!entry) return;
  entry.position.x = object3D.position.x;
  entry.position.y = object3D.position.y;
  entry.position.z = object3D.position.z;
  entry.rotation.y = object3D.rotation.y;
  entry.scale.x = object3D.scale.x;
  entry.scale.y = object3D.scale.y;
  entry.scale.z = object3D.scale.z;
}


/* -------------------------
   Window resize handling
------------------------- */
function onWindowResize() {
  renderWidth = window.innerWidth;
  renderHeight = window.innerHeight * 15 / 16;
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

import { useTheme } from '../composables/useTheme';

const { theme } = useTheme();

watch(theme, (t) => {
  scene.background = new THREE.Color(
    t === 'dark' ? 0x303541 : 0xb5bbcf
  );
});


/* -------------------------
   Lifecycle
------------------------- */
onMounted(() => {
  // append renderer canvas
  const container = document.getElementById('edit-project-container');
  if (container) container.appendChild(renderer.domElement);
  composer.setSize(renderWidth, renderHeight);
  if (typeof outlinePass3D.setSize === 'function') outlinePass3D.setSize(renderWidth, renderHeight);
  if (typeof outlinePass2D.setSize === 'function') outlinePass2D.setSize(renderWidth, renderHeight);

  window.addEventListener('resize', onWindowResize, { passive: true });
});

onBeforeUnmount(() => {
  // remove listeners
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  try { renderer.domElement.removeEventListener('pointerdown', onPointerDownForDrag); } catch (e) { }
  window.removeEventListener('pointermove', onPointerMoveForDrag);
  window.removeEventListener('pointerup', onPointerUpForDrag);
  // remove any in-progress menu drag listeners
  cancelMenuDragIfAny();

  // remove renderer canvas
  if (renderer && renderer.domElement && renderer.domElement.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  // dispose resources
  if (controls) controls.dispose();
});

/* -------------------------
   Camera switching helpers
------------------------- */
let currMode = 3;
function bindControllerToCamera(cam) {
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

// Импортирай новия компонент най-горе
import SelectionToolbar from '../components/SelectionToolbar.vue';

// --- Нови REFS за Toolbar-а ---
const isToolbarVisible = ref(false);
const toolbarPosition = reactive({ x: 0, y: 0 });

// --- Функция за изчисляване на 2D позиция от 3D обект ---
function updateToolbarPosition() {
  if (selectedObjects.length === 0) {
    isToolbarVisible.value = false;
    return;
  }
  
  const obj = selectedObjects[0];
  if (!obj) return;

  // 1. Намираме центъра на обекта в 3D света
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  
  // Опционално: вдигаме малко нагоре, за да е над обекта
  center.y = box.max.y+3; 

  // 2. Проектираме 3D координатите към 2D екрана
  const vector = center.clone();
  vector.project(activeCamera);

  // 3. Преобразуваме NDC (-1 до +1) към пиксели на екрана
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;

  toolbarPosition.x = (vector.x * halfWidth) + halfWidth;
  toolbarPosition.y = -(vector.y * halfHeight) + halfHeight;
  
  isToolbarVisible.value = true;
}

function animate() {
  fps++;
  if (fps & 1) return;
  if (controls) controls.update();
  
  // Добави това:
  if (selectedObjects.length > 0) {
    updateToolbarPosition();
  }

  composer.render();
}

renderer.setAnimationLoop(animate);

// В `clearSelection()` добави:
function clearSelection() {
  selectedObjects.length = 0;
  activeOutlinePass.selectedObjects = selectedObjects;
  isToolbarVisible.value = false; 
    selectedObjects.length = 0;
  activeOutlinePass.selectedObjects = selectedObjects;
  if (propsMenu) {
    propsMenu.style.opacity = 0;
    propsMenu.style.width = '0';
  }
}


function handleDuplicate() {
  const original = selectedObjects[0];
  if (!original) return;

  const clone = deepCloneScene(original);
  
  // Преместваме клонинга малко встрани, за да се вижда
  clone.position.x += 2;
  clone.position.z += 2;
  
  // Важно: Ново уникално ID
  clone.userData.id = uuidv4(); 
  // Запазваме оригиналния filename за layout-а
  clone.userData.filename = original.userData.filename;

  scene.add(clone);
  addToLayoutData(clone); // Добавяне в JSON структурата

  // Селектираме новия обект
  selectedObjects[0] = clone;
  activeOutlinePass.selectedObjects = selectedObjects;
  updateToolbarPosition();
}

function handleToolbarRotate(angleDeg) {
    // Използваме вече съществуващата функция
    rotateSelectedDelta(angleDeg);
}

function handleFlip(axis) {
  const obj = selectedObjects[0];
  if (!obj) return;

  // Обръщането става чрез умножение на скалата по -1
  if (axis === 'x') {
    obj.scale.x *= -1;
  } else if (axis === 'z') {
    // Приемаме Z за другата хоризонтална ос
    obj.scale.z *= -1;
  }
  
  // Трябва да обновим матрицата, за да се отрази промяната
  obj.updateMatrix();
  
  updateLayoutEntryFromObject(obj);
  saveLayoutDebounced();
}
function handleDelete() {
  const obj = selectedObjects[0];
  if (!obj) return;

  // 1. Премахване от сцената
  scene.remove(obj);

  // 2. Премахване от layoutData (JSON)
  const id = obj.userData.id || obj.userData._id;
  if (id) {
    layoutData.value = layoutData.value.filter(item => item.id !== id);
  }

  // 3. Изчистване на ресурси (по желание, но добра практика)
  obj.traverse(child => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
  });

  // 4. Деселектиране и запазване
  clearSelection();
  saveLayoutDebounced();
}

defineExpose({ startDragFromMenu });

</script>

<style>
@import './EditProjectStyle.css';
</style>
