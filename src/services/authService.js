

export const registerUser = async (email,password) => {
  const response = await fetch("http://localhost:5000/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(email,password),
  });

 const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }
  const { message, user } = result;
  return { message, user };
};

export const loginUser = async (email,password) => {
  const response = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(email,password),
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