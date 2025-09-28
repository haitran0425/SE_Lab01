import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Modal,
  Form,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Empty,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { borrowService } from '../../services/borrowService';
import { bookService } from '../../services/bookService';
import { useAuth } from '../../contexts/AuthContext';
import type { Book, Borrow } from '../../types';

const { Title, Text } = Typography;
const { Search } = Input;

interface BorrowPageProps {
  defaultTab?: 'admin' | 'member';
  hideAdminTab?: boolean;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
};

const statusColorMap: Record<Borrow['status'], string> = {
  borrowed: 'processing',
  returned: 'success',
  overdue: 'error',
  lost: 'warning',
};

const BorrowPage: React.FC<BorrowPageProps> = ({ defaultTab, hideAdminTab = false }) => {
  const { user } = useAuth();
  const initialTab = defaultTab ?? (user?.role === 'member' ? 'member' : 'admin');
  const [activeTab, setActiveTab] = useState<'admin' | 'member'>(initialTab);

  const [borrowLoading, setBorrowLoading] = useState(false);
  const [myBorrowLoading, setMyBorrowLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [myBorrows, setMyBorrows] = useState<Borrow[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<{ current: number; pageSize: number; total: number }>({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [borrowModalVisible, setBorrowModalVisible] = useState(false);
  const [borrowForm] = Form.useForm();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const canManageBorrows = user?.role === 'admin' || user?.role === 'librarian';

  const fetchAvailableBooks = useCallback(async () => {
    try {
      setBooksLoading(true);
      const books = await bookService.getAvailableBooks();
      setAvailableBooks(books);
    } catch (error: any) {
      console.error('Fetch available books error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách sách có sẵn');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  const fetchBorrows = useCallback(
    async (page = 1, pageSize = 10) => {
      if (!canManageBorrows) return;
      try {
        setBorrowLoading(true);
        const { borrows: borrowList, pagination: serverPagination } = await borrowService.getBorrows({
          page,
          limit: pageSize,
          status: statusFilter as Borrow['status'] | undefined,
        });
        setBorrows(borrowList);
        setPagination({
          current: serverPagination.currentPage,
          pageSize: serverPagination.itemsPerPage,
          total: serverPagination.totalItems,
        });
      } catch (error: any) {
        console.error('Fetch borrows error:', error);
        message.error(error.response?.data?.message || 'Không thể tải danh sách mượn sách');
      } finally {
        setBorrowLoading(false);
      }
    },
    [canManageBorrows, statusFilter],
  );

  const fetchMyBorrows = useCallback(async () => {
    try {
      setMyBorrowLoading(true);
      const data = await borrowService.getMyBorrows();
      setMyBorrows(data);
    } catch (error: any) {
      console.error('Fetch my borrows error:', error);
      message.error(error.response?.data?.message || 'Không thể tải sách bạn đã mượn');
    } finally {
      setMyBorrowLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageBorrows) {
      fetchBorrows();
    }
  }, [canManageBorrows, fetchBorrows]);

  useEffect(() => {
    fetchMyBorrows();
  }, [fetchMyBorrows]);

  const filteredBorrows = useMemo(() => {
    if (!searchTerm) return borrows;
    const keyword = searchTerm.toLowerCase();
    return borrows.filter((borrow) => {
      return (
        borrow.title?.toLowerCase().includes(keyword) ||
        borrow.full_name?.toLowerCase().includes(keyword) ||
        borrow.email?.toLowerCase().includes(keyword) ||
        borrow.isbn?.toLowerCase().includes(keyword)
      );
    });
  }, [borrows, searchTerm]);

  const myBorrowStats = useMemo(() => {
    const borrowed = myBorrows.filter((item) => item.status === 'borrowed');
    const overdue = myBorrows.filter((item) => item.status === 'overdue');
    return {
      total: myBorrows.length,
      borrowed: borrowed.length,
      overdue: overdue.length,
    };
  }, [myBorrows]);

  const tablePagination: TablePaginationConfig | false = searchTerm
    ? {
        current: 1,
        pageSize: filteredBorrows.length || 10,
        total: filteredBorrows.length,
        showSizeChanger: false,
      }
    : {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
      };

  const handleTableChange = (pager: TablePaginationConfig) => {
    if (!searchTerm) {
      fetchBorrows(pager.current, pager.pageSize);
    }
  };

  const handleReturnBook = (record: Borrow) => {
    Modal.confirm({
      title: 'Xác nhận trả sách',
      content: `Xác nhận đánh dấu sách "${record.title}" đã được trả?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setSubmitLoading(true);
          const response = await borrowService.returnBook(record.id);
          if (response.success !== false) {
            message.success(response.message || 'Đã cập nhật trạng thái trả sách');
            fetchBorrows(pagination.current, pagination.pageSize);
            fetchMyBorrows();
          } else {
            message.error(response.message || 'Không thể trả sách');
          }
        } catch (error: any) {
          console.error('Return book error:', error);
          message.error(error.response?.data?.message || 'Không thể trả sách');
        } finally {
          setSubmitLoading(false);
        }
      },
    });
  };

  const openBorrowModal = () => {
    if (!availableBooks.length) {
      fetchAvailableBooks();
    }
    borrowForm.resetFields();
    setBorrowModalVisible(true);
  };

  const handleBorrowBook = async () => {
    try {
      const values = await borrowForm.validateFields();
      setSubmitLoading(true);
      const response = await borrowService.createBorrow({
        book_id: values.book_id,
        borrow_days: values.borrow_days,
      });
      if (response.success) {
        message.success(response.message || 'Mượn sách thành công');
        setBorrowModalVisible(false);
        fetchMyBorrows();
        if (canManageBorrows) {
          fetchBorrows(pagination.current, pagination.pageSize);
        }
      } else {
        message.error(response.message || 'Không thể mượn sách');
      }
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Borrow book error:', error);
        message.error(error.response?.data?.message || 'Không thể mượn sách');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const adminColumns: ColumnsType<Borrow> = [
    {
      title: 'Thành viên',
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
          <Text type="secondary">ISBN: {record.isbn}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày mượn',
      dataIndex: 'borrow_date',
      key: 'borrow_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Hạn trả',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (value: string, record) => (
        <Tag color={record.status === 'overdue' ? 'error' : 'blue'}>{formatDate(value)}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Borrow['status']) => <Tag color={statusColorMap[value]}>{value.toUpperCase()}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            icon={<ReloadOutlined />}
            type="link"
            disabled={record.status !== 'borrowed' && record.status !== 'overdue'}
            onClick={() => handleReturnBook(record)}
          >
            Trả sách
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns: ColumnsType<Borrow> = [
    {
      title: 'Sách',
      dataIndex: 'title',
      key: 'title',
      render: (_, record) => (
        <div>
          <strong>{record.title}</strong>
          <br />
          <Text type="secondary">{record.author}</Text>
        </div>
      ),
    },
    {
      title: 'Ngày mượn',
      dataIndex: 'borrow_date',
      key: 'borrow_date',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Hạn trả',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (value: string, record) => (
        <Tag color={record.status === 'overdue' ? 'error' : 'blue'}>{formatDate(value)}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: Borrow['status']) => <Tag color={statusColorMap[value]}>{value.toUpperCase()}</Tag>,
    },
  ];

  const tabItems: { key: string; label: React.ReactNode; children: React.ReactNode }[] = [];

  if (canManageBorrows && !hideAdminTab) {
    tabItems.push({
      key: 'admin',
      label: 'Quản trị',
      children: (
        <div>
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              allowClear
              placeholder="Lọc theo trạng thái"
              value={statusFilter}
              style={{ width: 200 }}
              onChange={(value) => {
                setStatusFilter(value || undefined);
                setPagination((prev) => ({ ...prev, current: 1 }));
                fetchBorrows(1, pagination.pageSize);
              }}
              options={[
                { label: 'Đang mượn', value: 'borrowed' },
                { label: 'Đã trả', value: 'returned' },
                { label: 'Quá hạn', value: 'overdue' },
                { label: 'Mất sách', value: 'lost' },
              ]}
            />
            <Search
              allowClear
              placeholder="Tìm theo sách, người mượn, email"
              onSearch={setSearchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ width: 280 }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => fetchBorrows(pagination.current, pagination.pageSize)}>
              Tải lại
            </Button>
          </Space>

          <Table<Borrow>
            rowKey="id"
            loading={borrowLoading}
            columns={adminColumns}
            dataSource={filteredBorrows}
            pagination={tablePagination}
            onChange={handleTableChange}
            locale={{ emptyText: <Empty description="Không có dữ liệu mượn sách" /> }}
          />
        </div>
      ),
    });
  }

  tabItems.push({
    key: 'member',
    label: 'Phiếu mượn của tôi',
    children: (
      <div>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Statistic title="Tổng số lần mượn" value={myBorrowStats.total} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Đang mượn" value={myBorrowStats.borrowed} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic title="Quá hạn" value={myBorrowStats.overdue} valueStyle={{ color: '#cf1322' }} />
          </Col>
        </Row>

        <Space style={{ marginBottom: 16 }} wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openBorrowModal}>
            Mượn sách
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchMyBorrows}>
            Làm mới
          </Button>
        </Space>

        <Table<Borrow>
          rowKey="id"
          loading={myBorrowLoading}
          columns={memberColumns}
          dataSource={myBorrows}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Bạn chưa có phiếu mượn nào" /> }}
        />
      </div>
    ),
  });

  return (
    <div>
      <Title level={2}>Quản lý mượn sách</Title>
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as 'admin' | 'member')} items={tabItems} />

      <Modal
        title="Đăng ký mượn sách"
        open={borrowModalVisible}
        onCancel={() => setBorrowModalVisible(false)}
        onOk={handleBorrowBook}
        okText="Mượn sách"
        confirmLoading={submitLoading}
        destroyOnClose
      >
        <Spin spinning={booksLoading}>
          <Form form={borrowForm} layout="vertical" preserve={false}>
            <Form.Item
              name="book_id"
              label="Chọn sách"
              rules={[{ required: true, message: 'Vui lòng chọn sách muốn mượn' }]}
            >
              <Select
                showSearch
                placeholder="Chọn sách muốn mượn"
                optionFilterProp="label"
                onFocus={fetchAvailableBooks}
                options={availableBooks.map((book) => ({
                  label: `${book.title} (${book.available_copies} bản có sẵn)`,
                  value: book.id,
                  disabled: book.available_copies <= 0,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="borrow_days"
              label="Số ngày mượn"
              initialValue={14}
              rules={[{ required: true, message: 'Vui lòng nhập số ngày mượn' }]}
            >
              <Select
                options={[
                  { value: 7, label: '7 ngày' },
                  { value: 14, label: '14 ngày' },
                  { value: 21, label: '21 ngày' },
                  { value: 28, label: '28 ngày' },
                ]}
              />
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default BorrowPage;
