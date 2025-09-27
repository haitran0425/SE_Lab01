// =============================================
// HỆ THỐNG QUẢN LÝ THƯ VIỆN - NODE.JS BACKEND
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookRoutes = require('./routes/books');
const borrowRoutes = require('./routes/borrows');
const categoryRoutes = require('./routes/categories');
const reservationRoutes = require('./routes/reservations');
const fineRoutes = require('./routes/fines');
const activityRoutes = require('./routes/activity');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { logActivity } = require('./middleware/activityLogger');

// Import database
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================
// MIDDLEWARE SETUP
// =============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Activity logging middleware
app.use(logActivity);

// =============================================
// ROUTES SETUP
// =============================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Library Management System API đang hoạt động',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/borrows', authenticateToken, borrowRoutes);
app.use('/api/reservations', authenticateToken, reservationRoutes);
app.use('/api/fines', authenticateToken, fineRoutes);
app.use('/api/activity', authenticateToken, activityRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Chào mừng đến với Library Management System API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            users: '/api/users',
            books: '/api/books',
            categories: '/api/categories',
            borrows: '/api/borrows',
            reservations: '/api/reservations',
            fines: '/api/fines',
            activity: '/api/activity',
            dashboard: '/api/dashboard'
        },
        documentation: 'https://github.com/library-system/docs'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint không tìm thấy',
        message: `Không tìm thấy ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/books',
            'GET /api/categories'
        ]
    });
});

// Error handling middleware
app.use(errorHandler);

// =============================================
// SERVER STARTUP
// =============================================

async function startServer() {
    try {
        // Test database connection
        console.log('🔄 Đang kiểm tra kết nối database...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.error('❌ Không thể kết nối database. Server sẽ không khởi động.');
            process.exit(1);
        }
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Library Management System API đã khởi động!');
            console.log(`📡 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Database: ${process.env.DB_NAME || 'library_management_system'}`);
            console.log('📋 Available endpoints:');
            console.log('   - GET  /health');
            console.log('   - POST /api/auth/login');
            console.log('   - POST /api/auth/register');
            console.log('   - GET  /api/books');
            console.log('   - GET  /api/categories');
            console.log('   - GET  /api/dashboard (requires auth)');
            console.log('=============================================');
        });
        
    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Nhận tín hiệu SIGTERM. Đang tắt server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Nhận tín hiệu SIGINT. Đang tắt server...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
