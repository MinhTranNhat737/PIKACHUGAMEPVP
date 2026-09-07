import { NextResponse } from 'next/server'
import { getRankedLeaderboard } from '@/lib/user-store'

export async function GET() {
  try {
    const rankings = getRankedLeaderboard()
    return NextResponse.json({ success: true, rankings })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
