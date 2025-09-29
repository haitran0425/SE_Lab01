import apiClient from './apiClient.ts';
import { ActivityLog, ApiResponse, PaginationParams, PaginationResponse } from '../types';

interface ActivityListResponse {
  activities: ActivityLog[];
  pagination: PaginationResponse;
}

export interface ActivityQueryParams extends PaginationParams {
  action?: string;
  entity_type?: string;
  user_id?: number;
  date_from?: string;
  date_to?: string;
}

export const activityService = {
  async getActivityLogs(params: ActivityQueryParams = {}): Promise<ActivityListResponse> {
    const response = await apiClient.get<ApiResponse<{ activities: ActivityLog[]; pagination: PaginationResponse }>>(
      '/api/activity',
      { params },
    );
    const payload = response.data.data;
    return {
      activities: payload?.activities ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.activities?.length ?? 0,
          itemsPerPage: params.limit ?? 20,
        },
    };
  },

  async getMyActivityLogs(params: PaginationParams = {}): Promise<ActivityListResponse> {
    const response = await apiClient.get<ApiResponse<{ activities: ActivityLog[]; pagination: PaginationResponse }>>(
      '/api/activity/my',
      { params },
    );
    const payload = response.data.data;
    return {
      activities: payload?.activities ?? [],
      pagination:
        payload?.pagination ?? {
          currentPage: params.page ?? 1,
          totalPages: 1,
          totalItems: payload?.activities?.length ?? 0,
          itemsPerPage: params.limit ?? 20,
        },
    };
  },

  async getActivityStats(days = 30): Promise<ApiResponse> {
    const response = await apiClient.get<ApiResponse>('/api/activity/stats', { params: { days } });
    return response.data;
  },

  async exportActivityLogs(
    params: {
      format?: 'json' | 'csv';
      date_from?: string;
      date_to?: string;
      limit?: number;
      action?: string;
      entity_type?: string;
      user_id?: number;
    },
  ) {
    const format = params.format ?? 'json';
    const response = await apiClient.get(`/api/activity/export`, {
      params,
      responseType: format === 'csv' ? 'blob' : 'json',
    });
    return response;
  },
};