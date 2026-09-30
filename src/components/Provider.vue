<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { BackTop } from '@/components/ui/back-top'
import { useAppStore } from '@/stores/app'
import { buildGlassThemeTokens, hexToTintChannels, scaleGlassColorBrightness, tintGlassCardColor, toOpaqueGlassColor } from '@/utils/glassTheme'

const appStore = useAppStore()

const isScrolled = ref(false)
provide('isScrolled', isScrolled)

// Firefox 对大量 backdrop-filter 图层的合成性能较差，标记后走不透明降级样式。
// （不能再用 @supports (-moz-appearance: none) 判断：新版 Chromium 同样命中该条件，会误禁用全部毛玻璃。）
if (typeof window !== 'undefined') {
  const isFirefox = /firefox|fxios/i.test(navigator.userAgent)
  document.documentElement.classList.toggle('is-firefox', isFirefox)
}

watch(
  () => appStore.isDark,
  (dark) => {
    const root = document.documentElement
    if (dark)
      root.classList.add('dark')
    else root.classList.remove('dark')
    root.style.colorScheme = dark ? 'dark' : 'light'
  },
  { immediate: true },
)

watch(
  () => [
    appStore.glassColorPreset,
    appStore.glassCustomColors,
    appStore.nodeCardGlassTint,
    appStore.nodeCardGlassBrightness,
  ] as const,
  ([preset, customColors]) => {
    const tint = hexToTintChannels(appStore.nodeCardGlassTint)
    const brightFactor = appStore.nodeCardGlassBrightness / 100
    const tokens = buildGlassThemeTokens(preset, customColors)
    // 节点卡片专用底色：先按 RGB 调色，再按明亮度缩放（不影响其他卡片与文字）。
    const cardColor = (c: string) => scaleGlassColorBrightness(tintGlassCardColor(c, tint), brightFactor)
    const ncLight = cardColor(tokens.lightCard)
    const ncLightHover = cardColor(tokens.lightCardHover)
    const ncDark = cardColor(tokens.darkCard)
    const ncDarkHover = cardColor(tokens.darkCardHover)
    const root = document.documentElement
    // 全局玻璃配色（主题原值，供 .bg-card 等其他卡片使用，不含节点卡片调节）。
    root.style.setProperty('--glass-light-card', tokens.lightCard)
    root.style.setProperty('--glass-light-card-hover', tokens.lightCardHover)
    root.style.setProperty('--glass-light-control', tokens.lightControl)
    root.style.setProperty('--glass-light-header', tokens.lightHeader)
    root.style.setProperty('--glass-light-text', tokens.lightText)
    root.style.setProperty('--glass-light-muted-text', tokens.lightMutedText)
    root.style.setProperty('--glass-light-border', tokens.lightBorder)
    root.style.setProperty('--glass-light-shadow', tokens.lightShadow)
    root.style.setProperty('--glass-dark-card', tokens.darkCard)
    root.style.setProperty('--glass-dark-card-hover', tokens.darkCardHover)
    root.style.setProperty('--glass-dark-control', tokens.darkControl)
    root.style.setProperty('--glass-dark-header', tokens.darkHeader)
    root.style.setProperty('--glass-dark-text', tokens.darkText)
    root.style.setProperty('--glass-dark-muted-text', tokens.darkMutedText)
    root.style.setProperty('--glass-dark-border', tokens.darkBorder)
    root.style.setProperty('--glass-dark-shadow', tokens.darkShadow)
    // 节点卡片专用变量（含 RGB / 明亮度调节）。
    root.style.setProperty('--nc-card-light', ncLight)
    root.style.setProperty('--nc-card-light-hover', ncLightHover)
    root.style.setProperty('--nc-card-dark', ncDark)
    root.style.setProperty('--nc-card-dark-hover', ncDarkHover)
    // 关闭毛玻璃时的不透明纯色（同样含调节）。
    root.style.setProperty('--nc-card-solid-light', toOpaqueGlassColor(ncLight))
    root.style.setProperty('--nc-card-solid-light-hover', toOpaqueGlassColor(ncLightHover))
    root.style.setProperty('--nc-card-solid-dark', toOpaqueGlassColor(ncDark))
    root.style.setProperty('--nc-card-solid-dark-hover', toOpaqueGlassColor(ncDarkHover))
  },
  { immediate: true, deep: true },
)

watch(
  () => [
    appStore.nodeCardGlassEnabled,
    appStore.nodeCardGlassBlur,
    appStore.nodeCardGlassOpacity,
    appStore.nodeCardGlassHue,
    appStore.nodeCardGlassTemperature,
  ] as const,
  ([enabled, blur, opacity, hue, temperature]) => {
    const root = document.documentElement
    root.style.setProperty('--nc-blur', `${blur}px`)
    root.style.setProperty('--nc-alpha', `${opacity}%`)
    root.classList.toggle('nc-card-glass-off', !enabled)

    // 色相：仅在开启毛玻璃且非中性值时应用整卡 filter。
    const filterActive = enabled && hue !== 0
    root.classList.toggle('nc-card-fx', filterActive)
    root.style.setProperty('--nc-hue', `${hue}deg`)

    // 色温：开启毛玻璃且非中性值时叠加暖/冷色罩。
    const temperatureActive = enabled && temperature !== 0
    root.classList.toggle('nc-card-temp', temperatureActive)
    const strength = (Math.min(Math.abs(temperature), 100) / 100 * 0.22).toFixed(3)
    const tempRgb = temperature > 0 ? '255 138 76' : '88 166 255'
    root.style.setProperty('--nc-temp-color', `rgb(${tempRgb} / ${strength})`)
  },
  { immediate: true },
)

watch(
  () => appStore.colorVisionFriendly,
  (enabled) => {
    document.documentElement.classList.toggle('color-vision-friendly', enabled)
  },
  { immediate: true },
)
</script>

<template>
  <slot />
  <BackTop :visibility-height="320" @scrolled="isScrolled = $event" />
</template>
