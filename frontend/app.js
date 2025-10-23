class SmartParkingApp {
    constructor() {
        // API config
        this.apiBase = 'http://localhost:8000/api/v1';

        // Elements
        this.canvas = document.getElementById('overlay-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.videoImg = document.getElementById('camera-feed');
        this.cameraSelect = document.getElementById('camera-select');

        // Current camera
        this.currentCameraId = null;

        // WebSocket
        this.ws = null;
        this.wsUrl = 'ws://localhost:8000/ws';

        // Detection data (store latest only)
        this.latestDetections = [];
        this.latestSlots = [];
        this.lastDetectionTime = 0;

        // Stats
        this.stats = {
            total: 0,
            empty: 0,
            occupied: 0
        };

        // Init
        this.loadCameras();
        this.initCanvas();
        this.initCameraSelector();
        this.connectWebSocket();
        this.startRenderLoop();

        console.log('Smart Parking App initialized');
    }

    async loadCameras() {
        try {
            const response = await fetch(`${this.apiBase}/cameras-active/`);
            if (!response.ok) throw new Error('Failed to load cameras');

            const cameras = await response.json();

            // Populate camera selector
            this.cameraSelect.innerHTML = cameras.length > 0
                ? cameras.map(camera =>
                    `<option value="${camera.id}">${camera.name} (ID: ${camera.id})</option>`
                ).join('')
                : '<option value="">No cameras available</option>';

            // Select first camera or from URL param
            const urlParams = new URLSearchParams(window.location.search);
            const cameraParam = urlParams.get('camera');

            if (cameraParam && cameras.some(c => c.id == cameraParam)) {
                this.cameraSelect.value = cameraParam;
            } else if (cameras.length > 0) {
                this.cameraSelect.value = cameras[0].id;
            }

            // Load selected camera stream
            this.selectCamera(this.cameraSelect.value);

        } catch (error) {
            console.error('Error loading cameras:', error);
            this.cameraSelect.innerHTML = '<option value="">Error loading cameras</option>';
        }
    }

    initCameraSelector() {
        this.cameraSelect.addEventListener('change', (e) => {
            this.selectCamera(e.target.value);
        });
    }

    selectCamera(cameraId) {
        if (!cameraId) return;

        this.currentCameraId = parseInt(cameraId);

        // Update video stream URL
        const streamUrl = `${this.apiBase}/stream/${this.currentCameraId}`;
        this.videoImg.src = streamUrl;
        this.videoImg.style.display = 'block';

        console.log(`Switched to camera ${this.currentCameraId}`);
    }

    initCanvas() {
        // Match canvas size with video when it loads
        this.videoImg.addEventListener('load', () => {
            this.resizeCanvas();
        });

        // Also resize on window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Update canvas size periodically (for dynamic video loading)
        setInterval(() => {
            this.resizeCanvas();
        }, 1000);
    }

    resizeCanvas() {
        // Get actual rendered video dimensions
        const videoWidth = this.videoImg.clientWidth;
        const videoHeight = this.videoImg.clientHeight;

        if (videoWidth > 0 && videoHeight > 0) {
            this.canvas.width = videoWidth;
            this.canvas.height = videoHeight;
            this.canvas.style.width = videoWidth + 'px';
            this.canvas.style.height = videoHeight + 'px';
        }
    }

    connectWebSocket() {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            document.getElementById('ws-status').textContent = 'Connected';
            document.getElementById('ws-status').style.color = '#4CAF50';
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            document.getElementById('ws-status').textContent = 'Disconnected';
            document.getElementById('ws-status').style.color = '#f44336';

            // Reconnect after 3s
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleMessage(data) {
        if (data.type === 'slot_update') {
            // Store latest detections directly (no frame sync needed)
            this.latestDetections = data.detections || [];
            this.latestSlots = data.slots || [];

            console.log(`Received ${this.latestDetections.length} detections`);

            // Update stats
            this.updateStats(data.slots);

            // Update last update time
            document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

            // Calculate FPS
            const now = Date.now();
            if (this.lastDetectionTime > 0) {
                const fps = 1000 / (now - this.lastDetectionTime);
                document.getElementById('detection-fps').textContent = fps.toFixed(1);
            }
            this.lastDetectionTime = now;
        }
    }

    estimateFrameId(timestamp) {
        // Estimate frame ID from video time (assuming 30 FPS)
        const videoTime = this.videoImg.currentTime || (Date.now() / 1000);
        return Math.floor(videoTime * 30);
    }

    updateStats(slots) {
        // Count stats
        let empty = 0, occupied = 0;
        slots.forEach(slot => {
            if (slot.status === 'empty') empty++;
            else if (slot.status === 'occupied') occupied++;
        });

        this.stats = {
            total: slots.length,
            empty: empty,
            occupied: occupied
        };

        // Update UI
        document.getElementById('total-slots').textContent = this.stats.total;
        document.getElementById('empty-slots').textContent = this.stats.empty;
        document.getElementById('occupied-slots').textContent = this.stats.occupied;
    }

    startRenderLoop() {
        // Render boxes on canvas at 30 FPS
        setInterval(() => this.renderBoxes(), 1000 / 30);

        console.log('Render loop started');
    }

    renderBoxes() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw latest detection bboxes (vehicles detected by YOLO)
        if (this.latestDetections && this.latestDetections.length > 0) {
            this.latestDetections.forEach(detection => {
                this.drawDetectionBox(detection);
            });
        }

        // Draw slot indicators (if slot polygons available)
        if (this.latestSlots && this.latestSlots.length > 0) {
            this.latestSlots.forEach(slot => {
                // TODO: Draw actual slot polygons from DB
                // this.drawSlotIndicator(slot);
            });
        }
    }

    drawDetectionBox(detection) {
        try {
            // Detection bbox is in YOLO xywh format (center_x, center_y, width, height)
            const [centerX, centerY, width, height] = detection.bbox;

            // Convert to top-left corner coordinates
            const x = centerX - width / 2;
            const y = centerY - height / 2;

            // Get original video dimensions
            const imgWidth = this.videoImg.naturalWidth || 640;
            const imgHeight = this.videoImg.naturalHeight || 480;

            // Scale to canvas size (which matches displayed video size)
            const scaleX = this.canvas.width / imgWidth;
            const scaleY = this.canvas.height / imgHeight;

            const scaledX = x * scaleX;
            const scaledY = y * scaleY;
            const scaledW = width * scaleX;
            const scaledH = height * scaleY;

            // Draw bounding box with thick red stroke
            this.ctx.strokeStyle = '#FF0000';  // Red color
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

            // Draw semi-transparent fill
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            this.ctx.fillRect(scaledX, scaledY, scaledW, scaledH);

            // Draw label background
            const label = `${detection.class_name} ${(detection.confidence * 100).toFixed(0)}%`;
            this.ctx.font = 'bold 16px Arial';
            const textMetrics = this.ctx.measureText(label);
            const textHeight = 24;
            const padding = 6;

            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            this.ctx.fillRect(scaledX, scaledY - textHeight - padding, textMetrics.width + padding * 2, textHeight);

            // Draw label text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(label, scaledX + padding, scaledY - padding - 4);

        } catch (error) {
            console.error('Error drawing detection box:', error);
        }
    }

    drawSlotIndicator(slot) {
        // This is a placeholder - you'll need actual polygon coordinates
        // For demo, just show slot status
        const color = slot.status === 'occupied' ? '#f44336' : '#4CAF50';

        // Draw a sample box (replace with actual polygon from DB)
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(50, 50, 100, 150); // Placeholder position

        // Draw slot label
        this.ctx.fillStyle = color;
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Slot ${slot.slot_id}`, 60, 70);
    }
}

// Initialize app when page loads
window.addEventListener('DOMContentLoaded', () => {
    new SmartParkingApp();
});