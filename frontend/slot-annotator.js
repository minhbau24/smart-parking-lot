/**
 * Parking Slot Annotator
 * Allows users to draw polygons on video frames to define parking slots
 */

class SlotAnnotator {
    constructor() {
        // API Configuration
        this.apiBase = 'http://localhost:8000/api/v1';

        // Get camera ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.cameraId = parseInt(urlParams.get('camera')) || null;

        // Canvas elements
        this.canvas = document.getElementById('draw-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.videoImg = document.getElementById('video-feed');

        // Drawing state
        this.isDrawing = false;
        this.currentPolygon = [];  // Points of polygon being drawn
        this.completedSlots = [];  // Array of completed slot polygons
        this.slotCounter = 1;

        // Original image dimensions (for scaling)
        this.originalWidth = 0;
        this.originalHeight = 0;

        // UI Elements
        this.startDrawBtn = document.getElementById('start-draw-btn');
        this.undoPointBtn = document.getElementById('undo-point-btn');
        this.clearCurrentBtn = document.getElementById('clear-current-btn');
        this.saveAllBtn = document.getElementById('save-all-btn');
        this.refreshFrameBtn = document.getElementById('refresh-frame-btn');
        this.slotPrefixInput = document.getElementById('slot-prefix');
        this.polygonColorInput = document.getElementById('polygon-color');

        // Initialize
        this.init();
    } async init() {
        // Load camera info
        await this.loadCameraInfo();

        // Capture current video frame
        await this.captureVideoFrame();

        // Setup event listeners
        this.setupEventListeners();

        console.log('Slot Annotator initialized');
    }

    async loadCameraInfo() {
        if (!this.cameraId) {
            alert('No camera selected! Redirecting...');
            window.location.href = 'main.html';
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/cameras/${this.cameraId}`);
            if (!response.ok) throw new Error('Camera not found');

            const camera = await response.json();
            document.getElementById('camera-name').textContent = `${camera.name} (ID: ${camera.id})`;

        } catch (error) {
            console.error('Error loading camera:', error);
            document.getElementById('camera-name').textContent = `Camera ${this.cameraId} (Error loading info)`;
        }
    }

    async captureVideoFrame() {
        // Get static snapshot from video stream (not continuous stream)
        const snapshotUrl = `${this.apiBase}/stream/${this.cameraId}/snapshot?t=${Date.now()}`;

        // Load image
        this.videoImg.onload = () => {
            // Store original dimensions
            this.originalWidth = this.videoImg.naturalWidth;
            this.originalHeight = this.videoImg.naturalHeight;

            // Set canvas to match displayed image size
            this.resizeCanvas();

            console.log(`Frame captured: ${this.originalWidth}x${this.originalHeight}`);
        };

        this.videoImg.onerror = () => {
            console.error('Failed to load frame. Make sure detector is running.');
            alert('❌ Failed to load frame! Make sure:\n1. Detector is started for this camera\n2. Camera is working properly');
        };

        this.videoImg.src = snapshotUrl;
        this.videoImg.style.display = 'block';

        // Resize canvas when window resizes
        window.addEventListener('resize', () => this.resizeCanvas());
    } resizeCanvas() {
        const displayWidth = this.videoImg.clientWidth;
        const displayHeight = this.videoImg.clientHeight;

        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;

        // Redraw all slots after resize
        this.redrawAll();
    }

    setupEventListeners() {
        // Start drawing button
        this.startDrawBtn.addEventListener('click', () => {
            this.startDrawing();
        });

        // Undo last point button
        this.undoPointBtn.addEventListener('click', () => {
            this.undoLastPoint();
        });

        // Clear current polygon button
        this.clearCurrentBtn.addEventListener('click', () => {
            this.clearCurrentPolygon();
        });

        // Save all slots button
        this.saveAllBtn.addEventListener('click', () => {
            this.saveAllSlots();
        });

        // Refresh frame button
        this.refreshFrameBtn.addEventListener('click', () => {
            this.captureVideoFrame();
        });

        // Canvas click events
        this.canvas.addEventListener('click', (e) => {
            if (this.isDrawing) {
                this.addPoint(e);
            }
        });

        // Prevent double-click from adding duplicate points
        this.canvas.addEventListener('dblclick', (e) => {
            e.preventDefault();
        });

        // Right click to cancel
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.isDrawing) {
                this.clearCurrentPolygon();
            }
        });

        // Mouse move to show preview line
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing && this.currentPolygon.length > 0) {
                this.drawPreview(e);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isDrawing) return;

            switch (e.key) {
                case 'Enter':
                case ' ':
                    // Finish polygon
                    e.preventDefault();
                    if (this.currentPolygon.length >= 3) {
                        this.finishPolygon();
                    }
                    break;

                case 'Escape':
                    // Cancel current polygon
                    e.preventDefault();
                    this.clearCurrentPolygon();
                    break;

                case 'Backspace':
                case 'Delete':
                    // Undo last point
                    e.preventDefault();
                    this.undoLastPoint();
                    break;
            }
        });

        // Color picker change
        this.polygonColorInput.addEventListener('change', (e) => {
            document.getElementById('color-preview').style.background = e.target.value;
            this.redrawAll();
        });
    } startDrawing() {
        this.isDrawing = true;
        this.currentPolygon = [];

        // Update UI
        this.startDrawBtn.disabled = true;
        this.undoPointBtn.disabled = false;
        this.clearCurrentBtn.disabled = false;
        document.getElementById('draw-mode').textContent = 'Drawing (Press Enter to finish)';
        document.getElementById('draw-mode').style.color = '#4CAF50';

        console.log('Started drawing new slot');
    }

    undoLastPoint() {
        if (this.currentPolygon.length === 0) return;

        // Remove last point
        this.currentPolygon.pop();

        // Update UI
        document.getElementById('point-count').textContent = `${this.currentPolygon.length} points`;

        // Disable undo button if no points left
        if (this.currentPolygon.length === 0) {
            this.undoPointBtn.disabled = true;
        }

        // Redraw
        this.redrawAll();

        console.log('Undid last point');
    }

    addPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Add point to current polygon
        this.currentPolygon.push({ x, y });

        // Update UI
        document.getElementById('point-count').textContent = `${this.currentPolygon.length} points`;

        // Redraw
        this.redrawAll();

        console.log(`Added point: (${x.toFixed(0)}, ${y.toFixed(0)})`);
    }

    drawPreview(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Redraw everything
        this.redrawAll();

        // Draw preview line from last point to mouse
        if (this.currentPolygon.length > 0) {
            const lastPoint = this.currentPolygon[this.currentPolygon.length - 1];

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(lastPoint.x, lastPoint.y);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    finishPolygon() {
        if (this.currentPolygon.length < 3) {
            alert('A parking slot needs at least 3 points!');
            return;
        }

        // Convert display coordinates to original image coordinates
        const scaleX = this.originalWidth / this.canvas.width;
        const scaleY = this.originalHeight / this.canvas.height;

        const originalPolygon = this.currentPolygon.map(point => ({
            x: Math.round(point.x * scaleX),
            y: Math.round(point.y * scaleY)
        }));

        // Create slot object
        const slot = {
            id: `temp_${this.slotCounter}`,
            name: `${this.slotPrefixInput.value}-${this.slotCounter}`,
            polygon: originalPolygon,
            displayPolygon: [...this.currentPolygon],  // For display
            color: this.polygonColorInput.value
        };

        this.completedSlots.push(slot);
        this.slotCounter++;

        // Reset drawing state
        this.isDrawing = false;
        this.currentPolygon = [];

        // Update UI
        this.startDrawBtn.disabled = false;
        this.undoPointBtn.disabled = true;
        this.clearCurrentBtn.disabled = true;
        this.saveAllBtn.disabled = false;
        document.getElementById('draw-mode').textContent = 'Drawing Disabled';
        document.getElementById('draw-mode').style.color = '#aaa';
        document.getElementById('point-count').textContent = '0 points';

        // Update slot list
        this.updateSlotList();

        // Redraw
        this.redrawAll();

        console.log('Polygon finished:', slot);
    }

    clearCurrentPolygon() {
        this.currentPolygon = [];
        this.isDrawing = false;

        // Update UI
        this.startDrawBtn.disabled = false;
        this.undoPointBtn.disabled = true;
        this.clearCurrentBtn.disabled = true;
        document.getElementById('draw-mode').textContent = 'Drawing Disabled';
        document.getElementById('draw-mode').style.color = '#aaa';
        document.getElementById('point-count').textContent = '0 points';

        // Redraw
        this.redrawAll();

        console.log('Current polygon cleared');
    }

    redrawAll() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all completed slots
        this.completedSlots.forEach(slot => {
            this.drawPolygon(slot.displayPolygon, slot.color, true);
        });

        // Draw current polygon being drawn
        if (this.currentPolygon.length > 0) {
            this.drawPolygon(this.currentPolygon, this.polygonColorInput.value, false);
        }
    }

    drawPolygon(points, color, filled = false) {
        if (points.length === 0) return;

        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color + '30';  // Add transparency
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }

        if (filled) {
            this.ctx.closePath();
            this.ctx.fill();
        }

        this.ctx.stroke();

        // Draw points
        points.forEach((point, index) => {
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw point number
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText(index + 1, point.x + 8, point.y - 8);
        });

        // Draw slot name for completed slots
        if (filled && points.length > 0) {
            const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
            const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

            this.ctx.fillStyle = color;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.completedSlots.find(s => s.displayPolygon === points)?.name || '', centerX, centerY);
            this.ctx.textAlign = 'left';
        }
    }

    updateSlotList() {
        const slotList = document.getElementById('slot-list');
        document.getElementById('slot-count').textContent = this.completedSlots.length;

        if (this.completedSlots.length === 0) {
            slotList.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No slots yet</p>';
            return;
        }

        slotList.innerHTML = this.completedSlots.map((slot, index) => `
            <div class="slot-item">
                <div>
                    <strong style="color: ${slot.color};">${slot.name}</strong><br>
                    <small style="color: #aaa;">${slot.polygon.length} points</small>
                </div>
                <div class="slot-actions">
                    <button class="btn btn-danger btn-small" onclick="annotator.deleteSlot(${index})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    deleteSlot(index) {
        if (confirm(`Delete slot "${this.completedSlots[index].name}"?`)) {
            this.completedSlots.splice(index, 1);
            this.updateSlotList();
            this.redrawAll();

            if (this.completedSlots.length === 0) {
                this.saveAllBtn.disabled = true;
            }
        }
    }

    async saveAllSlots() {
        if (this.completedSlots.length === 0) {
            alert('No slots to save!');
            return;
        }

        const confirmation = confirm(`Save ${this.completedSlots.length} parking slots to database?`);
        if (!confirmation) return;

        try {
            // Save each slot
            let successCount = 0;
            let errorCount = 0;

            for (const slot of this.completedSlots) {
                try {
                    // Convert polygon from [{x, y}, ...] to [[x, y], ...]
                    const polygonArray = slot.polygon.map(point => [point.x, point.y]);

                    const response = await fetch(`${this.apiBase}/slots/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            camera_id: this.cameraId,
                            label: slot.name,  // 'label' not 'name' according to schema
                            polygon: polygonArray  // [[x, y], ...] format
                        })
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        const error = await response.json();
                        console.error('Error saving slot:', error);
                        errorCount++;
                    }

                } catch (error) {
                    console.error('Error saving slot:', error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                alert(`✅ Successfully saved ${successCount} parking slots!`);
                // Clear all slots after successful save
                this.completedSlots = [];
                this.slotCounter = 1;
                this.updateSlotList();
                this.redrawAll();
                this.saveAllBtn.disabled = true;
            } else {
                alert(`⚠️ Saved ${successCount} slots, but ${errorCount} failed. Check console for details.`);
            }

        } catch (error) {
            console.error('Error saving slots:', error);
            alert('❌ Error saving slots to database!');
        }
    }
}

// Initialize when page loads
let annotator;
window.addEventListener('DOMContentLoaded', () => {
    annotator = new SlotAnnotator();
});
