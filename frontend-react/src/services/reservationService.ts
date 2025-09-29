import apiClient from './apiClient.ts';
import { ApiResponse, Reservation } from '../types';

export const reservationService = {
  async getReservations(): Promise<Reservation[]> {
    const response = await apiClient.get<ApiResponse<Reservation[]>>('/api/reservations');
    return (response.data.data as Reservation[]) ?? [];
  },

  async getMyReservations(): Promise<Reservation[]> {
    const response = await apiClient.get<ApiResponse<Reservation[]>>('/api/reservations/my');
    return (response.data.data as Reservation[]) ?? [];
  },

  async createReservation(data: { book_id: number }): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/api/reservations', data);
    return response.data;
  },

  async cancelReservation(id: number): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/api/reservations/${id}`);
    return response.data;
  },

  async fulfillReservation(id: number): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>(`/api/reservations/${id}/fulfill`);
    return response.data;
  },
};