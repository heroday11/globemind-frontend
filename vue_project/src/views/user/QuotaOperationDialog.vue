<script setup>
import { ref } from 'vue'
import { ElDialog } from 'element-plus'
import 'element-plus/es/components/dialog/style/css'
import QuotaOperationForm from './QuotaOperationForm.vue'

defineProps({
  userId: { type: Number, required: true },
  operation: { type: String, default: '' },
})
const emit = defineEmits(['close', 'saved'])
const saving = ref(false)
</script>

<template>
  <el-dialog
    :model-value="Boolean(operation)"
    :title="operation === 'redeem' ? '输入额度兑换码' : '开通套餐'"
    class="quota-operation-dialog"
    width="min(420px, calc(100vw - 32px))"
    append-to-body
    align-center
    :lock-scroll="false"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @update:model-value="!$event && emit('close')"
  >
    <QuotaOperationForm
      v-if="operation"
      :key="operation"
      :user-id="userId"
      :operation="operation"
      @busy="saving = $event"
      @close="emit('close')"
      @saved="emit('saved', $event); emit('close')"
    />
  </el-dialog>
</template>

<style scoped>
:global(.quota-operation-dialog) {
  max-height: calc(100dvh - 24px);
  overflow-y: auto;
}
</style>
