// =============================================
// DASHBOARD ROUTES
// =============================================

const express = require('express');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - Lấy thống kê tổng quan
router.get('/stats', requireLibrarian, async (req, res) => {
    try {
        // Lấy thống kê cơ bản
        const statsResult = await executeQuery(commonQueries.getDashboardStats);
        
        if (!statsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn thống kê'
            });
        }

        const stats = statsResult.data[0];

        // Lấy thống kê mượn sách theo tháng (6 tháng gần nhất)
        const monthlyBorrowsSql = `
            SELECT 
                DATE_FORMAT(borrow_date, '%Y-%m') as month,
                COUNT(*) as borrow_count
            FROM borrows 
            WHERE borrow_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(borrow_date, '%Y-%m')
            ORDER BY month DESC
        `;
        const monthlyBorrowsResult = await executeQuery(monthlyBorrowsSql);

        // Lấy top sách được mượn nhiều nhất
        const topBooksSql = `
            SELECT 
                b.id,
                b.title,
                b.author,
                COUNT(br.id) as borrow_count
            FROM books b
            LEFT JOIN borrows br ON b.id = br.book_id
            WHERE b.is_active = 1
            GROUP BY b.id, b.title, b.author
            ORDER BY borrow_count DESC
            LIMIT 5
        `;
        const topBooksResult = await executeQuery(topBooksSql);

        // Lấy thống kê theo thể loại
        const categoryStatsSql = `
            SELECT 
                c.name as category_name,
                COUNT(b.id) as book_count,
                SUM(b.total_copies) as total_copies,
                SUM(b.available_copies) as available_copies
            FROM categories c
            LEFT JOIN books b ON c.id = b.category_id AND b.is_active = 1
            GROUP BY c.id, c.name
            ORDER BY book_count DESC
        `;
        const categoryStatsResult = await executeQuery(categoryStatsSql);

        res.json({
            success: true,
            data: {
                overview: stats,
                monthlyBorrows: monthlyBorrowsResult.success ? monthlyBorrowsResult.data : [],
                topBooks: topBooksResult.success ? topBooksResult.data : [],
                categoryStats: categoryStatsResult.success ? categoryStatsResult.data : []
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/dashboard/recent-activity - Lấy hoạt động gần đây
router.get('/recent-activity', requireLibrarian, [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1-50')
], async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await executeQuery(commonQueries.getActivityLogs, [parseInt(limit), 0]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn hoạt động'
            });
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/dashboard/overdue-report - Báo cáo sách quá hạn
router.get('/overdue-report', requireLibrarian, async (req, res) => {
    try {
        const result = await executeQuery(commonQueries.getOverdueBorrows);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn báo cáo'
            });
        }

        // Thống kê quá hạn
        const overdueStats = {
            total: result.data.length,
            byDays: {
                '1-7': 0,
                '8-14': 0,
                '15-30': 0,
                '30+': 0
            }
        };

        result.data.forEach(borrow => {
            const daysOverdue = Math.floor((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 7) overdueStats.byDays['1-7']++;
            else if (daysOverdue <= 14) overdueStats.byDays['8-14']++;
            else if (daysOverdue <= 30) overdueStats.byDays['15-30']++;
            else overdueStats.byDays['30+']++;
        });

        res.json({
            success: true,
            data: {
                overdueBooks: result.data,
                stats: overdueStats
            }
        });

    } catch (error) {
        console.error('Get overdue report error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/dashboard/user-stats - Thống kê người dùng
router.get('/user-stats', requireLibrarian, async (req, res) => {
    try {
        // Thống kê theo role
        const roleStatsSql = `
            SELECT 
                role,
                COUNT(*) as count
            FROM users 
            WHERE is_active = 1
            GROUP BY role
        `;
        const roleStatsResult = await executeQuery(roleStatsSql);

        // Thống kê đăng ký theo tháng (6 tháng gần nhất)
        const registrationStatsSql = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as registration_count
            FROM users 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month DESC
        `;
        const registrationStatsResult = await executeQuery(registrationStatsSql);

        // Top người dùng mượn sách nhiều nhất
        const topUsersSql = `
            SELECT 
                u.id,
                u.full_name,
                u.email,
                COUNT(br.id) as borrow_count
            FROM users u
            LEFT JOIN borrows br ON u.id = br.user_id
            WHERE u.is_active = 1 AND u.role = 'member'
            GROUP BY u.id, u.full_name, u.email
            ORDER BY borrow_count DESC
            LIMIT 10
        `;
        const topUsersResult = await executeQuery(topUsersSql);

        res.json({
            success: true,
            data: {
                roleStats: roleStatsResult.success ? roleStatsResult.data : [],
                registrationStats: registrationStatsResult.success ? registrationStatsResult.data : [],
                topUsers: topUsersResult.success ? topUsersResult.data : []
            }
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;



