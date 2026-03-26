import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Loads from './pages/Loads'
import Trucks from './pages/Trucks'
import Brokers from './pages/Brokers'
import Preferences from './pages/Preferences'
import Notifications from './pages/Notifications'
import History from './pages/History'
import './App.css'

const NAV = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/loads',     icon: '🚛', label: 'Top Loads' },
  { to: '/trucks',    icon: '🚚', label: 'My Trucks' },
  { to: '/brokers',   icon: '📋', label: 'Brokers' },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/history',   icon: '📈', label: 'History' },
  { to: '/preferences', icon: '⚙️', label: 'Settings' },
]

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('tt_userId') || 'demo')
  const [userInput, setUserInput] = useState(userId)

  const applyUser = () => {
    const id = userInput.trim() || 'demo'
    setUserId(id)
    localStorage.setItem('tt_userId', id)
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">🚛</span>
            <div>
              <div className="brand-name">Trucking.Time</div>
              <div className="brand-sub">Owner Operator Engine</div>
            </div>
          </div>

          <div className="user-box">
            <label>Driver ID</label>
            <div className="user-input-row">
              <input
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyUser()}
                placeholder="driver id"
              />
              <button className="btn-sm btn-accent" onClick={applyUser}>Go</button>
            </div>
            <div className="user-active">Active: <strong>{userId}</strong></div>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              >
                <span className="nav-icon">{n.icon}</span>
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="footer-badge">Smarter loads. Your time back.</div>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard     userId={userId} />} />
            <Route path="/loads"         element={<Loads         userId={userId} />} />
            <Route path="/trucks"        element={<Trucks        userId={userId} />} />
            <Route path="/brokers"       element={<Brokers       userId={userId} />} />
            <Route path="/notifications" element={<Notifications userId={userId} />} />
            <Route path="/history"       element={<History       userId={userId} />} />
            <Route path="/preferences"   element={<Preferences   userId={userId} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
