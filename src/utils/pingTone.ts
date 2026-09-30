// 延迟 / 丢包的分档配色与数值颜色。
// 聚合面板（延迟+丢包双面板）与三网分线路卡片（最多 3 条任务线路）共用同一套阈值，
// 保证同一份数据在任何位置的颜色语义一致。

export type PingToneLevel = 1 | 2 | 3 | 4 | 5

export function latencyToneLevel(latency: number): PingToneLevel {
  if (latency <= 60)
    return 1
  if (latency <= 100)
    return 2
  if (latency <= 160)
    return 3
  if (latency <= 200)
    return 4
  return 5
}

export function lossToneLevel(loss: number): PingToneLevel {
  if (loss <= 1)
    return 1
  if (loss <= 3)
    return 2
  if (loss <= 6)
    return 3
  if (loss <= 9)
    return 4
  return 5
}

export function latencyBarClass(latency: number): string {
  switch (latencyToneLevel(latency)) {
    case 1: return 'bg-signal-1'
    case 2: return 'bg-signal-2'
    case 3: return 'bg-signal-3 ping-signal-pattern-2'
    case 4: return 'bg-signal-4 ping-signal-pattern-3'
    default: return 'bg-signal-5 ping-signal-pattern-4'
  }
}

export function lossBarClass(loss: number): string {
  switch (lossToneLevel(loss)) {
    case 1: return 'bg-sky-400'
    case 2: return 'bg-amber-300'
    case 3: return 'bg-amber-400'
    case 4: return 'bg-orange-500'
    default: return 'bg-rose-500'
  }
}

/** 延迟数值文字配色：始终按档位着色。 */
export function latencyValueTextClass(latency: number): string {
  switch (latencyToneLevel(latency)) {
    case 1: return 'text-signal-1'
    case 2: return 'text-signal-2'
    case 3: return 'text-signal-3'
    case 4: return 'text-signal-4'
    default: return 'text-signal-5'
  }
}

/** 丢包数值文字配色：无丢包为蓝色系（直观），随丢包升高转暖色。 */
export function lossValueTextClass(loss: number): string {
  switch (lossToneLevel(loss)) {
    case 1: return 'text-sky-400'
    case 2: return 'text-amber-300'
    case 3: return 'text-amber-400'
    case 4: return 'text-orange-400'
    default: return 'text-rose-400'
  }
}

/** 卡片多线路显示取色（与极简探针移植版一致）：直接返回主题 CSS 变量，档位与原主题一致。 */
export function pingColor(value: number | null, metric: 'latency' | 'loss'): string {
  if (value === null)
    return 'var(--muted-foreground)'
  const thresholds = metric === 'latency' ? [60, 100, 160, 200] : [1, 3, 6, 9]
  const index = thresholds.findIndex(threshold => value <= threshold)
  return `var(--signal-${index < 0 ? 5 : index + 1})`
}
