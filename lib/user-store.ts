import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import { UserAccount, ShopItem, SHOP_CATALOG, ALL_SHOP_ITEMS } from './shop-catalog'
import { getRankTier } from './game-state'
export type { UserAccount, ShopItem }
export { SHOP_CATALOG, ALL_SHOP_ITEMS }


function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function getDataFilePath(): string {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true })
    } catch {}
  }
  return path.join(dataDir, 'users.json')
}

declare global {
  var __PIKA_USERS: Map<string, UserAccount> | undefined
}

if (!globalThis.__PIKA_USERS) {
  globalThis.__PIKA_USERS = new Map<string, UserAccount>()
}

const users: Map<string, UserAccount> = globalThis.__PIKA_USERS

function saveUsersToFile() {
  try {
    const filePath = getDataFilePath()
    const list = Array.from(users.values())
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}

function loadUsersFromFile() {
  try {
    const filePath = getDataFilePath()
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      if (Array.isArray(data)) {
        for (const u of data) {
          if (u.username) {
            users.set(u.username.toLowerCase(), u)
          }
        }
      }
    }
  } catch {}

  // Auto-seed default admin account if not exists
  if (!users.has('admin')) {
    const now = Date.now()
    users.set('admin', {
      id: 'usr_admin_master',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      displayName: 'Quản Trị Viên (Admin)',
      coins: 999999,
      botLevel: 15,
      role: 'admin',
      unlockedItems: [
        'theme-emerald', 'theme-cyberpunk', 'theme-lava', 'theme-galaxy', 'theme-void', 'theme-sakura', 'theme-thunder', 'theme-glacier',
        'frame-classic', 'frame-gold', 'frame-neon', 'frame-rainbow', 'frame-diamond', 'frame-dragon', 'frame-aurora', 'frame-mythic',
        'tile-classic', 'tile-crystal', 'tile-golden', 'tile-amethyst', 'tile-jade', 'tile-prism', 'tile-imperial', 'tile-frost',
        'line-laser', 'line-cyan', 'line-flame', 'line-rainbow', 'line-thunder', 'line-sakura', 'line-void', 'line-hyper',
      ],
      equipped: {
        boardTheme: 'theme-void',
        boardFrame: 'frame-diamond',
        tileStyle: 'tile-style-prism',
        lineEffect: 'line-hyper',
      },
      createdAt: now,
      lastLogin: now,
    })
    saveUsersToFile()
  }
}

// Initialize and load users
if (users.size === 0) {
  loadUsersFromFile()
}


// ─── Authentication API Functions ───
export function registerUser(username: string, password: string, displayName?: string): { success: boolean; user?: Omit<UserAccount, 'passwordHash'>; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'Mật khẩu phải có ít nhất 4 ký tự' }
  }

  if (users.has(cleanUsername)) {
    return { success: false, error: 'Tên đăng nhập đã tồn tại, vui lòng chọn tên khác' }
  }

  const now = Date.now()
  const newUser: UserAccount = {
    id: `usr_${now}_${Math.random().toString(36).slice(2, 6)}`,
    username: cleanUsername,
    passwordHash: hashPassword(password),
    displayName: (displayName || cleanUsername).trim(),
    coins: 100, // Tặng ngay 100 xu khởi đầu
    botLevel: 1, // Bắt đầu ở level 1
    rankPoints: 0, // Bắt đầu ở rank Đồng thấp nhất (0 RP)
    unlockedItems: ['theme-emerald', 'frame-classic', 'tile-classic', 'line-laser'],
    equipped: {
      boardTheme: 'theme-emerald',
      boardFrame: 'frame-classic',
      tileStyle: 'tile-classic',
      lineEffect: 'line-laser',
    },
    createdAt: now,
    lastLogin: now,
  }

  users.set(cleanUsername, newUser)
  saveUsersToFile()

  const { passwordHash: _, ...safeUser } = newUser
  return { success: true, user: safeUser }
}

export function loginUser(username: string, password: string): { success: boolean; user?: Omit<UserAccount, 'passwordHash'>; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) {
    return { success: false, error: 'Tài khoản không tồn tại' }
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Mật khẩu không chính xác' }
  }

  user.lastLogin = Date.now()
  saveUsersToFile()

  const { passwordHash: _, ...safeUser } = user
  return { success: true, user: safeUser }
}

export function getUserProfile(username: string): Omit<UserAccount, 'passwordHash'> | null {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return null
  const { passwordHash: _, ...safeUser } = user
  return safeUser
}

export function addCoinsToUser(username: string, amount: number): { success: boolean; coins?: number } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false }

  user.coins = Math.max(0, user.coins + amount)
  saveUsersToFile()
  return { success: true, coins: user.coins }
}

export function advanceBotLevel(username: string, completedLevel: number): { success: boolean; botLevel?: number } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false }

  if (completedLevel >= user.botLevel && user.botLevel < 15) {
    user.botLevel = completedLevel + 1
    saveUsersToFile()
  }
  return { success: true, botLevel: user.botLevel }
}

export function updateUserCharacter(username: string, characterId: string): { success: boolean; characterId?: string; user?: Omit<UserAccount, 'passwordHash'>; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false, error: 'Người dùng không tồn tại' }

  user.characterId = characterId
  saveUsersToFile()
  const { passwordHash: _, ...safeUser } = user
  return { success: true, characterId, user: safeUser }
}

export function purchaseAndEquipItem(username: string, itemId: string, action: 'buy' | 'equip'): { success: boolean; user?: Omit<UserAccount, 'passwordHash'>; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false, error: 'Chưa đăng nhập' }

  const item = ALL_SHOP_ITEMS.find(i => i.id === itemId)
  if (!item) return { success: false, error: 'Vật phẩm không tồn tại' }

  const categoryKey = item.category === 'theme' ? 'boardTheme'
    : item.category === 'frame' ? 'boardFrame'
    : item.category === 'tile' ? 'tileStyle'
    : 'lineEffect'

  if (action === 'buy') {
    if (user.unlockedItems.includes(itemId)) {
      // Đã sở hữu -> chỉ việc trang bị
      user.equipped[categoryKey] = item.cssClass
      saveUsersToFile()
      const { passwordHash: _, ...safeUser } = user
      return { success: true, user: safeUser }
    }

    if (user.coins < item.price) {
      return { success: false, error: `Bạn không đủ xu! Cần ${item.price} xu (bạn có ${user.coins} xu)` }
    }

    user.coins -= item.price
    user.unlockedItems.push(itemId)
    user.equipped[categoryKey] = item.cssClass
    saveUsersToFile()

    const { passwordHash: _, ...safeUser } = user
    return { success: true, user: safeUser }
  }

  if (action === 'equip') {
    if (!user.unlockedItems.includes(itemId)) {
      return { success: false, error: 'Bạn chưa mua vật phẩm này' }
    }
    user.equipped[categoryKey] = item.cssClass
    saveUsersToFile()

    const { passwordHash: _, ...safeUser } = user
    return { success: true, user: safeUser }
  }

  return { success: false, error: 'Hành động không hợp lệ' }
}

// ─── Admin Management API Functions ───
export function getAllUsers(): Omit<UserAccount, 'passwordHash'>[] {
  return Array.from(users.values()).map(u => {
    const { passwordHash: _, ...safeUser } = u
    return safeUser
  })
}

export function adminSetUserCoins(username: string, newCoins: number): { success: boolean; user?: Omit<UserAccount, 'passwordHash'>; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false, error: 'Người dùng không tồn tại' }
  user.coins = Math.max(0, newCoins)
  saveUsersToFile()
  const { passwordHash: _, ...safeUser } = user
  return { success: true, user: safeUser }
}

export function adminResetUserPassword(username: string, newPassword: string): { success: boolean; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false, error: 'Người dùng không tồn tại' }
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'Mật khẩu mới phải có ít nhất 4 ký tự' }
  }
  user.passwordHash = hashPassword(newPassword)
  saveUsersToFile()
  return { success: true }
}

export function adminDeleteUser(username: string): { success: boolean; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  if (cleanUsername === 'admin') {
    return { success: false, error: 'Không thể xóa tài khoản Quản trị viên gốc' }
  }
  if (!users.has(cleanUsername)) {
    return { success: false, error: 'Người dùng không tồn tại' }
  }
  users.delete(cleanUsername)
  saveUsersToFile()
  return { success: true }
}

// ─── Ranked Matchmaking Leaderboard Functions ───
export function updateUserRankPoints(username: string, deltaPoints: number): { success: boolean; user?: Omit<UserAccount, 'passwordHash'>; rankPoints?: number; error?: string } {
  const cleanUsername = (username || '').trim().toLowerCase()
  const user = users.get(cleanUsername)
  if (!user) return { success: false, error: 'Người dùng không tồn tại' }
  const curRp = typeof user.rankPoints === 'number' ? user.rankPoints : 0
  user.rankPoints = Math.max(0, curRp + deltaPoints)
  saveUsersToFile()
  const { passwordHash: _, ...safeUser } = user
  return { success: true, user: safeUser, rankPoints: user.rankPoints }
}

export function getRankedLeaderboard(): Array<{
  username: string
  displayName: string
  characterId?: string
  rankPoints: number
  tier: string
  tierName: string
  tierIcon: string
  color: string
}> {
  return Array.from(users.values())
    .map(u => {
      const rp = typeof u.rankPoints === 'number' ? u.rankPoints : 0
      const tierInfo = getRankTier(rp)
      return {
        username: u.username,
        displayName: u.displayName || u.username,
        characterId: u.characterId || 'satoshi',
        rankPoints: rp,
        tier: tierInfo.tier,
        tierName: tierInfo.name,
        tierIcon: tierInfo.icon,
        color: tierInfo.color,
      }
    })
    .sort((a, b) => b.rankPoints - a.rankPoints)
}

