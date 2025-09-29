import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/Auth/ProtectedRoute.tsx';
import MainLayout from '../components/Layout/MainLayout.tsx';
import Dashboard from '../pages/Dashboard/Dashboard.tsx';
import Books from '../pages/Books/Books.tsx';
import AddBook from '../pages/Books/AddBook.tsx';
import EditBook from '../pages/Books/EditBook.tsx';
import BookDetail from '../pages/Books/BookDetail.tsx';
import Categories from '../pages/Categories/Categories.tsx';
import Borrows from '../pages/Borrows/Borrows.tsx';
import MyBorrows from '../pages/Borrows/MyBorrows.tsx';
import Reservations from '../pages/Reservations/Reservations.tsx';
import Fines from '../pages/Fines/Fines.tsx';
import Users from '../pages/Users/Users.tsx';
import ActivityLogs from '../pages/Activity/ActivityLogs.tsx';
import Profile from '../pages/Profile/Profile.tsx';
import Login from '../pages/Auth/Login.tsx';
import Register from '../pages/Auth/Register.tsx';

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