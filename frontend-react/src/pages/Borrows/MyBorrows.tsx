import React from 'react';
import BorrowPage from './Borrows';

const MyBorrows: React.FC = () => {
  return <BorrowPage defaultTab="member" hideAdminTab />;
};

export default MyBorrows;
