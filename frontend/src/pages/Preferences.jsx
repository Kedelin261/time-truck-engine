import React, { useEffect, useState } from 'react'
import { api } from '../api'

const DEFAULTS = {
  homeState: 'DE', homeCity: '',
  equipmentType: 'BOX_TRUCK_26',
  maxDeadheadMiles: 50,
  minTotalMiles: 250,
  minDollarsPerMile: 2.00,
  companyName: '', ownerName: '', mcNumber: '', dotNumber: '',
  companyPhone: '', companyEmail: '', companyWebsite: '',
  subscriptionTier: 'FREE', phoneNumber: '', email: '',
  smsEnabled: false, emailEnabled: false
}

export default function Preferences({ userId }) {
  const [form, setForm] = useState(DEFAULTS)
  const [datToken, setDatToken] = useState('')
  const [datStatus, setDatStatus] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: 'success' })
  const [loading, setLoading] = useState(true)
  const [savingDat, setSavingDat] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getPrefs(userId).catch(() => DEFAULTS),
      api.datStatus(userId).catch(() => null)
    ]).then(([p, ds]) => {
      setForm({ ...DEFAULTS, ...p })
      setDatStatus(ds)
      setLoading(false)
    })
  }, [userId])

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000)
  }

  const savePrefs = async () => {
    try {
      const updated = await api.savePrefs(userId, form)
      setForm({ ...DEFAULTS, ...updated })
      flash('✅ Preferences saved!')
    } catch (e) {
      flash('❌ Error: ' + e.message, 'error')
    }
  }

  const saveDat = async () => {
    if (!datToken.trim()) { flash('Enter your DAT token first', 'error'); return }
    setSavingDat(true)
    try {
      await api.saveDatToken(userId, datToken.trim())
      setDatToken('')
      const ds = await api.datStatus(userId)
      setDatStatus(ds)
      flash('✅ DAT token saved — load board is now connected!')
    } catch (e) {
      flash('❌ Error: ' + e.message, 'error')
    }
    setSavingDat(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div className="loading">Loading settings...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">⚙️ Settings</div>
          <div className="page-sub">Configure your operation, load filters, company info, and integrations</div>
        </div>
        <button className="btn-accent" onClick={savePrefs}>💾 Save All Settings</button>
      </div>

      {msg.text && <div className={'alert alert-' + (msg.type === 'error' ? 'error' : 'success')}>{msg.text}</div>}

      {/* Load Board Connection */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">🔌 DAT ONE Connection</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span className={'badge ' + (datStatus?.connected ? 'badge-green' : 'badge-red')} style={{ fontSize: 13 }}>
            {datStatus?.connected ? '✅ Connected' : '❌ Not Connected'}
          </span>
          {datStatus?.message && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{datStatus.message}</span>}
        </div>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label>DAT ONE API Token</label>
            <input
              value={datToken}
              onChange={e => setDatToken(e.target.value)}
              placeholder="Paste your DAT ONE access token here"
              type="password"
            />
          </div>
          <button className="btn-primary" onClick={saveDat} disabled={savingDat}>
            {savingDat ? '⏳ Saving...' : '🔑 Connect DAT'}
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
          Your token is encrypted with AES-256 before storage. Get your token from <a href="https://www.dat.com" target="_blank" rel="noreferrer" style={{ color: 'var(--navy-mid)' }}>dat.com</a>
        </div>
      </div>

      {/* Load Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">🎯 Load Filters</div>
        <div className="form-grid">
          <div className="form-group">
            <label>Home State</label>
            <input value={form.homeState} onChange={e => set('homeState', e.target.value.toUpperCase())} placeholder="DE" maxLength="2" />
          </div>
          <div className="form-group">
            <label>Home City</label>
            <input value={form.homeCity} onChange={e => set('homeCity', e.target.value)} placeholder="Wilmington" />
          </div>
          <div className="form-group">
            <label>Equipment Type</label>
            <select value={form.equipmentType} onChange={e => set('equipmentType', e.target.value)}>
              <option value="BOX_TRUCK_26">26' Box Truck</option>
              <option value="DRY_VAN">Dry Van</option>
              <option value="REEFER">Refrigerated (Reefer)</option>
              <option value="FLATBED">Flatbed</option>
              <option value="STEP_DECK">Step Deck</option>
            </select>
          </div>
          <div className="form-group">
            <label>Max Deadhead (miles)</label>
            <input type="number" value={form.maxDeadheadMiles}
              onChange={e => set('maxDeadheadMiles', Number(e.target.value))} min="0" max="999" />
          </div>
          <div className="form-group">
            <label>Min Total Miles</label>
            <input type="number" value={form.minTotalMiles}
              onChange={e => set('minTotalMiles', Number(e.target.value))} min="0" />
          </div>
          <div className="form-group">
            <label>Min $/Mile</label>
            <input type="number" value={form.minDollarsPerMile} step="0.1"
              onChange={e => set('minDollarsPerMile', Number(e.target.value))} min="0" />
          </div>
        </div>
        <div className="alert alert-info" style={{ marginTop: 16, fontSize: 13 }}>
          💡 The engine also boosts scores for lanes you've run before, so your top loads get smarter over time.
        </div>
      </div>

      {/* Company Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">🏢 Company Information</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Used in automated broker intro and follow-up emails. The more complete this is, the more professional your outreach.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Company Name</label>
            <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Smith Freight LLC" />
          </div>
          <div className="form-group">
            <label>Owner / Contact Name</label>
            <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="John Smith" />
          </div>
          <div className="form-group">
            <label>MC Number</label>
            <input value={form.mcNumber} onChange={e => set('mcNumber', e.target.value)} placeholder="MC-123456" />
          </div>
          <div className="form-group">
            <label>DOT Number</label>
            <input value={form.dotNumber} onChange={e => set('dotNumber', e.target.value)} placeholder="DOT-7890123" />
          </div>
          <div className="form-group">
            <label>Company Phone</label>
            <input value={form.companyPhone} onChange={e => set('companyPhone', e.target.value)} placeholder="+13025551234" type="tel" />
          </div>
          <div className="form-group">
            <label>Company Email</label>
            <input value={form.companyEmail} onChange={e => set('companyEmail', e.target.value)} placeholder="dispatch@smithfreight.com" type="email" />
          </div>
          <div className="form-group">
            <label>Website</label>
            <input value={form.companyWebsite} onChange={e => set('companyWebsite', e.target.value)} placeholder="https://smithfreight.com" />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="btn-accent" onClick={savePrefs}>💾 Save All Settings</button>
      </div>
    </div>
  )
}
