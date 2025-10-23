# 🚗 Smart Parking System

Hệ thống quản lý bãi đỗ xe thông minh sử dụng AI (YOLOv8) và Computer Vision để phát hiện xe và theo dõi trạng thái chỗ đỗ real-time.

![Smart Parking](https://img.shields.io/badge/Smart-Parking-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-cyan)
![YOLOv8](https://img.shields.io/badge/YOLO-v8-red)

## 🎯 Tổng quan

Hệ thống Smart Parking tự động phát hiện xe và quản lý trạng thái chỗ đỗ bằng cách:
1. **Phát hiện xe** bằng YOLOv8 từ video camera
2. **Vẽ polygon** để định nghĩa vị trí các chỗ đỗ
3. **Tính toán occupancy** bằng thuật toán intersection polygon
4. **Cập nhật real-time** qua WebSocket
5. **Hiển thị trực quan** trên web interface

## ✨ Tính năng chính

### Backend (FastAPI + YOLOv8)
- ✅ Multi-camera support - Quản lý nhiều camera đồng thời
- ✅ YOLOv8 detection - Phát hiện xe real-time
- ✅ RESTful API - CRUD operations cho cameras và slots
- ✅ WebSocket - Real-time broadcast detections & slot status
- ✅ Video streaming - MJPEG stream qua HTTP
- ✅ Snapshot API - Static frame capture cho annotation
- ✅ Async database - SQLAlchemy với MySQL
- ✅ Polygon matching - IoU-based occupancy detection

### Frontend (Vanilla JS)
- ✅ Live video streaming - Hiển thị video từ camera
- ✅ Detection overlay - Vẽ bounding boxes của xe (màu đỏ)
- ✅ Camera manager - Thêm/sửa/xóa camera, start/stop detector
- ✅ Slot annotator - Vẽ polygon parking slots với keyboard shortcuts
- ✅ Real-time updates - WebSocket connection cho live data
- ✅ Occupancy visualization - Hiển thị trạng thái chỗ đỗ (TODO)

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │  Main View     │  │ Camera Manager │  │ Slot Annotator │ │
│  │  - Video       │  │  - Add/Edit    │  │  - Draw        │ │
│  │  - Detections  │  │  - Start/Stop  │  │  - Save        │ │
│  │  - Slots       │  │  - Status      │  │  - Undo        │ │
│  └────────────────┘  └────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTP / WebSocket
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │   API    │   │  Stream  │   │   WS     │   │ Detector │ │
│  │  Routes  │   │  Routes  │   │ Manager  │   │ Control  │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘ │
│         │              │              │              │       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Services Layer                          │   │
│  │  - CameraService   - SlotService                     │   │
│  │  - YOLODetector    - WebSocketManager                │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Database (MySQL)                        │   │
│  │  - cameras   - parking_slots                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                       OpenCV / YOLO
                              │
                    ┌─────────────────┐
                    │  Camera Sources │
                    │  - Webcam       │
                    │  - RTSP Stream  │
                    │  - Video File   │
                    └─────────────────┘
```

## 📦 Cấu trúc thư mục

```
smart-parking-lot/
├── backend/                    # Backend API (FastAPI)
│   ├── app/
│   │   ├── core/              # Configuration, Database, Logger
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic (YOLO, WebSocket)
│   │   └── utils/             # Utilities (geometry calculations)
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Unit & integration tests
│   ├── main.py                # Application entry point
│   ├── requirements.txt       # Python dependencies
│   └── README.md              # Backend documentation
│
├── frontend/                   # Frontend (Vanilla JS)
│   ├── main.html              # Live view với video & detections
│   ├── app.js                 # Main app logic
│   ├── camera-manager.html    # Camera management UI
│   ├── camera-manager.js      # Camera CRUD operations
│   ├── slot-annotator.html    # Parking slot drawing tool
│   └── slot-annotator.js      # Polygon drawing logic
│
└── README.md                   # Documentation (file này)
```

## 🚀 Quick Start

### 1. Cài đặt Backend

```bash
# Di chuyển vào thư mục backend
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Setup database
# 1. Tạo database MySQL
mysql -u root -p
CREATE DATABASE smart_parking;
EXIT;

# 2. Copy và config .env
cp .env.example .env
# Chỉnh sửa DATABASE_URL trong .env

# 3. Run migrations
alembic upgrade head

# Khởi động server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: `http://localhost:8000`

### 2. Mở Frontend

```bash
# Mở frontend trong browser
# Option 1: Trực tiếp từ file
start frontend/main.html

# Option 2: Qua HTTP server (recommended)
cd frontend
python -m http.server 8080
```

Frontend: `http://localhost:8080/main.html`

### 3. Workflow sử dụng

#### Bước 1: Thêm Camera
1. Mở Camera Manager: `http://localhost:8080/camera-manager.html`
2. Click "Add Camera"
3. Nhập thông tin:
   - Name: "Camera Entrance"
   - Location: "Main Gate"
   - Source Type: "webcam" / "rtsp" / "file"
   - Source Path: "0" (webcam) hoặc đường dẫn
4. Click "Add Camera"

#### Bước 2: Start Detector
1. Trong Camera Manager, tìm camera vừa tạo
2. Click nút "▶ Start" để bật detector
3. Kiểm tra status chuyển sang "🟢 Running"

#### Bước 3: Vẽ Parking Slots
1. Click nút "🎨 Draw Parking Slots" bên cạnh camera
2. Trang Slot Annotator sẽ mở ra
3. Click "Start Drawing"
4. Click trên video để vẽ polygon (ít nhất 3 điểm)
5. Keyboard shortcuts:
   - **Enter/Space**: Hoàn thành polygon
   - **Esc**: Hủy polygon hiện tại
   - **Backspace**: Undo điểm cuối
6. Click "Save All Slots" để lưu vào database

#### Bước 4: Xem Live View
1. Mở Main View: `http://localhost:8080/main.html`
2. Chọn camera từ dropdown
3. Xem:
   - Video stream real-time
   - Red bounding boxes của xe được detect
   - Parking slot status (TODO: hiển thị polygons)

## 📚 Documentation

### Backend API
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **README**: [backend/README.md](backend/README.md)

### Key Endpoints

```http
# Cameras
GET    /api/v1/cameras                     # List cameras
POST   /api/v1/cameras                     # Create camera
GET    /api/v1/cameras/{id}                # Get camera
PUT    /api/v1/cameras/{id}                # Update camera
DELETE /api/v1/cameras/{id}                # Delete camera

# Parking Slots
GET    /api/v1/slots                       # List all slots
POST   /api/v1/slots                       # Create slot
GET    /api/v1/slots/camera/{camera_id}    # Get slots by camera
DELETE /api/v1/slots/{id}                  # Delete slot

# Detector Control
POST   /api/v1/detector/{camera_id}/start  # Start detector
POST   /api/v1/detector/{camera_id}/stop   # Stop detector
GET    /api/v1/detector/{camera_id}/status # Get status

# Streaming
GET    /api/v1/stream/{camera_id}          # MJPEG stream
GET    /api/v1/stream/{camera_id}/snapshot # Static frame

# WebSocket
WS     /ws/{camera_id}                     # Real-time updates
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.104
- **AI/ML**: YOLOv8 (Ultralytics)
- **Computer Vision**: OpenCV
- **Database**: MySQL 8.0 + SQLAlchemy (async)
- **Migrations**: Alembic
- **Validation**: Pydantic
- **WebSocket**: FastAPI WebSocket support
- **Async**: asyncio, aiomysql

### Frontend
- **HTML5 + CSS3**: Modern web interface
- **Vanilla JavaScript**: No frameworks (lightweight)
- **Canvas API**: Polygon drawing
- **WebSocket API**: Real-time communication
- **Fetch API**: HTTP requests

## 📊 Data Flow

### Detection Flow
```
Camera → OpenCV → YOLOv8 → Detections (bbox) → 
Polygon Matching → Slot Status Update → 
WebSocket Broadcast → Frontend Update
```

### Polygon Matching Algorithm
```python
for detection in detections:
    detection_polygon = bbox_to_polygon(detection.bbox)
    
    for slot in parking_slots:
        intersection = detection_polygon.intersection(slot.polygon)
        iou = intersection.area / slot.polygon.area
        
        if iou > THRESHOLD:  # e.g., 0.3
            slot.status = 'occupied'
        else:
            slot.status = 'empty'
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# With coverage
pytest --cov=app tests/

# Specific test
pytest tests/test_camera_routes.py -v
```

## 🐛 Troubleshooting

### Backend không start
```bash
# Kiểm tra Python version
python --version  # Phải >= 3.10

# Kiểm tra MySQL running
mysql -u root -p

# Kiểm tra .env file
cat .env  # Xem DATABASE_URL đúng chưa
```

### Camera không mở được
```bash
# Webcam: Thử các index khác nhau
# source_path: "0", "1", "2"

# File: Dùng forward slash
# ✅ "C:/videos/test.mp4"
# ❌ "C:\videos\test.mp4"

# RTSP: Kiểm tra network
# rtsp://admin:password@192.168.1.100:554/stream
```

### Detector không chạy
```bash
# Kiểm tra model file
ls backend/yolov8n.pt

# Nếu không có, sẽ tự download lần đầu
# Hoặc download thủ công từ:
# https://github.com/ultralytics/ultralytics
```

### WebSocket disconnect
```bash
# Kiểm tra CORS settings trong backend/main.py
# Kiểm tra firewall không block port 8000
```

## 🔐 Security Considerations

**⚠️ Lưu ý: Đây là bản development**

Cho production, cần thêm:
- [ ] Authentication & Authorization (JWT)
- [ ] HTTPS/TLS encryption
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CORS configuration
- [ ] Environment variables security
- [ ] Database credentials management

## 📈 Performance Tips

### Backend Optimization
- Giảm FPS xử lý (process every N frames)
- Sử dụng YOLOv8n (nano) thay vì YOLOv8x
- Enable GPU nếu có CUDA
- Tăng `DETECTION_THRESHOLD` trong .env
- Dùng connection pooling cho database

### Frontend Optimization
- Throttle WebSocket updates
- Canvas rendering optimization
- Debounce resize events
- Lazy load components

## 🛣️ Roadmap

### Phase 1: Core Features ✅
- [x] Multi-camera support
- [x] YOLOv8 integration
- [x] Video streaming
- [x] Slot annotation tool
- [x] WebSocket real-time updates
- [x] Detection visualization

### Phase 2: Enhancement 🚧
- [ ] Slot polygon rendering on live view
- [ ] Occupancy status colors
- [ ] Vehicle tracking (Deep SORT)
- [ ] Historical data & analytics
- [ ] Dashboard statistics

### Phase 3: Advanced 📅
- [ ] License plate recognition
- [ ] Payment integration
- [ ] Mobile app
- [ ] Email/SMS notifications
- [ ] Multi-tenant support
- [ ] Admin panel

## 📝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Authors

- **Your Name** - Initial work

## 🙏 Acknowledgments

- [YOLOv8](https://github.com/ultralytics/ultralytics) - Object detection
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [OpenCV](https://opencv.org/) - Computer vision
- [Shapely](https://shapely.readthedocs.io/) - Polygon operations

## 📞 Support

Nếu có vấn đề hoặc câu hỏi:
- Tạo issue trên GitHub
- Email: your.email@example.com
- Documentation: [Xem backend/README.md](backend/README.md)

---

**🚀 Made with ❤️ using FastAPI, YOLOv8, and OpenCV**

**⭐ Nếu project này hữu ích, hãy cho một star!**
