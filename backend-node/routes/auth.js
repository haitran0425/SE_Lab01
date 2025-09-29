// =============================================
// AUTHENTICATION ROUTES
// =============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { generateTokens } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .withMessage('Tên đăng nhập phải từ 3-50 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới'),
    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu phải ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),
    body('full_name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải từ 2-100 ký tự'),
    body('role')
        .optional()
        .isIn(['admin', 'librarian', 'member'])
        .withMessage('Vai trò không hợp lệ')
];

const loginValidation = [
    body('username')
        .notEmpty()
        .withMessage('Tên đăng nhập không được để trống'),
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống')
];

// POST /api/auth/register - Đăng ký tài khoản mới
router.post('/register', registerValidation, async (req, res) => {
    try {
        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { username, email, password, full_name, phone, address, role } = req.body;

        // Kiểm tra username đã tồn tại
        const existingUserResult = await executeQuery(commonQueries.getUserByUsername, [username]);
        if (existingUserResult.success && existingUserResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Tên đăng nhập đã tồn tại'
            });
        }

        // Kiểm tra email đã tồn tại
        const existingEmailResult = await executeQuery(commonQueries.getUserByEmail, [email]);
        if (existingEmailResult.success && existingEmailResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Tạo user mới
        const userRole = role || 'member'; // Mặc định là member
        const result = await executeQuery(commonQueries.createUser, [
            username,
            email,
            password_hash,
            full_name,
            phone || null,
            address || null,
            userRole
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi tạo tài khoản'
            });
        }

        const userId = result.data.insertId;

        // Tạo tokens
        const { accessToken, refreshToken } = generateTokens({
            id: userId,
            username,
            role: userRole
        });

        // Ghi log activity
        await logManualActivity(userId, 'REGISTER', 'user', userId, {
            username,
            email,
            full_name,
            role: userRole
        }, req);

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: {
                user: {
                    id: userId,
                    username,
                    email,
                    full_name,
                    role: userRole
                },
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/auth/login - Đăng nhập
router.post('/login', loginValidation, async (req, res) => {
    try {
        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Tìm user
        const result = await executeQuery(commonQueries.getUserByUsername, [username]);
        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
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

        // Kiểm tra password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Tên đăng nhập hoặc mật khẩu không đúng'
            });
        }

        // Tạo tokens
        const { accessToken, refreshToken } = generateTokens(user);

        // Ghi log activity
        await logManualActivity(user.id, 'LOGIN', 'auth', user.id, {
            username: user.username,
            loginTime: new Date().toISOString()
        }, req);

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/auth/refresh - Làm mới token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token không được cung cấp'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
        
        // Lấy thông tin user
        const result = await executeQuery(commonQueries.getUserById, [decoded.userId]);
        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token không hợp lệ'
            });
        }

        const user = result.data[0];

        // Tạo tokens mới
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: 'Refresh token không hợp lệ'
        });
    }
});

// POST /api/auth/logout - Đăng xuất
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Ghi log activity nếu có user info
            const decoded = jwt.decode(token);
            if (decoded && decoded.userId) {
                await logManualActivity(decoded.userId, 'LOGOUT', 'auth', decoded.userId, {
                    logoutTime: new Date().toISOString()
                }, req);
            }
        }

        res.json({
            success: true,
            message: 'Đăng xuất thành công'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/auth/profile - Lấy thông tin profile (cần auth)
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token không được cung cấp'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_here');
        
        const result = await executeQuery(commonQueries.getUserById, [decoded.userId]);
        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        const user = result.data[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    phone: user.phone,
                    address: user.address,
                    role: user.role,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
    }
});

module.exports = router;



