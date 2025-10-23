class CameraManager {
    constructor() {
        this.apiBase = 'http://localhost:8000/api/v1';
        this.currentStreamType = 'webcam';

        this.initEventListeners();
        this.loadCameras();
    }

    initEventListeners() {
        // Stream type selector
        document.querySelectorAll('.stream-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectStreamType(e.currentTarget.dataset.type);
            });
        });

        // Form submit
        document.getElementById('add-camera-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCamera();
        });

        // Test stream button
        // document.getElementById('test-stream-btn').addEventListener('click', () => {
        //     this.testStream();
        // });
    }

    selectStreamType(type) {
        this.currentStreamType = type;

        // Update UI
        document.querySelectorAll('.stream-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // Show/hide fields
        document.querySelectorAll('.conditional-fields').forEach(field => {
            field.classList.remove('active');
        });
        document.getElementById(`${type}-fields`).classList.add('active');
    }

    buildStreamUrl() {
        switch (this.currentStreamType) {
            case 'webcam':
                return document.getElementById('webcam-index').value;

            case 'rtsp':
                // const username = document.getElementById('rtsp-username').value;
                // const password = document.getElementById('rtsp-password').value;
                const ip = document.getElementById('rtsp-ip').value;
                // const port = document.getElementById('rtsp-port').value || '554';
                // const path = document.getElementById('rtsp-path').value || '/live';

                // if (!ip) {
                //     throw new Error('IP Address is required for RTSP camera');
                // }

                // if (username && password) {
                //     return `rtsp://${username}:${password}@${ip}:${port}${path}`;
                // } else {
                //     return `rtsp://${ip}:${port}${path}`;
                // }
                return `http://${ip}`;

            case 'file':
                const filePath = document.getElementById('file-path').value;
                if (!filePath) {
                    throw new Error('File path is required');
                }
                return filePath;

            default:
                throw new Error('Unknown stream type');
        }
    }

    // async testStream() {
    //     try {
    //         const streamUrl = this.buildStreamUrl();

    //         this.showAlert('info', '🧪 Testing stream connection...', 'testing');

    //         // TODO: Add actual stream test via backend API
    //         // For now, just show success after delay
    //         setTimeout(() => {
    //             this.showAlert('success', `✅ Stream URL valid: ${streamUrl}`);
    //             document.getElementById('testing')?.remove();
    //         }, 1500);

    //     } catch (error) {
    //         this.showAlert('error', `❌ Error: ${error.message}`);
    //     }
    // }

    async addCamera() {
        try {
            const name = document.getElementById('camera-name').value;
            const location = document.getElementById('camera-location').value;
            const status = document.getElementById('camera-status').value;
            const streamUrl = this.buildStreamUrl();

            if (!name) {
                throw new Error('Camera name is required');
            }

            this.showAlert('info', '⏳ Adding camera...', 'adding');

            const response = await fetch(`${this.apiBase}/cameras/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    location: location || 'Unknown',
                    stream_url: streamUrl,
                    source_type: this.currentStreamType,  // webcam, rtsp, or file
                    status: status
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to add camera');
            }

            const camera = await response.json();

            document.getElementById('adding')?.remove();
            this.showAlert('success', `✅ Camera "${camera.name}" added successfully! (ID: ${camera.id})`);

            // Reset form
            document.getElementById('add-camera-form').reset();

            // Reload camera list
            this.loadCameras();

        } catch (error) {
            document.getElementById('adding')?.remove();
            this.showAlert('error', `❌ Error: ${error.message}`);
        }
    }

    async loadCameras() {
        try {
            const response = await fetch(`${this.apiBase}/cameras/`);

            if (!response.ok) {
                throw new Error('Failed to load cameras');
            }

            const cameras = await response.json();

            // Load detector status for each camera
            const camerasWithStatus = await Promise.all(
                cameras.map(async (camera) => {
                    try {
                        const detectorResponse = await fetch(`${this.apiBase}/detectors/${camera.id}/status`);
                        const detectorStatus = await detectorResponse.json();
                        return { ...camera, detectorRunning: detectorStatus.running };
                    } catch (e) {
                        return { ...camera, detectorRunning: false };
                    }
                })
            );

            this.renderCameras(camerasWithStatus);

        } catch (error) {
            console.error('Error loading cameras:', error);
            this.showAlert('error', `❌ Failed to load cameras: ${error.message}`);
        }
    }

    renderCameras(cameras) {
        const container = document.getElementById('camera-list');

        if (cameras.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                    </svg>
                    <p>No cameras yet. Add your first camera to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = cameras.map(camera => `
    <div class="camera-card ${camera.status === 'inactive' ? 'inactive' : ''}">
        <div class="camera-header">
            <div class="camera-name">📹 ${camera.name}</div>
            <div class="camera-status ${camera.status}">
                ${camera.status.toUpperCase()}
            </div>
        </div>

        <div class="camera-info">
            <strong>ID:</strong> ${camera.id}
        </div>
        <div class="camera-info">
            <strong>Location:</strong> ${camera.location || 'N/A'}
        </div>
        <div class="camera-info">
            <strong>Stream:</strong> <code style="color: #00d4ff;">${this.formatStreamUrl(camera.stream_url)}</code>
        </div>
        <div class="camera-info">
            <strong>Detector:</strong> 
            <span style="color: ${camera.detectorRunning ? '#4CAF50' : '#f44336'}; font-weight: bold;">
                ${camera.detectorRunning ? '🟢 Running' : '🔴 Stopped'}
            </span>
        </div>
        <div class="camera-info" style="font-size: 0.8em; color: #666;">
            Added: ${new Date(camera.created_at).toLocaleString()}
        </div>

        <div class="camera-actions">
            <button class="btn btn-primary" 
                    onclick="cameraManager.startDetection(${camera.id})"
                    style="background: #00d4ff; color: #1a1a2e;"
                    ${(camera.detectorRunning || camera.status === 'inactive')
                ? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
                : ''}>
                🚀 Start Detection
            </button>

            <button class="btn btn-danger"
                    onclick="cameraManager.stopDetection(${camera.id})"
                    ${(!camera.detectorRunning || camera.status === 'inactive')
                ? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
                : ''}>
                ⏹️ Stop
            </button>
        </div>
    </div>
`).join('');

    }

    formatStreamUrl(url) {
        // Hide password in RTSP URLs
        // if (url.includes('rtsp://') && url.includes('@')) {
        //     const parts = url.split('@');
        //     const credentials = parts[0].split('://')[1];
        //     const username = credentials.split(':')[0];
        //     return `rtsp://${username}:****@${parts[1]}`;
        // }
        return url;
    }

    viewCamera(cameraId) {
        // Redirect to live view with this camera
        window.location.href = `main.html?camera=${cameraId}`;
    }

    // async testCamera(cameraId) {
    //     try {
    //         this.showAlert('info', `🧪 Testing camera ${cameraId}...`, `test-${cameraId}`);

    //         // Get camera details
    //         const response = await fetch(`${this.apiBase}/cameras/${cameraId}`);
    //         if (!response.ok) throw new Error('Camera not found');

    //         const camera = await response.json();

    //         // Test stream stats endpoint
    //         const statsResponse = await fetch(`${this.apiBase}/stream/${cameraId}/stats`);

    //         if (statsResponse.ok) {
    //             const stats = await statsResponse.json();
    //             document.getElementById(`test-${cameraId}`)?.remove();
    //             this.showAlert('success', `✅ Camera ${cameraId} is working! Frame ID: ${stats.current_frame_id}`);
    //         } else {
    //             document.getElementById(`test-${cameraId}`)?.remove();
    //             this.showAlert('error', `⚠️ Camera ${cameraId} is not streaming. Start the backend with this camera activated.`);
    //         }

    //     } catch (error) {
    //         document.getElementById(`test-${cameraId}`)?.remove();
    //         this.showAlert('error', `❌ Error testing camera: ${error.message}`);
    //     }
    // }

    async toggleStatus(cameraId, currentStatus) {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

            const response = await fetch(`${this.apiBase}/cameras/${cameraId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update camera status');
            }

            this.showAlert('success', `✅ Camera ${cameraId} ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
            this.loadCameras();

        } catch (error) {
            this.showAlert('error', `❌ Error: ${error.message}`);
        }
    }

    async startDetection(cameraId) {
        try {
            this.showAlert('info', `🚀 Starting detector for camera ${cameraId}...`, `start-${cameraId}`);

            const response = await fetch(`${this.apiBase}/detectors/${cameraId}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model_path: 'checkpoint_last.pt'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to start detector');
            }

            const result = await response.json();

            document.getElementById(`start-${cameraId}`)?.remove();

            if (result.status === 'already_running') {
                this.showAlert('info', `ℹ️ ${result.message}`);
            } else {
                this.showAlert('success', `✅ ${result.message}`);
            }

            // Reload camera list to update detector status
            this.loadCameras();

        } catch (error) {
            document.getElementById(`start-${cameraId}`)?.remove();
            this.showAlert('error', `❌ Error starting detector: ${error.message}`);
        }
    }

    async stopDetection(cameraId) {
        try {
            this.showAlert('info', `⏹️ Stopping detector for camera ${cameraId}...`, `stop-${cameraId}`);

            const response = await fetch(`${this.apiBase}/detectors/${cameraId}/stop`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to stop detector');
            }

            const result = await response.json();

            document.getElementById(`stop-${cameraId}`)?.remove();
            this.showAlert('success', `✅ ${result.message}`);

            // Reload camera list to update detector status
            this.loadCameras();

        } catch (error) {
            document.getElementById(`stop-${cameraId}`)?.remove();
            this.showAlert('error', `❌ Error stopping detector: ${error.message}`);
        }
    }

    showAlert(type, message, id = null) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        if (id) alertDiv.id = id;
        alertDiv.textContent = message;

        const container = document.getElementById('alerts');
        container.appendChild(alertDiv);

        // Auto remove after 5 seconds (except for persistent ones with ID)
        if (!id) {
            setTimeout(() => {
                alertDiv.style.opacity = '0';
                setTimeout(() => alertDiv.remove(), 300);
            }, 5000);
        }
    }
}

// Initialize when page loads
let cameraManager;
window.addEventListener('DOMContentLoaded', () => {
    cameraManager = new CameraManager();
});
