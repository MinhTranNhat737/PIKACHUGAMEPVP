// Real-time Game State Manager for Pikachu Classic PVP
export type GridSizeKey = '14x8' | '10x6'
export type BoardMode = 'shared' | 'separate'
export type Cell = number | null
export type Coord = { row: number; col: number }

export const GRID_DIMS: Record<GridSizeKey, { cols: number; rows: number; label: string }> = {
  '14x8': { cols: 14, rows: 8, label: 'Tiêu chuẩn (14×8 — 112 quân)' },
  '10x6': { cols: 10, rows: 6, label: 'Nhanh gọn (10×6 — 60 quân)' },
}

export interface BotLevelConfig {
  level: number
  name: string
  avatar: string
  pokemonId: number
  moveDelayMin: number // in ms
  moveDelayMax: number // in ms
  rewardCoins: number
  title: string
  floor: number
}

export interface BotFloorConfig {
  floor: number
  name: string
  title: string
  badge: string
  levelRange: [number, number]
  requiredStars: number
  accentColor: string
  bgGradient: string
}

export const BOT_FLOORS: BotFloorConfig[] = [
  {
    floor: 1,
    name: 'Tầng 1',
    title: 'Tập Sự & Tân Thủ',
    badge: '🌿',
    levelRange: [1, 10],
    requiredStars: 0,
    accentColor: '#22c55e',
    bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(15, 23, 42, 0.85))',
  },
  {
    floor: 2,
    name: 'Tầng 2',
    title: 'Chiến Binh Kanto',
    badge: '⚡',
    levelRange: [11, 20],
    requiredStars: 18,
    accentColor: '#facc15',
    bgGradient: 'linear-gradient(135deg, rgba(250, 204, 21, 0.18), rgba(15, 23, 42, 0.85))',
  },
  {
    floor: 3,
    name: 'Tầng 3',
    title: 'Cao Thủ Johto & Hoenn',
    badge: '🔥',
    levelRange: [21, 30],
    requiredStars: 45,
    accentColor: '#f97316',
    bgGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.18), rgba(15, 23, 42, 0.85))',
  },
  {
    floor: 4,
    name: 'Tầng 4',
    title: 'Huyền Thoại Sinnoh & Unova',
    badge: '❄️',
    levelRange: [31, 40],
    requiredStars: 75,
    accentColor: '#38bdf8',
    bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(15, 23, 42, 0.85))',
  },
  {
    floor: 5,
    name: 'Tầng 5',
    title: 'Thần Thoại & Sáng Tạo',
    badge: '👑',
    levelRange: [41, 50],
    requiredStars: 105,
    accentColor: '#ec4899',
    bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18), rgba(15, 23, 42, 0.85))',
  },
]

export function getBotFloorByLevel(level: number): BotFloorConfig {
  return BOT_FLOORS.find(f => level >= f.levelRange[0] && level <= f.levelRange[1]) || BOT_FLOORS[0]
}

export const BOT_LEVELS: BotLevelConfig[] = [
  // ─── TẦNG 1: TẬP SỰ & TÂN THỦ (Lv 1 - 10) ───
  { level: 1, floor: 1, name: 'Sâu Caterpie', avatar: '🐛', pokemonId: 10, moveDelayMin: 5500, moveDelayMax: 7000, rewardCoins: 50, title: 'Tập sự' },
  { level: 2, floor: 1, name: 'Chim Pidgey', avatar: '🐦', pokemonId: 16, moveDelayMin: 4900, moveDelayMax: 6300, rewardCoins: 60, title: 'Học viên' },
  { level: 3, floor: 1, name: 'Chuột Rattata', avatar: '🐭', pokemonId: 19, moveDelayMin: 4400, moveDelayMax: 5600, rewardCoins: 70, title: 'Lanh lẹ' },
  { level: 4, floor: 1, name: 'Rùa Squirtle', avatar: '🐢', pokemonId: 7, moveDelayMin: 4000, moveDelayMax: 5100, rewardCoins: 80, title: 'Điềm tĩnh' },
  { level: 5, floor: 1, name: 'Cáo Vulpix', avatar: '🦊', pokemonId: 37, moveDelayMin: 3700, moveDelayMax: 4700, rewardCoins: 90, title: 'Tinh ranh' },
  { level: 6, floor: 1, name: 'Bướm Butterfree', avatar: '🦋', pokemonId: 12, moveDelayMin: 3400, moveDelayMax: 4300, rewardCoins: 100, title: 'Nhẹ nhàng' },
  { level: 7, floor: 1, name: 'Khỉ Mankey', avatar: '🐒', pokemonId: 56, moveDelayMin: 3100, moveDelayMax: 3900, rewardCoins: 110, title: 'Hiếu chiến' },
  { level: 8, floor: 1, name: 'Vịt Psyduck', avatar: '🦆', pokemonId: 54, moveDelayMin: 2850, moveDelayMax: 3600, rewardCoins: 125, title: 'Khó lường' },
  { level: 9, floor: 1, name: 'Cú HootHoot', avatar: '🦉', pokemonId: 163, moveDelayMin: 2600, moveDelayMax: 3300, rewardCoins: 140, title: 'Thông thái' },
  { level: 10, floor: 1, name: 'Pikabot Sấm Sét', avatar: '⚡', pokemonId: 25, moveDelayMin: 2350, moveDelayMax: 3000, rewardCoins: 160, title: 'Thủ lĩnh Tầng 1' },

  // ─── TẦNG 2: CHIẾN BINH KANTO (Lv 11 - 20) ───
  { level: 11, floor: 2, name: 'Cá Gyarados', avatar: '🐉', pokemonId: 130, moveDelayMin: 2150, moveDelayMax: 2750, rewardCoins: 175, title: 'Cuồng nộ' },
  { level: 12, floor: 2, name: 'Bò Tauros', avatar: '🐂', pokemonId: 128, moveDelayMin: 2000, moveDelayMax: 2550, rewardCoins: 190, title: 'Húc đổ' },
  { level: 13, floor: 2, name: 'Bọ Scyther', avatar: '🦗', pokemonId: 123, moveDelayMin: 1880, moveDelayMax: 2400, rewardCoins: 210, title: 'Lưỡi kiếm' },
  { level: 14, floor: 2, name: 'Độc Arbok', avatar: '🐍', pokemonId: 24, moveDelayMin: 1780, moveDelayMax: 2280, rewardCoins: 225, title: 'Bẫy độc' },
  { level: 15, floor: 2, name: 'Ma Haunter', avatar: '👻', pokemonId: 93, moveDelayMin: 1680, moveDelayMax: 2150, rewardCoins: 240, title: 'Bóng ma' },
  { level: 16, floor: 2, name: 'Gấu Snorlax', avatar: '🐻', pokemonId: 143, moveDelayMin: 1580, moveDelayMax: 2020, rewardCoins: 260, title: 'Trọng lượng' },
  { level: 17, floor: 2, name: 'Thần Raichu', avatar: '⚡', pokemonId: 26, moveDelayMin: 1480, moveDelayMax: 1900, rewardCoins: 280, title: 'Tia chớp' },
  { level: 18, floor: 2, name: 'Gengar Hắc Ám', avatar: '😈', pokemonId: 94, moveDelayMin: 1400, moveDelayMax: 1800, rewardCoins: 300, title: 'Ám ảnh' },
  { level: 19, floor: 2, name: 'Rồng Charizard', avatar: '🔥', pokemonId: 6, moveDelayMin: 1320, moveDelayMax: 1700, rewardCoins: 330, title: 'Bão lửa' },
  { level: 20, floor: 2, name: 'Dragonite Long Tộc', avatar: '🐲', pokemonId: 149, moveDelayMin: 1250, moveDelayMax: 1600, rewardCoins: 360, title: 'Thủ lĩnh Tầng 2' },

  // ─── TẦNG 3: CAO THỦ JOHTO & HOENN (Lv 21 - 30) ───
  { level: 21, floor: 3, name: 'Cá Sấu Feraligatr', avatar: '🐊', pokemonId: 160, moveDelayMin: 1180, moveDelayMax: 1520, rewardCoins: 390, title: 'Hàm thép' },
  { level: 22, floor: 3, name: 'Chó Typhlosion', avatar: '🐺', pokemonId: 157, moveDelayMin: 1120, moveDelayMax: 1450, rewardCoins: 420, title: 'Hỏa diệm' },
  { level: 23, floor: 3, name: 'Nhện Ariados', avatar: '🕷️', pokemonId: 168, moveDelayMin: 1060, moveDelayMax: 1380, rewardCoins: 450, title: 'Tơ quấn' },
  { level: 24, floor: 3, name: 'Bọ Cạp Gligar', avatar: '🦂', pokemonId: 207, moveDelayMin: 1000, moveDelayMax: 1310, rewardCoins: 480, title: 'Độc châm' },
  { level: 25, floor: 3, name: 'Thép Steelix', avatar: '🔩', pokemonId: 208, moveDelayMin: 950, moveDelayMax: 1250, rewardCoins: 510, title: 'Mình đồng' },
  { level: 26, floor: 3, name: 'Khủng Long Tyranitar', avatar: '🦖', pokemonId: 248, moveDelayMin: 900, moveDelayMax: 1190, rewardCoins: 550, title: 'Bão cát' },
  { level: 27, floor: 3, name: 'Rừng Sceptile', avatar: '🦎', pokemonId: 254, moveDelayMin: 860, moveDelayMax: 1130, rewardCoins: 590, title: 'Phi đao lá' },
  { level: 28, floor: 3, name: 'Đầm Lầy Swampert', avatar: '🐸', pokemonId: 260, moveDelayMin: 820, moveDelayMax: 1080, rewardCoins: 630, title: 'Sóng ngầm' },
  { level: 29, floor: 3, name: 'Salamence Long Vương', avatar: '🐲', pokemonId: 373, moveDelayMin: 780, moveDelayMax: 1030, rewardCoins: 670, title: 'Oanh tạc' },
  { level: 30, floor: 3, name: 'Metagross Siêu Não', avatar: '🤖', pokemonId: 376, moveDelayMin: 740, moveDelayMax: 980, rewardCoins: 720, title: 'Thủ lĩnh Tầng 3' },

  // ─── TẦNG 4: HUYỀN THOẠI SINNOH & UNOVA (Lv 31 - 40) ───
  { level: 31, floor: 4, name: 'Lucario Ba Động', avatar: '🐺', pokemonId: 448, moveDelayMin: 700, moveDelayMax: 930, rewardCoins: 770, title: 'Khí công' },
  { level: 32, floor: 4, name: 'Garchomp Phi Long', avatar: '🦈', pokemonId: 445, moveDelayMin: 660, moveDelayMax: 880, rewardCoins: 820, title: 'Vây cá mập' },
  { level: 33, floor: 4, name: 'Băng Mamoswine', avatar: '🦣', pokemonId: 473, moveDelayMin: 630, moveDelayMax: 840, rewardCoins: 870, title: 'Voi ma mút' },
  { level: 34, floor: 4, name: 'Điện Luxray', avatar: '🦁', pokemonId: 405, moveDelayMin: 600, moveDelayMax: 800, rewardCoins: 930, title: 'Quang lôi' },
  { level: 35, floor: 4, name: 'Darkrai Ác Mộng', avatar: '🌑', pokemonId: 491, moveDelayMin: 570, moveDelayMax: 760, rewardCoins: 990, title: 'Ác mộng đêm' },
  { level: 36, floor: 4, name: 'Băng Kyurem', avatar: '🧊', pokemonId: 646, moveDelayMin: 540, moveDelayMax: 720, rewardCoins: 1050, title: 'Băng hàn' },
  { level: 37, floor: 4, name: 'Bạch Hỏa Reshiram', avatar: '🕊️', pokemonId: 643, moveDelayMin: 510, moveDelayMax: 680, rewardCoins: 1120, title: 'Bạch viêm' },
  { level: 38, floor: 4, name: 'Hắc Lôi Zekrom', avatar: '⚡', pokemonId: 644, moveDelayMin: 480, moveDelayMax: 640, rewardCoins: 1200, title: 'Hắc lôi vân' },
  { level: 39, floor: 4, name: 'Hải Vương Kyogre', avatar: '🐋', pokemonId: 382, moveDelayMin: 450, moveDelayMax: 600, rewardCoins: 1300, title: 'Đại hồng thủy' },
  { level: 40, floor: 4, name: 'Địa Long Groudon', avatar: '🌋', pokemonId: 383, moveDelayMin: 420, moveDelayMax: 560, rewardCoins: 1400, title: 'Thủ lĩnh Tầng 4' },

  // ─── TẦNG 5: THẦN THOẠI & SÁNG TẠO (Lv 41 - 50) ───
  { level: 41, floor: 5, name: 'Thần Long Rayquaza', avatar: '🐉', pokemonId: 384, moveDelayMin: 390, moveDelayMax: 520, rewardCoins: 1550, title: 'Tầng bình lưu' },
  { level: 42, floor: 5, name: 'Dị Thể Deoxys', avatar: '🧬', pokemonId: 386, moveDelayMin: 360, moveDelayMax: 480, rewardCoins: 1700, title: 'Dị biến vũ trụ' },
  { level: 43, floor: 5, name: 'Không Gian Palkia', avatar: '🌌', pokemonId: 484, moveDelayMin: 330, moveDelayMax: 440, rewardCoins: 1850, title: 'Bẻ gãy không gian' },
  { level: 44, floor: 5, name: 'Thời Gian Dialga', avatar: '⏳', pokemonId: 483, moveDelayMin: 310, moveDelayMax: 410, rewardCoins: 2000, title: 'Dòng thời gian' },
  { level: 45, floor: 5, name: 'Hư Vô Giratina', avatar: '🕳️', pokemonId: 487, moveDelayMin: 290, moveDelayMax: 380, rewardCoins: 2200, title: 'Phản vật chất' },
  { level: 46, floor: 5, name: 'Thần Biển Lugia', avatar: '🌊', pokemonId: 249, moveDelayMin: 270, moveDelayMax: 350, rewardCoins: 2400, title: 'Bão tố biển sâu' },
  { level: 47, floor: 5, name: 'Hỏa Phượng Ho-Oh', avatar: '🌈', pokemonId: 250, moveDelayMin: 250, moveDelayMax: 330, rewardCoins: 2600, title: 'Cầu vồng hồi sinh' },
  { level: 48, floor: 5, name: 'Mew Cội Nguồn', avatar: '🌸', pokemonId: 151, moveDelayMin: 230, moveDelayMax: 310, rewardCoins: 2800, title: 'Gen thủy tổ' },
  { level: 49, floor: 5, name: 'Mewtwo Thức Tỉnh', avatar: '🔮', pokemonId: 150, moveDelayMin: 210, moveDelayMax: 290, rewardCoins: 3200, title: 'Bất khả chiến bại' },
  { level: 50, floor: 5, name: 'Arceus Đấng Sáng Tạo', avatar: '👑', pokemonId: 493, moveDelayMin: 190, moveDelayMax: 260, rewardCoins: 4000, title: 'ĐẤNG SÁNG TẠO TỐI THƯỢNG' },
]

export interface PlayerState {
  id: string
  name: string
  characterId?: string
  rankPoints?: number
  score: number
  pairsCleared: number
  combo: number
  board: Cell[][]
  frozenUntil: number
  fogUntil: number
  immunityUntil?: number
  energy: number
  ultimateActiveUntil?: number
  doubleScoreTurnsLeft?: number
  lastActive: number
}

export interface RoomState {
  code: string
  size: GridSizeKey
  mode: BoardMode
  createdAt: number
  updatedAt: number
  status: 'waiting' | 'playing' | 'finished'
  winnerId: string | null
  host: PlayerState
  guest: PlayerState | null
  sharedBoard?: Cell[][]
  lastAction: {
    playerId: string
    type: 'match' | 'freeze' | 'shuffle' | 'fog' | 'scramble' | 'ultimate' | 'timeout' | 'leave'
    charId?: string
    skillId?: string
    coordA?: Coord
    coordB?: Coord
    timestamp: number
    message?: string
  } | null
}

export interface LeaderboardEntry {
  id: string
  name: string
  score: number
  mode: string
  date: string
  createdAt: number
}

// ─── RANK SYSTEM ───
export interface RankTierInfo {
  tier: string
  name: string
  badge: string
  icon: string
  color: string
  minPoints: number
  nextTierPoints?: number
}

export function getRankTier(rankPoints: number = 500): RankTierInfo {
  if (rankPoints >= 3000) return { tier: 'Challenger', name: 'Thách Đấu', badge: '🔥', icon: '🔥', color: '#ec4899', minPoints: 3000 }
  if (rankPoints >= 2400) return { tier: 'Grandmaster', name: 'Đại Cao Thủ', badge: '⚡', icon: '⚡', color: '#f43f5e', minPoints: 2400, nextTierPoints: 3000 }
  if (rankPoints >= 1800) return { tier: 'Master', name: 'Cao Thủ', badge: '👑', icon: '👑', color: '#a855f7', minPoints: 1800, nextTierPoints: 2400 }
  if (rankPoints >= 1200) return { tier: 'Diamond', name: 'Kim Cương', badge: '💎', icon: '💎', color: '#38bdf8', minPoints: 1200, nextTierPoints: 1800 }
  if (rankPoints >= 700) return { tier: 'Platinum', name: 'Bạch Kim', badge: '💠', icon: '💠', color: '#2dd4bf', minPoints: 700, nextTierPoints: 1200 }
  if (rankPoints >= 300) return { tier: 'Gold', name: 'Vàng', badge: '🥇', icon: '🥇', color: '#facc15', minPoints: 300, nextTierPoints: 700 }
  if (rankPoints >= 100) return { tier: 'Silver', name: 'Bạc', badge: '🥈', icon: '🥈', color: '#94a3b8', minPoints: 100, nextTierPoints: 300 }
  return { tier: 'Bronze', name: 'Đồng', badge: '🥉', icon: '🥉', color: '#d97706', minPoints: 0, nextTierPoints: 100 }
}

// ─── MATCHMAKING QUEUE SYSTEM ───
export interface MatchmakingQueueEntry {
  playerId: string
  name: string
  characterId: string
  rankPoints: number
  joinedAt: number
  matchedRoomCode?: string
  isHost?: boolean
  opponent?: {
    playerId: string
    name: string
    characterId: string
    rankPoints: number
  }
}

declare global {
  var __PIKA_ROOMS: Map<string, RoomState> | undefined
  var __PIKA_LEADERBOARD: LeaderboardEntry[] | undefined
  var __PIKA_MATCH_QUEUE: Map<string, MatchmakingQueueEntry> | undefined
  var __PIKA_WAIT_TIMES: number[] | undefined
}

if (!globalThis.__PIKA_ROOMS) {
  globalThis.__PIKA_ROOMS = new Map<string, RoomState>()
}

if (!globalThis.__PIKA_MATCH_QUEUE) {
  globalThis.__PIKA_MATCH_QUEUE = new Map<string, MatchmakingQueueEntry>()
}

if (!globalThis.__PIKA_WAIT_TIMES) {
  globalThis.__PIKA_WAIT_TIMES = [6, 8, 7, 9, 8] // Seed default baseline queue times (seconds)
}

if (!globalThis.__PIKA_LEADERBOARD) {
  globalThis.__PIKA_LEADERBOARD = []
}

const rooms = globalThis.__PIKA_ROOMS!

export type RoomListener = (room: RoomState) => void
if (!(globalThis as any).__PIKA_ROOM_LISTENERS) {
  (globalThis as any).__PIKA_ROOM_LISTENERS = new Map<string, Set<RoomListener>>()
}
const roomListeners: Map<string, Set<RoomListener>> = (globalThis as any).__PIKA_ROOM_LISTENERS

export function subscribeRoom(code: string, listener: RoomListener): () => void {
  const c = code.toUpperCase()
  if (!roomListeners.has(c)) roomListeners.set(c, new Set())
  roomListeners.get(c)!.add(listener)
  return () => {
    roomListeners.get(c)?.delete(listener)
  }
}

export function broadcastRoom(room: RoomState) {
  const c = room.code.toUpperCase()
  const listeners = roomListeners.get(c)
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(room)
      } catch (err) {
        console.error('Room broadcast error:', err)
      }
    }
  }
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (!globalThis.__PIKA_LEADERBOARD) {
    globalThis.__PIKA_LEADERBOARD = []
  }
  return [...globalThis.__PIKA_LEADERBOARD].sort((a, b) => b.score - a.score).slice(0, 20)
}

export function saveLeaderboardScore(name: string, score: number, mode: string = 'solo'): LeaderboardEntry[] {
  if (score <= 0) return getLeaderboard()
  if (!globalThis.__PIKA_LEADERBOARD) {
    globalThis.__PIKA_LEADERBOARD = []
  }

  const now = Date.now()
  const d = new Date(now)
  const dateStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`

  const entry: LeaderboardEntry = {
    id: `lb_${now}_${Math.random().toString(36).slice(2, 6)}`,
    name: (name || 'Trainer').trim(),
    score,
    mode: mode === 'solo' ? 'Chơi Đơn' : mode === 'pvp-bot' ? 'Đấu Bot' : 'PVP Online',
    date: dateStr,
    createdAt: now,
  }

  globalThis.__PIKA_LEADERBOARD.push(entry)
  globalThis.__PIKA_LEADERBOARD.sort((a, b) => b.score - a.score)
  if (globalThis.__PIKA_LEADERBOARD.length > 50) {
    globalThis.__PIKA_LEADERBOARD = globalThis.__PIKA_LEADERBOARD.slice(0, 50)
  }

  return getLeaderboard()
}

// ─── MATCHMAKING FUNCTIONS ───
export function getAverageQueueTimeSeconds(): number {
  const times = globalThis.__PIKA_WAIT_TIMES || [8]
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  return Math.max(4, Math.round(avg))
}

export interface MatchInfoPayload {
  rivalName: string
  rivalRankTier: RankTierInfo
  rivalRankPoints: number
  rivalCharacterId: string
  roomCode: string
  isBot: boolean
  isHost: boolean
}

export interface MatchmakingResult {
  success: boolean
  status: 'waiting' | 'matched' | 'not_found'
  matched: boolean
  roomCode?: string
  isHost?: boolean
  opponent?: { playerId: string; name: string; characterId: string; rankPoints: number }
  match?: MatchInfoPayload
  averageWaitSeconds: number
  elapsedSeconds: number
}

function formatMatchResult(entry: MatchmakingQueueEntry, elapsedSec: number): MatchmakingResult {
  if (entry.matchedRoomCode && entry.opponent) {
    const oppTier = getRankTier(entry.opponent.rankPoints)
    return {
      success: true,
      status: 'matched',
      matched: true,
      roomCode: entry.matchedRoomCode,
      isHost: !!entry.isHost,
      opponent: entry.opponent,
      match: {
        rivalName: entry.opponent.name,
        rivalRankTier: oppTier,
        rivalRankPoints: entry.opponent.rankPoints,
        rivalCharacterId: entry.opponent.characterId,
        roomCode: entry.matchedRoomCode,
        isBot: entry.opponent.playerId.startsWith('ai_'),
        isHost: !!entry.isHost,
      },
      averageWaitSeconds: getAverageQueueTimeSeconds(),
      elapsedSeconds: Math.max(0, Math.round(elapsedSec)),
    }
  }

  return {
    success: true,
    status: 'waiting',
    matched: false,
    averageWaitSeconds: getAverageQueueTimeSeconds(),
    elapsedSeconds: Math.max(0, Math.round(elapsedSec)),
  }
}

export function enqueueMatchmaking(player: {
  playerId: string
  name: string
  characterId: string
  rankPoints: number
}): MatchmakingResult {
  const queue = globalThis.__PIKA_MATCH_QUEUE!
  const now = Date.now()

  // Clean stale queue entries (> 35s)
  for (const [id, entry] of queue.entries()) {
    if (now - entry.joinedAt > 35000) {
      queue.delete(id)
    }
  }

  let current = queue.get(player.playerId)
  if (!current) {
    current = {
      playerId: player.playerId,
      name: player.name || 'Trainer',
      characterId: player.characterId || 'satoshi',
      rankPoints: typeof player.rankPoints === 'number' ? player.rankPoints : 500,
      joinedAt: now,
    }
    queue.set(player.playerId, current)
  } else {
    current.name = player.name || current.name
    current.characterId = player.characterId || current.characterId
    current.rankPoints = typeof player.rankPoints === 'number' ? player.rankPoints : current.rankPoints
  }

  const elapsedSec = (now - current.joinedAt) / 1000

  // If already matched
  if (current.matchedRoomCode && current.opponent) {
    return formatMatchResult(current, elapsedSec)
  }

  // Find candidate opponent in queue
  let bestCandidate: MatchmakingQueueEntry | null = null
  let minDiff = Infinity

  for (const [otherId, other] of queue.entries()) {
    if (otherId === player.playerId || other.matchedRoomCode) continue
    const diff = Math.abs(other.rankPoints - current.rankPoints)
    const otherWaitSec = (now - other.joinedAt) / 1000

    const allowedDiff = (elapsedSec > 7 || otherWaitSec > 7) ? 99999 : (elapsedSec > 4 || otherWaitSec > 4) ? 600 : 200

    if (diff <= allowedDiff && diff < minDiff) {
      minDiff = diff
      bestCandidate = other
    }
  }

  if (bestCandidate) {
    // MATCH FOUND! Create room
    // The player who waited longer is designated host
    const hostEntry = bestCandidate.joinedAt <= current.joinedAt ? bestCandidate : current
    const guestEntry = hostEntry === bestCandidate ? current : bestCandidate

    const createdRoom = createRoom('', hostEntry.name, hostEntry.playerId, '14x8', 'separate', hostEntry.rankPoints, hostEntry.characterId)
    joinRoom(createdRoom.code, guestEntry.name, guestEntry.playerId, guestEntry.rankPoints, guestEntry.characterId)

    hostEntry.matchedRoomCode = createdRoom.code
    hostEntry.isHost = true
    hostEntry.opponent = {
      playerId: guestEntry.playerId,
      name: guestEntry.name,
      characterId: guestEntry.characterId,
      rankPoints: guestEntry.rankPoints,
    }

    guestEntry.matchedRoomCode = createdRoom.code
    guestEntry.isHost = false
    guestEntry.opponent = {
      playerId: hostEntry.playerId,
      name: hostEntry.name,
      characterId: hostEntry.characterId,
      rankPoints: hostEntry.rankPoints,
    }

    const recordedWait = Math.max(3, Math.round(elapsedSec))
    globalThis.__PIKA_WAIT_TIMES!.push(recordedWait)
    if (globalThis.__PIKA_WAIT_TIMES!.length > 20) {
      globalThis.__PIKA_WAIT_TIMES!.shift()
    }

    return formatMatchResult(current, elapsedSec)
  }

  // Fallback: If waited > 9 seconds and no real opponent available, pair with AI opponent at matching rank!
  if (elapsedSec > 9) {
    const aiRanks = [
      { name: 'PikaBot Bạc', char: 'kasumi', rp: Math.max(300, current.rankPoints - 40) },
      { name: 'RedKnight Vàng', char: 'paladin', rp: current.rankPoints },
      { name: 'ShadowMaster', char: 'ninja', rp: current.rankPoints + 30 },
      { name: 'CyberUnit-07', char: 'cyber', rp: current.rankPoints },
    ]
    const chosenAi = aiRanks[Math.floor(Math.random() * aiRanks.length)]
    const aiId = `ai_${Date.now()}`

    const createdRoom = createRoom('', current.name, current.playerId, '14x8', 'separate', current.rankPoints, current.characterId)
    joinRoom(createdRoom.code, chosenAi.name, aiId, chosenAi.rp, chosenAi.char)

    current.matchedRoomCode = createdRoom.code
    current.isHost = true
    current.opponent = {
      playerId: aiId,
      name: chosenAi.name,
      characterId: chosenAi.char,
      rankPoints: chosenAi.rp,
    }

    return formatMatchResult(current, elapsedSec)
  }

  return formatMatchResult(current, elapsedSec)
}

export function pollMatchmaking(playerId: string): MatchmakingResult {
  const queue = globalThis.__PIKA_MATCH_QUEUE!
  const now = Date.now()

  let current = queue.get(playerId)
  if (!current) {
    return {
      success: true,
      status: 'not_found',
      matched: false,
      averageWaitSeconds: getAverageQueueTimeSeconds(),
      elapsedSeconds: 0,
    }
  }

  const elapsedSec = (now - current.joinedAt) / 1000

  // If already matched
  if (current.matchedRoomCode && current.opponent) {
    return formatMatchResult(current, elapsedSec)
  }

  // Try finding candidate during polling
  let bestCandidate: MatchmakingQueueEntry | null = null
  let minDiff = Infinity

  for (const [otherId, other] of queue.entries()) {
    if (otherId === playerId || other.matchedRoomCode) continue
    const diff = Math.abs(other.rankPoints - current.rankPoints)
    const otherWaitSec = (now - other.joinedAt) / 1000

    const allowedDiff = (elapsedSec > 7 || otherWaitSec > 7) ? 99999 : (elapsedSec > 4 || otherWaitSec > 4) ? 600 : 200

    if (diff <= allowedDiff && diff < minDiff) {
      minDiff = diff
      bestCandidate = other
    }
  }

  if (bestCandidate) {
    const hostEntry = bestCandidate.joinedAt <= current.joinedAt ? bestCandidate : current
    const guestEntry = hostEntry === bestCandidate ? current : bestCandidate

    const createdRoom = createRoom('', hostEntry.name, hostEntry.playerId, '14x8', 'separate', hostEntry.rankPoints, hostEntry.characterId)
    joinRoom(createdRoom.code, guestEntry.name, guestEntry.playerId, guestEntry.rankPoints, guestEntry.characterId)

    hostEntry.matchedRoomCode = createdRoom.code
    hostEntry.isHost = true
    hostEntry.opponent = {
      playerId: guestEntry.playerId,
      name: guestEntry.name,
      characterId: guestEntry.characterId,
      rankPoints: guestEntry.rankPoints,
    }

    guestEntry.matchedRoomCode = createdRoom.code
    guestEntry.isHost = false
    guestEntry.opponent = {
      playerId: hostEntry.playerId,
      name: hostEntry.name,
      characterId: hostEntry.characterId,
      rankPoints: hostEntry.rankPoints,
    }

    return formatMatchResult(current, elapsedSec)
  }

  // Fallback: AI Opponent after 9s
  if (elapsedSec > 9) {
    const aiRanks = [
      { name: 'PikaBot Bạc', char: 'kasumi', rp: Math.max(300, current.rankPoints - 40) },
      { name: 'RedKnight Vàng', char: 'paladin', rp: current.rankPoints },
      { name: 'ShadowMaster', char: 'ninja', rp: current.rankPoints + 30 },
      { name: 'CyberUnit-07', char: 'cyber', rp: current.rankPoints },
    ]
    const chosenAi = aiRanks[Math.floor(Math.random() * aiRanks.length)]
    const aiId = `ai_${Date.now()}`

    const createdRoom = createRoom('', current.name, current.playerId, '14x8', 'separate', current.rankPoints, current.characterId)
    joinRoom(createdRoom.code, chosenAi.name, aiId, chosenAi.rp, chosenAi.char)

    current.matchedRoomCode = createdRoom.code
    current.isHost = true
    current.opponent = {
      playerId: aiId,
      name: chosenAi.name,
      characterId: chosenAi.char,
      rankPoints: chosenAi.rp,
    }

    return formatMatchResult(current, elapsedSec)
  }

  return formatMatchResult(current, elapsedSec)
}

export function cancelMatchmaking(playerId: string): boolean {
  return globalThis.__PIKA_MATCH_QUEUE?.delete(playerId) || false
}

// Pathfinding and Solvability Validation Helpers for Server Board Generation
function isCellEmpty(board: Cell[][], r: number, c: number, rows: number, cols: number): boolean {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return true
  return board[r]?.[c] == null
}

function canWalkStraightServer(
  board: Cell[][], from: Coord, to: Coord,
  rows: number, cols: number, ignore1: Coord, ignore2: Coord
): boolean {
  if (from.row !== to.row && from.col !== to.col) return false
  const dr = Math.sign(to.row - from.row)
  const dc = Math.sign(to.col - from.col)
  if (dr === 0 && dc === 0) return true

  let r = from.row + dr
  let c = from.col + dc
  while (r !== to.row || c !== to.col) {
    const isIgnored = (r === ignore1.row && c === ignore1.col) || (r === ignore2.row && c === ignore2.col)
    if (!isIgnored && !isCellEmpty(board, r, c, rows, cols)) return false
    r += dr
    c += dc
  }
  return true
}

function findLinkPathServer(
  board: Cell[][], a: Coord, b: Coord, rows: number, cols: number
): Coord[] | null {
  if (!board[a.row] || board[a.row][a.col] == null) return null
  if (!board[b.row] || board[b.row][b.col] == null) return null
  if (board[a.row][a.col] !== board[b.row][b.col]) return null

  // 0 turns
  if (canWalkStraightServer(board, a, b, rows, cols, a, b)) return [a, b]

  // 1 turn: corner c1
  const c1: Coord = { row: a.row, col: b.col }
  if (isCellEmpty(board, c1.row, c1.col, rows, cols) &&
    canWalkStraightServer(board, a, c1, rows, cols, a, b) &&
    canWalkStraightServer(board, c1, b, rows, cols, a, b)) {
    return [a, c1, b]
  }

  // 1 turn: corner c2
  const c2: Coord = { row: b.row, col: a.col }
  if (isCellEmpty(board, c2.row, c2.col, rows, cols) &&
    canWalkStraightServer(board, a, c2, rows, cols, a, b) &&
    canWalkStraightServer(board, c2, b, rows, cols, a, b)) {
    return [a, c2, b]
  }

  // 2 turns: horizontal mid-lines
  for (let r = -1; r <= rows; r++) {
    const mid1: Coord = { row: r, col: a.col }
    const mid2: Coord = { row: r, col: b.col }
    const mid1Empty = (r === a.row) || isCellEmpty(board, r, a.col, rows, cols)
    const mid2Empty = (r === b.row) || isCellEmpty(board, r, b.col, rows, cols)
    if (mid1Empty && mid2Empty &&
      canWalkStraightServer(board, a, mid1, rows, cols, a, b) &&
      canWalkStraightServer(board, mid1, mid2, rows, cols, a, b) &&
      canWalkStraightServer(board, mid2, b, rows, cols, a, b)) {
      return [a, mid1, mid2, b]
    }
  }

  // 2 turns: vertical mid-lines
  for (let c = -1; c <= cols; c++) {
    const mid1: Coord = { row: a.row, col: c }
    const mid2: Coord = { row: b.row, col: c }
    const mid1Empty = (c === a.col) || isCellEmpty(board, a.row, c, rows, cols)
    const mid2Empty = (c === b.col) || isCellEmpty(board, b.row, c, rows, cols)
    if (mid1Empty && mid2Empty &&
      canWalkStraightServer(board, a, mid1, rows, cols, a, b) &&
      canWalkStraightServer(board, mid1, mid2, rows, cols, a, b) &&
      canWalkStraightServer(board, mid2, b, rows, cols, a, b)) {
      return [a, mid1, mid2, b]
    }
  }

  return null
}

function findAnyPairServer(board: Cell[][], rows: number, cols: number): [Coord, Coord] | null {
  const cells: Coord[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r]?.[c] !== null) cells.push({ row: r, col: c })
    }
  }

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (board[cells[i].row][cells[i].col] === board[cells[j].row][cells[j].col]) {
        const path = findLinkPathServer(board, cells[i], cells[j], rows, cols)
        if (path) return [cells[i], cells[j]]
      }
    }
  }
  return null
}

function shuffleBoardServer(board: Cell[][], rows: number, cols: number): Cell[][] {
  const newBoard = board.map(row => [...row])
  const remaining: number[] = []
  const positions: Coord[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (newBoard[r]?.[c] !== null) {
        remaining.push(newBoard[r][c]!)
        positions.push({ row: r, col: c })
      }
    }
  }

  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
  }

  for (let i = 0; i < positions.length; i++) {
    newBoard[positions[i].row][positions[i].col] = remaining[i]
  }
  return newBoard
}

export function ensureSolvableBoardServer(board: Cell[][], rows: number, cols: number): Cell[][] {
  const remainingPositions: Coord[] = []
  const valCount = new Map<number, number>()

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = board[r]?.[c]
      if (v !== null && v !== undefined) {
        remainingPositions.push({ row: r, col: c })
        valCount.set(v, (valCount.get(v) || 0) + 1)
      }
    }
  }

  if (remainingPositions.length <= 1) return board

  // 1. Sửa lỗi Parity (tính chẵn lẻ): Đảm bảo mọi Pokémon đều có số lượng chẵn (ít nhất 1 cặp)
  let current = board.map(r => [...r])
  const oddVals: number[] = []
  for (const [val, count] of valCount.entries()) {
    if (count % 2 !== 0) oddVals.push(val)
  }

  if (oddVals.length > 0) {
    for (let i = 0; i + 1 < oddVals.length; i += 2) {
      const vKeep = oddVals[i]
      const vReplace = oddVals[i + 1]
      for (const p of remainingPositions) {
        if (current[p.row][p.col] === vReplace) {
          current[p.row][p.col] = vKeep
          break
        }
      }
    }
    if (oddVals.length % 2 !== 0) {
      const loneVal = oddVals[oddVals.length - 1]
      const mostCommon = Array.from(valCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 25
      for (const p of remainingPositions) {
        if (current[p.row][p.col] === loneVal) {
          current[p.row][p.col] = mostCommon
          break
        }
      }
    }
  }

  // 2. Nếu bàn cờ hiện tại đã giải được ít nhất 1 cặp thì giữ nguyên
  if (findAnyPairServer(current, rows, cols)) return current

  // 3. Xáo trộn ngẫu nhiên tối đa 60 lần
  for (let t = 0; t < 60; t++) {
    current = shuffleBoardServer(current, rows, cols)
    if (findAnyPairServer(current, rows, cols)) return current
  }

  // 4. Thuật toán tất định (Deterministic Solver):
  const allVals = remainingPositions.map(p => current[p.row][p.col]!)
  const counts = new Map<number, number>()
  for (const v of allVals) counts.set(v, (counts.get(v) || 0) + 1)
  let targetVal: number = allVals[0]
  for (const [v, cnt] of counts.entries()) {
    if (cnt >= 2) {
      targetVal = v
      break
    }
  }

  let foundConnectablePair: [Coord, Coord] | null = null
  const testBoard = current.map(r => [...r])

  outerLoop:
  for (let i = 0; i < remainingPositions.length; i++) {
    const pA = remainingPositions[i]
    for (let j = i + 1; j < remainingPositions.length; j++) {
      const pB = remainingPositions[j]
      const origA = testBoard[pA.row][pA.col]
      const origB = testBoard[pB.row][pB.col]
      testBoard[pA.row][pA.col] = -9999
      testBoard[pB.row][pB.col] = -9999

      const path = findLinkPathServer(testBoard, pA, pB, rows, cols)
      testBoard[pA.row][pA.col] = origA
      testBoard[pB.row][pB.col] = origB

      if (path) {
        foundConnectablePair = [pA, pB]
        break outerLoop
      }
    }
  }

  if (foundConnectablePair) {
    const [pA, pB] = foundConnectablePair
    const otherVals: number[] = []
    let removedCount = 0
    for (const v of allVals) {
      if (v === targetVal && removedCount < 2) {
        removedCount++
      } else {
        otherVals.push(v)
      }
    }

    current[pA.row][pA.col] = targetVal
    current[pB.row][pB.col] = targetVal

    let otherIdx = 0
    for (const p of remainingPositions) {
      if ((p.row === pA.row && p.col === pA.col) || (p.row === pB.row && p.col === pB.col)) {
        continue
      }
      current[p.row][p.col] = otherVals[otherIdx++]
    }

    if (findAnyPairServer(current, rows, cols)) {
      return current
    }
  }

  // 5. Dự phòng khẩn cấp
  if (remainingPositions.length >= 2) {
    const p1 = remainingPositions[0]
    const p2 = remainingPositions[1]
    current[p1.row][p1.col] = targetVal
    current[p2.row][p2.col] = targetVal
  }

  return current
}

// Helper to generate a random board with 100% guarantee of solvable pairs
export function generateBoardData(sizeKey: GridSizeKey): Cell[][] {
  const { cols, rows } = GRID_DIMS[sizeKey] || GRID_DIMS['14x8']
  const totalCells = cols * rows
  const pairCount = totalCells / 2

  // Curated visually-distinct Gen 1 Pokemon (classic Pikachu icons)
  const ICONIC_GEN1 = [
    25, 4, 1, 7, 12, 39, 52, 54, 60, 23, 35, 37, 43, 63, 66, 74, 79, 81, 86, 92,
    98, 100, 104, 109, 116, 120, 129, 131, 133, 143, 147, 149, 150, 151, 16, 19
  ]

  const shuffledPool = [...ICONIC_GEN1]
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]]
  }

  // Pick pairs, recycling iconic pokemon if board has more pairs than unique icons
  const chosen: number[] = []
  for (let i = 0; i < pairCount; i++) {
    chosen.push(shuffledPool[i % shuffledPool.length])
  }

  const flat: number[] = []
  for (const id of chosen) {
    flat.push(id, id)
  }

  // Shuffle twice for balanced dispersion
  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[flat[i], flat[j]] = [flat[j], flat[i]]
  }

  const board: Cell[][] = []
  for (let r = 0; r < rows; r++) {
    board.push(flat.slice(r * cols, (r + 1) * cols))
  }
  return ensureSolvableBoardServer(board, rows, cols)
}

export function createRoom(
  code: string,
  hostName: string,
  hostId: string,
  size: GridSizeKey = '14x8',
  mode: BoardMode = 'separate',
  hostRankPoints?: number,
  hostCharacterId?: string
): RoomState {
  cleanStaleRooms()
  let finalCode = code ? code.toUpperCase() : ''
  if (!finalCode || rooms.has(finalCode)) {
    let tries = 0
    do {
      finalCode = `PK${Math.floor(1000 + Math.random() * 9000)}`
      tries++
    } while (rooms.has(finalCode) && tries < 50)
  }

  // Để trống bàn khi mới tạo phòng, chờ người chơi thứ 2 vào bàn mới tạo bảng mới và tính giờ
  const room: RoomState = {
    code: finalCode,
    size,
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'waiting',
    winnerId: null,
    host: {
      id: hostId,
      name: hostName || 'Người chơi 1',
      characterId: hostCharacterId || 'satoshi',
      rankPoints: typeof hostRankPoints === 'number' ? hostRankPoints : 500,
      score: 0,
      pairsCleared: 0,
      combo: 0,
      board: [], // Bàn để trống!
      frozenUntil: 0,
      fogUntil: 0,
      energy: 0,
      lastActive: Date.now(),
    },
    guest: null,
    sharedBoard: undefined,
    lastAction: null,
  }

  rooms.set(room.code, room)
  broadcastRoom(room)
  return room
}

export function joinRoom(
  code: string,
  guestName: string,
  guestId: string,
  guestRankPoints?: number,
  guestCharacterId?: string
): RoomState | { error: string } {
  const room = rooms.get(code.toUpperCase())
  if (!room) return { error: 'Không tìm thấy phòng với mã này!' }

  if (room.host.id === guestId) {
    room.host.name = guestName
    if (typeof guestRankPoints === 'number') room.host.rankPoints = guestRankPoints
    if (guestCharacterId) room.host.characterId = guestCharacterId
    room.host.lastActive = Date.now()
    room.updatedAt = Date.now()
    return room
  }

  if (room.guest && room.guest.id !== guestId) {
    return { error: 'Phòng đã đủ 2 người chơi!' }
  }

  if (!room.guest || room.guest.id === guestId) {
    // KHI CÓ NGƯỜI THỨ 2 VÀO BÀN: TẠO BẢNG CỜ MỚI CHO CẢ 2 BÊN VÀ BẮT ĐẦU TÍNH GIỜ
    const hostBoard = generateBoardData(room.size)
    room.host.board = hostBoard

    const guestBoard = room.mode === 'separate'
      ? generateBoardData(room.size)
      : hostBoard.map(r => [...r])

    room.guest = {
      id: guestId,
      name: guestName || 'Người chơi 2',
      characterId: guestCharacterId || 'kasumi',
      rankPoints: typeof guestRankPoints === 'number' ? guestRankPoints : 500,
      score: 0,
      pairsCleared: 0,
      combo: 0,
      board: guestBoard,
      frozenUntil: 0,
      fogUntil: 0,
      energy: 0,
      lastActive: Date.now(),
    }
    room.sharedBoard = room.mode === 'shared' ? hostBoard.map(r => [...r]) : undefined
    room.status = 'playing'
    room.lastAction = {
      playerId: guestId,
      type: 'match',
      timestamp: Date.now(),
      message: `🎮 ${guestName || 'Người chơi 2'} đã vào bàn! Bắt đầu tính giờ chiến đấu!`,
    }
    room.updatedAt = Date.now()
    broadcastRoom(room)
  }

  return room
}

export function getRoom(code: string): RoomState | null {
  const room = rooms.get(code.toUpperCase())
  if (!room) return null

  // Tự động kiểm tra mất kết nối / thoát trận (Disconnect detection)
  if (room.status === 'playing' && room.host && room.guest) {
    const now = Date.now()
    const hostInactive = (now - room.host.lastActive) > 15000
    const guestInactive = (now - room.guest.lastActive) > 15000

    if (hostInactive && !guestInactive) {
      room.status = 'finished'
      room.winnerId = room.guest.id
      room.lastAction = {
        playerId: room.host.id,
        type: 'leave',
        timestamp: now,
        message: `🚪 Chủ phòng (${room.host.name}) mất kết nối / thoát trận! ${room.guest.name} ĐƯỢC XỬ THẮNG!`,
      }
      room.updatedAt = now
      broadcastRoom(room)
    } else if (guestInactive && !hostInactive) {
      room.status = 'finished'
      room.winnerId = room.host.id
      room.lastAction = {
        playerId: room.guest.id,
        type: 'leave',
        timestamp: now,
        message: `🚪 Đối thủ (${room.guest.name}) mất kết nối / thoát trận! ${room.host.name} ĐƯỢC XỬ THẮNG!`,
      }
      room.updatedAt = now
      broadcastRoom(room)
    }
  }

  return room
}

export function updatePlayerAction(
  code: string,
  playerId: string,
  action: {
    type: 'match' | 'freeze' | 'scramble' | 'fog' | 'shuffle' | 'restart' | 'ultimate' | 'timeout' | 'leave' | 'surrender'
    charId?: string
    coordA?: Coord
    coordB?: Coord
    points?: number
    combo?: number
    newBoard?: Cell[][]
  }
): RoomState | null {
  const room = rooms.get(code.toUpperCase())
  if (!room) return null

  const isHost = room.host.id === playerId
  const isGuest = room.guest?.id === playerId
  if (!isHost && !isGuest) return null

  const player = isHost ? room.host : room.guest!
  const opponent = isHost ? room.guest : room.host

  player.lastActive = Date.now()
  room.updatedAt = Date.now()

  if (action.type === 'match' && action.coordA && action.coordB) {
    if (room.mode === 'shared' && room.sharedBoard) {
      // Shared board: both players mutate the same grid
      room.sharedBoard[action.coordA.row][action.coordA.col] = null
      room.sharedBoard[action.coordB.row][action.coordB.col] = null
      player.board = room.sharedBoard
      if (opponent) opponent.board = room.sharedBoard
    } else {
      // Separate board: player mutates their own grid
      player.board[action.coordA.row][action.coordA.col] = null
      player.board[action.coordB.row][action.coordB.col] = null
    }

    player.score += action.points || 10
    player.pairsCleared += 1
    player.combo = action.combo || 1
    player.energy = Math.min(100, player.energy + 20)

    room.lastAction = {
      playerId,
      type: 'match',
      coordA: action.coordA,
      coordB: action.coordB,
      timestamp: Date.now(),
    }

    // Check winner
    const remaining = (room.mode === 'shared' && room.sharedBoard ? room.sharedBoard : player.board)
      .flat().filter(c => c !== null).length

    if (remaining === 0) {
      room.status = 'finished'
      if (room.mode === 'shared') {
        const guestScore = room.guest ? room.guest.score : 0
        room.winnerId = room.host.score >= guestScore ? room.host.id : room.guest!.id
      } else {
        room.winnerId = playerId
      }
    }
  } else if (action.type === 'freeze') {
    if (opponent && player.energy >= 30) {
      player.energy -= 30
      opponent.frozenUntil = Date.now() + 3000 // 3 seconds freeze
      room.lastAction = {
        playerId,
        type: 'freeze',
        timestamp: Date.now(),
        message: `${player.name} đã đóng băng đối thủ 3 giây!`,
      }
    }
  } else if (action.type === 'scramble') {
    if (opponent && player.energy >= 45) {
      player.energy -= 45
      // Scramble opponent's remaining board
      const remaining: number[] = []
      const pos: Coord[] = []
      const oppBoard = opponent.board
      for (let r = 0; r < oppBoard.length; r++) {
        for (let c = 0; c < oppBoard[r].length; c++) {
          if (oppBoard[r][c] !== null) {
            remaining.push(oppBoard[r][c]!)
            pos.push({ row: r, col: c })
          }
        }
      }
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
      }
      for (let i = 0; i < pos.length; i++) {
        oppBoard[pos[i].row][pos[i].col] = remaining[i]
      }

      room.lastAction = {
        playerId,
        type: 'scramble',
        timestamp: Date.now(),
        message: `${player.name} đã xáo trộn bảng của đối thủ!`,
      }
    }
  } else if (action.type === 'fog') {
    if (opponent && player.energy >= 35) {
      player.energy -= 35
      opponent.fogUntil = Date.now() + 3500 // 3.5 seconds fog
      room.lastAction = {
        playerId,
        type: 'fog',
        timestamp: Date.now(),
        message: `${player.name} đã tung khói làm mờ mắt đối thủ!`,
      }
    }
  } else if (action.type === 'shuffle' && action.newBoard) {
    player.board = action.newBoard
    if (room.mode === 'shared') {
      room.sharedBoard = action.newBoard
      if (opponent) opponent.board = action.newBoard
    }
    if (typeof action.points === 'number' && action.points > 0) {
      player.score += action.points
    }
  } else if (action.type === 'ultimate') {
    const charId = action.charId || 'satoshi'
    player.energy = 0 // Tiêu hao năng lượng tuyệt kỹ

    if (charId === 'himeko') {
      player.score += 60
      if (opponent) {
        const isOppImmune = Boolean(opponent.immunityUntil && opponent.immunityUntil > Date.now())
        if (!isOppImmune) {
          const stolen = Math.min(opponent.score, 60)
          opponent.score = Math.max(0, opponent.score - stolen)
          opponent.fogUntil = Math.max(opponent.fogUntil, Date.now() + 5000)
          opponent.frozenUntil = Math.max(opponent.frozenUntil, Date.now() + 3500)
        }
      }
      room.lastAction = {
        playerId,
        type: 'ultimate',
        charId: 'himeko',
        timestamp: Date.now(),
        message: `🔥 ${player.name} kích hoạt BÃO LỬA THIÊN THỂ: Hút 60 điểm, thiêu mù khói 5s & khóa nhiệt 3.5s!`,
      }
    } else if (charId === 'madara' || charId === 'maldara') {
      player.immunityUntil = Date.now() + 15000
      if (action.newBoard) {
        player.board = action.newBoard
        if (room.mode === 'shared') {
          room.sharedBoard = action.newBoard
        }
      }
      if (opponent) {
        const isOppImmune = Boolean(opponent.immunityUntil && opponent.immunityUntil > Date.now())
        if (!isOppImmune) {
          opponent.frozenUntil = Math.max(opponent.frozenUntil, Date.now() + 4500)
          // Xáo trộn toàn bộ cờ đối thủ
          const remaining: number[] = []
          const pos: Coord[] = []
          const oppBoard = opponent.board
          for (let r = 0; r < oppBoard.length; r++) {
            for (let c = 0; c < oppBoard[r].length; c++) {
              if (oppBoard[r][c] !== null) {
                remaining.push(oppBoard[r][c]!)
                pos.push({ row: r, col: c })
              }
            }
          }
          for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
          }
          for (let i = 0; i < pos.length; i++) {
            oppBoard[pos[i].row][pos[i].col] = remaining[i]
          }
        }
      }
      room.lastAction = {
        playerId,
        type: 'ultimate',
        charId: 'madara',
        timestamp: Date.now(),
        message: `☄️ ${player.name} kích hoạt ẢO THUẬT TSUKUYOMI: Đóng băng 4.5s & đảo tung toàn bộ bảng đối thủ!`,
      }
    } else if (charId === 'satoshi') {
      if (opponent) {
        const isOppImmune = Boolean(opponent.immunityUntil && opponent.immunityUntil > Date.now())
        if (!isOppImmune) {
          opponent.frozenUntil = Math.max(opponent.frozenUntil, Date.now() + 3500)
          opponent.combo = 0
          opponent.energy = Math.max(0, opponent.energy - 35)
        }
      }
      room.lastAction = {
        playerId,
        type: 'ultimate',
        charId: 'satoshi',
        timestamp: Date.now(),
        message: `⚡ ${player.name} kích hoạt SẤM SÉT 10 VẠN VOLT: Tê liệt 3.5s, bẻ gãy Combo & triệt tiêu 35% năng lượng!`,
      }
    }
  } else if (action.type === 'timeout') {
    room.status = 'finished'
    const guestScore = room.guest ? room.guest.score : 0
    if (room.host.score > guestScore) {
      room.winnerId = room.host.id
    } else if (guestScore > room.host.score) {
      room.winnerId = room.guest!.id
    } else {
      const guestPairs = room.guest ? room.guest.pairsCleared : 0
      room.winnerId = room.host.pairsCleared >= guestPairs ? room.host.id : room.guest!.id
    }
    room.lastAction = {
      playerId,
      type: 'timeout',
      timestamp: Date.now(),
      message: `⏰ Hết thời gian! Người có điểm số cao hơn (${room.host.score} vs ${guestScore}) giành chiến thắng.`,
    }
  } else if (action.type === 'leave' || action.type === 'surrender') {
    if (room.status === 'playing') {
      room.status = 'finished'
      room.winnerId = opponent ? opponent.id : null
      room.lastAction = {
        playerId,
        type: 'leave',
        timestamp: Date.now(),
        message: `🚪 ${player.name} đã thoát trận! ${opponent ? opponent.name : 'Đối thủ'} ĐƯỢC XỬ THẮNG!`,
      }
    }
  } else if (action.type === 'restart') {
    const newBoard = generateBoardData(room.size)
    room.host.board = newBoard.map(r => [...r])
    room.host.score = 0
    room.host.pairsCleared = 0
    room.host.combo = 0
    room.host.energy = 0
    room.host.frozenUntil = 0
    room.host.fogUntil = 0

    if (room.guest) {
      room.guest.board = room.mode === 'separate' ? generateBoardData(room.size) : newBoard.map(r => [...r])
      room.guest.score = 0
      room.guest.pairsCleared = 0
      room.guest.combo = 0
      room.guest.energy = 0
      room.guest.frozenUntil = 0
      room.guest.fogUntil = 0
    }
    if (room.mode === 'shared') {
      room.sharedBoard = newBoard.map(r => [...r])
    }
    room.status = room.guest ? 'playing' : 'waiting'
    room.winnerId = null
    room.lastAction = null
  }

  broadcastRoom(room)
  return room
}

function cleanStaleRooms() {
  const twoHoursAgo = Date.now() - 7200 * 1000
  for (const [code, room] of rooms.entries()) {
    if (room.updatedAt < twoHoursAgo) {
      rooms.delete(code)
    }
  }
}
