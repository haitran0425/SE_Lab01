// =============================================
// CẤU HÌNH KẾT NỐI DATABASE MYSQL
// Hệ thống Quản lý Thư viện - Node.js Backend
// =============================================

const mysql = require('mysql2/promise');

// Cấu hình database connection pool
const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_NAME || 'library_management_system',
    charset: 'utf8mb4',
    timezone: '+07:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true
};

// Tạo connection pool
const pool = mysql.createPool(dbConfig);

// Test kết nối database
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Kết nối database thành công!');
        console.log(`📊 Database: ${dbConfig.database}`);
        console.log(`🌐 Host: ${dbConfig.host}:${dbConfig.port}`);
        
        // Kiểm tra các bảng
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Số bảng trong database: ${tables.length}`);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối database:', error.message);
        return false;
    }
}

// Hàm thực thi query với error handling
async function executeQuery(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        return { success: true, data: results };
    } catch (error) {
        console.error('Database Error:', error.message);
        return { success: false, error: error.message };
    }
}

// Hàm thực thi transaction
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { sql, params = [] } of queries) {
            const [result] = await connection.execute(sql, params);
            results.push(result);
        }
        
        await connection.commit();
        return { success: true, data: results };
    } catch (error) {
        await connection.rollback();
        console.error('Transaction Error:', error.message);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

// Các query thường dùng
const commonQueries = {
    // Users
    getUserByUsername: 'SELECT * FROM users WHERE username = ? AND is_active = 1',
    getUserByEmail: 'SELECT * FROM users WHERE email = ? AND is_active = 1',
    getUserById: 'SELECT id, username, email, full_name, phone, address, role, is_active, created_at FROM users WHERE id = ? AND is_active = 1',
    createUser: 'INSERT INTO users (username, email, password_hash, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
    updateUser: 'UPDATE users SET full_name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    getAllUsers: 'SELECT id, username, email, full_name, phone, address, role, is_active, created_at FROM users ORDER BY created_at DESC',
    
    // Books
    searchBooks: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.is_active = 1 AND (b.title LIKE ? OR b.author LIKE ? OR c.name LIKE ?) LIMIT ? OFFSET ?',
    getBookById: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.id = ?',
    getAvailableBooks: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.available_copies > 0 AND b.is_active = 1',
    getAllBooks: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.is_active = 1 ORDER BY b.created_at DESC',
    updateBookAvailability: 'UPDATE books SET available_copies = ? WHERE id = ?',
    createBook: 'INSERT INTO books (isbn, title, author, publisher, publication_year, category_id, total_copies, available_copies, description, language, pages, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    updateBook: 'UPDATE books SET title = ?, author = ?, publisher = ?, publication_year = ?, category_id = ?, total_copies = ?, available_copies = ?, description = ?, language = ?, pages = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    deleteBook: 'UPDATE books SET is_active = 0 WHERE id = ?',
    
    // Categories
    getAllCategories: 'SELECT * FROM categories ORDER BY name',
    getCategoryById: 'SELECT * FROM categories WHERE id = ?',
    createCategory: 'INSERT INTO categories (name, description) VALUES (?, ?)',
    updateCategory: 'UPDATE categories SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    deleteCategory: 'DELETE FROM categories WHERE id = ?',
    
    // Borrows
    createBorrow: 'INSERT INTO borrows (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), "borrowed")',
    getBorrowsByUser: 'SELECT br.*, b.title, b.author, b.isbn, b.cover_image FROM borrows br JOIN books b ON br.book_id = b.id WHERE br.user_id = ? ORDER BY br.borrow_date DESC',
    getBorrowsByBook: 'SELECT br.*, u.full_name, u.email FROM borrows br JOIN users u ON br.user_id = u.id WHERE br.book_id = ? ORDER BY br.borrow_date DESC',
    getAllBorrows: 'SELECT br.*, u.full_name, u.email, b.title, b.author, b.isbn FROM borrows br JOIN users u ON br.user_id = u.id JOIN books b ON br.book_id = b.id ORDER BY br.borrow_date DESC',
    getOverdueBorrows: 'SELECT br.*, u.full_name, u.email, b.title FROM borrows br JOIN users u ON br.user_id = u.id JOIN books b ON br.book_id = b.id WHERE br.status = "borrowed" AND br.due_date < CURDATE()',
    returnBook: 'UPDATE borrows SET return_date = CURDATE(), status = "returned" WHERE id = ?',
    getBorrowById: 'SELECT br.*, u.full_name, u.email, b.title, b.author, b.isbn FROM borrows br JOIN users u ON br.user_id = u.id JOIN books b ON br.book_id = b.id WHERE br.id = ?',
    
    // Reservations
    createReservation: 'INSERT INTO reservations (user_id, book_id, expiry_date) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
    getReservationsByUser: 'SELECT r.*, b.title, b.author, b.isbn FROM reservations r JOIN books b ON r.book_id = b.id WHERE r.user_id = ? ORDER BY r.reservation_date DESC',
    getReservationsByBook: 'SELECT r.*, u.full_name, u.email FROM reservations r JOIN users u ON r.user_id = u.id WHERE r.book_id = ? ORDER BY r.priority ASC, r.reservation_date ASC',
    updateReservationStatus: 'UPDATE reservations SET status = ? WHERE id = ?',
    deleteReservation: 'DELETE FROM reservations WHERE id = ?',
    
    // Fines
    createFine: 'INSERT INTO fines (borrow_id, amount, reason, due_date) VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY))',
    getFinesByUser: 'SELECT f.*, br.borrow_date, br.due_date, b.title FROM fines f JOIN borrows br ON f.borrow_id = br.id JOIN books b ON br.book_id = b.id WHERE br.user_id = ? ORDER BY f.created_at DESC',
    getAllFines: 'SELECT f.*, br.borrow_date, br.due_date, b.title, u.full_name, u.email FROM fines f JOIN borrows br ON f.borrow_id = br.id JOIN books b ON br.book_id = b.id JOIN users u ON br.user_id = u.id ORDER BY f.created_at DESC',
    updateFineStatus: 'UPDATE fines SET status = ?, paid_date = ? WHERE id = ?',
    
    // Activity Logs
    createActivityLog: 'INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    getActivityLogs: 'SELECT al.*, u.username, u.full_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ? OFFSET ?',
    getActivityLogsByUser: 'SELECT al.*, u.username, u.full_name FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.user_id = ? ORDER BY al.created_at DESC LIMIT ? OFFSET ?',
    
    // Statistics
    getBorrowStatistics: 'SELECT * FROM borrow_statistics WHERE book_id = ?',
    getDetailedBorrows: 'SELECT * FROM detailed_borrows WHERE status = ? LIMIT ? OFFSET ?',
    getUserBorrowHistory: 'SELECT * FROM detailed_borrows WHERE borrower_name LIKE ? ORDER BY borrow_date DESC LIMIT ? OFFSET ?',
    getDashboardStats: `
        SELECT 
            (SELECT COUNT(*) FROM books WHERE is_active = 1) as total_books,
            (SELECT COUNT(*) FROM users WHERE is_active = 1 AND role = 'member') as total_members,
            (SELECT COUNT(*) FROM borrows WHERE status = 'borrowed') as current_borrows,
            (SELECT COUNT(*) FROM borrows WHERE status = 'overdue') as overdue_borrows,
            (SELECT COUNT(*) FROM fines WHERE status = 'pending') as pending_fines,
            (SELECT SUM(amount) FROM fines WHERE status = 'pending') as total_fine_amount
    `
};

module.exports = {
    pool,
    dbConfig,
    testConnection,
    executeQuery,
    executeTransaction,
    commonQueries
};
