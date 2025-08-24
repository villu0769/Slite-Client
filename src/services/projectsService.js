
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
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });
  const result = await response.json();

  if (!response.ok) throw new Error(result.message);
  return result.data;
};

export const updateLayout = async (projectId, layoutData) => {
  const response = await fetch(`http://localhost:5000/api/projects/${projectId}/layout`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ layoutData })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result.data;
};