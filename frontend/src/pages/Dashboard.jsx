import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ userId }) {
  const [loads, setLoads]       = useState([])
  const [trucks, setTrucks]     = useState([])
  const [brokers, setBrokers]   = useState([])
  const [bookings, setBookings] = useState([])
  const [datStatus, setDatStatus] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [engineMsg, setEngineMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.top20(userId),
      api.getTrucks(userId),
      api.getBrokers(userId),
      api.getBookings(userId),
      api.datStatus(userId),
    ]).then(([l, t, b, bk, ds]) => {
      setLoads(Array.isArray(l) ? l : [])
      setTrucks(Array.isArray(t) ? t : [])
      setBrokers(Array.isArray(b) ? b : [])
      setBookings(Array.isArray(bk) ? bk : [])
      setDatStatus(ds || null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const runEngine = async () => {
    setEngineMsg('Running engine...')
    try {
      const resp = await api.triggerRunEngine(userId)
      setEngineMsg((resp && resp.message) ? resp.message : 'Engine triggered')
      const l = await api.top20(userId)
      setLoads(Array.isArray(l) ? l : [])
    } catch {
      setEngineMsg('Backend not connected — add VITE_API_BASE in Cloudflare Pages env vars')
    }
    setTimeout(() => setEngineMsg(''), 5000)
  }

  const bestLoad        = loads[0] || null
  const availableTrucks = trucks.filter(t => t && t.status === 'AVAILABLE')
  const pendingBrokers  = brokers.filter(b => b && (b.status === 'NEW' || b.status === 'INTRO_SENT'))
  const totalRevenue    = bookings.reduce((s, b) => s + ((b.dollarsPerMile || 0) * (b.totalMiles || 0)), 0)

  const backendConnected = loads.length > 0 || trucks.length > 0

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <div>Loading your dashboard...</div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Welcome back, {userId} — here's your operation at a glance</div>
        </div>
        <button className="btn-accent" onClick={runEngine}>⚡ Run Engine</button>
      </div>

      {engineMsg && <div className="alert alert-info">{engineMsg}</div>}

      {/* Connection status bar */}
      {!backendConnected && (
        <div className="alert alert-warn" style={{ marginBottom: 24 }}>
          <strong>⚠️ Backend not connected.</strong> This is a frontend-only demo.
          To enable live loads, set <code>VITE_API_BASE</code> in Cloudflare Pages → Settings → Environment Variables to your backend URL.
        </div>
      )}

      {backendConnected && (
        <div className="alert" style={{
          background: datStatus?.connected ? '#dcfce7' : '#fef3c7',
          color: datStatus?.connected ? '#166534' : '#92400e',
          border: '1px solid',
          borderColor: datStatus?.connected ? '#bbf7d0' : '#fde68a',
          marginBottom: 24
        }}>
          <strong>Load Board:</strong>{' '}
          {datStatus?.connected
            ? '✅ DAT ONE Connected'
            : '⚠️ Not connected — add your DAT token in Settings'}
          {datStatus?.connected && bestLoad && (
            <span style={{ marginLeft: 16 }}>
              <strong>Top load:</strong>{' '}
              {bestLoad.originState}→{bestLoad.destinationState}{' '}
              ${bestLoad.rate?.toFixed(0)} (${bestLoad.dollarsPerMile?.toFixed(2)}/mi)
            </span>
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Top Loads Ready</div>
          <div className="stat-value">{loads.length}</div>
          <div className="stat-sub">scored &amp; ranked</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Best Rate</div>
          <div className="stat-value">{bestLoad ? `$${bestLoad.dollarsPerMile?.toFixed(2)}` : '—'}</div>
          <div className="stat-sub">per mile</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available Trucks</div>
          <div className="stat-value">{availableTrucks.length}/{trucks.length}</div>
          <div className="stat-sub">ready to roll</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Brokers in Pipeline</div>
          <div className="stat-value">{pendingBrokers.length}</div>
          <div className="stat-sub">pending outreach</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Total Booked Revenue</div>
          <div className="stat-value">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="stat-sub">{bookings.length} loads booked</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Top 5 loads */}
        <div className="card">
          <div className="card-title">🏆 Today's Top Loads</div>
          {loads.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>🚛</div>
              <div className="empty-sub">No loads yet — connect your DAT token in Settings and run the engine.</div>
              <button className="btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/preferences')}>
                Go to Settings →
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Route</th><th>Miles</th><th>Rate</th><th>$/Mi</th></tr>
                </thead>
                <tbody>
                  {loads.slice(0, 5).map((l, i) => (
                    <tr key={l.loadId || i}>
                      <td><strong>{i + 1}</strong></td>
                      <td><strong>{l.originState}</strong> → <strong>{l.destinationState}</strong></td>
                      <td className="muted">{l.totalMiles}</td>
                      <td className="green">${l.rate?.toFixed(0)}</td>
                      <td className="accent">${l.dollarsPerMile?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/loads')}>
            View all {loads.length} loads →
          </button>
        </div>

        {/* Trucks */}
        <div className="card">
          <div className="card-title">🚚 Fleet Overview</div>
          {trucks.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>🚚</div>
              <div className="empty-sub">No trucks added yet. Add trucks to enable broker availability blasts.</div>
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/trucks')}>
                Add Truck
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Truck</th><th>Location</th><th>Status</th></tr></thead>
                <tbody>
                  {trucks.map((t, i) => (
                    <tr key={t.truckId || i}>
                      <td>
                        <strong>{t.truckNumber}</strong><br />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.driverName}</span>
                      </td>
                      <td className="muted">{t.currentCity}, {t.currentState}</td>
                      <td>
                        <span className={'badge ' + (
                          t.status === 'AVAILABLE' ? 'badge-green' :
                          t.status === 'IN_TRANSIT' ? 'badge-amber' : 'badge-red'
                        )}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Broker pipeline */}
        <div className="card">
          <div className="card-title">📋 Broker Pipeline</div>
          {brokers.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-icon" style={{ fontSize: 32 }}>📋</div>
              <div className="empty-sub">No brokers added. Add brokers to start automated outreach.</div>
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/brokers')}>
                Add Broker
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Broker</th><th>Company</th><th>Status</th><th>Follow-ups</th></tr></thead>
                <tbody>
                  {brokers.slice(0, 5).map((b, i) => (
                    <tr key={b.brokerId || i}>
                      <td><strong>{b.brokerName}</strong></td>
                      <td className="muted">{b.brokerCompany}</td>
                      <td>
                        <span className={'badge ' + statusBadge(b.status)}>
                          {(b.status || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="muted">{b.followUpCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Automation status */}
        <div className="card">
          <div className="card-title">🤖 Automation Status</div>
          <AutomationStatus userId={userId} />
        </div>
      </div>
    </div>
  )
}

function AutomationStatus({ userId }) {
  const [prefs, setPrefs] = useState(null)

  useEffect(() => {
    api.getPrefs(userId).then(p => setPrefs(p || {})).catch(() => setPrefs({}))
  }, [userId])

  if (!prefs) return <div className="loading">Loading...</div>

  const items = [
    { label: 'SMS Load Summaries',   desc: 'Morning top-load alerts by text',    on: !!prefs.smsEnabled },
    { label: 'Email Load Reports',   desc: 'Detailed load reports via email',     on: !!prefs.emailEnabled },
    { label: 'Broker Intro Emails',  desc: 'Auto-send intro to new brokers',      on: !!(prefs.companyName?.length) },
    { label: 'Broker Follow-Ups',    desc: 'Auto follow-up every 3 days',         on: !!(prefs.companyName?.length) },
    { label: 'Availability Blasts',  desc: 'Morning truck location blast',        on: !!(prefs.companyName?.length) },
  ]

  return (
    <div>
      {items.map(item => (
        <div key={item.label} className="toggle-row">
          <div>
            <div className="toggle-label">{item.label}</div>
            <div className="toggle-sub">{item.desc}</div>
          </div>
          <span className={'badge ' + (item.on ? 'badge-green' : 'badge-gray')}>
            {item.on ? 'Active' : 'Off'}
          </span>
        </div>
      ))}
    </div>
  )
}

function statusBadge(s) {
  if (s === 'ACTIVE')                                  return 'badge-green'
  if (s === 'INTRO_SENT' || s === 'FOLLOW_UP_SENT')   return 'badge-amber'
  if (s === 'INACTIVE')                                return 'badge-red'
  return 'badge-gray'
}
