// ============================================================
// 数值分析预警页 — 数据 Hook
// 默认读取后端；设置 VITE_USE_FIN_API_MOCK=true 可强制本地 mock
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlertRule, AlertReport } from '../types'
import { fetchAlertRules, fetchAlertHistory } from '../api'
import { generateAlertReport } from '../lib/mockData'
import { useMock } from './useMock'

export function useNumericalAlerts() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [reports, setReports] = useState<AlertReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prevBreachedRef = useRef<Record<string, boolean>>({})
  const mock = useMock()

  // 初始化加载
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [rulesData, history] = await Promise.all([
          fetchAlertRules(),
          fetchAlertHistory(),
        ])
        if (cancelled) return
        setRules(rulesData)
        setReports(history)
        setError(null)
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message ?? '预警数据加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Mock 模式下的实时 tick（每 1.8s 随机波动）
  const tick = useCallback(() => {
    if (!mock) return
    setRules((prev) =>
      prev.map((r) => {
        const delta = (Math.random() - 0.5) * r.baseline * 0.06
        const next = Math.max(0, r.current + delta)
        const trend: AlertRule['trend'] =
          delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'flat'
        return { ...r, current: next, trend, breached: next >= r.threshold }
      }),
    )
  }, [mock])

  useEffect(() => {
    if (!mock) return
    const id = window.setInterval(tick, 1800)
    return () => window.clearInterval(id)
  }, [tick, mock])

  // 突破时生成告警报告
  useEffect(() => {
    if (!mock) return
    for (const r of rules) {
      const was = prevBreachedRef.current[r.id]
      prevBreachedRef.current[r.id] = r.breached
      if (r.breached && !was) {
        setReports((prev) => [generateAlertReport(r), ...prev].slice(0, 50))
      }
    }
  }, [rules, mock])

  return { rules, reports, loading, error }
}
