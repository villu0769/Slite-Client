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
  return result.data; // Връща { message, data: { users, pagination } }
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

export const verifyToken = async () =>{
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}` 
      }
    });

    const data = await response.json();

    if (!data.isValid) {
      localStorage.removeItem('token');
    }
  } catch (error) {
    console.error('Грешка при проверка на токена:', error);
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

  if (!response.ok) {
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
/*
export const forgottenPassword = async (email) => {
  const response = await fetch(
    "https://localhost:7095/api/Notification/forgotten-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
  //  const message = await parseApiError(response);
    throw new Error('error');
  }

  const result = await response.json();
  return result.data?.message || "Password reset request succeeded.";
};

export const resetPassword = async (token, newPassword) => {
  const response = await fetch(
    "https://localhost:7095/api/Notification/reset-password",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, newPassword }),
    }
  );

  if (!response.ok) {
    const message = await parseApiError(response);
    throw new Error(message);
  }

  const result = await response.json();
  return { message: result.data?.message || "Password reset successful." };
};
*/