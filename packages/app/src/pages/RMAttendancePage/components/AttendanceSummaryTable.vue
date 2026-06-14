<script lang="ts" setup>
import type { AttendanceCandidateSummary } from '@rm/types'

defineProps<{
  summaries: AttendanceCandidateSummary[]
}>()
</script>

<template>
  <div class="attendance-summary rm-mobile-scroll">
    <table class="attendance-summary__table">
      <thead>
        <tr>
          <th>候補日時</th>
          <th>○</th>
          <th>△</th>
          <th>×</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="summary in summaries" :key="summary.candidateId">
          <td>{{ summary.label }}</td>
          <td>{{ summary.availableCount }}</td>
          <td>{{ summary.maybeCount }}</td>
          <td>{{ summary.unavailableCount }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.attendance-summary__table {
  width: 100%;
  min-width: 420px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.attendance-summary__table th,
.attendance-summary__table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.attendance-summary__table th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.84rem;
  font-weight: 800;
}

.attendance-summary__table td {
  color: #1f2937;
}

.attendance-summary__table tbody tr:last-child td {
  border-bottom: none;
}

.attendance-summary__table th:not(:first-child),
.attendance-summary__table td:not(:first-child) {
  width: 72px;
  text-align: center;
}
</style>
