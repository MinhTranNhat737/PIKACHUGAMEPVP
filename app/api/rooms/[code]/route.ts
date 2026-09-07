import { NextResponse } from 'next/server'
import { getRoom, updatePlayerAction } from '@/lib/game-state'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const room = getRoom(code)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Phòng không tồn tại' }, { status: 404 })
    }
    return NextResponse.json({ success: true, room })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Thiếu thông tin người chơi hoặc hành động' }, { status: 400 })
    }

    const updatedRoom = updatePlayerAction(code, playerId, action)
    if (!updatedRoom) {
      return NextResponse.json({ success: false, error: 'Không thể cập nhật trạng thái phòng' }, { status: 400 })
    }

    return NextResponse.json({ success: true, room: updatedRoom })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
