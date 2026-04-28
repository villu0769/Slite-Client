import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let cachedLoader = null;
export function getGLTFLoader(manager) {
  if (cachedLoader) return cachedLoader;
  const loader = new GLTFLoader(manager);
  cachedLoader = loader;
  return loader;
}
