// API base — empty means same-origin (dev proxy), set VITE_API_BASE for Cloudflare Pages
const API_BASE = (typeof __API_BASE__ !== 'undefined' && __API_BASE__) ? __API_BASE__ : ''
const BASE = `${API_BASE}/api/users`

async function req(url, opts = {}) {
  const resp = await fetch(url, opts)
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`HTTP ${resp.status}: ${text}`)
  }
  const ct = resp.headers.get('content-type') || ''
  if (ct.includes('application/json')) return resp.json()
  return resp.text()
}

export const api = {
  // ── Loads ──────────────────────────────────────────────
  top20: (userId) => req(`${BASE}/${userId}/top20`),
  newLoads: (userId) => req(`${BASE}/${userId}/newLoads`),

  // ── Preferences ────────────────────────────────────────
  getPrefs: (userId) => req(`${BASE}/${userId}/preferences`),
  savePrefs: (userId, prefs) =>
    req(`${BASE}/${userId}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    }),

  // ── DAT Account ────────────────────────────────────────
  datStatus: (userId) => req(`${BASE}/${userId}/accounts/status`),
  saveDatToken: (userId, token) =>
    fetch(`${BASE}/${userId}/accounts/dat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    }),

  // ── Trucks ─────────────────────────────────────────────
  getTrucks: (userId) => req(`${BASE}/${userId}/trucks`),
  addTruck: (userId, truck) =>
    req(`${BASE}/${userId}/trucks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(truck)
    }),
  updateTruck: (userId, truckId, truck) =>
    req(`${BASE}/${userId}/trucks/${truckId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(truck)
    }),
  deleteTruck: (userId, truckId) =>
    fetch(`${BASE}/${userId}/trucks/${truckId}`, { method: 'DELETE' }),

  // ── Brokers ────────────────────────────────────────────
  getBrokers: (userId) => req(`${BASE}/${userId}/brokers`),
  addBroker: (userId, broker) =>
    req(`${BASE}/${userId}/brokers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broker)
    }),
  updateBroker: (userId, brokerId, broker) =>
    req(`${BASE}/${userId}/brokers/${brokerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broker)
    }),
  deleteBroker: (userId, brokerId) =>
    fetch(`${BASE}/${userId}/brokers/${brokerId}`, { method: 'DELETE' }),
  sendBrokerIntro: (userId, brokerId) =>
    req(`${BASE}/${userId}/brokers/${brokerId}/send-intro`, { method: 'POST' }),
  sendBrokerFollowUp: (userId, brokerId) =>
    req(`${BASE}/${userId}/brokers/${brokerId}/send-followup`, { method: 'POST' }),
  blastAvailability: (userId) =>
    req(`${BASE}/${userId}/brokers/blast-availability`, { method: 'POST' }),

  // ── Bookings / History ──────────────────────────────────
  getBookings: (userId) => req(`${BASE}/${userId}/bookings`),
  addBooking: (userId, booking) =>
    fetch(`${BASE}/${userId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    }),
  getProfile: (userId) => req(`${BASE}/${userId}/bookings/profile`),

  // ── Intent ─────────────────────────────────────────────
  subscribe: (userId, phoneNumber, email, tier = 'PRO') =>
    req(`${BASE}/${userId}/intent/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, email, tier })
    }),
  unsubscribe: (userId) =>
    req(`${BASE}/${userId}/intent/unsubscribe`, { method: 'POST' }),
  triggerSmsTop20: (userId) =>
    req(`${BASE}/${userId}/intent/sms-top20`, { method: 'POST' }),
  triggerEmailTop20: (userId) =>
    req(`${BASE}/${userId}/intent/email-top20`, { method: 'POST' }),
  triggerRunEngine: (userId) =>
    req(`${BASE}/${userId}/intent/run-engine`, { method: 'POST' }),
}
