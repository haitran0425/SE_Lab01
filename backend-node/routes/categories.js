// =============================================
// CATEGORIES ROUTES
// =============================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const categoryValidation = [
    body('name')
        .notEmpty()
        .withMessage('Tên thể loại không được để trống')
        .isLength({ min: 2, max: 100 })
        .withMessage('Tên thể loại phải từ 2-100 ký tự'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Mô tả không được quá 500 ký tự')
];

// GET /api/categories - Lấy danh sách thể loại
router.get('/', async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getAllCategories);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/categories/:id - Lấy thông tin thể loại theo ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(commonQueries.getCategoryById, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Get category by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/categories - Tạo thể loại mới (chỉ librarian/admin)
router.post('/', requireLibrarian, categoryValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { name, description } = req.body;

        // Kiểm tra tên thể loại đã tồn tại
        const existingCategoryResult = await executeQuery('SELECT id FROM categories WHERE name = ?', [name]);
        if (existingCategoryResult.success && existingCategoryResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Tên thể loại đã tồn tại'
            });
        }

        // Tạo thể loại mới
        const result = await executeQuery(commonQueries.createCategory, [name, description || null]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi tạo thể loại'
            });
        }

        const categoryId = result.data.insertId;

        // Ghi log activity
        await logManualActivity(req.user.id, 'CREATE_CATEGORY', 'category', categoryId, {
            name, description
        }, req);

        res.status(201).json({
            success: true,
            message: 'Tạo thể loại thành công',
            data: {
                categoryId,
                name,
                description
            }
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/categories/:id - Cập nhật thể loại (chỉ librarian/admin)
router.put('/:id', requireLibrarian, categoryValidation, async (req, res) => {
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
        const { name, description } = req.body;

        // Kiểm tra thể loại có tồn tại không
        const existingCategoryResult = await executeQuery(commonQueries.getCategoryById, [id]);
        if (!existingCategoryResult.success || existingCategoryResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thể loại'
            });
        }

        // Kiểm tra tên thể loại đã tồn tại (trừ chính nó)
        const duplicateResult = await executeQuery('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
        if (duplicateResult.success && duplicateResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Tên thể loại đã tồn tại'
            });
        }

        // Cập nhật thể loại
        const result = await executeQuery(commonQueries.updateCategory, [name, description || null, id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật thể loại'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'UPDATE_CATEGORY', 'category', id, {
            name, description
        }, req);

        res.json({
            success: true,
            message: 'Cập nhật thể loại thành công'
        });

    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// DELETE /api/categories/:id - Xóa thể loại (chỉ librarian/admin)
router.delete('/:id', requireLibrarian, async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra thể loại có tồn tại không
        const existingCategoryResult = await executeQuery(commonQueries.getCategoryById, [id]);
        if (!existingCategoryResult.success || existingCategoryResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thể loại'
            });
        }

        const category = existingCategoryResult.data[0];

        // Kiểm tra có sách nào đang sử dụng thể loại này không
        const booksResult = await executeQuery('SELECT COUNT(*) as count FROM books WHERE category_id = ? AND is_active = 1', [id]);
        if (booksResult.success && booksResult.data[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa thể loại đang có sách sử dụng'
            });
        }

        // Xóa thể loại
        const result = await executeQuery(commonQueries.deleteCategory, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi xóa thể loại'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'DELETE_CATEGORY', 'category', id, {
            name: category.name
        }, req);

        res.json({
            success: true,
            message: 'Xóa thể loại thành công'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;
