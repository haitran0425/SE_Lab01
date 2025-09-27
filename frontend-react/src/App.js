import React from 'react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

const App = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <Title level={1} style={{ color: '#1890ff', marginBottom: '16px' }}>
          📚 Hệ thống Quản lý Thư viện
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          Ứng dụng đang được phát triển...
        </Paragraph>
        <Paragraph style={{ fontSize: '14px', color: '#999' }}>
          Vui lòng đợi trong giây lát để hoàn thiện các tính năng.
        </Paragraph>
      </div>
    </div>
  );
};

export default App;
