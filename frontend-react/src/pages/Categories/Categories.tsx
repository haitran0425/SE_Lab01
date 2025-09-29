import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Table, Typography, message, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined } from '@ant-design/icons';
import { categoryService } from '../../services/categoryService.ts';
import { Category } from '../../types';
import { useAuth } from '../../contexts/AuthContext.tsx';

const { Title, Text } = Typography;

const Categories: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const isManager = useMemo(() => ['admin', 'librarian'].includes(user?.role ?? ''), [user?.role]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Fetch categories error:', error);
      message.error(error.response?.data?.message || 'Không thể tải danh sách thể loại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setSelectedCategory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record: Category) => {
    setSelectedCategory(record);
    form.setFieldsValue({ name: record.name, description: record.description });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedCategory) {
        const response = await categoryService.updateCategory(selectedCategory.id, values);
        if (response.success) {
          message.success('Cập nhật thể loại thành công');
        } else {
          message.error(response.message || 'Không thể cập nhật thể loại');
        }
      } else {
        const response = await categoryService.createCategory(values);
        if (response.success) {
          message.success('Thêm thể loại mới thành công');
        } else {
          message.error(response.message || 'Không thể thêm thể loại');
        }
      }

      setModalVisible(false);
      fetchCategories();
    } catch (error: any) {
      if (!error?.errorFields) {
        console.error('Save category error:', error);
        message.error(error.response?.data?.message || 'Không thể lưu thể loại');
      }
    }
  };

  const handleDelete = async (record: Category) => {
    Modal.confirm({
      title: 'Xác nhận xoá thể loại',
      content: `Bạn có chắc chắn muốn xoá thể loại "${record.name}"?`,
      okText: 'Xoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          const response = await categoryService.deleteCategory(record.id);
          if (response.success) {
            message.success('Đã xoá thể loại thành công');
            fetchCategories();
          } else {
            message.error(response.message || 'Không thể xoá thể loại');
          }
        } catch (error: any) {
          console.error('Delete category error:', error);
          message.error(error.response?.data?.message || 'Không thể xoá thể loại');
        }
      },
    });
  };

  const columns: ColumnsType<Category> = [
    {
      title: 'Tên thể loại',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value?: string) => value || '—',
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
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
            Quản lý thể loại
          </Title>
          <Text type="secondary">Tạo mới, chỉnh sửa và quản lý danh sách thể loại sách</Text>
        </div>
        {isManager && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm thể loại
          </Button>
        )}
      </Space>

      <Table<Category>
        loading={loading}
        columns={columns}
        dataSource={categories}
        rowKey="id"
        pagination={false}
        locale={{
          emptyText: loading ? <></> : <Empty description="Chưa có thể loại" />,
        }}
      />

      <Modal
        title={selectedCategory ? 'Chỉnh sửa thể loại' : 'Thêm thể loại'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="Lưu"
        cancelText="Huỷ"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="Tên thể loại"
            rules={[{ required: true, message: 'Vui lòng nhập tên thể loại' }]}
          >
            <Input placeholder="Nhập tên thể loại" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn cho thể loại" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categories;
