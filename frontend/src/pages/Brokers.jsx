/**
 * Brokers.jsx — Broker Pipeline with Live Activity Feed
 *
 * Intent Layer events fired (no Action Layer changes):
 *   INTENT_ADD_BROKER, INTENT_EDIT_BROKER, INTENT_DELETE_BROKER
 *   INTENT_SEND_INTRO, INTENT_SEND_FOLLOWUP, INTENT_BLAST_AVAILABILITY
 *   + All events from BrokerActivityFeed
 */

import React, { useEffect, useState } from 'react'
import { api } from '../api'
import BrokerActivityFeed from '../components/BrokerActivityFeed'

// ── Intent dispatcher ─────────────────────────────────────────────────────
function dispatchIntent(type, payload = {}) {
  window.dispatchEvent(new CustomEvent('tt:intent', { detail: { type, payload } }))
}

// ── Status badge helper ───────────────────────────────────────────────────
function statusBadge(s) {
  if (s === 'ACTIVE')                              return 'badge-green'
  if (s === 'INTRO_SENT' || s === 'FOLLOW_UP_SENT') return 'badge-amber'
  if (s === 'INACTIVE')                            return 'badge-red'
  return 'badge-gray'
}

function statusLabel(s) {
  return (s || 'NEW').replace(/_/g, ' ')
}

const EMPTY_BROKER = {
  brokerName: '', brokerCompany: '', brokerPhone: '',
  brokerEmail: '', mcNumber: '', notes: '',
}

// ── View modes ─────────────────────────────────────────────────────────────
const VIEWS = [
  { id: 'pipeline', icon: '📋', label: 'Pipeline' },
  { id: 'activity', icon: '📡', label: 'Live Activity' },
]

export default function Brokers({ userId }) {
  const [brokers, setBrokers]       = useState([])
  const [view, setView]             = useState('pipeline')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_BROKER)
  const [msg, setMsg]               = useState({ text: '', type: 'success' })
  const [loading, setLoading]       = useState(true)
  const [blasting, setBlasting]     = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getBrokers(userId)
      .then(b => { setBrokers(Array.isArray(b) ? b : []); setLoading(false) })
      .catch(() => { setBrokers([]); setLoading(false) })
  }, [userId])

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 6000)
  }

  const openAdd  = () => {
    setForm(EMPTY_BROKER); setEditing(null); setShowModal(true)
    dispatchIntent('INTENT_ADD_BROKER', { userId })
  }
  const openEdit = (b) => {
    setForm({ ...b }); setEditing(b.brokerId); setShowModal(true)
    dispatchIntent('INTENT_EDIT_BROKER', { brokerId: b.brokerId })
  }

  const save = async () => {
    try {
      if (editing) {
        const updated = await api.updateBroker(userId, editing, form)
        setBrokers(bs => bs.map(b => b.brokerId === editing ? updated : b))
        flash('✅ Broker updated')
      } else {
        const added = await api.addBroker(userId, form)
        setBrokers(bs => [...bs, added])
        flash('✅ Broker added — intro email queued automatically')
      }
      setShowModal(false)
    } catch (e) {
      flash('❌ Error: ' + e.message, 'error')
    }
  }

  const remove = async (brokerId) => {
    if (!confirm('Remove this broker from your pipeline?')) return
    dispatchIntent('INTENT_DELETE_BROKER', { brokerId })
    await api.deleteBroker(userId, brokerId)
    setBrokers(bs => bs.filter(b => b.brokerId !== brokerId))
    flash('Broker removed')
  }

  const sendIntro = async (brokerId, brokerName) => {
    dispatchIntent('INTENT_SEND_INTRO', { brokerId, brokerName })
    const resp = await api.sendBrokerIntro(userId, brokerId)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const updated = await api.getBrokers(userId)
    setBrokers(Array.isArray(updated) ? updated : brokers)
  }

  const sendFollowUp = async (brokerId, brokerName) => {
    dispatchIntent('INTENT_SEND_FOLLOWUP', { brokerId, brokerName })
    const resp = await api.sendBrokerFollowUp(userId, brokerId)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const updated = await api.getBrokers(userId)
    setBrokers(Array.isArray(updated) ? updated : brokers)
  }

  const blast = async () => {
    setBlasting(true)
    dispatchIntent('INTENT_BLAST_AVAILABILITY', { userId, brokerCount: brokers.length })
    try {
      const results = await api.blastAvailability(userId)
      const arr     = Array.isArray(results) ? results : []
      const ok      = arr.filter(r => r?.success).length
      flash(
        arr.length === 0
          ? '⚠️ No brokers to blast — add brokers first'
          : `✅ Availability blast sent to ${ok}/${arr.length} brokers`,
        'success'
      )
    } catch (e) {
      flash('❌ Error: ' + e.message, 'error')
    }
    setBlasting(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div className="loading">Loading broker pipeline…</div>

  const statusCounts = brokers.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* ── Page header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">📋 Broker Pipeline</div>
          <div className="page-sub">
            {brokers.length} broker{brokers.length !== 1 ? 's' : ''} · automated intros, follow-ups &amp; live freight tracking
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-ghost" onClick={blast} disabled={blasting}>
            {blasting ? '⏳' : '📡'} Blast Availability
          </button>
          <button className="btn-accent" onClick={openAdd}>+ Add Broker</button>
        </div>
      </div>

      {msg.text && (
        <div className={'alert alert-' + (msg.type === 'error' ? 'error' : 'success')}>
          {msg.text}
        </div>
      )}

      {/* ── View toggle tabs ─────────────────────────────── */}
      <div className="broker-view-tabs">
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={`broker-view-tab ${view === v.id ? 'bvt-active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.icon} {v.label}
            {v.id === 'activity' && brokers.length > 0 && (
              <span className="bvt-live-dot">●</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ PIPELINE VIEW ═════════════════════════════════ */}
      {view === 'pipeline' && (
        <>
          {/* Pipeline KPI bar */}
          <div className="pipeline-kpi-bar">
            {[
              { label: 'Total',       val: brokers.length,                   color: '#1e3a5f' },
              { label: 'New',         val: statusCounts.NEW || 0,            color: '#64748b' },
              { label: 'Intro Sent',  val: statusCounts.INTRO_SENT || 0,     color: '#d97706' },
              { label: 'Follow-Up',   val: statusCounts.FOLLOW_UP_SENT || 0, color: '#7c3aed' },
              { label: 'Active',      val: statusCounts.ACTIVE || 0,         color: '#16a34a' },
            ].map(({ label, val, color }) => (
              <div key={label} className="pkb-stat">
                <div className="pkb-val" style={{ color }}>{val}</div>
                <div className="pkb-label">{label}</div>
              </div>
            ))}
          </div>

          {brokers.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">No brokers yet</div>
                <div className="empty-sub">
                  Add brokers to start automated intro emails, follow-ups, and live freight tracking.
                  The system handles outreach and tracks every load they move throughout the day.
                </div>
                <button className="btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>
                  Add Your First Broker
                </button>
              </div>
            </div>
          ) : (
            <div className="broker-cards-list">
              {brokers.map(b => (
                <BrokerRow
                  key={b.brokerId}
                  broker={b}
                  expanded={expandedId === b.brokerId}
                  onToggle={() => setExpandedId(id => id === b.brokerId ? null : b.brokerId)}
                  onEdit={() => openEdit(b)}
                  onDelete={() => remove(b.brokerId)}
                  onIntro={() => sendIntro(b.brokerId, b.brokerName)}
                  onFollowUp={() => sendFollowUp(b.brokerId, b.brokerName)}
                  onViewActivity={() => setView('activity')}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ LIVE ACTIVITY VIEW ════════════════════════════ */}
      {view === 'activity' && (
        brokers.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📡</div>
              <div className="empty-text">No brokers in your pipeline</div>
              <div className="empty-sub">
                Add brokers first — the live activity feed will track every load they
                book, document they send, and freight movement throughout the day.
              </div>
              <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => { openAdd(); setView('pipeline') }}>
                Add First Broker
              </button>
            </div>
          </div>
        ) : (
          <BrokerActivityFeed userId={userId} />
        )
      )}

      {/* ── Add / Edit modal ─────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? '✏ Edit Broker' : '+ Add Broker'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  value={form.brokerName}
                  onChange={e => set('brokerName', e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  value={form.brokerCompany}
                  onChange={e => set('brokerCompany', e.target.value)}
                  placeholder="Atlas Freight LLC"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  value={form.brokerPhone}
                  onChange={e => set('brokerPhone', e.target.value)}
                  placeholder="+13025551234"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  value={form.brokerEmail}
                  onChange={e => set('brokerEmail', e.target.value)}
                  placeholder="jane@atlasfreight.com"
                  type="email"
                />
              </div>
              <div className="form-group">
                <label>MC Number</label>
                <input
                  value={form.mcNumber}
                  onChange={e => set('mcNumber', e.target.value)}
                  placeholder="MC-123456"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Runs DE-PA corridor, prefers reefer"
                />
              </div>
            </div>
            {!editing && (
              <div className="alert alert-info" style={{ marginTop: 16, fontSize: 13 }}>
                💡 After adding, the system will automatically send an intro email
                and begin tracking this broker's daily freight movements.
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>{editing ? 'Update' : 'Add Broker'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Broker row card (pipeline view) ───────────────────────────────────────
function BrokerRow({ broker: b, expanded, onToggle, onEdit, onDelete, onIntro, onFollowUp, onViewActivity }) {
  return (
    <div className={`broker-row-card ${expanded ? 'brc-expanded' : ''}`}>
      {/* Main row */}
      <div className="brc-main" onClick={onToggle}>
        <div className="brc-avatar">{(b.brokerCompany || b.brokerName || 'B').charAt(0).toUpperCase()}</div>
        <div className="brc-info">
          <div className="brc-name">{b.brokerName || '—'}</div>
          <div className="brc-company">{b.brokerCompany || '—'}</div>
          {b.mcNumber && <div className="brc-mc">{b.mcNumber}</div>}
        </div>

        <div className="brc-contact">
          {b.brokerPhone && (
            <a href={`tel:${b.brokerPhone}`} className="brc-phone"
              onClick={e => e.stopPropagation()}>
              📞 {b.brokerPhone}
            </a>
          )}
          {b.brokerEmail && (
            <a href={`mailto:${b.brokerEmail}`} className="brc-email"
              onClick={e => e.stopPropagation()}>
              ✉ {b.brokerEmail}
            </a>
          )}
        </div>

        <div className="brc-status-col">
          <span className={`badge ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span>
          <span className="brc-followups">{b.followUpCount || 0}/3 follow-ups</span>
          {b.introEmailSentAt && (
            <span className="brc-intro-date">
              Intro: {new Date(b.introEmailSentAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="brc-actions" onClick={e => e.stopPropagation()}>
          {!b.introEmailSentAt && (
            <button className="btn-primary btn-sm" onClick={onIntro} title="Send intro email">
              📧 Intro
            </button>
          )}
          {b.introEmailSentAt && (b.followUpCount || 0) < 3 && (
            <button className="btn-ghost btn-sm" onClick={onFollowUp}>
              ↩ Follow-up
            </button>
          )}
          <button className="brc-act-btn brc-activity" onClick={onViewActivity} title="View live activity">
            📡
          </button>
          <button className="btn-ghost btn-sm" onClick={onEdit}>✏</button>
          <button className="btn-danger btn-sm" onClick={onDelete}>✕</button>
        </div>

        <div className="brc-chevron">{expanded ? '▾' : '▸'}</div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="brc-detail">
          <div className="brc-detail-grid">
            <div className="brd-item">
              <div className="brd-label">Status</div>
              <div className="brd-val">
                <span className={`badge ${statusBadge(b.status)}`}>{statusLabel(b.status)}</span>
              </div>
            </div>
            <div className="brd-item">
              <div className="brd-label">Follow-ups Sent</div>
              <div className="brd-val">{b.followUpCount || 0} of 3 max</div>
            </div>
            <div className="brd-item">
              <div className="brd-label">Intro Sent</div>
              <div className="brd-val">
                {b.introEmailSentAt
                  ? new Date(b.introEmailSentAt).toLocaleString()
                  : 'Not yet sent'}
              </div>
            </div>
            <div className="brd-item">
              <div className="brd-label">Last Follow-up</div>
              <div className="brd-val">
                {b.lastFollowUpAt
                  ? new Date(b.lastFollowUpAt).toLocaleString()
                  : '—'}
              </div>
            </div>
            {b.notes && (
              <div className="brd-item brd-full">
                <div className="brd-label">Notes</div>
                <div className="brd-val">{b.notes}</div>
              </div>
            )}
          </div>
          <div className="brc-detail-actions">
            <button className="btn-primary btn-sm" onClick={onViewActivity}>
              📡 View Live Activity →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
