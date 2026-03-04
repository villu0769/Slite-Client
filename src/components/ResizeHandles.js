import * as THREE from 'three';

// Private state
let resizeLeftHandle = null;
let resizeRightHandle = null;

// --- Cleanup ---
export function removeResizeHandles() {
  if (resizeLeftHandle) {
    if (resizeLeftHandle.parent) resizeLeftHandle.parent.remove(resizeLeftHandle);
    resizeLeftHandle.geometry.dispose();
    resizeLeftHandle = null;
  }
  if (resizeRightHandle) {
    if (resizeRightHandle.parent) resizeRightHandle.parent.remove(resizeRightHandle);
    resizeRightHandle.geometry.dispose();
    resizeRightHandle = null;
  }
}

// --- Creation ---
export function createResizeHandles(wall, scene) {
  // 1. Clear old handles
  removeResizeHandles();

  if (!wall || !wall.geometry || wall.userData.type !== 'wall') return;
  if (!scene) {
      console.error("ResizeHandles: 'scene' is undefined. Cannot add handles.");
      return;
  }

  // 2. Geometry & Material
  // We rotate geometry upfront so we don't have to fight rotations later
  const tailGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 16);
  tailGeo.rotateX(Math.PI / 2); // Lay flat on Z
  
  const headGeo = new THREE.ConeGeometry(0.10, 0.2, 16);
  headGeo.rotateX(Math.PI / 2); // Lay flat on Z

  const material = new THREE.MeshBasicMaterial({
    color: 0x00AEEF,
    depthTest: false,  // ALWAYS render on top of geometry
    transparent: true,
    opacity: 0.6
  });

  // 3. Builder Helper
  function buildArrow(side) {
    const tail = new THREE.Mesh(tailGeo, material);
    tail.userData = { isResizeHandle: true, side: side,wall:wall };
    tail.renderOrder = 999; // Force to draw LAST (on top)

    const head = new THREE.Mesh(headGeo, material);
    head.userData = { isResizeHandle: true, side: side ,wall:wall};
    head.position.z = 0.25; // Offset head
    
   // if (side === 'left') head.rotation.x = Math.PI; // Flip head for left

    tail.add(head);
    return tail;
  }

  // 4. Create Meshes
  resizeLeftHandle = buildArrow('left');
  resizeRightHandle = buildArrow('right');

  // 5. Add to SCENE (Not Wall) to avoid OutlinePass
  scene.add(resizeLeftHandle);
  scene.add(resizeRightHandle);

  // 6. Set initial positions
  updateHandlePositions(wall);
}

// --- Position Sync ---
export function updateHandlePositions(wall) {
    if (!resizeLeftHandle || !resizeRightHandle || !wall) return;

    // A. Calculate Width taking SCALE into account
    // (This was likely why they were invisible - they were inside the wall)
    const currentScale = wall.scale.x || 1; 
    const width = wall.userData.dimensions.width * currentScale; 
    
    // B. Get Wall's World Data
    const wallPos = new THREE.Vector3();
    const wallQuat = new THREE.Quaternion();
    wall.getWorldPosition(wallPos);
    wall.getWorldQuaternion(wallQuat);

    // C. Calculate Offsets (Local X axis)
    const padding = 0.5;
    
    // Left Offset
    const leftOffset = new THREE.Vector3(-width / 2 - padding, 0, 0);
    leftOffset.applyQuaternion(wallQuat); // Rotate to World Space
    
    // Right Offset
    const rightOffset = new THREE.Vector3(width / 2 + padding, 0, 0);
    rightOffset.applyQuaternion(wallQuat);

    // D. Apply to Handles
    // Left
    resizeLeftHandle.position.copy(wallPos).add(leftOffset);
    resizeLeftHandle.quaternion.copy(wallQuat);
    resizeLeftHandle.rotateY(-Math.PI / 2); // Point outward
    
    // Right
    resizeRightHandle.position.copy(wallPos).add(rightOffset);
    resizeRightHandle.quaternion.copy(wallQuat);
    resizeRightHandle.rotateY(Math.PI / 2); // Point outward
    
    // Force update matrix to prevent render lag
    resizeLeftHandle.updateMatrixWorld();
    resizeRightHandle.updateMatrixWorld();
}
