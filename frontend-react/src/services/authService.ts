import axios from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, LoginCredentials, RegisterData, User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Tạo axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            
            Cookies.set('accessToken', accessToken, { expires: 1 });
            Cookies.set('refreshToken', newRefreshToken, { expires: 7 });
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  // Đăng nhập
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  // Đăng ký
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  // Đăng xuất
  async logout(): Promise<ApiResponse> {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  // Lấy thông tin profile
  async getProfile(): Promise<User> {
    const response = await api.get('/api/auth/profile');
    return response.data.data.user;
  },

  // Làm mới token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },
};
