import { getRoom, subscribeRoom } from '@/lib/game-state'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const roomCode = code.toUpperCase()
  const room = getRoom(roomCode)

  if (!room) {
    return new Response('Room not found', { status: 404 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial room snapshot immediately
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(room)}\n\n`))
      } catch {
        // client closed immediately
        return
      }

      // Subscribe to real-time broadcasts
      const unsubscribe = subscribeRoom(roomCode, (updatedRoom) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updatedRoom)}\n\n`))
        } catch {
          unsubscribe()
        }
      })

      // Send heartbeat ping every 10 seconds to keep HTTP stream active through proxies
      const pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(pingTimer)
          unsubscribe()
        }
      }, 10000)

      req.signal.addEventListener('abort', () => {
        clearInterval(pingTimer)
        unsubscribe()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
