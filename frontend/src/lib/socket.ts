import { io, type Socket } from 'socket.io-client'
import Cookies from 'js-cookie'
import { TOKEN_KEY } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket && !socket.connected && !socket.active) {
    // Socket exhausted reconnection attempts — recreate it
    socket.removeAllListeners()
    socket = null
  }

  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', {
      auth: (cb) => cb({ token: Cookies.get(TOKEN_KEY) }),
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      timeout: 10_000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
