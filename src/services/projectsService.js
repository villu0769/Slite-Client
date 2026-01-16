
export const fetchAll = async () => {
  const response = await fetch("http://localhost:5000/api/projects/", {
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
export const createNew = async (name) => {
  const response = await fetch("http://localhost:5000/api/projects/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ name }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};

export const getProjectById = async (projectId) => {
  const response = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
};


export async function updateProjectName(projectId, name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Project name must be a non-empty string');
  }

  const response = await fetch(`http://localhost:5000/api/projects/${projectId}/name`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ name: name.trim() }),
  });


  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result.data;
}