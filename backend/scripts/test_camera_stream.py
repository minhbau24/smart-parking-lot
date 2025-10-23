"""
Script để test camera stream trước khi tạo trong hệ thống

Chạy: python scripts/test_camera_stream.py
"""

import cv2
import sys

def test_stream(stream_url):
    """
    Test xem camera stream có hoạt động không
    
    Args:
        stream_url: Đường dẫn stream
            - "0" hoặc "1" cho webcam
            - "rtsp://username:password@ip:554/stream" cho camera IP
            - "c:/path/to/video.mp4" cho file video
    """
    print(f"🔧 Testing stream: {stream_url}")
    
    # Thử mở stream
    if stream_url.isdigit():
        cap = cv2.VideoCapture(int(stream_url))
    else:
        cap = cv2.VideoCapture(stream_url)
    
    if not cap.isOpened():
        print(f"❌ FAILED: Không thể mở stream!")
        print("\nKiểm tra:")
        print("  - Webcam: Đảm bảo camera không bị app khác sử dụng")
        print("  - RTSP: Kiểm tra username, password, IP, port")
        print("  - Video file: Kiểm tra đường dẫn file có đúng không")
        return False
    
    # Đọc thông tin stream
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    
    print(f"\n✅ SUCCESS: Stream opened successfully!")
    print(f"   Resolution: {width}x{height}")
    print(f"   FPS: {fps}")
    
    # Thử đọc frame
    ret, frame = cap.read()
    
    if not ret:
        print(f"\n⚠️ WARNING: Không thể đọc frame từ stream!")
        cap.release()
        return False
    
    print(f"   Frame shape: {frame.shape}")
    print(f"\n✅ Stream is working perfectly!")
    
    # Hiển thị preview
    print("\n📺 Đang hiển thị preview...")
    print("   Nhấn 'q' để thoát")
    
    cv2.namedWindow("Stream Preview", cv2.WINDOW_NORMAL)
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("\n⚠️ Stream ended or error reading frame")
            break
        
        frame_count += 1
        
        # Hiển thị thông tin
        cv2.putText(frame, f"Frame: {frame_count}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, f"Size: {width}x{height}", (10, 70),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, "Press 'q' to quit", (10, 110),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        cv2.imshow("Stream Preview", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    
    print("\n✅ Test completed!")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("🎥 SMART PARKING - TEST CAMERA STREAM")
    print("=" * 60)
    print("\nScript này giúp bạn test camera trước khi thêm vào hệ thống")
    print("\nChọn loại stream:")
    print("  1. Webcam (0, 1, 2...)")
    print("  2. Camera IP/RTSP")
    print("  3. File video")
    print("  4. Nhập URL tùy chỉnh")
    
    choice = input("\nNhập lựa chọn (1-4): ").strip()
    
    stream_url = None
    
    if choice == "1":
        # Webcam
        cam_index = input("Nhập số camera (0=mặc định): ").strip() or "0"
        stream_url = cam_index
        
    elif choice == "2":
        # RTSP
        print("\nNhập thông tin RTSP camera:")
        username = input("  Username: ").strip()
        password = input("  Password: ").strip()
        ip = input("  IP Address: ").strip()
        port = input("  Port (554): ").strip() or "554"
        path = input("  Path (/live): ").strip() or "/live"
        
        stream_url = f"rtsp://{username}:{password}@{ip}:{port}{path}"
        
    elif choice == "3":
        # Video file
        stream_url = input("\nĐường dẫn file video: ").strip()
        
    elif choice == "4":
        # Custom
        stream_url = input("\nNhập Stream URL: ").strip()
    
    else:
        print("❌ Lựa chọn không hợp lệ!")
        sys.exit(1)
    
    if stream_url:
        print("\n" + "=" * 60)
        test_stream(stream_url)
        print("=" * 60)
        
        print("\n💡 Nếu test thành công, bạn có thể:")
        print("   1. Tạo camera với stream URL này: python scripts/create_camera.py")
        print("   2. Hoặc dùng URL này trong main.py khi kích hoạt YOLO")
    else:
        print("❌ Stream URL không hợp lệ!")
