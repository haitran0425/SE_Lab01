-- =============================================
-- HỆ THỐNG QUẢN LÝ THƯ VIỆN TRỰC TUYẾN
-- Database Design - MySQL
-- =============================================

-- Tạo database
CREATE DATABASE IF NOT EXISTS library_management_system;
USE library_management_system;

-- =============================================
-- 1. BẢNG NGƯỜI DÙNG (USERS)
-- =============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role ENUM('admin', 'librarian', 'member') DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- 2. BẢNG THỂ LOẠI SÁCH (CATEGORIES)
-- =============================================
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- 3. BẢNG SÁCH (BOOKS)
-- =============================================
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    publisher VARCHAR(255),
    publication_year INT,
    category_id INT NOT NULL,
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    description TEXT,
    cover_image VARCHAR(500),
    language VARCHAR(50) DEFAULT 'Vietnamese',
    pages INT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    INDEX idx_title (title),
    INDEX idx_author (author),
    INDEX idx_isbn (isbn)
);

-- =============================================
-- 4. BẢNG MƯỢN SÁCH (BORROWS)
-- =============================================
CREATE TABLE borrows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    status ENUM('borrowed', 'returned', 'overdue', 'lost') DEFAULT 'borrowed',
    fine_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_user_borrow (user_id, status),
    INDEX idx_book_borrow (book_id, status),
    INDEX idx_due_date (due_date)
);

-- =============================================
-- 5. BẢNG LỊCH SỬ HOẠT ĐỘNG (ACTIVITY_LOGS)
-- =============================================
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_action (user_id, action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- =============================================
-- 6. BẢNG PHẠT (FINES)
-- =============================================
CREATE TABLE fines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    borrow_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'paid', 'waived') DEFAULT 'pending',
    due_date DATE,
    paid_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (borrow_id) REFERENCES borrows(id) ON DELETE CASCADE,
    INDEX idx_borrow_fine (borrow_id),
    INDEX idx_status (status)
);

-- =============================================
-- 7. BẢNG RESERVATION (ĐẶT TRƯỚC SÁCH)
-- =============================================
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP NOT NULL,
    status ENUM('active', 'fulfilled', 'expired', 'cancelled') DEFAULT 'active',
    priority INT DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_user_reservation (user_id, status),
    INDEX idx_book_reservation (book_id, status),
    INDEX idx_expiry_date (expiry_date)
);

-- =============================================
-- INSERT DỮ LIỆU MẪU
-- =============================================

-- Thêm thể loại sách mẫu
INSERT INTO categories (name, description) VALUES
('Khoa học kỹ thuật', 'Sách về khoa học, công nghệ và kỹ thuật'),
('Văn học', 'Tác phẩm văn học trong và ngoài nước'),
('Lịch sử', 'Sách về lịch sử Việt Nam và thế giới'),
('Kinh tế', 'Sách về kinh tế học và quản lý'),
('Y học', 'Sách về y học và sức khỏe'),
('Ngoại ngữ', 'Sách học tiếng Anh, tiếng Nhật, tiếng Trung');

-- Thêm admin mặc định
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@library.com', '$2b$10$rOzJ8Q8Z8Q8Z8Q8Z8Q8Z8O', 'Quản trị viên hệ thống', 'admin');

-- Thêm sách mẫu
INSERT INTO books (isbn, title, author, publisher, publication_year, category_id, total_copies, available_copies, description, pages, price) VALUES
('978-604-1-00123-4', 'Clean Code', 'Robert C. Martin', 'Nhà xuất bản Thế giới', 2020, 1, 5, 5, 'Cuốn sách về cách viết code sạch và dễ đọc', 464, 350000),
('978-604-1-00124-5', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Nhà xuất bản Văn học', 2019, 2, 3, 3, 'Tác phẩm kinh điển của văn học Mỹ', 180, 120000),
('978-604-1-00125-6', 'Lịch sử Việt Nam', 'Phan Huy Lê', 'Nhà xuất bản Giáo dục', 2021, 3, 2, 2, 'Lịch sử Việt Nam từ thời cổ đại đến hiện đại', 800, 450000),
('978-604-1-00126-7', 'Tài chính doanh nghiệp', 'Nguyễn Văn Nam', 'Nhà xuất bản Kinh tế', 2022, 4, 4, 4, 'Giáo trình tài chính doanh nghiệp', 600, 280000),
('978-604-1-00127-8', 'Sức khỏe toàn diện', 'BS. Nguyễn Thị Hoa', 'Nhà xuất bản Y học', 2023, 5, 3, 3, 'Hướng dẫn chăm sóc sức khỏe', 400, 200000);

-- =============================================
-- CÁC TRIGGER VÀ STORED PROCEDURES
-- =============================================

-- Trigger cập nhật available_copies khi có mượn sách
DELIMITER $$
CREATE TRIGGER after_borrow_insert
AFTER INSERT ON borrows
FOR EACH ROW
BEGIN
    UPDATE books 
    SET available_copies = available_copies - 1 
    WHERE id = NEW.book_id;
END$$

-- Trigger cập nhật available_copies khi trả sách
CREATE TRIGGER after_borrow_update
AFTER UPDATE ON borrows
FOR EACH ROW
BEGIN
    IF OLD.status = 'borrowed' AND NEW.status = 'returned' THEN
        UPDATE books 
        SET available_copies = available_copies + 1 
        WHERE id = NEW.book_id;
    END IF;
END$$
DELIMITER ;

-- Stored procedure để tính phạt quá hạn
DELIMITER $$
CREATE PROCEDURE CalculateOverdueFines()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_borrow_id INT;
    DECLARE v_user_id INT;
    DECLARE v_due_date DATE;
    DECLARE v_fine_per_day DECIMAL(10,2) DEFAULT 5000; -- 5000 VND per day
    
    DECLARE overdue_cursor CURSOR FOR
        SELECT id, user_id, due_date
        FROM borrows 
        WHERE status = 'borrowed' AND due_date < CURDATE();
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN overdue_cursor;
    
    read_loop: LOOP
        FETCH overdue_cursor INTO v_borrow_id, v_user_id, v_due_date;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Cập nhật trạng thái thành overdue
        UPDATE borrows 
        SET status = 'overdue' 
        WHERE id = v_borrow_id;
        
        -- Tính và tạo phạt
        INSERT INTO fines (borrow_id, amount, reason, due_date)
        VALUES (v_borrow_id, 
                DATEDIFF(CURDATE(), v_due_date) * v_fine_per_day,
                CONCAT('Phạt quá hạn ', DATEDIFF(CURDATE(), v_due_date), ' ngày'),
                DATE_ADD(CURDATE(), INTERVAL 30 DAY));
    END LOOP;
    
    CLOSE overdue_cursor;
END$$
DELIMITER ;

-- =============================================
-- VIEWS HỮU ÍCH
-- =============================================

-- View thống kê mượn sách
CREATE VIEW borrow_statistics AS
SELECT 
    b.id as book_id,
    b.title,
    b.author,
    COUNT(br.id) as total_borrows,
    COUNT(CASE WHEN br.status = 'borrowed' THEN 1 END) as current_borrows,
    COUNT(CASE WHEN br.status = 'returned' THEN 1 END) as returned_count,
    COUNT(CASE WHEN br.status = 'overdue' THEN 1 END) as overdue_count
FROM books b
LEFT JOIN borrows br ON b.id = br.book_id
GROUP BY b.id, b.title, b.author;

-- View thông tin mượn sách chi tiết
CREATE VIEW detailed_borrows AS
SELECT 
    br.id as borrow_id,
    u.full_name as borrower_name,
    u.email as borrower_email,
    b.title as book_title,
    b.author as book_author,
    b.isbn,
    br.borrow_date,
    br.due_date,
    br.return_date,
    br.status,
    CASE 
        WHEN br.status = 'overdue' THEN DATEDIFF(CURDATE(), br.due_date)
        ELSE NULL
    END as days_overdue,
    br.fine_amount
FROM borrows br
JOIN users u ON br.user_id = u.id
JOIN books b ON br.book_id = b.id;

-- =============================================
-- INDEXES BỔ SUNG CHO PERFORMANCE
-- =============================================

CREATE INDEX idx_books_search ON books(title, author, category_id);
CREATE INDEX idx_borrows_dates ON borrows(borrow_date, due_date, return_date);
CREATE INDEX idx_users_role ON users(role, is_active);
CREATE INDEX idx_activity_logs_date ON activity_logs(created_at DESC);

