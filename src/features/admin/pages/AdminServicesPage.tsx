import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { useAdminApi } from '../hooks/useAdminApi'

function formatColumnLabel(column) {
  return column.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function AdminServices({ rows, refresh, loading = false, error: dataError = '' }) {
  const adminApi = useAdminApi()
  const initialForm = { name: '', service_type: 'cottage', description: '', price: '', capacity: '' }
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (Number(form.price) <= 0 || Number(form.capacity) < 1) {
      setError('Enter a price greater than zero and a capacity of at least one.')
      return
    }
    setBusy(true)
    try {
      await adminApi.saveService(editingId, form)
      setForm(initialForm)
      setEditingId(null)
      await refresh()
      setNotice('Service saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const edit = (service) => {
    setEditingId(service.id)
    setForm({
      name: service.name,
      service_type: service.service_type,
      description: service.description || '',
      price: service.price,
      capacity: service.capacity,
    })
  }

  const setActive = async (service) => {
    setError('')
    setNotice('')
    await adminApi.updateServiceStatus(service.id, Number(service.is_active) === 1 ? 0 : 1)
    await refresh()
    setNotice(`Service ${Number(service.is_active) === 1 ? 'deactivated' : 'activated'}.`)
  }

  return (
    <main className="admin-main">
      <Banner title="Services Management" breadcrumb="Admin / Services" />
      <section className="content-section admin-content">
        <div className="admin-panel">
          <div className="panel-heading">
            <p className="section-kicker">{editingId ? 'Update listing' : 'Add a listing'}</p>
            <h2>{editingId ? 'Edit service' : 'Create a service'}</h2>
          </div>
          <form className="service-editor" onSubmit={save}>
            <label>Service name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Type<select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
              <option value="cottage">Cottage</option><option value="room">Room</option><option value="amenity">Amenity</option><option value="package">Package</option>
            </select></label>
            <label>Price<input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
            <label>Capacity<input type="number" min="1" step="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></label>
            <label className="field-wide">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <div className="field-wide form-actions">
              <button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add service'}</button>
              {editingId && (
                <ConfirmAction
                  title="Discard service changes?"
                  description="Your unsaved changes to this service will be lost."
                  confirmLabel="Discard changes"
                  danger
                  onConfirm={() => { setEditingId(null); setForm(initialForm) }}
                >Cancel edit</ConfirmAction>
              )}
            </div>
          </form>
          {error && <p className="error-text" role="alert">{error}</p>}
          {notice && <p className="ok-text" role="status">{notice}</p>}
        </div>
        <div className="admin-panel">
          <div className="panel-heading"><p className="section-kicker">Current listings</p><h2>Resort services</h2></div>
          {rows.length ? <div className="table-wrap"><table className="table">
            <thead><tr><th>Service</th><th>Type</th><th>Price</th><th>Capacity</th><th>Status</th><th>Availability</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td><td>{formatColumnLabel(service.service_type)}</td><td>₱{Number(service.price).toFixed(2)}</td><td>{service.capacity}</td>
                <td><span className={`status ${Number(service.is_active) === 1 ? 'status-active' : 'status-inactive'}`}>{Number(service.is_active) === 1 ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <Link className="service-availability-link" to={`/admin/services/${service.id}/availability`}>
                    Manage dates
                  </Link>
                </td>
                <td className="table-actions">
                  <button type="button" onClick={() => edit(service)}>Edit</button>
                  {Number(service.is_active) === 1 ? (
                    <ConfirmAction title="Deactivate this service?" description={`${service.name} will stop appearing in guest service listings. Existing bookings are unchanged.`} confirmLabel="Deactivate" danger onConfirm={() => setActive(service)}>Deactivate</ConfirmAction>
                  ) : <ConfirmAction title="Activate this service?" description={`${service.name} will be visible to guests again.`} confirmLabel="Activate service" onConfirm={() => setActive(service)}>Activate</ConfirmAction>}
                </td>
              </tr>
            ))}</tbody>
          </table></div> : !loading && !dataError ? <EmptyState title="No services listed" description="Add your first resort service using the form above." /> : null}
        </div>
      </section>
    </main>
  )
}
