import apiClient from './apiClient.ts';
import { ApiResponse, PaginationParams, PaginationResponse, User } from '../types';

interface UserListResponse {
  users: User[];
  pagination: PaginationResponse;
}

export interface UserQueryParams extends PaginationParams {
  role?: 'admin' | 'librarian' | 'member';
}

export const userService = {
  async getUsers(params: UserQueryParams = {}): Promise<UserListResponse> {
    const response = await apiClient.get<ApiResponse<{ users: User[]; pagination: PaginationResponse }>>(
      '/api/users',
      { params },
    );
    const payload = response.data.data;
    return {
      users: payload?.users ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.users?.length ?? 0,
          itemsPerPage: params.limit ?? 10,
        },
    };
  },

  async getUserById(id: number): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>(`/api/users/${id}`);
    return (response.data.data as User) ?? ({} as User);
  },

  async updateUser(id: number, data: Partial<User>): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/users/${id}`, data);
    return response.data;
  },

  async changePassword(id: number, data: { current_password: string; new_password: string }): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/users/${id}/change-password`, data);
    return response.data;
  },

  async toggleStatus(id: number): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/users/${id}/toggle-status`);
    return response.data;
  },
};