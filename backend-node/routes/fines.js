// =============================================
// FINES ROUTES
// =============================================

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const fineValidation = [
    body('borrow_id')
        .isInt({ min: 1 })
        .withMessage('ID mượn sách không hợp lệ'),
    body('amount')
        .isFloat({ min: 0 })
        .withMessage('Số tiền phạt phải là số dương'),
    body('reason')
        .notEmpty()
        .withMessage('Lý do phạt không được để trống')
        .isLength({ max: 255 })
        .withMessage('Lý do phạt không được quá 255 ký tự')
];

// GET /api/fines - Lấy danh sách phạt (chỉ librarian/admin)
router.get('/', requireLibrarian, [
    query('status').optional().isIn(['pending', 'paid', 'waived']).withMessage('Trạng thái không hợp lệ'),
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

        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let result;
        if (status) {
            const sql = `
                SELECT 
                    f.*,
                    br.borrow_date,
                    br.due_date,
                    br.return_date,
                    b.title,
                    u.full_name,
                    u.email
                FROM fines f
                JOIN borrows br ON f.borrow_id = br.id
                JOIN books b ON br.book_id = b.id
                JOIN users u ON br.user_id = u.id
                WHERE f.status = ?
                ORDER BY f.created_at DESC
                LIMIT ? OFFSET ?
            `;
            result = await executeQuery(sql, [status, parseInt(limit), parseInt(offset)]);
        } else {
            result = await executeQuery(commonQueries.getAllFines);
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
        const countSql = status 
            ? 'SELECT COUNT(*) as total FROM fines WHERE status = ?'
            : 'SELECT COUNT(*) as total FROM fines';
        const countParams = status ? [status] : [];
        const countResult = await executeQuery(countSql, countParams);
        const totalCount = countResult.data[0].total;

        res.json({
            success: true,
            data: {
                fines: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get fines error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/fines/my - Lấy danh sách phạt của user hiện tại
router.get('/my', async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getFinesByUser, [req.user.id]);

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
        console.error('Get my fines error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/fines - Tạo phạt mới (chỉ librarian/admin)
router.post('/', requireLibrarian, fineValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { borrow_id, amount, reason } = req.body;

        // Kiểm tra borrow có tồn tại không
        const borrowResult = await executeQuery(commonQueries.getBorrowById, [borrow_id]);
        if (!borrowResult.success || borrowResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin mượn sách'
            });
        }

        // Kiểm tra đã có phạt cho borrow này chưa
        const existingFineResult = await executeQuery(
            'SELECT id FROM fines WHERE borrow_id = ? AND status = "pending"',
            [borrow_id]
        );
        if (existingFineResult.success && existingFineResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Đã có phạt cho lần mượn này'
            });
        }

        // Tạo phạt
        const result = await executeQuery(commonQueries.createFine, [borrow_id, amount, reason]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi tạo phạt'
            });
        }

        const fineId = result.data.insertId;
        const borrow = borrowResult.data[0];

        // Ghi log activity
        await logManualActivity(req.user.id, 'CREATE_FINE', 'fine', fineId, {
            borrow_id,
            amount,
            reason,
            book_title: borrow.title,
            user_id: borrow.user_id
        }, req);

        res.status(201).json({
            success: true,
            message: 'Tạo phạt thành công',
            data: {
                fineId,
                amount,
                reason,
                book_title: borrow.title,
                borrower_name: borrow.full_name
            }
        });

    } catch (error) {
        console.error('Create fine error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/fines/:id/pay - Thanh toán phạt
router.put('/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin phạt
        const fineResult = await executeQuery(
            'SELECT f.*, br.user_id, b.title FROM fines f JOIN borrows br ON f.borrow_id = br.id JOIN books b ON br.book_id = b.id WHERE f.id = ?',
            [id]
        );
        
        if (!fineResult.success || fineResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phạt'
            });
        }

        const fine = fineResult.data[0];

        // Kiểm tra quyền (user chỉ có thể thanh toán phạt của mình, admin/librarian có thể thanh toán tất cả)
        if (req.user.role === 'member' && fine.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể thanh toán phạt của chính mình'
            });
        }

        if (fine.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Phạt này không thể thanh toán'
            });
        }

        // Cập nhật trạng thái phạt thành paid
        const result = await executeQuery(commonQueries.updateFineStatus, ['paid', new Date(), id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật phạt'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'PAY_FINE', 'fine', id, {
            amount: fine.amount,
            reason: fine.reason,
            book_title: fine.title
        }, req);

        res.json({
            success: true,
            message: 'Thanh toán phạt thành công',
            data: {
                fineId: id,
                amount: fine.amount,
                paidDate: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Pay fine error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/fines/:id/waive - Miễn phạt (chỉ librarian/admin)
router.put('/:id/waive', requireLibrarian, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Lấy thông tin phạt
        const fineResult = await executeQuery(
            'SELECT f.*, br.user_id, b.title FROM fines f JOIN borrows br ON f.borrow_id = br.id JOIN books b ON br.book_id = b.id WHERE f.id = ?',
            [id]
        );
        
        if (!fineResult.success || fineResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phạt'
            });
        }

        const fine = fineResult.data[0];

        if (fine.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Phạt này không thể miễn'
            });
        }

        // Cập nhật trạng thái phạt thành waived
        const result = await executeQuery(commonQueries.updateFineStatus, ['waived', null, id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật phạt'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'WAIVE_FINE', 'fine', id, {
            amount: fine.amount,
            reason: fine.reason,
            waiver_reason: reason || 'Miễn phạt bởi quản trị viên',
            book_title: fine.title,
            user_id: fine.user_id
        }, req);

        res.json({
            success: true,
            message: 'Miễn phạt thành công',
            data: {
                fineId: id,
                amount: fine.amount,
                waivedDate: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Waive fine error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;



