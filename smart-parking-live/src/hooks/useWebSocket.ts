import { useState, useEffect, useCallback, useRef } from "react";
import { Detection } from "@/types/detection.types";
import { Slot } from "@/types/slot.types";

interface WebSocketMessage {
  type: string;
  camera_id: number;
  slots?: Slot[];
  detections?: Detection[];
  frame_id?: number;
  timestamp?: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  detections: Detection[];
  slots: Slot[];
  lastUpdate: string | null;
  reconnect: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";

export const useWebSocket = (cameraId: number | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!cameraId) {
      console.log("No camera ID provided, skipping WebSocket connection");
      return;
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${WS_BASE_URL}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("✅ WebSocket connected to camera", cameraId);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Only process messages for the current camera
        if (message.type === "slot_update" && message.camera_id === cameraId) {
          setDetections(message.detections || []);
          setSlots(message.slots || []);
          setLastUpdate(message.timestamp || new Date().toISOString());
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket disconnected from camera", cameraId);
      setIsConnected(false);

      // Only reconnect if we should (not during camera switch or unmount)
      if (shouldReconnectRef.current) {
        // Exponential backoff reconnect
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptsRef.current),
          30000
        );
        console.log(`Reconnecting in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [cameraId]);

  const reconnect = useCallback(() => {
    console.log("Manual reconnect requested");
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    shouldReconnectRef.current = true;

    if (cameraId) {
      connect();
    }

    return () => {
      // Prevent reconnection during cleanup
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, cameraId]);

  return {
    isConnected,
    detections,
    slots,
    lastUpdate,
    reconnect,
  };
};
