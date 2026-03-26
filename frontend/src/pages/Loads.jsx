import React, { useEffect, useState, useRef } from 'react'
import { api } from '../api'
import LoadDetailDrawer from '../components/LoadDetailDrawer'

// Intent Layer listener — registers on mount, logs all intents
// (Action Layer never changes; only the Intent Router handles dispatch)
function useIntentListener() {
  useEffect(() => {
    const handler = e => {
      const { type, payload } = e.detail || {}
      console.log('[Intent]', type, payload)
      // Future: route to IntentRouter service
    }
    window.addEventListener('tt:intent', handler)
    return () => window.removeEventListener('tt:intent', handler)
  }, [])
}

const EQUIP_LABEL = {
  DRY_VAN: 'Dry Van', REEFER: 'Reefer', FLATBED: 'Flatbed',
  STEP_DECK: 'Step Deck', BOX_TRUCK_26: "26' Box", LOWBOY: 'Lowboy',
}
const equipLabel = t => EQUIP_LABEL[t] || t || '—'

const EQUIP_COLOR = {
  DRY_VAN: 'badge-blue', REEFER: 'badge-teal', FLATBED: 'badge-amber',
  STEP_DECK: 'badge-amber', BOX_TRUCK_26: 'badge-purple', LOWBOY: 'badge-gray',
}

export default function Loads({ userId }) {
  const [loads, setLoads]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [status, setStatus]       = useState('')
  const [auto, setAuto]           = useState(false)
  const [filter, setFilter]       = useState('')
  const [sortKey, setSortKey]     = useState('_score')
  const [sortDir, setSortDir]     = useState('desc')
  const [selectedLoad, setSelectedLoad] = useState(null)
  const [bookingMsg, setBookingMsg]     = useState('')
  const timerRef = useRef(null)

  useIntentListener()

  const fetch20 = async () => {
    setLoading(true)
    setStatus('Loading...')
    try {
      const data = await api.top20(userId)
      setLoads(data)
      setStatus(`${data.length} loads · refreshed ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setStatus('Error: ' + e.message)
    }
    setLoading(false)
  }

  useEffect(() => { fetch20() }, [userId]) // eslint-disable-line

  const startAuto = () => { fetch20(); timerRef.current = setInterval(fetch20, 10000); setAuto(true) }
  const stopAuto  = () => { clearInterval(timerRef.current); setAuto(false); setStatus('Auto refresh stopped.') }
  useEffect(() => () => clearInterval(timerRef.current), [])

  const bookLoad = async (load) => {
    await api.addBooking(userId, {
      loadId:           load.loadId,
      originState:      load.originState,
      destinationState: load.destinationState,
      totalMiles:       load.totalMiles,
      deadheadMiles:    load.deadheadMiles,
      dollarsPerMile:   load.dollarsPerMile,
      equipmentType:    load.equipmentType || 'DRY_VAN',
    })
    setBookingMsg(`✅ ${load.loadId} booked — ${load.originState}→${load.destinationState} $${load.rate?.toLocaleString()}`)
    setSelectedLoad(null)
    setTimeout(() => setBookingMsg(''), 5000)
  }

  // Filter
  const filtered = loads.filter(l => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (l.originState||'').toLowerCase().includes(q)
      || (l.originCity||'').toLowerCase().includes(q)
      || (l.destinationState||'').toLowerCase().includes(q)
      || (l.destinationCity||'').toLowerCase().includes(q)
      || (l.loadId||'').toLowerCase().includes(q)
      || (l.brokerCompany||'').toLowerCase().includes(q)
      || (l.commodity||'').toLowerCase().includes(q)
      || (l.equipmentType||'').toLowerCase().includes(q)
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey] ?? 0
    let bv = b[sortKey] ?? 0
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortTh = ({ col, label }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      {label} {sortKey === col ? (sortDir === 'desc' ? '▼' : '▲') : <span style={{ opacity: 0.3 }}>⇅</span>}
    </th>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🚛 Top Loads</div>
          <div className="page-sub">Engine-scored by $/mi · Click any row for full DAT-style details</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Filter: state, city, broker, commodity..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: 260 }}
          />
          <button className="btn-primary" onClick={fetch20} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          {auto
            ? <button className="btn-ghost" onClick={stopAuto}>⏹ Stop</button>
            : <button className="btn-ghost" onClick={startAuto}>▶ Auto 10s</button>
          }
        </div>
      </div>

      {bookingMsg && <div className="alert alert-success">{bookingMsg}</div>}
      {status && <div className="alert alert-info" style={{ padding: '7px 14px', fontSize: 13 }}>{status}</div>}

      {/* Hint banner */}
      <div className="loads-hint">
        💡 Click any row to see full load details — route map, equipment specs, rates, broker info &amp; more
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="loads-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <SortTh col="originState"       label="Origin" />
                <SortTh col="destinationState"  label="Destination" />
                <th>Equipment</th>
                <th>Load</th>
                <SortTh col="deadheadMiles"     label="DH" />
                <SortTh col="totalMiles"        label="Miles" />
                <th>Commodity</th>
                <SortTh col="rate"              label="Rate" />
                <SortTh col="dollarsPerMile"    label="$/Mi" />
                <th>Pickup</th>
                <th>Broker</th>
                <th style={{ width: 80 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🚛</div>
                    {filter ? `No loads match "${filter}"` : 'No loads yet — connect DAT token in Settings.'}
                  </td>
                </tr>
              ) : sorted.map((l, i) => (
                <tr
                  key={l.loadId}
                  className={`load-row ${selectedLoad?.loadId === l.loadId ? 'load-row-selected' : ''}`}
                  onClick={() => setSelectedLoad(l)}
                >
                  <td className="rank-cell"><strong>{i + 1}</strong></td>

                  {/* Origin */}
                  <td>
                    <div className="city-cell">
                      <span className="city-name">{l.originCity}</span>
                      <span className="state-badge">{l.originState}</span>
                    </div>
                  </td>

                  {/* Destination */}
                  <td>
                    <div className="city-cell">
                      <span className="city-name">{l.destinationCity}</span>
                      <span className="state-badge">{l.destinationState}</span>
                    </div>
                  </td>

                  {/* Equipment — show all allowed types */}
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {(l.equipmentAllowed || [l.equipmentType]).map((eq, ei) => (
                        <span key={eq} className={`badge ${EQUIP_COLOR[eq] || 'badge-blue'}`}
                          style={{ fontSize: 10, padding: '2px 7px', opacity: ei === 0 ? 1 : 0.75 }}>
                          {equipLabel(eq)}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Full / Partial */}
                  <td>
                    <span className={`badge ${l.loadType === 'Full' ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: 11 }}>
                      {l.loadType || 'Full'}
                    </span>
                    {l.dropHook && <span className="badge badge-gray" style={{ fontSize: 10, marginLeft: 3 }}>D&H</span>}
                  </td>

                  <td className="muted" style={{ fontSize: 12 }}>{l.deadheadMiles} mi</td>
                  <td className="muted">{l.totalMiles?.toLocaleString()}</td>

                  {/* Commodity */}
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.commodity || '—'}
                    {l.hazmat && <span style={{ marginLeft: 4, color: 'var(--red)', fontSize: 11, fontWeight: 700 }}>⚠HM</span>}
                  </td>

                  <td className="green" style={{ fontWeight: 700 }}>${l.rate?.toLocaleString()}</td>
                  <td className="accent" style={{ fontWeight: 800 }}>${l.dollarsPerMile?.toFixed(2)}</td>

                  <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{l.pickupDate || '—'}</td>

                  {/* Broker */}
                  <td>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{l.brokerCompany}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{l.brokerName}</div>
                    </div>
                  </td>

                  <td onClick={e => e.stopPropagation()}>
                    <button className="btn-details-sm" onClick={() => setSelectedLoad(l)}>
                      Details ›
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load Detail Drawer */}
      {selectedLoad && (
        <LoadDetailDrawer
          load={selectedLoad}
          onClose={() => setSelectedLoad(null)}
          onBook={bookLoad}
        />
      )}
    </div>
  )
}
