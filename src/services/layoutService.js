import { getGLTFLoader } from '../services/gltfLoader'

import * as THREE from 'three';
// Дефинирай материалите извън функцията или в началото, за да са консистентни
const floorMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5 });
const wallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });

export const loadLayout = async (layoutData, manager, maxHeight, scene, perspectiveCamera, controls, planeSize) => {
  if (!Array.isArray(layoutData) || layoutData.length === 0) return;

  const loader = getGLTFLoader(manager);

  await Promise.all(
    layoutData.map(async (item) => {

      // --- НОВА ЧАСТ: Проверка за Custom обекти (Стени/Под) ---
      if (item.filename === 'custom_floor' || item.filename === 'custom_wall') {
        try {
          // 1. Взимаме размерите, записани в JSON-а (или дефолтни)
          const w = item.dims ? item.dims.w : 1;
          const h = item.dims ? item.dims.h : 1;
          const d = item.dims ? item.dims.d : 1;

          // 2. Създаваме геометрия
          const geometry = new THREE.BoxGeometry(w, h, d);

          // 3. Избираме материал
          const material = (item.filename === 'custom_floor') ? floorMat : wallMat;

          const mesh = new THREE.Mesh(geometry, material);

          // 4. Възстановяване на трансформациите
          // Важно: Понеже при създаването на стая сме позиционирали geometry-то специфично,
          // тук просто връщаме позицията на меша.
          mesh.position.set(item.position.x, item.position.y, item.position.z);
          // Rotation
          mesh.rotation.set(
            item.rotation.x || 0,
            item.rotation.y || 0,
            item.rotation.z || 0
          );
          // Scale (обикновено е 1, но ако е скалирано по-късно)
          mesh.scale.set(
            item.scale.x || 1,
            item.scale.y || 1,
            item.scale.z || 1
          );

          // 5. Възстановяване на данни
          mesh.name = item.name;
          mesh.userData = {
            id: item.id,
            filename: item.filename,
            dims: item.dims // Запазваме dims, за да може пак да се сейвне правилно
          };

          // Добавяме в сцената
          scene.add(mesh);

          return; // <-- ВАЖНО: Спираме дотук за този item, не търсим .glb файл
        } catch (err) {
          console.error("Error creating custom geometry", err);
          return;
        }
      }
      // --------------------------------------------------------

      // --- СТАРА ЧАСТ: Зареждане на мебели (.glb) ---
      try {
        const modelUrl = `/models/${item.filename}.glb`;

        // Зареждаме директно от URL-а
        const gltf = await loader.loadAsync(modelUrl);

        // Центриране (ако е правено при drop)
        // ВАЖНО: Ако при drop logic-а сте ползвали box center offset, тук може да има леко разминаване, 
        // но обикновено записаната позиция в layoutData вече е коригираната world position.
        // Затова тук може би НЕ трябва да вадим центъра отново, ако позицията е финална.
        // Но ако старата ви логика е работела така, я оставям:

        // Прилагане на трансформации
        gltf.scene.position.x = item.position.x || 0;
        gltf.scene.position.y = item.position.y || 0;
        gltf.scene.position.z = item.position.z || 0;
        gltf.scene.rotation.y = item.rotation.y || 0;

        // Мащабиране (добавих го, защото често липсва)
        if (item.scale) {
          gltf.scene.scale.set(item.scale.x, item.scale.y, item.scale.z);
        }

        gltf.scene.name = item.name || item.filename;
        gltf.scene.userData = { id: item.id, filename: item.filename };

        // Fix textures/colors
        gltf.scene.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              if (m.map) m.map.encoding = THREE.sRGBEncoding;
              if (m.emissiveMap) m.emissiveMap.encoding = THREE.sRGBEncoding;
              if (m.aoMap) m.aoMap.encoding = THREE.sRGBEncoding;
              m.needsUpdate = true;
            });
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        scene.add(gltf.scene);
      } catch (err) {
        console.warn(`Error loading model ${item.filename}:`, err);
      }
    })
  );

  // Camera settings (запазваме си ги както бяха)
  const fov = perspectiveCamera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxHeight / 2 / Math.tan(fov / 2));
  cameraZ *= 2.8;
  if (!isFinite(cameraZ) || cameraZ === 0) cameraZ = 5;

  perspectiveCamera.position.set(planeSize * 0.2, Math.max(1, maxHeight * 0.5), maxHeight);
  perspectiveCamera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.update();
  controls.minDistance = Math.max(0.1, maxHeight * 0.15);
  controls.maxDistance = Math.max(cameraZ * 2, 50);
  controls.zoomSpeed = 1.6;
};

export const updateProjectLayout = async (projectId, layoutData) => {
  const response = await fetch(`http://localhost:5000/api/projects/${projectId}/layout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ layoutData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update layout');
  }

  return response.json();
}
