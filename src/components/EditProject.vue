<template>
  <div id="edit-project-container">
    <div id="undo-redo-container">
      <p @click="undo" :class="canUndo ? '' : 'unavailable'">&#8617;</p>
      <p @click="redo" :class="canRedo ? '' : 'unavailable'">&#8618;</p>
    </div>
    <div v-if="isLoading || isSavingLayout || isModelLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p v-if="isSavingLayout">Saving...</p>
      <p v-else>Loading...</p>
    </div>
    <div id="bottom-menu">
      <p @click="switchTo2D">2D</p>
      <p @click="switchTo3D">3D</p>
    </div>

    <SelectionToolbar :visible="isToolbarVisible" :position="toolbarPosition" @duplicate="handleDuplicate"
      @rotate="handleToolbarRotate" @flip="handleFlip" @delete="handleDelete" />

    <PropsMenu :visible="isPropsMenuVisible" :name="propsName" :details="propsDetails" :rotation="propsRotation"
      :type="propsObjType" @update:texture="useTextureManager" @update:rotation="handlePropsMenuRotation"
      @update:name="handlePropsMenuRename" />
  </div>
</template>

<script setup>
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
import { handleTextureChange } from '../composables/textureManager.js';
// Services & Components
import { loadLayout, updateProjectLayout, addRoom, deleteRoom, updateRoom } from '../services/layoutService';
import { loadRoomsGeometry } from '../services/roomService';
import { createRoomGeometry, createWallGeometry } from '../services/roomService'; // Импортираме service-a
import SelectionToolbar from '../components/SelectionToolbar.vue';
import PropsMenu from '../components/PropsMenu.vue';
import { useTheme } from '../composables/useTheme';
import {
  computeSceneBoundingBox,
  fitPerspectiveCameraToBox,
  fitOrthoCameraToBox
} from '../composables/cameraFit.js';

const { theme } = useTheme();
watch(theme, (t) => { scene.background = new THREE.Color(t === 'dark' ? 0x303541 : 0xb5bbcf); });

import {
  createResizeHandles,
  removeResizeHandles,
  updateHandlePositions
} from './ResizeHandles.js'; // Adjust path as needed
import { initHistory, saveState, undo, redo, canUndo, canRedo } from '../composables/HistoryManager.js'; // Увери се, че пътя е верен

/* ------------Props & State----------- */
const props = defineProps({
  projectData: { type: Object, required: true }
});

const route = useRoute();
const projectId = route.params.id;
const layoutData = ref(Array.isArray(props.projectData.layoutData) ? [...props.projectData.layoutData] : []);
const roomsData = ref(Array.isArray(props.projectData.rooms) ? [...props.projectData.rooms] : []);

// Toolbar State
const isToolbarVisible = ref(false);

const toolbarPosition = reactive({ x: 0, y: 0 });

// Props Menu State
const isPropsMenuVisible = ref(false);
const propsName = ref('');
const propsDetails = ref('');
const propsRotation = ref(0);
const propsObjType = ref('');

// Saving State
const saveLayoutDebounced = debounce(saveLayout, 900);
const updateRoomDebounced = debounce(updateRoom, 900);
const isLoading = ref(true); // Започваме с true, докато зареди първоначално
const isSavingLayout = ref(false);
const isModelLoading = ref(false);

/* ------------Scene Setup------------- */
let renderWidth = window.innerWidth;
let renderHeight = window.innerHeight - 56;
const scene = new THREE.Scene();
scene.background = new THREE.Color(theme.value === 'dark' ? 0x303541 : 0xb5bbcf);

// Cameras
const aspect = renderWidth / renderHeight;
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
perspectiveCamera.position.set(0, 20, 20);

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

// Grid
const planeSize = 30;
const maxHeight = 15;
const gridSize = 30;
const divisions = 40;
const grid = new THREE.GridHelper(gridSize, divisions, 0x999999, 0x888888);
grid.position.y = 0;
grid.name = 'floor-grid';
scene.add(grid);

const manager = new THREE.LoadingManager();


/* ---------------Post-Processing-------------- */
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

async function setupLayout() {
  try {
    isLoading.value = true; isLoading.value = true;
    await loadLayout(layoutData.value, manager, maxHeight, scene, perspectiveCamera, controls, planeSize);
    await loadRoomsGeometry(roomsData.value, scene);

    const box = computeSceneBoundingBox(scene);

    fitPerspectiveCameraToBox(perspectiveCamera, box, controls);
    fitOrthoCameraToBox(orthoCamera, box, renderer);
  }
  catch (e) {
    console.error("Error during layout setup:", e);
    alert("Failed to set up layout. Please try again.");
  } finally {
    isLoading.value = false;
  }
}

async function performRebuild() {
  // А) Почистване на сцената
  const objectsToRemove = [];
  isLoading.value = true;
  try {
    scene.traverse((child) => {
      // Трием всичко, което е наше (стаи, стени, мебели, врати, resize handles)
      const userData = child.userData;
      if (userData && (userData.roomId || userData.type === 'furniture' || userData.isResizeHandle || child.name === 'DoorGroup')) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });

    // Б) Чистене на селекцията
    selectedObjects.length = 0;
    if (activeOutlinePass) activeOutlinePass.selectedObjects = [];

    // В) Презареждане на геометрията от актуалните данни
    // Тъй като 'undo' вече е обновило roomsData.value, просто го подаваме
    await loadRoomsGeometry(roomsData.value, scene);

    await loadLayout(layoutData.value, scene);
  }
  catch (e) {
    console.error("Error during rebuild:", e);
  } finally {
    isLoading.value = false;
  }
}

async function useTextureManager(filename) {
  const selected = selectedObjects[0];

  await handleTextureChange(selected, filename, {
    tiling: { x: 2, y: 2 },
    isRoomObject: isRoomObject, // Твоята съществуваща функция
    //  updateRoomEntry: updateRoomEntryFromObject,
    //  saveChanges: saveRoomChanges
  });
}
/* -------------------------
   CREATE ROOM LOGIC (NEW)
------------------------- */
async function createRoom(width, length, height) {
  // 1. Generate Geometry and the Data Structure (wallsData is inside roomEntry)
  isLoading.value = true;
  try {
    const { roomEntry, objs } = createRoomGeometry(width, length, height);


    const newRoomId = await addRoom(projectId, roomEntry);

    roomEntry.id = newRoomId;
    objs.forEach(obj => {
      obj.userData.roomId = newRoomId;
      scene.add(obj);
    });

    roomsData.value.push(roomEntry);
    saveState(); // Запазваме в историята след създаване на стая

  } catch (error) {
    console.error("Failed to create room:", error);
    alert("Could not save room to database.");
  }
  finally {
    isLoading.value = false;
  }
}

async function createWall(length, height) {
  // 1. Generate Geometry and the Data Structure (wallsData is inside roomEntry)
  isLoading.value = true;
  try {
    const { roomEntry, objs } = createWallGeometry(length, height);
    const newRoomId = await addRoom(projectId, roomEntry);

    roomEntry.id = newRoomId;
    objs.forEach(obj => {
      obj.userData.roomId = newRoomId;
      scene.add(obj);
    });

    roomsData.value.push(roomEntry);
    saveState(); // Запазваме в историята след създаване на стена
  } catch (error) {
    console.error("Failed to create room:", error);
    alert("Could not save room to database.");
  }
  finally {
    isLoading.value = false;
  }
}
/* -------------Raycasting & Selection------------- */
const raycaster = new THREE.Raycaster();
const selectedObjects = [];

function findRootForSelection(obj) {
  let o = obj;
  while (o.parent && o.parent !== scene && o.parent.type !== 'Scene') {
    o = o.parent;
  }
  return o;
}


function snapVec(v, size) {
  return new THREE.Vector3(
    Math.round(v.x / size) * size,
    Math.round(v.y / size) * size,
    Math.round(v.z / size) * size
  );
}

/* ----------------ROOM / FLOOR CONSTRAINTS---------------- */
function getAllFloors() {
  const floors = [];
  scene.traverse((child) => {
    if (child.userData && child.name === 'room_floor') {
      floors.push(child);
    }
  });
  return floors;
}

function constrainPositionToFloors(targetPos, object) {
  const floors = getAllFloors();
  if (floors.length === 0) {
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
const WALL_SNAP_DISTANCE = 1.5; // Meters/Units distance to trigger snap

function findWallSnap(position) {
  let closestDist = Infinity;
  let bestSnap = null;

  // Find all walls in the scene
  const walls = [];
  scene.traverse(o => {
    if (o.userData && o.userData.type === 'wall') walls.push(o);
  });

  walls.forEach(wall => {
    // 1. Convert the drag point to the Wall's Local Space
    // This makes math easier: the wall becomes a straight line along the X axis
    const localPoint = position.clone();
    wall.worldToLocal(localPoint);

    // 2. Get Wall Dimensions (Account for scale)
    const wallWidth = wall.userData.dimensions.width * wall.scale.x;
    const halfWidth = wallWidth / 2;

    // 3. Check if we are "in front" or "behind" the wall (Z axis distance)
    // and if we are within the length of the wall (X axis)
    const distZ = Math.abs(localPoint.z);

    // Allow snapping even if slightly off the ends of the wall (by 0.5m)
    const inRangeX = localPoint.x >= -halfWidth - 0.5 && localPoint.x <= halfWidth + 0.5;

    if (inRangeX && distZ < WALL_SNAP_DISTANCE) {
      if (distZ < closestDist) {
        closestDist = distZ;

        // 4. Calculate the Perfect Snap Point
        // Clamp X so the door doesn't slide off the wall completely
        const clampedX = Math.max(-halfWidth, Math.min(halfWidth, localPoint.x));

        // Create the snap point in Local Space (centered on Z, clamped on X)
        const snapLocal = new THREE.Vector3(clampedX, localPoint.y, 0);

        // Convert back to World Space
        const snapWorld = snapLocal.applyMatrix4(wall.matrixWorld);

        bestSnap = {
          position: snapWorld,
          rotationY: wall.rotation.y, // Copy wall rotation
          wall: wall
        };
      }
    }
  });

  return bestSnap;
}
/* -----------------Drag Existing Objects-------------- */
const DRAG_PLANE_NORMAL = new THREE.Vector3(0, 1, 0);
const GRID_SNAP = { enabled: false, size: 0.1 };
/* ----------------- Resize State ----------------- */
let isResizing = false;
let activeResizeHandle = null; // 'left' or 'right'
let initialResizeWidth = 0;
let initialResizePos = new THREE.Vector3();
let initialClickPoint = new THREE.Vector3();
let dragging = false;
let dragObject = null;
let dragOffset = new THREE.Vector3();
const dragPlane = new THREE.Plane();
const intersectionPoint = new THREE.Vector3();
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
  // Проверка за бутона на мишката (само ляв бутон)
  if (e.button !== undefined && e.button !== 0) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };
  raycaster.setFromCamera(ndc, activeCamera);

  // =========================================================
  // PHASE 1: RESIZE HANDLES (ПРИОРИТЕТ 1)
  // =========================================================
  // Търсим във всички обекти (recursive: true е важно за handles)
  const intersects = raycaster.intersectObjects(scene.children, true);

  // Търсим дали сме цъкнали върху обект маркиран като handle
  const handleHit = intersects.find(hit => hit.object.userData.isResizeHandle);

  if (handleHit) {
    e.preventDefault();
    isResizing = true;
    controls.enabled = false; // Спираме въртенето на камерата

    activeResizeHandle = handleHit.object.userData.side;
    let wall = handleHit.object.userData.wall;

    // Fallback: ако handle-ът е загубил референцията към стената
    if (!wall && selectedObjects.length > 0) {
      wall = selectedObjects[0];
    }

    // Запазваме начални данни за математиката на resize
    initialResizeWidth = wall.userData.dimensions.width;
    initialResizePos = wall.position.clone();

    // Нагласяме равнината за resize (хоризонтална)
    const wallWorldPos = new THREE.Vector3();
    wall.getWorldPosition(wallWorldPos);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), wallWorldPos);

    // Запазваме точката на кликване
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
      initialClickPoint.copy(intersectionPoint);
    }

    // ВАЖНО: Спираме дотук! Не изпълняваме кода за Drag надолу.
    return;
  }

  // =========================================================
  // PHASE 2: OBJECT DRAG (ПРИОРИТЕТ 2)
  // =========================================================
  const hit = firstIntersectableObjectFromPointer(e.clientX, e.clientY);

  // Ако не сме уцелили нищо -> чистим селекцията
  if (!hit) {
    clearSelection();
    return;
  }

  const rawPicked = hit.object;
  const root = findRootForSelection(rawPicked);

  // Логика за Floor / Room selection
  if (root.userData && root.userData.type === 'floor') {
    const roomId = root.userData.roomId;
    selectedObjects.length = 0;
    scene.traverse((child) => {
      if (child.userData && child.userData.roomId === roomId) {
        selectedObjects.push(child);
      }
    });
    dragObject = root;
  }
  else if (root.userData && root.userData.type === 'wall') {
    if (!selectedObjects.includes(root)) {
      selectedObjects.length = 0;
      selectedObjects.push(root);

      // Намираме всички обекти, закачени за тази стена
      const wallId = root.userData.id;
      if (wallId) {
        scene.traverse((child) => {
          if (child.userData && child.userData.wallId === wallId && child !== root) {
            selectedObjects.push(child);
          }
        });
      }
    }
    dragObject = root;
  }
  else {
    // Multi-selection logic: запазваме групата, ако кликнем върху вече селектиран
    if (!selectedObjects.includes(root)) {
      selectedObjects.length = 0;
      selectedObjects.push(root);
    }
    dragObject = root;
  }

  // Grid check
  if (root.name === 'floor-grid' && !root.userData.roomId) {
    clearSelection();
    return;
  }

  // Start Dragging
  dragging = true;
  controls.enabled = false;

  const objWorldPos = new THREE.Vector3();
  dragObject.getWorldPosition(objWorldPos);

  // Нагласяме равнината за Drag
  dragPlane.setFromNormalAndCoplanarPoint(DRAG_PLANE_NORMAL || new THREE.Vector3(0, 1, 0), objWorldPos);

  // Изчисляваме Drag Offset
  const intersectionPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
    dragOffset.copy(objWorldPos).sub(intersectionPoint);
  } else {
    dragging = false; // Fail-safe
    return;
  }

  // UI Updates (скриваме хендълите по време на влачене, ако искаш)
  activeOutlinePass.selectedObjects = selectedObjects.filter(obj => !obj.userData.isResizeHandle);
  updateSelectionUI(dragObject);

  // Ако имаш функция за показване на хендъли:
  if (typeof updateHandlePositions === 'function') {
    updateHandlePositions(dragObject);
  }

  e.preventDefault();
}


function onPointerMoveForDrag(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };
  raycaster.setFromCamera(ndc, activeCamera);

  // =========================================================
  // PHASE 1: RESIZE LOGIC (Ако flag-ът е вдигнат от pointerDown)
  // =========================================================
  if (isResizing && selectedObjects[0]) {
    const wall = selectedObjects[0]; // Взимаме стената
    const intersectionPoint = new THREE.Vector3();

    // Проверяваме пресечната точка с равнината
    if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

    // Вектор на движение на мишката
    const mouseVector = new THREE.Vector3().subVectors(intersectionPoint, initialClickPoint);

    // Изчисляваме посоката на стената в света
    const wallDirection = new THREE.Vector3(1, 0, 0);
    wallDirection.applyQuaternion(wall.quaternion).normalize();

    // Проектираме движението на мишката върху посоката на стената
    let delta = mouseVector.dot(wallDirection);

    // Обръщаме знака, ако дърпаме левия хендъл
    if (activeResizeHandle === 'left') delta = -delta;

    // Смятаме новата ширина
    let newWidth = initialResizeWidth + delta;
    if (newWidth < 0.2) newWidth = 0.2; // Минимум ширина

    // Прилагаме Scale (за визуално разтегляне)
    // Забележка: Това зависи как е направен wall geometry. 
    // Ако е BoxGeometry(1,1,1), scale.x е дължината.
    // Ако е BoxGeometry(width, ...), тогава scale е фактор.
    // Приемам, че ползваш scale logic от твоя стар код:
    const scaleFactor = newWidth / initialResizeWidth;
    wall.scale.x = scaleFactor;

    // Коригираме позицията, за да стои едната страна "закована"
    const widthDiff = newWidth - initialResizeWidth;
    const shiftAmount = widthDiff / 2;
    const shiftVector = wallDirection.clone().multiplyScalar(shiftAmount);

    if (activeResizeHandle === 'left') shiftVector.negate();

    // Новата позиция на стената
    const newPos = initialResizePos.clone().add(shiftVector);
    wall.position.copy(newPos);

    // Обновяваме UI
    updateHandlePositions(wall);
    updateSelectionUI(wall);

    // ВАЖНО: Връщаме се тук, за да НЕ влачим стената като цяло!
    return;
  }

  // =========================================================
  // PHASE 2: DRAG / COLLISION LOGIC
  // =========================================================
  if (!dragging || !dragObject) return;

  const intersectionPoint = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

  // 1. Запазваме стара позиция (за групата)
  const oldPos = dragObject.position.clone();

  // 2. Смятаме желаната позиция (X и Z)
  let targetWorld = intersectionPoint.clone().add(dragOffset);

  // --- ПРОМЯНА: ВМЕСТО ДА ПАЗИМ СТАРИЯ Y, ТЪРСИМ ПОДА ---

  // Проверяваме дали влачим мебел (не стена/врата)
  const isFurniture = !['wall', 'door', 'window', 'floor'].includes(dragObject.userData.type);

  if (isFurniture) {
    // Изчисляваме Y спрямо пода под новите X и Z
    targetWorld.y = getFloorLevelAt(targetWorld.x, targetWorld.z, dragObject);
  } else {
    // За други обекти пазим старата височина
    const currentWorldPos = new THREE.Vector3();
    dragObject.getWorldPosition(currentWorldPos);
    targetWorld.y = currentWorldPos.y;
  }

  // 3. Grid Snap
  if (GRID_SNAP.enabled && GRID_SNAP.size > 0) {
    const snapped = snapVec(targetWorld, GRID_SNAP.size);
    targetWorld.copy(snapped);
    targetWorld.y = currentWorldPos.y;
  }

  // 4. Колизия (Collision)
  // Изключваме врати и прозорци
  const isDoorOrWindow = dragObject.userData.type === 'door' ||
    dragObject.userData.type === 'window';

  // Ако не е врата/прозорец -> пускаме функцията за колизия
  // (Работи и за стени, и за мебели)
  if (!isDoorOrWindow) {
    targetWorld = getSafePosition(targetWorld, dragObject);
  }

  // 5. Прилагане (Local conversion)
  if (dragObject.parent) {
    dragObject.parent.worldToLocal(targetWorld);
  }
  dragObject.position.copy(targetWorld);

  // 6. Multi-selection update
  if (selectedObjects.length > 1) {
    const realDeltaX = dragObject.position.x - oldPos.x;
    const realDeltaZ = dragObject.position.z - oldPos.z;

    selectedObjects.forEach(obj => {
      if (obj !== dragObject) {
        obj.position.x += realDeltaX;
        obj.position.z += realDeltaZ;
      }
    });
  }

  // 7. Door Snapping
  if (isDoorOrWindow) { // Ползваме общия флаг
    const snap = findWallSnap(dragObject.position);
    if (snap) {
      dragObject.position.x = snap.position.x;
      dragObject.position.z = snap.position.z;
      dragObject.rotation.y = snap.rotationY;
      if (snap.wall.userData) {
        dragObject.userData.roomId = snap.wall.userData.roomId;
        dragObject.userData.wallId = snap.wall.userData.id;
      }
    }
  }


  // UI Updates
  updateSelectionUI(dragObject);
  if (typeof updateHandlePositions === 'function') {
    updateHandlePositions(dragObject);
  }

  e.preventDefault();
}

function getFloorLevelAt(x, z, object) {
  // 1. Пускаме лъч отвисоко надолу на координати X, Z
  const raycasterDown = new THREE.Raycaster();
  raycasterDown.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));

  // 2. Търсим само подове
  const floors = [];
  scene.traverse(o => {
    if (o.userData && o.userData.type === 'floor') floors.push(o);
  });

  const intersects = raycasterDown.intersectObjects(floors, false);

  if (intersects.length > 0) {
    const floorHit = intersects[0];
    const floorY = floorHit.point.y;

    // 3. Изчисляваме отместването (Offset), за да стъпи мебелта на пода, а не центърът ѝ
    // Box3 ни дава границите на обекта в световни координати
    const box = new THREE.Box3().setFromObject(object);
    // Разликата между текущата позиция (pivot) и дъното на кутията
    const bottomOffset = object.position.y - box.min.y;

    return floorY + bottomOffset;
  }

  // Ако няма под, връщаме текущата височина (или 0)
  return object.position.y;
}

function onPointerUpForDrag(e) {
  // =========================================================
  // PHASE 1: FINALIZE RESIZE
  // =========================================================
  if (isResizing && selectedObjects[0]) {
    const wall = selectedObjects[0];
    controls.enabled = true;
    isResizing = false;

    // Bake scale into geometry
    const finalScale = wall.scale.x;
    const originalWidth = wall.userData.dimensions.width;
    const finalWidth = originalWidth * finalScale;

    wall.userData.dimensions.width = finalWidth;
    wall.scale.x = 1;

    const newGeo = new THREE.BoxGeometry(
      finalWidth,
      wall.userData.dimensions.height,
      wall.userData.dimensions.depth
    );

    wall.geometry.dispose();
    wall.geometry = newGeo;

    // Re-add handles to new geometry
    createResizeHandles(wall, scene);

    // Save
    updateRoomEntryFromObject(wall);
    saveRoomChanges(wall);
    saveState(); // Запазваме в историята след resize
    return;
  }
  // =========================================================
  // PHASE 2: EXISTING DRAG END LOGIC (FIXED)
  // =========================================================
  if (dragging) {
    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { }
    controls.enabled = true;

    // 1. Обновяваме данните (стейта) за ВСИЧКИ преместени обекти
    selectedObjects.forEach(obj => {
      if (isRoomObject(obj)) {
        updateRoomEntryFromObject(obj);
      } else {
        updateLayoutEntryFromObject(obj);
      }
    });

    // 2. Запазваме в базата спрямо типа на основния влачен обект
    if (isRoomObject(dragObject)) {
      // Тъй като вече обновихме всички стени в стейта на стаята, 
      // това извикване ще изпрати целия обновен масив към базата!
      saveRoomChanges(dragObject);
    } else {
      saveLayoutDebounced();
    }

    saveState(); // Запазваме в историята след всяко местене
    dragging = false;
    dragObject = null;
  }
}
function handlePropsMenuRename(newName) {
  const obj = selectedObjects[0];
  if (!obj) return;

  obj.name = newName;

  // 2. Update the reactive variable bound to the menu
  propsName.value = newName;

  // 3. Save to your data store (Room/Layout)
  if (isRoomObject(obj)) {
    updateRoomEntryFromObject(obj);
    saveRoomChanges(obj);
  } else {
    updateLayoutEntryFromObject(obj);
    saveLayoutDebounced();
  }
  saveState(); // Запазваме в историята след преименуване
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

function getSafePosition(proposedWorldPos, objectToMove) {
  // ПРОМЯНА ТУК: Филтрираме стените, като махаме текущия обект (ако и той е стена)
  const walls = scene.children.filter(o =>
    (o.userData.type === 'wall' && o !== objectToMove && ((objectToMove.userData.type === 'floor' && o.userData.roomId !== objectToMove.userData.roomId) || objectToMove.userData.type !== 'floor'))
  );

  let safePos = proposedWorldPos.clone();

  // 1. Изчисляваме AABB на обекта, който местим
  const objBox = new THREE.Box3().setFromObject(objectToMove);

  // Взимаме 4-те ъгъла (в световни координати)
  const worldCorners = [
    new THREE.Vector3(objBox.min.x, objBox.min.y, objBox.min.z),
    new THREE.Vector3(objBox.min.x, objBox.min.y, objBox.max.z),
    new THREE.Vector3(objBox.max.x, objBox.min.y, objBox.min.z),
    new THREE.Vector3(objBox.max.x, objBox.min.y, objBox.max.z),
  ];

  for (const wall of walls) {
    if (!wall.geometry.boundingBox) wall.geometry.computeBoundingBox();
    const wallMin = wall.geometry.boundingBox.min;
    const wallMax = wall.geometry.boundingBox.max;

    // Центърът на обекта в локалната система на стената
    const localCenter = wall.worldToLocal(safePos.clone());

    // Изчисляваме колко е "голям" нашият обект спрямо тази стена
    const currentWorldPos = objectToMove.position;
    const offset = new THREE.Vector3().subVectors(safePos, currentWorldPos);

    let minObjZ = Infinity, maxObjZ = -Infinity;
    let minObjX = Infinity, maxObjX = -Infinity;

    worldCorners.forEach(corner => {
      const predictedCornerWorld = corner.clone().add(offset);
      const localCorner = wall.worldToLocal(predictedCornerWorld);

      if (localCorner.z < minObjZ) minObjZ = localCorner.z;
      if (localCorner.z > maxObjZ) maxObjZ = localCorner.z;
      if (localCorner.x < minObjX) minObjX = localCorner.x;
      if (localCorner.x > maxObjX) maxObjX = localCorner.x;
    });

    const objectHalfWidth = (maxObjX - minObjX) / 2;
    const objectHalfDepth = (maxObjZ - minObjZ) / 2;

    // Параметри на стената
    const wallHalfLength = (wallMax.x - wallMin.x) / 2;
    const wallHalfThickness = (wallMax.z - wallMin.z) / 2;

    // ПРОВЕРКИ
    const xLimit = wallHalfLength + objectHalfWidth;
    const zLimit = wallHalfThickness + objectHalfDepth;

    // Ако сме в рамките на дължината и дълбочината на стената
    if (Math.abs(localCenter.x) <= xLimit && Math.abs(localCenter.z) < zLimit) {

      const sign = Math.sign(localCenter.z) || 1;

      // Избутваме!
      localCenter.z = sign * zLimit;

      const worldFixed = wall.localToWorld(localCenter);
      safePos.x = worldFixed.x;
      safePos.z = worldFixed.z;
    }
  }

  return safePos;
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
  alert(draggedItem.filename);
  const url = `${draggedItem.filename}`;
  let gltf;
  try {
    isModelLoading.value = true;
    const gltfPromise = loadGLTF(url);
    window.addEventListener('pointermove', onMenuDragMove, { passive: false });
    window.addEventListener('pointerup', onMenuDragEnd, { passive: false });
    gltf = await gltfPromise;
  } catch (err) {
    alert('Failed to load model');
    cancelMenuDragIfAny();
    return;
  }
  finally {
    isModelLoading.value = false;
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
    // 1. Първо ограничаваме X и Z да са в рамките на стаята (старата логика)
    const constrained = constrainPositionToFloors(posWorld, finalObject);

    // 2. НОВА ЛОГИКА: Намираме височината на пода за тези координати
    // Използваме функцията getFloorLevelAt, която дефинирахме в предишната стъпка
    const floorY = getFloorLevelAt(constrained.x, constrained.z, finalObject);

    // 3. Задаваме позицията: X и Z от constrain, Y от пода
    finalObject.position.set(constrained.x, floorY, constrained.z);
  }

  // ... останалата част от функцията си остава същата ...
  finalObject.name = draggedItem.name;
  finalObject.userData = { filename: draggedItem.filename }; // или както си го задал

  // Важно: увери се, че обектът е добавен към сцената
  scene.add(finalObject);

  // Ако имаш специфична логика за layout data
  addToLayoutData(finalObject);

  selectedObjects.length = 0;
  selectedObjects.push(finalObject);

  // Обновяване на UI/Outline
  if (activeOutlinePass) {
    activeOutlinePass.selectedObjects = selectedObjects;
  }
  updateSelectionUI(finalObject);

  // Почистване
  if (previewObject && previewObject.parent) {
    previewObject.parent.remove(previewObject);
  }
  previewObject = null;
  finalObject = null;
  draggingFromMenu = false;

  if (controls) controls.enabled = true;
}

/* -------------------------
   Layout Data & Persistence
------------------------- */
/* -------------------------
   ROOM DATA SYNC LOGIC
------------------------- */

// Check if an object belongs to a room (has a roomId)
function isRoomObject(obj) {
  return obj.userData.type == 'wall' || obj.userData.type === 'floor' || obj.userData.type === 'door';
}

// Sync 3D Mesh position/rotation to the Vue Ref (roomsData)
function updateRoomEntryFromObject(obj) {
  if (!isRoomObject(obj)) return;
  //alert('updating room entry from object');
  const roomId = obj.userData.roomId;
  const wallId = obj.userData.id;

  // Find the room
  const roomIndex = roomsData.value.findIndex(r => r._id === roomId || r.id === roomId);
  if (roomIndex === -1) return;

  // Find the specific wall/floor within that room
  const wallIndex = roomsData.value[roomIndex].wallsData.findIndex(w => w.id === wallId);
  if (wallIndex === -1) return;

  // Update the data model
  const wallEntry = roomsData.value[roomIndex].wallsData[wallIndex];
  wallEntry.position = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
  if (obj.name) wallEntry.name = obj.name;
  // Convert Euler to simple object if needed, or just store x,y,z
  wallEntry.rotation = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
}

// Trigger the API call
async function saveRoomChanges(obj) {
  if (!isRoomObject(obj)) return;
  const roomId = obj.userData.roomId;

  // Get the updated data for this specific room
  const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
  if (room) {
    await updateRoomDebounced(projectId, roomId, room.wallsData);
  }
}

function addToLayoutData(object3D) {
  const entry = {
    id: uuidv4(),
    name: object3D.name,
    filename: object3D.userData.filename,
    position: { x: object3D.position.x, y: object3D.position.y, z: object3D.position.z },
    rotation: { x: object3D.rotation.x, y: object3D.rotation.y, z: object3D.rotation.z },
    scale: { x: object3D.scale.x, y: object3D.scale.y, z: object3D.scale.z }
  };
  object3D.userData.id = entry.id;
  layoutData.value.push(entry);
  saveLayoutDebounced();
}

function updateLayoutEntryFromObject(object3D) {
  if (!object3D || !object3D.userData) return;
  const id = object3D.userData.id || object3D.userData._id; if (!id) return;
  const entry = layoutData.value.find(x => x.id === id); if (!entry) return;
  entry.name = object3D.name;
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
function updateSelectionUI(obj) {
  if (!obj) {
    clearSelection();
    return;
  }
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  center.y = box.max.y + 3;
  const vector = center.clone();
  vector.project(activeCamera);
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  toolbarPosition.x = (vector.x * halfWidth) + halfWidth;
  toolbarPosition.y = -(vector.y * halfHeight) + halfHeight + 0.1;
  isToolbarVisible.value = true;

  if (obj.userData.type === 'wall') {
    createResizeHandles(obj, scene);
  } else {
    removeResizeHandles();
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  isPropsMenuVisible.value = true;
  propsName.value = obj.name || 'Unknown Object';
  propsObjType.value = obj.userData.type || 'unknown';
  propsDetails.value = `w:${size.x.toFixed(2)} h:${size.y.toFixed(2)} d:${size.z.toFixed(2)}`;
  const degrees = Math.round((obj.rotation.y * 180 / Math.PI));
  propsRotation.value = degrees;
}

function clearSelection() {
  selectedObjects.length = 0;
  activeOutlinePass.selectedObjects = selectedObjects;
  removeResizeHandles();
  isToolbarVisible.value = false;
  isPropsMenuVisible.value = false;
}

function handlePropsMenuRotation(newDegrees) {
  const obj = selectedObjects[0];
  if (!obj) return;

  obj.rotation.y = newDegrees * Math.PI / 180;
  propsRotation.value = newDegrees;

  if (isRoomObject(obj)) {
    updateRoomEntryFromObject(obj);
    saveRoomChanges(obj);
  } else {
    updateLayoutEntryFromObject(obj);
    saveLayoutDebounced();
  }
  saveState(); // Запазваме в историята след ротация от менюто
}

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
  if (selectedObjects.length === 0) return;

  const angleRad = angleDeg * Math.PI / 180;

  // If we selected a whole room (more than 1 object)
  if (selectedObjects.length > 1) {
    // 1. Calculate Center of the Room
    const box = new THREE.Box3();
    selectedObjects.forEach(obj => box.expandByObject(obj));
    const center = box.getCenter(new THREE.Vector3());

    // 2. Rotate every object around that center
    selectedObjects.forEach(obj => {
      // Move to origin
      obj.position.sub(center);

      // Rotate position
      const x = obj.position.x;
      const z = obj.position.z;
      obj.position.x = x * Math.cos(angleRad) - z * Math.sin(angleRad);
      obj.position.z = x * Math.sin(angleRad) + z * Math.cos(angleRad);

      // Rotate mesh itself
      obj.rotation.y += angleRad;

      // Move back
      obj.position.add(center);

      // Save changes per object
      updateRoomEntryFromObject(obj);
    });

    // Save one final time (using the floor/anchor to trigger the API call)
    const anchor = selectedObjects.find(o => o.name === 'room_floor') || selectedObjects[0];
    saveRoomChanges(anchor);

  } else {
    // Standard Single Object Rotation
    const obj = selectedObjects[0];
    obj.rotation.y += angleRad;

    if (isRoomObject(obj)) {
      updateRoomEntryFromObject(obj);
      saveRoomChanges(obj);
    } else {
      updateLayoutEntryFromObject(obj);
      saveLayoutDebounced();
    }
  }
  saveState(); // Запазваме в историята след ротация от тулбара
  updateSelectionUI(selectedObjects[0]);
}

function handleFlip(axis) {
  const obj = selectedObjects[0];
  if (!obj) return;

  if (axis === 'x') obj.scale.x *= -1;
  else if (axis === 'z') obj.scale.z *= -1;
  obj.updateMatrix();

  if (isRoomObject(obj)) {
    // Note: If you flip a wall, you might need to handle dimensions logic depending on your geometry
    updateRoomEntryFromObject(obj);
    saveRoomChanges(obj);
  } else {
    updateLayoutEntryFromObject(obj);
    saveLayoutDebounced();
  }
  saveState(); // Запазваме в историята след флип от тулбара
  updateSelectionUI(obj);
}
async function handleDelete() {
  const obj = selectedObjects[0];
  if (!obj) return;

  const roomId = obj.userData.roomId; // Check if it belongs to a room
  const objectId = obj.userData.id;   // The specific ID of this wall/floor

  // ===============================================
  // SCENARIO 1: IT IS A ROOM OBJECT (Wall or Floor)
  // isRoomObject
  if (isRoomObject(obj)) {

    // --- A: IT IS THE FLOOR (Delete Entire Room) ---
    if (obj.userData.type === 'floor') {
      if (!confirm("Deleting the floor will remove the entire room. Continue?")) return;

      try {
        // 1. Call API to delete the whole room
        await deleteRoom(projectId, roomId);

        // 2. Update Local State: Remove the whole room object
        roomsData.value = roomsData.value.filter(r => r._id !== roomId || r.id !== roomId);

        // 3. Scene Cleanup: Find ALL meshes (walls + floor) for this room and remove them
        const objectsToRemove = [];
        scene.traverse((child) => {
          if (child.userData && child.userData.roomId === roomId) {
            objectsToRemove.push(child);
          }
        });

        objectsToRemove.forEach((mesh) => {
          scene.remove(mesh);
          disposeObject(mesh);
        });

      } catch (err) {
        console.error("Error deleting room:", err);
        alert("Failed to delete room");
      }
    }

    // --- B: IT IS A WALL (Update Room to remove just this wall) ---
    else if (obj.userData.type === 'wall' || obj.userData.type === 'door') {
      try {
        // 1. Find the current room in our state
        const roomIndex = roomsData.value.findIndex(r => r._id === roomId || r.id === roomId);
        if (roomIndex === -1) return;

        const currentRoom = roomsData.value[roomIndex];

        // 2. Create a new array EXCLUDING the selected wall
        const updatedWallsData = currentRoom.wallsData.filter(w => w.id !== objectId);

        // 3. Call API: We are UPDATING the room, not deleting the room entity
        // Note: We use the immediate updateRoom, not the debounced one, for instant feedback
        await updateRoomDebounced(projectId, roomId, updatedWallsData);

        // 4. Update Local State
        roomsData.value[roomIndex].wallsData = updatedWallsData;

        // 5. Scene Cleanup: Remove ONLY the selected wall mesh
        scene.remove(obj);
        disposeObject(obj);

      } catch (err) {
        console.error("Error deleting wall:", err);
        alert("Failed to delete wall");
      }
    }
  }
  else {
    // 1. Remove from scene
    scene.remove(obj);
    disposeObject(obj);

    // 2. Update Layout State
    const id = obj.userData.id || obj.userData._id;
    if (id) {
      layoutData.value = layoutData.value.filter(item => item.id !== id);
    }

    // 3. Save Layout
    saveLayoutDebounced();
  }

  // Final UI Cleanup
  clearSelection();
}
// Helper to find a wall in the scene
function findTargetWall() {
  // 1. Priority: Is the user currently selecting a wall?
  if (selectedObjects.length > 0) {
    const obj = selectedObjects[0];
    // Check if the selected object is a wall (based on name or userData)
    // Adjust 'Wall' check based on how your createRoomGeometry names them
    if (obj.userData && obj.userData.type === 'wall') {
      return obj;
    }
  }

  // 2. Fallback: Find the first wall in the scene
  let foundWall = null;
  scene.traverse((child) => {
    if (!foundWall && child.userData && child.userData.type === 'wall') {
      foundWall = child;
    }
  });
  return foundWall;
}

async function addDoorToWallCenter(doorData) {
  isLoading.value = true;
  try {
    if (!doorData || !doorData.filename) return;

    const wall = findTargetWall();
    if (!wall) { alert("Please select a wall first."); return; }

    const roomId = wall.userData.roomId;
    const targetWallId = wall.userData.id;
    if (!roomId) return;

    // 1. Load GLB
    let gltf;
    try {
      gltf = await loadGLTF(doorData.filename);
    } catch (err) {
      console.error('Failed to load door', err);
      return;
    }

    // =========================================================
    // НОВА ЛОГИКА ЗА ДВОЙНА ВРАТА (GROUP)
    // =========================================================

    // А) Създаваме контейнер (Група)
    const doorGroup = new THREE.Group();

    // Б) Подготвяме Копие 1 (Предна част)
    const sideA = deepCloneScene(gltf.scene);
    sideA.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });

    // В) Подготвяме Копие 2 (Задна част)
    const sideB = deepCloneScene(gltf.scene); // Клонираме отново за второто копие
    sideB.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });

    // Завъртаме втората врата на 180 градуса, за да сочи към другата стая
    //sideB.rotation.y = Math.PI;
    // Г) Scale Logic (Прилагаме мащаба върху децата, или върху групата)
    // По-безопасно е да мащабираме децата, ако искаме групата да остане 1:1:1, 
    // но за по-лесно тук ще мащабираме мешовете вътре.
    const rawBox = new THREE.Box3().setFromObject(sideA);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (rawSize.x > 0 && rawSize.y > 0) {
      const scaleX = doorData.width / rawSize.x;
      const scaleY = doorData.height / rawSize.y;
      const scaleZ = 0.3 / rawSize.z; // Дълбочина на вратата

      sideA.scale.set(scaleX, scaleY, scaleZ);
      sideB.scale.set(scaleX, scaleY, scaleZ * -1);
    }

    // Д) Добавяме двете части в групата
    doorGroup.add(sideA);
    doorGroup.add(sideB);

    // =========================================================
    // ПОЗИЦИОНИРАНЕ НА ГРУПАТА
    // =========================================================
    const wallBox = new THREE.Box3().setFromObject(wall);
    const wallCenter = wallBox.getCenter(new THREE.Vector3());

    // Групата отива в центъра на стената
    doorGroup.position.set(wallCenter.x, getFloorLevelAt(wallCenter.x, wallCenter.z, doorGroup), wallCenter.z);
    doorGroup.rotation.copy(wall.rotation);

    // Metadata setup (Слагаме данните на ГРУПАТА, не на мешовете)
    const newDoorId = uuidv4();

    doorGroup.name = "DoorGroup";
    doorGroup.userData = {
      id: newDoorId,
      filename: doorData.filename,
      type: 'door',
      roomId: roomId,
      wallId: targetWallId,
    };

    scene.add(doorGroup);

    // UI Selection update
    selectedObjects.length = 0;
    selectedObjects.push(doorGroup); // Селектираме групата!
    activeOutlinePass.selectedObjects = selectedObjects;
    updateSelectionUI(doorGroup);

    // =========================================================
    // ЗАПИС В БАЗАТА (Записваме само ГРУПАТА веднъж)
    // =========================================================
    const room = roomsData.value.find(r => ((r._id && String(r._id) === String(roomId))) || (r.id && String(r.id) === String(roomId)));

    if (room) {
      // В базата записваме позицията на групата.
      // Няма нужда да казваме на базата, че има 2 меша вътре. Това е визуален детайл.
      const doorEntry = {
        id: newDoorId,
        type: 'door',
        wallId: targetWallId,
        roomId: roomId,
        filename: doorData.filename,
        // Записваме мащаба на вътрешния обект (sideA), за да знаем колко да ги разпънем после
        scale: { x: sideA.scale.x, y: sideA.scale.y, z: sideA.scale.z },
        position: { x: doorGroup.position.x, y: doorGroup.position.y, z: doorGroup.position.z },
        rotation: { x: doorGroup.rotation.x, y: doorGroup.rotation.y, z: doorGroup.rotation.z }
      };

      if (!room.wallsData) room.wallsData = [];
      room.wallsData.push(doorEntry);

      try {
        const apiRoomId = room.id || room._id;
        await updateRoom(projectId, apiRoomId, room.wallsData);
      } catch (e) {
        console.error("Error saving door:", e);
      }
    }
  }
  catch (err) {
    console.error("Error in addDoorToWallCenter:", err);
  }
  finally {
    isLoading.value = false;
  }
}


async function addWindowToWallCenter(WindowData) {
  isLoading.value = true;
  try {
    if (!WindowData || !WindowData.filename) return;

    const wall = findTargetWall();
    if (!wall) { alert("Please select a wall first."); return; }

    const roomId = wall.userData.roomId;
    const targetWallId = wall.userData.id;
    if (!roomId) return;

    // 1. Load GLB
    let gltf;
    try {
      gltf = await loadGLTF(WindowData.filename);
    } catch (err) {
      console.error('Failed to load Window', err);
      return;
    }

    // =========================================================
    // НОВА ЛОГИКА ЗА ДВОЙНА ВРАТА (GROUP)
    // =========================================================

    // А) Създаваме контейнер (Група)
    const WindowGroup = new THREE.Group();

    // Б) Подготвяме Копие 1 (Предна част)
    const sideA = deepCloneScene(gltf.scene);
    sideA.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });

    // В) Подготвяме Копие 2 (Задна част)
    const sideB = deepCloneScene(gltf.scene); // Клонираме отново за второто копие
    sideB.traverse(n => { if (n.isMesh) makeFinalMaterials(n); });

    // Завъртаме втората врата на 180 градуса, за да сочи към другата стая
    //sideB.rotation.y = Math.PI;
    // Г) Scale Logic (Прилагаме мащаба върху децата, или върху групата)
    // По-безопасно е да мащабираме децата, ако искаме групата да остане 1:1:1, 
    // но за по-лесно тук ще мащабираме мешовете вътре.
    const rawBox = new THREE.Box3().setFromObject(sideA);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (rawSize.x > 0 && rawSize.y > 0) {
      const scaleX = WindowData.width / rawSize.x;
      const scaleY = WindowData.height / rawSize.y;
      const scaleZ = 0.3 / rawSize.z; // Дълбочина на вратата

      sideA.scale.set(scaleX, scaleY, scaleZ);
      sideB.scale.set(scaleX, scaleY, scaleZ * -1);
    }

    // Д) Добавяме двете части в групата
    WindowGroup.add(sideA);
    WindowGroup.add(sideB);

    // =========================================================
    // ПОЗИЦИОНИРАНЕ НА ГРУПАТА
    // =========================================================
    const wallBox = new THREE.Box3().setFromObject(wall);
    const wallCenter = wallBox.getCenter(new THREE.Vector3());

    // Групата отива в центъра на стената
    WindowGroup.position.set(wallCenter.x, getFloorLevelAt(wallCenter.x, wallCenter.z, WindowGroup) + WindowData.heightFromFloor, wallCenter.z);
    WindowGroup.rotation.copy(wall.rotation);

    // Metadata setup (Слагаме данните на ГРУПАТА, не на мешовете)
    const newWindowId = uuidv4();

    WindowGroup.name = "WindowGroup";
    WindowGroup.userData = {
      id: newWindowId,
      filename: WindowData.filename,
      type: 'window',
      roomId: roomId,
      wallId: targetWallId,
    };

    scene.add(WindowGroup);

    // UI Selection update
    selectedObjects.length = 0;
    selectedObjects.push(WindowGroup); // Селектираме групата!
    activeOutlinePass.selectedObjects = selectedObjects;
    updateSelectionUI(WindowGroup);

    // =========================================================
    // ЗАПИС В БАЗАТА (Записваме само ГРУПАТА веднъж)
    // =========================================================
    const room = roomsData.value.find(r => ((r._id && String(r._id) === String(roomId))) || (r.id && String(r.id) === String(roomId)));

    if (room) {
      // В базата записваме позицията на групата.
      // Няма нужда да казваме на базата, че има 2 меша вътре. Това е визуален детайл.
      const WindowEntry = {
        id: newWindowId,
        type: 'window',
        wallId: targetWallId,
        roomId: roomId,
        filename: WindowData.filename,
        // Записваме мащаба на вътрешния обект (sideA), за да знаем колко да ги разпънем после
        scale: { x: sideA.scale.x, y: sideA.scale.y, z: sideA.scale.z },
        position: { x: WindowGroup.position.x, y: WindowGroup.position.y, z: WindowGroup.position.z },
        rotation: { x: WindowGroup.rotation.x, y: WindowGroup.rotation.y, z: WindowGroup.rotation.z }
      };

      if (!room.wallsData) room.wallsData = [];
      room.wallsData.push(WindowEntry);

      try {
        const apiRoomId = room.id || room._id;
        await updateRoom(projectId, apiRoomId, room.wallsData);
      } catch (e) {
        console.error("Error saving window:", e);
      }
    }
  }
  catch (err) {
    console.error("Error in addWindowToWallCenter:", err);
  }
  finally {
    isLoading.value = false;
  }
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
  activeCamera.lookAt(0, 0, 0);
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
const emit = defineEmits(['has-walls']);

// 2. Watch for changes (Add/Delete)
watch(roomsData, (newRooms) => {
  emit('has-walls', newRooms.length > 0);
}, { deep: true });

var fps = true;
function animate() {
  fps = !fps;
  if (fps) return;
  if (controls) controls.update();
  if (selectedObjects.length > 0) updateSelectionUI(selectedObjects[0]);
  composer.render();
}
function disposeObject(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
  });
}
onMounted(() => {
  const container = document.getElementById('edit-project-container');
  if (container) container.appendChild(renderer.domElement);
  window.addEventListener('resize', onWindowResize, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  renderer.domElement.addEventListener('pointerdown', onPointerDownForDrag, { passive: false });
  window.addEventListener('pointermove', onPointerMoveForDrag, { passive: false });
  window.addEventListener('pointerup', onPointerUpForDrag, { passive: false });
  renderer.setAnimationLoop(animate);

  setupLayout();
  emit('has-walls', roomsData.value.length > 0);
  initHistory(roomsData, performRebuild);

  // Слушане за Ctrl+Z / Ctrl+Y
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      undo();
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
      e.preventDefault();
      redo();
    }
  });
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

// EXPOSE createRoom so the parent can call it
defineExpose({ startDragFromMenu, createRoom, addDoorToWallCenter, createWall, addWindowToWallCenter });
</script>

<style scoped>
@import './EditProjectStyle.css';
</style>