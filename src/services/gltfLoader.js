import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let cachedLoader = null;
export function getGLTFLoader(manager) {
  if (cachedLoader) return cachedLoader;
  const loader = new GLTFLoader(manager);
  cachedLoader = loader;
  return loader;
}

import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export function setupMirrors(object3D) {
    const mirrorsToAdd = [];

    object3D.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('mirror')) {
            
            const reflector = new Reflector(child.geometry, {
                clipBias: 0.003,
                textureWidth: 512,
                textureHeight: 512,
                color: 0xaaaaaa // Лек сив нюанс за реализъм
            });

            reflector.position.copy(child.position);
            reflector.rotation.copy(child.rotation);
            reflector.scale.copy(child.scale);

            child.visible = false;

            mirrorsToAdd.push({
                parent: child.parent,
                reflector: reflector
            });

            console.log(`Огледало успешно приложено върху: ${child.name}`);
        }
    });

    // 5. След като сме приключили с търсенето, добавяме реалните огледала към сцената/модела
    mirrorsToAdd.forEach(item => {
        if (item.parent) {
            item.parent.add(item.reflector);
        }
    });
}