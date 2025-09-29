// =============================================
// TYPES DEFINITIONS - LIBRARY MANAGEMENT SYSTEM
// =============================================

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  role: 'admin' | 'librarian' | 'member';
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  address?: string;
  role?: 'admin' | 'librarian' | 'member';
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publication_year?: number;
  category_id: number;
  category_name?: string;
  total_copies: number;
  available_copies: number;
  description?: string;
  cover_image?: string;
  language: string;
  pages?: number;
  price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Borrow {
  id: number;
  user_id: number;
  book_id: number;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: 'borrowed' | 'returned' | 'overdue' | 'lost';
  fine_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  title?: string;
  author?: string;
  isbn?: string;
  cover_image?: string;
  full_name?: string;
  email?: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  book_id: number;
  reservation_date: string;
  expiry_date: string;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  priority: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  title?: string;
  author?: string;
  isbn?: string;
  full_name?: string;
  email?: string;
}

export interface Fine {
  id: number;
  borrow_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'paid' | 'waived';
  due_date: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  borrow_date?: string;
  due_date_borrow?: string;
  title?: string;
  full_name?: string;
  email?: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  
  // Joined data
  username?: string;
  full_name?: string;
}

export interface DashboardStats {
  total_books: number;
  total_members: number;
  current_borrows: number;
  overdue_borrows: number;
  pending_fines: number;
  total_fine_amount: number;
}

export interface MonthlyBorrow {
  month: string;
  borrow_count: number;
}

export interface TopBook {
  id: number;
  title: string;
  author: string;
  borrow_count: number;
}

export interface CategoryStat {
  category_name: string;
  book_count: number;
  total_copies: number;
  available_copies: number;
}

export interface RoleStat {
  role: string;
  count: number;
}

export interface RegistrationStat {
  month: string;
  registration_count: number;
}

export interface TopUser {
  id: number;
  full_name: string;
  email: string;
  borrow_count: number;
}

export interface OverdueReportStats {
  total: number;
  byDays: {
    '1-7': number;
    '8-14': number;
    '15-30': number;
    '30+': number;
  };
}

export interface OverdueReport {
  overdueBooks: Borrow[];
  stats: OverdueReportStats;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SearchParams {
  search?: string;
  category?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  render?: (value: any, record: any, index: number) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  rules?: any[];
}

export interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  roles?: string[];
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}



