import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Drawer,
  Descriptions,
  Modal,
  Form,
  message,
  Typography,
  Result,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TablePaginationConfig } from 'antd/es/table';
import {
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import type { User } from '../../types';

const { Title, Text } = Typography;
const roleLabels: Record<User['role'], string> = {
  admin: 'Quản trị viên',
  librarian: 'Thủ thư',
  member: 'Bạn đọc',
};

const statusTag = (isActive: boolean) => (
  <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Đang hoạt động' : 'Đã khóa'}</Tag>
);

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'librarian';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [roleFilter, setRoleFilter] = useState<User['role'] | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [updateForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const fetchUsers = useCallback(
    async (page = 1, pageSize = 10, role?: User['role']) => {
      if (!canManage) return;
      try {
        setLoading(true);
        const { users: data, pagination: serverPagination } = await userService.getUsers({
          page,
          limit: pageSize,
          role,
        });
        setUsers(data);
        setPagination({
          current: serverPagination.currentPage,
          pageSize: serverPagination.itemsPerPage,
          total: serverPagination.totalItems,
        });
      } catch (error: any) {
        console.error('Fetch users error:', error);
        message.error(error.response?.data?.message || 'Không thể tải danh sách người dùng');
      } finally {
        setLoading(false);
      }
    },
    [canManage],
  );

  useEffect(() => {
    if (canManage) {
      fetchUsers();
    }
  }, [canManage, fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const keyword = searchTerm.toLowerCase();
    return users.filter((item) =>
      item.full_name?.toLowerCase().includes(keyword) ||
      item.email?.toLowerCase().includes(keyword) ||
      item.username.toLowerCase().includes(keyword),
    );
  }, [users, searchTerm]);

  const handleTableChange = (pager: TablePaginationConfig) => {
    if (!searchTerm) {
      fetchUsers(pager.current, pager.pageSize, roleFilter);
    } else {
      setPagination((prev) => ({
        ...prev,
        current: pager.current || prev.current,
        pageSize: pager.pageSize || prev.pageSize,
      }));
    }
  };

  const openDetail = async (record: User) => {
    try {
      setActionLoading(true);
      const data = await userService.getUserById(record.id);
      setSelectedUser(data);
      setDetailVisible(true);
    } catch (error: any) {
      console.error('Get user detail error:', error);
      message.error(error.response?.data?.message || 'Không thể tải thông tin người dùng');
    } finally {
      setActionLoading(false);
    }
  };

  const openUpdateModal = (record: User) => {
    setSelectedUser(record);
    updateForm.setFieldsValue({
      full_name: record.full_name,
      phone: record.phone,
      address: record.address,
      role: record.role,
    });
    setUpdateModalVisible(true);
  };

  const submitUpdate = async () => {
    if (!selectedUser) return;
    try {
      const values = await updateForm.validateFields();
      setActionLoading(true);
      const payload: Partial<User> = {
        full_name: values.full_name,
        phone: values.phone,
        address: values.address,
      };
      if (user?.role === 'admin' && values.role) {
        payload.role = values.role;
      }
      const response = await userService.updateUser(selectedUser.id, payload);
      if (response.success) {
        message.success(response.message || 'Đã cập nhật thông tin người dùng');
        setUpdateModalVisible(false);
        fetchUsers(pagination.current, pagination.pageSize, roleFilter);
      } else {
        message.error(response.message || 'Không thể cập nhật thông tin');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Update user error:', error);
        message.error(error.response?.data?.message || 'Không thể cập nhật thông tin');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openPasswordModal = (record: User) => {
    setSelectedUser(record);
    passwordForm.setFieldsValue({
      current_password: record.id === user?.id ? '' : 'AdminOverride',
      new_password: '',
      confirm_password: '',
    });
    setPasswordModalVisible(true);
  };

  const submitPasswordChange = async () => {
    if (!selectedUser) return;
    try {
      const values = await passwordForm.validateFields();
      setActionLoading(true);
      const response = await userService.changePassword(selectedUser.id, {
        current_password: values.current_password,
        new_password: values.new_password,
      });
      if (response.success) {
        message.success(response.message || 'Đã đổi mật khẩu');
        setPasswordModalVisible(false);
      } else {
        message.error(response.message || 'Không thể đổi mật khẩu');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Change password error:', error);
        message.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async (record: User) => {
    Modal.confirm({
      title: record.is_active ? 'Khóa tài khoản' : 'Kích hoạt tài khoản',
      content: `Bạn có chắc chắn muốn ${record.is_active ? 'khóa' : 'kích hoạt'} tài khoản ${record.username}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setActionLoading(true);
          const response = await userService.toggleStatus(record.id);
          if (response.success) {
            message.success(response.message || 'Đã cập nhật trạng thái tài khoản');
            fetchUsers(pagination.current, pagination.pageSize, roleFilter);
          } else {
            message.error(response.message || 'Không thể cập nhật trạng thái');
          }
        } catch (error: any) {
          console.error('Toggle status error:', error);
          message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (value: string, record) => (
        <div>
          <strong>{value}</strong>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (value: User['role']) => <Tag color={value === 'admin' ? 'magenta' : value === 'librarian' ? 'blue' : 'default'}>{roleLabels[value]}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (value: boolean) => statusTag(value),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value: string) => new Date(value).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            Xem
          </Button>
          <Button icon={<EditOutlined />} onClick={() => openUpdateModal(record)}>
            Sửa
          </Button>
          <Button icon={<LockOutlined />} onClick={() => openPasswordModal(record)}>
            Đổi mật khẩu
          </Button>
          {user?.role === 'admin' && (
            <Button
              icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
              danger={record.is_active}
              onClick={() => toggleStatus(record)}
            >
              {record.is_active ? 'Khóa' : 'Kích hoạt'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Không có quyền truy cập"
        subTitle="Bạn cần quyền thủ thư hoặc quản trị để xem trang này."
      />
    );
  }

  return (
    <div>
      <Title level={2}>Quản lý người dùng</Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder="Lọc theo vai trò"
          value={roleFilter}
          style={{ width: 200 }}
          onChange={(value: User['role'] | undefined) => {
            setRoleFilter(value || undefined);
            fetchUsers(1, pagination.pageSize, value || undefined);
          }}
          options={[
            { label: 'Quản trị viên', value: 'admin' },
            { label: 'Thủ thư', value: 'librarian' },
            { label: 'Bạn đọc', value: 'member' },
          ]}
        />
        <Input.Search
          allowClear
          placeholder="Tìm theo tên, email hoặc username"
          style={{ width: 280 }}
          onSearch={setSearchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(pagination.current, pagination.pageSize, roleFilter)}>
          Tải lại
        </Button>
      </Space>

      <Table<User>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredUsers}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: searchTerm ? filteredUsers.length : pagination.total,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: <Empty description="Không có người dùng" /> }}
      />

      <Drawer
        title="Thông tin người dùng"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={400}
      >
        {selectedUser ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Họ tên">{selectedUser.full_name}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{selectedUser.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{selectedUser.address || '—'}</Descriptions.Item>
            <Descriptions.Item label="Vai trò">{roleLabels[selectedUser.role]}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">{statusTag(selectedUser.is_active)}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {new Date(selectedUser.created_at).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Result icon={<></>} title="Đang tải thông tin..." />
        )}
      </Drawer>

      <Modal
        title="Cập nhật thông tin người dùng"
        open={updateModalVisible}
        onCancel={() => setUpdateModalVisible(false)}
        onOk={submitUpdate}
        okText="Cập nhật"
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={updateForm} preserve={false}>
          <Form.Item name="full_name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Nhập họ tên" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={3} placeholder="Nhập địa chỉ" />
          </Form.Item>
          {user?.role === 'admin' && (
            <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select
                options={[
                  { label: 'Quản trị viên', value: 'admin' },
                  { label: 'Thủ thư', value: 'librarian' },
                  { label: 'Bạn đọc', value: 'member' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="Đổi mật khẩu"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onOk={submitPasswordChange}
        okText="Cập nhật"
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={passwordForm} preserve={false}>
          <Form.Item
            name="current_password"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
            extra={selectedUser && selectedUser.id !== user?.id ? 'Quản trị viên có thể nhập bất kỳ giá trị nào' : ''}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                message: 'Mật khẩu phải chứa chữ hoa, chữ thường và số',
              },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="Xác nhận mật khẩu"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
