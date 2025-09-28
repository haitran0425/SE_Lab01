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
  message,
  Typography,
  Input,
  Row,
  Col,
  Statistic,
  Empty,
  Spin,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TabsProps } from 'antd';
import { PlusOutlined, ReloadOutlined, CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { reservationService } from '../../services/reservationService';
import { bookService } from '../../services/bookService';
import type { Book, Reservation } from '../../types';

const { Title, Text } = Typography;
const { Search } = Input;

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
};

const statusColors: Record<Reservation['status'], string> = {
  active: 'processing',
  fulfilled: 'success',
  expired: 'default',
  cancelled: 'error',
};

const ReservationsPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'librarian';

  const [activeTab, setActiveTab] = useState<'admin' | 'member'>(canManage ? 'admin' : 'member');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchReservations = useCallback(async () => {
    if (!canManage) return;
    try {
      setLoading(true);
      const data = await reservationService.getReservations();
      setReservations(data);
    } catch (error: any) {
      console.error('Fetch reservations error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách đặt trước');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const fetchMyReservations = useCallback(async () => {
    try {
      setMyLoading(true);
      const data = await reservationService.getMyReservations();
      setMyReservations(data);
    } catch (error: any) {
      console.error('Fetch my reservations error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách đặt trước của bạn');
    } finally {
      setMyLoading(false);
    }
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setBooksLoading(true);
      const { books: rawBooks } = await bookService.getBooks({ limit: 200 });
      const unavailableBooks = rawBooks.filter((book) => book.available_copies <= 0);
      setBooks(unavailableBooks);
    } catch (error: any) {
      console.error('Fetch books error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách sách');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) {
      fetchReservations();
    }
  }, [canManage, fetchReservations]);

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  const filteredReservations = useMemo(() => {
    let data = reservations;
    if (filteredStatus) {
      data = data.filter((item) => item.status === filteredStatus);
    }
    if (!searchTerm) return data;
    const keyword = searchTerm.toLowerCase();
    return data.filter((item) =>
      item.title?.toLowerCase().includes(keyword) ||
      item.full_name?.toLowerCase().includes(keyword) ||
      item.email?.toLowerCase().includes(keyword),
    );
  }, [reservations, filteredStatus, searchTerm]);

  const myStats = useMemo(() => {
    const active = myReservations.filter((item) => item.status === 'active');
    const fulfilled = myReservations.filter((item) => item.status === 'fulfilled');
    return {
      total: myReservations.length,
      active: active.length,
      fulfilled: fulfilled.length,
    };
  }, [myReservations]);

  const handleCancel = async (reservation: Reservation) => {
    Modal.confirm({
      title: 'Hủy đặt trước',
      content: `Bạn có chắc chắn muốn hủy đặt trước cho sách "${reservation.title}"?`,
      okText: 'Hủy đặt trước',
      okButtonProps: { danger: true },
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          setSubmitLoading(true);
          const response = await reservationService.cancelReservation(reservation.id);
          if (response.success) {
            message.success(response.message || 'Đã hủy đặt trước');
            fetchMyReservations();
            fetchReservations();
          } else {
            message.error(response.message || 'Không thể hủy đặt trước');
          }
        } catch (error: any) {
          console.error('Cancel reservation error:', error);
          message.error(error.response?.data?.message || 'Không thể hủy đặt trước');
        } finally {
          setSubmitLoading(false);
        }
      },
    });
  };

  const handleFulfill = async (reservation: Reservation) => {
    Modal.confirm({
      title: 'Thực hiện đặt trước',
      content: `Xác nhận thông báo sách "${reservation.title}" đã sẵn sàng cho bạn đọc?`,
      okText: 'Thông báo',
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          setSubmitLoading(true);
          const response = await reservationService.fulfillReservation(reservation.id);
          if (response.success) {
            message.success(response.message || 'Đã cập nhật đặt trước');
            fetchReservations();
            fetchMyReservations();
          } else {
            message.error(response.message || 'Không thể cập nhật đặt trước');
          }
        } catch (error: any) {
          console.error('Fulfill reservation error:', error);
          message.error(error.response?.data?.message || 'Không thể cập nhật đặt trước');
        } finally {
          setSubmitLoading(false);
        }
      },
    });
  };

  const openModal = () => {
    form.resetFields();
    if (!books.length) {
      fetchBooks();
    }
    setModalVisible(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);
      const response = await reservationService.createReservation({ book_id: values.book_id });
      if (response.success) {
        message.success(response.message || 'Đã tạo đặt trước');
        setModalVisible(false);
        fetchMyReservations();
        fetchReservations();
      } else {
        message.error(response.message || 'Không thể tạo đặt trước');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Create reservation error:', error);
        message.error(error.response?.data?.message || 'Không thể tạo đặt trước');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const adminColumns: ColumnsType<Reservation> = [
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
          <Text type="secondary">Ưu tiên: #{record.priority}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'reservation_date',
      key: 'reservation_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Hết hạn',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Reservation['status']) => <Tag color={statusColors[value]}>{value.toUpperCase()}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<CheckOutlined />}
            disabled={record.status !== 'active'}
            onClick={() => handleFulfill(record)}
          >
            Thực hiện
          </Button>
          <Button
            type="link"
            danger
            icon={<CloseCircleOutlined />}
            disabled={record.status !== 'active'}
            onClick={() => handleCancel(record)}
          >
            Hủy
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns: ColumnsType<Reservation> = [
    {
      title: 'Sách',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <br />
          <Text type="secondary">Tác giả: {record.author}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'reservation_date',
      key: 'reservation_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Hết hạn',
      dataIndex: 'expiry_date',
      key: 'expiry_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Reservation['status']) => <Tag color={statusColors[value]}>{value.toUpperCase()}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          danger
          disabled={record.status !== 'active'}
          onClick={() => handleCancel(record)}
        >
          Hủy đặt
        </Button>
      ),
    },
  ];

  const items: NonNullable<TabsProps['items']> = [];

  if (canManage) {
    items.push({
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
              onChange={(value) => setFilteredStatus(value || undefined)}
              options={[
                { label: 'Hoạt động', value: 'active' },
                { label: 'Đã thông báo', value: 'fulfilled' },
                { label: 'Đã hết hạn', value: 'expired' },
                { label: 'Đã hủy', value: 'cancelled' },
              ]}
            />
            <Search
              allowClear
              placeholder="Tìm theo sách hoặc người dùng"
              onSearch={setSearchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: 260 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchReservations}>
              Tải lại
            </Button>
          </Space>

          <Table<Reservation>
            rowKey="id"
            loading={loading}
            columns={adminColumns}
            dataSource={filteredReservations}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Không có đặt trước nào" /> }}
          />
        </div>
      ),
    });
  }

  items.push({
    key: 'member',
    label: 'Đặt trước của tôi',
    children: (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Statistic title="Tổng đặt trước" value={myStats.total} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Đang chờ" value={myStats.active} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Đã thông báo" value={myStats.fulfilled} valueStyle={{ color: '#52c41a' }} />
          </Col>
        </Row>

        <Space style={{ marginBottom: 16 }} wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
            Đặt trước sách
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchMyReservations}>
            Làm mới
          </Button>
        </Space>

        <Table<Reservation>
          rowKey="id"
          loading={myLoading}
          columns={memberColumns}
          dataSource={myReservations}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Bạn chưa có đặt trước nào" /> }}
        />
      </div>
    ),
  });

  return (
    <div>
      <Title level={2}>Đặt trước sách</Title>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'admin' | 'member')} items={items} />

      <Modal
        title="Tạo đặt trước"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleCreate}
        okText="Đặt trước"
        confirmLoading={submitLoading}
        destroyOnClose
      >
        <Spin spinning={booksLoading}>
          <Form layout="vertical" form={form} preserve={false}>
            <Form.Item
              name="book_id"
              label="Chọn sách"
              rules={[{ required: true, message: 'Vui lòng chọn sách muốn đặt trước' }]}
            >
              <Select
                showSearch
                placeholder="Chọn sách đang hết"
                optionFilterProp="label"
                onFocus={fetchBooks}
                options={books.map((book) => ({
                  value: book.id,
                  label: `${book.title} (đang hết sách)`,
                }))}
                notFoundContent={booksLoading ? <Spin size="small" /> : 'Không có sách cần đặt trước'}
              />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default ReservationsPage;
