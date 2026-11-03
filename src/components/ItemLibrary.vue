<template>
  <div class="item-library flex h-full min-h-0 flex-col overflow-hidden">
    <!-- Section Tabs: Vanilla / Custom -->
    <div class="flex shrink-0 items-center gap-2 px-5 pt-4 pb-3">
      <button @click="section = 'vanilla'" :class="['rounded-lg px-3 py-1.5 text-xs font-medium transition', section === 'vanilla' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:text-slate-300']">{{ t('items.vanilla') }}</button>
      <button @click="section = 'custom'" :class="['rounded-lg px-3 py-1.5 text-xs font-medium transition', section === 'custom' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:text-slate-300']">{{ t('items.custom') }} <span class="text-[10px] opacity-60">({{ customGroups.length }})</span></button>
    </div>

    <!-- Search -->
    <div class="relative mx-5 mb-3 shrink-0">
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="t('items.searchPlaceholder')"
        class="w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-4 py-2.5 pl-10 text-sm text-slate-200 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10 backdrop-blur-xl"
      />
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <span v-if="searchQuery" class="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">{{ t('items.count', { count: String(filteredCount) }) }}</span>
    </div>

    <!-- Content -->
    <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <!-- ===== VANILLA ===== -->
      <template v-if="section === 'vanilla'">
        <template v-if="searchQuery">
          <div v-if="filteredVanilla.length === 0" class="py-12 text-center text-xs text-slate-600">{{ t('items.noResults') }}</div>
          <div v-else class="rounded-xl border border-slate-700/40 overflow-hidden">
            <table class="w-full text-xs">
              <thead class="sticky top-0 z-10 bg-slate-950/95"><tr class="text-left text-slate-400"><th class="px-3 py-2 w-1/2 font-medium border-b border-slate-700/40">{{ t('items.id') }}</th><th class="px-3 py-2 w-1/2 font-medium border-b border-slate-700/40">{{ t('items.name') }}</th></tr></thead>
              <tbody>
                <tr v-for="item in filteredVanilla" :key="item.id" @click="copyItem(item)" class="cursor-pointer hover:bg-slate-800/60 transition border-b border-slate-800/40 group">
                  <td class="px-3 py-1.5 font-mono text-cyan-400/80 group-hover:text-cyan-300">{{ item.id }}</td>
                  <td class="px-3 py-1.5 text-slate-300 group-hover:text-slate-200">{{ displayName(item) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <template v-else>
          <div v-for="cat in allCategories" :key="cat.key" class="mb-2">
            <button @click="toggleCategory(cat.key)" class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400 transition hover:bg-slate-800/50">
              <span class="transition-transform text-[10px]" :class="{ 'rotate-90': openCategory === cat.key }">▶</span>
              <span class="text-sm">{{ cat.icon }}</span> {{ cat.label }}
              <span class="ml-auto text-[10px] text-slate-600">{{ cat.items.length }}</span>
            </button>
            <div v-show="openCategory === cat.key" class="mt-1 rounded-lg border border-slate-700/30 overflow-hidden">
              <table class="w-full text-xs"><tbody>
                <tr v-for="item in cat.items" :key="item.id" @click="copyItem(item)" class="cursor-pointer hover:bg-slate-800/60 transition border-b border-slate-800/30 last:border-0 group">
                  <td class="px-3 py-1.5 w-1/2 font-mono text-cyan-400/80 group-hover:text-cyan-300">{{ item.id }}</td>
                  <td class="px-3 py-1.5 w-1/2 text-slate-300 group-hover:text-slate-200">{{ displayName(item) }}</td>
                </tr>
              </tbody></table>
            </div>
          </div>
        </template>
      </template>

      <!-- ===== CUSTOM ===== -->
      <template v-if="section === 'custom'">
        <!-- Add new group button -->
        <button v-if="!showAddForm" @click="showAddForm = true" class="w-full rounded-xl border-2 border-dashed border-slate-700/60 py-3 mb-3 text-xs text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition">
          + {{ t('items.addGroup') }}
        </button>

        <!-- Inline add form -->
        <div v-if="showAddForm" class="rounded-xl border border-cyan-500/30 bg-slate-950/80 p-4 mb-3">
          <label class="block text-xs font-medium text-slate-300 mb-2">{{ t('items.modName') }} <span class="text-rose-400">*</span></label>
          <input v-model="newModName" type="text" :placeholder="t('items.modNamePlaceholder')" class="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400 mb-3" />
          <div class="rounded-lg border border-slate-700/30 overflow-hidden mb-2">
            <table class="w-full text-xs">
              <thead class="bg-slate-900"><tr class="text-left text-slate-500"><th class="px-3 py-1.5 w-[45%] font-medium">{{ t('items.id') }}</th><th class="px-3 py-1.5 w-[45%] font-medium">{{ t('items.name') }}</th><th class="w-[10%]"></th></tr></thead>
              <tbody>
                <tr v-for="(row, idx) in newRows" :key="idx" class="border-b border-slate-800/40">
                  <td class="px-3 py-1"><input v-model="row.id" class="w-full bg-transparent font-mono text-cyan-400/80 outline-none text-xs py-0.5" :placeholder="t('items.idPlaceholder')" /></td>
                  <td class="px-3 py-1"><input v-model="row.name" class="w-full bg-transparent text-slate-300 outline-none text-xs py-0.5" :placeholder="t('items.name')" /></td>
                  <td class="px-1 text-center"><button @click="newRows.splice(idx, 1)" class="text-rose-500 hover:text-rose-400 text-sm">&times;</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <button @click="addNewRow" class="text-[11px] text-slate-500 hover:text-slate-300 mb-3 block">+ {{ t('items.addRow') }}</button>
          <div class="flex gap-2">
            <button @click="saveNewGroup" class="rounded-lg bg-cyan-500/90 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">{{ t('items.save') }}</button>
            <button @click="cancelAdd" class="rounded-lg bg-slate-800 px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200">{{ t('items.cancel') }}</button>
          </div>
          <p v-if="formError" class="mt-2 text-[11px] text-rose-400">{{ formError }}</p>
        </div>

        <!-- Existing custom groups -->
        <div v-if="filteredGroups.length === 0 && !showAddForm && customGroups.length === 0" class="py-12 text-center text-xs text-slate-600">{{ t('items.noCustom') }}</div>
        <div v-else-if="filteredGroups.length === 0 && searchQuery" class="py-12 text-center text-xs text-slate-600">{{ t('items.noResults') }}</div>
        <div v-for="group in filteredGroups" :key="group.mod" class="mb-2">
          <button @click="toggleCustomGroup(group.mod)" class="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] font-medium text-slate-400 transition hover:bg-slate-800/50">
            <span class="transition-transform text-[10px]" :class="{ 'rotate-90': openCustomGroup === group.mod }">▶</span>
            <span class="text-sm">📦</span> {{ group.mod }}
            <span class="ml-auto text-[10px] text-slate-600">{{ group.items.length }}</span>
            <button @click.stop="deleteGroup(group.mod)" class="text-[10px] text-slate-600 hover:text-rose-400 ml-1">✕</button>
          </button>
          <div v-show="openCustomGroup === group.mod" class="mt-1 rounded-lg border border-slate-700/30 overflow-hidden">
            <table class="w-full text-xs"><tbody>
              <tr v-for="item in group.items" :key="item.id" @click="copyItem(item)" class="cursor-pointer hover:bg-slate-800/60 transition border-b border-slate-800/30 last:border-0 group">
                <td class="px-3 py-1.5 w-1/2 font-mono text-cyan-400/80 group-hover:text-cyan-300">{{ item.id }}</td>
                <td class="px-3 py-1.5 w-1/2 text-slate-300 group-hover:text-slate-200">{{ displayName(item) }}</td>
              </tr>
            </tbody></table>
          </div>
        </div>
      </template>
    </div>

    <!-- Copied Toast -->
    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
        {{ t('items.copied', { id: toast }) }}
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, PropType } from 'vue';
import { allCategories, allItems } from '../data/allData';
import type { ItemEntry } from '../types';
import { t, locale } from '../i18n';
import { apiUrl } from '../api';

interface CustomGroup {
  mod: string;
  items: ItemEntry[];
}

export default defineComponent({
  props: {
    customGroups: { type: Array as PropType<CustomGroup[]>, default: () => [] },
  },
  emits: ['insert-item', 'refresh-custom'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const openCategory = ref<string | null>(null);
    const openCustomGroup = ref<string | null>(null);
    const toast = ref('');
    const section = ref<'vanilla' | 'custom'>('vanilla');

    // Add form state
    const showAddForm = ref(false);
    const newModName = ref('');
    const newRows = ref<ItemEntry[]>([{ id: '', name: '' }]);
    const formError = ref('');

    const filteredVanilla = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return [];
      return allItems.filter(item =>
        item.id.toLowerCase().includes(q) || item.name.includes(q)
      ).slice(0, 200);
    });

    const filteredGroups = computed(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return props.customGroups;
      return props.customGroups.filter(g =>
        g.mod.toLowerCase().includes(q) ||
        g.items.some(it => it.id.toLowerCase().includes(q) || it.name.includes(q) || (it.nameEn || '').toLowerCase().includes(q))
      );
    });

    const filteredCount = computed(() => {
      return section.value === 'vanilla'
        ? filteredVanilla.value.length
        : filteredGroups.value.reduce((s, g) => s + g.items.length, 0);
    });

    const toggleCategory = (key: string) => {
      openCategory.value = openCategory.value === key ? null : key;
    };

    const toggleCustomGroup = (mod: string) => {
      openCustomGroup.value = openCustomGroup.value === mod ? null : mod;
    };

    const displayName = (item: ItemEntry) => locale.current === 'en' ? (item.nameEn || item.name) : item.name;

    const copyItem = async (item: ItemEntry) => {
      const fullId = `minecraft:${item.id}`;
      try {
        await navigator.clipboard.writeText(fullId);
        toast.value = fullId;
        setTimeout(() => { toast.value = ''; }, 1500);
      } catch {
        emit('insert-item', fullId);
        toast.value = fullId;
        setTimeout(() => { toast.value = ''; }, 1500);
      }
    };

    const addNewRow = () => newRows.value.push({ id: '', name: '' });

    const cancelAdd = () => {
      showAddForm.value = false;
      newModName.value = '';
      newRows.value = [{ id: '', name: '' }];
      formError.value = '';
    };

    const saveNewGroup = async () => {
      formError.value = '';
      if (!newModName.value.trim()) { formError.value = t('addItems.modNameRequired'); return; }
      // Check duplicate
      if (props.customGroups.some(g => g.mod === newModName.value.trim())) {
        formError.value = t('addItems.duplicateMod');
        return;
      }
      const validRows = newRows.value.filter(r => r.id.trim() && r.name.trim());
      if (validRows.length === 0) { formError.value = t('addItems.emptyWarn'); return; }
      try {
        const res = await fetch(apiUrl('/api/custom-items'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mod: newModName.value.trim(), items: validRows }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Save failed');
        cancelAdd();
        emit('refresh-custom');
      } catch (err) {
        formError.value = (err as Error).message;
      }
    };

    const deleteGroup = async (mod: string) => {
      if (!confirm(t('items.confirmDelete', { mod }))) return;
      try {
        const res = await fetch(apiUrl('/api/custom-items'), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mod }),
        });
        const data = await res.json().catch(() => ({}));
        // 后台已删除但列表刷新失败时仍同步刷新，以便暴露真实状态
        emit('refresh-custom');
        if (!res.ok) throw new Error(data.error || 'Delete failed');
      } catch (err) {
        formError.value = (err as Error).message;
      }
    };

    return {
      searchQuery, openCategory, openCustomGroup, filteredVanilla, filteredGroups, filteredCount,
      allCategories, allItems, section, toast,
      showAddForm, newModName, newRows, formError,
      toggleCategory, toggleCustomGroup, displayName, copyItem, addNewRow, cancelAdd, saveNewGroup, deleteGroup,
      t,
    };
  },
});
</script>

<style scoped>
.item-library ::-webkit-scrollbar { width: 5px; }
.item-library ::-webkit-scrollbar-track { background: transparent; }
.item-library ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.12); border-radius: 3px; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
