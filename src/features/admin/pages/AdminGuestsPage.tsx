import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmAction } from '@/components/ui/ConfirmAction'
import { useAdminApi } from '../hooks/useAdminApi'

export function AdminGuests({ rows, refresh, loading = false, error = '' }) {
  const adminApi = useAdminApi()
  const toggleStatus = async (guest) => {
    await adminApi.updateGuestStatus(guest.id, Number(guest.is_active) === 1 ? 0 : 1)
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
        </table></div> : !loading && !error ? <EmptyState title="No guest accounts yet" description="Guest accounts will appear here after registration." /> : null}
      </section>
    </main>
  )
}

