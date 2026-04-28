// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MainAppRouter from './MainAppRouter.tsx'
import PageProvider from './contexts/PageContext'
import ThemeProvider from './contexts/ThemeContext'
import AuthProvider from './contexts/AuthContext.tsx'
import './index.css'
import './MainAppRouter.css';
import './App.css';
import NotificationManagerProvider from './components/NotificationManager.tsx'

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <NotificationManagerProvider>
      <AuthProvider>
        <PageProvider>
          <ThemeProvider>
            <MainAppRouter />
          </ThemeProvider>
        </PageProvider>
      </AuthProvider>
    </NotificationManagerProvider>
  // </StrictMode>,
)