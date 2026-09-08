import { NextResponse } from 'next/server'
import {
  enqueueMatchmaking,
  cancelMatchmaking,
  pollMatchmaking,
  getAverageQueueTimeSeconds,
  getRankTier
} from '@/lib/game-state'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

const NOCACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Surrogate-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, playerId, characterId, rankPoints } = body
    const name = body.name || body.playerName || 'Trainer'

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'Thiếu playerId' }, { status: 400, headers: NOCACHE_HEADERS })
    }

    if (action === 'join') {
      const result = enqueueMatchmaking({
        playerId,
        name,
        characterId: characterId || 'satoshi',
        rankPoints: typeof rankPoints === 'number' ? rankPoints : 500,
      })
      const rankInfo = getRankTier(rankPoints || 500)
      return NextResponse.json({ ...result, rankInfo }, { headers: NOCACHE_HEADERS })
    }

    if (action === 'poll') {
      const result = pollMatchmaking(playerId)
      return NextResponse.json({ ...result }, { headers: NOCACHE_HEADERS })
    }

    if (action === 'cancel') {
      const canceled = cancelMatchmaking(playerId)
      return NextResponse.json({ success: true, canceled }, { headers: NOCACHE_HEADERS })
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400, headers: NOCACHE_HEADERS })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NOCACHE_HEADERS })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const playerId = url.searchParams.get('playerId')

    if (action === 'poll' && playerId) {
      const result = pollMatchmaking(playerId)
      return NextResponse.json({ ...result }, { headers: NOCACHE_HEADERS })
    }

    if (action === 'cancel' && playerId) {
      const canceled = cancelMatchmaking(playerId)
      return NextResponse.json({ success: true, canceled }, { headers: NOCACHE_HEADERS })
    }

    const avg = getAverageQueueTimeSeconds()
    return NextResponse.json({ success: true, averageWaitSeconds: avg }, { headers: NOCACHE_HEADERS })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers: NOCACHE_HEADERS })
  }
}
