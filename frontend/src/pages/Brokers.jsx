import React, { useEffect, useState } from 'react'
import { api } from '../api'

const EMPTY_BROKER = {
  brokerName: '', brokerCompany: '', brokerPhone: '',
  brokerEmail: '', mcNumber: '', notes: ''
}

export default function Brokers({ userId }) {
  const [brokers, setBrokers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_BROKER)
  const [msg, setMsg] = useState({ text: '', type: 'success' })
  const [loading, setLoading] = useState(true)
  const [blasting, setBlasting] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getBrokers(userId).then(b => { setBrokers(b); setLoading(false) }).catch(() => setLoading(false))
  }, [userId])

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000)
  }

  const openAdd = () => { setForm(EMPTY_BROKER); setEditing(null); setShowModal(true) }
  const openEdit = (b) => { setForm({ ...b }); setEditing(b.brokerId); setShowModal(true) }

  const save = async () => {
    try {
      if (editing) {
        const updated = await api.updateBroker(userId, editing, form)
        setBrokers(bs => bs.map(b => b.brokerId === editing ? updated : b))
        flash('✅ Broker updated')
      } else {
        const added = await api.addBroker(userId, form)
        setBrokers(bs => [...bs, added])
        flash('✅ Broker added — intro email will be sent automatically')
      }
      setShowModal(false)
    } catch (e) {
      flash('❌ Error: ' + e.message, 'error')
    }
  }

  const remove = async (brokerId) => {
    if (!confirm('Remove this broker?')) return
    await api.deleteBroker(userId, brokerId)
    setBrokers(bs => bs.filter(b => b.brokerId !== brokerId))
    flash('Broker removed')
  }

  const sendIntro = async (brokerId) => {
    const resp = await api.sendBrokerIntro(userId, brokerId)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const updated = await api.getBrokers(userId)
    setBrokers(updated)
  }

  const sendFollowUp = async (brokerId) => {
    const resp = await api.sendBrokerFollowUp(userId, brokerId)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const updated = await api.getBrokers(userId)
    setBrokers(updated)
  }

  const blast = async () => {
    setBlasting(true)
    const results = await api.blastAvailability(userId)
    const ok = results.filter(r => r.success).length
    flash(`✅ Availability blast sent to ${ok}/${results.length} brokers`, 'success')
    setBlasting(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div className="loading">Loading brokers...</div>

  const statusCounts = brokers.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📋 Broker Pipeline</div>
          <div className="page-sub">Automated intro emails, follow-ups, and availability blasts</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={blast} disabled={blasting}>
            {blasting ? '⏳' : '📡'} Blast Availability
          </button>
          <button className="btn-accent" onClick={openAdd}>+ Add Broker</button>
        </div>
      </div>

      {msg.text && <div className={'alert alert-' + (msg.type === 'error' ? 'error' : 'success')}>{msg.text}</div>}

      {/* Pipeline stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          ['Total', brokers.length, 'badge-blue'],
          ['New', statusCounts.NEW || 0, 'badge-gray'],
          ['Intro Sent', statusCounts.INTRO_SENT || 0, 'badge-amber'],
          ['Follow-Up', statusCounts.FOLLOW_UP_SENT || 0, 'badge-amber'],
          ['Active', statusCounts.ACTIVE || 0, 'badge-green'],
        ].map(([label, val, badge]) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{val}</div>
          </div>
        ))}
      </div>

      {brokers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No brokers yet</div>
            <div className="empty-sub">Add brokers to start automated intro emails, follow-ups, and availability blasts. The system handles outreach for you.</div>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>Add Your First Broker</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Company</th><th>Phone</th><th>Email</th>
                  <th>MC#</th><th>Status</th><th>Follow-ups</th><th>Intro Sent</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map(b => (
                  <tr key={b.brokerId}>
                    <td><strong>{b.brokerName || '—'}</strong></td>
                    <td>{b.brokerCompany || '—'}</td>
                    <td style={{ fontSize: 13 }}>
                      {b.brokerPhone
                        ? <a href={`tel:${b.brokerPhone}`} style={{ color: 'var(--navy-mid)' }}>{b.brokerPhone}</a>
                        : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {b.brokerEmail
                        ? <a href={`mailto:${b.brokerEmail}`} style={{ color: 'var(--navy-mid)' }}>{b.brokerEmail}</a>
                        : '—'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{b.mcNumber || '—'}</td>
                    <td>
                      <span className={'badge ' + statusBadge(b.status)}>{b.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="muted">{b.followUpCount || 0} / 3</td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {b.introEmailSentAt ? new Date(b.introEmailSentAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {(!b.introEmailSentAt) && (
                          <button className="btn-primary btn-sm" onClick={() => sendIntro(b.brokerId)} title="Send intro email">
                            📧 Intro
                          </button>
                        )}
                        {b.introEmailSentAt && b.followUpCount < 3 && (
                          <button className="btn-ghost btn-sm" onClick={() => sendFollowUp(b.brokerId)} title="Send follow-up">
                            ↩ Follow-up
                          </button>
                        )}
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(b)}>✏ Edit</button>
                        <button className="btn-danger btn-sm" onClick={() => remove(b.brokerId)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? 'Edit Broker' : 'Add Broker'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input value={form.brokerName} onChange={e => set('brokerName', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input value={form.brokerCompany} onChange={e => set('brokerCompany', e.target.value)} placeholder="Atlas Freight LLC" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.brokerPhone} onChange={e => set('brokerPhone', e.target.value)} placeholder="+13025551234" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input value={form.brokerEmail} onChange={e => set('brokerEmail', e.target.value)} placeholder="jane@atlasfreight.com" type="email" />
              </div>
              <div className="form-group">
                <label>MC Number</label>
                <input value={form.mcNumber} onChange={e => set('mcNumber', e.target.value)} placeholder="MC-123456" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Runs DE-PA corridor" />
              </div>
            </div>
            {!editing && (
              <div className="alert alert-info" style={{ marginTop: 16, fontSize: 13 }}>
                💡 After adding, the system will automatically send an intro email to this broker (if your company info is configured in Settings).
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

function statusBadge(s) {
  if (s === 'ACTIVE') return 'badge-green'
  if (s === 'INTRO_SENT' || s === 'FOLLOW_UP_SENT') return 'badge-amber'
  if (s === 'INACTIVE') return 'badge-red'
  return 'badge-gray'
}
