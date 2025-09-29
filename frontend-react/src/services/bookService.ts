import apiClient from './apiClient.ts';
import { ApiResponse, Book, PaginationParams, PaginationResponse } from '../types';

interface BookListResponse {
  books: Book[];
  pagination: PaginationResponse;
}

export interface BookQueryParams extends PaginationParams {
  search?: string;
  category?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const bookService = {
  async getBooks(params: BookQueryParams = {}): Promise<BookListResponse> {
    const response = await apiClient.get<ApiResponse<{ books: Book[]; pagination: PaginationResponse }>>(
      '/api/books',
      { params },
    );
    const payload = response.data.data;
    return {
      books: payload?.books ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.books?.length ?? 0,
          itemsPerPage: params.limit ?? 10,
        },
    };
  },

  async getAvailableBooks(): Promise<Book[]> {
    const response = await apiClient.get<ApiResponse<Book[]>>('/api/books/available');
    return (response.data.data as Book[]) ?? [];
  },

  async getBookById(id: number): Promise<Book> {
    const response = await apiClient.get<ApiResponse<Book>>(`/api/books/${id}`);
    return (response.data.data as Book) ?? ({} as Book);
  },

  async createBook(data: Partial<Book>): Promise<ApiResponse<Book>> {
    const response = await apiClient.post<ApiResponse<Book>>('/api/books', data);
    return response.data;
  },

  async updateBook(id: number, data: Partial<Book>): Promise<ApiResponse<Book>> {
    const response = await apiClient.put<ApiResponse<Book>>(`/api/books/${id}`, data);
    return response.data;
  },

  async deleteBook(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/api/books/${id}`);
    return response.data;
  },
};