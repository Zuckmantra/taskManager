const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const rawText = await response.text();

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || rawText || `Error HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  login: (email, password) => request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  register: (username, email, password) => request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  }),
  getProjects: () => request('/projects'),
  createProject: (name, description) => request('/projects', { method: 'POST', body: JSON.stringify({ name, description }) }),
  forgotPassword: (email) => request('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, password) => request('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  getTasks: (params = {}) => {
    // Filter out undefined/null values to prevent URLSearchParams from serializing them as "undefined"
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
    );
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/tasks${query ? `?${query}` : ''}`).then((data) => {
      // Backwards compatibility:
      // - If caller provided query params (pagination/filtering), return the full paginated object { tasks, page, limit, total }
      // - If called without params (legacy prebuilt bundle), return the plain tasks array
      if (params && Object.keys(params).length > 0) return data;
      if (data && Array.isArray(data.tasks)) return data.tasks;
      return data;
    });
  },
  createTask: (title, description, priority, due_date, project_id) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, priority, due_date, project_id })
  }),
  updateTask: (id, payload) => request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  deleteTask: (id) => request(`/tasks/${id}`, {
    method: 'DELETE'
  })
};
