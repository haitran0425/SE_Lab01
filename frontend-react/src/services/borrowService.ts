
import apiClient from './apiClient.ts';
import { ApiResponse, Borrow, PaginationParams, PaginationResponse } from '../types';

interface BorrowListResponse {
  borrows: Borrow[];
  pagination: PaginationResponse;
}

export interface BorrowQueryParams extends PaginationParams {
  status?: 'borrowed' | 'returned' | 'overdue' | 'lost';
}

export const borrowService = {
  async getBorrows(params: BorrowQueryParams = {}): Promise<BorrowListResponse> {
    const response = await apiClient.get<ApiResponse<{ borrows: Borrow[]; pagination: PaginationResponse }>>(
      '/api/borrows',
      { params },
    );
    const payload = response.data.data;
    return {
      borrows: payload?.borrows ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.borrows?.length ?? 0,
          itemsPerPage: params.limit ?? 10,
        },
    };
  },

  async getMyBorrows(): Promise<Borrow[]> {
    const response = await apiClient.get<ApiResponse<Borrow[]>>('/api/borrows/my');
    return (response.data.data as Borrow[]) ?? [];
  },

  async getOverdueBorrows(): Promise<Borrow[]> {
    const response = await apiClient.get<ApiResponse<Borrow[]>>('/api/borrows/overdue');
    return (response.data.data as Borrow[]) ?? [];
  },

  async getBorrowById(id: number): Promise<Borrow> {
    const response = await apiClient.get<ApiResponse<Borrow>>(`/api/borrows/${id}`);
    return (response.data.data as Borrow) ?? ({} as Borrow);
  },

  async createBorrow(data: { book_id: number; borrow_days?: number }): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/api/borrows', data);
    return response.data;
  },

  async returnBook(id: number): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/borrows/${id}/return`);
    return response.data;
  },
};