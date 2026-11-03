<template>
  <div class="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl">
    <h2 class="text-xl font-bold text-slate-100 mb-6">{{ t('addItems.title') }}</h2>

    <!-- Mod Name -->
    <div class="mb-5">
      <label class="block text-sm font-medium text-slate-300 mb-2">
        {{ t('addItems.modName') }} <span class="text-rose-400">*</span>
      </label>
      <input
        v-model="modName"
        type="text"
        required
        :placeholder="t('addItems.modNamePlaceholder')"
        class="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
      />
    </div>

    <!-- Editable Two-Column Table -->
    <div class="rounded-xl border border-slate-700/40 overflow-hidden mb-3">
      <table class="w-full text-xs">
        <thead class="bg-slate-950/80">
          <tr class="text-left text-slate-400">
            <th class="px-4 py-2.5 w-[45%] font-medium">{{ t('addItems.id') }}</th>
            <th class="px-4 py-2.5 w-[45%] font-medium">{{ t('addItems.name') }}</th>
            <th class="w-[10%]"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="idx" class="border-b border-slate-800/40 hover:bg-slate-800/30">
            <td class="px-4 py-1.5">
              <input v-model="row.id" class="w-full bg-transparent font-mono text-cyan-400/80 outline-none py-1" placeholder="item_id" />
            </td>
            <td class="px-4 py-1.5">
              <input v-model="row.name" class="w-full bg-transparent text-slate-300 outline-none py-1" placeholder="显示名称" />
            </td>
            <td class="px-2 py-1.5 text-center">
              <button @click="removeRow(idx)" class="text-rose-500 hover:text-rose-400 text-lg leading-none">&times;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button @click="addRow" class="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition mb-6">
      + {{ t('addItems.addRow') }}
    </button>

    <!-- Actions -->
    <div class="flex gap-3">
      <button
        @click="save"
        class="rounded-xl bg-cyan-500/90 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 active:scale-[0.98]"
      >{{ t('addItems.save') }}</button>
      <button
        @click="cancel"
        class="rounded-xl bg-slate-800 px-6 py-2.5 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
      >{{ t('addItems.cancel') }}</button>
    </div>

    <!-- Status -->
    <p v-if="statusMsg" :class="[statusType === 'error' ? 'text-rose-400' : 'text-emerald-400', 'mt-4 text-xs']">{{ statusMsg }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import { t } from '../i18n';
import { apiUrl } from '../api';

interface RowData { id: string; name: string }

export default defineComponent({
  emits: ['navigate', 'saved'],
  setup(props, { emit }) {
    const modName = ref('');
    const rows = ref<RowData[]>([{ id: '', name: '' }]);
    const statusMsg = ref('');
    const statusType = ref<'info' | 'error'>('info');

    const addRow = () => rows.value.push({ id: '', name: '' });
    const removeRow = (idx: number) => {
      if (rows.value.length > 1) rows.value.splice(idx, 1);
    };

    const cancel = () => {
      modName.value = '';
      rows.value = [{ id: '', name: '' }];
      statusMsg.value = '';
      emit('navigate', 'items');
    };

    const save = async () => {
      statusMsg.value = '';
      if (!modName.value.trim()) {
        statusMsg.value = t('addItems.modNameRequired');
        statusType.value = 'error';
        return;
      }
      const validRows = rows.value.filter(r => r.id.trim() && r.name.trim());
      if (validRows.length === 0) {
        statusMsg.value = t('addItems.emptyWarn');
        statusType.value = 'error';
        return;
      }
      try {
        const res = await fetch(apiUrl('/api/custom-items'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mod: modName.value.trim(), items: validRows }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '保存失败');
        statusMsg.value = t('addItems.saved');
        statusType.value = 'info';
        modName.value = '';
        rows.value = [{ id: '', name: '' }];
        emit('saved');
      } catch (err) {
        statusMsg.value = t('addItems.saveFail') + ': ' + (err as Error).message;
        statusType.value = 'error';
      }
    };

    return { modName, rows, statusMsg, statusType, addRow, removeRow, save, cancel, t };
  },
});
</script>
