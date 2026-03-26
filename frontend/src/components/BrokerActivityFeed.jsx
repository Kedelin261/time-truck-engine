/**
 * BrokerActivityFeed — Cutting-Edge Live Intraday Freight Intelligence
 *
 * Architecture Rule: All new logic communicates ONLY via the Intent Layer.
 * No Action Layer changes. All writes triggered via tt:intent events.
 *
 * Intent events fired:
 *   INTENT_REFRESH_BROKER_ACTIVITY  → manual or timed refresh
 *   INTENT_FILTER_BROKER_ACTIVITY   → filter feed
 *   INTENT_SELECT_BROKER_DETAIL     → drill into a single broker
 *   INTENT_EXPORT_BROKER_ACTIVITY   → export CSV
 *   INTENT_TOGGLE_VIEW_MODE         → switch view layout
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { api } from '../api'

// ── Intent Layer dispatcher ────────────────────────────────────────────────
function dispatchIntent(type, payload = {}) {
  window.dispatchEvent(new CustomEvent('tt:intent', { detail: { type, payload } }))
}

// ── Constants ─────────────────────────────────────────────────────────────
const EQUIP_LABEL = {
  DRY_VAN:      'Dry Van',   REEFER:       'Reefer',
  FLATBED:      'Flatbed',   STEP_DECK:    'Step Deck',
  BOX_TRUCK_26: "26' Box",   LOWBOY:       'Lowboy',
  POWER_ONLY:   'Power Only',
}
const EQUIP_COLOR = {
  DRY_VAN:'#1e40af', REEFER:'#0f766e', FLATBED:'#b45309',
  STEP_DECK:'#7c3aed', BOX_TRUCK_26:'#0369a1', LOWBOY:'#9a3412',
}

const DOC_META = {
  LOAD_TENDER: { label:'Load Tender',     icon:'📋', color:'#1e40af', bg:'#dbeafe', step:0 },
  RATE_CON:    { label:'Rate Confirmation',icon:'📄', color:'#6d28d9', bg:'#ede9fe', step:1 },
  BOL:         { label:'Bill of Lading',  icon:'📦', color:'#0f766e', bg:'#ccfbf1', step:2 },
  POD:         { label:'Proof of Delivery',icon:'✅', color:'#15803d', bg:'#dcfce7', step:3 },
  INVOICE:     { label:'Invoice',         icon:'💵', color:'#b45309', bg:'#fef3c7', step:4 },
}

const STATUS_META = {
  SENT:       { label:'Sent',        color:'#1e40af', bg:'#dbeafe', dot:'#3b82f6', pulse:false },
  CONFIRMED:  { label:'Confirmed',   color:'#6d28d9', bg:'#ede9fe', dot:'#8b5cf6', pulse:false },
  IN_TRANSIT: { label:'In Transit',  color:'#0f766e', bg:'#ccfbf1', dot:'#14b8a6', pulse:true  },
  DELIVERED:  { label:'Delivered',   color:'#15803d', bg:'#dcfce7', dot:'#22c55e', pulse:false },
  INVOICED:   { label:'Invoiced',    color:'#b45309', bg:'#fef9c3', dot:'#f59e0b', pulse:false },
}

// Doc pipeline order for the mini progress bar
const DOC_PIPELINE = ['LOAD_TENDER','RATE_CON','BOL','POD','INVOICE']

const REFRESH_INTERVAL = 30000   // 30 seconds for live feel
const NEW_FLASH_MS     = 5000    // flash new cards for 5s

// ── Helpers ────────────────────────────────────────────────────────────────
const equipLabel = t => EQUIP_LABEL[t] || t || '—'
const equipColor = t => EQUIP_COLOR[t] || '#475569'

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', hour12:true })
}

function fmtTimeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

function fmtDollars(n) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:0, maximumFractionDigits:0 })
}

function fmtDollarsFull(n) {
  if (n == null) return '—'
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })
}

function getHourBucket(iso) {
  if (!iso) return -1
  return new Date(iso).getHours()
}

function getMidnightMs() {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.getTime() - Date.now()
}

// Build hourly buckets 6am–8pm
function buildHourlyChart(feed) {
  const buckets = {}
  for (let h = 6; h <= 20; h++) buckets[h] = { loads:0, revenue:0 }
  feed.forEach(f => {
    const h = getHourBucket(f.sentAt)
    if (h >= 6 && h <= 20) {
      buckets[h].loads++
      buckets[h].revenue += f.rate || 0
    }
  })
  return Object.entries(buckets).map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
}

// ── Mini doc pipeline progress bar ────────────────────────────────────────
function DocPipeline({ docType }) {
  const currentStep = DOC_META[docType]?.step ?? 0
  return (
    <div className="doc-pipeline-bar">
      {DOC_PIPELINE.map((d, i) => {
        const m = DOC_META[d]
        const done    = i < currentStep
        const current = i === currentStep
        return (
          <div key={d} className={`dpb-step ${done ? 'dpb-done' : ''} ${current ? 'dpb-current' : ''}`}>
            <div className="dpb-circle" title={m.label} style={current ? { background: m.color, borderColor: m.color } : {}}>
              <span>{m.icon}</span>
            </div>
            {i < DOC_PIPELINE.length - 1 && (
              <div className={`dpb-line ${done ? 'dpb-line-done' : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Live status dot ────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }) {
  const m = STATUS_META[status] || STATUS_META.SENT
  return (
    <span
      className={`act-status-dot ${m.pulse ? 'dot-pulse' : ''}`}
      style={{ background:m.dot, width:size, height:size }}
    />
  )
}

// ── Document badge ─────────────────────────────────────────────────────────
function DocBadge({ type }) {
  const m = DOC_META[type] || DOC_META.LOAD_TENDER
  return (
    <span className="act-doc-badge" style={{ background:m.bg, color:m.color }}>
      {m.icon} {m.label}
    </span>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.SENT
  return (
    <span className="act-status-badge" style={{ background:m.bg, color:m.color }}>
      <StatusDot status={status} />
      {m.label}
    </span>
  )
}

// ── Equipment tag ──────────────────────────────────────────────────────────
function EquipTag({ type }) {
  return (
    <span className="act-equip-tag" style={{ background: equipColor(type) + '18', color: equipColor(type), borderColor: equipColor(type) + '40' }}>
      🚛 {equipLabel(type)}
    </span>
  )
}

// ── Countdown ring ─────────────────────────────────────────────────────────
function CountdownRing({ secondsLeft, total }) {
  const pct = Math.max(0, Math.min(1, secondsLeft / total))
  const r   = 10
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  return (
    <svg className="countdown-ring" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle
        cx="14" cy="14" r={r} fill="none"
        stroke={secondsLeft < 5 ? '#ef4444' : '#f59e0b'}
        strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
      <text x="14" y="18" textAnchor="middle" fontSize="8" fill="#475569" fontWeight="600">
        {secondsLeft}
      </text>
    </svg>
  )
}

// ── Hourly activity chart ──────────────────────────────────────────────────
function HourlyChart({ feed }) {
  const buckets = useMemo(() => buildHourlyChart(feed), [feed])
  const maxLoads = Math.max(1, ...buckets.map(b => b.loads))
  const currentHour = new Date().getHours()

  return (
    <div className="hourly-chart">
      <div className="hc-title">📊 Activity by Hour (Today)</div>
      <div className="hc-bars">
        {buckets.map(b => {
          const pct    = (b.loads / maxLoads) * 100
          const isCurr = b.hour === currentHour
          const isPast = b.hour < currentHour
          const label  = b.hour === 12 ? '12p' : b.hour > 12 ? `${b.hour-12}p` : `${b.hour}a`
          return (
            <div key={b.hour} className={`hc-col ${isCurr ? 'hc-current' : ''}`} title={`${label}: ${b.loads} loads, ${fmtDollars(b.revenue)}`}>
              <div className="hc-bar-wrap">
                <div
                  className="hc-bar"
                  style={{
                    height: `${Math.max(4, pct)}%`,
                    background: isCurr ? '#f59e0b' : isPast ? '#1e3a5f' : '#cbd5e1',
                    opacity: isPast || isCurr ? 1 : 0.35,
                  }}
                />
              </div>
              <div className="hc-label">{label}</div>
              {b.loads > 0 && <div className="hc-count">{b.loads}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Document type breakdown ─────────────────────────────────────────────────
function DocTypeBreakdown({ docTypes }) {
  const total = Object.values(docTypes).reduce((a, v) => a + v, 0)
  if (total === 0) return null
  return (
    <div className="doc-breakdown">
      {DOC_PIPELINE.map(type => {
        const m     = DOC_META[type]
        const count = docTypes[type] || 0
        if (!count) return null
        const pct = Math.round((count / total) * 100)
        return (
          <div key={type} className="doc-breakdown-item">
            <span className="dbi-icon" style={{ color:m.color }}>{m.icon}</span>
            <span className="dbi-label">{m.label}</span>
            <div className="dbi-bar-track">
              <div className="dbi-bar-fill" style={{ width:`${pct}%`, background:m.color }} />
            </div>
            <span className="dbi-count">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Status breakdown mini badges ───────────────────────────────────────────
function StatusBreakdown({ statuses }) {
  return (
    <div className="status-breakdown">
      {Object.entries(statuses).map(([s, cnt]) => {
        const m = STATUS_META[s] || STATUS_META.SENT
        return (
          <span key={s} className="sbd-badge" style={{ background:m.bg, color:m.color }}>
            <StatusDot status={s} size={6} />
            {m.label}: {cnt}
          </span>
        )
      })}
    </div>
  )
}

// ── Activity Feed Card (enhanced) ──────────────────────────────────────────
function ActivityCard({ item, isNew, expanded, onToggle }) {
  return (
    <div
      className={`act-card ${isNew ? 'act-card-new' : ''} ${expanded ? 'act-card-expanded' : ''}`}
      onClick={onToggle}
    >
      {/* New pulse strip */}
      {isNew && <div className="act-new-strip" />}

      {/* ── Top row ─────────────────────────────────────────── */}
      <div className="act-card-main">
        {/* Time column */}
        <div className="act-card-left">
          <div className="act-time">{fmtTime(item.sentAt)}</div>
          <div className="act-time-ago">{fmtTimeAgo(item.sentAt)}</div>
          {item.loadType === 'Partial' && (
            <span className="act-partial-pill">PARTIAL</span>
          )}
        </div>

        {/* Route + detail */}
        <div className="act-card-centre">
          <div className="act-card-badges-row">
            <DocBadge type={item.docType} />
            <StatusBadge status={item.docStatus} />
          </div>

          <div className="act-route">
            <div className="act-origin-block">
              <div className="act-city">{item.originCity}</div>
              <div className="act-state-pill">{item.originState}</div>
            </div>
            <div className="act-route-mid">
              <div className="act-route-line" />
              <div className="act-miles-badge">{item.totalMiles?.toLocaleString()} mi</div>
              <div className="act-route-arrow">→</div>
            </div>
            <div className="act-dest-block">
              <div className="act-city">{item.destCity}</div>
              <div className="act-state-pill dest">{item.destState}</div>
            </div>
          </div>

          <div className="act-meta-row">
            <EquipTag type={item.equipmentType} />
            <span className="act-meta-chip">📦 {item.commodity}</span>
            <span className="act-meta-chip">⚖ {item.weightLbs?.toLocaleString()} lbs</span>
            <span className="act-ref-chip">🔑 {item.loadRef}</span>
          </div>
        </div>

        {/* Rate column */}
        <div className="act-card-right">
          <div className="act-rate">{fmtDollars(item.rate)}</div>
          <div className="act-dpm">
            <span className="act-dpm-val">${item.dollarsPerMile?.toFixed(2)}</span>
            <span className="act-dpm-unit">/mi</span>
          </div>
          <div className="act-expand-hint">{expanded ? '▴' : '▾'}</div>
        </div>
      </div>

      {/* ── Expanded detail panel ──────────────────────────── */}
      {expanded && (
        <div className="act-card-detail" onClick={e => e.stopPropagation()}>
          {/* Doc pipeline progress */}
          <div className="acd-section">
            <div className="acd-section-title">Document Pipeline</div>
            <DocPipeline docType={item.docType} />
            <div className="acd-pipeline-status">
              Current stage: <strong>{DOC_META[item.docType]?.label}</strong>
              &nbsp;·&nbsp;Status: <StatusBadge status={item.docStatus} />
            </div>
          </div>

          {/* Full load details grid */}
          <div className="acd-details-grid">
            <div className="acd-item">
              <div className="acd-label">Broker Company</div>
              <div className="acd-val">{item.brokerCompany}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Broker Contact</div>
              <div className="acd-val">{item.brokerName}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Load Ref #</div>
              <div className="acd-val acd-mono">{item.loadRef}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Load Type</div>
              <div className="acd-val">
                <span className={`acd-load-type ${item.loadType === 'Partial' ? 'acd-partial' : 'acd-full'}`}>
                  {item.loadType}
                </span>
              </div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Origin</div>
              <div className="acd-val">{item.originCity}, {item.originState}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Destination</div>
              <div className="acd-val">{item.destCity}, {item.destState}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Total Miles</div>
              <div className="acd-val">{item.totalMiles?.toLocaleString()} mi</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Weight</div>
              <div className="acd-val">{item.weightLbs?.toLocaleString()} lbs</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Equipment</div>
              <div className="acd-val"><EquipTag type={item.equipmentType} /></div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Commodity</div>
              <div className="acd-val">{item.commodity}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Rate</div>
              <div className="acd-val acd-rate">{fmtDollarsFull(item.rate)}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">$/Mile</div>
              <div className="acd-val acd-dpm">${item.dollarsPerMile?.toFixed(2)}/mi</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Date</div>
              <div className="acd-val">{item.activityDate}</div>
            </div>
            <div className="acd-item">
              <div className="acd-label">Sent At</div>
              <div className="acd-val">{fmtTime(item.sentAt)} ({fmtTimeAgo(item.sentAt)})</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Broker Summary Card (enhanced) ────────────────────────────────────────
function BrokerSummaryCard({ summary, selected, onClick }) {
  const dpmColor = summary.avgDpm >= 3 ? '#16a34a' : summary.avgDpm >= 2 ? '#d97706' : '#dc2626'
  const initial  = (summary.brokerCompany || summary.brokerName || 'B').charAt(0).toUpperCase()

  // Build doc type mini pills
  const topDocs = Object.entries(summary.docTypes || {})
    .sort((a,b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div
      className={`broker-sum-card ${selected ? 'broker-sum-selected' : ''}`}
      onClick={onClick}
    >
      {selected && <div className="bsc-selected-bar" />}

      <div className="bsc-top">
        <div className="bsc-avatar" style={{ background: selected ? '#1e3a5f' : '#475569' }}>
          {initial}
        </div>
        <div className="bsc-info">
          <div className="bsc-company">{summary.brokerCompany}</div>
          <div className="bsc-name">{summary.brokerName}</div>
        </div>
        <div className="bsc-arrow">{selected ? '▾' : '▸'}</div>
      </div>

      <div className="bsc-kpis">
        <div className="bsc-kpi">
          <div className="bsc-kpi-val">{summary.loadCount}</div>
          <div className="bsc-kpi-label">Loads</div>
        </div>
        <div className="bsc-kpi-divider" />
        <div className="bsc-kpi">
          <div className="bsc-kpi-val green">{fmtDollars(summary.totalRevenue)}</div>
          <div className="bsc-kpi-label">Freight Value</div>
        </div>
        <div className="bsc-kpi-divider" />
        <div className="bsc-kpi">
          <div className="bsc-kpi-val" style={{ color: dpmColor }}>${summary.avgDpm?.toFixed(2)}</div>
          <div className="bsc-kpi-label">Avg $/mi</div>
        </div>
      </div>

      {/* Top doc types */}
      {topDocs.length > 0 && (
        <div className="bsc-docs-row">
          {topDocs.map(([type, cnt]) => {
            const m = DOC_META[type] || {}
            return (
              <span key={type} className="bsc-doc-pill" style={{ background:m.bg, color:m.color }}>
                {m.icon} {cnt}
              </span>
            )
          })}
          <span className="bsc-last-time">🕐 {fmtTimeAgo(summary.lastActivity)}</span>
        </div>
      )}
    </div>
  )
}

// ── Global stats bar (enhanced) ────────────────────────────────────────────
function GlobalStatsBar({ stats, date, asOf, newCount }) {
  return (
    <div className="act-global-bar">
      <div className="agb-left">
        <div className="agb-date-block">
          <span className="agb-date-label">TODAY</span>
          <span className="agb-date">{date}</span>
        </div>
        {newCount > 0 && (
          <div className="agb-new-badge">
            <span className="agb-new-dot" />
            +{newCount} new
          </div>
        )}
      </div>
      <div className="agb-stats">
        <div className="agb-stat">
          <div className="agb-icon">📦</div>
          <div className="agb-val">{stats.totalLoads}</div>
          <div className="agb-label">Loads Moved</div>
        </div>
        <div className="agb-divider" />
        <div className="agb-stat">
          <div className="agb-icon">💰</div>
          <div className="agb-val green">{fmtDollars(stats.totalRevenue)}</div>
          <div className="agb-label">Total Freight Value</div>
        </div>
        <div className="agb-divider" />
        <div className="agb-stat">
          <div className="agb-icon">📊</div>
          <div className="agb-val">{fmtDollars(stats.avgRate)}</div>
          <div className="agb-label">Avg Rate / Load</div>
        </div>
        <div className="agb-divider" />
        <div className="agb-stat">
          <div className="agb-icon">🏢</div>
          <div className="agb-val">{stats.activeBrokers}</div>
          <div className="agb-label">Active Brokers</div>
        </div>
      </div>
      <div className="agb-right">
        <div className="agb-as-of">As of {fmtTime(asOf)}</div>
      </div>
    </div>
  )
}

// ── Broker Deep-Dive Panel ─────────────────────────────────────────────────
function BrokerDeepDive({ summary, feed, onClose }) {
  if (!summary) return null
  const brokerFeed = feed.filter(f => f.brokerId === summary.brokerId)
  const dpmColor   = summary.avgDpm >= 3 ? '#16a34a' : summary.avgDpm >= 2 ? '#d97706' : '#dc2626'

  // Group feed by doc type for the pipeline view
  const byDocType = {}
  brokerFeed.forEach(f => {
    if (!byDocType[f.docType]) byDocType[f.docType] = []
    byDocType[f.docType].push(f)
  })

  return (
    <div className="broker-deep-dive">
      <div className="bdd-header">
        <div className="bdd-title-row">
          <div className="bdd-avatar">{(summary.brokerCompany||'B').charAt(0)}</div>
          <div>
            <div className="bdd-company">{summary.brokerCompany}</div>
            <div className="bdd-name">{summary.brokerName}</div>
          </div>
        </div>
        <button className="bdd-close" onClick={onClose}>✕ Show All Brokers</button>
      </div>

      {/* KPI row */}
      <div className="bdd-kpi-row">
        <div className="bdd-kpi">
          <div className="bdd-kpi-val">{summary.loadCount}</div>
          <div className="bdd-kpi-label">Loads Today</div>
        </div>
        <div className="bdd-kpi">
          <div className="bdd-kpi-val" style={{ color:'#16a34a' }}>{fmtDollars(summary.totalRevenue)}</div>
          <div className="bdd-kpi-label">Total Freight Value</div>
        </div>
        <div className="bdd-kpi">
          <div className="bdd-kpi-val">{summary.totalMiles?.toLocaleString()} mi</div>
          <div className="bdd-kpi-label">Total Miles</div>
        </div>
        <div className="bdd-kpi">
          <div className="bdd-kpi-val" style={{ color:dpmColor }}>${summary.avgDpm?.toFixed(2)}</div>
          <div className="bdd-kpi-label">Avg $/mi</div>
        </div>
      </div>

      {/* Two-column detail: Doc breakdown + Status breakdown */}
      <div className="bdd-breakdown-row">
        <div className="bdd-breakdown-col">
          <div className="bdd-col-title">📄 Documents Sent Today</div>
          <DocTypeBreakdown docTypes={summary.docTypes || {}} />
        </div>
        <div className="bdd-breakdown-col">
          <div className="bdd-col-title">🔄 Load Statuses</div>
          <StatusBreakdown statuses={summary.statuses || {}} />
        </div>
      </div>

      {/* Hourly chart for this broker */}
      {brokerFeed.length > 0 && <HourlyChart feed={brokerFeed} />}

      {/* Recent loads from this broker */}
      <div className="bdd-recent-title">📋 Today's Freight Ledger ({brokerFeed.length} entries)</div>
      <div className="bdd-recent-list">
        {brokerFeed.slice(0, 15).map(item => (
          <div key={item.id} className="bdd-ledger-row">
            <div className="bdd-lr-time">{fmtTime(item.sentAt)}</div>
            <DocBadge type={item.docType} />
            <div className="bdd-lr-route">
              <span>{item.originCity}, {item.originState}</span>
              <span className="bdd-lr-arrow">→</span>
              <span>{item.destCity}, {item.destState}</span>
              <span className="bdd-lr-miles">{item.totalMiles?.toLocaleString()} mi</span>
            </div>
            <div className="bdd-lr-equip">
              <EquipTag type={item.equipmentType} />
            </div>
            <div className="bdd-lr-commodity">{item.commodity}</div>
            <div className="bdd-lr-rate">{fmtDollars(item.rate)}</div>
            <StatusBadge status={item.docStatus} />
          </div>
        ))}
        {brokerFeed.length > 15 && (
          <div className="bdd-more">+{brokerFeed.length - 15} more entries today</div>
        )}
      </div>
    </div>
  )
}

// ── Group feed by hour ─────────────────────────────────────────────────────
function groupByHour(feed) {
  const groups = {}
  feed.forEach(item => {
    const h = getHourBucket(item.sentAt)
    const key = h >= 0 ? h : 99
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return Object.entries(groups)
    .sort((a, b) => b[0] - a[0])
    .map(([hour, items]) => ({ hour: parseInt(hour), items }))
}

function hourLabel(h) {
  if (h === 99) return 'Earlier'
  if (h === 0)  return '12 AM'
  if (h < 12)   return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function BrokerActivityFeed({ userId }) {
  const [data, setData]               = useState({ feed:[], brokerSummaries:[], globalStats:{}, date:'', asOf:'' })
  const [loading, setLoading]         = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [countdown, setCountdown]     = useState(REFRESH_INTERVAL / 1000)
  const [filterText, setFilterText]   = useState('')
  const [filterBroker, setFilterBroker] = useState(null)
  const [filterDoc, setFilterDoc]     = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [newIds, setNewIds]           = useState(new Set())
  const [newCount, setNewCount]       = useState(0)
  const [selectedBroker, setSelectedBroker] = useState(null)
  const [expandedCard, setExpandedCard]     = useState(null)
  const [viewMode, setViewMode]       = useState('feed')  // 'feed' | 'timeline' | 'chart'
  const prevIds                       = useRef(new Set())
  const timerRef                      = useRef(null)
  const countdownRef                  = useRef(null)
  const midnightRef                   = useRef(null)

  // ── Load data ─────────────────────────────────────────────────────────
  const load = useCallback(async (isAuto = false) => {
    if (loading && isAuto) return
    setLoading(true)
    dispatchIntent('INTENT_REFRESH_BROKER_ACTIVITY', { userId, isAuto })
    try {
      const result = await api.getBrokerActivity(userId)

      // Detect genuinely new items
      const incoming = result.feed || []
      const fresh = incoming.filter(f => !prevIds.current.has(String(f.id)))
      const freshSet = new Set(fresh.map(f => String(f.id)))

      if (fresh.length > 0) {
        setNewIds(freshSet)
        setNewCount(c => c + fresh.length)
        setTimeout(() => setNewIds(new Set()), NEW_FLASH_MS)
      }

      // Update prevIds for next diff
      prevIds.current = new Set(incoming.map(f => String(f.id)))

      setData({
        feed:            incoming,
        brokerSummaries: result.brokerSummaries || [],
        globalStats:     result.globalStats     || {},
        date:            result.date            || '',
        asOf:            result.asOf            || new Date().toISOString(),
      })
      setLastRefresh(new Date())
    } catch (e) {
      console.warn('BrokerActivityFeed load error:', e)
    }
    setLoading(false)
    setCountdown(REFRESH_INTERVAL / 1000)
  }, [userId]) // eslint-disable-line

  // Initial load
  useEffect(() => { load() }, [userId]) // eslint-disable-line

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => load(true), REFRESH_INTERVAL)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, load])

  // Countdown ticker
  useEffect(() => {
    if (!autoRefresh) { setCountdown(0); return }
    countdownRef.current = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [autoRefresh, lastRefresh])

  // Midnight reset — clear newCount and reload fresh
  useEffect(() => {
    const ms = getMidnightMs()
    midnightRef.current = setTimeout(() => {
      setNewCount(0)
      prevIds.current = new Set()
      load()
    }, ms)
    return () => clearTimeout(midnightRef.current)
  }, [load])

  // ── Filtered feed ─────────────────────────────────────────────────────
  const filteredFeed = useMemo(() => {
    return data.feed.filter(item => {
      if (filterBroker && item.brokerId !== filterBroker) return false
      if (filterDoc    !== 'ALL' && item.docType    !== filterDoc)    return false
      if (filterStatus !== 'ALL' && item.docStatus  !== filterStatus) return false
      if (filterText) {
        const q = filterText.toLowerCase()
        return (
          (item.brokerCompany||'').toLowerCase().includes(q) ||
          (item.brokerName||'').toLowerCase().includes(q)    ||
          (item.originCity||'').toLowerCase().includes(q)    ||
          (item.destCity||'').toLowerCase().includes(q)      ||
          (item.originState||'').toLowerCase().includes(q)   ||
          (item.destState||'').toLowerCase().includes(q)     ||
          (item.commodity||'').toLowerCase().includes(q)     ||
          (item.loadRef||'').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [data.feed, filterBroker, filterDoc, filterStatus, filterText])

  const selectedSummary  = data.brokerSummaries.find(s => s.brokerId === selectedBroker) || null
  const timelineGroups   = useMemo(() => groupByHour(filteredFeed), [filteredFeed])
  const hasFilters       = filterText || filterBroker || filterDoc !== 'ALL' || filterStatus !== 'ALL'
  const isEmpty          = data.feed.length === 0 && !loading

  const handleSelectBroker = (brokerId) => {
    const next = selectedBroker === brokerId ? null : brokerId
    setSelectedBroker(next)
    setFilterBroker(next)
    dispatchIntent('INTENT_SELECT_BROKER_DETAIL', { brokerId: next })
  }

  const clearFilters = () => {
    setFilterText(''); setFilterBroker(null)
    setFilterDoc('ALL'); setFilterStatus('ALL')
    setSelectedBroker(null)
    dispatchIntent('INTENT_FILTER_BROKER_ACTIVITY', { cleared: true })
  }

  const exportCsv = () => {
    dispatchIntent('INTENT_EXPORT_BROKER_ACTIVITY', { count: filteredFeed.length })
    const headers = ['Time','Broker Company','Broker Name','Document','Status','Origin City','Origin State','Dest City','Dest State','Miles','Equipment','Commodity','Weight (lbs)','Load Type','Rate','$/Mile','Ref #','Date']
    const rows = filteredFeed.map(f => [
      fmtTime(f.sentAt),
      f.brokerCompany, f.brokerName,
      DOC_META[f.docType]?.label   || f.docType,
      STATUS_META[f.docStatus]?.label || f.docStatus,
      f.originCity, f.originState,
      f.destCity,   f.destState,
      f.totalMiles,
      equipLabel(f.equipmentType),
      f.commodity,
      f.weightLbs,
      f.loadType,
      f.rate,
      f.dollarsPerMile,
      f.loadRef,
      f.activityDate,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `broker-activity-${data.date}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="act-feed-root">

      {/* ── Header bar ────────────────────────────────────── */}
      <div className="act-feed-header">
        <div className="act-feed-title-group">
          <div className="act-feed-title">
            <span className="act-live-pulse" />
            Live Broker Activity
          </div>
          <div className="act-feed-subtitle">
            {data.date ? `${data.date} · refreshes all day · resets at midnight` : 'Connecting…'}
          </div>
        </div>

        <div className="act-feed-controls">
          {/* Countdown ring */}
          {autoRefresh && (
            <CountdownRing secondsLeft={countdown} total={REFRESH_INTERVAL / 1000} />
          )}

          <span className="act-last-refresh">
            {lastRefresh ? `${fmtTimeAgo(lastRefresh.toISOString())}` : 'Loading…'}
          </span>

          <button className="act-ctrl-btn" onClick={() => load()} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>

          <button
            className={`act-ctrl-btn ${autoRefresh ? 'ctrl-live' : 'ctrl-paused'}`}
            onClick={() => setAutoRefresh(a => !a)}
            title={`Auto-refresh every ${REFRESH_INTERVAL/1000}s`}
          >
            {autoRefresh ? '⏹ Pause' : '▶ Live'}
          </button>

          {/* View mode toggles */}
          <div className="act-view-switcher">
            {[['feed','☰'],['timeline','⏱'],['chart','📊']].map(([mode, icon]) => (
              <button
                key={mode}
                className={`avs-btn ${viewMode === mode ? 'avs-active' : ''}`}
                onClick={() => { setViewMode(mode); dispatchIntent('INTENT_TOGGLE_VIEW_MODE', { mode }) }}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
                {icon}
              </button>
            ))}
          </div>

          {filteredFeed.length > 0 && (
            <button className="act-ctrl-btn" onClick={exportCsv} title="Export to CSV">
              ⬇ CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Global stats bar ─────────────────────────────── */}
      {data.globalStats.totalLoads > 0 && (
        <GlobalStatsBar
          stats={data.globalStats}
          date={data.date}
          asOf={data.asOf}
          newCount={newCount}
        />
      )}

      {/* ── Chart view ───────────────────────────────────── */}
      {viewMode === 'chart' && data.feed.length > 0 && (
        <div className="act-chart-section">
          <HourlyChart feed={filteredFeed.length ? filteredFeed : data.feed} />
        </div>
      )}

      {/* ── Broker summary cards ──────────────────────────── */}
      {data.brokerSummaries.length > 0 && viewMode !== 'chart' && (
        <div className="broker-summaries-section">
          <div className="bs-section-header">
            <div className="bs-section-title">
              🏢 Broker Pipeline — Today's Performance
            </div>
            {selectedBroker && (
              <button className="bs-clear-btn" onClick={clearFilters}>← Show All</button>
            )}
          </div>
          <div className="broker-summaries-scroll">
            {data.brokerSummaries.map(s => (
              <BrokerSummaryCard
                key={s.brokerId}
                summary={s}
                selected={selectedBroker === s.brokerId}
                onClick={() => handleSelectBroker(s.brokerId)}
              />
            ))}
          </div>

          {/* Deep-dive panel */}
          {selectedSummary && (
            <BrokerDeepDive
              summary={selectedSummary}
              feed={data.feed}
              onClose={clearFilters}
            />
          )}
        </div>
      )}

      {/* ── Filter bar ───────────────────────────────────── */}
      {!isEmpty && (
        <div className="act-filters-bar">
          <input
            className="act-filter-input"
            placeholder="🔍 Search broker, city, commodity, ref #…"
            value={filterText}
            onChange={e => {
              setFilterText(e.target.value)
              dispatchIntent('INTENT_FILTER_BROKER_ACTIVITY', { query: e.target.value })
            }}
          />

          <select className="act-filter-select" value={filterDoc} onChange={e => setFilterDoc(e.target.value)}>
            <option value="ALL">All Documents</option>
            {Object.entries(DOC_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>

          <select className="act-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {hasFilters && (
            <button className="act-clear-btn" onClick={clearFilters}>✕ Clear</button>
          )}

          <span className="act-count-label">
            {filteredFeed.length} of {data.feed.length} events
          </span>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────── */}
      {isEmpty && (
        <div className="act-empty">
          <div className="act-empty-icon">📡</div>
          <div className="act-empty-title">No activity yet today</div>
          <div className="act-empty-sub">
            Add brokers to your pipeline and the system will track every load they move,
            every document they send, and their complete daily freight ledger in real time.
          </div>
        </div>
      )}

      {/* ── Feed view ─────────────────────────────────────── */}
      {!isEmpty && viewMode === 'feed' && (
        <div className="act-feed-list">
          {filteredFeed.length === 0 ? (
            <div className="act-no-match">No events match your filters. <button className="act-inline-clear" onClick={clearFilters}>Clear filters</button></div>
          ) : (
            filteredFeed.map(item => (
              <ActivityCard
                key={item.id}
                item={item}
                isNew={newIds.has(String(item.id))}
                expanded={expandedCard === item.id}
                onToggle={() => setExpandedCard(id => id === item.id ? null : item.id)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Timeline view ─────────────────────────────────── */}
      {!isEmpty && viewMode === 'timeline' && (
        <div className="act-timeline">
          {timelineGroups.length === 0 ? (
            <div className="act-no-match">No events match your filters.</div>
          ) : (
            timelineGroups.map(({ hour, items }) => (
              <div key={hour} className="atl-group">
                <div className="atl-hour-header">
                  <div className="atl-hour-pill">{hourLabel(hour)}</div>
                  <div className="atl-hour-count">{items.length} event{items.length !== 1 ? 's' : ''}</div>
                  <div className="atl-hour-revenue">{fmtDollars(items.reduce((a, i) => a + (i.rate||0), 0))}</div>
                </div>
                <div className="atl-items">
                  {items.map(item => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      isNew={newIds.has(String(item.id))}
                      expanded={expandedCard === item.id}
                      onToggle={() => setExpandedCard(id => id === item.id ? null : item.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────── */}
      {!isEmpty && (
        <div className="act-feed-footer">
          <div className="aff-left">
            <span className={`aff-live-indicator ${autoRefresh ? 'aff-live' : 'aff-paused'}`}>
              {autoRefresh ? `● Live · refreshing in ${countdown}s` : '○ Paused'}
            </span>
            <span className="aff-reset">· resets at midnight</span>
          </div>
          <div className="aff-right">
            <span className="aff-total">{data.feed.length} total events</span>
            <span className="aff-date">📅 {data.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
