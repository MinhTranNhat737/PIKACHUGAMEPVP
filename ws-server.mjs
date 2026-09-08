import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'

const PORT = parseInt(process.env.WS_PORT || '3001', 10)
const HTTP_API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', service: 'pikachu-pvp-ws', port: PORT }))
})

const wss = new WebSocketServer({ server })

// Map: roomCode -> Set<{ ws, playerId, playerName }>
const roomSockets = new Map()

function broadcastToRoom(roomCode, data, excludeWs = null) {
  const code = roomCode.toUpperCase()
  const clients = roomSockets.get(code)
  if (!clients) return

  const messageStr = JSON.stringify(data)
  for (const client of clients) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr)
    }
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null
  let currentPlayerId = null

  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      // 1. Join Room
      if (msg.type === 'join' && msg.roomCode && msg.playerId) {
        currentRoom = msg.roomCode.toUpperCase()
        currentPlayerId = msg.playerId

        if (!roomSockets.has(currentRoom)) {
          roomSockets.set(currentRoom, new Set())
        }
        roomSockets.get(currentRoom).add({ ws, playerId: currentPlayerId, name: msg.playerName })

        // Acknowledge join
        ws.send(JSON.stringify({
          type: 'joined',
          roomCode: currentRoom,
          playerId: currentPlayerId,
          activeCount: roomSockets.get(currentRoom).size,
        }))

        // Broadcast to partner that rival is connected via WebSocket
        broadcastToRoom(currentRoom, {
          type: 'player_connected',
          playerId: currentPlayerId,
          activeCount: roomSockets.get(currentRoom).size,
        }, ws)
        return
      }

      // 2. Player Action (match, debuff, ultimate, shuffle, etc.)
      if (msg.type === 'action' && msg.roomCode && msg.playerId && msg.action) {
        const code = msg.roomCode.toUpperCase()

        // INSTANT ULTRA-FAST BROADCAST to opponent (sub-1ms)!
        broadcastToRoom(code, {
          type: 'room_action',
          playerId: msg.playerId,
          action: msg.action,
          timestamp: Date.now(),
        }, ws)

        // Asynchronously persist to Next.js API route so room state stays consistent
        fetch(`${HTTP_API_BASE}/api/rooms/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: msg.playerId, action: msg.action }),
        }).catch(() => {
          // ignore API sync failures in case Next.js is not on localhost:3000
        })
        return
      }

      // 3. Ping / Keepalive
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
      }
    } catch (err) {
      console.error('[WS Error]', err)
    }
  })

  ws.on('close', () => {
    if (currentRoom && roomSockets.has(currentRoom)) {
      const clients = roomSockets.get(currentRoom)
      for (const client of clients) {
        if (client.ws === ws) {
          clients.delete(client)
          break
        }
      }
      if (clients.size === 0) {
        roomSockets.delete(currentRoom)
      } else {
        broadcastToRoom(currentRoom, {
          type: 'player_disconnected',
          playerId: currentPlayerId,
          activeCount: clients.size,
        })
      }
    }
  })
})

// Heartbeat ping interval
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  })
}, 15000)

wss.on('close', () => clearInterval(interval))

server.listen(PORT, () => {
  console.log(`⚡ [Pikachu PVP WebSocket Server] Running on ws://localhost:${PORT}`)
})
