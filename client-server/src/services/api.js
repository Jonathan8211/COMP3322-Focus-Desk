const API_URL = '/api';
let accessToken = null;
let refreshPromise = null;
let onAuthExpired = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const setAuthExpiredHandler = (handler) => { onAuthExpired = handler || (() => {}); };

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired.');
        const result = await response.json();
        if (!result?.data?.token) throw new Error('Session expired.');
        setAccessToken(result.data.token);
        return result.data.token;
      })
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

async function request(path, options = {}, authenticated = true, retried = false) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (authenticated && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
    if (response.status === 401 && authenticated && !retried) {
      try {
        await refreshSession();
        return request(path, options, authenticated, true);
      } catch {
        onAuthExpired();
        return { success: false, status: 401, message: 'Session expired. Please sign in.' };
      }
    }
    if (response.status === 204) return { success: true, status: 204 };
    const result = await response.json();
    if (response.status === 401 && authenticated) {
      setAccessToken(null);
      onAuthExpired();
    }
    return { ...result, status: response.status };
  } catch {
    return { success: false, message: 'Could not reach FocusDesk. Please try again.' };
  }
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });
export const registerUser = (data) => request('/auth/register', json('POST', data), false);
export const loginUser = (data) => request('/auth/login', json('POST', data), false);
export const logoutUser = () => request('/auth/logout', { method: 'POST' }, false);
export const getMe = () => request('/auth/me');
export const updateMe = (data) => request('/auth/me', json('PATCH', data));
export const getTasks = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/tasks${query ? `?${query}` : ''}`);
};
export const getTaskStats = () => request('/tasks/stats');
export const createTask = (data) => request('/tasks', json('POST', data));
export const updateTask = (id, data) => request(`/tasks/${id}`, json('PUT', data));
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });
export const getProjects = () => request('/projects');
export const createProject = (data) => request('/projects', json('POST', data));
export const deleteProject = (id) => request(`/projects/${id}`, { method: 'DELETE' });
export const getNotes = () => request('/notes');
export const createNote = (data = {}) => request('/notes', json('POST', data));
export const updateNote = (id, data) => request(`/notes/${id}`, json('PATCH', data));
export const deleteNote = (id) => request(`/notes/${id}`, { method: 'DELETE' });
