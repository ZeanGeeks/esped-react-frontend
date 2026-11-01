import { Banner } from '@/components/layout/AppShell'
import { EmptyState } from '@/components/ui/EmptyState'

function formatColumnLabel(column) {
  return column.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function GenericAdminList({ title, breadcrumb, rows, columns, loading = false, error = '' }) {
  return (
    <main className="admin-main">
      <Banner title={title} breadcrumb={breadcrumb} />
      <section className="content-section">
        {rows.length ? <div className="table-wrap"><table className="table">
          <thead><tr>{columns.map((col) => <th key={col}>{formatColumnLabel(col)}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx}>
                {columns.map((col) => <td key={col}>{String(row[col] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table></div> : !loading && !error ? <EmptyState title="Nothing to show yet" description="Records will appear here when they’re available." /> : null}
      </section>
    </main>
  )
}


