import { NextResponse } from 'next/server'
import { registerUser, loginUser, getUserProfile, addCoinsToUser, advanceBotLevel, updateUserCharacter, updateUserRankPoints } from '@/lib/user-store'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, username, password, displayName, characterId } = body
    const coinsToAdd = typeof body.coins === 'number' ? body.coins : typeof body.amount === 'number' ? body.amount : null
    const levelToAdvance = typeof body.completedLevel === 'number' ? body.completedLevel : typeof body.level === 'number' ? body.level : null

    if (action === 'register') {
      const res = registerUser(username, password, displayName)
      if (!res.success) {
        return NextResponse.json(res, { status: 400 })
      }
      return NextResponse.json(res)
    }

    if (action === 'login') {
      const res = loginUser(username, password)
      if (!res.success) {
        return NextResponse.json(res, { status: 401 })
      }
      return NextResponse.json(res)
    }

    if (action === 'set-character') {
      if (!username || !characterId) {
        return NextResponse.json({ success: false, error: 'Thiếu dữ liệu nhân vật' }, { status: 400 })
      }
      const res = updateUserCharacter(username, characterId)
      return NextResponse.json(res)
    }

    if (action === 'add-coins') {
      if (!username || coinsToAdd === null) {
        return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 })
      }
      const res = addCoinsToUser(username, coinsToAdd)
      return NextResponse.json(res)
    }

    if (action === 'advance-level') {
      if (!username || levelToAdvance === null) {
        return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 })
      }
      const res = advanceBotLevel(username, levelToAdvance)
      return NextResponse.json(res)
    }

    if (action === 'add-rank-points') {
      const rp = typeof body.rankPoints === 'number' ? body.rankPoints : typeof body.delta === 'number' ? body.delta : 0
      if (!username || rp === 0) {
        return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 })
      }
      const res = updateUserRankPoints(username, rp)
      return NextResponse.json(res)
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) {
    return NextResponse.json({ success: false, error: 'Thiếu username' }, { status: 400 })
  }

  const user = getUserProfile(username)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 })
  }

  return NextResponse.json({ success: true, user })
}
