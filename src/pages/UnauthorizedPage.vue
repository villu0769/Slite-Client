<template>
  <div class="unauthorized-container">
    <div class="content-box">
      <div class="icon-wrapper">
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      
      <h1 class="title">Достъпът е отказан</h1>
      <p class="subtitle">
        Изглежда нямате необходимите права, за да разгледате тази страница, или сесията ви е изтекла.
      </p>

      <div class="actions">
        <router-link to="/" class="btn secondary-btn">
          Към началната страница
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg); /* Тъмен фон */
  color: var(--text);
  font-family: 'Inter', sans-serif; /* Или твоят основен шрифт */
  padding: 20px;
}

.content-box {
  text-align: center;
  max-width: 400px;
  background: var(--bg-soft);
  padding: 40px 30px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(200, 200,255, 0.1);
}

.icon-wrapper {
  color: #ff4757; /* Червен акцент за грешка/забрана */
  margin-bottom: 20px;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: #ffffff;
}

.subtitle {
  font-size: 0.95rem;
  color: #a0a0a0;
  margin-bottom: 30px;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  display: inline-block;
  padding: 17px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}   


.secondary-btn {
  background :var(--bg);
  opacity: 0.8;
  color: var(--text);
}

.secondary-btn:hover {
  background-color: var(--bg-soft);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.5);
}
</style>