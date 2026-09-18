// hooks/use-danmaku.ts
'use client'

import * as React from 'react'

// 每条弹幕的类型定义
export type DanmakuMessage = {
  id: string
  content: string
  // 可以在这里添加更多属性，如颜色、速度、类型（滚动/顶部/底部）等
}

type Action =
  | { type: 'ADD_DANMAKU'; message: Omit<DanmakuMessage, 'id'> }
  | { type: 'REMOVE_DANMAKU'; id: string }

interface DanmakuState {
  messages: DanmakuMessage[]
}

const initialState: DanmakuState = {
  messages: [],
}

function danmakuReducer(state: DanmakuState, action: Action): DanmakuState {
  switch (action.type) {
    case 'ADD_DANMAKU':
      const newMessage: DanmakuMessage = {
        id: Math.random().toString(36).substring(2, 9), // 简单ID生成
        ...action.message,
      }
      return {
        ...state,
        messages: [...state.messages, newMessage],
      }
    case 'REMOVE_DANMAKU':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.id),
      }
    default:
      return state
  }
}

const DanmakuContext = React.createContext<{
  state: DanmakuState
  addDanmaku: (content: string) => void
  removeDanmaku: (id: string) => void
} | null>(null)

// Provider 组件，用于包裹需要使用弹幕功能的子组件
export function DanmakuProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(danmakuReducer, initialState)

  const addDanmaku = React.useCallback((content: string) => {
    dispatch({ type: 'ADD_DANMAKU', message: { content } })
  }, [])

  const removeDanmaku = React.useCallback((id: string) => {
    dispatch({ type: 'REMOVE_DANMAKU', id })
  }, [])

  return (
    <DanmakuContext.Provider value={{ state, addDanmaku, removeDanmaku }}>
      {children}
    </DanmakuContext.Provider>
  )
}

// 自定义Hook，用于在组件中方便地使用弹幕功能
export function useDanmaku() {
  const context = React.useContext(DanmakuContext)
  if (!context) {
    throw new Error('useDanmaku must be used within a DanmakuProvider')
  }
  return context
}
