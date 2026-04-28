<template>
  <div class="furniture-container">
    <div class="header-actions">
      <div class="title-area">
        <button v-if="selectedCategory" class="btn btn-secondary" @click="goBack" title="Back to Categories">
          &larr; Назад
        </button>
        <h2>{{ selectedCategory ? `Модели в ${currentCategoryLabel}` : 'Категории' }}</h2>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        + {{ selectedCategory ? 'Добави модел' : 'Добави категория' }}
      </button>
    </div>

    <div v-if="isLoading" class="state-msg">Loading data...</div>

    <div v-else-if="!selectedCategory" class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Име на категория</th>
            <th>ID</th>
            <th>Брой модели</th>
            <th class="actions-col">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat._id" @click="openCategory(cat._id)" class="clickable-row">
            <td data-label="Category Name"><strong>{{ cat.name }}</strong></td>
            <td class="id-col" data-label="ID">{{ cat._id }}</td>
            <td data-label="Items Count">{{ cat.items ? cat.items.length : 0 }}</td>
            <td class="actions-col" data-label="Actions" @click.stop>
              <button v-if="!cat.non_furniture_type" class="btn btn-delete" @click="deleteCategory(cat._id)" title="Delete Category">
                Изтрий
              </button>
            </td>
          </tr>
          <tr v-if="categories.length === 0">
            <td colspan="4" class="state-msg empty-row">Няма намерени категории.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Име на модела</th>
            <th>Име на файл</th>
            <th class="actions-col">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleItems" :key="item.filename">
            <td data-label="Item Name"><strong>{{ item.name }}</strong></td>
            <td class="id-col" data-label="Filename">{{ item.filename }}</td>
            <td class="actions-col" data-label="Actions">
              <button class="btn btn-delete" @click="deleteItem(selectedCategory,item.filename)" title="Delete Item">
                Изтрий
              </button>
            </td>
          </tr>
          <tr v-if="visibleItems.length === 0">
            <td colspan="4" class="state-msg empty-row">Няма намерени модели в тази категория.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="glass-modal">
          <div class="modal-header">
            <h3>{{ modalMode === 'category' ? 'Добави нова категория' : 'Добави нов модел' }}</h3>
            <button class="btn-close" @click="closeModal">&times;</button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="form-group">
              <label>Име</label>
              <input type="text" v-model="formData.name" required placeholder="Въведете име..." />
            </div>

            <template v-if="modalMode === 'item'">
              <div class="form-group">
                <label>Изображение (.jpg, .png)</label>
                <input type="file" accept="image/*" @change="e => handleFile(e, 'pic')" required />
              </div>
              <div class="form-group">
                <label>3D Модел (.gltf, .glb)</label>
                <input type="file" accept=".gltf,.glb" @change="e => handleFile(e, 'model')" required />
              </div>
            </template>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="isUploading">
                {{ isUploading ? 'Запис...' : 'Запази' }}
              </button>
            </div>
            <p v-if="uploadError" class="error-msg">{{ uploadError }}</p>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { getFurnitureCategories, addFurnitureItem, addFurnitureCategory ,deleteFurnitureCategory, deleteFurnitureItem} from '../../services/furnitureService'; 

const categories = ref([]);
const isLoading = ref(false);

const fetchData = async () => {
  try {
    isLoading.value = true;
    categories.value = await getFurnitureCategories();
  } catch (error) {
    console.error("Failed to load furniture categories:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

/* -------------------------
   SELECTION & NAVIGATION
------------------------- */
const selectedCategory = ref(null);

const currentCategoryObj = computed(() => 
  categories.value.find(c => c._id === selectedCategory.value)
);

const currentCategoryLabel = computed(() => 
  currentCategoryObj.value ? currentCategoryObj.value.name : ''
);

const visibleItems = computed(() => 
  currentCategoryObj.value ? currentCategoryObj.value.items : []
);

function openCategory(catId) {
  selectedCategory.value = catId;
}

function goBack() {
  selectedCategory.value = null;
}

/* -------------------------
   MODAL & UPLOAD LOGIC
------------------------- */
const showModal = ref(false);
const modalMode = ref('item'); 
const isUploading = ref(false);
const uploadError = ref('');

const formData = reactive({
  name: '',
  pic: null,
  model: null
});

function openAddModal() {
  modalMode.value = selectedCategory.value ? 'item' : 'category';
  formData.name = '';
  formData.pic = null;
  formData.model = null;
  uploadError.value = '';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function handleFile(event, type) {
  const file = event.target.files[0];
  if (file) {
    formData[type] = file;
  }
}

async function submitForm() {
  isUploading.value = true;
  uploadError.value = '';

  try {
    if (modalMode.value === 'item') {
      if (!formData.pic || !formData.model) {
        throw new Error("Please select both files.");
      }
      await addFurnitureItem(
        selectedCategory.value,
        formData.name, 
        formData.pic, 
        formData.model
      );
    } else {
      await addFurnitureCategory(formData.name);
    }

    await fetchData();
    closeModal();
    
  } catch (error) {
    console.error("Грешка във формата:", error);
    uploadError.value = error.message;
  } finally {
    isUploading.value = false;
  }
}

/* -------------------------
   DELETE LOGIC
------------------------- */
async function deleteCategory(id) {
  if (!confirm("Are you sure you want to delete this category?")) return;
  await deleteFurnitureCategory(id);
  fetchData();
}

async function deleteItem(categoryId, filename) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  await deleteFurnitureItem(categoryId, filename);
  fetchData();
}
</script>

<style scoped>
@import 'Admin.css';
</style>