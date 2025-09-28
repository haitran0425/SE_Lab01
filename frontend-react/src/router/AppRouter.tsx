import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';
import Dashboard from '../pages/Dashboard/Dashboard';
import Books from '../pages/Books/Books';
import AddBook from '../pages/Books/AddBook';
import EditBook from '../pages/Books/EditBook';
import BookDetail from '../pages/Books/BookDetail';
import Categories from '../pages/Categories/Categories';
import Borrows from '../pages/Borrows/Borrows';
import MyBorrows from '../pages/Borrows/MyBorrows';
import Reservations from '../pages/Reservations/Reservations';
import Fines from '../pages/Fines/Fines';
import Users from '../pages/Users/Users';
import ActivityLogs from '../pages/Activity/ActivityLogs';
import Profile from '../pages/Profile/Profile';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={(
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/new" element={<AddBook />} />
        <Route path="/books/:id" element={<BookDetail />} />
        <Route path="/books/:id/edit" element={<EditBook />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/borrows" element={<Borrows />} />
        <Route path="/my-borrows" element={<MyBorrows />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/fines" element={<Fines />} />
        <Route path="/users" element={<Users />} />
        <Route path="/activity" element={<ActivityLogs />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;
