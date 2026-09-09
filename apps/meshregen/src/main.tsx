import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import NotificationManagerProvider from './contexts/notifications-context/NotificationsManagerProvider.tsx'
import DeviceProvider from './contexts/device-context/DeviceProvider.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  //   <App />
  // </StrictMode>,
  <NotificationManagerProvider>
    <DeviceProvider>
      <App />
    </DeviceProvider>
  </NotificationManagerProvider>
)
