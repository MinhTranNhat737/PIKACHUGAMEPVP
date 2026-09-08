import fs from 'fs'
import path from 'path'
import { LeaderboardEntry } from './game-state'

function getLeaderboardFilePath(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  const dataDir = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    try { fs.mkdirSync(dataDir, { recursive: true }) } catch {}
  }
  return path.join(dataDir, 'leaderboard.json')
}

export function loadLeaderboardFromFile(): LeaderboardEntry[] {
  try {
    const filePath = getLeaderboardFilePath()
    let rawData: string | null = null
    if (fs.existsSync(filePath)) {
      rawData = fs.readFileSync(filePath, 'utf-8')
    } else {
      const seedPath = path.join(process.cwd(), 'data', 'leaderboard.json')
      if (fs.existsSync(seedPath)) {
        rawData = fs.readFileSync(seedPath, 'utf-8')
        try { fs.writeFileSync(filePath, rawData, 'utf-8') } catch {}
      }
    }

    if (rawData) {
      const data = JSON.parse(rawData)
      if (Array.isArray(data)) return data
    }
  } catch {}
  return []
}

export function saveLeaderboardToFile(list: LeaderboardEntry[]) {
  try {
    const filePath = getLeaderboardFilePath()
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
  } catch {}
}

declare global {
  var __PIKA_LEADERBOARD: LeaderboardEntry[] | undefined
}

if (!globalThis.__PIKA_LEADERBOARD) {
  globalThis.__PIKA_LEADERBOARD = loadLeaderboardFromFile()
}

export function getLeaderboard(): LeaderboardEntry[] {
  if (!globalThis.__PIKA_LEADERBOARD || globalThis.__PIKA_LEADERBOARD.length === 0) {
    globalThis.__PIKA_LEADERBOARD = loadLeaderboardFromFile()
  }
  return [...globalThis.__PIKA_LEADERBOARD].sort((a, b) => b.score - a.score).slice(0, 20)
}

export function saveLeaderboardScore(name: string, score: number, mode: string = 'solo'): LeaderboardEntry[] {
  if (score <= 0) return getLeaderboard()
  if (!globalThis.__PIKA_LEADERBOARD) {
    globalThis.__PIKA_LEADERBOARD = loadLeaderboardFromFile()
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

  saveLeaderboardToFile(globalThis.__PIKA_LEADERBOARD)
  return getLeaderboard()
}
