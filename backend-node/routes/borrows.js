// =============================================
// BORROWS ROUTES
// =============================================

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeQuery, commonQueries, executeTransaction } = require('../config/database');
const { requireLibrarian, requireOwnershipOrAdmin } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const borrowValidation = [
    body('book_id')
        .isInt({ min: 1 })
        .withMessage('ID sách không hợp lệ'),
    body('borrow_days')
        .optional()
        .isInt({ min: 1, max: 30 })
        .withMessage('Số ngày mượn phải từ 1-30')
];

// GET /api/borrows - Lấy danh sách mượn sách (chỉ librarian/admin)
router.get('/', requireLibrarian, [
    query('status').optional().isIn(['borrowed', 'returned', 'overdue', 'lost']).withMessage('Trạng thái không hợp lệ'),
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
            result = await executeQuery(commonQueries.getDetailedBorrows, [status, parseInt(limit), parseInt(offset)]);
        } else {
            result = await executeQuery(commonQueries.getAllBorrows);
            // Paginate manually for all borrows
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

        // Get total count for pagination
        const countSql = status 
            ? 'SELECT COUNT(*) as total FROM borrows WHERE status = ?'
            : 'SELECT COUNT(*) as total FROM borrows';
        const countParams = status ? [status] : [];
        const countResult = await executeQuery(countSql, countParams);
        const totalCount = countResult.data[0].total;

        res.json({
            success: true,
            data: {
                borrows: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get borrows error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/borrows/my - Lấy danh sách mượn sách của user hiện tại
router.get('/my', async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getBorrowsByUser, [req.user.id]);

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
        console.error('Get my borrows error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/borrows/overdue - Lấy danh sách sách quá hạn
router.get('/overdue', requireLibrarian, async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getOverdueBorrows);

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
        console.error('Get overdue borrows error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/borrows/:id - Lấy thông tin chi tiết mượn sách
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(commonQueries.getBorrowById, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin mượn sách'
            });
        }

        const borrow = result.data[0];

        // Kiểm tra quyền truy cập (user chỉ có thể xem của mình, admin/librarian có thể xem tất cả)
        if (req.user.role === 'member' && borrow.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem thông tin này'
            });
        }

        res.json({
            success: true,
            data: borrow
        });

    } catch (error) {
        console.error('Get borrow by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/borrows - Mượn sách
router.post('/', borrowValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { book_id, borrow_days = 14 } = req.body;
        const user_id = req.user.id;

        // Kiểm tra sách có tồn tại và có sẵn không
        const bookResult = await executeQuery(commonQueries.getBookById, [book_id]);
        if (!bookResult.success || bookResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        const book = bookResult.data[0];
        if (book.available_copies <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Sách đã hết, không thể mượn'
            });
        }

        // Kiểm tra user đã mượn sách này chưa (chưa trả)
        const existingBorrowResult = await executeQuery(
            'SELECT id FROM borrows WHERE user_id = ? AND book_id = ? AND status = "borrowed"',
            [user_id, book_id]
        );
        if (existingBorrowResult.success && existingBorrowResult.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã mượn sách này rồi'
            });
        }

        // Thực hiện transaction để mượn sách
        const queries = [
            {
                sql: commonQueries.createBorrow,
                params: [user_id, book_id, borrow_days]
            },
            {
                sql: commonQueries.updateBookAvailability,
                params: [book.available_copies - 1, book_id]
            }
        ];

        const result = await executeTransaction(queries);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi mượn sách'
            });
        }

        const borrowId = result.data[0].insertId;

        // Ghi log activity
        await logManualActivity(user_id, 'BORROW_BOOK', 'borrow', borrowId, {
            book_id,
            book_title: book.title,
            borrow_days
        }, req);

        res.status(201).json({
            success: true,
            message: 'Mượn sách thành công',
            data: {
                borrowId,
                book_title: book.title,
                borrow_date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + borrow_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Borrow book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/borrows/:id/return - Trả sách
router.put('/:id/return', requireLibrarian, async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin mượn sách
        const borrowResult = await executeQuery(commonQueries.getBorrowById, [id]);
        if (!borrowResult.success || borrowResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin mượn sách'
            });
        }

        const borrow = borrowResult.data[0];

        if (borrow.status !== 'borrowed') {
            return res.status(400).json({
                success: false,
                message: 'Sách này đã được trả rồi'
            });
        }

        // Lấy thông tin sách
        const bookResult = await executeQuery(commonQueries.getBookById, [borrow.book_id]);
        const book = bookResult.data[0];

        // Thực hiện transaction để trả sách
        const queries = [
            {
                sql: commonQueries.returnBook,
                params: [id]
            },
            {
                sql: commonQueries.updateBookAvailability,
                params: [book.available_copies + 1, borrow.book_id]
            }
        ];

        const result = await executeTransaction(queries);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi trả sách'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'RETURN_BOOK', 'borrow', id, {
            book_id: borrow.book_id,
            book_title: borrow.title,
            user_id: borrow.user_id
        }, req);

        res.json({
            success: true,
            message: 'Trả sách thành công',
            data: {
                return_date: new Date().toISOString().split('T')[0],
                book_title: borrow.title,
                borrower_name: borrow.full_name
            }
        });

    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;
