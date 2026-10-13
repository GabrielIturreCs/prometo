import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Let the splash finish its little "plant the flag" moment, then fade it out.
const splash = document.getElementById('splash')
if (splash) {
  setTimeout(() => {
    splash.classList.add('out')
    setTimeout(() => splash.remove(), 400)
  }, 900)
}
