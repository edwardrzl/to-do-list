import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { requestPersistentStorage } from './db'

// Marca el almacenamiento como persistente para que los datos no se borren
// por presión de espacio ni al actualizar la app.
requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
