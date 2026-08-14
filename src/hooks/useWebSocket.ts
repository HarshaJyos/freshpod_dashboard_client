import { useEffect, useRef } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
const wsUrl = backendUrl.replace(/^http/, 'ws');

type EventCallback = (data: any) => void;

class WebSocketManager {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 2000;
  private maxReconnectDelay = 30000;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
    }

    console.log(`[WS] Connecting to ${wsUrl}...`);
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('[WS] Connected successfully');
      this.reconnectDelay = 2000; // Reset delay on successful connection
    };

    this.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;
        
        if (type && this.listeners.has(type)) {
          const callbacks = this.listeners.get(type);
          callbacks?.forEach((callback) => callback(data));
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    };

    this.socket.onclose = () => {
      console.log('[WS] Connection closed, preparing reconnect...');
      this.scheduleReconnect();
    };

    this.socket.onerror = (err) => {
      console.error('[WS] Socket error:', err);
      this.socket?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  public subscribe(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
}

// Singleton manager instance
let wsManager: WebSocketManager | null = null;

const getWebSocketManager = () => {
  if (typeof window === 'undefined') return null;
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
};

export const useWebSocket = (event: string, callback: EventCallback) => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const manager = getWebSocketManager();
    if (!manager) return;

    const unsubscribe = manager.subscribe(event, (data) => {
      callbackRef.current(data);
    });

    return () => {
      unsubscribe();
    };
  }, [event]);
};
export default useWebSocket;
