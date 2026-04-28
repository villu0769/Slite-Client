const API_URL = "https://slite-api.onrender.com";

export const fetchUsers = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/auth?page=${page}&limit=${limit}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Грешка при зареждане на потребители');
  }
  return result.data; 
};

export const registerUser = async ({email,username,password,role='user'}) => {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password,username,role }),
  });

 const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }
  const { token, user } = result;
  return { token, user };
};
export const verifyToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}` 
      }
    });

    const data = await response.json();

    if (!data.isValid) {
      // Предотвратяваме изтриването на чисто нов токен (Race condition фиксът)
      if (localStorage.getItem('token') === token) {
        localStorage.removeItem('token');
        localStorage.removeItem('role'); // Добра практика е да триеш и ролята!
      }
      return false;
    }
    
    return true; // Токенът е валиден
  } catch (error) {
    console.error('Грешка при проверка на токена:', error);
    return false;
  }
}

export const loginUser = async ({email,password}) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();

  if (!response.ok ) {
    throw new Error(result.message);
  }
  const { token, user } = result;
  return { token, user };
};

export const deleteUser = async (userId) => {
  const response = await fetch(`${API_URL}/api/auth/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('token')}`
    },
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }
  const { token, user } = result;
  return { token, user };
};
export const getUserProfile = async (username) => {
  const response = await fetch(`${API_URL}/api/auth/${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
       "Authorization": `Bearer ${localStorage.getItem('token')}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Грешка при зареждане на профила');
  }
  return result.user; 
};

export const updateProfile = async (userId, { username, email }) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/auth/${userId}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ username, email }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Грешка при обновяване на профила');
  }
  
  return result; 
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/auth/${userId}/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Грешка при смяна на паролата');
  }
  
  return result; 
};
export const updateUserRole = async (userId, role) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/auth/${userId}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    // Изпращаме само ролята. Твоят бекенд (updateProfile) ще обнови само нея,
    // без да пипа email или username.
    body: JSON.stringify({ role }), 
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Грешка при промяна на ролята');
  }
  
  return result; 
};