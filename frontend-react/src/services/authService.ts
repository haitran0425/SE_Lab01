import apiClient from './apiClient.ts';
import { ApiResponse, LoginCredentials, RegisterData, User } from '../types';

export const authService = {
  // Đăng nhập
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  // Đăng ký
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  // Đăng xuất
  async logout(): Promise<ApiResponse> {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  // Lấy thông tin profile
  async getProfile(): Promise<User> {
    const response = await apiClient.get('/api/auth/profile');
    return response.data.data.user;
  },

  // Làm mới token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },
};