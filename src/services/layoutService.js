import { getGLTFLoader } from '../services/gltfLoader'
import { handleTextureChange } from '../composables/textureManager' 

import * as THREE from 'three';
const API_URL = "https://slite-api.onrender.com";

export const loadLayout = async (layoutData, manager, maxHeight, scene, perspectiveCamera, controls, planeSize, hasWalls) => {
  if (!Array.isArray(layoutData) || layoutData.length === 0) return;

  const loader = getGLTFLoader(manager);

  await Promise.all(
    layoutData.map(async (item) => {
      // --- СТАРА ЧАСТ: Зареждане на мебели (.glb) ---
      try {
        const modelUrl = item.filename;

        // Зареждаме директно от URL-а
        const gltf = await loader.loadAsync(modelUrl);

        // Прилагане на трансформации
        gltf.scene.position.x = item.position.x || 0;
        gltf.scene.position.y = item.position.y || 0;
        gltf.scene.position.z = item.position.z || 0;
        gltf.scene.rotation.y = item.rotation.y || 0;
        if (item.scale) {
          gltf.scene.scale.set(item.scale.x, item.scale.y, item.scale.z);
        } else {
          // Дефолт, ако няма данни (за да не стане мащаб 0)
          gltf.scene.scale.set(1, 1, 1);
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
        if (item.texture) {
          await handleTextureChange(gltf.scene, item.texture, item.tiling || { x: 1, y: 1 });
        }
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
  const response = await fetch(`${API_URL}/api/projects/${projectId}/layout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ layoutData }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
}

export const addRoom = async (projectId, wallsData) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/rooms/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(wallsData),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};


export const deleteRoom = async (projectId, roomId) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/rooms/delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ roomId }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};

export const updateRoom = async (projectId, roomId, wallsData) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/rooms`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ roomId, wallsData }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};
