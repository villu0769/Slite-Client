<template>
  <div class="users-container">
    <div class="header-actions">
      <h2>Потребители</h2>
      <button class="btn btn-primary" @click="openRegisterModal">
        + Нов потребител
      </button>
    </div>

    <div v-if="isLoading" class="state-msg">Зареждане...</div>
    <div v-else-if="isError" class="state-msg error">{{ error.message }}</div>

    <div v-else class="table-responsive">
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Потребител</th>
            <th>Email</th>
            <th>Роля</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in data?.users" :key="user._id">
            <td class="id-col" data-label="ID">..{{ user._id.slice(-4) }}</td>
            <td data-label="Потребител">{{ user.username || user.name }}</td>
            <td data-label="Email">{{ user.email }}</td>
            <td data-label="Роля">
              <div class="role-select-wrapper">
                <select 
                  :value="user.role || 'user'" 
                  @change="handleRoleChange(user._id, $event)"
                  :class="['role-select', user.role === 'admin' ? 'admin' : 'user']"
                  :disabled="updatingUserId === user._id"
                >
                  <option value="user" v-if="user.username !== localUsername">Обикновен потребител</option>
                  <option value="admin">Админ</option>
                </select>
                <span v-if="updatingUserId === user._id" class="saving-spinner">⏳</span>
              </div>
            </td>
            <td data-label="Действия">
              <button v-if="user.role !== 'admin'" class="btn btn-delete" @click="handleDeleteUser(user._id)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="data?.pagination" class="pagination-controls">
      <button 
        class="btn btn-secondary" 
        :disabled="!data?.pagination.hasPrevPage"
        @click="prevPage"
      > &lt; </button>

      <span class="page-info">
        {{ data.pagination.currentPage }} / {{ data.pagination.totalPages }}
      </span>

      <button 
        class="btn btn-secondary" 
        :disabled="!data.pagination.hasNextPage"
        @click="nextPage"
      > &gt; </button>
    </div>

    <div v-if="isRegistering" class="modal-backdrop" @click.self="closeRegisterModal">
      <div class="glass-modal">
        <h3>Нов потребител</h3>
        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label>Email</label>
            <input v-model="form.email" type="email" required placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label>Username</label>
            <input v-model="form.username" type="text" required placeholder="user123" />
          </div>
          <div class="form-group">
            <label>Роля</label>
            <select v-model="form.role">
              <option value="user">Обикновен потребител</option>
              <option value="admin">Админ</option>
            </select>
          </div>
          <div class="form-group">
            <label>Парола</label>
            <div class="password-group">
              <input v-model="form.password" type="text" readonly />
              <button type="button" class="btn btn-secondary" @click="regeneratePassword">↻</button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeRegisterModal">Отказ</button>
            <button type="submit" class="btn btn-primary" :disabled="mutation.isLoading.value">
              {{ mutation.isLoading.value ? '...' : 'Създай' }}
            </button>
          </div>
          <p v-if="mutation.isError.value" class="error-msg">
            {{ mutation.error.value.message }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useQuery, useMutation, useQueryClient } from 'vue-query';
// ДОБАВЕНО: Импорт на updateUserRole от сървиса
import { fetchUsers, registerUser, deleteUser, updateUserRole } from '../../services/authService';
import { localId } from 'three/tsl';

const queryClient = useQueryClient();
const page = ref(1);
const limit = 10;
const isRegistering = ref(false);
const localUsername = localStorage.getItem('username');
// ДОБАВЕНО: Следим кое ID се обновява в момента за loading ефекта
const updatingUserId = ref(null); 

// 1. Fetch Users
const { data, isLoading, isError, error } = useQuery(
  ['users', page], 
  () => fetchUsers(page.value, limit),
  { keepPreviousData: true }
);

// 2. Pagination Handlers
const nextPage = () => { if (data.value.data.pagination.hasNextPage) page.value++; };
const prevPage = () => { if (data.value.data.pagination.hasPrevPage) page.value--; };

// 3. Form & Logic
const form = reactive({ email: '', username: '', role: 'user', password: '' });

const genPass = () => {
  const chars = '&013459_abcdfgijkopstvyz-BCDEGHIJKMPQTUVXY+';
  let pass = '';
  for (let i = 0; i < 16; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
};
const regeneratePassword = () => form.password = genPass();

const openRegisterModal = () => {
  Object.assign(form, { email: '', username: '', role: 'user', password: genPass() });
  isRegistering.value = true;
};
const closeRegisterModal = () => isRegistering.value = false;

// 4. Mutations
// Мутация за регистрация
const mutation = useMutation(registerUser, {
  onSuccess: () => {
    queryClient.invalidateQueries(['users']);
    closeRegisterModal();
  }
});

// ДОБАВЕНО: Мутация за обновяване на роля
const updateRoleMutation = useMutation(
  ({ userId, newRole }) => updateUserRole(userId, newRole),
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      updatingUserId.value = null;
    },
    onError: (err) => {
      alert("Грешка при промяна на ролята: " + err.message);
      queryClient.invalidateQueries(['users']); // Връща първоначалната роля в UI при грешка
      updatingUserId.value = null;
    }
  }
);

const handleRegister = () => {
  mutation.mutate({ email: form.email, username: form.username, password: form.password, role: form.role });
};

// ДОБАВЕНО: Хендлър за промяна на селекта
const handleRoleChange = (userId, event) => {
  const newRole = event.target.value;
  
  if (!confirm(`Сигурни ли сте, че искате да промените ролята на този потребител на ${newRole}?`)) {
    // Връщаме старата стойност, ако се откаже
    const originalRole = data.value.users.find(u => u._id === userId).role || 'user';
    event.target.value = originalRole;
    return;
  }

  updatingUserId.value = userId;
  updateRoleMutation.mutate({ userId, newRole });
};

const handleDeleteUser = async (userId) => {
  if (!confirm("Are you sure you want to delete this user?")) return;
  deleteUser(userId).then(() => {
    queryClient.invalidateQueries(['users']);
  }).catch(err => {
    alert("Failed to delete user: " + err.message);
  });
};
</script>

<style scoped>
@import 'Admin.css';
</style>