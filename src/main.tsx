import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { BitacoraProvider } from './datos/store.tsx'

// Service worker: deja la app disponible sin señal y se actualiza sola cuando
// hay una versión nueva y conexión.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BitacoraProvider>
      <App />
    </BitacoraProvider>
  </StrictMode>,
)
