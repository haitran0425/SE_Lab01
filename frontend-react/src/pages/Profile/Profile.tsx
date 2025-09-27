import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const Profile: React.FC = () => {
  return (
    <div>
      <Title level={2}>Thông tin cá nhân</Title>
      <p>Trang thông tin cá nhân đang được phát triển...</p>
    </div>
  );
};

export default Profile;
