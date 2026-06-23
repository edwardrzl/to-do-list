import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { TareasProvider } from './context/TareasContext'
import Bandeja from './pages/Bandeja'
import Kanban from './pages/Kanban'
import Calendario from './pages/Calendario'
import BottomNav from './components/BottomNav'
import TaskModal from './components/TaskModal'
import type { Tarea } from './types'

function AppShell() {
  const [modalOpen, setModalOpen] = useState(false)
  const [tareaEditar, setTareaEditar] = useState<Tarea | null>(null)

  function openModal(tarea?: Tarea) {
    setTareaEditar(tarea ?? null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setTareaEditar(null)
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50 relative">
      <Routes>
        <Route path="/" element={<Bandeja onOpenModal={openModal} />} />
        <Route path="/kanban" element={<Kanban onEdit={openModal} />} />
        <Route path="/calendario" element={<Calendario onEdit={openModal} />} />
      </Routes>

      <BottomNav />

      <button
        onClick={() => openModal()}
        className="fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-600 active:bg-indigo-700 active:scale-95 transition-all"
        aria-label="Nueva tarea"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {modalOpen && (
        <TaskModal tarea={tareaEditar} onClose={closeModal} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <TareasProvider>
      <AppShell />
    </TareasProvider>
  )
}
