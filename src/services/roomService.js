// src/services/roomService.js
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import { handleTextureChange, handleColorChange } from '../composables/textureManager'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const createRoomGeometry = (width, length, height, WALL_THICKNESS) => {
  const WALL_HEIGHT = height;
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

  const roomEntry = {
    id: uuidv4(),
    wallsData: []
  };

  const objs = [];

  // --- 1. FLOOR ---
  // Подът си остава прост Box
  const floorGeo = new THREE.BoxGeometry(width, 0.1, length);
  const floor = new THREE.Mesh(floorGeo, floorMaterial);
  floor.position.set(0, 0.05, 0); // Леко надолу, за да е на y=0 нивото
  floor.name = 'room_floor';
  floor.userData = { type: 'floor', roomId: roomEntry.id,dimensions: { width, height: 0.1, depth: length }};

  objs.push(floor);
  roomEntry.wallsData.push({
    id: uuidv4(),
    type: 'floor',
    name: 'room_floor',
    dimensions: { width, height: 0.1, depth: length },
    position: { x: 0, y: 0.05, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  });

  // --- 2. WALLS ---
  // Стратегия:
  // Back/Front: Пълна ширина (width)
  // Left/Right: Дължина минус дебелините (length - 2*thickness), за да не се пресичат грозно в ъглите

  const wallsConfig = [
    {
      name: 'Стена - задна',
      // Геометрията винаги е: (Дължина на стената, Височина, Дебелина)
      size: { w: width, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: 0, y: WALL_HEIGHT / 2 + 0.1, z: -length / 2+WALL_THICKNESS/2 },
      rot: { x: 0, y: 0, z: 0 } // 0 градуса
    },
    {
      name: 'Стена - лява',
      // Взимаме (length - дебелината), за да пасне между предната и задната
      size: { w: length - WALL_THICKNESS, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: -(width - WALL_THICKNESS) / 2, y: WALL_HEIGHT / 2  + 0.1, z: WALL_THICKNESS/2 },
      rot: { x: 0, y: Math.PI / 2, z: 0 } // -90 градуса (завърта се)
    },
    {
      name: 'Стена - дясна',
      size: { w: length - WALL_THICKNESS, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: (width - WALL_THICKNESS) / 2, y: WALL_HEIGHT / 2  + 0.1, z:WALL_THICKNESS/2 },
      rot: { x: 0, y: -Math.PI / 2, z: 0 } // 90 градуса
    }
  ];

  wallsConfig.forEach(cfg => {
    // Създаваме геометрията винаги "легнала" по X
    const geometry = new THREE.BoxGeometry(cfg.size.w, cfg.size.h, cfg.size.d);
    const wallMesh = new THREE.Mesh(geometry, wallMaterial.clone());

    // Позиционираме
    wallMesh.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z);

    // ВАЖНО: Тук задаваме ротацията
    wallMesh.rotation.set(cfg.rot.x, cfg.rot.y, cfg.rot.z);

    wallMesh.name = cfg.name;
    const wallId = uuidv4();
    wallMesh.userData = {
      id: wallId,
      type: 'wall',
      roomId: roomEntry.id,
      // Запазваме "чистите" размери на BoxGeometry-то
      dimensions: { width: cfg.size.w, height: cfg.size.h, depth: cfg.size.d }
    };

    objs.push(wallMesh);

    // Записваме данните за DB
    roomEntry.wallsData.push({
      id: wallId,
      type: 'wall',
      name: cfg.name,
      // В базата записваме размерите на Box-а (незавъртян)
      dimensions: { width: cfg.size.w, height: cfg.size.h, depth: cfg.size.d },
      position: cfg.pos,
      rotation: cfg.rot
    });
  });

  return { roomEntry, objs };
};


export const createWallGeometry = (length, height, WALL_THICKNESS) => {
  const WALL_HEIGHT = height;
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  const roomEntry = {
    id: uuidv4(),
    wallsData: []
  };

  const objs = [];

  // --- 2. WALLS ---
  // Стратегия:
  // Back/Front: Пълна ширина (width)
  // Left/Right: Дължина минус дебелините (length - 2*thickness), за да не се пресичат грозно в ъглите

  const wallsConfig = [
    {
      name: 'Стена',
      // Геометрията винаги е: (Дължина на стената, Височина, Дебелина)
      size: { w: length, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: 0, y: WALL_HEIGHT / 2 + 0.05, z: 0 },
      rot: { x: 0, y: 0, z: 0 } // 0 градуса
    },
  ];

  wallsConfig.forEach(cfg => {
    // Създаваме геометрията винаги "легнала" по X
    const geometry = new THREE.BoxGeometry(cfg.size.w, cfg.size.h, cfg.size.d);
    const wallMesh = new THREE.Mesh(geometry, wallMaterial.clone());

    // Позиционираме
    wallMesh.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z);

    // ВАЖНО: Тук задаваме ротацията
    wallMesh.rotation.set(cfg.rot.x, cfg.rot.y, cfg.rot.z);

    wallMesh.name = cfg.name;
    const wallId = uuidv4();
    wallMesh.userData = {
      id: wallId,
      type: 'wall',
      roomId: roomEntry.id,
      // Запазваме "чистите" размери на BoxGeometry-то
      dimensions: { width: cfg.size.w, height: cfg.size.h, depth: cfg.size.d }
    };

    objs.push(wallMesh);

    // Записваме данните за DB
    roomEntry.wallsData.push({
      id: wallId,
      type: 'wall',
      name: cfg.name,
      // В базата записваме размерите на Box-а (незавъртян)
      dimensions: { width: cfg.size.w, height: cfg.size.h, depth: cfg.size.d },
      position: cfg.pos,
      rotation: cfg.rot
    });
  });

  return { roomEntry, objs };
};

export const createCeilingGeometry = (roomId,width, depth, yPosition, thickness = 0.1) => {
  // Създаваме геометрия и материал
  const geometry = new THREE.BoxGeometry(width, thickness, depth);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); // Бял таван по подразбиране
  const ceilingMesh = new THREE.Mesh(geometry, material);

  // Задаваме само Y позицията (височината). 
  // X и Z ще ги вземем от пода малко по-късно, за да съвпаднат идеално.
  ceilingMesh.position.set(0, yPosition, 0); 

  const ceilingId = uuidv4();
  ceilingMesh.name = 'Таван';
  
  // Данни за Three.js обекта
  ceilingMesh.userData = {
    id: ceilingId,
    roomId: roomId,
    type: 'ceiling',
    dimensions: { width, height: thickness, depth }
  };

  // Данни за запис в базата (DB)
  const ceilingData = {
    id: ceilingId,
    type: 'ceiling',
    name: 'Таван',
    roomId: roomId,
    dimensions: { width, height: thickness, depth },
    position: { x: 0, y: yPosition, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };

  return { ceilingMesh, ceilingData };
};

// Инициализираме лоудъра веднъж
const loader = new GLTFLoader();
export const loadRoomsGeometry = async (roomsData, scene) => {
  const baseMaterialWall = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  const baseMaterialFloor = new THREE.MeshStandardMaterial({ color: 0xba9eab });

  if (!roomsData || !Array.isArray(roomsData)) return;

  for (const room of roomsData) {
    if (room.wallsData) {
      for (const item of room.wallsData) {
        // -----------------------------
        // СЛУЧАЙ 1: ВРАТА (Group с 2 страни)
        // -----------------------------
        if (item.type === 'door') {
          if (!item.filename) continue;

          try {
            const gltf = await loader.loadAsync(item.filename);

            // 1. Създаваме Групата
            const doorGroup = new THREE.Group();

            // 2. Създаваме Страна А
            const sideA = gltf.scene.clone(); // Clone scene logic
            // Клониране на материали за Side A
            sideA.traverse((child) => {
              if (child.isMesh) {
                if (child.material) child.material = child.material.clone();
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // 3. Създаваме Страна Б (за другата стая)
            const sideB = gltf.scene.clone();
            sideB.traverse((child) => {
              if (child.isMesh) {
                if (child.material) child.material = child.material.clone();
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // 4. Настройки на вътрешните мешове
            if (item.scale) {
              sideA.scale.set(item.scale.x, item.scale.y, item.scale.z);
              sideB.scale.set(item.scale.x, item.scale.y, -item.scale.z);
            }

            // Добавяме ги в групата
            doorGroup.add(sideA);
            doorGroup.add(sideB);

             if (item.texture) {
              if (item.texture.startsWith('#')) {
                handleColorChange(sideA, item.texture);
                handleColorChange(sideB, item.texture);
              }
              else {
                await handleTextureChange(sideA, item.texture);
                await handleTextureChange(sideB, item.texture);
              }
            }

            // 5. Настройки на Групата (Позиция от базата)
            doorGroup.position.set(item.position.x, item.position.y, item.position.z);
            doorGroup.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);

            // 6. Metadata на групата
            doorGroup.name = item.name;
            doorGroup.userData = {
              id: item.id,
              type: 'door',
              roomId: room.id || room._id,
              wallId: item.wallId,
              filename: item.filename,
              texture: item.texture ?? null
            };

            scene.add(doorGroup);

          } catch (err) {
            console.error(`Error loading door ${item.id}:`, err);
          }

        }
        else if (item.type === 'window') {
          if (!item.filename) continue;

          try {
            const gltf = await loader.loadAsync(item.filename);

            // Създаваме група и за прозореца (за консистентност с вратите и по-лесно управление)
            const windowGroup = new THREE.Group();
            const windowModel = gltf.scene.clone();

            // Клонираме материалите и пускаме сенките
            windowModel.traverse((child) => {
              if (child.isMesh) {
                if (child.material) child.material = child.material.clone();
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // Прилагаме мащаба
            if (item.scale) {
              windowModel.scale.set(item.scale.x, item.scale.y, item.scale.z);
            }

             if (item.texture) {
              if (item.texture.startsWith('#')) {
                handleColorChange(windowModel, item.texture);
              }
              else {
                await handleTextureChange( windowModel, item.texture);
              }
            }

            windowGroup.add(windowModel);

            // Позиция и ротация от базата данни
            windowGroup.position.set(item.position.x, item.position.y, item.position.z);
            windowGroup.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);

            // Metadata на прозореца
            windowGroup.name = item.name;
            windowGroup.userData = {
              id: item.id,
              type: 'window',
              roomId: room.id || room._id,
              wallId: item.wallId,        // ВАЖНО: За да се мести със стената!
              filename: item.filename,
              texture: item.texture ?? null
            };

           
            scene.add(windowGroup);

          } catch (err) {
            console.error(`Error loading window ${item.id}:`, err);
          }
        }
        // -----------------------------
        // СЛУЧАЙ 2: СТЕНА / ПОД
        // -----------------------------
        else {
          if (!item.dimensions) continue;

          let geometry;
          let material;

          if (item.type === 'floor' || item.type === 'ceiling') {
            // Подът си остава прост BoxGeometry
            geometry = new THREE.BoxGeometry(
              item.dimensions.width,
              item.dimensions.height,
              item.dimensions.depth
            );
            material = item.type=='ceiling'?baseMaterialWall:baseMaterialFloor.clone();
          } else {
            // ЗА СТЕНИТЕ: Викаме новата функция, която ще изреже дупките!
            // Подаваме текущата стена и целия масив с обекти за стаята (за да намери прозорците)
            geometry = buildWallGeometryWithHoles(item, room.wallsData);
            material = baseMaterialWall.clone();
          }

          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(item.position.x, item.position.y, item.position.z);
          mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
          mesh.name=item.name;
          mesh.userData = {
            id: item.id,
            dimensions: item.dimensions,
            type: item.type,
            roomId: room.id || room._id
          };
          if (item.texture) {
            if (item.texture.startsWith('#')) {
              handleColorChange(mesh, item.texture);
            }
            else {
              await handleTextureChange(mesh, item.texture);
            }
          }
          scene.add(mesh);
        }
      }
    }
  }
};

// Помощна функция за генериране на стена с дупки
const buildWallGeometryWithHoles = (wallItem, allRoomItems, skipHoles = false) => {
  const { width, height, depth } = wallItem.dimensions;

  // 1. Намираме всички прозорци и врати, закачени за тази стена
  const attachedHoles = skipHoles ? [] : allRoomItems.filter(
    item => item.type === 'window' && item.wallId === wallItem.id
  );

  // Ако няма дупки, връщаме стандартен BoxGeometry (по-бързо е)
  if (attachedHoles.length === 0) {
    return new THREE.BoxGeometry(width, height, depth);
  }

  // 2. Има дупки! Чертаем 2D очертанието на стената
  const shape = new THREE.Shape();
  // Чертаем от долния ляв ъгъл (0,0)
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.lineTo(0, 0);

  // 3. Създаваме "виртуална" стена, за да превърнем глобалните 3D координати в локални 2D
  const dummyWall = new THREE.Object3D();
  dummyWall.position.set(wallItem.position.x, wallItem.position.y, wallItem.position.z);
  dummyWall.rotation.set(wallItem.rotation.x, wallItem.rotation.y, wallItem.rotation.z);
  dummyWall.updateMatrixWorld();

  // 4. Пробиваме дупка за всеки прозорец/врата
  attachedHoles.forEach(holeItem => {
    // Взимаме позицията на прозореца в света и я превръщаме спрямо центъра на стената
    const holeGlobalPos = new THREE.Vector3(holeItem.position.x, holeItem.position.y, holeItem.position.z);
    const localPos = dummyWall.worldToLocal(holeGlobalPos);

    // Взимаме размерите на дупката (използваме scale, защото там пазиш размерите)
    // Ако моделът ти по подразбиране не е 1x1x1, може да се наложи да добавим коефициент тук
    const holeW = holeItem.dimensions.width;
    const holeH = holeItem.dimensions.height;

    // Преизчисляваме центъра (localPos.x) спрямо долния ляв ъгъл (0,0) на Shape-а
    let shapeX = localPos.x + (width / 2) - (holeW / 2);
    let shapeY = localPos.y + (height / 2);

    // Чертаем дупката
    const holePath = new THREE.Path();
    holePath.moveTo(shapeX, shapeY);
    holePath.lineTo(shapeX + holeW, shapeY);
    holePath.lineTo(shapeX + holeW, shapeY + holeH);
    holePath.lineTo(shapeX, shapeY + holeH);
    holePath.lineTo(shapeX, shapeY);

    shape.holes.push(holePath); // Изрязваме!
  });

  // 5. Екструдираме (придаваме 3D дебелина на формата)
  const extrudeSettings = {
    depth: depth,
    bevelEnabled: false
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // ВАЖНО: ExtrudeGeometry расте напред и от (0,0). 
  // Трябва да го центрираме, за да съвпада точно с поведението на стария ти BoxGeometry!
  geometry.translate(-width / 2, -height / 2, -depth / 2);

  return geometry;
};

export const redrawWallGeometry = (roomsData, scene, wallId, roomId, skipHoles = false) => {
  // 1. Намираме данните за стаята и обектите в нея

  const room = roomsData.value.find(r => r.id === roomId || r._id === roomId || (r._id && r._id.$oid === roomId));
  if (!room || !room.wallsData) return;

  const allRoomItems = room.wallsData;

  // 2. Намираме данните за самата стена
  const wallData = allRoomItems.find(item => item.id === wallId && item.type === 'wall');
  if (!wallData) return;

  // 3. Търсим 3D обекта (Mesh) на стената в сцената
  let wallMesh = null;
  scene.traverse(child => {
    // Проверяваме дали обектът е стена и дали ID-то съвпада
    if (child.isMesh && child.userData && child.userData.id === wallId && child.userData.type === 'wall') {
      wallMesh = child;
    }
  });

  if (!wallMesh) return;
  // 4. Генерираме новата геометрия с дупките
  const newGeometry = buildWallGeometryWithHoles(wallData, allRoomItems, skipHoles);

  // 5. Подменяме геометрията!
  // ВАЖНО: Винаги викаме dispose() на старата геометрия, за да не предизвикаме Memory Leak (изтичане на памет)
  if (wallMesh.geometry) {
    wallMesh.geometry.dispose();
  }
  wallMesh.geometry = newGeometry;
}