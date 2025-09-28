-- =============================================
-- SCRIPT KHỞI TẠO DATABASE CHO HỆ THỐNG THƯ VIỆN
-- =============================================

-- Tạo database mới
DROP DATABASE IF EXISTS library_management_system;
CREATE DATABASE library_management_system 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Sử dụng database
USE library_management_system;

-- Tạo user cho ứng dụng (tùy chọn)
-- CREATE USER 'library_user'@'localhost' IDENTIFIED BY 'library_password123';
-- GRANT ALL PRIVILEGES ON library_management_system.* TO 'library_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Chạy script thiết kế database
SOURCE database_design.sql;

-- Hiển thị thông tin database đã tạo
SELECT 'Database library_management_system đã được tạo thành công!' as Status;

-- Kiểm tra các bảng đã tạo
SHOW TABLES;

-- Kiểm tra dữ liệu mẫu
SELECT 'Categories:' as Table_Name, COUNT(*) as Record_Count FROM categories
UNION ALL
SELECT 'Users:', COUNT(*) FROM users
UNION ALL  
SELECT 'Books:', COUNT(*) FROM books;

