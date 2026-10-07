<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { CardX } from '@/components/ui/card-x'
import { DataTooltip } from '@/components/ui/data-tooltip'
import { ProgressThin } from '@/components/ui/progress-thin'
import { useNodePingDisplay } from '@/composables/useNodePingDisplay'
import { useNodePingTaskRows } from '@/composables/useNodePingStats'
import { PING_SUMMARY_MAX_COUNT } from '@/constants/load'
import { pingColor } from '@/utils/pingTone'
import { useAppStore } from '@/stores/app'
import { formatBytesPerSecondWithConfig, formatBytesWithConfig, formatDateTime, getStatus, getUptimeDays } from '@/utils/helper'
import { getDiskPercentage, getMemoryPercentage, getTrafficUsed } from '@/utils/nodeMetricsHelper'
import { getOSImage, getOSName } from '@/utils/osImageHelper'
import { getRegionCode, getRegionDisplayName } from '@/utils/regionHelper'
import { formatCurrencyValue, formatPriceWithCycle, getDaysUntilExpired, getExpireStatus, getRemainingValue, isFreePrice, parseTags } from '@/utils/tagHelper'

const props = withDefaults(defineProps<{
  node: NodeData
  reduceMotion?: boolean
  pingEnabled?: boolean
}>(), {
  reduceMotion: false,
  pingEnabled: true,
})
const emit = defineEmits<{
  click: []
  pingClick: []
}>()
const appStore = useAppStore()
const isFavorite = computed(() => appStore.isFavoriteNode(props.node.uuid))

function toggleFavorite(): void {
  appStore.toggleFavoriteNode(props.node.uuid)
}

function handleKeyboardOpen(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ')
    return
  event.preventDefault()
  emit('click')
}

interface RemainingInfoTag {
  icon: string
  text?: string
  prefix?: string
  value?: string
  unit?: string
  className?: string
}

const NODE_METRIC_ICONS = {
  cpu: 'tabler:cpu',
  memory: 'icon-park-outline:memory',
  disk: 'tabler:server-2',
  traffic: 'tabler:arrows-transfer-up-down',
} as const

const isMiniNodeCard = computed(() => appStore.nodeCardSize === 'mini')
const nodeCardXSize = computed(() => appStore.nodeCardSize === 'large' ? 'large' : 'medium')
const nodeCardContentClass = computed(() => appStore.nodeCardSize === 'large' ? 'gap-4' : isMiniNodeCard.value ? 'gap-2' : 'gap-3')
const nodeCardContentPaddingClass = computed(() => isMiniNodeCard.value ? 'pb-2' : '')
const nodeCardMetricGridClass = 'grid-cols-3'
const nodeCardMetricBoxClass = computed(() => isMiniNodeCard.value
  ? 'px-1 py-1'
  : appStore.nodeCardSize === 'compact' ? 'px-1.5 py-1.5' : 'px-2 py-1.5')
const nodeCardPanelClass = computed(() => appStore.nodeCardSize === 'large' ? 'h-14' : appStore.nodeCardSize === 'comfortable' ? 'h-12' : isMiniNodeCard.value ? 'h-7' : 'h-11')
const nodeCardPingPanelClass = computed(() => isMiniNodeCard.value ? 'gap-1 p-1' : 'gap-1.5 p-2')

const formatBytes = (bytes: number) => formatBytesWithConfig(bytes, appStore.byteDecimals)
const formatBytesPerSecond = (bytes: number) => formatBytesPerSecondWithConfig(bytes, appStore.byteDecimals)
const offlineTime = computed(() => formatDateTime(props.node.time))

const cpuStatus = computed(() => getStatus(props.node.cpu ?? 0))
const memPercentage = computed(() => getMemoryPercentage(props.node))
const memStatus = computed(() => getStatus(memPercentage.value))
const swapTooltip = computed(() => {
  const used = formatBytes(Math.max(0, props.node.swap ?? 0))
  const total = Math.max(0, props.node.swap_total ?? 0)
  return total > 0 ? `Swap 已用 ${used} / 总计 ${formatBytes(total)}` : `Swap 已用 ${used}`
})
const diskPercentage = computed(() => getDiskPercentage(props.node))
const diskStatus = computed(() => getStatus(diskPercentage.value))

const {
  latencyRenderBars,
  lossRenderBars,
  latencyDisplay,
  lossDisplay,
  latencyPanelTooltip,
  lossPanelTooltip,
} = useNodePingDisplay(() => props.node.uuid, { enabled: () => props.pingEnabled })

const pingSummaryHours = computed(() => {
  const preserveTime = appStore.publicSettings?.ping_record_preserve_time
  if (typeof preserveTime === 'number' && preserveTime > 0)
    return Math.min(preserveTime, 1)
  return 1
})

// 三网分线路（电信/联通/移动等，最多 3 条），无任务时回退为聚合面板
const { rows: pingTaskRows } = useNodePingTaskRows(() => props.node.uuid, {
  hours: pingSummaryHours,
  enabled: () => props.pingEnabled,
  maxCount: PING_SUMMARY_MAX_COUNT,
})

// 多线路色条提示（与极简探针移植版文案一致）
function latencyBarTooltip(bar: { time: string, latency: number | null, loss: number | null }): string {
  if (!bar.time)
    return '无采样'
  return `${new Date(bar.time).toLocaleTimeString()} · ${bar.latency === null ? '超时 / 无有效延迟' : `${bar.latency.toFixed(0)} ms`}`
}

function lossBarTooltip(bar: { time: string, latency: number | null, loss: number | null }): string {
  if (!bar.time)
    return '无采样'
  return `${new Date(bar.time).toLocaleTimeString()} · ${bar.loss === null ? '无丢包数据' : `${bar.loss.toFixed(1)}% 丢包`}`
}

// 流量口径：一律以 Komari 后台为准；「已使用流量矫正」可对指定节点手动覆盖已用总量（不分上下行）
const cardTrafficLimit = computed(() => props.node.traffic_limit ?? 0)
const cardHasTrafficLimit = computed(() => cardTrafficLimit.value > 0)
const trafficUsed = computed(() => {
  const correction = appStore.getTrafficUsedCorrection(props.node.name, props.node.uuid)
  return correction ?? getTrafficUsed(props.node)
})
const trafficUsedPercentage = computed(() => {
  if (!cardHasTrafficLimit.value)
    return 0
  return Math.min(trafficUsed.value / cardTrafficLimit.value * 100, 100)
})
const cardTrafficUp = computed(() => props.node.net_total_up ?? 0)
const cardTrafficDown = computed(() => props.node.net_total_down ?? 0)
const nodeMessage = computed(() => props.node.message?.trim() ?? '')
const nodeMessageTooltip = computed(() => {
  const message = nodeMessage.value
  if (!message)
    return ''
  const updatedAt = props.node.status_updated_at ? `\n更新时间：${formatDateTime(props.node.status_updated_at)}` : ''
  return `${message}${updatedAt}`
})

// 流量状态颜色
const trafficStatus = computed(() => {
  if (!cardHasTrafficLimit.value)
    return 'success'
  if (trafficUsedPercentage.value >= 95)
    return 'error'
  if (trafficUsedPercentage.value >= 80)
    return 'warning'
  if (trafficUsedPercentage.value >= 60)
    return 'info'
  return 'success'
})

const trafficPercentageClass = computed(() => {
  if (!cardHasTrafficLimit.value)
    return 'text-muted-foreground'
  if (trafficUsedPercentage.value >= 95)
    return 'text-destructive'
  if (trafficUsedPercentage.value >= 80)
    return 'text-warning'
  if (trafficUsedPercentage.value >= 60)
    return 'text-warning'
  return 'text-success'
})

// 是否显示金额：未登录且开启「未登录隐藏价格」时不显示价格 / 剩余价值，
// 但在线天数、剩余天数等非金额信息仍然展示
const showPrice = computed(() => appStore.privateFeaturesAllowed || !appStore.hidePriceWhenLoggedOut)

const uptimeDaysText = computed(() => {
  const days = getUptimeDays(props.node.uptime)
  return appStore.lang === 'zh-CN' ? `在线 ${days} 天` : `${days} days online`
})

const priceText = computed(() => {
  const node = props.node
  if (node.price === 0 || !showPrice.value)
    return ''
  return formatPriceWithCycle(node.price, node.billing_cycle, node.currency, appStore.lang)
})

// 第三列：剩余天数（始终） + 剩余价值（仅在允许显示金额时），带图标与相邻列对齐
const remainingInfoTags = computed<RemainingInfoTag[]>(() => {
  const node = props.node
  if (node.price === 0)
    return []
  const lang = appStore.lang
  const days = getDaysUntilExpired(node.expired_at)
  const status = getExpireStatus(node.expired_at)
  const items: RemainingInfoTag[] = []
  const expiryClass = status === 'expired' || status === 'critical'
    ? 'text-destructive'
    : status === 'warning' ? 'text-warning' : 'text-muted-foreground'

  if (status === 'unknown') {
    items.push({ icon: 'tabler:calendar-stats', text: '-', className: expiryClass })
  }
  else if (status === 'expired') {
    items.push({ icon: 'tabler:calendar-stats', text: lang === 'zh-CN' ? '已过期' : 'Expired', className: expiryClass })
  }
  else if (status === 'long_term') {
    items.push({ icon: 'tabler:calendar-stats', text: lang === 'zh-CN' ? '长期' : 'Long-term', className: expiryClass })
  }
  else if (lang === 'zh-CN') {
    items.push({ icon: 'tabler:calendar-stats', prefix: '剩余', value: String(days), unit: '天', className: expiryClass })
  }
  else {
    items.push({ icon: 'tabler:calendar-stats', prefix: 'left', value: String(days), unit: 'days', className: expiryClass })
  }

  if (showPrice.value) {
    const text = isFreePrice(node.price)
      ? lang === 'zh-CN' ? '无' : 'N/A'
      : formatCurrencyValue(getRemainingValue(node.price, node.billing_cycle, node.expired_at), node.currency)
    items.push({ icon: 'tabler:coins', text })
  }
  return items
})

const customTags = computed(() => parseTags(props.node.tags).map(t => t.text))

function getRegionAltText(region: string): string {
  return getRegionDisplayName(region) || getRegionCode(region)
}

function hasRegion(region: string | null | undefined): boolean {
  return Boolean(region?.trim())
}
</script>

<template>
  <CardX
    hoverable
    :size="nodeCardXSize"
    :content-class="nodeCardContentPaddingClass"
    class="node-card w-full cursor-pointer border-none shadow-[0_0_0_3px] shadow-transparent transition-all duration-200 rounded-xl"
    :class="[!props.node.online && '!shadow-destructive/30']"
    role="button"
    tabindex="0"
    :aria-label="`查看节点 ${props.node.name} 详情`"
    @click="emit('click')"
    @keydown="handleKeyboardOpen"
  >
    <!-- 头部：在线点 + 名称 -->
    <template #header>
      <div class="flex items-center gap-2 min-w-0">
        <div class="relative size-2.5 shrink-0">
          <span
            class="size-2.5 rounded-full block"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
          <span
            v-if="!props.reduceMotion"
            class="animate-ping absolute inset-0 rounded-full opacity-60"
            :class="props.node.online ? 'bg-success' : 'bg-destructive'"
          />
        </div>
        <span class="text-sm font-bold flex-1 min-w-0 truncate">{{ props.node.name }}</span>
        <DataTooltip
          v-if="nodeMessage"
          :content="nodeMessageTooltip"
          placement="top"
          as="span"
          class="inline-flex shrink-0 text-amber-500"
          content-class="w-56 whitespace-pre-line leading-snug text-left"
        >
          <Icon icon="tabler:alert-triangle-filled" width="14" height="14" aria-label="节点消息" />
        </DataTooltip>
      </div>
    </template>

    <!-- 头部右侧：OS + 国旗 -->
    <template #header-extra>
      <div class="flex gap-1.5 items-center shrink-0">
        <button
          type="button"
          class="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-slate-500/10 hover:text-amber-500"
          :class="isFavorite && 'text-amber-500'"
          :aria-label="isFavorite ? `取消收藏 ${props.node.name}` : `收藏 ${props.node.name}`"
          :title="isFavorite ? '取消收藏' : '收藏节点'"
          @click.stop="toggleFavorite"
          @keydown.stop
        >
          <Icon :icon="isFavorite ? 'tabler:star-filled' : 'tabler:star'" width="14" height="14" />
        </button>
        <img :src="getOSImage(props.node.os)" :alt="getOSName(props.node.os)" class="size-4">
        <img
          v-if="hasRegion(props.node.region)"
          :src="`/images/flags/${getRegionCode(props.node.region)}.svg`"
          :alt="getRegionAltText(props.node.region)"
          class="size-5 shrink-0"
        >
      </div>
    </template>

    <template #default>
      <div class="flex flex-col relative" :class="nodeCardContentClass">
        <!-- 在线天数固定展示，价格独立展示，避免不同主机卡片高度不一致 -->
        <div class="relative z-20 flex items-center gap-1.5 -mt-1 h-[19px] overflow-hidden">
          <span class="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-slate-500/10 text-muted-foreground leading-tight">
            {{ uptimeDaysText }}
          </span>
          <span
            v-if="priceText"
            class="min-w-0 truncate text-[11px] px-2 py-0.5 rounded-full bg-slate-500/10 text-muted-foreground leading-tight"
          >
            {{ priceText }}
          </span>
        </div>

        <!-- 四项进度条 -->
        <div v-if="isMiniNodeCard" class="grid grid-cols-[3fr_2fr] gap-x-4 gap-y-2">
          <div class="grid grid-cols-2 gap-x-3 gap-y-1">
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-xs">
                <span class="inline-flex items-center text-sky-500" role="img" title="CPU" aria-label="CPU">
                  <Icon :icon="NODE_METRIC_ICONS.cpu" data-node-metric-icon="cpu" width="12" height="12" aria-hidden="true" />
                </span>
                <span class="tabular-nums font-medium">{{ (props.node.cpu ?? 0).toFixed(1) }}%</span>
              </div>
              <ProgressThin :percentage="props.node.cpu ?? 0" :status="cpuStatus" :height="4" />
            </div>

            <div class="flex flex-col gap-1" :title="swapTooltip">
              <div class="flex justify-between text-xs">
                <span class="inline-flex items-center text-emerald-500" role="img" title="内存" aria-label="内存">
                  <Icon :icon="NODE_METRIC_ICONS.memory" data-node-metric-icon="memory" width="12" height="12" aria-hidden="true" />
                </span>
                <span class="tabular-nums font-medium">{{ memPercentage.toFixed(1) }}%</span>
              </div>
              <ProgressThin :percentage="memPercentage" :status="memStatus" :height="4" />
            </div>

            <div class="col-span-2 text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.ram ?? 0) }} / {{ formatBytes(props.node.mem_total ?? 0) }}
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.traffic" data-node-metric-icon="traffic" width="12" height="12" class="shrink-0 text-violet-500" aria-hidden="true" />
                <span class="truncate">流量</span>
              </span>
              <span class="tabular-nums font-medium" :class="trafficPercentageClass">
                {{ cardHasTrafficLimit ? `${trafficUsedPercentage.toFixed(1)}%` : '∞' }}
              </span>
            </div>
            <ProgressThin :percentage="trafficUsedPercentage" :status="trafficStatus" :height="4" />
            <div class="text-[11px] truncate" :class="trafficUsedPercentage >= 95 ? 'text-destructive' : 'text-muted-foreground'">
              {{ formatBytes(trafficUsed) }}
              <template v-if="cardHasTrafficLimit">
                / {{ formatBytes(cardTrafficLimit) }}
              </template>
              <template v-else>
                / ∞
              </template>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <!-- CPU -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.cpu" data-node-metric-icon="cpu" width="13" height="13" class="shrink-0 text-sky-500" aria-hidden="true" />
                <span class="truncate">CPU</span>
              </span>
              <span class="tabular-nums font-medium">{{ (props.node.cpu ?? 0).toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="props.node.cpu ?? 0" :status="cpuStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ (props.node.load ?? 0).toFixed(2) }}, {{ (props.node.load5 ?? 0).toFixed(2) }}, {{ (props.node.load15 ?? 0).toFixed(2) }}
            </div>
          </div>

          <!-- 内存 -->
          <div class="flex flex-col gap-1" :title="swapTooltip">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.memory" data-node-metric-icon="memory" width="13" height="13" class="shrink-0 text-emerald-500" aria-hidden="true" />
                <span class="truncate">内存</span>
              </span>
              <span class="tabular-nums font-medium">{{ memPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="memPercentage" :status="memStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.ram ?? 0) }} / {{ formatBytes(props.node.mem_total ?? 0) }}
            </div>
          </div>

          <!-- 硬盘 -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.disk" data-node-metric-icon="disk" width="13" height="13" class="shrink-0 text-orange-500" aria-hidden="true" />
                <span class="truncate">硬盘</span>
              </span>
              <span class="tabular-nums font-medium">{{ diskPercentage.toFixed(1) }}%</span>
            </div>
            <ProgressThin :percentage="diskPercentage" :status="diskStatus" :height="4" />
            <div class="text-[11px] text-muted-foreground truncate">
              {{ formatBytes(props.node.disk ?? 0) }} / {{ formatBytes(props.node.disk_total ?? 0) }}
            </div>
          </div>

          <!-- 流量（分级颜色） -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-xs">
              <span class="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                <Icon :icon="NODE_METRIC_ICONS.traffic" data-node-metric-icon="traffic" width="13" height="13" class="shrink-0 text-violet-500" aria-hidden="true" />
                <span class="truncate">流量</span>
              </span>
              <span class="tabular-nums font-medium" :class="trafficPercentageClass">
                {{ cardHasTrafficLimit ? `${trafficUsedPercentage.toFixed(1)}%` : '∞' }}
              </span>
            </div>
            <ProgressThin :percentage="trafficUsedPercentage" :status="trafficStatus" :height="4" />
            <div class="text-[11px] truncate" :class="trafficUsedPercentage >= 95 ? 'text-destructive' : 'text-muted-foreground'">
              {{ formatBytes(trafficUsed) }}
              <template v-if="cardHasTrafficLimit">
                / {{ formatBytes(cardTrafficLimit) }}
              </template>
              <template v-else>
                / ∞
              </template>
            </div>
          </div>
        </div>

        <!-- 三列：网速 / 总流量 / 剩余天数+价格或负载 -->
        <div class="grid gap-1.5" :class="nodeCardMetricGridClass">
          <!-- 实时网速 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <div class="text-[11px] text-success flex items-center gap-1">
              <Icon icon="tabler:chevron-up" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytesPerSecond(props.node.net_out ?? 0) }}</span>
            </div>
            <div class="text-[11px] text-blue-600 flex items-center gap-1">
              <Icon icon="tabler:chevron-down" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytesPerSecond(props.node.net_in ?? 0) }}</span>
            </div>
          </div>

          <!-- 总流量 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <div class="text-[11px] text-muted-foreground flex items-center gap-1">
              <Icon icon="tabler:upload" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytes(cardTrafficUp) }}</span>
            </div>
            <div class="text-[11px] text-muted-foreground flex items-center gap-1">
              <Icon icon="tabler:download" width="11" height="11" />
              <span class="truncate min-w-0 overflow-hidden">{{ formatBytes(cardTrafficDown) }}</span>
            </div>
          </div>

          <!-- 第三列：有价格显示剩余天数+价格，否则显示负载 -->
          <div class="flex flex-col gap-0.5 rounded-lg bg-slate-500/5 min-w-0 overflow-hidden" :class="nodeCardMetricBoxClass">
            <template v-if="remainingInfoTags.length">
              <div
                v-for="(item, i) in remainingInfoTags" :key="i"
                class="text-[11px] flex items-center gap-0.5"
                :class="item.className ?? 'text-muted-foreground'"
              >
                <Icon :icon="item.icon" width="11" height="11" class="shrink-0" />
                <span v-if="item.text" class="truncate min-w-0 overflow-hidden">{{ item.text }}</span>
                <template v-else>
                  <span v-if="item.prefix" class="shrink-0">{{ item.prefix }}</span>
                  <span v-if="item.value" class="shrink-0 tabular-nums">{{ item.value }}</span>
                  <span v-if="item.unit" class="shrink-0">{{ item.unit }}</span>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ (props.node.load ?? 0).toFixed(2) }}
              </div>
              <div class="text-[11px] text-muted-foreground truncate">
                {{ (props.node.load5 ?? 0).toFixed(2) }} / {{ (props.node.load15 ?? 0).toFixed(2) }}
              </div>
            </template>
          </div>
        </div>

        <!-- 多线路延迟（与 tz.ztzy.store 极简探针卡片 1:1：左延迟右丢包，各 20 格色条） -->
        <div v-if="pingTaskRows.length" class="multi-ping" data-multi-ping>
          <button
            v-for="row in pingTaskRows"
            :key="row.key"
            type="button"
            class="multi-ping-row"
            :class="!props.node.online ? 'blur-xs opacity-50' : ''"
            :aria-label="`${props.node.name} ${row.name} 延迟与丢包详情`"
            @click.stop="emit('pingClick')"
          >
            <div class="multi-ping-half">
              <div class="multi-ping-label">
                <span :title="row.name">{{ row.name }}</span>
                <strong :style="{ '--ping-value-color': pingColor(row.latency, 'latency') }">{{ row.latency !== null ? Math.round(row.latency) : row.timedOut ? '超时' : '—' }}<small v-if="row.latency !== null"> ms</small></strong>
              </div>
              <div class="multi-ping-bars" aria-hidden="true">
                <DataTooltip v-for="bar in row.bars" :key="`l-${bar.key}`" placement="top" :content="latencyBarTooltip(bar)">
                  <span :style="{ background: bar.time && bar.latency === null ? 'var(--signal-5)' : pingColor(bar.latency, 'latency'), opacity: bar.time ? 1 : 0.2 }" />
                </DataTooltip>
              </div>
            </div>
            <div class="multi-ping-half">
              <div class="multi-ping-label multi-ping-loss" :title="`${row.name} 最近 1 小时窗口丢包率`">
                <span class="sr-only">窗口丢包率</span>
                <strong :style="{ '--ping-value-color': pingColor(row.loss, 'loss') }">{{ row.loss === null ? '—' : row.loss.toFixed(1) }}<small v-if="row.loss !== null"> %</small></strong>
              </div>
              <div class="multi-ping-bars" aria-hidden="true">
                <DataTooltip v-for="bar in row.bars" :key="`p-${bar.key}`" placement="top" :content="lossBarTooltip(bar)">
                  <span :style="{ background: pingColor(bar.loss, 'loss'), opacity: bar.loss === null ? 0.2 : 1 }" />
                </DataTooltip>
              </div>
            </div>
          </button>
        </div>

        <!-- 延迟 + 丢包（无可用任务时回退为聚合面板） -->
        <div v-else class="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardPingPanelClass, nodeCardPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :title="latencyPanelTooltip"
            :aria-label="`${props.node.name} 延迟监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="text-muted-foreground">延迟</span>
              <span class="font-medium">{{ latencyDisplay }}</span>
            </div>
            <div
              data-node-ping-bars="latency"
              class="grid min-h-0 min-w-0 w-full flex-1 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
              :style="{ gridTemplateColumns: `repeat(${latencyRenderBars.length}, minmax(0, 1fr))` }"
            >
              <DataTooltip
                v-for="bar in latencyRenderBars" :key="bar.key"
                placement="top" :content="bar.tooltip" class="h-full w-full"
              >
                <span
                  class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                  :class="bar.className"
                />
              </DataTooltip>
            </div>
          </button>

          <button
            type="button"
            class="group/panel relative flex flex-col rounded-lg bg-slate-500/5"
            :class="[nodeCardPingPanelClass, nodeCardPanelClass, !props.node.online ? 'blur-xs opacity-50' : '']"
            :title="lossPanelTooltip"
            :aria-label="`${props.node.name} 丢包监测`"
            @click.stop="emit('pingClick')"
          >
            <div class="flex items-center justify-between text-[11px] leading-none">
              <span class="text-muted-foreground">丢包</span>
              <span class="font-medium">{{ lossDisplay }}</span>
            </div>
            <div
              data-node-ping-bars="loss"
              class="grid min-h-0 min-w-0 w-full flex-1 items-end gap-[1px] opacity-80 group-hover/panel:opacity-100"
              :style="{ gridTemplateColumns: `repeat(${lossRenderBars.length}, minmax(0, 1fr))` }"
            >
              <DataTooltip
                v-for="bar in lossRenderBars" :key="bar.key"
                placement="top" :content="bar.tooltip" class="h-full w-full"
              >
                <span
                  class="block h-full w-full rounded-[1px] transition-transform duration-150 group-hover/data-tooltip:scale-y-160 group-hover/panel:opacity-60 group-hover/data-tooltip:!opacity-100"
                  :class="bar.className"
                />
              </DataTooltip>
            </div>
          </button>
        </div>

        <!-- 自定义标签 -->
        <div v-if="customTags.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="(tag, i) in customTags" :key="i"
            variant="outline"
            class="!text-[11px] rounded-full text-muted-foreground border-muted-foreground/15 px-2 py-0"
          >
            {{ tag }}
          </Badge>
        </div>

        <!-- 离线遮罩 -->
        <div
          v-if="!props.node.online"
          class="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-white/20 dark:bg-black/20 backdrop-blur-[2px]"
        >
          <div class="text-sm font-semibold text-destructive">
            离线
          </div>
          <div class="text-[11px] text-muted-foreground mt-1">
            {{ offlineTime }}
          </div>
        </div>
      </div>
    </template>
  </CardX>
</template>

<style scoped>
.node-card {
  position: relative;
  overflow: hidden;
}

/* 多线路延迟样式：1:1 移植自 Gongsc/Theme-Glassmorphism（极简探针 NodeMultiPing） */
.multi-ping {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px 2px 4px;
  border-top: 1px solid color-mix(in srgb, currentColor 10%, transparent);
}
.multi-ping-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  text-align: left;
  width: 100%;
  border-radius: 4px;
  cursor: pointer;
}
.multi-ping-row:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 4px;
}
.multi-ping-half {
  min-width: 0;
}
.multi-ping-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 5px;
  line-height: 1.3;
}
.multi-ping-label > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted-foreground);
}
.multi-ping-label strong {
  color: color-mix(in srgb, var(--ping-value-color) 65%, var(--foreground));
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.multi-ping-label small {
  font-size: 10px;
  font-weight: 400;
  color: var(--muted-foreground);
}
.multi-ping-loss {
  justify-content: flex-end;
}
.multi-ping-bars {
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  gap: 2px;
  height: 9px;
}
.multi-ping-bars span {
  display: block;
  height: 9px;
  width: 100%;
  border-radius: 2px;
}
</style>
