import apiClient from './apiClient.ts';
import { ApiResponse, Fine, PaginationParams, PaginationResponse } from '../types';

interface FineListResponse {
  fines: Fine[];
  pagination: PaginationResponse;
}

export interface FineQueryParams extends PaginationParams {
  status?: 'pending' | 'paid' | 'waived';
}

export const fineService = {
  async getFines(params: FineQueryParams = {}): Promise<FineListResponse> {
    const response = await apiClient.get<ApiResponse<{ fines: Fine[]; pagination: PaginationResponse }>>(
      '/api/fines',
      { params },
    );
    const payload = response.data.data;
    return {
      fines: payload?.fines ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.fines?.length ?? 0,
          itemsPerPage: params.limit ?? 10,
        },
    };
  },

  async getMyFines(): Promise<Fine[]> {
    const response = await apiClient.get<ApiResponse<Fine[]>>('/api/fines/my');
    return (response.data.data as Fine[]) ?? [];
  },

  async createFine(data: { borrow_id: number; amount: number; reason: string }): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/api/fines', data);
    return response.data;
  },

  async payFine(id: number): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/fines/${id}/pay`);
    return response.data;
  },

  async waiveFine(id: number, payload?: { reason?: string }): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/fines/${id}/waive`, payload);
    return response.data;
  },
};
