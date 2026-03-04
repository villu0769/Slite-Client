import * as THREE from 'three';

/**
 * Сменя текстурата на обект и синхронизира със стейта
 */
export async function handleTextureChange(object, textureFilename, options = {}) {
  const {
    tiling = { x: 1, y: 1 },
    // isRoomObject,          
    // updateRoomEntry,       
    // saveChanges
  } = options;

  if (!object || !textureFilename) return;

  const loader = new THREE.TextureLoader();
  
  try {
    const texture = await loader.loadAsync(`/app/pics/textures/${textureFilename}`);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(tiling.x, tiling.y);
    texture.colorSpace = THREE.SRGBColorSpace;

    // Защитна функция - проверява дали материалът изобщо съществува
    const applyToMaterial = (mat) => {
      if (!mat) return; 
      mat.map = texture;
      mat.needsUpdate = true;
    };

    // ВАЖНО: Обхождаме обекта, в случай че е THREE.Group
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(applyToMaterial);
        } else {
          applyToMaterial(child.material);
        }
      }
    });

    // Записваме метаданните в главния обект
    object.userData.textureUrl = textureFilename;
    object.userData.tiling = tiling;

    return texture;
  } catch (error) {
    console.error("Texture Load Error:", error);
  }
}