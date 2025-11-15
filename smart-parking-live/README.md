# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d6b3f437-f3b0-4aa1-96fd-3468babc5023

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d6b3f437-f3b0-4aa1-96fd-3468babc5023) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d6b3f437-f3b0-4aa1-96fd-3468babc5023) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

# 🚗 Smart Parking System - Live Frontend

Real-time parking lot monitoring system with AI-powered vehicle detection.

## 🎯 Features

- ✅ **Live Camera Monitoring** - Real-time video streaming with MJPEG
- ✅ **Vehicle Detection** - YOLOv8 AI detection overlay (red bounding boxes)
- ✅ **Parking Slots** - Polygon-based slot visualization (green/red status)
- ✅ **Camera Management** - Full CRUD operations for cameras
- ✅ **WebSocket Integration** - Real-time updates for detections and occupancy
- ✅ **Responsive Design** - Works on mobile, tablet, desktop

## 🚀 Setup Guide

### Backend Configuration

Make sure backend API is running at `http://localhost:8000`

### Environment Setup

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Configure environment variables:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_BASE_URL=ws://localhost:8000
```

### Running the App

```bash
npm install
npm run dev
```

App will be available at `http://localhost:5173`

## 📖 How to Use

### 1. Add a Camera

1. Go to **Cameras** page
2. Click **Add Camera**
3. Fill in:
   - **Name**: Camera identifier
   - **Location**: Physical location
   - **Source Type**: `webcam` / `rtsp` / `file`
   - **Source Path**:
     - Webcam: `0`, `1`, `2` (device index)
     - RTSP: `rtsp://user:pass@ip:port/stream`
     - File: `C:/videos/parking.mp4`
4. Save

### 2. View Live Feed

**From Dashboard:**

- Select camera from dropdown
- Detector auto-starts
- View real-time video + detections

**From Cameras Page:**

- Click **View Live** button on camera card

### 3. Detector Control

The detector **automatically starts** when you view a camera.

You can also manually control it:

- **Start/Stop** button in video header
- Connection status badge (Green = Connected)

## ⚠️ Troubleshooting: "No active camera feed"

If you see this message, the camera is not activated. Here's what you need:

### ✅ Required Conditions

1. **Backend running**: `http://localhost:8000`
2. **Camera created**: Add via Cameras page
3. **Detector started**: Auto-starts when viewing camera ⚠️ **MOST IMPORTANT**
4. **Video stream available**: Camera source must be valid

### 🔍 Quick Checks

```bash
# 1. Test backend
curl http://localhost:8000/api/v1/cameras

# 2. Test video stream
# Open in browser: http://localhost:8000/api/v1/stream/1

# 3. Start detector manually
curl -X POST http://localhost:8000/api/v1/detector/1/start

# 4. Check detector status
curl http://localhost:8000/api/v1/detector/1/status
```

### 📝 Detailed Guide

See full troubleshooting guide: [CAMERA_ACTIVATION_GUIDE.md](./CAMERA_ACTIVATION_GUIDE.md)

## 🔌 API Integration

### REST Endpoints

```
GET    /api/v1/cameras              # List cameras
POST   /api/v1/cameras              # Create camera
DELETE /api/v1/cameras/:id          # Delete camera

POST   /api/v1/detector/:id/start   # Start detector
POST   /api/v1/detector/:id/stop    # Stop detector

GET    /api/v1/stream/:id           # MJPEG stream
```

### WebSocket

```javascript
// Connect to camera feed
ws://localhost:8000/ws/:camera_id

// Receive real-time updates
{
  "type": "slot_update",
  "detections": [...],
  "slots": [...],
  "timestamp": "..."
}
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── LiveView.tsx    # Main live monitoring view
│   ├── CameraCard.tsx
│   └── CameraForm.tsx
├── hooks/              # Custom hooks
│   ├── useCamera.ts
│   ├── useDetector.ts
│   └── useWebSocket.ts
├── services/           # API services
│   ├── api.ts
│   ├── cameraService.ts
│   └── detectorService.ts
├── types/              # TypeScript types
│   ├── camera.types.ts
│   ├── slot.types.ts
│   └── detection.types.ts
└── pages/              # Page components
    ├── Dashboard.tsx   # Live monitoring
    └── Cameras.tsx     # Camera management
```

## 🛠️ Tech Stack

- **React 18** + **TypeScript** + **Vite**
- **TailwindCSS** + **shadcn/ui** - UI components
- **Axios** - HTTP client
- **React Router** - Navigation
- **WebSocket API** - Real-time updates

## 📚 Documentation

- [Frontend Requirements](../FRONTEND_REQUIREMENTS.md) - Complete feature specs
- [Camera Activation Guide](./CAMERA_ACTIVATION_GUIDE.md) - Troubleshooting
- [Backend API Docs](http://localhost:8000/docs) - Swagger UI

---

**Made with ❤️ for Smart Parking System**
