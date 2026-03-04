import * as THREE from 'three';

const FIT_MARGIN = 1.5;

export const computeSceneBoundingBox = (root)=> {
  const box = new THREE.Box3();
  let any = false;

  root.traverse(obj => {
    if (obj.visible && obj.isMesh && obj.name !== 'floor') {
      const geom = obj.geometry;
      if (geom) {
        if (!geom.boundingBox) geom.computeBoundingBox();
        const geomBox = geom.boundingBox.clone();
        obj.updateWorldMatrix(true, false);
        geomBox.applyMatrix4(obj.matrixWorld);
        box.union(geomBox);
        any = true;
      }
    }
  });

  if (!any) {
    box.set(
      new THREE.Vector3(-1, -1, -1),
      new THREE.Vector3(1, 1, 1)
    );
  }

  return box;
}

export const  fitPerspectiveCameraToBox=(camera, box, controls)=> {
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius * FIT_MARGIN;

  const fov = (camera.fov * Math.PI) / 180;
  const distance = radius / Math.sin(fov / 2);

  const offset = new THREE.Vector3(0, radius * 0.6, distance * 1.05);
  camera.position.copy(center).add(offset);

  camera.lookAt(center);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

export const fitOrthoCameraToBox=(camera, box, renderer)=> {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).multiplyScalar(FIT_MARGIN);

  const canvasW = renderer.domElement.clientWidth || renderer.domElement.width;
  const canvasH = renderer.domElement.clientHeight || renderer.domElement.height;
  const aspect = canvasW / canvasH;

  const halfW = size.x / 2;
  const halfH = size.y / 2;

  if ((halfW / halfH) > aspect) {
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfW / aspect;
    camera.bottom = -halfW / aspect;
  } else {
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
  }

  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(
    center.x,
    center.y + maxDim * 1.2,
    center.z + 0.01
  );

  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
