// =============================================
// BOOKS ROUTES
// =============================================

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');
const { logManualActivity } = require('../middleware/activityLogger');

const router = express.Router();

// Validation rules
const bookValidation = [
    body('isbn')
        .notEmpty()
        .withMessage('ISBN không được để trống')
        .isLength({ min: 10, max: 20 })
        .withMessage('ISBN phải từ 10-20 ký tự'),
    body('title')
        .notEmpty()
        .withMessage('Tiêu đề không được để trống')
        .isLength({ min: 1, max: 255 })
        .withMessage('Tiêu đề phải từ 1-255 ký tự'),
    body('author')
        .notEmpty()
        .withMessage('Tác giả không được để trống')
        .isLength({ min: 1, max: 255 })
        .withMessage('Tác giả phải từ 1-255 ký tự'),
    body('category_id')
        .isInt({ min: 1 })
        .withMessage('ID thể loại không hợp lệ'),
    body('total_copies')
        .isInt({ min: 1 })
        .withMessage('Số lượng sách phải ít nhất 1'),
    body('publication_year')
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
        .withMessage('Năm xuất bản không hợp lệ'),
    body('pages')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Số trang phải là số nguyên dương'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Giá phải là số dương')
];

// GET /api/books - Lấy danh sách sách (có thể search)
router.get('/', [
    query('search').optional().isLength({ min: 1 }).withMessage('Từ khóa tìm kiếm không được để trống'),
    query('category').optional().isInt({ min: 1 }).withMessage('ID thể loại không hợp lệ'),
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

        const { search, category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let result;
        if (search) {
            // Tìm kiếm sách
            const searchTerm = `%${search}%`;
            result = await executeQuery(commonQueries.searchBooks, [searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]);
        } else if (category) {
            // Lọc theo thể loại
            const sql = `
                SELECT b.*, c.name as category_name 
                FROM books b 
                JOIN categories c ON b.category_id = c.id 
                WHERE b.category_id = ? AND b.is_active = 1 
                ORDER BY b.created_at DESC 
                LIMIT ? OFFSET ?
            `;
            result = await executeQuery(sql, [category, parseInt(limit), parseInt(offset)]);
        } else {
            // Lấy tất cả sách
            const sql = `
                SELECT b.*, c.name as category_name 
                FROM books b 
                JOIN categories c ON b.category_id = c.id 
                WHERE b.is_active = 1 
                ORDER BY b.created_at DESC 
                LIMIT ? OFFSET ?
            `;
            result = await executeQuery(sql, [parseInt(limit), parseInt(offset)]);
        }

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        // Lấy tổng số sách để phân trang
        let totalCount;
        if (search) {
            const countSql = `
                SELECT COUNT(*) as total 
                FROM books b 
                JOIN categories c ON b.category_id = c.id 
                WHERE b.is_active = 1 AND (b.title LIKE ? OR b.author LIKE ? OR c.name LIKE ?)
            `;
            const searchTerm = `%${search}%`;
            const countResult = await executeQuery(countSql, [searchTerm, searchTerm, searchTerm]);
            totalCount = countResult.data[0].total;
        } else if (category) {
            const countSql = 'SELECT COUNT(*) as total FROM books WHERE category_id = ? AND is_active = 1';
            const countResult = await executeQuery(countSql, [category]);
            totalCount = countResult.data[0].total;
        } else {
            const countResult = await executeQuery('SELECT COUNT(*) as total FROM books WHERE is_active = 1');
            totalCount = countResult.data[0].total;
        }

        res.json({
            success: true,
            data: {
                books: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/books/available - Lấy danh sách sách có sẵn
router.get('/available', async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getAvailableBooks);

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
        console.error('Get available books error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/books/:id - Lấy thông tin chi tiết sách
router.get('/:id', [
    query('id').isInt({ min: 1 }).withMessage('ID sách không hợp lệ')
], async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(commonQueries.getBookById, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        if (result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Get book by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// POST /api/books - Tạo sách mới (chỉ librarian/admin)
router.post('/', requireLibrarian, bookValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const {
            isbn, title, author, publisher, publication_year, category_id,
            total_copies, description, language, pages, price
        } = req.body;

        // Kiểm tra ISBN đã tồn tại
        const existingBookResult = await executeQuery('SELECT id FROM books WHERE isbn = ?', [isbn]);
        if (existingBookResult.success && existingBookResult.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'ISBN đã tồn tại'
            });
        }

        // Tạo sách mới
        const result = await executeQuery(commonQueries.createBook, [
            isbn, title, author, publisher, publication_year, category_id,
            total_copies, total_copies, // available_copies = total_copies
            description || null, language || 'Vietnamese', pages || null, price || null
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi tạo sách'
            });
        }

        const bookId = result.data.insertId;

        // Ghi log activity
        await logManualActivity(req.user.id, 'CREATE_BOOK', 'book', bookId, {
            isbn, title, author, total_copies
        }, req);

        res.status(201).json({
            success: true,
            message: 'Tạo sách thành công',
            data: {
                bookId,
                isbn,
                title,
                author
            }
        });

    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// PUT /api/books/:id - Cập nhật thông tin sách (chỉ librarian/admin)
router.put('/:id', requireLibrarian, bookValidation, async (req, res) => {
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
        const {
            title, author, publisher, publication_year, category_id,
            total_copies, description, language, pages, price
        } = req.body;

        // Kiểm tra sách có tồn tại không
        const existingBookResult = await executeQuery(commonQueries.getBookById, [id]);
        if (!existingBookResult.success || existingBookResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        const existingBook = existingBookResult.data[0];
        
        // Tính available_copies mới
        const newAvailableCopies = Math.max(0, total_copies - (existingBook.total_copies - existingBook.available_copies));

        // Cập nhật sách
        const result = await executeQuery(commonQueries.updateBook, [
            title, author, publisher, publication_year, category_id,
            total_copies, newAvailableCopies, description || null,
            language || 'Vietnamese', pages || null, price || null, id
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi cập nhật sách'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'UPDATE_BOOK', 'book', id, {
            title, author, total_copies: total_copies
        }, req);

        res.json({
            success: true,
            message: 'Cập nhật sách thành công'
        });

    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// DELETE /api/books/:id - Xóa sách (chỉ librarian/admin)
router.delete('/:id', requireLibrarian, async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra sách có tồn tại không
        const existingBookResult = await executeQuery(commonQueries.getBookById, [id]);
        if (!existingBookResult.success || existingBookResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sách'
            });
        }

        const book = existingBookResult.data[0];

        // Kiểm tra có sách đang được mượn không
        if (book.available_copies < book.total_copies) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa sách đang được mượn'
            });
        }

        // Xóa sách (soft delete)
        const result = await executeQuery(commonQueries.deleteBook, [id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi xóa sách'
            });
        }

        // Ghi log activity
        await logManualActivity(req.user.id, 'DELETE_BOOK', 'book', id, {
            title: book.title,
            author: book.author
        }, req);

        res.json({
            success: true,
            message: 'Xóa sách thành công'
        });

    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;
