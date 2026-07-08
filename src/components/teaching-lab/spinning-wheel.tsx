'use client'

export interface WheelSegment {
  label: string
  color: string // CSS color value (hex), used in a conic-gradient — not a Tailwind class
}

interface SpinningWheelProps {
  segments: WheelSegment[]
  rotation: number
  size?: number
}

export function SpinningWheel({ segments, rotation, size = 180 }: SpinningWheelProps) {
  const segAngle = 360 / segments.length
  const gradient = segments
    .map((s, i) => `${s.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
    .join(', ')

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 w-0 h-0
          border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-slate-700"
      />
      <div
        className="w-full h-full rounded-full border-[3px] border-white shadow-lg transition-transform duration-[2800ms] ease-out"
        style={{ background: `conic-gradient(${gradient})`, transform: `rotate(${rotation}deg)` }}
      />
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
