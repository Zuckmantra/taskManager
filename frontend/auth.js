const API_URL = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function isAuthenticated() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
  }
}

async function authFetch(url, options = {}) {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Sesión expirada');
  }
  
  return response;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getToken,
    getUser,
    isAuthenticated,
    logout,
    requireAuth,
    authFetch,
    API_URL
  };
}