/**
 * @deprecated Use `useMQTTEvents` from `./useMQTTEvents` instead.
 * This file is kept for backward compatibility.
 * Live events now flow via MQTT pub/sub → SSE (/api/events) instead of WebSocket.
 */
export { useMQTTEvents as useWebSocket, default } from './useMQTTEvents';
