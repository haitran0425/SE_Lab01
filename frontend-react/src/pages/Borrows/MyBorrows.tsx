import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const MyBorrows: React.FC = () => {
  return (
    <div>
      <Title level={2}>Sách đã mượn</Title>
      <p>Trang sách đã mượn đang được phát triển...</p>
    </div>
  );
};

export default MyBorrows;
