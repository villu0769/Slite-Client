<template>
    <AppHeader />

    <div class="account-page">
        <div class="account-container">
            <h1 class="page-title">Акаунт</h1>

            <div class="panel">
                <h2 class="panel-title">Профил</h2>

                <div class="panel-content">
                    <div class="info-row">
                        <span class="info-label">Име</span>
                        <span class="info-value">{{ user.username }}</span>
                        <button class="action-link" @click="openModal('username')">Промяна</button>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Имейл</span>
                        <span class="info-value">{{ user.email }}</span>
                        <button class="action-link" @click="openModal('email')">Промяна</button>
                    </div>

                    <div class="info-row">
                        <span class="info-label">Парола</span>
                        <span class="info-value">••••••••••••</span>
                        <button class="action-link" @click="openModal('password')">Промяна</button>
                    </div>
                </div>
            </div>

            <div class="panel danger-panel mt-4">
                <p class="info-text">
                    Ако сте твърдо решени да изтриете акаунта си, няма да ви спираме! Вашите настройки, проекти и
                    всякакви други данни ще бъдат <strong>безвъзвратно изтрити</strong>.
                </p>
                <button class="danger-link" @click="deleteAccount">Изтриване на акаунта</button>
            </div>
        </div>
    </div>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card panel">
            <h3 class="modal-title">{{ modalTitle }}</h3>

            <form @submit.prevent="submitChanges" class="modal-form">

                <div v-if="activeField === 'username'" class="form-group">
                    <label>Ново име</label>
                    <input type="text" v-model="editData.username" required placeholder="Въведете ново име" />
                </div>

                <div v-if="activeField === 'email'" class="form-group">
                    <label>Нов имейл</label>
                    <input type="email" v-model="editData.email" required placeholder="Въведете нов имейл" />
                </div>

                <div v-if="activeField === 'password'" class="password-fields">
                    <div class="form-group">
                        <label>Текуща парола</label>
                        <input type="password" v-model="editData.currentPassword" required
                            placeholder="Въведете текущата парола" />
                    </div>
                    <div class="form-group mt-3">
                        <label>Нова парола</label>
                        <input type="password" v-model="editData.newPassword" required
                            placeholder="Въведете нова парола" />
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-cancel" @click="closeModal">Отказ</button>
                    <button type="submit" class="btn-primary" :disabled="isSaving">
                        {{ isSaving ? 'Запазване...' : 'Запази' }}
                    </button>
                </div>

            </form>
        </div>
    </div>

    <Notification 
      :show="notification.show" 
      :message="notification.message" 
      :type="notification.type" 
    />
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue' // ДОБАВЕН: reactive
import { useRouter } from 'vue-router'
import AppHeader from '../components/AppHeader.vue'
import Notification from '../components/Notification.vue' // ДОБАВЕН: Импорт на Notification
import { useConfirm } from '../composables/useConfirm';
import {
    getUserProfile,
    updateProfile,
    changePassword,
    deleteUser
} from '../services/authService'

const { showConfirm } = useConfirm();
const router = useRouter()

const user = ref({
    id: '',
    username: '',
    email: ''
})

const isLoading = ref(true)
const isSaving = ref(false) // Състояние за бутона за запазване

// --- НОВО: Логика за нотификации ---
const notification = reactive({ show: false, message: '', type: 'success' })

const showNotification = (msg, type = 'success') => {
  notification.message = msg
  notification.type = type
  notification.show = true
  setTimeout(() => { notification.show = false }, 3000)
}

// ВЗЕМАНЕ НА ДАННИТЕ ПРИ ЗАРЕЖДАНЕ
onMounted(async () => {
    try {
        const storedUsername = localStorage.getItem('username')

        if (!storedUsername) {
            router.push('/login')
            return
        }

        const userData = await getUserProfile(storedUsername)

        user.value = {
            id: userData._id || userData.id,
            username: userData.username,
            email: userData.email
        }

    } catch (error) {
        console.error("Грешка при инициализация на профила:", error)
        showNotification('Сесията е изтекла. Моля, влезте отново.', 'error')
        router.push('/login')
    } finally {
        isLoading.value = false
    }
})

// --- Управление на модала ---
const isModalOpen = ref(false)
const activeField = ref('')
const editData = ref({ username: '', email: '', currentPassword: '', newPassword: '' })

const modalTitle = computed(() => {
    if (activeField.value === 'username') return 'Смяна на потребителско име'
    if (activeField.value === 'email') return 'Смяна на имейл адрес'
    if (activeField.value === 'password') return 'Смяна на парола'
    return 'Редактиране'
})

const openModal = (field) => {
    activeField.value = field
    if (field === 'username') editData.value.username = user.value.username
    if (field === 'email') editData.value.email = user.value.email
    if (field === 'password') { editData.value.currentPassword = ''; editData.value.newPassword = '' }
    isModalOpen.value = true
}

const closeModal = () => { isModalOpen.value = false }

// ЗАПАЗВАНЕ НА ПРОМЕНИТЕ
const submitChanges = async () => {
    isSaving.value = true;
    try {
        if (activeField.value === 'username' || activeField.value === 'email') {
            const payload = {
                username: activeField.value === 'username' ? editData.value.username : user.value.username,
                email: activeField.value === 'email' ? editData.value.email : user.value.email
            }

            const response = await updateProfile(user.value.id, payload)

            user.value.username = response.user.username
            user.value.email = response.user.email

            if (activeField.value === 'username') {
                localStorage.setItem('username', user.value.username)
            }

            // ЗАМЕНЯМЕ alert() с showNotification()
            showNotification('Профилът е обновен успешно!', 'success')

        } else if (activeField.value === 'password') {
            await changePassword(user.value.id, {
                currentPassword: editData.value.currentPassword,
                newPassword: editData.value.newPassword
            })
            // ЗАМЕНЯМЕ alert() с showNotification()
            showNotification('Паролата е променена успешно!', 'success')
        }
        closeModal()
    } catch (error) {
        // ЗАМЕНЯМЕ alert() с showNotification()
        showNotification(error.message || "Възникна грешка при запис!", 'error')
    } finally {
        isSaving.value = false;
    }
}

// ИЗТРИВАНЕ НА АКАУНТА
const deleteAccount = async () => {
    const confirmed = await showConfirm("Сигурни ли сте? Това действие e необратимо!");
    if (!confirmed) return;
    try {
        await deleteUser(user.value.id)
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        router.push('/login')
    } catch (error) {
        // ЗАМЕНЯМЕ alert() с showNotification()
        showNotification(error.message || "Грешка при изтриване на акаунта", 'error')
    }
}
</script>

<style scoped>
/* ОСНОВЕН КОНТЕЙНЕР */
.account-page {
    width: 100%;
    min-height: calc(100vh - 70px);
    background: var(--bg);
    display: flex;
    justify-content: center;
    padding: 50px 20px;
    box-sizing: border-box;
}

.account-container {
    width: 100%;
    max-width: 650px;
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.page-title {
    margin: 0 0 8px 0;
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--text);
}

.panel {
    background: color-mix(in srgb, var(--bg-soft, #fff), transparent 30%);
    border: 1px solid color-mix(in srgb, var(--border), transparent 30%);
    border-radius: 8px;
    padding: 24px;
}

.panel-title {
    margin: 0 0 24px 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text);
}

.info-row {
    display: grid;
    grid-template-columns: 120px 1fr auto;
    align-items: center;
    margin-bottom: 20px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-label {
    font-size: 0.95rem;
    color: color-mix(in srgb, var(--text), transparent 30%);
}

.info-value {
    font-size: 0.95rem;
    color: var(--text);
    word-break: break-all; /* Предотвратява излизане на дълги имейли извън контейнера */
}

.info-text {
    font-size: 0.95rem;
    line-height: 1.6;
    color: color-mix(in srgb, var(--text), transparent 15%);
    margin: 0 0 16px 0;
}

.action-link {
    background: transparent;
    border: none;
    padding: 0;
    font-size: 0.95rem;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
    transition: opacity 0.2s;
}

.action-link:hover {
    opacity: 0.7;
}

.danger-panel strong {
    color: var(--text);
    font-weight: 600;
}

.danger-link {
    background: transparent;
    border: none;
    padding: 0;
    font-size: 0.95rem;
    color: var(--danger, #ff4d4f);
    text-decoration: underline;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.2s;
}

.danger-link:hover {
    opacity: 0.7;
}

.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 24px; }


/* ==========================================
   СТИЛОВЕ ЗА МОДАЛНИЯ ПРОЗОРЕЦ
========================================== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-card {
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 30px;
    box-sizing: border-box; /* Важно за мобилни екрани */
    margin: 0 16px; /* Предотвратява опиране в краищата на малки екрани */
}

.modal-title {
    margin: 0 0 20px 0;
    font-size: 1.25rem;
    color: var(--text);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 0.9rem;
    color: var(--text);
    opacity: 0.8;
}

.form-group input {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    font-size: 1rem;
    transition: border-color 0.2s ease;
    outline: none;
}

.form-group input:focus {
    border-color: var(--accent);
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
}

.btn-cancel,
.btn-primary {
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
}

.btn-cancel {
    background: transparent;
    color: var(--text);
}

.btn-cancel:hover {
    background: color-mix(in srgb, var(--text), transparent 90%);
}

.btn-primary {
    background: var(--accent);
    color: var(--bg);
}

.btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ==========================================
   MOBILE RESPONSIVENESS (НОВО)
========================================== */
@media screen and (max-width: 576px) {
    .account-page {
        padding: 30px 16px;
    }

    .panel {
        padding: 20px 16px;
    }

    /* Пренареждаме грида, за да се събира удобно на телефон */
    .info-row {
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        row-gap: 4px;
        margin-bottom: 24px;
    }

    .info-label {
        grid-column: 1 / 3;
        font-size: 0.85rem;
    }

    .info-value {
        grid-column: 1;
    }

    .action-link {
        grid-column: 2;
    }

    .danger-panel {
        text-align: center;
    }

    .danger-link {
        width: 100%;
        padding: 12px;
        background: color-mix(in srgb, var(--danger, #ff4d4f), transparent 90%);
        border-radius: 8px;
        text-decoration: none;
        margin-top: 16px;
    }
}
</style>