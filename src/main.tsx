import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import { SettingsProvider } from './lib/settings.ts'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ThemeProvider defaultTheme="system" storageKey="url-scanner-theme" attribute="class">
        <App />
      </ThemeProvider>
    </SettingsProvider>
  </StrictMode>,
)