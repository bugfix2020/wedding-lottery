// src/components/holographic-winner-name.tsx
'use client'

import { useEffect, useState } from 'react'

interface HolographicWinnerNameProps {
  name: string
  isVisible: boolean
}

export function HolographicWinnerName({ name, isVisible }: HolographicWinnerNameProps) {
  // 移除了 setShow 的状态管理以及 useEffect 中的定时隐藏逻辑

  if (!isVisible) return null // 如果 isVisible 是 false，直接返回 null 不渲染任何东西

  return (
    <div className="fixed inset-0 z-50 top-[10%] pointer-events-none">
      <div className="text-center animate-fade-in-scale">
        {/* 主名字 */}
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]">
          {name}
        </h1>

        {/* 辅助文字 */}
        <p className="mt-4 text-xl md:text-2xl text-cyan-200/80 tracking-wider font-medium drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
          恭喜中奖！
        </p>

        {/* 光晕背景（可选） */}
        <div className="absolute inset-0 rounded-full w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-purple-500/10 blur-[120px] animate-pulse-slow" />
      </div>
    </div>
  )
}
