// services/gltfLoader.js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Махаме import { DRACOLoader } ...

let cachedLoader = null;

export function getGLTFLoader(manager) {
  if (cachedLoader) return cachedLoader;

  const loader = new GLTFLoader(manager);

  // Махаме целия блок с dracoLoader.setDecoderPath(...)
  // Махаме loader.setDRACOLoader(...)

  cachedLoader = loader;
  return loader;
}