/**
 * LoadDetailDrawer — slide-in panel with DAT One-beating load detail
 *
 * Intent Layer events (no Action Layer changes):
 *   INTENT_VIEW_ROUTE    → opens GPS map
 *   INTENT_BOOK_LOAD     → triggers booking
 *   INTENT_CALL_BROKER   → tel: link
 *   INTENT_EMAIL_BROKER  → mailto: link
 *   INTENT_COPY_REF      → clipboard copy
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'

// ── Equipment map ─────────────────────────────────────────────────────────────
const EQUIP_LABEL = {
  DRY_VAN:      'Dry Van',
  REEFER:       'Reefer',
  FLATBED:      'Flatbed',
  STEP_DECK:    'Step Deck',
  BOX_TRUCK_26: "26' Box Truck",
  LOWBOY:       'Lowboy',
  POWER_ONLY:   'Power Only',
  CONESTOGA:    'Conestoga',
}
const equipLabel = t => EQUIP_LABEL[t] || t || '—'

const EQUIP_COLOR = {
  DRY_VAN:      '#1e40af',
  REEFER:       '#0f766e',
  FLATBED:      '#b45309',
  STEP_DECK:    '#92400e',
  BOX_TRUCK_26: '#6d28d9',
  LOWBOY:       '#475569',
  POWER_ONLY:   '#1d4ed8',
}

// ── Intent Layer dispatcher ───────────────────────────────────────────────────
function dispatchIntent(type, payload) {
  window.dispatchEvent(new CustomEvent('tt:intent', { detail: { type, payload } }))
}

// ── City → lat/lng lookup (major US cities) ──────────────────────────────────
const CITY_COORDS = {
  'Wilmington,DE':    [39.7447, -75.5484],
  'Miami,FL':         [25.7617, -80.1918],
  'Philadelphia,PA':  [39.9526, -75.1652],
  'New York,NY':      [40.7128, -74.0060],
  'Atlanta,GA':       [33.7490, -84.3880],
  'Nashville,TN':     [36.1627, -86.7816],
  'Dallas,TX':        [32.7767, -96.7970],
  'Columbus,OH':      [39.9612, -82.9988],
  'Charlotte,NC':     [35.2271, -80.8431],
  'Richmond,VA':      [37.5407, -77.4360],
  'Boston,MA':        [42.3601, -71.0589],
  'Indianapolis,IN':  [39.7684, -86.1581],
  'Chicago,IL':       [41.8781, -87.6298],
  'Detroit,MI':       [42.3314, -83.0458],
  'St. Louis,MO':     [38.6270, -90.1994],
  'Columbia,SC':      [34.0007, -81.0348],
  'Newark,NJ':        [40.7357, -74.1724],
  'Hartford,CT':      [41.7658, -72.6851],
  'Louisville,KY':    [38.2527, -85.7585],
  'Birmingham,AL':    [33.5186, -86.8104],
  'Jackson,MS':       [32.2988, -90.1848],
  'Memphis,TN':       [35.1495, -90.0490],
  'Houston,TX':       [29.7604, -95.3698],
  'Los Angeles,CA':   [34.0522, -118.2437],
  'Phoenix,AZ':       [33.4484, -112.0740],
  'Denver,CO':        [39.7392, -104.9903],
  'Seattle,WA':       [47.6062, -122.3321],
  'Minneapolis,MN':   [44.9778, -93.2650],
  'Kansas City,MO':   [39.0997, -94.5786],
  'Tampa,FL':         [27.9506, -82.4572],
  'Orlando,FL':       [28.5383, -81.3792],
  'Jacksonville,FL':  [30.3322, -81.6557],
}

function getCityCoords(city, state) {
  const key = `${city},${state}`
  if (CITY_COORDS[key]) return CITY_COORDS[key]
  // Fallback: rough state centers
  const STATE_CENTER = {
    FL:[27.9,-81.6], GA:[32.7,-83.2], TX:[31.2,-99.3], NY:[42.9,-75.5],
    PA:[41.2,-77.2], OH:[40.4,-82.7], MI:[44.3,-85.4], IL:[40.0,-89.2],
    TN:[35.8,-86.7], NC:[35.6,-79.4], VA:[37.4,-78.7], SC:[33.8,-81.2],
    MA:[42.2,-71.5], CT:[41.6,-72.7], NJ:[40.1,-74.4], IN:[39.8,-86.1],
    KY:[37.8,-84.3], AL:[32.8,-86.8], MS:[32.7,-89.7], MO:[38.6,-92.3],
    DE:[38.9,-75.5], MD:[39.0,-76.8], WV:[38.6,-80.5], KS:[38.5,-96.7],
    NE:[41.5,-99.9], IA:[42.0,-93.2], WI:[44.3,-89.8], MN:[46.4,-93.1],
    ND:[47.5,-99.8], SD:[44.4,-100.2],CO:[39.1,-105.4],WY:[43.0,-107.6],
    MT:[46.8,-110.4],ID:[44.3,-114.5], UT:[39.3,-111.1],NV:[38.5,-117.0],
    AZ:[34.0,-111.1], NM:[34.5,-106.2],CA:[36.8,-119.4],OR:[44.6,-122.3],
    WA:[47.4,-120.6],AK:[64.2,-153.3], HI:[20.2,-156.4],
  }
  return STATE_CENTER[state] || [39.5, -98.4]
}

// ── Leaflet Route Map ─────────────────────────────────────────────────────────
function RouteMap({ load, onClose }) {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const mapInited  = useRef(false)

  const origin      = `${load.originCity}, ${load.originState}`
  const destination = `${load.destinationCity}, ${load.destinationState}`
  const originCoords = getCityCoords(load.originCity, load.originState)
  const destCoords   = getCityCoords(load.destinationCity, load.destinationState)
  const mapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`

  useEffect(() => {
    if (mapInited.current) return
    mapInited.current = true

    // Dynamic import Leaflet (not SSR-safe, but we're in browser)
    import('leaflet').then(L => {
      // Fix default marker icon path issue with Vite
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current || leafletRef.current) return

      const map = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map)

      // Green origin marker
      const greenIcon = L.divIcon({
        html: `<div style="background:#16a34a;color:#fff;font-weight:900;font-size:11px;
          width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg)">P</span></div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -36],
      })

      // Red destination marker
      const redIcon = L.divIcon({
        html: `<div style="background:#dc2626;color:#fff;font-weight:900;font-size:11px;
          width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg)">D</span></div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -36],
      })

      const oMarker = L.marker(originCoords, { icon: greenIcon })
        .addTo(map)
        .bindPopup(`<b>📦 PICKUP</b><br>${load.originCity}, ${load.originState}<br>${load.originAddress}<br>📅 ${load.pickupDate}`)
      const dMarker = L.marker(destCoords, { icon: redIcon })
        .addTo(map)
        .bindPopup(`<b>🏁 DELIVERY</b><br>${load.destinationCity}, ${load.destinationState}<br>${load.destinationAddress}<br>📅 ${load.deliveryDate}`)

      // Draw route line (straight + curved midpoint for visual)
      const midLat  = (originCoords[0] + destCoords[0]) / 2
      const midLng  = (originCoords[1] + destCoords[1]) / 2

      // Attempt OSRM route (free routing service)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`

      fetch(osrmUrl)
        .then(r => r.json())
        .then(data => {
          if (data.routes?.[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
            L.polyline(coords, {
              color: '#1e3a5f',
              weight: 4,
              opacity: 0.85,
              dashArray: null,
            }).addTo(map)

            // Add mileage label at midpoint
            const midIdx = Math.floor(coords.length / 2)
            if (midIdx > 0) {
              L.marker(coords[midIdx], {
                icon: L.divIcon({
                  html: `<div style="background:#1e3a5f;color:#fff;font-size:11px;font-weight:700;
                    padding:3px 8px;border-radius:20px;white-space:nowrap;
                    box-shadow:0 1px 4px rgba(0,0,0,0.3);">${load.totalMiles?.toLocaleString()} mi</div>`,
                  className: '',
                  iconAnchor: [30, 12],
                }),
              }).addTo(map)
            }
          } else {
            throw new Error('no route')
          }
        })
        .catch(() => {
          // Fallback: straight dashed line
          L.polyline([originCoords, destCoords], {
            color: '#1e3a5f',
            weight: 3,
            opacity: 0.7,
            dashArray: '8 6',
          }).addTo(map)
        })

      // Fit bounds
      const bounds = L.latLngBounds([originCoords, destCoords]).pad(0.15)
      map.fitBounds(bounds)

      oMarker.openPopup()
      setTimeout(() => { oMarker.closePopup() }, 2000)

      leafletRef.current = map
    })

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
        mapInited.current = false
      }
    }
  }, []) // eslint-disable-line

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal-v2" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mapv2-header">
          <div className="mapv2-header-left">
            <div className="mapv2-title">
              <span className="mapv2-badge pickup-badge">P</span>
              <span className="mapv2-city">{load.originCity}, <b>{load.originState}</b></span>
              <span className="mapv2-arrow">——→</span>
              <span className="mapv2-badge delivery-badge">D</span>
              <span className="mapv2-city">{load.destinationCity}, <b>{load.destinationState}</b></span>
            </div>
            <div className="mapv2-stats">
              <span className="mapv2-stat">🛣 <b>{load.totalMiles?.toLocaleString()}</b> mi loaded</span>
              <span className="mapv2-stat">⬜ <b>{load.deadheadMiles}</b> mi deadhead</span>
              <span className="mapv2-stat">📅 Pickup <b>{load.pickupDate}</b></span>
              <span className="mapv2-stat">💰 <b>${load.rate?.toLocaleString()}</b> · <b>${load.dollarsPerMile?.toFixed(2)}/mi</b></span>
            </div>
          </div>
          <button className="mapv2-close" onClick={onClose}>✕</button>
        </div>

        {/* Stop timeline */}
        <div className="mapv2-timeline">
          <div className="mapv2-stop">
            <div className="mapv2-dot green-dot" />
            <div className="mapv2-stop-info">
              <div className="mapv2-stop-type">📦 PICKUP · {load.pickupType}</div>
              <div className="mapv2-stop-city">{load.originCity}, {load.originState} {load.originZip}</div>
              <div className="mapv2-stop-detail">{load.originAddress}</div>
              <div className="mapv2-stop-detail">📅 {load.pickupDate} &nbsp;🕐 {load.pickupTime || 'Flexible'} &nbsp;🏭 {load.dockHours}</div>
            </div>
          </div>
          <div className="mapv2-line-connector">
            <div className="mapv2-line-bar" />
            <div className="mapv2-line-info">
              {load.stops > 1 && <span>🔄 {load.stops} stops</span>}
              <span>{load.totalMiles?.toLocaleString()} mi</span>
            </div>
          </div>
          <div className="mapv2-stop">
            <div className="mapv2-dot red-dot" />
            <div className="mapv2-stop-info">
              <div className="mapv2-stop-type">🏁 DELIVERY · {load.unloadType}</div>
              <div className="mapv2-stop-city">{load.destinationCity}, {load.destinationState} {load.destinationZip}</div>
              <div className="mapv2-stop-detail">{load.destinationAddress}</div>
              <div className="mapv2-stop-detail">📅 {load.deliveryDate} &nbsp;🕐 {load.deliveryTime || 'Flexible'}</div>
            </div>
          </div>
        </div>

        {/* Leaflet map */}
        <div ref={mapRef} className="mapv2-leaflet" />

        {/* Footer */}
        <div className="mapv2-footer">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            🗺 Open in Google Maps
          </a>
          <a
            href={`https://www.waze.com/ul?ll=${destCoords[0]},${destCoords[1]}&navigate=yes`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            🚗 Waze
          </a>
          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="drawer-section">
      <button className="drawer-section-header" onClick={() => setOpen(o => !o)}>
        <span className="section-title-wrap">
          <span className="section-icon">{icon}</span>
          <span>{title}</span>
          {badge && <span className="section-badge">{badge}</span>}
        </span>
        <span className="section-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="drawer-section-body">{children}</div>}
    </div>
  )
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DRow({ label, value, accent, green, warn, badge, badgeStyle, mono }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="drawer-drow">
      <span className="drow-label">{label}</span>
      <span className={`drow-value ${accent ? 'drow-accent' : ''} ${green ? 'drow-green' : ''} ${warn ? 'drow-warn' : ''} ${mono ? 'drow-mono' : ''}`}>
        {badge
          ? <span className="drow-badge" style={badgeStyle}>{value}</span>
          : value}
      </span>
    </div>
  )
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 5, label, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-label">{label}</div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--navy)' }} />
      </div>
      <div className="score-bar-val" style={{ color }}>{typeof value === 'number' ? value.toFixed(2) : value}</div>
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export default function LoadDetailDrawer({ load, onClose, onBook }) {
  const [showMap, setShowMap]           = useState(false)
  const [bookConfirm, setBookConfirm]   = useState(false)
  const [copied, setCopied]             = useState('')
  const [activeTab, setActiveTab]       = useState('overview') // overview | route | equipment | broker | financial

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleViewRoute = useCallback(() => {
    dispatchIntent('INTENT_VIEW_ROUTE', {
      loadId: load.loadId,
      origin: `${load.originCity}, ${load.originState}`,
      destination: `${load.destinationCity}, ${load.destinationState}`,
    })
    setShowMap(true)
  }, [load])

  const handleBook = useCallback(() => {
    dispatchIntent('INTENT_BOOK_LOAD', { loadId: load.loadId, rate: load.rate, dollarsPerMile: load.dollarsPerMile })
    onBook(load)
    setBookConfirm(false)
  }, [load, onBook])

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      dispatchIntent('INTENT_COPY_REF', { text, label })
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  if (!load) return null

  const hasTemp     = load.tempMin !== null && load.tempMin !== undefined
  const isReefer    = load.equipmentType === 'REEFER' || hasTemp
  const multiEquip  = (load.equipmentAllowed || []).length > 1
  const dpmColor    = load.dollarsPerMile >= 3 ? '#16a34a' : load.dollarsPerMile >= 2 ? '#d97706' : '#dc2626'

  // Tabs
  const TABS = [
    { id: 'overview',   label: 'Overview',   icon: '📋' },
    { id: 'route',      label: 'Route',      icon: '🗺' },
    { id: 'equipment',  label: 'Equipment',  icon: '🚛' },
    { id: 'financial',  label: 'Financials', icon: '💰' },
    { id: 'broker',     label: 'Broker',     icon: '🤝' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Drawer panel */}
      <div className="load-drawer load-drawer-v2">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="drawerv2-header">
          <div className="drawerv2-left">

            {/* Load ID + copy */}
            <div className="drawerv2-load-id">
              <span className="drawerv2-id-text">{load.loadId}</span>
              <button className="copy-btn" onClick={() => copyText(load.loadId, 'lid')} title="Copy load ID">
                {copied === 'lid' ? '✓' : '⎘'}
              </button>
              {load.referenceId && (
                <span className="drawerv2-ref-id">
                  REF: {load.referenceId}
                  <button className="copy-btn small" onClick={() => copyText(load.referenceId, 'ref')}>
                    {copied === 'ref' ? '✓' : '⎘'}
                  </button>
                </span>
              )}
              <span className="drawerv2-posted">{load.postedAge}</span>
            </div>

            {/* Route headline */}
            <div className="drawerv2-route">
              <div className="drawerv2-city">
                <span className="city-dot green-dot-sm" />
                <span className="drawerv2-city-name">{load.originCity}</span>
                <span className="drawerv2-state">{load.originState}</span>
              </div>
              <div className="drawerv2-route-mid">
                <div className="drawerv2-route-arrow">
                  <div className="route-line-v2" />
                  <span className="route-miles-v2">{load.totalMiles?.toLocaleString()} mi</span>
                  <div className="route-line-v2" />
                  <span className="route-arrow-v2">→</span>
                </div>
                {load.deadheadMiles > 0 && (
                  <div className="drawerv2-dh">⬜ {load.deadheadMiles} mi DH</div>
                )}
              </div>
              <div className="drawerv2-city">
                <span className="city-dot red-dot-sm" />
                <span className="drawerv2-city-name">{load.destinationCity}</span>
                <span className="drawerv2-state">{load.destinationState}</span>
              </div>
            </div>

            {/* Badge strip */}
            <div className="drawerv2-badges">
              <span className={`badge-v2 ${load.loadType === 'Full' ? 'bv2-green' : 'bv2-amber'}`}>
                {load.loadType === 'Full' ? '⬛ Full Load' : '▪ Partial'}
              </span>
              {(load.equipmentAllowed || [load.equipmentType]).map(eq => (
                <span key={eq} className="badge-v2 bv2-equip"
                  style={{ background: EQUIP_COLOR[eq] || '#1e40af', color: '#fff' }}>
                  {equipLabel(eq)}
                </span>
              ))}
              {multiEquip && (
                <span className="badge-v2 bv2-multi">✅ Multiple Types OK</span>
              )}
              {load.hazmat && <span className="badge-v2 bv2-danger">⚠ HAZMAT</span>}
              {load.teamRequired && <span className="badge-v2 bv2-warn">👥 TEAM</span>}
              {load.tarpRequired && <span className="badge-v2 bv2-info">🎯 TARP</span>}
              {load.dropHook && <span className="badge-v2 bv2-green">🔄 DROP & HOOK</span>}
              {isReefer && hasTemp && (
                <span className="badge-v2 bv2-cold">🌡 {load.tempMin}°–{load.tempMax}°F</span>
              )}
            </div>
          </div>

          {/* Rate block */}
          <div className="drawerv2-right">
            <div className="drawerv2-rate" style={{ color: dpmColor }}>${load.rate?.toLocaleString()}</div>
            <div className="drawerv2-dpm" style={{ color: dpmColor }}>${load.dollarsPerMile?.toFixed(2)}<span>/mi</span></div>
            <div className="drawerv2-pickup">📅 {load.pickupDate}</div>
            <button className="drawer-close" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* ── Action Bar ─────────────────────────────────────── */}
        <div className="drawerv2-actions">
          <button className="dav2-btn dav2-route" onClick={handleViewRoute}>
            🗺 View Route
          </button>
          <a href={`tel:${load.brokerPhone}`}
            className="dav2-btn dav2-call"
            onClick={() => dispatchIntent('INTENT_CALL_BROKER', { phone: load.brokerPhone, name: load.brokerName })}>
            📞 Call Broker
          </a>
          <a href={`mailto:${load.brokerEmail}?subject=Load ${load.loadId} — Availability&body=Hi ${load.brokerName},%0A%0AI am interested in load ${load.loadId} from ${load.originCity}, ${load.originState} to ${load.destinationCity}, ${load.destinationState}.%0A%0AReference: ${load.referenceId}%0A%0AThank you`}
            className="dav2-btn dav2-email"
            onClick={() => dispatchIntent('INTENT_EMAIL_BROKER', { email: load.brokerEmail, name: load.brokerName })}>
            ✉ Email
          </a>
          <button className="dav2-btn dav2-book" onClick={() => setBookConfirm(true)}>
            ✅ Book Load
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="drawerv2-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`drawerv2-tab ${activeTab === t.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────── */}
        <div className="drawerv2-body">

          {/* ══ OVERVIEW TAB ══════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="tab-content">

              {/* Quick-stats row */}
              <div className="overview-quick-stats">
                <div className="oqs-card">
                  <div className="oqs-label">Spot Rate</div>
                  <div className="oqs-val green">${load.spotRate?.toLocaleString() || load.rate?.toLocaleString()}</div>
                </div>
                <div className="oqs-card">
                  <div className="oqs-label">$/Mile</div>
                  <div className="oqs-val" style={{ color: dpmColor }}>${load.dollarsPerMile?.toFixed(2)}</div>
                </div>
                <div className="oqs-card">
                  <div className="oqs-label">Miles</div>
                  <div className="oqs-val">{load.totalMiles?.toLocaleString()}</div>
                </div>
                <div className="oqs-card">
                  <div className="oqs-label">Deadhead</div>
                  <div className="oqs-val">{load.deadheadMiles} mi</div>
                </div>
                <div className="oqs-card">
                  <div className="oqs-label">Weight</div>
                  <div className="oqs-val">{load.weightLbs ? `${load.weightLbs?.toLocaleString()} lbs` : '—'}</div>
                </div>
                <div className="oqs-card">
                  <div className="oqs-label">Length</div>
                  <div className="oqs-val">{load.lengthFt ? `${load.lengthFt}'` : '—'}</div>
                </div>
              </div>

              {/* Load summary card */}
              <div className="overview-card">
                <div className="oc-section-title">Load Summary</div>
                <div className="oc-grid">
                  <DRow label="Load ID"      value={load.loadId} mono />
                  <DRow label="Reference ID" value={load.referenceId} mono />
                  <DRow label="Commodity"    value={load.commodity} accent />
                  <DRow label="Load Type"    value={load.loadType}
                    badge badgeStyle={{ background: load.loadType === 'Full' ? '#16a34a' : '#d97706', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 12 }} />
                  <DRow label="Equipment"    value={(load.equipmentAllowed || [load.equipmentType]).map(equipLabel).join(' · ')} />
                  <DRow label="Size"         value={load.equipmentSize} />
                  <DRow label="Weight"       value={load.weightLbs ? `${load.weightLbs?.toLocaleString()} lbs` : null} />
                  <DRow label="Length"       value={load.lengthFt ? `${load.lengthFt} ft` : null} />
                  <DRow label="Stops"        value={load.stops > 1 ? `${load.stops} stops` : 'Direct (1 stop)'} />
                  <DRow label="Drop & Hook"  value={load.dropHook ? '✅ Yes — Drop & Hook' : 'Live load/unload'} green={load.dropHook} />
                  <DRow label="Lumper"       value={load.lumperAvailable ? '✅ Available at destination' : 'Not available'} />
                </div>
              </div>

              {/* Temperature (if reefer) */}
              {hasTemp && (
                <div className="temp-card">
                  <div className="temp-icon">🌡</div>
                  <div className="temp-info">
                    <div className="temp-title">Temperature-Controlled Load</div>
                    <div className="temp-range">{load.tempMin}°F – {load.tempMax}°F</div>
                    <div className="temp-note">Continuous monitoring required</div>
                  </div>
                </div>
              )}

              {/* Alerts */}
              {(load.hazmat || load.teamRequired) && (
                <div className="alerts-row">
                  {load.hazmat && (
                    <div className="alert-card alert-danger">
                      <span className="alert-icon">⚠</span>
                      <div><b>HAZMAT</b> — HAZMAT endorsement required</div>
                    </div>
                  )}
                  {load.teamRequired && (
                    <div className="alert-card alert-warn">
                      <span className="alert-icon">👥</span>
                      <div><b>TEAM REQUIRED</b> — Two drivers needed</div>
                    </div>
                  )}
                </div>
              )}

              {/* Comments */}
              {load.comments && (
                <div className="comments-card">
                  <div className="comments-card-title">💬 Broker Comments</div>
                  <div className="comments-card-body">{load.comments}</div>
                </div>
              )}

            </div>
          )}

          {/* ══ ROUTE TAB ═════════════════════════════════════════ */}
          {activeTab === 'route' && (
            <div className="tab-content">
              <button className="btn-open-map-big" onClick={handleViewRoute}>
                🗺 Open GPS Route Map
                <span className="btn-sub">Live route with turn-by-turn</span>
              </button>

              <div className="route-timeline-v2">
                {/* Origin */}
                <div className="rtv2-stop rtv2-origin">
                  <div className="rtv2-dot green" />
                  <div className="rtv2-content">
                    <div className="rtv2-type-tag green-tag">📦 PICKUP</div>
                    <div className="rtv2-city">{load.originCity}, {load.originState} {load.originZip}</div>
                    <div className="rtv2-addr">{load.originAddress}</div>
                    <div className="rtv2-details">
                      <span>📅 {load.pickupDate}</span>
                      <span>🕐 {load.pickupTime || 'Flexible'}</span>
                      <span className={`rtv2-load-type ${load.pickupType === 'Drop Hook' ? 'green-text' : ''}`}>
                        🏭 {load.pickupType}
                      </span>
                    </div>
                    <div className="rtv2-dock">Dock hours: {load.dockHours || 'Call for hours'}</div>
                  </div>
                </div>

                {/* Route stats */}
                <div className="rtv2-mid">
                  <div className="rtv2-mid-line" />
                  <div className="rtv2-mid-stats">
                    <div className="rtv2-stat-pill">🛣 {load.totalMiles?.toLocaleString()} loaded miles</div>
                    <div className="rtv2-stat-pill">⬜ {load.deadheadMiles} mi deadhead</div>
                    {load.stops > 1 && <div className="rtv2-stat-pill">🔄 {load.stops} stops</div>}
                  </div>
                </div>

                {/* Destination */}
                <div className="rtv2-stop rtv2-dest">
                  <div className="rtv2-dot red" />
                  <div className="rtv2-content">
                    <div className="rtv2-type-tag red-tag">🏁 DELIVERY</div>
                    <div className="rtv2-city">{load.destinationCity}, {load.destinationState} {load.destinationZip}</div>
                    <div className="rtv2-addr">{load.destinationAddress}</div>
                    <div className="rtv2-details">
                      <span>📅 {load.deliveryDate}</span>
                      <span>🕐 {load.deliveryTime || 'Flexible'}</span>
                      <span className={`rtv2-load-type ${load.unloadType === 'Drop Only' ? 'green-text' : ''}`}>
                        🏭 {load.unloadType}
                      </span>
                    </div>
                    {load.lumperAvailable && <div className="rtv2-dock">👷 Lumper available</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ EQUIPMENT TAB ══════════════════════════════════════ */}
          {activeTab === 'equipment' && (
            <div className="tab-content">

              {/* Accepted equipment — big visual */}
              <div className="equip-section-v2">
                <div className="equip-section-title">
                  Accepted Equipment Types
                  {multiEquip && <span className="equip-multi-badge">Multiple OK — Don't miss this load!</span>}
                </div>
                <div className="equip-cards-grid">
                  {(load.equipmentAllowed || [load.equipmentType]).map((eq, idx) => (
                    <div key={eq} className={`equip-card-v2 ${idx === 0 ? 'equip-primary' : 'equip-secondary'}`}
                      style={{ borderColor: EQUIP_COLOR[eq] || '#1e40af' }}>
                      <div className="equip-card-icon" style={{ color: EQUIP_COLOR[eq] || '#1e40af' }}>
                        {eq === 'REEFER' ? '🧊' : eq === 'FLATBED' || eq === 'STEP_DECK' ? '🏗' : eq === 'LOWBOY' ? '⬇' : '🚛'}
                      </div>
                      <div className="equip-card-name" style={{ color: EQUIP_COLOR[eq] || '#1e40af' }}>{equipLabel(eq)}</div>
                      {idx === 0 && <div className="equip-card-primary-tag">Primary</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Specs grid */}
              <div className="specs-section-v2">
                <div className="specs-section-title">Load Specifications</div>
                <div className="specs-grid-v2">
                  <div className="spec-item">
                    <div className="spec-label">Load Type</div>
                    <div className="spec-val"
                      style={{ color: load.loadType === 'Full' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                      {load.loadType === 'Full' ? '⬛ Full Truckload (FTL)' : '▪ Partial Load (LTL)'}
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Trailer Size</div>
                    <div className="spec-val">{load.equipmentSize || "53' Standard"}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Length</div>
                    <div className="spec-val">{load.lengthFt ? `${load.lengthFt} ft` : '—'}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Weight</div>
                    <div className="spec-val">{load.weightLbs ? `${load.weightLbs?.toLocaleString()} lbs` : '—'}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Commodity</div>
                    <div className="spec-val" style={{ fontWeight: 600 }}>{load.commodity || '—'}</div>
                  </div>
                  {hasTemp && (
                    <div className="spec-item">
                      <div className="spec-label">Temp Range</div>
                      <div className="spec-val" style={{ color: '#0284c7', fontWeight: 700 }}>
                        🌡 {load.tempMin}°F – {load.tempMax}°F
                      </div>
                    </div>
                  )}
                  <div className="spec-item">
                    <div className="spec-label">HAZMAT</div>
                    <div className="spec-val" style={{ color: load.hazmat ? '#dc2626' : 'inherit', fontWeight: load.hazmat ? 700 : 400 }}>
                      {load.hazmat ? '⚠ Yes — endorsement required' : 'No'}
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Team Required</div>
                    <div className="spec-val">{load.teamRequired ? '👥 Yes' : 'No'}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Tarp Required</div>
                    <div className="spec-val">{load.tarpRequired ? '🎯 Yes' : 'No'}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Drop & Hook</div>
                    <div className="spec-val" style={{ color: load.dropHook ? '#16a34a' : 'inherit', fontWeight: load.dropHook ? 700 : 400 }}>
                      {load.dropHook ? '✅ Available' : 'Live load/unload'}
                    </div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Lumper</div>
                    <div className="spec-val">{load.lumperAvailable ? '✅ Available' : 'Not available'}</div>
                  </div>
                  <div className="spec-item">
                    <div className="spec-label">Stops</div>
                    <div className="spec-val">{load.stops > 1 ? `${load.stops} stops` : 'Direct'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ FINANCIALS TAB ════════════════════════════════════ */}
          {activeTab === 'financial' && (
            <div className="tab-content">

              {/* Main rate cards */}
              <div className="fin-rate-grid">
                <div className="fin-rate-card fin-spot">
                  <div className="fin-label">Spot Rate</div>
                  <div className="fin-value">${(load.spotRate || load.rate)?.toLocaleString()}</div>
                  <div className="fin-sub">${load.dollarsPerMile?.toFixed(2)}/mi</div>
                </div>
                <div className="fin-rate-card fin-contract">
                  <div className="fin-label">Est. Contract Rate</div>
                  <div className="fin-value">${load.contractRate?.toLocaleString()}</div>
                  <div className="fin-sub">${((load.contractRate || 0) / (load.totalMiles || 1)).toFixed(2)}/mi</div>
                </div>
                <div className="fin-rate-card fin-fuel">
                  <div className="fin-label">Fuel Surcharge</div>
                  <div className="fin-value">${load.fuelSurcharge?.toLocaleString()}</div>
                  <div className="fin-sub">${((load.fuelSurcharge || 0) / (load.totalMiles || 1)).toFixed(2)}/mi</div>
                </div>
                <div className="fin-rate-card fin-allin">
                  <div className="fin-label">All-In Estimate</div>
                  <div className="fin-value">${load.allInRate?.toLocaleString()}</div>
                  <div className="fin-sub">${((load.allInRate || 0) / (load.totalMiles || 1)).toFixed(2)}/mi</div>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="fin-scores">
                <div className="fin-scores-title">Load Quality Score</div>
                <ScoreBar
                  label="$/Mile Rating"
                  value={load.dollarsPerMile}
                  max={5}
                  color={dpmColor}
                />
                <ScoreBar
                  label="Revenue Potential"
                  value={Math.min(5, load.rate / 1000)}
                  max={5}
                  color="#1d4ed8"
                />
                <ScoreBar
                  label="Deadhead Efficiency (lower=better)"
                  value={5 - Math.min(5, load.deadheadMiles / 20)}
                  max={5}
                  color="#7c3aed"
                />
                <ScoreBar
                  label="Distance Score"
                  value={Math.min(5, load.totalMiles / 300)}
                  max={5}
                  color="#0f766e"
                />
              </div>

              {/* Rate breakdown table */}
              <div className="fin-breakdown">
                <div className="fin-breakdown-title">Rate Breakdown</div>
                <div className="fin-table">
                  <div className="fin-row">
                    <span>Base Rate</span>
                    <span>${(load.spotRate || load.rate)?.toLocaleString()}</span>
                  </div>
                  <div className="fin-row">
                    <span>Fuel Surcharge</span>
                    <span>+${load.fuelSurcharge?.toLocaleString()}</span>
                  </div>
                  <div className="fin-row fin-row-total">
                    <span>All-In Total</span>
                    <span style={{ color: '#16a34a', fontWeight: 800 }}>${load.allInRate?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ BROKER TAB ════════════════════════════════════════ */}
          {activeTab === 'broker' && (
            <div className="tab-content">

              {/* Broker card */}
              <div className="brokerv2-card">
                <div className="brokerv2-avatar">{(load.brokerName || 'B').charAt(0).toUpperCase()}</div>
                <div className="brokerv2-info">
                  <div className="brokerv2-name">{load.brokerName}</div>
                  <div className="brokerv2-company">{load.brokerCompany}</div>
                  <div className="brokerv2-mc">{load.brokerMC}</div>
                </div>
                <div className="brokerv2-csa">
                  <div className="brokerv2-csa-val"
                    style={{ color: load.brokerCsaScore >= 90 ? '#16a34a' : load.brokerCsaScore >= 75 ? '#d97706' : '#dc2626' }}>
                    {load.brokerCsaScore}
                  </div>
                  <div className="brokerv2-csa-label">CSA Score</div>
                </div>
              </div>

              {/* Contact buttons */}
              <div className="brokerv2-contacts">
                <a href={`tel:${load.brokerPhone}`}
                  className="brokerv2-contact-btn call-btn"
                  onClick={() => dispatchIntent('INTENT_CALL_BROKER', { phone: load.brokerPhone, name: load.brokerName })}>
                  📞 {load.brokerPhone}
                  <span className="contact-label">Call Now</span>
                </a>
                <a href={`mailto:${load.brokerEmail}?subject=Load ${load.loadId} Inquiry&body=Hi ${load.brokerName},%0A%0AI'm interested in load ${load.loadId}.%0ARef: ${load.referenceId}%0ARoute: ${load.originCity}, ${load.originState} to ${load.destinationCity}, ${load.destinationState}%0A%0AThank you`}
                  className="brokerv2-contact-btn email-btn"
                  onClick={() => dispatchIntent('INTENT_EMAIL_BROKER', { email: load.brokerEmail, name: load.brokerName })}>
                  ✉ {load.brokerEmail}
                  <span className="contact-label">Send Email</span>
                </a>
              </div>

              {/* Reference IDs */}
              <div className="brokerv2-refs">
                <div className="ref-row-v2">
                  <span className="ref-label-v2">Load Board ID</span>
                  <span className="ref-val-v2">
                    {load.loadId}
                    <button className="copy-btn" onClick={() => copyText(load.loadId, 'lid2')}>
                      {copied === 'lid2' ? '✓' : '⎘'}
                    </button>
                  </span>
                </div>
                {load.referenceId && (
                  <div className="ref-row-v2">
                    <span className="ref-label-v2">Reference ID</span>
                    <span className="ref-val-v2">
                      {load.referenceId}
                      <button className="copy-btn" onClick={() => copyText(load.referenceId, 'ref2')}>
                        {copied === 'ref2' ? '✓' : '⎘'}
                      </button>
                    </span>
                  </div>
                )}
              </div>

              {/* Comments */}
              {load.comments ? (
                <div className="brokerv2-comments">
                  <div className="brokerv2-comments-title">💬 Broker Notes / Special Instructions</div>
                  <div className="brokerv2-comments-body">{load.comments}</div>
                </div>
              ) : (
                <div className="brokerv2-no-comments">No additional broker notes for this load.</div>
              )}
            </div>
          )}

        </div>

        {/* ── Sticky footer ────────────────────────────────────── */}
        <div className="drawerv2-footer">
          <div className="drawerv2-footer-info">
            <span className="footer-rate-v2" style={{ color: dpmColor }}>${load.rate?.toLocaleString()}</span>
            <span className="footer-meta">· ${load.dollarsPerMile?.toFixed(2)}/mi · {load.totalMiles?.toLocaleString()} mi · {load.commodity || load.equipmentType}</span>
          </div>
          <div className="drawerv2-footer-btns">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            <button className="btn-route-sm" onClick={handleViewRoute}>🗺 Map</button>
            <button className="btn-book-load" onClick={() => setBookConfirm(true)}>✅ Book Load</button>
          </div>
        </div>
      </div>

      {/* ── Route Map Modal ─────────────────────────────────── */}
      {showMap && <RouteMap load={load} onClose={() => setShowMap(false)} />}

      {/* ── Book Confirm Modal ───────────────────────────────── */}
      {bookConfirm && (
        <div className="modal-overlay" onClick={() => setBookConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">✅ Confirm Booking</div>
            <p style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 14 }}>
              Mark this load as booked? It will be saved to your history and improve future scoring.
            </p>
            <div className="booking-confirm-card">
              <div className="bc-route">
                {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
              </div>
              <div className="bc-stats">
                <span style={{ color: '#16a34a', fontWeight: 700 }}>${load.rate?.toLocaleString()}</span>
                <span>${load.dollarsPerMile?.toFixed(2)}/mi</span>
                <span>{load.totalMiles?.toLocaleString()} mi</span>
                <span>{load.commodity}</span>
              </div>
              {load.brokerPhone && (
                <div className="bc-call">
                  <strong>📞 Confirm with broker:</strong>{' '}
                  <a href={`tel:${load.brokerPhone}`} style={{ color: 'var(--navy-mid)', fontWeight: 700 }}>
                    {load.brokerPhone}
                  </a>
                  {load.brokerCompany && (
                    <span style={{ color: 'var(--text-muted)' }}> — {load.brokerCompany}</span>
                  )}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setBookConfirm(false)}>Cancel</button>
              <button className="btn-green" onClick={handleBook}>✅ Confirm Booked</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
