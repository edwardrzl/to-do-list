import type { Tarea, Recurrencia } from '../types'
import { diasPendientes, bandaContador } from '../lib/tareas'

// Indicador compacto que va ANTES del nombre de la tarea en todas las vistas:
// - Tareas recurrentes  → racha (verde si va cumpliendo, roja si va fallando).
// - Tareas no recurrentes → contador de días pendientes (gris/ámbar/rojo).
// Si no hay nada que mostrar, no renderiza nada.
export default function IndicadorTarea({
  tarea,
  recurrencias,
}: {
  tarea: Tarea
  recurrencias: Recurrencia[]
}) {
  if (tarea.recurrenciaId) {
    const rec = recurrencias.find((r) => r.id === tarea.recurrenciaId)
    if (!rec) return null
    const actual = rec.rachaActual ?? 0
    const inconclusa = rec.rachaInconclusa ?? 0
    if (actual > 0) {
      return (
        <span
          className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold leading-none"
          title={`Racha: ${actual} día(s) cumplido(s)`}
        >
          🔥{actual}
        </span>
      )
    }
    if (inconclusa > 0) {
      return (
        <span
          className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[11px] font-bold leading-none"
          title={`${inconclusa} día(s) consecutivo(s) sin cumplir`}
        >
          {inconclusa}
        </span>
      )
    }
    return null
  }

  const dias = diasPendientes(tarea)
  const banda = bandaContador(dias)
  if (!banda) return null

  const estilo =
    banda === 'gris'
      ? 'bg-gray-100 text-gray-500'
      : banda === 'ambar'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-600'

  return (
    <span
      className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none ${estilo}`}
      title={`${dias} día(s) sin completarse`}
    >
      {dias}d
    </span>
  )
}
