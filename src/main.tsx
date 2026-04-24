import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useCanvasStore } from './store/canvas'
import './styles/tokens.css'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('OpenSeaBri: #root element not found in index.html')
}

if (import.meta.env.DEV) {
  ;(window as unknown as { __canvasStore: typeof useCanvasStore }).__canvasStore = useCanvasStore
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
