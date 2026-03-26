import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function History({ userId }) {
  const [bookings, setBookings] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getBookings(userId).catch(() => []),
      api.getProfile(userId).catch(() => null)
    ]).then(([b, p]) => {
      setBookings(b); setProfile(p); setLoading(false)
    })
  }, [userId])

  if (loading) return <div className="loading">Loading history...</div>

  const totalRevenue = bookings.reduce((s, b) => s + (b.dollarsPerMile * b.totalMiles || 0), 0)
  const avgDpm = bookings.length ? bookings.reduce((s, b) => s + b.dollarsPerMile, 0) / bookings.length : 0
  const avgMiles = profile?.avgMiles || 0

  const topLane = profile?.laneCounts
    ? Object.entries(profile.laneCounts).sort((a, b) => b[1] - a[1])[0]
    : null

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📈 Booking History</div>
          <div className="page-sub">Your route history powers smarter load scoring — the more you book, the smarter it gets</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card green">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="stat-sub">across all booked loads</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Loads Booked</div>
          <div className="stat-value">{bookings.length}</div>
          <div className="stat-sub">in history</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Avg $/Mile</div>
          <div className="stat-value">${avgDpm.toFixed(2)}</div>
          <div className="stat-sub">across all loads</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Miles/Load</div>
          <div className="stat-value">{avgMiles.toFixed(0)}</div>
          <div className="stat-sub">preferred distance</div>
        </div>
        {topLane && (
          <div className="stat-card">
            <div className="stat-label">Top Lane</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{topLane[0]}</div>
            <div className="stat-sub">{topLane[1]} loads run</div>
          </div>
        )}
      </div>

      {/* Lane intelligence */}
      {profile && profile.laneCounts && Object.keys(profile.laneCounts).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">🧠 Lane Intelligence</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            The engine uses your booking history to boost scores for loads on lanes you run most. Here's what it's learned:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(profile.laneCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([lane, count]) => (
                <div key={lane} style={{
                  background: 'var(--navy)', color: '#fff', padding: '8px 14px',
                  borderRadius: 8, fontSize: 14, fontWeight: 600
                }}>
                  {lane} <span style={{ color: 'var(--accent)', marginLeft: 6 }}>×{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bookings table */}
      <div className="card">
        <div className="card-title">📋 All Booked Loads</div>
        {bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No bookings yet</div>
            <div className="empty-sub">When you book loads from the Top Loads page, they appear here and train the engine.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Load ID</th><th>Route</th><th>Miles</th><th>Deadhead</th>
                  <th>$/Mile</th><th>Revenue</th><th>Equipment</th><th>Booked</th>
                </tr>
              </thead>
              <tbody>
                {[...bookings].reverse().map((b, i) => (
                  <tr key={b.loadId + i}>
                    <td className="muted" style={{ fontSize: 12 }}>{b.loadId}</td>
                    <td><strong>{b.originState}</strong> → <strong>{b.destinationState}</strong></td>
                    <td className="muted">{b.totalMiles?.toLocaleString()}</td>
                    <td className="muted">{b.deadheadMiles}</td>
                    <td className="accent">${b.dollarsPerMile?.toFixed(2)}</td>
                    <td className="green">${(b.dollarsPerMile * b.totalMiles).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{fmtEquip(b.equipmentType)}</span></td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtEquip(t) {
  const map = { BOX_TRUCK_26: "26' Box", DRY_VAN: 'Dry Van', REEFER: 'Reefer', FLATBED: 'Flatbed', STEP_DECK: 'Step Deck' }
  return map[t] || t || '—'
}
