# Smart Parking Backend 🚗

Backend API cho hệ thống quản lý bãi đỗ xe thông minh sử dụng YOLOv8 và Computer Vision.

## 📋 Tính năng

- ✅ **Multi-camera Support**: Quản lý nhiều camera đồng thời
- ✅ **YOLOv8 Detection**: Phát hiện xe real-time với YOLO
- ✅ **Video Streaming**: MJPEG streaming qua HTTP
- ✅ **WebSocket Real-time**: Broadcast detection và slot status
- ✅ **Parking Slot Management**: Vẽ và quản lý polygon parking slots
- ✅ **Occupancy Detection**: Tự động phát hiện chỗ đỗ trống/đầy
- ✅ **RESTful API**: CRUD operations cho cameras và slots
- ✅ **Async Database**: SQLAlchemy async với MySQL
- ✅ **Alembic Migrations**: Database versioning

## 🏗️ Kiến trúc

```
backend/
├── app/
│   ├── core/           # Core configurations
│   │   ├── config.py   # Settings & environment variables
│   │   ├── database.py # Database connection & session
│   │   └── logger.py   # Logging configuration
│   ├── models/         # SQLAlchemy ORM models
│   │   ├── camera.py   # Camera model
│   │   └── slot.py     # ParkingSlot model
│   ├── schemas/        # Pydantic schemas (validation)
│   │   ├── camera_schema.py
│   │   └── slot_schema.py
│   ├── services/       # Business logic
│   │   ├── ai_listener.py      # YOLO detection service
│   │   ├── camera_service.py   # Camera CRUD
│   │   ├── slot_service.py     # Slot CRUD & occupancy
│   │   └── websocket_manager.py # WebSocket broadcast
│   ├── routes/         # API endpoints
│   │   ├── camera_routes.py
│   │   ├── slot_routes.py
│   │   ├── stream_routes.py
│   │   └── websocket_routes.py
│   ├── utils/          # Utilities
│   │   └── geometry.py # Polygon intersection calculations
│   └── db_init.py      # Database initialization
├── alembic/            # Database migrations
├── logs/               # Application logs
├── tests/              # Unit & integration tests
├── scripts/            # Helper scripts
├── main.py             # FastAPI application entry point
├── requirements.txt    # Python dependencies
├── alembic.ini         # Alembic configuration
└── .env                # Environment variables (gitignored)
```

## 🚀 Cài đặt

### 1. Yêu cầu hệ thống

- Python 3.10+
- MySQL 8.0+
- Webcam hoặc RTSP camera (tùy chọn)
- GPU (tùy chọn, để tăng tốc YOLO)

### 2. Clone và cài đặt dependencies

```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt packages
pip install -r requirements.txt
```

### 3. Cấu hình Database

```bash
# Tạo database MySQL
mysql -u root -p
CREATE DATABASE smart_parking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 4. Cấu hình môi trường

```bash
# Copy file .env.example
cp .env.example .env

# Chỉnh sửa .env với thông tin database của bạn
# DATABASE_URL=mysql+aiomysql://username:password@localhost:3306/smart_parking
```

File `.env` mẫu:
```bash
# Database
DATABASE_URL=mysql+aiomysql://root:yourpassword@localhost:3306/smart_parking

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log

# Detection Settings
DETECTION_THRESHOLD=0.3
SMOOTHING_FRAMES=3
```

### 5. Chạy migrations

```bash
# Tạo tables trong database
alembic upgrade head
```

### 6. Khởi động server

```bash
# Development mode (auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server sẽ chạy tại: `http://localhost:8000`

## 📚 API Documentation

### Swagger UI (Interactive)
Truy cập: `http://localhost:8000/docs`

### ReDoc
Truy cập: `http://localhost:8000/redoc`

### API Endpoints

#### **Cameras**

```http
GET    /api/v1/cameras              # Lấy danh sách cameras
POST   /api/v1/cameras              # Tạo camera mới
GET    /api/v1/cameras/{id}         # Lấy thông tin camera
PUT    /api/v1/cameras/{id}         # Cập nhật camera
DELETE /api/v1/cameras/{id}         # Xóa camera
```

**Tạo camera mới:**
```bash
curl -X POST http://localhost:8000/api/v1/cameras \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Camera Entrance",
    "location": "Main Gate",
    "source_type": "webcam",
    "source_path": "0"
  }'
```

**Source types:**
- `webcam`: Webcam của máy tính (source_path = "0", "1", ...)
- `rtsp`: RTSP camera (source_path = "rtsp://username:password@ip:port/stream")
- `file`: Video file (source_path = "C:/videos/parking.mp4")

#### **Parking Slots**

```http
GET    /api/v1/slots                    # Lấy tất cả slots
POST   /api/v1/slots                    # Tạo slot mới
GET    /api/v1/slots/{id}               # Lấy thông tin slot
PUT    /api/v1/slots/{id}               # Cập nhật slot
DELETE /api/v1/slots/{id}               # Xóa slot
GET    /api/v1/slots/camera/{camera_id} # Lấy slots của camera
GET    /api/v1/slots/status/summary     # Tổng hợp trạng thái
```

**Tạo parking slot:**
```bash
curl -X POST http://localhost:8000/api/v1/slots \
  -H "Content-Type: application/json" \
  -d '{
    "camera_id": 1,
    "label": "A-01",
    "polygon": [[100, 150], [300, 150], [300, 250], [100, 250]]
  }'
```

#### **Detector Control**

```http
POST   /api/v1/detector/{camera_id}/start   # Bật detector cho camera
POST   /api/v1/detector/{camera_id}/stop    # Tắt detector cho camera
GET    /api/v1/detector/{camera_id}/status  # Trạng thái detector
```

#### **Video Streaming**

```http
GET    /api/v1/stream/{camera_id}          # MJPEG video stream
GET    /api/v1/stream/{camera_id}/snapshot # Ảnh tĩnh (snapshot)
```

#### **WebSocket**

```http
WS     /ws/{camera_id}                      # Real-time updates
```

**WebSocket message format:**
```json
{
  "type": "slot_update",
  "camera_id": 1,
  "slots": [
    {
      "id": 1,
      "label": "A-01",
      "status": "occupied",
      "polygon": [[100, 150], [300, 150], [300, 250], [100, 250]]
    }
  ],
  "detections": [
    {
      "bbox": [150, 180, 280, 240],
      "confidence": 0.92,
      "class": "car"
    }
  ],
  "frame_id": 1234,
  "timestamp": "2025-10-23T10:30:45.123456"
}
```

## 🔧 Development

### Chạy tests

```bash
# Chạy tất cả tests
pytest

# Chạy với coverage
pytest --cov=app tests/

# Chạy test cụ thể
pytest tests/test_camera_routes.py -v
```

### Tạo migration mới

```bash
# Auto-generate migration từ model changes
alembic revision --autogenerate -m "Add new column to cameras"

# Apply migration
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code style

```bash
# Format code với black
black app/

# Lint với flake8
flake8 app/

# Type checking với mypy
mypy app/
```

## 🎯 Workflow

### 1. Thêm camera mới
```python
POST /api/v1/cameras
{
  "name": "Camera Front",
  "location": "Entrance",
  "source_type": "webcam",
  "source_path": "0"
}
```

### 2. Bật detector
```python
POST /api/v1/detector/1/start
```

### 3. Vẽ parking slots
- Mở frontend: `http://localhost:8000/slot-annotator.html?camera=1`
- Click "Start Drawing"
- Click trên video để vẽ polygon
- Press Enter để hoàn thành
- Click "Save All Slots"

### 4. Theo dõi real-time
- Connect WebSocket: `ws://localhost:8000/ws/1`
- Nhận updates về slot status và detections

## 🐛 Troubleshooting

### Lỗi: "Failed to open camera"
- Kiểm tra `source_path` đúng chưa
- Với webcam: thử "0", "1", "2"
- Với file: dùng forward slash: `C:/videos/test.mp4`
- Với RTSP: kiểm tra credentials và network

### Lỗi: "Database connection failed"
- Kiểm tra MySQL đã chạy: `sudo systemctl status mysql`
- Kiểm tra credentials trong `.env`
- Test connection: `mysql -u root -p`

### Lỗi: YOLOv8 model not found
- Model `yolov8n.pt` sẽ tự động download lần đầu
- Nếu lỗi, download thủ công từ: https://github.com/ultralytics/ultralytics

### Performance thấp
- Giảm resolution của camera
- Tăng `DETECTION_THRESHOLD` trong `.env`
- Sử dụng GPU nếu có (CUDA)
- Giảm số camera chạy đồng thời

## 📊 Database Schema

### Table: `cameras`
```sql
CREATE TABLE cameras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    source_type VARCHAR(20),  -- 'webcam', 'rtsp', 'file'
    source_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Table: `parking_slots`
```sql
CREATE TABLE parking_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    camera_id INT NOT NULL,
    label VARCHAR(50) NOT NULL,
    polygon JSON NOT NULL,  -- [[x1, y1], [x2, y2], ...]
    status ENUM('empty', 'occupied', 'reserved', 'disabled') DEFAULT 'empty',
    last_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);
```

## 🔐 Security

- [ ] Thêm authentication (JWT/OAuth)
- [ ] Rate limiting cho API
- [ ] CORS configuration cho production
- [ ] HTTPS/TLS cho production
- [ ] Input validation với Pydantic
- [ ] SQL injection prevention (SQLAlchemy ORM)

## 📈 Performance Optimization

- **Async I/O**: FastAPI + SQLAlchemy async
- **Connection Pooling**: Database connection pool
- **Frame Skipping**: Process every N frames nếu cần
- **Model Optimization**: YOLOv8n (nano) cho speed
- **Caching**: Redis cho slot status (TODO)
- **Load Balancing**: Nhiều workers với Uvicorn

## 🛣️ Roadmap

- [ ] User authentication & authorization
- [ ] Multi-tenant support
- [ ] Historical data & analytics
- [ ] Vehicle tracking (Deep SORT)
- [ ] License plate recognition
- [ ] Mobile app integration
- [ ] Email/SMS notifications
- [ ] Payment integration
- [ ] Admin dashboard

## 📝 License

MIT License - Xem file LICENSE để biết thêm chi tiết.

## 👥 Contributors

- Your Name - Initial work

## 📞 Support

Nếu gặp vấn đề, hãy tạo issue tại GitHub repository hoặc liên hệ qua email.

---

**Made with ❤️ using FastAPI, YOLOv8, and OpenCV**
