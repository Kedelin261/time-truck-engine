import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'

export default function Loads({ userId }) {
  const [loads, setLoads] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [auto, setAuto] = useState(false)
  const [filter, setFilter] = useState('')
  const [bookingLoad, setBookingLoad] = useState(null)
  const [bookingMsg, setBookingMsg] = useState('')
  const timerRef = useRef(null)

  const fetch20 = async () => {
    setLoading(true)
    setStatus('Loading...')
    try {
      const data = await api.top20(userId)
      setLoads(data)
      setStatus(`${data.length} loads loaded — ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
    setLoading(false)
  }

  useEffect(() => { fetch20() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const startAuto = () => {
    fetch20()
    timerRef.current = setInterval(fetch20, 10000)
    setAuto(true)
  }
  const stopAuto = () => {
    clearInterval(timerRef.current)
    setAuto(false)
    setStatus('Auto refresh stopped.')
  }
  useEffect(() => () => clearInterval(timerRef.current), [])

  const bookLoad = async (load) => {
    await api.addBooking(userId, {
      loadId: load.loadId,
      originState: load.originState,
      destinationState: load.destinationState,
      totalMiles: load.totalMiles,
      deadheadMiles: load.deadheadMiles,
      dollarsPerMile: load.dollarsPerMile,
      equipmentType: load.equipmentType || 'DRY_VAN'
    })
    setBookingMsg(`✅ Load ${load.loadId} marked as booked!`)
    setBookingLoad(null)
    setTimeout(() => setBookingMsg(''), 4000)
  }

  const filtered = Array.isArray(loads) ? loads.filter(l => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (l.originState || '').toLowerCase().includes(q) ||
           (l.destinationState || '').toLowerCase().includes(q) ||
           (l.loadId || '').toLowerCase().includes(q) ||
           (l.brokerCompany || '').toLowerCase().includes(q)
  }) : []

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🚛 Top Loads</div>
          <div className="page-sub">Engine-scored, ranked by $/mile and route history</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Filter by state, broker..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 220 }}
          />
          <button className="btn-primary" onClick={fetch20} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          {auto
            ? <button className="btn-ghost" onClick={stopAuto}>⏹ Stop Auto</button>
            : <button className="btn-ghost" onClick={startAuto}>▶ Auto (10s)</button>
          }
        </div>
      </div>

      {bookingMsg && <div className="alert alert-success">{bookingMsg}</div>}
      {status && <div className="alert alert-info" style={{ padding: '8px 14px' }}>{status}</div>}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Load ID</th>
                <th>Route</th>
                <th>Equipment</th>
                <th>Deadhead</th>
                <th>Miles</th>
                <th>Rate</th>
                <th>$/Mile</th>
                <th>Pickup</th>
                <th>Broker</th>
                <th>Contact</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="12" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  No loads found. Check DAT connection in Settings.
                </td></tr>
              ) : filtered.map((l, i) => (
                <tr key={l.loadId}>
                  <td><strong>{i + 1}</strong></td>
                  <td className="muted" style={{ fontSize: 12 }}>{l.loadId}</td>
                  <td>
                    <strong>{l.originState}</strong>
                    {l.originCity && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> ({l.originCity})</span>}
                    <span style={{ color: 'var(--text-muted)' }}> → </span>
                    <strong>{l.destinationState}</strong>
                    {l.destinationCity && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}> ({l.destinationCity})</span>}
                  </td>
                  <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{fmtEquip(l.equipmentType)}</span></td>
                  <td className="muted">{l.deadheadMiles} mi</td>
                  <td className="muted">{l.totalMiles?.toLocaleString()} mi</td>
                  <td className="green">${l.rate?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="accent">${l.dollarsPerMile?.toFixed(2)}</td>
                  <td className="muted" style={{ fontSize: 12 }}>{l.pickupDate || '—'}</td>
                  <td>
                    {l.brokerCompany
                      ? <><strong style={{ fontSize: 13 }}>{l.brokerCompany}</strong><br/><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.brokerName}</span></>
                      : <span className="muted">—</span>
                    }
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {l.brokerPhone && <div>📞 <a href={`tel:${l.brokerPhone}`} style={{ color: 'var(--navy-mid)' }}>{l.brokerPhone}</a></div>}
                    {l.brokerEmail && <div>✉ <a href={`mailto:${l.brokerEmail}`} style={{ color: 'var(--navy-mid)' }}>{l.brokerEmail}</a></div>}
                  </td>
                  <td>
                    <button className="btn-green btn-sm" onClick={() => setBookingLoad(l)}>
                      Book
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {bookingLoad && (
        <div className="modal-overlay" onClick={() => setBookingLoad(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">📋 Confirm Booking</div>
            <p style={{ marginBottom: 16 }}>Mark this load as booked? This will add it to your booking history and improve future load scoring.</p>
            <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <strong>{bookingLoad.originState} → {bookingLoad.destinationState}</strong><br/>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {bookingLoad.totalMiles} miles | ${bookingLoad.rate?.toFixed(0)} | ${bookingLoad.dollarsPerMile?.toFixed(2)}/mi
              </span>
              {bookingLoad.brokerPhone && (
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  <strong>📞 Call broker now:</strong> <a href={`tel:${bookingLoad.brokerPhone}`} style={{ color: 'var(--navy-mid)', fontWeight: 700 }}>{bookingLoad.brokerPhone}</a>
                  {bookingLoad.brokerCompany && <span style={{ color: 'var(--text-muted)' }}> — {bookingLoad.brokerCompany}</span>}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setBookingLoad(null)}>Cancel</button>
              <button className="btn-green" onClick={() => bookLoad(bookingLoad)}>✅ Confirm Booked</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtEquip(t) {
  const map = { BOX_TRUCK_26: "26' Box", DRY_VAN: 'Dry Van', REEFER: 'Reefer', FLATBED: 'Flatbed', STEP_DECK: 'Step Deck' }
  return map[t] || t || 'Unknown'
}
