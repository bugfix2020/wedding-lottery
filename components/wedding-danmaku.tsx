'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface WeddingDanmakuProps {
  isSpinning: boolean
  hasResult: boolean
  prizeLevel: number
  giftName?: string
  tierName?: string
}

const hostPhrases = [
  '百年好合！今天全场都是见证人！',
  '郑雨 & 胡紫萱，新婚快乐！',
  '来咯来咯！这位宾客手气必须爆棚！',
  '礼品已经备好，就等幸运的你！',
  '一、二、三等加幸运奖，总有一件属于你！',
  '搓搓手！欧气借我用用？',
  '不抢红包抢礼品，今天你是主角！',
  '命运的齿轮开始转动了...',
  '紧张吗？我比你还紧张呢！',
  '前方高能！礼品马上揭晓！',
  '666666！这波稳了！',
  '愿天下有情人终成眷属，愿你好运连连！',
]

const spinningPhrases = [
  '转起来！转起来！看我的魔法小手！',
  '大家屏住呼吸！就差一点点啦！',
  '让我看看是哪件幸运礼品！',
  '都给我期待起来！',
  '芜湖！起飞！',
  '这波稳了！信我！',
  '转转转！礼品马上就来！',
  '好运正在加载中...',
]

const winPhrases: Record<number, string[]> = {
  1: [
    '绝了绝了！一等奖「{gift}」带回家！',
    '哇塞哇塞！{gift} 这运气借我用用？',
    '一等奖！！！{gift} 请让我摸一摸！',
    '大奖就是{gift}！沾沾喜气！',
  ],
  2: [
    '二等奖！{gift} 稳稳的幸福啊！',
    '哎呦不错哦！{gift} 归你了！',
    '二等奖「{gift}」拿下！有实力！',
  ],
  3: [
    '三等奖！{gift} 也是锦鲤啊！',
    '恭喜喜提 {gift}！',
    '有奖就是胜利！{gift} 拿好！',
  ],
  4: [
    '幸运奖！{gift} 喜气带回家！',
    '恭喜抽中 {gift}，回去慢慢品！',
    '幸运加身！{gift} 带走带走！',
  ],
}

const idlePhrases = [
  '新婚快乐，好运不断~',
  '别划走！下一件礼品超香！',
  '幸福时刻，即将开始！',
  '掌声在哪里？礼品在哪里！',
  '今天不加班，今天只沾喜气！',
]

interface DanmakuItem {
  id: number
  text: string
  y: number
  speed: number
  color: string
  size: number
  glow: boolean
}

const colors = [
  'text-cyan-400',
  'text-purple-400',
  'text-pink-400',
  'text-yellow-400',
  'text-green-400',
  'text-blue-400',
  'text-orange-400',
  'text-red-400',
  'text-indigo-400',
  'text-lime-400',
  'text-fuchsia-400',
]

export function WeddingDanmaku({
  isSpinning,
  hasResult,
  prizeLevel,
  giftName,
  tierName,
}: WeddingDanmakuProps) {
  const [danmakus, setDanmakus] = useState<DanmakuItem[]>([])
  const lastResultRef = useRef<string | null>(null)
  const idRef = useRef(0)

  const addDanmaku = useCallback((text: string, priority: 'high' | 'normal' = 'normal') => {
    const id = idRef.current++
    const newDanmaku: DanmakuItem = {
      id,
      text,
      y: Math.random() * 80 + 5,
      speed: priority === 'high' ? 10 + Math.random() * 10 : 15 + Math.random() * 15,
      color: priority === 'high' ? 'text-yellow-300' : colors[Math.floor(Math.random() * colors.length)],
      size: priority === 'high' ? 1.5 + Math.random() * 0.5 : 0.8 + Math.random() * 0.7,
      glow: priority === 'high' || Math.random() > 0.3,
    }

    setDanmakus(prev => [...prev.slice(-30), newDanmaku])

    setTimeout(
      () => {
        setDanmakus(prev => prev.filter(d => d.id !== newDanmaku.id))
      },
      newDanmaku.speed * 1000 + 1000
    )
  }, [])

  useEffect(() => {
    if (isSpinning) {
      lastResultRef.current = null
      const allPhrases = [...hostPhrases, ...spinningPhrases]
      const initialPhrase = allPhrases[Math.floor(Math.random() * allPhrases.length)]
      addDanmaku(initialPhrase, 'high')

      const interval = setInterval(() => {
        const phrase = allPhrases[Math.floor(Math.random() * allPhrases.length)]
        addDanmaku(phrase, Math.random() > 0.7 ? 'high' : 'normal')
      }, 800)

      return () => clearInterval(interval)
    }
  }, [isSpinning, addDanmaku])

  useEffect(() => {
    if (hasResult && giftName && giftName !== lastResultRef.current) {
      lastResultRef.current = giftName
      const phrases = winPhrases[prizeLevel] || winPhrases[4]
      const phrase = phrases[Math.floor(Math.random() * phrases.length)].replace('{gift}', giftName)

      addDanmaku(phrase, 'high')
      setTimeout(() => addDanmaku('恭喜恭喜！！！', 'high'), 300)
      setTimeout(
        () =>
          addDanmaku(
            prizeLevel === 1
              ? '欧皇诞生！！！'
              : prizeLevel === 2
                ? '666666！'
                : prizeLevel === 4
                  ? '喜气满满！'
                  : '撒花撒花~',
            'normal'
          ),
        600
      )
      if (tierName) {
        setTimeout(() => addDanmaku(`${tierName} · ${giftName}`, 'normal'), 900)
      }
    }
  }, [hasResult, giftName, prizeLevel, tierName, addDanmaku])

  useEffect(() => {
    if (!isSpinning && !hasResult) {
      const interval = setInterval(() => {
        const phrase = idlePhrases[Math.floor(Math.random() * idlePhrases.length)]
        addDanmaku(phrase, 'normal')
      }, 4000)

      return () => clearInterval(interval)
    }
  }, [isSpinning, hasResult, addDanmaku])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {danmakus.map(danmaku => (
        <div
          key={danmaku.id}
          className={cn('absolute whitespace-nowrap font-bold', 'animate-danmaku-fly', danmaku.color)}
          style={{
            top: `${danmaku.y}%`,
            left: '100%',
            fontSize: `${danmaku.size}rem`,
            animationDuration: `${danmaku.speed}s`,
            transform: `translateX(0)`,
            textShadow: danmaku.glow
              ? '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor'
              : '0 2px 4px rgba(0,0,0,0.5)',
            opacity: 0.9,
          }}
        >
          {danmaku.text}
        </div>
      ))}

      <style jsx>{`
        @keyframes danmaku-fly {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-300vw - 100%));
          }
        }
        .animate-danmaku-fly {
          animation: danmaku-fly linear forwards;
        }
      `}</style>
    </div>
  )
}
