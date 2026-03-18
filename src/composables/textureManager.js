import * as THREE from 'three';
/**
 * Сменя текстурата на обект и синхронизира със стейта
 */
export const  handleColorChange = (object, colorCode) =>{
  if (!object || !colorCode) return;

  // --- ОБХОЖДАНЕ И ПОДМЯНА НА МАТЕРИАЛИ ---
  object.traverse((child) => {
    if (child.isMesh && child.material) {

      // Помощна функция за безопасна подмяна
      const applyToMaterialSafely = (mat, index = null) => {
        if (!mat) return;

        // 1. ПРОВЕРКА ЗА СТЪКЛО И МЕТАЛ
        const matName = (mat.name || '').toLowerCase();

        const isGlass = matName.includes('glass') || (mat.transparent === true && mat.opacity < 1);
        const isMetal = matName.includes('metal') || matName.includes('chrome') || matName.includes('steel') || matName.includes('aluminum');

        // Ако е стъкло или метал, директно прекъсваме и не пипаме този материал
        if (isGlass || isMetal) return;

        // 2. КЛОНИРАНЕ (За да не променяме всички инстанции на този модел в сцената)
        const newMat = mat.clone();
        
        // ВАЖНО: Премахваме старата текстура, за да се вижда чисто новият цвят
        newMat.map = null; 
        
        // Задаваме новия цвят
        if (newMat.color) {
          newMat.color.set(colorCode); // .set() приема hex стрингове като '#ff0000'
        }
        
        newMat.metalness = 0.1;
        newMat.roughness = 0.6;
        newMat.needsUpdate = true;

        // 3. ПРИЛАГАНЕ НА НОВИЯ МАТЕРИАЛ
        if (index !== null) {
          child.material[index] = newMat; // Ако е масив от материали
        } else {
          child.material = newMat;        // Ако е единичен материал
        }
      };

      if (Array.isArray(child.material)) {
        // Важно: Правим плитко копие на масива, за да можем да подменяме елементи в него
        child.material = [...child.material];
        child.material.forEach((mat, idx) => applyToMaterialSafely(mat, idx));
      } else {
        applyToMaterialSafely(child.material);
      }
    }
  });

  // --- ЗАПАЗВАНЕ В СТЕЙТА НА ОБЕКТА ---
  object.userData.texture = colorCode;

}

export async function handleTextureChange(object, textureFilename) {

  if (!object || !textureFilename) return;

  const loader = new THREE.TextureLoader();

  try {
    const texture = await loader.loadAsync(`/app/pics/textures/${textureFilename}`);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;

    // --- ОБХОЖДАНЕ И ПОДМЯНА НА МАТЕРИАЛИ ---
    object.traverse((child) => {
      if (child.isMesh && child.material) {

        // Помощна функция за безопасна подмяна
        const applyToMaterialSafely = (mat, index = null) => {
          if (!mat) return;

          // 1. ПРОВЕРКА ЗА СТЪКЛО И МЕТАЛ
          const matName = (mat.name || '').toLowerCase();

          const isGlass = matName.includes('glass') || (mat.transparent === true && mat.opacity < 1);
          const isMetal = matName.includes('metal') || matName.includes('chrome') || matName.includes('steel') || matName.includes('aluminum');

          // Ако е стъкло или метал, директно прекъсваме и не пипаме този материал
          if (isGlass || isMetal) return;
          // 2. КЛОНИРАНЕ (За да не променяме всички инстанции на този модел в сцената)
          const newMat = mat.clone();
          newMat.map = texture;
          newMat.needsUpdate = true;
          if (newMat.color) {
            newMat.color.setHex(0xffffff);
          }
          
            newMat.metalness = 0.1;
            newMat.roughness = 0.6;
          // 3. ПРИЛАГАНЕ НА НОВИЯ МАТЕРИАЛ
          if (index !== null) {
            child.material[index] = newMat; // Ако е масив от материали
          } else {
            child.material = newMat;        // Ако е единичен материал
          }
        };

        if (Array.isArray(child.material)) {
          // Важно: Правим плитко копие на масива, за да можем да подменяме елементи в него
          child.material = [...child.material];
          child.material.forEach((mat, idx) => applyToMaterialSafely(mat, idx));
        } else {
          applyToMaterialSafely(child.material);
        }
      }
    });

    // --- ЗАПАЗВАНЕ В СТЕЙТА НА ОБЕКТА ---
    object.userData.texture = textureFilename;

  } catch (error) {
    console.error("Texture Load Error:", error);
  }
}