const quotaNumberFormat = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
})

export function formatQuotaMoney(value) {
  if (value == null) return '不限'
  const formatted = quotaNumberFormat.format(value)
  return `${formatted === '-0.00' ? '0.00' : formatted} 元`
}
