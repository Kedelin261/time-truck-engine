import React, { useEffect, useState } from 'react'
import { api } from '../api'

const EMPTY_TRUCK = {
  truckNumber: '', driverName: '', currentCity: '', currentState: '',
  equipmentType: 'DRY_VAN', status: 'AVAILABLE', notes: '', availableDate: ''
}

export default function Trucks({ userId }) {
  const [trucks, setTrucks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_TRUCK)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getTrucks(userId).then(t => { setTrucks(t); setLoading(false) }).catch(() => setLoading(false))
  }, [userId])

  const openAdd = () => { setForm(EMPTY_TRUCK); setEditing(null); setShowModal(true) }
  const openEdit = (t) => { setForm({ ...t, availableDate: '' }); setEditing(t.truckId); setShowModal(true) }

  const save = async () => {
    try {
      if (editing) {
        const updated = await api.updateTruck(userId, editing, form)
        setTrucks(ts => ts.map(t => t.truckId === editing ? updated : t))
        setMsg('✅ Truck updated')
      } else {
        const added = await api.addTruck(userId, form)
        setTrucks(ts => [...ts, added])
        setMsg('✅ Truck added')
      }
      setShowModal(false)
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      setMsg('❌ Error: ' + e.message)
    }
  }

  const remove = async (truckId) => {
    if (!confirm('Remove this truck?')) return
    await api.deleteTruck(userId, truckId)
    setTrucks(ts => ts.filter(t => t.truckId !== truckId))
    setMsg('Truck removed')
    setTimeout(() => setMsg(''), 3000)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return <div className="loading">Loading trucks...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">🚚 My Trucks</div>
          <div className="page-sub">Track your fleet locations — automatically included in broker availability blasts</div>
        </div>
        <button className="btn-accent" onClick={openAdd}>+ Add Truck</button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      {trucks.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🚚</div>
            <div className="empty-text">No trucks added yet</div>
            <div className="empty-sub">Add your trucks so brokers know exactly where your capacity is located.</div>
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>Add Your First Truck</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Truck #</th><th>Driver</th><th>Location</th>
                  <th>Equipment</th><th>Status</th><th>Available</th><th>Notes</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trucks.map(t => (
                  <tr key={t.truckId}>
                    <td><strong>{t.truckNumber}</strong></td>
                    <td>{t.driverName || '—'}</td>
                    <td><strong>{t.currentCity}</strong>, {t.currentState}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{fmtEquip(t.equipmentType)}</span></td>
                    <td>
                      <span className={'badge ' + (t.status === 'AVAILABLE' ? 'badge-green' : t.status === 'IN_TRANSIT' ? 'badge-amber' : 'badge-red')}>
                        {t.status}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {t.availableDate ? new Date(t.availableDate).toLocaleDateString() : 'Now'}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>{t.notes || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>
                        <button className="btn-danger btn-sm" onClick={() => remove(t.truckId)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? 'Edit Truck' : 'Add Truck'}</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Truck Number / Name</label>
                <input value={form.truckNumber} onChange={e => set('truckNumber', e.target.value)} placeholder="Truck #1" />
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input value={form.driverName} onChange={e => set('driverName', e.target.value)} placeholder="John Doe" />
              </div>
              <div className="form-group">
                <label>Current City</label>
                <input value={form.currentCity} onChange={e => set('currentCity', e.target.value)} placeholder="Wilmington" />
              </div>
              <div className="form-group">
                <label>Current State</label>
                <input value={form.currentState} onChange={e => set('currentState', e.target.value)} placeholder="DE" maxLength="2" />
              </div>
              <div className="form-group">
                <label>Equipment Type</label>
                <select value={form.equipmentType} onChange={e => set('equipmentType', e.target.value)}>
                  <option value="BOX_TRUCK_26">26' Box Truck</option>
                  <option value="DRY_VAN">Dry Van</option>
                  <option value="REEFER">Refrigerated (Reefer)</option>
                  <option value="FLATBED">Flatbed</option>
                  <option value="STEP_DECK">Step Deck</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="OUT_OF_SERVICE">Out of Service</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes about this truck..." />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>{editing ? 'Update' : 'Add Truck'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmtEquip(t) {
  const map = { BOX_TRUCK_26: "26' Box", DRY_VAN: 'Dry Van', REEFER: 'Reefer', FLATBED: 'Flatbed', STEP_DECK: 'Step Deck' }
  return map[t] || t || '—'
}
