import * as THREE from 'three';

// Private state
let resizeLeftHandle = null;
let resizeRightHandle = null;
let resizeTopHandle = null;    // За пода (Z-)
let resizeBottomHandle = null; // За пода (Z+)

// --- Cleanup ---
export function removeResizeHandles() {
  const handles = [resizeLeftHandle, resizeRightHandle, resizeTopHandle, resizeBottomHandle];
  
  handles.forEach(handle => {
    if (handle) {
      if (handle.parent) handle.parent.remove(handle);
      if (handle.geometry) handle.geometry.dispose();
    }
  });

  resizeLeftHandle = null;
  resizeRightHandle = null;
  resizeTopHandle = null;
  resizeBottomHandle = null;
}

// --- Creation ---
export function createResizeHandles(target, scene) {
  // 1. Clear old handles
  removeResizeHandles();

  if (!target || !target.geometry) return;

  // ПРОВЕРКА ЗА ТИПА: Позволяваме и стени, и подове!
  const type = target.userData.type;
  if (type !== 'wall' && type !== 'floor') return;

  if (!scene) {
      console.error("ResizeHandles: 'scene' is undefined. Cannot add handles.");
      return;
  }

  // 2. Geometry & Material
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
    // Подаваме и target, и wall, за да сме сигурни, че няма да счупим стария ти код в onPointerDown
    tail.userData = { isResizeHandle: true, side: side, target: target, wall: target };
    tail.renderOrder = 999; // Force to draw LAST (on top)

    const head = new THREE.Mesh(headGeo, material);
    head.userData = { isResizeHandle: true, side: side, target: target, wall: target };
    head.position.z = 0.25; // Offset head
    
    tail.add(head);
    return tail;
  }

  // 4. Create Meshes (Винаги създаваме ляво/дясно)
  resizeLeftHandle = buildArrow('left');
  resizeRightHandle = buildArrow('right');
  scene.add(resizeLeftHandle);
  scene.add(resizeRightHandle);

  // Създаваме горе/долу САМО за пода
  if (type === 'floor') {
    resizeTopHandle = buildArrow('top');
    resizeBottomHandle = buildArrow('bottom');
    scene.add(resizeTopHandle);
    scene.add(resizeBottomHandle);
  }

  // 5. Set initial positions
  updateHandlePositions(target);
}

// --- Position Sync ---
export function updateHandlePositions(target) {
    if (!target) return;
    
    const type = target.userData.type;

    // B. Get World Data
    const targetPos = new THREE.Vector3();
    const targetQuat = new THREE.Quaternion();
    target.getWorldPosition(targetPos);
    target.getWorldQuaternion(targetQuat);

    const padding = 0.5;

    // ==========================================
    // ЛОГИКА ЗА X ОСТА (ШИРИНА) - И ЗА СТЕНА, И ЗА ПОД
    // ==========================================
    if (resizeLeftHandle && resizeRightHandle) {
        const currentScaleX = Math.abs(target.scale.x || 1); 
        // Взимаме ширината (с проверка дали съществува в dimensions)
        const baseWidth = target.userData.dimensions?.width || target.geometry.parameters.width || 1;
        const width = baseWidth * currentScaleX;
        
        const leftOffset = new THREE.Vector3(-width / 2 - padding, 0, 0).applyQuaternion(targetQuat);
        const rightOffset = new THREE.Vector3(width / 2 + padding, 0, 0).applyQuaternion(targetQuat);
        
        resizeLeftHandle.position.copy(targetPos).add(leftOffset);
        resizeLeftHandle.quaternion.copy(targetQuat);
        resizeLeftHandle.rotateY(-Math.PI / 2); // Point outward
        
        resizeRightHandle.position.copy(targetPos).add(rightOffset);
        resizeRightHandle.quaternion.copy(targetQuat);
        resizeRightHandle.rotateY(Math.PI / 2); // Point outward
        
        resizeLeftHandle.updateMatrixWorld();
        resizeRightHandle.updateMatrixWorld();
    }

    // ==========================================
    // ЛОГИКА ЗА Z ОСТА (ДЪЛБОЧИНА) - САМО ЗА ПОД
    // ==========================================
    if (type === 'floor' && resizeTopHandle && resizeBottomHandle) {
        const currentScaleZ = Math.abs(target.scale.z || 1); 
        // Взимаме дълбочината (или height, ако подът е 2D Plane)
        const baseDepth = target.userData.dimensions?.depth || target.userData.dimensions?.height || target.geometry.parameters.depth || 1;
        const depth = baseDepth * currentScaleZ;

        const topOffset = new THREE.Vector3(0, 0, -depth / 2 - padding).applyQuaternion(targetQuat);
        const bottomOffset = new THREE.Vector3(0, 0, depth / 2 + padding).applyQuaternion(targetQuat);

        // Top (назад по -Z)
        resizeTopHandle.position.copy(targetPos).add(topOffset);
        resizeTopHandle.quaternion.copy(targetQuat);
        resizeTopHandle.rotateY(Math.PI); // Point backward

        // Bottom (напред по +Z)
        resizeBottomHandle.position.copy(targetPos).add(bottomOffset);
        resizeBottomHandle.quaternion.copy(targetQuat);
        // Без ротация сочи напред (default)

        resizeTopHandle.updateMatrixWorld();
        resizeBottomHandle.updateMatrixWorld();
    }
}