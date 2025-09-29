// =============================================
// RESERVATIONS ROUTES
// =============================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const reservationValidation = [
    body('book_id')
        .isInt({ min: 1 })
        .withMessage('ID sách không hợp lệ')
];

// GET /api/reservations - Lấy danh sách đặt trước (chỉ librarian/admin)
router.get('/', requireLibrarian, async (req, res) => {
    try {
        const sql = `
            SELECT 
                r.*,
                u.full_name,
                u.email,
                b.title,
                b.author,
                b.isbn
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            JOIN books b ON r.book_id = b.id
            ORDER BY r.priority ASC, r.reservation_date ASC
        `;
        
        const result = await executeQuery(sql);

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
        console.error('Get reservations error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/reservations/my - Lấy danh sách đặt trước của user hiện tại
router.get('/my', async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getReservationsByUser, [req.user.id]);

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
        console.error('Get my reservations error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/reservations - Đặt trước sách
router.post('/', reservationValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { book_id } = req.body;
        const user_id = req.user.id;

        // Kiểm tra sách có tồn tại không
        const bookResult = await executeQuery(commonQueries.getBookById, [book_id]);
        if (!bookResult.success || bookResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        const book = bookResult.data[0];

        // Kiểm tra sách có sẵn không
        if (book.available_copies > 0) {
            return res.status(400).json({
                success: false,
                message: 'Sách hiện đang có sẵn, bạn có thể mượn trực tiếp'
            });
        }

        // Kiểm tra user đã đặt trước sách này chưa
        const existingReservationResult = await executeQuery(
            'SELECT id FROM reservations WHERE user_id = ? AND book_id = ? AND status = "active"',
            [user_id, book_id]
        );
        if (existingReservationResult.success && existingReservationResult.data.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã đặt trước sách này rồi'
            });
        }

        // Lấy số lượng đặt trước hiện tại để tính priority
        const priorityResult = await executeQuery(
            'SELECT COUNT(*) as count FROM reservations WHERE book_id = ? AND status = "active"',
            [book_id]
        );
        const priority = (priorityResult.data[0].count || 0) + 1;

        // Tạo đặt trước
        const result = await executeQuery(commonQueries.createReservation, [user_id, book_id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi tạo đặt trước'
            });
        }

        const reservationId = result.data.insertId;

        // Cập nhật priority
        await executeQuery('UPDATE reservations SET priority = ? WHERE id = ?', [priority, reservationId]);

        // Ghi log activity
        await logManualActivity(user_id, 'CREATE_RESERVATION', 'reservation', reservationId, {
            book_id,
            book_title: book.title,
            priority
        }, req);

        res.status(201).json({
            success: true,
            message: 'Đặt trước sách thành công',
            data: {
                reservationId,
                book_title: book.title,
                priority,
                expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// DELETE /api/reservations/:id - Hủy đặt trước
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin đặt trước
        const reservationResult = await executeQuery(
            'SELECT * FROM reservations WHERE id = ?',
            [id]
        );
        
        if (!reservationResult.success || reservationResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt trước'
            });
        }

        const reservation = reservationResult.data[0];

        // Kiểm tra quyền (user chỉ có thể hủy của mình, admin/librarian có thể hủy tất cả)
        if (req.user.role === 'member' && reservation.user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Bạn chỉ có thể hủy đặt trước của chính mình'
            });
        }

        if (reservation.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Đặt trước này không thể hủy'
            });
        }

        // Xóa đặt trước
        const result = await executeQuery(commonQueries.deleteReservation, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi hủy đặt trước'
            });
        }

        // Cập nhật lại priority của các đặt trước khác
        await executeQuery(
            'UPDATE reservations SET priority = priority - 1 WHERE book_id = ? AND priority > ? AND status = "active"',
            [reservation.book_id, reservation.priority]
        );

        // Ghi log activity
        await logManualActivity(req.user.id, 'CANCEL_RESERVATION', 'reservation', id, {
            book_id: reservation.book_id,
            user_id: reservation.user_id
        }, req);

        res.json({
            success: true,
            message: 'Hủy đặt trước thành công'
        });

    } catch (error) {
        console.error('Cancel reservation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/reservations/:id/fulfill - Thực hiện đặt trước (chỉ librarian/admin)
router.put('/:id/fulfill', requireLibrarian, async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin đặt trước
        const reservationResult = await executeQuery(
            'SELECT r.*, b.title, b.author FROM reservations r JOIN books b ON r.book_id = b.id WHERE r.id = ?',
            [id]
        );
        
        if (!reservationResult.success || reservationResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đặt trước'
            });
        }

        const reservation = reservationResult.data[0];

        if (reservation.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Đặt trước này không thể thực hiện'
            });
        }

        // Kiểm tra sách có sẵn không
        const bookResult = await executeQuery(commonQueries.getBookById, [reservation.book_id]);
        const book = bookResult.data[0];

        if (book.available_copies <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Sách vẫn chưa có sẵn'
            });
        }

        // Cập nhật trạng thái đặt trước thành fulfilled
        const updateResult = await executeQuery(commonQueries.updateReservationStatus, ['fulfilled', id]);

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật đặt trước'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'FULFILL_RESERVATION', 'reservation', id, {
            book_id: reservation.book_id,
            book_title: reservation.title,
            user_id: reservation.user_id
        }, req);

        res.json({
            success: true,
            message: 'Đặt trước đã được thực hiện',
            data: {
                book_title: reservation.title,
                author: reservation.author,
                user_id: reservation.user_id
            }
        });

    } catch (error) {
        console.error('Fulfill reservation error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;



