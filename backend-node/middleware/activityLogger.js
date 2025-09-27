// =============================================
// ACTIVITY LOGGING MIDDLEWARE
// =============================================

const { executeQuery, commonQueries } = require('../config/database');

// Middleware ghi log hoạt động
const logActivity = async (req, res, next) => {
    // Lưu response function gốc
    const originalSend = res.send;
    
    // Override res.send để có thể ghi log sau khi response
    res.send = function(data) {
        // Gọi originalSend trước
        originalSend.call(this, data);
        
        // Ghi log activity (async, không đợi)
        logActivityAsync(req, res, data).catch(err => {
            console.error('Activity logging error:', err);
        });
    };
    
    next();
};

// Async function để ghi log activity
async function logActivityAsync(req, res, data) {
    try {
        // Chỉ log các API calls, không log static files
        if (req.path.startsWith('/api/')) {
            const userId = req.user ? req.user.id : null;
            const action = getActionFromRequest(req);
            const entityType = getEntityTypeFromPath(req.path);
            const entityId = getEntityIdFromRequest(req);
            const details = getDetailsFromRequest(req, res, data);
            
            // Ghi log vào database
            await executeQuery(commonQueries.createActivityLog, [
                userId,
                action,
                entityType,
                entityId,
                details,
                req.ip || req.connection.remoteAddress,
                req.get('User-Agent')
            ]);
        }
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Xác định action từ request
function getActionFromRequest(req) {
    const method = req.method;
    const path = req.path;
    
    // Mapping các action phổ biến
    if (method === 'GET' && path.includes('/login')) return 'LOGIN_ATTEMPT';
    if (method === 'POST' && path.includes('/login')) return 'LOGIN';
    if (method === 'POST' && path.includes('/register')) return 'REGISTER';
    if (method === 'POST' && path.includes('/logout')) return 'LOGOUT';
    
    if (method === 'GET' && path.includes('/books')) return 'VIEW_BOOKS';
    if (method === 'POST' && path.includes('/books')) return 'CREATE_BOOK';
    if (method === 'PUT' && path.includes('/books')) return 'UPDATE_BOOK';
    if (method === 'DELETE' && path.includes('/books')) return 'DELETE_BOOK';
    
    if (method === 'GET' && path.includes('/borrows')) return 'VIEW_BORROWS';
    if (method === 'POST' && path.includes('/borrows')) return 'BORROW_BOOK';
    if (method === 'PUT' && path.includes('/borrows') && path.includes('/return')) return 'RETURN_BOOK';
    
    if (method === 'GET' && path.includes('/users')) return 'VIEW_USERS';
    if (method === 'POST' && path.includes('/users')) return 'CREATE_USER';
    if (method === 'PUT' && path.includes('/users')) return 'UPDATE_USER';
    if (method === 'DELETE' && path.includes('/users')) return 'DELETE_USER';
    
    if (method === 'GET' && path.includes('/dashboard')) return 'VIEW_DASHBOARD';
    if (method === 'GET' && path.includes('/categories')) return 'VIEW_CATEGORIES';
    if (method === 'POST' && path.includes('/categories')) return 'CREATE_CATEGORY';
    
    // Default actions
    if (method === 'GET') return 'VIEW';
    if (method === 'POST') return 'CREATE';
    if (method === 'PUT') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    
    return 'UNKNOWN';
}

// Xác định entity type từ path
function getEntityTypeFromPath(path) {
    if (path.includes('/books')) return 'book';
    if (path.includes('/users')) return 'user';
    if (path.includes('/borrows')) return 'borrow';
    if (path.includes('/categories')) return 'category';
    if (path.includes('/reservations')) return 'reservation';
    if (path.includes('/fines')) return 'fine';
    if (path.includes('/auth')) return 'auth';
    if (path.includes('/dashboard')) return 'dashboard';
    
    return 'unknown';
}

// Lấy entity ID từ request
function getEntityIdFromRequest(req) {
    // Từ URL params
    const urlId = req.params.id || req.params.bookId || req.params.userId || req.params.borrowId;
    if (urlId) return urlId;
    
    // Từ body
    if (req.body.id) return req.body.id;
    if (req.body.book_id) return req.body.book_id;
    if (req.body.user_id) return req.body.user_id;
    
    return null;
}

// Tạo details từ request và response
function getDetailsFromRequest(req, res, responseData) {
    const details = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
    };
    
    // Thêm query params nếu có
    if (Object.keys(req.query).length > 0) {
        details.query = req.query;
    }
    
    // Thêm body data cho POST/PUT (trừ password)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) delete sanitizedBody.password;
        if (sanitizedBody.password_hash) delete sanitizedBody.password_hash;
        details.body = sanitizedBody;
    }
    
    // Thêm response status
    details.responseStatus = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error';
    
    return JSON.stringify(details);
}

// Function để ghi log thủ công
const logManualActivity = async (userId, action, entityType, entityId, details, req) => {
    try {
        await executeQuery(commonQueries.createActivityLog, [
            userId,
            action,
            entityType,
            entityId,
            JSON.stringify(details),
            req ? (req.ip || req.connection.remoteAddress) : null,
            req ? req.get('User-Agent') : null
        ]);
    } catch (error) {
        console.error('Error logging manual activity:', error);
    }
};

module.exports = {
    logActivity,
    logManualActivity
};
