'use client'

import { cn } from '@/lib/utils'
import { Crown, Star, Award, Sparkles, Gift } from 'lucide-react'
import type { Gift as GiftItem, PrizeTier } from '@/lib/prizes'
import { TIER_COLORS } from '@/lib/prizes'

export interface DrawnRecord {
  id: string
  gift: GiftItem
  tier: PrizeTier
  drawnAt: number
}

interface WinnersListProps {
  records?: DrawnRecord[]
}

export function WinnersList({ records = [] }: WinnersListProps) {
  const safeRecords = Array.isArray(records) ? records : []

  const getIcon = (level: number) => {
    switch (level) {
      case 1:
        return <Crown className="w-4 h-4" />
      case 2:
        return <Star className="w-4 h-4" />
      case 3:
        return <Award className="w-4 h-4" />
      default:
        return <Gift className="w-4 h-4" />
    }
  }

  if (safeRecords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="relative inline-block">
          <Gift className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-cyan-500/50 animate-pulse" />
        </div>
        <p className="text-sm">等待第一件礼品被抽出...</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-none pr-1 space-y-2">
      {safeRecords.map((record, index) => {
        const colors = TIER_COLORS[record.tier.color]
        const isNew = index === 0

        return (
          <div
            key={record.id}
            className={cn(
              'relative p-3 rounded-xl border transition-all duration-500',
              colors.border,
              isNew ? 'animate-in slide-in-from-top-3 fade-in-0' : ''
            )}
            style={{
              background: 'linear-gradient(135deg, rgba(15,20,40,0.6) 0%, rgba(15,20,40,0.9) 100%)',
              boxShadow: isNew ? colors.glow : 'none',
              animationDelay: `${index * 30}ms`,
            }}
          >
            {isNew && (
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse" />
            )}

            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-lg overflow-hidden border',
                    colors.border
                  )}
                >
                  <img src={record.gift.image} alt="" className="w-full h-full object-contain bg-slate-950/50" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {safeRecords.length - index}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground truncate text-sm">{record.gift.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={colors.text}>{getIcon(record.tier.level)}</span>
                  <span className={cn('text-xs font-bold', colors.text)}>{record.tier.name}</span>
                </div>
              </div>

              {isNew && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span className="text-[10px] text-cyan-400 font-bold">NEW</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
