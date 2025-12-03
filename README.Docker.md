# Docker Deployment Guide

## 🐳 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### 1. Cấu hình Environment Variables

```bash
# Copy file environment mẫu
cp .env.docker .env

# Chỉnh sửa các biến môi trường nếu cần
# nano .env
```

### 2. Khởi động toàn bộ hệ thống

```bash
# Build và start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Chỉ xem logs của một service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### 3. Truy cập ứng dụng

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **MySQL Database**: localhost:3306

## 🛠️ Các lệnh hữu ích

### Quản lý containers

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (cẩn thận - sẽ mất dữ liệu!)
docker-compose down -v

# Restart một service cụ thể
docker-compose restart backend

# Stop một service cụ thể
docker-compose stop frontend

# Start lại một service đã stop
docker-compose start frontend

# Xem trạng thái các services
docker-compose ps
```

### Build và Rebuild

```bash
# Rebuild tất cả images
docker-compose build

# Rebuild một service cụ thể
docker-compose build backend

# Build và start (force rebuild)
docker-compose up -d --build

# Build không dùng cache
docker-compose build --no-cache
```

### Database Management

```bash
# Truy cập MySQL shell
docker-compose exec db mysql -u parking_user -p

# Backup database
docker-compose exec db mysqldump -u parking_user -p smart_parking > backup.sql

# Restore database
docker-compose exec -T db mysql -u parking_user -p smart_parking < backup.sql

# Xem logs database
docker-compose logs -f db
```

### Chạy migrations

```bash
# Truy cập backend container
docker-compose exec backend bash

# Chạy Alembic migrations
docker-compose exec backend alembic upgrade head

# Tạo migration mới
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Debugging

```bash
# Xem logs real-time
docker-compose logs -f

# Truy cập shell của backend
docker-compose exec backend bash

# Truy cập shell của frontend (nginx)
docker-compose exec frontend sh

# Kiểm tra resource usage
docker stats

# Kiểm tra health status
docker-compose ps
```

## 📦 Cấu trúc Services

### Backend (FastAPI)
- **Port**: 8000
- **Image**: Python 3.11-slim
- **Dependencies**: MySQL database
- **Volumes**: 
  - logs directory
  - YOLO model files

### Frontend (React + Vite)
- **Port**: 80
- **Build**: Multi-stage với Node 20 và Nginx
- **Features**: 
  - Gzip compression
  - Static asset caching
  - React Router support

### Database (MySQL 8.0)
- **Port**: 3306
- **Volume**: Persistent data storage
- **Health checks**: Enabled

## 🔧 Troubleshooting

### Backend không kết nối được database

```bash
# Kiểm tra database đã ready chưa
docker-compose logs db

# Kiểm tra connection string
docker-compose exec backend env | grep DATABASE_URL
```

### Frontend không load được

```bash
# Kiểm tra nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Kiểm tra static files
docker-compose exec frontend ls -la /usr/share/nginx/html
```

### Port đã được sử dụng

```bash
# Thay đổi ports trong docker-compose.yml
# Ví dụ: "8001:8000" thay vì "8000:8000"
```

### Memory/CPU issues

```bash
# Thêm resource limits vào docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## 🚀 Production Deployment

### 1. Sử dụng production environment

```bash
# Tạo file .env.production
cp .env.docker .env.production

# Cập nhật các giá trị cho production
DEBUG=False
LOG_LEVEL=WARNING
```

### 2. Build production images

```bash
# Build với production tag
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start với production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Security best practices

- Thay đổi tất cả passwords mặc định
- Sử dụng secrets management
- Enable HTTPS với reverse proxy (nginx/traefik)
- Giới hạn network exposure
- Regular backup database
- Monitor logs và metrics

## 📊 Monitoring

### Health Checks

Tất cả services đều có health checks:
- Backend: HTTP GET /health
- Frontend: HTTP GET /
- Database: mysqladmin ping

### Logs

```bash
# Centralized logging
docker-compose logs -f --tail=100

# Export logs to file
docker-compose logs > app.log
```

## 🔄 Updates và Maintenance

### Update application code

```bash
# Pull latest code
git pull origin main

# Rebuild và restart
docker-compose up -d --build

# Clean old images
docker image prune -a
```

### Database migrations

```bash
# Backup trước khi migrate
docker-compose exec db mysqldump -u parking_user -p smart_parking > backup_$(date +%Y%m%d).sql

# Run migrations
docker-compose exec backend alembic upgrade head

# Verify
docker-compose exec backend alembic current
```
