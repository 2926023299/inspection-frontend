<script setup>
import { computed, ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { formatMysqlCell } from '@/utils/mysqlWorkbench'

const props = defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
})

const scrollRef = ref(null)
const tableWidth = computed(() => Math.max(props.columns.length * 140, 560))
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.rows.length,
    getScrollElement: () => scrollRef.value,
    estimateSize: () => 36,
    overscan: 8,
  })),
)
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
const totalSize = computed(() => rowVirtualizer.value.getTotalSize())
</script>

<template>
  <div ref="scrollRef" class="virtual-result-table">
    <div class="virtual-result-table__inner" :style="{ minWidth: `${tableWidth}px` }">
      <div
        class="virtual-result-table__header"
        :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))` }"
      >
        <div v-for="column in columns" :key="column" class="virtual-result-table__cell is-header">
          {{ column }}
        </div>
      </div>

      <div class="virtual-result-table__body" :style="{ height: `${totalSize}px` }">
        <div
          v-for="virtualRow in virtualRows"
          :key="virtualRow.key"
          class="virtual-result-table__row"
          :style="{
            transform: `translateY(${virtualRow.start}px)`,
            gridTemplateColumns: `repeat(${columns.length}, minmax(140px, 1fr))`,
          }"
        >
          <div v-for="column in columns" :key="column" class="virtual-result-table__cell" :title="formatMysqlCell(rows[virtualRow.index]?.[column])">
            {{ formatMysqlCell(rows[virtualRow.index]?.[column]) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-result-table {
  max-height: 100%;
  overflow: auto;
  border: 1px solid rgba(30, 42, 51, 0.1);
  border-radius: 8px;
  background: #fff;
}

.virtual-result-table__inner {
  position: relative;
}

.virtual-result-table__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  min-height: 38px;
  background: #f7f3ec;
  border-bottom: 1px solid rgba(30, 42, 51, 0.1);
}

.virtual-result-table__body {
  position: relative;
}

.virtual-result-table__row {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  width: 100%;
  min-height: 36px;
  border-bottom: 1px solid rgba(30, 42, 51, 0.06);
}

.virtual-result-table__cell {
  min-width: 0;
  padding: 8px 10px;
  overflow: hidden;
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-right: 1px solid rgba(30, 42, 51, 0.06);
}

.virtual-result-table__cell.is-header {
  color: var(--text-subtle);
  font-weight: 700;
}
</style>
