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

    <SelectionToolbar :visible="isToolbarVisible" :position="toolbarPosition" :objType="toolbarObjType"
      @duplicate="handleDuplicate" @rotate="handleToolbarRotate" @flip="handleFlip" @delete="handleDelete" />

    <PropsMenu :visible="isPropsMenuVisible" :name="propsName" :details="propsDetails" :rotation="propsRotation"
      :type="propsObjType" :texture="propsTexture" :ceiling="propsHasCeiling" @update:texture="useTextureManager"
      @update:rotation="handlePropsMenuRotation" @update:name="handlePropsMenuRename" @update:color="useTextureManager"
      @update:ceiling="handlePropsMenuCeiling" />
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
import { handleTextureChange, handleColorChange } from '../composables/textureManager.js';
// Services & Components
import { loadLayout, updateProjectLayout, addRoom, deleteRoom, updateRoom } from '../services/layoutService';
import { loadRoomsGeometry } from '../services/roomService';
import { createRoomGeometry, createWallGeometry, redrawWallGeometry, createCeilingGeometry } from '../services/roomService'; // Импортираме service-a
import SelectionToolbar from '../components/SelectionToolbar.vue';
import PropsMenu from '../components/PropsMenu.vue';
import { useTheme } from '../composables/useTheme';
import {
  computeSceneBoundingBox,
  fitPerspectiveCameraToBox,
  fitOrthoCameraToBox
} from '../composables/cameraFit.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

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
const toolbarObjType = ref('');
const toolbarPosition = reactive({ x: 0, y: 0,z:-1 });

// Props Menu State
const isPropsMenuVisible = ref(false);
const propsName = ref('');
const propsDetails = ref('');
const propsRotation = ref(0);
const propsObjType = ref('');
const propsTexture = ref('');
const propsHasCeiling = ref(false);

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
let originalWallId = null;//за да знаем коя стена да прерисуваме при местене на прозорец
let originalRoomId = null;//за да знаем коя стена да прерисуваме при местене на прозорец

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
else if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio || 1);
renderer.setSize(renderWidth, renderHeight);
renderer.domElement.style.touchAction = 'none';

// Controls
let controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.7);
scene.add(hemiLight);
const ambientLight = new THREE.AmbientLight(0xffffff, 1.3); 
scene.add(ambientLight);
const dir = new THREE.DirectionalLight(0xffffff, 0.2);
dir.position.set(8, 8, 17); 

dir.target.position.set(0, 0, 0);
scene.add(dir.target); 

dir.castShadow = true;
dir.shadow.mapSize.width = 2048; 
dir.shadow.mapSize.height = 2048;
dir.shadow.bias = -0.0005; 
dir.shadow.radius = 2.5;

const d = 50; // Това означава 50 единици наляво, надясно, нагоре и надолу (общо 100х100)
dir.shadow.camera.left = -d;
dir.shadow.camera.right = d;
dir.shadow.camera.top = d;
dir.shadow.camera.bottom = -d;
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 200; // Трябва да е достатъчно голямо, за да стигне от светлината до пода!
dir.shadow.camera.updateProjectionMatrix();
scene.add(dir);


// Grid
const planeSize = 30;
const maxHeight = 15;
const gridSize = 30;
const divisions = 40;
const grid = new THREE.GridHelper(gridSize, divisions, 0x555564, 0x555564);
grid.position.y = 0;
grid.name = 'floor-grid';
scene.add(grid);

const manager = new THREE.LoadingManager();


/* ---------------Post-Processing-------------- */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);
let outdoorGround = null;

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
// Създай генератора на среда
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Задай го като среда на сцената (това ще даде отражения на ВСИЧКИ материали)
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.2;
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

// Помощна функция за името на файла
const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}`;
};

// Главната функция за реалистичен рендер
const takeRealisticScreenshot = () => {
  // 1. ЗАПАЗВАМЕ ТЕКУЩИЯ РАБОТЕН РЕЖИМ
  const previousToneMapping = renderer.toneMapping;
  const previousExposure = renderer.toneMappingExposure;
  const previousBackground = scene.background; // Пазим оригиналния цвят
  const previousFog = scene.fog;
  
  // Скриваме мрежата на пода (тъй като я имаш дефинирана като променлива 'grid')
  if (grid) grid.visible = false;

  // Скриваме хендълите, ако има селектиран обект (ако ползваш selectedObjects)
  if (typeof selectedObjects !== 'undefined' && selectedObjects.length > 0 && typeof removeResizeHandles === 'function') {
    removeResizeHandles();
  }

  // 2. ВКЛЮЧВАМЕ ФОТОРЕАЛИСТИЧЕН РЕЖИМ
  // ACESFilmic e магията зад реалистичното преливане на светлината
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2; // Можеш да си поиграеш с тази стойност (напр. 1.0 или 1.5)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  ambientLight.intensity=0.3;
  hemiLight.intensity=0.3;
  dir.intensity=1.1;
  
  dir.castShadow = true;
dir.shadow.mapSize.width = 2048; 
dir.shadow.mapSize.height = 2048;
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 50;

const d = 25; 
dir.shadow.camera.left = -d;
dir.shadow.camera.right = d;
dir.shadow.camera.top = d;
dir.shadow.camera.bottom = -d;

dir.shadow.bias = -0.0005; 
dir.shadow.radius = 3;
  const skyColor = new THREE.Color(0x9fbac4); 
  scene.background = skyColor;
  
  scene.fog = new THREE.Fog(skyColor, 0, 90);; 

  // Увеличаваме зрението на камерата
  const oldFar = activeCamera.far;
  activeCamera.far = 5000;
  activeCamera.updateProjectionMatrix();

  if (!outdoorGround) {
    outdoorGround = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000), 
      new THREE.MeshStandardMaterial({ 
        color: 0x828c8c,
        roughness: 1,    
        metalness: 0,
        side: THREE.DoubleSide 
      })
    );
    outdoorGround.rotation.x = -Math.PI / 2;
    outdoorGround.position.y = 0.05; 
    outdoorGround.receiveShadow = true; 
  }
  
  // ЕТО ТОВА ЛИПСВАШЕ: Слагаме земята в сцената!
  scene.add(outdoorGround);

  // ВАЖНО: Рендерираме директно през renderer...
  renderer.render(scene, activeCamera);

  // 3. ПРАВИМ СНИМКАТА
  try {
    const dataUrl = renderer.domElement.toDataURL("image/png");
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `рендер_${getFormattedDate()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Грешка при създаване на рендер:", error);
  }

  // 4. ВРЪЩАМЕ ВСИЧКО В РАБОТЕН РЕЖИМ
  renderer.toneMapping = previousToneMapping;
  renderer.toneMappingExposure = previousExposure;
  renderer.shadowMap.enabled = false;
  dir.intensity = 0.2;
  hemiLight.intensity = 0.7;
  ambientLight.intensity = 1.3;

  dir.castShadow = false;
  if (grid) grid.visible = true;

  // Почистваме!
  scene.remove(outdoorGround);
  scene.background = previousBackground;
  scene.fog = previousFog;

  // ВРЪЩАМЕ ЗРЕНИЕТО НА КАМЕРАТА! (Това също липсваше накрая)
  activeCamera.far = oldFar;
  activeCamera.updateProjectionMatrix();

  // Рендерираме отново през composer
  composer.render();
};

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
  try {
    if (filename.startsWith('#')) {
      handleColorChange(selected, filename);
    }
    else {
      await handleTextureChange(selected, filename);
    }
    propsTexture.value = filename;
  }
  finally {
    if (isRoomObject(selected)) {
      updateRoomEntryFromObject(selected);
      const roomId = selected.userData.roomId;
      const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
      if (room) {
        updateRoomDebounced(projectId, roomId, room.wallsData);
      }
    }
    else {
      updateLayoutEntryFromObject(selected);
      saveLayoutDebounced();
    }
  }
}

/* -------------------------
   CREATE ROOM LOGIC (NEW)
------------------------- */
async function createRoom(width, length, height, thickness) {
  // 1. Generate Geometry and the Data Structure (wallsData is inside roomEntry)
  isLoading.value = true;
  try {
    const { roomEntry, objs } = createRoomGeometry(width, length, height, thickness);

    const newRoomId = await addRoom(projectId, roomEntry);

    roomEntry.id = newRoomId;
    objs.forEach(obj => {
      obj.userData.roomId = newRoomId;
      scene.add(obj);
    });

    roomsData.value.push(roomEntry);
    saveState();
    // Запазваме в историята след създаване на стая

  } catch (error) {
    console.error("Failed to create room:", error);
    alert("Could not save room to database.");
  }
  finally {
    isLoading.value = false;
  }
}

async function createWall(length, height, thickness) {
  // 1. Generate Geometry and the Data Structure (wallsData is inside roomEntry)
  isLoading.value = true;
  try {
    const { roomEntry, objs } = createWallGeometry(length, height, thickness);
    const newRoomId = await addRoom(projectId, roomEntry);

    roomEntry.id = newRoomId;
    objs.forEach(obj => {
      obj.userData.roomId = newRoomId;
      scene.add(obj);
    });

    roomsData.value.push(roomEntry);
    saveState();
    // Запазваме в историята след създаване на стена
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

function findWallSnap(position, objectToSnap) { 
  let closestDist = Infinity;
  let bestSnap = null;

  // Изчисляваме ширината на обекта (прозореца/вратата)
  // Ползваме Box3, за да работи перфектно дори за сложни GLTF модели
  const objBox = new THREE.Box3().setFromObject(objectToSnap);
  // Взимаме реалната ширина на прозореца
  const objWidth = objBox.max.x - objBox.min.x; 
  const halfObjWidth = objWidth / 2;

  // Find all walls in the scene
  const walls = [];
  scene.traverse(o => {
    if (o.userData && o.userData.type === 'wall') walls.push(o);
  });

  walls.forEach(wall => {
    // 1. Convert the drag point to the Wall's Local Space
    const localPoint = position.clone();
    wall.worldToLocal(localPoint);

    // 2. Get Wall Dimensions (Account for scale)
    const wallWidth = wall.userData.dimensions.width * Math.abs(wall.scale.x);
    const halfWidth = wallWidth / 2;

    const distZ = Math.abs(localPoint.z);

    // Allow snapping even if slightly off the ends of the wall (by 0.5m)
    const inRangeX = localPoint.x >= -halfWidth - 0.5 && localPoint.x <= halfWidth + 0.5;

    if (inRangeX && distZ < WALL_SNAP_DISTANCE) { // Увери се, че WALL_SNAP_DISTANCE e дефинирана глобално
      if (distZ < closestDist) {
        closestDist = distZ;

        const limitX = Math.max(0, halfWidth - halfObjWidth);

        // Clamp-ваме спрямо новия лимит, а не спрямо целия halfWidth
        const clampedX = Math.max(-limitX, Math.min(limitX, localPoint.x));

        // Create the snap point in Local Space
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
let initialResizeDepth = 0;
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
  const intersects = raycaster.intersectObjects(scene.children, true);
  const handleHit = intersects.find(hit => hit.object.userData.isResizeHandle);

  if (handleHit) {
    e.preventDefault();
    isResizing = true;
    controls.enabled = false;

    activeResizeHandle = handleHit.object.userData.side;

    // Взимаме обекта (може да е стена или под)
    let targetObj = handleHit.object.userData.target || handleHit.object.userData.wall;

    if (!targetObj && selectedObjects.length > 0) {
      targetObj = selectedObjects[0];
    }

    const type = targetObj.userData.type;
    initialResizePos = targetObj.position.clone();

    // Намираме равнината за пресичане (хоризонтална)
    const targetWorldPos = new THREE.Vector3();
    targetObj.getWorldPosition(targetWorldPos);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), targetWorldPos);

    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) {
      initialClickPoint.copy(intersectionPoint);
    }

    // --- ЛОГИКА АКО ОРАЗМЕРЯВАМЕ СТЕНА ---
    if (type === 'wall') {
      const currentScaleX = targetObj.scale.x || 1;
      const baseWidth = targetObj.userData.dimensions.width;

      initialResizeWidth = baseWidth * Math.abs(currentScaleX);
      targetObj.userData.initialResizeScaleX = currentScaleX;

      // Временно правим стената плътна
      const solidGeo = new THREE.BoxGeometry(
        baseWidth,
        targetObj.userData.dimensions.height,
        targetObj.userData.dimensions.depth
      );
      targetObj.geometry.dispose();
      targetObj.geometry = solidGeo;

      // Скриваме всички прозорци/врати
      scene.traverse((child) => {
        if ((child.userData.type === 'window' || child.userData.type === 'door') && child.userData.wallId === targetObj.userData.id) {
          child.visible = false;
        }
      });
    }
    // --- ЛОГИКА АКО ОРАЗМЕРЯВАМЕ ПОД ---
    else if (type === 'floor') {
      const currentScaleX = targetObj.scale.x || 1;
      const currentScaleZ = targetObj.scale.z || 1;

      const baseWidth = targetObj.userData.dimensions.width;
      const baseDepth = targetObj.userData.dimensions.depth;

      // Ако дърпаме наляво/надясно, ни интересува ширината. Ако е горе/долу - дълбочината.
      if (activeResizeHandle === 'left' || activeResizeHandle === 'right') {
        initialResizeWidth = baseWidth * Math.abs(currentScaleX);
      } else {
        initialResizeDepth = baseDepth * Math.abs(currentScaleZ);
      }

      // Запазваме и двата мащаба, за да ги ползваме в onPointerMove
      targetObj.userData.initialResizeScaleX = currentScaleX;
      targetObj.userData.initialResizeScaleZ = currentScaleZ;
    }

    return; // Излизаме, за да не се задейства Phase 2!
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
    if (dragObject && dragObject.userData.type === 'window') {
      originalWallId = dragObject.userData.wallId; // Запомняме от коя стена тръгва!
      originalRoomId = dragObject.userData.roomId; // Запомняме от коя стая тръгва!
    }
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

const isDoorOrWindow = (obj) => {
  return obj.userData.type === 'door' || obj.userData.type === 'window';
};
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
    const targetObj = selectedObjects[0]; // Вече не е само стена
    const intersectionPoint = new THREE.Vector3();

    if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

    const mouseVector = new THREE.Vector3().subVectors(intersectionPoint, initialClickPoint);

    // Проверяваме по коя ос оразмеряваме спрямо хванатия хендъл
    const isXAxis = (activeResizeHandle === 'left' || activeResizeHandle === 'right');

    // Определяме локалната посока: X(1,0,0) за ляво/дясно, Z(0,0,1) за горе/долу
    const direction = isXAxis ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(targetObj.quaternion).normalize();

    // Взимаме правилния начален мащаб и размер спрямо оста
    const initialScale = isXAxis
      ? (targetObj.userData.initialResizeScaleX || 1)
      : (targetObj.userData.initialResizeScaleZ || 1);

    const scaleSign = Math.sign(initialScale);

    if (scaleSign < 0) {
      direction.negate();
    }

    // Проектираме движението на мишката върху нашата ос
    let delta = mouseVector.dot(direction);

    // Ако дърпаме "отрицателните" хендъли (ляво по -X, горе по -Z), обръщаме делтата
    if (activeResizeHandle === 'left' || activeResizeHandle === 'top') {
      delta = -delta;
    }

    // Взимаме началния размер и пресмятаме новия
    const initialSize = isXAxis ? initialResizeWidth : initialResizeDepth;
    let newVisualSize = initialSize + delta;
    if (newVisualSize < 0.2) newVisualSize = 0.2; // Минимум размер

    // 1. Прилагаме новия мащаб спрямо БАЗОВИЯ размер
    const baseDimension = isXAxis ? targetObj.userData.dimensions.width : targetObj.userData.dimensions.depth;
    const scaleFactor = newVisualSize / baseDimension;

    if (isXAxis) {
      targetObj.scale.x = scaleFactor * scaleSign;
    } else {
      targetObj.scale.z = scaleFactor * scaleSign;
    }

    // 2. Местим центъра, за да остане отсрещната страна закована!
    const sizeDiff = newVisualSize - initialSize;
    const shiftAmount = sizeDiff / 2;
    const shiftVector = direction.clone().multiplyScalar(shiftAmount);

    if (activeResizeHandle === 'left' || activeResizeHandle === 'top') {
      shiftVector.negate();
    }

    const newPos = initialResizePos.clone().add(shiftVector);
    targetObj.position.copy(newPos);

    // ВАЖНО: Форсираме ъпдейт, за да е сигурно, че позицията се прилага веднага
    targetObj.updateMatrixWorld(true);

    updateHandlePositions(targetObj);

    return;
  }

  // =========================================================
  // PHASE 2: DRAG / COLLISION LOGIC
  // =========================================================
  if (!dragging || !dragObject) return;

  const intersectionPoint = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(dragPlane, intersectionPoint)) return;

  // 1. Запазваме стара позиция (локална, за групата)
  const oldPos = dragObject.position.clone();

  // 2. Смятаме желаната световна позиция
  let targetWorld = intersectionPoint.clone().add(dragOffset);

  // 3. Търсим пода или запазваме Y
  const isFurniture = !['wall', 'door', 'window', 'floor'].includes(dragObject.userData.type);
  if (isFurniture || dragObject.userData.type === 'wall') {
    targetWorld.y = getFloorLevelAt(targetWorld.x, targetWorld.z, dragObject);
  } else {
    const currentWorldPos = new THREE.Vector3();
    dragObject.getWorldPosition(currentWorldPos);
    targetWorld.y = currentWorldPos.y;
  }

  // 4. Grid Snap
  if (GRID_SNAP.enabled && GRID_SNAP.size > 0) {
    const snapped = snapVec(targetWorld, GRID_SNAP.size);
    const keepY = targetWorld.y;
    targetWorld.copy(snapped);
    targetWorld.y = keepY;
  }

  // 5. Логика спрямо типа обект
  if (!isDoorOrWindow(dragObject)) {
    // Мебели
    targetWorld = getSafePosition(targetWorld, dragObject);
  } else {
    // ВРАТИ И ПРОЗОРЦИ
    const snap = findWallSnap(targetWorld,dragObject);

    if (snap) {
      const prevLocalPos = dragObject.position.clone();
      const prevRotY = dragObject.rotation.y;

      // Предложена позиция
      const proposedWorldPos = targetWorld.clone();
      proposedWorldPos.x = snap.position.x;
      proposedWorldPos.z = snap.position.z;

      const proposedLocalPos = proposedWorldPos.clone();
      if (dragObject.parent) dragObject.parent.worldToLocal(proposedLocalPos);

      // Временно местим за проверка на колизии
      dragObject.position.copy(proposedLocalPos);
      dragObject.rotation.y = snap.rotationY;
      dragObject.updateMatrixWorld(true);

      const dragBox = new THREE.Box3().setFromObject(dragObject).expandByScalar(0.0025);
      let hasCollision = false;

      scene.traverse(child => {
        if (hasCollision || child === dragObject) return;

        // Проверяваме за удар само с други врати/прозорци на СЪЩАТА стена
        if (child.userData &&
          (child.userData.type === 'window' || child.userData.type === 'door') &&
          child.userData.wallId === snap.wall.userData.id) {

          const siblingBox = new THREE.Box3().setFromObject(child).expandByScalar(0.0025);
          if (dragBox.intersectsBox(siblingBox)) hasCollision = true;
        }
      });

      // Връщаме обекта обратно, за да може Стъпка 6 да го премести правилно с делта разликата
      dragObject.position.copy(prevLocalPos);
      dragObject.rotation.y = prevRotY;
      dragObject.updateMatrixWorld(true);

      if (hasCollision) {
        // УДАР: Замразяваме целта до текущата позиция
        dragObject.getWorldPosition(targetWorld);
      } else {
        // ПЪТЯТ Е ЧИСТ: Задаваме новата цел и ротация
        targetWorld.copy(proposedWorldPos);
        dragObject.rotation.y = snap.rotationY; // Прилагаме ротацията

        // ОБНОВЯВАМЕ САМО 3D ДАННИТЕ (Без да мутираме Vue стейта тук!)
        if (snap.wall.userData) {
          dragObject.userData.roomId = snap.wall.userData.roomId;
          dragObject.userData.wallId = snap.wall.userData.id;
        }
      }
    } else {
      // Няма стена наблизо -> замразяваме
      dragObject.getWorldPosition(targetWorld);
    }
  }

  // 6. Прилагане (Local conversion)
  if (dragObject.parent) {
    dragObject.parent.worldToLocal(targetWorld);
  }
  dragObject.position.copy(targetWorld);

  // 7. Multi-selection update (ако влачим няколко неща едновременно)
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

  // 8. UI Updates
  updateSelectionUI(dragObject);
  if (typeof updateHandlePositions === 'function') {
    updateHandlePositions(dragObject);
  }

  e.preventDefault();
} function getFloorLevelAt(x, z, object) {
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
async function onPointerUpForDrag(e) {
  // =========================================================
  // PHASE 1: FINALIZE RESIZE
  // =========================================================
  if (isResizing && selectedObjects[0]) {
    const targetObj = selectedObjects[0];
    const type = targetObj.userData.type; 

    controls.enabled = true;
    isResizing = false;

    // ==========================================
    // ЛОГИКА ЗА СТЕНА
    // ==========================================
    if (type === 'wall') {
      const currentScale = targetObj.scale.x;
      const originalWidth = targetObj.userData.dimensions.width;
      const finalWidth = originalWidth * Math.abs(currentScale);

      // 1. Ъпдейтваме 3D обекта
      targetObj.userData.dimensions.width = finalWidth;
      targetObj.scale.x = Math.sign(currentScale) || 1;
      targetObj.updateMatrixWorld(true);

      const newGeo = new THREE.BoxGeometry(
        finalWidth,
        targetObj.userData.dimensions.height,
        targetObj.userData.dimensions.depth
      );
      targetObj.geometry.dispose();
      targetObj.geometry = newGeo;

      // --- Ъпдейтваме данните в глобалния масив (Базата данни) ---
      const roomId = targetObj.userData.roomId;
      const room = roomsData.value.find(r => r.id === roomId || r._id === roomId || (r._id && r._id.$oid === roomId));
      
      if (room && room.wallsData) {
        // А) Обновяваме стената
        const dbWall = room.wallsData.find(w => w.id === targetObj.userData.id);
        if (dbWall) {
          dbWall.dimensions.width = finalWidth;
          dbWall.position.x = targetObj.position.x;
          dbWall.position.y = targetObj.position.y;
          dbWall.position.z = targetObj.position.z;
        }

        // Б) НОВО: ОБНОВЯВАМЕ И ПРИБИРАМЕ ПРОЗОРЦИТЕ/ВРАТИТЕ
        const halfWallWidth = finalWidth / 2;

        scene.traverse((child) => {
          if ((child.userData.type === 'window' || child.userData.type === 'door') && child.userData.wallId === targetObj.userData.id) {
            
            // 1. Взимаме ширината на прозореца/вратата
            let childWidth = 0;
            if (child.userData.dimensions && child.userData.dimensions.width) {
              childWidth = child.userData.dimensions.width * Math.abs(child.scale.x);
            } else {
              const box = new THREE.Box3().setFromObject(child);
              childWidth = box.max.x - box.min.x;
            }
            const halfChildWidth = childWidth / 2;

            // 2. Превръщаме световната позиция на прозореца в ЛОКАЛНА спрямо стената
            const localPos = targetObj.worldToLocal(child.position.clone());

            // 3. Изчисляваме докъде максимум може да стигне центърът му, за да не излиза навън
            // Използваме Math.max(0, ...), за да го центрираме принудително, ако случайно прозорецът е по-широк от самата стена
            const limitX = Math.max(0, halfWallWidth - halfChildWidth);

            // 4. Ограничаваме (clamp) локалната координата X
            localPos.x = Math.max(-limitX, Math.min(limitX, localPos.x));

            // 5. Връщаме го обратно в световни координати
            const newWorldPos = targetObj.localToWorld(localPos);

            // 6. Прилагаме новата позиция на 3D обекта
            child.position.copy(newWorldPos);
            child.updateMatrixWorld(true);

            // 7. Обновяваме позицията и в базата данни (СУПЕР ВАЖНО ЗА ДУПКИТЕ!)
            const dbChild = room.wallsData.find(w => w.id === child.userData.id);
            if (dbChild) {
              dbChild.position.x = newWorldPos.x;
              dbChild.position.y = newWorldPos.y;
              dbChild.position.z = newWorldPos.z;
            }
          }
        });
      }
      // ----------------------------------------------------------------

      setTimeout(() => {
        // Сега redrawWallGeometry ще прочете НОВАТА ширина на стената и НОВИТЕ (коригирани) позиции на прозорците!
        redrawWallGeometry(roomsData, scene, targetObj.userData.id, targetObj.userData.roomId);
        
        scene.traverse((child) => {
            if ((child.userData.type === 'window' || child.userData.type === 'door') && child.userData.wallId === targetObj.userData.id) {
              child.visible = true; // Показваме ги отново, вече на правилното място
            }
        });
        createResizeHandles(targetObj, scene);
      }, 10);
    }
    // ==========================================
    // ЛОГИКА ЗА ПОД (НОВО: Обработваме X и Z)
    // ==========================================
    else if (type === 'floor') {
      const currentScaleX = targetObj.scale.x;
      const currentScaleZ = targetObj.scale.z;

      const originalWidth = targetObj.userData.dimensions.width;
      // Взимаме старата дълбочина (в зависимост как си я кръстил в dimensions)
      const originalDepth = targetObj.userData.dimensions.depth || targetObj.userData.dimensions.height;

      const finalWidth = originalWidth * Math.abs(currentScaleX);
      const finalDepth = originalDepth * Math.abs(currentScaleZ);

      // 1. Записваме новите размери в userData
      targetObj.userData.dimensions.width = finalWidth;
      if (targetObj.userData.dimensions.depth !== undefined) {
        targetObj.userData.dimensions.depth = finalDepth;
      } else {
        targetObj.userData.dimensions.height = finalDepth;
      }

      // 2. Ресетваме scale-а обратно на 1
      targetObj.scale.x = Math.sign(currentScaleX) || 1;
      targetObj.scale.z = Math.sign(currentScaleZ) || 1;
      targetObj.updateMatrixWorld(true);

      // 3. Слагаме новата плътна геометрия, за да изпечем мащаба
      // Ползваме дебелината на стария под (обикновено Y оста на геометрията)
      const thickness = targetObj.geometry.parameters.height || 0.1;
      const newGeo = new THREE.BoxGeometry(finalWidth, thickness, finalDepth);
      targetObj.geometry.dispose();
      targetObj.geometry = newGeo;

      // 4. Прерисуваме хендълите, за да залепнат за новия размер
      setTimeout(() => {
        createResizeHandles(targetObj, scene);
      }, 10);
    }

    // ==========================================
    // ЗАПАЗВАНЕ В БАЗАТА (ОБЩО)
    // ==========================================

    // Ъпдейтваме данните от обекта
    updateRoomEntryFromObject(targetObj);

    const roomId = targetObj.userData.roomId;
    const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);

    if (room) {
      // ВАЖНО: Тук подаваш room.wallsData. 
      await updateRoom(projectId, roomId, room.wallsData);
    }

    saveState();

    return;
  }

  // =========================================================
  // PHASE 2: EXISTING DRAG END LOGIC (FIXED)
  // =========================================================
  if (dragging) {
    // --- 1. СПИРАМЕ ВЛАЧЕНЕТО ВЕДНАГА! ---
    dragging = false;
    const droppedObject = dragObject; // Запазваме референция към обекта
    dragObject = null; // Зануляваме глобалната променлива веднага

    try { renderer.domElement.releasePointerCapture(e.pointerId); } catch (_) { }
    controls.enabled = true;

    if (!droppedObject) return;

    // 2. Обновяваме данните (стейта) за ВСИЧКИ преместени обекти
    selectedObjects.forEach(obj => {
      if (isRoomObject(obj)) {
        updateRoomEntryFromObject(obj);
      } else {
        updateLayoutEntryFromObject(obj);
      }
    });

    // 3. Запазваме в базата
    if (isRoomObject(droppedObject)) {

      if (droppedObject.userData.type === 'window' || droppedObject.userData.type === 'door') {
        const currentWallId = droppedObject.userData.wallId;

        // А) Изрязваме дупката на НОВАТА стена
        redrawWallGeometry(roomsData, scene, currentWallId, droppedObject.userData.roomId);

        // Б) АКО сме сменили стената -> запълваме дупката на СТАРАТА стена
        if (originalWallId && originalWallId !== currentWallId) {
          redrawWallGeometry(roomsData, scene, originalWallId, originalRoomId);
        }
      }

      const currentRoomId = droppedObject.userData.roomId;

      try {
        // А) Запазваме старата стая, ако обектът е преместен в друга
        if (originalRoomId !== null && originalRoomId !== currentRoomId) {
          const oldRoom = roomsData.value.find(r => r._id === originalRoomId || r.id === originalRoomId);
          if (oldRoom) {
            await updateRoom(projectId, originalRoomId, oldRoom.wallsData);
          }
        }

        // Б) Запазваме новата (или текущата) стая
        const currentRoom = roomsData.value.find(r => r._id === currentRoomId || r.id === currentRoomId);
        if (currentRoom) {
          await updateRoom(projectId, currentRoomId, currentRoom.wallsData);
        }
      } catch (error) {
        console.error("Грешка при запазване на стаята:", error);
      }

      // В) Изчистваме паметта за следващото влачене
      if (droppedObject.userData.type === 'window' || droppedObject.userData.type === 'door') {
        originalWallId = null;
      }
      originalRoomId = null;

    } else {
      saveLayoutDebounced();
    }
  }
  saveState();
}
async function handlePropsMenuRename(newName) {
  const obj = selectedObjects[0];
  if (!obj) return;

  obj.name = newName;

  // 2. Update the reactive variable bound to the menu
  propsName.value = newName;

  // 3. Save to your data store (Room/Layout)
  if (isRoomObject(obj)) {
    updateRoomEntryFromObject(obj);
    const roomId = obj.userData.roomId;
    const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
    if (room) {
      await updateRoom(projectId, roomId, room.wallsData);
    }
  } else {
    updateLayoutEntryFromObject(obj);
    saveLayoutDebounced();
  }
  saveState(); // Запазваме в историята след преименуване
}
async function handlePropsMenuCeiling(wantsCeiling) {
  const floor = selectedObjects.find(o => o.userData.type === 'floor');
  if (!floor || floor.userData.type !== 'floor') return;

  const roomId = floor.userData.roomId;
  const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
  if (!room) return;

  // 1. Търсим тавана в 3D сцената по ТИП и ROOM ID (без да ползваме имена)
  let ceilingMesh = null;
  scene.traverse((child) => {
    if (child.userData.type === 'ceiling' && child.userData.roomId === roomId) {
      ceilingMesh = child;
    }
  });

  isLoading.value = true;

  try {
    if (wantsCeiling) {
      // СЪЗДАВАНЕ НА ТАВАН
      if (!ceilingMesh) {
        const width = floor.userData.dimensions.width * Math.abs(floor.scale.x || 1);
        const depth = (floor.userData.dimensions.depth || floor.userData.dimensions.height) * Math.abs(floor.scale.z || 1);

        let maxWallY = 2.8; 
        scene.traverse((child) => {
          if (child.userData.type === 'wall' && child.userData.roomId === roomId) {
            const box = new THREE.Box3().setFromObject(child);
            if (box.max.y > maxWallY) {
              maxWallY = box.max.y;
            }
          }
        });

        const yPos = maxWallY - 0.05;

        // Генерираме тавана
        const { ceilingMesh: newMesh, ceilingData } = createCeilingGeometry(roomId, width, depth, yPos, 0.1);

        // Копираме точната X/Z позиция и ротация от пода
        newMesh.position.x = floor.position.x;
        newMesh.position.z = floor.position.z;
        newMesh.rotation.copy(floor.rotation);

        ceilingData.position = { x: newMesh.position.x, y: yPos, z: newMesh.position.z };
        ceilingData.rotation = { x: newMesh.rotation.x, y: newMesh.rotation.y, z: newMesh.rotation.z };

        // Добавяме в сцената и в локалния стейт
        scene.add(newMesh);

        room.hasCeiling = 1;
        room.wallsData.push(ceilingData);
      }
    } else {
      // ИЗТРИВАНЕ НА ТАВАНА
      room.hasCeiling = -1;

      // 1. Махаме от стейта всички обекти, които са тип 'ceiling'
      room.wallsData = room.wallsData.filter(item => item.type !== 'ceiling');

      if (ceilingMesh) {
        scene.remove(ceilingMesh);
        if (ceilingMesh.geometry) ceilingMesh.geometry.dispose();
        
        // Почистваме и материалите за избягване на memory leaks
        if (ceilingMesh.material) {
          if (Array.isArray(ceilingMesh.material)) {
            ceilingMesh.material.forEach(m => m.dispose());
          } else {
            ceilingMesh.material.dispose();
          }
        }
      }
    }
    // Запазваме промените
    await updateRoom(projectId, roomId, room.wallsData, room.hasCeiling);
    saveState();

  } catch (error) {
    console.error("Failed to toggle ceiling:", error);
    alert("Could not update ceiling in database.");
  } finally {
    propsHasCeiling.value = wantsCeiling; 
    isLoading.value = false;
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

function getRotatedCorners(object, targetPosition) {
  let box;

  // Проверяваме дали е прост обект (Mesh) или сложен GLTF (Group)
  if (object.geometry) {
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    box = object.geometry.boundingBox;
  } else {
    // Ако е GLTF, изчисляваме локалната му рамка спрямо всичките му деца
    // Кешираме я в userData, за да не "убием" процесора при влачене
    if (!object.userData.localBox) {
      // 1. Запазваме текущите ротации и позиции
      const oldPos = object.position.clone();
      const oldQuat = object.quaternion.clone();
      const oldScale = object.scale.clone();

      // 2. Временно го връщаме в центъра без ротация, за да вземем чисти размери
      object.position.set(0, 0, 0);
      object.quaternion.identity();
      object.scale.set(1, 1, 1);
      object.updateMatrixWorld(true);

      // 3. Изчисляваме общата кутия на целия GLTF модел
      object.userData.localBox = new THREE.Box3().setFromObject(object);

      // 4. Връщаме си го там, където е бил първоначално
      object.position.copy(oldPos);
      object.quaternion.copy(oldQuat);
      object.scale.copy(oldScale);
      object.updateMatrixWorld(true);
    }
    box = object.userData.localBox;
  }

  // Взимаме 4-те ъгъла (гледаме отгоре, X и Z)
  const corners = [
    new THREE.Vector3(box.min.x, 0, box.min.z),
    new THREE.Vector3(box.max.x, 0, box.min.z),
    new THREE.Vector3(box.max.x, 0, box.max.z),
    new THREE.Vector3(box.min.x, 0, box.max.z)
  ];

  // Симулираме къде ще бъде обектът (позиция + ротация + мащаб)
  const matrix = new THREE.Matrix4().compose(
    targetPosition,
    object.quaternion,
    object.scale
  );

  // Превръщаме ги в реални световни координати
  return corners.map(c => c.applyMatrix4(matrix));
}

const _normal = new THREE.Vector2(); // Създаваме го само веднъж глобално!

function doPolygonsIntersect(polyA, polyB) {
  const polygons = [polyA, polyB];
  
  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let i1 = 0; i1 < polygon.length; i1++) {
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];

      // Използваме преизползваем вектор, вместо да създаваме нов (пести памет)
      _normal.set(p2.z - p1.z, p1.x - p2.x).normalize();

      let minA = Infinity, maxA = -Infinity;
      for (let j = 0; j < polyA.length; j++) {
        const projected = _normal.x * polyA[j].x + _normal.y * polyA[j].z;
        if (projected < minA) minA = projected;
        if (projected > maxA) maxA = projected;
      }

      let minB = Infinity, maxB = -Infinity;
      for (let j = 0; j < polyB.length; j++) {
        const projected = _normal.x * polyB[j].x + _normal.y * polyB[j].z;
        if (projected < minB) minB = projected;
        if (projected > maxB) maxB = projected;
      }

      if (maxA <= minB || maxB <= minA) {
        return false; 
      }
    }
  }
  return true;
}
function getSafePosition(proposedWorldPos, objectToMove) {
  const allWalls = scene.children.filter(o =>
    (o.userData.type === 'wall' && o !== objectToMove && 
    ((objectToMove.userData.type === 'floor' && o.userData.roomId !== objectToMove.userData.roomId) || objectToMove.userData.type !== 'floor'))
  );

  const currentPos = objectToMove.position.clone();

  // Бърз филтър (Broadphase) - взимаме само близките стени
  const MAX_DISTANCE = 5; 
  const nearbyWalls = allWalls.filter(wall => 
    wall.position.distanceTo(proposedWorldPos) < MAX_DISTANCE || 
    wall.position.distanceTo(currentPos) < MAX_DISTANCE
  );

  if (nearbyWalls.length === 0) return proposedWorldPos;

  // Кешираме ъглите на близките стени
  const cachedWalls = nearbyWalls.map(wall => ({
    corners: getRotatedCorners(wall, wall.position)
  }));

  // ========================================================
  // --- НОВО: ПРОВЕРКА ЗА ЗАКЛЕЩВАНЕ ---
  // ========================================================
  // Проверяваме дали обектът ВЕЧЕ Е в сблъсък на текущата си позиция
  const isCurrentlyStuck = checkCollisionAt(currentPos, objectToMove, cachedWalls);

  if (isCurrentlyStuck) {
    // Обектът е заклещен. Проверяваме дали предложената позиция го изкарва.
    const isProposedStuck = checkCollisionAt(proposedWorldPos, objectToMove, cachedWalls);
    
    // Ако новата позиция е чиста, пускаме го веднага да излезе!
    if (!isProposedStuck) return proposedWorldPos;
    
    // Ако и на новата позиция е в сблъсък, трябва да проверим дали 
    // поне се движи НАВЪН (отдалечава се от центъра на стената).
    // За по-просто: пускаме го да се движи свободно, докато излезе, 
    // но само към позицията на мишката (proposedWorldPos).
    return proposedWorldPos; 
    
    /* Забележка: Връщаме proposedWorldPos директно тук, за да дадем пълна 
       свобода на потребителя да "издърпа" стената. Щом излезе от другата стена, 
       при следващото движение isCurrentlyStuck ще бъде false и нормалната 
       колизия ще се включи отново! */
  }

  // ========================================================
  // --- СТАНДАРТНА ЛОГИКА ЗА КОЛИЗИИ ---
  // ========================================================
  const movement = new THREE.Vector3().subVectors(proposedWorldPos, currentPos);
  const distance = movement.length();
  
  if (distance < 0.001) return proposedWorldPos;

  const stepSize = 0.1; 
  const steps = Math.max(1, Math.ceil(distance / stepSize));
  
  let safePos = currentPos.clone();

  // Стъпково движение
  for (let i = 1; i <= steps; i++) {
    const stepFraction = i / steps;
    const testPos = currentPos.clone().add(movement.clone().multiplyScalar(stepFraction));
    
    if (!checkCollisionAt(testPos, objectToMove, cachedWalls)) {
      safePos.copy(testPos); // Стъпката е успешна
    } else {
      // ПЛЪТНО ДОЛЕПВАНЕ ДО МИЛИМЕТЪР (Binary Search)
      let minPos = safePos.clone();
      let maxPos = testPos.clone();
      let midPos = new THREE.Vector3();
      
      for (let b = 0; b < 5; b++) {
        midPos.lerpVectors(minPos, maxPos, 0.5);
        if (checkCollisionAt(midPos, objectToMove, cachedWalls)) {
          maxPos.copy(midPos); // Вътре сме
        } else {
          minPos.copy(midPos); // Чисто е
        }
      }
      safePos.copy(minPos); 

      // ТАЙНАТА НА ПЛЪЗГАНЕТО (SLIDING)
      let moved = false;
      const stepX = movement.x / steps;
      const stepZ = movement.z / steps;

      const testPosX = safePos.clone();
      testPosX.x += stepX;
      if (!checkCollisionAt(testPosX, objectToMove, cachedWalls)) {
        safePos.copy(testPosX);
        moved = true;
      }
      
      const testPosZ = safePos.clone();
      testPosZ.z += stepZ;
      if (!checkCollisionAt(testPosZ, objectToMove, cachedWalls)) {
        safePos.z = testPosZ.z;
        moved = true;
      }

      if (!moved) break; 
    }
  }

  return safePos;
}

function checkCollisionAt(pos, objectToMove, cachedWalls) {
  const testCorners = getRotatedCorners(objectToMove, pos);
  for (const wall of cachedWalls) {
    if (doPolygonsIntersect(testCorners, wall.corners)) {
      return true; // Има сблъсък
    }
  }
  return false; // Чисто е
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
  saveState();
}

/* -------------------------
   Layout Data & Persistence
------------------------- */
/* -------------------------
   ROOM DATA SYNC LOGIC
------------------------- */

// Check if an object belongs to a room (has a roomId)
function isRoomObject(obj) {
  return obj.userData.type == 'wall' || obj.userData.type === 'floor' || obj.userData.type === 'door' || obj.userData.type === 'window' || obj.userData.type === 'ceiling';
}

// Sync 3D Mesh position/rotation to the Vue Ref (roomsData)
function updateRoomEntryFromObject(obj) {
  if (!isRoomObject(obj)) return;

  const currentRoomId = obj.userData.roomId; // В коя стая го пускаме
  const itemId = obj.userData.id;

  // 1. Използваме originalRoomId (ако сме влачили). Ако просто обновяваме обект (без влачене), ползваме currentRoomId.
  const searchRoomId = originalRoomId !== null ? originalRoomId : currentRoomId;

  // 2. Намираме индекса на старата стая
  const oldRoomIndex = roomsData.value.findIndex(r => r._id === searchRoomId || r.id === searchRoomId);
  if (oldRoomIndex === -1) return;

  // 3. Намираме индекса на обекта в старата стая
  const itemIndexInOldRoom = roomsData.value[oldRoomIndex].wallsData.findIndex(w => w.id === itemId || w._id === itemId);
  if (itemIndexInOldRoom === -1) return;

  // Взимаме референцията към данните
  const dataEntry = roomsData.value[oldRoomIndex].wallsData[itemIndexInOldRoom];

  // =========================================================
  // 4. ЛОГИКА ЗА ПРЕМЕСТВАНЕ МЕЖДУ СТАИ
  // =========================================================
  if (searchRoomId !== currentRoomId) {
    // А) Махаме обекта от масива на старата стая
    roomsData.value[oldRoomIndex].wallsData.splice(itemIndexInOldRoom, 1);

    // Б) Намираме индекса на новата стая
    const newRoomIndex = roomsData.value.findIndex(r => r._id === currentRoomId || r.id === currentRoomId);
    if (newRoomIndex !== -1) {
      // В) Добавяме го в масива на новата стая
      roomsData.value[newRoomIndex].wallsData.push(dataEntry);
    }
  }

  // =========================================================
  // 5. ОБНОВЯВАНЕ НА КООРДИНАТИТЕ И РЕФЕРЕНЦИИТЕ
  // =========================================================
  dataEntry.position = { x: obj.position.x, y: obj.position.y, z: obj.position.z };
  dataEntry.rotation = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };

  if (obj.name) dataEntry.name = obj.name;
  if (obj.userData.texture) dataEntry.texture = obj.userData.texture;

  if (obj.userData.type === 'window' || obj.userData.type === 'door') {
    dataEntry.wallId = obj.userData.wallId;
    dataEntry.roomId = obj.userData.roomId;
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
  entry.texture = object3D.userData.texture;
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
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  // 1. Центрираме по X спрямо центъра на обекта
  const center = box.getCenter(new THREE.Vector3());
  center.project(activeCamera);
  toolbarPosition.x = (center.x * halfWidth) + halfWidth;

  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z)
  ];

  let highestScreenY = Infinity;

  for (let i = 0; i < corners.length; i++) {
    corners[i].project(activeCamera);
    const screenY = -(corners[i].y * halfHeight) + halfHeight;
    
    if (screenY < highestScreenY) {
      highestScreenY = screenY;
    }
  }

  toolbarPosition.y = highestScreenY - 30; 
  
  // ==========================================
  // ОСТАНАЛАТА ЧАСТ ОТ КОДА (без промяна)
  // ==========================================
  
  toolbarObjType.value = obj.userData.type || 'unknown';
  isToolbarVisible.value = true;

  if (obj.userData.type === 'wall' || obj.userData.type === 'floor') {
    createResizeHandles(obj, scene);
  } else {
    removeResizeHandles();
  }

  const size = new THREE.Vector3();
  box.getSize(size);
  isPropsMenuVisible.value = true;
  propsName.value = obj.name || 'Unknown Object';
  propsObjType.value = obj.userData.type || 'unknown';
  propsTexture.value = obj.userData.texture;
  
  if (obj.userData.type === 'floor') {
    const room = roomsData.value.find(r => r._id === obj.userData.roomId || r.id === obj.userData.roomId);
    propsHasCeiling.value = room ? room.hasCeiling == 1 : false;
  } else {
    propsHasCeiling.value = false;
  }
  
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
async function handlePropsMenuRotation(newDegrees) {
  const obj = selectedObjects[0];
  if (!obj) return;

  const newRotationRad = newDegrees * Math.PI / 180;
  const deltaRad = newRotationRad - obj.rotation.y;
  if (deltaRad === 0) return;

  if (selectedObjects.length > 1) {
    // 1. Намираме водещия обект (стената)
    const parentWall = selectedObjects.find(o => o.userData.type === 'wall') || obj;
    const center = parentWall.position.clone();

    selectedObjects.forEach(o => {
      if (o === parentWall) {
        // Стената просто я въртим на място
        o.rotation.y = newRotationRad;
      } else {
        // --- МАГИЯТА ЗА ПРОЗОРЦИ/ВРАТИ ---
        // Използваме векторна ротация около центъра на стената
        let relPos = o.position.clone().sub(center);
        // Въртим вектора на отместването около оста Y
        relPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaRad);

        // Слагаме новата позиция
        o.position.copy(center).add(relPos);

        // Въртим и самия меш (тук използваме delta, за да добавим към текущата)
        o.rotation.y += deltaRad;
      }

      o.updateMatrixWorld(true);
      updateRoomEntryFromObject(o);
    });

    // 2. Запазване (използваме Anchor за стаята)
    const anchor = selectedObjects.find(o => o.userData.type === 'floor' || o.userData.type === 'wall') || selectedObjects[0];
    if (anchor && anchor.userData.roomId) {
      const roomId = anchor.userData.roomId;
      const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
      if (room) {
        await updateRoom(projectId, roomId, room.wallsData);
      }
    }

    // 3. Прерисуваме дупките
    setTimeout(() => {
      const wallId = parentWall.userData.id;
      redrawWallGeometry(roomsData, scene, wallId, parentWall.userData.roomId);
    }, 50);

  } else {
    // Единичен обект
    obj.rotation.y = newRotationRad;
    obj.updateMatrixWorld(true);

    if (isRoomObject(obj)) {
      updateRoomEntryFromObject(obj);
      const roomId = obj.userData.roomId;
      const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
      if (room) await updateRoom(projectId, roomId, room.wallsData);
    } else {
      updateLayoutEntryFromObject(obj);
      saveLayoutDebounced();
    }
  }

  propsRotation.value = newDegrees;
  updateSelectionUI(obj);
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
async function handleToolbarRotate(angleDeg) {
  if (selectedObjects.length === 0) return;

  const angleRad = angleDeg * Math.PI / 180;

  // If we selected a whole room (more than 1 object)
  if (selectedObjects.length > 1) {
    // 1. Calculate Center of the Room
    const box = new THREE.Box3();
    selectedObjects.forEach(obj => box.expandByObject(obj));
    const center = box.getCenter(new THREE.Vector3());

    // ---> НОВО: Събираме ID-тата на стените, които ще трябва да се прерисуват
    const wallsToRedraw = new Set();
    let currentRoomId = null;

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

      // ---> НОВО: Казваме на Three.js да обнови веднага 3D матрицата
      obj.updateMatrixWorld(true);

      // ---> НОВО: Отбелязваме кои стени са засегнати
      if (obj.userData.roomId) currentRoomId = obj.userData.roomId;
      if (obj.userData.type === 'window' || obj.userData.type === 'door') wallsToRedraw.add(obj.userData.wallId);
      else if (obj.userData.type === 'wall') wallsToRedraw.add(obj.userData.id);

      // Save changes per object
      updateRoomEntryFromObject(obj);
    });

    // Save one final time (using the floor/anchor to trigger the API call)
    const anchor = selectedObjects.find(o => o.userData.type === 'floor') || selectedObjects[0];
    if (anchor && anchor.userData.roomId) {
      const roomId = anchor.userData.roomId;
      const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
      if (room) {
        await updateRoom(projectId, roomId, room.wallsData);
      }
    }

    // ---> НОВО: Изчакваме 50ms (за да се обнови стейтът) и режем дупките накрая!
    setTimeout(() => {
      wallsToRedraw.forEach(wallId => {
        redrawWallGeometry(roomsData, scene, wallId, currentRoomId);
      });
    }, 20);

  } else {
    // Standard Single Object Rotation
    const obj = selectedObjects[0];
    obj.rotation.y += angleRad;

    // ---> НОВО: Обновяваме матрицата веднага
    obj.updateMatrixWorld(true);

    if (isRoomObject(obj)) {
      updateRoomEntryFromObject(obj);
      const roomId = obj.userData.roomId;
      const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
      if (room) {
        await updateRoom(projectId, roomId, room.wallsData);
      }

      // ---> НОВО: Прерисуваме дупката с малко закъснение, ако сме завъртели прозорец/стена директно
      setTimeout(() => {
        if (obj.userData.type === 'wall') {
          redrawWallGeometry(roomsData, scene, obj.userData.id, obj.userData.roomId);
        }
      }, 20);

    } else {
      updateLayoutEntryFromObject(obj);
      saveLayoutDebounced();
    }
  }
  updateSelectionUI(selectedObjects[0]);
}

async function handleFlip(axis) {
  if (selectedObjects.length === 0) return;

  // 1. Намираме общия център на селектираните обекти (стената + нейните прозорци)
  const box = new THREE.Box3();
  selectedObjects.forEach(obj => box.expandByObject(obj));
  const center = box.getCenter(new THREE.Vector3());

  const wallsToRedraw = new Set();
  let currentRoomId = null;

  // 2. Флипваме ВСИЧКИ обекти (стената и закачените прозорци)
  selectedObjects.forEach(obj => {
    if (obj.userData.isResizeHandle) return;
    // Огледално преместване на позицията спрямо центъра
    if (axis === 'x') {
      obj.position.x = center.x - (obj.position.x - center.x);
      obj.scale.x *= -1; // Обръщаме и самия меш
    } else if (axis === 'z') {
      obj.position.z = center.z - (obj.position.z - center.z);
      obj.scale.z *= -1;
    }

    // Обновяваме реалните координати
    obj.updateMatrixWorld(true);

    // Записваме кои стени трябва да прерисуваме
    if (obj.userData.roomId) currentRoomId = obj.userData.roomId;
    if (obj.userData.type === 'window' || obj.userData.type === 'door') wallsToRedraw.add(obj.userData.wallId);
    else if (obj.userData.type === 'wall') wallsToRedraw.add(obj.userData.id);

    // Обновяваме стейта на всеки обект
    if (isRoomObject(obj)) updateRoomEntryFromObject(obj);
    else updateLayoutEntryFromObject(obj);
  });

  // 3. Записваме промените (ползваме първия обект или пода)
  const anchor = selectedObjects.find(o => o.userData.type === 'floor') || selectedObjects[0];
  if (isRoomObject(anchor) && anchor.userData.roomId) {
    const roomId = anchor.userData.roomId;
    const room = roomsData.value.find(r => r._id === roomId || r.id === roomId);
    if (room) {
      await updateRoom(projectId, roomId, room.wallsData);
    }
  } else {
    saveLayoutDebounced();
  }

  updateSelectionUI(selectedObjects[0]);
}

async function handleDelete(ceilingOnly = false) {
  const obj = ceilingOnly ? selectedObjects.find(o => o.userData.type === 'ceiling') : selectedObjects[0];
  if (!obj) return;

  const roomId = obj.userData.roomId; // Check if it belongs to a room

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

        saveState();

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
    else if (obj.userData.type === 'wall' || obj.userData.type === 'ceiling' || obj.userData.type === 'door' || obj.userData.type === 'window') {
      try {

        // 1. Find the current room in our state
        const roomIndex = roomsData.value.findIndex(r => r._id === roomId || r.id === roomId);
        if (roomIndex === -1) return;

        const currentRoom = roomsData.value[roomIndex];
        const idsToRemove = ceilingOnly ? [obj.userData.id || obj.userData._id] : selectedObjects.map(o => o.userData.id || o.userData._id);
        const updatedWallsData = currentRoom.wallsData.filter(w => !idsToRemove.includes(w.id || w._id));

        if (obj.userData.type === 'ceiling') currentRoom.hasCeiling = -1;

        // 3. Call API: We are UPDATING the room, not deleting the room entity
        // Note: We use the immediate updateRoom, not the debounced one, for instant feedback
        updateRoomDebounced(projectId, roomId, updatedWallsData, currentRoom.hasCeiling);

        // 4. Update Local State
        roomsData.value[roomIndex].wallsData = updatedWallsData;
        if (obj.userData.type === 'window') {
          const parentWallId = obj.userData.wallId; // Взимаме ID-то на стената, на която е бил прозорецът

          if (parentWallId) {
            redrawWallGeometry(roomsData, scene, parentWallId, roomId);
          }
        }
        saveState();
        // 5. Scene Cleanup: Remove ONLY the selected wall mesh
        if (!ceilingOnly) {
          selectedObjects.forEach(mesh => {
            scene.remove(mesh);
            disposeObject(mesh);
          });
        }
        else {
          scene.remove(obj);
          disposeObject(obj);
        }

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
    const rawBox = new THREE.Box3().setFromObject(sideA);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (rawSize.x > 0 && rawSize.y > 0) {
      const scaleX = doorData.width / rawSize.x;
      const scaleY = doorData.height / rawSize.y;
      const scaleZ = wall.userData.dimensions.depth / rawSize.z; // Дълбочина на вратата

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
        dimensions: { width: doorData.width, height: doorData.height, depth: wall.userData.dimensions.depth },
        position: { x: doorGroup.position.x, y: doorGroup.position.y, z: doorGroup.position.z },
        rotation: { x: doorGroup.rotation.x, y: doorGroup.rotation.y, z: doorGroup.rotation.z }
      };

      if (!room.wallsData) room.wallsData = [];
      room.wallsData.push(doorEntry);
      saveState();

      try {
        const apiRoomId = room.id || room._id;
        updateRoomDebounced(projectId, apiRoomId, room.wallsData);
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

    const rawBox = new THREE.Box3().setFromObject(sideA);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (rawSize.x > 0 && rawSize.y > 0) {
      const scaleX = WindowData.width / rawSize.x;
      const scaleY = WindowData.height / rawSize.y;
      const scaleZ = wall.userData.dimensions.depth * 2 / rawSize.z; // Дълбочина на вратата

      sideA.scale.set(scaleX, scaleY, scaleZ);
    }
    WindowGroup.add(sideA);

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
        dimensions: { width: WindowData.width, height: WindowData.height, depth: wall.userData.dimensions.depth * 2 },
        position: { x: WindowGroup.position.x, y: WindowGroup.position.y, z: WindowGroup.position.z },
        rotation: { x: WindowGroup.rotation.x, y: WindowGroup.rotation.y, z: WindowGroup.rotation.z }
      };

      if (!room.wallsData) room.wallsData = [];
      room.wallsData.push(WindowEntry);
      redrawWallGeometry(roomsData, scene, targetWallId, roomId);
      saveState();
      try {
        const apiRoomId = room.id || room._id;
        updateRoomDebounced(projectId, apiRoomId, room.wallsData);
      } catch (e) {
        console.error("Error saving window:", e);
      }
      selectedObjects.length = 0;
      selectedObjects.push(WindowGroup); // Селектираме групата!
      activeOutlinePass.selectedObjects = selectedObjects;
      updateSelectionUI(WindowGroup);
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
  
  controls.enablePan = true;     
  controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

  controls.reset();
  
  activeCamera.position.set(0, 20, 0);
  controls.target.set(0, 0, 0);
  controls.update(); 

  renderPass.camera = activeCamera;
  composer.removePass(outlinePass3D);
  composer.addPass(outlinePass2D);
}
function switchTo3D() {
  dir.intensity = 0.2;
  activeCamera = perspectiveCamera;
  activeOutlinePass = outlinePass3D;
  bindControllerToCamera(activeCamera);
  
  controls.enableRotate = true;
  
  controls.enablePan = true;     
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; 
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;   
  
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
defineExpose({ startDragFromMenu, createRoom, addDoorToWallCenter, createWall, addWindowToWallCenter,takeRealisticScreenshot });
</script>

<style scoped>
@import './EditProjectStyle.css';
</style>