import React, { useMemo } from 'react';
import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  TeamOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Sider } = Layout;

interface AppSiderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const AppSider: React.FC<AppSiderProps> = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  type RoleAwareMenuItem = (MenuProps['items'][number] & { roles?: string[]; children?: RoleAwareMenuItem[] });

  const filteredMenuItems = useMemo<MenuProps['items']>(() => {
    const items: RoleAwareMenuItem[] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
      },
      {
        key: '/books',
        icon: <BookOutlined />,
        label: 'Quản lý sách',
      },
      {
        key: '/categories',
        icon: <FileTextOutlined />,
        label: 'Thể loại sách',
        roles: ['admin', 'librarian'],
      },
      {
        key: 'borrows',
        icon: <CalendarOutlined />,
        label: 'Mượn sách',
        children: [
          {
            key: '/my-borrows',
            label: 'Sách đã mượn',
          },
          {
            key: '/borrows',
            label: 'Quản lý mượn sách',
            roles: ['admin', 'librarian'],
          },
        ],
      },
      {
        key: '/reservations',
        icon: <CalendarOutlined />,
        label: 'Đặt trước sách',
      },
      {
        key: '/fines',
        icon: <DollarOutlined />,
        label: 'Quản lý phạt',
      },
      {
        key: '/users',
        icon: <TeamOutlined />,
        label: 'Quản lý người dùng',
        roles: ['admin', 'librarian'],
      },
      {
        key: '/activity',
        icon: <HistoryOutlined />,
        label: 'Nhật ký hoạt động',
        roles: ['admin', 'librarian'],
      },
    ];

    const sanitized = items
      .filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(user?.role || '');
      })
      .map((item) => {
        if (item.children) {
          return {
            ...item,
            children: item.children.filter((child) => {
              if (!child.roles) return true;
              return child.roles.includes(user?.role || '');
            }),
          };
        }
        return item;
      });

    return sanitized as MenuProps['items'];
  }, [user?.role]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={250}
      style={{ background: '#fff' }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={filteredMenuItems}
        onClick={handleMenuClick}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};

export default AppSider;
