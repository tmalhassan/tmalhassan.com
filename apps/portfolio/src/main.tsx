// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ThemeProvider from './contexts/theme-context/ThemeProvider.tsx'
import DeviceProvider from './contexts/device-context/DeviceProvider.tsx'
import NotificationManagerProvider from './contexts/notifications-context/NotificationsManagerProvider.tsx'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <NotificationManagerProvider>
    <DeviceProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </DeviceProvider>
  </NotificationManagerProvider>
  // </StrictMode>,
)
