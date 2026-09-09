'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Volume2, VolumeX, Shuffle, Lightbulb, RotateCcw,
  Trophy, Users, User, Bot, Sparkles, Snowflake, Wind, EyeOff,
  Copy, Check, DoorOpen, LogOut, ArrowRight, ArrowLeft, ShieldAlert, Music,
  Coins, ShoppingBag, Lock, Unlock, KeyRound, LogIn, BookOpen, Maximize2,
  Swords, Flame, Zap, Shield, Crown, Compass, Milestone, Play
} from 'lucide-react'
import { playSound, startBgm, stopBgm, getIsBgmPlaying, autoUnlockAudio, isAudioRunning, subscribeAudioReady } from '@/lib/sound'
import { GridSizeKey, BoardMode, GRID_DIMS, Cell, Coord, RoomState, LeaderboardEntry, BOT_LEVELS, BotLevelConfig, getRankTier, BOT_FLOORS, BotFloorConfig, getBotFloorByLevel } from '@/lib/game-state'
import { SHOP_CATALOG, ShopItem, UserAccount } from '@/lib/shop-catalog'
import { CharacterAvatar } from '@/components/character-avatar'
import { AvatarSkillBeams, AvatarSkillBeam } from '@/components/avatar-skill-beams'
import { CHARACTERS, CharacterEmotion, getCharacterById, UltimateSkill, PixelCharacter } from '@/lib/character-catalog'
import { CAMPAIGN_CHAPTERS, CampaignChapter, BossStageConfig, getStageById, getChapterById } from '@/lib/campaign-catalog'

export type SpriteTheme = 'artwork' | 'retro' | 'home'

// Curated visually-distinct Gen 1 Pokemon (classic Pikachu icons)
const ICONIC_GEN1 = [
  25, 4, 1, 7, 12, 39, 52, 54, 60, 23, 35, 37, 43, 63, 66, 74, 79, 81, 86, 92,
  98, 100, 104, 109, 116, 120, 129, 131, 133, 143, 147, 149, 150, 151, 16, 19
]

const getSpriteUrl = (id: number, theme: SpriteTheme = 'artwork') => {
  if (theme === 'home') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`
  }
  if (theme === 'retro') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

const DEFAULT_TIME = 300 // 5 minutes
const DEFAULT_HINTS = 3
const DEFAULT_SHUFFLES = 10

type PlayMode = 'solo' | 'pvp-bot' | 'pvp-online' | 'campaign'

/* ──────────────────────────────────────────────
   Pathfinding (Pikachu Classic Rules - Max 2 turns)
   ────────────────────────────────────────────── */
function isEmpty(board: Cell[][], r: number, c: number, rows: number, cols: number): boolean {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return true
  return board[r]?.[c] === null
}

function canWalkStraight(
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
    if (!isIgnored && !isEmpty(board, r, c, rows, cols)) return false
    r += dr
    c += dc
  }
  return true
}

function findLinkPath(
  board: Cell[][], a: Coord, b: Coord, rows: number, cols: number
): Coord[] | null {
  if (!board[a.row] || board[a.row][a.col] == null) return null
  if (!board[b.row] || board[b.row][b.col] == null) return null
  if (board[a.row][a.col] !== board[b.row][b.col]) return null

  // 0 turns: straight line
  if (canWalkStraight(board, a, b, rows, cols, a, b)) return [a, b]

  // 1 turn: corner c1
  const c1: Coord = { row: a.row, col: b.col }
  if (isEmpty(board, c1.row, c1.col, rows, cols) &&
    canWalkStraight(board, a, c1, rows, cols, a, b) &&
    canWalkStraight(board, c1, b, rows, cols, a, b)) {
    return [a, c1, b]
  }

  // 1 turn: corner c2
  const c2: Coord = { row: b.row, col: a.col }
  if (isEmpty(board, c2.row, c2.col, rows, cols) &&
    canWalkStraight(board, a, c2, rows, cols, a, b) &&
    canWalkStraight(board, c2, b, rows, cols, a, b)) {
    return [a, c2, b]
  }

  // 2 turns: iterate horizontal mid-lines
  for (let r = -1; r <= rows; r++) {
    const mid1: Coord = { row: r, col: a.col }
    const mid2: Coord = { row: r, col: b.col }
    const mid1Empty = (r === a.row) || isEmpty(board, r, a.col, rows, cols)
    const mid2Empty = (r === b.row) || isEmpty(board, r, b.col, rows, cols)
    if (mid1Empty && mid2Empty &&
      canWalkStraight(board, a, mid1, rows, cols, a, b) &&
      canWalkStraight(board, mid1, mid2, rows, cols, a, b) &&
      canWalkStraight(board, mid2, b, rows, cols, a, b)) {
      return [a, mid1, mid2, b]
    }
  }

  // 2 turns: iterate vertical mid-lines
  for (let c = -1; c <= cols; c++) {
    const mid1: Coord = { row: a.row, col: c }
    const mid2: Coord = { row: b.row, col: c }
    const mid1Empty = (c === a.col) || isEmpty(board, a.row, c, rows, cols)
    const mid2Empty = (c === b.col) || isEmpty(board, b.row, c, rows, cols)
    if (mid1Empty && mid2Empty &&
      canWalkStraight(board, a, mid1, rows, cols, a, b) &&
      canWalkStraight(board, mid1, mid2, rows, cols, a, b) &&
      canWalkStraight(board, mid2, b, rows, cols, a, b)) {
      return [a, mid1, mid2, b]
    }
  }

  return null
}

function findAnyPair(board: Cell[][], rows: number, cols: number): [Coord, Coord] | null {
  const cells: Coord[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r]?.[c] !== null) cells.push({ row: r, col: c })
    }
  }

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (board[cells[i].row][cells[i].col] === board[cells[j].row][cells[j].col]) {
        const path = findLinkPath(board, cells[i], cells[j], rows, cols)
        if (path) return [cells[i], cells[j]]
      }
    }
  }
  return null
}

export interface ElementalZap {
  id: string
  row: number
  col: number
  element: 'electric' | 'water' | 'holy' | 'astral' | 'shadow' | 'arrow' | 'cyber' | 'frost' | 'fire'
  badge: string
}

function findPairsToClear(board: Cell[][], count: number, rows: number, cols: number): { pairs: [Coord, Coord][]; newBoard: Cell[][]; cleared: number; points: number } {
  const cur = board.map(row => [...row])
  const pairs: [Coord, Coord][] = []
  let cleared = 0
  for (let step = 0; step < count; step++) {
    const pair = findAnyPair(cur, rows, cols)
    if (pair) {
      pairs.push(pair)
      cur[pair[0].row][pair[0].col] = null
      cur[pair[1].row][pair[1].col] = null
      cleared++
    } else {
      break
    }
  }

  // Fallback nếu chưa đủ cặp ăn được: tìm bất kỳ cặp cùng hình nào để đảm bảo chiêu luôn phá hủy được ô cờ
  if (cleared < count) {
    const valMap = new Map<number, Coord[]>()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = cur[r][c]
        if (v !== null) {
          if (!valMap.has(v)) valMap.set(v, [])
          valMap.get(v)!.push({ row: r, col: c })
        }
      }
    }
    for (const coords of valMap.values()) {
      while (coords.length >= 2 && cleared < count) {
        const c1 = coords.pop()!
        const c2 = coords.pop()!
        pairs.push([c1, c2])
        cur[c1.row][c1.col] = null
        cur[c2.row][c2.col] = null
        cleared++
      }
      if (cleared >= count) break
    }
  }

  return { pairs, newBoard: cur, cleared, points: cleared * 15 }
}

function clearPairsHelper(board: Cell[][], count: number, rows: number, cols: number): { newBoard: Cell[][]; cleared: number; points: number } {
  const res = findPairsToClear(board, count, rows, cols)
  return { newBoard: res.newBoard, cleared: res.cleared, points: res.points }
}

function shuffleBoard(board: Cell[][], rows: number, cols: number): Cell[][] {
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

// Thuật toán đảm bảo bàn cờ luôn luôn giải được (ít nhất 1 cặp nối hợp lệ), không bao giờ bế tắc
function ensureSolvableBoard(board: Cell[][], rows: number, cols: number, forceShuffle: boolean = false): Cell[][] {
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
  // Tránh trường hợp có quân cờ mồ côi không bao giờ nối được
  let current = board.map(row => [...row])
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

  // 2. Nếu không yêu cầu xáo trộn ép buộc (forceShuffle = false) và bàn cờ hiện tại đã có ít nhất 1 cặp nối hợp lệ thì giữ nguyên
  if (!forceShuffle && findAnyPair(current, rows, cols)) return current

  // 3. Xáo trộn ngẫu nhiên tối đa 60 lần (khi forceShuffle = true: bắt buộc xáo trộn tìm cách xếp mới)
  for (let t = 0; t < 60; t++) {
    current = shuffleBoard(current, rows, cols)
    if (findAnyPair(current, rows, cols)) {
      return current
    }
  }

  // 4. Thuật toán tất định (Deterministic Solver) đảm bảo 100% CÓ CẶP NỐI:
  // Duyệt qua tất cả các cặp vị trí còn lại (pA, pB).
  // Kiểm tra xem có cặp vị trí nào mà đường đi Pikachu giữa chúng hợp lệ qua các ô trống không.
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

      const path = findLinkPath(testBoard, pA, pB, rows, cols)
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

    if (findAnyPair(current, rows, cols)) {
      return current
    }
  }

  // 5. Dự phòng khẩn cấp: Đặt 2 quân giống nhau cạnh nhau ở 2 ô còn lại đầu tiên
  if (remainingPositions.length >= 2) {
    const p1 = remainingPositions[0]
    const p2 = remainingPositions[1]
    current[p1.row][p1.col] = targetVal
    current[p2.row][p2.col] = targetVal
  }

  return current
}

function createLocalBoard(sizeKey: GridSizeKey): Cell[][] {
  const { cols, rows } = GRID_DIMS[sizeKey]
  const totalCells = cols * rows
  const pairCount = totalCells / 2

  const shuffledPool = [...ICONIC_GEN1]
  for (let i = shuffledPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]]
  }

  const chosen: number[] = []
  for (let i = 0; i < pairCount; i++) {
    chosen.push(shuffledPool[i % shuffledPool.length])
  }

  const flat: number[] = []
  for (const id of chosen) {
    flat.push(id, id)
  }

  for (let i = flat.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[flat[i], flat[j]] = [flat[j], flat[i]]
  }

  const board: Cell[][] = []
  for (let r = 0; r < rows; r++) {
    board.push(flat.slice(r * cols, (r + 1) * cols))
  }
  return ensureSolvableBoard(board, rows, cols)
}

/* ──────────────────────────────────────────────
   Sub-Component: Interactive Board
   ────────────────────────────────────────────── */
const BoardView = React.memo(function BoardView({
  board, cols, rows, selected, onSelect, linkPath, hintPair, matchingPair = null, isRival = false, spriteTheme = 'artwork',
  tileStyle = 'tile-classic', lineEffect = 'line-laser',
  isScrambling = false, shockwaves = [], matchParticles = [], floatingPopups = [],
  activeSkillZaps = [], wildcardCoords = [], solarFireCoords = [], electroCoreCoords = []
}: {
  board: Cell[][]
  cols: number
  rows: number
  selected: Coord | null
  onSelect?: (coord: Coord) => void
  linkPath: Coord[] | null
  hintPair: [Coord, Coord] | null
  matchingPair?: [Coord, Coord] | null
  isRival?: boolean
  spriteTheme?: SpriteTheme
  tileStyle?: string
  lineEffect?: string
  isScrambling?: boolean
  shockwaves?: Array<{ id: string; x: number; y: number }>
  matchParticles?: Array<{ id: string; x: number; y: number; color: string; tx: number; ty: number }>
  floatingPopups?: Array<{ id: string; x: number; y: number; text: string; color: string }>
  activeSkillZaps?: ElementalZap[]
  wildcardCoords?: string[]
  solarFireCoords?: string[]
  electroCoreCoords?: string[]
}) {
  // SVG laser line mapping: nối chính xác từ tâm ô vuông (col + 0.5) / cols
  const svgCoords = useMemo(() => {
    if (!linkPath || linkPath.length < 2) return null

    return linkPath.map(p => ({
      x: ((p.col + 0.5) / cols) * 100,
      y: ((p.row + 0.5) / rows) * 100,
    }))
  }, [linkPath, cols, rows])

  return (
    <div className={`grid-container ${tileStyle} ${isScrambling ? 'is-scrambling' : ''}`}>
      <div style={{ position: 'relative', width: '100%' }}>
        {/* Lưới các quân bài Pokémon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: isRival ? '2px' : '3px',
            width: '100%',
          }}
        >
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isSelected = selected?.row === r && selected?.col === c
              const isHint = hintPair && (
                (hintPair[0].row === r && hintPair[0].col === c) ||
                (hintPair[1].row === r && hintPair[1].col === c)
              )
              const isMatching = matchingPair && (
                (matchingPair[0].row === r && matchingPair[0].col === c) ||
                (matchingPair[1].row === r && matchingPair[1].col === c)
              )
              const isEmptyCell = cell === null
              const activeZap = !isEmptyCell ? (activeSkillZaps || []).find(z => z.row === r && z.col === c) : null
              const isWildcard = !isEmptyCell && (wildcardCoords || []).includes(`${r}-${c}`)
              const isSolarFire = !isEmptyCell && (solarFireCoords || []).includes(`${r}-${c}`)
              const isElectroCore = !isEmptyCell && (electroCoreCoords || []).includes(`${r}-${c}`)

              return (
                <div
                  id={isRival ? `rival-tile-${r}-${c}` : `board-tile-${r}-${c}`}
                  key={`${r}-${c}`}
                  className={[
                    'pika-tile',
                    isEmptyCell ? 'empty' : '',
                    isSelected ? 'selected' : '',
                    isHint ? 'hinted' : '',
                    isMatching ? 'tile-matching' : '',
                    isWildcard ? 'tile-is-wildcard' : '',
                    isSolarFire ? 'tile-is-solar-fire' : '',
                    isElectroCore ? 'tile-is-electro-core' : '',
                    activeZap ? `elemental-zap elemental-zap-${activeZap.element}` : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !isRival && !isMatching && onSelect && onSelect({ row: r, col: c })}
                  style={{ cursor: isRival ? 'default' : isMatching ? 'default' : 'pointer' }}
                >
                  {!isEmptyCell && (
                    <img
                      src={getSpriteUrl(cell, spriteTheme)}
                      alt={`Pika ${cell}`}
                      className={`pika-sprite ${spriteTheme === 'retro' ? 'sprite-pixelated' : ''}`}
                      loading="eager"
                    />
                  )}
                  {isSolarFire && (
                    <div className="tile-corner-tag fire-tag">
                      🔥 +80đ
                    </div>
                  )}
                  {isElectroCore && !isSolarFire && (
                    <div className="tile-corner-tag electro-tag">
                      ⚡ +50đ
                    </div>
                  )}
                  {isWildcard && !isSolarFire && !isElectroCore && (
                    <div className="tile-corner-tag joker-tag">
                      ⭐ JOKER
                    </div>
                  )}
                  {activeZap && (
                    <div className="zap-element-badge">
                      {activeZap.badge}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* SVG Lightning Line Overlay - Nối từ Tâm ô đến Tâm ô, Nằm Dưới Icon Pokémon */}
        {svgCoords && svgCoords.length >= 2 && (
          <svg className={`link-overlay ${lineEffect}`} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline className="link-line-glow" points={svgCoords.map(p => `${p.x},${p.y}`).join(' ')} />
            <polyline className="link-line-main" points={svgCoords.map(p => `${p.x},${p.y}`).join(' ')} />
            <polyline className="link-line-core" points={svgCoords.map(p => `${p.x},${p.y}`).join(' ')} />
          </svg>
        )}

        {/* Match Particles, Shockwaves & Floating Popups Layer */}
        {!isRival && (
          <div className="match-effects-layer">
            {(shockwaves || []).map(sw => (
              <div
                key={sw.id}
                className="shockwave-ring"
                style={{ left: `${sw.x}%`, top: `${sw.y}%` }}
              />
            ))}
            {(matchParticles || []).map(pt => (
              <div
                key={pt.id}
                className="particle-star"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                  background: pt.color,
                  boxShadow: `0 0 10px ${pt.color}`,
                  // @ts-ignore
                  '--tx': `${pt.tx}px`,
                  '--ty': `${pt.ty}px`,
                }}
              />
            ))}
            {(floatingPopups || []).map(fp => (
              <div
                key={fp.id}
                className="floating-score-tag"
                style={{
                  left: `${fp.x}%`,
                  top: `${fp.y}%`,
                  color: fp.color,
                  borderColor: fp.color,
                }}
              >
                {fp.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

/* ──────────────────────────────────────────────
   Sub-Component: Admin User Row Item
   ────────────────────────────────────────────── */
function AdminUserRow({
  account,
  isCurrentAdmin,
  onSaveCoins,
  onResetPassword,
  onDeleteUser,
}: {
  account: UserAccount
  isCurrentAdmin: boolean
  onSaveCoins: (newCoins: number) => void
  onResetPassword: (newPass: string) => void
  onDeleteUser: () => void
}) {
  const [coinsInput, setCoinsInput] = useState<number>(account.coins)
  const [newPassInput, setNewPassInput] = useState('')
  const [showPassBox, setShowPassBox] = useState(false)

  useEffect(() => {
    setCoinsInput(account.coins)
  }, [account.coins])

  return (
    <div className="admin-user-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="player-avatar" style={{ width: '34px', height: '34px', fontSize: '14px', flexShrink: 0 }}>
            {account.displayName ? account.displayName.slice(0, 1).toUpperCase() : '👤'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{account.displayName}</strong>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>@{account.username}</span>
              {account.role === 'admin' ? (
                <span className="admin-role-badge admin">ADMIN</span>
              ) : (
                <span className="admin-role-badge user">PLAYER</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Vượt Bot: Cấp {account.botLevel || 1}/50 · Đồ sở hữu: {account.unlockedItems?.length || 0} món
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Coin Edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '13px' }}>🪙</span>
            <input
              type="number"
              min="0"
              max="9999999"
              value={coinsInput}
              onChange={e => setCoinsInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: '85px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(250,204,21,0.4)',
                color: '#facc15',
                padding: '4px 6px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'right',
              }}
            />
            <button
              className="admin-action-btn btn-coins"
              onClick={() => onSaveCoins(coinsInput)}
              title="Lưu số Xu mới cho tài khoản này"
            >
              Lưu Xu
            </button>
          </div>

          {/* Reset Password Button */}
          <button
            className="admin-action-btn btn-pwd"
            onClick={() => setShowPassBox(!showPassBox)}
          >
            {showPassBox ? 'Đóng Đổi MK' : 'Đổi MK'}
          </button>

          {/* Delete User */}
          {account.username !== 'admin' && !isCurrentAdmin && (
            <button
              className="admin-action-btn btn-del"
              onClick={onDeleteUser}
              title="Xóa tài khoản này khỏi hệ thống"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Password reset input drawer */}
      {showPassBox && (
        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.08)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Nhập mật khẩu mới cho tài khoản..."
            value={newPassInput}
            onChange={e => setNewPassInput(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(56,189,248,0.4)',
              color: '#f8fafc',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          <button
            className="admin-action-btn btn-pwd"
            style={{ padding: '4px 12px' }}
            onClick={() => {
              if (newPassInput.trim()) {
                onResetPassword(newPassInput.trim())
                setNewPassInput('')
                setShowPassBox(false)
              }
            }}
          >
            Xác Nhận Đổi MK
          </button>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main Component: Pikachu Classic PVP Realtime
   ────────────────────────────────────────────── */
export function MirrorRushGame() {
  // Screen state: 'lobby' or 'game'
  const [inGame, setInGame] = useState(false)
  const [showPortraitBanner, setShowPortraitBanner] = useState(true)

  // Configuration
  const [playMode, setPlayMode] = useState<PlayMode>('solo')
  const [gridSize, setGridSize] = useState<GridSizeKey>('14x8') // 2 sizes: 14x8 or 10x6
  const [boardMode, setBoardMode] = useState<BoardMode>('separate') // 'shared' or 'separate'
  const [spriteTheme, setSpriteTheme] = useState<SpriteTheme>('artwork')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [bgmEnabled, setBgmEnabled] = useState(true)
  const [audioReady, setAudioReady] = useState(false)

  // Tùy chỉnh kích thước / Thu phóng màn hình (Auto / 100% / 90% / 85% / 75%)
  const [uiScale, setUiScale] = useState<'auto' | '100' | '90' | '85' | '75'>('auto')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mirror_rush_ui_scale') as 'auto' | '100' | '90' | '85' | '75' | null
      if (saved && ['auto', '100', '90', '85', '75'].includes(saved)) {
        setUiScale(saved)
      }
    } catch {}
  }, [])

  const cycleUiScale = useCallback(() => {
    const scales: ('auto' | '100' | '90' | '85' | '75')[] = ['auto', '100', '90', '85', '75']
    setUiScale(curr => {
      const nextIdx = (scales.indexOf(curr) + 1) % scales.length
      const nextScale = scales[nextIdx]
      try {
        localStorage.setItem('mirror_rush_ui_scale', nextScale)
      } catch {}
      return nextScale
    })
    playSound('select', soundEnabled)
  }, [soundEnabled])

  const toggleBgm = useCallback(() => {
    if (bgmEnabled) {
      stopBgm()
      setBgmEnabled(false)
    } else {
      setBgmEnabled(true)
      autoUnlockAudio()
      startBgm()
    }
  }, [bgmEnabled])

  // Auto-start BGM right on load + subscribe to unlock state
  useEffect(() => {
    const unsub = subscribeAudioReady((ready) => {
      setAudioReady(ready)
    })
    if (bgmEnabled) {
      startBgm()
    }
    return () => {
      unsub()
      stopBgm()
    }
  }, [bgmEnabled])

  // Player & Account State
  const [user, setUser] = useState<UserAccount | null>(null)
  const [coins, setCoins] = useState<number>(100)
  const [botLevel, setBotLevel] = useState<number>(1)
  const [maxUnlockedBotLevel, setMaxUnlockedBotLevel] = useState<number>(1)
  const [botStars, setBotStars] = useState<Record<number, number>>({})
  const [selectedBotFloor, setSelectedBotFloor] = useState<number>(1)
  const [lastEarnedBotStars, setLastEarnedBotStars] = useState<number>(0)

  const totalBotStars = useMemo(() => {
    return Object.values(botStars).reduce((sum, s) => sum + (Number(s) || 0), 0)
  }, [botStars])

  // Automatically keep selectedBotFloor aligned with current botLevel
  useEffect(() => {
    const floorInfo = getBotFloorByLevel(botLevel)
    if (floorInfo) {
      setSelectedBotFloor(floorInfo.floor)
    }
  }, [botLevel])
  const [equipped, setEquipped] = useState<{
    boardTheme: string
    boardFrame: string
    tileStyle: string
    lineEffect: string
  }>({
    boardTheme: 'theme-emerald',
    boardFrame: 'frame-classic',
    tileStyle: 'tile-style-classic',
    lineEffect: 'line-gold',
  })
  const [unlockedItems, setUnlockedItems] = useState<string[]>([
    'theme-emerald',
    'frame-classic',
    'tile-style-classic',
    'line-gold',
  ])

  // Pixel Art Character Selection & Emotion Reactions
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('satoshi')
  const [playerEmotion, setPlayerEmotion] = useState<CharacterEmotion>('idle')
  const [rivalEmotion, setRivalEmotion] = useState<CharacterEmotion>('idle')
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rivalEmotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Rival Character based on Bot Level or PVP Mode (3 Characters: Satoshi, Madara, Himeko)
  const [onlineRivalCharacterId, setOnlineRivalCharacterId] = useState<string | null>(null)
  const rivalCharacterId = useMemo(() => {
    if (playMode === 'pvp-online' && onlineRivalCharacterId) {
      return onlineRivalCharacterId
    }
    if (playMode === 'pvp-bot') {
      const roster = ['madara', 'himeko', 'satoshi']
      return roster[(botLevel - 1) % roster.length]
    }
    return selectedCharacterId === 'satoshi' ? 'madara' : 'satoshi'
  }, [playMode, onlineRivalCharacterId, botLevel, selectedCharacterId])

  // Current Bot configuration for PvP with Bot
  const curBot = useMemo(() => {
    return BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]
  }, [botLevel])

  // Helpers to trigger emotion with auto-reset to idle
  const triggerPlayerEmotion = useCallback((emotion: CharacterEmotion, duration = 1400) => {
    setPlayerEmotion(emotion)
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current)
    if (emotion !== 'idle') {
      emotionTimerRef.current = setTimeout(() => {
        setPlayerEmotion('idle')
      }, duration)
    }
  }, [])

  const triggerRivalEmotion = useCallback((emotion: CharacterEmotion, duration = 1400) => {
    setRivalEmotion(emotion)
    if (rivalEmotionTimerRef.current) clearTimeout(rivalEmotionTimerRef.current)
    if (emotion !== 'idle') {
      rivalEmotionTimerRef.current = setTimeout(() => {
        setRivalEmotion('idle')
      }, duration)
    }
  }, [])

  // Modals & Shop
  const [showShop, setShowShop] = useState(false)
  const [shopTab, setShopTab] = useState<'boardTheme' | 'boardFrame' | 'tileStyle' | 'lineEffect'>('boardTheme')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [coinRewardToast, setCoinRewardToast] = useState<{ amount: number; message: string } | null>(null)

  const [playerId] = useState(() => `u_${Math.random().toString(36).slice(2, 8)}`)
  const [playerName, setPlayerName] = useState('Trainer')
  const [board, setBoard] = useState<Cell[][]>([])
  const [level, setLevel] = useState(1)
  const [shufflesLeft, setShufflesLeft] = useState(DEFAULT_SHUFFLES)
  const [hintsLeft, setHintsLeft] = useState(DEFAULT_HINTS)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  // Kỷ lục số trận thắng nhiều nhất được lưu lại của guest
  const [guestMaxWins, setGuestMaxWins] = useState(0)
  const [guestRecordHolder, setGuestRecordHolder] = useState('Khách')
  const [currentGuestWins, setCurrentGuestWins] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME)
  const [combo, setCombo] = useState(0)
  const [comboExpiresAt, setComboExpiresAt] = useState<number>(0)
  const [comboSecondsLeft, setComboSecondsLeft] = useState<number>(0)
  const [energy, setEnergy] = useState(0) // 0-100% skill energy

  // Special Character Ultimate States
  const [thunderRadarUntil, setThunderRadarUntil] = useState<number>(0)
  const [solarOverdriveUntil, setSolarOverdriveUntil] = useState<number>(0)
  const [wildcardCoords, setWildcardCoords] = useState<string[]>([])
  const [solarFireCoords, setSolarFireCoords] = useState<string[]>([])
  const [electroCoreCoords, setElectroCoreCoords] = useState<string[]>([])
  const [activeLaserCross, setActiveLaserCross] = useState<{ row: number; col: number } | null>(null)

  // Debuff states
  const [frozenUntil, setFrozenUntil] = useState(0)
  const [fogUntil, setFogUntil] = useState(0)

  // In-Game Dynamic FX States
  const [isScrambling, setIsScrambling] = useState(false)
  const [shockwaves, setShockwaves] = useState<Array<{ id: string; x: number; y: number }>>([])
  const [matchParticles, setMatchParticles] = useState<Array<{ id: string; x: number; y: number; color: string; tx: number; ty: number }>>([])
  const [floatingPopups, setFloatingPopups] = useState<Array<{ id: string; x: number; y: number; text: string; color: string }>>([])
  const [activeSkillZaps, setActiveSkillZaps] = useState<ElementalZap[]>([])
  const [avatarBeams, setAvatarBeams] = useState<AvatarSkillBeam[]>([])
  const [useVideoAvatar, setUseVideoAvatar] = useState<boolean>(true)
  const [activeLobbyScreen, setActiveLobbyScreen] = useState<'menu' | 'character-select' | 'ranked' | 'campaign'>('menu')
  const [previewCharId, setPreviewCharId] = useState<string>('satoshi')
  const [previewEmotion, setPreviewEmotion] = useState<CharacterEmotion>('idle')

  // Page Loading Splash Screen & Page Transition State
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true)
  const [loadingMessage, setLoadingMessage] = useState<string>('Đang tải trò chơi...')
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const triggerLoadingTransition = useCallback((message: string = 'Đang chuyển trang...', callback?: () => void, durationMs = 500) => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    setLoadingMessage(message)
    setIsAppLoading(true)
    loadingTimerRef.current = setTimeout(() => {
      if (callback) callback()
      loadingTimerRef.current = setTimeout(() => {
        setIsAppLoading(false)
      }, 300)
    }, durationMs)
  }, [])

  const navigateToLobbyScreen = useCallback((screen: 'menu' | 'character-select' | 'ranked' | 'campaign', msg: string = 'Đang chuyển trang...') => {
    playSound('select', soundEnabled)
    triggerLoadingTransition(msg, () => {
      setActiveLobbyScreen(screen)
    }, 450)
  }, [soundEnabled, triggerLoadingTransition])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // 5-Chapter Boss Campaign State
  const [campaignChapterId, setCampaignChapterId] = useState<number>(1)
  const [currentCampaignStage, setCurrentCampaignStage] = useState<BossStageConfig | null>(null)
  const [campaignProgress, setCampaignProgress] = useState<Record<number, boolean>>({})
  const [storyModalStage, setStoryModalStage] = useState<BossStageConfig | null>(null)

  useEffect(() => {
    try {
      const savedProg = localStorage.getItem('mirror_rush_campaign_progress')
      if (savedProg) {
        setCampaignProgress(JSON.parse(savedProg))
      }
    } catch {}
  }, [])
  const [matchingPair, setMatchingPair] = useState<[Coord, Coord] | null>(null)
  const isMatchingRef = useRef<boolean>(false)
  const isAutoSwappingRef = useRef<boolean>(false)

  // Admin Management State
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminUsersList, setAdminUsersList] = useState<UserAccount[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminSearch, setAdminSearch] = useState('')
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Beginner Guidebook Modal State
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialChapter, setTutorialChapter] = useState(1)

  // Interaction State
  const [selected, setSelected] = useState<Coord | null>(null)
  const [linkPath, setLinkPath] = useState<Coord[] | null>(null)
  const [hintPair, setHintPair] = useState<[Coord, Coord] | null>(null)
  const [notice, setNotice] = useState('CHÀO MỪNG ĐẾN VỚI PIKACHU CLASSIC!')

  // Rival State (Side-by-Side)
  const [rivalName, setRivalName] = useState('PikaBot')
  const [rivalBoard, setRivalBoard] = useState<Cell[][]>([])
  const [rivalScore, setRivalScore] = useState(0)
  const [rivalLinkPath, setRivalLinkPath] = useState<Coord[] | null>(null)
  const [rivalFrozenUntil, setRivalFrozenUntil] = useState(0)
  const [rivalFogUntil, setRivalFogUntil] = useState(0)

  // Online Multiplayer Room State
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [currentRoomState, setCurrentRoomState] = useState<RoomState | null>(null)
  const [isHost, setIsHost] = useState(true)
  const [inputCode, setInputCode] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [gameOver, setGameOver] = useState<'win' | 'lose' | 'draw' | null>(null)

  // Ultimate Skill & Buff states
  const [ultimateCutin, setUltimateCutin] = useState<{ character: PixelCharacter; active: boolean } | null>(null)
  const [doubleScoreTurnsLeft, setDoubleScoreTurnsLeft] = useState<number>(0)
  const [immunityUntil, setImmunityUntil] = useState<number>(0)
  const [timerFrozenUntil, setTimerFrozenUntil] = useState<number>(0)
  const [rankPoints, setRankPoints] = useState<number>(0) // Bắt đầu ở rank Đồng (0 RP)
  const [rivalRankPoints, setRivalRankPoints] = useState<number>(500)
  const [lastEarnedRp, setLastEarnedRp] = useState<number>(0)
  const [lastEarnedCoins, setLastEarnedCoins] = useState<number>(0)
  const [isRankUp, setIsRankUp] = useState<boolean>(false)

  // Live ticker for active skill countdowns on the board header
  const [buffTick, setBuffTick] = useState(0)
  useEffect(() => {
    if (
      solarOverdriveUntil > Date.now() ||
      thunderRadarUntil > Date.now() ||
      timerFrozenUntil > Date.now() ||
      immunityUntil > Date.now() ||
      doubleScoreTurnsLeft > 0
    ) {
      const t = setInterval(() => setBuffTick(x => x + 1), 250)
      return () => clearInterval(t)
    }
  }, [solarOverdriveUntil, thunderRadarUntil, timerFrozenUntil, immunityUntil, doubleScoreTurnsLeft])

  // Active Ultimate Effect info (shown on board header, hiding skill button)
  const activeUltEffect = useMemo(() => {
    const now = Date.now()
    if (solarOverdriveUntil > now) {
      return {
        icon: '🔥',
        name: 'BÃO LỬA OVERDRIVE',
        detail: 'x3 Điểm & Hồi +2s/cặp',
        secs: Math.max(0, Math.ceil((solarOverdriveUntil - now) / 1000)),
        colorTheme: 'fire',
      }
    }
    if (thunderRadarUntil > now) {
      return {
        icon: '⚡',
        name: 'RADAR HOÀNG KIM',
        detail: 'Hiển thị mọi đường nối',
        secs: Math.max(0, Math.ceil((thunderRadarUntil - now) / 1000)),
        colorTheme: 'lightning',
      }
    }
    if (timerFrozenUntil > now) {
      return {
        icon: '❄️',
        name: 'NGƯNG ĐỌNG THỜI GIAN',
        detail: 'Đồng hồ ngưng đọng',
        secs: Math.max(0, Math.ceil((timerFrozenUntil - now) / 1000)),
        colorTheme: 'ice',
      }
    }
    if (immunityUntil > now) {
      return {
        icon: '🛡️',
        name: 'HÀO QUANG SUSANOO',
        detail: 'Bảo hộ miễn nhiễm hiệu ứng',
        secs: Math.max(0, Math.ceil((immunityUntil - now) / 1000)),
        colorTheme: 'shadow',
      }
    }
    if (doubleScoreTurnsLeft > 0) {
      return {
        icon: '✨',
        name: 'BỘI SỐ HOÀNG KIM',
        detail: `${doubleScoreTurnsLeft} Nước nối x2 Điểm`,
        secs: doubleScoreTurnsLeft,
        colorTheme: 'gold',
      }
    }
    return null
  }, [solarOverdriveUntil, thunderRadarUntil, timerFrozenUntil, immunityUntil, doubleScoreTurnsLeft, buffTick])

  // Dedicated Rank Leaderboard state
  const [leaderboardTab, setLeaderboardTab] = useState<'scores' | 'rankings'>('rankings')
  const [rankedPlayers, setRankedPlayers] = useState<Array<{
    rank?: number
    username: string
    displayName: string
    characterId?: string
    rankPoints: number
    rankWins?: number
    rankLosses?: number
    tier: string
    tierName: string
    tierIcon: string
    color: string
  }>>([])
  const [isLoadingRankings, setIsLoadingRankings] = useState(false)

  // Ranked Matchmaking states
  const [isMatchmaking, setIsMatchmaking] = useState<boolean>(false)
  const [matchWaitSeconds, setMatchWaitSeconds] = useState<number>(0)
  const [averageWaitSeconds, setAverageWaitSeconds] = useState<number>(8)
  const [foundMatch, setFoundMatch] = useState<{
    rivalName: string
    rivalRank: string
    rivalRankIcon: string
    rivalRankPoints?: number
    rivalCharId: string
    roomCode?: string
    isBot?: boolean
  } | null>(null)
  const matchmakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [syncTransport, setSyncTransport] = useState<'ws' | 'sse' | 'poll'>('poll')
  const boardRef = useRef<Cell[][]>(board)
  boardRef.current = board
  const scoreRef = useRef<number>(score)
  scoreRef.current = score
  const rivalScoreRef = useRef<number>(rivalScore)
  rivalScoreRef.current = rivalScore
  const sendRoomActionRef = useRef<(action: any) => void>(() => {})

  // Combo countdown timer (tự động hết hạn sau 4.5s không ăn bài)
  useEffect(() => {
    if (combo <= 0 || gameOver) return
    const interval = setInterval(() => {
      const current = Date.now()
      const diff = comboExpiresAt - current
      if (diff <= 0) {
        setCombo(0)
        setComboSecondsLeft(0)
      } else {
        setComboSecondsLeft(Math.max(0, parseFloat((diff / 1000).toFixed(1))))
      }
    }, 100)
    return () => clearInterval(interval)
  }, [combo, comboExpiresAt, gameOver])

  const dims = GRID_DIMS[gridSize] || GRID_DIMS['14x8']
  const now = Date.now()
  const isImmune = immunityUntil > now
  const isMeFrozen = !isImmune && frozenUntil > now
  const isMeFogged = !isImmune && fogUntil > now
  const isRivalFrozen = rivalFrozenUntil > now
  const isRivalFogged = rivalFogUntil > now
  const userRank = useMemo(() => getRankTier(rankPoints), [rankPoints])

  // Computed rank tier for Bot based on floor & level
  const curBotRank = useMemo(() => {
    const rp = 100 + (curBot.level * 55)
    return getRankTier(rp)
  }, [curBot.level])
  const curBotRp = useMemo(() => 100 + (curBot.level * 55), [curBot.level])

  // Computed rank tier for Campaign Boss based on stage
  const curBossRank = useMemo(() => {
    if (!currentCampaignStage) return getRankTier(1500)
    const rp = 1000 + (currentCampaignStage.stageId * 150)
    return getRankTier(rp)
  }, [currentCampaignStage])
  const curBossRp = useMemo(() => currentCampaignStage ? 1000 + (currentCampaignStage.stageId * 150) : 1500, [currentCampaignStage])

  // Current active rival rank tier & RP in whatever mode is playing
  const activeRivalRankTier = useMemo(() => {
    if (playMode === 'campaign') return curBossRank
    if (playMode === 'pvp-bot') return curBotRank
    return getRankTier(rivalRankPoints)
  }, [playMode, curBossRank, curBotRank, rivalRankPoints])

  const activeRivalRp = useMemo(() => {
    if (playMode === 'campaign') return curBossRp
    if (playMode === 'pvp-bot') return curBotRp
    return rivalRankPoints
  }, [playMode, curBossRp, curBotRp, rivalRankPoints])

  const activeRadarPair = useMemo(() => {
    if (thunderRadarUntil <= Date.now() || gameOver) return null
    return findAnyPair(board, dims.rows, dims.cols)
  }, [thunderRadarUntil, board, dims.rows, dims.cols, gameOver])

  // Reaction sync on gameOver
  useEffect(() => {
    if (gameOver === 'win') {
      setPlayerEmotion('win')
      setRivalEmotion('lose')
    } else if (gameOver === 'lose') {
      setPlayerEmotion('lose')
      setRivalEmotion('win')
    } else if (!gameOver) {
      setPlayerEmotion('idle')
      setRivalEmotion('idle')
    }
  }, [gameOver])

  // Reaction on debuff
  useEffect(() => {
    if (isMeFrozen || isMeFogged) {
      triggerPlayerEmotion('sad', 2000)
    }
  }, [isMeFrozen, isMeFogged, triggerPlayerEmotion])

  // Realtime Leaderboard API Integration
  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true)
    try {
      const res = await fetch('/api/leaderboard')
      const data = await res.json()
      if (data.success && Array.isArray(data.leaderboard)) {
        setLeaderboardData(data.leaderboard)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [])

  const fetchRankings = useCallback(async () => {
    setIsLoadingRankings(true)
    try {
      const res = await fetch('/api/rankings')
      const data = await res.json()
      if (data.success && Array.isArray(data.rankings)) {
        setRankedPlayers(data.rankings)
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingRankings(false)
    }
  }, [])

  const submitScoreToLeaderboard = useCallback(async (finalScore: number) => {
    if (finalScore <= 0) return
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName || 'Trainer',
          score: finalScore,
          mode: playMode,
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.leaderboard)) {
        setLeaderboardData(data.leaderboard)
      }
    } catch {
      // ignore
    }
  }, [playerName, playMode])

  // Guest data loader - strictly locked to Satoshi for guests
  const loadGuestData = useCallback(() => {
    setSelectedCharacterId('satoshi')
    if (typeof window === 'undefined') return
    const gCoins = localStorage.getItem('PIKA_GUEST_COINS')
    const gLvl = localStorage.getItem('PIKA_GUEST_BOT_LEVEL')
    const gEquipped = localStorage.getItem('PIKA_GUEST_EQUIPPED')
    const gUnlocked = localStorage.getItem('PIKA_GUEST_UNLOCKED')
    const gMaxWins = localStorage.getItem('PIKA_GUEST_MAX_WINS')
    const gHolder = localStorage.getItem('PIKA_GUEST_MAX_WINS_HOLDER')
    const gWins = localStorage.getItem('PIKA_GUEST_WINS')
    const gRp = localStorage.getItem('PIKA_GUEST_RANK_POINTS')

    if (gCoins) setCoins(parseInt(gCoins, 10))
    if (gLvl) setMaxUnlockedBotLevel(parseInt(gLvl, 10))
    if (gRp) {
      const parsedRp = parseInt(gRp, 10)
      if (!isNaN(parsedRp)) setRankPoints(parsedRp)
    }
    const gStars = localStorage.getItem('PIKA_GUEST_BOT_STARS')
    if (gStars) {
      try { setBotStars(JSON.parse(gStars)) } catch { }
    }
    if (gEquipped) {
      try { setEquipped(JSON.parse(gEquipped)) } catch { }
    }
    if (gUnlocked) {
      try { setUnlockedItems(JSON.parse(gUnlocked)) } catch { }
    }
    if (gMaxWins) setGuestMaxWins(parseInt(gMaxWins, 10) || 0)
    if (gHolder) setGuestRecordHolder(gHolder)
    if (gWins) setCurrentGuestWins(parseInt(gWins, 10) || 0)
  }, [])

  const applyUserData = useCallback((u: UserAccount) => {
    setUser(u)
    setPlayerName(u.displayName || u.username)
    setCoins(u.coins)
    setMaxUnlockedBotLevel(u.botLevelProgress || 1)
    if (u.botStars) setBotStars(u.botStars)
    if (u.rankPoints !== undefined) setRankPoints(u.rankPoints)
    if (u.characterId) {
      const validChar = ['satoshi', 'madara', 'maldara', 'himeko'].includes(u.characterId) ? u.characterId : 'satoshi'
      setSelectedCharacterId(validChar)
    }
    if (u.equipped) setEquipped(u.equipped)
    if (u.unlockedItems) setUnlockedItems(u.unlockedItems)
    if (typeof window !== 'undefined') {
      localStorage.setItem('PIKA_CURRENT_USER', u.username)
    }
  }, [])

  const logoutUser = useCallback(() => {
    setUser(null)
    setPlayerName('Trainer')
    setSelectedCharacterId('satoshi')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('PIKA_CURRENT_USER')
      const gStars = localStorage.getItem('PIKA_GUEST_BOT_STARS')
      if (gStars) {
        try { setBotStars(JSON.parse(gStars)) } catch { setBotStars({}) }
      } else {
        setBotStars({})
      }
    } else {
      setBotStars({})
    }
    loadGuestData()
  }, [loadGuestData])

  // Select Character (Only logged-in users can choose, guests locked to Satoshi)
  const handleSelectCharacter = useCallback((charId: string) => {
    if (!user) {
      playSound('wrong', soundEnabled)
      setCoinRewardToast({ amount: 0, message: '🔒 Bạn phải ĐĂNG NHẬP để chọn nhân vật! Khách mặc định dùng Satoshi.' })
      setTimeout(() => setCoinRewardToast(null), 4000)
      setAuthMode('login')
      setShowAuthModal(true)
      return
    }

    setSelectedCharacterId(charId)
    setUser(prev => prev ? { ...prev, characterId: charId } : null)
    playSound('select', soundEnabled)
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-character', username: user.username, characterId: charId }),
    }).catch(() => { })
  }, [user, soundEnabled])

  // Load High Score, User & Leaderboard on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('PIKA_HIGHSCORE')
      if (saved) setHighScore(parseInt(saved, 10))

      const savedMaxWins = localStorage.getItem('PIKA_GUEST_MAX_WINS')
      const savedHolder = localStorage.getItem('PIKA_GUEST_MAX_WINS_HOLDER')
      const savedWins = localStorage.getItem('PIKA_GUEST_WINS')
      if (savedMaxWins) setGuestMaxWins(parseInt(savedMaxWins, 10) || 0)
      if (savedHolder) setGuestRecordHolder(savedHolder)
      if (savedWins) setCurrentGuestWins(parseInt(savedWins, 10) || 0)

      const savedUser = localStorage.getItem('PIKA_CURRENT_USER')
      if (savedUser) {
        fetch(`/api/auth?username=${encodeURIComponent(savedUser)}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.user) {
              applyUserData(data.user)
            } else {
              loadGuestData()
            }
          })
          .catch(() => loadGuestData())
      } else {
        loadGuestData()
      }
    }
    fetchLeaderboard()
    fetchRankings()
  }, [fetchLeaderboard, fetchRankings, applyUserData, loadGuestData])

  // Award PikaCoins helper
  const awardCoins = useCallback((amount: number, reason: string) => {
    setCoins(prev => {
      const updated = prev + amount
      if (typeof window !== 'undefined' && !user) {
        localStorage.setItem('PIKA_GUEST_COINS', updated.toString())
      }
      return updated
    })

    setCoinRewardToast({ amount, message: reason })
    setTimeout(() => setCoinRewardToast(null), 4500)

    if (user) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-coins', username: user.username, amount }),
      }).catch(() => { })
    }
  }, [user])

  // Handle Win game reward & Guest Win Record update
  const handleGameWin = useCallback(() => {
    // Cập nhật số trận thắng của guest và kỷ lục số trận thắng nhiều nhất
    const currentName = (user ? (user.displayName || user.username) : (playerName || 'Trainer')).trim()
    setCurrentGuestWins(prevWins => {
      const nextWins = prevWins + 1
      if (typeof window !== 'undefined') {
        localStorage.setItem('PIKA_GUEST_WINS', nextWins.toString())
      }
      setGuestMaxWins(prevMax => {
        if (nextWins > prevMax) {
          setGuestRecordHolder(currentName)
          if (typeof window !== 'undefined') {
            localStorage.setItem('PIKA_GUEST_MAX_WINS', nextWins.toString())
            localStorage.setItem('PIKA_GUEST_MAX_WINS_HOLDER', currentName)
          }
          return nextWins
        }
        return prevMax
      })
      return nextWins
    })

    const oldTier = getRankTier(rankPoints)
    let earnedRp = 0
    let earnedCoins = 0

    if (playMode === 'pvp-bot') {
      const bot = BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]
      const reward = bot.rewardCoins
      earnedCoins = reward
      earnedRp = 20 + Math.min(30, Math.floor(bot.level / 2))

      // Calculate star rating (1 to 3 stars)
      // 3 stars: remaining time >= 50% OR score lead >= 50
      // 2 stars: remaining time >= 25% OR score lead >= 25
      // 1 star: standard victory
      const timePercent = timeLeft / Math.max(1, DEFAULT_TIME)
      let earnedStars = 1
      if (timePercent >= 0.5 || (score - rivalScore >= 50)) {
        earnedStars = 3
      } else if (timePercent >= 0.25 || (score - rivalScore >= 25)) {
        earnedStars = 2
      }
      setLastEarnedBotStars(earnedStars)

      const prevStars = botStars[botLevel] || 0
      const newStars = Math.max(prevStars, earnedStars)
      const updatedStars = { ...botStars, [botLevel]: newStars }
      setBotStars(updatedStars)
      if (typeof window !== 'undefined') {
        localStorage.setItem('PIKA_GUEST_BOT_STARS', JSON.stringify(updatedStars))
      }

      const starIcons = '⭐'.repeat(earnedStars)
      awardCoins(reward, `Chiến thắng ${bot.name} (Cấp ${bot.level}) - Đạt ${starIcons}!`)

      const nextLvl = Math.min(50, botLevel + 1)
      if (botLevel >= maxUnlockedBotLevel && botLevel < 50) {
        setMaxUnlockedBotLevel(nextLvl)
        if (typeof window !== 'undefined') {
          localStorage.setItem('PIKA_GUEST_BOT_LEVEL', nextLvl.toString())
        }
      }

      if (user) {
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'advance-level',
            username: user.username,
            level: botLevel >= maxUnlockedBotLevel ? nextLvl : maxUnlockedBotLevel,
            stars: earnedStars,
          }),
        }).catch(() => { })
      }
    } else if (playMode === 'solo') {
      earnedCoins = 100
      earnedRp = 10
      awardCoins(100, 'Chiến thắng chế độ Solo!')
    } else if (playMode === 'pvp-online') {
      earnedCoins = 200
      earnedRp = 65
      awardCoins(200, 'Chiến thắng trận đối kháng PVP Online!')
    } else if (playMode === 'campaign' && currentCampaignStage) {
      const stage = currentCampaignStage
      earnedCoins = stage.rewardCoins
      earnedRp = 35 + Math.min(35, stage.stageId * 3)
      awardCoins(stage.rewardCoins, `🏆 Hạ gục Boss ${stage.bossName} (${stage.name})!`)
      setCampaignProgress(prev => {
        const next = { ...prev, [stage.stageId]: true }
        try {
          localStorage.setItem('mirror_rush_campaign_progress', JSON.stringify(next))
        } catch {}
        return next
      })
      const chapter = getChapterById(stage.chapterId)
      if (chapter && stage.stageId % 3 === 0) {
        awardCoins(chapter.completionRewardCoins, `👑 Hoàn thành ${chapter.title}: Danh hiệu ${chapter.completionRewardTitle}!`)
      }
      setNotice(`🎉 CHIẾN THẮNG ẢI! ${stage.bossName}: "${stage.dialogueWin}"`)
    }

    setLastEarnedRp(earnedRp)
    setLastEarnedCoins(earnedCoins)

    const nextRp = rankPoints + earnedRp
    const newTier = getRankTier(nextRp)
    setIsRankUp(newTier.minPoints > oldTier.minPoints)
    setRankPoints(nextRp)

    if (user) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-rank-points', username: user.username, rankPoints: earnedRp, isWin: true }),
      }).catch(() => { })
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('PIKA_GUEST_RANK_POINTS', String(nextRp))
    }
  }, [playMode, botLevel, maxUnlockedBotLevel, user, awardCoins, playerName, currentCampaignStage, timeLeft, score, rivalScore, botStars])

  // Handle Shop Actions
  const handleShopAction = async (item: ShopItem) => {
    const isUnlocked = unlockedItems.includes(item.id)
    const categoryKey = item.category === 'theme' ? 'boardTheme'
      : item.category === 'frame' ? 'boardFrame'
        : item.category === 'tile' ? 'tileStyle'
          : 'lineEffect'

    if (isUnlocked) {
      // Equip item
      setEquipped(prev => {
        const updated = { ...prev, [categoryKey]: item.cssClass }
        if (typeof window !== 'undefined' && !user) {
          localStorage.setItem('PIKA_GUEST_EQUIPPED', JSON.stringify(updated))
        }
        return updated
      })
      playSound('select', soundEnabled)

      if (user) {
        await fetch('/api/shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'equip',
            username: user.username,
            category: categoryKey,
            cssClass: item.cssClass,
          }),
        }).catch(() => { })
      }
    } else {
      // Purchase item
      if (coins < item.price) {
        alert(`Bạn không đủ xu! Cần ${item.price} xu (Hiện có: ${coins} xu). Hãy đánh thắng bot hoặc PVP để nhận thêm xu nhé!`)
        return
      }

      const newCoins = coins - item.price
      const newUnlocked = [...unlockedItems, item.id]

      setCoins(newCoins)
      setUnlockedItems(newUnlocked)
      setEquipped(prev => {
        const updated = { ...prev, [categoryKey]: item.cssClass }
        if (typeof window !== 'undefined' && !user) {
          localStorage.setItem('PIKA_GUEST_EQUIPPED', JSON.stringify(updated))
          localStorage.setItem('PIKA_GUEST_UNLOCKED', JSON.stringify(newUnlocked))
          localStorage.setItem('PIKA_GUEST_COINS', newCoins.toString())
        }
        return updated
      })

      playSound('match', soundEnabled)

      if (user) {
        await fetch('/api/shop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'purchase',
            username: user.username,
            itemId: item.id,
          }),
        }).catch(() => { })
      }
    }
  }

  // Handle Auth submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          username: authUsername.trim(),
          password: authPassword,
          displayName: authDisplayName.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setAuthError(data.error || 'Có lỗi xảy ra, vui lòng thử lại.')
      } else if (data.user) {
        applyUserData(data.user)
        setShowAuthModal(false)
        setAuthPassword('')
      }
    } catch {
      setAuthError('Không thể kết nối đến máy chủ.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Admin Operations
  const loadAdminUsers = useCallback(async () => {
    if (!user) return
    setAdminLoading(true)
    try {
      const res = await fetch(`/api/admin?adminUser=${encodeURIComponent(user.username)}`)
      const data = await res.json()
      if (data.success && data.users) {
        setAdminUsersList(data.users)
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Không thể tải danh sách tài khoản' })
      }
    } catch {
      setAdminFeedback({ type: 'error', text: 'Lỗi kết nối máy chủ' })
    } finally {
      setAdminLoading(false)
    }
  }, [user])

  const openAdminModal = () => {
    setShowAdminModal(true)
    setAdminFeedback(null)
    loadAdminUsers()
  }

  const handleAdminSetCoins = async (targetUsername: string, newCoins: number) => {
    if (!user) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-coins',
          adminUsername: user.username,
          targetUsername,
          coins: newCoins,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAdminFeedback({ type: 'success', text: `Đã cập nhật ${newCoins.toLocaleString()} Xu cho ${targetUsername}!` })
        if (targetUsername === user.username) {
          setCoins(newCoins)
          setUser(prev => prev ? { ...prev, coins: newCoins } : null)
        }
        loadAdminUsers()
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Cập nhật xu thất bại' })
      }
    } catch {
      setAdminFeedback({ type: 'error', text: 'Lỗi khi kết nối' })
    }
  }

  const handleAdminResetPassword = async (targetUsername: string, newPass: string) => {
    if (!user) return
    if (!newPass.trim()) {
      setAdminFeedback({ type: 'error', text: 'Vui lòng nhập mật khẩu mới' })
      return
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          adminUsername: user.username,
          targetUsername,
          newPassword: newPass.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAdminFeedback({ type: 'success', text: `Đã đổi mật khẩu cho ${targetUsername} thành công!` })
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Đổi mật khẩu thất bại' })
      }
    } catch {
      setAdminFeedback({ type: 'error', text: 'Lỗi khi kết nối' })
    }
  }

  const handleAdminDeleteUser = async (targetUsername: string) => {
    if (!user) return
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${targetUsername}"?`)) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-user',
          adminUsername: user.username,
          targetUsername,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAdminFeedback({ type: 'success', text: `Đã xóa tài khoản ${targetUsername}!` })
        loadAdminUsers()
      } else {
        setAdminFeedback({ type: 'error', text: data.error || 'Xóa tài khoản thất bại' })
      }
    } catch {
      setAdminFeedback({ type: 'error', text: 'Lỗi khi kết nối' })
    }
  }


  // Thoát ván chơi về Menu và dọn dẹp sạch toàn bộ phòng/timer cũ
  const exitToMenu = useCallback(() => {
    // Nếu đang trong trận PVP Online mà thoát trận, thông báo xử thua / đối thủ thắng
    if (playMode === 'pvp-online' && roomCode) {
      try {
        fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, action: { type: 'leave' } }),
          keepalive: true,
        }).catch(() => {})
        if (wsRef.current && wsRef.current.readyState === 1) {
          wsRef.current.send(JSON.stringify({ type: 'action', roomCode, playerId, action: { type: 'leave' } }))
        }
      } catch {}
    }

    triggerLoadingTransition('Đang quay lại Menu chính...', () => {
      setInGame(false)
      setRoomCode(null)
      setInputCode('')
      setIsMatchmaking(false)
      setFoundMatch(null)
      if (matchmakingTimerRef.current) {
        clearInterval(matchmakingTimerRef.current)
        matchmakingTimerRef.current = null
      }
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current)
        botTimerRef.current = null
      }
      setSelected(null)
      setLinkPath(null)
      setHintPair(null)
      setGameOver(null)
      setUltimateCutin(null)
      setDoubleScoreTurnsLeft(0)
      setImmunityUntil(0)
      setTimerFrozenUntil(0)
      setSolarFireCoords([])
      setElectroCoreCoords([])
      setNotice('CHÀO MỪNG ĐẾN VỚI PIKACHU CLASSIC!')
    }, 450)
  }, [playMode, roomCode, playerId, triggerLoadingTransition])

  // Start local match
  const startMatch = useCallback((size: GridSizeKey = gridSize) => {
    const msg = playMode === 'pvp-bot' ? 'Đang tải dữ liệu đối thủ Máy...' : 'Đang khởi tạo bàn cờ Pikachu...'
    triggerLoadingTransition(msg, () => {
      setRoomCode(null)
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current)
        botTimerRef.current = null
      }

      const newBoard = createLocalBoard(size)
      setBoard(newBoard)

      if (playMode === 'pvp-bot') {
        const curBot = BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]
        setRivalName(`${curBot.name} (Lv.${curBot.level})`)
        if (boardMode === 'separate') {
          setRivalBoard(createLocalBoard(size))
        } else {
          setRivalBoard(newBoard)
        }
      } else {
        setRivalBoard([])
      }

      setScore(0)
      setRivalScore(0)
      setTimeLeft(DEFAULT_TIME)
      setShufflesLeft(DEFAULT_SHUFFLES)
      setHintsLeft(DEFAULT_HINTS)
      setCombo(0)
      setEnergy(0)
      setSelected(null)
      setLinkPath(null)
      setHintPair(null)
      setFrozenUntil(0)
      setFogUntil(0)
      setRivalFrozenUntil(0)
      setRivalFogUntil(0)
      setSolarFireCoords([])
      setElectroCoreCoords([])
      setUltimateCutin(null)
      setDoubleScoreTurnsLeft(0)
      setImmunityUntil(0)
      setTimerFrozenUntil(0)
      setGameOver(null)
      setInGame(true)
      setNotice('BẮT ĐẦU VÁN MỚI! TÌM CÁC CẶP POKÉMON.')
      if (bgmEnabled) {
        startBgm()
      }
    }, 450)
  }, [gridSize, playMode, boardMode, bgmEnabled, botLevel, triggerLoadingTransition])

  // Khởi động trận đấu Chiến Dịch Trảm Boss (Hỗ trợ cả 2 chế độ: Chung Bàn và Khác Bàn)
  const startCampaignMatch = useCallback((stage: BossStageConfig, chosenMode?: BoardMode) => {
    const activeMode = chosenMode || boardMode || 'shared'
    triggerLoadingTransition(`Đang triệu hồi Boss ${stage.bossName}...`, () => {
      setCurrentCampaignStage(stage)
      setPlayMode('campaign')
      setBoardMode(activeMode)
      setStoryModalStage(null)

      setRoomCode(null)
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current)
        botTimerRef.current = null
      }

      const newBoard = createLocalBoard(gridSize)
      setBoard(newBoard)
      if (activeMode === 'shared') {
        setRivalBoard(newBoard)
      } else {
        setRivalBoard(createLocalBoard(gridSize))
      }
      setRivalName(`${stage.bossAvatar} ${stage.bossName}`)

      setScore(0)
      setRivalScore(0)
      setTimeLeft(stage.targetTime || 200)
      setShufflesLeft(DEFAULT_SHUFFLES)
      setHintsLeft(DEFAULT_HINTS)
      setCombo(0)
      setEnergy(0)
      setSelected(null)
      setLinkPath(null)
      setHintPair(null)
      setFrozenUntil(0)
      setFogUntil(0)
      setRivalFrozenUntil(0)
      setRivalFogUntil(0)
      setSolarFireCoords([])
      setElectroCoreCoords([])
      setUltimateCutin(null)
      setDoubleScoreTurnsLeft(0)
      setImmunityUntil(0)
      setTimerFrozenUntil(0)
      setGameOver(null)
      setInGame(true)
      setNotice(`⚔️ CHIẾN DỊCH: ${stage.name}! Đối đầu ${stage.bossName}`)
      if (bgmEnabled) {
        startBgm()
      }
    }, 500)
  }, [gridSize, bgmEnabled, triggerLoadingTransition, boardMode])

  // Responsive & measurement test helper: Allows URL params like ?test=pvp or ?test=solo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const test = params.get('test')
      if (test === 'pvp') {
        setPlayMode('pvp-bot')
        setBoardMode('separate')
        startMatch()
      } else if (test === 'solo') {
        setPlayMode('solo')
        startMatch()
      }
    }
  }, [startMatch])

  // Countdown timer
  useEffect(() => {
    if (!inGame || gameOver) return

    // CHỜ NGƯỜI CHƠI THỨ 2: Đang chờ đối thủ vào phòng thì CHƯA tính thời gian!
    if (playMode === 'pvp-online' && !rivalName) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (timerFrozenUntil > Date.now()) {
          return prev // Timer is frozen by Frost's Absolute Zero skill!
        }
        if (prev <= 1) {
          clearInterval(timer)

          const curScore = scoreRef.current
          const curRivalScore = rivalScoreRef.current
          const curBoard = boardRef.current
          const remainingTiles = curBoard.flat().filter(c => c !== null).length

          let isWin = false
          if (playMode === 'solo') {
            // 1. Chơi đơn: chưa hoàn thành xong bảng thì thua luôn!
            isWin = remainingTiles === 0
            if (isWin) {
              setNotice('🏆 XUẤT SẮC! BẠN ĐÃ HOÀN THÀNH BÀN ĐẤU VỪA KỊP GIỜ!')
            } else {
              setNotice(`⏰ HẾT THỜI GIAN! BẠN CÒN ${remainingTiles} QUÂN CHƯA NỐI XONG NÊN THUA CUỘC.`)
            }
          } else if (playMode === 'campaign' && currentCampaignStage) {
            // Chiến dịch trảm boss: nếu điểm người chơi cao hơn thì chiến thắng!
            isWin = curScore > curRivalScore
            if (isWin) {
              setNotice(`🏆 HẾT THỜI GIAN! BẠN CHIẾN THẮNG BOSS ${currentCampaignStage.bossName} (${curScore} vs ${curRivalScore})!`)
            } else {
              setNotice(`🌧️ HẾT THỜI GIAN! BOSS ${currentCampaignStage.bossName} ĐÃ THẮNG VỚI ĐIỂM CAO HƠN (${curRivalScore} vs ${curScore})!`)
            }
          } else if (playMode === 'pvp-bot') {
            // 2. Chơi với máy: nếu thua điểm máy thì thua cuộc! (Nếu điểm cao hơn thì chiến thắng)
            isWin = curScore > curRivalScore
            if (isWin) {
              setNotice(`🏆 HẾT THỜI GIAN! BẠN CHIẾN THẮNG MÁY (${curScore} vs ${curRivalScore})!`)
            } else {
              setNotice(`🌧️ HẾT THỜI GIAN! BẠN ĐÃ THUA VÌ THẤP ĐIỂM HƠN MÁY (${curScore} vs ${curRivalScore})!`)
            }
          } else {
            // 3. PvP 2 người: gửi timeout lên server để máy chủ tính toán người chiến thắng và phát sóng
            sendRoomActionRef.current({ type: 'timeout' })
            return 0
          }

          setGameOver(isWin ? 'win' : 'lose')
          playSound(isWin ? 'win' : 'lose', soundEnabled)
          submitScoreToLeaderboard(curScore)
          if (isWin) {
            handleGameWin()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [inGame, gameOver, soundEnabled, submitScoreToLeaderboard, handleGameWin, timerFrozenUntil, playMode, rivalName, currentCampaignStage])

  // Bot AI behavior in 'pvp-bot' and 'campaign'
  useEffect(() => {
    if (!inGame || (playMode !== 'pvp-bot' && playMode !== 'campaign') || gameOver || rivalBoard.length === 0) return
    if (isRivalFrozen) return

    const curBot = BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]
    const minD = playMode === 'campaign' && currentCampaignStage ? currentCampaignStage.moveDelayMin : curBot.moveDelayMin
    const maxD = playMode === 'campaign' && currentCampaignStage ? currentCampaignStage.moveDelayMax : curBot.moveDelayMax

    const runBotMove = () => {
      const calcDelay = minD + Math.random() * (maxD - minD)
      const baseDelay = isRivalFogged ? calcDelay * 1.6 : calcDelay

      botTimerRef.current = setTimeout(() => {
        if (boardMode === 'shared') {
          // Bot matches on shared board
          setBoard(cur => {
            const pair = findAnyPair(cur, dims.rows, dims.cols)
            if (pair) {
              const path = findLinkPath(cur, pair[0], pair[1], dims.rows, dims.cols)
              if (path) {
                setRivalLinkPath(path)
                setTimeout(() => setRivalLinkPath(null), 300)
              }
              const next = cur.map(r => [...r])
              next[pair[0].row][pair[0].col] = null
              next[pair[1].row][pair[1].col] = null
              setRivalScore(s => s + 10)
              triggerRivalEmotion('happy', 1400)
              triggerPlayerEmotion('sad', 1200)
              const remaining = next.flat().filter(c => c !== null).length
              if (remaining === 0) {
                const won = score > rivalScore + 10
                setGameOver(won ? 'win' : 'lose')
                playSound(won ? 'win' : 'lose', soundEnabled)
                if (won) handleGameWin()
              } else {
                const nextPair = findAnyPair(next, dims.rows, dims.cols)
                if (!nextPair) {
                  setNotice('🔄 PHÁT HIỆN BẾ TẮC (HẾT CẶP KHẢ DỤNG) · TỰ ĐỘNG ĐỔI BÀI!')
                  playSound('shuffle', soundEnabled)
                  setIsScrambling(true)
                  setTimeout(() => setIsScrambling(false), 450)
                  return ensureSolvableBoard(next, dims.rows, dims.cols)
                }
              }
              return next
            }
            return cur
          })
        } else {
          // Bot matches on its own separate board
          setRivalBoard(cur => {
            if (cur.length === 0) return cur
            let pair = findAnyPair(cur, dims.rows, dims.cols)
            if (!pair) {
              const solved = ensureSolvableBoard(cur, dims.rows, dims.cols)
              pair = findAnyPair(solved, dims.rows, dims.cols)
              cur = solved
            }
            if (pair) {
              const path = findLinkPath(cur, pair[0], pair[1], dims.rows, dims.cols)
              if (path) {
                setRivalLinkPath(path)
                setTimeout(() => setRivalLinkPath(null), 300)
              }
              const next = cur.map(r => [...r])
              next[pair[0].row][pair[0].col] = null
              next[pair[1].row][pair[1].col] = null
              setRivalScore(s => s + 10)
              triggerRivalEmotion('happy', 1400)
              triggerPlayerEmotion('sad', 1200)

              const remaining = next.flat().filter(c => c !== null).length
              if (remaining === 0) {
                setGameOver('lose')
                playSound('lose', soundEnabled)
              } else {
                const nextPair = findAnyPair(next, dims.rows, dims.cols)
                if (!nextPair) {
                  return ensureSolvableBoard(next, dims.rows, dims.cols)
                }
              }
              return next
            }
            return cur
          })
        }
        runBotMove()
      }, baseDelay)
    }

    runBotMove()
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current)
    }
  }, [inGame, playMode, gameOver, rivalBoard.length, isRivalFrozen, isRivalFogged, boardMode, dims.rows, dims.cols, score, rivalScore, soundEnabled, currentCampaignStage, botLevel])

  // Boss AI Periodic Special Skill in Campaign Mode
  useEffect(() => {
    if (!inGame || playMode !== 'campaign' || gameOver || !currentCampaignStage) return
    const intervalSec = currentCampaignStage.bossSkillInterval || 16

    const timer = setInterval(() => {
      if (isRivalFrozen) return
      triggerRivalEmotion('happy', 1500)
      playSound('laser', soundEnabled)

      // Kiểm tra xem người chơi có đang bật Hào Quang Susanoo Bất Hoại không
      if (immunityUntil > Date.now()) {
        setNotice(`🛡️ HÀO QUANG SUSANOO ĐÃ PHẢN PHÁ TUYỆT KỸ [${currentCampaignStage.bossSkillName}] CỦA BOSS!`)
        playSound('match', soundEnabled)
        return
      }

      // Thi triển chiêu thức đặc biệt theo môi trường của ải
      const env = currentCampaignStage.chapterEnvEffect
      if (env === 'electro-storm') {
        setNotice(`⚡ [${currentCampaignStage.bossName}] TUNG [${currentCampaignStage.bossSkillName}]! Tê liệt 2.5s!`)
        setFrozenUntil(Date.now() + 2500)
        triggerPlayerEmotion('sad', 1500)
      } else if (env === 'magma-fire') {
        setScore(s => {
          const stolen = Math.min(s, 30)
          setRivalScore(rs => rs + stolen)
          setNotice(`🔥 [${currentCampaignStage.bossName}] TUNG [${currentCampaignStage.bossSkillName}]! Thiêu đốt cướp ${stolen}đ & Mù sương 4s!`)
          return Math.max(0, s - stolen)
        })
        setFogUntil(Date.now() + 4000)
        triggerPlayerEmotion('sad', 1500)
      } else if (env === 'glacial-frost') {
        setNotice(`❄️ [${currentCampaignStage.bossName}] TUNG [${currentCampaignStage.bossSkillName}]! Đóng băng 3.5s!`)
        setFrozenUntil(Date.now() + 3500)
        triggerPlayerEmotion('sad', 1500)
      } else if (env === 'shadow-void') {
        setNotice(`🌑 [${currentCampaignStage.bossName}] TUNG [${currentCampaignStage.bossSkillName}]! Đảo tung ma trận quân cờ!`)
        setBoard(cur => {
          if (cur.length === 0) return cur
          const flat = cur.flat()
          for (let i = flat.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[flat[i], flat[j]] = [flat[j], flat[i]]
          }
          const reshuffled: Cell[][] = []
          for (let r = 0; r < dims.rows; r++) {
            reshuffled.push(flat.slice(r * dims.cols, (r + 1) * dims.cols))
          }
          return ensureSolvableBoard(reshuffled, dims.rows, dims.cols)
        })
        triggerPlayerEmotion('sad', 1500)
      } else {
        // astral-cosmic
        setScore(s => {
          const stolen = Math.min(s, 40)
          setRivalScore(rs => rs + stolen)
          setNotice(`🔮 [${currentCampaignStage.bossName}] TUNG [${currentCampaignStage.bossSkillName}]! Cướp ${stolen}đ và làm chậm thời không!`)
          return Math.max(0, s - stolen)
        })
        setFrozenUntil(Date.now() + 2500)
        triggerPlayerEmotion('sad', 1500)
      }
    }, intervalSec * 1000)

    return () => clearInterval(timer)
  }, [inGame, playMode, gameOver, currentCampaignStage, isRivalFrozen, immunityUntil, dims.rows, dims.cols, soundEnabled])

  // Online multiplayer sync — Ultra-low latency polling (200ms) with since-param optimization
  const lastSyncUpdatedAtRef = useRef<number>(0)
  const lastUltimateTimestampRef = useRef<number>(0)

  const applyRoomData = useCallback((room: RoomState) => {
    if (!room) return
    setCurrentRoomState(room)
    lastSyncUpdatedAtRef.current = room.updatedAt
    const amHost = room.host.id === playerId
    if (isHost !== amHost) {
      setIsHost(amHost)
    }
    const me = amHost ? room.host : room.guest
    const opp = amHost ? room.guest : room.host

    if (room.mode === 'shared' && room.sharedBoard) {
      setBoard(room.sharedBoard)
    } else if (me && me.board && me.board.length > 0) {
      setBoard(cur => {
        if (!cur || cur.length === 0) return me.board
        // Never resurrect a cell that was already matched locally
        return me.board.map((row, r) =>
          row.map((cell, c) => (cur[r]?.[c] === null ? null : cell))
        )
      })
    }

    if (me) {
      setScore(me.score)
      setEnergy(me.energy)
      setFrozenUntil(me.frozenUntil)
      setFogUntil(me.fogUntil)
      if (me.immunityUntil) {
        setImmunityUntil(me.immunityUntil)
      }
    }

    if (opp) {
      setRivalName(opp.name)
      setRivalScore(opp.score)
      if (typeof opp.rankPoints === 'number') {
        setRivalRankPoints(opp.rankPoints)
      }
      if (opp.characterId) {
        setOnlineRivalCharacterId(opp.characterId)
      }
      if (opp.board && opp.board.length > 0) {
        setRivalBoard(room.mode === 'shared' && room.sharedBoard ? room.sharedBoard : opp.board)
      }
      setRivalFrozenUntil(opp.frozenUntil)
      setRivalFogUntil(opp.fogUntil)
    }

    if (room.lastAction?.message) {
      setNotice(room.lastAction.message)
    }

    // Xử lý hiệu ứng khi đối thủ tung Tuyệt Kỹ trong trận PVP Online
    if (room.lastAction?.type === 'ultimate' && room.lastAction.playerId !== playerId) {
      if (room.lastAction.timestamp > lastUltimateTimestampRef.current) {
        lastUltimateTimestampRef.current = room.lastAction.timestamp
        const charId = room.lastAction.charId || 'satoshi'
        triggerPlayerEmotion('sad', 2400)
        if (charId === 'himeko') {
          playSound('astral', soundEnabled)
          const midR = Math.floor(dims.rows / 2)
          const midC = Math.floor(dims.cols / 2)
          setActiveLaserCross({ row: midR, col: midC })
          setTimeout(() => setActiveLaserCross(null), 850)
        } else if (charId === 'madara' || charId === 'maldara') {
          playSound('slash', soundEnabled)
          setShockwaves(prev => [...prev, { id: `sw_opp_madara_${Date.now()}`, x: 50, y: 50 }])
        } else if (charId === 'satoshi') {
          playSound('thunder', soundEnabled)
          setCombo(0)
        }
      }
    }

    if (room.status === 'finished') {
      const isWinner = room.winnerId === playerId
      setGameOver(isWinner ? 'win' : 'lose')
      if (isWinner) {
        playSound('win', soundEnabled)
        handleGameWin()
      } else {
        playSound('lose', soundEnabled)
        setLastEarnedRp(-20)
        setRankPoints(prev => {
          const nextRp = Math.max(0, prev - 20)
          if (typeof window !== 'undefined' && !user) {
            localStorage.setItem('PIKA_GUEST_RANK_POINTS', String(nextRp))
          }
          return nextRp
        })
        if (user) {
          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add-rank-points', username: user.username, rankPoints: -20, isWin: false }),
          }).catch(() => { })
        }
      }
    }
  }, [playerId, isHost, soundEnabled, handleGameWin, triggerPlayerEmotion, dims.rows, dims.cols])

  const sendRoomAction = useCallback((action: any) => {
    if (playMode !== 'pvp-online' || !roomCode) return

    // 1. Gửi tức thì qua WebSocket nếu kết nối đang mở (< 1ms)
    if (wsRef.current && wsRef.current.readyState === 1) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'action',
          roomCode,
          playerId,
          action,
        }))
      } catch {}
    }

    // 2. Lưu trạng thái qua HTTP API (Next.js server)
    fetch(`/api/rooms/${roomCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, action }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.room) {
          applyRoomData(data.room)
        }
      })
      .catch(() => {})
  }, [playMode, roomCode, playerId, applyRoomData])
  sendRoomActionRef.current = sendRoomAction

  useEffect(() => {
    if (!inGame || playMode !== 'pvp-online' || !roomCode) return

    let isCleanedUp = false

    // 1. WEBSOCKET REAL-TIME TRANSPORT (Port 3001)
    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = window.location.hostname || 'localhost'
        const ws = new WebSocket(`${wsProtocol}//${wsHost}:3001`)
        wsRef.current = ws

        ws.onopen = () => {
          if (isCleanedUp) return ws.close()
          setSyncTransport('ws')
          ws.send(JSON.stringify({
            type: 'join',
            roomCode,
            playerId,
            playerName,
          }))
        }

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'room_action') {
              // Nhận hành động tức thì từ đối thủ qua WebSocket (< 1ms)!
              fetch(`/api/rooms/${roomCode}?since=0`, { cache: 'no-store' })
                .then(res => res.json())
                .then(data => {
                  if (data.success && data.room) {
                    applyRoomData(data.room)
                  }
                })
                .catch(() => {})
            }
          } catch {}
        }

        ws.onerror = () => {
          // WebSocket server không chạy ở port 3001 -> tự động fallback sang SSE
        }
      } catch {}
    }

    // 2. SERVER-SENT EVENTS (SSE) STREAM (Cổng 3000 chuẩn Next.js, độ trễ < 5ms)
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      try {
        const eventSource = new EventSource(`/api/rooms/${roomCode}/stream?playerId=${encodeURIComponent(playerId)}`)
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
          if (isCleanedUp) return eventSource.close()
          setSyncTransport(prev => prev === 'ws' ? 'ws' : 'sse')
        }

        eventSource.onmessage = (event) => {
          try {
            const room = JSON.parse(event.data)
            if (room && room.code) {
              setSyncTransport(prev => prev === 'ws' ? 'ws' : 'sse')
              applyRoomData(room)
            }
          } catch {}
        }

        eventSource.onerror = () => {
          // SSE đứt kết nối -> fallback sang polling 140ms
          setSyncTransport(prev => prev === 'ws' ? 'ws' : 'poll')
        }
      } catch {}
    }

    // 3. ADAPTIVE FAST POLLING (Lưới an toàn dự phòng tuyệt đối 140ms)
    let currentInterval = 140
    let idleCount = 0
    const FAST_INTERVAL = 140
    const SLOW_INTERVAL = 380

    const syncRoom = async () => {
      try {
        const sinceParam = lastSyncUpdatedAtRef.current > 0 ? `&since=${lastSyncUpdatedAtRef.current}` : ''
        const res = await fetch(`/api/rooms/${roomCode}?playerId=${encodeURIComponent(playerId)}${sinceParam}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        const data = await res.json()

        if (data.success && data.changed === false) {
          idleCount++
          if (idleCount >= 6 && currentInterval < SLOW_INTERVAL) {
            currentInterval = SLOW_INTERVAL
            if (syncTimerRef.current) clearInterval(syncTimerRef.current)
            syncTimerRef.current = setInterval(syncRoom, currentInterval)
          }
          return
        }

        if (data.success && data.room) {
          idleCount = 0
          if (currentInterval > FAST_INTERVAL) {
            currentInterval = FAST_INTERVAL
            if (syncTimerRef.current) clearInterval(syncTimerRef.current)
            syncTimerRef.current = setInterval(syncRoom, currentInterval)
          }
          applyRoomData(data.room)
        }
      } catch {}
    }

    syncRoom()
    syncTimerRef.current = setInterval(syncRoom, currentInterval)

    const handleBeforeUnload = () => {
      if (roomCode && inGame && playMode === 'pvp-online') {
        const payload = JSON.stringify({ playerId, action: { type: 'leave' } })
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          navigator.sendBeacon(`/api/rooms/${roomCode}`, payload)
        }
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      isCleanedUp = true
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (wsRef.current) {
        try { wsRef.current.close() } catch {}
        wsRef.current = null
      }
      if (eventSourceRef.current) {
        try { eventSourceRef.current.close() } catch {}
        eventSourceRef.current = null
      }
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
        syncTimerRef.current = null
      }
      lastSyncUpdatedAtRef.current = 0
      setSyncTransport('poll')
    }
  }, [inGame, playMode, roomCode, playerId, playerName, applyRoomData])

  /* ─── Online Room Management ─── */
  const handleCreateRoom = async () => {
    // Dọn dẹp sạch phòng cũ và timer nếu có
    setRoomCode(null)
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = null
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: playerName || 'Trainer',
          playerId,
          size: '14x8', // Locked to 14x8 for fair online play
          mode: boardMode,
          rankPoints: typeof rankPoints === 'number' ? rankPoints : 500,
          characterId: selectedCharacterId || 'satoshi',
        }),
      })
      const data = await res.json()
      if (data.success && data.room) {
        setRoomCode(data.room.code)
        setIsHost(true)
        setGridSize('14x8')
        setBoardMode(boardMode)
        setPlayMode('pvp-online')
        // BÀN ĐỂ TRỐNG: Chờ người chơi thứ 2 vào bàn mới tạo bảng mới & tính thời gian
        setBoard([])
        setRivalBoard([])
        setRivalName('')
        setRivalScore(0)
        setScore(0)
        setTimeLeft(DEFAULT_TIME) // Chưa tính thời gian!
        setGameOver(null)
        setShufflesLeft(DEFAULT_SHUFFLES)
        setHintsLeft(DEFAULT_HINTS)
        setCombo(0)
        setEnergy(0)
        setSelected(null)
        setLinkPath(null)
        setHintPair(null)
        setFrozenUntil(0)
        setFogUntil(0)
        setRivalFrozenUntil(0)
        setRivalFogUntil(0)
        setWildcardCoords([])
        setSolarFireCoords([])
        setElectroCoreCoords([])
        setDoubleScoreTurnsLeft(0)
        setImmunityUntil(0)
        setTimerFrozenUntil(0)
        setInGame(true)
        setNotice(`ĐÃ TẠO PHÒNG [${data.room.code}] · ĐANG CHỜ NGƯỜI CHƠI THỨ 2 VÀO BÀN...`)
        playSound('hint', soundEnabled)
        if (bgmEnabled) {
          startBgm()
        }
      }
    } catch {
      alert('Không thể tạo phòng!')
    }
  }

  const handleJoinRoom = async () => {
    if (!inputCode.trim()) return

    // Dọn dẹp sạch phòng cũ và timer nếu có
    setRoomCode(null)
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current)
      botTimerRef.current = null
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code: inputCode.trim().toUpperCase(),
          name: playerName || 'Khách',
          playerId,
          rankPoints: typeof rankPoints === 'number' ? rankPoints : 500,
          characterId: selectedCharacterId || 'kasumi',
        }),
      })
      const data = await res.json()
      if (data.success && data.room) {
        const room: RoomState = data.room
        setRoomCode(room.code)
        setIsHost(false)
        setGridSize(room.size)
        setBoardMode(room.mode)
        setPlayMode('pvp-online')
        setRivalName(room.host.name)
        if (room.mode === 'shared' && room.sharedBoard) {
          setBoard(room.sharedBoard)
          setRivalBoard(room.sharedBoard)
        } else {
          setBoard(room.guest!.board)
          setRivalBoard(room.host.board)
        }

        // RESET SẠCH SẼ TRẠNG THÁI TRẬN ĐẤU KHI VÀO PHÒNG
        setGameOver(null)
        setScore(0)
        setRivalScore(0)
        setTimeLeft(DEFAULT_TIME)
        setShufflesLeft(DEFAULT_SHUFFLES)
        setHintsLeft(DEFAULT_HINTS)
        setCombo(0)
        setEnergy(0)
        setSelected(null)
        setLinkPath(null)
        setHintPair(null)
        setFrozenUntil(0)
        setFogUntil(0)
        setRivalFrozenUntil(0)
        setRivalFogUntil(0)
        setWildcardCoords([])
        setSolarFireCoords([])
        setElectroCoreCoords([])
        setDoubleScoreTurnsLeft(0)
        setImmunityUntil(0)
        setTimerFrozenUntil(0)

        setInGame(true)
        setNotice(`ĐÃ VÀO PHÒNG [${room.code}] · CHIẾN ĐẤU!`)
        playSound('match', soundEnabled)
        if (bgmEnabled) {
          startBgm()
        }
      } else {
        alert(data.error || 'Lỗi khi vào phòng!')
      }
    } catch {
      alert('Không thể vào phòng!')
    }
  }

  // TỰ ĐỘNG PHÁT HIỆN THẾ CỜ BẾ TẮC (DEADLOCK) & TỰ ĐỘNG ĐỔI BÀI (AUTO-SWAP)
  useEffect(() => {
    if (!inGame || gameOver || board.length === 0 || isAutoSwappingRef.current) return

    const remaining = board.flat().filter(c => c !== null).length
    if (remaining <= 1) return

    const validPair = findAnyPair(board, dims.rows, dims.cols)
    if (!validPair) {
      isAutoSwappingRef.current = true
      setIsScrambling(true)
      playSound('shuffle', soundEnabled)
      setNotice('🔄 PHÁT HIỆN BẾ TẮC (HẾT CẶP KHẢ DỤNG) · TỰ ĐỘNG ĐỔI BÀI!')
      setSelected(null)
      setHintPair(null)

      setTimeout(() => {
        setBoard(cur => {
          const solvable = ensureSolvableBoard(cur, dims.rows, dims.cols)
          if (playMode === 'pvp-online' && roomCode) {
            sendRoomAction({ type: 'shuffle', newBoard: solvable })
          }
          return solvable
        })
        setIsScrambling(false)
        isAutoSwappingRef.current = false
      }, 450)
    }
  }, [board, inGame, gameOver, dims.rows, dims.cols, playMode, roomCode, soundEnabled, sendRoomAction])

  /* ─── Match Actions ─── */
  const onTileSelect = (coord: Coord) => {
    if (gameOver || isMeFrozen || isMatchingRef.current) return
    const cell = board[coord.row]?.[coord.col]
    if (cell === null) return

    setHintPair(null)

    if (selected === null) {
      setSelected(coord)
      playSound('select', soundEnabled)
      return
    }

    if (selected.row === coord.row && selected.col === coord.col) {
      setSelected(null)
      return
    }

    // Check if either tile is a Wildcard Joker or identical Pokemon
    const selectedCell = board[selected.row]?.[selected.col]
    const isPrevWildcard = wildcardCoords.includes(`${selected.row}-${selected.col}`)
    const isCurWildcard = wildcardCoords.includes(`${coord.row}-${coord.col}`)
    const isMatchEligible = (selectedCell === cell) || isPrevWildcard || isCurWildcard

    if (!isMatchEligible) {
      setSelected(coord)
      playSound('select', soundEnabled)
      return
    }

    // Both tiles can link: check for valid Pikachu link path (max 2 turns)
    const path = findLinkPath(board, selected, coord, dims.rows, dims.cols)
    const prevCoord = selected
    setSelected(null)

    if (!path) {
      // Failed to link (blocked by obstacles)
      setCombo(0)
      setComboExpiresAt(0)
      setComboSecondsLeft(0)
      playSound('wrong', soundEnabled)
      setNotice('KHÔNG CÓ ĐƯỜNG NỐI HỢP LỆ (TỐI ĐA 2 KHÚC CUA)')
      return
    }

    // MATCH SUCCESS!
    // 1. Lock input and mark matching tiles so they cannot be clicked again
    isMatchingRef.current = true
    setMatchingPair([prevCoord, coord])
    setLinkPath(path)
    playSound('match', soundEnabled)

    const isSolar = solarOverdriveUntil > Date.now()
    const isPrevSolarFire = solarFireCoords.includes(`${prevCoord.row}-${prevCoord.col}`)
    const isCurSolarFire = solarFireCoords.includes(`${coord.row}-${coord.col}`)
    const hasSolarFire = isPrevSolarFire || isCurSolarFire

    const isPrevElectro = electroCoreCoords.includes(`${prevCoord.row}-${prevCoord.col}`)
    const isCurElectro = electroCoreCoords.includes(`${coord.row}-${coord.col}`)
    const hasElectro = isPrevElectro || isCurElectro

    const newCombo = combo + 1
    let addedPoints = 10 + (newCombo > 1 ? newCombo * 5 : 0)
    if (doubleScoreTurnsLeft > 0) {
      addedPoints *= 2
      setDoubleScoreTurnsLeft(d => Math.max(0, d - 1))
    }
    if (isSolar) {
      addedPoints *= 3
      setTimeLeft(t => Math.min(DEFAULT_TIME, t + 2))
    }
    if (hasSolarFire) {
      addedPoints += 80
    }
    if (hasElectro) {
      addedPoints += 50
    }

    // Visual FX: Shockwaves & Particles
    const ptAx = ((prevCoord.col + 0.5) / dims.cols) * 100
    const ptAy = ((prevCoord.row + 0.5) / dims.rows) * 100
    const ptBx = ((coord.col + 0.5) / dims.cols) * 100
    const ptBy = ((coord.row + 0.5) / dims.rows) * 100

    const midX = (ptAx + ptBx) / 2
    const midY = (ptAy + ptBy) / 2

    const swIdA = `sw_${Date.now()}_a`
    const swIdB = `sw_${Date.now()}_b`
    setShockwaves(prev => [...prev, { id: swIdA, x: ptAx, y: ptAy }, { id: swIdB, x: ptBx, y: ptBy }])

    const fxColors = ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#fbbf24', '#a855f7']
    const newParticles: Array<{ id: string; x: number; y: number; color: string; tx: number; ty: number }> = []
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2
      const dist = 32 + Math.random() * 42
      const tx = Math.cos(angle) * dist
      const ty = Math.sin(angle) * dist
      const color = fxColors[i % fxColors.length]
      newParticles.push({
        id: `pt_${Date.now()}_${i}`,
        x: i % 2 === 0 ? ptAx : ptBx,
        y: i % 2 === 0 ? ptAy : ptBy,
        color,
        tx,
        ty,
      })
    }
    setMatchParticles(prev => [...prev, ...newParticles])

    // 2. WAIT FOR ANIMATION (220ms): TWO ICONS DISAPPEAR FIRST, AND ONLY THEN ARE POINTS & COMBO AWARDED!
    setTimeout(() => {
      setLinkPath(null)
      setMatchingPair(null)
      setWildcardCoords(prev => prev.filter(c => c !== `${prevCoord.row}-${prevCoord.col}` && c !== `${coord.row}-${coord.col}`))
      setSolarFireCoords(prev => prev.filter(c => c !== `${prevCoord.row}-${prevCoord.col}` && c !== `${coord.row}-${coord.col}`))
      setElectroCoreCoords(prev => prev.filter(c => c !== `${prevCoord.row}-${prevCoord.col}` && c !== `${coord.row}-${coord.col}`))

      // Remove the 2 icons immediately on local board (applies to solo, bot, and pvp-online!)
      setBoard(cur => {
        const next = cur.map(r => [...r])
        next[prevCoord.row][prevCoord.col] = null
        next[coord.row][coord.col] = null

        const remaining = next.flat().filter(c => c !== null).length
        if (remaining === 0) {
          if (playMode !== 'pvp-online') {
            setGameOver('win')
            playSound('win', soundEnabled)
            handleGameWin()
          } else {
            playSound('win', soundEnabled)
          }
        } else {
          const pair = findAnyPair(next, dims.rows, dims.cols)
          if (!pair) {
            setNotice('🔄 PHÁT HIỆN BẾ TẮC (HẾT CẶP KHẢ DỤNG) · TỰ ĐỘNG ĐỔI BÀI!')
            playSound('shuffle', soundEnabled)
            setIsScrambling(true)
            setTimeout(() => setIsScrambling(false), 450)
            const shuffled = ensureSolvableBoard(next, dims.rows, dims.cols)
            if (playMode === 'pvp-online' && roomCode) {
              sendRoomAction({ type: 'shuffle', newBoard: shuffled })
            }
            return shuffled
          }
        }
        return next
      })

      // NOW AND ONLY NOW: Award score, combo, energy & display score popup!
      setScore(prev => {
        const updated = prev + addedPoints
        if (updated > highScore) {
          setHighScore(updated)
          if (typeof window !== 'undefined') {
            localStorage.setItem('PIKA_HIGHSCORE', updated.toString())
          }
          submitScoreToLeaderboard(updated)
        }
        return updated
      })
      setCombo(newCombo)
      setComboExpiresAt(Date.now() + 4500)
      setComboSecondsLeft(4.5)
      setEnergy(e => Math.min(100, e + 20))

      // Character Reactions
      if (newCombo >= 2) {
        triggerPlayerEmotion('combo', 2200)
      } else {
        triggerPlayerEmotion('happy', 1400)
      }
      if (playMode !== 'solo') {
        triggerRivalEmotion('sad', 1200)
      }

      // Floating score tag popup
      const popups: Array<{ id: string; x: number; y: number; text: string; color: string }> = [
        { id: `fp_${Date.now()}_pts`, x: midX, y: midY, text: `+${addedPoints} ✨`, color: '#fef08a' }
      ]
      if (hasSolarFire) {
        popups.push({
          id: `fp_${Date.now()}_solar`,
          x: midX,
          y: Math.max(5, midY - 20),
          text: `HẠT NHÂN LỬA +80đ! 🔥`,
          color: '#fb923c',
        })
      }
      if (hasElectro) {
        popups.push({
          id: `fp_${Date.now()}_electro`,
          x: midX,
          y: Math.max(5, midY - 20),
          text: `SẤM SÉT HOÀNG KIM +50đ! ⚡`,
          color: '#facc15',
        })
      }
      if (newCombo > 1) {
        popups.push({
          id: `fp_${Date.now()}_combo`,
          x: midX,
          y: Math.max(5, midY - 9),
          text: `COMBO x${newCombo}! 🔥`,
          color: '#f97316'
        })
      }
      setFloatingPopups(prev => [...prev, ...popups])

      setTimeout(() => {
        setShockwaves(prev => prev.filter(sw => sw.id !== swIdA && sw.id !== swIdB))
        setMatchParticles(prev => prev.filter(pt => !newParticles.some(np => np.id === pt.id)))
        setFloatingPopups(prev => prev.filter(fp => !popups.some(np => np.id === fp.id)))
      }, 750)

      setNotice(`NỐI THÀNH CÔNG! +${addedPoints} ĐIỂM ${newCombo > 1 ? `(${newCombo}x COMBO!)` : ''}`)

      // Send match action to server
      if (playMode === 'pvp-online' && roomCode) {
        sendRoomAction({
          type: 'match',
          coordA: prevCoord,
          coordB: coord,
          points: addedPoints,
          combo: newCombo,
        })
      }

      // Unlock input lock
      isMatchingRef.current = false
    }, 220)
  }

  /* ─── Active PVP Skills (Gây Bất Lợi Cho Đối Thủ) ─── */
  const triggerSkill = (skill: 'freeze' | 'scramble' | 'fog') => {
    if (gameOver || isMeFrozen) return
    setSelected(null)
    setHintPair(null)

    // Calculate avatar positions for projectile directly from character sprite center
    const avatarEl = document.getElementById('player-active-avatar')
    const spriteEl = avatarEl?.querySelector('.character-sprite-box') || avatarEl
    const avatarRect = (spriteEl || avatarEl)?.getBoundingClientRect()
    const startX = avatarRect ? avatarRect.left + avatarRect.width / 2 : window.innerWidth * 0.18
    const startY = avatarRect ? avatarRect.top + avatarRect.height / 2 : window.innerHeight * 0.35

    const rivalEl = document.getElementById('rival-active-avatar')
    const rivalSpriteEl = rivalEl?.querySelector('.character-sprite-box') || rivalEl
    const rivalRect = (rivalSpriteEl || rivalEl)?.getBoundingClientRect()
    const targetX = rivalRect ? rivalRect.left + rivalRect.width / 2 : window.innerWidth * 0.82
    const targetY = rivalRect ? rivalRect.top + rivalRect.height / 2 : window.innerHeight * 0.35

    if (skill === 'freeze' && energy >= 30) {
      setEnergy(e => e - 30)
      playSound('freeze', soundEnabled)
      setNotice('❄ BẠN ĐÃ ĐÓNG BĂNG ĐỐI THỦ 3 GIÂY!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      setAvatarBeams([{ id: `pvp_freeze_${Date.now()}`, startX, startY, targetX, targetY, element: 'frost', badge: '❄️' }])
      setTimeout(() => setAvatarBeams([]), 550)

      if (playMode === 'pvp-bot') {
        setRivalFrozenUntil(Date.now() + 3000)
      } else if (playMode === 'pvp-online' && roomCode) {
        sendRoomAction({ type: 'freeze' })
      }
    } else if (skill === 'scramble' && energy >= 45) {
      setEnergy(e => e - 45)
      playSound('scramble', soundEnabled)
      setNotice('🌪 BẠN ĐÃ XÁO TRỘN BẢNG CỦA ĐỐI THỦ!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      setAvatarBeams([{ id: `pvp_scramble_${Date.now()}`, startX, startY, targetX, targetY, element: 'astral', badge: '🌪' }])
      setTimeout(() => setAvatarBeams([]), 550)

      if (playMode === 'pvp-bot') {
        setRivalBoard(b => shuffleBoard(b, dims.rows, dims.cols))
      } else if (playMode === 'pvp-online' && roomCode) {
        sendRoomAction({ type: 'scramble' })
      }
    } else if (skill === 'fog' && energy >= 35) {
      setEnergy(e => e - 35)
      playSound('fog', soundEnabled)
      setNotice('🌫 BẠN ĐÃ TUNG KHÓI LÀM MỜ BẢNG ĐỐI THỦ 3.5S!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      setAvatarBeams([{ id: `pvp_fog_${Date.now()}`, startX, startY, targetX, targetY, element: 'shadow', badge: '🌫' }])
      setTimeout(() => setAvatarBeams([]), 550)

      if (playMode === 'pvp-bot') {
        setRivalFogUntil(Date.now() + 3500)
      } else if (playMode === 'pvp-online' && roomCode) {
        sendRoomAction({ type: 'fog' })
      }
    }
  }

  /* ─── Chiêu Thức Cuối (Ultimate Skills) Cho Từng Nhân Vật (Đặc Trưng Riêng Biệt, Tuyệt Đối Không Trùng Lặp Xóa Cặp) ─── */
  const triggerUltimateSkill = useCallback(() => {
    if (gameOver) return
    setSelected(null)
    setHintPair(null)

    const curChar = getCharacterById(selectedCharacterId)
    const cost = curChar.ultimate.energyCost

    if (energy < cost) {
      playSound('wrong', soundEnabled)
      setNotice(`CHƯA ĐỦ NĂNG LƯỢNG CHIÊU CUỐI! CẦN ${cost}% (HIỆN CÓ: ${energy}%)`)
      return
    }

    // Tiêu hao năng lượng
    setEnergy(e => Math.max(0, e - cost))

    // Bật hiệu ứng Cut-in Arcade đặc trưng (Banner nổi nhẹ nhàng, không che màn hình)
    setUltimateCutin({ character: curChar, active: true })
    playSound('match', soundEnabled)
    setNotice(`💥 ${curChar.name.toUpperCase()}: "${curChar.ultimate.voiceLine}"!`)
    triggerPlayerEmotion('combo', 2400)
    if (playMode !== 'solo') {
      triggerRivalEmotion('sad', 2400)
    }

    setTimeout(() => {
      setUltimateCutin(null)
    }, 1500)

    // Hàm phóng tia chùm và giật nổ tiêu diệt ô cờ
    const applyElementalZap = (
      pairs: [Coord, Coord][],
      element: ElementalZap['element'],
      badge: string,
      newBoard: Cell[][],
      points: number,
      onComplete?: () => void
    ) => {
      if (pairs.length === 0) return
      const zaps: ElementalZap[] = []
      pairs.forEach((pair, pIdx) => {
        zaps.push({ id: `zap_${pIdx}_0_${Date.now()}`, row: pair[0].row, col: pair[0].col, element, badge })
        zaps.push({ id: `zap_${pIdx}_1_${Date.now()}`, row: pair[1].row, col: pair[1].col, element, badge })
      })
      setActiveSkillZaps(zaps)

      // Tia chùm năng lượng xuất phát chuẩn xác từ tâm Avatar tới các ô mục tiêu
      const avatarEl = document.getElementById('player-active-avatar')
      const spriteEl = avatarEl?.querySelector('.character-sprite-box') || avatarEl
      const avatarRect = (spriteEl || avatarEl)?.getBoundingClientRect()
      const startX = avatarRect ? avatarRect.left + avatarRect.width / 2 : window.innerWidth * 0.18
      const startY = avatarRect ? avatarRect.top + avatarRect.height / 2 : window.innerHeight * 0.35

      const beams: AvatarSkillBeam[] = []
      pairs.forEach((pair, pIdx) => {
        [pair[0], pair[1]].forEach((c, cIdx) => {
          const tileEl = document.getElementById(`board-tile-${c.row}-${c.col}`)
          const tileRect = tileEl?.getBoundingClientRect()
          const targetX = tileRect ? tileRect.left + tileRect.width / 2 : window.innerWidth * 0.5
          const targetY = tileRect ? tileRect.top + tileRect.height / 2 : window.innerHeight * 0.5
          beams.push({
            id: `beam_${pIdx}_${cIdx}_${Date.now()}`,
            startX,
            startY,
            targetX,
            targetY,
            element,
            badge,
          })
        })
      })
      setAvatarBeams(beams)
      setTimeout(() => {
        setAvatarBeams([])
      }, 550)

      setTimeout(() => {
        const solvable = ensureSolvableBoard(newBoard, dims.rows, dims.cols)
        setBoard(solvable)
        setScore(s => s + points)
        setActiveSkillZaps([])
        if (playMode === 'pvp-online' && roomCode) {
          sendRoomAction({
            type: 'shuffle',
            newBoard: solvable,
            points,
          })
        }
        if (onComplete) onComplete()
      }, 500)
    }

    // Thực thi hiệu ứng độc nhất vô nhị của từng nhân vật (Satoshi, Madara, Himeko)
    switch (curChar.id) {
      case 'satoshi': {
        // ⚡ Radar Sấm Sét Hoàng Kim 10s + Tặng 15 Gợi ý & 3 Đổi Bài + TIÊU DIỆT 2 CẶP POKÉMON (+30đ)
        // PVP: Tê liệt 3.5s + Bẻ gãy Combo về 0 + Triệt tiêu 35% năng lượng đối thủ!
        playSound('thunder', soundEnabled)
        setThunderRadarUntil(Date.now() + 10000)
        setHintsLeft(h => h + 15)
        setShufflesLeft(s => s + 3)

        // Phóng sét tiêu diệt 2 cặp Pokémon
        const res = findPairsToClear(board, 2, dims.rows, dims.cols)
        if (res.cleared > 0) {
          applyElementalZap(res.pairs, 'electric', '⚡', res.newBoard, 30)
        }

        // PVP Mechanics
        if (playMode === 'pvp-bot') {
          setRivalFrozenUntil(Date.now() + 3500)
          setNotice('⚡ SẤM SÉT 10 VẠN VOLT! Tiêu diệt 2 cặp Pokémon (+30đ), mở Radar 10s (+15 Gợi ý, +3 Đổi bài) & Tê liệt Bot 3.5s!')
        } else if (playMode === 'pvp-online' && roomCode) {
          sendRoomAction({ type: 'ultimate', charId: 'satoshi' })
          setNotice('⚡ SẤM SÉT 10 VẠN VOLT! Tiêu diệt 2 cặp Pokémon (+30đ), Radar 10s, Tê liệt 3.5s, Bẻ gãy Combo & Triệt tiêu 35% năng lượng đối thủ!')
        } else {
          setNotice('⚡ SẤM SÉT 10 VẠN VOLT! Tiêu diệt 2 cặp Pokémon (+30đ), mở Radar 10s & Tặng +15 Gợi ý, +3 Đổi bài!')
        }
        break
      }
      case 'madara':
      case 'maldara': {
        // ☄️ Trọng Lực Susanoo (Dồn cờ xuống đáy) + TIÊU DIỆT 1 CẶP (+25đ) + Ngưng Đọng Thời Gian 8s + Khiên Hào Quang 15s
        // PVP: Phong ấn Tsukuyomi đóng băng 4.5s & đảo tung toàn bộ bảng đối thủ!
        playSound('slash', soundEnabled)
        setTimerFrozenUntil(Date.now() + 8000)
        setImmunityUntil(Date.now() + 15000)

        // Dồn cờ xuống đáy (Gravity Fall)
        const newBoard = board.map(row => [...row])
        for (let c = 0; c < dims.cols; c++) {
          const colCells: Cell[] = []
          for (let r = 0; r < dims.rows; r++) {
            if (newBoard[r][c] !== null) colCells.push(newBoard[r][c])
          }
          const startR = dims.rows - colCells.length
          for (let r = 0; r < dims.rows; r++) {
            if (r < startR) newBoard[r][c] = null
            else newBoard[r][c] = colCells[r - startR]
          }
        }

        // Susanoo nghiền nát tiêu diệt 1 cặp cờ
        const res = findPairsToClear(newBoard, 1, dims.rows, dims.cols)
        if (res.cleared > 0) {
          applyElementalZap(res.pairs, 'shadow', '☄️', res.newBoard, 25)
        } else {
          const solvableBoard = ensureSolvableBoard(newBoard, dims.rows, dims.cols)
          setBoard(solvableBoard)
        }

        // Sóng chấn Susanoo
        const swId = `sw_susanoo_${Date.now()}`
        setShockwaves(prev => [...prev, { id: swId, x: 50, y: 50 }])

        // PVP Mechanics
        if (playMode === 'pvp-bot') {
          setRivalFrozenUntil(Date.now() + 4500)
          setRivalBoard(cur => {
            if (cur.length === 0) return cur
            const flat = cur.flat()
            for (let i = flat.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[flat[i], flat[j]] = [flat[j], flat[i]]
            }
            const reshuffled: Cell[][] = []
            for (let r = 0; r < dims.rows; r++) {
              reshuffled.push(flat.slice(r * dims.cols, (r + 1) * dims.cols))
            }
            return ensureSolvableBoard(reshuffled, dims.rows, dims.cols)
          })
          setNotice('☄️ ẢO THUẬT TSUKUYOMI & SUSANOO! Dồn cờ, tiêu diệt 1 cặp (+25đ), Ngưng đọng 8s, Khiên 15s & đảo tung bảng bot!')
        } else if (playMode === 'pvp-online' && roomCode) {
          sendRoomAction({ type: 'ultimate', charId: 'madara', newBoard: res.cleared > 0 ? res.newBoard : newBoard })
          setNotice('☄️ ẢO THUẬT TSUKUYOMI & SUSANOO! Dồn cờ, tiêu diệt 1 cặp (+25đ), Khiên 15s, Đóng băng 4.5s & đảo tung bảng đối thủ!')
        } else {
          setNotice('☄️ TRỌNG LỰC SUSANOO! Dồn cờ xuống đáy, tiêu diệt 1 cặp (+25đ), Ngưng đọng thời gian 8s & Bật Khiên Susanoo 15s!')
        }
        break
      }
      case 'himeko': {
        // 🔥 Laser Quỹ Đạo Chữ Thập + TIÊU DIỆT 2 CẶP POKÉMON (+45đ) + Solar Overdrive 12s (x3 Điểm & Hồi +2s mỗi nước nối)
        // PVP: Thiêu đốt CƯỚP 60 điểm đối thủ + Mù Sương Nhiệt 5s + Khóa Tê Liệt 3.5s!
        playSound('astral', soundEnabled)
        setSolarOverdriveUntil(Date.now() + 12000)

        // Quét chữ thập: Hàng giữa & Cột giữa
        const midR = Math.floor(dims.rows / 2)
        const midC = Math.floor(dims.cols / 2)
        setActiveLaserCross({ row: midR, col: midC })
        setTimeout(() => setActiveLaserCross(null), 850)

        // Phóng laser bão lửa thiêu rụi và tiêu diệt 2 cặp Pokémon
        const res = findPairsToClear(board, 2, dims.rows, dims.cols)
        if (res.cleared > 0) {
          applyElementalZap(res.pairs, 'fire', '🔥', res.newBoard, 45)
        } else {
          setScore(s => s + 45)
        }

        // Shockwaves dọc theo chữ thập
        setShockwaves(prev => [
          ...prev,
          { id: `sw_himeko_h_${Date.now()}`, x: 50, y: ((midR + 0.5) / dims.rows) * 100 },
          { id: `sw_himeko_v_${Date.now()}`, x: ((midC + 0.5) / dims.cols) * 100, y: 50 },
        ])

        // PVP Mechanics: Thiêu đốt đối thủ, CƯỚP ĐIỂM, gây Mù Sương 5s & Khóa Nhiệt 3.5s
        if (playMode === 'pvp-bot') {
          const stolen = Math.min(rivalScore, 60)
          setRivalScore(s => Math.max(0, s - stolen))
          setScore(s => s + stolen)
          setRivalFogUntil(Date.now() + 5000)
          setRivalFrozenUntil(Date.now() + 3500)
          setNotice(`🔥 BÃO LỬA THIÊN THỂ! Tiêu diệt 2 cặp (+45đ), Solar Overdrive x3 Điểm 12s, CƯỚP ${stolen}đ từ Bot, gây Mù Sương 5s & Đóng Băng 3.5s!`)
        } else if (playMode === 'pvp-online' && roomCode) {
          sendRoomAction({ type: 'ultimate', charId: 'himeko' })
          setNotice('🔥 BÃO LỬA THIÊN THỂ! Tiêu diệt 2 cặp (+45đ), Solar Overdrive x3 Điểm 12s, CƯỚP 60đ đối thủ, gây Mù Sương 5s & Đóng Băng 3.5s!')
        } else {
          setNotice('🔥 BÃO LỬA THIÊN THỂ! Tiêu diệt 2 cặp Pokémon (+45đ), kích hoạt Solar Overdrive x3 Điểm 12s!')
        }
        break
      }
      default: {
        playSound('match', soundEnabled)
        const res = findPairsToClear(board, 2, dims.rows, dims.cols)
        if (res.cleared > 0) {
          applyElementalZap(res.pairs, 'electric', '⚡', res.newBoard, 30)
        }
        setNotice('✨ ĐÃ KÍCH HOẠT KỸ NĂNG TIÊU DIỆT CẶP CỜ!')
        break
      }
    }
  }, [gameOver, selectedCharacterId, energy, soundEnabled, playMode, board, dims.rows, dims.cols, triggerPlayerEmotion, triggerRivalEmotion, roomCode, sendRoomAction, rivalScore])

  /* ─── Matchmaking Queue Operations ─── */
  const cancelMatchmakingQueue = useCallback(async () => {
    setIsMatchmaking(false)
    setFoundMatch(null)
    if (matchmakingTimerRef.current) {
      clearInterval(matchmakingTimerRef.current)
      matchmakingTimerRef.current = null
    }
    try {
      await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', playerId }),
      })
    } catch { }
  }, [playerId])

  const startMatchmaking = useCallback(async () => {
    if (!user) {
      playSound('wrong', soundEnabled)
      setCoinRewardToast({
        amount: 0,
        message: '🔒 Khách không được đấu Rank! Vui lòng ĐĂNG NHẬP để tham gia Đấu Xếp Hạng.',
      })
      setTimeout(() => setCoinRewardToast(null), 4500)
      setAuthMode('login')
      setShowAuthModal(true)
      return
    }

    setIsMatchmaking(true)
    setMatchWaitSeconds(0)
    setFoundMatch(null)

    const onMatchSuccess = (matchInfo: {
      rivalName: string
      rivalRankTier?: { name: string; icon: string; color?: string }
      rivalRankPoints?: number
      rivalCharacterId?: string
      roomCode?: string
      isBot?: boolean
      isHost?: boolean
    }) => {
      if (matchmakingTimerRef.current) {
        clearInterval(matchmakingTimerRef.current)
        matchmakingTimerRef.current = null
      }

      const oppRp = typeof matchInfo.rivalRankPoints === 'number' ? matchInfo.rivalRankPoints : 500
      const tierObj = matchInfo.rivalRankTier || getRankTier(oppRp)
      setRivalRankPoints(oppRp)

      setFoundMatch({
        rivalName: matchInfo.rivalName,
        rivalRank: tierObj.name || 'Tân Binh',
        rivalRankIcon: tierObj.icon || '🥉',
        rivalRankPoints: oppRp,
        rivalCharId: matchInfo.rivalCharacterId || 'kasumi',
        roomCode: matchInfo.roomCode,
        isBot: matchInfo.isBot,
      })

      playSound('match', soundEnabled)
      if (bgmEnabled) startBgm()

      // Show punchy VS faceoff for 900ms, then immediately launch match
      setTimeout(() => {
        setIsMatchmaking(false)
        setFoundMatch(null)

        if (matchInfo.roomCode && !matchInfo.isBot) {
          setInputCode(matchInfo.roomCode)
          setRoomCode(matchInfo.roomCode)
          setIsHost(!!matchInfo.isHost)
          setGridSize('14x8')
          setBoardMode('separate')
          setPlayMode('pvp-online')
          setRivalName(matchInfo.rivalName)
          setScore(0)
          setRivalScore(0)
          setCombo(0)
          setEnergy(0)
          setSelected(null)
          setLinkPath(null)
          setHintPair(null)
          setFrozenUntil(0)
          setFogUntil(0)
          setRivalFrozenUntil(0)
          setRivalFogUntil(0)
          setGameOver(null)
          setInGame(true)
          setNotice(`⚔️ TRẬN ĐẤU XẾP HẠNG BẮT ĐẦU! VS ${matchInfo.rivalName}`)
          playSound('match', soundEnabled)
          if (bgmEnabled) startBgm()
        } else {
          // Bot or quick fallback match
          setPlayMode('pvp-bot')
          setGridSize('14x8')
          setBoardMode('separate')
          setRivalName(`${matchInfo.rivalName}`)
          const newBoard = createLocalBoard('14x8')
          setBoard(newBoard)
          setRivalBoard(createLocalBoard('14x8'))
          setScore(0)
          setRivalScore(0)
          setTimeLeft(DEFAULT_TIME)
          setShufflesLeft(DEFAULT_SHUFFLES)
          setHintsLeft(DEFAULT_HINTS)
          setCombo(0)
          setEnergy(0)
          setSelected(null)
          setLinkPath(null)
          setHintPair(null)
          setFrozenUntil(0)
          setFogUntil(0)
          setRivalFrozenUntil(0)
          setRivalFogUntil(0)
          setUltimateCutin(null)
          setDoubleScoreTurnsLeft(0)
          setImmunityUntil(0)
          setTimerFrozenUntil(0)
          setGameOver(null)
          setInGame(true)
          setNotice(`⚔️ TRẬN ĐẤU XẾP HẠNG BẮT ĐẦU! VS ${matchInfo.rivalName}`)
          playSound('match', soundEnabled)
          if (bgmEnabled) startBgm()
        }
      }, 900)
    }

    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          playerId,
          playerName: playerName || 'Trainer',
          name: playerName || 'Trainer',
          characterId: selectedCharacterId,
          rankPoints,
        }),
      })
      const data = await res.json()
      if (data.success && data.averageWaitSeconds) {
        setAverageWaitSeconds(data.averageWaitSeconds)
      }
      if (data.success && (data.matched || data.status === 'matched') && data.match) {
        onMatchSuccess(data.match)
        return
      }
    } catch { }

    const interval = setInterval(async () => {
      setMatchWaitSeconds(s => s + 1)
      try {
        const pollRes = await fetch(`/api/matchmaking?action=poll&playerId=${encodeURIComponent(playerId)}`, {
          headers: { 'Cache-Control': 'no-cache' }
        })
        const pollData = await pollRes.json()
        if (pollData.success && (pollData.matched || pollData.status === 'matched') && pollData.match) {
          onMatchSuccess(pollData.match)
        }
      } catch { }
    }, 1000)

    matchmakingTimerRef.current = interval
  }, [playerId, playerName, selectedCharacterId, rankPoints, soundEnabled, bgmEnabled, user])

  /* ─── Bottom Actions ─── */
  const onShuffleClick = () => {
    if (shufflesLeft <= 0 || gameOver) return
    playSound('shuffle', soundEnabled)
    setShufflesLeft(s => s - 1)
    setIsScrambling(true)
    setTimeout(() => setIsScrambling(false), 550)

    const next = ensureSolvableBoard(board, dims.rows, dims.cols, true)
    setBoard(next)
    setSelected(null)
    setHintPair(null)
    setNotice(`ĐÃ ĐỔI VỊ TRÍ! CÒN ${shufflesLeft - 1} LƯỢT.`)

    if (playMode === 'pvp-online' && roomCode) {
      sendRoomAction({ type: 'shuffle', newBoard: next })
    }
  }

  const onHintClick = () => {
    if (hintsLeft <= 0 || gameOver) return
    let pair = findAnyPair(board, dims.rows, dims.cols)
    if (!pair) {
      const next = ensureSolvableBoard(board, dims.rows, dims.cols)
      setBoard(next)
      pair = findAnyPair(next, dims.rows, dims.cols)
    }
    if (pair) {
      playSound('hint', soundEnabled)
      setHintsLeft(h => h - 1)
      setHintPair(pair)
      setNotice(`GỢI Ý: CẶP [${pair[0].row + 1},${pair[0].col + 1}] & [${pair[1].row + 1},${pair[1].col + 1}]! CÒN ${hintsLeft - 1} LƯỢT.`)
    } else {
      playSound('wrong', soundEnabled)
      setNotice('KHÔNG CÒN CẶP NỐI KHẢ DỤNG!')
    }
  }

  const onRestart = () => {
    if (playMode === 'pvp-online' && roomCode) {
      sendRoomAction({ type: 'restart' })
    } else {
      startMatch(gridSize)
    }
  }

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / DEFAULT_TIME) * 100))

  const renderSharedModals = () => (
    <>
      {/* ─── Page Loading Splash Animation (Tên game kèm dòng chữ đang tải ở dưới) ─── */}
      {isAppLoading && (
        <div className="game-splash-loader">
          <div className="game-splash-content">
            <div className="game-splash-aura-back" />
            <div className="game-splash-icon-wrapper">
              <span className="game-splash-lightning">⚡</span>
              <img
                src={getSpriteUrl(25, 'artwork')}
                alt="Pikachu"
                className="game-splash-pikachu"
              />
              <span className="game-splash-lightning">⚡</span>
            </div>
            <h1 className="game-splash-title">
              <span className="game-splash-title-gold">PIKACHU</span>
              <span className="game-splash-title-cyan"> MIRROR RUSH</span>
            </h1>
            <div className="game-splash-bar-shell">
              <div className="game-splash-bar-fill" />
            </div>
            <div className="game-splash-loading-text">
              <span className="splash-pulse-dot" /> {loadingMessage}
            </div>
            <div className="game-splash-subtitle">
              Đấu Trường Gương Thần · 5 Chương Cốt Truyện · Đấu Rank & Đối Kháng
            </div>
          </div>
        </div>
      )}

      {/* Coin Reward Toast */}
      {coinRewardToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #064e3b, #047857)',
          border: '2px solid #34d399',
          borderRadius: '16px',
          padding: '12px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fff',
        }}>
          <div style={{ fontSize: '24px' }}>🪙</div>
          <div>
            <div style={{ fontWeight: 900, color: '#facc15', fontSize: '15px' }}>
              +{coinRewardToast.amount} PIKA-COINS!
            </div>
            <div style={{ fontSize: '12px', color: '#d1fae5' }}>{coinRewardToast.message}</div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '94%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#facc15', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} color="#facc15" /> BẢNG VINH DANH CAO THỦ
              </h2>
              <button
                onClick={() => {
                  fetchLeaderboard()
                  fetchRankings()
                }}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}
                title="Tải lại bảng điểm trực tuyến"
              >
                🔄 Làm mới
              </button>
            </div>

            {/* Tabs: Bậc Rank vs Kỷ Lục Điểm Số */}
            <div style={{ display: 'flex', gap: '8px', margin: '12px 0 10px' }}>
              <button
                onClick={() => {
                  setLeaderboardTab('rankings')
                  fetchRankings()
                }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: leaderboardTab === 'rankings' ? '#facc15' : 'rgba(255,255,255,0.1)',
                  background: leaderboardTab === 'rankings' ? 'rgba(250,204,21,0.18)' : 'rgba(0,0,0,0.4)',
                  color: leaderboardTab === 'rankings' ? '#facc15' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>👑</span>
                <span>BẬC RANK CAO THỦ</span>
              </button>

              <button
                onClick={() => {
                  setLeaderboardTab('scores')
                  fetchLeaderboard()
                }}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid',
                  borderColor: leaderboardTab === 'scores' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                  background: leaderboardTab === 'scores' ? 'rgba(56,189,248,0.18)' : 'rgba(0,0,0,0.4)',
                  color: leaderboardTab === 'scores' ? '#38bdf8' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>🏆</span>
                <span>KỶ LỤC ĐIỂM SỐ</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '8px', maxHeight: '300px', paddingRight: '4px' }}>
              {leaderboardTab === 'rankings' ? (
                isLoadingRankings ? (
                  <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                    Đang đồng bộ bảng xếp hạng rank...
                  </div>
                ) : rankedPlayers.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 14px',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255,255,255,0.12)'
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>👑</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Chưa có huấn luyện viên nào tham gia đấu rank</div>
                    <small style={{ color: '#64748b' }}>Hãy bắt đầu tìm trận xếp hạng để là người đầu tiên leo rank!</small>
                  </div>
                ) : (
                  rankedPlayers.map((p, index) => {
                    const medal = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`
                    const medalColor = index === 0 ? '#facc15' : index === 1 ? '#e2e8f0' : index === 2 ? '#fb923c' : '#94a3b8'
                    return (
                      <div
                        key={p.username}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: index < 3 ? 'rgba(250, 204, 21, 0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${index === 0 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 900, color: medalColor, fontSize: '14px', minWidth: '32px' }}>{medal}</span>
                          <CharacterAvatar characterId={p.characterId || 'satoshi'} emotion="idle" size="sm" interactive={false} />
                          <div>
                            <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{p.displayName}</strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{p.username}</div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span className="rank-pill" style={{ color: p.color, borderColor: p.color, fontSize: '11px', padding: '2px 8px' }}>
                            {p.tierIcon} {p.tierName}
                          </span>
                          <div style={{ fontSize: '11px', color: '#facc15', fontWeight: 800, marginTop: '2px' }}>
                            {p.rankPoints.toLocaleString()} RP
                          </div>
                        </div>
                      </div>
                    )
                  })
                )
              ) : (
                isLoadingLeaderboard ? (
                  <div style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                    Đang đồng bộ bảng điểm trực tuyến...
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 14px',
                    color: '#94a3b8',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px dashed rgba(255,255,255,0.12)'
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>✨</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Chưa có kỷ lục nào trên hệ thống</div>
                    <small style={{ color: '#64748b' }}>Hãy hoàn thành trận đấu để là người đầu tiên ghi danh vào bảng vàng!</small>
                  </div>
                ) : (
                  leaderboardData.map((item, index) => {
                    const medal = index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`
                    const medalColor = index === 0 ? '#facc15' : index === 1 ? '#e2e8f0' : index === 2 ? '#fb923c' : '#94a3b8'
                    return (
                      <div
                        key={item.id || index}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: index < 3 ? 'rgba(250, 204, 21, 0.08)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${index === 0 ? 'rgba(250, 204, 21, 0.35)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 900, color: medalColor, fontSize: '14px', minWidth: '28px' }}>{medal}</span>
                          <div>
                            <strong style={{ color: '#f8fafc', fontSize: '13px' }}>{item.name}</strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {item.mode} · {item.date}
                            </div>
                          </div>
                        </div>
                        <strong style={{ color: '#facc15', fontSize: '15px' }}>
                          {item.score.toLocaleString()} đ
                        </strong>
                      </div>
                    )
                  })
                )
              )}
            </div>

            <button className="modal-btn-secondary" style={{ marginTop: '14px' }} onClick={() => setShowLeaderboard(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Shop Modal */}
      {showShop && (
        <div className="modal-overlay">
          <div className="modal-content shop-modal" style={{ maxWidth: '640px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={22} color="#facc15" />
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#f8fafc' }}>
                  CỬA HÀNG HIỆU ỨNG
                </h2>
              </div>
              {user ? (
                <div className="coins-badge">
                  <Coins size={15} color="#facc15" />
                  <span>{coins.toLocaleString()} Xu</span>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
                  🔒 Đăng nhập để dùng Xu
                </div>
              )}
            </div>

            <p style={{ margin: '6px 0 14px', fontSize: '13px', color: '#94a3b8' }}>
              Chiến thắng các cấp Bot hoặc thi đấu PVP để kiếm Xu và mở khóa các hiệu ứng cực đỉnh!
            </p>

            {/* Tabs */}
            <div className="shop-tabs">
              <button
                className={`shop-tab-btn ${shopTab === 'boardTheme' ? 'active' : ''}`}
                onClick={() => setShopTab('boardTheme')}
              >
                🖼 Mặt Bảng
              </button>
              <button
                className={`shop-tab-btn ${shopTab === 'boardFrame' ? 'active' : ''}`}
                onClick={() => setShopTab('boardFrame')}
              >
                🔲 Viền Bảng
              </button>
              <button
                className={`shop-tab-btn ${shopTab === 'tileStyle' ? 'active' : ''}`}
                onClick={() => setShopTab('tileStyle')}
              >
                💎 Ô Icon
              </button>
              <button
                className={`shop-tab-btn ${shopTab === 'lineEffect' ? 'active' : ''}`}
                onClick={() => setShopTab('lineEffect')}
              >
                ⚡ Tia Line
              </button>
            </div>

            {/* Item Grid */}
            <div className="shop-item-grid">
              {(SHOP_CATALOG[shopTab === 'boardTheme' ? 'theme' : shopTab === 'boardFrame' ? 'frame' : shopTab === 'tileStyle' ? 'tile' : 'line'] || []).map(item => {
                const isUnlocked = unlockedItems.includes(item.id)
                const isEquipped = equipped[shopTab] === item.cssClass
                const canAfford = coins >= item.price

                return (
                  <div key={item.id} className={`shop-item-card ${isEquipped ? 'equipped' : ''}`}>
                    <div
                      className="shop-item-preview"
                      style={{ background: item.previewColor }}
                    />
                    <div className="shop-item-name">{item.name}</div>
                    <div className="shop-item-desc">{item.description}</div>
                    <div className="shop-item-price">
                      {item.price === 0 ? (
                        <span style={{ color: '#22c55e' }}>Miễn phí</span>
                      ) : (
                        <>
                          <Coins size={12} color="#facc15" />
                          <span>{item.price} Xu</span>
                        </>
                      )}
                    </div>

                    {isEquipped ? (
                      <button className="shop-btn-equipped" disabled>
                        ✓ ĐANG DÙNG
                      </button>
                    ) : isUnlocked ? (
                      <button className="shop-btn-equip" onClick={() => handleShopAction(item)}>
                        TRANG BỊ
                      </button>
                    ) : (
                      <button
                        className={`shop-btn-buy ${!canAfford ? 'disabled' : ''}`}
                        onClick={() => handleShopAction(item)}
                        disabled={!canAfford}
                      >
                        MUA {item.price} XU
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              className="modal-btn-secondary"
              style={{ marginTop: '16px' }}
              onClick={() => setShowShop(false)}
            >
              Đóng Cửa Hàng
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '36px', marginBottom: '6px' }}>🔑</div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#f8fafc' }}>
                {authMode === 'login' ? 'ĐĂNG NHẬP TÀI KHOẢN' : 'ĐĂNG KÝ TÀI KHOẢN'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Lưu lại điểm số, xu và các hiệu ứng đã mua vĩnh viễn
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', background: 'rgba(255,255,255,0.06)', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`shop-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px' }}
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                className={`shop-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px' }}
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
              >
                Đăng Ký
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  TÊN ĐĂNG NHẬP
                </label>
                <input
                  className="lobby-input"
                  value={authUsername}
                  onChange={e => setAuthUsername(e.target.value)}
                  placeholder="Tên tài khoản (viết liền không dấu)"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  MẬT KHẨU
                </label>
                <input
                  type="password"
                  className="lobby-input"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  autoComplete="current-password"
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    TÊN HIỂN THỊ TRONG GAME
                  </label>
                  <input
                    className="lobby-input"
                    value={authDisplayName}
                    onChange={e => setAuthDisplayName(e.target.value)}
                    placeholder="VD: Satoshi, Red, Ash..."
                  />
                </div>
              )}

              {authError && (
                <div style={{ color: '#f43f5e', fontSize: '12px', background: 'rgba(244,63,94,0.1)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)' }}>
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                className="modal-btn-primary"
                style={{ marginTop: '8px', width: '100%' }}
                disabled={authLoading}
              >
                {authLoading ? 'ĐANG XỬ LÝ...' : authMode === 'login' ? 'ĐĂNG NHẬP NGAY' : 'TẠO TÀI KHOẢN'}
              </button>

              <button
                type="button"
                className="modal-btn-secondary"
                onClick={() => {
                  setShowAuthModal(false)
                  setAuthError(null)
                }}
              >
                Đóng (Chơi như Khách)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal" style={{ maxWidth: '820px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#facc15' }}>
                    QUẢN TRỊ VIÊN HỆ THỐNG
                  </h2>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Kiểm soát tài khoản, đổi mật khẩu & điều chỉnh số lượng Xu người chơi
                  </div>
                </div>
              </div>
              <button
                onClick={loadAdminUsers}
                disabled={adminLoading}
                className="btn-admin-panel"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                🔄 {adminLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>

            {/* Filter Search */}
            <div style={{ margin: '12px 0 8px' }}>
              <input
                className="lobby-input"
                placeholder="🔍 Tìm kiếm tài khoản theo username hoặc tên hiển thị..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
            </div>

            {adminFeedback && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '10px',
                background: adminFeedback.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(244,63,94,0.15)',
                color: adminFeedback.type === 'success' ? '#4ade80' : '#fb7185',
                border: `1px solid ${adminFeedback.type === 'success' ? '#22c55e' : '#f43f5e'}`
              }}>
                {adminFeedback.text}
              </div>
            )}

            {/* User List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', display: 'grid', gap: '8px', paddingRight: '4px' }}>
              {adminLoading && adminUsersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Đang tải danh sách người chơi...</div>
              ) : adminUsersList.filter(u =>
                u.username.toLowerCase().includes(adminSearch.toLowerCase()) ||
                u.displayName.toLowerCase().includes(adminSearch.toLowerCase())
              ).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Không tìm thấy người chơi nào.</div>
              ) : (
                adminUsersList
                  .filter(u =>
                    u.username.toLowerCase().includes(adminSearch.toLowerCase()) ||
                    u.displayName.toLowerCase().includes(adminSearch.toLowerCase())
                  )
                  .map(u => (
                    <AdminUserRow
                      key={u.username}
                      account={u}
                      isCurrentAdmin={user?.username === u.username}
                      onSaveCoins={(newCoins) => handleAdminSetCoins(u.username, newCoins)}
                      onResetPassword={(newPass) => handleAdminResetPassword(u.username, newPass)}
                      onDeleteUser={() => handleAdminDeleteUser(u.username)}
                    />
                  ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                className="modal-btn-secondary"
                onClick={() => {
                  setShowAdminModal(false)
                  setAdminFeedback(null)
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📖 Sổ Tay Hướng Dẫn Tân Thủ (Beginner Guidebook Modal) */}
      {showTutorial && (
        <div className="modal-overlay">
          <div className="modal-content guidebook-modal">
            {/* Header */}
            <div className="guidebook-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>📖</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#facc15', letterSpacing: '0.02em' }}>
                    SỔ TAY HƯỚNG DẪN TÂN THỦ
                  </h2>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Cẩm nang bỏ túi dành cho Huấn Luyện Viên Pokémon Pikachu Classic
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTutorial(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Chapters Navigation Tabs */}
            <div className="guidebook-tabs">
              <button
                className={`guidebook-tab-btn ${tutorialChapter === 1 ? 'active' : ''}`}
                onClick={() => setTutorialChapter(1)}
              >
                <span>📜</span>
                <span>1. Luật Chơi</span>
              </button>
              <button
                className={`guidebook-tab-btn ${tutorialChapter === 2 ? 'active' : ''}`}
                onClick={() => setTutorialChapter(2)}
              >
                <span>🎮</span>
                <span>2. Chế Độ</span>
              </button>
              <button
                className={`guidebook-tab-btn ${tutorialChapter === 3 ? 'active' : ''}`}
                onClick={() => setTutorialChapter(3)}
              >
                <span>⚡</span>
                <span>3. Kỹ Năng</span>
              </button>
              <button
                className={`guidebook-tab-btn ${tutorialChapter === 4 ? 'active' : ''}`}
                onClick={() => setTutorialChapter(4)}
              >
                <span>🪙</span>
                <span>4. Xu & Shop</span>
              </button>
              <button
                className={`guidebook-tab-btn ${tutorialChapter === 5 ? 'active' : ''}`}
                onClick={() => setTutorialChapter(5)}
              >
                <span>🔥</span>
                <span>5. Mẹo Combo</span>
              </button>
            </div>

            {/* Chapter Content Body */}
            <div className="guidebook-content">
              {tutorialChapter === 1 && (
                <>
                  <div className="guidebook-feature-card">
                    <div className="feat-icon">⚡</div>
                    <div>
                      <strong>Quy Tắc Đường Nối 2 Khúc Cua (Tối Đa 3 Đoạn Thẳng)</strong>
                      <p>
                        Chọn 2 ô Pokémon giống hệt nhau. Đường nối giữa chúng chỉ được phép gấp khúc tối đa <strong>2 lần</strong> (tối đa 3 đoạn thẳng vuông góc) và không được xuyên qua các ô cờ khác.
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🔲</div>
                    <div>
                      <strong>Đường Nối Ngoài Viền Bảng Cờ</strong>
                      <p>
                        Các quân cờ nằm ở mép ngoài cùng có thể đi vòng ra vùng không gian trống bên ngoài viền bảng để kết nối với nhau cực kỳ dễ dàng.
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">⏳</div>
                    <div>
                      <strong>Mục Tiêu & Tính Giờ</strong>
                      <p>
                        Mỗi ván đấu có đồng hồ đếm ngược 5 phút. Hãy tìm và dọn sạch toàn bộ các cặp Pokémon trên bảng trước khi hết giờ để giành chiến thắng!
                      </p>
                    </div>
                  </div>
                </>
              )}

              {tutorialChapter === 2 && (
                <>
                  <div className="guidebook-feature-card">
                    <div className="feat-icon">👑</div>
                    <div>
                      <strong style={{ color: '#facc15' }}>Đấu Xếp Hạng Trực Tuyến (Ranked Matchmaking)</strong>
                      <p>
                        Hệ thống tự động tìm và ghép cặp đối thủ có trình độ Rank tương đương.
                        <br />• <strong>Khởi đầu</strong>: Tất cả người chơi mới xuất phát từ bậc thấp nhất: <strong>Đồng (0 RP)</strong>.
                        <br />• <strong>Thang Bậc Rank</strong>: Đồng (0 RP) ➔ Bạc (300 RP) ➔ Vàng (700 RP) ➔ Bạch Kim (1200 RP) ➔ Kim Cương (1800 RP) ➔ Cao Thủ (2500+ RP).
                        <br />• <strong>Phần Thưởng</strong>: Thắng mỗi trận nhận <strong>+60 RP</strong> và <strong>+200 Xu</strong>!
                        <br />• <strong>🔒 Lưu ý quan trọng cho Khách</strong>: Chế độ Rank yêu cầu <strong>ĐĂNG NHẬP</strong> để lưu điểm RP và vinh danh trên Bảng Vàng Toàn Server. Khách chỉ được chơi Solo và Đấu Bot.
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">👾</div>
                    <div>
                      <strong style={{ color: '#38bdf8' }}>Hệ Thống 8 Nhân Vật Pixel Art & Khóa Nhân Vật</strong>
                      <p>
                        • <strong>Khách (Guest)</strong>: Mặc định chơi nhân vật Satoshi (Huấn luyện viên Pikachu).
                        <br />• <strong>Đăng nhập tài khoản</strong>: Tự do chọn và chuyển đổi giữa 8 nhân vật huyền thoại: <em>Satoshi, Kasumi, Hiệp Sĩ Paladin, Ninja Bóng Đêm, Pháp Sư Lửa Mage, Xạ Thủ Rừng Xanh Ranger, Chiến Binh Tương Lai Cyber, Phù Thủy Băng Giá Frost</em>. Mỗi nhân vật sở hữu một Tuyệt Kỹ Tối Thượng riêng biệt!
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">👤</div>
                    <div>
                      <strong>Chơi Đơn (Solo)</strong>
                      <p>
                        Dọn sạch bảng cờ nhanh nhất có thể để ghi danh kỷ lục điểm số vào Bảng Vàng. Thắng nhận <strong>+100 Xu</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🤖</div>
                    <div>
                      <strong>Đấu Với Máy (50 Cấp Độ AI - 5 Tầng Thử Thách)</strong>
                      <p>
                        Đối đầu với 50 Pokémon AI chia thành 5 Tầng thử thách, từ Cấp 1 (Caterpie) đến Cấp 50 (Arceus Thần Sáng Tạo). Mỗi màn có đánh giá 1-3 ⭐, bạn phải tích lũy đủ số Sao yêu cầu để vượt lên Tầng tiếp theo. Thưởng từ <strong>+50 đến +4000 Xu</strong>!
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">⚔️</div>
                    <div>
                      <strong>PVP Phòng Tự Chọn (Chung Bảng hoặc Riêng Bảng)</strong>
                      <p>
                        Tạo phòng gửi mã mời thi đấu với bạn bè. Lựa chọn thi đấu Chung Bảng tranh giành cặp cờ hoặc Riêng Bảng kèm hệ thống chiêu thức đối kháng. Thắng nhận <strong>+200 Xu</strong>.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {tutorialChapter === 3 && (
                <>
                  <div className="guidebook-feature-card">
                    <div className="feat-icon">💥</div>
                    <div>
                      <strong style={{ color: '#facc15' }}>Tuyệt Kỹ Tối Thượng (Chiêu Cuối Của 8 Nhân Vật)</strong>
                      <p>
                        Khi thanh Năng Lượng đạt yêu cầu, bấm nút Tuyệt Kỹ để kích hoạt hiệu ứng Cut-in Arcade cực ngầu:
                        <br />• <strong>Satoshi (60% NL)</strong>: ⚡ <em>Điện Cao Thế</em> - Giáng sét dọn sạch ngay 2 cặp Pokémon ngẫu nhiên!
                        <br />• <strong>Kasumi (65% NL)</strong>: 🌊 <em>Thủy Thần Triều Cường</em> - Dọn 2 cặp cờ và đóng băng bảng đối thủ trong 2 giây.
                        <br />• <strong>Paladin (55% NL)</strong>: 🛡️ <em>Thánh Khiên Hộ Thể</em> - Miễn nhiễm hoàn toàn mọi hiệu ứng xấu và tự động gợi ý cờ trong 8 giây.
                        <br />• <strong>Ninja (50% NL)</strong>: 👤 <em>Ảnh Phân Thân</em> - Nhân đôi x2 điểm số của 5 nước nối liên tiếp tiếp theo.
                        <br />• <strong>Mage (65% NL)</strong>: 🔮 <em>Hỏa Cầu Bộc Phá</em> - Thiêu rụi 2 cặp cờ và làm ngưng đọng đồng hồ đếm ngược 5 giây.
                        <br />• <strong>Ranger (55% NL)</strong>: 🎯 <em>Mắt Ưng Xuyên Thấu</em> - Tự động dọn ngay cặp cờ khó nhất và xáo tung bảng đối thủ.
                        <br />• <strong>Cyber (60% NL)</strong>: 🤖 <em>Xung Điện Từ EMP</em> - Vô hiệu hóa và tung làn sương mù dày đặc lên đối thủ 4 giây.
                        <br />• <strong>Frost (70% NL)</strong>: ❄️ <em>Băng Hà Vĩnh Cửu</em> - Phong tỏa và đóng băng toàn bộ bảng đối thủ trong 4.5 giây!
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🔋</div>
                    <div>
                      <strong>Cơ Chế Tích Năng Lượng & Chiêu Thức Thường</strong>
                      <p>
                        Mỗi lần nối thành công 1 cặp Pokémon trong trận PVP Riêng Bảng, bạn được tích lũy <strong>+20% Năng Lượng</strong> (tối đa 100%).
                        <br />Ngoài Chiêu Cuối, bạn có thể dùng các chiêu thường:
                        <br />• <strong>Đóng Băng (30% NL)</strong>: Tê liệt đối thủ trong 3 giây.
                        <br />• <strong>Xáo Bảng (45% NL)</strong>: Xáo trộn toàn bộ vị trí quân cờ đối thủ.
                        <br />• <strong>Tung Mù (35% NL)</strong>: Phủ sương mù che khuất bảng đối thủ trong 3.5 giây.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {tutorialChapter === 4 && (
                <>
                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🪙</div>
                    <div>
                      <strong>Hệ Thống Tiền Xu (PikaCoins)</strong>
                      <p>
                        Xu là phần thưởng khi bạn chiến thắng các trận đấu. Hãy <strong>Đăng Nhập Tài Khoản</strong> để lưu số Xu vĩnh viễn (Khách chơi nhanh sẽ không hiển thị số Xu).
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🛍️</div>
                    <div>
                      <strong>Cửa Hàng Hiệu Ứng (32 Vật Phẩm Độc Quyền)</strong>
                      <p>
                        Sử dụng Xu tích lũy để mở khóa và trang bị:
                        <br />• <em>Mặt Bảng</em>: Ngọc Lục Bảo, Cyberpunk, Dung Nham, Hư Không, Hoa Anh Đào...
                        <br />• <em>Viền Bảng</em>: Hoàng Kim, Kim Cương Lấp Lánh, Rồng Lửa, Cực Quang...
                        <br />• <em>Ô Icon</em>: Ngọc Bích, Pha Lê Trong Suốt, Thẻ Vàng, Băng Tuyết...
                        <br />• <em>Tia Sét Khi Ăn Điểm</em>: Laser Điện, Plasma, Cầu Vồng RGB, Siêu Tốc...
                      </p>
                    </div>
                  </div>
                </>
              )}

              {tutorialChapter === 5 && (
                <>
                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🔥</div>
                    <div>
                      <strong>Bí Quyết Combo Bốc Lửa (On-Fire)</strong>
                      <p>
                        Ăn liên tiếp các cặp Pokémon thật nhanh để duy trì chuỗi Combo x2, x3, x4... Khi đạt Combo ≥ 2, toàn bộ bảng cờ sẽ bốc lửa rực rỡ và mỗi nước đi sẽ được cộng thêm rất nhiều điểm thưởng!
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">💡</div>
                    <div>
                      <strong>Trợ Giúp: Gợi Ý & Đổi Vị Trí</strong>
                      <p>
                        • <strong>Nút Gợi Ý 💡 (3 lượt)</strong>: Soi sáng ngay vị trí cặp Pokémon có thể nối được khi bạn bị hoa mắt.
                        <br />• <strong>Nút Đổi Vị Trí 🔀 (10 lượt)</strong>: Đổi ngẫu nhiên các quân còn lại để mở ra các thế cờ dễ ăn hơn.
                      </p>
                    </div>
                  </div>

                  <div className="guidebook-feature-card">
                    <div className="feat-icon">🔄</div>
                    <div>
                      <strong>Cơ Chế Chống Kẹt Bàn</strong>
                      <p>
                        Nếu trên bảng cờ hết sạch các cặp có thể nối, hệ thống sẽ <strong>tự động xáo lại</strong> vị trí các quân hoàn toàn miễn phí mà không làm mất lượt của bạn!
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="guidebook-nav">
              <button
                className="modal-btn-secondary"
                disabled={tutorialChapter <= 1}
                style={{ opacity: tutorialChapter <= 1 ? 0.4 : 1, padding: '8px 14px', fontSize: '12px' }}
                onClick={() => setTutorialChapter(c => Math.max(1, c - 1))}
              >
                ◀ Trang Trước
              </button>

              <span style={{ fontSize: '12px', fontWeight: 800, color: '#facc15' }}>
                Trang {tutorialChapter} / 5
              </span>

              {tutorialChapter < 5 ? (
                <button
                  className="modal-btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => setTutorialChapter(c => Math.min(5, c + 1))}
                >
                  Trang Tiếp ▶
                </button>
              ) : (
                <button
                  className="modal-btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => setShowTutorial(false)}
                >
                  Đã Hiểu, Vào Chơi! ⚡
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 💥 Hiệu Ứng Cut-in Arcade Chiêu Thức Cuối (Căn Giữa Chuẩn Xác, Hiệu Ứng Riêng Biệt Từng Tướng) */}
      {ultimateCutin && ultimateCutin.active && (
        <div className={`ultimate-cutin-overlay char-${ultimateCutin.character.id}`}>
          <div className="ultimate-cutin-backdrop" />
          <div className={`ultimate-cutin-content char-cutin-${ultimateCutin.character.id}`}>
            {/* Hiệu ứng nền đặc trưng từng nhân vật */}
            <div className={`cutin-elemental-burst-bg elem-${ultimateCutin.character.id}`} />

            <div className="ultimate-cutin-header">
              <div className="ultimate-cutin-character">
                <CharacterAvatar
                  characterId={ultimateCutin.character.id}
                  emotion="combo"
                  size="md"
                  useVideo={useVideoAvatar}
                  interactive={false}
                />
              </div>
              <div className="ultimate-cutin-badge">
                <span className="cutin-char-name">{ultimateCutin.character.name.toUpperCase()}</span>
                <span className="cutin-char-badge-tag">{ultimateCutin.character.title}</span>
              </div>
            </div>

            <div className="ultimate-cutin-text">
              <div className="ultimate-cutin-title">
                <span className="cutin-title-icon">{ultimateCutin.character.ultimate.icon}</span>
                <span className="cutin-title-name">{ultimateCutin.character.ultimate.name}</span>
                <span className="cutin-title-icon">{ultimateCutin.character.ultimate.icon}</span>
              </div>
              <div className="ultimate-cutin-quote">
                "{ultimateCutin.character.ultimate.voiceLine}"
              </div>
              <div className="ultimate-cutin-desc">
                {ultimateCutin.character.ultimate.description}
              </div>
            </div>

            {/* Vệt năng lượng tia sáng quét ngang phía dưới */}
            <div className={`cutin-energy-streak streak-${ultimateCutin.character.id}`} />
          </div>
        </div>
      )}

      {/* ⚡ Avatar-to-Icon Projectile & Lightning Beams Overlay */}
      <AvatarSkillBeams beams={avatarBeams} />

      {/* 📡 Modal Tìm Trận Nhanh (Ranked Matchmaking Radar) */}
      {isMatchmaking && (
        <div className="modal-overlay">
          <div className="modal-content radar-match-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
            {!foundMatch ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>📡</span>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#38bdf8', fontWeight: 900 }}>
                      ĐANG QUÉT TÌM ĐỐI THỦ
                    </h3>
                  </div>
                  <span className="rank-pill" style={{ color: userRank.color, borderColor: userRank.color }}>
                    {userRank.icon} {userRank.name} ({rankPoints} RP)
                  </span>
                </div>

                {/* Radar animation box */}
                <div className="radar-screen-box">
                  <div className="radar-sweep-arm" />
                  <div className="radar-ping-blip" style={{ top: '35%', left: '38%' }} />
                  <div className="radar-ping-blip" style={{ top: '68%', left: '64%', animationDelay: '0.9s' }} />
                  <div className="radar-center-icon">
                    <CharacterAvatar characterId={selectedCharacterId} emotion="idle" size="sm" interactive={false} />
                  </div>
                </div>

                <div style={{ margin: '14px 0 6px' }}>
                  <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 700 }}>
                    Hệ thống đang ghép cặp người chơi cùng bậc Rank...
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Thời gian tìm kiếm: <strong style={{ color: '#facc15', fontSize: '14px' }}>{matchWaitSeconds}s</strong> · Ước tính trung bình: <strong style={{ color: '#38bdf8' }}>~{averageWaitSeconds}s</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                    Tự động mở rộng phạm vi rank hoặc ghép Bot tương xứng để luôn có trận nhanh nhất!
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <button
                    className="modal-btn-secondary"
                    onClick={cancelMatchmakingQueue}
                    style={{ width: '100%', padding: '10px 0' }}
                  >
                    HỦY TÌM TRẬN
                  </button>
                </div>
              </>
            ) : (
              /* VS Faceoff screen */
              <div className="vs-faceoff-container">
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#facc15', marginBottom: '16px', letterSpacing: '0.04em' }}>
                  ⚔️ ĐÃ TÌM THẤY TRẬN ĐẤU! ⚔️
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                  {/* Player 1 */}
                  <div style={{ textAlign: 'center' }}>
                    <CharacterAvatar characterId={selectedCharacterId} emotion="combo" size="md" interactive={false} />
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '13px', marginTop: '6px' }}>
                      {playerName}
                    </div>
                    <div style={{ fontSize: '11px', color: userRank.color, fontWeight: 700 }}>
                      {userRank.icon} {userRank.name} · {rankPoints.toLocaleString()} RP
                    </div>
                  </div>

                  {/* VS Badge */}
                  <div className="vs-badge-animated">
                    VS
                  </div>

                  {/* Rival */}
                  <div style={{ textAlign: 'center' }}>
                    <CharacterAvatar characterId={foundMatch.rivalCharId} emotion="combo" size="md" interactive={false} />
                    <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '13px', marginTop: '6px' }}>
                      {foundMatch.rivalName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#fb923c', fontWeight: 700 }}>
                      {foundMatch.rivalRankIcon} {foundMatch.rivalRank} · {(foundMatch.rivalRankPoints || 500).toLocaleString()} RP
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '18px', fontSize: '12px', color: '#38bdf8', fontWeight: 700 }}>
                  ⚡ ĐANG CHUYỂN VÀO BÀN ĐẤU NGAY BÂY GIỜ...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  /* ══════════════════════════════════════════════
     SCREEN 2: DEDICATED CHARACTER SELECTION PAGE (TRANG CHỌN TƯỚNG RIÊNG)
     ══════════════════════════════════════════════ */
  const renderCharacterSelectPage = () => {
    const previewChar = getCharacterById(previewCharId)
    const isEquipped = selectedCharacterId === previewChar.id
    const isLocked = !user && previewChar.id !== 'satoshi'

    return (
      <main className="char-select-page-wrapper">
        {/* Top bar */}
        <div className="char-select-top-bar">
          <button
            className="btn-back-menu"
            onClick={() => {
              navigateToLobbyScreen('menu', 'Đang quay lại Sảnh chính...')
            }}
          >
            <ArrowLeft size={16} /> Quay Lại Sảnh
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👾</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#facc15', letterSpacing: '0.04em' }}>
              CHỌN NHÂN VẬT & TUYỆT KỸ
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`btn-bgm-toggle ${!useVideoAvatar ? 'muted' : ''}`}
              onClick={() => setUseVideoAvatar(!useVideoAvatar)}
              title="Bật / Tắt Avatar Video Nhân Vật Động"
            >
              <span>Avatar: <strong>{useVideoAvatar ? 'VIDEO 🎬' : 'PIXEL 👾'}</strong></span>
            </button>
            <button
              className={`btn-bgm-toggle ${!soundEnabled ? 'muted' : ''}`}
              onClick={() => {
                setSoundEnabled(!soundEnabled)
                playSound('select', !soundEnabled)
              }}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </div>
        </div>

        {/* 2-Column Split Screen */}
        <div className="char-select-content-grid">
          {/* CỘT TRÁI: CẮT PHÔNG HIỂN THỊ GÓC TRÁI MÀN HÌNH SIÊU TO */}
          <div className="char-showcase-left-panel">
            <div className="char-cutout-pedestal">
              <div
                className="char-cutout-glow-ring"
                style={{ background: previewChar.glowColor }}
              />
              <CharacterAvatar
                characterId={previewChar.id}
                emotion={previewEmotion}
                size="showcase"
                cutout={true}
                useVideo={useVideoAvatar}
              />
            </div>

            {/* Phản ứng cảm xúc tương tác */}
            <div className="char-emotion-triggers">
              <button
                className={`char-emotion-btn ${previewEmotion === 'happy' ? 'active' : ''}`}
                onClick={() => {
                  setPreviewEmotion('happy')
                  playSound('match', soundEnabled)
                }}
                title="Xem biểu cảm Vui vẻ khi ăn điểm"
              >
                💖 Vui / Điểm
              </button>
              <button
                className={`char-emotion-btn ${previewEmotion === 'combo' ? 'active' : ''}`}
                onClick={() => {
                  setPreviewEmotion('combo')
                  playSound('thunder', soundEnabled)
                }}
                title="Xem biểu cảm Combo lửa"
              >
                🔥 Combo
              </button>
              <button
                className={`char-emotion-btn ${previewEmotion === 'win' ? 'active' : ''}`}
                onClick={() => {
                  setPreviewEmotion('win')
                  playSound('win', soundEnabled)
                }}
                title="Xem biểu cảm Ăn mừng chiến thắng"
              >
                👑 Thắng
              </button>
              <button
                className={`char-emotion-btn ${previewEmotion === 'sad' ? 'active' : ''}`}
                onClick={() => {
                  setPreviewEmotion('sad')
                  playSound('wrong', soundEnabled)
                }}
                title="Xem biểu cảm Buồn bã"
              >
                🌧️ Thua
              </button>
              <button
                className={`char-emotion-btn ${previewEmotion === 'idle' ? 'active' : ''}`}
                onClick={() => setPreviewEmotion('idle')}
                title="Trạng thái chuẩn bị"
              >
                💤 Nghỉ
              </button>
            </div>

            {/* Thông tin nhân vật */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: previewChar.accentColor }}>
                {previewChar.name}
              </h2>
              <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700, marginTop: '2px' }}>
                {previewChar.title}
              </div>
            </div>

            {/* Khẩu hiệu lồng tiếng */}
            <div className="char-voice-line-badge">
              "{previewChar.ultimate.voiceLine}"
            </div>

            {/* Thẻ Tuyệt Kỹ */}
            <div
              className="char-ult-showcase-card"
              style={{
                background: `${previewChar.ultimate.bannerColor}18`,
                borderColor: `${previewChar.ultimate.bannerColor}60`,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '20px' }}>{previewChar.ultimate.icon}</span>
                  <strong style={{ fontSize: '15px', color: '#ffffff' }}>{previewChar.ultimate.name}</strong>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#facc15' }}>
                  Tiêu hao: {previewChar.ultimate.energyCost}% NL
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#e2e8f0', lineHeight: 1.45 }}>
                {previewChar.ultimate.description}
              </p>
            </div>

            {/* Nút Xác Nhận Chọn Tướng */}
            {isLocked ? (
              <button
                className="btn-confirm-character"
                style={{ background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', color: '#cbd5e1', cursor: 'pointer' }}
                onClick={() => {
                  setAuthMode('login')
                  setShowAuthModal(true)
                }}
              >
                <Lock size={16} /> ĐĂNG NHẬP ĐỂ MỞ KHÓA NHÂN VẬT NÀY
              </button>
            ) : isEquipped ? (
              <button
                className="btn-confirm-character"
                style={{ background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', color: '#ffffff' }}
                onClick={() => {
                  navigateToLobbyScreen('menu', 'Đang quay lại Sảnh chính...')
                }}
              >
                <Check size={18} /> ĐANG SỬ DỤNG · QUAY LẠI SẢNH
              </button>
            ) : (
              <button
                className="btn-confirm-character"
                onClick={() => {
                  handleSelectCharacter(previewChar.id)
                  playSound('win', soundEnabled)
                  setNotice(`ĐÃ CHỌN NHÂN VẬT: ${previewChar.name.toUpperCase()}!`)
                  navigateToLobbyScreen('menu', 'Đang lưu nhân vật và về Sảnh...')
                }}
              >
                <Check size={18} /> XÁC NHẬN CHỌN {previewChar.name.toUpperCase()}
              </button>
            )}
          </div>

          {/* CỘT PHẢI: DANH SÁCH 3 NHÂN VẬT */}
          <div className="char-roster-right-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#f8fafc' }}>
                DANH SÁCH ANH HÙNG (3 NHÂN VẬT)
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                {user ? '✓ Đã mở khóa Satoshi, Madara, Himeko' : '⚡ Khách chỉ được dùng Satoshi · Đăng nhập để mở khóa'}
              </div>
            </div>

            <div className="char-roster-cards-grid">
              {CHARACTERS.map(c => {
                const isCurPreview = previewCharId === c.id
                const isCurSelected = selectedCharacterId === c.id
                const isCardLocked = !user && c.id !== 'satoshi'

                return (
                  <div
                    key={c.id}
                    className={`char-roster-card ${isCurPreview ? 'active' : ''}`}
                    onClick={() => {
                      setPreviewCharId(c.id)
                      setPreviewEmotion('happy')
                      playSound('select', soundEnabled)
                    }}
                    style={{
                      borderColor: isCurPreview ? c.accentColor : undefined,
                    }}
                  >
                    {isCurSelected && (
                      <div className="char-card-active-check" style={{ background: '#22c55e' }} title="Đang sử dụng">
                        ✓
                      </div>
                    )}
                    {isCardLocked && (
                      <div className="char-card-lock-badge">
                        <Lock size={10} /> Khóa
                      </div>
                    )}

                    <div className="char-roster-card-avatar">
                      <CharacterAvatar
                        characterId={c.id}
                        emotion={isCurPreview ? 'happy' : 'idle'}
                        size="md"
                        interactive={false}
                        useVideo={true}
                      />
                    </div>

                    <strong style={{ fontSize: '15px', color: isCurPreview ? '#facc15' : '#ffffff', marginBottom: '4px' }}>
                      {c.name}
                    </strong>

                    <span style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                      {c.title}
                    </span>

                    <div
                      className="char-card-ult-badge"
                      style={{
                        background: `${c.ultimate.bannerColor}28`,
                        borderColor: `${c.ultimate.bannerColor}77`,
                        width: '100%',
                      }}
                    >
                      <span>{c.ultimate.icon}</span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#ffffff' }}>{c.ultimate.name}</span>
                      <span style={{ fontSize: '10px', color: '#fde047', fontWeight: 800 }}>({c.ultimate.energyCost}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {renderSharedModals()}
      </main>
    )
  }

  /* ══════════════════════════════════════════════
     SCREEN 3: DEDICATED RANKED ARENA PAGE (TRANG ĐẤU XẾP HẠNG RIÊNG)
     ══════════════════════════════════════════════ */
  const renderRankedArenaPage = () => {
    return (
      <main className="ranked-arena-page-wrapper">
        {/* Top bar */}
        <div className="ranked-arena-top-bar">
          <button
            className="btn-back-menu"
            onClick={() => {
              if (isMatchmaking) cancelMatchmakingQueue()
              navigateToLobbyScreen('menu', 'Đang quay lại Sảnh chính...')
            }}
          >
            <ArrowLeft size={16} /> Quay Lại Sảnh
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚔️</span>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#facc15', letterSpacing: '0.04em' }}>
              ĐẤU TRƯỜNG XẾP HẠNG (RANKED ARENA)
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user ? (
              <span className="rank-pill" style={{ color: userRank.color, borderColor: userRank.color, padding: '4px 12px', fontSize: '12.5px', fontWeight: 900 }}>
                {userRank.icon} {userRank.name} ({rankPoints.toLocaleString()} RP)
              </span>
            ) : (
              <span className="rank-pill" style={{ color: '#cbd5e1', borderColor: '#64748b' }}>
                🔒 Khách chưa có Rank
              </span>
            )}
          </div>
        </div>

        {/* Hero Rank Banner */}
        <div className="ranked-hero-banner">
          <div className="ranked-user-emblem-wrap">
            <div className="ranked-emblem-badge" style={{ borderColor: userRank.color }}>
              {userRank.icon}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                BẬC XẾP HẠNG HIỆN TẠI
              </div>
              <h1 style={{ margin: '2px 0 6px', fontSize: '28px', fontWeight: 900, color: userRank.color }}>
                {userRank.name}
              </h1>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: '#facc15', fontWeight: 800 }}>
                  ⚡ {rankPoints.toLocaleString()} Điểm Rank (RP)
                </span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Tỉ lệ thắng: <strong style={{ color: '#4ade80' }}>68.5%</strong>
                </span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Chiến thần: <strong style={{ color: '#38bdf8' }}>{playerName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Character Ready Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(0,0,0,0.3)', padding: '10px 18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <CharacterAvatar characterId={selectedCharacterId} emotion="idle" size="md" useVideo={useVideoAvatar} />
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800 }}>NHÂN VẬT XUẤT TRẬN</div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#facc15' }}>
                {getCharacterById(selectedCharacterId).name}
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11.5px', fontWeight: 800, padding: 0, cursor: 'pointer', marginTop: '2px' }}
                onClick={() => {
                  setPreviewCharId(selectedCharacterId)
                  navigateToLobbyScreen('character-select', 'Đang mở trang Đổi Nhân Vật...')
                }}
              >
                Đổi nhân vật ➔
              </button>
            </div>
          </div>
        </div>

        {/* Center Matchmaking Console */}
        <div className="ranked-matchmaking-console">
          {!user ? (
            <div style={{ padding: '24px 0' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
              <h3 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 900, margin: '0 0 8px' }}>
                ĐĂNG NHẬP ĐỂ THAM GIA ĐẤU RANK
              </h3>
              <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px', fontSize: '14px', lineHeight: 1.5 }}>
                Chế độ Đấu Xếp Hạng dành riêng cho các thành viên có tài khoản để lưu điểm Elo/RP, thăng hạng mùa giải và tranh đoạt vị trí trên Bảng Vàng!
              </p>
              <button
                className="btn-start-ranked-queue"
                onClick={() => {
                  setAuthMode('login')
                  setShowAuthModal(true)
                }}
              >
                <LogIn size={20} /> ĐĂNG NHẬP / ĐĂNG KÝ NGAY
              </button>
            </div>
          ) : !isMatchmaking ? (
            <div style={{ padding: '20px 0' }}>
              <div style={{ fontSize: '14px', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '6px' }}>
                📡 HỆ THỐNG GHÉP ĐỐI THỦ THỜI GIAN THỰC
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', margin: '0 0 16px' }}>
                SẴN SÀNG THI ĐẤU ĐỐI KHÁNG ĐỈNH CAO?
              </h2>
              <p style={{ color: '#94a3b8', maxWidth: '520px', margin: '0 auto 24px', fontSize: '13.5px', lineHeight: 1.5 }}>
                Hệ thống tự động tìm kiếm người chơi cùng bậc Rank hoặc AI Bot tương xứng. Tốc độ vào trận tức thì, độ trễ 0ms!
              </p>
              <button
                className="btn-start-ranked-queue"
                onClick={startMatchmaking}
              >
                <Sparkles size={22} /> BẮT ĐẦU TÌM TRẬN NGAY
              </button>
            </div>
          ) : !foundMatch ? (
            /* Radar scanning */
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '15px', color: '#38bdf8', fontWeight: 900 }}>
                  📡 ĐANG QUÉT TÌM ĐỐI THỦ CÙNG BẬC RANK...
                </span>
                <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 800 }}>
                  {matchWaitSeconds}s
                </span>
              </div>

              <div className="radar-screen-box">
                <div className="radar-sweep-arm" />
                <div className="radar-ping-blip" style={{ top: '35%', left: '38%' }} />
                <div className="radar-ping-blip" style={{ top: '68%', left: '64%', animationDelay: '0.9s' }} />
                <div className="radar-center-icon">
                  <CharacterAvatar characterId={selectedCharacterId} emotion="combo" size="sm" interactive={false} useVideo={useVideoAvatar} />
                </div>
              </div>

              <div style={{ margin: '16px 0 20px', fontSize: '13px', color: '#cbd5e1' }}>
                Thời gian tìm kiếm: <strong style={{ color: '#facc15' }}>{matchWaitSeconds}s</strong> · Ước tính: <strong style={{ color: '#38bdf8' }}>~{averageWaitSeconds}s</strong>
              </div>

              <button
                className="modal-btn-secondary"
                onClick={cancelMatchmakingQueue}
                style={{ padding: '10px 32px' }}
              >
                HỦY TÌM KIẾM
              </button>
            </div>
          ) : (
            /* Found match VS */
            <div className="vs-faceoff-container" style={{ maxWidth: '520px', margin: '0 auto' }}>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#facc15', marginBottom: '18px' }}>
                ⚔️ ĐÃ TÌM THẤY TRẬN ĐẤU XẾP HẠNG! ⚔️
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                  <CharacterAvatar characterId={selectedCharacterId} emotion="combo" size="md" interactive={false} useVideo={useVideoAvatar} />
                  <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '14px', marginTop: '6px' }}>{playerName}</div>
                  <div style={{ fontSize: '11.5px', color: userRank.color, fontWeight: 800 }}>{userRank.icon} {userRank.name} · {rankPoints} RP</div>
                </div>
                <div className="vs-badge-animated">VS</div>
                <div style={{ textAlign: 'center' }}>
                  <CharacterAvatar characterId={foundMatch.rivalCharId} emotion="combo" size="md" interactive={false} useVideo={useVideoAvatar} />
                  <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '14px', marginTop: '6px' }}>{foundMatch.rivalName}</div>
                  <div style={{ fontSize: '11.5px', color: '#fb923c', fontWeight: 800 }}>{foundMatch.rivalRankIcon} {foundMatch.rivalRank} · {(foundMatch.rivalRankPoints || 500)} RP</div>
                </div>
              </div>
              <div style={{ marginTop: '20px', fontSize: '13px', color: '#38bdf8', fontWeight: 800 }}>
                ⚡ ĐANG KẾT NỐI VÀO BÀN THI ĐẤU...
              </div>
            </div>
          )}
        </div>

        {/* Integrated Ranked Leaderboard Table */}
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#facc15" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#f8fafc' }}>
                BẢNG XẾP HẠNG CAO THỦ MÙA GIẢI
              </h3>
            </div>
            <button
              className="btn-ranked-bxh"
              onClick={() => {
                setShowLeaderboard(true)
                setLeaderboardTab('rankings')
                fetchRankings()
              }}
            >
              Xem Chi Tiết Đầy Đủ ➔
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="leaderboard-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>HẠNG</th>
                  <th>AVATAR</th>
                  <th>NGƯỜI CHƠI</th>
                  <th>BẬC RANK</th>
                  <th>ĐIỂM RP</th>
                  <th>TỈ LỆ THẮNG</th>
                </tr>
              </thead>
              <tbody>
                {(rankedPlayers.length > 0 ? rankedPlayers.slice(0, 10) : [
                  { rank: 1, displayName: 'DragonMaster', tierName: 'Thách Đấu', tierIcon: '🔥', color: '#ec4899', rankPoints: 3450, rankWins: 86, rankLosses: 11, characterId: 'satoshi' },
                  { rank: 2, displayName: 'PikaPro_VN', tierName: 'Đại Cao Thủ', tierIcon: '⚡', color: '#f43f5e', rankPoints: 2880, rankWins: 72, rankLosses: 15, characterId: 'madara' },
                  { rank: 3, displayName: 'ShadowStrike', tierName: 'Cao Thủ', tierIcon: '👑', color: '#a855f7', rankPoints: 2420, rankWins: 58, rankLosses: 16, characterId: 'himeko' },
                  { rank: 4, displayName: 'KasumiWave', tierName: 'Kim Cương', tierIcon: '💎', color: '#38bdf8', rankPoints: 1890, rankWins: 45, rankLosses: 19, characterId: 'kasumi' },
                  { rank: 5, displayName: 'ElectroVolt', tierName: 'Bạch Kim', tierIcon: '💠', color: '#2dd4bf', rankPoints: 1250, rankWins: 35, rankLosses: 18, characterId: 'paladin' },
                ]).map((item: any, idx: number) => {
                  const wins = item.rankWins || 0
                  const losses = item.rankLosses || 0
                  const total = wins + losses
                  const winRate = total > 0 ? `${Math.round((wins / total) * 100)}%` : '65%'
                  const tierColor = item.color || '#facc15'
                  const tierIcon = item.tierIcon || item.rankTier?.icon || '⭐'
                  const tierName = item.tierName || item.rankTier?.name || 'Vàng'
                  const charId = item.characterId || item.charId || 'satoshi'

                  return (
                    <tr key={idx}>
                      <td>
                        <span className={`rank-number rank-${item.rank || idx + 1}`}>
                          {item.rank || idx + 1}
                        </span>
                      </td>
                      <td className="lb-avatar-cell">
                        <div className="lb-avatar-rect">
                          <CharacterAvatar
                            characterId={charId}
                            emotion="idle"
                            size="sm"
                            shape="rect"
                            interactive={false}
                          />
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#f8fafc' }}>{item.displayName || item.username}</strong>
                      </td>
                      <td>
                        <span
                          className="rank-tier-badge-pill"
                          style={{
                            color: tierColor,
                            borderColor: tierColor,
                            background: 'rgba(15, 23, 42, 0.85)',
                          }}
                        >
                          <span style={{ fontSize: '13px' }}>{tierIcon}</span>
                          <span>{tierName}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#38bdf8' }}>{item.rankPoints?.toLocaleString()} RP</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '13px' }}>{winRate}</span>
                          <span style={{ color: '#94a3b8', fontSize: '10.5px' }}>{wins}T - {losses}B</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {renderSharedModals()}
      </main>
    )
  }

  /* ══════════════════════════════════════════════
     SCREEN: CAMPAIGN MODE (CHIẾN DỊCH 5 CHƯƠNG)
     ══════════════════════════════════════════════ */
  const renderCampaignSelectPage = () => {
    const curChapter = getChapterById(campaignChapterId) || CAMPAIGN_CHAPTERS[0]

    return (
      <main className={`pikachu-app ui-scale-${uiScale}`} style={{ position: 'relative', overflowX: 'hidden' }}>
        {/* Top Navigation Bar */}
        <header className="top-nav-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-back-menu"
              onClick={() => navigateToLobbyScreen('menu', 'Đang quay lại Menu chính...')}
              title="Quay lại Menu chính"
            >
              <ArrowLeft size={14} />
              <span>Menu</span>
            </button>
            <div className="game-mode-tag" style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)', color: '#ffffff', fontWeight: 900 }}>
              👑 CHIẾN DỊCH 5 CHƯƠNG · TRẢM BOSS
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="settings-icon-btn"
              onClick={cycleUiScale}
              title={`Kích thước hiển thị: ${uiScale.toUpperCase()}`}
            >
              <Maximize2 size={13} color="#38bdf8" />
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#38bdf8' }}>{uiScale.toUpperCase()}</span>
            </button>
            <div className="coins-badge">
              <Coins size={14} color="#facc15" />
              <span>{coins.toLocaleString()} Xu</span>
            </div>
          </div>
        </header>

        <div className="campaign-container" style={{ padding: '8px 12px 24px' }}>
          {/* Header Card */}
          <div className="campaign-header-card">
            <div className="campaign-title-group">
              <span className="campaign-title-icon">⚔️</span>
              <div>
                <h1 className="campaign-main-title" style={{ margin: 0 }}>
                  CHIẾN DỊCH HUYỀN THOẠI · ĐẠI CHIẾN 15 ĐẠI BOSS
                </h1>
                <div className="campaign-sub-title">
                  5 Chương Cốt Truyện Bi Tráng · 5 Hiệu Ứng Môi Trường Thị Giác Riêng Biệt
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(250,204,21,0.3)',
                borderRadius: '12px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '14.5px', color: '#cbd5e1', fontWeight: 700 }}>Tiến độ:</span>
                <strong style={{ color: '#facc15', fontSize: '16px', fontWeight: 950 }}>
                  {Object.keys(campaignProgress).length}/15 Ải
                </strong>
              </div>
            </div>
          </div>

          {/* CHỌN CHẾ ĐỘ BÀN ĐẤU CHIẾN DỊCH (CHUNG BÀN HOẶC KHÁC BÀN) */}
          <div className="campaign-board-mode-banner" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(30, 41, 59, 0.85) 100%)',
            borderRadius: '18px',
            border: '1.5px solid rgba(250, 204, 21, 0.4)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            margin: '12px 0 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>⚔️</span>
              <div>
                <div style={{ fontSize: '15.5px', fontWeight: 950, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>HÌNH THỨC ĐẤU BOSS CHIẾN DỊCH:</span>
                  <span style={{
                    fontSize: '13px',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: boardMode === 'shared' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(250, 204, 21, 0.25)',
                    color: boardMode === 'shared' ? '#38bdf8' : '#facc15',
                    border: `1.5px solid ${boardMode === 'shared' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(250, 204, 21, 0.5)'}`,
                    fontWeight: 900,
                  }}>
                    {boardMode === 'shared' ? '👥 CHUNG 1 BÀN (TRANH CƯỚP CỜ)' : '⚡ KHÁC BÀN (2 BÀN RIÊNG BIỆT)'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.5, fontWeight: 600 }}>
                  {boardMode === 'shared'
                    ? 'Bạn và Boss cùng dọn trên 1 ma trận duy nhất ở giữa! Ai nhanh tay hơn sẽ cướp cặp cờ trước đối thủ.'
                    : 'Bạn và Boss đua trên 2 ma trận độc lập ở 2 bên! Ai dọn sạch bảng trước sẽ giành chiến thắng quyết định.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={`lobby-option-btn ${boardMode === 'shared' ? 'active' : ''}`}
                onClick={() => setBoardMode('shared')}
                style={{
                  padding: '9px 18px',
                  fontSize: '14.5px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '12px',
                }}
              >
                <span>👥 Chung 1 Bàn</span>
              </button>
              <button
                className={`lobby-option-btn ${boardMode === 'separate' ? 'active' : ''}`}
                onClick={() => setBoardMode('separate')}
                style={{
                  padding: '9px 18px',
                  fontSize: '14.5px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '12px',
                }}
              >
                <span>⚡ Khác Bàn (2 Bàn)</span>
              </button>
            </div>
          </div>

          {/* 5 Chapter Navigation Tabs */}
          <div className="campaign-tabs-row">
            {CAMPAIGN_CHAPTERS.map(ch => {
              const isActive = ch.id === campaignChapterId
              const clearedCount = ch.stages.filter(st => campaignProgress[st.stageId]).length
              return (
                <button
                  key={ch.id}
                  className={`campaign-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => triggerLoadingTransition(`Đang tải ${ch.title}...`, () => setCampaignChapterId(ch.id), 350)}
                  style={{
                    ['--tab-accent' as any]: ch.accentColor,
                    ['--tab-glow' as any]: ch.glowColor,
                  }}
                >
                  <span className="campaign-tab-badge">{ch.badge}</span>
                  <div className="campaign-tab-text">
                    <span className="campaign-tab-name">{ch.title.split(':')[0]}</span>
                    <span className="campaign-tab-desc" style={{ color: isActive ? ch.accentColor : '#cbd5e1' }}>
                      {clearedCount}/3 Ải Đã Chinh Phục
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Chapter Overview Box */}
          <div
            className="chapter-banner-box"
            style={{
              background: curChapter.bgGradient,
              borderColor: curChapter.accentColor,
              boxShadow: `0 8px 30px ${curChapter.glowColor}`,
            }}
          >
            <div className="chapter-banner-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{curChapter.badge}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 950, color: '#ffffff' }}>
                    {curChapter.title}: {curChapter.subtitle}
                  </h2>
                  <div className="chapter-location-tag" style={{ display: 'inline-block', marginTop: '4px' }}>
                    📍 {curChapter.locationName}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(0,0,0,0.55)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '14.5px',
                color: '#facc15',
                fontWeight: 900,
              }}>
                🎁 Thưởng Chương: +{curChapter.completionRewardCoins} Xu & {curChapter.completionRewardTitle}
              </div>
            </div>

            <p className="chapter-story-desc" style={{ margin: '8px 0 0' }}>
              {curChapter.storySummary}
            </p>
          </div>

          {/* 3 Stage Boss Cards Grid */}
          <div className="campaign-stages-grid">
            {curChapter.stages.map((stage) => {
              const isCleared = !!campaignProgress[stage.stageId]
              const isUnlocked = stage.stageId === 1 || !!campaignProgress[stage.stageId - 1]

              return (
                <div
                  key={stage.stageId}
                  className={`boss-stage-card ${!isUnlocked ? 'is-locked' : ''}`}
                >
                  <div className="boss-card-header">
                    <span className="boss-stage-badge">ẢI {stage.stageId}</span>
                    {isCleared ? (
                      <span className="boss-status-badge cleared">⭐ ĐÃ CHINH PHỤC</span>
                    ) : isUnlocked ? (
                      <span className="boss-status-badge ready">⚔️ SẴN SÀNG</span>
                    ) : (
                      <span className="boss-status-badge" style={{ background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}>
                        🔒 CẦN QUA ẢI {stage.stageId - 1}
                      </span>
                    )}
                  </div>

                  <div className="boss-profile-row">
                    <div className="boss-grand-avatar-frame" style={{ '--chapter-glow': curChapter.accentColor } as React.CSSProperties}>
                      <div className="boss-grand-aura" />
                      <img
                        src={getSpriteUrl(stage.bossPokemonId, 'artwork')}
                        alt={stage.bossName}
                        className="boss-grand-artwork"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                          }
                        }}
                      />
                      <div className="boss-card-avatar-fallback" style={{ display: 'none' }}>{stage.bossAvatar}</div>
                    </div>
                    <div className="boss-profile-info">
                      <div className="boss-power-tag">
                        <span className="boss-power-icon">⚡</span>
                        <span className="boss-power-text">LỰC CHIẾN: {stage.powerLevel.toLocaleString('vi-VN')}</span>
                      </div>
                      <div className="boss-profile-name" title={stage.bossName}>{stage.bossName}</div>
                      <div className="boss-profile-title">{stage.title}</div>
                      <div style={{ fontSize: '13.5px', color: '#cbd5e1', marginTop: '4px', fontWeight: 700 }}>
                        ⏱️ Giới hạn: <strong style={{ color: '#ffffff' }}>{stage.targetTime}s</strong> · Tốc độ đánh: <strong style={{ color: '#facc15' }}>{(stage.moveDelayMin / 1000).toFixed(1)}s</strong>
                      </div>
                    </div>
                  </div>

                  <div className="boss-quote-box">
                    "{stage.quote}"
                  </div>

                  <div className="boss-mechanic-box">
                    <span style={{ fontSize: '17px' }}>{stage.bossSkillIcon}</span>
                    <div>
                      <strong>{stage.bossSkillName}:</strong> {stage.bossSkillDesc}
                    </div>
                  </div>

                  <div className="boss-card-footer">
                    <div className="boss-reward-pill">
                      <Coins size={16} color="#facc15" />
                      <span>+{stage.rewardCoins} Xu</span>
                    </div>

                    <button
                      className="boss-battle-btn"
                      disabled={!isUnlocked}
                      onClick={() => setStoryModalStage(stage)}
                    >
                      <span>CỐT TRUYỆN & VÀO TRẬN</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Story Dialogue Modal Before Stage Begins */}
        {storyModalStage && (
          <div className="story-dialogue-modal-overlay" onClick={() => setStoryModalStage(null)}>
            <div className="story-dialogue-modal" onClick={e => e.stopPropagation()}>
              <div className="story-modal-header">
                <div className="story-modal-grand-avatar-box" style={{ '--chapter-glow': curChapter.accentColor } as React.CSSProperties}>
                  <div className="story-boss-aura-ring" />
                  <img
                    src={getSpriteUrl(storyModalStage.bossPokemonId, 'artwork')}
                    alt={storyModalStage.bossName}
                    className="story-modal-grand-artwork"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none'
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'
                      }
                    }}
                  />
                  <div className="story-modal-avatar-fallback" style={{ display: 'none' }}>{storyModalStage.bossAvatar}</div>
                </div>
                <div className="story-modal-title-group">
                  <span className="story-modal-stage-num">ẢI {storyModalStage.stageId} · {storyModalStage.name}</span>
                  <div className="story-modal-boss-name">{storyModalStage.bossName}</div>
                  <div className="story-modal-boss-title">{storyModalStage.title}</div>
                  <div className="story-boss-power-pill">
                    🔥 LỰC CHIẾN HUYỀN THOẠI: {storyModalStage.powerLevel.toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="story-modal-body">
                <div className="story-modal-intro">
                  📖 {storyModalStage.storylineIntro}
                </div>

                <div className="story-modal-dialogue">
                  💬 <strong>{storyModalStage.bossName}:</strong> "{storyModalStage.dialoguePreMatch}"
                </div>

                <div className="story-modal-skill-warning">
                  <span style={{ fontSize: '22px' }}>{storyModalStage.bossSkillIcon}</span>
                  <div>
                    <strong style={{ color: '#ffffff', fontSize: '16px' }}>Tuyệt Kỹ Boss: {storyModalStage.bossSkillName}</strong>
                    <div style={{ color: '#f1f5f9', fontSize: '14px', marginTop: '3px', lineHeight: 1.45, fontWeight: 600 }}>
                      {storyModalStage.bossSkillDesc} (Tung chiêu mỗi {storyModalStage.bossSkillInterval}s)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '15px', color: '#cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>⏱️ Thời gian: <strong style={{ color: '#ffffff', fontSize: '16px' }}>{storyModalStage.targetTime}s</strong></span>
                  <span>🎁 Phần thưởng: <strong style={{ color: '#facc15', fontSize: '16px' }}>+{storyModalStage.rewardCoins} Xu</strong></span>
                </div>

                {/* Chọn Chế Độ Đấu Boss: Chung Bàn hoặc Khác Bàn */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1.5px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  margin: '10px 0 4px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14.5px', fontWeight: 950, color: '#f8fafc' }}>
                      🎮 HÌNH THỨC CHIẾN ĐẤU:
                    </span>
                    <span style={{ fontSize: '13px', color: '#facc15', fontWeight: 900 }}>
                      {boardMode === 'shared' ? '👥 Chung 1 Bàn' : '⚡ 2 Bàn Riêng'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      className={`lobby-option-btn ${boardMode === 'shared' ? 'active' : ''}`}
                      onClick={() => setBoardMode('shared')}
                      style={{ padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center' }}
                    >
                      <strong style={{ fontSize: '14.5px', fontWeight: 950 }}>👥 Chung 1 Bàn</strong>
                      <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>Tranh cướp cờ trực tiếp</span>
                    </button>
                    <button
                      type="button"
                      className={`lobby-option-btn ${boardMode === 'separate' ? 'active' : ''}`}
                      onClick={() => setBoardMode('separate')}
                      style={{ padding: '10px 12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center' }}
                    >
                      <strong style={{ fontSize: '14.5px', fontWeight: 950 }}>⚡ Khác Bàn (2 Bàn)</strong>
                      <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>Đua tốc độ dọn bàn riêng</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="story-modal-actions">
                <button
                  className="action-btn"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.2)', fontSize: '15px', padding: '10px 20px', fontWeight: 800 }}
                  onClick={() => setStoryModalStage(null)}
                >
                  Đóng
                </button>
                <button
                  className="boss-battle-btn"
                  style={{ padding: '12px 24px', fontSize: '15.5px', fontWeight: 950 }}
                  onClick={() => startCampaignMatch(storyModalStage)}
                >
                  <span>⚔️ VÀO TRẬN KHIÊU CHIẾN</span>
                  <Play size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {renderSharedModals()}
      </main>
    )
  }

  /* ══════════════════════════════════════════════
     SCREEN 1: LOBBY / MENU (Giao Diện Ban Đầu)
     ══════════════════════════════════════════════ */
  if (!inGame) {
    if (activeLobbyScreen === 'character-select') {
      return renderCharacterSelectPage()
    }

    if (activeLobbyScreen === 'ranked') {
      return renderRankedArenaPage()
    }

    if (activeLobbyScreen === 'campaign') {
      return renderCampaignSelectPage()
    }

    return (
      <main className={`pikachu-app ui-scale-${uiScale}`} style={{ position: 'relative', overflowX: 'hidden' }}>
        {/* Portrait Orientation Suggestion Banner - Mobile Only */}
        {showPortraitBanner && (
          <div className="portrait-orientation-banner">
            <div className="portrait-banner-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>📱↻</span>
                <span>Gợi ý: <strong>Xoay ngang</strong> điện thoại để trải nghiệm tốt nhất!</span>
              </div>
              <button
                className="btn-dismiss-banner"
                onClick={() => setShowPortraitBanner(false)}
              >
                Đã hiểu ✕
              </button>
            </div>
          </div>
        )}
        {/* Nhúng Video YouTube vào Background của Menu */}
        <div className="lobby-video-bg">
          <iframe
            className="lobby-video-iframe"
            src="https://www.youtube.com/embed/ARi_JSTszok?autoplay=1&mute=1&loop=1&playlist=ARi_JSTszok&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
          <div className="lobby-video-overlay" />
        </div>

        {/* Hiệu ứng các icon trang trí chuyển động bay lơ lửng cute */}
        <div className="cute-decor-container">
          <span className="cute-floater" style={{ top: '12%', left: '8%', animationDelay: '0s' }}>✨</span>
          <span className="cute-floater" style={{ top: '20%', right: '9%', animationDelay: '1.4s' }}>⭐</span>
          <span className="cute-floater" style={{ bottom: '18%', left: '6%', animationDelay: '2.8s' }}>🐾</span>
          <span className="cute-floater" style={{ bottom: '12%', right: '7%', animationDelay: '4.2s' }}>⚡</span>
        </div>

        <div className="lobby-container">
          <div className="lobby-header">
            {/* Tiêu Đề Bouncing Wave Đáng Yêu */}
            <h1 className="lobby-title cute-bouncy-title" aria-label="PIKACHU CLASSIC">
              <span className="cute-sparkle left">⚡</span>
              {"PIKACHU CLASSIC".split("").map((char, index) => (
                <span
                  key={index}
                  className={`cute-letter ${char === ' ' ? 'space' : ''}`}
                  style={{ animationDelay: `${index * 0.09}s` }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              ))}
              <span className="cute-sparkle right">✨</span>
            </h1>

            <span className="lobby-subtitle cute-wobble-sub">
              <span className="cute-dot">🐾</span> LINK & MATCH · ĐỐI KHÁNG PVP <span className="cute-dot">🎮</span>
            </span>

            {/* Điều Khiển Âm Thanh & Nhạc Nền 8-Bit */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className={`btn-bgm-toggle ${!bgmEnabled ? 'muted' : ''}`}
                onClick={toggleBgm}
                title="Bật / Tắt nhạc nền 8-bit retro"
              >
                <Music size={14} className={bgmEnabled && audioReady ? 'animate-pulse' : ''} />
                <span>Nhạc 8-bit: <strong>{bgmEnabled ? (audioReady ? 'BẬT 🎵' : 'BẬT (Chạm để nghe)') : 'TẮT'}</strong></span>
              </button>
              <button
                className={`btn-bgm-toggle ${!soundEnabled ? 'muted' : ''}`}
                onClick={() => {
                  setSoundEnabled(!soundEnabled)
                  playSound('select', !soundEnabled)
                }}
                title="Bật / Tắt hiệu ứng âm thanh"
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>Hiệu ứng: <strong>{soundEnabled ? 'BẬT' : 'TẮT'}</strong></span>
              </button>
              <button
                className={`btn-bgm-toggle ${!useVideoAvatar ? 'muted' : ''}`}
                onClick={() => setUseVideoAvatar(!useVideoAvatar)}
                title="Bật / Tắt Avatar Video Nhân Vật Động"
              >
                <span>Avatar: <strong>{useVideoAvatar ? 'VIDEO 🎬' : 'PIXEL'}</strong></span>
              </button>
              <button
                className="btn-bgm-toggle btn-scale-toggle"
                onClick={cycleUiScale}
                title="Tùy chỉnh thu phóng hiển thị (Tự động / 100% / 90% / 85% / 75%) - Tối ưu cho Laptop, iPad và màn hình bé"
              >
                <Maximize2 size={14} color="#facc15" />
                <span>Thu Phóng: <strong style={{ color: '#facc15' }}>{uiScale === 'auto' ? 'Tự Động 📱' : `${uiScale}%`}</strong></span>
              </button>
              <button
                className="btn-bgm-toggle"
                onClick={() => {
                  setShowLeaderboard(true)
                  fetchLeaderboard()
                }}
                title="Xem bảng xếp hạng cao thủ trực tuyến"
              >
                <Trophy size={14} color="#facc15" />
                <span>Xếp hạng: <strong>🏆</strong></span>
              </button>
              <button
                className="btn-bgm-toggle btn-guide-book"
                onClick={() => setShowTutorial(true)}
                title="Mở Sổ Tay Hướng Dẫn Tân Thủ"
              >
                <BookOpen size={14} color="#38bdf8" />
                <span>Hướng Dẫn: <strong>📖 Tân Thủ</strong></span>
              </button>
            </div>
          </div>

          {/* Thanh Tài Khoản & Ví Xu PikaCoins */}
          <div className="user-profile-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CharacterAvatar
                characterId={selectedCharacterId}
                emotion="idle"
                size="md"
                useVideo={useVideoAvatar}
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: '15px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
                  <span>{user ? user.displayName : 'Khách (Guest)'}</span>
                  {user ? (
                    <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(34,197,94,0.2)', padding: '1px 7px', borderRadius: '5px', border: '1px solid rgba(34,197,94,0.4)', fontWeight: 800 }}>
                      Đã đăng nhập
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#cbd5e1', background: 'rgba(255,255,255,0.08)', padding: '1px 7px', borderRadius: '5px', fontWeight: 800 }}>
                      Chơi nhanh
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600, textShadow: '0 1px 2px #000' }}>
                  {user ? `@${user.username}` : 'Đăng nhập để đổi nhân vật & lưu xu vĩnh viễn'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {user && (
                <div className="coins-badge" title="Số PikaCoin hiện có của bạn">
                  <Coins size={15} color="#facc15" />
                  <span>{coins.toLocaleString()} Xu</span>
                </div>
              )}

              {(user?.role === 'admin' || user?.username === 'admin') && (
                <button
                  className="btn-admin-panel"
                  onClick={openAdminModal}
                  title="Mở bảng điều khiển quản trị viên"
                >
                  🛡️ Quản Trị
                </button>
              )}

              <button
                className="btn-shop-open"
                onClick={() => setShowShop(true)}
                title="Cửa Hàng Hiệu Ứng Mặt Bảng, Viền & Tia Line"
              >
                <ShoppingBag size={15} />
                <span>Cửa Hàng</span>
              </button>

              {user ? (
                <button
                  className="btn-auth-toggle"
                  onClick={logoutUser}
                  title="Đăng xuất tài khoản"
                >
                  <LogOut size={14} />
                  <span>Thoát</span>
                </button>
              ) : (
                <button
                  className="btn-auth-toggle"
                  onClick={() => {
                    setAuthMode('login')
                    setShowAuthModal(true)
                  }}
                  title="Đăng nhập hoặc đăng ký tài khoản"
                >
                  <LogIn size={14} />
                  <span>Đăng Nhập</span>
                </button>
              )}
            </div>
          </div>

          <section className="lobby-card">
            {/* Tên Người Chơi */}
            <div>
              <div className="lobby-section-title">
                <User size={15} /> TÊN HUẤN LUYỆN VIÊN
              </div>
              <input
                className="lobby-input"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={14}
                placeholder="Nhập tên của bạn"
              />
            </div>

            {/* THẺ NHÂN VẬT ĐANG DÙNG (CỔNG VÀO TRANG CHỌN TƯỚNG RIÊNG) */}
            {(() => {
              const curChar = getCharacterById(selectedCharacterId)
              return (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: `2px solid ${curChar.accentColor}`,
                    borderRadius: '20px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: `0 8px 24px ${curChar.glowColor}25`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <CharacterAvatar characterId={curChar.id} emotion="idle" size="md" useVideo={useVideoAvatar} />
                    <div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
                        NHÂN VẬT ĐANG CHỌN XUẤT TRẬN
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#facc15' }}>
                        {curChar.name} <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 700 }}>· {curChar.title}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#fef08a', fontStyle: 'italic', marginTop: '2px' }}>
                        "{curChar.ultimate.voiceLine}"
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-change-character"
                    onClick={() => {
                      setPreviewCharId(selectedCharacterId)
                      setPreviewEmotion('idle')
                      navigateToLobbyScreen('character-select', 'Đang mở trang Chọn Tướng & Tuyệt Kỹ...')
                    }}
                  >
                    <span>👾</span>
                    <span>ĐỔI NHÂN VẬT</span>
                  </button>
                </div>
              )
            })()}

            {/* THẺ ĐẤU XẾP HẠNG */}
            <div className="ranked-match-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ fontSize: '28px', background: 'rgba(250,204,21,0.15)', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', border: '1px solid rgba(250,204,21,0.3)' }}>
                    ⚔️
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '16px', color: '#ffffff', letterSpacing: '0.03em' }}>ĐẤU TRƯỜNG XẾP HẠNG (RANKED)</strong>
                      <span className="rank-pill" style={{ color: user ? userRank.color : '#cbd5e1', borderColor: user ? userRank.color : '#64748b', fontSize: '11.5px', fontWeight: 900 }}>
                        {user ? `${userRank.icon} ${userRank.name} (${rankPoints.toLocaleString()} RP)` : '🔒 Cần Đăng Nhập'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '3px' }}>
                      {user ? `Bậc ${userRank.name} · Thi đấu tích điểm leo Rank mùa giải & tranh cúp Bảng Vàng` : 'Đăng nhập để mở khóa Đấu Rank và ghi danh lịch sử'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn-ranked-queue"
                  style={{ padding: '10px 20px' }}
                  onClick={() => {
                    navigateToLobbyScreen('ranked', 'Đang vào Đấu Trường Xếp Hạng...')
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 900 }}>⚔️ VÀO ĐẤU RANK</span>
                </button>
              </div>
            </div>

            {/* CỔNG VÀO CHIẾN DỊCH 5 CHƯƠNG TRẢM BOSS */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(239, 68, 68, 0.25) 50%, rgba(168, 85, 247, 0.2) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '2px solid rgba(250, 204, 21, 0.5)',
                borderRadius: '20px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  fontSize: '34px',
                  background: 'rgba(0,0,0,0.4)',
                  width: '60px',
                  height: '60px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid rgba(250,204,21,0.5)',
                  boxShadow: '0 0 16px rgba(250,204,21,0.3)',
                }}>
                  👑
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '16px', color: '#ffffff', letterSpacing: '0.03em' }}>
                      CHIẾN DỊCH 5 CHƯƠNG · TRẢM BOSS
                    </strong>
                    <span style={{ fontSize: '10px', background: '#ef4444', color: '#ffffff', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                      MỚI
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#fde047', marginTop: '3px' }}>
                    15 Ải Cốt Truyện Bi Tráng · 5 Hiệu Ứng Môi Trường Thị Giác · Đại Chiến Boss!
                  </div>
                </div>
              </div>

              <button
                className="btn-ranked-queue"
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                }}
                onClick={() => {
                  navigateToLobbyScreen('campaign', 'Đang mở Chiến Dịch 5 Chương Trảm Boss...')
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 900 }}>⚔️ VÀO CHIẾN DỊCH</span>
              </button>
            </div>

            <div className="lobby-card-section">
              <div className="lobby-section-title">
                <Sparkles size={15} /> CHẾ ĐỘ CHƠI TÙY CHỌN
              </div>
              <div className="mode-grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                <button
                  className={`lobby-option-btn ${playMode === 'solo' ? 'active' : ''}`}
                  onClick={() => setPlayMode('solo')}
                >
                  <User size={22} color="#22c55e" />
                  <strong>Chơi Đơn (Solo)</strong>
                </button>

                <button
                  className={`lobby-option-btn ${playMode === 'pvp-bot' ? 'active' : ''}`}
                  onClick={() => setPlayMode('pvp-bot')}
                >
                  <Bot size={22} color="#38bdf8" />
                  <strong>Đấu Với Máy (AI)</strong>
                </button>

                <button
                  className={`lobby-option-btn ${playMode === 'pvp-online' ? 'active' : ''}`}
                  onClick={() => setPlayMode('pvp-online')}
                >
                  <Users size={22} color="#facc15" />
                  <strong>PVP 2 Người</strong>
                </button>

                <button
                  className={`lobby-option-btn ${playMode === 'campaign' ? 'active' : ''}`}
                  onClick={() => {
                    navigateToLobbyScreen('campaign', 'Đang mở Chiến Dịch 5 Chương Trảm Boss...')
                  }}
                  style={{ borderColor: 'rgba(250, 204, 21, 0.5)' }}
                >
                  <Crown size={22} color="#f59e0b" />
                  <strong style={{ color: '#facc15' }}>Chiến Dịch (5 Chương)</strong>
                </button>
              </div>
            </div>

            {playMode === 'pvp-bot' && (
              <div className="lobby-card-section bot-mode-section">
                <div className="lobby-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={16} color="#38bdf8" />
                    <span>ĐẤU VỚI MÁY · 50 CẤP ĐỘ (5 TẦNG)</span>
                  </span>
                  <div className="bot-total-stars-badge">
                    <span>⭐ Tổng Sao: </span>
                    <strong style={{ color: '#facc15' }}>{totalBotStars} / 150</strong>
                    <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>
                      (Mở khóa: Lv.{maxUnlockedBotLevel}/50)
                    </span>
                  </div>
                </div>

                {/* Floor Tabs / Pages */}
                <div className="bot-floor-tabs">
                  {BOT_FLOORS.map(f => {
                    const isFloorUnlocked = totalBotStars >= f.requiredStars
                    const isTabActive = selectedBotFloor === f.floor
                    let floorEarnedStars = 0
                    for (let lvl = f.levelRange[0]; lvl <= f.levelRange[1]; lvl++) {
                      floorEarnedStars += (botStars[lvl] || 0)
                    }
                    const maxFloorStars = (f.levelRange[1] - f.levelRange[0] + 1) * 3

                    return (
                      <button
                        key={f.floor}
                        type="button"
                        className={`bot-floor-tab ${isTabActive ? 'active' : ''} ${!isFloorUnlocked ? 'floor-locked' : ''}`}
                        onClick={() => setSelectedBotFloor(f.floor)}
                        style={{
                          borderColor: isTabActive ? f.accentColor : undefined,
                        }}
                      >
                        <div className="bot-floor-tab-top">
                          <span className="bot-floor-badge">{f.badge}</span>
                          <span className="bot-floor-tab-name">{f.name}</span>
                          {!isFloorUnlocked && <Lock size={11} color="#f87171" />}
                        </div>
                        <div className="bot-floor-tab-bottom">
                          {isFloorUnlocked ? (
                            <span className="bot-floor-star-count">⭐ {floorEarnedStars}/{maxFloorStars}</span>
                          ) : (
                            <span className="bot-floor-req-stars">Cần {f.requiredStars} ⭐</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Floor Info Banner */}
                {(() => {
                  const curFloor = BOT_FLOORS.find(f => f.floor === selectedBotFloor) || BOT_FLOORS[0]
                  const isFloorUnlocked = totalBotStars >= curFloor.requiredStars
                  let floorEarnedStars = 0
                  for (let lvl = curFloor.levelRange[0]; lvl <= curFloor.levelRange[1]; lvl++) {
                    floorEarnedStars += (botStars[lvl] || 0)
                  }
                  const maxFloorStars = (curFloor.levelRange[1] - curFloor.levelRange[0] + 1) * 3

                  return (
                    <div
                      className="bot-floor-banner"
                      style={{
                        background: curFloor.bgGradient,
                        borderColor: isFloorUnlocked ? curFloor.accentColor : 'rgba(239, 68, 68, 0.5)',
                      }}
                    >
                      <div className="bot-floor-banner-info">
                        <div className="bot-floor-banner-title" style={{ color: curFloor.accentColor }}>
                          <span>{curFloor.badge} {curFloor.name}: {curFloor.title}</span>
                          <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600, marginLeft: '8px' }}>
                            (Cấp {curFloor.levelRange[0]} - {curFloor.levelRange[1]})
                          </span>
                        </div>
                        <div className="bot-floor-banner-sub">
                          {isFloorUnlocked ? (
                            <span style={{ color: '#4ade80' }}>
                              ✓ Đã mở khóa tầng · Đã thu thập: <strong>{floorEarnedStars}/{maxFloorStars} ⭐</strong>
                            </span>
                          ) : (
                            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={12} /> Cần tối thiểu <strong>{curFloor.requiredStars} ⭐</strong> để mở tầng này (Còn thiếu {curFloor.requiredStars - totalBotStars} ⭐)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Floor Pagination Controls */}
                      <div className="bot-floor-banner-nav">
                        <button
                          type="button"
                          className="bot-floor-nav-btn"
                          disabled={selectedBotFloor <= 1}
                          onClick={() => setSelectedBotFloor(prev => Math.max(1, prev - 1))}
                          title="Tầng trước"
                        >
                          ◀ Trước
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', padding: '0 4px' }}>
                          Trang {selectedBotFloor}/5
                        </span>
                        <button
                          type="button"
                          className="bot-floor-nav-btn"
                          disabled={selectedBotFloor >= BOT_FLOORS.length}
                          onClick={() => setSelectedBotFloor(prev => Math.min(BOT_FLOORS.length, prev + 1))}
                          title="Tầng sau"
                        >
                          Sau ▶
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* Level Grid for Current Floor */}
                {(() => {
                  const curFloor = BOT_FLOORS.find(f => f.floor === selectedBotFloor) || BOT_FLOORS[0]
                  const isFloorUnlocked = totalBotStars >= curFloor.requiredStars
                  const floorLevels = BOT_LEVELS.filter(b => b.floor === curFloor.floor)

                  if (!isFloorUnlocked) {
                    return (
                      <div className="bot-floor-locked-notice">
                        <Lock size={32} color="#f87171" />
                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#f87171', marginTop: '6px' }}>
                          TẦNG {curFloor.floor} ĐANG BỊ KHÓA
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', maxWidth: '440px', textAlign: 'center', marginTop: '4px' }}>
                          Bạn cần tích lũy tối thiểu <strong style={{ color: '#facc15' }}>{curFloor.requiredStars} ⭐</strong> trên toàn bộ hành trình để mở khóa Tầng này.
                          <br />
                          Hiện tại bạn có: <strong style={{ color: '#38bdf8' }}>{totalBotStars} ⭐</strong> (còn thiếu <strong style={{ color: '#f87171' }}>{curFloor.requiredStars - totalBotStars} ⭐</strong>).
                        </div>
                        <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '6px' }}>
                          💡 Gợi ý: Hãy chơi lại các màn ở Tầng trước nhanh hơn để đạt tối đa 3 ⭐ mỗi màn!
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="bot-level-grid">
                      {floorLevels.map(bot => {
                        const isUnlocked = isFloorUnlocked && bot.level <= maxUnlockedBotLevel
                        const isSelected = botLevel === bot.level
                        const earnedStars = botStars[bot.level] || 0

                        return (
                          <button
                            key={bot.level}
                            type="button"
                            disabled={!isUnlocked}
                            className={`bot-level-card ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                            onClick={() => isUnlocked && setBotLevel(bot.level)}
                            title={
                              isUnlocked
                                ? `${bot.name} (${bot.title}) - Đã đạt: ${earnedStars}/3 ⭐ - Thưởng: +${bot.rewardCoins} Xu`
                                : `Cần thắng Cấp ${bot.level - 1} để mở khóa`
                            }
                          >
                            <div className="bot-level-header">
                              <span className="bot-level-badge">Lv.{bot.level}</span>
                              {!isUnlocked ? (
                                <Lock size={11} color="#94a3b8" />
                              ) : earnedStars === 3 ? (
                                <span className="bot-level-perfect" title="Đã đạt tối đa 3 sao">👑</span>
                              ) : null}
                            </div>
                            <div className="bot-level-avatar-frame">
                              <img
                                src={getSpriteUrl(bot.pokemonId, 'artwork')}
                                alt={bot.name}
                                className="bot-level-artwork"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none'
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block'
                                  }
                                }}
                              />
                              <div className="bot-level-emoji-fallback" style={{ display: 'none' }}>{bot.avatar}</div>
                            </div>
                            <div className="bot-level-name">{bot.name}</div>

                            {/* 3-Star Rating Row */}
                            <div className="bot-level-stars">
                              {[1, 2, 3].map(starNum => (
                                <span
                                  key={starNum}
                                  className={`star-icon ${earnedStars >= starNum ? 'filled' : 'empty'}`}
                                >
                                  {earnedStars >= starNum ? '★' : '☆'}
                                </span>
                              ))}
                            </div>

                            <div className="bot-level-reward">
                              <Coins size={10} color="#facc15" /> +{bot.rewardCoins}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

            {playMode !== 'pvp-online' && (
              <div className="lobby-card-section">
                <div className="lobby-section-title">
                  <span style={{ color: '#facc15' }}>⊞</span> CỠ BÀN CHƠI
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {(['14x8', '10x6'] as GridSizeKey[]).map(key => {
                    const isSelected = gridSize === key
                    return (
                      <button
                        key={key}
                        className={`lobby-option-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setGridSize(key)}
                      >
                        <strong>{key}</strong>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tùy Chọn Chung / Riêng Bảng (Dành cho chế độ PVP) */}
            {playMode !== 'solo' && (
              <div>
                <div className="lobby-section-title">
                  <Users size={15} /> HÌNH THỨC THI ĐẤU PVP
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    className={`lobby-option-btn ${boardMode === 'shared' ? 'active' : ''}`}
                    onClick={() => setBoardMode('shared')}
                  >
                    <strong>Chung 1 Bảng</strong>
                  </button>

                  <button
                    className={`lobby-option-btn ${boardMode === 'separate' ? 'active' : ''}`}
                    onClick={() => setBoardMode('separate')}
                  >
                    <strong>Riêng Bảng (2 Bên)</strong>
                  </button>
                </div>
              </div>
            )}

            {/* Chọn Phong Cách Hình Ảnh Pokémon */}
            <div>
              <div className="lobby-section-title">
                <Sparkles size={15} /> PHONG CÁCH ĐỒ HỌA
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <button
                  className={`lobby-option-btn ${spriteTheme === 'artwork' ? 'active' : ''}`}
                  onClick={() => setSpriteTheme('artwork')}
                >
                  <strong>🎨 HD Artwork</strong>
                </button>
                <button
                  className={`lobby-option-btn ${spriteTheme === 'retro' ? 'active' : ''}`}
                  onClick={() => setSpriteTheme('retro')}
                >
                  <strong>👾 Pixel 2003</strong>
                </button>
                <button
                  className={`lobby-option-btn ${spriteTheme === 'home' ? 'active' : ''}`}
                  onClick={() => setSpriteTheme('home')}
                >
                  <strong>✨ 3D Nổi Khối</strong>
                </button>
              </div>
            </div>

            {/* Hành Động: Bắt Đầu / Tạo Phòng / Vào Phòng */}
            {playMode !== 'pvp-online' ? (
              <button className="btn-start-game" onClick={() => startMatch(gridSize)}>
                BẮT ĐẦU VÀO TRẬN ⚡ <ArrowRight size={18} />
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
                <button className="btn-start-game" onClick={handleCreateRoom}>
                  <Sparkles size={18} /> TẠO PHÒNG MỚI ✨ (Lấy Mã Gửi Bạn)
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="lobby-input"
                    style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    placeholder="NHẬP MÃ PHÒNG (VD: PK1234)"
                    value={inputCode}
                    onChange={e => setInputCode(e.target.value)}
                  />
                  <button
                    className="btn-start-game"
                    style={{ width: 'auto', padding: '10px 24px', margin: 0 }}
                    onClick={handleJoinRoom}
                  >
                    <DoorOpen size={18} /> VÀO 🐾
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
        {renderSharedModals()}
      </main>
    )
  }

  /* ══════════════════════════════════════════════
     SCREEN 2: IN-GAME MATCH ARENA
     ══════════════════════════════════════════════ */
  return (
    <main className={`pikachu-app ui-scale-${uiScale}`}>
      {/* Portrait Orientation Suggestion Banner - Mobile Only */}
      {showPortraitBanner && (
        <div className="portrait-orientation-banner">
          <div className="portrait-banner-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>📱↻</span>
              <span>Gợi ý: <strong>Xoay ngang</strong> điện thoại để bàn cờ to & dễ chơi nhất!</span>
            </div>
            <button
              className="btn-dismiss-banner"
              onClick={() => setShowPortraitBanner(false)}
            >
              Đã hiểu ✕
            </button>
          </div>
        </div>
      )}
      {/* Top Navigation Bar: Nút Về Menu & Trạng Thái Phòng */}
      <div className="top-nav-bar">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-back-menu" onClick={exitToMenu}>
            <LogOut size={14} /> Về Menu
          </button>
          <button
            className="btn-back-menu"
            onClick={() => {
              const next = spriteTheme === 'artwork' ? 'retro' : spriteTheme === 'retro' ? 'home' : 'artwork'
              setSpriteTheme(next)
            }}
            title="Bấm để đổi kiểu ảnh Pokémon"
          >
            <span>Ảnh: <strong style={{ color: '#facc15' }}>{spriteTheme === 'artwork' ? '🎨 HD' : spriteTheme === 'retro' ? '👾 Pixel' : '✨ 3D'}</strong></span>
          </button>
          <button
            className="btn-back-menu"
            onClick={toggleBgm}
            title="Bật / Tắt nhạc nền 8-bit"
          >
            <Music size={14} color={bgmEnabled ? '#34d399' : '#94a3b8'} className={bgmEnabled && audioReady ? 'animate-pulse' : ''} />
            <span>Nhạc: <strong style={{ color: bgmEnabled ? '#34d399' : '#94a3b8' }}>{bgmEnabled ? (audioReady ? 'BẬT 🎵' : 'BẬT') : 'TẮT'}</strong></span>
          </button>
          <button
            className="btn-back-menu"
            onClick={() => setUseVideoAvatar(!useVideoAvatar)}
            title="Chuyển đổi hình đại diện Video Anime sống động hoặc Pixel Cổ Điển"
          >
            <span>Avatar: <strong style={{ color: useVideoAvatar ? '#38bdf8' : '#94a3b8' }}>{useVideoAvatar ? '🎬 Video' : '👾 Pixel'}</strong></span>
          </button>
          <button
            className="btn-back-menu btn-scale-toggle"
            onClick={cycleUiScale}
            title="Tùy chỉnh thu phóng hiển thị (Tự động / 100% / 90% / 85% / 75%) - Tối ưu cho Laptop, iPad và màn hình bé"
          >
            <Maximize2 size={14} color="#facc15" />
            <span>Thu Phóng: <strong style={{ color: '#facc15' }}>{uiScale === 'auto' ? 'Tự Động 📱' : `${uiScale}%`}</strong></span>
          </button>
          <button
            className="btn-back-menu"
            onClick={() => setShowTutorial(true)}
            title="Mở Sổ Tay Hướng Dẫn Tân Thủ"
          >
            <BookOpen size={14} color="#38bdf8" />
            <span>Hướng Dẫn 📖</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user && (
            <div className="coins-badge" style={{ padding: '4px 12px', fontSize: '13.5px' }}>
              <Coins size={14} color="#facc15" />
              <span>{coins.toLocaleString()} Xu</span>
            </div>
          )}

          <span className="game-mode-tag">
            {playMode === 'solo'
              ? 'Chơi Đơn (Solo)'
              : playMode === 'campaign'
                ? `👑 Chiến Dịch 5 Chương · ${boardMode === 'shared' ? 'Chung Bảng (Tranh Cướp)' : 'Khác Bảng (2 Bàn Riêng)'}`
                : playMode === 'pvp-bot'
                  ? `Đấu Bot AI · ${boardMode === 'shared' ? 'Chung Bảng' : 'Riêng Bảng'}`
                  : `PVP Online · ${boardMode === 'shared' ? 'Chung Bảng' : 'Riêng Bảng'}`}
          </span>

          {roomCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(250,204,21,0.18)', padding: '5px 12px', borderRadius: '9999px', border: '1px solid rgba(250,204,21,0.5)', fontSize: '13.5px', fontWeight: 850, color: '#facc15' }}>
              <span>Phòng: {roomCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(roomCode)
                  setCopiedCode(true)
                  setTimeout(() => setCopiedCode(false), 2000)
                }}
                style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer' }}
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Stats Bar (5 Thẻ Chuẩn 100% Theo Ảnh Của Người Dùng) */}
      <div className="top-stats-container">
        <div className="stats-card-row">
          {/* BÀN */}
          <div className="stat-card">
            <span className="stat-label">BÀN</span>
            <span className="stat-value val-cyan">{level}</span>
          </div>

          {/* LƯỢT ĐỔI */}
          <div className="stat-card">
            <span className="stat-label">LƯỢT ĐỔI</span>
            <span className="stat-value val-purple">{shufflesLeft}</span>
          </div>

          {/* ĐIỂM */}
          <div className="stat-card">
            <span className="stat-label">ĐIỂM</span>
            <span className="stat-value val-yellow">{score}</span>
          </div>

          {/* KỶ LỤC (Số trận thắng nhiều nhất của guest đã lưu lại) */}
          <div
            className="stat-card"
            title={guestRecordHolder && guestMaxWins > 0 ? `Kỷ lục: ${guestRecordHolder} (${guestMaxWins} trận thắng)` : `Kỷ lục số trận thắng: ${guestMaxWins}`}
          >
            <span className="stat-label">KỶ LỤC</span>
            <span className="stat-value val-green">{guestMaxWins}</span>
            {guestRecordHolder && guestMaxWins > 0 && (
              <span
                style={{
                  fontSize: '8.5px',
                  color: '#86efac',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  marginTop: '-2px',
                  maxWidth: '72px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {guestRecordHolder}
              </span>
            )}
          </div>

          {/* XẾP HẠNG */}
          <div
            className="stat-card clickable"
            onClick={() => {
              setShowLeaderboard(true)
              fetchLeaderboard()
            }}
          >
            <span className="stat-label">XẾP HẠNG</span>
            <span className="stat-value val-trophy">🏆</span>
          </div>
        </div>

        {/* Thanh Thời Gian Neon Xanh Lá Phát Sáng Chuẩn Ảnh */}
        <div className="timer-bar-wrapper">
          <div
            className={`timer-bar-fill ${timeLeft < 30 ? 'critical' : ''}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        {/* Thông báo trạng thái nước đi */}
        <div className="status-msg">
          <span className="status-dot" />
          <span>{notice}</span>
        </div>
      </div>

      {/* ─── Match Arenas: Solo vs PVP ─── */}
      {playMode === 'solo' || boardMode === 'shared' ? (
        /* CHẾ ĐỘ 1 BẢNG (Solo hoặc PVP Chung 1 Bảng ở giữa) */
        <section className={`arena-solo ${playMode !== 'solo' ? 'with-avatar-cols' : ''}`}>
          {/* CỘT TAY TRÁI: NHÂN VẬT VIDEO HERO BATTLE PANEL (CHẾ ĐỘ SOLO) */}
          {playMode === 'solo' && (() => {
            const curChar = getCharacterById(selectedCharacterId)
            const canUse = energy >= curChar.ultimate.energyCost
            const energyPercent = Math.min(100, Math.round((energy / curChar.ultimate.energyCost) * 100))

            return (
              <aside
                className="battle-hero-side-panel"
                style={{
                  ['--hero-accent' as any]: curChar.accentColor,
                  ['--hero-glow' as any]: curChar.glowColor,
                }}
              >
                {/* Thẻ Nhân Vật Video Lớn Rõ Nét */}
                <div className="hero-standee-card">
                  <div className="hero-avatar-wrap">
                    <CharacterAvatar
                      domId="player-active-avatar"
                      characterId={selectedCharacterId}
                      emotion={playerEmotion}
                      size="standee"
                      shape="rect"
                      showSpeech={playerEmotion !== 'idle'}
                      useVideo={useVideoAvatar}
                    />
                    <div className="hero-aura-bracket-tl" style={{ borderColor: curChar.accentColor }} />
                    <div className="hero-aura-bracket-tr" style={{ borderColor: curChar.accentColor }} />
                    <div className="hero-aura-bracket-bl" style={{ borderColor: curChar.accentColor }} />
                    <div className="hero-aura-bracket-br" style={{ borderColor: curChar.accentColor }} />
                  </div>

                  <div className="hero-meta-info">
                    <div className="hero-player-name">{playerName}</div>
                    <div className="hero-char-tag" style={{ color: curChar.accentColor }}>{curChar.name}</div>
                    <div className="hero-char-title">{curChar.title}</div>
                  </div>
                </div>

                {/* BỘ ĐIỀU KHIỂN & THANH NĂNG LƯỢNG CHIÊU THỨC */}
                <div className="hero-ultimate-console">
                  <div className="hero-energy-header">
                    <span className="hero-energy-label">⚡ NĂNG LƯỢNG CHIÊU</span>
                    <span className="hero-energy-val" style={{ color: canUse ? '#4ade80' : '#facc15' }}>
                      {energy}% / {curChar.ultimate.energyCost}%
                    </span>
                  </div>

                  <div className="hero-energy-track">
                    <div
                      className={`hero-energy-fill ${canUse ? 'is-full' : ''}`}
                      style={{
                        width: `${energyPercent}%`,
                        background: canUse
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444, #facc15)'
                          : `linear-gradient(90deg, #3b82f6, ${curChar.accentColor})`,
                      }}
                    />
                  </div>

                  {/* Nút Chiêu Thức Hoành Tráng Siêu Đẹp HOẶC Hộp Hiệu Ứng Đang Kích Hoạt */}
                  {activeUltEffect ? (
                    <div className={`hero-active-ult-box theme-${activeUltEffect.colorTheme}`}>
                      <div className="hero-active-icon">{activeUltEffect.icon}</div>
                      <div className="hero-active-content">
                        <span className="hero-active-name">{activeUltEffect.name}</span>
                        <span className="hero-active-desc">{activeUltEffect.detail}</span>
                        <span className="hero-active-timer">Hiệu lực: <strong>{activeUltEffect.secs}s</strong></span>
                      </div>
                    </div>
                  ) : (
                    <button
                      className={`hero-ultimate-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                      onClick={triggerUltimateSkill}
                      disabled={!canUse}
                      title={`${curChar.ultimate.name}: ${curChar.ultimate.description}`}
                    >
                      <div className="hero-btn-icon-wrap">{curChar.ultimate.icon}</div>
                      <div className="hero-btn-text-wrap">
                        <span className="hero-btn-title">{curChar.ultimate.name}</span>
                        <span className="hero-btn-badge">
                          {canUse ? '🔥 BẤM ĐỂ TUNG CHIÊU!' : `Tích lũy (${energy}/${curChar.ultimate.energyCost}%)`}
                        </span>
                      </div>
                    </button>
                  )}

                  <div className="hero-ult-desc-box" style={{ borderLeftColor: curChar.accentColor }}>
                    {curChar.ultimate.description}
                  </div>
                </div>
              </aside>
            )
          })()}

          {/* CỘT TAY TRÁI KHI CHƠI BÀN CHUNG (PVP BOT, PVP ONLINE, CHIẾN DỊCH CAMPAIGN) */}
          {playMode !== 'solo' && (
            <div className="pvp-avatar-column">
              <div className="pvp-avatar-card is-player">
                <CharacterAvatar
                  domId="player-active-avatar"
                  characterId={selectedCharacterId}
                  emotion={playerEmotion}
                  size="sm"
                  shape="rect"
                  showSpeech={playerEmotion !== 'idle'}
                  useVideo={useVideoAvatar}
                />
              </div>
              <span className="pvp-avatar-name">{playerName}</span>
              <span className="pvp-avatar-score" style={{ color: '#facc15' }}>{score} đ</span>
              <span className="pvp-avatar-label is-player">BẠN</span>
              <div className="arena-rank-badge" style={{ color: userRank.color, borderColor: userRank.color }}>
                <span className="arena-rank-badge-icon">{userRank.icon}</span>
                <span className="arena-rank-badge-name">{userRank.name}</span>
                <span className="arena-rank-badge-rp">({rankPoints.toLocaleString()} RP)</span>
              </div>

              {/* Nút Tuyệt Kỹ & Năng Lượng Gọn Gàng HOẶC Hiệu Ứng Đang Kích Hoạt */}
              {activeUltEffect ? (
                <div className={`bottom-bar-active-pill theme-${activeUltEffect.colorTheme}`} style={{ marginTop: '4px', width: '88px', padding: '4px 2px' }}>
                  <span>{activeUltEffect.icon}</span>
                  <small style={{ fontWeight: 900, color: '#facc15' }}>{activeUltEffect.secs}s</small>
                </div>
              ) : (() => {
                const curChar = getCharacterById(selectedCharacterId)
                const canUse = energy >= curChar.ultimate.energyCost
                return (
                  <button
                    className={`pvp-skill-btn pvp-ult-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                    onClick={triggerUltimateSkill}
                    disabled={!canUse}
                    style={{ width: '88px', marginTop: '4px' }}
                    title={`${curChar.ultimate.name}: ${curChar.ultimate.description} (Cần ${curChar.ultimate.energyCost}% NL)`}
                  >
                    <span style={{ fontSize: '15px' }}>{curChar.ultimate.icon}</span>
                    <span style={{ fontWeight: 900 }}>TUYỆT KỸ</span>
                    <small style={{ color: canUse ? '#fde047' : '#94a3b8' }}>
                      {canUse ? 'SẴN SÀNG!' : `${energy}%/${curChar.ultimate.energyCost}%`}
                    </small>
                  </button>
                )
              })()}
            </div>
          )}

          <div className={`board-frame ${isMeFrozen ? 'is-frozen' : ''} ${isMeFogged ? 'is-fogged' : ''} ${combo >= 2 ? 'combo-on-fire' : ''} ${equipped.boardTheme} ${equipped.boardFrame} ${playMode === 'campaign' && currentCampaignStage ? `chapter-env-${currentCampaignStage.chapterEnvEffect}` : ''}`} style={{ flex: 1, minWidth: 0 }}>
            {isMeFrozen && <div className="debuff-banner">❄ BẠN ĐANG BỊ ĐÓNG BĂNG!</div>}
            {isMeFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 BẠN ĐANG BỊ MÙ SƯƠNG!</div>}
            {activeLaserCross && (
              <div className="laser-cross-anim">
                <div
                  className="laser-beam-horizontal"
                  style={{ top: `${((activeLaserCross.row + 0.5) / dims.rows) * 100}%` }}
                />
                <div
                  className="laser-beam-vertical"
                  style={{ left: `${((activeLaserCross.col + 0.5) / dims.cols) * 100}%` }}
                />
              </div>
            )}
            {combo >= 2 && (
              <div className="combo-fire-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                  <span>🔥 COMBO x{combo}! ON FIRE 🔥</span>
                  <span style={{ fontSize: '11px', color: '#fef08a', fontWeight: 900 }}>⏳ {comboSecondsLeft}s</span>
                </div>
                <div className="combo-timer-track">
                  <div
                    className="combo-timer-fill"
                    style={{ width: `${Math.min(100, (comboSecondsLeft / 4.5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {(playMode === 'solo' || playMode === 'campaign') && (
              <div className="board-header" style={{ justifyContent: 'space-between', padding: '8px 16px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
                    {playMode === 'campaign' && currentCampaignStage ? `👑 ${currentCampaignStage.name}` : '🎮 BÀN ĐẤU SOLO'}
                  </span>
                  <span style={{ fontSize: '11px', background: playMode === 'campaign' ? 'rgba(239,68,68,0.2)' : 'rgba(250,204,21,0.15)', color: playMode === 'campaign' ? '#fca5a5' : '#facc15', border: `1px solid ${playMode === 'campaign' ? 'rgba(239,68,68,0.4)' : 'rgba(250,204,21,0.3)'}`, borderRadius: '6px', padding: '2px 8px', fontWeight: 800 }}>
                    {playMode === 'campaign' && currentCampaignStage ? `VS ${currentCampaignStage.bossAvatar} ${currentCampaignStage.bossName}` : getCharacterById(selectedCharacterId).name}
                  </span>
                </div>
                {/* Nút Tuyệt Kỹ Gọn Đẹp HOẶC Hiển Thị Hiệu Ứng Tuyệt Kỹ Đang Hoạt Động (Bỏ nút skill đi) */}
                {activeUltEffect ? (
                  <div className={`active-skill-status-pill theme-${activeUltEffect.colorTheme}`}>
                    <div className="pill-pulse-ring" />
                    <span className="pill-icon">{activeUltEffect.icon}</span>
                    <div className="pill-info">
                      <span className="pill-title">{activeUltEffect.name}</span>
                      <span className="pill-detail">{activeUltEffect.detail}</span>
                    </div>
                    <div className="pill-timer-badge">
                      <span>⏳ {activeUltEffect.secs}s</span>
                    </div>
                  </div>
                ) : (() => {
                  const curChar = getCharacterById(selectedCharacterId)
                  const canUse = energy >= curChar.ultimate.energyCost
                  return (
                    <button
                      className={`ultimate-skill-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                      onClick={triggerUltimateSkill}
                      disabled={!canUse}
                      style={{
                        padding: '6px 14px',
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                        width: 'auto',
                        minWidth: 'unset',
                        maxWidth: '300px',
                      }}
                      title={`${curChar.ultimate.name}: ${curChar.ultimate.description} (Cần ${curChar.ultimate.energyCost}% NL)`}
                    >
                      <span style={{ fontSize: '16px' }}>{curChar.ultimate.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800 }}>{curChar.ultimate.name.split('(')[0]}</span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        background: canUse ? '#22c55e' : 'rgba(0,0,0,0.4)',
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '2px 6px',
                      }}>
                        {canUse ? 'SẴN SÀNG!' : `${energy}%/${curChar.ultimate.energyCost}%`}
                      </span>
                    </button>
                  )
                })()}
              </div>
            )}

            {playMode !== 'solo' && boardMode === 'shared' && (
              <div className="board-header" style={{ justifyContent: 'space-between', padding: '6px 12px', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#facc15' }}>
                  {playerName}: <strong>{score} đ</strong>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#22c55e', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', padding: '2px 10px' }}>
                  ⚡ BÀN CHUNG {playMode === 'pvp-bot' ? '· ĐẤU VỚI MÁY' : '· PVP 2 NGƯỜI'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#f43f5e' }}>
                  {playMode === 'pvp-bot' ? `${curBot.name} (Lv.${curBot.level})` : (rivalName || 'Chờ...')}: <strong>{rivalScore} đ</strong>
                </div>
              </div>
            )}

            {playMode === 'pvp-online' && !rivalName ? (
              <div className="empty-board-waiting-screen">
                <div className="waiting-radar-pulse">📡</div>
                <h3 className="waiting-title">ĐANG CHỜ NGƯỜI CHƠI THỨ 2 VÀO BÀN...</h3>
                <div className="waiting-room-badge">
                  <span>MÃ PHÒNG:</span>
                  <strong>{roomCode}</strong>
                  <button
                    className="btn-copy-code"
                    onClick={() => {
                      if (roomCode) {
                        navigator.clipboard?.writeText(roomCode)
                        setNotice(`ĐÃ SAO CHÉP MÃ PHÒNG: ${roomCode}`)
                        playSound('select', soundEnabled)
                      }
                    }}
                  >
                    <Copy size={13} /> Sao Chép Mã
                  </button>
                </div>
                <p className="waiting-desc">
                  ⚡ Bàn cờ đang được để trống. Đồng hồ ngưng đếm ngược.
                  <br />
                  Ngay khi người chơi thứ 2 nhập mã vào phòng, bàn cờ mới sẽ được tạo và bắt đầu tính thời gian!
                </p>
              </div>
            ) : (
              <BoardView
                board={board}
                cols={dims.cols}
                rows={dims.rows}
                selected={selected}
                matchingPair={matchingPair}
                onSelect={onTileSelect}
                linkPath={linkPath}
                hintPair={hintPair || activeRadarPair}
                wildcardCoords={wildcardCoords}
                solarFireCoords={solarFireCoords}
                electroCoreCoords={electroCoreCoords}
                spriteTheme={spriteTheme}
                tileStyle={equipped.tileStyle}
                lineEffect={equipped.lineEffect}
                isScrambling={isScrambling}
                shockwaves={shockwaves}
                matchParticles={matchParticles}
                floatingPopups={floatingPopups}
                activeSkillZaps={activeSkillZaps}
              />
            )}
          </div>

          {/* CỘT TAY PHẢI KHI CHƠI BÀN CHUNG (MÁY HOẶC ĐỐI THỦ) */}
          {playMode !== 'solo' && (
            <div className="pvp-avatar-column">
              <div className={`pvp-avatar-card is-rival ${playMode === 'campaign' ? 'is-boss-rival' : playMode === 'pvp-bot' ? 'is-bot-rival' : ''}`}>
                {playMode === 'campaign' && currentCampaignStage ? (
                  <div className="arena-boss-avatar-wrapper" id="rival-active-avatar">
                    <div className="arena-boss-aura" />
                    <img
                      src={getSpriteUrl(currentCampaignStage.bossPokemonId, 'artwork')}
                      alt={currentCampaignStage.bossName}
                      className="arena-boss-artwork"
                    />
                  </div>
                ) : playMode === 'pvp-bot' ? (
                  <div className="arena-bot-avatar-wrapper" id="rival-active-avatar">
                    <img
                      src={getSpriteUrl(curBot.pokemonId, 'artwork')}
                      alt={curBot.name}
                      className="arena-bot-artwork"
                    />
                  </div>
                ) : (
                  <CharacterAvatar
                    domId="rival-active-avatar"
                    characterId={rivalCharacterId}
                    emotion={rivalEmotion}
                    size="sm"
                    shape="rect"
                    showSpeech={rivalEmotion !== 'idle'}
                    useVideo={useVideoAvatar}
                  />
                )}
              </div>
              <span className="pvp-avatar-name">
                {playMode === 'campaign' && currentCampaignStage
                  ? currentCampaignStage.bossName
                  : playMode === 'pvp-bot'
                  ? `${curBot.name} (Lv.${curBot.level})`
                  : (rivalName || 'Chờ...')}
              </span>
              <span className="pvp-avatar-score" style={{ color: '#f43f5e' }}>{rivalScore} đ</span>
              <span className="pvp-avatar-label is-rival">
                {playMode === 'campaign' ? 'BOSS CỐT TRUYỆN' : playMode === 'pvp-bot' ? 'MÁY (BOT)' : 'ĐỐI THỦ'}
              </span>
              <div className="arena-rank-badge" style={{ color: activeRivalRankTier.color, borderColor: activeRivalRankTier.color }}>
                <span className="arena-rank-badge-icon">{activeRivalRankTier.icon}</span>
                <span className="arena-rank-badge-name">{activeRivalRankTier.name}</span>
                <span className="arena-rank-badge-rp">({activeRivalRp.toLocaleString()} RP)</span>
              </div>
              {playMode === 'campaign' && currentCampaignStage ? (
                <div className="pvp-boss-power-badge">
                  ⚡ Lực Chiến: {currentCampaignStage.powerLevel.toLocaleString('vi-VN')}
                </div>
              ) : playMode === 'pvp-bot' && (
                <div className="pvp-bot-badge">
                  {curBot.avatar} {curBot.title}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* CHẾ ĐỘ RIÊNG BẢNG (2 Bảng Khác Nhau Ở 2 Bên Trái - Phải + Chiêu Thức) */
        <section className="arena-pvp with-avatar-cols">
          {/* Cột Avatar Bên Trái: Nhân vật BẠN */}
          <div className="pvp-avatar-column">
            <div className="pvp-avatar-card is-player">
              <CharacterAvatar
                domId="player-active-avatar"
                characterId={selectedCharacterId}
                emotion={playerEmotion}
                size="sm"
                shape="rect"
                showSpeech={playerEmotion !== 'idle'}
                useVideo={useVideoAvatar}
              />
            </div>
            <span className="pvp-avatar-name">{playerName}</span>
            <span className="pvp-avatar-score" style={{ color: '#facc15' }}>{score} đ</span>
            <span className="pvp-avatar-label is-player">BẠN</span>
            <div className="arena-rank-badge" style={{ color: userRank.color, borderColor: userRank.color }}>
              <span className="arena-rank-badge-icon">{userRank.icon}</span>
              <span className="arena-rank-badge-name">{userRank.name}</span>
              <span className="arena-rank-badge-rp">({rankPoints.toLocaleString()} RP)</span>
            </div>
          </div>

          {/* Cột Trái: Bảng của BẠN */}
          <div className={`board-frame ${isMeFrozen ? 'is-frozen' : ''} ${isMeFogged ? 'is-fogged' : ''} ${combo >= 2 ? 'combo-on-fire' : ''} ${equipped.boardTheme} ${equipped.boardFrame} ${playMode === 'campaign' && currentCampaignStage ? `chapter-env-${currentCampaignStage.chapterEnvEffect}` : ''}`}>
            {isMeFrozen && <div className="debuff-banner">❄ BẠN ĐANG BỊ ĐÓNG BĂNG!</div>}
            {isMeFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 BỊ MÙ SƯƠNG!</div>}
            {combo >= 2 && (
              <div className="combo-fire-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
                  <span>🔥 COMBO x{combo}! ON FIRE 🔥</span>
                  <span style={{ fontSize: '11px', color: '#fef08a', fontWeight: 900 }}>⏳ {comboSecondsLeft}s</span>
                </div>
                <div className="combo-timer-track">
                  <div
                    className="combo-timer-fill"
                    style={{ width: `${Math.min(100, (comboSecondsLeft / 4.5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="board-header">
              <div className="board-player-info">
                <CharacterAvatar
                  characterId={selectedCharacterId}
                  emotion={playerEmotion}
                  size="sm"
                  showSpeech={playerEmotion !== 'idle'}
                  useVideo={useVideoAvatar}
                />
                <span>{playerName} (BẠN)</span>
              </div>
              <div className="board-score-pill" style={{ color: '#facc15' }}>
                {score} ĐIỂM
              </div>
            </div>

            {playMode === 'pvp-online' && !rivalName ? (
              <div className="empty-board-waiting-screen">
                <div className="waiting-radar-pulse">📡</div>
                <h3 className="waiting-title">ĐANG CHỜ NGƯỜI CHƠI THỨ 2 VÀO BÀN...</h3>
                <div className="waiting-room-badge">
                  <span>MÃ PHÒNG:</span>
                  <strong>{roomCode}</strong>
                  <button
                    className="btn-copy-code"
                    onClick={() => {
                      if (roomCode) {
                        navigator.clipboard?.writeText(roomCode)
                        setNotice(`ĐÃ SAO CHÉP MÃ PHÒNG: ${roomCode}`)
                        playSound('select', soundEnabled)
                      }
                    }}
                  >
                    <Copy size={13} /> Sao Chép Mã
                  </button>
                </div>
                <p className="waiting-desc">
                  ⚡ Bàn cờ đang được để trống. Đồng hồ ngưng đếm ngược.
                  <br />
                  Khi đối thủ vào bàn, hệ thống sẽ tạo bảng mới và bắt đầu tính giờ!
                </p>
              </div>
            ) : (
              <BoardView
                board={board}
                cols={dims.cols}
                rows={dims.rows}
                selected={selected}
                matchingPair={matchingPair}
                onSelect={onTileSelect}
                linkPath={linkPath}
                hintPair={hintPair || activeRadarPair}
                wildcardCoords={wildcardCoords}
                solarFireCoords={solarFireCoords}
                electroCoreCoords={electroCoreCoords}
                spriteTheme={spriteTheme}
                tileStyle={equipped.tileStyle}
                lineEffect={equipped.lineEffect}
                isScrambling={isScrambling}
                shockwaves={shockwaves}
                matchParticles={matchParticles}
                floatingPopups={floatingPopups}
                activeSkillZaps={activeSkillZaps}
              />
            )}
          </div>

          {/* Cột Giữa: Cột VS, Tỉ Số & Chiêu Thức Gây Bất Lợi */}
          <div className="pvp-divider">
            <div className="vs-badge">VS</div>

            {playMode === 'pvp-online' && (
              <div
                style={{
                  fontSize: '8.5px',
                  fontWeight: 900,
                  padding: '2px 4px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: syncTransport === 'ws' ? 'rgba(34, 197, 94, 0.25)' : syncTransport === 'sse' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(234, 179, 8, 0.2)',
                  color: syncTransport === 'ws' ? '#4ade80' : syncTransport === 'sse' ? '#38bdf8' : '#facc15',
                  border: `1px solid ${syncTransport === 'ws' ? '#22c55e' : syncTransport === 'sse' ? '#06b6d4' : '#eab308'}`,
                  boxShadow: syncTransport === 'ws' ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
                }}
                title={syncTransport === 'ws' ? 'WebSocket thời gian thực (< 1ms)' : syncTransport === 'sse' ? 'Luồng Server Stream (< 5ms)' : 'Đồng bộ cực nhanh (140ms)'}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {syncTransport === 'ws' ? 'WS 0ms' : syncTransport === 'sse' ? 'SSE 2ms' : '140ms'}
              </div>
            )}

            {/* Thanh Năng Lượng Chiêu Thức */}
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#38bdf8' }}>NĂNG LƯỢNG: {energy}%</div>
            <div className="energy-bar-shell">
              <div className="energy-bar-fill" style={{ width: `${energy}%` }} />
            </div>

            {/* CHIÊU THỨC CUỐI ĐẶC BIỆT CỦA NHÂN VẬT (GỌN GÀNG KHỚP CỘT PVP) */}
            {activeUltEffect ? (
              <div className={`bottom-bar-active-pill theme-${activeUltEffect.colorTheme}`} style={{ width: '44px', padding: '3px 1px', flexDirection: 'column', gap: '1px' }} title={`${activeUltEffect.name} (${activeUltEffect.secs}s)`}>
                <span style={{ fontSize: '14px' }}>{activeUltEffect.icon}</span>
                <small style={{ fontWeight: 900, color: '#facc15', fontSize: '9px' }}>{activeUltEffect.secs}s</small>
              </div>
            ) : (() => {
              const curChar = getCharacterById(selectedCharacterId)
              const canUse = energy >= curChar.ultimate.energyCost
              return (
                <button
                  className={`pvp-skill-btn pvp-ult-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                  onClick={triggerUltimateSkill}
                  disabled={!canUse}
                  title={`${curChar.ultimate.name}: ${curChar.ultimate.description} (Cần ${curChar.ultimate.energyCost}% NL)`}
                >
                  <span style={{ fontSize: '16px' }}>{curChar.ultimate.icon}</span>
                  <span style={{ fontWeight: 900 }}>TUYỆT KỸ</span>
                  <small style={{ color: canUse ? '#fde047' : '#94a3b8' }}>
                    {canUse ? 'SẴN SÀNG!' : `${curChar.ultimate.energyCost}% NL`}
                  </small>
                </button>
              )
            })()}

            {/* Chiêu 1: Đóng băng đối thủ */}
            <button
              className="pvp-skill-btn"
              onClick={() => triggerSkill('freeze')}
              disabled={energy < 30}
              title="Làm đóng băng đối thủ 3s (Tốn 30% NL)"
            >
              <Snowflake size={15} />
              <span>ĐÓNG BĂNG</span>
              <small>30% NL</small>
            </button>

            {/* Chiêu 2: Xáo bài đối thủ */}
            <button
              className="pvp-skill-btn"
              onClick={() => triggerSkill('scramble')}
              disabled={energy < 45}
              title="Xáo trộn vị trí các quân của đối thủ (Tốn 45% NL)"
            >
              <Wind size={15} />
              <span>XÁO BẢNG</span>
              <small>45% NL</small>
            </button>

            {/* Chiêu 3: Tung mù sương */}
            <button
              className="pvp-skill-btn"
              onClick={() => triggerSkill('fog')}
              disabled={energy < 35}
              title="Làm mờ bảng đối thủ trong 3.5s (Tốn 35% NL)"
            >
              <EyeOff size={15} />
              <span>TUNG MÙ</span>
              <small>35% NL</small>
            </button>

            <div style={{ fontSize: '12px', fontWeight: 800, color: '#cbd5e1', marginTop: '4px' }}>
              {score} : {rivalScore}
            </div>
          </div>

          {/* Cột Phải: Bảng của ĐỐI THỦ / BOSS */}
          <div className={`board-frame ${isRivalFrozen ? 'is-frozen' : ''} ${isRivalFogged ? 'is-fogged' : ''} ${playMode === 'campaign' && currentCampaignStage ? `chapter-env-${currentCampaignStage.chapterEnvEffect}` : ''}`}>
            {isRivalFrozen && <div className="debuff-banner">❄ ĐỐI THỦ BỊ ĐÓNG BĂNG!</div>}
            {isRivalFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 ĐỐI THỦ BỊ MÙ SƯƠNG!</div>}

            <div className="board-header">
              <div className="board-player-info">
                {playMode === 'campaign' && currentCampaignStage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img
                      src={getSpriteUrl(currentCampaignStage.bossPokemonId, 'artwork')}
                      alt={currentCampaignStage.bossName}
                      style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                    />
                    <span style={{ fontWeight: 900, color: '#fca5a5' }}>
                      👑 {currentCampaignStage.bossName} (BOSS)
                    </span>
                  </div>
                ) : (
                  <>
                    <CharacterAvatar
                      characterId={rivalCharacterId}
                      emotion={rivalEmotion}
                      size="sm"
                      showSpeech={rivalEmotion !== 'idle'}
                      useVideo={useVideoAvatar}
                    />
                    <span>{playMode === 'pvp-bot' ? `${curBot.name} (MÁY · CẤP ${curBot.level})` : (rivalName ? `${rivalName} (ĐỐI THỦ)` : 'Chờ người thứ 2... (TRỐNG)')}</span>
                  </>
                )}
              </div>
              <div className="board-score-pill" style={{ color: '#f43f5e' }}>
                {playMode === 'campaign' ? `${rivalScore} ĐIỂM` : playMode === 'pvp-bot' ? `${rivalScore} ĐIỂM` : (rivalName ? `${rivalScore} ĐIỂM` : 'TRỐNG')}
              </div>
            </div>

            {playMode === 'pvp-online' && !rivalName ? (
              <div className="empty-board-waiting-screen" style={{ minHeight: '260px' }}>
                <div style={{ fontSize: '36px' }}>⏳</div>
                <h4 style={{ color: '#cbd5e1', margin: 0, fontSize: '15px', fontWeight: 900 }}>VỊ TRÍ ĐỐI THỦ (ĐANG TRỐNG)</h4>
                <p style={{ color: '#94a3b8', fontSize: '12.5px', margin: 0 }}>
                  Chờ người thứ 2 nhập mã <strong style={{ color: '#facc15' }}>{roomCode}</strong> để vào bàn...
                </p>
              </div>
            ) : (
              <BoardView
                board={rivalBoard}
                cols={dims.cols}
                rows={dims.rows}
                selected={null}
                linkPath={rivalLinkPath}
                hintPair={null}
                isRival={true}
                spriteTheme={spriteTheme}
              />
            )}
          </div>

          {/* Cột Avatar Bên Phải: Nhân vật ĐỐI THỦ / MÁY */}
          <div className="pvp-avatar-column">
            <div className={`pvp-avatar-card is-rival ${playMode === 'campaign' ? 'is-boss-rival' : playMode === 'pvp-bot' ? 'is-bot-rival' : ''}`}>
              {playMode === 'campaign' && currentCampaignStage ? (
                <div className="arena-boss-avatar-wrapper">
                  <div className="arena-boss-aura" />
                  <img
                    src={getSpriteUrl(currentCampaignStage.bossPokemonId, 'artwork')}
                    alt={currentCampaignStage.bossName}
                    className="arena-boss-artwork"
                  />
                </div>
              ) : playMode === 'pvp-bot' ? (
                <div className="arena-bot-avatar-wrapper">
                  <img
                    src={getSpriteUrl(curBot.pokemonId, 'artwork')}
                    alt={curBot.name}
                    className="arena-bot-artwork"
                  />
                </div>
              ) : (
                <CharacterAvatar
                  domId="rival-active-avatar"
                  characterId={rivalCharacterId}
                  emotion={rivalEmotion}
                  size="sm"
                  shape="rect"
                  showSpeech={rivalEmotion !== 'idle'}
                  useVideo={useVideoAvatar}
                />
              )}
            </div>
            <span className="pvp-avatar-name">
              {playMode === 'campaign' && currentCampaignStage
                ? currentCampaignStage.bossName
                : playMode === 'pvp-bot'
                ? `${curBot.name} (Lv.${curBot.level})`
                : (rivalName || 'Chờ...')}
            </span>
            <span className="pvp-avatar-score" style={{ color: '#f43f5e' }}>{rivalScore} đ</span>
            <span className="pvp-avatar-label is-rival">
              {playMode === 'campaign' ? 'BOSS CỐT TRUYỆN' : playMode === 'pvp-bot' ? 'MÁY (BOT)' : 'ĐỐI THỦ'}
            </span>
            <div className="arena-rank-badge" style={{ color: activeRivalRankTier.color, borderColor: activeRivalRankTier.color }}>
              <span className="arena-rank-badge-icon">{activeRivalRankTier.icon}</span>
              <span className="arena-rank-badge-name">{activeRivalRankTier.name}</span>
              <span className="arena-rank-badge-rp">({activeRivalRp.toLocaleString()} RP)</span>
            </div>
            {playMode === 'campaign' && currentCampaignStage ? (
              <div className="pvp-boss-power-badge">
                ⚡ Lực Chiến: {currentCampaignStage.powerLevel.toLocaleString('vi-VN')}
              </div>
            ) : playMode === 'pvp-bot' && (
              <div className="pvp-bot-badge">
                {curBot.avatar} {curBot.title}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Bottom Action Bar (Chuẩn 5 Nút Theo Ảnh Của Người Dùng) ─── */}
      <footer className="bottom-bar-container">
        {/* Âm thanh */}
        <button
          className="action-btn"
          onClick={() => {
            setSoundEnabled(!soundEnabled)
            playSound('select', !soundEnabled)
          }}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>Âm thanh</span>
        </button>

        {/* Đổi vị trí */}
        <button
          className="action-btn"
          onClick={onShuffleClick}
          disabled={shufflesLeft <= 0}
        >
          <Shuffle size={18} />
          <span>Đổi vị trí</span>
        </button>

        {/* Gợi ý (Nổi bật màu vàng hổ phách kèm badge đỏ số 3 như trong ảnh) */}
        <button
          className="action-btn btn-hint"
          onClick={onHintClick}
          disabled={hintsLeft <= 0}
        >
          <Lightbulb size={18} />
          <span>Gợi ý</span>
          {hintsLeft > 0 && <span className="badge-hint">{hintsLeft}</span>}
        </button>

        {/* Cỡ bàn: Cố định trong trận, chỉ xem */}
        <div className="action-btn" style={{ cursor: 'default', opacity: 0.9 }}>
          <span>Cỡ bàn: <strong>{gridSize}</strong></span>
        </div>

        {/* Chơi lại */}
        <button className="action-btn" onClick={onRestart}>
          <RotateCcw size={18} />
          <span>Chơi lại</span>
        </button>
      </footer>

      {/* ─── Modals (Xếp Hạng, Cửa Hàng, Đăng Nhập, Xu Toast) ─── */}
      {renderSharedModals()}

      {/* ─── Hiệu Ứng Pháo Hoa / Confetti Ăn Mừng Chiến Thắng ─── */}
      {gameOver === 'win' && (
        <div className="confetti-overlay">
          {Array.from({ length: 36 }).map((_, idx) => (
            <div
              key={idx}
              className="confetti-piece"
              style={{
                left: `${(idx * 2.8) % 100}%`,
                background: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#a855f7', '#fbbf24', '#f43f5e'][idx % 7],
                animationDelay: `${(idx * 0.07) % 2}s`,
                // @ts-ignore
                '--fall-duration': `${2.2 + (idx % 5) * 0.4}s`,
                // @ts-ignore
                '--drift-x': `${((idx % 2 === 0 ? 1 : -1) * (30 + (idx * 7) % 60))}px`,
                // @ts-ignore
                '--rot': `${idx * 80 + 360}deg`,
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Modal Kết Thúc Trận Đấu ─── */}
      {gameOver && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', alignItems: 'center', maxWidth: '440px', width: '92%' }}>
            {/* Sân khấu vinh danh người chiến thắng & chia buồn người thất bại */}
            <div className="gameover-stage-container">
              {/* Nhân vật của người chơi */}
              <div className="stage-player-card">
                <CharacterAvatar
                  characterId={selectedCharacterId}
                  emotion={gameOver === 'win' ? 'win' : 'lose'}
                  size="lg"
                  showSpeech={true}
                  useVideo={useVideoAvatar}
                />
                {gameOver === 'win' ? (
                  <div className="stage-winner-pedestal">
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>🏆 VÔ ĐỊCH (BẠN)</span>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a' }}>{score} ĐIỂM</div>
                    <div className="gameover-rank-tag" style={{ color: userRank.color, borderColor: userRank.color }}>
                      <span>{userRank.icon}</span> <span>{userRank.name}</span> · <span style={{ color: '#facc15' }}>{rankPoints} RP</span>
                    </div>
                  </div>
                ) : (
                  <div className="stage-loser-ground">
                    <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 800 }}>🌧️ Thua Cuộc</span>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{score} đ</div>
                    <div className="gameover-rank-tag" style={{ color: userRank.color, borderColor: userRank.color }}>
                      <span>{userRank.icon}</span> <span>{userRank.name}</span> · <span style={{ color: '#facc15' }}>{rankPoints} RP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nhân vật của đối thủ (khi chơi PVP hoặc Đấu Bot) */}
              {playMode !== 'solo' && (
                <div className="stage-player-card">
                  <CharacterAvatar
                    characterId={rivalCharacterId}
                    emotion={gameOver === 'win' ? 'lose' : 'win'}
                    size="md"
                    showSpeech={true}
                    useVideo={useVideoAvatar}
                  />
                  {gameOver === 'win' ? (
                    <div className="stage-loser-ground">
                      <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 800 }}>
                        🌧️ {playMode === 'pvp-bot' ? `${curBot.name} (MÁY)` : 'Đối Thủ'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{rivalScore} đ</div>
                      <div className="gameover-rank-tag" style={{ color: activeRivalRankTier.color, borderColor: activeRivalRankTier.color }}>
                        <span>{activeRivalRankTier.icon}</span> <span>{activeRivalRankTier.name}</span> · <span style={{ color: '#facc15' }}>{activeRivalRp} RP</span>
                      </div>
                    </div>
                  ) : (
                    <div className="stage-winner-pedestal">
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>
                        🏆 {playMode === 'pvp-bot' ? `${curBot.name} (MÁY)` : 'ĐỐI THỦ'}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a' }}>{rivalScore} ĐIỂM</div>
                      <div className="gameover-rank-tag" style={{ color: activeRivalRankTier.color, borderColor: activeRivalRankTier.color }}>
                        <span>{activeRivalRankTier.icon}</span> <span>{activeRivalRankTier.name}</span> · <span style={{ color: '#facc15' }}>{activeRivalRp} RP</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ fontSize: '22px', fontWeight: 900, color: gameOver === 'win' ? '#facc15' : '#f43f5e' }}>
              {gameOver === 'win'
                ? (playMode === 'campaign'
                    ? '👑 TRẢM BOSS THÀNH CÔNG!'
                    : playMode === 'pvp-online'
                    ? '🏆 BẠN ĐÃ CHIẾN THẮNG TRẬN ĐẤU!'
                    : playMode === 'pvp-bot'
                    ? '🏆 BẠN ĐÃ CHIẾN THẮNG MÁY!'
                    : 'CHIẾN THẮNG HUY HOÀNG!')
                : (playMode === 'campaign'
                    ? '🌧️ THẤT BẠI TRƯỚC BOSS!'
                    : playMode === 'pvp-online'
                    ? '🌧️ BẠN ĐÃ THUA CUỘC!'
                    : playMode === 'pvp-bot'
                    ? '🌧️ BẠN ĐÃ THUA CUỘC!'
                    : 'HẾT THỜI GIAN!')}
            </div>

            {/* Hiệu ứng Cộng Điểm Xếp Hạng & Phần Thưởng Chiến Thắng */}
            {gameOver === 'win' && (
              <div className="victory-reward-card-animated">
                <div className="victory-reward-header">
                  <span className="victory-crown">👑</span>
                  <span className="victory-reward-title">PHẦN THƯỞNG CHIẾN THẮNG & THĂNG RANK</span>
                </div>

                {isRankUp && (
                  <div className="rank-up-banner-animated">
                    <span>🎉</span>
                    <span>CHÚC MỪNG BẠN ĐÃ THĂNG HẠNG: <strong>{userRank.name.toUpperCase()}</strong>!</span>
                    <span>✨</span>
                  </div>
                )}

                <div className="victory-gain-row">
                  {/* Điểm Rank RP */}
                  <div className="victory-gain-item rp-gain">
                    <div className="gain-label">ĐIỂM XẾP HẠNG (RP)</div>
                    <div className="gain-value-animated rp-glow">
                      +{lastEarnedRp || (playMode === 'pvp-online' ? 65 : 25)} RP
                    </div>
                    <div className="gain-tier-tag" style={{ color: userRank.color }}>
                      {userRank.icon} {userRank.name} · {rankPoints} RP
                    </div>
                  </div>

                  {/* Xu Thưởng */}
                  <div className="victory-gain-item coin-gain">
                    <div className="gain-label">XU THƯỞNG NHẬN ĐƯỢC</div>
                    <div className="gain-value-animated coin-glow">
                      +{lastEarnedCoins || (playMode === 'pvp-online' ? 200 : 100)} Xu
                    </div>
                    <div className="gain-balance-tag">
                      💰 Ví hiện tại: {coins} Xu
                    </div>
                  </div>
                </div>

                {/* Thanh Tiến Độ Rank Tier */}
                <div className="victory-rank-progress-box">
                  <div className="victory-rank-progress-header">
                    <span style={{ color: userRank.color, fontWeight: 900 }}>
                      {userRank.icon} BẬC {userRank.name.toUpperCase()}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>
                      {userRank.nextTierPoints ? `${rankPoints} / ${userRank.nextTierPoints} RP` : `${rankPoints} RP (Tối Thượng)`}
                    </span>
                  </div>
                  <div className="victory-rank-bar-track">
                    <div
                      className="victory-rank-bar-fill"
                      style={{
                        width: userRank.nextTierPoints
                          ? `${Math.min(100, Math.max(12, Math.round(((rankPoints - userRank.minPoints) / Math.max(1, userRank.nextTierPoints - userRank.minPoints)) * 100)))}%`
                          : '100%',
                        background: `linear-gradient(90deg, ${userRank.color}, #fde047)`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Thông báo trừ điểm khi thua trận PVP Online */}
            {gameOver === 'lose' && playMode === 'pvp-online' && (
              <div className="defeat-rp-card">
                <span style={{ color: '#f43f5e', fontWeight: 900, fontSize: '14px' }}>📉 -20 RP</span>
                <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                  Điểm xếp hạng: <strong style={{ color: userRank.color }}>{userRank.icon} {userRank.name} ({rankPoints} RP)</strong>
                </span>
              </div>
            )}

            {playMode === 'pvp-bot' && gameOver === 'win' && (
              <div className="game-over-bot-stars-card">
                <div className="bot-stars-rating-stars">
                  {[1, 2, 3].map(s => (
                    <span key={s} className={`game-over-star ${lastEarnedBotStars >= s ? 'earned' : 'missed'}`}>
                      {lastEarnedBotStars >= s ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#facc15' }}>
                  Đạt {lastEarnedBotStars || 1}/3 Sao · Cấp {curBot.level} ({curBot.name})
                </div>
              </div>
            )}

            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '8px 0 16px', lineHeight: 1.5 }}>
              {gameOver === 'win'
                ? (playMode === 'solo'
                    ? `Chúc mừng bạn đã xuất sắc hoàn thành bản đồ ván cờ với ${score} điểm!`
                    : playMode === 'campaign'
                    ? `Tuyệt vời! Bạn đã đánh bại Boss ${currentCampaignStage?.bossName || ''} (${score} vs ${rivalScore} điểm) và mở khóa ải tiếp theo!`
                    : playMode === 'pvp-online'
                    ? (currentRoomState?.lastAction?.type === 'leave'
                        ? `🚪 Đối thủ đã thoát trận hoặc mất kết nối! Bạn được xử thắng trực tiếp ván đấu này!`
                        : `🎉 Chúc mừng bạn đã hoàn thành bảng trước hoặc giành điểm số cao hơn đối thủ (${score} vs ${rivalScore} điểm)!`)
                    : `Chúc mừng bạn đã xuất sắc giành chiến thắng trước ${curBot.name} với ${score} điểm (máy: ${rivalScore} điểm)!`)
                : (playMode === 'solo'
                    ? `Hết thời gian mà bạn chưa hoàn thành xong bảng cờ (${score} điểm). Đừng nản lòng nhé!`
                    : playMode === 'campaign'
                    ? `Boss ${currentCampaignStage?.bossName || ''} đã giành chiến thắng (${rivalScore} vs ${score} điểm). Hãy rèn luyện để thử lại!`
                    : playMode === 'pvp-online'
                    ? `🌧️ Đối thủ (${rivalName || 'Đối thủ'}) đã chiến thắng (${rivalScore} vs ${score} điểm). Hãy phục thù ở trận tiếp theo!`
                    : `Bạn đã thua cuộc trước ${curBot.name} do thấp điểm hơn (${score} vs ${rivalScore} điểm). Hãy cố gắng ở trận sau!`)}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="modal-btn-primary" onClick={onRestart}>CHƠI LẠI</button>
              <button className="modal-btn-secondary" onClick={exitToMenu}>VỀ MENU</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default MirrorRushGame

