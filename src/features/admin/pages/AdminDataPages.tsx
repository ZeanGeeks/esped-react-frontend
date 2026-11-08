export { GenericAdminList } from './GenericAdminList'
export { AdminReportsPage } from './AdminReportsPage'
export { AdminServiceAvailabilityPage } from './AdminServiceAvailabilityPage'
export { AdminServices } from './AdminServicesPage'
export { AdminGuests } from './AdminGuestsPage'
export { AdminSettingsPage } from './AdminSettingsPage'

import { AdminGuests } from './AdminGuestsPage'
import { AdminReportsPage } from './AdminReportsPage'
import { AdminServiceAvailabilityPage } from './AdminServiceAvailabilityPage'
import { AdminServices } from './AdminServicesPage'
import { AdminSettingsPage } from './AdminSettingsPage'
import { GenericAdminList } from './GenericAdminList'

type AdminDataPagesProps =
  | {
      page: 'list'
      title: string
      breadcrumb: string
      rows: Record<string, unknown>[]
      columns: string[]
      loading?: boolean
      error?: string
    }
  | { page: 'reports' }
  | {
      page: 'services' | 'guests'
      rows: Record<string, unknown>[]
      refresh: () => Promise<unknown>
      loading?: boolean
      error?: string
    }
  | {
      page: 'service-availability'
      services: { id: number; name: string; capacity: number | string }[]
      loading: boolean
      error: string
    }
  | {
      page: 'settings'
      settings: Record<string, unknown>
      onSettingsChange: (settings: Record<string, unknown>) => void
      loading?: boolean
      dataError?: string
    }

export function AdminDataPages(props: AdminDataPagesProps) {
  switch (props.page) {
    case 'list':
      return (
        <GenericAdminList
          title={props.title}
          breadcrumb={props.breadcrumb}
          rows={props.rows}
          columns={props.columns}
          loading={props.loading}
          error={props.error}
        />
      )
    case 'reports':
      return <AdminReportsPage />
    case 'services':
      return <AdminServices rows={props.rows} refresh={props.refresh} loading={props.loading} error={props.error} />
    case 'service-availability':
      return (
        <AdminServiceAvailabilityPage
          services={props.services}
          servicesLoading={props.loading}
          servicesError={props.error}
        />
      )
    case 'guests':
      return <AdminGuests rows={props.rows} refresh={props.refresh} loading={props.loading} error={props.error} />
    case 'settings':
      return (
        <AdminSettingsPage
          settings={props.settings}
          onSettingsChange={props.onSettingsChange}
          loading={props.loading}
          dataError={props.dataError}
        />
      )
    default:
      return <p className="error-text" role="alert">The requested admin page is not available.</p>
  }
}
