/**
 * Trucking.Time API client
 *
 * Backend runs as Cloudflare Pages Functions on the same domain.
 * All requests go to /api/users/:userId/... — no base URL needed.
 * Every call is null-safe: returns [] or {} on failure, never throws.
 */

const BASE = '/api/users'

async function req(url, opts = {}) {
  try {
    const resp = await fetch(url, opts)
    if (!resp.ok) {
      console.warn(`API ${opts.method || 'GET'} ${url} → HTTP ${resp.status}`)
      return null
    }
    const ct = resp.headers.get('content-type') || ''
    if (ct.includes('application/json')) return resp.json()
    return resp.text()
  } catch (err) {
    console.warn(`API error [${url}]:`, err.message)
    return null
  }
}

const asArray = v => (Array.isArray(v) ? v : [])
const asObj   = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

export const api = {
  // ── Loads ──────────────────────────────────────────────────────────────
  top20:    (userId) => req(`${BASE}/${userId}/top20`).then(asArray),
  newLoads: (userId) => req(`${BASE}/${userId}/newLoads`).then(asArray),

  // ── Preferences ────────────────────────────────────────────────────────
  getPrefs:  (userId)       => req(`${BASE}/${userId}/preferences`).then(asObj),
  savePrefs: (userId, body) => req(`${BASE}/${userId}/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(asObj),

  // ── DAT ────────────────────────────────────────────────────────────────
  datStatus:    (userId)        => req(`${BASE}/${userId}/accounts/status`).then(asObj),
  saveDatToken: (userId, token) => req(`${BASE}/${userId}/accounts/dat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then(v => v || {}),

  // ── Trucks ─────────────────────────────────────────────────────────────
  getTrucks:   (userId)               => req(`${BASE}/${userId}/trucks`).then(asArray),
  addTruck:    (userId, truck)         => req(`${BASE}/${userId}/trucks`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(truck),
  }).then(v => v || {}),
  updateTruck: (userId, truckId, truck) => req(`${BASE}/${userId}/trucks/${truckId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(truck),
  }).then(v => v || {}),
  deleteTruck: (userId, truckId)       => req(`${BASE}/${userId}/trucks/${truckId}`, { method: 'DELETE' }),

  // ── Brokers ────────────────────────────────────────────────────────────
  getBrokers:       (userId)                 => req(`${BASE}/${userId}/brokers`).then(asArray),
  addBroker:        (userId, broker)          => req(`${BASE}/${userId}/brokers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(broker),
  }).then(v => v || {}),
  updateBroker:     (userId, brokerId, data)  => req(`${BASE}/${userId}/brokers/${brokerId}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }).then(v => v || {}),
  deleteBroker:     (userId, brokerId)        => req(`${BASE}/${userId}/brokers/${brokerId}`, { method: 'DELETE' }),
  sendBrokerIntro:  (userId, brokerId)        => req(`${BASE}/${userId}/brokers/${brokerId}/send-intro`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
  sendBrokerFollowUp: (userId, brokerId)      => req(`${BASE}/${userId}/brokers/${brokerId}/send-followup`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
  blastAvailability:  (userId)               => req(`${BASE}/${userId}/brokers/blast-availability`, { method: 'POST' }).then(asArray),

  // ── Bookings ───────────────────────────────────────────────────────────
  getBookings: (userId)          => req(`${BASE}/${userId}/bookings`).then(asArray),
  addBooking:  (userId, booking) => req(`${BASE}/${userId}/bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking),
  }).then(v => v || {}),
  getProfile:  (userId)          => req(`${BASE}/${userId}/bookings/profile`).then(asObj),

  // ── Intent ─────────────────────────────────────────────────────────────
  subscribe: (userId, phoneNumber, email, tier = 'PRO') =>
    req(`${BASE}/${userId}/intent/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, email, tier }),
    }).then(v => v || { success: false, message: 'No response' }),
  unsubscribe:      (userId) => req(`${BASE}/${userId}/intent/unsubscribe`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
  triggerSmsTop20:  (userId) => req(`${BASE}/${userId}/intent/sms-top20`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
  triggerEmailTop20:(userId) => req(`${BASE}/${userId}/intent/email-top20`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
  triggerRunEngine: (userId) => req(`${BASE}/${userId}/intent/run-engine`, { method: 'POST' })
    .then(v => v || { success: false, message: 'No response' }),
}
