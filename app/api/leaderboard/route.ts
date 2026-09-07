import { NextResponse } from 'next/server'
import { getLeaderboard, saveLeaderboardScore } from '@/lib/leaderboard-store'

export async function GET() {
  const leaderboard = getLeaderboard()
  return NextResponse.json({ success: true, leaderboard })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, score, mode } = body

    if (typeof score !== 'number' || isNaN(score)) {
      return NextResponse.json({ success: false, error: 'Điểm số không hợp lệ' }, { status: 400 })
    }

    const leaderboard = saveLeaderboardScore(name || 'Trainer', score, mode || 'solo')
    return NextResponse.json({ success: true, leaderboard })
  } catch (err) {
    console.error('Leaderboard POST error:', err)
    return NextResponse.json({ success: false, error: 'Lỗi khi lưu kỷ lục' }, { status: 500 })
  }
}

export async function DELETE() {
  if (globalThis.__PIKA_LEADERBOARD) {
    globalThis.__PIKA_LEADERBOARD = []
  }
  return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu kỷ lục' })
}
