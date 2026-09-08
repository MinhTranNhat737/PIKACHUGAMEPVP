import { NextResponse } from 'next/server'
import { getRoom, updatePlayerAction } from '@/lib/game-state'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const NOCACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Surrogate-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const room = getRoom(code)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404, headers: NOCACHE_HEADERS })
    }

    // Conditional sync: if client sends ?since=<timestamp> and room hasn't changed, return minimal response
    const url = new URL(req.url)
    const since = Number(url.searchParams.get('since') || 0)
    if (since > 0 && room.updatedAt <= since) {
      return NextResponse.json({ success: true, changed: false, updatedAt: room.updatedAt }, { headers: NOCACHE_HEADERS })
    }

    return NextResponse.json({ success: true, changed: true, room }, { headers: NOCACHE_HEADERS })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NOCACHE_HEADERS })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await req.json()
    const { playerId, action } = body

    if (!playerId || !action) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin người chơi hoặc hành động' }, { status: 400, headers: NOCACHE_HEADERS })
    }

    const updatedRoom = updatePlayerAction(code, playerId, action)
    if (!updatedRoom) {
      return NextResponse.json({ success: false, error: 'Không thể cập nhật trạng thái phòng' }, { status: 400, headers: NOCACHE_HEADERS })
    }

    return NextResponse.json({ success: true, room: updatedRoom }, { headers: NOCACHE_HEADERS })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NOCACHE_HEADERS })
  }
}
