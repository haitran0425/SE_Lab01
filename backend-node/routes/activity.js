// =============================================
// ACTIVITY LOGS ROUTES
// =============================================

const express = require('express');
const { query, validationResult } = require('express-validator');
const { executeQuery, commonQueries } = require('../config/database');
const { requireLibrarian } = require('../middleware/auth');

const router = express.Router();

// GET /api/activity - Lấy danh sách hoạt động (chỉ librarian/admin)
router.get('/', requireLibrarian, [
    query('page').optional().isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),
    query('action').optional().isLength({ min: 1 }).withMessage('Action không được để trống'),
    query('entity_type').optional().isIn(['user', 'book', 'borrow', 'category', 'reservation', 'fine', 'auth', 'dashboard']).withMessage('Entity type không hợp lệ'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('User ID không hợp lệ'),
    query('date_from').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
    query('date_to').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ')
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

        const { 
            page = 1, 
            limit = 20, 
            action, 
            entity_type, 
            user_id, 
            date_from, 
            date_to 
        } = req.query;
        
        const offset = (page - 1) * limit;

        // Xây dựng query động
        let whereConditions = [];
        let queryParams = [];

        if (action) {
            whereConditions.push('al.action = ?');
            queryParams.push(action);
        }

        if (entity_type) {
            whereConditions.push('al.entity_type = ?');
            queryParams.push(entity_type);
        }

        if (user_id) {
            whereConditions.push('al.user_id = ?');
            queryParams.push(user_id);
        }

        if (date_from) {
            whereConditions.push('al.created_at >= ?');
            queryParams.push(date_from);
        }

        if (date_to) {
            whereConditions.push('al.created_at <= ?');
            queryParams.push(date_to);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const sql = `
            SELECT 
                al.*,
                u.username,
                u.full_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await executeQuery(sql, queryParams);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        // Đếm tổng số records
        const countSql = `
            SELECT COUNT(*) as total
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
        `;
        const countParams = queryParams.slice(0, -2); // Bỏ limit và offset
        const countResult = await executeQuery(countSql, countParams);
        const totalCount = countResult.data[0].total;

        res.json({
            success: true,
            data: {
                activities: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/activity/my - Lấy hoạt động của user hiện tại
router.get('/my', [
    query('page').optional().isInt({ min: 1 }).withMessage('Số trang phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1-50')
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

        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await executeQuery(commonQueries.getActivityLogsByUser, [req.user.id, parseInt(limit), parseInt(offset)]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        // Đếm tổng số hoạt động của user
        const countResult = await executeQuery(
            'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?',
            [req.user.id]
        );
        const totalCount = countResult.data[0].total;

        res.json({
            success: true,
            data: {
                activities: result.data,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalCount / limit),
                    totalItems: totalCount,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get my activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/activity/stats - Thống kê hoạt động (chỉ librarian/admin)
router.get('/stats', requireLibrarian, [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Số ngày phải từ 1-365')
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

        const { days = 30 } = req.query;

        // Thống kê hoạt động theo ngày
        const dailyStatsSql = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as activity_count,
                COUNT(DISTINCT user_id) as unique_users
            FROM activity_logs 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `;
        const dailyStatsResult = await executeQuery(dailyStatsSql, [days]);

        // Thống kê hoạt động theo action
        const actionStatsSql = `
            SELECT 
                action,
                COUNT(*) as count
            FROM activity_logs 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY action
            ORDER BY count DESC
        `;
        const actionStatsResult = await executeQuery(actionStatsSql, [days]);

        // Thống kê hoạt động theo user
        const userStatsSql = `
            SELECT 
                al.user_id,
                u.username,
                u.full_name,
                COUNT(*) as activity_count
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY al.user_id, u.username, u.full_name
            ORDER BY activity_count DESC
            LIMIT 10
        `;
        const userStatsResult = await executeQuery(userStatsSql, [days]);

        // Thống kê hoạt động theo entity type
        const entityStatsSql = `
            SELECT 
                entity_type,
                COUNT(*) as count
            FROM activity_logs 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY entity_type
            ORDER BY count DESC
        `;
        const entityStatsResult = await executeQuery(entityStatsSql, [days]);

        res.json({
            success: true,
            data: {
                period: `${days} days`,
                dailyStats: dailyStatsResult.success ? dailyStatsResult.data : [],
                actionStats: actionStatsResult.success ? actionStatsResult.data : [],
                userStats: userStatsResult.success ? userStatsResult.data : [],
                entityStats: entityStatsResult.success ? entityStatsResult.data : []
            }
        });

    } catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

// GET /api/activity/export - Xuất log hoạt động (chỉ librarian/admin)
router.get('/export', requireLibrarian, [
    query('format').optional().isIn(['json', 'csv']).withMessage('Format phải là json hoặc csv'),
    query('date_from').optional().isISO8601().withMessage('Ngày bắt đầu không hợp lệ'),
    query('date_to').optional().isISO8601().withMessage('Ngày kết thúc không hợp lệ'),
    query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit phải từ 1-10000')
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

        const { 
            format = 'json', 
            date_from, 
            date_to, 
            limit = 1000 
        } = req.query;

        // Xây dựng query
        let whereConditions = [];
        let queryParams = [];

        if (date_from) {
            whereConditions.push('created_at >= ?');
            queryParams.push(date_from);
        }

        if (date_to) {
            whereConditions.push('created_at <= ?');
            queryParams.push(date_to);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const sql = `
            SELECT 
                al.*,
                u.username,
                u.full_name
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ?
        `;

        queryParams.push(parseInt(limit));

        const result = await executeQuery(sql, queryParams);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi truy vấn dữ liệu'
            });
        }

        if (format === 'csv') {
            // Tạo CSV
            const csvHeader = 'ID,User ID,Username,Full Name,Action,Entity Type,Entity ID,Details,IP Address,User Agent,Created At\n';
            const csvRows = result.data.map(activity => {
                return [
                    activity.id,
                    activity.user_id || '',
                    activity.username || '',
                    activity.full_name || '',
                    activity.action,
                    activity.entity_type,
                    activity.entity_id || '',
                    `"${(activity.details || '').replace(/"/g, '""')}"`,
                    activity.ip_address || '',
                    `"${(activity.user_agent || '').replace(/"/g, '""')}"`,
                    activity.created_at
                ].join(',');
            }).join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${new Date().toISOString().split('T')[0]}.csv"`);
            res.send(csvHeader + csvRows);
        } else {
            // Trả về JSON
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${new Date().toISOString().split('T')[0]}.json"`);
            res.json({
                success: true,
                data: result.data,
                export_info: {
                    total_records: result.data.length,
                    export_date: new Date().toISOString(),
                    date_range: {
                        from: date_from || 'all',
                        to: date_to || 'all'
                    }
                }
            });
        }

    } catch (error) {
        console.error('Export activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
});

module.exports = router;



