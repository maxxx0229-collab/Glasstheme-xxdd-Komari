import type { GlassCustomColors } from '@/stores/app'

export type GlassColorPreset = 'emerald' | 'soft' | 'contrast' | 'midnight' | 'custom'

interface GlassThemeTokens {
  lightCard: string
  lightCardHover: string
  lightControl: string
  lightHeader: string
  lightText: string
  lightMutedText: string
  lightBorder: string
  lightShadow: string
  darkCard: string
  darkCardHover: string
  darkControl: string
  darkHeader: string
  darkText: string
  darkMutedText: string
  darkBorder: string
  darkShadow: string
}

const PRESET_TOKENS: Record<Exclude<GlassColorPreset, 'custom'>, GlassThemeTokens> = {
  emerald: {
    lightCard: '#f1f5f9bd',
    lightCardHover: '#f8fafccc',
    lightControl: '#e2e8f0c2',
    lightHeader: '#e2e8f0bd',
    lightText: '#10151c',
    lightMutedText: '#374151',
    lightBorder: '#cbd5e199',
    lightShadow: '0 8px 28px rgb(15 23 42 / 0.18)',
    darkCard: '#0d111ad9',
    darkCardHover: '#111827e8',
    darkControl: '#101624d9',
    darkHeader: '#0b1020d9',
    darkText: '#f8fafc',
    darkMutedText: '#d6dae4',
    darkBorder: '#ffffff2e',
    darkShadow: '0 8px 30px rgb(0 0 0 / 0.48)',
  },
  soft: {
    lightCard: '#f8fafcdb',
    lightCardHover: '#f8fafceb',
    lightControl: '#f1f5f9e0',
    lightHeader: '#f1f5f9e0',
    lightText: '#14151a',
    lightMutedText: '#4b5563',
    lightBorder: '#cbd5e1a6',
    lightShadow: '0 8px 24px rgb(15 23 42 / 0.12)',
    darkCard: '#111827e6',
    darkCardHover: '#111827f2',
    darkControl: '#111827e0',
    darkHeader: '#0f172ae6',
    darkText: '#f8fafc',
    darkMutedText: '#cbd5e1',
    darkBorder: '#ffffff24',
    darkShadow: '0 8px 26px rgb(0 0 0 / 0.42)',
  },
  contrast: {
    lightCard: '#f8fafcf2',
    lightCardHover: '#f8fafcff',
    lightControl: '#f1f5f9f2',
    lightHeader: '#f1f5f9f2',
    lightText: '#080b12',
    lightMutedText: '#1f2937',
    lightBorder: '#cbd5e1cc',
    lightShadow: '0 10px 30px rgb(2 6 23 / 0.2)',
    darkCard: '#020617f2',
    darkCardHover: '#020617ff',
    darkControl: '#020617f0',
    darkHeader: '#020617f2',
    darkText: '#ffffff',
    darkMutedText: '#e5e7eb',
    darkBorder: '#ffffff3d',
    darkShadow: '0 10px 34px rgb(0 0 0 / 0.58)',
  },
  midnight: {
    lightCard: '#eaf4ffcc',
    lightCardHover: '#f3f8ffe6',
    lightControl: '#eaf4ffe0',
    lightHeader: '#eaf4ffd9',
    lightText: '#0f172a',
    lightMutedText: '#334155',
    lightBorder: '#c7ddff99',
    lightShadow: '0 8px 30px rgb(30 64 175 / 0.18)',
    darkCard: '#07111fcc',
    darkCardHover: '#0b1628e6',
    darkControl: '#07111fd9',
    darkHeader: '#07111fd9',
    darkText: '#eaf2ff',
    darkMutedText: '#c7d2fe',
    darkBorder: '#60a5fa40',
    darkShadow: '0 8px 34px rgb(0 0 0 / 0.52)',
  },
}

function withHoverAlpha(color: string): string {
  return color.length === 9 ? `${color.slice(0, 7)}e6` : color
}

export function buildGlassThemeTokens(preset: GlassColorPreset, customColors: GlassCustomColors): GlassThemeTokens {
  if (preset !== 'custom')
    return PRESET_TOKENS[preset]

  return {
    lightCard: customColors.lightCard,
    lightCardHover: withHoverAlpha(customColors.lightCard),
    lightControl: customColors.lightControl,
    lightHeader: customColors.lightControl,
    lightText: customColors.lightText,
    lightMutedText: customColors.lightMutedText,
    lightBorder: customColors.lightBorder,
    lightShadow: '0 8px 28px rgb(15 23 42 / 0.16)',
    darkCard: customColors.darkCard,
    darkCardHover: withHoverAlpha(customColors.darkCard),
    darkControl: customColors.darkControl,
    darkHeader: customColors.darkControl,
    darkText: customColors.darkText,
    darkMutedText: customColors.darkMutedText,
    darkBorder: customColors.darkBorder,
    darkShadow: '0 8px 30px rgb(0 0 0 / 0.48)',
  }
}

/** 节点卡片颜色 RGB 调整：各通道取值 0-255，255 为不调整 */
export interface NodeCardTintChannels {
  r: number
  g: number
  b: number
}

/**
 * 把十六进制颜色（#RRGGBB / #RGB，允许省略 #）解析为 RGB 三通道。
 * 无效输入回退为 {255,255,255}（即不调整）。
 */
export function hexToTintChannels(hex: string): NodeCardTintChannels {
  const raw = String(hex ?? '').trim().replace(/^#/, '')
  const full = raw.length === 3
    ? raw.split('').map(char => `${char}${char}`).join('')
    : raw
  if (!/^[0-9a-f]{6}$/i.test(full))
    return { r: 255, g: 255, b: 255 }
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toHexByte(value: number): string {
  return clampChannel(value).toString(16).padStart(2, '0')
}

/**
 * 将卡片背景色按 RGB 系数乘法调制（各通道 × 滑块值/255，alpha 保持不变）。
 * 三个通道均为 255 时返回原色；无效颜色回退原样返回。
 */
export function tintGlassCardColor(color: string, tint: NodeCardTintChannels): string {
  const factorR = clampChannel(tint.r) / 255
  const factorG = clampChannel(tint.g) / 255
  const factorB = clampChannel(tint.b) / 255
  if (factorR === 1 && factorG === 1 && factorB === 1)
    return color

  const match = color.trim().match(HEX_COLOR_PATTERN)
  if (!match)
    return color

  let hex = match[1] ?? ''
  if (!hex)
    return color
  if (hex.length === 3)
    hex = hex.split('').map(char => `${char}${char}`).join('')

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const alpha = hex.length === 8 ? hex.slice(6, 8) : 'ff'

  return `#${toHexByte(red * factorR)}${toHexByte(green * factorG)}${toHexByte(blue * factorB)}${alpha}`
}

/**
 * 按明亮度系数缩放卡片背景色（各通道 × factor，alpha 保持不变）。
 * factor=1 为原亮度，<1 变暗（偏黑），>1 变亮（偏白）。仅影响底框背景，不影响文字。
 */
export function scaleGlassColorBrightness(color: string, factor: number): string {
  const safeFactor = Number.isFinite(factor) ? Math.min(3, Math.max(0, factor)) : 1
  if (safeFactor === 1)
    return color

  const match = color.trim().match(HEX_COLOR_PATTERN)
  if (!match)
    return color

  let hex = match[1] ?? ''
  if (!hex)
    return color
  if (hex.length === 3)
    hex = hex.split('').map(char => `${char}${char}`).join('')

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const alpha = hex.length === 8 ? hex.slice(6, 8) : 'ff'

  return `#${toHexByte(red * safeFactor)}${toHexByte(green * safeFactor)}${toHexByte(blue * safeFactor)}${alpha}`
}

/**
 * 将带透明度的颜色转为完全不透明（#RRGGBBAA → #RRGGBBFF），用于关闭毛玻璃后的纯色卡片。
 */
export function toOpaqueGlassColor(color: string): string {
  const match = color.trim().match(HEX_COLOR_PATTERN)
  if (!match)
    return color

  let hex = match[1] ?? ''
  if (!hex)
    return color
  if (hex.length === 3)
    hex = hex.split('').map(char => `${char}${char}`).join('')

  return `#${hex.slice(0, 6)}ff`
}

function parseHexColor(color: string): { r: number, g: number, b: number, a: number } | null {
  const match = color.trim().match(HEX_COLOR_PATTERN)
  if (!match)
    return null
  let hex = match[1] ?? ''
  if (!hex)
    return null
  if (hex.length === 3)
    hex = hex.split('').map(char => `${char}${char}`).join('')
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
  }
}

/**
 * 在两个颜色间按 ratio 线性插值（ratio=0 取 A，1 取 B，含 alpha 通道）。
 * 用于「卡片明亮度」：浅色主题卡片色(0) ↔ 深色主题卡片色(100) 的平滑过渡。
 */
export function mixGlassColors(colorA: string, colorB: string, ratio: number): string {
  const t = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0
  const a = parseHexColor(colorA)
  const b = parseHexColor(colorB)
  if (!a || !b)
    return t < 0.5 ? colorA : colorB
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${toHexByte(lerp(a.r, b.r))}${toHexByte(lerp(a.g, b.g))}${toHexByte(lerp(a.b, b.b))}${toHexByte(lerp(a.a, b.a))}`
}
