const API_URL = "https://slite-api.onrender.com";

export const getFurnitureCategories = async () => {
  const response = await fetch(`${API_URL}/api/furniture-categories`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};

export const getNonFurnitureCategory = async (id) => {
  const response = await fetch(`${API_URL}/api/furniture-categories/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};

export async function addFurnitureItem(categoryId, name, picFile, modelFile) {
  // 1. Създаваме FormData тук, в сървиса
  const formData = new FormData();
  formData.append('catId', categoryId);
  formData.append('name', name);
  formData.append('pic', picFile);
  formData.append('model', modelFile);

  // 2. Правим fetch заявката
  const response = await fetch(`${API_URL}/api/furniture-categories/add-item`, {
    method: 'POST',
    body: formData
    // При FormData НЕ слагаме 'Content-Type' хедър!
  });

  const result = await response.json();

  // 3. Обработваме грешките
  if (!response.ok) {
    throw new Error(result.message || "Грешка при качването на мебелта.");
  }

  return result;
}

export async function addFurnitureCategory(name) {

  const response = await fetch(`${API_URL}/api/furniture-categories/add-category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({  name: name })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Грешка при създаването на категория.");
  }

  return result;
}

export async function deleteFurnitureCategory(id) {

  const response = await fetch(`${API_URL}/api/furniture-categories/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Грешка при изтриването на категория.");
  }

  return result;
}

export async function deleteFurnitureItem(categoryId, itemName) {

  const response = await fetch(`${API_URL}/api/furniture-categories/${categoryId}/${encodeURIComponent(itemName)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Грешка при изтриването на мебел.");
  }

  return result;
}