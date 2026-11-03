import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  return socket;
}

export async function connectSocket(): Promise<Socket | null> {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;

  const token = await getAuthToken();
  if (!token) return null;

  const WS_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/v1$/, '')
    : 'http://localhost:4000';

  socket = io(`${WS_BASE}/events`, {
    auth: { token },
    transports: ['polling', 'websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] connected');
  });

  socket.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] disconnected');
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[socket] connect_error', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function reconnectSocket(): Promise<Socket | null> {
  disconnectSocket();
  return connectSocket();
}
