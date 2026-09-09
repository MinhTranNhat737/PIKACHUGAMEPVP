'use client'

import React, { useMemo } from 'react'

export interface AvatarSkillBeam {
  id: string
  startX: number
  startY: number
  targetX: number
  targetY: number
  element: 'electric' | 'water' | 'holy' | 'astral' | 'shadow' | 'arrow' | 'cyber' | 'frost' | 'fire'
  badge: string
}

// Thuật toán vẽ tia chớp chân thực, xuất phát chuẩn xác từ Avatar tới mục tiêu (không loạn màn hình)
function generateControlledLightningPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: number = 0,
  roughness: number = 1
): string {
  const segments = 11
  const points: [number, number][] = [[x1, y1]]
  const dx = (x2 - x1) / segments
  const dy = (y2 - y1) / segments
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len === 0) return `M ${x1} ${y1}`

  const nx = -(y2 - y1) / len
  const ny = (x2 - x1) / len

  for (let i = 1; i < segments; i++) {
    const basePx = x1 + dx * i
    const basePy = y1 + dy * i
    // Dùng đường cong Sine Envelope để triệt tiêu độ lệch ở 2 đầu: điểm xuất phát (Avatar) và điểm tới (ô cờ) luôn chính xác 100%
    const envelope = Math.sin((Math.PI * i) / segments)
    const wave1 = Math.sin(i * 2.1 + seed * 5.7)
    const wave2 = Math.cos(i * 4.3 + seed * 3.1) * 0.4
    const maxDisplacement = Math.min(18, Math.max(5, len * 0.05)) * roughness * envelope
    const jitter = (wave1 + wave2) * maxDisplacement
    points.push([basePx + nx * jitter, basePy + ny * jitter])
  }
  points.push([x2, y2])
  return points.map((p, idx) => (idx === 0 ? `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(' ')
}

export function AvatarSkillBeams({ beams }: { beams: AvatarSkillBeam[] }) {
  // Trích xuất các vị trí Avatar xuất phát duy nhất để tạo hiệu ứng hào quang phóng năng lượng
  const originPoints = useMemo(() => {
    if (!beams || beams.length === 0) return []
    const map = new Map<string, { x: number; y: number; element: AvatarSkillBeam['element'] }>()
    beams.forEach(b => {
      const key = `${Math.round(b.startX)}_${Math.round(b.startY)}_${b.element}`
      if (!map.has(key)) {
        map.set(key, { x: b.startX, y: b.startY, element: b.element })
      }
    })
    return Array.from(map.values())
  }, [beams])

  if (!beams || beams.length === 0) return null

  return (
    <svg
      className="avatar-skill-beams-svg"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 95,
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Glow Filters */}
        <filter id="electricGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="waterGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="holyGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="electricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>

        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="holyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>

        <linearGradient id="astralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0fe" />
          <stop offset="50%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>

        <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d1fae5" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>

        <linearGradient id="frostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="65%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>

      {/* ⚡ Hào quang phát năng lượng bùng nổ trực tiếp từ Avatar */}
      {originPoints.map((op, oIdx) => {
        if (op.element === 'electric') {
          return (
            <g key={`origin_${oIdx}`} className="avatar-origin-burst electric">
              <circle cx={op.x} cy={op.y} r="42" fill="none" stroke="#facc15" strokeWidth="3.5" opacity="0.65" filter="url(#electricGlow)" />
              <circle cx={op.x} cy={op.y} r="26" fill="url(#electricGrad)" opacity="0.5" />
              <circle cx={op.x} cy={op.y} r="14" fill="#ffffff" opacity="0.95" />
              <line x1={op.x - 30} y1={op.y} x2={op.x + 30} y2={op.y} stroke="#ffffff" strokeWidth="2.5" />
              <line x1={op.x} y1={op.y - 30} x2={op.x} y2={op.y + 30} stroke="#ffffff" strokeWidth="2.5" />
              <line x1={op.x - 20} y1={op.y - 20} x2={op.x + 20} y2={op.y + 20} stroke="#fde047" strokeWidth="2" />
              <line x1={op.x - 20} y1={op.y + 20} x2={op.x + 20} y2={op.y - 20} stroke="#fde047" strokeWidth="2" />
            </g>
          )
        }
        if (op.element === 'fire') {
          return (
            <g key={`origin_${oIdx}`} className="avatar-origin-burst fire">
              <circle cx={op.x} cy={op.y} r="46" fill="none" stroke="#f97316" strokeWidth="4" opacity="0.7" filter="blur(3px)" />
              <circle cx={op.x} cy={op.y} r="28" fill="url(#fireGrad)" opacity="0.6" />
              <circle cx={op.x} cy={op.y} r="15" fill="#ffffff" opacity="0.95" />
            </g>
          )
        }
        if (op.element === 'shadow') {
          return (
            <g key={`origin_${oIdx}`} className="avatar-origin-burst shadow">
              <circle cx={op.x} cy={op.y} r="44" fill="none" stroke="#dc2626" strokeWidth="3" opacity="0.7" filter="blur(3px)" />
              <circle cx={op.x} cy={op.y} r="26" fill="url(#shadowGrad)" opacity="0.65" />
              <circle cx={op.x} cy={op.y} r="12" fill="#ef4444" opacity="0.9" />
            </g>
          )
        }
        if (op.element === 'frost') {
          return (
            <g key={`origin_${oIdx}`} className="avatar-origin-burst frost">
              <circle cx={op.x} cy={op.y} r="40" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.75" />
              <circle cx={op.x} cy={op.y} r="22" fill="url(#frostGrad)" opacity="0.6" />
              <circle cx={op.x} cy={op.y} r="12" fill="#ffffff" opacity="0.9" />
            </g>
          )
        }
        return (
          <g key={`origin_${oIdx}`} className="avatar-origin-burst default">
            <circle cx={op.x} cy={op.y} r="38" fill="none" stroke="#c026d3" strokeWidth="3" opacity="0.65" />
            <circle cx={op.x} cy={op.y} r="20" fill="#a855f7" opacity="0.5" />
            <circle cx={op.x} cy={op.y} r="10" fill="#ffffff" opacity="0.9" />
          </g>
        )
      })}

      {/* 🚀 Các tia chiêu thức chiếu từ Avatar tới các ô mục tiêu */}
      {beams.map((b, idx) => {
        const { startX, startY, targetX, targetY, element } = b
        const midX = (startX + targetX) / 2
        const midY = (startY + targetY) / 2

        if (element === 'fire') {
          // 🔥 Himeko: Laser Quỹ Đạo Bão Lửa (Orbital Celestial Fire Ray)
          return (
            <g key={b.id} className="beam-fire-group">
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#f97316" strokeWidth="12" opacity="0.4" filter="blur(5px)" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="url(#fireGrad)" strokeWidth="6" opacity="0.85" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#ffffff" strokeWidth="2.5" />

              {/* Solar Core Explosion at target */}
              <circle cx={targetX} cy={targetY} r="26" fill="#f97316" opacity="0.5" filter="blur(4px)" />
              <circle cx={targetX} cy={targetY} r="15" fill="url(#fireGrad)" opacity="0.9" />
              <circle cx={targetX} cy={targetY} r="7" fill="#ffffff" />
              <line x1={targetX - 20} y1={targetY} x2={targetX + 20} y2={targetY} stroke="#fed7aa" strokeWidth="2" />
              <line x1={targetX} y1={targetY - 20} x2={targetX} y2={targetY + 20} stroke="#fed7aa" strokeWidth="2" />
            </g>
          )
        }

        if (element === 'electric') {
          // ⚡ Satoshi: Sấm Sét Hoàng Kim (Chiếu tập trung từ Avatar tới các ô Pokémon)
          const pMain = generateControlledLightningPoints(startX, startY, targetX, targetY, idx * 3, 1)
          const pBranch = generateControlledLightningPoints(startX, startY, targetX, targetY, idx * 3 + 1, 0.6)

          return (
            <g key={b.id} className="beam-electric-group">
              {/* Outer Golden Aura */}
              <path d={pMain} fill="none" stroke="#facc15" strokeWidth="7" opacity="0.55" filter="url(#electricGlow)" />
              {/* Branch Arc */}
              <path d={pBranch} fill="none" stroke="#fde047" strokeWidth="3.5" opacity="0.8" />
              {/* Pure White Core Bolt */}
              <path d={pMain} fill="none" stroke="#ffffff" strokeWidth="2.2" opacity="0.95" />

              {/* Impact Shock Burst at target icon */}
              <circle cx={targetX} cy={targetY} r="26" fill="#facc15" opacity="0.5" filter="url(#electricGlow)" />
              <circle cx={targetX} cy={targetY} r="14" fill="#ffffff" opacity="0.95" />
              {/* Shockwave sparks */}
              <line x1={targetX - 20} y1={targetY} x2={targetX + 20} y2={targetY} stroke="#ffffff" strokeWidth="2.5" />
              <line x1={targetX} y1={targetY - 20} x2={targetX} y2={targetY + 20} stroke="#ffffff" strokeWidth="2.5" />
              <line x1={targetX - 14} y1={targetY - 14} x2={targetX + 14} y2={targetY + 14} stroke="#fde047" strokeWidth="2" />
              <line x1={targetX - 14} y1={targetY + 14} x2={targetX + 14} y2={targetY - 14} stroke="#fde047" strokeWidth="2" />
            </g>
          )
        }

        if (element === 'water') {
          // 🌊 Kasumi: Đại Hồng Thủy (Curved Hydro Wave Vortex)
          const curveOffsetY = (idx % 2 === 0 ? -1 : 1) * 60
          const path = `M ${startX} ${startY} Q ${midX} ${midY + curveOffsetY} ${targetX} ${targetY}`

          return (
            <g key={b.id} className="beam-water-group">
              <path d={path} fill="none" stroke="#0284c7" strokeWidth="9" opacity="0.4" filter="url(#waterGlow)" />
              <path d={path} fill="none" stroke="url(#waterGrad)" strokeWidth="5" strokeDasharray="12 4" />
              <path d={path} fill="none" stroke="#ffffff" strokeWidth="2" />

              {/* Water Splash at target */}
              <circle cx={targetX} cy={targetY} r="22" fill="#38bdf8" opacity="0.5" />
              <circle cx={targetX} cy={targetY} r="12" fill="#e0f2fe" opacity="0.8" />
              <circle cx={targetX + 10} cy={targetY - 12} r="5" fill="#38bdf8" />
              <circle cx={targetX - 12} cy={targetY - 8} r="4" fill="#7dd3fc" />
            </g>
          )
        }

        if (element === 'holy') {
          // 🛡️ Paladin: Hào Quang Thánh (Divine Radiant Ray)
          return (
            <g key={b.id} className="beam-holy-group">
              <polygon
                points={`
                  ${startX - 4},${startY}
                  ${startX + 4},${startY}
                  ${targetX + 18},${targetY + 18}
                  ${targetX - 18},${targetY - 18}
                `}
                fill="url(#holyGrad)"
                opacity="0.55"
                filter="url(#holyGlow)"
              />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#ffffff" strokeWidth="3" />

              {/* Holy Cross at target */}
              <circle cx={targetX} cy={targetY} r="20" fill="#fef08a" opacity="0.6" />
              <polygon
                points={`
                  ${targetX},${targetY - 18}
                  ${targetX + 5},${targetY - 5}
                  ${targetX + 18},${targetY}
                  ${targetX + 5},${targetY + 5}
                  ${targetX},${targetY + 18}
                  ${targetX - 5},${targetY + 5}
                  ${targetX - 18},${targetY}
                  ${targetX - 5},${targetY - 5}
                `}
                fill="#ffffff"
              />
            </g>
          )
        }

        if (element === 'astral') {
          // 🔮 Mage: Lỗ Đen Tinh Tú (Cosmic Nebula Ray)
          const pCurve = `M ${startX} ${startY} Q ${midX + (idx % 2 ? 40 : -40)} ${midY} ${targetX} ${targetY}`
          return (
            <g key={b.id} className="beam-astral-group">
              <path d={pCurve} fill="none" stroke="#7e22ce" strokeWidth="10" opacity="0.5" filter="blur(4px)" />
              <path d={pCurve} fill="none" stroke="url(#astralGrad)" strokeWidth="5" strokeDasharray="8 6" />
              <path d={pCurve} fill="none" stroke="#f5d0fe" strokeWidth="2" />

              {/* Cosmic Singularity at target */}
              <circle cx={targetX} cy={targetY} r="24" fill="#581c87" opacity="0.7" />
              <circle cx={targetX} cy={targetY} r="12" fill="#c026d3" opacity="0.85" />
              <circle cx={targetX} cy={targetY} r="5" fill="#ffffff" />
            </g>
          )
        }

        if (element === 'shadow') {
          // ⚔️ Ninja / Madara: Vô Ảnh Trảm & Khí Cầu Susanoo (Shadow Shuriken & Swift Slash)
          return (
            <g key={b.id} className="beam-shadow-group">
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#ef4444" strokeWidth="5" strokeDasharray="14 8" opacity="0.85" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#7e22ce" strokeWidth="3" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#ffffff" strokeWidth="1.5" />

              {/* Double Katana Slash X at target */}
              <line x1={targetX - 22} y1={targetY - 22} x2={targetX + 22} y2={targetY + 22} stroke="#f87171" strokeWidth="3.5" />
              <line x1={targetX - 22} y1={targetY + 22} x2={targetX + 22} y2={targetY - 22} stroke="#ffffff" strokeWidth="2.5" />
              <circle cx={targetX} cy={targetY} r="9" fill="#ef4444" />
            </g>
          )
        }

        if (element === 'arrow') {
          // 🏹 Ranger: Mưa Tên Thần Tốc (Wind Spirit Arrow Tempest)
          const angle = Math.atan2(targetY - startY, targetX - startX)
          const arrowLen = 22
          const tipX = targetX
          const tipY = targetY
          const backX = tipX - arrowLen * Math.cos(angle)
          const backY = tipY - arrowLen * Math.sin(angle)

          return (
            <g key={b.id} className="beam-arrow-group">
              <line x1={startX} y1={startY} x2={backX} y2={backY} stroke="url(#arrowGrad)" strokeWidth="3" strokeDasharray="10 5" opacity="0.7" />
              {/* Luminous Arrow Shaft */}
              <line x1={backX} y1={backY} x2={tipX} y2={tipY} stroke="#6ee7b7" strokeWidth="3.5" />
              {/* Arrow Head */}
              <circle cx={tipX} cy={tipY} r="15" fill="#10b981" opacity="0.5" />
              <circle cx={tipX} cy={tipY} r="8" fill="#ffffff" />
            </g>
          )
        }

        if (element === 'cyber') {
          // 💾 Cyber: Laser Ma Trận Quá Tải (Cyber Matrix Laser)
          return (
            <g key={b.id} className="beam-cyber-group">
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#06b6d4" strokeWidth="5" opacity="0.6" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#f43f5e" strokeWidth="2" strokeDasharray="6 4" />
              <line x1={startX} y1={startY} x2={targetX} y2={targetY} stroke="#ffffff" strokeWidth="1.5" />

              {/* Digital Glitch Squares at target */}
              <rect x={targetX - 12} y={targetY - 12} width="24" height="24" fill="none" stroke="#06b6d4" strokeWidth="2" />
              <rect x={targetX - 6} y={targetY - 6} width="12" height="12" fill="#f43f5e" opacity="0.8" />
            </g>
          )
        }

        if (element === 'frost') {
          // ❄️ Frost: Băng Tuyệt Đối (Glacial Frost Ice Beam)
          const pFrost = generateControlledLightningPoints(startX, startY, targetX, targetY, idx * 5, 0.7)
          return (
            <g key={b.id} className="beam-frost-group">
              <path d={pFrost} fill="none" stroke="#38bdf8" strokeWidth="7" opacity="0.5" filter="blur(3px)" />
              <path d={pFrost} fill="none" stroke="#bae6fd" strokeWidth="3.5" />
              <path d={pFrost} fill="none" stroke="#ffffff" strokeWidth="1.8" />

              {/* Ice crystal at target */}
              <circle cx={targetX} cy={targetY} r="22" fill="#bae6fd" opacity="0.55" />
              <polygon
                points={`
                  ${targetX},${targetY - 16}
                  ${targetX + 14},${targetY}
                  ${targetX},${targetY + 16}
                  ${targetX - 14},${targetY}
                `}
                fill="#ffffff"
                opacity="0.9"
              />
            </g>
          )
        }

        return null
      })}
    </svg>
  )
}
