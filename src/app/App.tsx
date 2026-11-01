import { AppShell } from '@/components/layout/AppShell'
import { AppRouter } from '@/app/router'
import { useAppData } from '@/app/useAppData'
import '@/App.css'

export default function App() {
  const data = useAppData()

  return (
    <AppShell user={data.user} onLogout={data.logout}>
      <AppRouter data={data} />
    </AppShell>
  )
}
