import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const Books: React.FC = () => {
  return (
    <div>
      <Title level={2}>Quản lý sách</Title>
      <p>Trang quản lý sách đang được phát triển...</p>
    </div>
  );
};

export default Books;
