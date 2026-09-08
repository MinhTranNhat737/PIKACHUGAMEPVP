'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Volume2, VolumeX, Shuffle, Lightbulb, RotateCcw,
  Trophy, Users, User, Bot, Sparkles, Snowflake, Wind, EyeOff,
  Copy, Check, DoorOpen, LogOut, ArrowRight, ShieldAlert, Music,
  Coins, ShoppingBag, Lock, Unlock, KeyRound, LogIn, BookOpen
} from 'lucide-react'
import { playSound, startBgm, stopBgm, getIsBgmPlaying } from '@/lib/sound'
import { GridSizeKey, BoardMode, GRID_DIMS, Cell, Coord, RoomState, LeaderboardEntry, BOT_LEVELS, BotLevelConfig, getRankTier } from '@/lib/game-state'
import { SHOP_CATALOG, ShopItem, UserAccount } from '@/lib/shop-catalog'
import { CharacterAvatar } from '@/components/character-avatar'
import { CHARACTERS, CharacterEmotion, getCharacterById, UltimateSkill, PixelCharacter } from '@/lib/character-catalog'

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

type PlayMode = 'solo' | 'pvp-bot' | 'pvp-online'

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
  element: 'electric' | 'water' | 'holy' | 'astral' | 'shadow' | 'arrow' | 'cyber' | 'frost'
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
  return board
}

/* ──────────────────────────────────────────────
   Sub-Component: Interactive Board
   ────────────────────────────────────────────── */
function BoardView({
  board, cols, rows, selected, onSelect, linkPath, hintPair, isRival = false, spriteTheme = 'artwork',
  tileStyle = 'tile-classic', lineEffect = 'line-laser',
  isScrambling = false, shockwaves = [], matchParticles = [], floatingPopups = [],
  activeSkillZaps = []
}: {
  board: Cell[][]
  cols: number
  rows: number
  selected: Coord | null
  onSelect?: (coord: Coord) => void
  linkPath: Coord[] | null
  hintPair: [Coord, Coord] | null
  isRival?: boolean
  spriteTheme?: SpriteTheme
  tileStyle?: string
  lineEffect?: string
  isScrambling?: boolean
  shockwaves?: Array<{ id: string; x: number; y: number }>
  matchParticles?: Array<{ id: string; x: number; y: number; color: string; tx: number; ty: number }>
  floatingPopups?: Array<{ id: string; x: number; y: number; text: string; color: string }>
  activeSkillZaps?: ElementalZap[]
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
              const isEmptyCell = cell === null
              const activeZap = !isEmptyCell ? (activeSkillZaps || []).find(z => z.row === r && z.col === c) : null

              return (
                <div
                  key={`${r}-${c}`}
                  className={[
                    'pika-tile',
                    isEmptyCell ? 'empty' : '',
                    isSelected ? 'selected' : '',
                    isHint ? 'hinted' : '',
                    activeZap ? `elemental-zap elemental-zap-${activeZap.element}` : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !isRival && onSelect && onSelect({ row: r, col: c })}
                  style={{ cursor: isRival ? 'default' : 'pointer' }}
                >
                  {!isEmptyCell && (
                    <img
                      src={getSpriteUrl(cell, spriteTheme)}
                      alt={`Pika ${cell}`}
                      className={`pika-sprite ${spriteTheme === 'retro' ? 'sprite-pixelated' : ''}`}
                      loading="eager"
                    />
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
}

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
              Vượt Bot: Cấp {account.botLevel || 1}/15 · Đồ sở hữu: {account.unlockedItems?.length || 0} món
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

  // Configuration
  const [playMode, setPlayMode] = useState<PlayMode>('solo')
  const [gridSize, setGridSize] = useState<GridSizeKey>('14x8') // 2 sizes: 14x8 or 10x6
  const [boardMode, setBoardMode] = useState<BoardMode>('separate') // 'shared' or 'separate'
  const [spriteTheme, setSpriteTheme] = useState<SpriteTheme>('artwork')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [bgmEnabled, setBgmEnabled] = useState(true)

  const toggleBgm = useCallback(() => {
    if (bgmEnabled) {
      stopBgm()
      setBgmEnabled(false)
    } else {
      setBgmEnabled(true)
      startBgm()
    }
  }, [bgmEnabled])

  // Stop BGM on unmount
  useEffect(() => {
    return () => {
      stopBgm()
    }
  }, [])

  // Player & Account State
  const [user, setUser] = useState<UserAccount | null>(null)
  const [coins, setCoins] = useState<number>(100)
  const [botLevel, setBotLevel] = useState<number>(1)
  const [maxUnlockedBotLevel, setMaxUnlockedBotLevel] = useState<number>(1)
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

  // Rival Character based on Bot Level or PVP Mode
  const rivalCharacterId = useMemo(() => {
    if (playMode === 'pvp-bot') {
      const roster = ['paladin', 'ninja', 'mage', 'ranger', 'cyber', 'frost', 'kasumi', 'satoshi']
      return roster[(botLevel - 1) % roster.length]
    }
    return 'kasumi'
  }, [playMode, botLevel])

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
  const [energy, setEnergy] = useState(0) // 0-100% skill energy

  // Debuff states
  const [frozenUntil, setFrozenUntil] = useState(0)
  const [fogUntil, setFogUntil] = useState(0)

  // In-Game Dynamic FX States
  const [isScrambling, setIsScrambling] = useState(false)
  const [shockwaves, setShockwaves] = useState<Array<{ id: string; x: number; y: number }>>([])
  const [matchParticles, setMatchParticles] = useState<Array<{ id: string; x: number; y: number; color: string; tx: number; ty: number }>>([])
  const [floatingPopups, setFloatingPopups] = useState<Array<{ id: string; x: number; y: number; text: string; color: string }>>([])
  const [activeSkillZaps, setActiveSkillZaps] = useState<ElementalZap[]>([])

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

  // Dedicated Rank Leaderboard state
  const [leaderboardTab, setLeaderboardTab] = useState<'scores' | 'rankings'>('rankings')
  const [rankedPlayers, setRankedPlayers] = useState<Array<{
    username: string
    displayName: string
    characterId?: string
    rankPoints: number
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
    rivalCharId: string
    roomCode?: string
    isBot?: boolean
  } | null>(null)
  const matchmakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dims = GRID_DIMS[gridSize] || GRID_DIMS['14x8']
  const now = Date.now()
  const isImmune = immunityUntil > now
  const isMeFrozen = !isImmune && frozenUntil > now
  const isMeFogged = !isImmune && fogUntil > now
  const isRivalFrozen = rivalFrozenUntil > now
  const isRivalFogged = rivalFogUntil > now
  const userRank = useMemo(() => getRankTier(rankPoints), [rankPoints])

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

    if (gCoins) setCoins(parseInt(gCoins, 10))
    if (gLvl) setMaxUnlockedBotLevel(parseInt(gLvl, 10))
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
    if (u.rankPoints !== undefined) setRankPoints(u.rankPoints)
    if (u.characterId) setSelectedCharacterId(u.characterId)
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

    if (playMode === 'pvp-bot') {
      const bot = BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]
      const reward = bot.rewardCoins
      awardCoins(reward, `Chiến thắng ${bot.name} (Cấp ${bot.level})!`)

      if (botLevel >= maxUnlockedBotLevel && botLevel < 15) {
        const nextLvl = botLevel + 1
        setMaxUnlockedBotLevel(nextLvl)
        if (user) {
          fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'advance-level', username: user.username, level: nextLvl }),
          }).catch(() => { })
        } else if (typeof window !== 'undefined') {
          localStorage.setItem('PIKA_GUEST_BOT_LEVEL', nextLvl.toString())
        }
      }
    } else if (playMode === 'solo') {
      awardCoins(100, 'Chiến thắng chế độ Solo!')
    } else if (playMode === 'pvp-online') {
      awardCoins(200, 'Chiến thắng trận đối kháng PVP Online!')
      if (user) {
        setRankPoints(prev => prev + 60)
        fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-rank-points', username: user.username, rankPoints: 60 }),
        }).catch(() => { })
      }
    }
  }, [playMode, botLevel, maxUnlockedBotLevel, user, awardCoins, playerName])

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
    setNotice('CHÀO MỪNG ĐẾN VỚI PIKACHU CLASSIC!')
  }, [])

  // Start local match
  const startMatch = useCallback((size: GridSizeKey = gridSize) => {
    // Đảm bảo xóa sạch mã phòng và timer đồng bộ cũ
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
        // Different independent board for Rival bot!
        setRivalBoard(createLocalBoard(size))
      } else {
        // Shared board
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
  }, [gridSize, playMode, boardMode, bgmEnabled, botLevel])

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
          const isWin = score >= rivalScore
          setGameOver(isWin ? 'win' : 'lose')
          playSound(isWin ? 'win' : 'lose', soundEnabled)
          submitScoreToLeaderboard(score)
          if (isWin) {
            handleGameWin()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [inGame, gameOver, score, rivalScore, soundEnabled, submitScoreToLeaderboard, handleGameWin, timerFrozenUntil, playMode, rivalName])

  // Bot AI behavior in 'pvp-bot'
  useEffect(() => {
    if (!inGame || playMode !== 'pvp-bot' || gameOver || rivalBoard.length === 0) return
    if (isRivalFrozen) return

    const curBot = BOT_LEVELS.find(b => b.level === botLevel) || BOT_LEVELS[0]

    const runBotMove = () => {
      const minD = curBot.moveDelayMin
      const maxD = curBot.moveDelayMax
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
              }
              return next
            }
            return cur
          })
        } else {
          // Bot matches on its own separate board
          setRivalBoard(cur => {
            if (cur.length === 0) return cur
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
                setGameOver('lose')
                playSound('lose', soundEnabled)
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
  }, [inGame, playMode, gameOver, rivalBoard.length, isRivalFrozen, isRivalFogged, boardMode, dims.rows, dims.cols, score, rivalScore, soundEnabled])

  // Online multiplayer sync — Adaptive polling with since-param optimization
  const lastSyncUpdatedAtRef = useRef<number>(0)
  useEffect(() => {
    if (!inGame || playMode !== 'pvp-online' || !roomCode) return

    let currentInterval = 800 // Start at 800ms
    let idleCount = 0
    const FAST_INTERVAL = 800
    const SLOW_INTERVAL = 1200

    const syncRoom = async () => {
      try {
        const sinceParam = lastSyncUpdatedAtRef.current > 0 ? `?since=${lastSyncUpdatedAtRef.current}` : ''
        const res = await fetch(`/api/rooms/${roomCode}${sinceParam}`)
        const data = await res.json()

        // No changes since last sync — skip all state updates
        if (data.success && data.changed === false) {
          idleCount++
          // If idle for 3+ consecutive polls, slow down
          if (idleCount >= 3 && currentInterval < SLOW_INTERVAL) {
            currentInterval = SLOW_INTERVAL
            if (syncTimerRef.current) clearInterval(syncTimerRef.current)
            syncTimerRef.current = setInterval(syncRoom, currentInterval)
          }
          return
        }

        if (data.success && data.room) {
          // Activity detected — reset to fast polling
          idleCount = 0
          if (currentInterval > FAST_INTERVAL) {
            currentInterval = FAST_INTERVAL
            if (syncTimerRef.current) clearInterval(syncTimerRef.current)
            syncTimerRef.current = setInterval(syncRoom, currentInterval)
          }

          const room: RoomState = data.room
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
            setBoard(me.board)
          }

          if (me) {
            setScore(me.score)
            setEnergy(me.energy)
            setFrozenUntil(me.frozenUntil)
            setFogUntil(me.fogUntil)
          }

          if (opp) {
            setRivalName(opp.name)
            setRivalScore(opp.score)
            if (opp.board && opp.board.length > 0) {
              setRivalBoard(room.mode === 'shared' && room.sharedBoard ? room.sharedBoard : opp.board)
            }
            setRivalFrozenUntil(opp.frozenUntil)
            setRivalFogUntil(opp.fogUntil)
          }

          if (room.lastAction?.message) {
            setNotice(room.lastAction.message)
          }

          if (room.status === 'finished') {
            setGameOver(prev => {
              if (!prev) {
                if (room.winnerId === playerId) {
                  playSound('win', soundEnabled)
                  handleGameWin()
                  return 'win'
                } else {
                  playSound('lose', soundEnabled)
                  return 'lose'
                }
              }
              return prev
            })
          }
        }
      } catch {
        // ignore
      }
    }

    // Initial sync immediately
    syncRoom()
    syncTimerRef.current = setInterval(syncRoom, currentInterval)
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current)
      lastSyncUpdatedAtRef.current = 0
    }
  }, [inGame, playMode, roomCode, isHost, playerId, soundEnabled])

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
        }),
      })
      const data = await res.json()
      if (data.success && data.room) {
        setRoomCode(data.room.code)
        setIsHost(true)
        setGridSize('14x8')
        setPlayMode('pvp-online')
        // BÀN ĐỂ TRỐNG: Chờ người chơi thứ 2 vào bàn mới tạo bảng mới & tính thời gian
        setBoard([])
        setRivalBoard([])
        setRivalName('')
        setRivalScore(0)
        setScore(0)
        setTimeLeft(DEFAULT_TIME) // Chưa tính thời gian!
        setGameOver(null)
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

  /* ─── Match Actions ─── */
  const onTileSelect = (coord: Coord) => {
    if (gameOver || isMeFrozen) return
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

    const path = findLinkPath(board, selected, coord, dims.rows, dims.cols)
    const prevCoord = selected
    setSelected(null)

    if (!path) {
      setCombo(0)
      playSound('wrong', soundEnabled)
      setNotice('KHÔNG CÓ ĐƯỜNG NỐI HỢP LỆ (TỐI ĐA 2 KHÚC CUA)')
      return
    }

    // Match success!
    setLinkPath(path)
    playSound('match', soundEnabled)

    // Visual FX: Shockwaves, Star Particles & Floating Popups
    const ptAx = ((prevCoord.col + 0.5) / dims.cols) * 100
    const ptAy = ((prevCoord.row + 0.5) / dims.rows) * 100
    const ptBx = ((coord.col + 0.5) / dims.cols) * 100
    const ptBy = ((coord.row + 0.5) / dims.rows) * 100

    const midX = (ptAx + ptBx) / 2
    const midY = (ptAy + ptBy) / 2

    const swIdA = `sw_${Date.now()}_a`
    const swIdB = `sw_${Date.now()}_b`
    setShockwaves(prev => [...prev, { id: swIdA, x: ptAx, y: ptAy }, { id: swIdB, x: ptBx, y: ptBy }])

    // Generate burst particles at both tile centers
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

    const newCombo = combo + 1
    let addedPoints = 10 + (newCombo > 1 ? newCombo * 5 : 0)
    if (doubleScoreTurnsLeft > 0) {
      addedPoints *= 2
      setDoubleScoreTurnsLeft(d => Math.max(0, d - 1))
    }
    const newScore = score + addedPoints
    setScore(newScore)
    setCombo(newCombo)
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

    // Auto-clean visual effects after animation finishes
    setTimeout(() => {
      setShockwaves(prev => prev.filter(sw => sw.id !== swIdA && sw.id !== swIdB))
      setMatchParticles(prev => prev.filter(pt => !newParticles.some(np => np.id === pt.id)))
      setFloatingPopups(prev => prev.filter(fp => !popups.some(np => np.id === fp.id)))
    }, 750)

    if (newScore > highScore) {
      setHighScore(newScore)
      if (typeof window !== 'undefined') {
        localStorage.setItem('PIKA_HIGHSCORE', newScore.toString())
      }
      submitScoreToLeaderboard(newScore)
    }

    setNotice(`NỐI THÀNH CÔNG! +${addedPoints} ĐIỂM ${newCombo > 1 ? `(${newCombo}x COMBO!)` : ''}`)

    // Send match action to server IMMEDIATELY (don't wait for animation)
    if (playMode === 'pvp-online' && roomCode) {
      fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          action: {
            type: 'match',
            coordA: prevCoord,
            coordB: coord,
            points: addedPoints,
            combo: newCombo,
          },
        }),
      }).catch(() => { })
    }

    setTimeout(() => {
      setLinkPath(null)

      if (playMode !== 'pvp-online') {
        setBoard(cur => {
          const next = cur.map(r => [...r])
          next[prevCoord.row][prevCoord.col] = null
          next[coord.row][coord.col] = null

          const remaining = next.flat().filter(c => c !== null).length
          if (remaining === 0) {
            setGameOver('win')
            playSound('win', soundEnabled)
            submitScoreToLeaderboard(newScore)
            handleGameWin()
          } else {
            const pair = findAnyPair(next, dims.rows, dims.cols)
            if (!pair) {
              setNotice('HẾT CẶP KHẢ DỤNG · TỰ ĐỘNG ĐỔI VỊ TRÍ...')
              let shuffled = shuffleBoard(next, dims.rows, dims.cols)
              let tries = 0
              while (!findAnyPair(shuffled, dims.rows, dims.cols) && tries < 30) {
                shuffled = shuffleBoard(next, dims.rows, dims.cols)
                tries++
              }
              return shuffled
            }
          }
          return next
        })
      }
    }, 250)
  }

  /* ─── Active PVP Skills (Gây Bất Lợi Cho Đối Thủ) ─── */
  const triggerSkill = (skill: 'freeze' | 'scramble' | 'fog') => {
    if (gameOver) return

    if (skill === 'freeze' && energy >= 30) {
      setEnergy(e => e - 30)
      playSound('freeze', soundEnabled)
      setNotice('❄ BẠN ĐÃ ĐÓNG BĂNG ĐỐI THỦ 3 GIÂY!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      if (playMode === 'pvp-bot') {
        setRivalFrozenUntil(Date.now() + 3000)
      } else if (playMode === 'pvp-online' && roomCode) {
        fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, action: { type: 'freeze' } }),
        }).catch(() => { })
      }
    } else if (skill === 'scramble' && energy >= 45) {
      setEnergy(e => e - 45)
      playSound('scramble', soundEnabled)
      setNotice('🌪 BẠN ĐÃ XÁO TRỘN BẢNG CỦA ĐỐI THỦ!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      if (playMode === 'pvp-bot') {
        setRivalBoard(b => shuffleBoard(b, dims.rows, dims.cols))
      } else if (playMode === 'pvp-online' && roomCode) {
        fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, action: { type: 'scramble' } }),
        }).catch(() => { })
      }
    } else if (skill === 'fog' && energy >= 35) {
      setEnergy(e => e - 35)
      playSound('fog', soundEnabled)
      setNotice('🌫 BẠN ĐÃ TUNG KHÓI LÀM MỜ BẢNG ĐỐI THỦ 3.5S!')
      triggerPlayerEmotion('happy', 1500)
      triggerRivalEmotion('sad', 2200)

      if (playMode === 'pvp-bot') {
        setRivalFogUntil(Date.now() + 3500)
      } else if (playMode === 'pvp-online' && roomCode) {
        fetch(`/api/rooms/${roomCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, action: { type: 'fog' } }),
        }).catch(() => { })
      }
    }
  }

  /* ─── Chiêu Thức Cuối (Ultimate Skills) Cho Từng Nhân Vật ─── */
  const triggerUltimateSkill = useCallback(() => {
    if (gameOver) return
    const curChar = getCharacterById(selectedCharacterId)
    const cost = curChar.ultimate.energyCost

    if (energy < cost) {
      playSound('wrong', soundEnabled)
      setNotice(`CHƯA ĐỦ NĂNG LƯỢNG CHIÊU CUỐI! CẦN ${cost}% (HIỆN CÓ: ${energy}%)`)
      return
    }

    // Tiêu hao năng lượng
    setEnergy(e => Math.max(0, e - cost))

    // Bật hiệu ứng Cut-in Arcade đặc trưng
    setUltimateCutin({ character: curChar, active: true })
    playSound('match', soundEnabled)
    setNotice(`💥 ${curChar.name.toUpperCase()}: "${curChar.ultimate.voiceLine}"!`)
    triggerPlayerEmotion('combo', 2400)
    if (playMode !== 'solo') {
      triggerRivalEmotion('sad', 2400)
    }

    setTimeout(() => {
      setUltimateCutin(null)
    }, 1800)

    // Hàm bổ trợ kích hoạt hiệu ứng giật tan biến theo nguyên tố trên bảng
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
      setTimeout(() => {
        setBoard(newBoard)
        setScore(s => s + points)
        setActiveSkillZaps([])
        if (onComplete) onComplete()
      }, 450)
    }

    // Thực thi hiệu ứng riêng biệt của từng nhân vật trong số 8 nhân vật
    switch (curChar.id) {
      case 'satoshi': {
        // Sấm Sét Điên Cuồng: Giật sét đánh tan 3 cặp + choáng đối thủ 2.5s
        playSound('thunder', soundEnabled)
        const res = findPairsToClear(board, 3, dims.rows, dims.cols)
        if (res.cleared > 0) {
          const pts = res.points * (doubleScoreTurnsLeft > 0 ? 2 : 1)
          setNotice(`⚡ SẤM SÉT 10 VẠN VÔN! Tia sét giật sạch ${res.cleared} cặp Pokémon (+${pts}đ)!`)
          applyElementalZap(res.pairs, 'electric', '⚡', res.newBoard, pts)
        }
        if (playMode !== 'solo') {
          setRivalFrozenUntil(Date.now() + 2500)
        }
        break
      }
      case 'kasumi': {
        // Đại Hồng Thủy: Cuộn xoáy sóng thần quét sạch 2 cặp + thanh lọc debuff + trơn trượt đối thủ 3.5s
        playSound('water', soundEnabled)
        setFrozenUntil(0)
        setFogUntil(0)
        const res = findPairsToClear(board, 2, dims.rows, dims.cols)
        if (res.cleared > 0) {
          const pts = res.points * (doubleScoreTurnsLeft > 0 ? 2 : 1)
          setNotice(`🌊 ĐẠI HỒNG THỦY! Thủy triều cuốn sạch ${res.cleared} cặp Pokémon & thanh lọc mọi hiệu ứng!`)
          applyElementalZap(res.pairs, 'water', '🌊', res.newBoard, pts)
        }
        if (playMode !== 'solo') {
          setRivalFogUntil(Date.now() + 3500)
        }
        break
      }
      case 'paladin': {
        // Hào Quang Bất Hoại: Cột sáng hoàng kim miễn nhiễm 6s + x2 điểm 5 nước đi tiếp theo
        playSound('holy', soundEnabled)
        setImmunityUntil(Date.now() + 6000)
        setDoubleScoreTurnsLeft(5)
        setNotice(`🛡️ HÀO QUANG BẤT HOẠI KÍCH HOẠT! Thánh quang che chở 6s & x2 toàn bộ điểm 5 nước nối!`)
        break
      }
      case 'mage': {
        // Lỗ Đen Thời Không: Hố đen vũ trụ hút sập 4 cặp + tặng 1 gợi ý
        playSound('astral', soundEnabled)
        const res = findPairsToClear(board, 4, dims.rows, dims.cols)
        setHintsLeft(h => h + 1)
        if (res.cleared > 0) {
          const pts = res.points * (doubleScoreTurnsLeft > 0 ? 2 : 1)
          setNotice(`🔮 LỖ ĐEN THỜI KHÔNG! Hút xoáy ${res.cleared} cặp Pokémon (+${pts}đ) & tặng +1 Gợi Ý!`)
          applyElementalZap(res.pairs, 'astral', '🔮', res.newBoard, pts)
        }
        break
      }
      case 'ninja': {
        // Phi Tiêu Hắc Ám: Vô ảnh trảm xé toạc 2 cặp + tung mù đen đối thủ 4.5s
        playSound('slash', soundEnabled)
        const res = findPairsToClear(board, 2, dims.rows, dims.cols)
        if (res.cleared > 0) {
          const pts = res.points * (doubleScoreTurnsLeft > 0 ? 2 : 1)
          setNotice(`🥷 PHI TIÊU HẮC ÁM! Vô ảnh trảm triệt hạ ${res.cleared} cặp cờ & tung khói mù đen đối thủ 4.5s!`)
          applyElementalZap(res.pairs, 'shadow', '⚔️', res.newBoard, pts)
        }
        if (playMode !== 'solo') {
          setRivalFogUntil(Date.now() + 4500)
        }
        break
      }
      case 'ranger': {
        // Mưa Tên Thần Tốc: Mưa tên tinh linh cắm phá 1 cặp + hồi +2 Lượt Đổi & +1 Gợi Ý
        playSound('arrow', soundEnabled)
        const res = findPairsToClear(board, 1, dims.rows, dims.cols)
        setShufflesLeft(s => s + 2)
        setHintsLeft(h => h + 1)
        if (res.cleared > 0) {
          const pts = res.points * (doubleScoreTurnsLeft > 0 ? 2 : 1)
          setNotice(`🏹 MƯA TÊN THẦN TỐC! Bắn tan 1 cặp Pokémon, hồi phục +2 Lượt Đổi & +1 Gợi Ý!`)
          applyElementalZap(res.pairs, 'arrow', '🏹', res.newBoard, pts)
        }
        break
      }
      case 'cyber': {
        // Nhát Chém Quá Tải: Glitch số hóa +15s thời gian + nhân 3 combo hiện tại
        playSound('cyber', soundEnabled)
        setTimeLeft(t => t + 15)
        setCombo(c => Math.max(2, c * 3))
        setNotice(`⚡ NHÁT CHÉM QUÁ TẢI! Hack +15s thời gian thi đấu và nhân 3 chuỗi Combo!`)
        break
      }
      case 'frost': {
        // Bão Tuyết Đóng Băng: Đóng băng đối thủ 4.5s + đóng băng đồng hồ ván đấu 6s
        playSound('freeze', soundEnabled)
        setTimerFrozenUntil(Date.now() + 6000)
        if (playMode !== 'solo') {
          setRivalFrozenUntil(Date.now() + 4500)
        }
        setNotice(`❄️ BÃO TUYẾT ĐỐNG BĂNG! Đóng băng đối thủ 4.5s & đóng băng đồng hồ ván đấu 6 giây!`)
        break
      }
    }
  }, [gameOver, selectedCharacterId, energy, soundEnabled, playMode, board, dims.rows, dims.cols, doubleScoreTurnsLeft, triggerPlayerEmotion, triggerRivalEmotion])

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
      rivalRankTier?: { name: string; icon: string }
      rivalCharacterId?: string
      roomCode?: string
      isBot?: boolean
      isHost?: boolean
    }) => {
      if (matchmakingTimerRef.current) {
        clearInterval(matchmakingTimerRef.current)
        matchmakingTimerRef.current = null
      }

      setFoundMatch({
        rivalName: matchInfo.rivalName,
        rivalRank: matchInfo.rivalRankTier?.name || 'Tân Binh',
        rivalRankIcon: matchInfo.rivalRankTier?.icon || '🥉',
        rivalCharId: matchInfo.rivalCharacterId || 'kasumi',
        roomCode: matchInfo.roomCode,
        isBot: matchInfo.isBot,
      })

      playSound('match', soundEnabled)

      // Show VS faceoff for 2.2 seconds, then launch match
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
      }, 2200)
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

    let next = shuffleBoard(board, dims.rows, dims.cols)
    let tries = 0
    while (!findAnyPair(next, dims.rows, dims.cols) && tries < 40) {
      next = shuffleBoard(board, dims.rows, dims.cols)
      tries++
    }
    setBoard(next)
    setSelected(null)
    setHintPair(null)
    setNotice(`ĐÃ ĐỔI VỊ TRÍ! CÒN ${shufflesLeft - 1} LƯỢT.`)

    if (playMode === 'pvp-online' && roomCode) {
      fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action: { type: 'shuffle', newBoard: next } }),
      }).catch(() => { })
    }
  }

  const onHintClick = () => {
    if (hintsLeft <= 0 || gameOver) return
    const pair = findAnyPair(board, dims.rows, dims.cols)
    if (pair) {
      playSound('hint', soundEnabled)
      setHintsLeft(h => h - 1)
      setHintPair(pair)
      setNotice(`GỢI Ý ĐÃ SÁNG! CÒN ${hintsLeft - 1} LẦN.`)
      setTimeout(() => setHintPair(null), 4000)
    } else {
      setNotice('KHÔNG CÒN CẶP HỢP LỆ ĐỂ GỢI Ý!')
    }
  }

  const onRestart = () => {
    if (playMode === 'pvp-online' && roomCode) {
      fetch(`/api/rooms/${roomCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, action: { type: 'restart' } }),
      }).catch(() => { })
    } else {
      startMatch(gridSize)
    }
  }

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / DEFAULT_TIME) * 100))

  const renderSharedModals = () => (
    <>
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
                      <strong>Đấu Với Máy (15 Cấp Độ AI)</strong>
                      <p>
                        Đối đầu với 15 Pokémon AI từ Cấp 1 (Caterpie - phản xạ chậm 8s) đến Cấp 15 (Mewtwo - thần tốc 1s). Thắng mỗi cấp mở khóa cấp tiếp theo và nhận từ <strong>+50 đến +400 Xu</strong>!
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

      {/* 💥 Hiệu Ứng Cut-in Arcade Chiêu Thức Cuối (Ultimate Skill) */}
      {ultimateCutin && ultimateCutin.active && (
        <div className="ultimate-cutin-overlay" style={{ background: ultimateCutin.character.ultimate.bannerColor }}>
          <div className="ultimate-cutin-content">
            <div className="ultimate-cutin-character">
              <CharacterAvatar
                characterId={ultimateCutin.character.id}
                emotion="combo"
                size="lg"
                interactive={false}
              />
            </div>
            <div className="ultimate-cutin-text">
              <div className="ultimate-cutin-title">
                <span>{ultimateCutin.character.ultimate.icon}</span>
                <span>{ultimateCutin.character.ultimate.name}</span>
              </div>
              <div className="ultimate-cutin-quote">
                "{ultimateCutin.character.ultimate.voiceLine}"
              </div>
              <div className="ultimate-cutin-desc">
                {ultimateCutin.character.ultimate.description}
              </div>
            </div>
          </div>
        </div>
      )}

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
                      {userRank.icon} {userRank.name}
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
                      {foundMatch.rivalRankIcon} {foundMatch.rivalRank}
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
     SCREEN 1: LOBBY / MENU (Giao Diện Ban Đầu)
     ══════════════════════════════════════════════ */
  if (!inGame) {
    return (
      <main className="pikachu-app" style={{ position: 'relative', overflowX: 'hidden' }}>
        {/* Portrait Orientation Lock Overlay - Mobile Only */}
        <div className="portrait-lock-overlay">
          <div className="portrait-lock-content">
            <div className="portrait-lock-icon">📱</div>
            <div className="portrait-lock-arrow">↻</div>
            <h2 className="portrait-lock-title">Xoay Ngang Điện Thoại</h2>
            <p className="portrait-lock-desc">Để có trải nghiệm chơi tốt nhất, vui lòng xoay ngang điện thoại của bạn!</p>
            <div className="portrait-lock-hint">⚡ PIKACHU CLASSIC ⚡</div>
          </div>
        </div>
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
                <Music size={14} />
                <span>Nhạc 8-bit: <strong>{bgmEnabled ? 'BẬT' : 'TẮT'}</strong></span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CharacterAvatar
                characterId={selectedCharacterId}
                emotion="idle"
                size="sm"
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: '14.5px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
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

            {/* CHỌN NHÂN VẬT PIXEL ART (Tối giản: Chỉ hiển thị Avatar + Tên + Tuyệt kỹ) */}
            <div className="char-select-box">
              <div className="char-select-header">
                <div className="char-select-title">
                  <span>👾</span>
                  <span>CHỌN NHÂN VẬT PIXEL ART</span>
                  {user ? (
                    <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(34,197,94,0.2)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(34,197,94,0.4)', textTransform: 'none', fontWeight: 800 }}>
                      ✓ Đã mở khóa 8 nhân vật
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#fde047', background: 'rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.4)', textTransform: 'none', fontWeight: 800 }}>
                      Mặc định: Satoshi
                    </span>
                  )}
                </div>
              </div>

              <div className="char-select-grid">
                {CHARACTERS.map(c => {
                  const isSelected = selectedCharacterId === c.id
                  const isLocked = !user && c.id !== 'satoshi'

                  return (
                    <div
                      key={c.id}
                      className={`char-card-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => handleSelectCharacter(c.id)}
                      title={isLocked ? `Đăng nhập để chọn ${c.name}` : c.name}
                    >
                      {isSelected && <div className="char-card-active-check">✓</div>}
                      {isLocked && (
                        <div className="char-card-lock-badge">
                          <Lock size={10} /> Khóa
                        </div>
                      )}

                      <CharacterAvatar
                        characterId={c.id}
                        emotion={isSelected ? 'happy' : 'idle'}
                        size="sm"
                        interactive={false}
                      />

                      <div className="char-card-name" style={{ color: isSelected ? '#fde047' : '#ffffff' }}>
                        {c.name}
                      </div>

                      {/* Huy hiệu Chiêu Thức Cuối của nhân vật */}
                      <div className="char-card-ult-badge" style={{ background: `${c.ultimate.bannerColor}28`, borderColor: `${c.ultimate.bannerColor}77` }}>
                        <span>{c.ultimate.icon}</span>
                        <span style={{ fontSize: '10.5px', fontWeight: 900, color: '#ffffff' }}>{c.ultimate.name}</span>
                        <span style={{ fontSize: '9.5px', color: '#fde047', fontWeight: 800 }}>({c.ultimate.energyCost}%)</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ĐẤU XẾP HẠNG ONLINE (RANKED MATCHMAKING) */}
            <div className={`ranked-match-card ${!user ? 'guest-locked' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '26px', background: 'rgba(250,204,21,0.15)', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid rgba(250,204,21,0.3)' }}>
                    ⚔️
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '15px', color: '#ffffff', letterSpacing: '0.03em', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>ĐẤU XẾP HẠNG (RANKED)</strong>
                      {user ? (
                        <span className="rank-pill" style={{ color: userRank.color, borderColor: userRank.color, fontSize: '11.5px', fontWeight: 800 }}>
                          {userRank.icon} {userRank.name} ({rankPoints.toLocaleString()} RP)
                        </span>
                      ) : (
                        <span className="rank-pill" style={{ color: '#cbd5e1', borderColor: '#64748b', fontSize: '11.5px', fontWeight: 800 }}>
                          🔒 Cần Đăng Nhập
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginTop: '2px', textShadow: '0 1px 2px #000' }}>
                      {user ? (
                        <span>Bậc Rank: <strong style={{ color: userRank.color }}>{userRank.name}</strong> · Ghép cặp tương đương trình độ</span>
                      ) : (
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>Khách chỉ chơi Solo & Đấu Bot · Đăng nhập để mở khóa Đấu Rank</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn-ranked-bxh"
                    onClick={() => {
                      setShowLeaderboard(true)
                      setLeaderboardTab('rankings')
                      fetchRankings()
                    }}
                    title="Xem Bảng Xếp Hạng Rank"
                  >
                    👑 BXH Rank
                  </button>

                  <button
                    className="btn-ranked-queue"
                    onClick={startMatchmaking}
                    title={user ? "Tìm trận đấu xếp hạng nhanh" : "Đăng nhập để tham gia đấu rank"}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 900 }}>{user ? '📡 TÌM TRẬN NHANH' : '🔒 ĐĂNG NHẬP ĐẤU RANK'}</span>
                    <small style={{ fontSize: '10px', opacity: 0.9 }}>{user ? '~8s có trận' : 'Mở khóa bậc Rank'}</small>
                  </button>
                </div>
              </div>
            </div>

            <div className="lobby-card-section">
              <div className="lobby-section-title">
                <Sparkles size={15} /> CHẾ ĐỘ CHƠI TÙY CHỌN
              </div>
              <div className="mode-grid-3">
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
              </div>
            </div>

            {playMode === 'pvp-bot' && (
              <div className="lobby-card-section">
                <div className="lobby-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><Bot size={15} color="#38bdf8" /> CHỌN CẤP ĐỘ BOT (15 CẤP ĐỘ)</span>
                  <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 700 }}>
                    Tiến độ: Cấp {maxUnlockedBotLevel}/15
                  </span>
                </div>
                <div className="bot-level-grid">
                  {BOT_LEVELS.map(bot => {
                    const isUnlocked = bot.level <= maxUnlockedBotLevel
                    const isSelected = botLevel === bot.level
                    return (
                      <button
                        key={bot.level}
                        disabled={!isUnlocked}
                        className={`bot-level-card ${isSelected ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`}
                        onClick={() => isUnlocked && setBotLevel(bot.level)}
                        title={isUnlocked ? `${bot.name} (${bot.title}) - Thưởng: +${bot.rewardCoins} Xu` : `Cần thắng Cấp ${bot.level - 1} để mở khóa`}
                      >
                        <div className="bot-level-header">
                          <span className="bot-level-badge">Lv.{bot.level}</span>
                          {!isUnlocked && <Lock size={12} color="#94a3b8" />}
                        </div>
                        <div className="bot-level-avatar">{bot.avatar}</div>
                        <div className="bot-level-name">{bot.name}</div>
                        <div className="bot-level-reward">
                          <Coins size={11} color="#facc15" /> +{bot.rewardCoins}
                        </div>
                      </button>
                    )
                  })}
                </div>
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
    <main className="pikachu-app">
      {/* Portrait Orientation Lock Overlay - Mobile Only */}
      <div className="portrait-lock-overlay">
        <div className="portrait-lock-content">
          <div className="portrait-lock-icon">📱</div>
          <div className="portrait-lock-arrow">↻</div>
          <h2 className="portrait-lock-title">Xoay Ngang Điện Thoại</h2>
          <p className="portrait-lock-desc">Để có trải nghiệm chơi tốt nhất, vui lòng xoay ngang điện thoại của bạn!</p>
          <div className="portrait-lock-hint">⚡ PIKACHU CLASSIC ⚡</div>
        </div>
      </div>
      {/* Top Navigation Bar: Nút Về Menu & Trạng Thái Phòng */}
      <div className="top-nav-bar">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            <Music size={14} color={bgmEnabled ? '#34d399' : '#94a3b8'} />
            <span>Nhạc: <strong style={{ color: bgmEnabled ? '#34d399' : '#94a3b8' }}>{bgmEnabled ? 'BẬT' : 'TẮT'}</strong></span>
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
            <div className="coins-badge" style={{ padding: '3px 10px', fontSize: '12px' }}>
              <Coins size={13} color="#facc15" />
              <span>{coins.toLocaleString()} Xu</span>
            </div>
          )}

          <span className="game-mode-tag">
            {playMode === 'solo'
              ? 'Chơi Đơn (Solo)'
              : playMode === 'pvp-bot'
                ? `Đấu Bot AI · ${boardMode === 'shared' ? 'Chung Bảng' : 'Riêng Bảng'}`
                : `PVP Online · ${boardMode === 'shared' ? 'Chung Bảng' : 'Riêng Bảng'}`}
          </span>

          {roomCode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(250,204,21,0.15)', padding: '4px 10px', borderRadius: '9999px', border: '1px solid rgba(250,204,21,0.4)', fontSize: '12px', fontWeight: 800, color: '#facc15' }}>
              <span>Phòng: {roomCode}</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(roomCode)
                  setCopiedCode(true)
                  setTimeout(() => setCopiedCode(false), 2000)
                }}
                style={{ background: 'none', border: 'none', color: '#facc15' }}
              >
                {copiedCode ? <Check size={13} /> : <Copy size={13} />}
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
        <section className="arena-solo">
          <div className={`board-frame ${isMeFrozen ? 'is-frozen' : ''} ${isMeFogged ? 'is-fogged' : ''} ${combo >= 2 ? 'combo-on-fire' : ''} ${equipped.boardTheme} ${equipped.boardFrame}`} style={{ width: '100%' }}>
            {isImmune && <div className="debuff-banner" style={{ background: 'rgba(56,189,248,0.25)', color: '#38bdf8', borderColor: '#38bdf8' }}>🛡️ HÀO QUANG BẤT HOẠI (MIỄN NHIỄM HIỆU ỨNG)</div>}
            {doubleScoreTurnsLeft > 0 && <div className="debuff-banner" style={{ background: 'rgba(250,204,21,0.25)', color: '#facc15', borderColor: '#facc15' }}>⚡ X2 ĐIỂM SỐ ({doubleScoreTurnsLeft} NƯỚC NỐI TIẾP THEO)</div>}
            {timerFrozenUntil > Date.now() && <div className="debuff-banner" style={{ background: 'rgba(147,197,253,0.25)', color: '#bfdbfe', borderColor: '#bfdbfe' }}>❄️ ĐỒNG HỒ ĐANG NGƯNG ĐỌNG</div>}
            {isMeFrozen && <div className="debuff-banner">❄ BẠN ĐANG BỊ ĐÓNG BĂNG!</div>}
            {isMeFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 BẠN ĐANG BỊ MÙ SƯƠNG!</div>}
            {combo >= 2 && <div className="combo-fire-banner">🔥 COMBO x{combo}! ON FIRE 🔥</div>}

            {playMode === 'solo' && (
              <div className="board-header" style={{ justifyContent: 'space-between', padding: '6px 14px' }}>
                <div className="board-player-info">
                  <CharacterAvatar characterId={selectedCharacterId} emotion={playerEmotion} size="sm" showSpeech={playerEmotion !== 'idle'} />
                  <span>{playerName}</span>
                </div>
                {/* Nút Tuyệt Kỹ Solo */}
                {(() => {
                  const curChar = getCharacterById(selectedCharacterId)
                  const canUse = energy >= curChar.ultimate.energyCost
                  return (
                    <button
                      className={`ultimate-skill-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                      onClick={triggerUltimateSkill}
                      disabled={!canUse}
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      title={`${curChar.ultimate.name}: ${curChar.ultimate.description} (Cần ${curChar.ultimate.energyCost}% NL)`}
                    >
                      <span style={{ fontSize: '15px' }}>{curChar.ultimate.icon}</span>
                      <span className="ult-name" style={{ fontSize: '11px' }}>{curChar.ultimate.name}</span>
                      <small style={{ fontSize: '10px', color: '#facc15' }}>({energy}/{curChar.ultimate.energyCost}%)</small>
                    </button>
                  )
                })()}
              </div>
            )}

            {playMode !== 'solo' && boardMode === 'shared' && (
              <div className="board-header">
                <div className="board-player-info">
                  <CharacterAvatar characterId={selectedCharacterId} emotion={playerEmotion} size="sm" showSpeech={playerEmotion !== 'idle'} />
                  <span>{playerName}: <strong style={{ color: '#facc15' }}>{score} đ</strong></span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#22c55e' }}>
                  BÀN CHUNG
                </div>
                <div className="board-player-info">
                  <span>{rivalName}: <strong style={{ color: '#f43f5e' }}>{rivalScore} đ</strong></span>
                  <CharacterAvatar characterId={rivalCharacterId} emotion={rivalEmotion} size="sm" showSpeech={rivalEmotion !== 'idle'} />
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
                onSelect={onTileSelect}
                linkPath={linkPath}
                hintPair={hintPair}
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
        </section>
      ) : (
        /* CHẾ ĐỘ RIÊNG BẢNG (2 Bảng Khác Nhau Ở 2 Bên Trái - Phải + Chiêu Thức) */
        <section className="arena-pvp">
          {/* Cột Trái: Bảng của BẠN */}
          <div className={`board-frame ${isMeFrozen ? 'is-frozen' : ''} ${isMeFogged ? 'is-fogged' : ''} ${combo >= 2 ? 'combo-on-fire' : ''} ${equipped.boardTheme} ${equipped.boardFrame}`}>
            {isImmune && <div className="debuff-banner" style={{ background: 'rgba(56,189,248,0.25)', color: '#38bdf8', borderColor: '#38bdf8' }}>🛡️ HÀO QUANG BẤT HOẠI (MIỄN NHIỄM)</div>}
            {doubleScoreTurnsLeft > 0 && <div className="debuff-banner" style={{ background: 'rgba(250,204,21,0.25)', color: '#facc15', borderColor: '#facc15' }}>⚡ X2 ĐIỂM SỐ ({doubleScoreTurnsLeft} NƯỚC)</div>}
            {timerFrozenUntil > Date.now() && <div className="debuff-banner" style={{ background: 'rgba(147,197,253,0.25)', color: '#bfdbfe', borderColor: '#bfdbfe' }}>❄️ ĐỒNG HỒ ĐANG NGƯNG ĐỌNG</div>}
            {isMeFrozen && <div className="debuff-banner">❄ BẠN ĐANG BỊ ĐÓNG BĂNG!</div>}
            {isMeFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 BỊ MÙ SƯƠNG!</div>}
            {combo >= 2 && <div className="combo-fire-banner">🔥 COMBO x{combo}! ON FIRE 🔥</div>}

            <div className="board-header">
              <div className="board-player-info">
                <CharacterAvatar characterId={selectedCharacterId} emotion={playerEmotion} size="sm" showSpeech={playerEmotion !== 'idle'} />
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
                onSelect={onTileSelect}
                linkPath={linkPath}
                hintPair={hintPair}
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

            {/* Thanh Năng Lượng Chiêu Thức */}
            <div style={{ fontSize: '9px', fontWeight: 800, color: '#38bdf8' }}>NĂNG LƯỢNG: {energy}%</div>
            <div className="energy-bar-shell">
              <div className="energy-bar-fill" style={{ width: `${energy}%` }} />
            </div>

            {/* CHIÊU THỨC CUỐI ĐẶC BIỆT CỦA NHÂN VẬT ĐANG DÙNG */}
            {(() => {
              const curChar = getCharacterById(selectedCharacterId)
              const canUse = energy >= curChar.ultimate.energyCost
              return (
                <button
                  className={`ultimate-skill-btn char-${curChar.id} ${canUse ? 'ready' : ''}`}
                  onClick={triggerUltimateSkill}
                  disabled={!canUse}
                  title={`${curChar.ultimate.name}: ${curChar.ultimate.description} (Cần ${curChar.ultimate.energyCost}% NL)`}
                >
                  <div style={{ fontSize: '18px' }}>{curChar.ultimate.icon}</div>
                  <div className="ult-text-wrap">
                    <span className="ult-name">{curChar.ultimate.name}</span>
                    <span className="ult-cost">{curChar.ultimate.energyCost}% NL {canUse ? '· SẴN SÀNG!' : ''}</span>
                  </div>
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

          {/* Cột Phải: Bảng của ĐỐI THỦ */}
          <div className={`board-frame ${isRivalFrozen ? 'is-frozen' : ''} ${isRivalFogged ? 'is-fogged' : ''}`}>
            {isRivalFrozen && <div className="debuff-banner">❄ ĐỐI THỦ BỊ ĐÓNG BĂNG!</div>}
            {isRivalFogged && <div className="debuff-banner" style={{ color: '#94a3b8', borderColor: '#94a3b8' }}>🌫 ĐỐI THỦ BỊ MÙ SƯƠNG!</div>}

            <div className="board-header">
              <div className="board-player-info">
                <CharacterAvatar characterId={rivalCharacterId} emotion={rivalEmotion} size="sm" showSpeech={rivalEmotion !== 'idle'} />
                <span>{rivalName ? `${rivalName} (ĐỐI THỦ)` : 'Chờ người thứ 2... (TRỐNG)'}</span>
              </div>
              <div className="board-score-pill" style={{ color: '#f43f5e' }}>
                {rivalName ? `${rivalScore} ĐIỂM` : 'TRỐNG'}
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
                />
                {gameOver === 'win' ? (
                  <div className="stage-winner-pedestal">
                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>🏆 VÔ ĐỊCH (BẠN)</span>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a' }}>{score} ĐIỂM</div>
                  </div>
                ) : (
                  <div className="stage-loser-ground">
                    <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 800 }}>🌧️ Thua Cuộc</span>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{score} đ</div>
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
                  />
                  {gameOver === 'win' ? (
                    <div className="stage-loser-ground">
                      <span style={{ fontSize: '10px', color: '#f43f5e', fontWeight: 800 }}>🌧️ Đối Thủ</span>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{rivalScore} đ</div>
                    </div>
                  ) : (
                    <div className="stage-winner-pedestal">
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f172a' }}>🏆 ĐỐI THỦ</span>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#fef08a' }}>{rivalScore} ĐIỂM</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ fontSize: '22px', fontWeight: 900, color: gameOver === 'win' ? '#facc15' : '#f43f5e' }}>
              {gameOver === 'win' ? 'CHIẾN THẮNG HUY HOÀNG!' : 'TRẬN ĐẤU KẾT THÚC!'}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '6px 0 14px' }}>
              {gameOver === 'win'
                ? `Chúc mừng bạn đã xuất sắc chiến thắng ván cờ với ${score} điểm!`
                : `Đối thủ đã hoàn thành trước hoặc thời gian thi đấu đã hết. Đừng nản lòng nhé!`}
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

