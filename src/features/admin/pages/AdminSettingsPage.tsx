import { useState } from 'react'
import { Banner } from '@/components/layout/AppShell'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAdminApi } from '../hooks/useAdminApi'

export function AdminSettingsPage({ settings, onSettingsChange, loading = false, dataError = '' }) {
  const adminApi = useAdminApi()
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
      await adminApi.saveSettings({ system_settings: Object.fromEntries(drafts.map(({ key, value }) => [key.trim(), value])) })
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
      const backup = await adminApi.exportBackup()
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
            )) : !loading && !dataError ? <EmptyState title="No custom settings" description="Add key-value settings used by your resort application." /> : null}
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
