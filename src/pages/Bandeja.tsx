import { useState, useRef } from 'react'
import type { Tarea } from '../types'
import { useTareas } from '../context/TareasContext'
import EtiquetaCategoria from '../components/EtiquetaCategoria'

function formatFechaHora(fecha?: string, hora?: string): string {
  if (!fecha) return ''
  const [year, month, day] = fecha.split('-')
  const dateStr = `${day}/${month}/${year}`
  return hora ? `${dateStr} ${hora}` : dateStr
}

function todayYMD(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function TareaItem({
  tarea,
  onEdit,
  onToggle,
  onDelete,
}: {
  tarea: Tarea
  onEdit: (t: Tarea) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const [swiped, setSwiped] = useState(false)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    if (dx > 60) setSwiped(true)
    else setSwiped(false)
    touchStartX.current = null
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-2"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 bg-red-500 rounded-xl">
        <button
          onClick={() => onDelete(tarea.id)}
          className="text-white text-sm font-medium px-2"
          aria-label="Eliminar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      {/* Main card */}
      <div
        className={`flex items-center gap-3 bg-white px-4 py-3 shadow-sm border border-gray-100 rounded-xl transition-transform duration-200 ${swiped ? '-translate-x-16' : 'translate-x-0'}`}
      >
        <button
          onClick={() => onToggle(tarea.id)}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
          style={{ borderColor: tarea.completada ? '#6366f1' : '#d1d5db', backgroundColor: tarea.completada ? '#6366f1' : 'white' }}
          aria-label={tarea.completada ? 'Marcar incompleta' : 'Marcar completa'}
        >
          {tarea.completada && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => !tarea.completada && onEdit(tarea)}
        >
          <div className={`flex items-center gap-1.5 text-sm font-medium ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            <span className="truncate">{tarea.nombre}</span>
            {tarea.recurrenciaId && !tarea.completada && (
              <svg className="flex-shrink-0 text-indigo-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {tarea.categoria && !tarea.completada && (
              <EtiquetaCategoria categoria={tarea.categoria} />
            )}
            {tarea.fecha && !tarea.completada && (
              <span className="text-xs text-gray-400">{formatFechaHora(tarea.fecha, tarea.hora)}</span>
            )}
          </div>
        </button>

        {!tarea.completada && (
          <button
            onClick={() => onEdit(tarea)}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 p-1"
            aria-label="Editar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function Bandeja({ onOpenModal }: { onOpenModal: (t?: Tarea) => void }) {
  const { tareas, loading, toggleCompletada, eliminarTarea } = useTareas()
  const [showCompletadas, setShowCompletadas] = useState(false)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // En la bandeja, las instancias recurrentes solo se muestran las de hoy
  // (las futuras viven en IndexedDB y aparecen en el calendario).
  const hoy = todayYMD()
  const visibles = tareas.filter((t) => !t.recurrenciaId || t.fecha === hoy)

  // Sort: incomplete first (by fecha asc, then sueltas), then completed
  const incompletas = visibles
    .filter((t) => !t.completada)
    .sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha)
      if (a.fecha) return -1
      if (b.fecha) return 1
      return a.creadaEn.localeCompare(b.creadaEn)
    })

  const completadas = visibles.filter((t) => t.completada)

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Mis tareas</h1>

      {incompletas.length === 0 && completadas.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No hay tareas todavía.</p>
          <p className="text-gray-400 text-xs mt-1">Toca el botón + para agregar una.</p>
        </div>
      )}

      {incompletas.map((t) => (
        <TareaItem
          key={t.id}
          tarea={t}
          onEdit={onOpenModal}
          onToggle={toggleCompletada}
          onDelete={eliminarTarea}
        />
      ))}

      {completadas.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowCompletadas((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 mb-2 select-none"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showCompletadas ? 'rotate-90' : ''}`}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            Completadas ({completadas.length})
          </button>

          {showCompletadas && completadas.map((t) => (
            <TareaItem
              key={t.id}
              tarea={t}
              onEdit={onOpenModal}
              onToggle={toggleCompletada}
              onDelete={eliminarTarea}
            />
          ))}
        </div>
      )}
    </div>
  )
}
