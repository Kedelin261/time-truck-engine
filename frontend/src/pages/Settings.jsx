import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Key, Sliders, Building, User } from 'lucide-react'
import { getPreferences, updatePreferences, getDatStatus, connectDat } from '../api/client'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const EQUIPMENT_TYPES = ['BOX_TRUCK_26', 'DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK']

export default function Settings({ userId }) {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [datToken, setDatToken] = useState('')
  const [datStatus, setDatStatus] = useState(null)
  const [datSaving, setDatSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [prefsRes, statusRes] = await Promise.allSettled([
        getPreferences(userId),
        getDatStatus(userId),
      ])
      if (prefsRes.status === 'fulfilled') setPrefs(prefsRes.value.data)
      if (statusRes.status === 'fulfilled') setDatStatus(statusRes.value.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [userId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    try {
      const res = await updatePreferences(userId, prefs)
      setPrefs(res.data)
      showToast('Settings saved!')
    } catch (e) {
      showToast('Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleConnectDat = async () => {
    if (!datToken.trim()) {
      showToast('Enter a DAT token first', 'error')
      return
    }
    setDatSaving(true)
    try {
      await connectDat(userId, datToken.trim())
      await fetchAll()
      setDatToken('')
      showToast('DAT One connected!')
    } catch (e) {
      showToast('Failed to connect DAT', 'error')
    } finally {
      setDatSaving(false)
    }
  }

  if (loading || !prefs) {
    return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
  }

  return (
    <div>
      {toast && (
        <div className={`alert alert-${toast.type === 'success' ? 'success' : 'error'}`}
             style={{ position: 'fixed', top: 20, right: 24, zIndex: 999, maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your load preferences, company info, and integrations</p>
      </div>

      <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* DAT Integration */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Key size={16} color="var(--yellow)" />
              DAT One Integration
              <span className={`badge ${datStatus?.connected ? 'badge-green' : 'badge-red'}`}>
                {datStatus?.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Connect your DAT One account to pull live loads. Your token is encrypted at rest using AES-256.
          </p>

          {datStatus?.connected && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              ✅ DAT One is connected. Last updated: {datStatus.lastUpdated?.toString().substring(0, 10)}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" type="password" placeholder="Paste DAT One access token..."
                   value={datToken} onChange={e => setDatToken(e.target.value)}
                   style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleConnectDat} disabled={datSaving}>
              {datSaving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Key size={14} />}
              {datStatus?.connected ? 'Update Token' : 'Connect DAT'}
            </button>
          </div>
        </div>

        {/* Load Filters */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            <Sliders size={16} color="var(--blue)" />
            Load Filters
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Home State</label>
              <select className="form-input" value={prefs.homeState}
                      onChange={e => setPrefs({ ...prefs, homeState: e.target.value })}>
                {US_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Home City</label>
              <input className="form-input" placeholder="e.g. Wilmington"
                     value={prefs.homeCity || ''}
                     onChange={e => setPrefs({ ...prefs, homeCity: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Equipment Type</label>
              <select className="form-input" value={prefs.equipmentType}
                      onChange={e => setPrefs({ ...prefs, equipmentType: e.target.value })}>
                {EQUIPMENT_TYPES.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Deadhead Miles</label>
              <input type="number" className="form-input" min="0" max="500"
                     value={prefs.maxDeadheadMiles}
                     onChange={e => setPrefs({ ...prefs, maxDeadheadMiles: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Min Total Miles</label>
              <input type="number" className="form-input" min="0"
                     value={prefs.minTotalMiles}
                     onChange={e => setPrefs({ ...prefs, minTotalMiles: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label className="form-label">Min $/Mile</label>
              <input type="number" className="form-input" min="0" step="0.1"
                     value={prefs.minDollarsPerMile}
                     onChange={e => setPrefs({ ...prefs, minDollarsPerMile: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </div>

        {/* Company Info */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 4 }}>
            <Building size={16} color="var(--accent)" />
            Company Information
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Required for automated broker intro and follow-up emails.
          </p>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input" placeholder="e.g. Johnson Transport LLC"
                     value={prefs.companyName || ''}
                     onChange={e => setPrefs({ ...prefs, companyName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner / Operator Name</label>
              <input className="form-input" placeholder="Your full name"
                     value={prefs.ownerName || ''}
                     onChange={e => setPrefs({ ...prefs, ownerName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">MC Number</label>
              <input className="form-input" placeholder="MC-000000"
                     value={prefs.mcNumber || ''}
                     onChange={e => setPrefs({ ...prefs, mcNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">DOT Number</label>
              <input className="form-input" placeholder="DOT-000000"
                     value={prefs.dotNumber || ''}
                     onChange={e => setPrefs({ ...prefs, dotNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Phone</label>
              <input className="form-input" placeholder="+1 (555) 000-0000"
                     value={prefs.companyPhone || ''}
                     onChange={e => setPrefs({ ...prefs, companyPhone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Email</label>
              <input type="email" className="form-input" placeholder="dispatch@yourcompany.com"
                     value={prefs.companyEmail || ''}
                     onChange={e => setPrefs({ ...prefs, companyEmail: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Company Website (optional)</label>
            <input className="form-input" placeholder="https://yourcompany.com"
                   value={prefs.companyWebsite || ''}
                   onChange={e => setPrefs({ ...prefs, companyWebsite: e.target.value })} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
          {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
          Save All Settings
        </button>

      </div>
    </div>
  )
}
