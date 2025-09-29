// =============================================
// USERS ROUTES
// =============================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, query, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireAdmin, requireLibrarian, requireOwnershipOrAdmin } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const userUpdateValidation = [
    body('full_name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Họ tên phải từ 2-100 ký tự'),
    body('phone')
        .optional()
        .isMobilePhone('vi-VN')
        .withMessage('Số điện thoại không hợp lệ'),
    body('address')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Địa chỉ không được quá 500 ký tự'),
    body('role')
        .optional()
        .isIn(['admin', 'librarian', 'member'])
        .withMessage('Vai trò không hợp lệ')
];

// GET /api/users - Lấy danh sách người dùng (chỉ admin/librarian)
router.get('/', requireLibrarian, [
    query('role').optional().isIn(['admin', 'librarian', 'member']).withMessage('Vai trò không hợp lệ'),
    query('page').optional().isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { role, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let result;
        if (role) {
            const sql = `
                SELECT id, username, email, full_name, phone, address, role, is_active, created_at 
                FROM users 
                WHERE role = ? AND is_active = 1 
                ORDER BY created_at DESC 
                LIMIT ? OFFSET ?
            `;
            result = await executeQuery(sql, [role, parseInt(limit), parseInt(offset)]);
        } else {
            result = await executeQuery(commonQueries.getAllUsers);
            // Paginate manually
            const startIndex = offset;
            const endIndex = offset + parseInt(limit);
            result.data = result.data.slice(startIndex, endIndex);
        }

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        // Get total count
        const countSql = role 
            ? 'SELECT COUNT(*) as total FROM users WHERE role = ? AND is_active = 1'
            : 'SELECT COUNT(*) as total FROM users WHERE is_active = 1';
        const countParams = role ? [role] : [];
        const countResult = await executeQuery(countSql, countParams);
        const totalCount = countResult.data[0].total;

        res.json({
            success: true,
            data: {
                users: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/users/:id - Lấy thông tin user theo ID
router.get('/:id', requireOwnershipOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(commonQueries.getUserById, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/users/:id - Cập nhật thông tin user
router.put('/:id', requireOwnershipOrAdmin, userUpdateValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { full_name, phone, address, role } = req.body;

        // Kiểm tra user có tồn tại không
        const existingUserResult = await executeQuery(commonQueries.getUserById, [id]);
        if (!existingUserResult.success || existingUserResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const existingUser = existingUserResult.data[0];

        // Chỉ admin mới có thể thay đổi role
        if (role && role !== existingUser.role && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ quản trị viên mới có thể thay đổi vai trò'
            });
        }

        // Cập nhật thông tin user
        const updateData = {
            full_name: full_name || existingUser.full_name,
            phone: phone || existingUser.phone,
            address: address || existingUser.address,
            role: (req.user.role === 'admin' && role) ? role : existingUser.role
        };

        const result = await executeQuery(commonQueries.updateUser, [
            updateData.full_name,
            updateData.phone,
            updateData.address,
            id
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật thông tin'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'UPDATE_USER', 'user', id, {
            updated_fields: Object.keys(updateData)
        }, req);

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/users/:id/change-password - Đổi mật khẩu
router.put('/:id/change-password', requireOwnershipOrAdmin, [
    body('current_password')
        .notEmpty()
        .withMessage('Mật khẩu hiện tại không được để trống'),
    body('new_password')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu mới phải ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { current_password, new_password } = req.body;

        // Lấy thông tin user với password hash
        const userResult = await executeQuery('SELECT password_hash FROM users WHERE id = ?', [id]);
        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Kiểm tra mật khẩu hiện tại (trừ khi admin đổi mật khẩu cho người khác)
        if (req.user.id.toString() === id) {
            const isCurrentPasswordValid = await bcrypt.compare(current_password, userResult.data[0].password_hash);
            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng'
                });
            }
        }

        // Hash mật khẩu mới
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

        // Cập nhật mật khẩu
        const result = await executeQuery('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newPasswordHash, id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật mật khẩu'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'CHANGE_PASSWORD', 'user', id, {}, req);

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/users/:id/toggle-status - Bật/tắt tài khoản (chỉ admin)
router.put('/:id/toggle-status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Không cho phép admin tự khóa tài khoản
        if (req.user.id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể khóa tài khoản của chính mình'
            });
        }

        // Lấy thông tin user
        const userResult = await executeQuery(commonQueries.getUserById, [id]);
        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const user = userResult.data[0];
        const newStatus = !user.is_active;

        // Cập nhật trạng thái
        const result = await executeQuery('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
            [newStatus, id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật trạng thái'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'TOGGLE_USER_STATUS', 'user', id, {
            new_status: newStatus ? 'active' : 'inactive',
            username: user.username
        }, req);

        res.json({
            success: true,
            message: `Tài khoản đã được ${newStatus ? 'kích hoạt' : 'khóa'}`
        });

    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;



