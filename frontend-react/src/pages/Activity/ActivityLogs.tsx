import React, { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Form,
  Select,
  DatePicker,
  Input,
  message,
  Typography,
  Empty,
  Result,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { activityService } from '../../services/activityService.ts';
import { userService } from '../../services/userService.ts';
import type { ActivityLog, User } from '../../types';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const entityLabels: Record<string, string> = {
  user: 'Người dùng',
  book: 'Sách',
  borrow: 'Mượn trả',
  reservation: 'Đặt trước',
  category: 'Thể loại',
  fine: 'Khoản phạt',
  activity: 'Hoạt động',
  auth: 'Xác thực',
  dashboard: 'Dashboard',
};

const ActivityLogsPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'librarian';

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    action: undefined as string | undefined,
    entity_type: undefined as string | undefined,
    user_id: undefined as number | undefined,
    date_from: undefined as string | undefined,
    date_to: undefined as string | undefined,
    search: '',
  });

  const fetchUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const { users: data } = await userService.getUsers({ limit: 100 });
      setUsers(data);
    } catch (error: any) {
      console.error('Fetch users error:', error);
    }
  }, [canManage]);

  const fetchActivities = useCallback(
    async (page = 1, pageSize = 20) => {
      try {
        setLoading(true);
        const { activities: data, pagination: serverPagination } = await activityService.getActivityLogs({
          page,
          limit: pageSize,
          action: filters.action,
          entity_type: filters.entity_type,
          user_id: filters.user_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        });
        let results = data;
        if (filters.search) {
          const keyword = filters.search.toLowerCase();
          results = results.filter((item) =>
            item.action.toLowerCase().includes(keyword) ||
            item.entity_type.toLowerCase().includes(keyword) ||
            item.details?.toLowerCase().includes(keyword) ||
            item.username?.toLowerCase().includes(keyword) ||
            item.full_name?.toLowerCase().includes(keyword),
          );
        }
        setActivities(results);
        setPagination({
          current: serverPagination.currentPage,
          pageSize: serverPagination.itemsPerPage,
          total: filters.search ? results.length : serverPagination.totalItems,
        });
      } catch (error: any) {
        console.error('Fetch activities error:', error);
        message.error(error.response?.data?.message || 'Không thể tải nhật ký hoạt động');
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (canManage) {
      fetchUsers();
      fetchActivities();
    }
  }, [canManage, fetchUsers, fetchActivities]);

  const handleTableChange = (pager: TablePaginationConfig) => {
    fetchActivities(pager.current, pager.pageSize);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await activityService.exportActivityLogs({
        format,
        date_from: filters.date_from,
        date_to: filters.date_to,
        action: filters.action,
        entity_type: filters.entity_type,
        user_id: filters.user_id,
        limit: 500,
      });
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity_logs_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `activity_logs_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
      message.success('Đã xuất nhật ký hoạt động');
    } catch (error: any) {
      console.error('Export activity logs error:', error);
      message.error(error.response?.data?.message || 'Không thể xuất dữ liệu');
    }
  };

  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_: any, record) => (
        <div>
          <strong>{record.full_name || 'Hệ thống'}</strong>
          {record.username && (
            <>
              <br />
              <Text type="secondary">@{record.username}</Text>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Đối tượng',
      dataIndex: 'entity_type',
      key: 'entity_type',
      render: (value: string) => entityLabels[value] || value,
    },
    {
      title: 'Chi tiết',
      dataIndex: 'details',
      key: 'details',
      render: (value?: string) => value ? <Text code style={{ whiteSpace: 'pre-wrap' }}>{value}</Text> : '—',
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (value?: string) => value || '—',
    },
  ];

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle="Bạn cần quyền thủ thư hoặc quản trị để xem nhật ký hoạt động."
      />
    );
  }

  return (
    <div>
      <Title level={2}>Nhật ký hoạt động</Title>
      <Form
        layout="inline"
        style={{ marginBottom: 16 }}
        onFinish={() => fetchActivities(1, pagination.pageSize)}
      >
        <Form.Item label="Hành động">
          <Select
            allowClear
            placeholder="Chọn hành động"
            style={{ width: 200 }}
            value={filters.action}
            onChange={(value) => setFilters((prev) => ({ ...prev, action: value || undefined }))}
            options={[
              { value: 'LOGIN', label: 'Đăng nhập' },
              { value: 'LOGOUT', label: 'Đăng xuất' },
              { value: 'BORROW_BOOK', label: 'Mượn sách' },
              { value: 'RETURN_BOOK', label: 'Trả sách' },
              { value: 'CREATE_RESERVATION', label: 'Tạo đặt trước' },
              { value: 'CANCEL_RESERVATION', label: 'Hủy đặt trước' },
              { value: 'PAY_FINE', label: 'Thanh toán phạt' },
              { value: 'WAIVE_FINE', label: 'Miễn phạt' },
              { value: 'CREATE_USER', label: 'Tạo người dùng' },
              { value: 'UPDATE_USER', label: 'Cập nhật người dùng' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Đối tượng">
          <Select
            allowClear
            placeholder="Chọn đối tượng"
            style={{ width: 160 }}
            value={filters.entity_type}
            onChange={(value) => setFilters((prev) => ({ ...prev, entity_type: value || undefined }))}
            options={Object.entries(entityLabels).map(([value, label]) => ({ value, label }))}
          />
        </Form.Item>
        <Form.Item label="Người dùng">
          <Select
            allowClear
            placeholder="Chọn người dùng"
            style={{ width: 200 }}
            showSearch
            optionFilterProp="label"
            value={filters.user_id}
            onChange={(value) => setFilters((prev) => ({ ...prev, user_id: value || undefined }))}
            options={users.map((item) => ({ label: `${item.full_name} (@${item.username})`, value: item.id }))}
          />
        </Form.Item>
        <Form.Item label="Khoảng thời gian">
          <RangePicker
            allowEmpty={[true, true]}
            value={
              filters.date_from && filters.date_to
                ? [dayjs(filters.date_from), dayjs(filters.date_to)]
                : null
            }
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setFilters((prev) => ({
                  ...prev,
                  date_from: dates[0].startOf('day').toISOString(),
                  date_to: dates[1].endOf('day').toISOString(),
                }));
              } else {
                setFilters((prev) => ({ ...prev, date_from: undefined, date_to: undefined }));
              }
            }}
          />
        </Form.Item>
        <Form.Item>
          <Input
            allowClear
            placeholder="Tìm kiếm"
            prefix={<SearchOutlined />}
            style={{ width: 220 }}
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Lọc
            </Button>
            <Button onClick={() => {
              setFilters({ action: undefined, entity_type: undefined, user_id: undefined, date_from: undefined, date_to: undefined, search: '' });
              fetchActivities(1, pagination.pageSize);
            }}>
              Đặt lại
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => fetchActivities(pagination.current, pagination.pageSize)}>
              Tải lại
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<DownloadOutlined />} onClick={() => handleExport('json')}>
          Xuất JSON
        </Button>
        <Button icon={<DownloadOutlined />} onClick={() => handleExport('csv')}>
          Xuất CSV
        </Button>
      </Space>

      <Table<ActivityLog>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={activities}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: <Empty description="Không có hoạt động" /> }}
      />
    </div>
  );
};

export default ActivityLogsPage;