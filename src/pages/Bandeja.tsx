import { useState, useRef } from 'react'
import type { Tarea, Recurrencia, Categoria } from '../types'
import { CATEGORIAS, CATEGORIA_COLORES } from '../types'
import { useTareas } from '../context/TareasContext'
import EtiquetaCategoria from '../components/EtiquetaCategoria'
import IndicadorTarea from '../components/IndicadorTarea'
import ArchivoModal from '../components/ArchivoModal'
import ConfirmInconclusoModal from '../components/ConfirmInconclusoModal'

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

// Priorización por categoría (solo Bandeja): reordenamiento estable POR ENCIMA
// del orden base. Sube al tope las tareas de la categoría elegida y deja el
// resto debajo, conservando el orden relativo de cada grupo. No filtra nada.
// `null` (= "Todas") devuelve la lista sin tocar.
function priorizarPorCategoria(tareas: Tarea[], cat: Categoria | null): Tarea[] {
  if (!cat) return tareas
  return [
    ...tareas.filter((t) => t.categoria === cat),
    ...tareas.filter((t) => t.categoria !== cat),
  ]
}

function TareaItem({
  tarea,
  recurrencias,
  onEdit,
  onToggle,
  onRevertir,
  onInconcluso,
  onDelete,
}: {
  tarea: Tarea
  recurrencias: Recurrencia[]
  onEdit: (t: Tarea) => void
  onToggle: (id: string) => void
  onRevertir: (id: string) => void
  onInconcluso: (t: Tarea) => void
  onDelete: (id: string) => void
}) {
  const touchStartX = useRef<number | null>(null)
  const [swiped, setSwiped] = useState(false)

  const terminal = tarea.estado === 'done' || tarea.estado === 'inconcluso'
  const inconclusa = tarea.estado === 'inconcluso'

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
        {/* Indicador de estado: activo → completar; terminal → revertir a todo */}
        <button
          onClick={() => (terminal ? onRevertir(tarea.id) : onToggle(tarea.id))}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: tarea.completada ? '#6366f1' : inconclusa ? '#9ca3af' : '#d1d5db',
            backgroundColor: tarea.completada ? '#6366f1' : inconclusa ? '#9ca3af' : 'white',
          }}
          aria-label={terminal ? 'Revertir a pendiente' : 'Marcar completa'}
        >
          {tarea.completada && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {inconclusa && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          )}
        </button>

        <button
          className="flex-1 text-left min-w-0"
          onClick={() => onEdit(tarea)}
        >
          <div className={`flex items-center gap-1.5 text-sm font-medium ${terminal ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            <IndicadorTarea tarea={tarea} recurrencias={recurrencias} />
            <span className="truncate">{tarea.nombre}</span>
            {tarea.recurrenciaId && !terminal && (
              <svg className="flex-shrink-0 text-indigo-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            )}
          </div>
          {!terminal && (tarea.categoria || tarea.fecha) && (
            <div className="flex items-center gap-2 mt-0.5">
              {tarea.categoria && <EtiquetaCategoria categoria={tarea.categoria} />}
              {tarea.fecha && (
                <span className="text-xs text-gray-400">{formatFechaHora(tarea.fecha, tarea.hora)}</span>
              )}
            </div>
          )}
        </button>

        {!terminal && (
          <>
            <button
              onClick={() => onInconcluso(tarea)}
              className="flex-shrink-0 text-gray-300 hover:text-red-400 p-1"
              aria-label="Marcar inconclusa"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </button>
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
          </>
        )}
      </div>
    </div>
  )
}

function SeccionColapsable({
  titulo,
  tareas,
  recurrencias,
  onEdit,
  onToggle,
  onRevertir,
  onInconcluso,
  onDelete,
}: {
  titulo: string
  tareas: Tarea[]
  recurrencias: Recurrencia[]
  onEdit: (t: Tarea) => void
  onToggle: (id: string) => void
  onRevertir: (id: string) => void
  onInconcluso: (t: Tarea) => void
  onDelete: (id: string) => void
}) {
  const [abierta, setAbierta] = useState(false)
  if (tareas.length === 0) return null

  return (
    <div className="mt-4">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="flex items-center gap-2 text-sm text-gray-400 mb-2 select-none"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${abierta ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        {titulo} ({tareas.length})
      </button>

      {abierta &&
        tareas.map((t) => (
          <TareaItem
            key={t.id}
            tarea={t}
            recurrencias={recurrencias}
            onEdit={onEdit}
            onToggle={onToggle}
            onRevertir={onRevertir}
            onInconcluso={onInconcluso}
            onDelete={onDelete}
          />
        ))}
    </div>
  )
}

export default function Bandeja({ onOpenModal }: { onOpenModal: (t?: Tarea) => void }) {
  const {
    tareas,
    recurrencias,
    loading,
    toggleCompletada,
    revertirEstado,
    marcarInconcluso,
    eliminarTarea,
  } = useTareas()
  const [archivoOpen, setArchivoOpen] = useState(false)
  const [pendienteInconcluso, setPendienteInconcluso] = useState<Tarea | null>(null)
  // Categoría priorizada (solo en memoria). null = "Todas" (orden normal).
  const [prioridad, setPrioridad] = useState<Categoria | null>(null)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // En la bandeja, las instancias recurrentes solo se muestran las de hoy
  // (las futuras viven en IndexedDB y aparecen en el calendario).
  // Las archivadas no aparecen en ninguna vista normal.
  const hoy = todayYMD()
  const visibles = tareas.filter(
    (t) => !t.archivada && (!t.recurrenciaId || t.fecha === hoy)
  )

  // Activas (todo/doing) arriba; terminales en secciones colapsables.
  const incompletas = visibles
    .filter((t) => t.estado === 'todo' || t.estado === 'doing')
    .sort((a, b) => {
      if (a.fecha && b.fecha) return a.fecha.localeCompare(b.fecha)
      if (a.fecha) return -1
      if (b.fecha) return 1
      return a.creadaEn.localeCompare(b.creadaEn)
    })

  const completadas = visibles.filter((t) => t.estado === 'done')
  const inconclusas = visibles.filter((t) => t.estado === 'inconcluso')

  // Capa de prioridad por encima del orden base: sube la categoría elegida al
  // tope de cada grupo, conservando el orden interno. "Todas" no cambia nada.
  const incompletasPri = priorizarPorCategoria(incompletas, prioridad)
  const completadasPri = priorizarPorCategoria(completadas, prioridad)
  const inconclusasPri = priorizarPorCategoria(inconclusas, prioridad)

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Mis tareas</h1>
        <button
          onClick={() => setArchivoOpen(true)}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Ver archivo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="4" rx="1"/>
            <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Priorización por categoría — reordena (no filtra) la lista. Fila de
          chips con scroll horizontal; "Todas" deja el orden normal. */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-2 scrollbar-none">
        <button
          onClick={() => setPrioridad(null)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            prioridad === null
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'bg-white border-gray-200 text-gray-500'
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map((cat) => {
          const c = CATEGORIA_COLORES[cat]
          const active = prioridad === cat
          return (
            <button
              key={cat}
              onClick={() => setPrioridad(active ? null : cat)}
              className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? `${c.bg} ${c.text} border-transparent ring-2 ring-offset-1 ring-current`
                  : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full mr-1 ${c.dot}`} />
              {cat}
            </button>
          )
        })}
      </div>

      {incompletas.length === 0 && completadas.length === 0 && inconclusas.length === 0 && (
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

      {incompletasPri.map((t) => (
        <TareaItem
          key={t.id}
          tarea={t}
          recurrencias={recurrencias}
          onEdit={onOpenModal}
          onToggle={toggleCompletada}
          onRevertir={revertirEstado}
          onInconcluso={setPendienteInconcluso}
          onDelete={eliminarTarea}
        />
      ))}

      <SeccionColapsable
        titulo="Completadas"
        tareas={completadasPri}
        recurrencias={recurrencias}
        onEdit={onOpenModal}
        onToggle={toggleCompletada}
        onRevertir={revertirEstado}
        onInconcluso={setPendienteInconcluso}
        onDelete={eliminarTarea}
      />

      <SeccionColapsable
        titulo="Inconclusas"
        tareas={inconclusasPri}
        recurrencias={recurrencias}
        onEdit={onOpenModal}
        onToggle={toggleCompletada}
        onRevertir={revertirEstado}
        onInconcluso={setPendienteInconcluso}
        onDelete={eliminarTarea}
      />

      {archivoOpen && <ArchivoModal tareas={tareas} onClose={() => setArchivoOpen(false)} />}

      {pendienteInconcluso && (
        <ConfirmInconclusoModal
          tarea={pendienteInconcluso}
          recurrencias={recurrencias}
          onCancel={() => setPendienteInconcluso(null)}
          onConfirm={() => {
            marcarInconcluso(pendienteInconcluso.id)
            setPendienteInconcluso(null)
          }}
        />
      )}
    </div>
  )
}
