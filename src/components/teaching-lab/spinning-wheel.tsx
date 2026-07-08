'use client'

import { useId } from 'react'

export interface WheelSegment {
  label: string
  color: string // CSS color value (hex), used to fill the SVG slice
}

interface SpinningWheelProps {
  segments: WheelSegment[]
  rotation: number
  size?: number
}

const VB = 100 // SVG viewBox is a fixed 100x100 unit space, scaled to `size` px by width/height
const CENTER = VB / 2
const RADIUS = 48
const LABEL_INNER = 8 // distance from center where each label starts
const LABEL_OUTER_MARGIN = 3 // keep labels short of the rim

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  // angleDeg is measured clockwise from the top (12 o'clock), matching the CSS rotation below
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}

export function SpinningWheel({ segments, rotation, size = 180 }: SpinningWheelProps) {
  const segAngle = 360 / segments.length
  const clipId = `wheel-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const fontSize = segments.length <= 4 ? 6.2 : 5.4
  const maxTextLength = RADIUS - LABEL_INNER - LABEL_OUTER_MARGIN

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 w-0 h-0
          border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-slate-700"
      />
      <svg
        viewBox={`0 0 ${VB} ${VB}`}
        width={size}
        height={size}
        className="drop-shadow-lg transition-transform duration-[2800ms] ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={CENTER} cy={CENTER} r={RADIUS} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {segments.map((s, i) => {
            const a0 = i * segAngle
            const a1 = (i + 1) * segAngle
            const p0 = polarToCartesian(CENTER, CENTER, RADIUS, a0)
            const p1 = polarToCartesian(CENTER, CENTER, RADIUS, a1)
            const largeArc = a1 - a0 > 180 ? 1 : 0
            const d = `M ${CENTER} ${CENTER} L ${p0.x} ${p0.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`
            return <path key={i} d={d} fill={s.color} />
          })}

          {segments.map((s, i) => {
            // Text reads from near the center outward to the rim, like a spoke: anchored just
            // off-center and rotated by the segment's bisector angle (minus 90°, since SVG text
            // starts out pointing "east" at rotate(0), not "north").
            const center = i * segAngle + segAngle / 2
            // Compress only labels that would otherwise overflow the rim — leave short
            // labels at natural glyph spacing instead of stretching them to fill the slot.
            const estimatedWidth = s.label.length * fontSize * 0.58
            const compressProps =
              estimatedWidth > maxTextLength
                ? { textLength: maxTextLength, lengthAdjust: 'spacingAndGlyphs' as const }
                : {}
            return (
              <text
                key={i}
                x={CENTER + LABEL_INNER}
                y={CENTER}
                transform={`rotate(${center - 90} ${CENTER} ${CENTER})`}
                textAnchor="start"
                dominantBaseline="middle"
                fill="white"
                fontSize={fontSize}
                fontWeight={700}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={0.5}
                paintOrder="stroke"
                {...compressProps}
              >
                {s.label}
              </text>
            )
          })}
        </g>

        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="white" strokeWidth={3} />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 shadow" />
      </div>
    </div>
  )
}

// Computes a rotation value (always greater than `current`) that ends the wheel
// with segment `targetIndex`'s center aligned to the fixed pointer at the top —
// monotonically increasing so the CSS transition always spins forward, never snaps back.
export function computeSpinRotation(current: number, segmentCount: number, targetIndex: number, extraSpins = 5): number {
  const segAngle = 360 / segmentCount
  const centerAngle = targetIndex * segAngle + segAngle / 2
  const desiredMod = (360 - centerAngle + 360) % 360
  const currentMod = ((current % 360) + 360) % 360
  const delta = (desiredMod - currentMod + 360) % 360
  return current + extraSpins * 360 + delta
}
