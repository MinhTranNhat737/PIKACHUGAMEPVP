import { NextResponse } from 'next/server'
import { SHOP_CATALOG, purchaseAndEquipItem, getUserProfile } from '@/lib/user-store'

export async function GET() {
  return NextResponse.json({ success: true, catalog: SHOP_CATALOG })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, itemId, action } = body

    if (!username || !itemId || !action) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 })
    }

    const res = purchaseAndEquipItem(username, itemId, action)
    if (!res.success) {
      return NextResponse.json(res, { status: 400 })
    }

    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
