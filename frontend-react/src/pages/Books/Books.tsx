import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  Select,
  message,
  Empty,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { bookService, BookQueryParams } from '../../services/bookService.ts';
import { categoryService } from '../../services/categoryService.ts';
import { Book, Category, PaginationResponse } from '../../types';
import { useAuth } from '../../contexts/AuthContext.tsx';

const { Title, Text } = Typography;

const DEFAULT_PAGINATION: PaginationResponse = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
};

const Books: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState<BookQueryParams>({ page: 1, limit: 10 });
  const [pagination, setPagination] = useState<PaginationResponse>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const isManager = useMemo(() => ['admin', 'librarian'].includes(user?.role ?? ''), [user?.role]);

  const fetchBooks = async (params: BookQueryParams = query) => {
    try {
      setLoading(true);
      const { books: fetchedBooks, pagination: meta } = await bookService.getBooks(params);
      setBooks(fetchedBooks);
      setPagination(meta);
    } catch (error: any) {
      console.error('Fetch books error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách sách');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Fetch categories error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách thể loại');
    }
  };

  useEffect(() => {
    fetchBooks(query);
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = (paginationConfig: TablePaginationConfig) => {
    const nextQuery: BookQueryParams = {
      ...query,
      page: paginationConfig.current || 1,
      limit: paginationConfig.pageSize || query.limit,
    };
    setQuery(nextQuery);
    fetchBooks(nextQuery);
  };

  const handleSearch = (value: string) => {
    const nextQuery: BookQueryParams = {
      ...query,
      page: 1,
      search: value || undefined,
    };
    setQuery(nextQuery);
    fetchBooks(nextQuery);
  };

  const openCreateModal = () => {
    setSelectedBook(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: Book) => {
    setSelectedBook(record);
    form.setFieldsValue({
      title: record.title,
      author: record.author,
      isbn: record.isbn,
      category_id: record.category_id,
      total_copies: record.total_copies,
      publication_year: record.publication_year,
      language: record.language,
    });
    setModalVisible(true);
  };

  const handleDelete = async (record: Book) => {
    Modal.confirm({
      title: 'Xác nhận xoá sách',
      content: `Bạn có chắc chắn muốn xoá sách "${record.title}"?`,
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          const response = await bookService.deleteBook(record.id);
          if (response.success) {
            message.success('Đã xoá sách thành công');
            fetchBooks(query);
          } else {
            message.error(response.message || 'Không thể xoá sách');
          }
        } catch (error: any) {
          console.error('Delete book error:', error);
          message.error(error.response?.data?.message || 'Không thể xoá sách');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        total_copies: Number(values.total_copies),
        publication_year: values.publication_year ? Number(values.publication_year) : undefined,
      };

      if (selectedBook) {
        const response = await bookService.updateBook(selectedBook.id, payload);
        if (response.success) {
          message.success('Cập nhật sách thành công');
        } else {
          message.error(response.message || 'Không thể cập nhật sách');
        }
      } else {
        const response = await bookService.createBook(payload);
        if (response.success) {
          message.success('Thêm sách mới thành công');
        } else {
          message.error(response.message || 'Không thể thêm sách');
        }
      }

      setModalVisible(false);
      fetchBooks(query);
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Save book error:', error);
        message.error(error.response?.data?.message || 'Không thể lưu thông tin sách');
      }
    }
  };

  const columns: ColumnsType<Book> = [
    {
      title: 'ISBN',
      dataIndex: 'isbn',
      key: 'isbn',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">{record.author}</Text>
        </Space>
      ),
    },
    {
      title: 'Thể loại',
      dataIndex: 'category_name',
      key: 'category_name',
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: 'Ngôn ngữ',
      dataIndex: 'language',
      key: 'language',
      width: 120,
    },
    {
      title: 'Số lượng',
      dataIndex: 'total_copies',
      key: 'total_copies',
      render: (_, record) => (
        <Space size="small">
          <Tag color="green">Có sẵn: {record.available_copies}</Tag>
          <Tag>Số lượng: {record.total_copies}</Tag>
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {isManager && (
            <Button type="link" onClick={() => openEditModal(record)}>
              Sửa
            </Button>
          )}
          {isManager && (
            <Button type="link" danger onClick={() => handleDelete(record)}>
              Xoá
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space align="center" style={{ width: '100%', marginBottom: 16, justifyContent: 'space-between' }}>
        <div>
          <Title level={2} style={{ marginBottom: 0 }}>
            Quản lý sách
          </Title>
          <Text type="secondary">Theo dõi, tìm kiếm và cập nhật thông tin sách trong thư viện</Text>
        </div>
        {isManager && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm sách
          </Button>
        )}
      </Space>

      <Input.Search
        placeholder="Tìm kiếm theo tên, tác giả hoặc ISBN"
        allowClear
        enterButton="Tìm kiếm"
        onSearch={handleSearch}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />

      <Table<Book>
        loading={loading}
        columns={columns}
        dataSource={books}
        rowKey="id"
        pagination={{
          current: pagination.currentPage,
          total: pagination.totalItems,
          pageSize: pagination.itemsPerPage,
          showSizeChanger: true,
        }}
        onChange={handleTableChange}
        locale={{
          emptyText: loading ? <></> : <Empty description="Chưa có sách nào" />,
        }}
      />

      <Modal
        title={selectedBook ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="Lưu"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề sách' }]}
          >
            <Input placeholder="Nhập tiêu đề" />
          </Form.Item>

          <Form.Item
            name="author"
            label="Tác giả"
            rules={[{ required: true, message: 'Vui lòng nhập tên tác giả' }]}
          >
            <Input placeholder="Nhập tên tác giả" />
          </Form.Item>

          <Form.Item
            name="isbn"
            label="ISBN"
            rules={[{ required: true, message: 'Vui lòng nhập mã ISBN' }]}
          >
            <Input placeholder="Nhập ISBN" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Thể loại"
            rules={[{ required: true, message: 'Vui lòng chọn thể loại' }]}
          >
            <Select
              placeholder="Chọn thể loại"
              options={categories.map((category) => ({
                label: category.name,
                value: category.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="language"
            label="Ngôn ngữ"
            rules={[{ required: true, message: 'Vui lòng nhập ngôn ngữ' }]}
            initialValue="Tiếng Việt"
          >
            <Input placeholder="VD: Tiếng Việt, English" />
          </Form.Item>

          <Form.Item
            name="total_copies"
            label="Số lượng bản"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng bản' }]}
          >
            <Input type="number" min={1} placeholder="Nhập số lượng" />
          </Form.Item>

          <Form.Item name="publication_year" label="Năm xuất bản">
            <Input type="number" min={1900} max={new Date().getFullYear()} placeholder="VD: 2024" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về cuốn sách" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Books;