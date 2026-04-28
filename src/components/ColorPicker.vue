<template>
  <div class="professional-color-picker" @mousedown.stop>

    <button class="texture-btn custom-color-btn" @click="togglePopup" title="Custom Color">
      <div class="inner-color-preview" :style="{ backgroundColor: hexValue }"></div>
    </button>

    <transition name="fade">
      <div v-if="visible" class="color-picker-popup">

        <div class="gradient-box-parent" @mousedown="onSaturationLightnessMouseDown" ref="gradientBoxRef">
          <div class="gradient-box-base" :style="{ backgroundColor: `hsl(${h}, 100%, 50%)` }"></div>
          <div class="gradient-box-saturation"></div>
          <div class="gradient-box-lightness"></div>
          <div class="gradient-indicator" :style="{ left: `${s}%`, top: `${100 - l}%` }"></div>
        </div>

        <div class="controls-section">
          <div class="controls-left">
            <button v-if="isEyeDropperSupported" class="icon-btn picker-dropper" title="Pick from screen"
              @click="openEyeDropper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </button>
            <div class="color-preview-circle" :style="{ backgroundColor: hexValue }"></div>
          </div>

          <div class="hue-slider-parent" @mousedown="onHueMouseDown" ref="hueSliderRef">
            <div class="hue-slider-base"></div>
            <div class="gradient-indicator" :style="{ left: `${(h / 360) * 100}%` }"></div>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { computed, ref, watch,  onUnmounted } from 'vue';

const props = defineProps({
  initialColor: { type: String, default: '#000000' } // Приема initial Hex
});

const emit = defineEmits(['update:color']);

/* ---------------- COLOR STATE (Intern HSL) ---------------- */
// Ние управляваме цвета internally в HSL, защото това отговаря на 2D дъската.
const h = ref(0);   // Hue (0-360)
const s = ref(0);   // Saturation (0-100%)
const l = ref(0);   // Lightness (0-100%)

// Refs за взаимодействие
const visible = ref(false); // Pop-up control
const gradientBoxRef = ref(null);
const hueSliderRef = ref(null);

/* --- Инициализация на стейта от Hex --- */
const initialHsl = hexToHsl(props.initialColor);
h.value = initialHsl.h;
s.value = initialHsl.s;
l.value = initialHsl.l;

// Computed стойности за афиширане и output
const hexValue = computed(() => hslToHex(h.value, s.value, l.value));
const rgbValue = computed(() => hslToRgb(h.value, s.value, l.value));

/* ---------------- LOGIKA INTERACTIVE ---------------- */
function togglePopup() {
  visible.value = !visible.value;
}

// Изпращаме цвета веднага при промяна
watch(hexValue, (newHex) => {
  emit('update:color', newHex); // Изпращаме като Hex за handleColorChange
});

/* ---------------- 2D BOX INTERACTION (Drag) ---------------- */
let isDraggingBox = false;

function onSaturationLightnessMouseDown(e) {
  isDraggingBox = true;
  updateSaturationLightnessFromCoords(e);
  window.addEventListener('mousemove', onSaturationLightnessMouseMove);
  window.addEventListener('mouseup', onSaturationLightnessMouseUp);
}

function onSaturationLightnessMouseMove(e) {
  if (isDraggingBox) {
    updateSaturationLightnessFromCoords(e);
  }
}

function onSaturationLightnessMouseUp() {
  isDraggingBox = false;
  window.removeEventListener('mousemove', onSaturationLightnessMouseMove);
  window.removeEventListener('mouseup', onSaturationLightnessMouseUp);
}

function updateSaturationLightnessFromCoords(e) {
  const rect = gradientBoxRef.value.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;

  // Ограничаваме до границите на кутията
  x = Math.max(0, Math.min(x, rect.width));
  y = Math.max(0, Math.min(y, rect.height));

  // Превръщаме в HSL стойности
  s.value = Math.round((x / rect.width) * 100);
  l.value = Math.round(100 - (y / rect.height) * 100);
}

/* ---------------- HUE SLIDER INTERACTION (Drag) ---------------- */
let isDraggingHue = false;

function onHueMouseDown(e) {
  isDraggingHue = true;
  updateHueFromCoords(e);
  window.addEventListener('mousemove', onHueMouseMove);
  window.addEventListener('mouseup', onHueMouseUp);
}

function onHueMouseMove(e) {
  if (isDraggingHue) {
    updateHueFromCoords(e);
  }
}

function onHueMouseUp() {
  isDraggingHue = false;
  window.removeEventListener('mousemove', onHueMouseMove);
  window.removeEventListener('mouseup', onHueMouseUp);
}

function updateHueFromCoords(e) {
  const rect = hueSliderRef.value.getBoundingClientRect();
  let x = e.clientX - rect.left;

  x = Math.max(0, Math.min(x, rect.width));
  h.value = Math.round((x / rect.width) * 360);
}
/* ---------------- КОНВЕРТИРАНЕ НА ЦВЕТОВЕ (UTILS) ---------------- */
function hexToHsl(hex) {
  // Hex to RGB
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  // RGB to HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  // HSL to RGB
  s /= 100; l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; } else if (60 <= h && h < 120) { r = x; g = c; b = 0; } else if (120 <= h && h < 180) { r = 0; g = c; b = x; } else if (180 <= h && h < 240) { r = 0; g = x; b = c; } else if (240 <= h && h < 300) { r = x; g = 0; b = c; } else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255);
  // RGB to Hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; } else if (60 <= h && h < 120) { r = x; g = c; b = 0; } else if (120 <= h && h < 180) { r = 0; g = c; b = x; } else if (180 <= h && h < 240) { r = 0; g = x; b = c; } else if (240 <= h && h < 300) { r = x; g = 0; b = c; } else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/* ---------------- EYEDROPPER (ПИПЕТА) ---------------- */
const isEyeDropperSupported = 'EyeDropper' in window;

async function openEyeDropper() {
  if (!isEyeDropperSupported) return;

  try {
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();

    // Прилагаме избрания цвят
    const newHsl = hexToHsl(result.sRGBHex);
    h.value = newHsl.h;
    s.value = newHsl.s;
    l.value = newHsl.l;
  } catch (error) {
    console.log("Изборът с пипета беше отказан.");
  }
}

/* ---------------- LIFECYCLE ---------------- */
onUnmounted(() => {
  // Изчистваме Listener-ите
  window.removeEventListener('mousemove', onSaturationLightnessMouseMove);
  window.removeEventListener('mouseup', onSaturationLightnessMouseUp);
  window.removeEventListener('mousemove', onHueMouseMove);
  window.removeEventListener('mouseup', onHueMouseUp);
});
</script>
<style scoped>
/* Main Component - вече е компактен блок, за да влезе в Grid-а */
.professional-color-picker {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 42px;
  pointer-events: auto;
}

/* Стилът за квадратния бутон */
.texture-btn {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-color-btn {
  /* Шареният фон */
  background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);
}

.custom-color-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  border-color: white;
}

/* Кръгчето вътре, което показва реалния цвят */
.inner-color-preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

/* THE POPUP PANEL (остава същият) */
.color-picker-popup {
  position: absolute;
  top: 100%;
  margin-top: 8px;
  left: 0;
  width: 200px;
  height: 150px;
  background: color-mix(in srgb, var(--bg-soft), transparent 15%);
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
}

.section-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.8;
  margin: 0;
  color: #333;
}

.gradient-box-parent {
  position: relative;
  width: 100%;
  height: 180px;
  border-radius: 4px;
  cursor: crosshair;
  overflow: hidden;
}

.gradient-box-base,
.gradient-box-saturation,
.gradient-box-lightness {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.gradient-box-saturation {
  background: linear-gradient(to right, #fff 0%, rgba(255, 255, 255, 0) 100%);
}

.gradient-box-lightness {
  background: linear-gradient(to bottom, transparent 0%, #000 100%);
}

.gradient-indicator {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: 2px solid #333;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  color: #000;
}

.color-preview-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hue-slider-parent {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 5px;
  cursor: crosshair;
  overflow: hidden;
}

.hue-slider-base {
  width: 100%;
  height: 100%;
  background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
}

.rgb-field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.rgb-field {
  width: 48px;
  height: 24px;
  background: white;
  border: 1px solid #ced4da;
  color: #333;
  border-radius: 4px;
  padding: 2px 5px;
  font-size: 13px;
  text-align: center;
}

.rgb-label {
  font-size: 0.7rem;
  color: #555;
}

.mode-selector {
  position: absolute;
  bottom: 5px;
  right: 5px;
  cursor: pointer;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>