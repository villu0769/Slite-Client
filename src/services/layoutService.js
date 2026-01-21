import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export const loadLayout=async (layoutData, manager, maxHeight, scene, perspectiveCamera, controls, planeSize) => {
  if (!Array.isArray(layoutData) || layoutData.length === 0) return;

  const loader = new GLTFLoader(manager);
  await Promise.all(
    layoutData.map(async (item) => {
      try {
        const { default: modelUrl } = await import(`../models/${item.filename}.glb?url`);
        const gltf = await loader.loadAsync(modelUrl);
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        gltf.scene.position.sub(center);
        gltf.scene.position.x += item.position.x || 0;
        gltf.scene.position.y += item.position.y || 0;
        gltf.scene.position.z += item.position.z || 0;

        gltf.scene.name = item.name || item.filename;
        gltf.scene.userData = { id:item.id,filename: item.filename };
        gltf.scene.traverse((node) => {
          if (node.isMesh && node.material) {
            const mats = Array.isArray(node.material) ? node.material : [node.material];
            mats.forEach((m) => {
              if (m.map) m.map.encoding = THREE.sRGBEncoding;
              if (m.emissiveMap) m.emissiveMap.encoding = THREE.sRGBEncoding;
              if (m.aoMap) m.aoMap.encoding = THREE.sRGBEncoding;
              m.needsUpdate = true;
            });
          }
        });
        scene.add(gltf.scene);
      } catch (err) {
        alert(`Error loading ${item.filename}:`, err);
      }
    })
  );
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
}

export const updateProjectLayout=async (projectId, layoutData, token)=>{
  const response = await fetch(`http://localhost:5000/api/projects/${projectId}/layout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`, 
    },
    body: JSON.stringify({ layoutData }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update layout');
  }

  return response.json();
}
