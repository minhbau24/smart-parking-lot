# 🚀 Hướng Dẫn Kích Hoạt Camera Feed

## ❌ Vấn Đề: "No active camera feed"

Khi bạn thấy thông báo này, nghĩa là camera **chưa được kích hoạt đúng cách**.

---

## ✅ Điều Kiện Để Camera Feed Hoạt Động

### **1. Backend Đang Chạy**

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API phải chạy tại: `http://localhost:8000`
- Kiểm tra: Mở `http://localhost:8000/docs`

### **2. Camera Đã Được Tạo**

- Vào trang **Cameras** → Click **Add Camera**
- Điền thông tin:
  - **Name**: "Camera Front"
  - **Location**: "Main Gate"
  - **Source Type**:
    - `webcam` → Source: `0` hoặc `1` (webcam máy tính)
    - `rtsp` → Source: `rtsp://username:password@ip:port/stream`
    - `file` → Source: `C:/videos/parking.mp4`

### **3. Detector Phải Được START** ⚠️ **QUAN TRỌNG NHẤT**

#### Cách 1: Tự động (Khi vào Dashboard)

- Chọn camera từ dropdown
- Component `LiveView` sẽ **tự động start detector**
- Xem button **Start/Stop** trong header video

#### Cách 2: Thủ công (Từ trang Cameras)

- Vào trang **Cameras**
- Click button **View Live** trên camera card
- Hoặc dùng API:

```bash
curl -X POST http://localhost:8000/api/v1/detector/1/start
```

### **4. Video Stream Phải Khả Dụng**

- Backend detector thread phải đang đọc frames từ camera
- Kiểm tra logs backend:

```
✅ Started YOLO detector for camera 1
✅ Loaded YOLO model: yolov8n.pt
✅ Using webcam index: 0
```

---

## 🔍 Cách Kiểm Tra Từng Bước

### **Bước 1: Kiểm tra Backend**

```bash
# Terminal backend
cd backend
uvicorn main:app --reload

# Logs phải hiện:
# INFO: Application startup complete
# INFO: Uvicorn running on http://0.0.0.0:8000
```

### **Bước 2: Kiểm tra Cameras**

```bash
# Mở browser: http://localhost:8000/docs
# Test endpoint: GET /api/v1/cameras
# Phải trả về danh sách cameras
```

### **Bước 3: Start Detector**

**Từ Frontend:**

1. Mở Dashboard: `http://localhost:5173`
2. Chọn camera từ dropdown
3. Xem button "Start" → Click nếu detector chưa chạy
4. Chờ 2-3 giây

**Hoặc từ API:**

```bash
curl -X POST http://localhost:8000/api/v1/detector/1/start
```

**Kiểm tra logs backend:**

```
INFO: Initialized YOLO detector for camera 1
INFO: Loaded YOLO model: yolov8n.pt
INFO: Camera FPS: 30
INFO: Started YOLO detector for camera 1
```

### **Bước 4: Kiểm tra Video Stream**

Mở browser: `http://localhost:8000/api/v1/stream/1`

- Nếu thấy video → ✅ Stream OK
- Nếu error → ❌ Camera source không hợp lệ

### **Bước 5: Kiểm tra WebSocket**

Mở Console trong browser (F12):

```
✅ WebSocket connected to camera 1
✅ Received slot_update message
```

---

## 🐛 Troubleshooting

### Lỗi: "Failed to open camera"

**Nguyên nhân:**

- Webcam không tồn tại hoặc đang được dùng bởi app khác
- RTSP URL sai
- File path không tồn tại

**Giải pháp:**

```bash
# Webcam: Thử các index khác
Source: "0", "1", "2"

# RTSP: Kiểm tra format
Source: "rtsp://admin:password@192.168.1.100:554/stream1"

# File: Dùng forward slash
Source: "C:/videos/parking.mp4" ✅
Source: "C:\videos\parking.mp4" ❌
```

### Lỗi: "Detector not running"

**Nguyên nhân:**

- Chưa start detector
- Detector bị crash

**Giải pháp:**

1. Click button **Start** trong Dashboard
2. Hoặc restart detector:

```bash
curl -X POST http://localhost:8000/api/v1/detector/1/stop
curl -X POST http://localhost:8000/api/v1/detector/1/start
```

### Lỗi: "WebSocket disconnected"

**Nguyên nhân:**

- Backend không chạy
- CORS issue
- Network issue

**Giải pháp:**

1. Kiểm tra backend đang chạy
2. Kiểm tra `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
```

3. Restart frontend:

```bash
npm run dev
```

### Video không hiển thị

**Nguyên nhân:**

- Stream URL sai
- Browser không hỗ trợ MJPEG
- Detector chưa chạy

**Giải pháp:**

1. Kiểm tra stream trực tiếp: `http://localhost:8000/api/v1/stream/1`
2. Xem Console logs (F12)
3. Kiểm tra detector status:

```bash
curl http://localhost:8000/api/v1/detector/1/status
```

---

## 📊 Flow Hoạt Động Đầy Đủ

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER: Tạo camera từ Cameras page                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. USER: Click "View Live" hoặc chọn trong Dashboard   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. FRONTEND: LiveView component mount                   │
│    → Auto call startDetector(camera_id)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. BACKEND: POST /api/v1/detector/1/start               │
│    → Initialize YOLODetector                            │
│    → Start background thread                            │
│    → Open cv2.VideoCapture                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. BACKEND THREAD: Loop forever                         │
│    → Read frame from camera                             │
│    → Run YOLO detection every N frames                  │
│    → Match detections with slots                        │
│    → Update database                                    │
│    → Broadcast via WebSocket                            │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. FRONTEND: Receive WebSocket messages                │
│    → Update detections & slots state                    │
│    → Render on canvas overlay                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. FRONTEND: Display video stream                       │
│    → <img src="/api/v1/stream/1" />                     │
│    → MJPEG stream rendering                             │
│    → Canvas overlay with boxes & polygons               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Checklist Hoàn Chỉnh

### Backend Setup

- [ ] Backend đang chạy: `http://localhost:8000`
- [ ] Database đã được migrate: `alembic upgrade head`
- [ ] Model YOLOv8 đã tải: `yolov8n.pt` có trong thư mục backend
- [ ] Camera source hợp lệ (webcam hoạt động hoặc RTSP accessible)

### Frontend Setup

- [ ] Frontend đang chạy: `http://localhost:5173`
- [ ] File `.env` đã cấu hình đúng
- [ ] Cameras đã được tạo trong database
- [ ] Camera đã chọn trong Dashboard dropdown

### Detector Status

- [ ] Detector đã được start (button "Stop" hiển thị = đang chạy)
- [ ] WebSocket status: "Connected" (màu xanh)
- [ ] Backend logs không có error
- [ ] Video stream hiển thị trong Dashboard

### Testing

- [ ] Mở `http://localhost:8000/api/v1/stream/1` → thấy video
- [ ] Console logs: "✅ WebSocket connected to camera 1"
- [ ] Stats panel hiển thị số detections > 0
- [ ] Boxes đỏ xuất hiện khi có xe (nếu đã vẽ slots)

---

## 💡 Tips

### 1. Sử dụng Webcam

```bash
# Windows: Thường là index 0
Source: "0"

# Multiple webcams: Thử index 1, 2, 3
Source: "1"
```

### 2. Test với Video File

```bash
# Download video test
# Đặt vào: C:/videos/parking.mp4
Source: "C:/videos/parking.mp4"
```

### 3. Check Detector Status

```bash
# API endpoint
GET http://localhost:8000/api/v1/detector/1/status

# Response:
{
  "camera_id": 1,
  "running": true,
  "frame_id": 1234
}
```

### 4. Restart Detector Nếu Cần

```bash
# Stop
curl -X POST http://localhost:8000/api/v1/detector/1/stop

# Start
curl -X POST http://localhost:8000/api/v1/detector/1/start
```

---

## 📞 Support

Nếu vẫn gặp vấn đề:

1. Check backend logs (terminal chạy uvicorn)
2. Check browser console (F12)
3. Check network tab để xem API calls
4. Kiểm tra `http://localhost:8000/docs` để test API thủ công

---

**Tóm lại: Chỉ cần START DETECTOR là camera sẽ hoạt động!** 🚀
