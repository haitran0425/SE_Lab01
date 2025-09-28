import apiClient from './apiClient';
import { ApiResponse, Category } from '../types';

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>('/api/categories');
    return (response.data.data as Category[]) ?? [];
  },

  async getCategoryById(id: number): Promise<Category> {
    const response = await apiClient.get<ApiResponse<Category>>(`/api/categories/${id}`);
    return (response.data.data as Category) ?? ({} as Category);
  },

  async createCategory(data: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await apiClient.post<ApiResponse<Category>>('/api/categories', data);
    return response.data;
  },

  async updateCategory(id: number, data: Partial<Category>): Promise<ApiResponse<Category>> {
    const response = await apiClient.put<ApiResponse<Category>>(`/api/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/api/categories/${id}`);
    return response.data;
  },
};
