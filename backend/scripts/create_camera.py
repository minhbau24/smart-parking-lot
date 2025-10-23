"""
Script để tạo camera mới trong hệ thống Smart Parking

Chạy: python scripts/create_camera.py
"""

import requests
import json

API_BASE = "http://localhost:8000/api/v1"

def create_camera(name, location, stream_url):
    """
    Tạo camera mới
    
    Args:
        name: Tên camera
        location: Vị trí camera
        stream_url: Đường dẫn stream
            - "0" hoặc "1" cho webcam
            - "rtsp://username:password@ip:554/stream" cho camera IP
            - "c:/path/to/video.mp4" cho file video
    
    Returns:
        Camera object nếu thành công, None nếu lỗi
    """
    url = f"{API_BASE}/cameras/"
    data = {
        "name": name,
        "location": location,
        "stream_url": stream_url,
        "status": "active"
    }
    
    print(f"🔧 Creating camera: {name}")
    print(f"   Location: {location}")
    print(f"   Stream URL: {stream_url}")
    
    try:
        response = requests.post(url, json=data)
        
        if response.status_code == 200:
            camera = response.json()
            print(f"\n✅ Camera created successfully!")
            print(f"   Camera ID: {camera['id']}")
            print(f"   Name: {camera['name']}")
            print(f"   Stream URL: {camera['stream_url']}")
            print(f"\n💡 Nhớ Camera ID này để dùng cho các bước tiếp theo!")
            return camera
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"   {response.text}")
            return None
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        print("   Đảm bảo backend đang chạy tại http://localhost:8000")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("🎥 SMART PARKING - CREATE CAMERA")
    print("=" * 60)
    print("\nChọn loại camera:")
    print("  1. Webcam (camera laptop/USB)")
    print("  2. Camera IP/RTSP")
    print("  3. File video test")
    print("  4. Tùy chỉnh")
    
    choice = input("\nNhập lựa chọn (1-4): ").strip()
    
    if choice == "1":
        # Webcam
        print("\n📹 Sử dụng webcam")
        cam_index = input("Nhập số camera (0=mặc định, 1,2... cho USB camera): ").strip() or "0"
        
        camera = create_camera(
            name=f"Webcam {cam_index}",
            location="Local",
            stream_url=cam_index
        )
        
    elif choice == "2":
        # RTSP Camera
        print("\n🌐 Camera IP/RTSP")
        print("Ví dụ: rtsp://admin:admin123@192.168.1.100:554/live")
        
        username = input("Username: ").strip()
        password = input("Password: ").strip()
        ip = input("IP Address: ").strip()
        port = input("Port (554): ").strip() or "554"
        path = input("Stream path (/live): ").strip() or "/live"
        
        stream_url = f"rtsp://{username}:{password}@{ip}:{port}{path}"
        
        name = input("Tên camera: ").strip() or "Camera RTSP"
        location = input("Vị trí: ").strip() or "Unknown"
        
        camera = create_camera(
            name=name,
            location=location,
            stream_url=stream_url
        )
        
    elif choice == "3":
        # Video file
        print("\n📹 File video test")
        print("Ví dụ: c:/Users/luumi/Videos/parking_test.mp4")
        
        video_path = input("Đường dẫn video: ").strip()
        
        if not video_path:
            print("❌ Cần nhập đường dẫn video!")
        else:
            camera = create_camera(
                name="Video Test",
                location="Test",
                stream_url=video_path
            )
            
    elif choice == "4":
        # Custom
        print("\n⚙️ Tùy chỉnh")
        name = input("Tên camera: ").strip()
        location = input("Vị trí: ").strip()
        stream_url = input("Stream URL: ").strip()
        
        if name and location and stream_url:
            camera = create_camera(name, location, stream_url)
        else:
            print("❌ Cần nhập đầy đủ thông tin!")
    else:
        print("❌ Lựa chọn không hợp lệ!")
    
    print("\n" + "=" * 60)
