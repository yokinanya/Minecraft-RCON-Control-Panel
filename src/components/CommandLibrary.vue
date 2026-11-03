<template>
  <div class="library-panel flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 backdrop-blur-xl shadow-xl shadow-slate-950/20">
    <div class="shrink-0 border-b border-slate-700/40 px-5 py-3.5">
      <h2 class="flex items-center gap-2 text-base font-semibold text-slate-100">
        <span class="text-cyan-400">📋</span> {{ t('cmdLibrary.title') }}
        <span class="ml-auto text-[11px] text-slate-500">{{ totalCount }} 条</span>
      </h2>
      <div class="mt-2.5 relative">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('cmdLibrary.search')"
          class="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 pl-8 text-xs text-slate-200 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
        />
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <template v-if="filteredCategories.length === 0">
        <p class="py-8 text-center text-xs text-slate-600">{{ t('cmdLibrary.noMatch') }}</p>
      </template>

      <div v-for="cat in filteredCategories" :key="cat.key" class="mb-3">
        <button
          @click="toggleCategory(cat.key)"
          class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400 transition hover:bg-slate-800/50"
        >
          <span class="transition-transform text-[10px]" :class="{ 'rotate-90': openCategory === cat.key }">▶</span>
          {{ locale.current === 'en' ? cat.labelEn : cat.label }}
          <span class="ml-auto text-[10px] text-slate-600">{{ cat.commands.length }}</span>
        </button>

        <div v-show="openCategory === cat.key" class="mt-1 space-y-0.5">
          <button
            v-for="cmd in cat.commands"
            :key="cmd.name"
            @click="$emit('select-command', cmd)"
            class="group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-slate-800/60"
          >
            <span class="shrink-0 font-mono text-[12px] text-cyan-400/80 group-hover:text-cyan-300">{{ cmd.name }}</span>
            <span class="truncate text-[11px] text-slate-500 group-hover:text-slate-400">{{ locale.current === 'en' ? (cmd.descriptionEn || cmd.description) : cmd.description }}</span>
            <span
              class="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
              :class="permissionDotClass(cmd.permission)"
            >P{{ cmd.permission }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { commandData, commandCategories, CommandEntry } from '../data/commandData';
import { t, locale } from '../i18n';

export default defineComponent({
  emits: ['select-command'],
  setup() {
    const searchQuery = ref('');
    const openCategory = ref<string | null>(null);

    const filteredCategories = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      const grouped = commandCategories.map(cat => ({
        ...cat,
        commands: commandData.filter(c => {
          if (c.category !== cat.key) return false;
          if (!q) return true;
          const name = c.name.toLowerCase();
          const desc = c.description.toLowerCase();
          const aliases = (c.aliases || []).join(' ').toLowerCase();
          return name.includes(q) || desc.includes(q) || aliases.includes(q);
        }),
      }));
      return grouped.filter(g => g.commands.length > 0);
    });

    const totalCount = commandData.length;

    const toggleCategory = (key: string) => {
      openCategory.value = openCategory.value === key ? null : key;
    };

    const permissionDotClass = (p: number) => {
      if (p === 0) return 'bg-slate-800 text-slate-500';
      if (p <= 2) return 'bg-cyan-500/15 text-cyan-400';
      if (p === 3) return 'bg-amber-500/15 text-amber-400';
      return 'bg-rose-500/15 text-rose-400';
    };

    return { searchQuery, openCategory, filteredCategories, totalCount, toggleCategory, permissionDotClass, t, locale };
  },
});
</script>

<style scoped>
.library-panel ::-webkit-scrollbar { width: 5px; }
.library-panel ::-webkit-scrollbar-track { background: transparent; }
.library-panel ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.12); border-radius: 3px; }
</style>
