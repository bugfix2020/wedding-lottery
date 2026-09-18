'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { PrizeDisplay } from '@/components/prize-display'
import { WinnersList } from '@/components/winners-list'
import { Particles, Confetti } from '@/components/particles'
import { WeddingDanmaku } from '@/components/wedding-danmaku'
import { ParticleField } from '@/components/ParticleField'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PRIZE_TIERS,
  tierRemaining,
  tierTotal,
  type Gift,
  type PrizeTier,
} from '@/lib/prizes'

interface DrawnRecord {
  id: string
  gift: Gift
  tier: PrizeTier
  drawnAt: number
}

function buildInitialRemainingByGift(): Record<string, number> {
  const map: Record<string, number> = {}
  for (const tier of PRIZE_TIERS) {
    for (const gift of tier.gifts) {
      map[gift.id] = gift.quantity
    }
  }
  return map
}

function pickRandomGift(level: number, remainingByGift: Record<string, number>): Gift | null {
  const tier = PRIZE_TIERS.find(t => t.level === level)
  if (!tier) return null
  const available = tier.gifts.filter(g => (remainingByGift[g.id] ?? 0) > 0)
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

function collectDrawPool(remainingByGift: Record<string, number>): Gift[] {
  const pool: Gift[] = []
  for (const tier of PRIZE_TIERS) {
    for (const gift of tier.gifts) {
      if ((remainingByGift[gift.id] ?? 0) > 0) pool.push(gift)
    }
  }
  return pool
}

/** 近似 cubic-bezier 缓动（两端切线水平，中间平滑） */
function bezierEaseInOut(t: number): number {
  // 等价于 cubic-bezier(0.65, 0, 0.35, 1) 的常用近似
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function bezierEaseOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function bezierEaseIn(t: number): number {
  return t * t * t
}

// 减速时长：手动按停止后，快→慢再揭晓
const DECEL_LEAD_MS = 1700

const SPIN = {
  slowMs: 260,
  fastMs: 42,
  accelMs: 1100,
  decelMs: DECEL_LEAD_MS,
  minJitter: 0.92,
  maxJitter: 1.08,
}

// 本地原声音效（已从 OSS 下载，不再依赖签名）
const ROLLING_SOUND_URL = '/audio/rolling.mp3'
const WIN_SOUND_URL = '/audio/win.mp3'

type SpinPhase = 'accel' | 'cruise' | 'decel'

export default function LotteryPage() {
  const [remainingByGift, setRemainingByGift] = useState<Record<string, number>>(() =>
    buildInitialRemainingByGift()
  )
  const [drawHistory, setDrawHistory] = useState<DrawnRecord[]>([])
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [drawPhase, setDrawPhase] = useState<'idle' | 'rolling' | 'revealing'>('idle')
  const [rollingGift, setRollingGift] = useState<Gift | null>(null)
  const [revealedGift, setRevealedGift] = useState<Gift | null>(null)
  const [revealedTier, setRevealedTier] = useState<PrizeTier | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDecelerating, setIsDecelerating] = useState(false)

  const rollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rollingAudioRef = useRef<HTMLAudioElement | null>(null)
  const winAudioRef = useRef<HTMLAudioElement | null>(null)
  const phaseRef = useRef(drawPhase)
  const levelRef = useRef(selectedLevel)
  const remainingRef = useRef(remainingByGift)
  const spinPhaseRef = useRef<SpinPhase>('accel')
  const spinStartRef = useRef(0)
  const decelStartRef = useRef(0)
  const giftTypesRef = useRef<Gift[]>([])

  useEffect(() => {
    phaseRef.current = drawPhase
  }, [drawPhase])
  useEffect(() => {
    levelRef.current = selectedLevel
  }, [selectedLevel])
  useEffect(() => {
    remainingRef.current = remainingByGift
  }, [remainingByGift])

  const currentTier = PRIZE_TIERS.find(t => t.level === selectedLevel) ?? PRIZE_TIERS[0]
  const currentRemaining = tierRemaining(currentTier, remainingByGift)
  const totalSlots = PRIZE_TIERS.reduce((sum, t) => sum + tierTotal(t), 0)
  const canDraw = currentRemaining > 0

  const playRollingSound = useCallback(() => {
    if (isMuted) return
    try {
      if (!rollingAudioRef.current) {
        rollingAudioRef.current = new Audio(ROLLING_SOUND_URL)
        rollingAudioRef.current.loop = true
        rollingAudioRef.current.volume = 1.0
      }
      rollingAudioRef.current.currentTime = 0
      rollingAudioRef.current.play().catch(err => {
        console.log('Rolling audio play failed:', err)
      })
    } catch (e) {
      console.log('Rolling audio error:', e)
    }
  }, [isMuted])

  const stopRollingSound = useCallback(() => {
    try {
      if (rollingAudioRef.current) {
        rollingAudioRef.current.pause()
        rollingAudioRef.current.currentTime = 0
      }
    } catch {
      // Audio not supported
    }
  }, [])

  const playWinSound = useCallback(() => {
    if (isMuted) return
    try {
      if (!winAudioRef.current) {
        winAudioRef.current = new Audio(WIN_SOUND_URL)
        winAudioRef.current.volume = 1.0
      }
      winAudioRef.current.currentTime = 0
      winAudioRef.current.play().catch(() => {})
    } catch {
      // Audio not supported
    }
  }, [isMuted])

  const finalizeDraw = useCallback(() => {
    if (rollingTimeoutRef.current) {
      clearTimeout(rollingTimeoutRef.current)
      rollingTimeoutRef.current = null
    }

    const targetLevel = levelRef.current
    const tier = PRIZE_TIERS.find(t => t.level === targetLevel)
    if (!tier) return

    const gift = pickRandomGift(targetLevel, remainingRef.current)
    if (!gift) {
      stopRollingSound()
      setDrawPhase('idle')
      setRollingGift(null)
      return
    }

    stopRollingSound()
    playWinSound()

    setDrawPhase('revealing')
    setRollingGift(null)
    setRevealedGift(gift)
    setRevealedTier(tier)
    setShowConfetti(true)
    setIsDecelerating(false)

    setRemainingByGift(prev => ({
      ...prev,
      [gift.id]: Math.max(0, (prev[gift.id] ?? 0) - 1),
    }))
    setDrawHistory(prev => [
      {
        id: `${gift.id}-${Date.now()}`,
        gift,
        tier,
        drawnAt: Date.now(),
      },
      ...prev,
    ])

    setTimeout(() => {
      setDrawPhase('idle')
      setShowConfetti(false)
    }, 4500)
  }, [playWinSound, stopRollingSound])

  const handleStartDraw = useCallback(
    (level?: number) => {
      const targetLevel = level ?? levelRef.current
      const tier = PRIZE_TIERS.find(t => t.level === targetLevel)
      if (!tier) return

      const targetTier = PRIZE_TIERS.find(t => t.level === targetLevel)
      if (!targetTier) return
      if (tierRemaining(targetTier, remainingRef.current) <= 0 || phaseRef.current === 'rolling') return

      setSelectedLevel(targetLevel)
      setDrawPhase('rolling')
      setRevealedGift(null)
      setRevealedTier(null)
      setShowConfetti(false)
      setIsDecelerating(false)
      playRollingSound()

      // 视觉上全池滚动；结果仍锁定按键等级
      giftTypesRef.current = collectDrawPool(remainingRef.current)
      spinPhaseRef.current = 'accel'
      spinStartRef.current = performance.now()
      decelStartRef.current = 0

      const tick = () => {
        const pool = giftTypesRef.current
        if (pool.length > 0) {
          setRollingGift(pool[Math.floor(Math.random() * pool.length)])
        }

        const now = performance.now()
        const phase = spinPhaseRef.current
        let delay = SPIN.fastMs

        if (phase === 'accel') {
          const p = Math.min(1, (now - spinStartRef.current) / SPIN.accelMs)
          // 慢 → 快：delay 从 slow 插值到 fast（ease-out 贝塞尔）
          const eased = bezierEaseOut(p)
          delay = SPIN.slowMs + (SPIN.fastMs - SPIN.slowMs) * eased
          if (p >= 1) spinPhaseRef.current = 'cruise'
        } else if (phase === 'cruise') {
          delay = SPIN.fastMs
        } else {
          const p = Math.min(1, (now - decelStartRef.current) / SPIN.decelMs)
          // 快 → 慢：delay 从 fast 插值到 slow（ease-in 贝塞尔）
          const eased = bezierEaseIn(p)
          delay = SPIN.fastMs + (SPIN.slowMs - SPIN.fastMs) * eased
          if (p >= 1) {
            finalizeDraw()
            return
          }
        }

        const jitter =
          SPIN.minJitter + Math.random() * (SPIN.maxJitter - SPIN.minJitter)
        rollingTimeoutRef.current = setTimeout(tick, Math.max(16, delay * jitter))
      }
      tick()
    },
    [finalizeDraw, playRollingSound]
  )

  const handleStopDraw = useCallback(() => {
    if (phaseRef.current !== 'rolling') return
    // 已在减速中则忽略，避免重复触发
    if (spinPhaseRef.current === 'decel') return

    spinPhaseRef.current = 'decel'
    decelStartRef.current = performance.now()
    setIsDecelerating(true)
  }, [])

  const handleReset = useCallback(() => {
    if (rollingTimeoutRef.current) {
      clearTimeout(rollingTimeoutRef.current)
      rollingTimeoutRef.current = null
    }
    stopRollingSound()
    setRemainingByGift(buildInitialRemainingByGift())
    setDrawHistory([])
    setSelectedLevel(1)
    setDrawPhase('idle')
    setRollingGift(null)
    setRevealedGift(null)
    setRevealedTier(null)
    setShowConfetti(false)
    setIsDecelerating(false)
    spinPhaseRef.current = 'accel'
    spinStartRef.current = 0
    decelStartRef.current = 0
  }, [stopRollingSound])

  // Keyboard: 1/2/3/4 start-or-stop corresponding tier; Space/Enter stop; R reset
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      // 开始按的数字，结束再按同一个数字
      if (e.key >= '1' && e.key <= '4') {
        e.preventDefault()
        const level = Number(e.key)
        const phase = phaseRef.current
        if (phase === 'rolling') {
          if (levelRef.current === level) {
            handleStopDraw()
          }
          return
        }
        if (phase === 'idle') {
          const tier = PRIZE_TIERS.find(t => t.level === level)
          if (tier && tierRemaining(tier, remainingRef.current) > 0) {
            handleStartDraw(level)
          }
        }
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        if (phaseRef.current === 'idle') {
          e.preventDefault()
          handleReset()
        }
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setIsMuted(v => !v)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleStartDraw, handleStopDraw, handleReset])

  return (
    <main className="h-screen bg-green-500/20 relative overflow-hidden text-cyan-300">
      <ParticleField />

      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 animate-grid-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[180px] animate-pulse-slow"
          style={{ animationDelay: '0.7s' }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,255,255,0.2) 40%, rgba(139,92,246,0.2) 60%, transparent 100%)',
            backgroundSize: '100% 200%',
            animation: 'scan 4s linear infinite',
          }}
        />
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-sky-400/50" />
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-sky-400/50" />
        <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-sky-400/50" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-sky-400/50" />
      </div>

      <Particles isActive={drawPhase === 'rolling'} />
      {showConfetti && <Confetti isActive={showConfetti} />}

      <WeddingDanmaku
        isSpinning={drawPhase === 'rolling'}
        hasResult={!!revealedGift}
        prizeLevel={revealedTier?.level ?? selectedLevel}
        giftName={revealedGift?.name}
        tierName={revealedTier?.name}
      />

      <div className="relative z-10 mx-auto h-screen overflow-hidden flex flex-col w-full p-6 lg:p-8">
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 xl:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-3 xl:col-span-3 min-h-0 flex">
            <div
              className="rounded-2xl border border-cyan-500/20 p-4 relative overflow-hidden flex flex-col min-h-0 w-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(34,211,238,0.05) 0%, rgba(139,92,246,0.05) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                奖品设置
              </h2>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1">
                <PrizeDisplay tiers={PRIZE_TIERS} remainingByGift={remainingByGift} />
              </div>
            </div>
          </aside>

          <div className="lg:col-span-4 xl:col-span-6 w-full min-h-0 flex flex-col items-center justify-center gap-6 relative">
            {/* 仅首次进入且尚未抽过时显示就绪圆环 */}
            {drawPhase === 'idle' && !revealedGift && drawHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center w-full">
                <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[360px] lg:h-[360px]">
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20 bg-cyan-500"
                    style={{ animationDuration: '3s' }}
                  />
                  <div className="absolute inset-0 animate-spin-reverse" style={{ animationDuration: '8s' }}>
                    <div className="absolute inset-0 rounded-full border-[4px] md:border-[5px] border-transparent border-t-cyan-500/60 border-r-blue-500/40 shadow-[0_0_30px_rgba(34,211,238,0.5),0_0_60px_rgba(34,211,238,0.2)]" />
                  </div>
                  <div className="absolute inset-3 md:inset-4 animate-spin-slow">
                    <div className="absolute inset-0 rounded-full border-[3px] md:border-[4px] border-transparent border-l-cyan-400/70 border-b-purple-400/50 shadow-[0_0_25px_rgba(139,92,246,0.4),0_0_50px_rgba(139,92,246,0.2)]" />
                  </div>
                  <div className="absolute inset-12 md:inset-16 flex items-center justify-center">
                    <div className="w-full h-full rounded-full animate-pulse-slow bg-gradient-to-br from-cyan-500/30 to-purple-500/30 shadow-[0_0_40px_rgba(34,211,238,0.7),0_0_80px_rgba(34,211,238,0.3),inset_0_0_30px_rgba(139,92,246,0.5)] flex items-center justify-center">
                      <div className="text-center px-4">
                        <span className="block font-black text-3xl md:text-4xl lg:text-5xl text-cyan-200 drop-shadow-2xl">
                          婚礼抽奖
                        </span>
                        <span className="block mt-2 text-sm md:text-base text-cyan-100/80">
                          礼品池已就绪
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute top-0 left-1/2 w-3 h-3 md:w-4 md:h-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1),0_0_30px_rgba(34,211,238,0.5)]" />
                  </div>
                  <div className="absolute inset-0 animate-spin-reverse" style={{ animationDuration: '5s' }}>
                    <div className="absolute bottom-0 left-1/2 w-3 h-3 md:w-4 md:h-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-purple-400 shadow-[0_0_15px_rgba(139,92,246,1),0_0_30px_rgba(139,92,246,0.5)]" />
                  </div>
                </div>
                <p className="mt-6 text-center text-base md:text-lg text-muted-foreground max-w-md animate-pulse">
                  见证幸运时刻，礼品马上揭晓
                </p>
              </div>
            )}

            {drawPhase === 'rolling' && rollingGift && (
              <div className="flex flex-col items-center justify-center w-full gap-6">
                <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.4)]">
                  <img src={rollingGift.image} alt="" className="w-full h-full object-contain bg-slate-950/40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)] animate-pulse">
                    {rollingGift.name}
                  </h1>
                  <p className="mt-4 text-lg md:text-2xl text-cyan-200/80 tracking-wider font-medium">
                    {isDecelerating ? '即将揭晓…' : '幸运礼品滚动中…'}
                  </p>
                </div>
              </div>
            )}

            {drawPhase === 'revealing' && revealedGift && revealedTier && (
              <div className="flex flex-col items-center justify-center w-full gap-6">
                <div className="text-sm md:text-base font-bold tracking-[0.3em] text-yellow-300/90 animate-pulse">
                  {revealedTier.name}
                </div>
                <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden border-2 border-yellow-400/60 shadow-[0_0_60px_rgba(251,191,36,0.45)] animate-bounce-in bg-slate-950/40">
                  <img src={revealedGift.image} alt={revealedGift.name} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-bounce">
                    {revealedGift.name}
                  </h1>
                  {revealedGift.desc && (
                    <p className="mt-3 text-base md:text-xl text-yellow-100/80">{revealedGift.desc}</p>
                  )}
                  <p className="mt-4 text-xl md:text-2xl text-yellow-300 font-bold animate-pulse">
                    恭喜获得{revealedTier.name}！
                  </p>
                </div>
              </div>
            )}

            {/* 揭晓结束后：安静展示上一件礼品，不再回到就绪圆环 */}
            {drawPhase === 'idle' && revealedGift && revealedTier && (
              <div className="flex flex-col items-center justify-center w-full gap-6">
                <div className="text-xs md:text-sm font-bold tracking-[0.3em] text-yellow-200/60">
                  {revealedTier.name}
                </div>
                <div className="relative w-56 h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden border border-yellow-400/25 opacity-80 bg-slate-950/30">
                  <img src={revealedGift.image} alt={revealedGift.name} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl md:text-4xl font-bold text-yellow-100/70 tracking-wide">
                    {revealedGift.name}
                  </h1>
                  {revealedGift.desc && (
                    <p className="mt-2 text-sm md:text-base text-muted-foreground">{revealedGift.desc}</p>
                  )}
                  <p className="mt-4 text-sm md:text-base text-cyan-200/50">等待下一位宾客</p>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-3 xl:col-span-3 min-h-0 flex">
            <div
              className="rounded-2xl border border-yellow-500/20 p-4 relative overflow-hidden flex flex-col min-h-0 w-full"
              style={{
                background:
                  'linear-gradient(135deg, rgba(250,204,21,0.05) 0%, rgba(245,158,11,0.05) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
              <div
                className="w-full flex text-lg font-bold text-foreground mb-4 items-center justify-between gap-2 shrink-0"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-[12px]">🎁</span>
                  已出礼品
                </div>
                {drawHistory.length > 0 && (
                  <div className="text-muted-foreground text-sm">
                    <span className="ml-[10px] text-cyan-400 font-bold">
                      {drawHistory.length} / {totalSlots}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <WinnersList records={drawHistory} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Button
        size="lg"
        style={{ position: 'fixed', bottom: '10vh', cursor: 'pointer' }}
        disabled={
          drawPhase === 'revealing' ||
          (drawPhase === 'rolling' && isDecelerating) ||
          (drawPhase === 'idle' && !canDraw)
        }
        className={cn(
          'left-1/2 -translate-x-1/2 z-20',
          'w-[85%] max-w-lg h-20 md:h-24',
          'text-xl md:text-2xl font-black tracking-wide gap-3 flex items-center justify-center',
          'relative overflow-hidden rounded-2xl',
          drawPhase === 'rolling'
            ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-400/50'
            : 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-400/50',
          'shadow-2xl',
          drawPhase === 'rolling'
            ? 'shadow-[inset_0_0_12px_rgba(239,68,68,0.4),inset_0_0_24px_rgba(249,115,22,0.3)]'
            : 'shadow-[inset_0_0_12px_rgba(139,92,246,0.4),inset_0_0_24px_rgba(34,211,238,0.3)]',
          drawPhase === 'rolling'
            ? 'hover:from-red-800/40 hover:to-orange-800/40 hover:border-red-300/70'
            : 'hover:from-cyan-800/40 hover:to-purple-800/40 hover:border-cyan-300/70',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'text-white'
        )}
      >
        {drawPhase === 'idle' && canDraw && (
          <div className="absolute inset-0 rounded-2xl blur-2xl gentle-pulse bg-cyan-400/20" />
        )}
        {drawPhase === 'rolling' ? (
          <span className="text-2xl animate-pulse">⏹</span>
        ) : (
          <Play className="w-6 h-6 md:w-7 md:h-7" />
        )}
        <span>
          {drawPhase === 'rolling'
            ? isDecelerating
              ? '即将揭晓…'
              : '抽奖进行中'
            : drawPhase === 'revealing'
              ? '抽奖结束 展示中…'
              : '开始抽奖'}
        </span>
        <div
          className={cn(
            'absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent to-transparent slow-scan-line',
            drawPhase === 'rolling' ? 'via-red-400' : 'via-cyan-400'
          )}
        />
      </Button>

      <style jsx>{`
        @keyframes scan {
          0% {
            background-position: 0 -100%;
          }
          100% {
            background-position: 0 100%;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        @keyframes grid-pulse {
          0% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0.2;
          }
        }
        @keyframes bounce-in {
          0% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          60% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-grid-pulse {
          animation: grid-pulse 5s infinite alternate;
        }
        .animate-bounce-in {
          animation: bounce-in 0.7s ease-out;
        }
        .gentle-pulse {
          animation: pulse-slow 2.4s ease-in-out infinite;
        }
        .slow-scan-line {
          animation: scan 2.5s linear infinite;
        }
      `}</style>
    </main>
  )
}
