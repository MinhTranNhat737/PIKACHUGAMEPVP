'use client'

import React from 'react'
import { CharacterEmotion, PixelCharacter, getCharacterById } from '@/lib/character-catalog'

interface CharacterAvatarProps {
  characterId?: string
  emotion?: CharacterEmotion
  size?: 'sm' | 'md' | 'lg' | 'hero'
  showSpeech?: boolean
  showBadge?: boolean
  showUltimateBadge?: boolean
  onClick?: () => void
  interactive?: boolean
}

export function CharacterAvatar({
  characterId = 'satoshi',
  emotion = 'idle',
  size = 'md',
  showSpeech = false,
  showBadge = false,
  showUltimateBadge = false,
  onClick,
  interactive = false,
}: CharacterAvatarProps) {
  const char = getCharacterById(characterId)

  const sizePixels = size === 'sm' ? 42 : size === 'md' ? 68 : size === 'lg' ? 96 : 130

  // SVG Pixel art character faces/sprites with distinct colors, outfits, hairstyles, and facial expressions
  const renderPixelSprite = () => {
    const isHappy = emotion === 'happy'
    const isCombo = emotion === 'combo'
    const isSad = emotion === 'sad'
    const isWin = emotion === 'win'
    const isLose = emotion === 'lose'

    // Mouth path according to emotion
    const mouthD = (isHappy || isWin || isCombo)
      ? 'M 18 28 Q 24 35 30 28 Z' // Big happy smile
      : (isSad || isLose)
      ? 'M 19 32 Q 24 27 29 32' // Frown / sad mouth
      : 'M 20 29 Q 24 31 28 29' // Gentle smile

    // Eyes according to emotion
    const renderEyes = () => {
      if (isHappy || isWin) {
        // Happy squinting crescent eyes ^_^
        return (
          <g fill="none" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round">
            <path d="M 14 20 Q 18 16 21 20" />
            <path d="M 27 20 Q 30 16 34 20" />
          </g>
        )
      }
      if (isCombo) {
        // Fire eyes
        return (
          <g>
            <circle cx="17" cy="19" r="4" fill="#f59e0b" />
            <circle cx="31" cy="19" r="4" fill="#f59e0b" />
            <circle cx="17" cy="19" r="2" fill="#ef4444" />
            <circle cx="31" cy="19" r="2" fill="#ef4444" />
            <circle cx="18" cy="18" r="1" fill="#ffffff" />
            <circle cx="32" cy="18" r="1" fill="#ffffff" />
          </g>
        )
      }
      if (isSad || isLose) {
        // Sad teary eyes
        return (
          <g>
            <ellipse cx="17" cy="20" rx="3" ry="4" fill="#1e293b" />
            <ellipse cx="31" cy="20" rx="3" ry="4" fill="#1e293b" />
            <circle cx="16" cy="18" r="1.5" fill="#ffffff" />
            <circle cx="30" cy="18" r="1.5" fill="#ffffff" />
            {/* Tear drops */}
            <path d="M 13 22 Q 11 26 13 29 Q 15 26 13 22" fill="#38bdf8" className="tear-anim-left" />
            <path d="M 35 22 Q 37 26 35 29 Q 33 26 35 22" fill="#38bdf8" className="tear-anim-right" />
          </g>
        )
      }
      // Normal cute eyes
      return (
        <g fill="#0f172a">
          <ellipse cx="17" cy="19" rx="3.2" ry="4" />
          <ellipse cx="31" cy="19" rx="3.2" ry="4" />
          <circle cx="18" cy="17.5" r="1.5" fill="#ffffff" />
          <circle cx="32" cy="17.5" r="1.5" fill="#ffffff" />
          <circle cx="16" cy="21" r="0.8" fill="#ffffff" />
          <circle cx="30" cy="21" r="0.8" fill="#ffffff" />
        </g>
      )
    }

    // Hair & Headgear by character type
    const renderHeadgear = () => {
      switch (char.avatarType) {
        case 'satoshi':
          return (
            <g>
              {/* Spiky black hair */}
              <path d="M 8 16 L 3 10 L 10 12 L 8 4 L 16 8 L 24 2 L 32 8 L 40 4 L 38 12 L 45 10 L 40 16 Z" fill="#1e293b" />
              {/* Red baseball cap */}
              <path d="M 10 16 C 10 7, 38 7, 38 16 Z" fill="#ef4444" />
              <path d="M 8 16 Q 24 14 42 16 L 46 17 L 38 19 L 10 19 Z" fill="#ffffff" />
              {/* Green poke logo mark on cap */}
              <circle cx="24" cy="11" r="3" fill="#22c55e" />
            </g>
          )
        case 'kasumi':
          return (
            <g>
              {/* Orange side ponytail */}
              <path d="M 36 6 Q 48 2 46 16 Q 44 24 38 20 Z" fill="#ea580c" />
              <circle cx="37" cy="12" r="3.5" fill="#f43f5e" /> {/* Pink hair tie */}
              {/* Front hair fringe */}
              <path d="M 8 16 C 10 6, 38 6, 40 16 C 36 12, 12 12, 8 16 Z" fill="#f97316" />
              <path d="M 12 14 L 16 20 L 20 14 L 28 14 L 32 20 L 36 14 Z" fill="#ea580c" />
            </g>
          )
        case 'paladin':
          return (
            <g>
              {/* Golden Knight Helmet */}
              <path d="M 8 18 C 8 6, 40 6, 40 18 L 42 22 L 6 22 Z" fill="#eab308" />
              <path d="M 12 16 L 36 16 L 34 20 L 14 20 Z" fill="#713f12" />
              {/* Red plumage feather on top */}
              <path d="M 24 6 Q 26 -2 34 2 Q 28 4 24 6" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
            </g>
          )
        case 'mage':
          return (
            <g>
              {/* Purple Wizard Hat with Golden Star */}
              <path d="M 6 18 C 10 16, 38 16, 42 18 L 44 20 L 4 20 Z" fill="#7e22ce" />
              <path d="M 10 17 L 24 1 L 38 17 Z" fill="#9333ea" />
              {/* Yellow Star Emblem */}
              <polygon points="24,7 25.5,11 29.5,11 26,13.5 27.5,17.5 24,15 20.5,17.5 22,13.5 18.5,11 22.5,11" fill="#facc15" />
            </g>
          )
        case 'ninja':
          return (
            <g>
              {/* Dark shinobi hood & mask */}
              <path d="M 10 16 C 10 6, 38 6, 38 16 L 40 38 L 8 38 Z" fill="#0f172a" />
              {/* Cyan headband */}
              <rect x="9" y="10" width="30" height="5" fill="#06b6d4" />
              {/* Metal ninja forehead plate */}
              <rect x="20" y="10.5" width="8" height="4" rx="1" fill="#94a3b8" />
            </g>
          )
        case 'ranger':
          return (
            <g>
              {/* Emerald Green Hood */}
              <path d="M 8 18 C 10 4, 38 4, 40 18 L 42 34 L 6 34 Z" fill="#047857" />
              {/* Blonde hair strands */}
              <path d="M 10 15 L 14 22 L 18 16 L 30 16 L 34 22 L 38 15 Z" fill="#fef08a" />
              {/* Elf ear peeking out */}
              <polygon points="6,20 1,17 7,24" fill="#fed7aa" />
              <polygon points="42,20 47,17 41,24" fill="#fed7aa" />
            </g>
          )
        case 'cyber':
          return (
            <g>
              {/* Spiky silver hair */}
              <path d="M 6 16 L 2 8 L 10 11 L 12 3 L 20 7 L 24 1 L 28 7 L 36 3 L 38 11 L 46 8 L 42 16 Z" fill="#cbd5e1" />
              {/* Glowing Cyan Cyber Visor across eyes */}
              <rect x="11" y="15" width="26" height="7" rx="2" fill="#06b6d4" opacity="0.9" />
              <line x1="12" y1="18.5" x2="36" y2="18.5" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )
        case 'frost':
          return (
            <g>
              {/* Platinum icy hair */}
              <path d="M 8 16 C 8 6, 40 6, 40 16 L 44 32 L 38 28 L 34 32 L 14 32 L 10 28 L 4 32 Z" fill="#e0f2fe" />
              {/* Diamond Tiara Crown */}
              <polygon points="14,12 18,6 24,10 30,6 34,12" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1" />
              <circle cx="24" cy="9" r="2" fill="#ffffff" />
            </g>
          )
        default:
          return null
      }
    }

    return (
      <svg
        viewBox="0 0 48 48"
        width={sizePixels}
        height={sizePixels}
        className={`pixel-character-svg emotion-${emotion}`}
        style={{ overflow: 'visible' }}
      >
        {/* Glow backdrop based on character accent */}
        <circle cx="24" cy="24" r="22" fill={char.glowColor} filter="blur(4px)" opacity={isCombo ? 0.9 : 0.4} />

        {/* Head Base / Skin */}
        <path
          d="M 12 18 C 12 10, 36 10, 36 18 C 36 28, 32 36, 24 36 C 16 36, 12 28, 12 18 Z"
          fill="#ffedd5"
          stroke="#fed7aa"
          strokeWidth="0.8"
        />

        {/* Cheeks Blush when Happy/Win */}
        {(isHappy || isWin || isCombo) && (
          <g fill="#fb7185" opacity="0.75">
            <circle cx="12.5" cy="23" r="3" />
            <circle cx="35.5" cy="23" r="3" />
          </g>
        )}

        {/* Hair and Headgear */}
        {renderHeadgear()}

        {/* Eyes */}
        {renderEyes()}

        {/* Mouth */}
        <path d={mouthD} fill={isHappy || isWin ? '#dc2626' : '#9a3412'} stroke="#78350f" strokeWidth="1" />

        {/* ─── SPECIAL REACTION OVERLAYS ─── */}

        {/* 1. HAPPY / MATCH: Floating Hearts & Stars */}
        {isHappy && (
          <g className="reaction-happy-fx">
            <text x="36" y="8" fontSize="11" fill="#ec4899">💖</text>
            <text x="2" y="10" fontSize="10" fill="#facc15">✨</text>
            <text x="32" y="44" fontSize="9" fill="#f59e0b">⭐</text>
          </g>
        )}

        {/* 2. COMBO / ON-FIRE: Fire Flames & Electric Sparks */}
        {isCombo && (
          <g className="reaction-fire-fx">
            <text x="-4" y="6" fontSize="13">🔥</text>
            <text x="36" y="6" fontSize="13">🔥</text>
            <text x="18" y="-4" fontSize="12">⚡</text>
          </g>
        )}

        {/* 3. SAD / HURT: Sweat Drops & Blue Aura */}
        {isSad && (
          <g className="reaction-sad-fx">
            <text x="35" y="12" fontSize="12" fill="#38bdf8">💧</text>
            <text x="-2" y="14" fontSize="11" fill="#64748b">💢</text>
          </g>
        )}

        {/* 4. VICTORY / WIN: Royal Crown & 1st Gold Trophy */}
        {isWin && (
          <g className="reaction-win-fx">
            <text x="17" y="-2" fontSize="14">👑</text>
            <text x="34" y="2" fontSize="12">🏆</text>
            <text x="-4" y="6" fontSize="12">🎉</text>
            <text x="36" y="40" fontSize="11">✨</text>
          </g>
        )}

        {/* 5. DEFEAT / LOSE: Dark Rain Cloud & Lightning */}
        {isLose && (
          <g className="reaction-lose-fx">
            <text x="12" y="-4" fontSize="18">🌧️</text>
            <text x="32" y="2" fontSize="10">⚡</text>
            <text x="-2" y="32" fontSize="12">😭</text>
          </g>
        )}
      </svg>
    )
  }

  // Get current quote text
  const currentQuote = emotion === 'happy'
    ? char.quoteHappy
    : emotion === 'combo'
    ? `🔥 COMBO! ${char.quoteHappy}`
    : emotion === 'win'
    ? char.quoteWin
    : emotion === 'lose'
    ? char.quoteLose
    : char.title

  return (
    <div
      className={`character-avatar-container char-${char.id} emotion-${emotion} ${interactive ? 'interactive' : ''}`}
      onClick={onClick}
      style={{
        cursor: interactive ? 'pointer' : 'default',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Speech Bubble when triggered or requested */}
      {showSpeech && (
        <div className={`character-speech-bubble emotion-${emotion}`}>
          <span>{currentQuote}</span>
        </div>
      )}

      {/* Main Pixel Character SVG Box */}
      <div
        className={`character-sprite-box emotion-${emotion}`}
        style={{
          width: sizePixels,
          height: sizePixels,
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {renderPixelSprite()}

        {/* Victory 1st Podium Plate */}
        {emotion === 'win' && (
          <div className="char-victory-podium">
            <span>🥇 1ST WINNER</span>
          </div>
        )}

        {/* Defeat Dark Cloud Cover */}
        {emotion === 'lose' && (
          <div className="char-defeat-rain">
            <div className="rain-drop drop-1" />
            <div className="rain-drop drop-2" />
            <div className="rain-drop drop-3" />
          </div>
        )}
      </div>

      {/* Character Name Badge */}
      {showBadge && (
        <div
          className="character-badge-tag"
          style={{
            borderColor: char.accentColor,
            color: char.accentColor,
            marginTop: '4px',
          }}
        >
          {char.name}
        </div>
      )}

      {/* Ultimate Skill Tag Badge */}
      {showUltimateBadge && (
        <div
          className="char-ultimate-tag"
          style={{
            marginTop: '4px',
            fontSize: '10px',
            fontWeight: 800,
            background: 'rgba(15, 23, 42, 0.9)',
            border: `1px solid ${char.accentColor}`,
            color: '#fef08a',
            padding: '2px 6px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            whiteSpace: 'nowrap',
          }}
          title={char.ultimateSkill.description}
        >
          <span>{char.ultimateSkill.icon}</span>
          <span>{char.ultimateSkill.name.split('(')[0]}</span>
        </div>
      )}
    </div>
  )
}
