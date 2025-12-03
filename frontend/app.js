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

        // Video dimensions for coordinate scaling
        this.videoWidth = 1280;  // Original video width (from naturalWidth)
        this.videoHeight = 720;  // Original video height (from naturalHeight)

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

        // Auto-start detector for this camera
        this.startDetector(this.currentCameraId);
    }

    async startDetector(cameraId) {
        try {
            console.log(`Starting detector for camera ${cameraId}...`);
            const response = await fetch(`${this.apiBase}/detector/${cameraId}/start`, {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Detector started:', result);
            } else {
                const error = await response.json();
                console.warn('⚠️ Detector already running or error:', error);
            }
        } catch (error) {
            console.error('❌ Error starting detector:', error);
        }
    }

    initCanvas() {
        // Resize when video metadata loads (get original dimensions)
        this.videoImg.addEventListener('loadedmetadata', () => {
            this.videoWidth = this.videoImg.naturalWidth || 1280;
            this.videoHeight = this.videoImg.naturalHeight || 720;
            console.log(`Video dimensions: ${this.videoWidth}x${this.videoHeight}`);
            this.resizeCanvas();
        });

        // Also resize when video loads
        this.videoImg.addEventListener('load', () => {
            this.resizeCanvas();
        });

        // Resize on window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Update canvas size periodically
        setInterval(() => {
            this.resizeCanvas();
        }, 1000);
    }

    resizeCanvas() {
        // Wait for video to have dimensions
        if (this.videoImg.naturalWidth === 0 || this.videoImg.naturalHeight === 0) {
            return; // Video not loaded yet
        }

        // Get actual displayed video size (after object-fit: contain)
        const displayWidth = this.videoImg.clientWidth;
        const displayHeight = this.videoImg.clientHeight;

        if (displayWidth > 0 && displayHeight > 0) {
            // Update canvas to match displayed video
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
            this.canvas.style.width = displayWidth + 'px';
            this.canvas.style.height = displayHeight + 'px';

            // Update original dimensions for scaling
            this.videoWidth = this.videoImg.naturalWidth;
            this.videoHeight = this.videoImg.naturalHeight;
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

            console.log(`Received ${this.latestDetections.length} detections, ${this.latestSlots.length} slots`);

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
        } else if (data.type === 'detector_event') {
            console.log(`Detector event for camera ${data.camera_id}: ${data.event}`);

            if (data.event === 'started') {
                // Reset state when detector restarts
                console.log('🔄 Detector restarted, clearing buffers');
                this.latestDetections = [];
                this.latestSlots = [];
                this.lastDetectionTime = 0;

                // Clear canvas
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

                // Reset stats
                this.stats = { total: 0, empty: 0, occupied: 0 };
                this.updateStats([]);
            } else if (data.event === 'stopped') {
                console.log('⏹️ Detector stopped');
                // Clear display
                this.latestDetections = [];
                this.latestSlots = [];
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
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
        // if (this.latestDetections && this.latestDetections.length > 0) {
        //     this.latestDetections.forEach(detection => {
        //         this.drawDetectionBox(detection);
        //     });
        // }

        // Draw slot indicators (if slot polygons available)
        if (this.latestSlots && this.latestSlots.length > 0) {
            this.latestSlots.forEach(slot => {
                // TODO: Draw actual slot polygons from DB
                this.drawSlotIndicator(slot);
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
        try {
            // Parse polygon from database (format: [[x1,y1], [x2,y2], ...] or JSON string)
            const polygon = typeof slot.polygon === 'string'
                ? JSON.parse(slot.polygon)
                : slot.polygon;

            if (!polygon || polygon.length < 3) {
                console.warn('Invalid polygon for slot:', slot);
                return;
            }

            console.log(`Drawing slot ${slot.label} with ${polygon.length} points`, polygon);

            // Calculate scale factors: original video coords → canvas display coords
            const scaleX = this.canvas.width / this.videoWidth;
            const scaleY = this.canvas.height / this.videoHeight;

            console.log(`Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}, Canvas: ${this.canvas.width}x${this.canvas.height}, Video: ${this.videoWidth}x${this.videoHeight}`);

            // Draw polygon path
            this.ctx.beginPath();
            const firstPoint = polygon[0];
            this.ctx.moveTo(firstPoint[0] * scaleX, firstPoint[1] * scaleY);

            for (let i = 1; i < polygon.length; i++) {
                this.ctx.lineTo(polygon[i][0] * scaleX, polygon[i][1] * scaleY);
            }
            this.ctx.closePath();

            // Style based on occupancy status
            if (slot.status === 'occupied') {
                this.ctx.strokeStyle = '#f44336';  // Red
                this.ctx.fillStyle = 'rgba(244, 67, 54, 0.3)';
            } else {
                this.ctx.strokeStyle = '#4CAF50';  // Green
                this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            }

            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.fill();

            // Draw slot label at polygon center
            const centerX = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
            const centerY = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

            // Label with black outline for visibility
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Draw text outline
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 4;
            this.ctx.strokeText(slot.label, centerX * scaleX, centerY * scaleY);

            // Draw text fill
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(slot.label, centerX * scaleX, centerY * scaleY);

        } catch (error) {
            console.error('Error drawing slot indicator:', error, slot);
        }
    }
}

// Initialize app when page loads
window.addEventListener('DOMContentLoaded', () => {
    new SmartParkingApp();
});