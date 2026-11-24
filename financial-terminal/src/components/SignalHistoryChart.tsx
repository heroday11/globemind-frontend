import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { SeriesPoint } from '../types'
import type { PriceAlertLine } from '../lib/priceAlerts'

type Props = {
  points: SeriesPoint[]
  unit?: string
  label: string
  thresholds: PriceAlertLine[]
  historical?: boolean
  statusMessage?: string
  seriesLabel?: string
  maxPoints?: number
  onAddThreshold?: (value: number) => void
}

const fmt = (value: number) => value.toLocaleString('zh-CN', {
  maximumFractionDigits: value !== 0 && Math.abs(value) < 1 ? Math.min(20, Math.max(2, 2 - Math.floor(Math.log10(Math.abs(value))))) : 2,
})
function fmtTime(time: number, intraday = false) {
  const iso = new Date(time * 1000).toISOString()
  return iso.slice(5, 10).replace('-', '/') + (intraday ? ' ' + iso.slice(11, 16) : '')
}
function niceStep(range: number) {
  const rough = (range || 1) / 4
  const scale = 10 ** Math.floor(Math.log10(rough))
  const base = rough / scale
  return (base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10) * scale
}

export default function SignalHistoryChart({
  points, unit, label, thresholds, historical = false, statusMessage,
  seriesLabel = '观测值', maxPoints = 48, onAddThreshold,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 900, height: 480 })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const measure = () => {
      const r = element.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setSize({ width: Math.floor(r.width), height: Math.floor(r.height) })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [])
  const visiblePoints = useMemo(() => points
    .filter(p => Number.isFinite(p.time) && Number.isFinite(new Date(p.time * 1000).getTime()) && Number.isFinite(p.value))
    .slice().sort((a, b) => a.time - b.time)
    .slice(-Math.max(1, Number.isFinite(maxPoints) ? Math.floor(maxPoints) : points.length)), [points, maxPoints])
  const validThresholds = useMemo(() => thresholds.filter(t => Number.isFinite(t.price)), [thresholds])
  useEffect(() => setHoverIndex(null), [points, maxPoints])
  const layout = useMemo(() => {
    const values = [...visiblePoints.map(p => p.value), ...validThresholds.map(t => t.price)]
    const low = Math.min(0, ...values), high = Math.max(0, ...values)
    const integerCounts = /^(簇|条|项|次|人|个)(\/.*)?$/.test(unit || '')
    const step = Math.max(integerCounts ? 1 : 0, niceStep((high - low) * 1.12))
    const min = Math.floor(low / step) * step
    const max = Math.max(min + step, Math.ceil(high / step) * step)
    const left = Math.max(64, Math.max(fmt(min).length, fmt(max).length) * 10 + 20)
    const right = 24, top = 68, bottom = 62
    const width = Math.max(1, size.width - left - right), height = Math.max(1, size.height - top - bottom)
    const y = (value: number) => top + (max - value) / (max - min) * height
    return { min, max, step, left, right, top, width, height, y }
  }, [size, visiblePoints, validThresholds, unit])
  const meta = useMemo(() => {
    const gaps = visiblePoints.slice(1).map((p, i) => p.time - visiblePoints[i].time).filter(gap => gap > 0)
    const gap = gaps.length ? Math.min(...gaps) : 1
    const first = visiblePoints[0]?.time || 0
    const span = visiblePoints.length ? visiblePoints[visiblePoints.length - 1].time - first : 0
    const scale = layout.width / (span + gap)
    const slot = gap * scale
    return visiblePoints.map(p => ({
      ...p, x: layout.left + (p.time - first + gap / 2) * scale,
      y: layout.y(p.value), slot, width: Math.min(42, slot * .57),
    }))
  }, [layout, visiblePoints])
  const ticks = useMemo(() => Array.from({ length: Math.round((layout.max - layout.min) / layout.step) + 1 }, (_, i) => {
    const value = Number((layout.min + i * layout.step).toPrecision(12))
    return { value, y: layout.y(value) }
  }), [layout])
  const intraday = visiblePoints.length > 1 && visiblePoints[visiblePoints.length - 1].time - visiblePoints[0].time < 172800
  const timeTicks = useMemo(() => {
    if (!meta.length) return new Set<number>()
    const spacing = intraday ? 154 : 72
    const indices = new Set([0])
    let lastX = meta[0].x
    for (let i = 1; i < meta.length - 1; i += 1) {
      if (meta[i].x - lastX >= spacing && meta[meta.length - 1].x - meta[i].x >= spacing) {
        indices.add(i)
        lastX = meta[i].x
      }
    }
    if (meta.length > 1 && meta[meta.length - 1].x - lastX >= spacing) indices.add(meta.length - 1)
    return indices
  }, [meta, intraday])
  const hovered = hoverIndex === null ? null : meta[hoverIndex] || null
  const zero = layout.y(0), showValues = meta.length <= Math.floor(layout.width / 56)
  const coords = (event: MouseEvent<SVGSVGElement>) => {
    const r = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - r.left) / Math.max(r.width, 1) * size.width, y: (event.clientY - r.top) / Math.max(r.height, 1) * size.height }
  }
  const inside = (p: { x: number; y: number }) => p.x >= layout.left && p.x <= size.width - layout.right && p.y >= layout.top && p.y <= layout.top + layout.height
  const handleMove = (event: MouseEvent<SVGSVGElement>) => {
    if (!meta.length) return
    const p = coords(event)
    if (!inside(p)) { setHoverIndex(null); return }
    let nearest = 0
    for (let i = 1; i < meta.length; i += 1) {
      if (Math.abs(meta[i].x - p.x) < Math.abs(meta[nearest].x - p.x)) nearest = i
    }
    setHoverIndex(nearest)
  }
  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    const p = coords(event)
    if (!onAddThreshold || historical || !inside(p)) return
    onAddThreshold(Number((layout.max - (p.y - layout.top) / layout.height * (layout.max - layout.min)).toFixed(2)))
  }
  const handleKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!meta.length) return
    if (event.key === 'Escape') { setHoverIndex(null); return }
    if (event.key === 'Enter' && hovered && onAddThreshold && !historical) {
      event.preventDefault(); onAddThreshold(Number(hovered.value.toFixed(2))); return
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    setHoverIndex(current => {
      if (event.key === 'Home') return 0
      if (event.key === 'End') return meta.length - 1
      const i = current ?? (event.key === 'ArrowLeft' ? meta.length : -1)
      return Math.max(0, Math.min(meta.length - 1, i + (event.key === 'ArrowLeft' ? -1 : 1)))
    })
  }
  return (
    <div ref={wrapRef} className="world-state-history-chart relative h-full min-h-[20rem] w-full bg-white" title={historical ? statusMessage : undefined}>
      {!meta.length ? <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600" role="status">{statusMessage || '暂无数据'}</div> : <>
        <svg className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-300"
          viewBox={`0 0 ${size.width} ${size.height}`} role="img" tabIndex={0}
          aria-label={`${label}柱形图。${hovered ? `${fmtTime(hovered.time, true)} UTC，${fmt(hovered.value)} ${unit || ''}。` : ''}左右方向键查看观测值。`}
          onMouseMove={handleMove} onMouseLeave={() => setHoverIndex(null)} onClick={handleClick} onKeyDown={handleKey}
          onFocus={() => setHoverIndex(current => current ?? meta.length - 1)} onBlur={() => setHoverIndex(null)}>
          <text x={layout.left} y={21} fontSize="17" fill="#52627b">{unit ? `${seriesLabel}（${unit}）` : seriesLabel}</text>
          <rect x={size.width - 148} y={12} width="9" height="9" rx="2" fill="#8194e7" />
          <text x={size.width - 130} y={21} fontSize="17" fill="#52627b">{seriesLabel}</text>
          {ticks.map(t => <g key={t.value}>
            <line x1={layout.left} x2={size.width - layout.right} y1={t.y} y2={t.y} stroke={t.value === 0 ? '#a7b0c1' : '#e7ecf5'} strokeDasharray={t.value === 0 ? undefined : '3 5'} />
            <text x={layout.left - 12} y={t.y + 4} textAnchor="end" fontSize="17" fill="#667790" fontFamily="var(--gm-font-mono)">{fmt(t.value)}</text>
          </g>)}
          <line x1={layout.left} x2={layout.left} y1={layout.top} y2={layout.top + layout.height} stroke="#a7b0c1" />
          {meta.map((p, i) => {
            const active = hovered === p, color = active || i === meta.length - 1 ? '#506bda' : '#91a2e8'
            return <g key={`${p.time}-${i}`}>
              {active ? <rect x={p.x - p.slot / 2} y={layout.top} width={p.slot} height={layout.height} fill="#f2f5fd" /> : null}
              <rect x={p.x - p.width / 2} y={Math.min(p.y, zero)} width={p.width} height={Math.abs(zero - p.y)} rx="2" fill={color} />
              <circle cx={p.x} cy={p.y} r={active ? 4 : 3} fill="white" stroke={color} strokeWidth="1.7" />
              {showValues ? <text x={p.x} y={p.y + (p.value < 0 ? 19 : -12)} textAnchor="middle" fontSize="17" fill={active || i === meta.length - 1 ? '#4c68df' : '#667995'} fontFamily="var(--gm-font-mono)">{fmt(p.value)}</text> : null}
              {timeTicks.has(i) ? <text x={p.x} y={size.height - 36} textAnchor="middle" fontSize="17" fill="#667790" fontFamily="var(--gm-font-mono)">{fmtTime(p.time, intraday)}</text> : null}
            </g>
          })}
          {validThresholds.map(t => <g key={t.id}>
            <line x1={layout.left} x2={size.width - layout.right} y1={layout.y(t.price)} y2={layout.y(t.price)} stroke="#c66b79" strokeDasharray="5 6" />
            <text x={layout.left + 8} y={layout.y(t.price) - 7} fontSize="17" fill="#a94458">{t.label} · {fmt(t.price)}</text>
          </g>)}
          <text x={size.width - layout.right} y={size.height - 6} textAnchor="end" fontSize="17" fill="#52627b">日期（UTC）</text>
        </svg>
        {hovered ? <div className="pointer-events-none absolute z-10 min-w-[11rem] rounded-lg border border-[#dfe5f2] bg-white px-4 py-3 text-[#52627b] shadow-[0_8px_25px_rgba(35,61,114,0.10)]"
          style={{ left: Math.max(4, Math.min(hovered.x - 72, size.width - 198)), top: Math.max(30, Math.min(hovered.y - 96, size.height - 110)) }} role="status">
          <div className="font-mono text-xs">{new Date(hovered.time * 1000).toISOString().replace('T', ' ').slice(0, 16)} UTC</div>
          <div className="mt-3 flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-[#8194e7]" />{seriesLabel}</span>
            <span className="font-mono text-xl font-semibold text-[#304375]">{fmt(hovered.value)}<span className="ml-1 text-xs font-normal">{unit}</span></span>
          </div>
        </div> : null}
      </>}
    </div>
  )
}
