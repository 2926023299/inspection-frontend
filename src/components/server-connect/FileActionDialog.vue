<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'mkdir',
  },
  title: {
    type: String,
    default: '',
  },
  initialValue: {
    type: String,
    default: '',
  },
  targetLabel: {
    type: String,
    default: '',
  },
  targetDirectory: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'confirm'])
const inputValue = ref('')

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      inputValue.value = props.initialValue || ''
    }
  },
  { immediate: true },
)

const showInput = computed(() => props.mode !== 'delete')
const confirmButtonText = computed(() => (props.mode === 'delete' ? '确认删除' : '确认'))

function handleConfirm() {
  console.log('[DEBUG] FileActionDialog handleConfirm', { mode: props.mode, inputValue: inputValue.value })
  emit('confirm', inputValue.value.trim())
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    width="420px"
    class="file-action-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <span class="dialog-kicker">REMOTE FILE ACTION</span>
        <h3>{{ props.title }}</h3>
      </div>
    </template>

    <div class="dialog-body">
      <p v-if="props.mode === 'delete'" class="dialog-text">
        确认删除 <strong>{{ props.targetLabel }}</strong> 吗？
        <span v-if="props.targetDirectory">该目录会递归删除其全部子目录和文件。</span>
        <span v-else>该文件删除后无法恢复。</span>
      </p>
      <el-input
        v-if="showInput"
        v-model="inputValue"
        :placeholder="props.mode === 'mkdir' ? '输入目录名' : '输入新的文件名或路径'"
        clearable
      />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">取消</el-button>
      <el-button :type="props.mode === 'delete' ? 'danger' : 'primary'" @click="handleConfirm">
        {{ confirmButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-header h3 {
  margin: 8px 0 0;
  font-size: 22px;
}

.dialog-kicker {
  color: var(--text-subtle);
  font-size: 11px;
  letter-spacing: 0.16em;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dialog-text {
  margin: 0;
  color: var(--text-subtle);
  line-height: 1.7;
}
</style>
