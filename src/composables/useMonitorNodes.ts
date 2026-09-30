import { shallowRef } from 'vue'

// 监控面板（极简探针 127.0.0.1:28080，经 /monitor-api/ 同源反代）的节点数据。
// 卡片按节点名匹配后，用它的流量口径覆盖本地面板显示（流量使用量、周期上下行、额度）。

export interface MonitorNode {
  name: string
  traffic_limit?: number
  traffic_mode?: string
  month_used?: number
  month_rx?: number
  month_tx?: number
  last_seen?: number
}

const monitorNodes = shallowRef<Map<string, MonitorNode>>(new Map())
let started = false

async function refreshMonitorNodes(): Promise<void> {
  try {
    const res = await fetch('/monitor-api/nodes', { headers: { Accept: 'application/json' } })
    if (!res.ok)
      return
    const payload = await res.json() as { nodes?: MonitorNode[] }
    const next = new Map<string, MonitorNode>()
    for (const node of payload.nodes ?? []) {
      if (!node?.name)
        continue
      const prev = next.get(node.name)
      // 同名多节点（重复注册）时取最近活跃的
      if (!prev || (node.last_seen ?? 0) > (prev.last_seen ?? 0))
        next.set(node.name, node)
    }
    monitorNodes.value = next
  }
  catch {
    // 监控面板不可用时保持上一次数据 / 回退本地值
  }
}

export function useMonitorNodes() {
  if (!started) {
    started = true
    void refreshMonitorNodes()
    setInterval(() => { void refreshMonitorNodes() }, 5 * 60 * 1000)
  }
  return monitorNodes
}
