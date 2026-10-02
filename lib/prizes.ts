export interface Gift {
  id: string
  name: string
  desc?: string
  image: string
  /** 该单品库存；0 表示不参与抽取，但仍展示 */
  quantity: number
}

export interface PrizeTier {
  level: number
  name: string
  key: string
  color: 'yellow' | 'slate' | 'orange' | 'purple'
  /** false 时仅在界面展示，不参与抽取 */
  drawable?: boolean
  gifts: Gift[]
}

export function tierTotal(tier: PrizeTier): number {
  return tier.gifts.reduce((sum, g) => sum + g.quantity, 0)
}

export function tierRemaining(tier: PrizeTier, remainingByGift: Record<string, number>): number {
  return tier.gifts.reduce((sum, g) => sum + (remainingByGift[g.id] ?? 0), 0)
}

export const PRIZE_TIERS: PrizeTier[] = [
  {
    level: 1,
    name: '一等奖',
    key: '1',
    color: 'yellow',
    gifts: [
      {
        id: 'l1-luggage',
        name: '行李箱',
        desc: '旅行箱',
        image: '/wedding-lottery/gifts/l1-luggage.png',
        quantity: 0,
      },
      {
        id: 'l1-hairdryer',
        name: '飞科高速负离子吹风机',
        desc: '高速负离子',
        image: '/wedding-lottery/gifts/l1-hairdryer.png',
        quantity: 6,
      },
      {
        id: 'l1-earbuds',
        name: '象鼻子魔豆蓝牙耳机',
        desc: '魔豆蓝牙耳机',
        image: '/wedding-lottery/gifts/l1-earbuds.png',
        quantity: 4,
      },
    ],
  },
  {
    level: 2,
    name: '二等奖',
    key: '2',
    color: 'slate',
    gifts: [
      {
        id: 'l2-skincare',
        name: '护肤套装',
        desc: '水密码护肤四件套',
        image: '/wedding-lottery/gifts/l2-skincare.png',
        quantity: 8,
      },
      {
        id: 'l2-cup',
        name: '陶瓷内胆保温杯',
        desc: '500ml 陶瓷覆层内胆',
        image: '/wedding-lottery/gifts/l2-cup.png',
        quantity: 4,
      },
    ],
  },
  {
    level: 3,
    name: '三等奖',
    key: '3',
    color: 'orange',
    gifts: [
      {
        id: 'l3-zhengshan',
        name: '正山小种红茶礼盒',
        desc: '武夷红茶 · 100g',
        image: '/wedding-lottery/gifts/l3-tea-zhengshan.jpg',
        quantity: 4,
      },
      {
        id: 'l3-jinjunmei',
        name: '金骏眉红茶礼盒',
        desc: '武夷金芽 · 100g',
        image: '/wedding-lottery/gifts/l3-tea-jinjunmei.jpg',
        quantity: 4,
      },
      {
        id: 'l3-chenpi',
        name: '陈皮白茶礼盒',
        desc: '2016贡眉 × 2017陈皮',
        image: '/wedding-lottery/gifts/l3-tea-chenpi.jpg',
        quantity: 3,
      },
      {
        id: 'l3-mudan',
        name: '雪后牡丹白茶礼盒',
        desc: '2023年白牡丹 · 125g',
        image: '/wedding-lottery/gifts/l3-tea-mudan.jpg',
        quantity: 3,
      },
    ],
  },
  {
    level: 4,
    name: '幸运奖',
    key: '4',
    color: 'purple',
    gifts: [
      {
        id: 'l4-bodywash',
        name: '茉莉依兰香氛洗发沐浴套装',
        desc: '洗发水 800ml + 沐浴露 800ml',
        image: '/wedding-lottery/gifts/l4-bodywash.jpg',
        quantity: 4,
      },
      {
        id: 'l4-shampoo',
        name: '控秀洗发乳',
        desc: 'Cōomshol · 沙龙级居家洗护 750ml',
        image: '/wedding-lottery/gifts/l4-shampoo.jpg',
        quantity: 4,
      },
      {
        id: 'l4-cigarette-hall',
        name: '人民大会堂盛京中支香烟',
        desc: '盛京中支',
        image: '/wedding-lottery/gifts/l4-cigarette-hall.png',
        quantity: 5,
      },
      {
        id: 'l4-cigarette-pack',
        name: '人民大会堂香烟',
        desc: '红盒装',
        image: '/wedding-lottery/gifts/l4-cigarette-pack.jpg',
        quantity: 5,
      },
    ],
  },
]

export const TIER_COLORS: Record<
  string,
  {
    border: string
    text: string
    chip: string
    glow: string
    gradient: string
    iconBg: string
    progressBg: string
  }
> = {
  yellow: {
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    chip: 'from-yellow-500 to-amber-500',
    glow: '0 0 20px rgba(251,191,36,0.5)',
    gradient: 'from-yellow-500/30 via-amber-500/20 to-orange-500/30',
    iconBg: 'bg-yellow-500/20',
    progressBg: 'bg-gradient-to-r from-yellow-500 to-amber-500',
  },
  slate: {
    border: 'border-slate-400/50',
    text: 'text-slate-300',
    chip: 'from-slate-400 to-gray-500',
    glow: '0 0 20px rgba(148,163,184,0.5)',
    gradient: 'from-slate-400/30 via-gray-300/20 to-slate-400/30',
    iconBg: 'bg-slate-400/20',
    progressBg: 'bg-gradient-to-r from-slate-400 to-gray-300',
  },
  orange: {
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    chip: 'from-orange-500 to-red-600',
    glow: '0 0 20px rgba(249,115,22,0.5)',
    gradient: 'from-amber-600/30 via-orange-500/20 to-amber-600/30',
    iconBg: 'bg-orange-500/20',
    progressBg: 'bg-gradient-to-r from-orange-500 to-red-500',
  },
  purple: {
    border: 'border-purple-500/50',
    text: 'text-purple-300',
    chip: 'from-purple-500 to-pink-500',
    glow: '0 0 20px rgba(168,85,247,0.5)',
    gradient: 'from-purple-500/30 via-pink-500/20 to-purple-500/30',
    iconBg: 'bg-purple-500/20',
    progressBg: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
}
