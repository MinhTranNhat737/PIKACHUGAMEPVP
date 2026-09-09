import { NextResponse } from 'next/server'
import { createRoom, joinRoom, GridSizeKey, BoardMode } from '@/lib/game-state'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, code, name, playerId, size, mode, rankPoints, characterId } = body

    if (action === 'create') {
      const roomCode = code || `PK${Math.floor(1000 + Math.random() * 9000)}`
      const room = createRoom(
        roomCode,
        name,
        playerId,
        (size as GridSizeKey) || '14x8',
        (mode as BoardMode) || 'separate',
        typeof rankPoints === 'number' ? rankPoints : 500,
        characterId || 'satoshi'
      )
      return NextResponse.json({ success: true, room })
    }

    if (action === 'join') {
      if (!code) {
        return NextResponse.json({ success: false, error: 'Vui lòng nhập mã phòng!' }, { status: 400 })
      }
      const result = joinRoom(
        code,
        name,
        playerId,
        typeof rankPoints === 'number' ? rankPoints : 500,
        characterId || 'kasumi'
      )
      if ('error' in result) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, room: result })
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
