import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// -- Loads --
export const getTop20 = (userId) => api.get(`/users/${userId}/top20`)
export const getNewLoads = (userId) => api.get(`/users/${userId}/newLoads`)

// -- Preferences --
export const getPreferences = (userId) => api.get(`/users/${userId}/preferences`)
export const updatePreferences = (userId, prefs) => api.post(`/users/${userId}/preferences`, prefs)

// -- Account / DAT --
export const getDatStatus = (userId) => api.get(`/users/${userId}/accounts/status`)
export const connectDat = (userId, token) => api.post(`/users/${userId}/accounts/dat`, { token })

// -- Bookings --
export const getBookings = (userId) => api.get(`/users/${userId}/bookings`)
export const addBooking = (userId, booking) => api.post(`/users/${userId}/bookings`, booking)
export const getProfile = (userId) => api.get(`/users/${userId}/bookings/profile`)

// -- Trucks --
export const getTrucks = (userId) => api.get(`/users/${userId}/trucks`)
export const upsertTruck = (userId, truck) => api.post(`/users/${userId}/trucks`, truck)
export const deleteTruck = (userId, truckId) => api.delete(`/users/${userId}/trucks/${truckId}`)

// -- Brokers --
export const getBrokers = (userId) => api.get(`/users/${userId}/brokers`)
export const upsertBroker = (userId, broker) => api.post(`/users/${userId}/brokers`, broker)
export const deleteBroker = (userId, brokerId) => api.delete(`/users/${userId}/brokers/${brokerId}`)
export const sendBrokerIntro = (userId, brokerId) => api.post(`/users/${userId}/brokers/${brokerId}/send-intro`)
export const sendBrokerFollowUp = (userId, brokerId) => api.post(`/users/${userId}/brokers/${brokerId}/send-followup`)
export const sendBrokerAvailability = (userId, brokerId) => api.post(`/users/${userId}/brokers/${brokerId}/send-availability`)

// -- Intent --
export const dispatchIntent = (userId, type, extras = {}) =>
  api.post(`/users/${userId}/intent`, { type, ...extras })

export const triggerSmsTop20 = (userId) => api.post(`/users/${userId}/intent/sms-top20`)
export const triggerEmailTop20 = (userId) => api.post(`/users/${userId}/intent/email-top20`)
export const activateSubscription = (userId) => api.post(`/users/${userId}/intent/activate`)
export const deactivateSubscription = (userId) => api.post(`/users/${userId}/intent/deactivate`)

export default api
