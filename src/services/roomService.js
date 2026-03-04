// src/services/roomService.js
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export const createRoomGeometry = (width, length,height) => {
  const WALL_HEIGHT = height;
  const WALL_THICKNESS = 0.2;
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
  floor.userData = { type: 'floor', roomId: roomEntry.id };
  
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
      name: 'Wall_Back',
      // Геометрията винаги е: (Дължина на стената, Височина, Дебелина)
      size: { w: width, h: WALL_HEIGHT, d: WALL_THICKNESS }, 
      pos: { x: 0, y: WALL_HEIGHT / 2+0.05, z: -length / 2 },
      rot: { x: 0, y: 0, z: 0 } // 0 градуса
    },
    {
      name: 'Wall_Left',
      // Взимаме (length - дебелината), за да пасне между предната и задната
      size: { w: length -  WALL_THICKNESS, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: -(width-WALL_THICKNESS) / 2, y: WALL_HEIGHT / 2+0.05, z: 0 },
      rot: { x: 0, y: Math.PI / 2, z: 0 } // -90 градуса (завърта се)
    },
    {
      name: 'Wall_Right',
      size: { w: length -WALL_THICKNESS, h: WALL_HEIGHT, d: WALL_THICKNESS },
      pos: { x: (width-WALL_THICKNESS) / 2, y: WALL_HEIGHT / 2+0.05, z: 0 },
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


export const createWallGeometry = ( length,height) => {
  const WALL_HEIGHT = height;
  const WALL_THICKNESS = 0.2;
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
      name: 'Wall_Back',
      // Геометрията винаги е: (Дължина на стената, Височина, Дебелина)
      size: { w: length, h: WALL_HEIGHT, d: WALL_THICKNESS }, 
      pos: { x: 0, y: WALL_HEIGHT / 2+0.05, z:0 },
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


// Инициализираме лоудъра веднъж
const loader = new GLTFLoader();
export const loadRoomsGeometry = async (roomsData, scene) => {
  const baseMaterialWall = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
  const baseMaterialFloor = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });

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
            // Важно: Ползваме clone на оригиналния gltf.scene или на sideA, но трябва deep clone
            // За по-сигурно (защото .clone() понякога е плитък за SkinnedMesh):
            const sideB = gltf.scene.clone(); 
             sideB.traverse((child) => {
               if (child.isMesh) {
                 if (child.material) child.material = child.material.clone();
                 child.castShadow = true;
                 child.receiveShadow = true;
               }
            });

            // 4. Настройки на вътрешните мешове
            // Прилагаме мащаба от базата данни върху вътрешните обекти
            if (item.scale) {
                sideA.scale.set(item.scale.x, item.scale.y, item.scale.z);
                sideB.scale.set(item.scale.x, item.scale.y, -item.scale.z);
            }


            // Добавяме ги в групата
            doorGroup.add(sideA);
            doorGroup.add(sideB);

            // 5. Настройки на Групата (Позиция от базата)
            doorGroup.position.set(item.position.x, item.position.y, item.position.z);
            doorGroup.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);

            // 6. Metadata на групата
            doorGroup.name = "DoorGroup";
            doorGroup.userData = {
              id: item.id,
              type: 'door',
              roomId: room.id || room._id,
              wallId: item.wallId,
              filename: item.filename,
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

            windowGroup.add(windowModel);

            // Позиция и ротация от базата данни
            windowGroup.position.set(item.position.x, item.position.y, item.position.z);
            windowGroup.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);

            // Metadata на прозореца
            windowGroup.name = "WindowGroup";
            windowGroup.userData = {
              id: item.id,
              type: 'window',
              roomId: room.id || room._id,
              wallId: item.wallId,        // ВАЖНО: За да се мести със стената!
              filename: item.filename,
            };

            scene.add(windowGroup);

          } catch (err) {
            console.error(`Error loading window ${item.id}:`, err);
          }
        }
        // -----------------------------
        // СЛУЧАЙ 2: СТЕНА / ПОД (Без промяна)
        // -----------------------------
        else {
           // ... (твоят съществуващ код за стени/подове остава тук) ...
           if (!item.dimensions) continue;

           const geometry = new THREE.BoxGeometry(
             item.dimensions.width,
             item.dimensions.height,
             item.dimensions.depth
           );
           // ... и т.н. както си е в оригиналния код
           let material;
           if (item.type === 'floor') material = baseMaterialFloor.clone();
           else material = baseMaterialWall.clone();
           
           const mesh = new THREE.Mesh(geometry, material);
           // ... копирай си старите настройки за mesh ...
           mesh.position.set(item.position.x, item.position.y, item.position.z);
           mesh.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
           mesh.userData = { id: item.id, dimensions: item.dimensions, type: item.type, roomId: room.id || room._id };
           
           scene.add(mesh);
        }
      }
    }
  }
};