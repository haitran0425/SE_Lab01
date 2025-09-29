# 📚 Hệ thống Quản lý Thư viện trực tuyến
## Library Management System

Hệ thống quản lý thư viện trực tuyến được xây dựng với kiến trúc microservices, bao gồm Frontend React, Backend Node.js, Backend Spring Boot và cơ sở dữ liệu MySQL.

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend React │────▶│ Backend Node.js │────▶│     MySQL       │
│    (Port 3000)  │     │   (Port 3001)   │     │   (Port 3306)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Backend Spring  │
                       │  Boot (Port     │
                       │     3002)       │
                       └─────────────────┘
```

## 🚀 Công nghệ sử dụng

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type Safety
- **Ant Design** - UI Components
- **React Router** - Navigation
- **React Query** - Data Fetching
- **Axios** - HTTP Client

### Backend
- **Node.js + Express** - REST API chính
- **Spring Boot** - API bổ sung
- **MySQL 8.0** - Cơ sở dữ liệu
- **Redis** - Caching
- **JWT** - Authentication

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **Nginx** - Reverse Proxy

## 📋 Tính năng chính

### 🔐 Quản lý người dùng
- Đăng ký, đăng nhập
- Phân quyền (Admin, Librarian, Member)
- Quản lý profile

### 📖 Quản lý sách
- Thêm, sửa, xóa sách
- Tìm kiếm sách theo tên, tác giả, thể loại
- Quản lý thể loại sách
- Upload ảnh bìa sách

### 📚 Quản lý mượn sách
- Mượn sách và trả sách
- Đặt trước sách
- Kiểm tra số lượng sách có sẵn
- Thông báo quá hạn

### 💰 Quản lý phạt
- Tính phạt quá hạn tự động
- Thanh toán phạt
- Miễn phạt (Admin/Librarian)

### 📊 Dashboard & Báo cáo
- Thống kê tổng quan
- Báo cáo mượn sách
- Hoạt động gần đây
- Xuất dữ liệu

## 🛠️ Cài đặt và chạy

### Yêu cầu hệ thống
- Docker & Docker Compose
- Git
- Node.js 18+ (cho development)
- Java 17+ (cho development)

### 1. Clone repository
```bash
git clone <repository-url>
cd LibrarySystem
```

### 2. Cấu hình môi trường
```bash
# Copy file cấu hình môi trường
cp backend-node/env.example backend-node/.env
cp backend-spring/src/main/resources/application.yml.example backend-spring/src/main/resources/application.yml
```

### 3. Chạy với Docker Compose

#### Production Mode
```bash
# Build và chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down
```

#### Development Mode
```bash
# Chạy ở chế độ development
docker-compose -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.dev.yml logs -f

# Dừng services
docker-compose -f docker-compose.dev.yml down
```

### 4. Truy cập ứng dụng
- **Frontend**: http://localhost:3000
- **Backend Node.js**: http://localhost:3001
- **Backend Spring Boot**: http://localhost:3002
- **phpMyAdmin**: http://localhost:8080 (dev mode)

### 5. Tài khoản mặc định
- **Username**: admin
- **Password**: admin123
- **Role**: admin

## 📁 Cấu trúc thư mục

```
LibrarySystem/
├── backend-node/           # Node.js Backend API
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
├── backend-spring/         # Spring Boot Backend API
│   ├── src/
│   ├── Dockerfile
│   ├── pom.xml
│   └── ...
├── frontend-react/         # React Frontend
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── ...
├── database_design.sql     # Database schema
├── database_init.sql       # Database initialization
├── docker-compose.yml      # Production compose
├── docker-compose.dev.yml  # Development compose
└── README.md
```

## 🗄️ Cơ sở dữ liệu

### Các bảng chính
- **users** - Thông tin người dùng
- **categories** - Thể loại sách
- **books** - Thông tin sách
- **borrows** - Quản lý mượn sách
- **reservations** - Đặt trước sách
- **fines** - Quản lý phạt
- **activity_logs** - Nhật ký hoạt động

### Khởi tạo database
```bash
# Database sẽ được tự động tạo khi chạy Docker Compose
# Hoặc chạy thủ công:
mysql -u root -p < database_init.sql
```

## 🔧 Development

### Chạy từng service riêng lẻ

#### Backend Node.js
```bash
cd backend-node
npm install
npm run dev
```

#### Backend Spring Boot
```bash
cd backend-spring
mvn spring-boot:run
```

#### Frontend React
```bash
cd frontend-react
npm install
npm start
```

### API Documentation
- **Swagger UI**: http://localhost:3002/api/swagger-ui.html (Spring Boot)
- **API Endpoints**: Xem trong file `backend-node/routes/`

## 🐳 Docker Commands

### Build images
```bash
# Build tất cả images
docker-compose build

# Build specific service
docker-compose build backend-node
```

### Management
```bash
# Xem logs
docker-compose logs -f [service-name]

# Vào container
docker-compose exec [service-name] sh

# Restart service
docker-compose restart [service-name]

# Scale service
docker-compose up -d --scale backend-node=2
```

### Cleanup
```bash
# Dừng và xóa containers
docker-compose down

# Xóa volumes
docker-compose down -v

# Xóa images
docker-compose down --rmi all
```

## 🔒 Bảo mật

- JWT Authentication
- CORS Configuration
- Input Validation
- SQL Injection Prevention
- XSS Protection
- Rate Limiting

## 📊 Monitoring

### Health Checks
- Backend Node.js: `/health`
- Backend Spring Boot: `/actuator/health`
- Frontend: `/health`

### Logs
```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs specific service
docker-compose logs -f backend-node
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👥 Team

- **Backend Node.js**: Library System Team
- **Backend Spring Boot**: Library System Team  
- **Frontend React**: Library System Team
- **DevOps**: Library System Team

## 📞 Hỗ trợ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.

---

**Happy Coding! 🚀**



