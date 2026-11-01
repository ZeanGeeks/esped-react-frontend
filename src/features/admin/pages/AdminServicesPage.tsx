import { useState } from 'react'
import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { useAdminApi } from '../hooks/useAdminApi'

type Service = {
  id: number
  name: string
  service_type: string
  description?: string
  price: number | string
  capacity: number | string
  is_active: number | string
}

type AvailabilityRow = {
  id: number
  available_date: string
  total_quantity: number | string
  booked_quantity: number | string
}

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
  const [availabilityService, setAvailabilityService] = useState<Service | null>(null)
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([])
  const [availabilityForm, setAvailabilityForm] = useState({ start_date: '', end_date: '', total_quantity: '1' })
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityBusy, setAvailabilityBusy] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')

  const loadAvailability = async (service) => {
    setAvailabilityService(service)
    setAvailabilityRows([])
    setAvailabilityError('')
    setAvailabilityLoading(true)
    try {
      const result = await adminApi.getServiceAvailability(service.id)
      setAvailabilityRows(result.availability || [])
    } catch (err) {
      setAvailabilityError(err.message)
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const toggleAvailability = async (service) => {
    if (availabilityService?.id === service.id) {
      setAvailabilityService(null)
      setAvailabilityRows([])
      setAvailabilityError('')
      return
    }
    await loadAvailability(service)
  }

  const saveAvailability = async (event) => {
    event.preventDefault()
    if (!availabilityService) return

    setAvailabilityError('')
    if (!availabilityForm.start_date || !availabilityForm.end_date || availabilityForm.end_date < availabilityForm.start_date) {
      setAvailabilityError('Choose a valid start and end date.')
      return
    }

    const rangeDays = (Date.parse(`${availabilityForm.end_date}T00:00:00`) - Date.parse(`${availabilityForm.start_date}T00:00:00`)) / 86400000
    if (rangeDays > 365) {
      setAvailabilityError('A date range can cover up to 366 days.')
      return
    }

    setAvailabilityBusy(true)
    try {
      await adminApi.saveServiceAvailability(availabilityService.id, availabilityForm)
      await loadAvailability(availabilityService)
      setAvailabilityForm({ start_date: '', end_date: '', total_quantity: '1' })
      setNotice(`Availability saved for ${availabilityService.name} from ${availabilityForm.start_date} to ${availabilityForm.end_date}.`)
    } catch (err) {
      setAvailabilityError(err.message)
    } finally {
      setAvailabilityBusy(false)
    }
  }

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
                  <button
                    type="button"
                    aria-expanded={availabilityService?.id === service.id}
                    onClick={() => toggleAvailability(service)}
                  >
                    {availabilityService?.id === service.id ? 'Hide dates' : 'Manage dates'}
                  </button>
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
          {availabilityService && (
            <section className="service-availability" aria-labelledby="availability-heading">
              <div className="panel-heading">
                <p className="section-kicker">Booking calendar</p>
                <h3 id="availability-heading">Availability for {availabilityService.name}</h3>
                <p className="form-note">The date range is inclusive. Set how many bookings this service can take each day; fully booked dates cannot be selected. Ranges can cover up to 366 days.</p>
              </div>
              <form className="availability-editor" onSubmit={saveAvailability}>
                <label>Start date<input
                  type="date"
                  value={availabilityForm.start_date}
                  onChange={(event) => setAvailabilityForm({ ...availabilityForm, start_date: event.target.value })}
                  required
                /></label>
                <label>End date<input
                  type="date"
                  min={availabilityForm.start_date}
                  value={availabilityForm.end_date}
                  onChange={(event) => setAvailabilityForm({ ...availabilityForm, end_date: event.target.value })}
                  required
                /></label>
                <label>Available quantity<input
                  type="number"
                  min="0"
                  step="1"
                  value={availabilityForm.total_quantity}
                  onChange={(event) => setAvailabilityForm({ ...availabilityForm, total_quantity: event.target.value })}
                  required
                /></label>
                <button className="button" type="submit" disabled={availabilityBusy}>
                  {availabilityBusy ? 'Saving…' : 'Save date range'}
                </button>
              </form>
              {availabilityError && (
                <p className="error-text" role="alert">
                  {availabilityError}{' '}
                  <button className="inline-retry-button" type="button" onClick={() => loadAvailability(availabilityService)}>Retry loading dates</button>
                </p>
              )}
              {availabilityLoading ? <p className="form-note">Loading dates…</p> : availabilityRows.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Available quantity</th><th>Booked</th><th>State</th></tr></thead>
                    <tbody>{availabilityRows.map((row) => {
                      const remaining = Math.max(0, Number(row.total_quantity) - Number(row.booked_quantity))
                      return (
                        <tr key={row.id}>
                          <td>{row.available_date}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.booked_quantity}</td>
                          <td>{remaining > 0 ? `${remaining} remaining` : 'Fully booked'}</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              ) : !availabilityError ? <p className="form-note">No dates configured for this service yet.</p> : null}
            </section>
          )}
        </div>
      </section>
    </main>
  )
}
