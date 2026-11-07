const API_URL = "/api";
const token = () => localStorage.getItem("token");

async function request(path, options = {}, authenticated = true) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (authenticated && token()) headers.Authorization = `Bearer ${token()}`;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
    if (response.status === 204) return { success: true };
    const result = await response.json();
    return result;
  } catch {
    return { success: false, message: "Could not reach FocusDesk. Please try again." };
  }
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });
export const registerUser = (data) => request("/auth/register", json("POST", data), false);
export const loginUser = (data) => request("/auth/login", json("POST", data), false);
export const logoutUser = () => request("/auth/logout", { method: "POST" }, false);
export const getMe = () => request("/auth/me");
export const updateMe = (data) => request("/auth/me", json("PATCH", data));
export const getTasks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/tasks${query ? `?${query}` : ""}`);
};
export const createTask = (data) => request("/tasks", json("POST", data));
export const updateTask = (id, data) => request(`/tasks/${id}`, json("PUT", data));
export const deleteTask = (id) => request(`/tasks/${id}`, { method: "DELETE" });
export const getProjects = () => request("/projects");
export const createProject = (data) => request("/projects", json("POST", data));
export const deleteProject = (id) => request(`/projects/${id}`, { method: "DELETE" });
export const getNotes = () => request("/notes");
export const createNote = (data = {}) => request("/notes", json("POST", data));
export const updateNote = (id, data) => request(`/notes/${id}`, json("PATCH", data));
export const deleteNote = (id) => request(`/notes/${id}`, { method: "DELETE" });
