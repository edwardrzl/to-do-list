import { useRef, useState } from 'react'
import type { Tarea, EstadoTarea, Recurrencia } from '../types'
import { KANBAN_COLUMNAS } from '../types'
import { useTareas } from '../context/TareasContext'
import EtiquetaCategoria from '../components/EtiquetaCategoria'
import IndicadorTarea from '../components/IndicadorTarea'
import { getMonday, addDays, toYMD } from '../lib/tareas'

function formatFecha(fecha?: string, hora?: string): string {
  if (!fecha) return ''
  const [year, month, day] = fecha.split('-')
  const dateStr = `${day}/${month}/${year}`
  return hora ? `${dateStr} ${hora}` : dateStr
}

const ORDEN = KANBAN_COLUMNAS.map((c) => c.estado)

interface CardProps {
  tarea: Tarea
  recurrencias: Recurrencia[]
  onEdit: (t: Tarea) => void
  onMover: (id: string, estado: EstadoTarea) => void
  onInconcluso: (id: string) => void
}

function KanbanCard({ tarea, recurrencias, onEdit, onMover, onInconcluso }: CardProps) {
  const idx = ORDEN.indexOf(tarea.estado)
  const anterior = idx > 0 ? ORDEN[idx - 1] : null
  const siguiente = idx < ORDEN.length - 1 ? ORDEN[idx + 1] : null

  return (
    <div
      onClick={() => onEdit(tarea)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <p className={`flex items-center gap-1.5 text-sm font-medium break-words ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-800'}`}>
        <IndicadorTarea tarea={tarea} recurrencias={recurrencias} />
        <span className="min-w-0 break-words">{tarea.nombre}</span>
      </p>

      {(tarea.categoria || tarea.fecha) && (
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {tarea.categoria && <EtiquetaCategoria categoria={tarea.categoria} />}
          {tarea.fecha && (
            <span className="text-xs text-gray-400">{formatFecha(tarea.fecha, tarea.hora)}</span>
          )}
        </div>
      )}

      {/* Mover entre columnas + marcar inconclusa */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
        <button
          onClick={(e) => { e.stopPropagation(); if (anterior) onMover(tarea.id, anterior) }}
          disabled={!anterior}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 enabled:hover:bg-gray-100 disabled:opacity-25 transition-colors"
          aria-label="Mover a la columna anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onInconcluso(tarea.id) }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors"
          aria-label="Marcar inconclusa"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (siguiente) onMover(tarea.id, siguiente) }}
          disabled={!siguiente}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 enabled:hover:bg-gray-100 disabled:opacity-25 transition-colors"
          aria-label="Mover a la columna siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Kanban({ onEdit }: { onEdit: (t: Tarea) => void }) {
  const { tareas, recurrencias, loading, moverEstado, marcarInconcluso } = useTareas()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activa, setActiva] = useState(0)

  // Resalta el punto indicador según la columna centrada en el scroll.
  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / (el.clientWidth * 0.8))
    setActiva(Math.max(0, Math.min(KANBAN_COLUMNAS.length - 1, i)))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Filtro temporal: solo tareas sin fecha o con fecha dentro de la semana
  // actual (lunes a domingo). Se excluyen archivadas e inconclusas.
  const lunes = getMonday(new Date())
  const lo = toYMD(lunes)
  const hi = toYMD(addDays(lunes, 6))
  const visibles = tareas.filter(
    (t) =>
      !t.archivada &&
      t.estado !== 'inconcluso' &&
      (!t.fecha || (t.fecha >= lo && t.fecha <= hi))
  )

  const porColumna = KANBAN_COLUMNAS.map((c) =>
    visibles
      .filter((t) => t.estado === c.estado)
      .sort((a, b) => {
        if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha)
        if (a.fecha) return -1
        if (b.fecha) return 1
        return a.creadaEn.localeCompare(b.creadaEn)
      })
  )

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h1 className="text-xl font-bold text-gray-900 px-4 pt-4 pb-3">Tablero</h1>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 flex gap-3 px-4 overflow-x-auto md:grid md:grid-cols-3 md:overflow-x-visible snap-x snap-mandatory scroll-px-4"
      >
        {KANBAN_COLUMNAS.map((col, i) => {
          const items = porColumna[i]
          return (
            <section
              key={col.estado}
              className={`snap-center shrink-0 w-[80vw] md:w-full flex flex-col rounded-2xl ${col.col} p-2.5`}
            >
              <header className={`flex items-center gap-1.5 px-1.5 pb-2 text-sm font-semibold ${col.header}`}>
                <span>{col.titulo}</span>
                <span className="opacity-60 font-medium">· {items.length}</span>
              </header>

              <div className="flex-1 overflow-y-auto space-y-2 pb-24 pr-0.5">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-1.5 pt-1">Sin tareas</p>
                ) : (
                  items.map((t) => (
                    <KanbanCard
                      key={t.id}
                      tarea={t}
                      recurrencias={recurrencias}
                      onEdit={onEdit}
                      onMover={moverEstado}
                      onInconcluso={marcarInconcluso}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* Indicador de scroll horizontal (solo móvil) */}
      <div className="flex justify-center gap-1.5 py-2 md:hidden">
        {KANBAN_COLUMNAS.map((c, i) => (
          <span
            key={c.estado}
            className={`h-1.5 rounded-full transition-all ${i === activa ? 'w-4 bg-indigo-400' : 'w-1.5 bg-gray-300'}`}
          />
        ))}
      </div>
    </div>
  )
}
