import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { AppProviders } from './app/providers'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('The root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
