import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// Attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('5enses_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('5enses_token');
      localStorage.removeItem('5enses_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
