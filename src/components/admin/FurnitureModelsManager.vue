<template>
  <div class="furniture-container">
    <div class="header-actions">
      <div class="title-area">
        <button v-if="selectedCategory" class="btn btn-secondary" @click="goBack" title="Back to Categories">
          &larr; Back
        </button>
        <h2>{{ selectedCategory ? `Items in ${currentCategoryLabel}` : 'Furniture Categories' }}</h2>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        + {{ selectedCategory ? 'Add Item' : 'Add Category' }}
      </button>
    </div>

    <div v-if="isLoading" class="state-msg">Loading data...</div>

    <div v-else-if="!selectedCategory" class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Category Name</th>
            <th>ID</th>
            <th>Items Count</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat._id" @click="openCategory(cat._id)" class="clickable-row">
            <td><strong>{{ cat.name }}</strong></td>
            <td class="id-col">{{ cat._id }}</td>
            <td>{{ cat.items ? cat.items.length : 0 }}</td>
            <td class="actions-col" @click.stop>
              <button v-if="!cat.non_furniture_type" class="btn btn-delete" @click="deleteCategory(cat._id)" title="Delete Category">
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="categories.length === 0">
            <td colspan="4" class="state-msg">No categories found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Filename</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visibleItems" :key="item.filename">
           
            <td><strong>{{ item.name }}</strong></td>
            <td class="id-col">{{ item.filename }}</td>
            <td class="actions-col">
              <button  class="btn btn-delete" @click="deleteItem(selectedCategory,item.filename)" title="Delete Item">
                Delete
              </button>
            </td>
          </tr>
          <tr v-if="visibleItems.length === 0">
            <td colspan="4" class="state-msg">No items in this category.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="glass-modal">
          <div class="modal-header">
            <h3>{{ modalMode === 'category' ? 'Add New Category' : 'Add New Item' }}</h3>
            <button class="btn-close" @click="closeModal">&times;</button>
          </div>

          <form @submit.prevent="submitForm">
            <div class="form-group">
              <label>Name</label>
              <input type="text" v-model="formData.name" required placeholder="Enter name..." />
            </div>

            <template v-if="modalMode === 'item'">
              <div class="form-group">
                <label>Thumbnail Image (.jpg, .png)</label>
                <input type="file" accept="image/*" @change="e => handleFile(e, 'pic')" required />
              </div>
              <div class="form-group">
                <label>3D Model (.gltf, .glb)</label>
                <input type="file" accept=".gltf,.glb" @change="e => handleFile(e, 'model')" required />
              </div>
            </template>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="isUploading">
                {{ isUploading ? 'Saving...' : 'Save' }}
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