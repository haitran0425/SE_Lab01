# THIẾT KẾ CƠ SỞ DỮ LIỆU HỆ THỐNG QUẢN LÝ THƯ VIỆN

## 1. SƠ ĐỒ ERD (Entity Relationship Diagram)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     USERS       │     │   CATEGORIES    │     │     BOOKS       │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │────▶│ id (PK)         │
│ username        │     │ name            │     │ isbn            │
│ email           │     │ description     │     │ title           │
│ password_hash   │     │ created_at      │     │ author          │
│ full_name       │     │ updated_at      │     │ publisher       │
│ phone           │     └─────────────────┘     │ publication_year│
│ address         │                             │ category_id (FK)│
│ role            │                             │ total_copies    │
│ is_active       │                             │ available_copies│
│ created_at      │                             │ description     │
│ updated_at      │                             │ cover_image     │
└─────────────────┘                             │ language        │
         │                                      │ pages           │
         │                                      │ price           │
         │                                      │ is_active       │
         │                                      │ created_at      │
         │                                      │ updated_at      │
         │                                      └─────────────────┘
         │                                               │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│     BORROWS     │                             │  RESERVATIONS   │
├─────────────────┤                             ├─────────────────┤
│ id (PK)         │                             │ id (PK)         │
│ user_id (FK)    │                             │ user_id (FK)    │
│ book_id (FK)    │                             │ book_id (FK)    │
│ borrow_date     │                             │ reservation_date│
│ due_date        │                             │ expiry_date     │
│ return_date     │                             │ status          │
│ status          │                             │ priority        │
│ fine_amount     │                             │ notes           │
│ notes           │                             │ created_at      │
│ created_at      │                             │ updated_at      │
│ updated_at      │                             └─────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│     FINES       │
├─────────────────┤
│ id (PK)         │
│ borrow_id (FK)  │
│ amount          │
│ reason          │
│ status          │
│ due_date        │
│ paid_date       │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌─────────────────┐
│ ACTIVITY_LOGS   │
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ action          │
│ entity_type     │
│ entity_id       │
│ details         │
│ ip_address      │
│ user_agent      │
│ created_at      │
└─────────────────┘
```

## 2. MÔ TẢ CÁC BẢNG

### 2.1 Bảng USERS (Người dùng)
- **Mục đích**: Lưu trữ thông tin người dùng hệ thống
- **Các vai trò**: admin, librarian, member
- **Khóa chính**: id
- **Đặc điểm**: 
  - Username và email phải unique
  - Password được hash bằng bcrypt
  - Có trường is_active để khóa/mở khóa tài khoản

### 2.2 Bảng CATEGORIES (Thể loại sách)
- **Mục đích**: Phân loại sách theo chủ đề
- **Khóa chính**: id
- **Đặc điểm**: Tên thể loại phải unique

### 2.3 Bảng BOOKS (Sách)
- **Mục đích**: Lưu trữ thông tin sách trong thư viện
- **Khóa chính**: id
- **Khóa ngoại**: category_id → categories(id)
- **Đặc điểm**:
  - ISBN phải unique
  - Theo dõi số lượng sách tổng và số lượng có sẵn
  - Có các index để tìm kiếm nhanh theo title, author, isbn

### 2.4 Bảng BORROWS (Mượn sách)
- **Mục đích**: Quản lý việc mượn và trả sách
- **Khóa chính**: id
- **Khóa ngoại**: 
  - user_id → users(id)
  - book_id → books(id)
- **Đặc điểm**:
  - Trạng thái: borrowed, returned, overdue, lost
  - Tự động tính phạt khi quá hạn
  - Có trigger để cập nhật available_copies

### 2.5 Bảng RESERVATIONS (Đặt trước)
- **Mục đích**: Cho phép người dùng đặt trước sách đang được mượn
- **Khóa chính**: id
- **Khóa ngoại**:
  - user_id → users(id)
  - book_id → books(id)
- **Đặc điểm**: Có thời hạn đặt trước và độ ưu tiên

### 2.6 Bảng FINES (Phạt)
- **Mục đích**: Quản lý các khoản phạt (quá hạn, mất sách)
- **Khóa chính**: id
- **Khóa ngoại**: borrow_id → borrows(id)
- **Đặc điểm**: Trạng thái pending, paid, waived

### 2.7 Bảng ACTIVITY_LOGS (Nhật ký hoạt động)
- **Mục đích**: Ghi lại tất cả hoạt động trong hệ thống
- **Khóa chính**: id
- **Khóa ngoại**: user_id → users(id)
- **Đặc điểm**: 
  - Ghi lại action, entity_type, entity_id
  - Lưu IP address và user agent
  - Phục vụ audit và debug

## 3. QUAN HỆ GIỮA CÁC BẢNG

### 3.1 Quan hệ 1-Nhiều:
- **USERS → BORROWS**: Một người dùng có thể mượn nhiều sách
- **BOOKS → BORROWS**: Một cuốn sách có thể được mượn nhiều lần
- **CATEGORIES → BOOKS**: Một thể loại có nhiều sách
- **BORROWS → FINES**: Một lần mượn có thể có nhiều phạt
- **USERS → RESERVATIONS**: Một người dùng có thể đặt trước nhiều sách
- **BOOKS → RESERVATIONS**: Một cuốn sách có thể được đặt trước nhiều lần
- **USERS → ACTIVITY_LOGS**: Một người dùng có nhiều hoạt động

### 3.2 Các ràng buộc:
- **Cascade Delete**: Khi xóa user, xóa tất cả borrows và reservations của user đó
- **Cascade Delete**: Khi xóa book, xóa tất cả borrows và reservations của book đó
- **Cascade Delete**: Khi xóa category, xóa tất cả books thuộc category đó
- **Set Null**: Khi xóa user, set user_id trong activity_logs = NULL

## 4. TRIGGER VÀ STORED PROCEDURES

### 4.1 Triggers:
- **after_borrow_insert**: Tự động giảm available_copies khi mượn sách
- **after_borrow_update**: Tự động tăng available_copies khi trả sách

### 4.2 Stored Procedures:
- **CalculateOverdueFines()**: Tính phạt cho các sách quá hạn

## 5. VIEWS HỮU ÍCH

### 5.1 borrow_statistics:
- Thống kê số lần mượn, trả, quá hạn của từng cuốn sách

### 5.2 detailed_borrows:
- Thông tin chi tiết về việc mượn sách kèm thông tin người dùng và sách

## 6. INDEXES CHO PERFORMANCE

### 6.1 Indexes chính:
- **idx_title, idx_author, idx_isbn**: Tìm kiếm sách nhanh
- **idx_user_borrow, idx_book_borrow**: Tìm kiếm mượn sách theo user hoặc book
- **idx_due_date**: Tìm sách quá hạn
- **idx_books_search**: Composite index cho tìm kiếm sách

### 6.2 Indexes bổ sung:
- **idx_borrows_dates**: Tìm kiếm theo ngày mượn, hạn trả
- **idx_users_role**: Lọc user theo role
- **idx_activity_logs_date**: Sắp xếp log theo thời gian

## 7. DỮ LIỆU MẪU

Hệ thống đã bao gồm dữ liệu mẫu:
- 6 thể loại sách
- 1 tài khoản admin
- 5 cuốn sách mẫu

## 8. TÍNH NĂNG ĐẶC BIỆT

### 8.1 Tự động tính phạt:
- Phạt 5,000 VND/ngày cho sách quá hạn
- Tự động cập nhật trạng thái overdue

### 8.2 Quản lý số lượng:
- Tự động cập nhật available_copies khi mượn/trả
- Kiểm tra số lượng trước khi cho mượn

### 8.3 Audit trail:
- Ghi lại tất cả hoạt động trong hệ thống
- Lưu IP và user agent để tracking

### 8.4 Đặt trước sách:
- Hệ thống reservation với thời hạn và độ ưu tiên
- Tự động thông báo khi sách có sẵn

