// =============================================
// CẤU HÌNH KẾT NỐI DATABASE MYSQL
// Hệ thống Quản lý Thư viện
// =============================================

const mysql = require('mysql2/promise');

// Cấu hình database connection pool
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'library_management_system',
    charset: 'utf8mb4',
    timezone: '+07:00', // Timezone Việt Nam
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    connectionLimit: 10,
    queueLimit: 0
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
    createUser: 'INSERT INTO users (username, email, password_hash, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
    updateUser: 'UPDATE users SET full_name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    
    // Books
    searchBooks: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.is_active = 1 AND (b.title LIKE ? OR b.author LIKE ? OR c.name LIKE ?) LIMIT ? OFFSET ?',
    getBookById: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.id = ?',
    getAvailableBooks: 'SELECT b.*, c.name as category_name FROM books b JOIN categories c ON b.category_id = c.id WHERE b.available_copies > 0 AND b.is_active = 1',
    updateBookAvailability: 'UPDATE books SET available_copies = ? WHERE id = ?',
    
    // Borrows
    createBorrow: 'INSERT INTO borrows (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), "borrowed")',
    getBorrowsByUser: 'SELECT br.*, b.title, b.author, b.isbn FROM borrows br JOIN books b ON br.book_id = b.id WHERE br.user_id = ? ORDER BY br.borrow_date DESC',
    getOverdueBorrows: 'SELECT br.*, u.full_name, u.email, b.title FROM borrows br JOIN users u ON br.user_id = u.id JOIN books b ON br.book_id = b.id WHERE br.status = "borrowed" AND br.due_date < CURDATE()',
    returnBook: 'UPDATE borrows SET return_date = CURDATE(), status = "returned" WHERE id = ?',
    
    // Statistics
    getBorrowStatistics: 'SELECT * FROM borrow_statistics WHERE book_id = ?',
    getDetailedBorrows: 'SELECT * FROM detailed_borrows WHERE status = ? LIMIT ? OFFSET ?',
    getUserBorrowHistory: 'SELECT * FROM detailed_borrows WHERE borrower_name LIKE ? ORDER BY borrow_date DESC LIMIT ? OFFSET ?'
};

// Export các hàm và cấu hình
module.exports = {
    pool,
    dbConfig,
    testConnection,
    executeQuery,
    executeTransaction,
    commonQueries
};

// =============================================
// ENVIRONMENT VARIABLES MẪU (.env)
// =============================================
/*
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=library_management_system
DB_CHARSET=utf8mb4
DB_TIMEZONE=+07:00
*/

// =============================================
// HƯỚNG DẪN SỬ DỤNG
// =============================================
/*
1. Cài đặt dependencies:
   npm install mysql2 dotenv

2. Tạo file .env với thông tin database

3. Import và sử dụng:
   const { testConnection, executeQuery, commonQueries } = require('./database_config');
   
   // Test kết nối
   await testConnection();
   
   // Thực thi query
   const result = await executeQuery(commonQueries.getUserByUsername, ['admin']);
   
   // Sử dụng trong API routes
   app.get('/api/books', async (req, res) => {
       const result = await executeQuery(commonQueries.searchBooks, ['%keyword%', '%keyword%', '%keyword%', 10, 0]);
       res.json(result);
   });
*/

