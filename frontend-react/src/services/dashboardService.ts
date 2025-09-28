import apiClient from './apiClient';
import {
  ActivityLog,
  ApiResponse,
  CategoryStat,
  DashboardStats,
  MonthlyBorrow,
  OverdueReport,
  RoleStat,
  RegistrationStat,
  TopBook,
  TopUser,
} from '../types';

interface DashboardOverviewResponse {
  overview: DashboardStats;
  monthlyBorrows: MonthlyBorrow[];
  topBooks: TopBook[];
  categoryStats: CategoryStat[];
}

export const dashboardService = {
  async getOverview(): Promise<DashboardOverviewResponse> {
    const response = await apiClient.get<ApiResponse<DashboardOverviewResponse>>('/api/dashboard/stats');
    return (response.data.data as DashboardOverviewResponse) ?? {
      overview: {
        total_books: 0,
        total_members: 0,
        current_borrows: 0,
        overdue_borrows: 0,
        pending_fines: 0,
        total_fine_amount: 0,
      },
      monthlyBorrows: [],
      topBooks: [],
      categoryStats: [],
    };
  },

  async getRecentActivity(limit = 20): Promise<ActivityLog[]> {
    const response = await apiClient.get<ApiResponse<ActivityLog[]>>('/api/dashboard/recent-activity', { params: { limit } });
    return (response.data.data as ActivityLog[]) ?? [];
  },

  async getOverdueReport(): Promise<OverdueReport> {
    const response = await apiClient.get<ApiResponse<OverdueReport>>('/api/dashboard/overdue-report');
    return (
      response.data.data as OverdueReport
    ) ?? { overdueBooks: [], stats: { total: 0, byDays: { '1-7': 0, '8-14': 0, '15-30': 0, '30+': 0 } } };
  },

  async getUserStats(): Promise<{ roleStats: RoleStat[]; registrationStats: RegistrationStat[]; topUsers: TopUser[] }> {
    const response = await apiClient.get<
      ApiResponse<{ roleStats: RoleStat[]; registrationStats: RegistrationStat[]; topUsers: TopUser[] }>
    >('/api/dashboard/user-stats');
    return (
      response.data.data as { roleStats: RoleStat[]; registrationStats: RegistrationStat[]; topUsers: TopUser[] }
    ) ?? { roleStats: [], registrationStats: [], topUsers: [] };
  },
};
