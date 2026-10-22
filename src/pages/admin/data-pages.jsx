import { Banner } from '../../components/layout/AppShell'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmAction } from '../../components/ui/ConfirmAction'
import { useState } from 'react'

function formatColumnLabel(column) {
  return column.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function GenericAdminList({ title, breadcrumb, rows, columns }) {
  return (
    <main className="admin-main">
      <Banner title={title} breadcrumb={breadcrumb} />
      <section className="content-section">
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead><tr>{columns.map((col) => <th key={col}>{formatColumnLabel(col)}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => <td key={col}>{String(row[col] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table></div> : <EmptyState title="Nothing to show yet" description="Records will appear here when they’re available." />}
      </section>
    </main>
  )
}

export function AdminServices({ api, rows, refresh }) {
  const initialForm = { name: '', service_type: 'cottage', description: '', price: '', capacity: '' }
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
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
      await api(editingId ? `/admin/services/${editingId}` : '/admin/services', {
        method: editingId ? 'PUT' : 'POST',
        body: form,
      })
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
    await api(`/admin/services/${service.id}`, {
      method: 'PUT',
      body: { is_active: Number(service.is_active) === 1 ? 0 : 1 },
    })
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
            <thead><tr><th>Service</th><th>Type</th><th>Price</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((service) => (
              <tr key={service.id}>
                <td>{service.name}</td><td>{formatColumnLabel(service.service_type)}</td><td>₱{Number(service.price).toFixed(2)}</td><td>{service.capacity}</td>
                <td><span className={`status ${Number(service.is_active) === 1 ? 'status-active' : 'status-inactive'}`}>{Number(service.is_active) === 1 ? 'Active' : 'Inactive'}</span></td>
                <td className="table-actions">
                  <button type="button" onClick={() => edit(service)}>Edit</button>
                  {Number(service.is_active) === 1 ? (
                    <ConfirmAction title="Deactivate this service?" description={`${service.name} will stop appearing in guest service listings. Existing bookings are unchanged.`} confirmLabel="Deactivate" danger onConfirm={() => setActive(service)}>Deactivate</ConfirmAction>
                  ) : <ConfirmAction title="Activate this service?" description={`${service.name} will be visible to guests again.`} confirmLabel="Activate service" onConfirm={() => setActive(service)}>Activate</ConfirmAction>}
                </td>
              </tr>
            ))}</tbody>
          </table></div> : <EmptyState title="No services listed" description="Add your first resort service using the form above." />}
        </div>
      </section>
    </main>
  )
}

export function AdminGuests({ api, rows, refresh }) {
  const toggleStatus = async (guest) => {
    await api(`/admin/guests/${guest.id}/status`, {
      method: 'PUT',
      body: { is_active: Number(guest.is_active) === 1 ? 0 : 1 },
    })
    await refresh()
  }

  return (
    <main className="admin-main">
      <Banner title="Guest Management" breadcrumb="Admin / Guests" />
      <section className="content-section admin-content">
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead><tr><th>Guest</th><th>Email</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{rows.map((guest) => (
            <tr key={guest.id}>
              <td>{guest.username}</td><td>{guest.email}</td><td>{guest.created_at}</td>
              <td><span className={`status ${Number(guest.is_active) === 1 ? 'status-active' : 'status-inactive'}`}>{Number(guest.is_active) === 1 ? 'Active' : 'Inactive'}</span></td>
              <td>{Number(guest.is_active) === 1 ? (
                <ConfirmAction title="Deactivate this guest?" description={`${guest.username} will no longer be able to sign in.`} confirmLabel="Deactivate guest" danger onConfirm={() => toggleStatus(guest)}>Deactivate</ConfirmAction>
              ) : <ConfirmAction title="Reactivate this guest?" description={`${guest.username} will be able to sign in again.`} confirmLabel="Reactivate guest" onConfirm={() => toggleStatus(guest)}>Reactivate</ConfirmAction>}</td>
            </tr>
          ))}</tbody>
        </table></div> : <EmptyState title="No guest accounts yet" description="Guest accounts will appear here after registration." />}
      </section>
    </main>
  )
}

export function AdminSettingsPage({ api, settings, onSettingsChange }) {
  const drafts = (settings.system_settings || []).map(({ setting_key, setting_value }) => ({
    key: setting_key,
    value: setting_value || '',
  }))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const updateDraft = (index, field, value) => {
    const next = drafts.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    ))
    onSettingsChange({
      ...settings,
      system_settings: next.map(({ key, value: settingValue }) => ({
        setting_key: key,
        setting_value: settingValue,
      })),
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const keys = drafts.map((row) => row.key.trim())
    const invalid = keys.some((key) => !key) || new Set(keys).size !== keys.length
    if (invalid) {
      setError('Setting keys must be non-empty and unique.')
      return
    }

    setBusy(true)
    try {
      await api('/admin/settings', {
        method: 'PUT',
        body: { system_settings: Object.fromEntries(drafts.map(({ key, value }) => [key.trim(), value])) },
      })
      setNotice('Settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const exportBackup = async () => {
    setError('')
    try {
      const backup = await api('/admin/backup/export')
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `esped-backup-${Date.now()}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="admin-main">
      <Banner title="System Settings" breadcrumb="Admin / Settings" />
      <section className="content-section admin-content">
        <div className="admin-panel">
          <div className="panel-heading"><p className="section-kicker">Resort configuration</p><h2>Application settings</h2></div>
          <form className="settings-form" onSubmit={save}>
            {drafts.length ? drafts.map((row, index) => (
              <div className="settings-row" key={`${row.key}-${index}`}>
                <label>Setting key<input value={row.key} onChange={(e) => updateDraft(index, 'key', e.target.value)} required /></label>
                <label>Value<input value={row.value} onChange={(e) => updateDraft(index, 'value', e.target.value)} /></label>
                <ConfirmAction
                  title="Remove this setting?"
                  description="The setting will be removed from this form; save to apply the change."
                  confirmLabel="Remove setting"
                  danger
                  onConfirm={() => onSettingsChange({
                    ...settings,
                    system_settings: drafts.filter((_, rowIndex) => rowIndex !== index).map(({ key, value }) => ({
                      setting_key: key,
                      setting_value: value,
                    })),
                  })}
                >Remove</ConfirmAction>
              </div>
            )) : <EmptyState title="No custom settings" description="Add key-value settings used by your resort application." />}
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => onSettingsChange({
                ...settings,
                system_settings: [...drafts, { key: '', value: '' }].map(({ key, value }) => ({
                  setting_key: key,
                  setting_value: value,
                })),
              })}>Add setting</button>
              <button type="submit" className="button" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
            </div>
          </form>
          {notice && <p className="ok-text" role="status">{notice}</p>}
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>
        <div className="admin-panel backup-panel">
          <div className="panel-heading"><p className="section-kicker">Data protection</p><h2>Database backup</h2></div>
          <p className="form-note">Download a JSON snapshot of the resort’s application data.</p>
          <button className="button" type="button" onClick={exportBackup}>Export database backup</button>
        </div>
      </section>
    </main>
  )
}
