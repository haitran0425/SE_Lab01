// =============================================
// AUTHENTICATION MIDDLEWARE
// =============================================

const jwt = require('jsonwebtoken');
const { executeQuery, commonQueries } = require('../config/database');

// Middleware xác thực JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token không được cung cấp'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
        
        // Lấy thông tin user từ database
        const result = await executeQuery(commonQueries.getUserById, [decoded.userId]);
        
        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc người dùng không tồn tại'
            });
        }

        const user = result.data[0];
        
        // Kiểm tra tài khoản có bị khóa không
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        // Thêm thông tin user vào request
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token đã hết hạn'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực'
        });
    }
};

// Middleware kiểm tra quyền admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ quản trị viên mới có quyền truy cập'
        });
    }
    next();
};

// Middleware kiểm tra quyền librarian hoặc admin
const requireLibrarian = (req, res, next) => {
    if (!['admin', 'librarian'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Chỉ thủ thư hoặc quản trị viên mới có quyền truy cập'
        });
    }
    next();
};

// Middleware kiểm tra quyền truy cập tài nguyên của user
const requireOwnershipOrAdmin = (req, res, next) => {
    const resourceUserId = parseInt(req.params.userId || req.body.userId);
    const currentUserId = req.user.id;
    
    if (req.user.role === 'admin' || currentUserId === resourceUserId) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể truy cập tài nguyên của chính mình'
        });
    }
};

// Middleware tùy chọn xác thực (không bắt buộc)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
            const result = await executeQuery(commonQueries.getUserById, [decoded.userId]);
            
            if (result.success && result.data.length > 0) {
                req.user = result.data[0];
            }
        }
        
        next();
    } catch (error) {
        // Nếu có lỗi, vẫn tiếp tục nhưng không có user info
        next();
    }
};

// Tạo JWT token
const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireLibrarian,
    requireOwnershipOrAdmin,
    optionalAuth,
    generateTokens,
    verifyRefreshToken
};
