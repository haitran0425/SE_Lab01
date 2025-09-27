import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const AddBook: React.FC = () => {
  return (
    <div>
      <Title level={2}>Thêm sách mới</Title>
      <p>Trang thêm sách đang được phát triển...</p>
    </div>
  );
};

export default AddBook;
