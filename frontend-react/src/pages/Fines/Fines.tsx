import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  message,
  Typography,
  Empty,
  Spin,
  Row,
  Col,
  Statistic,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import { DollarOutlined, ReloadOutlined, CheckCircleOutlined, StopOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { fineService } from '../../services/fineService';
import { borrowService } from '../../services/borrowService';
import type { Borrow, Fine } from '../../types';

const { Title, Text } = Typography;

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('vi-VN') : '—');

const statusColors: Record<Fine['status'], string> = {
  pending: 'warning',
  paid: 'success',
  waived: 'default',
};

const FinesPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'librarian';

  const [activeTab, setActiveTab] = useState<'admin' | 'member'>(canManage ? 'admin' : 'member');
  const [fines, setFines] = useState<Fine[]>([]);
  const [myFines, setMyFines] = useState<Fine[]>([]);
  const [borrowOptions, setBorrowOptions] = useState<Borrow[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [waiveModalVisible, setWaiveModalVisible] = useState(false);
  const [selectedFine, setSelectedFine] = useState<Fine | null>(null);
  const [form] = Form.useForm();
  const [waiveForm] = Form.useForm();

  const fetchFines = useCallback(
    async (status?: Fine['status']) => {
      if (!canManage) return;
      try {
        setLoading(true);
        const { fines: data } = await fineService.getFines({ status, limit: 100 });
        setFines(data);
      } catch (error: any) {
        console.error('Fetch fines error:', error);
        message.error(error.response?.data?.message || 'Không thể tải danh sách phạt');
      } finally {
        setLoading(false);
      }
    },
    [canManage],
  );

  const fetchMyFines = useCallback(async () => {
    try {
      setMyLoading(true);
      const data = await fineService.getMyFines();
      setMyFines(data);
    } catch (error: any) {
      console.error('Fetch my fines error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách phạt của bạn');
    } finally {
      setMyLoading(false);
    }
  }, []);

  const fetchBorrows = useCallback(async () => {
    if (!canManage) return;
    try {
      setBorrowLoading(true);
      const { borrows } = await borrowService.getBorrows({ limit: 200, status: 'borrowed' });
      setBorrowOptions(borrows);
    } catch (error: any) {
      console.error('Fetch borrows error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách mượn sách');
    } finally {
      setBorrowLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    if (canManage) {
      fetchFines();
      fetchBorrows();
    }
  }, [canManage, fetchFines, fetchBorrows]);

  useEffect(() => {
    fetchMyFines();
  }, [fetchMyFines]);

  const filteredFines = useMemo(() => {
    let data = fines;
    if (filteredStatus) {
      data = data.filter((fine) => fine.status === filteredStatus);
    }
    if (!searchTerm) return data;
    const keyword = searchTerm.toLowerCase();
    return data.filter((fine) =>
      fine.full_name?.toLowerCase().includes(keyword) ||
      fine.email?.toLowerCase().includes(keyword) ||
      fine.title?.toLowerCase().includes(keyword),
    );
  }, [fines, filteredStatus, searchTerm]);

  const myStats = useMemo(() => {
    const pending = myFines.filter((fine) => fine.status === 'pending');
    const paid = myFines.filter((fine) => fine.status === 'paid');
    return {
      total: myFines.length,
      pending: pending.length,
      paid: paid.length,
      totalAmount: pending.reduce((sum, fine) => sum + (fine.amount || 0), 0),
    };
  }, [myFines]);

  const handlePayFine = async (fine: Fine) => {
    Modal.confirm({
      title: 'Thanh toán phạt',
      content: `Xác nhận đã thanh toán khoản phạt ${formatCurrency(fine.amount)} cho sách "${fine.title}"?`,
      okText: 'Thanh toán',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setSubmitLoading(true);
          const response = await fineService.payFine(fine.id);
          if (response.success) {
            message.success(response.message || 'Đã thanh toán phạt');
            fetchMyFines();
            fetchFines(filteredStatus as Fine['status'] | undefined);
          } else {
            message.error(response.message || 'Không thể thanh toán phạt');
          }
        } catch (error: any) {
          console.error('Pay fine error:', error);
          message.error(error.response?.data?.message || 'Không thể thanh toán phạt');
        } finally {
          setSubmitLoading(false);
        }
      },
    });
  };

  const handleWaiveFine = (fine: Fine) => {
    setSelectedFine(fine);
    waiveForm.resetFields();
    setWaiveModalVisible(true);
  };

  const submitWaive = async () => {
    if (!selectedFine) return;
    try {
      const values = await waiveForm.validateFields();
      setSubmitLoading(true);
      const response = await fineService.waiveFine(selectedFine.id, { reason: values.reason });
      if (response.success) {
        message.success(response.message || 'Đã miễn phạt');
        setWaiveModalVisible(false);
        fetchFines(filteredStatus as Fine['status'] | undefined);
      } else {
        message.error(response.message || 'Không thể miễn phạt');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Waive fine error:', error);
        message.error(error.response?.data?.message || 'Không thể miễn phạt');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const openCreateModal = () => {
    form.resetFields();
    setCreateModalVisible(true);
    if (!borrowOptions.length) {
      fetchBorrows();
    }
  };

  const submitCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const response = await fineService.createFine({
        borrow_id: values.borrow_id,
        amount: values.amount,
        reason: values.reason,
      });
      if (response.success) {
        message.success(response.message || 'Đã tạo khoản phạt');
        setCreateModalVisible(false);
        fetchFines(filteredStatus as Fine['status'] | undefined);
      } else {
        message.error(response.message || 'Không thể tạo khoản phạt');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Create fine error:', error);
        message.error(error.response?.data?.message || 'Không thể tạo khoản phạt');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const adminColumns: ColumnsType<Fine> = [
    {
      title: 'Bạn đọc',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (_, record) => (
        <div>
          <strong>{record.full_name}</strong>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: 'Sách',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <br />
          <Text type="secondary">Ngày mượn: {formatDate(record.borrow_date || record.created_at)}</Text>
        </div>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Fine['status']) => <Tag color={statusColors[value]}>{value.toUpperCase()}</Tag>,
    },
    {
      title: 'Ngày đến hạn',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<CheckCircleOutlined />}
            type="link"
            disabled={record.status !== 'pending'}
            onClick={() => handlePayFine(record)}
          >
            Đã thu
          </Button>
          <Button
            icon={<StopOutlined />}
            type="link"
            danger
            disabled={record.status !== 'pending'}
            onClick={() => handleWaiveFine(record)}
          >
            Miễn phạt
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns: ColumnsType<Fine> = [
    {
      title: 'Sách',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <br />
          <Text type="secondary">Ngày mượn: {formatDate(record.borrow_date || record.created_at)}</Text>
        </div>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: number) => formatCurrency(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Fine['status']) => <Tag color={statusColors[value]}>{value.toUpperCase()}</Tag>,
    },
    {
      title: 'Ngày đến hạn',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<DollarOutlined />}
          disabled={record.status !== 'pending'}
          onClick={() => handlePayFine(record)}
        >
          Thanh toán
        </Button>
      ),
    },
  ];

  const tabItems: NonNullable<TabsProps['items']> = [];

  if (canManage) {
    tabItems.push({
      key: 'admin',
      label: 'Quản trị',
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              allowClear
              placeholder="Trạng thái"
              value={filteredStatus}
              style={{ width: 180 }}
              onChange={(value) => {
                setFilteredStatus(value || undefined);
                fetchFines((value || undefined) as Fine['status'] | undefined);
              }}
              options={[
                { label: 'Đang chờ', value: 'pending' },
                { label: 'Đã thanh toán', value: 'paid' },
                { label: 'Đã miễn', value: 'waived' },
              ]}
            />
            <Input.Search
              allowClear
              placeholder="Tìm theo sách hoặc bạn đọc"
              onSearch={setSearchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchFines(filteredStatus as Fine['status'] | undefined)}>
              Tải lại
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Thêm khoản phạt
            </Button>
          </Space>

          <Table<Fine>
            rowKey="id"
            loading={loading}
            columns={adminColumns}
            dataSource={filteredFines}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Không có khoản phạt" /> }}
          />
        </div>
      ),
    });
  }

  tabItems.push({
    key: 'member',
    label: 'Khoản phạt của tôi',
    children: (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Statistic title="Tổng khoản phạt" value={myStats.total} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Chưa thanh toán" value={myStats.pending} valueStyle={{ color: '#fa8c16' }} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Đã thanh toán" value={myStats.paid} valueStyle={{ color: '#52c41a' }} />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Statistic title="Tổng nợ hiện tại" value={formatCurrency(myStats.totalAmount)} />
          </Col>
        </Row>

        <Button icon={<ReloadOutlined />} onClick={fetchMyFines} style={{ marginBottom: 16 }}>
          Làm mới
        </Button>

        <Table<Fine>
          rowKey="id"
          loading={myLoading}
          columns={memberColumns}
          dataSource={myFines}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Bạn không có khoản phạt nào" /> }}
        />
      </div>
    ),
  });

  return (
    <div>
      <Title level={2}>Quản lý phạt</Title>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'admin' | 'member')} items={tabItems} />

      <Modal
        title="Thêm khoản phạt"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={submitCreate}
        okText="Tạo phạt"
        confirmLoading={submitLoading}
        destroyOnClose
      >
        <Spin spinning={borrowLoading}>
          <Form layout="vertical" form={form} preserve={false}>
            <Form.Item
              name="borrow_id"
              label="Phiếu mượn"
              rules={[{ required: true, message: 'Vui lòng chọn phiếu mượn' }]}
            >
              <Select
                showSearch
                placeholder="Chọn phiếu mượn đang còn"
                optionFilterProp="label"
                onFocus={fetchBorrows}
                options={borrowOptions.map((borrow) => ({
                  value: borrow.id,
                  label: `${borrow.full_name} - ${borrow.title} (hạn ${formatDate(borrow.due_date)})`,
                }))}
                notFoundContent={borrowLoading ? <Spin size="small" /> : 'Không có phiếu mượn phù hợp'}
              />
            </Form.Item>
            <Form.Item
              name="amount"
              label="Số tiền phạt"
              rules={[{ required: true, message: 'Vui lòng nhập số tiền phạt' }]}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value?.replace(/\s?/g, '').replace(/,/g, '') || ''}
              />
            </Form.Item>
            <Form.Item
              name="reason"
              label="Lý do"
              rules={[{ required: true, message: 'Vui lòng nhập lý do phạt' }]}
            >
              <Input.TextArea rows={3} placeholder="Nhập lý do phạt" />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      <Modal
        title="Miễn khoản phạt"
        open={waiveModalVisible}
        onCancel={() => setWaiveModalVisible(false)}
        onOk={submitWaive}
        okText="Miễn phạt"
        confirmLoading={submitLoading}
        destroyOnClose
      >
        <Form layout="vertical" form={waiveForm} preserve={false}>
          <Form.Item
            name="reason"
            label="Ghi chú"
            rules={[{ required: false }]}
          >
            <Input.TextArea rows={3} placeholder="Lý do miễn phạt (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FinesPage;
