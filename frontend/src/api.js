// API base — empty string = same-origin (dev proxy). Set VITE_API_BASE for Cloudflare Pages.
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE)
    ? import.meta.env.VITE_API_BASE
    : (typeof __API_BASE__ !== 'undefined' && __API_BASE__)
      ? __API_BASE__
      : ''

const BASE = `${API_BASE}/api/users`

// Safe fetch: never throws, always returns a value
async function req(url, opts = {}) {
  try {
    const resp = await fetch(url, opts)
    if (!resp.ok) {
      console.warn(`API ${opts.method || 'GET'} ${url} → HTTP ${resp.status}`)
      return null
    }
    const ct = resp.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await resp.json()
      return data
    }
    return await resp.text()
  } catch (err) {
    console.warn(`API error ${url}:`, err.message)
    return null
  }
}

// Ensure result is always an array
function asArray(val) {
  if (Array.isArray(val)) return val
  return []
}

// Ensure result is always an object
function asObj(val) {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val
  return {}
}

export const api = {
  // ── Loads ──────────────────────────────────────────────
  top20:    (userId) => req(`${BASE}/${userId}/top20`).then(asArray),
  newLoads: (userId) => req(`${BASE}/${userId}/newLoads`).then(asArray),

  // ── Preferences ────────────────────────────────────────
  getPrefs: (userId) => req(`${BASE}/${userId}/preferences`).then(asObj),
  savePrefs: (userId, prefs) =>
    req(`${BASE}/${userId}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    }).then(asObj),

  // ── DAT Account ────────────────────────────────────────
  datStatus: (userId) => req(`${BASE}/${userId}/accounts/status`).then(asObj),
  saveDatToken: (userId, token) =>
    req(`${BASE}/${userId}/accounts/dat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }),

  // ── Trucks ─────────────────────────────────────────────
  getTrucks: (userId) => req(`${BASE}/${userId}/trucks`).then(asArray),
  addTruck: (userId, truck) =>
    req(`${BASE}/${userId}/trucks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(truck),
    }).then(v => v || {}),
  updateTruck: (userId, truckId, truck) =>
    req(`${BASE}/${userId}/trucks/${truckId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(truck),
    }).then(v => v || {}),
  deleteTruck: (userId, truckId) =>
    req(`${BASE}/${userId}/trucks/${truckId}`, { method: 'DELETE' }),

  // ── Brokers ────────────────────────────────────────────
  getBrokers: (userId) => req(`${BASE}/${userId}/brokers`).then(asArray),
  addBroker: (userId, broker) =>
    req(`${BASE}/${userId}/brokers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broker),
    }).then(v => v || {}),
  updateBroker: (userId, brokerId, broker) =>
    req(`${BASE}/${userId}/brokers/${brokerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(broker),
    }).then(v => v || {}),
  deleteBroker: (userId, brokerId) =>
    req(`${BASE}/${userId}/brokers/${brokerId}`, { method: 'DELETE' }),
  sendBrokerIntro: (userId, brokerId) =>
    req(`${BASE}/${userId}/brokers/${brokerId}/send-intro`, { method: 'POST' })
      .then(v => v || { success: false, message: 'No response from server' }),
  sendBrokerFollowUp: (userId, brokerId) =>
    req(`${BASE}/${userId}/brokers/${brokerId}/send-followup`, { method: 'POST' })
      .then(v => v || { success: false, message: 'No response from server' }),
  blastAvailability: (userId) =>
    req(`${BASE}/${userId}/brokers/blast-availability`, { method: 'POST' }).then(asArray),

  // ── Bookings / History ──────────────────────────────────
  getBookings: (userId) => req(`${BASE}/${userId}/bookings`).then(asArray),
  addBooking: (userId, booking) =>
    req(`${BASE}/${userId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    }),
  getProfile: (userId) => req(`${BASE}/${userId}/bookings/profile`).then(asObj),

  // ── Intent ─────────────────────────────────────────────
  subscribe: (userId, phoneNumber, email, tier = 'PRO') =>
    req(`${BASE}/${userId}/intent/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, email, tier }),
    }).then(v => v || { success: false, message: 'Backend not connected' }),
  unsubscribe: (userId) =>
    req(`${BASE}/${userId}/intent/unsubscribe`, { method: 'POST' })
      .then(v => v || { success: false, message: 'Backend not connected' }),
  triggerSmsTop20: (userId) =>
    req(`${BASE}/${userId}/intent/sms-top20`, { method: 'POST' })
      .then(v => v || { success: false, message: 'Backend not connected' }),
  triggerEmailTop20: (userId) =>
    req(`${BASE}/${userId}/intent/email-top20`, { method: 'POST' })
      .then(v => v || { success: false, message: 'Backend not connected' }),
  triggerRunEngine: (userId) =>
    req(`${BASE}/${userId}/intent/run-engine`, { method: 'POST' })
      .then(v => v || { success: false, message: 'Backend not connected' }),
}
