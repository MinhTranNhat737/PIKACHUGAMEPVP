import { NextResponse } from 'next/server'
import { getAllUsers, adminSetUserCoins, adminResetUserPassword, adminDeleteUser, getUserProfile } from '@/lib/user-store'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const adminUser = searchParams.get('adminUser')

    // Verify caller is admin
    if (adminUser) {
      const profile = getUserProfile(adminUser)
      if (profile?.role !== 'admin' && adminUser !== 'admin') {
        return NextResponse.json({ success: false, error: 'Không có quyền quản trị' }, { status: 403 })
      }
    }

    const list = getAllUsers()
    return NextResponse.json({ success: true, users: list })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, adminUser, targetUsername, coins, newPassword } = body

    // Verify caller is admin
    if (adminUser) {
      const profile = getUserProfile(adminUser)
      if (profile?.role !== 'admin' && adminUser !== 'admin') {
        return NextResponse.json({ success: false, error: 'Không có quyền quản trị' }, { status: 403 })
      }
    }

    if (action === 'set-coins') {
      if (!targetUsername || typeof coins !== 'number') {
        return NextResponse.json({ success: false, error: 'Thiếu thông tin targetUsername hoặc coins' }, { status: 400 })
      }
      const res = adminSetUserCoins(targetUsername, coins)
      return NextResponse.json(res)
    }

    if (action === 'reset-password') {
      if (!targetUsername || !newPassword) {
        return NextResponse.json({ success: false, error: 'Thiếu targetUsername hoặc newPassword' }, { status: 400 })
      }
      const res = adminResetUserPassword(targetUsername, newPassword)
      return NextResponse.json(res)
    }

    if (action === 'delete-user') {
      if (!targetUsername) {
        return NextResponse.json({ success: false, error: 'Thiếu targetUsername' }, { status: 400 })
      }
      const res = adminDeleteUser(targetUsername)
      return NextResponse.json(res)
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
