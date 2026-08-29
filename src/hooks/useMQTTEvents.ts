/**
 * useMQTTEvents — SSE hook for live dashboard events
 *
 * Replaces the old WebSocket hook. Connects to GET /api/events which is
 * a Server-Sent Events stream backed by the MQTT dashboard topic:
 *   freshpod_vending_2025/dashboard/events
 *
 * Usage:
 *   useMQTTEvents('PAYMENT_UPDATE', (data) => { ... });
 *   useMQTTEvents('TELEMETRY_UPDATE', (data) => { ... });
 */

import { useEffect, useRef } from 'react';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

type EventCallback = (data: any) => void;

// ─────────────────────────────────────────────────────────────────
//  Singleton SSE Manager
//  One EventSource is shared across all hook instances to avoid
//  opening multiple SSE connections from the same browser tab.
// ─────────────────────────────────────────────────────────────────
class SSEManager {
  private source: EventSource | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private readonly maxReconnectDelay = 30000;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.source) {
      try { this.source.close(); } catch (_) {}
    }

    const url = `${backendUrl}/api/events`;
    console.log(`[SSE] Connecting to ${url}...`);
    this.source = new EventSource(url);

    this.source.onopen = () => {
      console.log('[SSE] Connected to MQTT event stream');
      this.reconnectDelay = 2000; // Reset backoff on successful connection
    };

    this.source.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;
        if (type && this.listeners.has(type)) {
          this.listeners.get(type)!.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event:', err);
      }
    };

    this.source.onerror = () => {
      console.warn('[SSE] Connection lost. Reconnecting...');
      this.source?.close();
      this.source = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  public subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
}

// Singleton — created once per browser tab
let sseManager: SSEManager | null = null;

function getSSEManager(): SSEManager | null {
  if (typeof window === 'undefined') return null;
  if (!sseManager) sseManager = new SSEManager();
  return sseManager;
}

// ─────────────────────────────────────────────────────────────────
//  React hook
// ─────────────────────────────────────────────────────────────────
export const useMQTTEvents = (event: string, callback: EventCallback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const manager = getSSEManager();
    if (!manager) return;

    const unsubscribe = manager.subscribe(event, (data) => {
      callbackRef.current(data);
    });

    return () => unsubscribe();
  }, [event]);
};

export default useMQTTEvents;
