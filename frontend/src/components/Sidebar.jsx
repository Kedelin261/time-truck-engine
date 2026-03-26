import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Truck, Users, Bell, Settings, Zap
} from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/loads', icon: Package, label: 'Load Board' },
  { to: '/trucks', icon: Truck, label: 'My Trucks' },
  { to: '/brokers', icon: Users, label: 'Brokers' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function Sidebar({ userId }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Zap size={18} />
        </div>
        <div className="logo-text">
          <span className="logo-brand">Trucking</span>
          <span className="logo-dot">.Time</span>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{userId.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <div className="user-name">{userId}</div>
          <div className="user-tier">Pro Plan</div>
        </div>
        <div className="user-status-dot" title="Engine active" />
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="engine-status">
          <div className="engine-dot" />
          <span>Engine Running</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
