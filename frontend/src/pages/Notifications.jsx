import React, { useEffect, useState } from 'react'
import { api } from '../api'

export default function Notifications({ userId }) {
  const [prefs, setPrefs] = useState(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState('PRO')
  const [msg, setMsg] = useState({ text: '', type: 'success' })
  const [testing, setTesting] = useState('')

  useEffect(() => {
    api.getPrefs(userId).then(p => {
      setPrefs(p)
      setPhone(p.phoneNumber || '')
      setEmail(p.email || '')
      setTier(p.subscriptionTier || 'PRO')
    }).catch(() => {})
  }, [userId])

  const flash = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 5000)
  }

  const subscribe = async () => {
    const resp = await api.subscribe(userId, phone, email, tier)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const p = await api.getPrefs(userId)
    setPrefs(p)
  }

  const unsubscribe = async () => {
    const resp = await api.unsubscribe(userId)
    flash(resp.success ? '✅ ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    const p = await api.getPrefs(userId)
    setPrefs(p)
  }

  const testSms = async () => {
    setTesting('sms')
    const resp = await api.triggerSmsTop20(userId)
    flash(resp.success ? '✅ SMS triggered: ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    setTesting('')
  }

  const testEmail = async () => {
    setTesting('email')
    const resp = await api.triggerEmailTop20(userId)
    flash(resp.success ? '✅ Email triggered: ' + resp.message : '❌ ' + resp.message, resp.success ? 'success' : 'error')
    setTesting('')
  }

  if (!prefs) return <div className="loading">Loading notifications...</div>

  const isActive = prefs.smsEnabled || prefs.emailEnabled

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🔔 Notifications</div>
          <div className="page-sub">Configure SMS and email alerts for load summaries and new load alerts</div>
        </div>
        <span className={'badge ' + (isActive ? 'badge-green' : 'badge-gray')} style={{ fontSize: 14, padding: '6px 14px' }}>
          {isActive ? '● Active' : '○ Inactive'}
        </span>
      </div>

      {msg.text && <div className={'alert alert-' + (msg.type === 'error' ? 'error' : 'success')}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Subscription setup */}
        <div className="card">
          <div className="card-title">📱 Subscription Setup</div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Subscription Plan</label>
            <select value={tier} onChange={e => setTier(e.target.value)}>
              <option value="FREE">Free — No notifications</option>
              <option value="PRO">Pro — SMS + Email alerts</option>
              <option value="ENTERPRISE">Enterprise — All features</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Phone Number (for SMS)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+15551234567"
              type="tel"
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Format: +1XXXXXXXXXX — Powered by Twilio
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Email Address</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Powered by SendGrid — detailed load reports with broker contacts
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary" onClick={subscribe}>
              {isActive ? '🔄 Update' : '🔔 Subscribe'}
            </button>
            {isActive && (
              <button className="btn-ghost" onClick={unsubscribe}>
                Unsubscribe
              </button>
            )}
          </div>
        </div>

        {/* Current status */}
        <div className="card">
          <div className="card-title">⚙️ Current Status</div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">SMS Alerts</div>
              <div className="toggle-sub">{prefs.phoneNumber ? `→ ${prefs.phoneNumber}` : 'No phone configured'}</div>
            </div>
            <span className={'badge ' + (prefs.smsEnabled ? 'badge-green' : 'badge-gray')}>
              {prefs.smsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Email Reports</div>
              <div className="toggle-sub">{prefs.email ? `→ ${prefs.email}` : 'No email configured'}</div>
            </div>
            <span className={'badge ' + (prefs.emailEnabled ? 'badge-green' : 'badge-gray')}>
              {prefs.emailEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Plan</div>
              <div className="toggle-sub">Current subscription tier</div>
            </div>
            <span className="badge badge-blue">{prefs.subscriptionTier || 'FREE'}</span>
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-ghost btn-sm" onClick={testSms} disabled={testing === 'sms'}>
              {testing === 'sms' ? '⏳' : '📲'} Test SMS Now
            </button>
            <button className="btn-ghost btn-sm" onClick={testEmail} disabled={testing === 'email'}>
              {testing === 'email' ? '⏳' : '📧'} Test Email Now
            </button>
          </div>
        </div>
      </div>

      {/* What you get */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">📬 What You'll Receive</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {[
            {
              icon: '📱', title: 'Morning SMS Summary',
              desc: 'Every morning, receive a text with your top 5 loads. Includes route, rate, $/mile, and broker phone number — ready to call and book immediately.',
              when: 'Daily at 5 AM'
            },
            {
              icon: '⚡', title: 'New Load Alerts',
              desc: 'Get an instant text when fresh high-value loads are detected that match your preferences. Never miss a great load again.',
              when: 'Throughout dispatch hours (4AM–1AM)'
            },
            {
              icon: '📧', title: 'Email Load Report',
              desc: 'Detailed email with all top 20 loads — full route info, broker contacts, pickup dates, and booking instructions.',
              when: 'Daily morning report'
            },
            {
              icon: '🤖', title: 'Automated Broker Outreach',
              desc: 'System auto-sends intro emails to new brokers you add, then follow-ups every 3 days. Up to 3 follow-ups per broker before marking inactive.',
              when: 'Automatic based on broker status'
            },
          ].map(item => (
            <div key={item.title} style={{ padding: '16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)', marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{item.desc}</div>
              <div style={{ fontSize: 12, color: 'var(--accent-hover)', fontWeight: 600 }}>🕐 {item.when}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Config note */}
      <div className="card" style={{ marginTop: 20, background: '#fef3c7', border: '1px solid #fde68a' }}>
        <div className="card-title" style={{ color: '#92400e' }}>⚙️ Integration Setup Required</div>
        <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.6 }}>
          To activate real SMS and email delivery, configure the following environment variables on your server:<br/><br/>
          <strong>SMS (Twilio):</strong> <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, <code>TWILIO_FROM_NUMBER</code><br/>
          <strong>Email (SendGrid):</strong> <code>SENDGRID_API_KEY</code>, <code>SENDGRID_FROM_EMAIL</code>, <code>SENDGRID_FROM_NAME</code><br/><br/>
          In development mode (no keys set), all messages are printed to the server console for easy testing.
        </p>
      </div>
    </div>
  )
}
