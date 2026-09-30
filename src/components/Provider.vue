<script setup lang="ts">
import { provide, ref, watch } from 'vue'
import { BackTop } from '@/components/ui/back-top'
import { useAppStore } from '@/stores/app'
import { buildGlassThemeTokens, tintGlassCardColor, toOpaqueGlassColor } from '@/utils/glassTheme'

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
    appStore.nodeCardGlassTintR,
    appStore.nodeCardGlassTintG,
    appStore.nodeCardGlassTintB,
  ] as const,
  ([preset, customColors]) => {
    const tint = {
      r: appStore.nodeCardGlassTintR,
      g: appStore.nodeCardGlassTintG,
      b: appStore.nodeCardGlassTintB,
    }
    const tokens = buildGlassThemeTokens(preset, customColors)
    const tinted = {
      ...tokens,
      lightCard: tintGlassCardColor(tokens.lightCard, tint),
      lightCardHover: tintGlassCardColor(tokens.lightCardHover, tint),
      darkCard: tintGlassCardColor(tokens.darkCard, tint),
      darkCardHover: tintGlassCardColor(tokens.darkCardHover, tint),
    }
    const root = document.documentElement
    root.style.setProperty('--glass-light-card', tinted.lightCard)
    root.style.setProperty('--glass-light-card-hover', tinted.lightCardHover)
    root.style.setProperty('--glass-light-control', tokens.lightControl)
    root.style.setProperty('--glass-light-header', tokens.lightHeader)
    root.style.setProperty('--glass-light-text', tokens.lightText)
    root.style.setProperty('--glass-light-muted-text', tokens.lightMutedText)
    root.style.setProperty('--glass-light-border', tokens.lightBorder)
    root.style.setProperty('--glass-light-shadow', tokens.lightShadow)
    root.style.setProperty('--glass-dark-card', tinted.darkCard)
    root.style.setProperty('--glass-dark-card-hover', tinted.darkCardHover)
    root.style.setProperty('--glass-dark-control', tokens.darkControl)
    root.style.setProperty('--glass-dark-header', tokens.darkHeader)
    root.style.setProperty('--glass-dark-text', tokens.darkText)
    root.style.setProperty('--glass-dark-muted-text', tokens.darkMutedText)
    root.style.setProperty('--glass-dark-border', tokens.darkBorder)
    root.style.setProperty('--glass-dark-shadow', tokens.darkShadow)
    // 关闭毛玻璃时的不透明卡片底色（保留 tint 调制结果）
    root.style.setProperty('--nc-card-solid-light', toOpaqueGlassColor(tinted.lightCard))
    root.style.setProperty('--nc-card-solid-light-hover', toOpaqueGlassColor(tinted.lightCardHover))
    root.style.setProperty('--nc-card-solid-dark', toOpaqueGlassColor(tinted.darkCard))
    root.style.setProperty('--nc-card-solid-dark-hover', toOpaqueGlassColor(tinted.darkCardHover))
  },
  { immediate: true, deep: true },
)

watch(
  () => [
    appStore.nodeCardGlassEnabled,
    appStore.nodeCardGlassBlur,
    appStore.nodeCardGlassHue,
    appStore.nodeCardGlassTemperature,
    appStore.nodeCardGlassGrayscale,
  ] as const,
  ([enabled, blur, hue, temperature, grayscale]) => {
    const root = document.documentElement
    root.style.setProperty('--nc-blur', `${blur}px`)
    root.classList.toggle('nc-card-glass-off', !enabled)

    // 色相 / 黑白：仅在开启毛玻璃且非中性值时应用整卡 filter
    const filterActive = enabled && (hue !== 0 || grayscale !== 0)
    root.classList.toggle('nc-card-fx', filterActive)
    root.style.setProperty('--nc-hue', `${hue}deg`)
    root.style.setProperty('--nc-gray', `${grayscale}%`)

    // 色温：开启毛玻璃且非中性值时叠加暖/冷色罩
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
