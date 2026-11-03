<template>
  <div class="info-panel flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 backdrop-blur-xl shadow-xl shadow-slate-950/20">
    <h2 class="flex shrink-0 items-center gap-2 text-base font-semibold text-slate-100">
      <span class="text-cyan-400">🖥</span> {{ t('serverInfo.title') }}
      <span class="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        {{ t('serverInfo.online') }}
      </span>
    </h2>

    <div class="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      <!-- 玩家数 -->
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-400">{{ t('serverInfo.players') }}</span>
          <span class="font-mono text-slate-200">
            <span class="text-cyan-400">{{ info.players?.total ?? 0 }}</span>
            <span class="text-slate-500"> / {{ info.players?.max ?? '?' }}</span>
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700"
            :style="{ width: playerPercentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- 版本 -->
      <div class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2 text-xs">
        <span class="text-slate-400">{{ t('serverInfo.version') }}</span>
        <span class="font-mono text-slate-200">{{ info.version || t('serverInfo.unknown') }}</span>
      </div>

      <!-- 世界种子 -->
      <div v-if="info.seed" class="flex items-center gap-1 rounded-xl bg-slate-950/60 px-3 py-2 text-xs">
        <span class="text-slate-400">{{ t('serverInfo.seed') }}:</span>
        <a
          :href="seedMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >{{ info.seed }}</a>
      </div>

      <!-- TPS（如果可用） -->
      <div v-if="info.tps" class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2 text-xs">
        <span class="text-slate-400">{{ t('serverInfo.tps') }}</span>
        <span class="font-mono" :class="tpsColorClass">{{ info.tps }}</span>
      </div>

      <!-- MSPT（如果可用） -->
      <div v-if="info.mspt" class="flex items-center justify-between rounded-xl bg-slate-950/60 px-3 py-2 text-xs">
        <span class="text-slate-400">{{ t('serverInfo.mspt') }}</span>
        <span class="font-mono" :class="msptColorClass">{{ info.mspt }}ms</span>
      </div>

      <!-- Mods（如果可用，默认折叠避免列表过长） -->
      <div v-if="info.mods && info.mods.length > 0" class="mt-3 border-t border-slate-700/50 pt-3">
        <button
          @click="modsOpen = !modsOpen"
          class="flex w-full items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200"
        >
          <span class="text-[10px] transition-transform" :class="{ 'rotate-90': modsOpen }">▶</span>
          {{ t('serverInfo.mods') }} ({{ info.mods.length }})
        </button>
        <div v-show="modsOpen" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="mod in info.mods"
            :key="mod"
            class="inline-block rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition-colors"
          >{{ mod }}</span>
        </div>
      </div>
      <div v-else-if="info.mods !== undefined && info.mods.length === 0" class="mt-3 border-t border-slate-700/50 pt-3">
        <span class="text-xs text-slate-500">{{ t('serverInfo.noMods') }}</span>
      </div>

      <!-- 在线玩家列表 -->
      <div v-if="info.players?.names?.length" class="mt-3 border-t border-slate-700/50 pt-3">
        <span class="text-xs font-medium text-slate-400">{{ t('serverInfo.playerList') }}</span>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="name in info.players.names"
            :key="name"
            class="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200"
          >
            <span class="text-[10px]">🧑</span> {{ name }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue';
import { t } from '../i18n';

interface PlayerInfo {
  total: number;
  max: number;
  names: string[];
}

interface ServerInfo {
  host?: string;
  port?: number;
  version?: string;
  players?: PlayerInfo;
  tps?: string;
  mspt?: string;
  mods?: string[];
  seed?: string;
}

export default defineComponent({
  props: {
    info: { type: Object as PropType<ServerInfo>, required: true },
  },
  setup(props) {
    const modsOpen = ref(false);

    const playerPercentage = computed(() => {
      const p = props.info.players;
      if (!p || p.max === 0) return 0;
      return Math.min(100, Math.round((p.total / p.max) * 100));
    });

    const tpsColorClass = computed(() => {
      const tps = props.info.tps;
      if (!tps) return 'text-slate-400';
      const val = parseFloat(tps);
      if (val >= 19) return 'text-emerald-400';
      if (val >= 15) return 'text-amber-400';
      return 'text-rose-400';
    });

    const msptColorClass = computed(() => {
      const mspt = props.info.mspt;
      if (!mspt) return 'text-slate-400';
      const val = parseFloat(mspt);
      if (val < 40) return 'text-emerald-400';
      if (val < 50) return 'text-amber-400';
      return 'text-rose-400';
    });

    const seedMapUrl = computed(() => {
      const seed = props.info.seed;
      if (!seed) return '#';
      // 兜底：如果 seed 含有 "Seed: [...]" 前缀，提取纯数字
      const seedNum = String(seed).match(/(-?\d+)/)?.[1] || seed;
      const mcMatch = String(props.info.version || '').match(/(\d+\.\d+(?:\.\d+)?)/);
      // 版本未知时不猜平台版本，交给种子地图站点使用默认值
      const platform = mcMatch ? `java_${mcMatch[1]}` : 'java';
      return `https://minecraftsearch.com/zh-CN/%E5%B7%A5%E5%85%B7/%E7%A7%8D%E5%AD%90%E5%9C%B0%E5%9B%BE#seed=${seedNum}&platform=${platform}&dimension=overworld&x=0&z=0&zoom=13`;
    });

    return { playerPercentage, tpsColorClass, msptColorClass, seedMapUrl, modsOpen, t };
  },
});
</script>
