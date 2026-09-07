import { NextResponse } from 'next/server'
import {
  enqueueMatchmaking,
  cancelMatchmaking,
  getAverageQueueTimeSeconds,
  getRankTier
} from '@/lib/game-state'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, playerId, name, characterId, rankPoints } = body

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'Thiếu playerId' }, { status: 400 })
    }

    if (action === 'join' || action === 'poll') {
      const result = enqueueMatchmaking({
        playerId,
        name: name || 'Trainer',
        characterId: characterId || 'satoshi',
        rankPoints: typeof rankPoints === 'number' ? rankPoints : 500,
      })
      const rankInfo = getRankTier(rankPoints || 500)
      return NextResponse.json({ success: true, ...result, rankInfo })
    }

    if (action === 'cancel') {
      const canceled = cancelMatchmaking(playerId)
      return NextResponse.json({ success: true, canceled })
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  const avg = getAverageQueueTimeSeconds()
  return NextResponse.json({ success: true, averageWaitSeconds: avg })
}
