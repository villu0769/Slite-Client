import { ref } from 'vue';

// --- Вътрешно състояние (Private state) ---
let historyStack = [];
let historyStep = -1;
const MAX_HISTORY = 40; // Намалено до 15, за да е леко и бързо

// Референции
let _roomsDataRef = null;
let _rebuildCallback = null;

// --- Експорти за Vue интерфейса ---
export const canUndo = ref(false);
export const canRedo = ref(false);

// Обновява реактивните променливи за бутоните
function updateFlags() {
    canUndo.value = historyStep > 0;
    canRedo.value = historyStep < historyStack.length - 1;
}

/**
 * ИЗЧИСТВА историята (решава проблема със смесването на проекти!)
 */
export function clearHistory() {
    historyStack = [];
    historyStep = -1;
    updateFlags();
}

/**
 * Инициализира мениджъра при зареждане на НОВ или СЪЩЕСТВУВАЩ проект.
 */
export function initHistory(roomsDataRef, rebuildCallback) {
    _roomsDataRef = roomsDataRef;
    _rebuildCallback = rebuildCallback;
    
    clearHistory(); // ЗАДЪЛЖИТЕЛНО чистим старата история от предния проект!
    saveState();    // Запазваме базовата точка (стъпка 0)
}

export function saveState() {
    if (!_roomsDataRef) return;

    // Ако сме цъкали Undo и сега направим нова промяна, трием напред "бъдещето"
    if (historyStep < historyStack.length - 1) {
        historyStack.splice(historyStep + 1);
    }

    // Записваме моментното състояние
    historyStack.push(JSON.parse(JSON.stringify(_roomsDataRef.value)));
    historyStep++;

    // Пазим масива кратък (трием най-старите)
    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
        historyStep--;
    }

    updateFlags();
}

export async function undo() {
    if (historyStep > 0) {
        historyStep--;
        await restoreState();
    }
}

export async function redo() {
    if (historyStep < historyStack.length - 1) {
        historyStep++;
        await restoreState();
    }
}

// Помощна функция: връща данните и преначертава сцената
async function restoreState() {
    if (!_roomsDataRef || !_rebuildCallback) return;
    
    // Връщаме данните във Vue обекта
    _roomsDataRef.value = JSON.parse(JSON.stringify(historyStack[historyStep]));
    
    // Казваме на Three.js да преначертае всичко
    await _rebuildCallback();
    updateFlags();
}