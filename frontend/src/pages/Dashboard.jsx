import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ userId }) {
  const [loads, setLoads] = useState([])
  const [trucks, setTrucks] = useState([])
  const [brokers, setBrokers] = useState([])
  const [bookings, setBookings] = useState([])
  const [datStatus, setDatStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [engineMsg, setEngineMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.top20(userId).catch(() => []),
      api.getTrucks(userId).catch(() => []),
      api.getBrokers(userId).catch(() => []),
      api.getBookings(userId).catch(() => []),
      api.datStatus(userId).catch(() => null),
    ]).then(([l, t, b, bk, ds]) => {
      setLoads(l); setTrucks(t); setBrokers(b); setBookings(bk); setDatStatus(ds)
      setLoading(false)
    })
  }, [userId])

  const runEngine = async () => {
    setEngineMsg('Running engine...')
    const resp = await api.triggerRunEngine(userId)
    setEngineMsg(resp.message || 'Done')
    const l = await api.top20(userId)
    setLoads(l)
    setTimeout(() => setEngineMsg(''), 4000)
  }

  const bestLoad = loads[0]
  const availableTrucks = trucks.filter(t => t.status === 'AVAILABLE')
  const pendingBrokers = brokers.filter(b => b.status === 'NEW' || b.status === 'INTRO_SENT')
  const totalRevenue = bookings.reduce((s, b) => s + (b.dollarsPerMile * b.totalMiles || 0), 0)

  if (loading) return <div className="loading">⏳ Loading dashboard...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Welcome back, {userId} — here's your operation at a glance</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-accent" onClick={runEngine}>⚡ Run Engine</button>
        </div>
      </div>

      {engineMsg && <div className="alert alert-info">{engineMsg}</div>}

      {/* Status bar */}
      <div className="alert" style={{ background: datStatus?.connected ? '#dcfce7' : '#fef3c7', color: datStatus?.connected ? '#166534' : '#92400e', border: '1px solid', borderColor: datStatus?.connected ? '#bbf7d0' : '#fde68a', marginBottom: 24 }}>
        <strong>Load Board:</strong> {datStatus?.connected ? '✅ DAT ONE Connected' : '⚠️ Not connected — add your DAT token in Settings'}
        {datStatus?.connected && <span style={{ marginLeft: 16 }}><strong>Top load:</strong> {bestLoad ? `${bestLoad.originState}→${bestLoad.destinationState} $${bestLoad.rate?.toFixed(0)} ($${bestLoad.dollarsPerMile?.toFixed(2)}/mi)` : 'No loads found'}</span>}
      </div>

      {/* KPI stats */}
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
              <div className="empty-sub">No loads found. Connect DAT and run engine.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Route</th><th>Miles</th><th>Rate</th><th>$/Mi</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.slice(0, 5).map((l, i) => (
                    <tr key={l.loadId}>
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

        {/* Trucks overview */}
        <div className="card">
          <div className="card-title">🚚 Fleet Overview</div>
          {trucks.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-sub">No trucks added yet. Add trucks to enable broker availability blasts.</div>
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/trucks')}>Add Truck</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Truck</th><th>Location</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {trucks.map(t => (
                    <tr key={t.truckId}>
                      <td><strong>{t.truckNumber}</strong><br/><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.driverName}</span></td>
                      <td className="muted">{t.currentCity}, {t.currentState}</td>
                      <td>
                        <span className={'badge ' + (t.status === 'AVAILABLE' ? 'badge-green' : t.status === 'IN_TRANSIT' ? 'badge-amber' : 'badge-red')}>
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
              <div className="empty-sub">No brokers added. Add brokers to start automated outreach.</div>
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/brokers')}>Add Broker</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Broker</th><th>Company</th><th>Status</th><th>Follow-ups</th></tr>
                </thead>
                <tbody>
                  {brokers.slice(0, 5).map(b => (
                    <tr key={b.brokerId}>
                      <td><strong>{b.brokerName}</strong></td>
                      <td className="muted">{b.brokerCompany}</td>
                      <td>
                        <span className={'badge ' + statusBadge(b.status)}>{b.status?.replace('_', ' ')}</span>
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
    api.getPrefs(userId).then(setPrefs).catch(() => {})
  }, [userId])

  if (!prefs) return <div className="loading">Loading...</div>

  const items = [
    { label: 'SMS Load Summaries', desc: 'Morning top-load alerts by text', on: prefs.smsEnabled, phone: prefs.phoneNumber },
    { label: 'Email Load Reports', desc: 'Detailed load reports via email', on: prefs.emailEnabled, phone: prefs.email },
    { label: 'Broker Intro Emails', desc: 'Auto-send intro to new brokers', on: prefs.companyName?.length > 0 },
    { label: 'Broker Follow-Ups', desc: 'Auto follow-up every 3 days', on: prefs.companyName?.length > 0 },
    { label: 'Availability Blasts', desc: 'Morning truck location blast', on: prefs.companyName?.length > 0 },
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
  if (s === 'ACTIVE') return 'badge-green'
  if (s === 'INTRO_SENT' || s === 'FOLLOW_UP_SENT') return 'badge-amber'
  if (s === 'INACTIVE') return 'badge-red'
  return 'badge-gray'
}
