import { io, type Socket } from 'socket.io-client'
import Cookies from 'js-cookie'
import { TOKEN_KEY } from './api'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', {
      auth: { token: Cookies.get(TOKEN_KEY) },
      autoConnect: true,
      transports: ['websocket', 'polling'],
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
