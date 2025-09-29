import React from 'react';
import BorrowPage from './Borrows.tsx';

const MyBorrows: React.FC = () => {
  return <BorrowPage defaultTab="member" hideAdminTab />;
};

export default MyBorrows;