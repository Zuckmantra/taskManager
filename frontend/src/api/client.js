const API_BASE = '/api';

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

  const response = await fetch(`${API_BASE}${path}`, {
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
  getTasks: () => request('/tasks'),
  createTask: (title, description) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description })
  }),
  updateTask: (id, payload) => request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  deleteTask: (id) => request(`/tasks/${id}`, {
    method: 'DELETE'
  })
};
