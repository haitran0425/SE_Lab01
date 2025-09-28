import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  List,
  Progress,
  Tag,
  Table,
  Space,
  Empty,
  Spin,
} from 'antd';
import {
  BookOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { dashboardService } from '../../services/dashboardService';
import type {
  ActivityLog,
  CategoryStat,
  DashboardStats,
  MonthlyBorrow,
  OverdueReport,
  RoleStat,
  TopBook,
  TopUser,
} from '../../types';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<DashboardStats | null>(null);
  const [monthlyBorrows, setMonthlyBorrows] = useState<MonthlyBorrow[]>([]);
  const [topBooks, setTopBooks] = useState<TopBook[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [overdueReport, setOverdueReport] = useState<OverdueReport | null>(null);
  const [roleStats, setRoleStats] = useState<RoleStat[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [{ overview, monthlyBorrows, topBooks, categoryStats }, recentActivityData, overdueData, userStats] = await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getRecentActivity(10),
          dashboardService.getOverdueReport(),
          dashboardService.getUserStats(),
        ]);

        setOverview(overview);
        setMonthlyBorrows(monthlyBorrows);
        setTopBooks(topBooks);
        setCategoryStats(categoryStats);
        setRecentActivity(recentActivityData);
        setOverdueReport(overdueData);
        setRoleStats(userStats.roleStats);
        setTopUsers(userStats.topUsers);
      } catch (error: any) {
        console.error('Fetch dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const renderRoleSummary = () => {
    if (!roleStats.length) return <Empty description="Không có dữ liệu người dùng" />;
    const total = roleStats.reduce((sum, stat) => sum + stat.count, 0);
    return (
      <List
        dataSource={roleStats}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={item.role}
              description={`${item.count} người dùng`}
            />
            <Progress percent={total ? Math.round((item.count / total) * 100) : 0} strokeColor="#1890ff" />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div>
      <Title level={2}>Dashboard tổng quan</Title>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Tổng số sách"
                  value={overview?.total_books ?? 0}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Thành viên"
                  value={overview?.total_members ?? 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Đang mượn"
                  value={overview?.current_borrows ?? 0}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Phạt chờ xử lý"
                  value={overview?.pending_fines ?? 0}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Xu hướng mượn sách theo tháng">
                {monthlyBorrows.length ? (
                  <List
                    dataSource={monthlyBorrows}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta title={item.month} />
                        <Progress
                          percent={Math.min(100, Math.round((item.borrow_count / Math.max(...monthlyBorrows.map((m) => m.borrow_count || 1))) * 100))}
                          format={() => `${item.borrow_count} lượt`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Chưa có dữ liệu" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Top sách được mượn nhiều">
                {topBooks.length ? (
                  <List
                    dataSource={topBooks}
                    renderItem={(item, index) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color="blue">#{index + 1}</Tag>
                              <Text strong>{item.title}</Text>
                            </Space>
                          }
                          description={`Tác giả: ${item.author}`}
                        />
                        <Tag color="gold">{item.borrow_count} lượt</Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Chưa có dữ liệu" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Tình trạng quá hạn" extra={overdueReport ? `Tổng: ${overdueReport.stats.total}` : undefined}>
                {overdueReport ? (
                  <List
                    dataSource={Object.entries(overdueReport.stats.byDays)}
                    renderItem={([label, value]) => (
                      <List.Item>
                        <List.Item.Meta title={`Quá hạn ${label} ngày`} />
                        <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Không có dữ liệu quá hạn" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Thống kê người dùng">{renderRoleSummary()}</Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="Top bạn đọc mượn sách">
                {topUsers.length ? (
                  <List
                    dataSource={topUsers}
                    renderItem={(item, index) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color="purple">#{index + 1}</Tag>
                              <Text strong>{item.full_name}</Text>
                            </Space>
                          }
                          description={item.email}
                        />
                        <Tag color="green">{item.borrow_count} lượt</Tag>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Không có dữ liệu" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Hoạt động gần đây">
                {recentActivity.length ? (
                  <List
                    dataSource={recentActivity}
                    renderItem={(item) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Space>
                              <Tag color="blue">{item.action}</Tag>
                              <Text>{item.entity_type}</Text>
                            </Space>
                          }
                          description={`${item.full_name || 'Hệ thống'} • ${new Date(item.created_at).toLocaleString('vi-VN')}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Không có hoạt động" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="Tồn kho theo thể loại">
                <Table<CategoryStat>
                  rowKey="category_name"
                  dataSource={categoryStats}
                  pagination={false}
                  locale={{ emptyText: <Empty description="Không có dữ liệu" /> }}
                  columns={[
                    { title: 'Thể loại', dataIndex: 'category_name', key: 'category_name' },
                    { title: 'Số sách', dataIndex: 'book_count', key: 'book_count' },
                    { title: 'Tổng bản sao', dataIndex: 'total_copies', key: 'total_copies' },
                    { title: 'Có sẵn', dataIndex: 'available_copies', key: 'available_copies' },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;
