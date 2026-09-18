'use client'

import { cn } from '@/lib/utils'
import { Trophy, Award, Medal, Sparkles, Gift } from 'lucide-react'
import type { Gift as GiftItem, PrizeTier } from '@/lib/prizes'
import { TIER_COLORS, tierRemaining, tierTotal } from '@/lib/prizes'

interface PrizeDisplayProps {
  tiers: PrizeTier[]
  remainingByGift: Record<string, number>
}

export function PrizeDisplay({ tiers, remainingByGift }: PrizeDisplayProps) {
  const getIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Trophy className="w-5 h-5" />
      case 2:
        return <Award className="w-5 h-5" />
      case 3:
        return <Medal className="w-5 h-5" />
      default:
        return <Sparkles className="w-5 h-5" />
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {tiers.map(tier => {
        const colors = TIER_COLORS[tier.color]
        const remaining = tierRemaining(tier, remainingByGift)
        const total = tierTotal(tier)
        const drawnCount = Math.max(0, total - remaining)
        const percentage = total > 0 ? (remaining / total) * 100 : 0

        return (
          <div
            key={tier.level}
            className={cn('relative p-3 rounded-xl border transition-all duration-500', colors.border)}
            style={{
              background: 'linear-gradient(135deg, rgba(15,20,40,0.5) 0%, rgba(15,20,40,0.8) 100%)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg relative', colors.iconBg)}>
                <div className={colors.text}>{getIcon(tier.level)}</div>
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn('font-bold text-base', colors.text)}>{tier.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">剩余</span>
                  <span className={cn('text-lg font-black', colors.text)}>{remaining}</span>
                  <span className="text-xs text-muted-foreground">/ {total}</span>
                  {drawnCount > 0 && (
                    <span className="text-[10px] text-muted-foreground/70">已出 {drawnCount}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 h-1 bg-background/30 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', colors.progressBg)}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <ul className="mt-3 space-y-1.5">
              {tier.gifts.map((gift: GiftItem) => (
                <li
                  key={gift.id}
                  className="flex items-start gap-2 text-xs leading-snug text-foreground/90"
                >
                  <Gift className={cn('w-3 h-3 mt-0.5 shrink-0', colors.text)} />
                  <span className="min-w-0">
                    <span className="font-medium">{gift.name}</span>
                    {gift.desc && (
                      <span className="block text-muted-foreground/80 text-[11px]">{gift.desc}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
